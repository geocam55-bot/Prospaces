# Quick Fix for larry.lee@ronaatlantic.ca

## 🚀 Fastest Solution (Browser Console)

1. **Login as super_admin**
2. **Open Browser Console** (Press F12, then click Console tab)
3. **Run one of these commands:**

### Option A: Diagnose the Issue
```javascript
fixUserTenant('larry.lee@ronaatlantic.ca')
```
This will tell you exactly what's wrong and suggest solutions.

### Option B: Create Organization and Assign User (All-in-One)
```javascript
createOrgAndAssignUser('Rona Atlantic', 'larry.lee@ronaatlantic.ca')
```
This creates the "Rona Atlantic" organization and assigns Larry to it automatically.

### Option C: Assign to Existing Organization
First, find available organizations:
```javascript
listAllUsersWithOrgs()
```

Then assign Larry to one:
```javascript
assignUserToOrg('larry.lee@ronaatlantic.ca', 'org-id-here')
```

---

## 📋 SQL Solution (Supabase Dashboard)

Go to Supabase → SQL Editor and run:

### Step 1: Diagnose
```sql
-- Check if user exists in profiles
SELECT * FROM public.profiles 
WHERE email = 'larry.lee@ronaatlantic.ca';

-- Check if user exists in auth
SELECT email, raw_user_meta_data 
FROM auth.users 
WHERE email = 'larry.lee@ronaatlantic.ca';

-- List all organizations
SELECT id, name, status FROM public.organizations;
```

### Step 2: Fix (Choose ONE option)

#### Option A: Create New Organization
```sql
-- Create Rona Atlantic organization
INSERT INTO public.organizations (id, name, status, created_at, updated_at)
VALUES ('rona-atlantic', 'Rona Atlantic', 'active', now(), now())
ON CONFLICT (id) DO NOTHING;

-- Assign user to organization
UPDATE public.profiles
SET organization_id = 'rona-atlantic', status = 'active'
WHERE email = 'larry.lee@ronaatlantic.ca';

-- Update auth metadata
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  raw_user_meta_data, 
  '{organizationId}', 
  '"rona-atlantic"'::jsonb
)
WHERE email = 'larry.lee@ronaatlantic.ca';
```

#### Option B: Assign to Existing Organization
```sql
-- Replace 'YOUR-ORG-ID' with actual organization ID
UPDATE public.profiles
SET organization_id = 'YOUR-ORG-ID', status = 'active'
WHERE email = 'larry.lee@ronaatlantic.ca';

-- Update auth metadata
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  raw_user_meta_data, 
  '{organizationId}', 
  '"YOUR-ORG-ID"'::jsonb
)
WHERE email = 'larry.lee@ronaatlantic.ca';
```

### Step 3: Verify
```sql
-- Check the fix worked
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
```

---

## ✅ After Fix

1. **Ask Larry to logout** (if he's logged in)
2. **Ask Larry to login again**
3. **He should now see his organization** and have access to the system

---

## 🔍 Troubleshooting

### If Larry still can't login:

**Check his account status:**
```sql
SELECT email, status FROM public.profiles 
WHERE email = 'larry.lee@ronaatlantic.ca';
```

Status should be `'active'`. If not:
```sql
UPDATE public.profiles 
SET status = 'active' 
WHERE email = 'larry.lee@ronaatlantic.ca';
```

**Check organization status:**
```sql
SELECT id, name, status FROM public.organizations 
WHERE id = 'rona-atlantic';
```

Status should be `'active'`. If not:
```sql
UPDATE public.organizations 
SET status = 'active' 
WHERE id = 'rona-atlantic';
```

---

## 📞 Need More Help?

Run the full diagnostic in browser console:
```javascript
fixUserTenant('larry.lee@ronaatlantic.ca')
```

Or check the comprehensive guide: `/FIX_USER_TENANT_GUIDE.md`
