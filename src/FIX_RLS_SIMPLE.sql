-- ============================================================================
-- SIMPLE FIX FOR PROFILES RLS - PERMISSIVE POLICIES
-- ============================================================================
-- This creates very simple policies that don't cause recursion
-- ============================================================================

-- Step 1: Disable RLS temporarily
-- ============================================================================
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop ALL existing policies
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

-- Step 3: Drop any existing helper functions
-- ============================================================================
DROP FUNCTION IF EXISTS public.get_user_role(UUID);
DROP FUNCTION IF EXISTS public.get_user_organization(UUID);
DROP FUNCTION IF EXISTS public.get_user_role_bypass_rls(UUID);
DROP FUNCTION IF EXISTS public.get_user_org_bypass_rls(UUID);

-- Step 4: Re-enable RLS
-- ============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Step 5: Create SIMPLE permissive policies (no recursion possible)
-- ============================================================================

-- Allow all authenticated users to SELECT any profile
CREATE POLICY "profiles_select_all"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- Allow all authenticated users to INSERT profiles
CREATE POLICY "profiles_insert_all"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow all authenticated users to UPDATE any profile
CREATE POLICY "profiles_update_all"
ON public.profiles
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Allow all authenticated users to DELETE any profile
CREATE POLICY "profiles_delete_all"
ON public.profiles
FOR DELETE
TO authenticated
USING (true);

-- Step 6: Verify policies
-- ============================================================================
SELECT 
  '✅ SIMPLE POLICIES CREATED' as status,
  policyname,
  cmd
FROM pg_policies 
WHERE tablename = 'profiles' AND schemaname = 'public'
ORDER BY policyname;

-- ============================================================================
-- IMPORTANT NOTE
-- ============================================================================
-- These are PERMISSIVE policies that allow all authenticated users to do
-- anything with profiles. This eliminates the recursion error.
-- 
-- Once this is working, you can implement role-based restrictions in your
-- application code rather than at the database level.
-- 
-- Alternatively, if you need database-level restrictions, we can implement
-- them using a different strategy that doesn't cause recursion.
-- ============================================================================

SELECT '✅ SIMPLE PERMISSIVE POLICIES APPLIED - No recursion possible!' as message;
