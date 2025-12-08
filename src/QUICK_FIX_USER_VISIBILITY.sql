-- =====================================================
-- QUICK FIX - USER VISIBILITY ISSUE
-- =====================================================
-- This is the fastest way to fix the issue
-- Run these commands in order
-- =====================================================

-- STEP 1: Sync auth.users metadata with profiles
-- This is usually the problem - metadata doesn't match
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
    jsonb_set(
        COALESCE(raw_user_meta_data, '{}'::jsonb),
        '{organizationId}',
        to_jsonb(p.organization_id::text)
    ),
    '{role}',
    to_jsonb(p.role)
)
FROM profiles p
WHERE auth.users.id = p.id
  AND p.organization_id IS NOT NULL;

-- STEP 2: Verify the sync
SELECT 
    u.email,
    u.raw_user_meta_data->>'organizationId' as auth_org,
    p.organization_id::text as profile_org,
    CASE 
        WHEN u.raw_user_meta_data->>'organizationId' = p.organization_id::text 
        THEN '✅ SYNCED' 
        ELSE '❌ NOT SYNCED' 
    END as status
FROM auth.users u
JOIN profiles p ON u.id = p.id
ORDER BY u.email;

-- STEP 3: Drop ALL old policies on profiles
DROP POLICY IF EXISTS "Users can view org profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view profiles" ON profiles;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON profiles;
DROP POLICY IF EXISTS "Users can view profiles in their org" ON profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Allow insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- STEP 4: Create ONE simple, working SELECT policy
CREATE POLICY "profiles_select_policy"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    -- Either you're viewing your own profile
    auth.uid() = id
    OR
    -- Or you're super_admin (can see everyone)
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'super_admin'
    OR
    -- Or you're in the same organization
    organization_id = (
      SELECT raw_user_meta_data->>'organizationId'
      FROM auth.users
      WHERE id = auth.uid()
    )::uuid
  );

-- STEP 5: Create INSERT policy (for admins)
CREATE POLICY "profiles_insert_policy"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) 
    IN ('admin', 'super_admin')
  );

-- STEP 6: Create UPDATE policy
CREATE POLICY "profiles_update_policy"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    -- Can update your own profile
    auth.uid() = id
    OR
    -- Or you're super_admin
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'super_admin'
    OR
    -- Or you're admin in the same org
    (
      (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin'
      AND
      organization_id = (
        SELECT raw_user_meta_data->>'organizationId'
        FROM auth.users
        WHERE id = auth.uid()
      )::uuid
    )
  );

-- STEP 7: Create DELETE policy
CREATE POLICY "profiles_delete_policy"
  ON profiles FOR DELETE
  TO authenticated
  USING (
    -- Super admin can delete anyone (except themselves)
    (
      (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'super_admin'
      AND auth.uid() != id
    )
    OR
    -- Admin can delete users in their org (except themselves)
    (
      (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin'
      AND organization_id = (
        SELECT raw_user_meta_data->>'organizationId'
        FROM auth.users
        WHERE id = auth.uid()
      )::uuid
      AND auth.uid() != id
    )
  );

-- STEP 8: Verify policies are created
SELECT 
    policyname,
    cmd as operation
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;

-- STEP 9: Final verification - show all RONA Atlantic users
SELECT 
    p.email,
    p.full_name,
    p.role,
    o.name as organization,
    p.status
FROM profiles p
JOIN organizations o ON p.organization_id = o.id
WHERE o.name = 'RONA Atlantic'
ORDER BY p.email;

-- =====================================================
-- DONE! 
-- =====================================================
-- After running this:
-- 1. Log out and log back in (important!)
-- 2. Go to Users page
-- 3. You should now see all users in your organization
-- =====================================================
