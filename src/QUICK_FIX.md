# 🚨 QUICK FIX - Password Reset Not Working

## ❌ ERROR YOU'RE SEEING:
```
Could not find the function public.set_user_temporary_password
```

## ✅ THE FIX (Takes 2 minutes):

---

### 🎯 STEP 1: Open Supabase
Go to: https://supabase.com/dashboard
- Click your project
- Click **"SQL Editor"** in left sidebar

---

### 🎯 STEP 2: Copy This Entire SQL Block

```sql
-- Add password change support
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS needs_password_change BOOLEAN DEFAULT FALSE;

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
```

---

### 🎯 STEP 3: Run It
- Click **"RUN"** button
- OR press **Ctrl+Enter** (Windows) or **Cmd+Enter** (Mac)

---

### 🎯 STEP 4: Done!
✅ Go back to ProSpaces CRM
✅ Try "Reset Password" again
✅ Should work now!

---

## 🎉 WHAT YOU JUST FIXED:

Before:
- ❌ Password reset generated password but didn't set it
- ❌ User couldn't log in
- ❌ Had to manually run SQL

After:
- ✅ Password reset works automatically
- ✅ Password set in database immediately  
- ✅ User can log in right away
- ✅ User forced to change password on first login

---

## 🔍 VERIFY IT WORKED:

In Supabase SQL Editor, run:
```sql
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name = 'set_user_temporary_password';
```

Should return: `set_user_temporary_password` ✅

---

## ❓ STILL NOT WORKING?

### Check browser console:
- Press F12
- Look for error messages
- Share them if you need help

### Check SQL Editor output:
- Did it say "Success"?
- Any red error messages?

### Common Issues:
1. **Didn't copy entire SQL** - Make sure you got it all
2. **No database permissions** - Make sure you're project owner
3. **Network issue** - Refresh and try again

---

**Need more help?** See `/SETUP_INSTRUCTIONS.md` for detailed guide.
