-- Fix Duplicate Email Profile Issue
-- This script resolves the issue where the same email exists with two different user IDs in the profiles table

-- Step 1: Check for duplicate emails
SELECT email, COUNT(*), STRING_AGG(id::text, ', ') as user_ids
FROM profiles
WHERE email = 'matt.brennan@ronaatlantic.ca'
GROUP BY email
HAVING COUNT(*) > 1;

-- Step 2: Identify which profile is the "correct" one
-- The correct profile is usually the one that matches the auth.users table
SELECT 
  p.id as profile_id,
  p.email,
  p.role,
  p.organization_id,
  p.created_at,
  CASE 
    WHEN au.id IS NOT NULL THEN 'EXISTS IN AUTH'
    ELSE 'ORPHANED (NO AUTH RECORD)'
  END as auth_status
FROM profiles p
LEFT JOIN auth.users au ON p.id = au.id
WHERE p.email = 'matt.brennan@ronaatlantic.ca'
ORDER BY p.created_at;

-- Step 3: Manual Fix Options

-- OPTION A: Keep the newer profile and remove the older one
-- (Only run this if you're sure which profile to keep)
/*
-- First, backup the profile you're about to delete
SELECT * FROM profiles WHERE id = 'edaf5c33-06a7-473b-81c5-70e10622cdc4';

-- Delete the older/incorrect profile
DELETE FROM profiles WHERE id = 'edaf5c33-06a7-473b-81c5-70e10622cdc4';
*/

-- OPTION B: Update the newer auth user's profile to use a different email temporarily
-- Then update it back after fixing the duplicate
/*
UPDATE profiles
SET email = 'matt.brennan+temp@ronaatlantic.ca'
WHERE id = '82ab2728-e8ea-4c9a-a55c-3f1c8c250262';

-- Then create the proper profile or update it
*/

-- OPTION C: Merge the profiles - copy important data from the old profile to the new one
-- Then delete the old profile
/*
-- Update the new profile with data from the old profile (if needed)
UPDATE profiles
SET 
  role = COALESCE((SELECT role FROM profiles WHERE id = 'edaf5c33-06a7-473b-81c5-70e10622cdc4'), role),
  organization_id = COALESCE((SELECT organization_id FROM profiles WHERE id = 'edaf5c33-06a7-473b-81c5-70e10622cdc4'), organization_id),
  manager_id = COALESCE((SELECT manager_id FROM profiles WHERE id = 'edaf5c33-06a7-473b-81c5-70e10622cdc4'), manager_id)
WHERE id = '82ab2728-e8ea-4c9a-a55c-3f1c8c250262';

-- Delete the old profile
DELETE FROM profiles WHERE id = 'edaf5c33-06a7-473b-81c5-70e10622cdc4';
*/

-- Step 4: Verify the fix
SELECT * FROM profiles WHERE email = 'matt.brennan@ronaatlantic.ca';

-- Step 5: Check for any other duplicate emails
SELECT email, COUNT(*) as count
FROM profiles
GROUP BY email
HAVING COUNT(*) > 1;
