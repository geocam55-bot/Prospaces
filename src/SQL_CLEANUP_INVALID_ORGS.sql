-- ============================================================================
-- CLEANUP: Remove Invalid Timestamp-Based Organization IDs
-- ============================================================================
-- This script cleans up invalid organization IDs that were auto-generated
-- as timestamps (e.g., org-1762906336768) and fixes affected users.
-- ============================================================================

-- ============================================================================
-- STEP 1: Identify the Problem
-- ============================================================================

-- Find all profiles with timestamp-based organization IDs
SELECT 
  id,
  email,
  name,
  organization_id,
  role,
  status,
  created_at
FROM public.profiles
WHERE organization_id ~ '^org-\d{13,}$'  -- Matches org-1234567890123 (timestamp format)
ORDER BY created_at DESC;

-- Find all invalid organizations (timestamp-based IDs)
SELECT 
  id,
  name,
  status,
  created_at
FROM public.organizations
WHERE id ~ '^org-\d{13,}$'
ORDER BY created_at DESC;

-- ============================================================================
-- STEP 2: Get or Create Valid Organization
-- ============================================================================

-- List all valid organizations (slug format)
SELECT 
  id,
  name,
  status,
  created_at
FROM public.organizations
WHERE id !~ '^org-\d{13,}$'  -- Exclude timestamp-based IDs
  AND status = 'active'
ORDER BY name;

-- If no valid organization exists, create a default one
-- (Skip this if you already have valid organizations)
INSERT INTO public.organizations (id, name, status, created_at, updated_at)
VALUES ('default-organization', 'Default Organization', 'active', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- STEP 3: Fix Affected Users
-- ============================================================================

-- Option A: Move all affected users to a specific organization
-- (Replace 'your-org-id' with the actual organization ID you want to use)

DO $$
DECLARE
  v_target_org_id TEXT := 'default-organization'; -- CHANGE THIS TO YOUR ORG ID
  v_affected_count INTEGER;
BEGIN
  -- Count affected users
  SELECT COUNT(*) INTO v_affected_count
  FROM public.profiles
  WHERE organization_id ~ '^org-\d{13,}$';
  
  RAISE NOTICE 'Found % users with invalid organization IDs', v_affected_count;
  
  IF v_affected_count > 0 THEN
    -- Update profiles table
    UPDATE public.profiles
    SET 
      organization_id = v_target_org_id,
      updated_at = NOW()
    WHERE organization_id ~ '^org-\d{13,}$';
    
    -- Update auth.users metadata
    UPDATE auth.users
    SET raw_user_meta_data = jsonb_set(
      COALESCE(raw_user_meta_data, '{}'::jsonb),
      '{organizationId}',
      to_jsonb(v_target_org_id)
    )
    WHERE id IN (
      SELECT id FROM public.profiles 
      WHERE organization_id = v_target_org_id
    );
    
    RAISE NOTICE 'Successfully moved % users to organization: %', v_affected_count, v_target_org_id;
  ELSE
    RAISE NOTICE 'No users with invalid organization IDs found';
  END IF;
END $$;

-- ============================================================================
-- STEP 4: Clean Up Invalid Organizations
-- ============================================================================

-- Delete invalid timestamp-based organizations
DELETE FROM public.organizations
WHERE id ~ '^org-\d{13,}$';

-- Verify cleanup
SELECT 'Remaining invalid organizations:' as message, COUNT(*) as count
FROM public.organizations
WHERE id ~ '^org-\d{13,}$';

-- ============================================================================
-- STEP 5: Verify the Fix
-- ============================================================================

-- Check all users now have valid organization IDs
SELECT 
  p.id,
  p.email,
  p.name,
  p.organization_id,
  o.name as org_name,
  o.status as org_status,
  u.raw_user_meta_data->>'organizationId' as auth_org_id
FROM public.profiles p
LEFT JOIN public.organizations o ON p.organization_id = o.id
LEFT JOIN auth.users u ON p.id = u.id
ORDER BY p.created_at DESC
LIMIT 20;

-- Count users by organization
SELECT 
  o.id,
  o.name,
  o.status,
  COUNT(p.id) as user_count
FROM public.organizations o
LEFT JOIN public.profiles p ON o.id = p.organization_id
WHERE o.status = 'active'
GROUP BY o.id, o.name, o.status
ORDER BY user_count DESC;

-- ============================================================================
-- ALTERNATIVE: Fix Specific User
-- ============================================================================

-- If you need to fix a specific user, use this instead:
/*
-- Fix a specific user
UPDATE public.profiles
SET organization_id = 'your-org-id', updated_at = NOW()
WHERE email = 'user@example.com';

UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{organizationId}',
  '"your-org-id"'::jsonb
)
WHERE email = 'user@example.com';

-- Verify the fix
SELECT 
  p.email,
  p.organization_id,
  o.name as org_name,
  u.raw_user_meta_data->>'organizationId' as auth_org_id
FROM public.profiles p
LEFT JOIN public.organizations o ON p.organization_id = o.id
LEFT JOIN auth.users u ON p.id = u.id
WHERE p.email = 'user@example.com';
*/

-- ============================================================================
-- ROLLBACK (If Something Goes Wrong)
-- ============================================================================

-- To restore from a backup (if you have one):
/*
-- First, note down the users that were affected:
SELECT id, email, organization_id 
FROM public.profiles 
WHERE organization_id = 'your-new-org-id';

-- Then manually restore their original organization IDs:
UPDATE public.profiles 
SET organization_id = 'original-org-id'
WHERE email = 'user@example.com';
*/

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

SELECT '
✅ CLEANUP COMPLETE!

What was fixed:
  • Identified users with timestamp-based organization IDs
  • Moved them to valid organizations
  • Deleted invalid organization records
  • Updated both profiles and auth.users tables

Next steps:
  1. Verify all users are in correct organizations (see query above)
  2. Tell affected users to logout and login again
  3. Monitor for any "Organization not found" errors

' as summary;
