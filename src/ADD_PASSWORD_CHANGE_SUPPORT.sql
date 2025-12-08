-- =====================================================
-- ADD PASSWORD CHANGE SUPPORT (ROBUST VERSION)
-- =====================================================
-- This adds:
-- 1. needs_password_change column to profiles
-- 2. Function to set temporary passwords via SQL
-- 3. Proper error handling and verification
-- =====================================================

-- A: Add needs_password_change column (WITH ERROR HANDLING)
-- =====================================================
DO $$ 
BEGIN
  -- Check if column exists first
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'needs_password_change'
  ) THEN
    -- Add the column
    ALTER TABLE profiles 
    ADD COLUMN needs_password_change BOOLEAN DEFAULT FALSE;
    
    RAISE NOTICE '✅ A: Added needs_password_change column';
  ELSE
    RAISE NOTICE '✅ A: Column needs_password_change already exists (skipping)';
  END IF;
  
  -- Add index (safe to run multiple times)
  CREATE INDEX IF NOT EXISTS idx_profiles_needs_password_change 
  ON profiles(needs_password_change) 
  WHERE needs_password_change = TRUE;
  
  RAISE NOTICE '✅ A: Index created/verified';
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '❌ Error in Step A: %', SQLERRM;
  RAISE;
END $$;

-- B: Create function to set temporary password
-- =====================================================
CREATE OR REPLACE FUNCTION set_user_temporary_password(
  user_email TEXT,
  temp_password TEXT
) RETURNS JSON AS $$
DECLARE
  user_id UUID;
  password_hash TEXT;
BEGIN
  -- Find user by email in auth.users
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

  -- Check if update succeeded
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', FALSE,
      'error', 'Failed to update password in auth.users'
    );
  END IF;

  -- Mark profile as needing password change
  UPDATE profiles
  SET needs_password_change = TRUE
  WHERE id = user_id;

  -- Check if profile update succeeded
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', FALSE,
      'error', 'Profile not found for user_id: ' || user_id::text
    );
  END IF;

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

SELECT '✅ B: Created/Updated set_user_temporary_password function' as status;

-- C: Grant execute permission
-- =====================================================
GRANT EXECUTE ON FUNCTION set_user_temporary_password(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION set_user_temporary_password(TEXT, TEXT) TO service_role;

SELECT '✅ C: Granted permissions to authenticated and service_role' as status;

-- =====================================================
-- VERIFICATION
-- =====================================================

SELECT '' as spacer;
SELECT '========================================' as divider;
SELECT '    PASSWORD CHANGE SUPPORT ADDED' as title;
SELECT '========================================' as divider;
SELECT '' as spacer;

-- Verify column was added
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'needs_password_change'
  ) THEN
    RAISE NOTICE '✅ VERIFIED: Column exists';
  ELSE
    RAISE NOTICE '❌ ERROR: Column does not exist!';
  END IF;
END $$;

-- Verify function was created
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.routines 
    WHERE routine_schema = 'public' 
    AND routine_name = 'set_user_temporary_password'
  ) THEN
    RAISE NOTICE '✅ VERIFIED: Function exists';
  ELSE
    RAISE NOTICE '❌ ERROR: Function does not exist!';
  END IF;
END $$;

SELECT '' as spacer;
SELECT '🎉 SETUP COMPLETE!' as status;
SELECT '' as spacer;
SELECT '📝 NEXT STEPS:' as instruction;
SELECT '1. Go to ProSpaces CRM app' as instruction;
SELECT '2. Navigate to Users page' as instruction;
SELECT '3. Click "Reset Password" on any user' as instruction;
SELECT '4. It should work now!' as instruction;
SELECT '' as spacer;
