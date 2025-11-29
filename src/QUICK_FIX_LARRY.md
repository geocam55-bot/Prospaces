# 🚨 QUICK FIX: Larry Lee Can't Access System

## The Problem
Larry Lee (larry.lee@ronaatlantic.ca) cannot access the system because:
1. ❌ Organization "Rona Atlantic" doesn't exist
2. ❌ Larry's profile has no organization assigned
3. ❌ RLS policies block browser-based fixes

## ⚡ FASTEST Solution (2 Steps)

### Step 1: Run SQL (30 seconds)

1. Open Supabase Dashboard → **SQL Editor**
2. Copy this code and run it:

```sql
-- Create the helper functions (run once)
CREATE OR REPLACE FUNCTION public.assign_user_to_organization(
  p_user_email TEXT,
  p_organization_id TEXT
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_org_exists BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM public.organizations 
    WHERE id = p_organization_id AND status = 'active'
  ) INTO v_org_exists;
  
  IF NOT v_org_exists THEN
    RETURN jsonb_build_object('success', false, 'error', 'Organization not found');
  END IF;
  
  SELECT id INTO v_user_id FROM public.profiles WHERE email = p_user_email;
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;
  
  UPDATE public.profiles
  SET organization_id = p_organization_id, status = 'active', updated_at = NOW()
  WHERE id = v_user_id;
  
  UPDATE auth.users
  SET raw_user_meta_data = jsonb_set(
    COALESCE(raw_user_meta_data, '{}'::jsonb),
    '{organizationId}', to_jsonb(p_organization_id)
  )
  WHERE id = v_user_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'user_id', v_user_id,
    'email', p_user_email,
    'organization_id', p_organization_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.create_org_and_assign_user(
  p_org_name TEXT,
  p_user_email TEXT
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id TEXT;
  v_org_exists BOOLEAN;
BEGIN
  v_org_id := lower(regexp_replace(
    regexp_replace(trim(p_org_name), '[^a-zA-Z0-9\s-]', '', 'g'),
    '\s+', '-', 'g'
  ));
  v_org_id := substring(v_org_id from 1 for 50);
  
  SELECT EXISTS(SELECT 1 FROM public.organizations WHERE id = v_org_id) INTO v_org_exists;
  
  IF NOT v_org_exists THEN
    INSERT INTO public.organizations (id, name, status, created_at, updated_at)
    VALUES (v_org_id, p_org_name, 'active', NOW(), NOW());
  END IF;
  
  RETURN public.assign_user_to_organization(p_user_email, v_org_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.assign_user_to_organization TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_org_and_assign_user TO authenticated;
```

✅ Click **Run** - Done!

### Step 2: Fix Larry (10 seconds)

1. Open your app in browser
2. Open **Console** (F12)
3. Type this and press Enter:

```javascript
createOrgAndAssignUser('Rona Atlantic', 'larry.lee@ronaatlantic.ca')
```

✅ You should see:
```
✅ Organization created: Rona Atlantic
✅ User assigned successfully!
✅ All done!
```

4. Tell Larry to **logout and login again**

## 🎉 Done!

Larry can now access the system.

---

## 📋 Alternative: Manual SQL (If Above Doesn't Work)

Run this in Supabase SQL Editor:

```sql
-- Create organization
INSERT INTO public.organizations (id, name, status)
VALUES ('rona-atlantic', 'Rona Atlantic', 'active')
ON CONFLICT (id) DO NOTHING;

-- Assign Larry to organization
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

-- Verify
SELECT 
  p.email, 
  p.organization_id, 
  o.name,
  u.raw_user_meta_data->>'organizationId' as auth_org
FROM public.profiles p
LEFT JOIN public.organizations o ON p.organization_id = o.id
LEFT JOIN auth.users u ON p.id = u.id
WHERE p.email = 'larry.lee@ronaatlantic.ca';
```

✅ Should return 1 row showing Larry assigned to Rona Atlantic

---

## 🔧 Future Users

After Step 1 (SQL functions), you can fix any user from browser console:

```javascript
// Diagnose user issues
fixUserTenant('user@example.com')

// Create org and assign user
createOrgAndAssignUser('Company Name', 'user@example.com')

// Assign to existing org
assignUserToOrg('user@example.com', 'org-id')
```

---

## ⚠️ Common Errors

### "function does not exist"
→ Run Step 1 SQL first

### "Organization not found"
→ Use `createOrgAndAssignUser()` to create it

### "User not found"
→ User needs to sign up first

### RLS blocking
→ Use the SQL functions (they bypass RLS)

---

## 📞 Need Help?

1. Check console output for detailed error messages
2. See `/SQL_FIX_USER_ORGANIZATION.sql` for full SQL script
3. See `/FIX_RLS_BLOCKING_ERROR.md` for detailed explanation
4. Run `fixUserTenant('email')` in console for diagnostics
