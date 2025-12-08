-- =====================================================
-- NO-CAST FIX - Never touches old metadata
-- =====================================================
-- This version completely ignores existing metadata
-- and rebuilds everything from profiles table
-- =====================================================

-- STEP 1: Create organizations with explicit UUIDs
-- =====================================================
DO $$
DECLARE
    v_prospaces_id UUID;
    v_rona_id UUID;
BEGIN
    -- Check if ProSpaces CRM exists
    SELECT id INTO v_prospaces_id FROM organizations WHERE name = 'ProSpaces CRM' LIMIT 1;
    
    IF v_prospaces_id IS NULL THEN
        v_prospaces_id := gen_random_uuid();
        INSERT INTO organizations (id, name, status, created_at, updated_at)
        VALUES (v_prospaces_id, 'ProSpaces CRM', 'active', NOW(), NOW());
        RAISE NOTICE 'Created ProSpaces CRM: %', v_prospaces_id;
    ELSE
        RAISE NOTICE 'ProSpaces CRM exists: %', v_prospaces_id;
    END IF;
    
    -- Check if RONA Atlantic exists
    SELECT id INTO v_rona_id FROM organizations WHERE name = 'RONA Atlantic' LIMIT 1;
    
    IF v_rona_id IS NULL THEN
        v_rona_id := gen_random_uuid();
        INSERT INTO organizations (id, name, status, created_at, updated_at)
        VALUES (v_rona_id, 'RONA Atlantic', 'active', NOW(), NOW());
        RAISE NOTICE 'Created RONA Atlantic: %', v_rona_id;
    ELSE
        RAISE NOTICE 'RONA Atlantic exists: %', v_rona_id;
    END IF;
END $$;

SELECT '=== STEP 1 COMPLETE: Organizations Created ===' as status;

-- STEP 2: Fix profiles.organization_id
-- =====================================================
DO $$
DECLARE
    v_prospaces_id UUID;
    v_rona_id UUID;
BEGIN
    SELECT id INTO v_prospaces_id FROM organizations WHERE name = 'ProSpaces CRM' LIMIT 1;
    SELECT id INTO v_rona_id FROM organizations WHERE name = 'RONA Atlantic' LIMIT 1;
    
    -- Fix george.campbell
    UPDATE profiles
    SET organization_id = v_prospaces_id
    WHERE email = 'george.campbell@prospaces.com';
    
    -- Fix everyone else
    UPDATE profiles
    SET organization_id = v_rona_id
    WHERE email != 'george.campbell@prospaces.com'
      AND email IS NOT NULL;
      
    RAISE NOTICE 'Updated all profiles with correct organization_id';
END $$;

SELECT '=== STEP 2 COMPLETE: Profiles Fixed ===' as status;

-- STEP 3: Completely rebuild auth.users metadata (no reading old values)
-- =====================================================
-- This is the critical part - we ONLY write, never read old metadata
DO $$
DECLARE
    v_user_count INTEGER := 0;
BEGIN
    -- Update ALL users at once, completely replacing metadata
    UPDATE auth.users u
    SET raw_user_meta_data = jsonb_build_object(
        'organizationId', p.organization_id::text,
        'role', p.role,
        'name', COALESCE(p.name, ''),
        'email', p.email
    )
    FROM profiles p
    WHERE u.id = p.id
      AND p.organization_id IS NOT NULL;
    
    GET DIAGNOSTICS v_user_count = ROW_COUNT;
    RAISE NOTICE 'Rebuilt metadata for % users', v_user_count;
END $$;

SELECT '=== STEP 3 COMPLETE: Metadata Rebuilt ===' as status;

-- STEP 4: Drop all old RLS policies
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
        RAISE NOTICE 'Dropped policy: %', pol.policyname;
    END LOOP;
END $$;

SELECT '=== STEP 4 COMPLETE: Old Policies Dropped ===' as status;

-- STEP 5: Create new SELECT policy
-- =====================================================
CREATE POLICY "profiles_select_policy"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    -- Own profile
    auth.uid() = id
    OR
    -- Super admin sees all
    COALESCE((SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()), '') = 'super_admin'
    OR
    -- Same organization (text comparison only, never cast)
    (
      organization_id IS NOT NULL
      AND
      organization_id::text = COALESCE((SELECT raw_user_meta_data->>'organizationId' FROM auth.users WHERE id = auth.uid()), '')
    )
  );

SELECT '=== STEP 5 COMPLETE: SELECT Policy Created ===' as status;

-- STEP 6: Create INSERT policy
-- =====================================================
CREATE POLICY "profiles_insert_policy"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    COALESCE((SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()), '') 
    IN ('admin', 'super_admin')
  );

SELECT '=== STEP 6 COMPLETE: INSERT Policy Created ===' as status;

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
    COALESCE((SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()), '') = 'super_admin'
    OR
    -- Admin in same org
    (
      COALESCE((SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()), '') = 'admin'
      AND
      organization_id IS NOT NULL
      AND
      organization_id::text = COALESCE((SELECT raw_user_meta_data->>'organizationId' FROM auth.users WHERE id = auth.uid()), '')
    )
  );

SELECT '=== STEP 7 COMPLETE: UPDATE Policy Created ===' as status;

-- STEP 8: Create DELETE policy
-- =====================================================
CREATE POLICY "profiles_delete_policy"
  ON profiles FOR DELETE
  TO authenticated
  USING (
    (
      COALESCE((SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()), '') = 'super_admin'
      AND auth.uid() != id
    )
    OR
    (
      COALESCE((SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()), '') = 'admin'
      AND
      organization_id IS NOT NULL
      AND
      organization_id::text = COALESCE((SELECT raw_user_meta_data->>'organizationId' FROM auth.users WHERE id = auth.uid()), '')
      AND auth.uid() != id
    )
  );

SELECT '=== STEP 8 COMPLETE: DELETE Policy Created ===' as status;

-- =====================================================
-- VERIFICATION
-- =====================================================

SELECT '' as spacer;
SELECT '========================================' as divider;
SELECT '         VERIFICATION RESULTS' as divider;
SELECT '========================================' as divider;
SELECT '' as spacer;

-- Show organizations
SELECT '--- Organizations ---' as section;
SELECT id, name, status FROM organizations ORDER BY name;

SELECT '' as spacer;

-- Show user assignments
SELECT '--- User Assignments ---' as section;
SELECT 
    p.email,
    o.name as organization,
    p.role
FROM profiles p
JOIN organizations o ON p.organization_id = o.id
ORDER BY o.name, p.email;

SELECT '' as spacer;

-- Show metadata sync (text only, no casting)
SELECT '--- Metadata Sync Status ---' as section;
SELECT 
    u.email,
    u.raw_user_meta_data->>'organizationId' as auth_org_id,
    p.organization_id::text as profile_org_id,
    CASE 
        WHEN u.raw_user_meta_data->>'organizationId' = p.organization_id::text 
        THEN '✅ SYNCED'
        ELSE '❌ NOT SYNCED'
    END as status
FROM auth.users u
JOIN profiles p ON u.id = p.id
ORDER BY u.email;

SELECT '' as spacer;

-- Show user counts
SELECT '--- User Counts ---' as section;
SELECT 
    o.name as organization,
    COUNT(p.id) as user_count
FROM organizations o
LEFT JOIN profiles p ON p.organization_id = o.id
GROUP BY o.name
ORDER BY o.name;

SELECT '' as spacer;

-- Show policies
SELECT '--- RLS Policies ---' as section;
SELECT 
    policyname as policy_name,
    cmd as operation
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY policyname;

SELECT '' as spacer;
SELECT '========================================' as divider;
SELECT '✅ ALL STEPS COMPLETED SUCCESSFULLY!' as divider;
SELECT '========================================' as divider;
SELECT '' as spacer;
SELECT 'NEXT STEPS:' as instructions;
SELECT '1. Log out of your application' as instructions;
SELECT '2. Log back in (refresh auth token)' as instructions;
SELECT '3. Go to Users page' as instructions;
SELECT '4. You should see all users! ✅' as instructions;
SELECT '' as spacer;