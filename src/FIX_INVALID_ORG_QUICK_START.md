# 🚀 Quick Fix: Invalid Organization ID Error

## 🚨 The Problem
```
Organization not found: org-1762906336768
Error: Organization with ID "org-1762906336768" does not exist.
```

This happens when users have **timestamp-based organization IDs** instead of proper slug-format IDs like `rona-atlantic`.

---

## ✅ 30-Second Fix (Use the UI)

1. **Navigate to**: Users → **User Recovery** tab
2. **Click**: "Scan for Issues" button in the **"Fix Invalid Organization IDs"** card
3. **Click**: "Fix X User(s)" button
4. **Done!** ✅

The tool will automatically:
- Find all users with invalid org IDs
- Assign them to correct organizations based on email domain
- Update both profiles and auth metadata

---

## 🔧 Alternative: SQL Script (2 minutes)

1. Open **Supabase Dashboard** → **SQL Editor**
2. Copy/paste **`/FIX_INVALID_ORG_IDS.sql`**
3. Click **Run** (F5)
4. Check the verification report

The script will:
- ✅ Find all invalid org IDs
- ✅ Auto-fix based on email domain
- ✅ Show before/after comparison
- ✅ Verify all users are corrected

---

## 🎯 What Gets Fixed

### Before:
```
Email: matt.brennan@ronaatlantic.ca
Organization ID: org-1762906336768  ❌ Invalid (timestamp-based)
Status: Can't invite new users
```

### After:
```
Email: matt.brennan@ronaatlantic.ca
Organization ID: rona-atlantic  ✅ Valid
Status: Everything works!
```

---

## 📋 How It Works

The fix automatically maps users to organizations based on **email domain**:

| Email Domain | → | Organization ID |
|--------------|---|-----------------|
| `@ronaatlantic.ca` | → | `rona-atlantic` |
| `@rona...` | → | `rona-atlantic` |
| Other domains | → | First active organization |

---

## ⚡ Super Quick Fix (One User)

If you just need to fix one specific user, run this in SQL Editor:

```sql
SELECT public.fix_user_organization(
  'matt.brennan@ronaatlantic.ca',  -- User email
  'rona-atlantic'                   -- Correct organization ID
);
```

---

## 🔍 Check Current Status

Want to see who has invalid org IDs? Run this:

```sql
SELECT 
  email,
  organization_id,
  CASE 
    WHEN organization_id ~ '^org-[0-9]+$' THEN '❌ TIMESTAMP-BASED'
    WHEN organization_id IS NULL THEN '❌ NULL'
    ELSE '✅ VALID'
  END as status
FROM profiles
WHERE 
  organization_id ~ '^org-[0-9]+$'
  OR organization_id IS NULL
ORDER BY email;
```

---

## 🎉 Success Verification

After fix, verify with:

```sql
-- Should return 0 invalid users
SELECT COUNT(*) as invalid_count
FROM profiles
WHERE organization_id ~ '^org-[0-9]+$'
   OR organization_id IS NULL;
```

Expected result: **0** ✅

---

## 🤔 Why Did This Happen?

This was caused by the old signup/signin logic that generated organization IDs based on timestamps instead of proper slugs. You mentioned this was already fixed in the server routes, but some users still have the old IDs.

---

## 🛡️ Prevention

The fix script also creates a helper function `fix_user_organization()` that you can use anytime:

```sql
-- Fix any user anytime
SELECT public.fix_user_organization(
  'user@example.com',
  'correct-org-id'
);
```

---

## 📊 Common Patterns

**Pattern 1**: All users from Rona Atlantic have invalid IDs  
**Fix**: Run the SQL script - it auto-detects `@ronaatlantic.ca` domain

**Pattern 2**: Just logged-in user has invalid ID  
**Fix**: Use the UI tool in User Recovery tab

**Pattern 3**: Mix of valid and invalid IDs  
**Fix**: Run the SQL script - it only fixes invalid ones

---

## 🆘 Troubleshooting

### Issue: "Organization not found" when inviting users
**Cause**: Your own user account has invalid org ID  
**Fix**: Run the fix for yourself first

### Issue: Can't see any users in Users page
**Cause**: Filtering by invalid org ID returns no results  
**Fix**: Fix your account's org ID, then reload

### Issue: Fixed but error persists
**Cause**: Browser cache or session needs refresh  
**Fix**: Log out and log back in

---

## 🚀 Quick Command Reference

| What you need | Command |
|---------------|---------|
| **UI Fix (easiest)** | Users → User Recovery → Scan & Fix |
| **SQL Fix (comprehensive)** | Run `/FIX_INVALID_ORG_IDS.sql` |
| **Fix one user** | `SELECT public.fix_user_organization('email', 'org-id');` |
| **Check status** | See SQL query above |
| **Verify fix** | Count query above (should return 0) |

---

## 📁 Files Created

1. **`/FIX_INVALID_ORG_IDS.sql`** - Complete SQL fix script
2. **`/components/FixInvalidOrgIds.tsx`** - UI component
3. **This guide** - Quick reference

---

## ⏱️ Time to Fix

- **UI Method**: 30 seconds ⚡
- **SQL Method**: 2 minutes 🔧
- **One User**: 10 seconds ⚡⚡

---

## ✅ Checklist

- [ ] Navigate to Users → User Recovery tab
- [ ] Click "Scan for Issues"
- [ ] Review the list of invalid users
- [ ] Click "Fix X User(s)"
- [ ] Verify "All users have valid organization IDs!"
- [ ] Try inviting a new user - should work now!

---

**Problem:** `org-1762906336768` (invalid)  
**Solution:** `rona-atlantic` (valid)  
**Result:** Everything works! 🎉
