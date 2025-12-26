-- =====================================================
-- COMPREHENSIVE FIX FOR organization_settings RLS
-- =====================================================
-- This version ensures admins can properly upsert settings
-- Run this in your Supabase SQL Editor
-- =====================================================

-- Step 1: Drop ALL existing policies
DROP POLICY IF EXISTS "Users can view org settings" ON organization_settings;
DROP POLICY IF EXISTS "Admins can insert org settings" ON organization_settings;
DROP POLICY IF EXISTS "Admins can update org settings" ON organization_settings;
DROP POLICY IF EXISTS "Super Admins can delete org settings" ON organization_settings;

-- Step 2: Enable RLS (if not already enabled)
ALTER TABLE organization_settings ENABLE ROW LEVEL SECURITY;

-- Step 3: Create comprehensive policies

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
-- CRITICAL FIX: Must check BOTH the USING clause (which row) and WITH CHECK (new values)
CREATE POLICY "Admins can update org settings" ON organization_settings
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
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
-- VERIFICATION & DIAGNOSTICS
-- =====================================================

-- Check your current user's profile and role:
SELECT 
  id,
  name,
  email,
  role,
  organization_id
FROM profiles
WHERE id = auth.uid();

-- Check existing organization settings:
SELECT * FROM organization_settings;

-- Check if there are any organization settings for your org:
SELECT os.* 
FROM organization_settings os
JOIN profiles p ON p.organization_id = os.organization_id
WHERE p.id = auth.uid();

-- =====================================================
-- TROUBLESHOOTING
-- =====================================================
-- If you still get RLS errors:
-- 
-- 1. Make sure your user has role 'admin' or 'super_admin' in profiles table
-- 2. Check localStorage in browser console:
--    console.log(JSON.parse(localStorage.getItem('user')))
-- 3. If role is missing, update it:
--    UPDATE profiles SET role = 'super_admin' WHERE id = auth.uid();
-- 4. Sign out and sign back in to refresh the session
-- =====================================================
