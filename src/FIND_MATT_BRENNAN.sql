-- ============================================================================
-- DIAGNOSTIC: Find Matt Brennan (matt.brennan@ronaatlantic.ca)
-- ============================================================================
-- This script will help locate the user across all tables and restore if needed
-- ============================================================================

-- Step 1: Check if user exists in auth.users
-- ============================================================================
SELECT 
  '🔍 AUTH.USERS CHECK' as check_type,
  id,
  email,
  email_confirmed_at,
  created_at,
  deleted_at,
  raw_user_meta_data->>'organizationId' as org_id,
  raw_user_meta_data->>'role' as role,
  raw_user_meta_data->>'name' as name,
  CASE 
    WHEN deleted_at IS NOT NULL THEN '❌ DELETED'
    WHEN email_confirmed_at IS NULL THEN '⚠️ UNCONFIRMED'
    ELSE '✅ ACTIVE'
  END as status
FROM auth.users
WHERE email ILIKE '%matt.brennan%' OR email ILIKE '%brennan%';

-- Step 2: Check profiles table
-- ============================================================================
SELECT 
  '🔍 PROFILES CHECK' as check_type,
  p.user_id,
  p.email,
  p.organization_id,
  p.status,
  p.role,
  p.created_at,
  p.updated_at,
  CASE 
    WHEN p.organization_id IS NULL THEN '❌ NO ORG'
    WHEN p.status != 'active' THEN '⚠️ INACTIVE'
    ELSE '✅ ACTIVE'
  END as profile_status
FROM profiles p
WHERE p.email ILIKE '%matt.brennan%' OR p.email ILIKE '%brennan%';

-- Step 3: Check if organization exists
-- ============================================================================
SELECT 
  '🔍 ORGANIZATION CHECK' as check_type,
  id,
  name,
  status,
  created_at
FROM tenants
WHERE id = 'rona-atlantic' OR name ILIKE '%rona%atlantic%';

-- Step 4: Check all users in rona-atlantic organization
-- ============================================================================
SELECT 
  '🔍 ALL RONA ATLANTIC USERS' as check_type,
  p.email,
  p.role,
  p.status,
  p.user_id,
  u.email_confirmed_at IS NOT NULL as email_confirmed,
  u.deleted_at IS NULL as not_deleted
FROM profiles p
LEFT JOIN auth.users u ON p.user_id = u.id
WHERE p.organization_id = 'rona-atlantic'
ORDER BY p.created_at DESC;

-- Step 5: Search for any Matt in the system
-- ============================================================================
SELECT 
  '🔍 SEARCH ALL MATTS' as check_type,
  u.id,
  u.email,
  u.raw_user_meta_data->>'name' as name,
  u.created_at,
  u.deleted_at IS NULL as active,
  p.organization_id
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.user_id
WHERE 
  u.email ILIKE '%matt%' 
  OR u.raw_user_meta_data->>'name' ILIKE '%matt%'
ORDER BY u.created_at DESC;

-- ============================================================================
-- RECOVERY: Create or restore Matt Brennan
-- ============================================================================

-- Option 1: If user exists but has wrong organization
-- ============================================================================
DO $$
DECLARE
  v_user_id UUID;
  v_email TEXT := 'matt.brennan@ronaatlantic.ca';
  v_org_id TEXT := 'rona-atlantic';
BEGIN
  -- Find user ID
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = v_email AND deleted_at IS NULL;
  
  IF v_user_id IS NOT NULL THEN
    RAISE NOTICE '✅ Found user: % (ID: %)', v_email, v_user_id;
    RAISE NOTICE '🔧 Attempting to restore organization assignment...';
    
    -- Update profiles
    UPDATE profiles
    SET 
      organization_id = v_org_id,
      status = 'active',
      updated_at = NOW()
    WHERE user_id = v_user_id;
    
    IF FOUND THEN
      RAISE NOTICE '✅ Updated profile for %', v_email;
    ELSE
      -- Create profile if it doesn't exist
      INSERT INTO profiles (user_id, email, organization_id, status, role)
      VALUES (v_user_id, v_email, v_org_id, 'active', 'standard_user')
      ON CONFLICT (user_id) DO UPDATE
      SET 
        organization_id = v_org_id,
        status = 'active',
        updated_at = NOW();
      
      RAISE NOTICE '✅ Created profile for %', v_email;
    END IF;
    
    -- Update auth.users metadata
    UPDATE auth.users
    SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || 
      jsonb_build_object('organizationId', v_org_id)
    WHERE id = v_user_id;
    
    RAISE NOTICE '✅ Updated auth metadata for %', v_email;
    RAISE NOTICE '🎉 RESTORATION COMPLETE!';
  ELSE
    RAISE NOTICE '❌ User not found in auth.users: %', v_email;
    RAISE NOTICE '💡 User may need to be recreated. See Option 2 below.';
  END IF;
END $$;

-- Option 2: If user doesn't exist, use the function to create
-- ============================================================================
-- Uncomment and run this if the user needs to be completely recreated:
/*
SELECT public.create_org_and_assign_user(
  'Rona Atlantic',
  'matt.brennan@ronaatlantic.ca'
);
*/

-- ============================================================================
-- VERIFICATION: Check Matt Brennan after recovery
-- ============================================================================

SELECT 
  '✅ FINAL VERIFICATION' as check_type,
  u.id as user_id,
  u.email,
  u.email_confirmed_at IS NOT NULL as email_confirmed,
  u.created_at as account_created,
  u.raw_user_meta_data->>'organizationId' as auth_org_id,
  u.raw_user_meta_data->>'role' as auth_role,
  u.raw_user_meta_data->>'name' as name,
  p.organization_id as profile_org_id,
  p.status as profile_status,
  p.role as profile_role,
  CASE 
    WHEN p.organization_id = 'rona-atlantic' AND p.status = 'active' THEN '✅ READY'
    WHEN p.organization_id IS NULL THEN '❌ NO ORG'
    WHEN p.organization_id != 'rona-atlantic' THEN '⚠️ WRONG ORG'
    ELSE '⚠️ CHECK STATUS'
  END as overall_status
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.user_id
WHERE u.email = 'matt.brennan@ronaatlantic.ca'
  AND u.deleted_at IS NULL;

-- ============================================================================
-- ALTERNATIVE: Use the RPC function to fix
-- ============================================================================
-- You can also call this from the application or SQL Editor:
/*
SELECT public.assign_user_to_organization(
  'matt.brennan@ronaatlantic.ca',
  'rona-atlantic'
);
*/

-- ============================================================================
-- INSTRUCTIONS
-- ============================================================================
-- 
-- 1. Run this entire script in Supabase SQL Editor
-- 2. Look at the results from each check
-- 3. The script will automatically try to restore Matt if found
-- 4. Check the "FINAL VERIFICATION" section at the end
-- 5. If user still not found, uncomment Option 2 to recreate
-- 
-- ============================================================================
