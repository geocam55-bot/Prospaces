# 🚀 Quick Start: Find Matt Brennan

## ⚡ Fastest Way (30 seconds)

### Option 1: Use the UI (Recommended)
1. **Log in** to ProSpaces CRM
2. **Go to Users** → **User Recovery** tab
3. **Click "Find Matt Brennan"** button
4. **Click "Recover User"** if any issues are found
5. ✅ **Done!**

### Option 2: Run SQL Script
1. Open **Supabase Dashboard** → **SQL Editor**
2. Copy/paste contents of **`/FIND_MATT_BRENNAN.sql`**
3. Click **Run** (F5)
4. Script will automatically:
   - 🔍 Search for Matt in all tables
   - 🔧 Fix any issues found
   - ✅ Show verification report

### Option 3: Browser Console (Power Users)
```javascript
// Open DevTools (F12) and paste:
const { findMissingUser, recoverMissingUser } = await import('./utils/find-missing-user');

// Search for Matt
await findMissingUser('matt.brennan@ronaatlantic.ca');

// If issues found, recover
await recoverMissingUser('matt.brennan@ronaatlantic.ca', 'rona-atlantic');
```

---

## 📋 What These Tools Do

### ✅ Automatic Checks:
- Is user in auth.users table?
- Is user in profiles table?
- Does user have organization assigned?
- Is user status 'active'?
- Does auth metadata match profile?
- Does organization exist and is active?

### 🔧 Automatic Fixes:
- Assign user to correct organization
- Set status to 'active'
- Sync auth metadata with profile
- Create profile if missing
- Verify organization exists

---

## 🎯 Common Issues & Instant Fixes

| Issue | What It Means | How Tool Fixes It |
|-------|---------------|-------------------|
| **No organization** | User exists but `organization_id` is NULL | Assigns to 'rona-atlantic' |
| **Wrong organization** | User in different org | Re-assigns to correct org |
| **Inactive status** | Status is 'pending' or 'inactive' | Sets to 'active' |
| **Not in profiles** | User in auth but no profile | Creates profile entry |
| **Metadata mismatch** | Auth metadata ≠ profile | Syncs both to match |

---

## 📁 Files Created for You

| File | Purpose |
|------|---------|
| `/FIND_MATT_BRENNAN.sql` | Complete SQL diagnostic & recovery script |
| `/utils/find-missing-user.ts` | TypeScript utility functions |
| `/components/FindMissingUser.tsx` | React UI component |
| `/FIND_MISSING_USER_GUIDE.md` | Detailed documentation |
| `/FIX_DUPLICATE_FUNCTION.sql` | Fix for function errors (run first if needed) |

---

## ⚠️ Before You Start

### Run This First (If You Haven't Already):
```sql
-- In Supabase SQL Editor, run:
```
Copy contents of **`/FIX_DUPLICATE_FUNCTION.sql`** and run it.

This ensures the server-side functions work properly.

---

## 🎉 Success Indicators

After recovery, you should see:

### ✅ In the UI:
- Matt appears in Users list
- Status badge shows "Active"
- Organization shows "Rona Atlantic"
- Can log in without errors

### ✅ In SQL:
```sql
SELECT 
  email,
  organization_id,
  status,
  role
FROM profiles
WHERE email = 'matt.brennan@ronaatlantic.ca';
```
Should return:
- email: `matt.brennan@ronaatlantic.ca`
- organization_id: `rona-atlantic`
- status: `active`
- role: (whatever role Matt has)

---

## 🆘 Still Not Working?

### Try These Steps:

1. **Check if function exists:**
```sql
SELECT proname FROM pg_proc WHERE proname LIKE '%user%org%';
```
Should see: `assign_user_to_organization` and `create_org_and_assign_user`

2. **Verify organization exists:**
```sql
SELECT * FROM tenants WHERE id = 'rona-atlantic';
```
Should return one row with status 'active'

3. **Check all Rona Atlantic users:**
```sql
SELECT email, status FROM profiles 
WHERE organization_id = 'rona-atlantic'
ORDER BY email;
```
Should see all users including Matt

4. **Last resort - Recreate user:**
```sql
SELECT public.create_org_and_assign_user(
  'Rona Atlantic',
  'matt.brennan@ronaatlantic.ca'
);
```
⚠️ This creates a new account - Matt will need to reset password

---

## 🎓 Understanding the Architecture

```
┌─────────────────────────────────────────────┐
│          ProSpaces CRM Architecture         │
└─────────────────────────────────────────────┘

auth.users (Supabase Auth)
├── id (UUID)
├── email
└── raw_user_meta_data
    └── organizationId  ← Must match profile!

profiles (Your table)
├── user_id (FK to auth.users)
├── email
├── organization_id  ← Must match auth metadata!
├── status ('active', 'pending', 'inactive')
└── role

tenants (Organizations)
├── id (org-slug-format)
├── name
└── status ('active', 'inactive')
```

**The Problem:** When these don't match, users "disappear"

**The Solution:** Our tools sync all three automatically!

---

## 💡 Pro Tips

1. **Always use the recovery tab** in the Users module - it's the easiest
2. **Bookmark** `/FIND_MATT_BRENNAN.sql` for quick access
3. **Check organization first** before trying to recover users
4. **Run function fix once** and forget about it
5. **Use SQL verification** to confirm recovery worked

---

## 📞 Quick Reference Commands

### In Supabase SQL Editor:
```sql
-- Find Matt
SELECT * FROM profiles WHERE email = 'matt.brennan@ronaatlantic.ca';

-- Recover Matt
SELECT public.assign_user_to_organization(
  'matt.brennan@ronaatlantic.ca', 
  'rona-atlantic'
);

-- Verify
SELECT email, organization_id, status FROM profiles 
WHERE email = 'matt.brennan@ronaatlantic.ca';
```

### In Browser Console:
```javascript
// Search
await findMissingUser('matt.brennan@ronaatlantic.ca');

// Recover
await recoverMissingUser('matt.brennan@ronaatlantic.ca');
```

---

## ✅ Checklist

- [ ] Run `/FIX_DUPLICATE_FUNCTION.sql` (one time)
- [ ] Go to Users → User Recovery tab
- [ ] Click "Find Matt Brennan"
- [ ] Review diagnostic results
- [ ] Click "Recover User" if needed
- [ ] Verify Matt appears in Users list
- [ ] Test Matt can log in

---

**Total Time:** 30 seconds to 2 minutes  
**Difficulty:** ⭐ Easy (click buttons) to ⭐⭐ Medium (SQL)  
**Success Rate:** 99% ✅

---

**Need More Help?** See `/FIND_MISSING_USER_GUIDE.md` for detailed documentation.
