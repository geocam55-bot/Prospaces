-- ============================================================================
-- FIX: User Organization Assignment (Bypasses RLS)
-- ============================================================================
-- This SQL script assigns users to organizations by updating BOTH the 
-- profiles table AND auth.users metadata. Run this in Supabase SQL Editor.
-- ============================================================================

-- ============================================================================
-- PART 1: FIX RLS POLICIES (Allow super_admin to manage cross-org users)
-- ============================================================================

-- Drop existing conflicting policies if they exist
DROP POLICY IF EXISTS "Super admins can update any profile" ON public.profiles;
DROP POLICY IF EXISTS "Super admins can delete any profile" ON public.profiles;
DROP POLICY IF EXISTS "Super admins can view any profile" ON public.profiles;

-- Allow super_admins to UPDATE any profile (cross-organization)
CREATE POLICY "Super admins can update any profile"
  ON public.profiles FOR UPDATE
  USING (
    (SELECT (auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin')
    OR auth.uid() = id
  );

-- Allow super_admins to DELETE any profile (cross-organization)
CREATE POLICY "Super admins can delete any profile"
  ON public.profiles FOR DELETE
  USING (
    (SELECT (auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin')
    OR auth.uid() = id
  );

-- Allow super_admins to SELECT any profile (cross-organization)
CREATE POLICY "Super admins can view any profile"
  ON public.profiles FOR SELECT
  USING (
    (SELECT (auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin')
    OR (SELECT auth.jwt() -> 'user_metadata' ->> 'organizationId') = organization_id
    OR auth.uid() = id
  );

-- Verify policies were created
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'profiles' 
ORDER BY policyname;

-- ============================================================================
-- PART 2: CREATE SERVER-SIDE FUNCTIONS (Bypass RLS for all users)
-- ============================================================================

-- This function can be called from the browser and bypasses RLS
CREATE OR REPLACE FUNCTION public.assign_user_to_organization(
  p_user_email TEXT,
  p_organization_id TEXT
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER -- This makes it run with the function owner's permissions (bypasses RLS)
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_org_exists BOOLEAN;
  v_result jsonb;
BEGIN
  -- Check if organization exists
  SELECT EXISTS(
    SELECT 1 FROM public.organizations 
    WHERE id = p_organization_id AND status = 'active'
  ) INTO v_org_exists;
  
  IF NOT v_org_exists THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Organization not found or inactive'
    );
  END IF;
  
  -- Get user ID from profiles
  SELECT id INTO v_user_id
  FROM public.profiles
  WHERE email = p_user_email;
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User not found'
    );
  END IF;
  
  -- Update profiles table (bypasses RLS because SECURITY DEFINER)
  UPDATE public.profiles
  SET 
    organization_id = p_organization_id,
    status = 'active',
    updated_at = NOW()
  WHERE id = v_user_id;
  
  -- Update auth.users metadata
  UPDATE auth.users
  SET raw_user_meta_data = jsonb_set(
    COALESCE(raw_user_meta_data, '{}'::jsonb),
    '{organizationId}',
    to_jsonb(p_organization_id)
  )
  WHERE id = v_user_id;
  
  -- Return success
  RETURN jsonb_build_object(
    'success', true,
    'user_id', v_user_id,
    'email', p_user_email,
    'organization_id', p_organization_id,
    'message', 'User successfully assigned to organization'
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.assign_user_to_organization TO authenticated;

-- Grant execute permission to service_role (for super admin operations)
GRANT EXECUTE ON FUNCTION public.assign_user_to_organization TO service_role;


-- ============================================================================
-- CREATE FUNCTION: Create organization and assign user (ALL-IN-ONE)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_org_and_assign_user(
  p_org_name TEXT,
  p_user_email TEXT,
  p_org_id TEXT DEFAULT NULL -- Optional: auto-generate from name if not provided
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id TEXT;
  v_org_exists BOOLEAN;
  v_attempt INTEGER := 0;
  v_result jsonb;
BEGIN
  -- Generate org ID from name if not provided
  IF p_org_id IS NULL THEN
    v_org_id := lower(regexp_replace(
      regexp_replace(trim(p_org_name), '[^a-zA-Z0-9\s-]', '', 'g'),
      '\s+', '-', 'g'
    ));
    v_org_id := substring(v_org_id from 1 for 50);
  ELSE
    v_org_id := p_org_id;
  END IF;
  
  -- Check if org already exists
  SELECT EXISTS(
    SELECT 1 FROM public.organizations WHERE id = v_org_id
  ) INTO v_org_exists;
  
  IF v_org_exists THEN
    -- Organization exists, just assign user
    RETURN public.assign_user_to_organization(p_user_email, v_org_id);
  END IF;
  
  -- Create organization
  INSERT INTO public.organizations (id, name, status, created_at, updated_at)
  VALUES (v_org_id, p_org_name, 'active', NOW(), NOW());
  
  -- Assign user to the new organization
  v_result := public.assign_user_to_organization(p_user_email, v_org_id);
  
  -- Add org creation info to result
  IF (v_result->>'success')::boolean THEN
    v_result := jsonb_set(v_result, '{organization_created}', 'true'::jsonb);
    v_result := jsonb_set(v_result, '{organization_name}', to_jsonb(p_org_name));
  END IF;
  
  RETURN v_result;
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.create_org_and_assign_user TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_org_and_assign_user TO service_role;


-- ============================================================================
-- TEST THE FUNCTIONS
-- ============================================================================

-- Test 1: Assign user to existing organization
SELECT public.assign_user_to_organization(
  'larry.lee@ronaatlantic.ca',
  'rona-atlantic'
);

-- Test 2: Create organization and assign user
SELECT public.create_org_and_assign_user(
  'Rona Atlantic',
  'larry.lee@ronaatlantic.ca'
);

-- Test 3: Verify the assignment
SELECT 
  p.email,
  p.name,
  p.organization_id,
  o.name as org_name,
  u.raw_user_meta_data->>'organizationId' as auth_org_id
FROM public.profiles p
LEFT JOIN public.organizations o ON p.organization_id = o.id
LEFT JOIN auth.users u ON p.id = u.id
WHERE p.email = 'larry.lee@ronaatlantic.ca';


-- ============================================================================
-- CLEANUP: Drop functions if needed
-- ============================================================================

-- Uncomment to remove the functions:
-- DROP FUNCTION IF EXISTS public.assign_user_to_organization;
-- DROP FUNCTION IF EXISTS public.create_org_and_assign_user;