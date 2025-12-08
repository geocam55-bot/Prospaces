# 🔧 Complete Fix Guide: Permissions RLS Error

## 🚨 Error You're Seeing
```
Error saving permissions: {
  "code": "42501",
  "message": "new row violates row-level security policy for table \"permissions\""
}
```

---

## 🎯 Quick Fix (Choose Your Path)

### Path A: Just Fix It (2 minutes) ⭐ RECOMMENDED
1. Open `/FIX_PERMISSIONS_ERROR_NOW.md`
2. Copy the SQL script
3. Run it in Supabase SQL Editor
4. Done! ✅

### Path B: Debug First, Then Fix (5 minutes)
1. Run `/DEBUG_PERMISSIONS_ISSUE.sql` to see what's wrong
2. Follow the recommended action
3. Run `/FIX_PERMISSIONS_RLS.sql`
4. Done! ✅

---

## 📋 Detailed Step-by-Step

### Step 1: Diagnose (Optional but Helpful)

**Open Supabase SQL Editor and run:**
```sql
-- Check your current user and role
SELECT 
  auth.uid() as your_id,
  (SELECT email FROM profiles WHERE id = auth.uid()) as your_email,
  (SELECT role FROM profiles WHERE id = auth.uid()) as your_role;
```

**Expected result:**
```
your_id     | your_email          | your_role
uuid-here   | you@company.com     | admin
```

**If you see:**
- `NULL` for your_role → You don't have a profile! See Fix 1 below.
- `user` for your_role → You're not an admin. See Fix 2 below.
- `admin` or `super_admin` → Good! Proceed to Step 2.

---

### Step 2: Check Current Policies

**Run this:**
```sql
SELECT policyname, cmd 
FROM pg_policies 
WHERE tablename = 'permissions' AND schemaname = 'public'
ORDER BY cmd;
```

**Good outcome (4 policies):**
```
policyname                          | cmd
------------------------------------|--------
authenticated_users_read_permissions| SELECT
admins_insert_permissions           | INSERT
admins_update_permissions           | UPDATE  
admins_delete_permissions           | DELETE
```

**Bad outcome:**
- No results → No policies exist! Run Fix 3.
- Only 1-2 policies → Incomplete. Run Fix 3.
- Different names → Old setup. Run Fix 3.

---

### Step 3: Apply The Fix

**Copy and run this in SQL Editor:**

```sql
-- FIX PERMISSIONS RLS POLICIES
-- Drop all existing policies
DO $$ 
DECLARE
  policy_record RECORD;
BEGIN
  FOR policy_record IN 
    SELECT policyname FROM pg_policies 
    WHERE tablename = 'permissions' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.permissions', policy_record.policyname);
  END LOOP;
END $$;

-- Enable RLS
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;

-- Create proper policies
CREATE POLICY "authenticated_users_read_permissions" 
ON public.permissions FOR SELECT TO authenticated USING (true);

CREATE POLICY "admins_insert_permissions" 
ON public.permissions FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
);

CREATE POLICY "admins_update_permissions" 
ON public.permissions FOR UPDATE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
);

CREATE POLICY "admins_delete_permissions" 
ON public.permissions FOR DELETE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
);

SELECT '✅ Policies fixed!' as result;
```

---

### Step 4: Verify The Fix

**Run this:**
```sql
SELECT COUNT(*) as policy_count
FROM pg_policies 
WHERE tablename = 'permissions' AND schemaname = 'public';
```

**Should return:** `4`

---

### Step 5: Test in ProSpaces

1. Go to ProSpaces CRM
2. Navigate to **Settings → Permissions Manager**
3. Select any role (e.g., "User")
4. Toggle some permissions
5. Click **"Save Permissions"**
6. Should see: **"Permissions saved for User!"** ✅

---

## 🔧 Additional Fixes (If Needed)

### Fix 1: Missing Profile

**If you don't have a profile:**
```sql
-- Create your profile
INSERT INTO profiles (id, email, organization_id, role)
VALUES (
  auth.uid(),
  'your-email@company.com',  -- ← Change this
  (SELECT id FROM organizations LIMIT 1),
  'super_admin'
);
```

---

### Fix 2: Wrong Role

**If you're a 'user' but need to be admin:**
```sql
-- Upgrade your role
UPDATE profiles 
SET role = 'admin'  -- or 'super_admin'
WHERE id = auth.uid();
```

---

### Fix 3: Permissions Table Doesn't Exist

**If the permissions table is missing:**

Run the complete database setup script from `/SETUP_DATABASE.sql` or use the UI:
1. Go to Settings → Database Setup
2. Click "Run Complete Setup"
3. Wait for completion

---

## 🔍 Understanding The Error

### What is RLS (Row Level Security)?

RLS is Supabase's way of controlling who can read/write data:
- **Enabled on table** → Policies required to access data
- **No policies** → Nobody can access (except with service_role key)
- **Wrong policies** → Access denied even for admins

### Why Did This Happen?

**Common causes:**
1. **Only super_admin allowed** → Policy didn't include 'admin'
2. **Missing WITH CHECK** → INSERT/UPDATE blocked
3. **Policy conflicts** → Multiple contradicting policies
4. **No INSERT policy** → Only SELECT allowed

### How The Fix Works

**Before:**
```sql
-- Old policy (too restrictive)
CREATE POLICY "superadmins_manage_permissions" 
ON public.permissions FOR ALL
USING (
  -- Only super_admin can modify
  SELECT role = 'super_admin' FROM profiles WHERE id = auth.uid()
);
```

**After:**
```sql
-- New policies (admin + super_admin)
CREATE POLICY "admins_insert_permissions" 
ON public.permissions FOR INSERT
WITH CHECK (
  -- Both admin AND super_admin can insert
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('super_admin', 'admin')
  )
);
```

**Key differences:**
- ✅ Separate policies for INSERT, UPDATE, DELETE (clearer)
- ✅ Includes both 'admin' and 'super_admin'
- ✅ Uses WITH CHECK for inserts (required!)
- ✅ Uses USING for updates/deletes (checks existing rows)

---

## 📊 Policy Matrix

| Who | SELECT | INSERT | UPDATE | DELETE |
|-----|--------|--------|--------|--------|
| **Anonymous** | ❌ | ❌ | ❌ | ❌ |
| **User** | ✅ | ❌ | ❌ | ❌ |
| **Admin** | ✅ | ✅ | ✅ | ✅ |
| **Super Admin** | ✅ | ✅ | ✅ | ✅ |

---

## 🧪 Testing Checklist

After applying the fix:

- [ ] SQL script ran without errors
- [ ] 4 policies created (verified with SELECT query)
- [ ] Can view Permissions Manager page
- [ ] Can select different roles
- [ ] Can toggle permissions on/off
- [ ] **Can click "Save Permissions" without error** ✅
- [ ] See success toast message
- [ ] Permissions persist after page reload

---

## 📁 Files Reference

| File | When to Use |
|------|-------------|
| **`/FIX_PERMISSIONS_ERROR_NOW.md`** | Quick fix instructions |
| **`/FIX_PERMISSIONS_RLS.sql`** | Complete SQL script |
| **`/DEBUG_PERMISSIONS_ISSUE.sql`** | Diagnose what's wrong |
| `/fix-admin-permissions-policy.sql` | Older version (less complete) |

---

## ❓ FAQ

### Q: Will this affect other tables?
**A:** No, only the `permissions` table is modified.

### Q: Will I lose existing permissions data?
**A:** No, we only drop/create policies, not the data itself.

### Q: Can I run this multiple times?
**A:** Yes! The script is idempotent (safe to run multiple times).

### Q: What if I have custom roles?
**A:** Edit the policy to include your custom role names:
```sql
AND role IN ('super_admin', 'admin', 'your_custom_role')
```

### Q: Why separate policies for each operation?
**A:** More granular control and easier debugging. You can see exactly which operation is blocked.

---

## 🎯 Summary

| Issue | Solution | File |
|-------|----------|------|
| RLS policy error | Run fix SQL script | `/FIX_PERMISSIONS_ERROR_NOW.md` |
| Not sure what's wrong | Run debug script | `/DEBUG_PERMISSIONS_ISSUE.sql` |
| Need complete fix | Use comprehensive SQL | `/FIX_PERMISSIONS_RLS.sql` |

---

**🚀 Ready to fix it? Open `/FIX_PERMISSIONS_ERROR_NOW.md` now!**
