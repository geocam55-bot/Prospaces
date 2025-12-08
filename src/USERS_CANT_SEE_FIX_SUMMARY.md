# Users Visibility Issue - Complete Fix Guide

## Issue Summary

**Problem:** Users can successfully login to your organization, but as an admin you cannot see them in the Users management section.

**Root Cause:** The Row Level Security (RLS) policies on the `profiles` table were checking `auth.users.raw_user_meta_data->>'organizationId'` which is not reliably set. The actual `organization_id` exists in the `profiles` table but the RLS policies were checking the wrong location.

## Quick Fix (3 Steps)

### Step 1: Run Diagnostic Queries

1. Open Supabase Dashboard → SQL Editor
2. Copy and run queries from `/DIAGNOSE_USERS_ISSUE.sql`
3. Review the results to understand what's wrong

**What to look for:**
- Do users have `organization_id` set in profiles table?
- Does your admin user have the correct `organization_id`?
- Is there a mismatch between auth metadata and profiles?

### Step 2: Apply the Fix

1. Open Supabase Dashboard → SQL Editor  
2. Copy the contents of `/FIX_USERS_RLS_POLICIES.sql`
3. Paste and click **Run**
4. Verify: Check for "Success" message (no errors)

### Step 3: Test in Your Application

1. Go to your ProSpaces CRM at https://pro-spaces.vercel.app/
2. Navigate to **Users** section
3. Click **Refresh** button
4. ✅ You should now see all users in your organization!

## Files Created

| File | Purpose |
|------|---------|
| `FIX_USERS_RLS_POLICIES.sql` | SQL migration to fix RLS policies |
| `DIAGNOSE_USERS_ISSUE.sql` | Diagnostic queries to understand the issue |
| `FIX_USERS_VISIBILITY_ISSUE.md` | Detailed explanation and troubleshooting |
| `USERS_CANT_SEE_FIX_SUMMARY.md` | This summary document |

## What the Fix Does

### Before (Broken)
```sql
-- RLS policy checked auth.users metadata (unreliable)
CREATE POLICY "Admins can view organization profiles"
ON public.profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.raw_user_meta_data->>'organizationId' = organization_id
  )
);
```

**Problem:** `raw_user_meta_data->>'organizationId'` is often NULL or outdated

### After (Fixed)
```sql
-- RLS policy checks profiles table directly (reliable)
CREATE POLICY "Admins can view organization profiles"
ON public.profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles AS current_user_profile
    WHERE current_user_profile.id = auth.uid()
    AND current_user_profile.role IN ('admin', 'super_admin')
    AND (
      current_user_profile.role = 'super_admin'
      OR current_user_profile.organization_id = profiles.organization_id
    )
  )
);
```

**Solution:** Uses `profiles` table as source of truth for organization_id

## Policies Updated

The fix updates 6 RLS policies on the `profiles` table:

1. ✅ **Users can view own profile** - Users see their own profile
2. ✅ **Admins can view organization profiles** - Admins see all users in their org
3. ✅ **Users can update own profile** - Users can edit their own profile
4. ✅ **Admins can update organization profiles** - Admins can edit users in their org
5. ✅ **Admins can insert organization profiles** - Admins can create new users
6. ✅ **Admins can delete profiles** - Admins can delete users in their org

## Common Scenarios & Solutions

### Scenario 1: Users Have No organization_id

**Symptom:** Diagnostic query STEP 8 shows users with NULL organization_id

**Fix:**
```sql
-- Get your organization ID
SELECT organization_id FROM public.profiles WHERE id = auth.uid();

-- Update users to your organization
UPDATE public.profiles 
SET organization_id = 'YOUR_ORG_ID_HERE'
WHERE organization_id IS NULL OR organization_id = '';
```

### Scenario 2: Users Have Wrong organization_id

**Symptom:** Diagnostic query STEP 2 shows users with different organization_ids

**Fix:**
```sql
-- Update specific users
UPDATE public.profiles 
SET organization_id = 'YOUR_ORG_ID_HERE'
WHERE id IN (
  'user-id-1',
  'user-id-2',
  'user-id-3'
);
```

### Scenario 3: Your Admin User Has Invalid Org ID

**Symptom:** Diagnostic query STEP 1 shows your organization_id is NULL or starts with 'org-'

**Fix:**
```sql
-- Update your own profile
UPDATE public.profiles 
SET organization_id = 'YOUR_ORG_ID_HERE'
WHERE id = auth.uid();
```

### Scenario 4: Organization Doesn't Exist

**Symptom:** Diagnostic query STEP 6 doesn't show your organization

**Fix:**
```sql
-- Create your organization
INSERT INTO public.organizations (id, name, status, created_at)
VALUES ('your-org-id', 'Your Company Name', 'active', now());
```

## Verification Checklist

After applying the fix, verify:

- [ ] SQL migration ran without errors
- [ ] Diagnostic STEP 2 shows all users with same organization_id
- [ ] Diagnostic STEP 5 returns all users (same as STEP 2)
- [ ] Users page in ProSpaces CRM shows all users
- [ ] You can click "Edit" on a user and update their info
- [ ] You can create new users via "Invite User" button
- [ ] Regular users cannot access the Users page (permission check works)

## Still Having Issues?

If users still aren't showing after applying the fix:

### 1. Check Browser Console
Press F12 → Console tab → Look for error messages

### 2. Verify Your Admin Role
```sql
SELECT role FROM public.profiles WHERE id = auth.uid();
```
Should return `admin` or `super_admin`

### 3. Check RLS is Enabled
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'profiles';
```
Should show `rowsecurity = true`

### 4. Verify Policies Exist
```sql
SELECT COUNT(*) 
FROM pg_policies 
WHERE tablename = 'profiles';
```
Should return `6` (6 policies)

### 5. Test Direct Query
```sql
-- This bypasses RLS to see if data exists
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
SELECT * FROM public.profiles;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
```

### 6. Clear Application Cache
1. Log out of ProSpaces CRM
2. Clear browser cache (Ctrl+Shift+Delete)
3. Close all browser tabs
4. Re-open and log back in

## Technical Details

### Why This Happened

1. During user sign-up, the code creates a profile with `organization_id`:
   ```javascript
   await supabase.from('profiles').insert({
     organization_id: invitation.organization_id  // ✅ Correctly set
   })
   ```

2. But the auth.users metadata doesn't get the organizationId:
   ```javascript
   await supabase.auth.signUp({
     options: {
       data: {
         name, 
         role  // ❌ Missing organizationId
       }
     }
   })
   ```

3. Old RLS policies checked the missing metadata:
   ```sql
   auth.users.raw_user_meta_data->>'organizationId'  -- ❌ Returns NULL
   ```

4. New RLS policies check the profiles table directly:
   ```sql
   current_user_profile.organization_id  -- ✅ Correct value
   ```

### Why the Self-Join Approach Works

The new policies use a self-join on the profiles table:
```sql
EXISTS (
  SELECT 1 FROM public.profiles AS current_user_profile
  WHERE current_user_profile.id = auth.uid()
  ...
)
```

This allows the policy to:
1. Look up the current user's profile
2. Check their role (admin/super_admin)
3. Compare their organization_id with the target row
4. All from the same reliable source (profiles table)

## Success Indicators

You'll know the fix worked when:

1. ✅ SQL migration completes without errors
2. ✅ Users page loads without errors
3. ✅ You see all users in your organization (not just yourself)
4. ✅ User count matches the number in your profiles table
5. ✅ You can perform CRUD operations (create, edit, delete users)
6. ✅ Organization info card shows correct user count

## Prevention

To prevent this issue in the future:

### 1. Update Sign-Up Code
When creating new users, ensure metadata includes organizationId:
```javascript
await supabase.auth.signUp({
  email,
  password,
  options: {
    data: {
      name,
      role,
      organizationId  // ✅ Add this
    }
  }
})
```

### 2. Always Use Profiles Table in RLS
When writing RLS policies, always reference the profiles table for user information, not auth.users metadata.

### 3. Add Trigger to Sync Metadata
Consider adding a trigger to keep auth.users metadata in sync with profiles:
```sql
CREATE OR REPLACE FUNCTION sync_user_metadata()
RETURNS TRIGGER AS $$
BEGIN
  -- Update auth.users metadata when profile changes
  UPDATE auth.users 
  SET raw_user_meta_data = raw_user_meta_data || 
    json_build_object(
      'organizationId', NEW.organization_id,
      'role', NEW.role,
      'name', NEW.name
    )::jsonb
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER sync_profile_to_auth
AFTER INSERT OR UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION sync_user_metadata();
```

## Need Help?

If you're still experiencing issues after following this guide:

1. **Run the diagnostic queries** from `DIAGNOSE_USERS_ISSUE.sql`
2. **Copy the results** of each query
3. **Check the interpretation guide** at the bottom of the diagnostic file
4. **Look for the scenario** that matches your results
5. **Follow the specific solution** for that scenario

## Summary

The fix is simple: update the RLS policies to check the `profiles` table directly instead of relying on `auth.users` metadata. This ensures admins can see all users in their organization based on the reliable source of truth (the profiles table).

**Before:** ❌ Policies checked unreliable auth.users metadata  
**After:** ✅ Policies check reliable profiles table  
**Result:** 🎉 Admins can see all users in their organization!
