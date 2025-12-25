# Fix: Change Password Screen Not Showing in Production

## 🔍 **Root Cause**

The "Change Password" screen doesn't appear in production because the `needs_password_change` column is missing from the `profiles` table in your production database.

**Why it works in Figma Make but not production:**
- Figma Make (development) has the column
- Your production Supabase database doesn't have it yet
- The code checks `profile.needs_password_change` but gets `undefined`, so the dialog never shows

---

## ✅ **Solution: Add Missing Column to Production Database**

### **Step 1: Access Your Production Supabase Dashboard**

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your **production project** (the one connected to Vercel)
3. Click **SQL Editor** in the left sidebar

---

### **Step 2: Run This SQL Script**

Copy and paste this into the SQL Editor and click **Run**:

```sql
-- =====================================================
-- Add needs_password_change column to profiles table
-- =====================================================

-- Check if column exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'profiles' 
      AND column_name = 'needs_password_change'
  ) THEN
    -- Add the column
    ALTER TABLE profiles 
    ADD COLUMN needs_password_change BOOLEAN DEFAULT FALSE;
    
    RAISE NOTICE '✅ Added needs_password_change column';
  ELSE
    RAISE NOTICE 'ℹ️ Column needs_password_change already exists';
  END IF;
END $$;

-- Add index for performance (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_profiles_needs_password_change 
ON profiles(needs_password_change) 
WHERE needs_password_change = TRUE;

-- Verify the column was added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'profiles' AND column_name = 'needs_password_change';

-- Success message
SELECT '✅ Column added successfully! Change password feature is now enabled.' as status;
```

---

### **Step 3: Verify the Column Was Added**

After running the script, you should see output like:

```
✅ Column added successfully! Change password feature is now enabled.

column_name           | data_type | is_nullable | column_default
----------------------|-----------|-------------|---------------
needs_password_change | boolean   | YES         | false
```

---

### **Step 4: Test in Production**

Now the feature will work! Here's how to test:

#### **Option A: Reset a Test User's Password (Recommended)**

1. In Supabase Dashboard, go to **SQL Editor**
2. Run this to mark a test user for password change:
   ```sql
   -- Replace 'testuser@example.com' with your test user email
   UPDATE profiles 
   SET needs_password_change = TRUE 
   WHERE email = 'testuser@example.com';
   ```

3. Log in as that user in production
4. You should see the **Change Password Dialog** 🎉

#### **Option B: Create a New User via Users Module**

1. Log in as Admin in production
2. Go to **Users** module
3. Click **"Invite User"** or **"Add User"**
4. The system automatically sets `needs_password_change = TRUE` for new users
5. When they log in with the temporary password, they'll see the dialog

---

## 🔧 **How It Works**

### **Normal Flow:**

1. Admin creates new user in Users module
2. System sets `needs_password_change = TRUE` in database
3. Admin gives user the temporary password
4. User logs in with temporary password
5. System checks: `if (profile.needs_password_change) { ... }`
6. **Change Password Dialog appears** 🔐
7. User creates new secure password
8. System sets `needs_password_change = FALSE`
9. User proceeds to dashboard

### **What Was Broken in Production:**

```javascript
// This check failed because column didn't exist
if (profile.needs_password_change) {  // undefined in production ❌
  setShowChangePassword(true);
}
```

Now it will work:
```javascript
if (profile.needs_password_change) {  // true or false ✅
  setShowChangePassword(true);
}
```

---

## 📋 **Additional Database Columns You Might Need**

While you're in the SQL Editor, check if these other columns exist:

```sql
-- Check all important columns in profiles table
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY column_name;
```

**Expected columns:**
- `id` (uuid)
- `email` (text)
- `name` (text)
- `role` (text)
- `organization_id` (uuid)
- `manager_id` (uuid) - optional
- `needs_password_change` (boolean) ← **This one we just added**
- `profile_picture` (text) - optional
- `created_at` (timestamp)
- `updated_at` (timestamp)

If any are missing, let me know and I'll provide the SQL to add them.

---

## 🚀 **After Fix - Redeploy (Optional)**

The change is database-only, so no code redeploy needed! But to be safe:

1. **In Vercel Dashboard:**
   - Go to your project
   - Click **Deployments**
   - Click **"Redeploy"** on latest deployment
   - Wait 2 minutes

2. **Clear Browser Cache:**
   - Press `Ctrl+Shift+Delete` (Windows) or `Cmd+Shift+Delete` (Mac)
   - Select "Cached images and files"
   - Click **Clear data**

3. **Test Again:**
   - Visit `https://prospacescrm.com`
   - Try the password change flow

---

## 🎯 **Troubleshooting**

### **Issue: Still doesn't show after adding column**

**Check 1: Verify column exists**
```sql
SELECT needs_password_change 
FROM profiles 
WHERE email = 'your-email@example.com';
```

**Check 2: Manually set flag for testing**
```sql
UPDATE profiles 
SET needs_password_change = TRUE 
WHERE email = 'your-email@example.com';
```

**Check 3: Check browser console**
- Open DevTools (F12)
- Look for: `⚠️ User needs to change password`
- If you see this, the dialog should appear

---

### **Issue: Dialog appears but password won't change**

**Check RLS Policies:**
```sql
-- Allow users to update their own password flag
CREATE POLICY "Users can update own needs_password_change" 
ON profiles 
FOR UPDATE 
USING (auth.uid() = id);
```

---

## ✅ **Verification Checklist**

After running the SQL:

- [ ] SQL script executed successfully (no errors)
- [ ] Column `needs_password_change` shows in query results
- [ ] Test user has `needs_password_change = TRUE`
- [ ] Log in as test user in production
- [ ] Change Password Dialog appears
- [ ] Can enter new password
- [ ] Can submit and login successfully
- [ ] Flag resets to `FALSE` after password change

---

## 📞 **If You Need Help**

**Stuck on SQL?**
1. Copy the error message from Supabase
2. Check the SQL syntax
3. Make sure you're using the correct project

**Still not working?**
1. Check browser console for JavaScript errors
2. Verify Supabase project URL matches production
3. Check environment variables in Vercel

---

**This will fix the Change Password screen in production! Run the SQL script and you're good to go.** 🚀

**Estimated time:** 2 minutes to run SQL + 1 minute to test = **3 minutes total**
