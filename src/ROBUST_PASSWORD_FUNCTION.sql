-- =====================================================
-- ROBUST PASSWORD RESET FUNCTION
-- Handles missing column gracefully
-- =====================================================

CREATE OR REPLACE FUNCTION set_user_temporary_password(
  user_email TEXT,
  temp_password TEXT
) RETURNS JSON AS $$
DECLARE
  user_id UUID;
  password_hash TEXT;
  column_exists BOOLEAN;
BEGIN
  -- Find user by email
  SELECT id INTO user_id
  FROM auth.users
  WHERE email = user_email;

  IF user_id IS NULL THEN
    RETURN json_build_object(
      'success', FALSE,
      'error', 'User not found'
    );
  END IF;

  -- Hash the password using crypt (Supabase's method)
  password_hash := crypt(temp_password, gen_salt('bf'));

  -- Update the user's password in auth.users
  UPDATE auth.users
  SET 
    encrypted_password = password_hash,
    updated_at = NOW()
  WHERE id = user_id;

  -- Check if needs_password_change column exists
  SELECT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'needs_password_change'
  ) INTO column_exists;

  -- Only try to update the column if it exists
  IF column_exists THEN
    UPDATE profiles
    SET needs_password_change = TRUE
    WHERE id = user_id;
  ELSE
    RAISE NOTICE 'Column needs_password_change does not exist, skipping update';
  END IF;

  RETURN json_build_object(
    'success', TRUE,
    'user_id', user_id,
    'message', 'Temporary password set successfully',
    'password_change_flag_set', column_exists
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', FALSE,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION set_user_temporary_password(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION set_user_temporary_password(TEXT, TEXT) TO service_role;

SELECT '✅ Function updated to handle missing column!' as status;
