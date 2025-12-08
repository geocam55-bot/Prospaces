-- =====================================================
-- FIX ORGANIZATION ASSIGNMENTS
-- =====================================================
-- This script will fix the organization assignments:
-- - george.campbell@prospaces.com → ProSpaces CRM
-- - All other users → RONA Atlantic
-- =====================================================

-- STEP 1: Check current state
-- Run this first to see current organization assignments
SELECT 
    p.id,
    p.email,
    p.full_name,
    p.role,
    p.organization_id,
    o.name as organization_name
FROM profiles p
LEFT JOIN organizations o ON p.organization_id = o.id
ORDER BY p.email;

-- STEP 2: Get organization IDs
-- Find the organization IDs for ProSpaces CRM and RONA Atlantic
SELECT id, name 
FROM organizations 
WHERE name IN ('ProSpaces CRM', 'RONA Atlantic')
ORDER BY name;

-- =====================================================
-- STEP 3: FIX ASSIGNMENTS
-- After running steps 1 & 2, use the correct organization IDs below
-- Replace 'PROSPACES_ORG_ID' and 'RONA_ORG_ID' with actual UUIDs
-- =====================================================

-- Move george.campbell@prospaces.com to ProSpaces CRM
UPDATE profiles
SET organization_id = 'PROSPACES_ORG_ID' -- Replace with actual ProSpaces CRM org ID
WHERE email = 'george.campbell@prospaces.com';

-- Move all other users to RONA Atlantic
UPDATE profiles
SET organization_id = 'RONA_ORG_ID' -- Replace with actual RONA Atlantic org ID
WHERE email != 'george.campbell@prospaces.com';

-- =====================================================
-- STEP 4: VERIFY THE FIX
-- Run this to confirm the changes
-- =====================================================
SELECT 
    p.id,
    p.email,
    p.full_name,
    p.role,
    p.organization_id,
    o.name as organization_name
FROM profiles p
LEFT JOIN organizations o ON p.organization_id = o.id
ORDER BY o.name, p.email;

-- =====================================================
-- ALTERNATIVE: If you want to be more specific
-- =====================================================

-- Option A: Move specific users to RONA Atlantic (if you know their emails)
/*
UPDATE profiles
SET organization_id = 'RONA_ORG_ID'
WHERE email IN (
    'larry.lee@ronaatlantic.ca',
    'john.doe@example.com',
    -- Add other emails here
);
*/

-- Option B: Move everyone EXCEPT george.campbell to RONA Atlantic
-- (This is the same as the main fix above, just shown for clarity)
/*
UPDATE profiles
SET organization_id = 'RONA_ORG_ID'
WHERE email != 'george.campbell@prospaces.com'
  AND email IS NOT NULL;
*/

-- =====================================================
-- STEP 5: CHECK FOR ORPHANED DATA
-- Ensure all related data is correctly associated
-- =====================================================

-- Check contacts without proper organization
SELECT id, first_name, last_name, organization_id
FROM contacts
WHERE organization_id NOT IN (SELECT id FROM organizations)
LIMIT 20;

-- Check tasks without proper organization
SELECT id, title, organization_id
FROM tasks
WHERE organization_id NOT IN (SELECT id FROM organizations)
LIMIT 20;

-- =====================================================
-- NOTES:
-- =====================================================
-- 1. Run STEP 1 first to see current assignments
-- 2. Run STEP 2 to get the organization IDs
-- 3. Copy the organization IDs and replace in STEP 3
-- 4. Run STEP 3 to make the changes
-- 5. Run STEP 4 to verify everything is correct
-- 6. Run STEP 5 to check for any orphaned data
-- =====================================================
