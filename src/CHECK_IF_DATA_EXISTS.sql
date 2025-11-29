-- ============================================================================
-- CHECK IF DATA ACTUALLY EXISTS IN THE DATABASE
-- ============================================================================

-- Total counts
SELECT 
  '📊 TOTAL DATA IN DATABASE' as info,
  (SELECT COUNT(*) FROM public.contacts) as total_contacts,
  (SELECT COUNT(*) FROM public.opportunities) as total_opportunities,
  (SELECT COUNT(*) FROM public.bids) as total_bids;

-- Check what organization_ids exist in contacts
SELECT 
  '📇 CONTACTS ORGANIZATION IDS' as info,
  organization_id::text as org_id,
  COUNT(*) as count
FROM public.contacts
GROUP BY organization_id
ORDER BY count DESC;

-- Check what organization_ids exist in opportunities
SELECT 
  '💼 OPPORTUNITIES ORGANIZATION IDS' as info,
  organization_id::text as org_id,
  COUNT(*) as count
FROM public.opportunities
GROUP BY organization_id
ORDER BY count DESC;

-- Check what organization_ids exist in bids
SELECT 
  '📋 BIDS ORGANIZATION IDS' as info,
  organization_id::text as org_id,
  COUNT(*) as count
FROM public.bids
GROUP BY organization_id
ORDER BY count DESC;

-- Sample some contacts to see what they look like
SELECT 
  '🔍 SAMPLE CONTACTS' as info,
  id::text,
  name,
  email,
  organization_id::text,
  created_by::text,
  created_at::text
FROM public.contacts
ORDER BY created_at DESC
LIMIT 10;

-- Check Larry's actual organization_id
SELECT 
  '👤 LARRY INFO' as info,
  id::text as larry_id,
  email,
  organization_id::text as larry_org_id
FROM public.profiles
WHERE email = 'larry.lee@ronaatlantic.ca';
