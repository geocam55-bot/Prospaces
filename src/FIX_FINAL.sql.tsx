-- =====================================================
-- FINAL FIX - Handles all edge cases including UUID generation
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

-- Show organizations
SELECT '=== STEP 1: Organizations ===' as step;
SELECT id, name, status FROM organizations ORDER BY name;

-- STEP 2: Fix profiles.organization_id
-- =====================================================
DO $$
DECLARE
    v_prospaces_id UUID;
    v_rona_id UUID;
    v_count INTEGER;
BEGIN
    SELECT id INTO v_prospaces_id FROM organizations WHERE name = 'ProSpaces CRM' LIMIT 1;
    SELECT id INTO v_rona_id FROM organizations WHERE name = 'RONA Atlantic' LIMIT 1;
    
    -- Fix george.campbell
    UPDATE profiles
    SET organization_id = v_prospaces_id
    WHERE email = 'george.campbell@prospaces.com';
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE 'Moved % user(s) to ProSpaces CRM', v_count;
    
    -- Fix everyone else
    UPDATE profiles
    SET organization_id = v_rona_id
    WHERE email != 'george.campbell@prospaces.com'
      AND email IS NOT NULL;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE 'Moved % user(s) to RONA Atlantic', v_count;
END $$;

-- Show updated profiles
SELECT '=== STEP 2: Profiles Fixed ===' as step;
SELECT 
    p.email,
    o.name as organization,
    p.role
FROM profiles p
LEFT JOIN organizations o ON p.organization_id = o.id
ORDER BY o.name, p.email;

-- STEP 3: Clean auth.users metadata
-- =====================================================
DO $$
DECLARE
    user_rec RECORD;
    v_count INTEGER := 0;
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
        UPDATE auth.users
        SET raw_user_meta_data = jsonb_build_object(
            'organizationId', user_rec.organization_id::text,
            'role', user_rec.role,
            'name', user_rec.full_name,
            'email', user_rec.email
        )
        WHERE id = user_rec.user_id;
        
        v_count := v_count + 1;
    END LOOP;
    
    RAISE NOTICE 'Synced metadata for % users', v_count;
END $$;

-- Verify sync
SELECT '=== STEP 3: Auth Metadata Synced ===' as step;
SELECT 
    u.email,
    u.raw_user_meta_data->>'organizationId' as auth_org,
    p.organization_id::text as profile_org,
    CASE 
        WHEN u.raw_user_meta_data->>'organizationId' = p.organization_id::text 
        THEN '✅'
        ELSE '❌'
    END as match
FROM auth.users u
JOIN profiles p ON u.id = p.id
ORDER BY u.email;

-- STEP 4: Drop all old policies
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

SELECT '=== STEP 4: Old Policies Dropped ===' as step;

-- STEP 5: Create SELECT policy
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
    -- Same organization
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

SELECT '=== STEP 5: SELECT Policy Created ===' as step;

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

SELECT '=== STEP 6: INSERT Policy Created ===' as step;

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

SELECT '=== STEP 7: UPDATE Policy Created ===' as step;

-- STEP 8: Create DELETE policy
-- =====================================================
CREATE POLICY "profiles_delete_policy"
  ON profiles FOR DELETE
  TO authenticated
  USING (
    (
      (
        SELECT raw_user_meta_data->>'role' 
        FROM auth.users 
        WHERE id = auth.uid()
      ) = 'super_admin'
      AND auth.uid() != id
    )
    OR
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
      AND auth.uid() != id
    )
  );

SELECT '=== STEP 8: DELETE Policy Created ===' as step;

-- =====================================================
-- FINAL VERIFICATION
-- =====================================================

SELECT '========================================' as divider;
SELECT '         FINAL VERIFICATION' as divider;
SELECT '========================================' as divider;

-- Show policies
SELECT '--- RLS Policies ---' as section;
SELECT 
    policyname as policy_name,
    cmd as operation
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY policyname;

-- Show user assignments
SELECT '--- User Assignments ---' as section;
SELECT 
    p.email,
    o.name as organization,
    p.role,
    p.status
FROM profiles p
JOIN organizations o ON p.organization_id = o.id
ORDER BY o.name, p.email;

-- Show counts
SELECT '--- User Counts by Organization ---' as section;
SELECT 
    o.name as organization,
    COUNT(p.id) as user_count
FROM organizations o
LEFT JOIN profiles p ON p.organization_id = o.id
GROUP BY o.name
ORDER BY o.name;

-- Show sync status
SELECT '--- Sync Status Summary ---' as section;
SELECT 
    COUNT(*) as total_users,
    SUM(CASE WHEN u.raw_user_meta_data->>'organizationId' = p.organization_id::text THEN 1 ELSE 0 END) as synced_count,
    SUM(CASE WHEN u.raw_user_meta_data->>'organizationId' != p.organization_id::text OR u.raw_user_meta_data->>'organizationId' IS NULL THEN 1 ELSE 0 END) as not_synced_count
FROM auth.users u
JOIN profiles p ON u.id = p.id;

-- =====================================================
-- ✅ SUCCESS!
-- =====================================================
-- All done! Next steps:
-- 1. Log out of your application
-- 2. Log back in (this refreshes your auth token)
-- 3. Go to Users page
-- 4. You should now see all RONA Atlantic users!
-- =====================================================

SELECT '========================================' as final;
SELECT '✅ FIX COMPLETED SUCCESSFULLY!' as final;
SELECT '========================================' as final;
SELECT 'Now: Log out → Log in → Check Users page' as final;
