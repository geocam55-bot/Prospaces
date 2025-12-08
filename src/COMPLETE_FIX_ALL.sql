-- =====================================================
-- COMPLETE FIX - Everything in One Script
-- =====================================================
-- This fixes:
-- 1. Organizations
-- 2. User assignments
-- 3. Auth metadata (removes "default-org")
-- 4. RLS policies (no recursion)
-- =====================================================

-- PART 1: Create organizations
-- =====================================================
INSERT INTO organizations (id, name, status, created_at, updated_at)
SELECT gen_random_uuid(), 'ProSpaces CRM', 'active', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM organizations WHERE name = 'ProSpaces CRM');

INSERT INTO organizations (id, name, status, created_at, updated_at)
SELECT gen_random_uuid(), 'RONA Atlantic', 'active', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM organizations WHERE name = 'RONA Atlantic');

SELECT '✅ Part 1: Organizations created' as status;

-- PART 2: Fix profiles organization_id
-- =====================================================
UPDATE profiles
SET organization_id = (SELECT id FROM organizations WHERE name = 'ProSpaces CRM' LIMIT 1)
WHERE email = 'george.campbell@prospaces.com';

UPDATE profiles
SET organization_id = (SELECT id FROM organizations WHERE name = 'RONA Atlantic' LIMIT 1)
WHERE email != 'george.campbell@prospaces.com'
  AND email IS NOT NULL;

SELECT '✅ Part 2: User assignments fixed' as status;

-- PART 3: Fix auth.users metadata (removes "default-org")
-- =====================================================
UPDATE auth.users
SET raw_user_meta_data = jsonb_build_object(
    'organizationId', profiles.organization_id::text,
    'role', profiles.role,
    'name', COALESCE(profiles.name, ''),
    'email', profiles.email
)
FROM profiles
WHERE auth.users.id = profiles.id
  AND profiles.organization_id IS NOT NULL;

SELECT '✅ Part 3: Auth metadata fixed' as status;

-- PART 4: Drop ALL old policies
-- =====================================================
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
    END LOOP;
END $$;

SELECT '✅ Part 4: Old policies dropped' as status;

-- PART 5: Create new NON-RECURSIVE policies
-- =====================================================

-- SELECT policy (uses auth.jwt() to avoid recursion)
CREATE POLICY "profiles_select_policy"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id
    OR
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin'
    OR
    (
      organization_id IS NOT NULL
      AND organization_id::text = (auth.jwt() -> 'user_metadata' ->> 'organizationId')
    )
  );

-- INSERT policy
CREATE POLICY "profiles_insert_policy"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'super_admin')
  );

-- UPDATE policy
CREATE POLICY "profiles_update_policy"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = id
    OR
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin'
    OR
    (
      (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
      AND organization_id IS NOT NULL
      AND organization_id::text = (auth.jwt() -> 'user_metadata' ->> 'organizationId')
    )
  );

-- DELETE policy (non-recursive)
CREATE POLICY "profiles_delete_policy"
  ON profiles FOR DELETE
  TO authenticated
  USING (
    (
      (auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin'
      AND auth.uid() != id
    )
    OR
    (
      (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
      AND organization_id IS NOT NULL
      AND organization_id::text = (auth.jwt() -> 'user_metadata' ->> 'organizationId')
      AND auth.uid() != id
    )
  );

SELECT '✅ Part 5: New policies created (no recursion)' as status;

-- =====================================================
-- VERIFICATION
-- =====================================================

SELECT '' as spacer;
SELECT '========================================' as divider;
SELECT '         FINAL VERIFICATION' as title;
SELECT '========================================' as divider;
SELECT '' as spacer;

-- Organizations
SELECT '--- Organizations ---' as section;
SELECT id, name, status FROM organizations ORDER BY name;

SELECT '' as spacer;

-- User assignments
SELECT '--- User Assignments ---' as section;
SELECT 
    p.email,
    o.name as organization,
    p.role
FROM profiles p
JOIN organizations o ON p.organization_id = o.id
ORDER BY o.name, p.email;

SELECT '' as spacer;

-- Metadata sync status
SELECT '--- Metadata Sync Status ---' as section;
SELECT 
    u.email,
    u.raw_user_meta_data->>'organizationId' as auth_org_id,
    p.organization_id::text as profile_org_id,
    CASE 
        WHEN u.raw_user_meta_data->>'organizationId' = p.organization_id::text 
        THEN '✅'
        ELSE '❌'
    END as sync_status
FROM auth.users u
JOIN profiles p ON u.id = p.id
ORDER BY u.email;

SELECT '' as spacer;

-- User counts
SELECT '--- User Counts by Organization ---' as section;
SELECT 
    o.name as organization,
    COUNT(p.id) as user_count
FROM organizations o
LEFT JOIN profiles p ON p.organization_id = o.id
GROUP BY o.name
ORDER BY o.name;

SELECT '' as spacer;

-- Policies
SELECT '--- RLS Policies (Non-Recursive) ---' as section;
SELECT 
    policyname as policy_name,
    cmd as operation
FROM pg_policies 
WHERE tablename = 'profiles' AND schemaname = 'public'
ORDER BY policyname;

SELECT '' as spacer;
SELECT '========================================' as divider;
SELECT '✅ ALL FIXED - NO MORE RECURSION!' as title;
SELECT '========================================' as divider;
SELECT '' as spacer;
SELECT '⚠️  CRITICAL NEXT STEP:' as instruction;
SELECT '1. Log out of your application' as instruction;
SELECT '2. Log back in (refresh JWT token)' as instruction;
SELECT '3. Test Users page' as instruction;
SELECT '4. Try deleting a user - should work now!' as instruction;
SELECT '' as spacer;
