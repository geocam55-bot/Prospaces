# SUPER_ADMIN Complete Setup Guide

## Overview

This guide explains how to ensure SUPER_ADMIN users can see **ALL users from ALL organizations** in the ProSpaces CRM.

---

## Current Implementation

### ✅ What's Already Done:

1. **Client-Side Code** (`/utils/users-client.ts`):
   - ✅ Super Admins see ALL profiles (no organization filter)
   - ✅ Admins see only their organization's profiles
   - ✅ Users can be moved between organizations

2. **UI Components** (`/components/Users.tsx`):
   - ✅ Full user editing (name, email, role, status, organization)
   - ✅ Organization column visible for Super Admins
   - ✅ Organization selector in edit dialog (Super Admin only)

3. **Database Migration** (`/supabase/migrations/001_create_profiles_table.sql`):
   - ✅ Profiles table with RLS policies
   - ✅ Separate policies for Super Admins (see all) and Admins (see org only)
   - ✅ Automatic sync triggers for new users and logins

---

## How It Works

### For SUPER_ADMIN:
```
User Role: super_admin
├── Can VIEW: All users from all organizations
├── Can EDIT: All users from all organizations
├── Can DELETE: All users from all organizations
└── Can MOVE: Users between organizations
```

### For ADMIN:
```
User Role: admin
├── Can VIEW: Only users in their organization
├── Can EDIT: Only users in their organization
├── Can DELETE: Only users in their organization
└── Cannot MOVE: Users to other organizations
```

---

## Step-by-Step Setup

### Step 1: Apply the Migration

**Option A - Supabase Dashboard (Recommended):**

1. Go to https://supabase.com/dashboard
2. Select your project
3. Click **SQL Editor** (left sidebar)
4. Click **New Query**
5. Copy the entire contents of `/supabase/migrations/001_create_profiles_table.sql`
6. Paste into the SQL Editor
7. Click **RUN** ▶️
8. Wait for "Success" message

**Option B - Supabase CLI:**

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

### Step 2: Verify the Migration

Run the verification script to ensure everything is set up correctly:

1. Go to Supabase Dashboard → SQL Editor
2. Copy the contents of `/supabase/migrations/verify_migration.sql`
3. Paste and click **RUN**
4. Check the results:
   - ✅ "profiles table exists" should show PASS
   - ✅ "RLS enabled" should show PASS
   - ✅ Should see multiple RLS policies listed
   - ✅ Should see triggers listed

### Step 3: Check Your User Role

Make sure you are set as a SUPER_ADMIN:

1. Go to Supabase Dashboard → **Authentication** → **Users**
2. Find YOUR email
3. Click on it to view details
4. Check the `raw_user_meta_data` field
5. Should see:
   ```json
   {
     "role": "super_admin",
     "name": "Your Name",
     "organizationId": "your-org-id"
   }
   ```

**If role is NOT super_admin, update it:**

```sql
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  raw_user_meta_data,
  '{role}',
  '"super_admin"'::jsonb
)
WHERE email = 'your-email@example.com';

-- Also update in profiles table
UPDATE profiles
SET role = 'super_admin'
WHERE email = 'your-email@example.com';
```

### Step 4: Sync All Users to Profiles

The migration automatically syncs existing users, but you can manually verify:

```sql
-- Check if all auth users have profiles
SELECT 
  au.email,
  au.raw_user_meta_data->>'role' as auth_role,
  p.role as profile_role,
  CASE WHEN p.id IS NULL THEN '❌ Missing' ELSE '✅ Synced' END as status
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id;
```

**If any users are missing, sync them:**

```sql
-- Sync all missing users
INSERT INTO public.profiles (id, email, name, role, organization_id, status, last_login, created_at)
SELECT 
  id,
  email,
  COALESCE(raw_user_meta_data->>'name', email) as name,
  COALESCE(raw_user_meta_data->>'role', 'standard_user') as role,
  COALESCE(raw_user_meta_data->>'organizationId', 'default-org') as organization_id,
  'active' as status,
  last_sign_in_at as last_login,
  created_at
FROM auth.users
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  organization_id = EXCLUDED.organization_id;
```

### Step 5: Test in Your App

1. **Refresh your browser** (hard refresh: `Ctrl+Shift+R` or `Cmd+Shift+R`)
2. Go to the **Users** page
3. You should now see **ALL users from ALL organizations**

---

## Debugging

### Run Diagnostic Tool

Open your browser console (`F12` → Console tab) and run:

```javascript
debugUsers()
```

This will show you:
- ✅ Your current role
- ✅ Whether profiles table exists
- ✅ All users in the database
- ✅ Whether larry.lee@ronaatlantic.ca exists
- ✅ Organization breakdown

### Common Issues

#### Issue 1: "I'm a SUPER_ADMIN but still can't see all users"

**Check 1 - RLS Policies:**
```sql
-- Verify the super_admin policy exists
SELECT * FROM pg_policies 
WHERE tablename = 'profiles' 
AND policyname = 'Super admins can view all profiles';
```

If it doesn't exist, re-run the migration.

**Check 2 - Your Role in Database:**
```sql
-- Check your role in auth.users
SELECT 
  email,
  raw_user_meta_data->>'role' as role
FROM auth.users
WHERE email = 'your-email@example.com';
```

Make sure it says `super_admin`, not `admin`.

**Check 3 - Test RLS Directly:**
```sql
-- This should return ALL profiles if you're a super_admin
SELECT * FROM profiles;
```

If it doesn't return all profiles, RLS might be blocking you.

**Fix - Temporarily disable RLS to debug:**
```sql
-- ONLY FOR DEBUGGING - DO NOT USE IN PRODUCTION
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Test query
SELECT * FROM profiles;

-- RE-ENABLE RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
```

#### Issue 2: "larry.lee@ronaatlantic.ca still not showing"

**Check if Larry exists in auth.users:**
```sql
SELECT 
  email,
  raw_user_meta_data->>'role' as role,
  raw_user_meta_data->>'organizationId' as org_id,
  raw_user_meta_data->>'name' as name
FROM auth.users
WHERE email = 'larry.lee@ronaatlantic.ca';
```

**Check if Larry exists in profiles:**
```sql
SELECT * FROM profiles 
WHERE email = 'larry.lee@ronaatlantic.ca';
```

**If Larry exists in auth but NOT in profiles, sync manually:**
```sql
INSERT INTO public.profiles (id, email, name, role, organization_id, status, created_at)
SELECT 
  id,
  email,
  COALESCE(raw_user_meta_data->>'name', email),
  COALESCE(raw_user_meta_data->>'role', 'standard_user'),
  COALESCE(raw_user_meta_data->>'organizationId', 'default-org'),
  'active',
  created_at
FROM auth.users
WHERE email = 'larry.lee@ronaatlantic.ca'
ON CONFLICT (id) DO NOTHING;
```

#### Issue 3: "I see users but can't edit them"

**Check UPDATE policies:**
```sql
SELECT * FROM pg_policies 
WHERE tablename = 'profiles' 
AND cmd = 'UPDATE';
```

Should see:
- ✅ "Super admins can update all profiles"
- ✅ "Admins can update org profiles"

**Test update permission:**
```sql
UPDATE profiles 
SET name = name 
WHERE email = 'test@example.com';
```

If you get permission denied, re-run the migration.

---

## Testing Checklist

After setup, verify these scenarios:

### As SUPER_ADMIN:

- [ ] Can see ALL users from ALL organizations
- [ ] Organization column is visible in the table
- [ ] Can edit any user's details
- [ ] Can change any user's organization
- [ ] Can change any user's role
- [ ] Can change any user's status
- [ ] Can delete any user (except yourself)
- [ ] Can invite users to any organization

### As ADMIN:

- [ ] Can see ONLY users in my organization
- [ ] Organization column is hidden
- [ ] Can edit users in my organization
- [ ] Cannot change user's organization
- [ ] Can change user's role (except to super_admin)
- [ ] Can change user's status
- [ ] Can delete users in my organization (except yourself)
- [ ] Can invite users to my organization only

---

## Quick Reference

### SQL Queries

```sql
-- See all users and their organizations
SELECT organization_id, email, name, role, status
FROM profiles
ORDER BY organization_id, email;

-- Count users per organization
SELECT 
  organization_id,
  COUNT(*) as user_count
FROM profiles
GROUP BY organization_id;

-- Find a specific user
SELECT * FROM profiles WHERE email = 'user@example.com';

-- Update user role
UPDATE profiles SET role = 'super_admin' WHERE email = 'user@example.com';

-- Move user to different organization
UPDATE profiles 
SET organization_id = 'new-org-id' 
WHERE email = 'user@example.com';

-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'profiles';
```

### Console Commands

```javascript
// Run full diagnostics
debugUsers()

// Manually sync current user
manualSyncUser()

// Clear all caches and reload
localStorage.clear()
location.reload()
```

---

## Architecture Notes

### Why Two Separate Policies?

We use separate RLS policies for Super Admins and Admins instead of combining them:

```sql
-- ✅ GOOD - Separate policies
CREATE POLICY "Super admins can view all profiles" ... (role = 'super_admin')
CREATE POLICY "Admins can view org profiles" ... (role = 'admin' AND org matches)

-- ❌ BAD - Combined policy (harder to debug)
CREATE POLICY "All admins" ... (role = 'super_admin' OR (role = 'admin' AND org matches))
```

This makes debugging easier and allows fine-grained control.

### Why Store in Profiles Table?

Auth users are in `auth.users`, but we create `public.profiles` because:

1. **Client-side access** - We can't query `auth.users` from the client
2. **RLS control** - We can apply Row Level Security to filter by organization
3. **Performance** - Faster queries with indexes
4. **Flexibility** - Can add custom fields without modifying auth schema

### How Organization Filtering Works

```typescript
// In users-client.ts
profiles.forEach((profile) => {
  // Super Admin: NO filter, see all
  if (currentUserRole === 'super_admin') {
    usersMap.set(profile.id, profile);
  }
  // Admin: Filter by organization
  else if (profile.organization_id === currentUserOrgId) {
    usersMap.set(profile.id, profile);
  }
});
```

---

## Support

If you're still having issues:

1. Run `debugUsers()` in console and share the output
2. Run `/supabase/migrations/verify_migration.sql` and share results
3. Check browser console for errors
4. Check Supabase logs in Dashboard → Logs → Database Logs
5. Verify your user metadata in Supabase Dashboard → Authentication → Users

---

## Summary

✅ **SUPER_ADMIN can:**
- See ALL users from ALL organizations
- Edit ANY user
- Move users between organizations
- Manage all roles including super_admin

✅ **ADMIN can:**
- See users from their organization only
- Edit users in their organization
- Manage roles except super_admin

The system is now fully configured for multi-tenant user management with proper role-based access control!
