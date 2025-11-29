-- ============================================================================
-- DIAGNOSE LARRY'S MISSING DATA - SIMPLE VERSION
-- ============================================================================

-- First, let's see Larry's profile
SELECT 
  '1️⃣ LARRY PROFILE' as step,
  id::text as larry_id,
  email,
  name,
  organization_id::text as larry_org_id,
  role,
  status
FROM public.profiles
WHERE email = 'larry.lee@ronaatlantic.ca';

-- Next, let's see all organizations
SELECT 
  '2️⃣ ALL ORGANIZATIONS' as step,
  id::text as org_id,
  name as org_name,
  created_at::text
FROM public.organizations
ORDER BY created_at;

-- Count all data by organization
SELECT 
  '3️⃣ DATA COUNTS BY ORG' as step,
  o.id::text as org_id,
  o.name as org_name,
  (SELECT COUNT(*) FROM public.contacts WHERE organization_id = o.id) as contacts_count,
  (SELECT COUNT(*) FROM public.opportunities WHERE organization_id = o.id) as opportunities_count,
  (SELECT COUNT(*) FROM public.bids WHERE organization_id = o.id) as bids_count
FROM public.organizations o
ORDER BY o.created_at;

-- Find contacts with ronaatlantic email domain
SELECT 
  '4️⃣ RONAATLANTIC CONTACTS' as step,
  id::text as contact_id,
  name,
  email,
  organization_id::text as org_id,
  created_by::text
FROM public.contacts
WHERE email ILIKE '%ronaatlantic.ca%'
ORDER BY created_at
LIMIT 20;
