-- =====================================================
-- VERIFY ORGANIZATION ASSIGNMENTS
-- =====================================================
-- Run this to check current organization assignments
-- and verify everything is correct
-- =====================================================

-- 1. Show all users and their organizations
SELECT 
    p.email,
    p.full_name as name,
    p.role,
    o.name as organization_name,
    p.organization_id,
    p.status,
    p.created_at
FROM profiles p
LEFT JOIN organizations o ON p.organization_id = o.id
ORDER BY o.name, p.email;

-- 2. Count users per organization
SELECT 
    o.name as organization_name,
    o.id as organization_id,
    COUNT(p.id) as user_count
FROM organizations o
LEFT JOIN profiles p ON p.organization_id = o.id
GROUP BY o.id, o.name
ORDER BY o.name;

-- 3. Check for users WITHOUT organizations (should be 0)
SELECT 
    id,
    email,
    full_name,
    role,
    organization_id
FROM profiles
WHERE organization_id IS NULL;

-- 4. Verify george.campbell is in ProSpaces CRM
SELECT 
    p.email,
    p.full_name,
    o.name as organization,
    CASE 
        WHEN o.name = 'ProSpaces CRM' THEN '✅ CORRECT'
        ELSE '❌ WRONG - Should be ProSpaces CRM'
    END as status
FROM profiles p
LEFT JOIN organizations o ON p.organization_id = o.id
WHERE p.email = 'george.campbell@prospaces.com';

-- 5. Verify all other users are in RONA Atlantic
SELECT 
    p.email,
    p.full_name,
    o.name as organization,
    CASE 
        WHEN o.name = 'RONA Atlantic' THEN '✅ CORRECT'
        ELSE '❌ WRONG - Should be RONA Atlantic'
    END as status
FROM profiles p
LEFT JOIN organizations o ON p.organization_id = o.id
WHERE p.email != 'george.campbell@prospaces.com'
ORDER BY o.name, p.email;

-- 6. Summary Report
SELECT 
    'Total Users' as metric,
    COUNT(*)::TEXT as value
FROM profiles
UNION ALL
SELECT 
    'ProSpaces CRM Users',
    COUNT(*)::TEXT
FROM profiles p
JOIN organizations o ON p.organization_id = o.id
WHERE o.name = 'ProSpaces CRM'
UNION ALL
SELECT 
    'RONA Atlantic Users',
    COUNT(*)::TEXT
FROM profiles p
JOIN organizations o ON p.organization_id = o.id
WHERE o.name = 'RONA Atlantic'
UNION ALL
SELECT 
    'Users Without Org',
    COUNT(*)::TEXT
FROM profiles
WHERE organization_id IS NULL
UNION ALL
SELECT 
    'Total Organizations',
    COUNT(*)::TEXT
FROM organizations;

-- =====================================================
-- Expected Results:
-- =====================================================
-- ProSpaces CRM Users: 1 (george.campbell@prospaces.com)
-- RONA Atlantic Users: X (all others)
-- Users Without Org: 0
-- =====================================================
