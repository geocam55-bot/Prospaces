# Remove Demo Data from ProSpaces CRM

## Overview
This guide will help you clean up all demo data from your live Supabase database.

## Step 1: Clean Up Database (Supabase SQL Editor)

Go to your Supabase project → SQL Editor and run the following SQL commands:

### Delete All Demo User Accounts

```sql
-- Delete all users with @prospaces.com email addresses (demo accounts)
-- This will remove entries from the KV store

-- Note: Since we're using Supabase KV store, we need to identify demo users
-- by their email pattern and remove them from auth.users

-- Delete demo users from Supabase Auth
DELETE FROM auth.users 
WHERE email LIKE '%@prospaces.com' 
   OR email LIKE 'demo.%@prospaces.com';

-- If you want to be more specific and only delete the "Quick Demo" accounts:
DELETE FROM auth.users 
WHERE email LIKE 'demo.super_admin%@prospaces.com'
   OR email LIKE 'demo.admin%@prospaces.com'
   OR email LIKE 'demo.manager%@prospaces.com'
   OR email LIKE 'demo.standard_user%@prospaces.com'
   OR email LIKE 'demo.viewer%@prospaces.com';
```

### Clean Up Associated Data (if using actual database tables)

If you've migrated from KV store to database tables, also run:

```sql
-- Delete contacts created by demo users
DELETE FROM contacts 
WHERE user_id IN (
  SELECT id FROM auth.users 
  WHERE email LIKE '%@prospaces.com'
);

-- Delete tasks created by demo users
DELETE FROM tasks 
WHERE user_id IN (
  SELECT id FROM auth.users 
  WHERE email LIKE '%@prospaces.com'
);

-- Delete appointments created by demo users
DELETE FROM appointments 
WHERE user_id IN (
  SELECT id FROM auth.users 
  WHERE email LIKE '%@prospaces.com'
);

-- Delete bids created by demo users
DELETE FROM bids 
WHERE user_id IN (
  SELECT id FROM auth.users 
  WHERE email LIKE '%@prospaces.com'
);

-- Delete notes created by demo users
DELETE FROM notes 
WHERE user_id IN (
  SELECT id FROM auth.users 
  WHERE email LIKE '%@prospaces.com'
);

-- Delete inventory items created by demo users
DELETE FROM inventory 
WHERE user_id IN (
  SELECT id FROM auth.users 
  WHERE email LIKE '%@prospaces.com'
);

-- Delete audit logs for demo users
DELETE FROM audit_logs 
WHERE user_id IN (
  SELECT id FROM auth.users 
  WHERE email LIKE '%@prospaces.com'
);
```

### Verify Cleanup

```sql
-- Check for remaining demo accounts
SELECT email, created_at 
FROM auth.users 
WHERE email LIKE '%@prospaces.com'
ORDER BY created_at DESC;

-- Should return 0 rows if cleanup was successful
```

## Step 2: Clean Up KV Store Data

Since your app uses the KV store, you'll need to clean up the KV entries. Unfortunately, Deno KV doesn't support bulk deletion via SQL, so you have two options:

### Option A: Manual Cleanup via Edge Function
Create a one-time cleanup function to remove demo user data from KV store.

### Option B: Let them expire naturally
Demo user data in KV store will not interfere with production data since it's keyed by user ID.

## Step 3: Remove Hardcoded Demo Data from Frontend

The following components have hardcoded demo data in their initial state that should be removed:

### Users Component
File: `/components/Users.tsx`
- Lines 45-82: Remove the hardcoded demo users array
- Replace with empty array: `const [users, setUsers] = useState<OrgUser[]>([]);`

### Email Component  
File: `/components/Email.tsx`
- Lines 62-67: Remove hardcoded email account
- Lines 72-115: Remove hardcoded email threads
- Replace both with empty arrays

## Step 4: (Optional) Remove "Quick Demo" Buttons

If you want to remove the ability to create demo accounts:

File: `/components/Login.tsx`
- Remove the `handleQuickSignUp` function (lines 79-137)
- Remove the "Quick Demo" section in the JSX (lines 202-233)

## Step 5: Verify Everything is Clean

1. **Check Supabase Dashboard:**
   - Go to Authentication → Users
   - Verify no @prospaces.com emails exist

2. **Check your app:**
   - Log in with a real account
   - Navigate to Users page - should not show demo users
   - Check all modules for demo data

## Important Notes

⚠️ **Before running these scripts:**
1. **Backup your database** - even though you're removing demo data, it's good practice
2. **Test in development first** if you have a dev environment
3. **Verify the email patterns** match your demo accounts

✅ **After cleanup:**
- Your database will only contain real user data
- Demo accounts will no longer be able to sign in
- New users will need to use the regular signup process

## Need Help?

If you encounter any issues:
1. Check the Supabase logs for any errors
2. Verify your RLS policies aren't blocking the deletions
3. Make sure you're running the SQL as a database admin
