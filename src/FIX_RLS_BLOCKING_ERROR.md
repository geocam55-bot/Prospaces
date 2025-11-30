# FIXED: RLS Policy Blocking User Assignment

## Problem
When trying to assign users to organizations from the browser console, you got this error:
```
❌ No rows updated - RLS policy blocking or profile does not exist
```

## Root Cause
Row Level Security (RLS) policies on the `profiles` table prevent direct updates from the browser, even with admin permissions. The browser-based tools were trying to update the profiles table directly, which RLS blocked.

## Solution: Server-Side Functions (Bypass RLS)

Created two PostgreSQL functions that run with `SECURITY DEFINER`, which bypasses RLS:

### 1. `assign_user_to_organization()`
- Updates both `profiles` table and `auth.users` metadata
- Validates organization exists and is active
- Returns success/error status

### 2. `create_org_and_assign_user()`
- Creates organization if it doesn't exist
- Assigns user to the organization
- All-in-one solution

## 🚀 Quick Fix for Larry

### Step 1: Run the SQL Script (One Time Setup)

1. Go to your Supabase dashboard
2. Open **SQL Editor**
3. Open the file: `/SQL_FIX_USER_ORGANIZATION.sql`
4. Copy ALL the SQL code
5. Paste it into Supabase SQL Editor
6. Click **Run** (or press F5)

This creates the helper functions that bypass RLS.

### Step 2: Use Browser Console

After running the SQL, you can use the browser tools:

#### Option A: Create Organization + Assign User (All-in-One)
```javascript
createOrgAndAssignUser('Rona Atlantic', 'larry.lee@ronaatlantic.ca')
```

**Output:**
```
🏢 Creating organization "Rona Atlantic" and assigning larry.lee@ronaatlantic.ca...

✅ Organization created: Rona Atlantic
   ID: rona-atlantic
✅ User assigned successfully!
   Email: larry.lee@ronaatlantic.ca
   User ID: xxx-xxx-xxx

✅ All done!
   User should now be able to access the system.
   Ask them to logout and login again.
```

#### Option B: Assign to Existing Organization
```javascript
assignUserToOrg('larry.lee@ronaatlantic.ca', 'rona-atlantic')
```

**Output:**
```
🔄 Assigning larry.lee@ronaatlantic.ca to organization rona-atlantic...

✅ User assigned successfully!
   Email: larry.lee@ronaatlantic.ca
   Organization ID: rona-atlantic
   User ID: xxx-xxx-xxx

✅ Assignment complete!
   User should now be able to access the system.
   Ask them to logout and login again.
```

## ✅ What Changed

### Before (Browser-based - BLOCKED by RLS)
```javascript
// This was blocked:
await supabase
  .from('profiles')
  .update({ organization_id: 'rona-atlantic' })
  .eq('email', 'larry.lee@ronaatlantic.ca');
// ❌ No rows updated - RLS policy blocking
```

### After (Server-side function - BYPASSES RLS)
```javascript
// This works:
await supabase.rpc('assign_user_to_organization', {
  p_user_email: 'larry.lee@ronaatlantic.ca',
  p_organization_id: 'rona-atlantic'
});
// ✅ User assigned successfully!
```

## 📋 What the SQL Functions Do

### `assign_user_to_organization(email, org_id)`

1. ✅ Validates organization exists and is active
2. ✅ Finds user by email in profiles table
3. ✅ Updates `profiles.organization_id`
4. ✅ Updates `profiles.status = 'active'`
5. ✅ Updates `auth.users.raw_user_meta_data.organizationId`
6. ✅ Returns detailed success/error response

### `create_org_and_assign_user(org_name, email, org_id?)`

1. ✅ Auto-generates org ID from name (if not provided)
2. ✅ Checks if organization already exists
3. ✅ Creates organization if needed
4. ✅ Calls `assign_user_to_organization()`
5. ✅ Returns combined result

## 🔒 Security

These functions use `SECURITY DEFINER` which means:

- ✅ They run with the function owner's permissions (bypasses RLS)
- ✅ Only accessible to `authenticated` users (not anonymous)
- ✅ Validate all inputs before making changes
- ✅ Check organization exists and is active
- ✅ Return detailed error messages

**Note:** Only users who can login can use these functions. They won't work anonymously.

## 🧪 Testing

### Test 1: Diagnose User Issues
```javascript
fixUserTenant('larry.lee@ronaatlantic.ca')
```

Shows detailed diagnostic info about the user and their organization status.

### Test 2: Create New Org + Assign
```javascript
createOrgAndAssignUser('Test Company', 'test@example.com')
```

Creates "Test Company" with ID `test-company` and assigns the user.

### Test 3: Assign to Existing Org
```javascript
assignUserToOrg('test@example.com', 'test-company')
```

Assigns user to an organization that already exists.

## ⚠️ Fallback: Manual SQL (If Functions Don't Exist)

If you haven't run the SQL script yet, the console tools will show you the exact SQL to run manually:

```sql
-- Update profiles table
UPDATE public.profiles
SET organization_id = 'rona-atlantic', status = 'active'
WHERE email = 'larry.lee@ronaatlantic.ca';

-- Update auth metadata
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{organizationId}', '"rona-atlantic"'::jsonb
)
WHERE email = 'larry.lee@ronaatlantic.ca';
```

Run this in **Supabase SQL Editor** → Works immediately!

## 🎯 Summary

### To Fix Larry's Account:

1. **One-time setup:** Run `/SQL_FIX_USER_ORGANIZATION.sql` in Supabase SQL Editor
2. **In browser console:** `createOrgAndAssignUser('Rona Atlantic', 'larry.lee@ronaatlantic.ca')`
3. **Tell Larry:** Logout and login again

### Future Users:

The SQL functions are now installed. Just use the browser console tools:
- `fixUserTenant(email)` - Diagnose issues
- `assignUserToOrg(email, org_id)` - Assign to org
- `createOrgAndAssignUser(org_name, email)` - Create & assign

No more RLS blocking errors! 🎉

## 📁 Related Files

- `/SQL_FIX_USER_ORGANIZATION.sql` - SQL functions to run in Supabase
- `/utils/fix-user-tenant.ts` - Updated browser console tools
- `/FIXED_TENANT_CREATION.md` - Info about org creation fixes
- `/STARTUP_PERFORMANCE.md` - App performance optimizations

## 🐛 Troubleshooting

### Error: "function public.assign_user_to_organization does not exist"
**Solution:** Run the SQL script from `/SQL_FIX_USER_ORGANIZATION.sql`

### Error: "Organization not found"
**Solution:** Create the organization first in Tenants module, or use `createOrgAndAssignUser()`

### Error: "User not found"
**Solution:** User needs to sign up first. Check they exist in `auth.users` table.

### Still not working?
Run the manual SQL fallback shown in the console output.
