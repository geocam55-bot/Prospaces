-- =====================================================
-- SIMPLE FIX - Direct approach, no complexity
-- =====================================================

-- Step 1: Create organizations if they don't exist
INSERT INTO organizations (id, name, status, created_at, updated_at)
SELECT gen_random_uuid(), 'ProSpaces CRM', 'active', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM organizations WHERE name = 'ProSpaces CRM');

INSERT INTO organizations (id, name, status, created_at, updated_at)
SELECT gen_random_uuid(), 'RONA Atlantic', 'active', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM organizations WHERE name = 'RONA Atlantic');

-- Step 2: Fix profiles organization_id
UPDATE profiles
SET organization_id = (SELECT id FROM organizations WHERE name = 'ProSpaces CRM' LIMIT 1)
WHERE email = 'george.campbell@prospaces.com';

UPDATE profiles
SET organization_id = (SELECT id FROM organizations WHERE name = 'RONA Atlantic' LIMIT 1)
WHERE email != 'george.campbell@prospaces.com'
  AND email IS NOT NULL;

-- Step 3: Fix auth.users metadata - CRITICAL: Only writes, never reads old values
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

-- Step 4: Drop old policies
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

-- Step 5: Create new policies
CREATE POLICY "profiles_select_policy"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id
    OR
    COALESCE((SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()), '') = 'super_admin'
    OR
    (
      organization_id IS NOT NULL
      AND
      organization_id::text = COALESCE((SELECT raw_user_meta_data->>'organizationId' FROM auth.users WHERE id = auth.uid()), '')
    )
  );

CREATE POLICY "profiles_insert_policy"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    COALESCE((SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()), '') 
    IN ('admin', 'super_admin')
  );

CREATE POLICY "profiles_update_policy"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = id
    OR
    COALESCE((SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()), '') = 'super_admin'
    OR
    (
      COALESCE((SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()), '') = 'admin'
      AND
      organization_id IS NOT NULL
      AND
      organization_id::text = COALESCE((SELECT raw_user_meta_data->>'organizationId' FROM auth.users WHERE id = auth.uid()), '')
    )
  );

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

-- Verification
SELECT '=== Organizations ===' as section;
SELECT id, name FROM organizations ORDER BY name;

SELECT '=== User Assignments ===' as section;
SELECT 
    p.email,
    o.name as organization,
    p.role
FROM profiles p
JOIN organizations o ON p.organization_id = o.id
ORDER BY o.name, p.email;

SELECT '=== Metadata Sync ===' as section;
SELECT 
    u.email,
    CASE 
        WHEN u.raw_user_meta_data->>'organizationId' = p.organization_id::text 
        THEN '✅'
        ELSE '❌'
    END as synced
FROM auth.users u
JOIN profiles p ON u.id = p.id
ORDER BY u.email;

SELECT '=== DONE! ===' as section;
SELECT 'Now log out and log back in!' as instruction;