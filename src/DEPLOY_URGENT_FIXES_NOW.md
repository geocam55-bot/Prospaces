# 🚨 URGENT: Deploy Database Fixes Now

## Critical Issues Being Fixed

1. ❌ **Error 42501**: Permission denied for table users (blocking user sign-in/sign-up)
2. ❌ **Error 400**: Missing `legacy_number` column (blocking CSV imports)
3. ❌ **Error 403**: Restrictive RLS policies (blocking profile access)

## ✅ Solution Ready

All fixes are in the file: `/URGENT_DATABASE_FIXES.sql`

## 📋 Deployment Steps

### Step 1: Open Supabase SQL Editor

1. Go to your Supabase project dashboard
2. Click on **"SQL Editor"** in the left sidebar
3. Click **"New query"** button

### Step 2: Copy and Execute the Fix

1. Open the file `/URGENT_DATABASE_FIXES.sql` from your project
2. **Copy the ENTIRE contents** of the file (all 278 lines)
3. **Paste** it into the Supabase SQL Editor
4. Click **"Run"** or press `Ctrl+Enter` (Windows) / `Cmd+Enter` (Mac)

### Step 3: Verify the Fixes

After running the SQL, you'll see verification queries at the bottom showing:
- ✅ `legacy_number` column added to contacts table
- ✅ RLS policies fixed on profiles table
- ✅ RLS policies fixed on organizations table
- ✅ `handle_new_user()` function updated (no longer references 'users' table)

## 🔍 What Gets Fixed

### Fix 1: Add `legacy_number` column to contacts
```sql
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS legacy_number TEXT;
```
- Enables CSV import to match existing contacts by legacy number
- Adds index for faster lookups

### Fix 2: Fix RLS policies on profiles table
- Removes restrictive policies blocking profile reads/writes
- Adds proper policies for:
  - ✅ Users can read/update own profile
  - ✅ Users can insert own profile
  - ✅ Super admins can read/update all profiles

### Fix 3: Fix `handle_new_user()` function
- **CRITICAL**: Removes reference to non-existent `users` table
- This was causing the **42501 permission denied** error
- Now correctly inserts into `profiles` table only
- Auto-creates organization for new users
- Has error handling to not block user creation

### Fix 4: Fix organizations table RLS
- Allows authenticated users to insert organizations (for auto-creation)
- Users can read their own organization
- Admins can update their organization
- Super admins can read all organizations

### Fix 5: Grant necessary permissions
```sql
GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT SELECT, INSERT, UPDATE ON profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON organizations TO authenticated;
GRANT SELECT ON auth.users TO authenticated;
```
- Ensures users have proper permissions to create profiles

### Fix 6: Fix contacts table RLS for import
- Allows users to insert/update contacts in their organization
- Critical for CSV import functionality

## ⚡ Expected Results

After running this SQL:

### For User Sign-In/Sign-Up:
- ✅ New users can sign up without errors
- ✅ Existing users can sign in without profile errors
- ✅ Auto-creation of organizations works
- ✅ Auto-creation of profiles works
- ✅ No more "permission denied for table users" errors

### For CSV Import:
- ✅ Contacts can be imported
- ✅ Legacy numbers can be matched
- ✅ No more 400 errors during import

### For Profile Access:
- ✅ Users can read their own profile
- ✅ Users can update their own profile
- ✅ No more 403 forbidden errors

## 🧪 Testing After Deployment

### Test 1: Try to Sign In
1. Go to your app's login page
2. Try signing in with an existing account
3. ✅ Should work without errors

### Test 2: Try to Sign Up (if enabled)
1. Go to your app's sign-up page
2. Create a new account
3. ✅ Should create user + profile + organization without errors

### Test 3: Try CSV Import
1. Go to your app's import page
2. Try importing a CSV file with contacts
3. ✅ Should work without 400 errors

## 🔧 Troubleshooting

### If you still see errors after running the SQL:

#### Error: "permission denied for table users"
- **Solution**: Make sure the entire SQL script ran successfully
- Check that the `handle_new_user()` function was updated
- Run this verification query:
  ```sql
  SELECT routine_name, routine_definition 
  FROM information_schema.routines 
  WHERE routine_schema = 'public' 
  AND routine_name = 'handle_new_user';
  ```
- The function definition should NOT contain any reference to a `users` table (only `profiles`)

#### Error: Still can't create profiles
- **Solution**: Check RLS policies on profiles table
- Run this verification query:
  ```sql
  SELECT policyname, cmd, qual
  FROM pg_policies 
  WHERE tablename = 'profiles';
  ```
- You should see policies like "Enable insert for authenticated users on own profile"

#### Error: CSV import still failing
- **Solution**: Verify the legacy_number column exists
- Run this verification query:
  ```sql
  SELECT column_name, data_type 
  FROM information_schema.columns 
  WHERE table_name = 'contacts' 
  AND column_name = 'legacy_number';
  ```
- Should return one row showing the column exists

## 📝 Additional Notes

### Safe to Run Multiple Times
All statements use `IF EXISTS` or `IF NOT EXISTS`, so it's safe to run this script multiple times without causing errors.

### No Data Loss
This script only:
- Adds a new column (doesn't delete data)
- Updates policies (doesn't delete data)
- Updates a function (doesn't delete data)
- Grants permissions (doesn't revoke existing permissions)

### Maintains Security
All RLS policies maintain multi-tenant security:
- Users can only access their own organization's data
- Super admins have elevated access
- No security compromises

## 🎯 Next Steps After Fix

Once the SQL is deployed:

1. **Test Login** - Try signing in with an existing account
2. **Test Sign Up** - Try creating a new account (if enabled)
3. **Test CSV Import** - Try importing contacts from a CSV file
4. **Monitor Logs** - Check browser console for any remaining errors
5. **Verify Profiles** - Check that all users have proper profiles in Supabase

## 📞 Support

If you still encounter issues after deploying these fixes:

1. Check the browser console for specific error messages
2. Check Supabase logs for server-side errors
3. Run the verification queries included in the SQL file
4. Provide the exact error code and message for further assistance

---

## 🚀 Quick Start (TL;DR)

1. Open Supabase SQL Editor
2. Copy ALL of `/URGENT_DATABASE_FIXES.sql`
3. Paste into SQL Editor
4. Click "Run"
5. ✅ Done! Test your app

---

**File**: `/URGENT_DATABASE_FIXES.sql`
**Lines**: 278
**Estimated Execution Time**: 2-5 seconds
**Downtime**: None (safe to run on production)
