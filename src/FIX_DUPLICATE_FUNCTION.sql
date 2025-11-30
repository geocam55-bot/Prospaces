-- ============================================================================
-- FIX: Remove duplicate function definitions and create single unified version
-- ============================================================================
-- This script fixes the "function name is not unique" error by:
-- 1. Dropping all versions of the duplicate functions
-- 2. Creating a single, unified version with optional parameters
-- 3. Granting proper permissions
-- ============================================================================

-- Step 1: Drop all existing versions of the functions
-- ============================================================================

-- Drop all overloaded versions of create_org_and_assign_user
DROP FUNCTION IF EXISTS public.create_org_and_assign_user(TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.create_org_and_assign_user(TEXT, TEXT, TEXT) CASCADE;

-- Drop assign_user_to_organization if it exists (we'll recreate it)
DROP FUNCTION IF EXISTS public.assign_user_to_organization(TEXT, TEXT) CASCADE;

-- ============================================================================
-- Step 2: Create the assign_user_to_organization function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.assign_user_to_organization(
  p_user_email TEXT,
  p_organization_id TEXT
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER -- Run with elevated privileges to bypass RLS
AS $$
DECLARE
  v_user_id UUID;
  v_org_exists BOOLEAN;
  v_org_active BOOLEAN;
BEGIN
  -- Validate inputs
  IF p_user_email IS NULL OR p_user_email = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Email is required'
    );
  END IF;

  IF p_organization_id IS NULL OR p_organization_id = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Organization ID is required'
    );
  END IF;

  -- Get user ID from auth.users
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = p_user_email;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User not found with email: ' || p_user_email
    );
  END IF;

  -- Check if organization exists and is active
  SELECT 
    EXISTS(SELECT 1 FROM public.tenants WHERE id = p_organization_id),
    COALESCE((SELECT status FROM public.tenants WHERE id = p_organization_id), 'inactive') = 'active'
  INTO v_org_exists, v_org_active;

  IF NOT v_org_exists THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Organization not found with ID: ' || p_organization_id
    );
  END IF;

  IF NOT v_org_active THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Organization is not active',
      'organization_id', p_organization_id
    );
  END IF;

  -- Update profiles table (bypass RLS with SECURITY DEFINER)
  UPDATE public.profiles
  SET 
    organization_id = p_organization_id,
    status = 'active',
    updated_at = NOW()
  WHERE user_id = v_user_id;

  -- If profile doesn't exist, create it
  IF NOT FOUND THEN
    INSERT INTO public.profiles (user_id, organization_id, status)
    VALUES (v_user_id, p_organization_id, 'active')
    ON CONFLICT (user_id) DO UPDATE
    SET 
      organization_id = p_organization_id,
      status = 'active',
      updated_at = NOW();
  END IF;

  -- Update auth.users metadata (bypass RLS with SECURITY DEFINER)
  UPDATE auth.users
  SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || 
    jsonb_build_object('organizationId', p_organization_id)
  WHERE id = v_user_id;

  -- Return success
  RETURN jsonb_build_object(
    'success', true,
    'user_id', v_user_id,
    'organization_id', p_organization_id,
    'message', 'User successfully assigned to organization'
  );
END;
$$;

-- ============================================================================
-- Step 3: Create the unified create_org_and_assign_user function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_org_and_assign_user(
  p_org_name TEXT,
  p_user_email TEXT,
  p_org_id TEXT DEFAULT NULL -- Optional: auto-generate from name if not provided
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER -- Run with elevated privileges to bypass RLS
AS $$
DECLARE
  v_org_id TEXT;
  v_org_exists BOOLEAN;
  v_sanitized_name TEXT;
BEGIN
  -- Validate inputs
  IF p_org_name IS NULL OR p_org_name = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Organization name is required'
    );
  END IF;

  IF p_user_email IS NULL OR p_user_email = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User email is required'
    );
  END IF;

  -- Generate or use provided org_id
  IF p_org_id IS NULL OR p_org_id = '' THEN
    -- Generate org_id from name: lowercase, replace spaces/special chars with hyphens
    v_sanitized_name := lower(trim(p_org_name));
    v_sanitized_name := regexp_replace(v_sanitized_name, '[^a-z0-9]+', '-', 'g');
    v_sanitized_name := regexp_replace(v_sanitized_name, '^-+|-+$', '', 'g');
    v_org_id := v_sanitized_name;
  ELSE
    v_org_id := p_org_id;
  END IF;

  -- Check if organization already exists
  SELECT EXISTS(
    SELECT 1 FROM public.tenants WHERE id = v_org_id
  ) INTO v_org_exists;

  -- Create organization if it doesn't exist
  IF NOT v_org_exists THEN
    INSERT INTO public.tenants (id, name, status, created_at)
    VALUES (v_org_id, p_org_name, 'active', NOW())
    ON CONFLICT (id) DO NOTHING;
    
    -- Log creation
    RAISE NOTICE 'Created new organization: % (ID: %)', p_org_name, v_org_id;
  ELSE
    RAISE NOTICE 'Organization already exists: % (ID: %)', p_org_name, v_org_id;
  END IF;

  -- Assign user to organization using the other function
  RETURN public.assign_user_to_organization(p_user_email, v_org_id);
END;
$$;

-- ============================================================================
-- Step 4: Grant proper permissions
-- ============================================================================

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.assign_user_to_organization(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_org_and_assign_user(TEXT, TEXT, TEXT) TO authenticated;

-- Grant execute permission to service_role (for server-side calls)
GRANT EXECUTE ON FUNCTION public.assign_user_to_organization(TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_org_and_assign_user(TEXT, TEXT, TEXT) TO service_role;

-- Grant execute permission to anon role (for public access if needed)
GRANT EXECUTE ON FUNCTION public.assign_user_to_organization(TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.create_org_and_assign_user(TEXT, TEXT, TEXT) TO anon;

-- ============================================================================
-- Step 5: Verify the functions were created successfully
-- ============================================================================

-- Check that both functions exist and are unique
DO $$
DECLARE
  assign_count INTEGER;
  create_count INTEGER;
BEGIN
  -- Count assign_user_to_organization functions
  SELECT COUNT(*) INTO assign_count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public' 
    AND p.proname = 'assign_user_to_organization';
  
  -- Count create_org_and_assign_user functions
  SELECT COUNT(*) INTO create_count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public' 
    AND p.proname = 'create_org_and_assign_user';
  
  RAISE NOTICE '✅ Function verification:';
  RAISE NOTICE '   - assign_user_to_organization: % version(s)', assign_count;
  RAISE NOTICE '   - create_org_and_assign_user: % version(s)', create_count;
  
  IF assign_count = 1 AND create_count = 1 THEN
    RAISE NOTICE '✅ SUCCESS: Both functions are unique and properly defined!';
  ELSE
    RAISE WARNING '⚠️  WARNING: Expected 1 version of each function';
  END IF;
END $$;

-- ============================================================================
-- TESTING (Optional - uncomment to test)
-- ============================================================================

-- Example 1: Assign user to existing organization
-- SELECT public.assign_user_to_organization(
--   'user@example.com',
--   'your-org-id'
-- );

-- Example 2: Create organization and assign user
-- SELECT public.create_org_and_assign_user(
--   'My New Organization',
--   'user@example.com'
-- );

-- Example 3: Create organization with custom ID
-- SELECT public.create_org_and_assign_user(
--   'Custom Organization',
--   'user@example.com',
--   'custom-org-id'
-- );

-- ============================================================================
-- DONE!
-- ============================================================================
-- The duplicate function error should now be resolved.
-- Both functions are now unique with proper parameter signatures.
-- ============================================================================
