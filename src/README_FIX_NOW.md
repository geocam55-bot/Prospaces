# 🔧 Fix User Visibility - Simple Instructions

## Error You're Getting
```
ERROR: invalid input syntax for type uuid: "default-org"
```

## The Solution

### Option 1: Ultimate Fix (RECOMMENDED) ⭐
This is the safest, most reliable version.

```
1. Open Supabase Dashboard → SQL Editor
2. Copy ALL contents from: /FIX_ULTIMATE.sql
3. Paste into SQL Editor
4. Click "Run"
5. Wait for success message
```

### Option 2: Safe Version (Alternative)
If Ultimate doesn't work, try this:

```
1. Open Supabase Dashboard → SQL Editor
2. Copy ALL contents from: /FIX_SAFE_VERSION.sql
3. Paste into SQL Editor
4. Click "Run"
5. Wait for success message
```

### After Running Either Script:

```
1. Log out of your application
2. Log back in (CRITICAL - refreshes auth token!)
3. Go to Users page
4. You should see all RONA Atlantic users ✅
```

---

## Why This Happens

Some users have `"default-org"` in their auth metadata instead of a proper UUID. The new scripts:
- ✅ Clean all invalid data
- ✅ Assign proper UUIDs
- ✅ Sync everything correctly
- ✅ Won't crash on bad data

---

## Diagnostic (Optional)

Want to see where "default-org" is hiding first?

```
1. Run: /FIND_DEFAULT_ORG.sql
2. Look for rows with "Invalid (not UUID)"
3. Then run /FIX_ULTIMATE.sql
```

---

## What Gets Fixed

### Before:
```
❌ Users have "default-org" instead of UUID
❌ Auth metadata doesn't match profiles
❌ RLS policies fail on UUID cast
❌ You can only see yourself
```

### After:
```
✅ All users have proper UUID organization IDs
✅ Auth metadata synced with profiles
✅ RLS policies work correctly
✅ You see all RONA Atlantic users
```

---

## File Guide

| Use This | When |
|----------|------|
| ⭐ `/FIX_ULTIMATE.sql` | **Start here!** Most reliable |
| `/FIX_SAFE_VERSION.sql` | If Ultimate fails |
| `/FIND_DEFAULT_ORG.sql` | See what's wrong |
| `/CHECK_CURRENT_STATE.sql` | Check everything |

---

## Troubleshooting

### Script fails at Step 3?
The "default-org" is in auth.users metadata. The script will clean it.

### Still see only yourself after fix?
- Did you log out and back in? (Required!)
- Try: Ctrl+Shift+R to hard refresh
- Check browser console (F12) for errors

### "Organizations not found" error?
The script creates them automatically. If it still fails:
```sql
INSERT INTO organizations (name, status) VALUES ('ProSpaces CRM', 'active');
INSERT INTO organizations (name, status) VALUES ('RONA Atlantic', 'active');
```

---

## Expected Results

After running the script, you should see output like:

```
Step 1: Organizations
✅ ProSpaces CRM: [uuid]
✅ RONA Atlantic: [uuid]

Step 2: Profiles Fixed
✅ george.campbell@prospaces.com → ProSpaces CRM
✅ larry.lee@ronaatlantic.ca → RONA Atlantic
✅ [other users] → RONA Atlantic

Step 3: Auth Metadata Synced
✅ All users show ✅ match

Step 4-8: Policies Created
✅ 4 policies created

Final Results:
✅ User Counts: ProSpaces CRM: 1, RONA Atlantic: X
✅ Sync Status: X synced, 0 not_synced
```

---

## Quick Summary

```
Problem: "default-org" breaking UUID cast
Solution: /FIX_ULTIMATE.sql
Steps:
  1. Copy script
  2. Run in Supabase SQL Editor
  3. Log out
  4. Log back in
  5. Done! ✅
```

---

## Need Help?

1. Run `/FIND_DEFAULT_ORG.sql` to see the problem
2. Run `/FIX_ULTIMATE.sql` to fix it
3. If it fails, share:
   - The exact error message
   - Which step it failed on
   - Output from FIND_DEFAULT_ORG.sql

---

**That's it!** The Ultimate Fix should handle all edge cases. 🎉
