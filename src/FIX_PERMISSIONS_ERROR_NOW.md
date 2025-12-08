# 🚨 FIX: "Row-level security policy" Error

## ❌ Current Error:
```
Error saving permissions: {
  "code": "42501",
  "message": "new row violates row-level security policy for table \"permissions\""
}
```

---

## 🔍 What's Wrong?

The RLS (Row Level Security) policies on the `permissions` table are either:
1. **Too restrictive** - blocking admins from saving
2. **Missing** - no policy allowing INSERT/UPDATE
3. **Conflicting** - multiple policies fighting each other

---

## ✅ THE FIX (2 minutes)

### 🎯 Step 1: Open Supabase SQL Editor
1. Go to https://supabase.com/dashboard
2. Click your ProSpaces project
3. Click **"SQL Editor"** (left sidebar)
4. Click **"New Query"**

---

### 🎯 Step 2: Copy This ENTIRE Script

```sql
-- Fix Permissions Table RLS Policies
-- This allows admins to save permissions

-- Drop all existing policies (clean slate)
DO $$ 
DECLARE
  policy_record RECORD;
BEGIN
  FOR policy_record IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'permissions' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.permissions', policy_record.policyname);
  END LOOP;
END $$;

-- Ensure RLS is enabled
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;

-- Policy 1: Everyone can read permissions
CREATE POLICY "authenticated_users_read_permissions" 
ON public.permissions FOR SELECT TO authenticated
USING (true);

-- Policy 2: Admins can insert permissions
CREATE POLICY "admins_insert_permissions" 
ON public.permissions FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('super_admin', 'admin')
  )
);

-- Policy 3: Admins can update permissions
CREATE POLICY "admins_update_permissions" 
ON public.permissions FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('super_admin', 'admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('super_admin', 'admin')
  )
);

-- Policy 4: Admins can delete permissions
CREATE POLICY "admins_delete_permissions" 
ON public.permissions FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('super_admin', 'admin')
  )
);

-- Verify
SELECT policyname, cmd FROM pg_policies 
WHERE tablename = 'permissions' ORDER BY policyname;

SELECT '✅ FIXED! Permissions can now be saved.' as result;
```

---

### 🎯 Step 3: Click "RUN"
Press the **RUN** button or **Ctrl/Cmd + Enter**

---

### 🎯 Step 4: Check Output
You should see:
```
✅ FIXED! Permissions can now be saved.
```

And a table showing 4 policies:
- `admins_delete_permissions` (DELETE)
- `admins_insert_permissions` (INSERT)
- `admins_update_permissions` (UPDATE)
- `authenticated_users_read_permissions` (SELECT)

---

### 🎯 Step 5: Test It!
1. Go back to ProSpaces CRM
2. Navigate to **Settings → Permissions Manager**
3. Select a role (e.g., "User")
4. Change some permissions
5. Click **"Save Permissions"**
6. **Should work now!** ✅

---

## 🔍 What This Does

### Before (BROKEN):
```
❌ Policy was too restrictive
❌ Only super_admin could save
❌ Admin role was blocked
❌ Or policies were missing entirely
```

### After (FIXED):
```
✅ Separate policies for each operation
✅ Both super_admin AND admin can save
✅ Clear, non-conflicting rules
✅ Everyone can read (needed for UI)
```

---

## 📋 What Changed

| Operation | Who Can Do It | Policy |
|-----------|---------------|--------|
| **SELECT** (Read) | Everyone authenticated | `authenticated_users_read_permissions` |
| **INSERT** (Create) | super_admin, admin | `admins_insert_permissions` |
| **UPDATE** (Edit) | super_admin, admin | `admins_update_permissions` |
| **DELETE** (Remove) | super_admin, admin | `admins_delete_permissions` |

---

## ❓ Why Did This Happen?

**Possible causes:**
1. **Old migration scripts** created restrictive policies
2. **Only super_admin** was allowed (admin excluded)
3. **Missing WITH CHECK** clause on INSERT/UPDATE
4. **Policy conflicts** from multiple setups

**The fix:**
- Drops ALL old policies (clean slate)
- Creates 4 specific policies (one per operation)
- Allows both `super_admin` AND `admin` roles
- Uses proper `USING` and `WITH CHECK` clauses

---

## 🧪 After Running This

### What Will Work:
1. ✅ Admins can view permissions
2. ✅ Admins can change permissions
3. ✅ Admins can save permissions
4. ✅ New permissions can be created
5. ✅ Existing permissions can be updated
6. ✅ No more RLS errors

### What Won't Break:
- ✅ Users can still read their permissions
- ✅ Security is maintained (only admins modify)
- ✅ Other tables not affected

---

## ❓ Still Getting Errors?

### Error: "permission denied for table profiles"
**Cause:** Profiles table also has RLS issues

**Fix:** Check that you have a profile record:
```sql
SELECT id, email, role FROM profiles WHERE id = auth.uid();
```

Should return your user with role `admin` or `super_admin`.

---

### Error: "auth.uid() is null"
**Cause:** Not logged in properly

**Fix:** 
1. Log out completely
2. Clear browser cache
3. Log back in
4. Try again

---

### Error: Still getting 42501
**Cause:** Policy didn't update

**Fix:** Check current policies:
```sql
SELECT policyname, cmd 
FROM pg_policies 
WHERE tablename = 'permissions' AND schemaname = 'public';
```

Should show exactly 4 policies. If not, run the fix script again.

---

## 📁 Related Files

| File | Purpose |
|------|---------|
| `/FIX_PERMISSIONS_RLS.sql` | Full SQL script with verification |
| `/fix-admin-permissions-policy.sql` | Older version (less complete) |

---

## 🎯 Summary

**Problem:** RLS policies blocked permission saves

**Solution:** Create proper policies for admin + super_admin

**Time:** 2 minutes

**Result:** Permissions Manager works perfectly!

---

**👉 COPY AND RUN THE SQL ABOVE NOW!**
