-- ============================================================================
-- FINAL FIX FOR PROFILES RLS INFINITE RECURSION + SIGN-UP
-- ============================================================================
-- This fixes the infinite recursion AND allows new users to create profiles
-- ============================================================================

-- Step 1: Temporarily disable RLS to clean up
-- ============================================================================
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop all existing policies on profiles
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

-- Step 3: Drop old helper functions if they exist
-- ============================================================================
DROP FUNCTION IF EXISTS public.get_user_role(UUID);
DROP FUNCTION IF EXISTS public.get_user_organization(UUID);
DROP FUNCTION IF EXISTS public.get_user_role_bypass_rls(UUID);
DROP FUNCTION IF EXISTS public.get_user_org_bypass_rls(UUID);

-- Step 4: Create helper function to get user role (SECURITY DEFINER bypasses RLS)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_user_role_safe(user_id UUID)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT role FROM public.profiles WHERE id = user_id LIMIT 1;
$$;

-- Step 5: Create helper function to get user organization (SECURITY DEFINER bypasses RLS)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_user_org_safe(user_id UUID)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT organization_id FROM public.profiles WHERE id = user_id LIMIT 1;
$$;

-- Step 6: Grant permissions on helper functions
-- ============================================================================
GRANT EXECUTE ON FUNCTION public.get_user_role_safe(UUID) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_org_safe(UUID) TO authenticated, anon, service_role;

-- Step 7: Re-enable RLS
-- ============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Step 8: Create simple, non-recursive policies
-- ============================================================================

-- Policy 1: SELECT - View own profile or profiles in same org
CREATE POLICY "profiles_select_policy"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  -- Can always see own profile
  id = auth.uid()
  OR
  -- Super admin sees all (using safe function to avoid recursion)
  get_user_role_safe(auth.uid()) = 'super_admin'
  OR
  -- Admin/Manager sees same org
  (
    get_user_role_safe(auth.uid()) IN ('admin', 'manager')
    AND organization_id = get_user_org_safe(auth.uid())
  )
  OR
  -- Regular users see profiles in same org
  organization_id = get_user_org_safe(auth.uid())
);

-- Policy 2: INSERT - Allow users to insert their own profile OR admins to create others
CREATE POLICY "profiles_insert_policy"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (
  -- Allow inserting own profile (critical for sign-up!)
  id = auth.uid()
  OR
  -- Super admins can create any profile
  get_user_role_safe(auth.uid()) = 'super_admin'
  OR
  -- Admins can create profiles in their org
  (
    get_user_role_safe(auth.uid()) = 'admin'
    AND organization_id = get_user_org_safe(auth.uid())
  )
);

-- Policy 3: UPDATE - Users update own profile, admins update their org
CREATE POLICY "profiles_update_policy"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  -- Can always update own profile
  id = auth.uid()
  OR
  -- Super admin can update any profile
  get_user_role_safe(auth.uid()) = 'super_admin'
  OR
  -- Admin can update profiles in their org
  (
    get_user_role_safe(auth.uid()) = 'admin'
    AND organization_id = get_user_org_safe(auth.uid())
  )
)
WITH CHECK (
  -- Same conditions for the updated data
  id = auth.uid()
  OR
  get_user_role_safe(auth.uid()) = 'super_admin'
  OR
  (
    get_user_role_safe(auth.uid()) = 'admin'
    AND organization_id = get_user_org_safe(auth.uid())
  )
);

-- Policy 4: DELETE - Only super_admins and admins (can't delete own profile)
CREATE POLICY "profiles_delete_policy"
ON public.profiles
FOR DELETE
TO authenticated
USING (
  get_user_role_safe(auth.uid()) = 'super_admin'
  OR
  (
    get_user_role_safe(auth.uid()) = 'admin'
    AND organization_id = get_user_org_safe(auth.uid())
    AND id != auth.uid() -- Can't delete own profile
  )
);

-- Step 9: Grant necessary table permissions
-- ============================================================================
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.organizations TO authenticated;
GRANT SELECT ON auth.users TO authenticated;

-- Step 10: Verify the setup
-- ============================================================================
SELECT 
  '✅ POLICIES RECREATED' as status,
  schemaname,
  tablename,
  policyname,
  cmd as operation
FROM pg_policies 
WHERE tablename = 'profiles' AND schemaname = 'public'
ORDER BY policyname;

SELECT '✅ Helper Functions Created' as status;
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%_safe'
ORDER BY routine_name;

SELECT '✅ RLS FIX COMPLETE - No more infinite recursion!' as message;
SELECT '✅ New users can now sign up and create profiles!' as message;
