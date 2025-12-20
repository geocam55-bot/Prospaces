-- ============================================================================
-- URGENT DATABASE FIXES FOR ProSpaces CRM
-- Run these in order in Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- FIX 1: Add legacy_number column to contacts table
-- ============================================================================
-- This column is needed for CSV import to match existing contacts by legacy number

ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS legacy_number TEXT;

-- Create index for faster lookups during import
CREATE INDEX IF NOT EXISTS idx_contacts_legacy_number ON contacts(legacy_number);

-- Add comment
COMMENT ON COLUMN contacts.legacy_number IS 'Legacy customer number from old system for import matching';


-- ============================================================================
-- FIX 2: Fix RLS policies on profiles table
-- ============================================================================
-- The current RLS policies are blocking legitimate profile reads and inserts

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- Create proper RLS policies for profiles
CREATE POLICY "Enable read for authenticated users on own profile"
ON profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Enable insert for authenticated users on own profile"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "Enable update for authenticated users on own profile"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Super admins can read all profiles
CREATE POLICY "Super admins can read all profiles"
ON profiles FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'super_admin'
  )
);

-- Super admins can update all profiles
CREATE POLICY "Super admins can update all profiles"
ON profiles FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'super_admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'super_admin'
  )
);


-- ============================================================================
-- FIX 3: Remove any references to non-existent 'users' table
-- ============================================================================
-- The error log shows "permission denied for table users"
-- This suggests there's a function or trigger trying to access a 'users' table
-- Let's check and fix the handle_new_user function

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_org_id UUID;
  new_org_name TEXT;
BEGIN
  -- Generate organization name from email
  new_org_name := split_part(NEW.email, '@', 1) || '''s Organization';
  
  -- Create organization for new user
  INSERT INTO organizations (name, created_at, updated_at)
  VALUES (new_org_name, NOW(), NOW())
  RETURNING id INTO new_org_id;
  
  -- Create profile for new user (don't reference 'users' table)
  INSERT INTO public.profiles (
    id,
    email,
    role,
    organization_id,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.email,
    'admin', -- First user in new org gets admin role
    new_org_id,
    NOW(),
    NOW()
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't block user creation
    RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ============================================================================
-- FIX 4: Ensure organizations table has proper RLS
-- ============================================================================

-- Enable RLS on organizations if not already enabled
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can read own organization" ON organizations;
DROP POLICY IF EXISTS "Users can update own organization" ON organizations;

-- Users can read their own organization
CREATE POLICY "Users can read own organization"
ON organizations FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT organization_id 
    FROM profiles 
    WHERE profiles.id = auth.uid()
  )
);

-- Admins and super admins can update their organization
CREATE POLICY "Admins can update own organization"
ON organizations FOR UPDATE
TO authenticated
USING (
  id IN (
    SELECT organization_id 
    FROM profiles 
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'super_admin')
  )
)
WITH CHECK (
  id IN (
    SELECT organization_id 
    FROM profiles 
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'super_admin')
  )
);

-- Allow authenticated users to insert organizations (for auto-creation)
CREATE POLICY "Authenticated users can insert organizations"
ON organizations FOR INSERT
TO authenticated
WITH CHECK (true);

-- Super admins can read all organizations
CREATE POLICY "Super admins can read all organizations"
ON organizations FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'super_admin'
  )
);


-- ============================================================================
-- FIX 5: Grant necessary permissions
-- ============================================================================

-- Grant usage on auth schema to authenticated users (needed for triggers)
GRANT USAGE ON SCHEMA auth TO authenticated;

-- Ensure authenticated users can access necessary tables
GRANT SELECT, INSERT, UPDATE ON profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON organizations TO authenticated;
GRANT SELECT ON auth.users TO authenticated;


-- ============================================================================
-- FIX 6: Verify and fix contacts table RLS for import
-- ============================================================================

-- Ensure contacts table RLS allows inserts for users in their org
DROP POLICY IF EXISTS "Users can insert contacts in their organization" ON contacts;

CREATE POLICY "Users can insert contacts in their organization"
ON contacts FOR INSERT
TO authenticated
WITH CHECK (
  organization_id IN (
    SELECT organization_id 
    FROM profiles 
    WHERE profiles.id = auth.uid()
  )
);

-- Ensure contacts table RLS allows updates for users in their org
DROP POLICY IF EXISTS "Users can update contacts in their organization" ON contacts;

CREATE POLICY "Users can update contacts in their organization"
ON contacts FOR UPDATE
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id 
    FROM profiles 
    WHERE profiles.id = auth.uid()
  )
)
WITH CHECK (
  organization_id IN (
    SELECT organization_id 
    FROM profiles 
    WHERE profiles.id = auth.uid()
  )
);


-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these after applying fixes to verify everything works

-- Verify legacy_number column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'contacts' 
AND column_name = 'legacy_number';

-- Verify RLS policies on profiles
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY policyname;

-- Verify RLS policies on organizations
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'organizations'
ORDER BY policyname;

-- Verify handle_new_user function exists
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'handle_new_user';
