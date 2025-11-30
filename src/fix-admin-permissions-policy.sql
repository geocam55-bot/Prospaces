-- ============================================================================
-- FIX: Allow Admin users to manage role permissions
-- ============================================================================
-- This script updates the RLS policies on the permissions table to allow
-- both super_admin AND admin roles to manage permissions.
-- 
-- Run this in your Supabase SQL Editor
-- ============================================================================

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "superadmins_manage_permissions" ON public.permissions;

-- Create a new policy that allows both super_admin and admin to manage permissions
CREATE POLICY "admins_manage_permissions" ON public.permissions
  FOR ALL TO authenticated
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

-- Verify the policy was created
SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'permissions';
