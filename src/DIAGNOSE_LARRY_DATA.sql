-- ============================================================================
-- DIAGNOSE LARRY'S MISSING DATA
-- ============================================================================
-- This is READ-ONLY - just checking what's wrong with Larry's data
-- ============================================================================

-- Step 1: Find Larry's profile and organization
-- ============================================================================
SELECT 
  '👤 LARRY PROFILE' as info,
  id,
  email,
  name,
  organization_id,
  role,
  status
FROM public.profiles
WHERE email = 'larry.lee@ronaatlantic.ca';

-- Step 2: Find all organizations
-- ============================================================================
SELECT 
  '🏢 ALL ORGANIZATIONS' as info,
  id,
  name,
  created_at
FROM public.organizations
ORDER BY created_at;

-- Step 3: Count contacts by organization_id
-- ============================================================================
SELECT 
  '📇 CONTACTS BY ORG' as info,
  organization_id,
  COUNT(*) as contact_count,
  STRING_AGG(DISTINCT name, ', ') as sample_contacts
FROM public.contacts
GROUP BY organization_id
ORDER BY organization_id;

-- Step 4: Count opportunities by organization_id
-- ============================================================================
SELECT 
  '💼 OPPORTUNITIES BY ORG' as info,
  organization_id,
  COUNT(*) as opportunity_count,
  STRING_AGG(DISTINCT title, ', ') as sample_opportunities
FROM public.opportunities
GROUP BY organization_id
ORDER BY organization_id;

-- Step 5: Count bids by organization_id
-- ============================================================================
SELECT 
  '📋 BIDS BY ORG' as info,
  organization_id,
  COUNT(*) as bid_count
FROM public.bids
GROUP BY organization_id
ORDER BY organization_id;

-- Step 6: Find contacts that might belong to Larry (by email domain or name)
-- ============================================================================
SELECT 
  '🔍 POTENTIAL LARRY CONTACTS' as info,
  id,
  name,
  email,
  organization_id,
  created_by
FROM public.contacts
WHERE email ILIKE '%ronaatlantic.ca%'
   OR created_by::text IN (SELECT id::text FROM public.profiles WHERE email = 'larry.lee@ronaatlantic.ca')
ORDER BY created_at
LIMIT 50;

-- Step 7: Find opportunities that might belong to Larry
-- ============================================================================
SELECT 
  '🔍 POTENTIAL LARRY OPPORTUNITIES' as info,
  id,
  title,
  organization_id,
  created_by
FROM public.opportunities
WHERE created_by::text IN (SELECT id::text FROM public.profiles WHERE email = 'larry.lee@ronaatlantic.ca')
ORDER BY created_at
LIMIT 50;

-- Step 8: Find bids that might belong to Larry
-- ============================================================================
SELECT 
  '🔍 POTENTIAL LARRY BIDS' as info,
  id,
  organization_id,
  created_by
FROM public.bids
WHERE created_by::text IN (SELECT id::text FROM public.profiles WHERE email = 'larry.lee@ronaatlantic.ca')
ORDER BY created_at
LIMIT 50;

-- ============================================================================
-- SUMMARY
-- ============================================================================
SELECT 
  '📊 SUMMARY' as info,
  'Run this query to understand the data distribution' as instructions,
  'DO NOT RUN ANY UPDATE QUERIES YET' as warning;