-- ============================================================================
-- IMMEDIATE FIX: Replace org-1762906336768 with correct organization ID
-- ============================================================================
-- Run this script NOW to fix the invalid organization ID error
-- ============================================================================

-- STEP 1: Check what organizations exist
-- ============================================================================
SELECT 
  '📋 AVAILABLE ORGANIZATIONS' as info,
  id,
  name,
  status,
  created_at
FROM tenants
WHERE status = 'active'
ORDER BY created_at;

-- STEP 2: Check which users have the invalid org ID
-- ============================================================================
SELECT 
  '🔍 USERS WITH INVALID ORG ID' as info,
  email,
  organization_id,
  role,
  status,
  created_at
FROM profiles
WHERE organization_id = 'org-1762906336768'
ORDER BY email;

-- STEP 3: FIX IT - Update all users with invalid org ID to 'rona-atlantic'
-- ============================================================================
-- Change 'rona-atlantic' below if you want a different organization

UPDATE profiles
SET 
  organization_id = 'rona-atlantic',  -- 👈 CHANGE THIS if needed
  updated_at = NOW()
WHERE organization_id = 'org-1762906336768';

-- STEP 4: Also fix auth.users metadata
-- ============================================================================
UPDATE auth.users
SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || 
  jsonb_build_object('organizationId', 'rona-atlantic')  -- 👈 CHANGE THIS if needed
WHERE id IN (
  SELECT user_id 
  FROM profiles 
  WHERE organization_id = 'rona-atlantic'
);

-- STEP 5: Verify the fix
-- ============================================================================
SELECT 
  '✅ VERIFICATION - All users should now have valid org IDs' as result,
  p.email,
  p.organization_id,
  t.name as org_name,
  p.role,
  p.status,
  CASE 
    WHEN p.organization_id = (u.raw_user_meta_data->>'organizationId') THEN '✅ Synced'
    ELSE '⚠️ Mismatch'
  END as sync_status
FROM profiles p
LEFT JOIN auth.users u ON p.user_id = u.id
LEFT JOIN tenants t ON p.organization_id = t.id
ORDER BY p.email;

-- STEP 6: Check for any remaining invalid org IDs
-- ============================================================================
SELECT 
  '⚠️ REMAINING ISSUES (should be empty)' as check,
  email,
  organization_id,
  'Invalid timestamp-based org ID' as issue
FROM profiles
WHERE organization_id ~ '^org-[0-9]+$'
   OR organization_id IS NULL
   OR NOT EXISTS (SELECT 1 FROM tenants WHERE id = organization_id);

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ FIX COMPLETE!';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE 'All users with org ID "org-1762906336768" have been updated.';
  RAISE NOTICE '';
  RAISE NOTICE '🔄 Next steps:';
  RAISE NOTICE '  1. Log out of the application';
  RAISE NOTICE '  2. Log back in';
  RAISE NOTICE '  3. Try inviting a user again';
  RAISE NOTICE '';
  RAISE NOTICE 'The error should now be resolved! 🎉';
  RAISE NOTICE '';
END $$;
