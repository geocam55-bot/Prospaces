-- =====================================================
-- FIX PERMISSIONS TABLE RLS POLICIES
-- =====================================================
-- This fixes the error: "new row violates row-level security policy"
-- Run this in Supabase SQL Editor
-- =====================================================

-- STEP 1: Drop ALL existing policies on permissions table
-- =====================================================
DO $$ 
DECLARE
  policy_record RECORD;
BEGIN
  FOR policy_record IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'permissions' 
    AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.permissions', policy_record.policyname);
    RAISE NOTICE 'Dropped policy: %', policy_record.policyname;
  END LOOP;
END $$;

-- STEP 2: Ensure RLS is enabled
-- =====================================================
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;

-- STEP 3: Create new policies (READ)
-- =====================================================

-- Everyone can read all permissions
CREATE POLICY "authenticated_users_read_permissions" 
ON public.permissions
FOR SELECT 
TO authenticated
USING (true);

-- STEP 4: Create new policies (INSERT)
-- =====================================================

-- Super Admin and Admin can insert permissions
CREATE POLICY "admins_insert_permissions" 
ON public.permissions
FOR INSERT 
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('super_admin', 'admin')
  )
);

-- STEP 5: Create new policies (UPDATE)
-- =====================================================

-- Super Admin and Admin can update permissions
CREATE POLICY "admins_update_permissions" 
ON public.permissions
FOR UPDATE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('super_admin', 'admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('super_admin', 'admin')
  )
);

-- STEP 6: Create new policies (DELETE)
-- =====================================================

-- Super Admin and Admin can delete permissions
CREATE POLICY "admins_delete_permissions" 
ON public.permissions
FOR DELETE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('super_admin', 'admin')
  )
);

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Show all policies on permissions table
SELECT 
  policyname as "Policy Name",
  cmd as "Operation",
  roles as "Roles",
  CASE 
    WHEN qual IS NOT NULL THEN 'Custom USING clause'
    ELSE 'No USING clause'
  END as "USING",
  CASE 
    WHEN with_check IS NOT NULL THEN 'Custom WITH CHECK clause'
    ELSE 'No WITH CHECK clause'
  END as "WITH CHECK"
FROM pg_policies
WHERE tablename = 'permissions' AND schemaname = 'public'
ORDER BY policyname;

-- Summary
SELECT '✅ PERMISSIONS RLS POLICIES FIXED!' as status;
SELECT '' as spacer;
SELECT '📝 What was fixed:' as info;
SELECT '  1. Dropped all old conflicting policies' as step;
SELECT '  2. Created separate policies for SELECT, INSERT, UPDATE, DELETE' as step;
SELECT '  3. Super Admin and Admin can now modify permissions' as step;
SELECT '  4. All users can read permissions' as step;
SELECT '' as spacer;
SELECT '🧪 Test now: Go to ProSpaces → Settings → Permissions Manager' as instruction;
