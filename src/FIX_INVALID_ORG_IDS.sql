-- ============================================================================
-- FIX INVALID TIMESTAMP-BASED ORGANIZATION IDs
-- ============================================================================
-- This script fixes users with invalid timestamp-based organization IDs
-- like "org-1762906336768" and corrects them to proper organization IDs
-- ============================================================================

-- Step 1: DIAGNOSTIC - Find all invalid organization IDs
-- ============================================================================
SELECT 
  '🔍 INVALID ORG IDs DIAGNOSTIC' as check_type,
  p.email,
  p.organization_id,
  p.status,
  p.role,
  CASE 
    WHEN p.organization_id ~ '^org-[0-9]+$' THEN '❌ TIMESTAMP-BASED (INVALID)'
    WHEN p.organization_id IS NULL THEN '❌ NULL'
    WHEN NOT EXISTS (SELECT 1 FROM organizations WHERE id = p.organization_id) THEN '❌ ORG NOT FOUND'
    ELSE '✅ VALID'
  END as org_status
FROM profiles p
WHERE 
  -- Find timestamp-based org IDs (pattern: org-1234567890)
  p.organization_id ~ '^org-[0-9]+$'
  OR p.organization_id IS NULL
  OR NOT EXISTS (SELECT 1 FROM organizations WHERE id = p.organization_id)
ORDER BY p.email;

-- Step 2: Show all available organizations
-- ============================================================================
SELECT 
  '📋 AVAILABLE ORGANIZATIONS' as info,
  id as org_id,
  name as org_name,
  status,
  created_at
FROM organizations
WHERE status = 'active'
ORDER BY name;

-- Step 3: Create helper function to update user organization safely
-- ============================================================================
CREATE OR REPLACE FUNCTION public.fix_user_organization_safe(
  p_user_email TEXT,
  p_correct_org_id TEXT
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  user_email TEXT,
  old_org_id TEXT,
  new_org_id TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_old_org_id TEXT;
  v_org_exists BOOLEAN;
  v_auth_user_exists BOOLEAN;
BEGIN
  -- Check if organization exists
  SELECT EXISTS(SELECT 1 FROM organizations WHERE id = p_correct_org_id AND status = 'active')
  INTO v_org_exists;
  
  IF NOT v_org_exists THEN
    RETURN QUERY SELECT 
      false,
      '❌ ERROR: Organization does not exist or is not active',
      p_user_email,
      NULL::TEXT,
      p_correct_org_id;
    RETURN;
  END IF;
  
  -- Get user details
  SELECT id, organization_id 
  INTO v_user_id, v_old_org_id
  FROM profiles
  WHERE email = p_user_email;
  
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT 
      false,
      '❌ ERROR: User not found',
      p_user_email,
      NULL::TEXT,
      p_correct_org_id;
    RETURN;
  END IF;
  
  -- Update profiles
  UPDATE profiles
  SET 
    organization_id = p_correct_org_id,
    status = 'active',
    updated_at = NOW()
  WHERE id = v_user_id;
  
  -- Check if user exists in auth.users
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE id = v_user_id)
  INTO v_auth_user_exists;
  
  -- Update auth metadata if user exists
  IF v_auth_user_exists THEN
    UPDATE auth.users
    SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || 
      jsonb_build_object('organizationId', p_correct_org_id)
    WHERE id = v_user_id;
  END IF;
  
  RETURN QUERY SELECT 
    true,
    '✅ SUCCESS: User organization updated',
    p_user_email,
    v_old_org_id,
    p_correct_org_id;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.fix_user_organization_safe(TEXT, TEXT) TO authenticated, service_role;

-- Step 4: AUTOMATIC FIX - Batch fix all invalid org IDs
-- ============================================================================
CREATE OR REPLACE FUNCTION public.batch_fix_invalid_org_ids()
RETURNS TABLE(
  processed INT,
  fixed INT,
  skipped INT,
  details JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_record RECORD;
  v_correct_org_id TEXT;
  v_email_domain TEXT;
  v_fixed_count INT := 0;
  v_skipped_count INT := 0;
  v_processed_count INT := 0;
  v_details JSONB := '[]'::JSONB;
  v_result RECORD;
BEGIN
  -- Loop through all users with invalid org IDs
  FOR v_user_record IN 
    SELECT 
      p.id,
      p.email,
      p.organization_id
    FROM profiles p
    WHERE 
      p.organization_id ~ '^org-[0-9]+$'
      OR p.organization_id IS NULL
      OR NOT EXISTS (SELECT 1 FROM organizations WHERE id = p.organization_id)
  LOOP
    v_processed_count := v_processed_count + 1;
    
    -- Extract email domain
    v_email_domain := split_part(v_user_record.email, '@', 2);
    
    -- Determine correct organization based on email domain
    v_correct_org_id := CASE
      -- Rona Atlantic users
      WHEN v_email_domain ILIKE '%ronaatlantic%' THEN 'rona-atlantic'
      WHEN v_email_domain ILIKE '%rona%' THEN 'rona-atlantic'
      
      -- Add more domain mappings here as needed
      -- WHEN v_email_domain = 'example.com' THEN 'example-org'
      
      -- Default: Try to find the first active organization
      ELSE (SELECT id FROM organizations WHERE status = 'active' ORDER BY created_at LIMIT 1)
    END;
    
    -- If we found a valid organization, update the user
    IF v_correct_org_id IS NOT NULL AND EXISTS (SELECT 1 FROM organizations WHERE id = v_correct_org_id) THEN
      -- Use the safe function to update
      SELECT * INTO v_result
      FROM public.fix_user_organization_safe(v_user_record.email, v_correct_org_id);
      
      IF v_result.success THEN
        v_fixed_count := v_fixed_count + 1;
        v_details := v_details || jsonb_build_object(
          'email', v_user_record.email,
          'old_org', v_user_record.organization_id,
          'new_org', v_correct_org_id,
          'status', 'fixed'
        );
      ELSE
        v_skipped_count := v_skipped_count + 1;
        v_details := v_details || jsonb_build_object(
          'email', v_user_record.email,
          'old_org', v_user_record.organization_id,
          'status', 'error',
          'message', v_result.message
        );
      END IF;
    ELSE
      v_skipped_count := v_skipped_count + 1;
      v_details := v_details || jsonb_build_object(
        'email', v_user_record.email,
        'old_org', v_user_record.organization_id,
        'status', 'skipped',
        'message', 'Could not determine correct organization'
      );
    END IF;
  END LOOP;
  
  RETURN QUERY SELECT v_processed_count, v_fixed_count, v_skipped_count, v_details;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.batch_fix_invalid_org_ids() TO authenticated, service_role;

-- Step 5: Run the automatic fix
-- ============================================================================
SELECT 
  '🔧 BATCH FIX RESULTS' as report_type,
  processed as users_processed,
  fixed as users_fixed,
  skipped as users_skipped
FROM public.batch_fix_invalid_org_ids();

-- Step 6: VERIFICATION - Check if all users now have valid organizations
-- ============================================================================
SELECT 
  '✅ VERIFICATION REPORT' as report_type,
  COUNT(*) FILTER (WHERE org_status = 'VALID') as valid_users,
  COUNT(*) FILTER (WHERE org_status != 'VALID') as invalid_users,
  COUNT(*) as total_users
FROM (
  SELECT 
    p.email,
    CASE 
      WHEN p.organization_id ~ '^org-[0-9]+$' THEN 'INVALID'
      WHEN p.organization_id IS NULL THEN 'NULL'
      WHEN NOT EXISTS (SELECT 1 FROM organizations WHERE id = p.organization_id) THEN 'ORG_NOT_FOUND'
      ELSE 'VALID'
    END as org_status
  FROM profiles p
) sub;

-- Step 7: Show all users with their corrected organizations
-- ============================================================================
SELECT 
  '📊 ALL USERS AFTER FIX' as info,
  p.email,
  p.organization_id,
  t.name as org_name,
  p.status as user_status,
  p.role,
  CASE 
    WHEN p.organization_id IS NOT NULL AND t.id IS NOT NULL THEN '✅ Valid Org'
    ELSE '⚠️ Issue'
  END as sync_status
FROM profiles p
LEFT JOIN organizations t ON p.organization_id = t.id
ORDER BY t.name, p.email;

-- Step 8: Find any remaining issues
-- ============================================================================
SELECT 
  '⚠️ REMAINING ISSUES (if any)' as warning,
  p.email,
  p.organization_id,
  p.status,
  CASE
    WHEN p.organization_id ~ '^org-[0-9]+$' THEN 'Timestamp-based org ID'
    WHEN p.organization_id IS NULL THEN 'NULL org ID'
    ELSE 'Organization does not exist'
  END as issue
FROM profiles p
WHERE 
  p.organization_id ~ '^org-[0-9]+$'
  OR p.organization_id IS NULL
  OR NOT EXISTS (SELECT 1 FROM organizations WHERE id = p.organization_id);

-- ============================================================================
-- MANUAL FIX INSTRUCTIONS
-- ============================================================================
-- 
-- To fix a specific user manually, run:
-- SELECT * FROM public.fix_user_organization_safe('user@example.com', 'correct-org-id');
-- 
-- Example:
-- SELECT * FROM public.fix_user_organization_safe('matt.brennan@ronaatlantic.ca', 'rona-atlantic');
--
-- ============================================================================