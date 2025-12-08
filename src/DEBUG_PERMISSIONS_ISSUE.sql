-- =====================================================
-- DEBUG: Permissions RLS Issue
-- =====================================================
-- Run this to see what's wrong with your setup
-- =====================================================

-- 1. Check if you're logged in and have a profile
-- =====================================================
SELECT 
  'Current User Check' as section,
  auth.uid() as your_user_id,
  (SELECT email FROM profiles WHERE id = auth.uid()) as your_email,
  (SELECT role FROM profiles WHERE id = auth.uid()) as your_role;

-- If your_role is NULL, you don't have a profile! That's the problem.
-- If your_role is 'user', you need to be 'admin' or 'super_admin'

-- 2. Check current RLS policies on permissions table
-- =====================================================
SELECT 
  'Current Policies' as section,
  policyname as policy_name,
  cmd as operation,
  CASE 
    WHEN qual::text LIKE '%super_admin%' AND qual::text NOT LIKE '%admin''%' 
    THEN '⚠️ ONLY super_admin (too restrictive!)'
    WHEN qual::text LIKE '%admin%' 
    THEN '✅ Allows admin + super_admin'
    ELSE 'Other condition'
  END as who_can_use
FROM pg_policies
WHERE tablename = 'permissions' AND schemaname = 'public'
ORDER BY cmd, policyname;

-- 3. Check if permissions table has RLS enabled
-- =====================================================
SELECT 
  'RLS Status' as section,
  tablename,
  CASE 
    WHEN rowsecurity THEN '✅ RLS Enabled'
    ELSE '❌ RLS Disabled'
  END as status
FROM pg_tables
WHERE tablename = 'permissions' AND schemaname = 'public';

-- 4. Test if current user can insert
-- =====================================================
DO $$
BEGIN
  -- Try to check if policy would allow insert
  IF EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('super_admin', 'admin')
  ) THEN
    RAISE NOTICE '✅ Your role should allow INSERT/UPDATE/DELETE';
  ELSE
    RAISE NOTICE '❌ Your role is not admin or super_admin - cannot save permissions';
    RAISE NOTICE 'Current role: %', (SELECT role FROM profiles WHERE id = auth.uid());
  END IF;
END $$;

-- 5. Summary and recommendations
-- =====================================================
SELECT 
  CASE
    WHEN auth.uid() IS NULL THEN 
      '❌ NOT LOGGED IN - Please log in first'
    WHEN NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()) THEN
      '❌ NO PROFILE - Run profile creation script'
    WHEN (SELECT role FROM profiles WHERE id = auth.uid()) NOT IN ('admin', 'super_admin') THEN
      '❌ INSUFFICIENT ROLE - You need admin or super_admin role'
    WHEN NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'permissions' 
      AND cmd IN ('INSERT', 'UPDATE') 
      AND schemaname = 'public'
    ) THEN
      '❌ MISSING POLICIES - Run /FIX_PERMISSIONS_RLS.sql'
    ELSE
      '✅ Everything looks good - policies might be too restrictive'
  END as diagnosis;

-- 6. Quick fix recommendation
-- =====================================================
SELECT 
  CASE
    WHEN auth.uid() IS NULL THEN 
      'ACTION: Log in to ProSpaces CRM'
    WHEN NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()) THEN
      'ACTION: Create your profile or run database setup'
    WHEN (SELECT role FROM profiles WHERE id = auth.uid()) NOT IN ('admin', 'super_admin') THEN
      'ACTION: Update your role to admin or super_admin'
    ELSE
      'ACTION: Run /FIX_PERMISSIONS_RLS.sql to fix policies'
  END as recommended_action;
