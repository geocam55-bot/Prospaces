# ✅ Permissions RLS Error - Fixed!

## 🚨 The Error
```
Error saving permissions: {
  "code": "42501",
  "message": "new row violates row-level security policy for table \"permissions\""
}
```

---

## 🎯 THE FIX (30 seconds)

### 1️⃣ Open Supabase SQL Editor
- https://supabase.com/dashboard → Your project → SQL Editor

### 2️⃣ Run This SQL:

```sql
-- Drop all old policies
DO $$ 
DECLARE p RECORD;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies 
    WHERE tablename = 'permissions' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.permissions', p.policyname);
  END LOOP;
END $$;

-- Enable RLS
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;

-- Create new policies
CREATE POLICY "authenticated_users_read_permissions" ON public.permissions
FOR SELECT TO authenticated USING (true);

CREATE POLICY "admins_insert_permissions" ON public.permissions
FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
);

CREATE POLICY "admins_update_permissions" ON public.permissions
FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin')))
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin')));

CREATE POLICY "admins_delete_permissions" ON public.permissions
FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
);

SELECT '✅ FIXED!' as status;
```

### 3️⃣ Test It
- Go to ProSpaces → Settings → Permissions Manager
- Change some permissions
- Click "Save Permissions"
- ✅ Should work!

---

## 📁 Detailed Guides

| Need More Info? | Open This File |
|----------------|----------------|
| 🏃 **Quick fix with copy/paste SQL** | `/FIX_PERMISSIONS_ERROR_NOW.md` |
| 🔍 **Diagnose the issue first** | `/DEBUG_PERMISSIONS_ISSUE.sql` |
| 📖 **Complete explanation** | `/PERMISSIONS_FIX_COMPLETE_GUIDE.md` |
| 💾 **Just the SQL script** | `/FIX_PERMISSIONS_RLS.sql` |

---

## 🔍 What Was Wrong?

The RLS policies on the `permissions` table were either:
- ❌ Too restrictive (only super_admin, not admin)
- ❌ Missing entirely (no INSERT/UPDATE policies)
- ❌ Conflicting (multiple contradicting policies)

---

## ✅ What's Fixed?

After running the SQL:
- ✅ Everyone can **read** permissions
- ✅ Admins + Super Admins can **insert** permissions
- ✅ Admins + Super Admins can **update** permissions
- ✅ Admins + Super Admins can **delete** permissions
- ✅ Clear, non-conflicting policies
- ✅ No more 42501 errors!

---

## 🧪 Quick Test

```
1. Open ProSpaces CRM
2. Go to Settings → Permissions Manager
3. Select "User" role
4. Toggle "Contacts > Add" to ON
5. Click "Save Permissions"
6. Should see: "✅ Permissions saved for User!"
```

If you see that → You're done! ✅

---

## ❓ Still Not Working?

### Check 1: Your Role
```sql
SELECT role FROM profiles WHERE id = auth.uid();
```
Should return: `admin` or `super_admin`

If it returns `user` or `NULL`, you need admin access.

### Check 2: Policies Created
```sql
SELECT COUNT(*) FROM pg_policies 
WHERE tablename = 'permissions';
```
Should return: `4`

### Check 3: Profile Exists
```sql
SELECT * FROM profiles WHERE id = auth.uid();
```
Should return your profile record.

---

**👉 COPY THE SQL ABOVE AND RUN IT NOW!**

**Takes 30 seconds. Fixes the error completely.**
