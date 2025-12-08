-- =====================================================
-- FIX EVERYTHING - VERSION 2 (Handles Invalid UUIDs)
-- =====================================================
-- This version handles users with invalid organization IDs
-- like "default-org" or other non-UUID values
-- =====================================================

BEGIN;

-- =====================================================
-- PART 0: CHECK AND CREATE ORGANIZATIONS IF MISSING
-- =====================================================

DO $$
DECLARE
    v_prospaces_org_id UUID;
    v_rona_org_id UUID;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'PART 0: CHECKING ORGANIZATIONS';
    RAISE NOTICE '========================================';
    
    -- Check if ProSpaces CRM exists
    SELECT id INTO v_prospaces_org_id 
    FROM organizations 
    WHERE name = 'ProSpaces CRM' 
    LIMIT 1;
    
    IF v_prospaces_org_id IS NULL THEN
        -- Create ProSpaces CRM
        INSERT INTO organizations (name, status, created_at)
        VALUES ('ProSpaces CRM', 'active', NOW())
        RETURNING id INTO v_prospaces_org_id;
        RAISE NOTICE '✅ Created ProSpaces CRM organization: %', v_prospaces_org_id;
    ELSE
        RAISE NOTICE '✅ Found ProSpaces CRM: %', v_prospaces_org_id;
    END IF;
    
    -- Check if RONA Atlantic exists
    SELECT id INTO v_rona_org_id 
    FROM organizations 
    WHERE name = 'RONA Atlantic' 
    LIMIT 1;
    
    IF v_rona_org_id IS NULL THEN
        -- Create RONA Atlantic
        INSERT INTO organizations (name, status, created_at)
        VALUES ('RONA Atlantic', 'active', NOW())
        RETURNING id INTO v_rona_org_id;
        RAISE NOTICE '✅ Created RONA Atlantic organization: %', v_rona_org_id;
    ELSE
        RAISE NOTICE '✅ Found RONA Atlantic: %', v_rona_org_id;
    END IF;
END $$;

-- =====================================================
-- PART 1: FIX INVALID ORGANIZATION IDs
-- =====================================================

DO $$
DECLARE
    v_rona_org_id UUID;
    v_invalid_count INTEGER;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'PART 1: FIXING INVALID ORGANIZATION IDs';
    RAISE NOTICE '========================================';
    
    -- Get RONA Atlantic ID
    SELECT id INTO v_rona_org_id 
    FROM organizations 
    WHERE name = 'RONA Atlantic' 
    LIMIT 1;
    
    -- Show users with invalid org IDs
    SELECT COUNT(*) INTO v_invalid_count
    FROM profiles
    WHERE organization_id IS NULL 
       OR NOT EXISTS (
           SELECT 1 FROM organizations WHERE id = profiles.organization_id
       );
    
    RAISE NOTICE 'Found % users with invalid organization IDs', v_invalid_count;
    
    -- Fix NULL organization_id
    UPDATE profiles
    SET organization_id = v_rona_org_id
    WHERE organization_id IS NULL
      AND email != 'george.campbell@prospaces.com';
    
    RAISE NOTICE '✅ Fixed NULL organization IDs';
    
    -- Note: We can't directly fix text-based org IDs like "default-org"
    -- because organization_id should already be UUID type
    -- If there are any, they'll be handled in the next step
END $$;

-- =====================================================
-- PART 2: FIX ORGANIZATION ASSIGNMENTS
-- =====================================================

DO $$
DECLARE
    v_prospaces_org_id UUID;
    v_rona_org_id UUID;
    v_affected_count INTEGER;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'PART 2: FIXING ORGANIZATION ASSIGNMENTS';
    RAISE NOTICE '========================================';
    
    -- Get organization IDs
    SELECT id INTO v_prospaces_org_id FROM organizations WHERE name = 'ProSpaces CRM' LIMIT 1;
    SELECT id INTO v_rona_org_id FROM organizations WHERE name = 'RONA Atlantic' LIMIT 1;

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
-- PART 3: SYNC AUTH.USERS METADATA WITH PROFILES
-- =====================================================

DO $$
DECLARE
    v_synced_count INTEGER := 0;
    profile_record RECORD;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'PART 3: SYNCING AUTH METADATA';
    RAISE NOTICE '========================================';
    
    -- Sync organizationId and role from profiles to auth.users
    FOR profile_record IN 
        SELECT id, organization_id, role, full_name as name
        FROM profiles
        WHERE organization_id IS NOT NULL
    LOOP
        UPDATE auth.users
        SET raw_user_meta_data = jsonb_set(
            jsonb_set(
                jsonb_set(
                    COALESCE(raw_user_meta_data, '{}'::jsonb),
                    '{organizationId}',
                    to_jsonb(profile_record.organization_id::text)
                ),
                '{role}',
                to_jsonb(profile_record.role)
            ),
            '{name}',
            to_jsonb(profile_record.name)
        )
        WHERE id = profile_record.id;
        
        v_synced_count := v_synced_count + 1;
    END LOOP;
    
    RAISE NOTICE '✅ Synced metadata for % users', v_synced_count;
END $$;

-- =====================================================
-- PART 4: FIX RLS POLICIES
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'PART 4: REBUILDING RLS POLICIES';
    RAISE NOTICE '========================================';
    
    -- Drop all old policies (suppress errors if they don't exist)
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
END $$;

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
      SELECT (raw_user_meta_data->>'organizationId')::uuid
      FROM auth.users
      WHERE id = auth.uid()
    )
  );

-- Create new INSERT policy
CREATE POLICY "profiles_insert_policy"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) 
    IN ('admin', 'super_admin')
  );

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
        SELECT (raw_user_meta_data->>'organizationId')::uuid
        FROM auth.users
        WHERE id = auth.uid()
      )
    )
  );

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
        SELECT (raw_user_meta_data->>'organizationId')::uuid
        FROM auth.users
        WHERE id = auth.uid()
      )
      AND auth.uid() != id
    )
  );

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Show final organization assignments
SELECT '========================================' as info;
SELECT 'VERIFICATION: Organization Assignments' as info;
SELECT '========================================' as info;

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
SELECT '========================================' as info;
SELECT 'VERIFICATION: Auth Metadata Sync' as info;
SELECT '========================================' as info;

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
SELECT '========================================' as info;
SELECT 'VERIFICATION: RLS Policies' as info;
SELECT '========================================' as info;

SELECT 
    policyname,
    cmd as operation
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;

-- User counts by organization
SELECT '========================================' as info;
SELECT 'VERIFICATION: User Counts' as info;
SELECT '========================================' as info;

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
-- ✅ Organizations created (if missing)
-- ✅ Invalid organization IDs fixed
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
