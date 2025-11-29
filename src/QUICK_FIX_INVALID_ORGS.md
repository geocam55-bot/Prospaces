# 🚨 QUICK FIX: Invalid Organization IDs

## The Problem

You're seeing these errors:
```
Organization not found: org-1762906336768
Error: Organization with ID "org-1762906336768" does not exist
Sign in error: Invalid email or password
```

### Root Cause
The server code was auto-generating timestamp-based organization IDs like `org-1762906336768` when no organization ID was provided during signup. These invalid IDs don't exist in the organizations table, causing:
- ❌ Users can't sign in
- ❌ Can't invite new users
- ❌ Organization validation fails

## ✅ What I Fixed

### 1. Server Code (`/supabase/functions/server/index.tsx`)
- ✅ Now **requires** organizationId during signup (no more auto-generation)
- ✅ **Validates** organization exists before creating user
- ✅ **Checks** organization is active
- ✅ Returns clear error messages if organization is invalid

### 2. Created Cleanup Script
- ✅ `/SQL_CLEANUP_INVALID_ORGS.sql` - Fixes existing users with invalid IDs

## 🚀 How to Fix Existing Users (3 Steps)

### Step 1: Find Valid Organization ID

Run this in Supabase SQL Editor:

```sql
-- List all valid organizations
SELECT id, name, status
FROM public.organizations
WHERE id !~ '^org-\d{13,}$'  -- Exclude timestamp IDs
  AND status = 'active'
ORDER BY name;
```

Copy the `id` of the organization you want to use (e.g., `rona-atlantic`, `default-organization`).

### Step 2: Fix All Affected Users

Replace `'your-org-id'` with the actual organization ID from Step 1:

```sql
-- Fix all users with invalid organization IDs
DO $$
DECLARE
  v_target_org_id TEXT := 'your-org-id'; -- CHANGE THIS!
BEGIN
  -- Update profiles
  UPDATE public.profiles
  SET organization_id = v_target_org_id, updated_at = NOW()
  WHERE organization_id ~ '^org-\d{13,}$';
  
  -- Update auth.users metadata
  UPDATE auth.users
  SET raw_user_meta_data = jsonb_set(
    COALESCE(raw_user_meta_data, '{}'::jsonb),
    '{organizationId}',
    to_jsonb(v_target_org_id)
  )
  WHERE id IN (
    SELECT id FROM public.profiles 
    WHERE organization_id = v_target_org_id
  );
  
  RAISE NOTICE 'Users fixed successfully';
END $$;
```

### Step 3: Delete Invalid Organizations

```sql
-- Remove timestamp-based organizations
DELETE FROM public.organizations
WHERE id ~ '^org-\d{13,}$';
```

### Step 4: Verify the Fix

```sql
-- Check all users have valid orgs
SELECT 
  p.email,
  p.organization_id,
  o.name as org_name,
  u.raw_user_meta_data->>'organizationId' as auth_org
FROM public.profiles p
LEFT JOIN public.organizations o ON p.organization_id = o.id
LEFT JOIN auth.users u ON p.id = u.id
ORDER BY p.created_at DESC
LIMIT 10;
```

All users should now show a valid organization name (not NULL).

## 🎯 Quick One-Liner Fix

If you have a default organization called `default-organization`:

```sql
-- Create default org if it doesn't exist
INSERT INTO public.organizations (id, name, status, created_at, updated_at)
VALUES ('default-organization', 'Default Organization', 'active', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Move all affected users to default org
UPDATE public.profiles 
SET organization_id = 'default-organization' 
WHERE organization_id ~ '^org-\d{13,}$';

UPDATE auth.users 
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{organizationId}', '"default-organization"'::jsonb
)
WHERE id IN (SELECT id FROM public.profiles WHERE organization_id = 'default-organization');

-- Delete invalid orgs
DELETE FROM public.organizations WHERE id ~ '^org-\d{13,}$';
```

## 📋 For Specific Users

If you need to fix just one user (e.g., the one trying to sign in):

```sql
-- Fix specific user
UPDATE public.profiles
SET organization_id = 'rona-atlantic'
WHERE email = 'user@example.com';

UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{organizationId}', '"rona-atlantic"'::jsonb
)
WHERE email = 'user@example.com';
```

## ⚠️ Prevention (Going Forward)

The server code now prevents this issue:

### Before (BAD):
```javascript
organizationId: organizationId || `org-${Date.now()}` // ❌ Creates invalid IDs
```

### After (GOOD):
```javascript
if (!organizationId) {
  return c.json({ 
    error: 'Organization ID is required' 
  }, 400);
}
// ✅ Validates organization exists before proceeding
```

## 🐛 Troubleshooting

### Error: "Organization not found: org-123456789"
**Solution:** Run the cleanup SQL above. The timestamp-based org doesn't exist.

### Error: "Sign in error: Invalid email or password"
**Cause:** User's organization_id points to non-existent org.
**Solution:** Fix their organization_id using the SQL above.

### Error: "Organization with ID does not exist"
**Solution:** Create the organization first:
```sql
INSERT INTO public.organizations (id, name, status)
VALUES ('company-name', 'Company Name', 'active');
```

### Users still can't sign in after SQL fix
**Solution:** Tell them to:
1. Clear browser cache
2. Logout completely
3. Close browser
4. Open browser and login again

## 📁 Related Files

- `/SQL_CLEANUP_INVALID_ORGS.sql` - Complete cleanup script with all options
- `/supabase/functions/server/index.tsx` - Fixed server code (lines 47-87)
- `/SQL_FIX_USER_ORGANIZATION.sql` - RLS functions for user management

## ✅ Success Checklist

After running the SQL:

- [ ] All users have valid organization IDs (no timestamps)
- [ ] No invalid organizations in the `organizations` table
- [ ] Users can sign in successfully
- [ ] Can invite new users without errors
- [ ] Auth metadata matches profiles table

## 💡 Quick Test

After fixing, test in browser console:

```javascript
// This should work now:
createOrgAndAssignUser('Test Company', 'test@example.com')
```

You should see:
```
✅ Organization created: Test Company
✅ User assigned successfully!
```

Not an error about invalid organization IDs! 🎉
