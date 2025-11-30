# Troubleshooting: User Not Showing Up

## Issue: `larry.lee@ronaatlantic.ca` is not visible in the Users list

Follow these steps to diagnose and fix the issue:

---

## Step 1: Open Browser Console

1. Open your app in the browser
2. Press `F12` (or right-click → Inspect)
3. Click on the **Console** tab

---

## Step 2: Run Diagnostic Tool

In the console, type:

```javascript
debugUsers()
```

Then press **Enter**.

This will output detailed information about:
- ✅ Your current user (email, role, organizationId)
- ✅ Whether the profiles table exists
- ✅ All users in the database
- ✅ Whether larry.lee@ronaatlantic.ca exists
- ✅ Which organization Larry belongs to
- ✅ Users in YOUR organization

---

## Step 3: Interpret the Results

### Scenario A: "Profiles table not found"

**Output:**
```
❌ Error querying profiles table
💡 This usually means the profiles table doesn't exist yet.
```

**Solution:**
You need to create the profiles table. Go to:
1. Supabase Dashboard → SQL Editor
2. Copy the contents of `/supabase/migrations/001_create_profiles_table.sql`
3. Paste and click **RUN**
4. Refresh your app

---

### Scenario B: "larry.lee@ronaatlantic.ca NOT found in profiles table"

**Output:**
```
❌ larry.lee@ronaatlantic.ca NOT found in profiles table
💡 User exists in Auth but not synced to profiles table
```

**Solution:**
The user exists in Supabase Auth but hasn't been synced to the profiles table. 

**Option 1 - Automatic Sync (Recommended):**
Ask Larry to log in again. The trigger will automatically create their profile.

**Option 2 - Manual Sync:**
Go to Supabase Dashboard → SQL Editor and run:

```sql
-- Manually sync Larry's account
INSERT INTO public.profiles (id, email, name, role, organization_id, status, created_at)
SELECT 
  id,
  email,
  COALESCE(raw_user_meta_data->>'name', email) as name,
  COALESCE(raw_user_meta_data->>'role', 'standard_user') as role,
  COALESCE(raw_user_meta_data->>'organizationId', 'default-org') as organization_id,
  'active' as status,
  created_at
FROM auth.users
WHERE email = 'larry.lee@ronaatlantic.ca'
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  organization_id = EXCLUDED.organization_id;
```

---

### Scenario C: "Larry is in a DIFFERENT organization"

**Output:**
```
⚠️ Larry is in a DIFFERENT organization:
   Larry's org: abc-123-xyz
   Your org: def-456-uvw
```

**Solution:**
Larry belongs to a different organization. This is by design for multi-tenant isolation.

**If you're an Admin:**
You cannot see users from other organizations. Only Super Admins can see all users.

**If you're a Super Admin:**
You should be able to see Larry. Check if:
1. Your role is correctly set to `super_admin`
2. The RLS policies are applied correctly
3. The debug output shows your role

**To move Larry to your organization (Super Admin only):**
1. Use the "Edit User" button
2. Change the Organization dropdown
3. Save

---

### Scenario D: "Found larry.lee@ronaatlantic.ca! Larry is in YOUR organization!"

**Output:**
```
✅ Found larry.lee@ronaatlantic.ca!
✅ Larry is in YOUR organization!
```

**Solution:**
Larry exists and is in your organization, but isn't showing in the UI. This means:

1. **Cache issue** - Hard refresh the page (`Ctrl+Shift+R` or `Cmd+Shift+R`)
2. **Client-side fallback** - The app is using localStorage instead of the database
   - Check the yellow banner in the Users page
   - Deploy the backend with: `supabase functions deploy server`
3. **RLS policy blocking** - The Row Level Security policy might be misconfigured
   - Run this query in Supabase SQL Editor:

```sql
-- Test if you can query Larry's profile
SELECT * FROM profiles WHERE email = 'larry.lee@ronaatlantic.ca';
```

If this returns no results, the RLS policy is blocking you.

**Fix RLS:**
```sql
-- Temporarily disable RLS to test (DON'T DO THIS IN PRODUCTION!)
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Then check again
SELECT * FROM profiles WHERE email = 'larry.lee@ronaatlantic.ca';

-- Re-enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
```

---

## Step 4: Check Organization IDs

To verify organization IDs match, run this in SQL Editor:

```sql
-- Check all users and their organizations
SELECT 
  email,
  name,
  role,
  organization_id,
  status
FROM profiles
ORDER BY organization_id, email;
```

Look for:
- Your email and organization_id
- Larry's email and organization_id
- Do they match?

---

## Step 5: Check Supabase Auth

1. Go to Supabase Dashboard → **Authentication** → **Users**
2. Find `larry.lee@ronaatlantic.ca`
3. Click on the email to view details
4. Check the `user_metadata` field
5. Look for:
   - `organizationId`: Should match yours
   - `role`: Should be set (e.g., `standard_user`, `admin`)
   - `name`: Should be "Larry Lee" or similar

If `organizationId` doesn't match or doesn't exist, update it:

```sql
-- Update Larry's metadata
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  raw_user_meta_data,
  '{organizationId}',
  '"YOUR_ORG_ID_HERE"'::jsonb
)
WHERE email = 'larry.lee@ronaatlantic.ca';

-- Then sync to profiles
UPDATE profiles
SET organization_id = 'YOUR_ORG_ID_HERE'
WHERE email = 'larry.lee@ronaatlantic.ca';
```

---

## Step 6: Still Not Working?

If you've tried everything above and Larry still isn't showing:

1. **Check console for errors** - Look for red errors in the browser console
2. **Check network tab** - See if the API request to get users is failing
3. **Check backend logs** - If you deployed the backend, check Supabase Functions logs
4. **Hard refresh** - `Ctrl+Shift+R` or `Cmd+Shift+R`
5. **Clear localStorage** - Run in console: `localStorage.clear()` then refresh

---

## Quick Reference

### Useful Console Commands

```javascript
// Run full diagnostics
debugUsers()

// Manually sync current user to profiles
manualSyncUser()

// Check what's in localStorage
console.log('Registry:', JSON.parse(localStorage.getItem('users_registry') || '[]'))
console.log('My org users:', JSON.parse(localStorage.getItem('users_YOUR_ORG_ID') || '[]'))

// Clear all user caches
localStorage.removeItem('users_registry')
Object.keys(localStorage).forEach(key => {
  if (key.startsWith('users_')) {
    localStorage.removeItem(key);
  }
});
```

### Useful SQL Queries

```sql
-- See all profiles
SELECT * FROM profiles;

-- See Larry
SELECT * FROM profiles WHERE email = 'larry.lee@ronaatlantic.ca';

-- Count users per organization
SELECT organization_id, COUNT(*) as user_count
FROM profiles
GROUP BY organization_id;

-- See your own profile
SELECT * FROM profiles WHERE id = auth.uid();
```

---

## Summary Checklist

- [ ] Run `debugUsers()` in console
- [ ] Check if profiles table exists
- [ ] Check if Larry exists in profiles table
- [ ] Verify organizationId matches
- [ ] Check RLS policies
- [ ] Hard refresh browser
- [ ] Clear localStorage if needed
- [ ] Re-run migration if needed

---

## Need More Help?

1. Share the output of `debugUsers()` from the console
2. Share a screenshot of Larry's user details from Supabase Auth
3. Share the result of `SELECT * FROM profiles WHERE email = 'larry.lee@ronaatlantic.ca';`
