-- ========================================
-- COMPLETE FIX FOR PROSPACES CRM
-- This script does EVERYTHING:
-- 1. Fixes RLS policies
-- 2. Creates auto-sync trigger for new users
-- 3. Syncs ALL existing auth users to profiles
-- ========================================

-- STEP 1: Drop ALL existing policies
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles in their organization" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update profiles in organization" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.profiles;
DROP POLICY IF EXISTS "Enable update for users based on id" ON public.profiles;
DROP POLICY IF EXISTS "Enable delete for users based on id" ON public.profiles;

-- STEP 2: Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- STEP 3: Create simple, permissive policies
CREATE POLICY "Allow all authenticated users to read profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow all authenticated users to insert profiles"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow users to update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Allow users to delete own profile"
ON public.profiles
FOR DELETE
TO authenticated
USING (auth.uid() = id);

-- STEP 4: Create function to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, organization_id, created_at, updated_at)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    'user',
    gen_random_uuid(),
    now(),
    now()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 5: Drop existing trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- STEP 6: Create trigger on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- STEP 7: Sync ALL existing auth users to profiles (THIS IS THE KEY PART!)
INSERT INTO public.profiles (id, email, full_name, role, organization_id, created_at, updated_at)
SELECT 
  id,
  email,
  COALESCE(raw_user_meta_data->>'full_name', split_part(email, '@', 1)),
  CASE 
    WHEN NOT EXISTS (SELECT 1 FROM public.profiles) THEN 'admin'  -- First user is admin
    ELSE 'user'
  END,
  COALESCE(
    (SELECT organization_id FROM public.profiles LIMIT 1),  -- Use existing org if available
    gen_random_uuid()  -- Otherwise create new org
  ),
  created_at,
  created_at
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- DONE! Check how many users were synced:
SELECT COUNT(*) as total_profiles FROM public.profiles;
