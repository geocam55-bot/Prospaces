-- =====================================================
-- FIXED RLS POLICIES FOR organization_settings
-- =====================================================
-- This version uses a simpler approach that works better
-- with Supabase's RLS engine
-- =====================================================

-- Drop ALL existing policies
DROP POLICY IF EXISTS "Users can view org settings" ON organization_settings;
DROP POLICY IF EXISTS "Admins can insert org settings" ON organization_settings;
DROP POLICY IF EXISTS "Admins can update org settings" ON organization_settings;
DROP POLICY IF EXISTS "Super Admins can delete org settings" ON organization_settings;

-- Policy 1: Users can view settings for their organization
CREATE POLICY "Users can view org settings" ON organization_settings
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Policy 2: Admins can insert settings for their organization only
CREATE POLICY "Admins can insert org settings" ON organization_settings
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id 
      FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

-- Policy 3: Admins can update settings for their organization only
CREATE POLICY "Admins can update org settings" ON organization_settings
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

-- Policy 4: Super Admins can delete settings
CREATE POLICY "Super Admins can delete org settings" ON organization_settings
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'super_admin'
    )
  );

-- =====================================================
-- VERIFICATION QUERIES (Run these AFTER the policies)
-- =====================================================

-- First, check if you have any organization settings:
-- SELECT * FROM organization_settings;

-- Then check your user profile IN THE WEB APP CONSOLE:
-- Open your ProSpaces CRM app
-- Open browser console (F12)
-- Run: console.log(JSON.parse(localStorage.getItem('user')))
-- Make sure you see role: 'admin' or 'super_admin'
