# Quick Reference - User Visibility Fix

## The Problem
```
❌ You see: Just yourself
✅ You should see: All RONA Atlantic users
```

## The Solution (One Command)

### Open Supabase Dashboard → SQL Editor

### Paste and Run This:
```
👉 Copy all contents from: /FIX_EVERYTHING_NOW.sql
```

### Then:
```
1. Log out
2. Log back in
3. Done! ✅
```

## What You'll See

### Before Fix:
```
Users Page:
┌─────────────────────────────┐
│ 👤 Your Name (you@email.com)│
│                             │
│ No other users visible      │
└─────────────────────────────┘
```

### After Fix:
```
Users Page:
┌─────────────────────────────────────┐
│ 👤 Your Name (you@email.com)        │
│ 👤 Larry Lee (larry@ronaatlantic.ca)│
│ 👤 User 2 (user2@example.com)       │
│ 👤 User 3 (user3@example.com)       │
│ ... and all other RONA users        │
└─────────────────────────────────────┘
```

## Technical Details (For Nerds 🤓)

### What the Script Does:

1. **Organization Fix**
   ```
   george.campbell@prospaces.com → ProSpaces CRM ✅
   Everyone else → RONA Atlantic ✅
   ```

2. **Metadata Sync**
   ```
   auth.users.raw_user_meta_data.organizationId 
   ↕️ SYNCED ↕️
   profiles.organization_id
   ```

3. **RLS Policies**
   ```
   Old policies (broken) ❌
   ↓
   New policies (working) ✅
   ```

## Verification Query

After running the fix, you can check with:

```sql
-- This should show multiple users
SELECT email, full_name, role 
FROM profiles p
JOIN organizations o ON p.organization_id = o.id
WHERE o.name = 'RONA Atlantic';
```

Expected: Multiple rows (not just you)

## Common Mistakes

### ❌ Forgot to Log Out
```
Result: Still see only yourself
Fix: LOG OUT AND LOG BACK IN!
```

### ❌ Didn't Run the SQL Script
```
Result: Nothing changed
Fix: Run /FIX_EVERYTHING_NOW.sql
```

### ❌ Ran Wrong Script
```
Result: Partial fix
Fix: Run /FIX_EVERYTHING_NOW.sql (not the others)
```

## Files Cheat Sheet

| Want to... | Use this file |
|------------|--------------|
| ⭐ Fix everything | `/FIX_EVERYTHING_NOW.sql` |
| See what's wrong | `/DIAGNOSE_USER_VISIBILITY.sql` |
| Fix just visibility | `/QUICK_FIX_USER_VISIBILITY.sql` |
| Fix just orgs | `/FIX_ORGS_AUTO.sql` |
| Check if it worked | `/VERIFY_ORGS.sql` |

## Emergency Commands

### If Script Fails:
```sql
-- Check if organizations exist
SELECT * FROM organizations;

-- Check if profiles exist
SELECT COUNT(*) FROM profiles;

-- Check your role
SELECT raw_user_meta_data->>'role' 
FROM auth.users 
WHERE email = 'YOUR_EMAIL';
```

### If Still Not Working:
1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for red errors
4. Share the error message

## Success Indicators

You'll know it worked when:
- ✅ User count increases from 1 to many
- ✅ Can see multiple users in the table
- ✅ No errors in browser console
- ✅ Can edit other users
- ✅ Organization names show correctly

## Time to Fix
```
⏱️ Total time: 5 minutes
  - SQL script: 30 seconds
  - Log out/in: 30 seconds
  - Verification: 1 minute
  - Coffee break: 3 minutes ☕
```

---

## TL;DR

```
1. /FIX_EVERYTHING_NOW.sql → Run in Supabase
2. Log out
3. Log back in
4. Profit! 💰
```
