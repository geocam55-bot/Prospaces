-- ============================================================================
-- FIX USERS RLS POLICIES
-- ============================================================================
-- This script fixes the Row Level Security policies on the profiles table
-- to ensure admins can see all users in their organization.
-- 
-- PROBLEM: The current RLS policies check auth.users.raw_user_meta_data->>'organizationId'
-- but this metadata is not always set correctly. Users' organization_id exists in 
-- the profiles table, but the RLS policy was checking the wrong place.
-- 
-- SOLUTION: Update the RLS policies to check the organization_id from the profiles
-- table directly, using a self-join approach.
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view organization profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update organization profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert organization profiles" ON public.profiles;
DROP POLICY IF EXISTS "Super admins can delete profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;

-- Create improved policies

-- Policy 1: Users can view their own profile
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

-- Policy 2: Admins and Super Admins can view profiles in their organization
-- This policy checks the current user's profile to get their role and organization
CREATE POLICY "Admins can view organization profiles"
ON public.profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles AS current_user_profile
    WHERE current_user_profile.id = auth.uid()
    AND (
      current_user_profile.role = 'admin'
      OR current_user_profile.role = 'super_admin'
    )
    AND (
      current_user_profile.role = 'super_admin'  -- super_admin can see all orgs
      OR current_user_profile.organization_id = profiles.organization_id  -- admin sees their org
    )
  )
);

-- Policy 3: Users can update their own profile
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id);

-- Policy 4: Admins and Super Admins can update profiles in their organization
CREATE POLICY "Admins can update organization profiles"
ON public.profiles FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles AS current_user_profile
    WHERE current_user_profile.id = auth.uid()
    AND (
      current_user_profile.role = 'admin'
      OR current_user_profile.role = 'super_admin'
    )
    AND (
      current_user_profile.role = 'super_admin'  -- super_admin can update all orgs
      OR current_user_profile.organization_id = profiles.organization_id  -- admin updates their org
    )
  )
);

-- Policy 5: Admins and Super Admins can insert profiles in their organization
CREATE POLICY "Admins can insert organization profiles"
ON public.profiles FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles AS current_user_profile
    WHERE current_user_profile.id = auth.uid()
    AND (
      current_user_profile.role = 'admin'
      OR current_user_profile.role = 'super_admin'
    )
    AND (
      current_user_profile.role = 'super_admin'  -- super_admin can insert to any org
      OR current_user_profile.organization_id = organization_id  -- admin inserts to their org
    )
  )
);

-- Policy 6: Super Admins and Admins can delete profiles
CREATE POLICY "Admins can delete profiles"
ON public.profiles FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles AS current_user_profile
    WHERE current_user_profile.id = auth.uid()
    AND (
      current_user_profile.role = 'admin'
      OR current_user_profile.role = 'super_admin'
    )
    AND (
      current_user_profile.role = 'super_admin'  -- super_admin can delete from all orgs
      OR current_user_profile.organization_id = profiles.organization_id  -- admin deletes from their org
    )
  )
);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these queries after applying the migration to verify it worked:

-- 1. Check that the policies were created successfully
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
-- FROM pg_policies 
-- WHERE tablename = 'profiles' 
-- ORDER BY policyname;

-- 2. Verify that all users in your organization have the correct organization_id
-- SELECT id, email, name, role, organization_id 
-- FROM public.profiles 
-- ORDER BY organization_id, email;

-- 3. Test that you can see users in your organization
-- SELECT id, email, name, role, organization_id 
-- FROM public.profiles 
-- WHERE organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
-- ORDER BY email;

-- ============================================================================
-- NEXT STEPS
-- ============================================================================
-- 1. Run this script in your Supabase SQL Editor
-- 2. Refresh the Users page in your application
-- 3. You should now see all users in your organization
-- 4. If you still don't see users, check the verification queries above
