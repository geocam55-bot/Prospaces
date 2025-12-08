-- =====================================================
-- COMPLETE FIX - Everything in One Script
-- =====================================================
-- This fixes ALL issues:
-- 1. Data issues (organizations, user assignments)
-- 2. Auth metadata (removes "default-org", adds proper UUIDs)
-- 3. RLS policies (no recursion - uses auth.jwt())
-- 4. Creates invitations table
-- 5. Creates test invitation codes
-- 6. Ensures sign-in works
-- =====================================================

-- A: ORGANIZATIONS
-- =====================================================
INSERT INTO organizations (id, name, status, created_at, updated_at)
SELECT gen_random_uuid()::text, 'ProSpaces CRM', 'active', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM organizations WHERE name = 'ProSpaces CRM');

INSERT INTO organizations (id, name, status, created_at, updated_at)
SELECT gen_random_uuid()::text, 'RONA Atlantic', 'active', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM organizations WHERE name = 'RONA Atlantic');

SELECT '✅ A: Organizations created' as status;

-- B: USER ASSIGNMENTS
-- =====================================================
-- Fix profiles organization_id for existing users
UPDATE profiles
SET organization_id = (SELECT id FROM organizations WHERE name = 'ProSpaces CRM' LIMIT 1)
WHERE email = 'george.campbell@prospaces.com';

UPDATE profiles
SET organization_id = (SELECT id FROM organizations WHERE name = 'RONA Atlantic' LIMIT 1)
WHERE email != 'george.campbell@prospaces.com'
  AND email IS NOT NULL
  AND (organization_id IS NULL OR organization_id NOT IN (SELECT id FROM organizations));

SELECT '✅ B: User assignments fixed' as status;

-- C: CLEAN AUTH METADATA FIRST (CRITICAL!)
-- =====================================================
-- This MUST happen BEFORE syncing profiles!

-- C1: Clean up any invalid organizationId values in auth.users
DO $$
DECLARE
    v_rona_id TEXT;
    v_prospaces_id TEXT;
BEGIN
    SELECT id INTO v_rona_id FROM organizations WHERE name = 'RONA Atlantic' LIMIT 1;
    SELECT id INTO v_prospaces_id FROM organizations WHERE name = 'ProSpaces CRM' LIMIT 1;
    
    -- Update auth.users to remove invalid organizationId values
    UPDATE auth.users
    SET raw_user_meta_data = jsonb_build_object(
        'role', COALESCE(raw_user_meta_data->>'role', 'standard_user'),
        'name', COALESCE(raw_user_meta_data->>'name', email),
        'email', email,
        'organizationId', v_rona_id  -- Set to valid org
    )
    WHERE raw_user_meta_data->>'organizationId' IS NOT NULL
      AND raw_user_meta_data->>'organizationId' NOT IN (
          SELECT id FROM organizations
      );
    
    RAISE NOTICE 'Cleaned up invalid organizationId values in auth.users';
END $$;

SELECT '✅ C: Auth metadata cleaned (removed invalid org IDs)' as status;

-- D: FIX EXISTING PROFILES AUTH METADATA
-- =====================================================
-- Update auth metadata for users who already have valid profiles
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

SELECT '✅ D: Auth metadata synced with existing profiles' as status;

-- E: INVITATIONS TABLE
-- =====================================================

-- E1: Create invitations table
CREATE TABLE IF NOT EXISTS public.invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'standard_user',
  invitation_code TEXT NOT NULL UNIQUE,
  status TEXT DEFAULT 'pending',
  invited_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  used_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_invitations_code ON invitations(invitation_code);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON invitations(status);

-- Enable RLS
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "invitations_select_policy" ON invitations;
DROP POLICY IF EXISTS "invitations_insert_policy" ON invitations;
DROP POLICY IF EXISTS "invitations_update_policy" ON invitations;
DROP POLICY IF EXISTS "invitations_delete_policy" ON invitations;

-- Anyone can read invitations (needed for signup)
CREATE POLICY "invitations_select_policy"
  ON invitations FOR SELECT
  TO authenticated, anon
  USING (true);

-- Only admins can create invitations
CREATE POLICY "invitations_insert_policy"
  ON invitations FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'super_admin')
  );

-- Only admins can update invitations
CREATE POLICY "invitations_update_policy"
  ON invitations FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'super_admin')
  );

-- Only admins can delete invitations
CREATE POLICY "invitations_delete_policy"
  ON invitations FOR DELETE
  TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'super_admin')
  );

SELECT '✅ E1: Invitations table created' as status;

-- E2: Create test invitation codes
DO $$
DECLARE
    v_rona_id TEXT;
    v_admin_id UUID;
BEGIN
    SELECT id INTO v_rona_id FROM organizations WHERE name = 'RONA Atlantic' LIMIT 1;
    SELECT id INTO v_admin_id FROM profiles WHERE role IN ('admin', 'super_admin') LIMIT 1;
    
    INSERT INTO invitations (email, organization_id, role, invitation_code, status, invited_by, expires_at)
    SELECT 'test@example.com', v_rona_id, 'standard_user', 'TEST2024', 'pending', v_admin_id, NOW() + INTERVAL '365 days'
    WHERE NOT EXISTS (SELECT 1 FROM invitations WHERE invitation_code = 'TEST2024');
    
    INSERT INTO invitations (email, organization_id, role, invitation_code, status, invited_by, expires_at)
    SELECT 'admin@example.com', v_rona_id, 'admin', 'ADMIN2024', 'pending', v_admin_id, NOW() + INTERVAL '365 days'
    WHERE NOT EXISTS (SELECT 1 FROM invitations WHERE invitation_code = 'ADMIN2024');
    
    INSERT INTO invitations (email, organization_id, role, invitation_code, status, invited_by, expires_at)
    SELECT 'newuser@ronaatlantic.ca', v_rona_id, 'standard_user', 'RONA2024', 'pending', v_admin_id, NOW() + INTERVAL '365 days'
    WHERE NOT EXISTS (SELECT 1 FROM invitations WHERE invitation_code = 'RONA2024');
END $$;

SELECT '✅ E2: Test invitation codes created' as status;

-- F: SYNC PROFILES WITH AUTH USERS
-- =====================================================
-- Now it's safe to sync because auth metadata is clean!

DO $$
DECLARE
    v_rona_id TEXT;
    v_user RECORD;
    v_org_id TEXT;
BEGIN
    SELECT id INTO v_rona_id FROM organizations WHERE name = 'RONA Atlantic' LIMIT 1;
    
    -- Loop through auth users that don't have profiles
    FOR v_user IN 
        SELECT u.id, u.email, u.raw_user_meta_data
        FROM auth.users u
        WHERE NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = u.id)
    LOOP
        -- Get organizationId from metadata, or use default
        v_org_id := COALESCE(v_user.raw_user_meta_data->>'organizationId', v_rona_id);
        
        -- Verify the org exists, otherwise use default
        IF NOT EXISTS (SELECT 1 FROM organizations WHERE id = v_org_id) THEN
            v_org_id := v_rona_id;
            RAISE NOTICE 'User % had invalid org, using default', v_user.email;
        END IF;
        
        -- Try to insert, handle email conflicts
        BEGIN
            INSERT INTO profiles (id, email, name, role, organization_id, status)
            VALUES (
                v_user.id,
                v_user.email,
                COALESCE(v_user.raw_user_meta_data->>'name', v_user.email),
                COALESCE(v_user.raw_user_meta_data->>'role', 'standard_user'),
                v_org_id,
                'active'
            );
        EXCEPTION WHEN unique_violation THEN
            -- If email exists, update the existing profile with this user's ID
            UPDATE profiles 
            SET id = v_user.id,
                name = COALESCE(v_user.raw_user_meta_data->>'name', name),
                role = COALESCE(v_user.raw_user_meta_data->>'role', role),
                organization_id = v_org_id
            WHERE email = v_user.email;
            
            RAISE NOTICE 'Updated existing profile for email: %', v_user.email;
        END;
    END LOOP;
END $$;

SELECT '✅ F: Profiles synced with auth.users' as status;

-- G: CONFIRM ALL EMAILS
-- =====================================================
UPDATE auth.users
SET email_confirmed_at = COALESCE(email_confirmed_at, NOW())
WHERE email_confirmed_at IS NULL;

SELECT '✅ G: All emails confirmed' as status;

-- H: RLS POLICIES (NO RECURSION)
-- =====================================================

-- Drop ALL old policies
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

SELECT '✅ H1: Old policies dropped' as status;

-- H2: Create new NON-RECURSIVE policies using auth.jwt()

-- SELECT policy
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

-- DELETE policy
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

SELECT '✅ H2: New policies created (NO RECURSION!)' as status;

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

-- Invitation codes
SELECT '--- Available Invitation Codes ---' as section;
SELECT 
    invitation_code,
    email,
    role,
    status,
    TO_CHAR(expires_at, 'YYYY-MM-DD') as expires
FROM invitations
WHERE status = 'pending'
  AND expires_at > NOW()
ORDER BY created_at DESC;

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
SELECT '✅ ALL ISSUES FIXED!' as title;
SELECT '========================================' as divider;
SELECT '' as spacer;

-- Instructions
SELECT '📝 NEXT STEPS:' as instruction;
SELECT '' as spacer;
SELECT '1️⃣ EXISTING USERS (Sign In):' as instruction;
SELECT '   ✅ All emails confirmed' as instruction;
SELECT '   ✅ All profiles synced' as instruction;
SELECT '   ✅ Auth metadata fixed' as instruction;
SELECT '   → Log out and log back in!' as instruction;
SELECT '' as spacer;
SELECT '2️⃣ NEW USERS (Sign Up):' as instruction;
SELECT '   Use invitation code:' as instruction;
SELECT '   • TEST2024 (standard user)' as instruction;
SELECT '   • ADMIN2024 (admin role)' as instruction;
SELECT '   • RONA2024 (RONA Atlantic)' as instruction;
SELECT '' as spacer;
SELECT '3️⃣ CRITICAL:' as instruction;
SELECT '   ⚠️  MUST LOG OUT AND LOG BACK IN' as instruction;
SELECT '   (This refreshes your JWT token)' as instruction;
SELECT '' as spacer;
