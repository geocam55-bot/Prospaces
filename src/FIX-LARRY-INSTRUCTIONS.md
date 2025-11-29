# Fix Larry's Authentication

## Problem
Larry has a profile in the database but no auth.users record, so he cannot sign in.

## Solution Options

### ✅ Option 1: Use Supabase Dashboard (RECOMMENDED - Easiest)

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Navigate to: **Authentication → Users**
3. Click **"Add user"** button
4. Fill in the form:
   - **Email**: `larry.lee@ronaatlantic.ca`
   - **Password**: `TempPassword123!` (or any password you prefer)
   - **Auto Confirm User**: ✅ **CHECK THIS BOX** (important!)
5. Click **"Create user"**
6. Copy the new user's UUID (it will be displayed)
7. Go to **Table Editor → profiles table**
8. Find Larry's profile row (email: larry.lee@ronaatlantic.ca)
9. Edit the `id` field and paste the new auth user UUID
10. Save the changes

Done! Larry can now sign in with:
- Email: `larry.lee@ronaatlantic.ca`
- Password: `TempPassword123!`

---

### Option 2: Use SQL (Advanced)

1. Go to: **SQL Editor** in Supabase
2. Create user through dashboard first (see Option 1, steps 1-6)
3. Run this SQL (replace `NEW_AUTH_USER_ID` with the UUID from step 2):

```sql
-- Update profile to use the new auth user ID
UPDATE profiles 
SET id = 'NEW_AUTH_USER_ID'  -- Replace with actual UUID
WHERE email = 'larry.lee@ronaatlantic.ca';

-- Verify it worked
SELECT 
  au.id as auth_id,
  au.email as auth_email,
  p.id as profile_id,
  p.email as profile_email,
  p.name,
  p.role
FROM auth.users au
INNER JOIN profiles p ON au.id = p.id
WHERE au.email = 'larry.lee@ronaatlantic.ca';
```

---

### Option 3: Create New Test User (Fastest for Testing)

If you just need to test the Manager Dashboard quickly:

1. Go to **Sign Up** page in your app
2. Create a new user:
   - Use your organization's invitation code
   - Email: `larry2@test.com`
   - Password: anything
   - Name: `Larry Lee`
3. After sign up, go to **Table Editor → profiles**
4. Find the new user's profile
5. Update these fields:
   - `role`: `standard_user`
   - `manager_id`: (Matt's user ID: `edaf5c33-06a7-473b-81c5-70e10622cdc4`)
6. Create some test bids as this new user
7. Test the Manager Dashboard with Matt's account

---

## Verification

After fixing, verify Larry can sign in:

1. Go to sign-in page
2. Email: `larry.lee@ronaatlantic.ca`
3. Password: `TempPassword123!` (or whatever you set)
4. Should successfully sign in

Then verify the Manager Dashboard:
1. Sign in as Matt (the manager)
2. Go to Manager Dashboard
3. Select Larry from the team list
4. Should see all of Larry's data

---

## Current Database Status

Based on our investigation:
- ✅ Larry's profile exists in `profiles` table
- ❌ Larry's auth record is missing from `auth.users`
- ✅ Larry's `manager_id` is correctly set to Matt's ID
- ✅ Only 2 bids exist in the database (both created by Larry)
  - "Roof Trusses" - submitted
  - "Kohtech Windows & Doors" - accepted

The 4 bids you mentioned seeing earlier might have been:
- Mock data from testing
- Quotes from the `quotes` table (not `bids` table)
- Data that was deleted or in a different environment
