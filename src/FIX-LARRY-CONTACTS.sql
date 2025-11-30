-- =============================================
-- FIX SCRIPT: Restore Larry's Contacts
-- =============================================
-- This script will fix Larry's contacts that may have wrong organization_id
-- User: larry.lee@ronaatlantic.ca
-- Org: 1489100c-1c89-47b0-9e63-74c57c0eeabf

-- STEP 1: Find contacts that belong to Larry but have wrong/missing org
-- (These are contacts where account_owner_number contains larry but org is wrong)
SELECT 
  'Contacts to Fix' as status,
  COUNT(*) as count
FROM contacts
WHERE account_owner_number ILIKE '%larry.lee@ronaatlantic.ca%'
  AND (
    organization_id IS NULL 
    OR organization_id != '1489100c-1c89-47b0-9e63-74c57c0eeabf'
  );

-- STEP 2: Fix the contacts - set correct organization_id
UPDATE contacts
SET organization_id = '1489100c-1c89-47b0-9e63-74c57c0eeabf'
WHERE account_owner_number ILIKE '%larry.lee@ronaatlantic.ca%'
  AND (
    organization_id IS NULL 
    OR organization_id != '1489100c-1c89-47b0-9e63-74c57c0eeabf'
  );

-- STEP 3: Verify the fix
SELECT 
  'After Fix - Larry Contacts' as status,
  COUNT(*) as count
FROM contacts
WHERE account_owner_number ILIKE '%larry.lee@ronaatlantic.ca%'
  AND organization_id = '1489100c-1c89-47b0-9e63-74c57c0eeabf';

-- STEP 4: Fix opportunities for Larry's contacts (set correct org)
WITH larry_contacts AS (
  SELECT id
  FROM contacts
  WHERE account_owner_number ILIKE '%larry.lee@ronaatlantic.ca%'
    AND organization_id = '1489100c-1c89-47b0-9e63-74c57c0eeabf'
)
UPDATE opportunities
SET organization_id = '1489100c-1c89-47b0-9e63-74c57c0eeabf'
WHERE customer_id IN (SELECT id FROM larry_contacts)
  AND (
    organization_id IS NULL 
    OR organization_id != '1489100c-1c89-47b0-9e63-74c57c0eeabf'
  );

-- STEP 5: Fix bids for Larry's opportunities (set correct org)
WITH larry_contacts AS (
  SELECT id
  FROM contacts
  WHERE account_owner_number ILIKE '%larry.lee@ronaatlantic.ca%'
    AND organization_id = '1489100c-1c89-47b0-9e63-74c57c0eeabf'
),
larry_opportunities AS (
  SELECT id
  FROM opportunities
  WHERE customer_id IN (SELECT id FROM larry_contacts)
    AND organization_id = '1489100c-1c89-47b0-9e63-74c57c0eeabf'
)
UPDATE bids
SET organization_id = '1489100c-1c89-47b0-9e63-74c57c0eeabf'
WHERE opportunity_id IN (SELECT id FROM larry_opportunities)
  AND (
    organization_id IS NULL 
    OR organization_id != '1489100c-1c89-47b0-9e63-74c57c0eeabf'
  );

-- STEP 6: Final verification - show Larry's data summary
SELECT 
  'Contacts' as data_type,
  COUNT(*) as count
FROM contacts
WHERE account_owner_number ILIKE '%larry.lee@ronaatlantic.ca%'
  AND organization_id = '1489100c-1c89-47b0-9e63-74c57c0eeabf'

UNION ALL

SELECT 
  'Opportunities' as data_type,
  COUNT(*) as count
FROM opportunities o
WHERE o.customer_id IN (
  SELECT id FROM contacts
  WHERE account_owner_number ILIKE '%larry.lee@ronaatlantic.ca%'
    AND organization_id = '1489100c-1c89-47b0-9e63-74c57c0eeabf'
)
  AND o.organization_id = '1489100c-1c89-47b0-9e63-74c57c0eeabf'

UNION ALL

SELECT 
  'Bids' as data_type,
  COUNT(*) as count
FROM bids b
WHERE b.opportunity_id IN (
  SELECT o.id FROM opportunities o
  WHERE o.customer_id IN (
    SELECT id FROM contacts
    WHERE account_owner_number ILIKE '%larry.lee@ronaatlantic.ca%'
      AND organization_id = '1489100c-1c89-47b0-9e63-74c57c0eeabf'
  )
  AND o.organization_id = '1489100c-1c89-47b0-9e63-74c57c0eeabf'
)
  AND (b.organization_id = '1489100c-1c89-47b0-9e63-74c57c0eeabf' OR b.organization_id IS NULL);
