-- =====================================================
-- CHECK CURRENT STATE - Run this BEFORE fixing
-- =====================================================
-- This shows you what's wrong and what needs to be fixed
-- =====================================================

-- 1. Check if organizations exist
SELECT '========================================' as section;
SELECT '1. ORGANIZATIONS TABLE' as section;
SELECT '========================================' as section;

SELECT 
    id,
    name,
    status,
    created_at
FROM organizations
ORDER BY name;

-- 2. Check profiles table and their organization_id values
SELECT '========================================' as section;
SELECT '2. PROFILES - Organization IDs (including invalid ones)' as section;
SELECT '========================================' as section;

SELECT 
    email,
    full_name,
    role,
    organization_id,
    status,
    CASE 
        WHEN organization_id IS NULL THEN '❌ NULL'
        WHEN EXISTS (SELECT 1 FROM organizations WHERE id = profiles.organization_id) THEN '✅ Valid UUID'
        ELSE '⚠️ Invalid/Orphaned'
    END as org_id_status
FROM profiles
ORDER BY email;

-- 3. Check auth.users metadata
SELECT '========================================' as section;
SELECT '3. AUTH.USERS - Metadata' as section;
SELECT '========================================' as section;

SELECT 
    email,
    raw_user_meta_data->>'organizationId' as org_in_metadata,
    raw_user_meta_data->>'role' as role_in_metadata,
    raw_user_meta_data->>'name' as name_in_metadata,
    created_at
FROM auth.users
ORDER BY email;

-- 4. Compare auth.users vs profiles
SELECT '========================================' as section;
SELECT '4. SYNC STATUS - auth.users vs profiles' as section;
SELECT '========================================' as section;

SELECT 
    u.email,
    u.raw_user_meta_data->>'organizationId' as auth_org,
    p.organization_id::text as profile_org,
    CASE 
        WHEN u.raw_user_meta_data->>'organizationId' IS NULL THEN '❌ NULL in auth'
        WHEN p.organization_id IS NULL THEN '❌ NULL in profile'
        WHEN u.raw_user_meta_data->>'organizationId' = p.organization_id::text THEN '✅ SYNCED'
        ELSE '❌ MISMATCH'
    END as sync_status,
    u.raw_user_meta_data->>'role' as auth_role,
    p.role as profile_role
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
ORDER BY u.email;

-- 5. Check current RLS policies
SELECT '========================================' as section;
SELECT '5. CURRENT RLS POLICIES' as section;
SELECT '========================================' as section;

SELECT 
    schemaname,
    tablename,
    policyname,
    cmd as operation,
    permissive
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;

-- 6. Count users per organization (will fail if org IDs are invalid)
SELECT '========================================' as section;
SELECT '6. USER COUNTS BY ORGANIZATION' as section;
SELECT '========================================' as section;

SELECT 
    COALESCE(o.name, 'Unknown/Invalid') as organization,
    COUNT(p.id) as user_count
FROM profiles p
LEFT JOIN organizations o ON p.organization_id = o.id
GROUP BY o.name
ORDER BY o.name NULLS LAST;

-- 7. Check for users with invalid UUIDs (this will show if there are text-based IDs)
SELECT '========================================' as section;
SELECT '7. PROBLEMATIC USERS' as section;
SELECT '========================================' as section;

-- Users with NULL organization_id
SELECT 
    'NULL organization_id' as issue,
    email,
    full_name,
    role,
    organization_id
FROM profiles
WHERE organization_id IS NULL;

-- Users with orphaned organization_id (org doesn't exist)
SELECT 
    'Orphaned organization_id' as issue,
    email,
    full_name,
    role,
    organization_id
FROM profiles
WHERE organization_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM organizations WHERE id = profiles.organization_id);

-- 8. Show what SHOULD happen
SELECT '========================================' as section;
SELECT '8. EXPECTED ASSIGNMENTS (After Fix)' as section;
SELECT '========================================' as section;

SELECT 
    email,
    full_name,
    role,
    CASE 
        WHEN email = 'george.campbell@prospaces.com' THEN 'ProSpaces CRM'
        ELSE 'RONA Atlantic'
    END as should_be_in
FROM profiles
ORDER BY email;

-- =====================================================
-- SUMMARY OF WHAT TO LOOK FOR:
-- =====================================================
-- 
-- RED FLAGS:
-- ❌ "NULL organization_id" - Users without organizations
-- ❌ "Orphaned organization_id" - Org ID points to non-existent org
-- ❌ "MISMATCH" - auth.users metadata doesn't match profiles
-- ❌ No organizations in section 1 - Organizations table is empty
-- 
-- WHAT SHOULD HAPPEN:
-- ✅ george.campbell@prospaces.com → ProSpaces CRM
-- ✅ All others → RONA Atlantic
-- ✅ auth_org matches profile_org for all users
-- ✅ 4 RLS policies exist (select, insert, update, delete)
-- 
-- =====================================================
