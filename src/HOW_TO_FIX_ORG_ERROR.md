# 🚨 URGENT FIX: Organization ID Error

## The Error You're Seeing

```
Organization not found: org-1762906336768
Error: Organization with ID "org-1762906336768" does not exist.
```

## ⚡ IMMEDIATE 2-MINUTE FIX

### Step 1: Open Supabase SQL Editor
1. Go to your **Supabase Dashboard**
2. Click **SQL Editor** in the left sidebar
3. Click **New Query**

### Step 2: Run This Quick Fix
Copy and paste this SQL and click **Run** (or press F5):

```sql
-- Quick Fix: Replace invalid org ID with correct one
UPDATE profiles
SET 
  organization_id = 'rona-atlantic',
  updated_at = NOW()
WHERE organization_id = 'org-1762906336768';

UPDATE auth.users
SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || 
  jsonb_build_object('organizationId', 'rona-atlantic')
WHERE id IN (
  SELECT user_id FROM profiles WHERE organization_id = 'rona-atlantic'
);
```

### Step 3: Log Out and Back In
1. **Log out** of ProSpaces CRM
2. **Log back in**
3. ✅ **Error is fixed!**

---

## 📋 COMPREHENSIVE FIX (Use if quick fix doesn't work)

### Option A: Use the UI Tool (Easiest)

1. Navigate to **Users** → **User Recovery** tab
2. You'll see **"Fix Invalid Organization IDs"** card at the top
3. Click **"Scan for Issues"**
4. Click **"Fix X User(s)"**
5. ✅ Done!

### Option B: Use the Complete SQL Script

Run the file: **`/IMMEDIATE_FIX_ORG_ID.sql`** in Supabase SQL Editor

This script will:
- ✅ Show all available organizations
- ✅ Find all users with invalid org IDs
- ✅ Fix them automatically
- ✅ Update both profiles and auth tables
- ✅ Verify the fix worked

---

## 🔍 What Caused This?

The timestamp-based organization ID `org-1762906336768` was created by old signup logic that's since been fixed. Your account (and possibly others) still have this invalid ID stored in two places:

1. **`profiles` table** → `organization_id` column
2. **`auth.users` table** → `raw_user_meta_data->organizationId`

Both need to be updated to a valid org ID like `rona-atlantic`.

---

## ✅ Verification

After fixing, verify it worked:

```sql
-- Should return your email with org_id = 'rona-atlantic'
SELECT email, organization_id, role, status
FROM profiles
WHERE email = 'your-email@example.com';
```

---

## 🔄 Code Changes Made

I've also updated the code to include a **fallback mechanism**:

**File: `/utils/users-client.ts`**
- Now checks if org ID in metadata is invalid (timestamp-based)
- Automatically fetches the correct org ID from the `profiles` table
- Prevents this error from happening even if metadata is out of sync

**Changes:**
1. Changed `organizations` table lookup to `tenants` (correct table name)
2. Added fallback to read org ID from profiles if metadata is invalid
3. Added regex check to detect timestamp-based org IDs

---

## 📝 Available Fix Scripts

| File | Purpose | Use When |
|------|---------|----------|
| **`/IMMEDIATE_FIX_ORG_ID.sql`** | Complete fix with diagnostics | First time fixing |
| **`/FIX_INVALID_ORG_IDS.sql`** | Comprehensive fix with auto-mapping | Multiple invalid users |
| Quick SQL above | Ultra-fast 30-second fix | You just want it fixed NOW |

---

## 🎯 Step-by-Step Fix (Copy/Paste Ready)

### 1️⃣ Check What's Wrong

```sql
SELECT 
  email,
  organization_id,
  CASE 
    WHEN organization_id ~ '^org-[0-9]+$' THEN '❌ INVALID'
    ELSE '✅ VALID'
  END as status
FROM profiles
WHERE organization_id ~ '^org-[0-9]+$';
```

### 2️⃣ See Available Organizations

```sql
SELECT id, name, status
FROM tenants
WHERE status = 'active';
```

### 3️⃣ Fix It (Change 'rona-atlantic' if needed)

```sql
-- Fix profiles table
UPDATE profiles
SET organization_id = 'rona-atlantic', updated_at = NOW()
WHERE organization_id = 'org-1762906336768';

-- Fix auth metadata
UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data || 
  jsonb_build_object('organizationId', 'rona-atlantic')
WHERE id IN (
  SELECT user_id FROM profiles 
  WHERE organization_id = 'rona-atlantic'
);
```

### 4️⃣ Verify

```sql
-- Should show 0 invalid users
SELECT COUNT(*) as invalid_count
FROM profiles
WHERE organization_id ~ '^org-[0-9]+$';
```

---

## 🚀 After Fixing

1. ✅ Log out of ProSpaces CRM
2. ✅ Log back in
3. ✅ Try inviting a user → Should work!
4. ✅ All features should work normally

---

## 💡 Pro Tips

- **Don't have Supabase access?** Use the UI tool in User Recovery tab
- **Have multiple users?** Run the comprehensive script
- **Just want it fixed?** Run the quick SQL at the top of this doc
- **Error persists?** Clear browser cache and log out/in again

---

## 🆘 Still Having Issues?

If the error persists after running the fix:

1. **Clear browser cache**
2. **Try incognito/private mode**
3. **Check browser console** for additional errors
4. **Verify the org ID** in both profiles and auth.users tables matches

---

## 📞 Quick Commands Reference

```sql
-- Check your current org ID
SELECT email, organization_id FROM profiles 
WHERE email = 'your.email@example.com';

-- Fix your org ID
UPDATE profiles 
SET organization_id = 'rona-atlantic' 
WHERE email = 'your.email@example.com';

-- Fix auth metadata
UPDATE auth.users 
SET raw_user_meta_data = raw_user_meta_data || 
  jsonb_build_object('organizationId', 'rona-atlantic')
WHERE email = 'your.email@example.com';
```

---

**Bottom Line:** Run the quick SQL fix above, log out/in, and you're done! ✅
