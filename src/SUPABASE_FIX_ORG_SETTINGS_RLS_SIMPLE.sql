-- =====================================================
-- SIMPLE & RELIABLE RLS FIX FOR organization_settings
-- =====================================================
-- This uses a simpler, more reliable approach
-- Run this in your Supabase SQL Editor
-- =====================================================

-- Step 1: Drop ALL existing policies
DROP POLICY IF EXISTS "Users can view org settings" ON organization_settings;
DROP POLICY IF EXISTS "Admins can insert org settings" ON organization_settings;
DROP POLICY IF EXISTS "Admins can update org settings" ON organization_settings;
DROP POLICY IF EXISTS "Super Admins can delete org settings" ON organization_settings;

-- Step 2: Enable RLS
ALTER TABLE organization_settings ENABLE ROW LEVEL SECURITY;

-- Step 3: Create simple, working policies

-- Policy 1: Users can SELECT their org's settings
CREATE POLICY "Users can view org settings" ON organization_settings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.organization_id = organization_settings.organization_id
    )
  );

-- Policy 2: Admins can INSERT for their org
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

-- Policy 3: Admins can UPDATE their org's settings
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

-- Policy 4: Super Admins can DELETE
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
-- VERIFICATION
-- =====================================================

-- Run these to verify everything works:

-- 1. Check your profile:
SELECT id, name, email, role, organization_id FROM profiles WHERE id = auth.uid();

-- 2. Check existing settings:
SELECT * FROM organization_settings;

-- 3. Test if you can see your org's settings:
SELECT os.* 
FROM organization_settings os
JOIN profiles p ON p.organization_id = os.organization_id
WHERE p.id = auth.uid();

-- =====================================================
-- If you STILL get errors after running this:
-- =====================================================
-- Try creating initial settings manually:

-- First, get your organization_id:
-- SELECT organization_id FROM profiles WHERE id = auth.uid();

-- Then insert initial settings (replace YOUR_ORG_ID with actual ID):
-- INSERT INTO organization_settings (organization_id, tax_rate, tax_rate_2, default_price_level, quote_terms)
-- VALUES ('YOUR_ORG_ID', 0, 0, 'tier1', 'Net 30')
-- ON CONFLICT (organization_id) DO NOTHING;
