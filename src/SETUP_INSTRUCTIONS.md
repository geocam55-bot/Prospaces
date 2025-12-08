# 🚨 SETUP REQUIRED - Follow These Steps!

## ⚠️ You're seeing an error because the database setup hasn't been completed yet.

---

## 📋 STEP-BY-STEP SETUP (Do this NOW)

### Step 1: Go to Supabase Dashboard
Open your Supabase project dashboard at: https://supabase.com/dashboard

### Step 2: Open SQL Editor
1. Click on **"SQL Editor"** in the left sidebar
2. Click **"New Query"** button

### Step 3: Copy and Paste This SQL

```sql
-- =====================================================
-- ADD PASSWORD CHANGE SUPPORT
-- =====================================================

-- A: Add needs_password_change column
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS needs_password_change BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_profiles_needs_password_change 
ON profiles(needs_password_change) 
WHERE needs_password_change = TRUE;

-- B: Create function to set temporary password
CREATE OR REPLACE FUNCTION set_user_temporary_password(
  user_email TEXT,
  temp_password TEXT
) RETURNS JSON AS $$
DECLARE
  user_id UUID;
  password_hash TEXT;
  result JSON;
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
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- C: Grant execute permission
GRANT EXECUTE ON FUNCTION set_user_temporary_password(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION set_user_temporary_password(TEXT, TEXT) TO service_role;
```

### Step 4: Run the Query
Click the **"RUN"** button (or press Ctrl/Cmd + Enter)

### Step 5: Verify Success
You should see output like:
```
Success. No rows returned
```

### Step 6: Test It!
1. Go back to your ProSpaces CRM app
2. Go to Users page
3. Click "Reset Password" on any user
4. Should work now! ✅

---

## 🔍 What This Does

- **Adds a column** to track users who need to change passwords
- **Creates a function** to safely set temporary passwords
- **Grants permissions** so the app can use the function

---

## ❓ Troubleshooting

### "Column already exists"
✅ **That's OK!** The `IF NOT EXISTS` clause prevents errors.

### "Function already exists" 
✅ **That's OK!** The `CREATE OR REPLACE` overwrites it.

### "Permission denied"
❌ **Problem:** You might not have database owner permissions.
**Solution:** Make sure you're logged in as the database owner/admin.

### Still getting errors?
1. Check the SQL Editor for error messages
2. Copy the error and search for it
3. Make sure you copied the ENTIRE SQL script above

---

## ✅ After Setup

Once you run this SQL, the temporary password system will work:

1. ✅ Click "Reset Password" generates a working password
2. ✅ Copy button works reliably  
3. ✅ User can log in immediately with temp password
4. ✅ User is forced to change password on first login
5. ✅ New password works normally

---

## 📖 More Info

See `/TEMP_PASSWORD_SETUP.md` for complete documentation.

---

**IMPORTANT:** Run the SQL above RIGHT NOW before continuing!
