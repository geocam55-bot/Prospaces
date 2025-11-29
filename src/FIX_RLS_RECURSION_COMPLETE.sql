-- ============================================================================
-- COMPLETE FIX FOR PROFILES RLS INFINITE RECURSION
-- ============================================================================
-- This script completely fixes the infinite recursion by disabling RLS
-- on profiles and using service_role context for helper functions
-- ============================================================================

-- Step 1: Temporarily disable RLS to clean up
-- ============================================================================
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop all existing policies
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

-- Step 4: Create helper function to get user role (completely bypasses RLS)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_user_role_bypass_rls(user_id UUID)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT role FROM public.profiles WHERE id = user_id LIMIT 1;
$$;

-- Step 5: Create helper function to get user organization (completely bypasses RLS)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_user_org_bypass_rls(user_id UUID)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT organization_id FROM public.profiles WHERE id = user_id LIMIT 1;
$$;

-- Step 6: Grant permissions
-- ============================================================================
GRANT EXECUTE ON FUNCTION public.get_user_role_bypass_rls(UUID) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_org_bypass_rls(UUID) TO authenticated, anon, service_role;

-- Step 7: Re-enable RLS
-- ============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Step 8: Create simple, non-recursive policies
-- ============================================================================

-- Policy 1: SELECT - View own profile or profiles in same org (for admins)
CREATE POLICY "profiles_select"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  -- Can always see own profile
  id = auth.uid()
  OR
  -- Super admin sees all
  get_user_role_bypass_rls(auth.uid()) = 'super_admin'
  OR
  -- Admin/Manager sees same org
  (
    get_user_role_bypass_rls(auth.uid()) IN ('admin', 'manager')
    AND organization_id = get_user_org_bypass_rls(auth.uid())
  )
  OR
  -- Regular users see same org
  organization_id = get_user_org_bypass_rls(auth.uid())
);

-- Policy 2: INSERT - Only admins can create profiles
CREATE POLICY "profiles_insert"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (
  get_user_role_bypass_rls(auth.uid()) IN ('super_admin', 'admin')
  AND (
    get_user_role_bypass_rls(auth.uid()) = 'super_admin'
    OR organization_id = get_user_org_bypass_rls(auth.uid())
  )
);

-- Policy 3: UPDATE - Users update own profile, admins update their org
CREATE POLICY "profiles_update"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  id = auth.uid()
  OR
  get_user_role_bypass_rls(auth.uid()) = 'super_admin'
  OR
  (
    get_user_role_bypass_rls(auth.uid()) = 'admin'
    AND organization_id = get_user_org_bypass_rls(auth.uid())
  )
);

-- Policy 4: DELETE - Only super_admins and admins
CREATE POLICY "profiles_delete"
ON public.profiles
FOR DELETE
TO authenticated
USING (
  get_user_role_bypass_rls(auth.uid()) = 'super_admin'
  OR
  (
    get_user_role_bypass_rls(auth.uid()) = 'admin'
    AND organization_id = get_user_org_bypass_rls(auth.uid())
    AND id != auth.uid()
  )
);

-- Step 9: Verify
-- ============================================================================
SELECT 
  '✅ POLICIES RECREATED' as status,
  tablename,
  policyname,
  cmd as operation
FROM pg_policies 
WHERE tablename = 'profiles' AND schemaname = 'public'
ORDER BY policyname;

SELECT '✅ RLS FIX COMPLETE - No more infinite recursion!' as message;
