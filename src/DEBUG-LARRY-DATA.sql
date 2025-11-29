-- =============================================
-- DEBUG SCRIPT: Find Larry's Data
-- =============================================
-- Run this in Supabase SQL Editor to diagnose Larry's data issues
-- User: larry.lee@ronaatlantic.ca
-- Org: 1489100c-1c89-47b0-9e63-74c57c0eeabf

-- 1. Check Larry's profile
SELECT 
  'Larry Profile' as check_type,
  id,
  email,
  role,
  organization_id
FROM profiles
WHERE email = 'larry.lee@ronaatlantic.ca';

-- 2. Check ALL contacts in Larry's organization
SELECT 
  'Contacts in Org' as check_type,
  COUNT(*) as total_count
FROM contacts
WHERE organization_id = '1489100c-1c89-47b0-9e63-74c57c0eeabf';

-- 3. Check contacts with Larry as account owner
SELECT 
  'Contacts Owned by Larry' as check_type,
  COUNT(*) as total_count
FROM contacts
WHERE account_owner_number ILIKE 'larry.lee@ronaatlantic.ca'
  AND organization_id = '1489100c-1c89-47b0-9e63-74c57c0eeabf';

-- 4. Check contacts created by Larry (by UUID)
SELECT 
  'Contacts Created by Larry (UUID)' as check_type,
  COUNT(*) as total_count
FROM contacts c
INNER JOIN profiles p ON c.created_by = p.id
WHERE p.email = 'larry.lee@ronaatlantic.ca'
  AND c.organization_id = '1489100c-1c89-47b0-9e63-74c57c0eeabf';

-- 5. Show sample contacts that Larry should see
SELECT 
  'Sample Contacts Larry Should See' as check_type,
  c.id,
  c.name,
  c.company,
  c.account_owner_number,
  c.organization_id,
  c.created_by,
  p.email as created_by_email
FROM contacts c
LEFT JOIN profiles p ON c.created_by = p.id
WHERE c.organization_id = '1489100c-1c89-47b0-9e63-74c57c0eeabf'
  AND (
    c.account_owner_number ILIKE 'larry.lee@ronaatlantic.ca'
    OR p.email = 'larry.lee@ronaatlantic.ca'
  )
LIMIT 10;

-- 6. Check opportunities for Larry's contacts
WITH larry_contacts AS (
  SELECT c.id
  FROM contacts c
  LEFT JOIN profiles p ON c.created_by = p.id
  WHERE c.organization_id = '1489100c-1c89-47b0-9e63-74c57c0eeabf'
    AND (
      c.account_owner_number ILIKE 'larry.lee@ronaatlantic.ca'
      OR p.email = 'larry.lee@ronaatlantic.ca'
    )
)
SELECT 
  'Opportunities for Larry Contacts' as check_type,
  COUNT(*) as total_opportunities
FROM opportunities o
WHERE o.customer_id IN (SELECT id FROM larry_contacts)
  AND o.organization_id = '1489100c-1c89-47b0-9e63-74c57c0eeabf';

-- 7. Show sample opportunities
WITH larry_contacts AS (
  SELECT c.id, c.name as contact_name
  FROM contacts c
  LEFT JOIN profiles p ON c.created_by = p.id
  WHERE c.organization_id = '1489100c-1c89-47b0-9e63-74c57c0eeabf'
    AND (
      c.account_owner_number ILIKE 'larry.lee@ronaatlantic.ca'
      OR p.email = 'larry.lee@ronaatlantic.ca'
    )
)
SELECT 
  'Sample Opportunities' as check_type,
  o.id,
  o.title,
  o.customer_id,
  lc.contact_name,
  o.organization_id,
  o.created_by
FROM opportunities o
INNER JOIN larry_contacts lc ON o.customer_id = lc.id
WHERE o.organization_id = '1489100c-1c89-47b0-9e63-74c57c0eeabf'
LIMIT 10;

-- 8. Check bids for Larry's opportunities
WITH larry_contacts AS (
  SELECT c.id
  FROM contacts c
  LEFT JOIN profiles p ON c.created_by = p.id
  WHERE c.organization_id = '1489100c-1c89-47b0-9e63-74c57c0eeabf'
    AND (
      c.account_owner_number ILIKE 'larry.lee@ronaatlantic.ca'
      OR p.email = 'larry.lee@ronaatlantic.ca'
    )
),
larry_opportunities AS (
  SELECT o.id
  FROM opportunities o
  WHERE o.customer_id IN (SELECT id FROM larry_contacts)
    AND o.organization_id = '1489100c-1c89-47b0-9e63-74c57c0eeabf'
)
SELECT 
  'Bids for Larry Opportunities' as check_type,
  COUNT(*) as total_bids
FROM bids b
WHERE b.opportunity_id IN (SELECT id FROM larry_opportunities)
  AND (b.organization_id = '1489100c-1c89-47b0-9e63-74c57c0eeabf' OR b.organization_id IS NULL);

-- 9. Check for orphaned contacts (wrong org or no owner)
SELECT 
  'Orphaned Contacts' as check_type,
  COUNT(*) as total_count
FROM contacts
WHERE (
  organization_id IS NULL 
  OR organization_id != '1489100c-1c89-47b0-9e63-74c57c0eeabf'
)
AND (
  account_owner_number ILIKE '%larry%'
  OR account_owner_number ILIKE '%ronaatlantic%'
);

-- 10. Show orphaned contacts details
SELECT 
  'Orphaned Contact Details' as check_type,
  id,
  name,
  company,
  account_owner_number,
  organization_id,
  created_by
FROM contacts
WHERE (
  organization_id IS NULL 
  OR organization_id != '1489100c-1c89-47b0-9e63-74c57c0eeabf'
)
AND (
  account_owner_number ILIKE '%larry%'
  OR account_owner_number ILIKE '%ronaatlantic%'
)
LIMIT 10;
