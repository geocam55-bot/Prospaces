-- =====================================================
-- SAFE FIX - Handles All Invalid Data
-- =====================================================
-- This version is super safe and handles any data issues
-- Run each section one at a time if needed
-- =====================================================

-- =====================================================
-- SECTION 1: Check what we're dealing with
-- =====================================================

-- See what organizations exist
SELECT 'Current organizations:' as info;
SELECT id, name, status FROM organizations ORDER BY name;

-- See what's in profiles (raw, no joins that might fail)
SELECT 'Current profiles:' as info;
SELECT email, organization_id, role FROM profiles ORDER BY email;

-- See auth.users metadata (this is where "default-org" might be)
SELECT 'Auth metadata:' as info;
SELECT 
    email,
    raw_user_meta_data->>'organizationId' as org_from_metadata,
    raw_user_meta_data->>'role' as role_from_metadata
FROM auth.users 
ORDER BY email;

-- =====================================================
-- SECTION 2: Create organizations if missing
-- =====================================================

-- Create ProSpaces CRM if it doesn't exist
INSERT INTO organizations (name, status, created_at)
SELECT 'ProSpaces CRM', 'active', NOW()
WHERE NOT EXISTS (SELECT 1 FROM organizations WHERE name = 'ProSpaces CRM');

-- Create RONA Atlantic if it doesn't exist  
INSERT INTO organizations (name, status, created_at)
SELECT 'RONA Atlantic', 'active', NOW()
WHERE NOT EXISTS (SELECT 1 FROM organizations WHERE name = 'RONA Atlantic');

-- Show what we have now
SELECT 'Organizations after creation:' as info;
SELECT id, name FROM organizations ORDER BY name;

-- =====================================================
-- SECTION 3: Fix profiles.organization_id
-- =====================================================

-- Get the organization IDs we need
DO $$
DECLARE
    v_prospaces_id UUID;
    v_rona_id UUID;
BEGIN
    SELECT id INTO v_prospaces_id FROM organizations WHERE name = 'ProSpaces CRM' LIMIT 1;
    SELECT id INTO v_rona_id FROM organizations WHERE name = 'RONA Atlantic' LIMIT 1;
    
    RAISE NOTICE 'ProSpaces CRM ID: %', v_prospaces_id;
    RAISE NOTICE 'RONA Atlantic ID: %', v_rona_id;
    
    -- Fix george.campbell first
    UPDATE profiles
    SET organization_id = v_prospaces_id
    WHERE email = 'george.campbell@prospaces.com';
    
    RAISE NOTICE 'Fixed george.campbell';
    
    -- Fix everyone else - assign to RONA Atlantic
    UPDATE profiles
    SET organization_id = v_rona_id
    WHERE email != 'george.campbell@prospaces.com'
      AND email IS NOT NULL;
    
    RAISE NOTICE 'Fixed other users';
END $$;

-- Verify profiles are fixed
SELECT 'Profiles after fix:' as info;
SELECT 
    p.email,
    o.name as organization,
    p.role
FROM profiles p
LEFT JOIN organizations o ON p.organization_id = o.id
ORDER BY o.name, p.email;

-- =====================================================
-- SECTION 4: Clean auth.users metadata (CAREFULLY)
-- =====================================================

-- This is the tricky part - we need to update auth.users metadata
-- to have the correct organizationId as a UUID string
DO $$
DECLARE
    user_rec RECORD;
    v_org_id_text TEXT;
BEGIN
    FOR user_rec IN 
        SELECT 
            u.id as user_id,
            u.email,
            p.organization_id,
            p.role,
            p.full_name
        FROM auth.users u
        JOIN profiles p ON u.id = p.id
        WHERE p.organization_id IS NOT NULL
    LOOP
        -- Convert UUID to text safely
        v_org_id_text := user_rec.organization_id::text;
        
        -- Update metadata with proper values
        UPDATE auth.users
        SET raw_user_meta_data = jsonb_build_object(
            'organizationId', v_org_id_text,
            'role', user_rec.role,
            'name', user_rec.full_name,
            'email', user_rec.email
        )
        WHERE id = user_rec.user_id;
        
        RAISE NOTICE 'Synced % - org: %', user_rec.email, v_org_id_text;
    END LOOP;
END $$;

-- Verify sync worked
SELECT 'Auth sync verification:' as info;
SELECT 
    u.email,
    u.raw_user_meta_data->>'organizationId' as auth_org,
    p.organization_id::text as profile_org,
    CASE 
        WHEN u.raw_user_meta_data->>'organizationId' = p.organization_id::text 
        THEN '✅ Match'
        ELSE '❌ Mismatch'
    END as status
FROM auth.users u
JOIN profiles p ON u.id = p.id
ORDER BY u.email;

-- =====================================================
-- SECTION 5: Drop old RLS policies
-- =====================================================

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
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON profiles;

SELECT 'Old policies dropped' as info;

-- =====================================================
-- SECTION 6: Create new RLS policies (SAFE version)
-- =====================================================

-- SELECT policy - super safe version
CREATE POLICY "profiles_select_policy"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    -- Can view your own profile
    auth.uid() = id
    OR
    -- Super admin can view all
    COALESCE((SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()), '') = 'super_admin'
    OR
    -- Can view profiles in your org (with safe casting)
    (
      organization_id IS NOT NULL
      AND
      (SELECT raw_user_meta_data->>'organizationId' FROM auth.users WHERE id = auth.uid()) IS NOT NULL
      AND
      organization_id::text = (SELECT raw_user_meta_data->>'organizationId' FROM auth.users WHERE id = auth.uid())
    )
  );

SELECT 'Created SELECT policy' as info;

-- INSERT policy
CREATE POLICY "profiles_insert_policy"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    COALESCE((SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()), '') 
    IN ('admin', 'super_admin')
  );

SELECT 'Created INSERT policy' as info;

-- UPDATE policy  
CREATE POLICY "profiles_update_policy"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    -- Own profile
    auth.uid() = id
    OR
    -- Super admin
    COALESCE((SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()), '') = 'super_admin'
    OR
    -- Admin in same org
    (
      COALESCE((SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()), '') = 'admin'
      AND
      organization_id IS NOT NULL
      AND
      organization_id::text = (SELECT raw_user_meta_data->>'organizationId' FROM auth.users WHERE id = auth.uid())
    )
  );

SELECT 'Created UPDATE policy' as info;

-- DELETE policy
CREATE POLICY "profiles_delete_policy"
  ON profiles FOR DELETE
  TO authenticated
  USING (
    (
      -- Super admin (not self)
      COALESCE((SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()), '') = 'super_admin'
      AND auth.uid() != id
    )
    OR
    (
      -- Admin in same org (not self)
      COALESCE((SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()), '') = 'admin'
      AND organization_id IS NOT NULL
      AND organization_id::text = (SELECT raw_user_meta_data->>'organizationId' FROM auth.users WHERE id = auth.uid())
      AND auth.uid() != id
    )
  );

SELECT 'Created DELETE policy' as info;

-- =====================================================
-- SECTION 7: Final verification
-- =====================================================

SELECT '========================================' as divider;
SELECT 'FINAL VERIFICATION' as section;
SELECT '========================================' as divider;

-- Show all policies
SELECT 'RLS Policies:' as info;
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'profiles' ORDER BY policyname;

-- Show final user assignments
SELECT 'User Assignments:' as info;
SELECT 
    p.email,
    p.full_name,
    o.name as organization,
    p.role,
    p.status
FROM profiles p
JOIN organizations o ON p.organization_id = o.id
ORDER BY o.name, p.email;

-- Show user counts
SELECT 'User Counts by Organization:' as info;
SELECT 
    o.name as organization,
    COUNT(p.id) as user_count
FROM organizations o
LEFT JOIN profiles p ON p.organization_id = o.id
GROUP BY o.name
ORDER BY o.name;

-- Show sync status
SELECT 'Auth Sync Status:' as info;
SELECT 
    u.email,
    CASE 
        WHEN u.raw_user_meta_data->>'organizationId' = p.organization_id::text 
        THEN '✅ SYNCED'
        ELSE '❌ NOT SYNCED'
    END as sync_status
FROM auth.users u
JOIN profiles p ON u.id = p.id
ORDER BY u.email;

-- =====================================================
-- SUCCESS!
-- =====================================================
-- Next steps:
-- 1. Log out of your application
-- 2. Log back in (refresh auth token)
-- 3. Go to Users page
-- 4. You should now see all users!
-- =====================================================
