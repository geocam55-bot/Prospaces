-- =====================================================
-- FIX RLS POLICIES FOR organization_settings
-- =====================================================
-- This script fixes the RLS policies that are blocking saves
-- Run this in your Supabase SQL Editor
-- =====================================================

-- Drop existing policies first to avoid conflicts
DROP POLICY IF EXISTS "Users can view org settings" ON organization_settings;
DROP POLICY IF EXISTS "Admins can insert org settings" ON organization_settings;
DROP POLICY IF EXISTS "Admins can update org settings" ON organization_settings;
DROP POLICY IF EXISTS "Super Admins can delete org settings" ON organization_settings;

-- Policy: Users can view settings for their organization
CREATE POLICY "Users can view org settings" ON organization_settings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.organization_id = organization_settings.organization_id
    )
  );

-- Policy: Admins and Super Admins can insert organization settings
CREATE POLICY "Admins can insert org settings" ON organization_settings
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.organization_id = organization_settings.organization_id
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- Policy: Admins and Super Admins can update organization settings
CREATE POLICY "Admins can update org settings" ON organization_settings
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.organization_id = organization_settings.organization_id
      AND profiles.role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.organization_id = organization_settings.organization_id
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- Policy: Super Admins can delete organization settings
CREATE POLICY "Super Admins can delete org settings" ON organization_settings
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'super_admin'
    )
  );

-- =====================================================
-- VERIFY YOUR USER'S ROLE
-- =====================================================
-- Run this query to check your user's role and organization:
-- 
-- SELECT 
--   id,
--   email,
--   name,
--   role,
--   organization_id
-- FROM profiles
-- WHERE id = auth.uid();
--
-- Make sure your role is 'admin' or 'super_admin'
-- =====================================================
