# Fix User Visibility Issue - Complete Guide 🔧

## Problem
You can only see yourself in the Users page, but other RONA Atlantic users aren't showing up.

## Root Cause
This is caused by **two common issues**:
1. **Auth Metadata Mismatch**: The `organizationId` in `auth.users.raw_user_meta_data` doesn't match `profiles.organization_id`
2. **RLS Policy Problems**: Row Level Security policies aren't correctly configured

## Solution (Choose One)

### ⚡ **OPTION 1: Quick Fix (Recommended)** - 2 minutes

1. Open **Supabase Dashboard** → **SQL Editor**
2. Copy **`/QUICK_FIX_USER_VISIBILITY.sql`**
3. Paste and click **"Run"**
4. **Log out and log back in** (IMPORTANT!)
5. Go to Users page - all users should now be visible

### 🔍 **OPTION 2: Diagnostic First** - 5 minutes

If you want to understand what's wrong first:

1. Run **`/DIAGNOSE_USER_VISIBILITY.sql`**
2. Look at the results to see:
   - How many users exist
   - If metadata is synced
   - What RLS policies exist
   - What you should be seeing
3. Then run **`/QUICK_FIX_USER_VISIBILITY.sql`**

### 🛠️ **OPTION 3: Complete Fix** - 10 minutes

For a thorough fix with all policies:

1. Run **`/FIX_USER_VISIBILITY.sql`**
2. This includes:
   - Complete RLS policy rebuild
   - Auth metadata sync
   - Comprehensive verification
   - Detailed logging

## What Gets Fixed

### 1. Auth Metadata Sync
```sql
-- Syncs auth.users.raw_user_meta_data.organizationId 
-- with profiles.organization_id
```
This ensures the RLS policies can correctly identify which organization you belong to.

### 2. RLS Policies
Creates these policies:
- ✅ **SELECT**: View your own profile + profiles in your org + super_admin sees all
- ✅ **INSERT**: Admins and super_admins can create profiles
- ✅ **UPDATE**: Update your own + admins can update org users + super_admin updates all
- ✅ **DELETE**: Admins can delete org users + super_admin deletes all (except self)

## Verification

After running the fix:

```sql
-- Run this to verify you can see all RONA Atlantic users
SELECT 
    p.email,
    p.full_name,
    p.role,
    o.name as organization
FROM profiles p
JOIN organizations o ON p.organization_id = o.id
WHERE o.name = 'RONA Atlantic'
ORDER BY p.email;
```

Expected result: You should see multiple users (not just yourself).

## Important Steps After Running Fix

### ⚠️ CRITICAL: Log Out and Log Back In

After running the SQL fix, you **MUST**:
1. Click your profile menu
2. Click "Sign Out"
3. Sign back in

**Why?** The auth token needs to be refreshed to pick up the new metadata values.

## Troubleshooting

### Still Not Working?

1. **Clear browser cache**:
   - Press `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
   
2. **Check console for errors**:
   - Open browser DevTools (F12)
   - Look for errors in Console tab
   - Share any error messages

3. **Verify in Supabase directly**:
   ```sql
   -- Check if you can see users in SQL
   SELECT email, role FROM profiles 
   WHERE organization_id = (
     SELECT organization_id FROM profiles WHERE email = 'YOUR_EMAIL'
   );
   ```

4. **Check RLS is working**:
   ```sql
   -- This should show 4 policies
   SELECT policyname FROM pg_policies WHERE tablename = 'profiles';
   ```

### Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| "No users found" | RLS blocking queries | Run QUICK_FIX_USER_VISIBILITY.sql |
| "infinite recursion" | Circular policy dependencies | Drop all policies and recreate |
| "permission denied" | RLS too restrictive | Check if you're logged in as admin |

## Files Reference

| File | Purpose | When to Use |
|------|---------|-------------|
| `/QUICK_FIX_USER_VISIBILITY.sql` | ⭐ Fast fix | Use this first |
| `/DIAGNOSE_USER_VISIBILITY.sql` | Diagnostic queries | If quick fix doesn't work |
| `/FIX_USER_VISIBILITY.sql` | Complete rebuild | For thorough fix |

## Technical Details

### Why Auth Metadata Must Match Profiles

RLS policies use this pattern:
```sql
WHERE organization_id = (
  SELECT raw_user_meta_data->>'organizationId'
  FROM auth.users
  WHERE id = auth.uid()
)::uuid
```

If `raw_user_meta_data->>'organizationId'` doesn't match `profiles.organization_id`, the query returns no results.

### How the Fix Works

1. **Syncs metadata**: Copies `organization_id` from profiles to auth.users metadata
2. **Rebuilds policies**: Creates clean, working RLS policies
3. **Verifies sync**: Shows before/after comparison

## Success Criteria

✅ You can see all users in your organization  
✅ User count shows correct number  
✅ No RLS errors in browser console  
✅ Can edit/delete users in your org  
✅ Super admin can see all organizations  

## Next Steps

After fixing user visibility:
1. Run `/FIX_ORGS_AUTO.sql` to fix organization assignments
2. Test editing users
3. Verify organization change warnings work

## Need More Help?

If none of the above works:
1. Run `/DIAGNOSE_USER_VISIBILITY.sql`
2. Share the output
3. Check browser console (F12) for errors
4. Verify you're logged in with correct role

---

**Quick Summary:**
1. Run `/QUICK_FIX_USER_VISIBILITY.sql`
2. Log out
3. Log back in
4. Check Users page
5. Done! ✅
