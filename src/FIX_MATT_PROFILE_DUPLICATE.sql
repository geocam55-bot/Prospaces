-- ========================================
-- FIX DUPLICATE PROFILE FOR MATT BRENNAN
-- ========================================
-- This script fixes the duplicate profile issue where:
-- - Email: matt.brennan@ronaatlantic.ca
-- - Current Auth User ID: 82ab2728-e8ea-4c9a-a55c-3f1c8c250262
-- - Existing Profile User ID: edaf5c33-06a7-473b-81c5-70e10622cdc4

-- STEP 1: Check current state
-- ========================================
SELECT 
  'AUTH USER' as source,
  id,
  email,
  created_at
FROM auth.users
WHERE email = 'matt.brennan@ronaatlantic.ca'

UNION ALL

SELECT 
  'PROFILE' as source,
  id,
  email,
  created_at::text
FROM profiles
WHERE email = 'matt.brennan@ronaatlantic.ca';

-- STEP 2: Backup the old profile (just in case)
-- ========================================
-- Copy to a backup table if you want to preserve data
-- (Optional - uncomment if needed)
/*
CREATE TABLE IF NOT EXISTS profiles_backup (LIKE profiles);
INSERT INTO profiles_backup 
SELECT * FROM profiles 
WHERE email = 'matt.brennan@ronaatlantic.ca';
*/

-- STEP 3: Check which user ID is in auth.users
-- ========================================
DO $$
DECLARE
  auth_user_id uuid;
  profile_user_id uuid;
BEGIN
  -- Get the auth user ID
  SELECT id INTO auth_user_id
  FROM auth.users
  WHERE email = 'matt.brennan@ronaatlantic.ca';
  
  -- Get the profile user ID
  SELECT id INTO profile_user_id
  FROM profiles
  WHERE email = 'matt.brennan@ronaatlantic.ca';
  
  RAISE NOTICE 'Auth User ID: %', auth_user_id;
  RAISE NOTICE 'Profile User ID: %', profile_user_id;
  
  IF auth_user_id IS NULL THEN
    RAISE EXCEPTION 'No auth user found with this email';
  END IF;
  
  IF auth_user_id != profile_user_id THEN
    RAISE NOTICE '❌ MISMATCH DETECTED - Will fix in next step';
  ELSE
    RAISE NOTICE '✅ IDs already match - no fix needed';
  END IF;
END $$;

-- STEP 4: FIX THE ISSUE - Update profile to match auth user
-- ========================================
-- Option A: Update the existing profile with the correct user ID
-- This preserves any data associated with the profile

UPDATE profiles
SET 
  id = (SELECT id FROM auth.users WHERE email = 'matt.brennan@ronaatlantic.ca'),
  updated_at = NOW()
WHERE email = 'matt.brennan@ronaatlantic.ca'
  AND id != (SELECT id FROM auth.users WHERE email = 'matt.brennan@ronaatlantic.ca');

-- STEP 5: Verify the fix
-- ========================================
SELECT 
  u.id as auth_user_id,
  p.id as profile_user_id,
  p.email,
  p.name,
  p.role,
  p.organization_id,
  CASE 
    WHEN u.id = p.id THEN '✅ FIXED - IDs Match'
    ELSE '❌ STILL BROKEN - IDs Do Not Match'
  END as status
FROM auth.users u
LEFT JOIN profiles p ON u.email = p.email
WHERE u.email = 'matt.brennan@ronaatlantic.ca';

-- STEP 6: Check for any other duplicates
-- ========================================
SELECT email, COUNT(*) as count
FROM profiles
GROUP BY email
HAVING COUNT(*) > 1;

-- ========================================
-- ALTERNATIVE FIX (if update doesn't work)
-- ========================================
-- If the UPDATE above fails due to foreign key constraints,
-- use this approach instead:

/*
-- Delete the old profile
DELETE FROM profiles
WHERE email = 'matt.brennan@ronaatlantic.ca'
  AND id = 'edaf5c33-06a7-473b-81c5-70e10622cdc4';

-- Create a new profile with the correct ID
INSERT INTO profiles (id, email, name, role, organization_id, status, created_at, updated_at)
SELECT 
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'name', split_part(u.email, '@', 1)),
  'admin',  -- or whatever role is appropriate
  '00000000-0000-0000-0000-000000000001',  -- Update with correct org ID
  'active',
  u.created_at,
  NOW()
FROM auth.users u
WHERE u.email = 'matt.brennan@ronaatlantic.ca'
ON CONFLICT (id) DO NOTHING;
*/

-- ========================================
-- FINAL VERIFICATION
-- ========================================
SELECT 
  'Verification Complete' as message,
  COUNT(CASE WHEN u.id = p.id THEN 1 END) as matching_profiles,
  COUNT(CASE WHEN u.id != p.id THEN 1 END) as mismatched_profiles
FROM auth.users u
JOIN profiles p ON u.email = p.email;
