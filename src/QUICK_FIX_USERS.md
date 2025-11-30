# 🚨 Quick Fix: "No Users Found" Error

## Problem
You're seeing **"No users found in the profiles table"** even though you can log in.

## Solution (2 Minutes)

### Step 1: Open Users Page
1. Log into ProSpaces CRM
2. Click **"Users"** in the navigation menu

### Step 2: Run Diagnostic
You'll see a blue card at the top that says **"Profiles Table Sync Tool"**

1. Click the **"Run Full Diagnostic"** button
2. Wait 2-3 seconds for results

### Step 3: Fix the Issue
The diagnostic will show you what's wrong and provide a fix.

1. Click **"Copy SQL"** button
2. Click **"Open SQL Editor"** button (opens Supabase)
3. In Supabase, paste the SQL script (Ctrl+V or Cmd+V)
4. Click **"Run"** or press **F5**
5. Wait for "Success" message

### Step 4: Refresh
1. Go back to ProSpaces CRM
2. Click **"Refresh Users List"**
3. ✅ Done! All users should now appear

## What This Does

The SQL script:
- ✅ Creates the profiles table (if missing)
- ✅ Syncs ALL users from Supabase auth to profiles
- ✅ Fixes permission issues (RLS policies)
- ✅ Sets up auto-sync for future users

## Expected Results

**Before Fix:**
```
❌ No users found
❌ Empty users table
❌ Only shows current user (maybe)
```

**After Fix:**
```
✅ All users visible
✅ Can search/filter users
✅ Can manage user permissions
✅ Users auto-sync on signup
```

## Troubleshooting

### "I don't see the blue diagnostic card"
- You may already have users synced
- Try refreshing the page
- Check if you have admin permissions

### "SQL script failed to run"
- Make sure you're in the correct Supabase project
- Check that you selected the entire script (Ctrl+A)
- Try running it again

### "Still no users after refresh"
- Check browser console for errors (F12)
- Verify you have admin or super_admin role
- Re-run the diagnostic to see specific errors

### "I see some users but not all"
- This might be an organization_id mismatch
- Re-run the SQL script (it's safe to run multiple times)
- Check that user metadata includes organizationId

## Alternative: Manual SQL

If you prefer, go directly to Supabase and run this:

```sql
-- Quick sync script
INSERT INTO public.profiles (id, email, name, role, organization_id, status, last_login, created_at)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'name', au.email),
  COALESCE(au.raw_user_meta_data->>'role', 'standard_user'),
  (au.raw_user_meta_data->>'organizationId')::uuid,
  'active',
  au.last_sign_in_at,
  au.created_at
FROM auth.users au
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  last_login = EXCLUDED.last_login,
  updated_at = now();
```

This is a simplified version that just syncs users without fixing policies.

## Need More Help?

See the complete guide: **[PROFILES_SYNC_GUIDE.md](PROFILES_SYNC_GUIDE.md)**

---

**Time to Fix:** 2-3 minutes  
**Difficulty:** Easy (just copy/paste)  
**Risk:** None (SQL is safe and idempotent)
