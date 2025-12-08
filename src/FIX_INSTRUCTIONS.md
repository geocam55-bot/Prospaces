# Fix Instructions - User Visibility Issue

## The Error You Got
```
ERROR: invalid input syntax for type uuid: "default-org"
```

This means some users have invalid organization IDs that aren't proper UUIDs.

## Fixed Script Available
I've created **`/FIX_EVERYTHING_NOW_V2.sql`** which handles this issue.

---

## Step-by-Step Fix (5 Minutes)

### Step 1: Check Current State (Optional but Recommended)
```
1. Open Supabase Dashboard → SQL Editor
2. Copy contents of: /CHECK_CURRENT_STATE.sql
3. Paste and click "Run"
4. Review the output to see what's broken
```

This shows you:
- ✅ What organizations exist
- ❌ Which users have invalid org IDs
- ❌ What's out of sync

### Step 2: Run the Fixed Script
```
1. Still in Supabase Dashboard → SQL Editor
2. Copy contents of: /FIX_EVERYTHING_NOW_V2.sql
3. Paste and click "Run"
4. Wait for "Success - completed in X ms"
```

### Step 3: Verify It Worked
Look at the output tables. You should see:
```
✅ ProSpaces CRM: 1 user (george.campbell)
✅ RONA Atlantic: X users (everyone else)
✅ All users show "SYNCED" status
✅ 4 RLS policies created
```

### Step 4: Log Out and Back In (CRITICAL!)
```
1. In your app, click profile menu
2. Click "Sign Out"
3. Sign back in with your credentials
4. Go to Users page
```

### Step 5: Check Users Page
You should now see:
```
✅ Multiple users listed (not just yourself)
✅ User count shows correct number
✅ No errors in the page
```

---

## What the V2 Script Does Differently

### V2 Improvements:
1. ✅ **Creates organizations if missing**
   - Creates "ProSpaces CRM" if it doesn't exist
   - Creates "RONA Atlantic" if it doesn't exist

2. ✅ **Fixes invalid organization IDs**
   - Handles NULL organization_id
   - Assigns default org (RONA Atlantic) to orphaned users

3. ✅ **Better error handling**
   - Won't crash on invalid UUIDs
   - Processes users one at a time for metadata sync

4. ✅ **All the same fixes as V1**
   - Organization assignments
   - Auth metadata sync
   - RLS policies

---

## If It Still Fails

### Error: "organization does not exist"
**Solution:** The script now creates organizations automatically. If you still get this, check:
```sql
-- Manually create organizations
INSERT INTO organizations (name, status) 
VALUES ('ProSpaces CRM', 'active');

INSERT INTO organizations (name, status) 
VALUES ('RONA Atlantic', 'active');
```

### Error: "column organization_id does not exist"
**Solution:** Your profiles table might be missing the column:
```sql
-- Add the column
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS organization_id UUID 
REFERENCES organizations(id);
```

### Error: "permission denied"
**Solution:** Make sure you're running this in the Supabase SQL Editor, not in the app. You need database admin permissions.

### Still only seeing yourself after fix
**Solution:** 
1. Did you log out and back in? (THIS IS REQUIRED!)
2. Check browser console (F12) for errors
3. Run `/CHECK_CURRENT_STATE.sql` again to see if data was actually fixed

---

## Troubleshooting Checklist

- [ ] Ran `/FIX_EVERYTHING_NOW_V2.sql` in Supabase SQL Editor
- [ ] Script completed successfully (no errors)
- [ ] Logged out of the application
- [ ] Logged back in
- [ ] Refreshed the Users page (Ctrl+R or Cmd+R)
- [ ] Checked browser console for errors (F12)

---

## Quick Commands for Common Issues

### See what organizations exist:
```sql
SELECT * FROM organizations;
```

### See all users and their orgs:
```sql
SELECT email, organization_id FROM profiles;
```

### Check your own metadata:
```sql
SELECT email, raw_user_meta_data 
FROM auth.users 
WHERE email = 'YOUR_EMAIL_HERE';
```

### Force-fix a specific user's org:
```sql
-- Get RONA Atlantic ID
SELECT id FROM organizations WHERE name = 'RONA Atlantic';

-- Update user (replace USER_EMAIL and ORG_ID)
UPDATE profiles 
SET organization_id = 'ORG_ID_FROM_ABOVE'
WHERE email = 'USER_EMAIL';
```

---

## Summary

```
Problem: Users have "default-org" or invalid UUID values
Solution: Use /FIX_EVERYTHING_NOW_V2.sql
Steps: 
  1. Run script in Supabase
  2. Log out
  3. Log back in
  4. Check Users page
Result: All RONA Atlantic users visible! ✅
```

---

## Need More Help?

1. Run `/CHECK_CURRENT_STATE.sql` 
2. Copy the output
3. Share it along with:
   - The exact error message
   - What step you're on
   - Your user role (admin/super_admin)
