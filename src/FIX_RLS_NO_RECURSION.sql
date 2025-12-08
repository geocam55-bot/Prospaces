-- =====================================================
-- FIX RLS - NO RECURSION
-- =====================================================
-- This creates policies that don't cause infinite loops
-- =====================================================

-- Step 1: Drop ALL existing policies on profiles
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'profiles' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON profiles', pol.policyname);
        RAISE NOTICE 'Dropped policy: %', pol.policyname;
    END LOOP;
END $$;

SELECT '=== Step 1: Dropped all old policies ===' as status;

-- Step 2: Create simple, non-recursive SELECT policy
CREATE POLICY "profiles_select_policy"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    -- Can view own profile
    auth.uid() = id
    OR
    -- Super admin can view all (using jwt claim to avoid recursion)
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin'
    OR
    -- Can view profiles in same organization (using jwt claim)
    (
      organization_id IS NOT NULL
      AND organization_id::text = (auth.jwt() -> 'user_metadata' ->> 'organizationId')
    )
  );

SELECT '=== Step 2: Created SELECT policy ===' as status;

-- Step 3: Create INSERT policy
CREATE POLICY "profiles_insert_policy"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'super_admin')
  );

SELECT '=== Step 3: Created INSERT policy ===' as status;

-- Step 4: Create UPDATE policy
CREATE POLICY "profiles_update_policy"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    -- Can update own profile
    auth.uid() = id
    OR
    -- Super admin can update all
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin'
    OR
    -- Admin can update users in same org
    (
      (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
      AND organization_id IS NOT NULL
      AND organization_id::text = (auth.jwt() -> 'user_metadata' ->> 'organizationId')
    )
  );

SELECT '=== Step 4: Created UPDATE policy ===' as status;

-- Step 5: Create DELETE policy (non-recursive)
CREATE POLICY "profiles_delete_policy"
  ON profiles FOR DELETE
  TO authenticated
  USING (
    -- Super admin can delete (but not self)
    (
      (auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin'
      AND auth.uid() != id
    )
    OR
    -- Admin can delete users in same org (but not self)
    (
      (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
      AND organization_id IS NOT NULL
      AND organization_id::text = (auth.jwt() -> 'user_metadata' ->> 'organizationId')
      AND auth.uid() != id
    )
  );

SELECT '=== Step 5: Created DELETE policy ===' as status;

-- Verification
SELECT '========================================' as divider;
SELECT 'VERIFICATION' as divider;
SELECT '========================================' as divider;

SELECT '--- RLS Policies ---' as section;
SELECT 
    policyname as policy_name,
    cmd as operation
FROM pg_policies 
WHERE tablename = 'profiles' AND schemaname = 'public'
ORDER BY policyname;

SELECT '========================================' as divider;
SELECT '✅ RLS POLICIES FIXED!' as divider;
SELECT '========================================' as divider;
SELECT 'Key change: Using auth.jwt() instead of querying auth.users' as note;
SELECT 'This prevents infinite recursion' as note;
SELECT '' as spacer;
SELECT 'Now log out and log back in!' as instruction;
