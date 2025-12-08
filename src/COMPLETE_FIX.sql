-- =====================================================
-- COMPLETE PASSWORD RESET FIX
-- Run this entire script to fix all errors
-- =====================================================

-- STEP 1: Add the missing column
-- =====================================================
DO $$ 
BEGIN
  -- Add needs_password_change column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'needs_password_change'
  ) THEN
    ALTER TABLE profiles 
    ADD COLUMN needs_password_change BOOLEAN DEFAULT FALSE;
    
    RAISE NOTICE '✅ Added needs_password_change column';
  ELSE
    RAISE NOTICE '✅ Column needs_password_change already exists';
  END IF;
END $$;

-- STEP 2: Add index for performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_profiles_needs_password_change 
ON profiles(needs_password_change) 
WHERE needs_password_change = TRUE;

-- STEP 3: Create the password reset function
-- =====================================================
CREATE OR REPLACE FUNCTION set_user_temporary_password(
  user_email TEXT,
  temp_password TEXT
) RETURNS JSON AS $$
DECLARE
  user_id UUID;
  password_hash TEXT;
BEGIN
  -- Find user by email
  SELECT id INTO user_id
  FROM auth.users
  WHERE email = user_email;

  IF user_id IS NULL THEN
    RETURN json_build_object(
      'success', FALSE,
      'error', 'User not found with email: ' || user_email
    );
  END IF;

  -- Hash the password using crypt (Supabase's bcrypt method)
  password_hash := crypt(temp_password, gen_salt('bf'));

  -- Update the user's password in auth.users
  UPDATE auth.users
  SET 
    encrypted_password = password_hash,
    updated_at = NOW()
  WHERE id = user_id;

  -- Mark profile as needing password change
  UPDATE profiles
  SET needs_password_change = TRUE
  WHERE id = user_id;

  RETURN json_build_object(
    'success', TRUE,
    'user_id', user_id,
    'message', 'Temporary password set successfully'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', FALSE,
    'error', SQLERRM,
    'detail', SQLSTATE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 4: Grant permissions
-- =====================================================
GRANT EXECUTE ON FUNCTION set_user_temporary_password(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION set_user_temporary_password(TEXT, TEXT) TO service_role;

-- STEP 5: Verification
-- =====================================================

-- Check if column exists
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'profiles' 
      AND column_name = 'needs_password_change'
    ) 
    THEN '✅ Column exists'
    ELSE '❌ Column missing'
  END as column_check;

-- Check if function exists
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.routines 
      WHERE routine_schema = 'public' 
      AND routine_name = 'set_user_temporary_password'
    )
    THEN '✅ Function exists'
    ELSE '❌ Function missing'
  END as function_check;

-- Show success message
SELECT '🎉 SETUP COMPLETE! Password reset should now work.' as final_status;
