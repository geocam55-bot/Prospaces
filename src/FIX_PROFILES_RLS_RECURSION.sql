-- ============================================================================
-- FIX PROFILES RLS INFINITE RECURSION
-- ============================================================================
-- This script fixes the infinite recursion issue in profiles table policies
-- by using server-side functions that bypass RLS
-- ============================================================================

-- Step 1: Drop all existing policies on profiles table
-- ============================================================================
DO $$ 
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'profiles' AND schemaname = 'public'
  ) LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.profiles';
  END LOOP;
END $$;

-- Step 2: Create helper function to get user role (bypasses RLS)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM public.profiles
  WHERE id = user_id;
  
  RETURN user_role;
END;
$$;

-- Step 3: Create helper function to get user organization (bypasses RLS)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_user_organization(user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  user_org TEXT;
BEGIN
  SELECT organization_id INTO user_org
  FROM public.profiles
  WHERE id = user_id;
  
  RETURN user_org;
END;
$$;

-- Step 4: Create new non-recursive policies
-- ============================================================================

-- Policy 1: SELECT - All authenticated users can read profiles in their org or if they're admin/super_admin
CREATE POLICY "profiles_select_policy"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  -- User can see their own profile
  auth.uid() = id
  OR
  -- Super admins can see all profiles
  public.get_user_role(auth.uid()) = 'super_admin'
  OR
  -- Admins and managers can see profiles in their organization
  (
    public.get_user_role(auth.uid()) IN ('admin', 'manager')
    AND public.get_user_organization(auth.uid()) = organization_id
  )
  OR
  -- Standard users can see profiles in their organization
  public.get_user_organization(auth.uid()) = organization_id
);

-- Policy 2: INSERT - Only admins and super_admins can create profiles
CREATE POLICY "profiles_insert_policy"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (
  -- Super admins can insert any profile
  public.get_user_role(auth.uid()) = 'super_admin'
  OR
  -- Admins can insert profiles in their organization
  (
    public.get_user_role(auth.uid()) = 'admin'
    AND public.get_user_organization(auth.uid()) = organization_id
  )
);

-- Policy 3: UPDATE - Users can update their own profile, admins can update their org
CREATE POLICY "profiles_update_policy"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  -- User can update their own profile
  auth.uid() = id
  OR
  -- Super admins can update any profile
  public.get_user_role(auth.uid()) = 'super_admin'
  OR
  -- Admins can update profiles in their organization
  (
    public.get_user_role(auth.uid()) = 'admin'
    AND public.get_user_organization(auth.uid()) = organization_id
  )
)
WITH CHECK (
  -- User can update their own profile
  auth.uid() = id
  OR
  -- Super admins can update any profile
  public.get_user_role(auth.uid()) = 'super_admin'
  OR
  -- Admins can update profiles in their organization
  (
    public.get_user_role(auth.uid()) = 'admin'
    AND public.get_user_organization(auth.uid()) = organization_id
  )
);

-- Policy 4: DELETE - Only super_admins and admins can delete profiles
CREATE POLICY "profiles_delete_policy"
ON public.profiles
FOR DELETE
TO authenticated
USING (
  -- Super admins can delete any profile
  public.get_user_role(auth.uid()) = 'super_admin'
  OR
  -- Admins can delete profiles in their organization (except themselves)
  (
    public.get_user_role(auth.uid()) = 'admin'
    AND public.get_user_organization(auth.uid()) = organization_id
    AND auth.uid() != id  -- Can't delete yourself
  )
);

-- Step 5: Grant execute permissions on helper functions
-- ============================================================================
GRANT EXECUTE ON FUNCTION public.get_user_role(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_organization(UUID) TO authenticated;

-- Step 6: Verify policies were created
-- ============================================================================
SELECT 
  '✅ NEW POLICIES CREATED' as status,
  policyname,
  cmd,
  permissive
FROM pg_policies 
WHERE tablename = 'profiles' AND schemaname = 'public'
ORDER BY policyname;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
SELECT '✅ FIX COMPLETE - Profiles RLS policies have been recreated without recursion' as message;
