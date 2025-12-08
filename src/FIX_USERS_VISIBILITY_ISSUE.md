# Fix Users Visibility Issue - Admin Can't See Users

## Problem

Users can successfully login to your organization, but as an admin you can't see them in the Users management section.

## Root Cause

The Row Level Security (RLS) policies on the `profiles` table were checking `auth.users.raw_user_meta_data->>'organizationId'` to determine if an admin can see users in their organization. However, this metadata field is not always set correctly when users sign up or sign in.

**The issue is:**
- Users' `organization_id` is correctly stored in the `profiles` table
- But the RLS policies were checking the `auth.users` table's metadata (which may be empty or outdated)
- This caused a mismatch where users exist but aren't visible to admins

## Solution

Update the RLS policies to check the `organization_id` directly from the `profiles` table instead of relying on user metadata.

## How to Fix

### Step 1: Run the SQL Migration

1. Open your Supabase project dashboard: https://supabase.com/dashboard
2. Go to **SQL Editor** (left sidebar)
3. Create a new query
4. Copy the contents of `/FIX_USERS_RLS_POLICIES.sql`
5. Paste into the SQL Editor
6. Click **Run** to execute the migration

### Step 2: Verify the Fix

After running the migration, verify it worked:

1. Run this query in the SQL Editor to see all profiles:
```sql
SELECT id, email, name, role, organization_id 
FROM public.profiles 
ORDER BY organization_id, email;
```

2. Check that all users in your organization have the same `organization_id`

3. Run this query to see what your current user can see:
```sql
SELECT id, email, name, role, organization_id 
FROM public.profiles 
WHERE organization_id = (
  SELECT organization_id 
  FROM public.profiles 
  WHERE id = auth.uid()
)
ORDER BY email;
```

### Step 3: Refresh Your Application

1. Go back to your ProSpaces CRM application
2. Navigate to the **Users** section
3. Click the **Refresh** button
4. You should now see all users in your organization!

## What Changed

The new RLS policies use a self-join approach to check the current user's role and organization:

**Before:**
```sql
-- Checked auth.users metadata (unreliable)
auth.users.raw_user_meta_data->>'organizationId' = organization_id
```

**After:**
```sql
-- Checks profiles table directly (reliable)
EXISTS (
  SELECT 1 FROM public.profiles AS current_user_profile
  WHERE current_user_profile.id = auth.uid()
  AND current_user_profile.organization_id = profiles.organization_id
)
```

## Verification Checklist

After applying the fix, verify:

- [ ] SQL migration ran without errors
- [ ] All policies were recreated successfully (run: `SELECT * FROM pg_policies WHERE tablename = 'profiles'`)
- [ ] You can see all users in your organization in the Users section
- [ ] You can still perform CRUD operations (create, update, delete users)
- [ ] Regular users cannot see/edit other users (only their own profile)
- [ ] Admins can see all users in their organization
- [ ] Super Admins can see users across all organizations

## Additional Notes

### If Users Still Don't Have organization_id

If some users don't have an `organization_id` set in their profiles, you'll need to update them:

```sql
-- Example: Update all users without organization_id to use your org
UPDATE public.profiles 
SET organization_id = 'your-organization-id-here' 
WHERE organization_id IS NULL 
   OR organization_id = '';
```

Replace `'your-organization-id-here'` with your actual organization ID.

### How to Find Your Organization ID

Run this query:
```sql
SELECT id, name FROM public.organizations;
```

Or check your current user's organization:
```sql
SELECT organization_id 
FROM public.profiles 
WHERE id = auth.uid();
```

## Need More Help?

If you're still not seeing users after applying this fix:

1. **Check the browser console** for any error messages
2. **Verify all users have organization_id set** in the profiles table
3. **Check that your admin user has the correct role** (`admin` or `super_admin`)
4. **Verify the RLS policies are active** on the profiles table
5. **Try logging out and logging back in** to refresh your session

## Technical Details

The key improvement is that the RLS policies now use the `profiles` table as the source of truth for both:
- The current user's role and organization
- The target user's organization

This eliminates dependency on `auth.users` metadata which may not be synced properly.

## Success!

Once you see users in the Users section, the fix is complete. All CRUD operations should work normally, and your multi-tenant data isolation is maintained.
