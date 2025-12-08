# 🚨 RUN THIS SQL NOW TO FIX THE ERROR

## ❌ Current Error:
```
column "needs_password_change" of relation "profiles" does not exist
```

## ✅ THE FIX:

---

### 1. Open Supabase SQL Editor
- Go to https://supabase.com/dashboard
- Open your ProSpaces project
- Click "SQL Editor" (left sidebar)
- Click "New Query"

---

### 2. Copy This ENTIRE Script:

```sql
-- =====================================================
-- COMPLETE PASSWORD RESET FIX
-- =====================================================

-- Add the missing column
DO $$ 
BEGIN
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
    RAISE NOTICE '✅ Column already exists';
  END IF;
END $$;

-- Add index
CREATE INDEX IF NOT EXISTS idx_profiles_needs_password_change 
ON profiles(needs_password_change) 
WHERE needs_password_change = TRUE;

-- Create password reset function
CREATE OR REPLACE FUNCTION set_user_temporary_password(
  user_email TEXT,
  temp_password TEXT
) RETURNS JSON AS $$
DECLARE
  user_id UUID;
  password_hash TEXT;
BEGIN
  SELECT id INTO user_id FROM auth.users WHERE email = user_email;
  
  IF user_id IS NULL THEN
    RETURN json_build_object('success', FALSE, 'error', 'User not found');
  END IF;
  
  password_hash := crypt(temp_password, gen_salt('bf'));
  
  UPDATE auth.users
  SET encrypted_password = password_hash, updated_at = NOW()
  WHERE id = user_id;
  
  UPDATE profiles
  SET needs_password_change = TRUE
  WHERE id = user_id;
  
  RETURN json_build_object('success', TRUE, 'user_id', user_id);
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', FALSE, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION set_user_temporary_password(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION set_user_temporary_password(TEXT, TEXT) TO service_role;

-- Verify
SELECT '🎉 SETUP COMPLETE!' as status;
```

---

### 3. Click "RUN"
Press the **RUN** button or hit **Ctrl/Cmd + Enter**

---

### 4. Check Output
You should see:
```
✅ Added needs_password_change column
🎉 SETUP COMPLETE!
```

---

### 5. Test It!
- Go back to ProSpaces CRM
- Navigate to Users page
- Click "Reset Password" on any user
- **Should work now!** ✅

---

## 🔍 What Went Wrong?

The previous SQL script didn't fully execute. Likely causes:
1. **Script was interrupted** before completing
2. **Permissions issue** prevented ALTER TABLE
3. **Only copied part of the script**

This new script checks if the column exists first, so it's safe to run multiple times.

---

## ✅ After Running This:

1. ✅ Column `needs_password_change` will exist
2. ✅ Function `set_user_temporary_password` will work
3. ✅ Password reset will work immediately
4. ✅ Users will be forced to change temp passwords

---

## ❓ Still Getting Errors?

### Check your output in SQL Editor:
- Any red error messages?
- What does it say?

### Common issues:

**"permission denied"**
- You need database owner/admin access
- Contact your Supabase project admin

**"relation does not exist"**
- Make sure `profiles` table exists
- Check table name is exactly `profiles` (lowercase)

**"function already exists"**
- That's OK! `CREATE OR REPLACE` will update it

---

## 📁 Alternative Files:

If you want to review the complete SQL:
- `/COMPLETE_FIX.sql` - Same script, formatted
- `/FIX_MISSING_COLUMN.sql` - Just the column part
- `/ADD_PASSWORD_CHANGE_SUPPORT.sql` - Original full script

---

**👉 RUN THE SQL ABOVE NOW TO FIX THE ERROR!**
