-- ============================================
-- FIX: Create Auth User for Larry Lee
-- ============================================
-- This SQL creates an auth.users record for Larry
-- Run this in your Supabase SQL Editor
-- ============================================

-- Step 1: Check if Larry's auth user exists
SELECT 
  'Auth User Check' as check_type,
  id, 
  email, 
  created_at,
  email_confirmed_at
FROM auth.users 
WHERE email = 'larry.lee@ronaatlantic.ca';

-- Expected: No rows (this is the problem)

-- Step 2: Check Larry's profile
SELECT 
  'Profile Check' as check_type,
  id, 
  email, 
  name, 
  role,
  manager_id,
  organization_id
FROM profiles 
WHERE email = 'larry.lee@ronaatlantic.ca';

-- Expected: 1 row showing Larry's profile

-- ============================================
-- MANUAL FIX INSTRUCTIONS:
-- ============================================
-- You need to create Larry's user through the Supabase Dashboard:
-- 
-- 1. Go to: Authentication → Users
-- 2. Click "Add user"
-- 3. Fill in:
--    - Email: larry.lee@ronaatlantic.ca
--    - Password: TempPassword123!
--    - Auto Confirm User: ✓ (CHECK THIS BOX)
-- 4. Click "Create user"
-- 5. Copy the new user's ID
-- 6. Run the UPDATE below (replace NEW_USER_ID with the copied ID)

-- Step 3: After creating the user in dashboard, update the profile
-- REPLACE 'NEW_USER_ID' with the actual UUID from the auth user you just created
/*
UPDATE profiles 
SET id = 'NEW_USER_ID'  -- REPLACE THIS with the new auth user ID
WHERE email = 'larry.lee@ronaatlantic.ca';
*/

-- Step 4: Also update any related records that reference the old profile ID
-- Get the old profile ID first:
DO $$
DECLARE
  old_profile_id uuid;
  new_auth_id uuid;
BEGIN
  -- Get the current profile ID
  SELECT id INTO old_profile_id FROM profiles WHERE email = 'larry.lee@ronaatlantic.ca';
  
  RAISE NOTICE 'Old Profile ID: %', old_profile_id;
  RAISE NOTICE 'You will need to update this ID after creating the auth user';
  RAISE NOTICE 'Then update created_by fields in: bids, contacts, tasks, opportunities, appointments';
END $$;

-- ============================================
-- ALTERNATIVE: Quick Test User Creation
-- ============================================
-- If the above doesn't work, you can test with a different approach
-- by creating a completely new user directly in the Sign Up flow

-- After you create the auth user and update the profile, verify:
SELECT 
  'Verification' as check_type,
  au.id as auth_id,
  au.email as auth_email,
  p.id as profile_id,
  p.email as profile_email,
  p.name,
  p.role,
  p.manager_id
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE au.email = 'larry.lee@ronaatlantic.ca';

-- Expected: Both auth and profile should have matching IDs
