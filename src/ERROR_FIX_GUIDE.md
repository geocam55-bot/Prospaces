# 🔧 Error Fix Guide - Password Reset

## 🚨 Errors You May See

### Error 1: "Could not find the function"
```
Could not find the function public.set_user_temporary_password
```

**Cause:** The SQL function hasn't been created yet.

**Fix:** Run `/RUN_THIS_NOW.md` SQL script

---

### Error 2: "Column does not exist" ⬅️ YOU ARE HERE
```
column "needs_password_change" of relation "profiles" does not exist
```

**Cause:** The function was created but the column wasn't added.

**Fix:** Run the SQL below to add the missing column.

---

## ✅ COMPLETE FIX (Run This SQL)

### 📋 Copy This Entire Block:

```sql
-- Add missing column with error handling
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

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_profiles_needs_password_change 
ON profiles(needs_password_change) 
WHERE needs_password_change = TRUE;

-- Update the function to ensure it works
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

-- Verify everything
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'profiles' AND column_name = 'needs_password_change'
    )
    THEN '✅ Column exists'
    ELSE '❌ Column missing'
  END as column_status;

SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.routines 
      WHERE routine_name = 'set_user_temporary_password'
    )
    THEN '✅ Function exists'
    ELSE '❌ Function missing'
  END as function_status;

SELECT '🎉 COMPLETE! Test password reset now.' as final_message;
```

---

## 📖 How to Run

### 1. Open Supabase Dashboard
- Go to: https://supabase.com/dashboard
- Select your ProSpaces project
- Click **SQL Editor** in left sidebar

### 2. Create New Query
- Click **"New Query"** button

### 3. Paste SQL
- Copy the entire SQL block above
- Paste into the SQL editor

### 4. Execute
- Click **"RUN"** button
- OR press **Ctrl+Enter** (Windows) or **Cmd+Enter** (Mac)

### 5. Check Output
You should see:
```
✅ Added needs_password_change column
✅ Column exists
✅ Function exists
🎉 COMPLETE! Test password reset now.
```

---

## 🧪 Test After Running

### Test 1: Reset Password
1. Go to ProSpaces CRM
2. Navigate to **Users** page
3. Click **"Reset Password"** on any user
4. Should see: "✅ Temporary password set! User can now log in."
5. No errors! ✅

### Test 2: Copy Password
1. In the dialog, click purple **"Copy"** button
2. Should see toast: "Password copied to clipboard!"
3. Paste it - should work ✅

### Test 3: User Login
1. Log out
2. Sign in with temporary password
3. Password change dialog appears ✅
4. Change password
5. Auto-logged in ✅

---

## 🔍 Why Did This Happen?

The SQL script ran partially but was interrupted:

**What Succeeded:**
- ✅ Function `set_user_temporary_password` was created

**What Failed:**
- ❌ Column `needs_password_change` wasn't added
- ❌ Maybe permission issue
- ❌ Maybe script was cut off

**The Fix:**
The new SQL above is more robust:
- Checks if column exists before adding
- Uses `DO` blocks for better error handling
- Safe to run multiple times
- Verifies everything at the end

---

## ❓ Troubleshooting

### Still getting "column does not exist"?

**Check if profiles table exists:**
```sql
SELECT table_name FROM information_schema.tables WHERE table_name = 'profiles';
```

Should return: `profiles`

**Check column list:**
```sql
SELECT column_name FROM information_schema.columns WHERE table_name = 'profiles';
```

Look for `needs_password_change` in the list.

**If column still missing:**
Run this manually:
```sql
ALTER TABLE profiles ADD COLUMN needs_password_change BOOLEAN DEFAULT FALSE;
```

---

### Getting "permission denied"?

You need database admin/owner access.

**Solutions:**
1. Make sure you're logged in as the project owner
2. Check Supabase project settings > Database > Connection string
3. Contact your Supabase project administrator

---

### Function works but users not prompted to change password?

**Check Login.tsx is updated:**
The Login component should check for `needs_password_change` flag.

**Manual check:**
```sql
SELECT id, email, needs_password_change 
FROM profiles 
WHERE email = 'test@example.com';
```

Should show: `needs_password_change | true`

---

## 📁 Related Files

| File | Purpose |
|------|---------|
| `/RUN_THIS_NOW.md` | Quick fix instructions |
| `/COMPLETE_FIX.sql` | Complete SQL script |
| `/FIX_MISSING_COLUMN.sql` | Just the column fix |
| `/CHECKLIST.md` | Testing checklist |
| `/TEMP_PASSWORD_SETUP.md` | Full documentation |

---

## ✅ Success Checklist

After running the SQL, verify:

- [ ] No errors in SQL output
- [ ] See "✅ Column exists"
- [ ] See "✅ Function exists"
- [ ] Password reset works in app
- [ ] Copy button works
- [ ] User can log in with temp password
- [ ] Password change dialog appears
- [ ] After change, normal login works

---

## 🎯 Summary

**Problem:** Column wasn't created when function was created.

**Solution:** Run the SQL above to add the column.

**Result:** Password reset works completely!

---

**👉 RUN THE SQL NOW - Takes 30 seconds!**
