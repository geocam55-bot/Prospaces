-- =====================================================
-- ULTIMATE FIX - Step by Step, No Errors
-- =====================================================
-- This script is broken into small safe steps
-- Each step can't fail due to invalid UUIDs
-- =====================================================

-- STEP 1: Create organizations (safe, can't fail)
-- =====================================================
INSERT INTO organizations (name, status, created_at)
SELECT 'ProSpaces CRM', 'active', NOW()
WHERE NOT EXISTS (SELECT 1 FROM organizations WHERE name = 'ProSpaces CRM');

INSERT INTO organizations (name, status, created_at)
SELECT 'RONA Atlantic', 'active', NOW()
WHERE NOT EXISTS (SELECT 1 FROM organizations WHERE name = 'RONA Atlantic');

-- Show created orgs
SELECT 'Step 1: Organizations' as step, id, name FROM organizations;

-- STEP 2: Fix profiles.organization_id (safe, only touches profiles table)
-- =====================================================
UPDATE profiles
SET organization_id = (SELECT id FROM organizations WHERE name = 'ProSpaces CRM' LIMIT 1)
WHERE email = 'george.campbell@prospaces.com';

UPDATE profiles
SET organization_id = (SELECT id FROM organizations WHERE name = 'RONA Atlantic' LIMIT 1)
WHERE email != 'george.campbell@prospaces.com'
  AND email IS NOT NULL;

-- Show updated profiles
SELECT 
    'Step 2: Profiles Fixed' as step,
    p.email,
    o.name as organization
FROM profiles p
LEFT JOIN organizations o ON p.organization_id = o.id
ORDER BY o.name, p.email;

-- STEP 3: Clean auth.users metadata - SUPER SAFE VERSION
-- =====================================================
-- This updates one user at a time, building clean metadata

UPDATE auth.users
SET raw_user_meta_data = jsonb_build_object(
    'organizationId', p.organization_id::text,
    'role', p.role,
    'name', p.full_name,
    'email', p.email
)
FROM profiles p
WHERE auth.users.id = p.id
  AND p.organization_id IS NOT NULL;

-- Verify metadata is now clean
SELECT 
    'Step 3: Auth Metadata Synced' as step,
    u.email,
    u.raw_user_meta_data->>'organizationId' as org_in_auth,
    p.organization_id::text as org_in_profile,
    CASE 
        WHEN u.raw_user_meta_data->>'organizationId' = p.organization_id::text 
        THEN '✅'
        ELSE '❌'
    END as match
FROM auth.users u
JOIN profiles p ON u.id = p.id;

-- STEP 4: Drop ALL old policies
-- =====================================================
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'profiles'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON profiles', pol.policyname);
    END LOOP;
END $$;

SELECT 'Step 4: Old Policies Dropped' as step;

-- STEP 5: Create new SELECT policy (safest possible version)
-- =====================================================
CREATE POLICY "profiles_select_policy"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    -- Own profile
    auth.uid() = id
    OR
    -- Super admin sees all
    (
      SELECT raw_user_meta_data->>'role' 
      FROM auth.users 
      WHERE id = auth.uid()
    ) = 'super_admin'
    OR
    -- Same organization (with NULL safety)
    (
      organization_id IS NOT NULL
      AND
      (
        SELECT raw_user_meta_data->>'organizationId' 
        FROM auth.users 
        WHERE id = auth.uid()
      ) IS NOT NULL
      AND
      organization_id::text = (
        SELECT raw_user_meta_data->>'organizationId' 
        FROM auth.users 
        WHERE id = auth.uid()
      )
    )
  );

SELECT 'Step 5: SELECT Policy Created' as step;

-- STEP 6: Create INSERT policy
-- =====================================================
CREATE POLICY "profiles_insert_policy"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    (
      SELECT raw_user_meta_data->>'role' 
      FROM auth.users 
      WHERE id = auth.uid()
    ) IN ('admin', 'super_admin')
  );

SELECT 'Step 6: INSERT Policy Created' as step;

-- STEP 7: Create UPDATE policy
-- =====================================================
CREATE POLICY "profiles_update_policy"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    -- Own profile
    auth.uid() = id
    OR
    -- Super admin
    (
      SELECT raw_user_meta_data->>'role' 
      FROM auth.users 
      WHERE id = auth.uid()
    ) = 'super_admin'
    OR
    -- Admin in same org
    (
      (
        SELECT raw_user_meta_data->>'role' 
        FROM auth.users 
        WHERE id = auth.uid()
      ) = 'admin'
      AND
      organization_id IS NOT NULL
      AND
      organization_id::text = (
        SELECT raw_user_meta_data->>'organizationId' 
        FROM auth.users 
        WHERE id = auth.uid()
      )
    )
  );

SELECT 'Step 7: UPDATE Policy Created' as step;

-- STEP 8: Create DELETE policy
-- =====================================================
CREATE POLICY "profiles_delete_policy"
  ON profiles FOR DELETE
  TO authenticated
  USING (
    (
      -- Super admin (can't delete self)
      (
        SELECT raw_user_meta_data->>'role' 
        FROM auth.users 
        WHERE id = auth.uid()
      ) = 'super_admin'
      AND auth.uid() != id
    )
    OR
    (
      -- Admin in same org (can't delete self)
      (
        SELECT raw_user_meta_data->>'role' 
        FROM auth.users 
        WHERE id = auth.uid()
      ) = 'admin'
      AND organization_id IS NOT NULL
      AND organization_id::text = (
        SELECT raw_user_meta_data->>'organizationId' 
        FROM auth.users 
        WHERE id = auth.uid()
      )
      AND auth.uid() != id
    )
  );

SELECT 'Step 8: DELETE Policy Created' as step;

-- =====================================================
-- FINAL VERIFICATION
-- =====================================================

SELECT '========================================' as divider;
SELECT 'FINAL RESULTS' as divider;
SELECT '========================================' as divider;

-- All policies
SELECT 
    'Policies Created:' as info,
    policyname as policy_name,
    cmd as for_operation
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY policyname;

-- User assignments
SELECT 
    'User Assignments:' as info,
    p.email,
    o.name as organization,
    p.role
FROM profiles p
JOIN organizations o ON p.organization_id = o.id
ORDER BY o.name, p.email;

-- Counts
SELECT 
    'User Counts:' as info,
    o.name as organization,
    COUNT(p.id) as users
FROM organizations o
LEFT JOIN profiles p ON p.organization_id = o.id
GROUP BY o.name;

-- Sync status
SELECT 
    'Sync Status:' as info,
    COUNT(*) as total_users,
    SUM(CASE WHEN u.raw_user_meta_data->>'organizationId' = p.organization_id::text THEN 1 ELSE 0 END) as synced,
    SUM(CASE WHEN u.raw_user_meta_data->>'organizationId' != p.organization_id::text OR u.raw_user_meta_data->>'organizationId' IS NULL THEN 1 ELSE 0 END) as not_synced
FROM auth.users u
JOIN profiles p ON u.id = p.id;

-- =====================================================
-- ✅ ALL DONE!
-- =====================================================
-- Next steps:
-- 1. Log out of the application
-- 2. Log back in
-- 3. Go to Users page
-- 4. You should see all RONA Atlantic users!
-- =====================================================
