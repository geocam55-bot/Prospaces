-- =====================================================
-- FIX USER VISIBILITY ISSUE
-- =====================================================
-- This fixes the issue where admins can't see other users
-- in their organization
-- =====================================================

-- STEP 1: Check current profiles policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;

-- STEP 2: Drop old problematic policies (if they exist)
DROP POLICY IF EXISTS "Users can view org profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view profiles" ON profiles;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON profiles;
DROP POLICY IF EXISTS "Users can view profiles in their org" ON profiles;

-- STEP 3: Create NEW comprehensive policies for profiles table

-- Allow users to view their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Allow users to view profiles in their organization
CREATE POLICY "Users can view org profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    -- Super admins can see everyone
    (
      SELECT raw_user_meta_data->>'role' 
      FROM auth.users 
      WHERE id = auth.uid()
    ) = 'super_admin'
    OR
    -- Regular users can see users in their org
    (
      organization_id = (
        SELECT raw_user_meta_data->>'organizationId'
        FROM auth.users
        WHERE id = auth.uid()
      )::uuid
    )
  );

-- Allow admins and super_admins to insert profiles
CREATE POLICY "Admins can insert profiles"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    (
      SELECT raw_user_meta_data->>'role' 
      FROM auth.users 
      WHERE id = auth.uid()
    ) IN ('admin', 'super_admin')
  );

-- Allow admins to update profiles in their org, super_admins can update all
CREATE POLICY "Admins can update profiles"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    (
      SELECT raw_user_meta_data->>'role' 
      FROM auth.users 
      WHERE id = auth.uid()
    ) = 'super_admin'
    OR
    (
      (
        SELECT raw_user_meta_data->>'role' 
        FROM auth.users 
        WHERE id = auth.uid()
      ) = 'admin'
      AND
      organization_id = (
        SELECT raw_user_meta_data->>'organizationId'
        FROM auth.users
        WHERE id = auth.uid()
      )::uuid
    )
  );

-- Allow admins to delete profiles in their org, super_admins can delete all
CREATE POLICY "Admins can delete profiles"
  ON profiles FOR DELETE
  TO authenticated
  USING (
    (
      SELECT raw_user_meta_data->>'role' 
      FROM auth.users 
      WHERE id = auth.uid()
    ) = 'super_admin'
    OR
    (
      (
        SELECT raw_user_meta_data->>'role' 
        FROM auth.users 
        WHERE id = auth.uid()
      ) = 'admin'
      AND
      organization_id = (
        SELECT raw_user_meta_data->>'organizationId'
        FROM auth.users
        WHERE id = auth.uid()
      )::uuid
      AND
      auth.uid() != id  -- Can't delete yourself
    )
  );

-- STEP 4: Verify the new policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;

-- STEP 5: Check if users have correct organizationId in metadata
SELECT 
    id,
    email,
    raw_user_meta_data->>'role' as role,
    raw_user_meta_data->>'organizationId' as org_in_metadata,
    raw_user_meta_data->>'name' as name
FROM auth.users
ORDER BY email;

-- STEP 6: Check profiles table data
SELECT 
    id,
    email,
    full_name,
    role,
    organization_id,
    status
FROM profiles
ORDER BY organization_id, email;

-- STEP 7: Sync auth.users metadata with profiles table
-- This ensures auth.users.raw_user_meta_data.organizationId matches profiles.organization_id
DO $$
DECLARE
    profile_record RECORD;
    users_updated INTEGER := 0;
BEGIN
    FOR profile_record IN 
        SELECT id, organization_id, role, full_name as name
        FROM profiles
        WHERE organization_id IS NOT NULL
    LOOP
        -- Update auth.users metadata to match profiles table
        UPDATE auth.users
        SET raw_user_meta_data = jsonb_set(
            jsonb_set(
                COALESCE(raw_user_meta_data, '{}'::jsonb),
                '{organizationId}',
                to_jsonb(profile_record.organization_id::text)
            ),
            '{role}',
            to_jsonb(profile_record.role)
        )
        WHERE id = profile_record.id;
        
        users_updated := users_updated + 1;
    END LOOP;
    
    RAISE NOTICE 'Updated metadata for % users', users_updated;
END $$;

-- STEP 8: Verify the sync worked
SELECT 
    u.email,
    u.raw_user_meta_data->>'organizationId' as auth_org_id,
    p.organization_id as profile_org_id,
    CASE 
        WHEN u.raw_user_meta_data->>'organizationId' = p.organization_id::text 
        THEN '✅ SYNCED' 
        ELSE '❌ MISMATCH' 
    END as sync_status,
    u.raw_user_meta_data->>'role' as auth_role,
    p.role as profile_role
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
ORDER BY u.email;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Test query: What would a RONA Atlantic admin see?
-- Replace 'RONA_ADMIN_EMAIL' with an actual admin email
/*
SELECT 
    p.id,
    p.email,
    p.full_name,
    p.role,
    p.organization_id,
    o.name as organization_name
FROM profiles p
JOIN organizations o ON p.organization_id = o.id
WHERE p.organization_id = (
    SELECT organization_id 
    FROM profiles 
    WHERE email = 'RONA_ADMIN_EMAIL'
)
ORDER BY p.email;
*/

-- =====================================================
-- NOTES:
-- =====================================================
-- This script:
-- 1. Removes old problematic RLS policies
-- 2. Creates new comprehensive RLS policies
-- 3. Syncs auth.users metadata with profiles table
-- 4. Verifies everything is working
-- 
-- After running this:
-- - Admins will see all users in their organization
-- - Super admins will see all users across all organizations
-- - The UI should now show all RONA Atlantic users
-- =====================================================
