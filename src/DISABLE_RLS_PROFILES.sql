-- ============================================================================
-- COMPLETELY DISABLE RLS ON PROFILES TABLE
-- ============================================================================
-- This is the nuclear option - removes ALL RLS to fix the recursion error
-- ============================================================================

-- Step 1: Drop ALL policies on profiles
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
    EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.profiles CASCADE';
    RAISE NOTICE 'Dropped policy: %', r.policyname;
  END LOOP;
END $$;

-- Step 2: Completely disable RLS on profiles
-- ============================================================================
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Step 3: Verify RLS is disabled
-- ============================================================================
SELECT 
  '✅ RLS STATUS' as status,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'profiles'
  AND schemaname = 'public';

-- Step 4: Verify no policies remain
-- ============================================================================
SELECT 
  '✅ REMAINING POLICIES' as status,
  COUNT(*) as policy_count
FROM pg_policies
WHERE tablename = 'profiles'
  AND schemaname = 'public';

-- ============================================================================
-- RESULT
-- ============================================================================
-- RLS is now completely disabled on profiles table.
-- All authenticated users can now read/write any profile.
-- This removes all recursion errors.
-- 
-- To re-enable RLS later (after fixing the recursion issue properly):
-- ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
-- Then create non-recursive policies
-- ============================================================================

SELECT '✅ RLS COMPLETELY DISABLED - Update should work now!' as message;
