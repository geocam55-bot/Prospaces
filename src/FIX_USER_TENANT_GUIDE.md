# Fix User Tenant Assignment Issue

## Problem
User `larry.lee@ronaatlantic.ca` cannot be found on any tenant/organization.

## Diagnosis Steps

### Option 1: Using Browser Console (Easiest)

1. **Login as a super_admin user**
2. **Open browser console** (F12 → Console tab)
3. **Run these commands:**

```javascript
// Check the user's current organization
checkUserOrg('larry.lee@ronaatlantic.ca')

// List all users and their organizations
listAllUsersWithOrgs()
```

### Option 2: Using Supabase SQL Editor

1. **Go to** Supabase Dashboard → SQL Editor
2. **Run the diagnostic queries** from `/FIX_USER_TENANT.sql`

---

## Common Scenarios & Solutions

### Scenario 1: User exists but has no organization

**Symptoms:**
- User can login but sees "No organization found" or similar error
- `organization_id` is null or empty

**Solution A - Assign to existing organization:**

```sql
-- Step 1: Find available organizations
SELECT id, name, status FROM public.organizations;

-- Step 2: Assign user to an organization (replace ORG_ID)
UPDATE public.profiles
SET organization_id = 'YOUR_ORG_ID_HERE'
WHERE email = 'larry.lee@ronaatlantic.ca';

-- Step 3: Update auth metadata
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  raw_user_meta_data,
  '{organizationId}',
  '"YOUR_ORG_ID_HERE"'::jsonb
)
WHERE email = 'larry.lee@ronaatlantic.ca';
```

**Solution B - Create new organization:**

```sql
-- Step 1: Create organization
INSERT INTO public.organizations (id, name, status, created_at, updated_at)
VALUES (
  'rona-atlantic',
  'Rona Atlantic',
  'active',
  now(),
  now()
);

-- Step 2: Assign user to new organization
UPDATE public.profiles
SET organization_id = 'rona-atlantic'
WHERE email = 'larry.lee@ronaatlantic.ca';

-- Step 3: Update auth metadata
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  raw_user_meta_data,
  '{organizationId}',
  '"rona-atlantic"'::jsonb
)
WHERE email = 'larry.lee@ronaatlantic.ca';
```

### Scenario 2: User exists in auth.users but NOT in profiles table

**Symptoms:**
- User can authenticate but profile is missing
- RLS policies block access to all data

**Solution:**

```sql
-- Sync user from auth.users to profiles
INSERT INTO public.profiles (id, email, name, role, organization_id, status, created_at)
SELECT 
  id,
  email,
  COALESCE(raw_user_meta_data->>'name', 'Larry Lee') as name,
  COALESCE(raw_user_meta_data->>'role', 'standard_user') as role,
  'YOUR_ORG_ID_HERE' as organization_id,
  'active' as status,
  created_at
FROM auth.users
WHERE email = 'larry.lee@ronaatlantic.ca'
ON CONFLICT (email) DO UPDATE SET
  organization_id = EXCLUDED.organization_id;
```

### Scenario 3: User doesn't exist at all

**Solution - Create user via SQL:**

```sql
-- This is not recommended - use the app's signup instead
-- But if needed for emergency access:

-- Step 1: Create organization (if needed)
INSERT INTO public.organizations (id, name, status)
VALUES ('rona-atlantic', 'Rona Atlantic', 'active')
ON CONFLICT (id) DO NOTHING;

-- Step 2: The user must sign up via the UI
-- Then run the assignment queries from Scenario 1
```

---

## Quick Fix via Browser Console

If you have super_admin access, you can fix it directly in the browser:

```javascript
// Change user's organization
changeUserOrg('larry.lee@ronaatlantic.ca', 'rona-atlantic')

// Then follow the SQL instructions that are printed
```

---

## Verification

After applying any fix, verify it worked:

### SQL Verification:
```sql
-- Check profile
SELECT 
  p.email,
  p.name,
  p.role,
  p.organization_id,
  o.name as organization_name,
  p.status
FROM public.profiles p
LEFT JOIN public.organizations o ON o.id = p.organization_id
WHERE p.email = 'larry.lee@ronaatlantic.ca';

-- Check auth metadata
SELECT 
  email,
  raw_user_meta_data->>'organizationId' as organization_id
FROM auth.users
WHERE email = 'larry.lee@ronaatlantic.ca';
```

### Browser Console Verification:
```javascript
checkUserOrg('larry.lee@ronaatlantic.ca')
```

---

## Prevention

To prevent this issue in the future:

1. **Always create users through the app's Users module** (not directly in SQL)
2. **Ensure the `handle_new_user()` trigger is active** to auto-create profiles
3. **Verify RLS policies allow profile creation**

Check if trigger exists:
```sql
SELECT 
  trigger_name,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';
```

If missing, recreate it:
```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role, organization_id, status, created_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'standard_user'),
    COALESCE(NEW.raw_user_meta_data->>'organizationId', 'default'),
    'active',
    NOW()
  )
  ON CONFLICT (email) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

---

## Need Help?

If the issue persists:

1. Run the full diagnostic from `/FIX_USER_TENANT.sql`
2. Copy the output from all SELECT queries
3. Check what the actual values are:
   - Does user exist in `auth.users`?
   - Does user exist in `public.profiles`?
   - What is the current `organization_id` value?
   - Do any organizations exist in `public.organizations`?

With this information, we can provide a more specific solution.
