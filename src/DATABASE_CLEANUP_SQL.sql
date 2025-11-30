-- ============================================================================
-- ProSpaces CRM - Demo Data Cleanup Script
-- ============================================================================
-- Run this in your Supabase SQL Editor to remove all demo data
-- 
-- WARNING: This will permanently delete all demo accounts and their data
-- Make sure to backup first if needed!
-- ============================================================================

-- Step 1: Delete all demo user accounts with @prospaces.com emails
-- This includes both manually created demo accounts and "Quick Demo" accounts

DELETE FROM auth.users 
WHERE email LIKE '%@prospaces.com' 
   OR email LIKE 'demo.%';

-- If you only want to delete the "Quick Demo" generated accounts:
-- DELETE FROM auth.users 
-- WHERE email LIKE 'demo.super_admin%@prospaces.com'
--    OR email LIKE 'demo.admin%@prospaces.com'
--    OR email LIKE 'demo.manager%@prospaces.com'
--    OR email LIKE 'demo.standard_user%@prospaces.com'
--    OR email LIKE 'demo.viewer%@prospaces.com';

-- ============================================================================
-- Step 2: (OPTIONAL) Clean up associated data if using database tables
-- ============================================================================
-- Note: If you're still using KV store, skip this section
-- These tables may not exist yet in your schema

-- Delete contacts created by demo users
-- DELETE FROM contacts 
-- WHERE user_id IN (
--   SELECT id FROM auth.users 
--   WHERE email LIKE '%@prospaces.com'
-- );

-- Delete tasks created by demo users
-- DELETE FROM tasks 
-- WHERE user_id IN (
--   SELECT id FROM auth.users 
--   WHERE email LIKE '%@prospaces.com'
-- );

-- Delete appointments created by demo users
-- DELETE FROM appointments 
-- WHERE user_id IN (
--   SELECT id FROM auth.users 
--   WHERE email LIKE '%@prospaces.com'
-- );

-- Delete bids created by demo users
-- DELETE FROM bids 
-- WHERE user_id IN (
--   SELECT id FROM auth.users 
--   WHERE email LIKE '%@prospaces.com'
-- );

-- Delete notes created by demo users
-- DELETE FROM notes 
-- WHERE user_id IN (
--   SELECT id FROM auth.users 
--   WHERE email LIKE '%@prospaces.com'
-- );

-- Delete inventory items created by demo users
-- DELETE FROM inventory 
-- WHERE user_id IN (
--   SELECT id FROM auth.users 
--   WHERE email LIKE '%@prospaces.com'
-- );

-- Delete audit logs for demo users
-- DELETE FROM audit_logs 
-- WHERE user_id IN (
--   SELECT id FROM auth.users 
--   WHERE email LIKE '%@prospaces.com'
-- );

-- ============================================================================
-- Step 3: Verification - Check if cleanup was successful
-- ============================================================================

-- This should return 0 rows if cleanup was successful
SELECT 
  id,
  email, 
  created_at,
  email_confirmed_at
FROM auth.users 
WHERE email LIKE '%@prospaces.com'
   OR email LIKE 'demo.%'
ORDER BY created_at DESC;

-- Count total remaining users
SELECT COUNT(*) as total_users FROM auth.users;

-- ============================================================================
-- NOTES:
-- ============================================================================
-- 1. The main demo data removal is the deletion from auth.users
-- 2. Your app uses Supabase Edge Functions with KV store, so most data is stored there
-- 3. KV store data is keyed by user ID, so deleting the auth user effectively orphans the data
-- 4. The frontend components have been updated to remove hardcoded demo data
-- 5. Consider disabling "Quick Demo" buttons in production
-- ============================================================================
