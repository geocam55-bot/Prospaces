-- ============================================================================
-- DIAGNOSTIC: Find Matt Brennan's Account
-- ============================================================================

-- Step 1: Search for Matt in profiles table (any variation)
-- ============================================================================
SELECT 
  '🔍 MATT IN PROFILES TABLE' as search_type,
  p.id,
  p.email,
  p.organization_id,
  p.status,
  p.role,
  p.created_at,
  p.updated_at,
  CASE 
    WHEN p.organization_id ~ '^org-[0-9]+$' THEN '❌ TIMESTAMP-BASED (INVALID)'
    WHEN p.organization_id IS NULL THEN '❌ NULL'
    WHEN NOT EXISTS (SELECT 1 FROM organizations WHERE id = p.organization_id) THEN '❌ ORG NOT FOUND'
    ELSE '✅ VALID'
  END as org_status
FROM profiles p
WHERE 
  p.email ILIKE '%matt%'
  OR p.email ILIKE '%brennan%'
ORDER BY p.created_at DESC;

-- Step 2: Search for Matt in auth.users table
-- ============================================================================
SELECT 
  '🔍 MATT IN AUTH.USERS TABLE' as search_type,
  u.id,
  u.email,
  u.created_at,
  u.confirmed_at,
  u.email_confirmed_at,
  u.last_sign_in_at,
  u.raw_user_meta_data->>'organizationId' as metadata_org_id,
  u.raw_user_meta_data->>'role' as metadata_role,
  u.raw_user_meta_data as full_metadata
FROM auth.users u
WHERE 
  u.email ILIKE '%matt%'
  OR u.email ILIKE '%brennan%'
ORDER BY u.created_at DESC;

-- Step 3: Check for Matt with exact email
-- ============================================================================
SELECT 
  '🔍 EXACT MATCH: matt.brennan@ronaatlantic.ca' as search_type,
  p.id,
  p.email,
  p.organization_id,
  p.status,
  p.role,
  o.name as org_name,
  o.status as org_status
FROM profiles p
LEFT JOIN organizations o ON p.organization_id = o.id
WHERE p.email = 'matt.brennan@ronaatlantic.ca';

-- Step 4: Show ALL profiles (to see if Matt exists at all)
-- ============================================================================
SELECT 
  '📋 ALL PROFILES' as info,
  p.email,
  p.organization_id,
  p.status,
  p.role,
  p.created_at
FROM profiles p
ORDER BY p.created_at DESC;

-- Step 5: Check if Matt exists in auth but not in profiles
-- ============================================================================
SELECT 
  '⚠️ USERS IN AUTH BUT NOT IN PROFILES' as warning,
  u.id,
  u.email,
  u.created_at,
  u.raw_user_meta_data->>'organizationId' as metadata_org_id
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM profiles p WHERE p.id = u.id
)
AND (u.email ILIKE '%matt%' OR u.email ILIKE '%brennan%');

-- Step 6: Check for any pending invitations for Matt
-- ============================================================================
-- Note: Skipping invitations check - table may not exist
-- SELECT 
--   '📧 INVITATIONS FOR MATT' as info,
--   inv.id,
--   inv.email,
--   inv.organization_id,
--   inv.role,
--   inv.status,
--   inv.invited_by,
--   inv.created_at,
--   inv.expires_at,
--   o.name as org_name
-- FROM invitations inv
-- LEFT JOIN organizations o ON inv.organization_id = o.id
-- WHERE 
--   inv.email ILIKE '%matt%'
--   OR inv.email ILIKE '%brennan%'
-- ORDER BY inv.created_at DESC;

-- Step 7: Search for 'rona-atlantic' organization
-- ============================================================================
SELECT 
  '🏢 RONA ATLANTIC ORGANIZATION' as info,
  id,
  name,
  status,
  created_at
FROM organizations
WHERE 
  id = 'rona-atlantic'
  OR name ILIKE '%rona%';

-- Step 8: Show all users in rona-atlantic organization
-- ============================================================================
SELECT 
  '👥 ALL USERS IN RONA-ATLANTIC' as info,
  p.email,
  p.role,
  p.status,
  p.created_at
FROM profiles p
WHERE p.organization_id = 'rona-atlantic'
ORDER BY p.created_at DESC;

-- ============================================================================
-- SUMMARY
-- ============================================================================
-- This script will help us determine:
-- 1. Does Matt's profile exist in the profiles table?
-- 2. Does Matt exist in auth.users?
-- 3. Is there a mismatch between auth and profiles?
-- 4. Are there any pending invitations?
-- 5. What's the status of the rona-atlantic organization?
-- ============================================================================