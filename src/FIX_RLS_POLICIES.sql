-- ========================================
-- FIX RLS POLICIES FOR PROFILES TABLE
-- Copy this entire file and paste into Supabase SQL Editor
-- ========================================

-- Step 1: Enable RLS on profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Step 2: Drop ALL existing policies (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles in their organization" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update profiles in organization" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.profiles;
DROP POLICY IF EXISTS "Enable update for users based on id" ON public.profiles;
DROP POLICY IF EXISTS "Enable delete for users based on id" ON public.profiles;

-- Step 3: Create new SELECT policy (READ access for all authenticated users)
CREATE POLICY "Enable read access for authenticated users"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- Step 4: Create UPDATE policy (users can update their own profile)
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Step 5: Create INSERT policy (for new user signups)
CREATE POLICY "Enable insert for authenticated users only"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Step 6: Create DELETE policy (users can delete their own profile)
CREATE POLICY "Enable delete for users based on id"
ON public.profiles
FOR DELETE
TO authenticated
USING (auth.uid() = id);

-- Done! Your RLS policies are now configured.