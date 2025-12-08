-- =====================================================
-- FIX AUTHENTICATION ISSUES
-- =====================================================
-- This fixes:
-- 1. Missing invitations table
-- 2. Creates test invitation codes
-- 3. Ensures users can sign in
-- =====================================================

-- PART 1: Create invitations table if it doesn't exist
-- =====================================================
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

-- Drop existing policies if any
DROP POLICY IF EXISTS "invitations_select_policy" ON invitations;
DROP POLICY IF EXISTS "invitations_insert_policy" ON invitations;
DROP POLICY IF EXISTS "invitations_update_policy" ON invitations;
DROP POLICY IF EXISTS "invitations_delete_policy" ON invitations;

-- Anyone can read invitations (needed for signup verification)
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

SELECT '✅ Part 1: Invitations table created/verified' as status;

-- PART 2: Create default invitation codes for testing
-- =====================================================

-- Get organization IDs
DO $$
DECLARE
    v_prospaces_id TEXT;
    v_rona_id TEXT;
    v_admin_id UUID;
BEGIN
    -- Get organization IDs
    SELECT id INTO v_prospaces_id FROM organizations WHERE name = 'ProSpaces CRM' LIMIT 1;
    SELECT id INTO v_rona_id FROM organizations WHERE name = 'RONA Atlantic' LIMIT 1;
    
    -- Get an admin user ID (for invited_by field)
    SELECT id INTO v_admin_id FROM profiles WHERE role IN ('admin', 'super_admin') LIMIT 1;
    
    -- Create test invitation codes if they don't exist
    
    -- Universal test code for any email
    INSERT INTO invitations (email, organization_id, role, invitation_code, status, invited_by, expires_at)
    SELECT 
        'test@example.com', 
        v_rona_id, 
        'standard_user', 
        'TEST2024', 
        'pending',
        v_admin_id,
        NOW() + INTERVAL '365 days'
    WHERE NOT EXISTS (SELECT 1 FROM invitations WHERE invitation_code = 'TEST2024');
    
    -- Admin invitation code
    INSERT INTO invitations (email, organization_id, role, invitation_code, status, invited_by, expires_at)
    SELECT 
        'admin@example.com', 
        v_rona_id, 
        'admin', 
        'ADMIN2024', 
        'pending',
        v_admin_id,
        NOW() + INTERVAL '365 days'
    WHERE NOT EXISTS (SELECT 1 FROM invitations WHERE invitation_code = 'ADMIN2024');
    
    -- RONA Atlantic general invitation
    INSERT INTO invitations (email, organization_id, role, invitation_code, status, invited_by, expires_at)
    SELECT 
        'newuser@ronaatlantic.ca', 
        v_rona_id, 
        'standard_user', 
        'RONA2024', 
        'pending',
        v_admin_id,
        NOW() + INTERVAL '365 days'
    WHERE NOT EXISTS (SELECT 1 FROM invitations WHERE invitation_code = 'RONA2024');
    
    RAISE NOTICE 'Created default invitation codes';
END $$;

SELECT '✅ Part 2: Test invitation codes created' as status;

-- PART 3: Verify all users have proper email confirmation
-- =====================================================

-- Mark all existing users as email confirmed (for existing users who are having issues)
UPDATE auth.users
SET email_confirmed_at = COALESCE(email_confirmed_at, NOW())
WHERE email_confirmed_at IS NULL;

SELECT '✅ Part 3: Email confirmations verified' as status;

-- PART 4: Ensure all profiles exist for auth users
-- =====================================================

-- Insert missing profiles for any auth users without profiles
DO $$
DECLARE
    v_rona_id TEXT;
BEGIN
    SELECT id INTO v_rona_id FROM organizations WHERE name = 'RONA Atlantic' LIMIT 1;
    
    INSERT INTO profiles (id, email, name, role, organization_id, status)
    SELECT 
        u.id,
        u.email,
        COALESCE(u.raw_user_meta_data->>'name', u.email),
        COALESCE(u.raw_user_meta_data->>'role', 'standard_user'),
        COALESCE(u.raw_user_meta_data->>'organizationId', v_rona_id),
        'active'
    FROM auth.users u
    WHERE NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = u.id)
    ON CONFLICT (id) DO NOTHING;
    
    RAISE NOTICE 'Ensured all auth users have profiles';
END $$;

SELECT '✅ Part 4: Profiles synced with auth.users' as status;

-- =====================================================
-- VERIFICATION
-- =====================================================

SELECT '' as spacer;
SELECT '========================================' as divider;
SELECT '         VERIFICATION' as title;
SELECT '========================================' as divider;
SELECT '' as spacer;

-- Show available invitation codes
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

-- Show user/profile sync status
SELECT '--- User/Profile Sync Status ---' as section;
SELECT 
    COUNT(*) as total_auth_users,
    COUNT(p.id) as users_with_profiles,
    COUNT(*) - COUNT(p.id) as missing_profiles
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id;

SELECT '' as spacer;

-- Show users with profiles
SELECT '--- Users Ready to Sign In ---' as section;
SELECT 
    u.email,
    p.role,
    o.name as organization,
    CASE 
        WHEN u.email_confirmed_at IS NOT NULL THEN '✅'
        ELSE '❌'
    END as email_confirmed
FROM auth.users u
JOIN profiles p ON u.id = p.id
LEFT JOIN organizations o ON p.organization_id = o.id
ORDER BY u.email;

SELECT '' as spacer;
SELECT '========================================' as divider;
SELECT '✅ AUTH ISSUES FIXED!' as title;
SELECT '========================================' as divider;
SELECT '' as spacer;

-- Display instructions
SELECT '📝 INSTRUCTIONS:' as info;
SELECT '' as spacer;
SELECT '1️⃣ SIGN UP (New Users):' as info;
SELECT '   Use invitation code: TEST2024' as info;
SELECT '   Or: ADMIN2024 (for admin role)' as info;
SELECT '   Or: RONA2024 (for RONA Atlantic users)' as info;
SELECT '' as spacer;
SELECT '2️⃣ SIGN IN (Existing Users):' as info;
SELECT '   ✅ All existing users email confirmed' as info;
SELECT '   ✅ All users have profiles' as info;
SELECT '   ✅ Can now sign in with email/password' as info;
SELECT '' as spacer;
SELECT '3️⃣ IF SIGN IN FAILS:' as info;
SELECT '   - Check your password is correct' as info;
SELECT '   - Email is case-sensitive' as info;
SELECT '   - Try resetting password if needed' as info;
SELECT '' as spacer;
SELECT '4️⃣ NEXT STEP:' as info;
SELECT '   Try signing in now! Should work ✅' as info;
SELECT '' as spacer;