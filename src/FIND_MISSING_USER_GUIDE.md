# 🔍 Find Missing User: Matt Brennan

## 🚨 Problem
User **matt.brennan@ronaatlantic.ca** has disappeared and cannot be found in the system.

## ✅ Quick Solutions (Choose One)

### Option 1: Use the UI Component (Easiest)
1. **Add to your navigation** or dashboard:
   ```tsx
   import { FindMissingUser } from './components/FindMissingUser';
   ```
2. **Navigate to the component** in your app
3. **Click "Find Matt Brennan"** quick action button
4. **Click "Recover User"** if issues are found
5. **Done!** ✅

### Option 2: Run SQL Script (Most Comprehensive)
1. **Open Supabase Dashboard** → SQL Editor
2. **Copy** contents of `/FIND_MATT_BRENNAN.sql`
3. **Paste and Run**
4. **Check the results** - the script will:
   - ✅ Search all tables for Matt
   - ✅ Automatically restore if found
   - ✅ Show all Rona Atlantic users
   - ✅ Provide verification report

### Option 3: Browser Console (Quick & Dirty)
1. **Open your app** in the browser
2. **Open DevTools Console** (F12)
3. **Run these commands**:
   ```javascript
   // Import the utility
   const { findMissingUser, recoverMissingUser } = await import('./utils/find-missing-user');
   
   // Search for Matt
   await findMissingUser('matt.brennan@ronaatlantic.ca');
   
   // If found with issues, recover
   await recoverMissingUser('matt.brennan@ronaatlantic.ca');
   ```

### Option 4: Direct SQL Query (Advanced)
Run in Supabase SQL Editor:

```sql
-- 1. Check if user exists
SELECT 
  u.id,
  u.email,
  u.raw_user_meta_data->>'organizationId' as org_id,
  p.organization_id as profile_org_id,
  p.status
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.user_id
WHERE u.email = 'matt.brennan@ronaatlantic.ca';

-- 2. If found, restore using function
SELECT public.assign_user_to_organization(
  'matt.brennan@ronaatlantic.ca',
  'rona-atlantic'
);

-- 3. Verify recovery
SELECT * FROM profiles WHERE email = 'matt.brennan@ronaatlantic.ca';
```

## 🔧 Common Scenarios & Fixes

### Scenario 1: User exists but no organization
**Symptoms:**
- User found in profiles
- `organization_id` is NULL
- Status might be 'pending' or 'inactive'

**Fix:**
```sql
SELECT public.assign_user_to_organization(
  'matt.brennan@ronaatlantic.ca',
  'rona-atlantic'
);
```

### Scenario 2: User exists but wrong organization
**Symptoms:**
- User found in profiles
- `organization_id` is not 'rona-atlantic'

**Fix:**
```sql
SELECT public.assign_user_to_organization(
  'matt.brennan@ronaatlantic.ca',
  'rona-atlantic'
);
```

### Scenario 3: User deleted from auth.users
**Symptoms:**
- User not found anywhere
- Or found with `deleted_at` timestamp

**Fix:**
User needs to be completely recreated:
```sql
SELECT public.create_org_and_assign_user(
  'Rona Atlantic',
  'matt.brennan@ronaatlantic.ca'
);
```

⚠️ **Note:** This creates a new auth account. User will need to reset password.

### Scenario 4: User in auth but not in profiles
**Symptoms:**
- User can sign in
- But gets "no organization" error
- Not visible in Users list

**Fix:**
```sql
-- Get user ID first
SELECT id FROM auth.users WHERE email = 'matt.brennan@ronaatlantic.ca';

-- Then create profile (replace USER_ID_HERE)
INSERT INTO profiles (user_id, email, organization_id, status, role)
VALUES (
  'USER_ID_HERE',
  'matt.brennan@ronaatlantic.ca',
  'rona-atlantic',
  'active',
  'standard_user'
)
ON CONFLICT (user_id) DO UPDATE
SET organization_id = 'rona-atlantic', status = 'active';
```

## 📊 Diagnostic Checklist

Run through this checklist to understand the issue:

- [ ] **Check auth.users**: Does user exist? Is `deleted_at` NULL?
- [ ] **Check profiles**: Does profile exist? 
- [ ] **Check organization_id**: Is it set to 'rona-atlantic'?
- [ ] **Check status**: Is it 'active'?
- [ ] **Check auth metadata**: Does `raw_user_meta_data.organizationId` match?
- [ ] **Check organization**: Does 'rona-atlantic' tenant exist and is active?

## 🎯 Prevention Tips

To prevent users from disappearing in the future:

1. **Always use the server-side functions**:
   - `assign_user_to_organization(email, org_id)`
   - `create_org_and_assign_user(org_name, email)`

2. **Never directly DELETE** from auth.users or profiles
   - Use soft delete: `UPDATE profiles SET status = 'inactive'`

3. **Always verify organization** exists before assigning users

4. **Run the function fix script** if not already done:
   - `/FIX_DUPLICATE_FUNCTION.sql`

5. **Set up monitoring** for users without organizations:
   ```sql
   -- Find orphaned users
   SELECT email, created_at
   FROM profiles
   WHERE organization_id IS NULL
   OR status != 'active'
   ORDER BY created_at DESC;
   ```

## 🔍 Full Diagnostic Report

To get a complete report of all users and their status:

```sql
SELECT 
  p.email,
  p.organization_id,
  p.status as profile_status,
  p.role,
  t.name as org_name,
  t.status as org_status,
  u.email_confirmed_at IS NOT NULL as email_confirmed,
  u.deleted_at IS NULL as auth_active,
  CASE 
    WHEN u.deleted_at IS NOT NULL THEN '🔴 Deleted from Auth'
    WHEN p.organization_id IS NULL THEN '🟡 No Organization'
    WHEN p.status != 'active' THEN '🟡 Inactive Profile'
    WHEN t.status != 'active' THEN '🟡 Inactive Organization'
    ELSE '🟢 Active'
  END as overall_status
FROM profiles p
LEFT JOIN auth.users u ON p.user_id = u.id
LEFT JOIN tenants t ON p.organization_id = t.id
WHERE p.email LIKE '%@ronaatlantic.ca'
ORDER BY overall_status, p.email;
```

## 📞 Still Having Issues?

If Matt Brennan still can't be found after trying all options:

1. **Check if email is correct**: Maybe it's a typo?
   ```sql
   SELECT email FROM profiles WHERE email LIKE '%brennan%';
   ```

2. **Check all organizations**:
   ```sql
   SELECT DISTINCT organization_id, COUNT(*) 
   FROM profiles 
   GROUP BY organization_id;
   ```

3. **Verify Rona Atlantic exists**:
   ```sql
   SELECT * FROM tenants WHERE id = 'rona-atlantic' OR name ILIKE '%rona%';
   ```

4. **As last resort**, recreate the user completely:
   - User needs to sign up again with same email
   - Or use `create_org_and_assign_user` SQL function

## 🎉 Success Verification

After recovery, verify with:

```sql
SELECT 
  '✅ VERIFICATION' as status,
  p.email,
  p.organization_id,
  p.status,
  p.role,
  u.email_confirmed_at IS NOT NULL as email_verified
FROM profiles p
JOIN auth.users u ON p.user_id = u.id
WHERE p.email = 'matt.brennan@ronaatlantic.ca'
AND p.organization_id = 'rona-atlantic'
AND p.status = 'active';
```

You should see one row with all ✅ green checks!

---

## 🚀 Quick Command Reference

| What you want | Command |
|---------------|---------|
| **Find user** | `/FIND_MATT_BRENNAN.sql` in Supabase SQL Editor |
| **Assign to org** | `SELECT public.assign_user_to_organization('email', 'org-id');` |
| **Create & assign** | `SELECT public.create_org_and_assign_user('Org Name', 'email');` |
| **Check all users** | `SELECT * FROM profiles WHERE organization_id = 'rona-atlantic';` |
| **UI tool** | Navigate to FindMissingUser component in your app |

---

**Created:** Based on your ProSpaces CRM multi-tenant architecture with RLS policies and server-side functions for safe user-organization management.
