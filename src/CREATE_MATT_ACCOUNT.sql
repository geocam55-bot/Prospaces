-- ============================================================================
-- CREATE MATT BRENNAN'S ACCOUNT
-- ============================================================================
-- This script creates Matt's account properly with the correct organization
-- ============================================================================

-- Step 1: Verify rona-atlantic organization exists
-- ============================================================================
SELECT 
  '🏢 VERIFY ORGANIZATION EXISTS' as check_type,
  id,
  name,
  status,
  created_at
FROM organizations
WHERE id = 'rona-atlantic';

-- Step 2: Create function to add user to profiles table
-- ============================================================================
CREATE OR REPLACE FUNCTION public.create_user_profile(
  p_email TEXT,
  p_organization_id TEXT,
  p_role TEXT DEFAULT 'admin',
  p_name TEXT DEFAULT NULL
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  user_id UUID,
  user_email TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_org_exists BOOLEAN;
  v_user_exists BOOLEAN;
BEGIN
  -- Check if organization exists
  SELECT EXISTS(SELECT 1 FROM organizations WHERE id = p_organization_id AND status = 'active')
  INTO v_org_exists;
  
  IF NOT v_org_exists THEN
    RETURN QUERY SELECT 
      false,
      '❌ ERROR: Organization does not exist or is not active',
      NULL::UUID,
      p_email;
    RETURN;
  END IF;
  
  -- Check if user already exists
  SELECT EXISTS(SELECT 1 FROM profiles WHERE email = p_email)
  INTO v_user_exists;
  
  IF v_user_exists THEN
    RETURN QUERY SELECT 
      false,
      '❌ ERROR: User already exists',
      NULL::UUID,
      p_email;
    RETURN;
  END IF;
  
  -- Generate new UUID for user
  v_user_id := gen_random_uuid();
  
  -- Insert into profiles table
  INSERT INTO profiles (
    id,
    email,
    organization_id,
    role,
    name,
    status,
    created_at,
    updated_at
  ) VALUES (
    v_user_id,
    p_email,
    p_organization_id,
    p_role,
    COALESCE(p_name, split_part(p_email, '@', 1)), -- Use email prefix if name not provided
    'pending', -- Set to pending until they sign up
    NOW(),
    NOW()
  );
  
  RETURN QUERY SELECT 
    true,
    '✅ SUCCESS: User profile created',
    v_user_id,
    p_email;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.create_user_profile(TEXT, TEXT, TEXT, TEXT) TO authenticated, service_role;

-- Step 3: Create Matt's profile
-- ============================================================================
SELECT 
  '👤 CREATING MATT BRENNAN' as action,
  *
FROM public.create_user_profile(
  'matt.brennan@ronaatlantic.ca',  -- email
  'rona-atlantic',                  -- organization_id
  'admin',                          -- role
  'Matt Brennan'                    -- name
);

-- Step 4: Verify Matt was created
-- ============================================================================
SELECT 
  '✅ VERIFICATION' as check_type,
  p.id,
  p.email,
  p.organization_id,
  o.name as org_name,
  p.role,
  p.name,
  p.status,
  p.created_at
FROM profiles p
LEFT JOIN organizations o ON p.organization_id = o.id
WHERE p.email = 'matt.brennan@ronaatlantic.ca';

-- Step 5: Show all users in rona-atlantic after creation
-- ============================================================================
SELECT 
  '👥 ALL RONA-ATLANTIC USERS' as info,
  p.email,
  p.role,
  p.name,
  p.status,
  p.created_at
FROM profiles p
WHERE p.organization_id = 'rona-atlantic'
ORDER BY p.created_at DESC;

-- ============================================================================
-- NEXT STEPS
-- ============================================================================
-- 
-- After running this script:
-- 1. Matt's profile will be created with status 'pending'
-- 2. Matt needs to sign up through the Supabase Auth system
-- 3. You can either:
--    a) Send Matt an invitation link to sign up
--    b) Have Matt sign up directly at your app's signup page
--    c) Create an auth user manually in Supabase Dashboard
-- 
-- To manually create the auth user in Supabase:
-- 1. Go to Authentication > Users in Supabase Dashboard
-- 2. Click "Invite User" 
-- 3. Enter: matt.brennan@ronaatlantic.ca
-- 4. The user will receive an email to set their password
-- 
-- OR use this SQL to create auth user (requires admin privileges):
-- This should be run separately after the profile is created:
/*
SELECT auth.uid() as current_user; -- Check if you have auth access

-- Note: Creating auth users via SQL is restricted
-- Use Supabase Dashboard or your app's signup flow instead
*/
-- 
-- ============================================================================