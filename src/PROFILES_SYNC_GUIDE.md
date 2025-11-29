# Profiles Table Sync Guide

## 🔍 The Problem

Your ProSpaces CRM has users in the `auth.users` table (Supabase's authentication system), but they're not appearing in the `profiles` table that the application uses. This creates a disconnect where authenticated users exist but can't be managed in the Users interface.

## 📊 Current State

- ✅ Users exist in `auth.users` (Supabase's auth system)
- ❌ Users are NOT synced to `profiles` table (your app's user management)
- ⚠️ Only the currently logged-in user appears (if at all)

## 🎯 Solution

We've created a new **Profiles Sync Fixer** tool that will help you diagnose and fix this issue automatically.

### Using the Profiles Sync Fixer

1. **Navigate to Users Page**
   - Log in to your ProSpaces CRM
   - Go to the "Users" page in the navigation menu
   
2. **Run the Diagnostic**
   - You should see a blue card titled "Profiles Table Sync Tool" at the top
   - Click the **"Run Full Diagnostic"** button
   - The tool will check:
     - Your authentication status
     - If the profiles table exists
     - How many profiles are in the database
     - Which profiles are visible to you
     - RLS (Row Level Security) policy status

3. **Review the Results**
   - The diagnostic will show you exactly what's wrong
   - Each check will be marked as:
     - ✅ **Success** (green) - Everything is working
     - ⚠️ **Warning** (yellow) - Needs attention
     - ❌ **Error** (red) - Critical issue

4. **Apply the Fix**
   - If issues are detected, the tool will automatically show you the SQL script
   - Click **"Copy SQL"** to copy the fix script
   - Click **"Open SQL Editor"** to open Supabase in a new tab
   - Paste the SQL script and click **"Run"** (or press F5)
   - Come back to the app and click **"Refresh Users List"**

## 🛠️ What the SQL Script Does

The comprehensive SQL fix performs these actions:

1. **Creates the profiles table** (if it doesn't exist)
2. **Adds proper indexes** for performance
3. **Enables Row Level Security (RLS)**
4. **Drops all conflicting policies** to start fresh
5. **Creates new, simplified RLS policies** that work correctly:
   - Users can view their own profile
   - Users can view profiles in their organization
   - Super admins can view all profiles
   - Proper insert/update/delete permissions
6. **Creates a trigger function** that auto-syncs new users
7. **Syncs ALL existing users** from auth.users to profiles
8. **Verifies the results** with a summary query

## 🔧 Manual Alternative

If you prefer to run the SQL manually without using the tool:

1. Copy the SQL script from below
2. Go to: https://supabase.com/dashboard/project/_/sql/new
3. Paste and run the script

<details>
<summary>Click to view the complete SQL script</summary>

```sql
-- ================================================
-- ProSpaces CRM - Complete Profiles Table Fix
-- This script will create/fix the profiles table and sync all users
-- ================================================

-- Step 1: Create profiles table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  name text,
  role text NOT NULL DEFAULT 'standard_user',
  organization_id uuid,  -- Changed to UUID for consistency
  status text DEFAULT 'active',
  last_login timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Step 2: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_organization_id ON public.profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- Step 3: Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Step 4: Drop ALL existing policies to start fresh
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view organization profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update organization profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert organization profiles" ON public.profiles;
DROP POLICY IF EXISTS "Super admins can delete profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view org profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all org profiles" ON public.profiles;
DROP POLICY IF EXISTS "Super admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert org profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update org profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete org profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON public.profiles;

-- Step 5: Create new, simplified RLS policies

-- Allow users to view their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Allow users to view profiles in their organization
CREATE POLICY "Users can view org profiles"
  ON public.profiles FOR SELECT
  USING (
    organization_id IS NOT NULL 
    AND organization_id::text = (
      SELECT raw_user_meta_data->>'organizationId' 
      FROM auth.users 
      WHERE id = auth.uid()
    )
  );

-- Allow super admins to view all profiles
CREATE POLICY "Super admins can view all"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND raw_user_meta_data->>'role' = 'super_admin'
    )
  );

-- Allow users to insert their own profile
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow admins to manage profiles in their organization
CREATE POLICY "Admins can manage org profiles"
  ON public.profiles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = auth.uid()
      AND u.raw_user_meta_data->>'role' IN ('admin', 'super_admin')
      AND (
        u.raw_user_meta_data->>'role' = 'super_admin'
        OR (
          organization_id IS NOT NULL
          AND organization_id::text = u.raw_user_meta_data->>'organizationId'
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = auth.uid()
      AND u.raw_user_meta_data->>'role' IN ('admin', 'super_admin')
      AND (
        u.raw_user_meta_data->>'role' = 'super_admin'
        OR (
          organization_id IS NOT NULL
          AND organization_id::text = u.raw_user_meta_data->>'organizationId'
        )
      )
    )
  );

-- Step 6: Create/replace the trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role, organization_id, status, last_login, created_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'standard_user'),
    (NEW.raw_user_meta_data->>'organizationId')::uuid,
    'active',
    NEW.last_sign_in_at,
    NEW.created_at
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, public.profiles.name),
    role = COALESCE(EXCLUDED.role, public.profiles.role),
    organization_id = COALESCE(EXCLUDED.organization_id, public.profiles.organization_id),
    last_login = EXCLUDED.last_login,
    updated_at = now();
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the user creation
    RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Step 7: Create the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Step 8: Sync existing users from auth.users to profiles
-- This uses INSERT ... ON CONFLICT to be safe (won't duplicate)
INSERT INTO public.profiles (id, email, name, role, organization_id, status, last_login, created_at)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'name', au.email) as name,
  COALESCE(au.raw_user_meta_data->>'role', 'standard_user') as role,
  (au.raw_user_meta_data->>'organizationId')::uuid as organization_id,
  'active' as status,
  au.last_sign_in_at as last_login,
  au.created_at
FROM auth.users au
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  name = COALESCE(EXCLUDED.name, public.profiles.name),
  last_login = EXCLUDED.last_login,
  updated_at = now();

-- Step 9: Verify the results
SELECT 
  'Profiles sync complete!' as message,
  COUNT(*) as total_profiles,
  COUNT(DISTINCT organization_id) as total_organizations,
  COUNT(CASE WHEN role = 'super_admin' THEN 1 END) as super_admins,
  COUNT(CASE WHEN role = 'admin' THEN 1 END) as admins,
  COUNT(CASE WHEN role = 'standard_user' THEN 1 END) as standard_users
FROM public.profiles;
```

</details>

## ✅ Verification

After running the SQL script, you should see:

1. A success message in Supabase showing:
   - Total number of profiles synced
   - Number of organizations
   - Breakdown by role (super_admin, admin, standard_user)

2. In the ProSpaces CRM app:
   - Click "Refresh Users List"
   - All users should now appear in the Users page
   - The blue diagnostic card should disappear
   - A success toast should show: "Loaded X users successfully!"

## 🐛 Troubleshooting

### Still not seeing users?

1. **Check organization_id mismatch**
   - Run the diagnostic again
   - Check if your user's `organizationId` matches the profiles in the database
   - Super admins should see all users regardless

2. **Check RLS policies**
   - The diagnostic will show if RLS is blocking queries
   - Re-run the SQL script to reset all policies

3. **Check auth.users**
   - Go to Supabase > Authentication > Users
   - Verify users actually exist there
   - If not, users haven't signed up yet

4. **Check browser console**
   - Open Developer Tools (F12)
   - Look for errors in the Console tab
   - Common errors:
     - `relation "profiles" does not exist` → Run the SQL script
     - `permission denied for table profiles` → RLS policy issue, re-run SQL
     - `null value in column "organization_id"` → User metadata is missing

## 📞 Need Help?

If you're still experiencing issues after following this guide:

1. Run the full diagnostic and take a screenshot of the results
2. Check the browser console for errors
3. Verify you have the correct Supabase project selected
4. Make sure you're logged in as a super_admin or admin user

## 🎉 Success Criteria

You'll know everything is working when:

- ✅ The diagnostic shows all green checkmarks
- ✅ All users appear in the Users page
- ✅ The sync tool card is no longer shown
- ✅ You can search and filter users
- ✅ Role-based permissions are working correctly
