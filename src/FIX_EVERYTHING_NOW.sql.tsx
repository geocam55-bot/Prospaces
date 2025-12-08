-- =====================================================
-- FIX EVERYTHING - ALL-IN-ONE SCRIPT
-- =====================================================
-- This script fixes BOTH issues:
-- 1. Organization assignments (george vs RONA Atlantic)
-- 2. User visibility (why you can't see other users)
-- =====================================================

BEGIN;

-- =====================================================
-- PART 1: FIX ORGANIZATION ASSIGNMENTS
-- =====================================================

DO $$
DECLARE
    v_prospaces_org_id UUID;
    v_rona_org_id UUID;
    v_affected_count INTEGER;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'PART 1: FIXING ORGANIZATION ASSIGNMENTS';
    RAISE NOTICE '========================================';
    
    -- Get organization IDs
    SELECT id INTO v_prospaces_org_id FROM organizations WHERE name = 'ProSpaces CRM' LIMIT 1;
    SELECT id INTO v_rona_org_id FROM organizations WHERE name = 'RONA Atlantic' LIMIT 1;

    IF v_prospaces_org_id IS NULL THEN
        RAISE EXCEPTION 'ProSpaces CRM organization not found!';
    END IF;
    
    IF v_rona_org_id IS NULL THEN
        RAISE EXCEPTION 'RONA Atlantic organization not found!';
    END IF;

    RAISE NOTICE 'ProSpaces CRM ID: %', v_prospaces_org_id;
    RAISE NOTICE 'RONA Atlantic ID: %', v_rona_org_id;

    -- Move george.campbell to ProSpaces CRM
    UPDATE profiles
    SET organization_id = v_prospaces_org_id
    WHERE email = 'george.campbell@prospaces.com';
    
    GET DIAGNOSTICS v_affected_count = ROW_COUNT;
    RAISE NOTICE '✅ Moved % user(s) to ProSpaces CRM', v_affected_count;

    -- Move everyone else to RONA Atlantic
    UPDATE profiles
    SET organization_id = v_rona_org_id
    WHERE email != 'george.campbell@prospaces.com'
      AND email IS NOT NULL;
    
    GET DIAGNOSTICS v_affected_count = ROW_COUNT;
    RAISE NOTICE '✅ Moved % user(s) to RONA Atlantic', v_affected_count;
END $$;

-- =====================================================
-- PART 2: SYNC AUTH.USERS METADATA WITH PROFILES
-- =====================================================

DO $$
DECLARE
    v_synced_count INTEGER := 0;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'PART 2: SYNCING AUTH METADATA';
    RAISE NOTICE '========================================';
    
    -- Sync organizationId and role from profiles to auth.users
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
    
    GET DIAGNOSTICS v_synced_count = ROW_COUNT;
    RAISE NOTICE '✅ Synced metadata for % users', v_synced_count;
END $$;

-- =====================================================
-- PART 3: FIX RLS POLICIES
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'PART 3: REBUILDING RLS POLICIES';
    RAISE NOTICE '========================================';
    
    -- Drop all old policies
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
    
    RAISE NOTICE '✅ Dropped old policies';
    
    -- Create new SELECT policy
    CREATE POLICY "profiles_select_policy"
      ON profiles FOR SELECT
      TO authenticated
      USING (
        auth.uid() = id
        OR
        (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'super_admin'
        OR
        organization_id = (
          SELECT raw_user_meta_data->>'organizationId'
          FROM auth.users
          WHERE id = auth.uid()
        )::uuid
      );
    
    RAISE NOTICE '✅ Created SELECT policy';
    
    -- Create new INSERT policy
    CREATE POLICY "profiles_insert_policy"
      ON profiles FOR INSERT
      TO authenticated
      WITH CHECK (
        (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) 
        IN ('admin', 'super_admin')
      );
    
    RAISE NOTICE '✅ Created INSERT policy';
    
    -- Create new UPDATE policy
    CREATE POLICY "profiles_update_policy"
      ON profiles FOR UPDATE
      TO authenticated
      USING (
        auth.uid() = id
        OR
        (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'super_admin'
        OR
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
    
    RAISE NOTICE '✅ Created UPDATE policy';
    
    -- Create new DELETE policy
    CREATE POLICY "profiles_delete_policy"
      ON profiles FOR DELETE
      TO authenticated
      USING (
        (
          (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'super_admin'
          AND auth.uid() != id
        )
        OR
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
    
    RAISE NOTICE '✅ Created DELETE policy';
END $$;

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Show final organization assignments
SELECT 
    '========================================' as separator,
    'VERIFICATION: Organization Assignments' as section,
    '========================================' as separator2;

SELECT 
    p.email,
    p.full_name,
    p.role,
    o.name as organization,
    p.status
FROM profiles p
LEFT JOIN organizations o ON p.organization_id = o.id
ORDER BY o.name, p.email;

-- Show auth metadata sync status
SELECT 
    '========================================' as separator,
    'VERIFICATION: Auth Metadata Sync' as section,
    '========================================' as separator2;

SELECT 
    u.email,
    u.raw_user_meta_data->>'organizationId' as auth_org,
    p.organization_id::text as profile_org,
    CASE 
        WHEN u.raw_user_meta_data->>'organizationId' = p.organization_id::text 
        THEN '✅ SYNCED' 
        ELSE '❌ MISMATCH' 
    END as sync_status
FROM auth.users u
JOIN profiles p ON u.id = p.id
ORDER BY u.email;

-- Show RLS policies
SELECT 
    '========================================' as separator,
    'VERIFICATION: RLS Policies' as section,
    '========================================' as separator2;

SELECT 
    policyname,
    cmd as operation
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;

-- User counts by organization
SELECT 
    '========================================' as separator,
    'VERIFICATION: User Counts' as section,
    '========================================' as separator2;

SELECT 
    o.name as organization,
    COUNT(p.id) as user_count
FROM organizations o
LEFT JOIN profiles p ON p.organization_id = o.id
GROUP BY o.name
ORDER BY o.name;

COMMIT;

-- =====================================================
-- SUCCESS! 
-- =====================================================
-- What was fixed:
-- ✅ george.campbell@prospaces.com → ProSpaces CRM
-- ✅ All other users → RONA Atlantic
-- ✅ Auth metadata synced with profiles
-- ✅ RLS policies rebuilt
-- 
-- IMPORTANT NEXT STEPS:
-- 1. Log out of the application
-- 2. Log back in (this refreshes your auth token)
-- 3. Go to Users page
-- 4. You should now see all RONA Atlantic users!
-- =====================================================
