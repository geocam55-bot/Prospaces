-- ============================================================================
-- COMPLETE MIGRATION: Admin Permissions + Contact Fields
-- ============================================================================
-- Run this entire file in your Supabase SQL Editor
-- ============================================================================

-- PART 1: Fix Admin Permissions Policy
-- ============================================================================
-- Drop all existing policies to avoid conflicts
DROP POLICY IF EXISTS "superadmins_manage_permissions" ON public.permissions;
DROP POLICY IF EXISTS "admins_manage_permissions" ON public.permissions;

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

-- PART 2: Add Contact Sales and Financial Fields
-- ============================================================================
-- Add all new fields to contacts table
-- PTD = Period To Date, YTD = Year To Date, LYR = Last Year, GP% = Gross Profit Percentage

ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS owner_id UUID,
ADD COLUMN IF NOT EXISTS price_level TEXT DEFAULT 'tier1',
ADD COLUMN IF NOT EXISTS created_by UUID,
ADD COLUMN IF NOT EXISTS legacy_number TEXT,
ADD COLUMN IF NOT EXISTS account_owner_number TEXT,
ADD COLUMN IF NOT EXISTS ptd_sales NUMERIC(15, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS ptd_gp_percent NUMERIC(5, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS ytd_sales NUMERIC(15, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS ytd_gp_percent NUMERIC(5, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS lyr_sales NUMERIC(15, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS lyr_gp_percent NUMERIC(5, 2) DEFAULT 0;

-- Add comments to document the fields
COMMENT ON COLUMN contacts.address IS 'Contact mailing address';
COMMENT ON COLUMN contacts.notes IS 'Additional notes about the contact';
COMMENT ON COLUMN contacts.owner_id IS 'User ID of the contact owner';
COMMENT ON COLUMN contacts.price_level IS 'Price tier level (tier1-tier5)';
COMMENT ON COLUMN contacts.created_by IS 'User ID who created this contact';
COMMENT ON COLUMN contacts.legacy_number IS 'Legacy system customer number';
COMMENT ON COLUMN contacts.account_owner_number IS 'Account owner identifier number';
COMMENT ON COLUMN contacts.ptd_sales IS 'Period To Date Sales';
COMMENT ON COLUMN contacts.ptd_gp_percent IS 'Period To Date Gross Profit Percentage';
COMMENT ON COLUMN contacts.ytd_sales IS 'Year To Date Sales';
COMMENT ON COLUMN contacts.ytd_gp_percent IS 'Year To Date Gross Profit Percentage';
COMMENT ON COLUMN contacts.lyr_sales IS 'Last Year Sales';
COMMENT ON COLUMN contacts.lyr_gp_percent IS 'Last Year Gross Profit Percentage';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify permissions policy
SELECT schemaname, tablename, policyname, roles, cmd
FROM pg_policies
WHERE tablename = 'permissions';

-- Verify contacts table has new columns
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'contacts'
AND column_name IN (
  'address', 
  'notes', 
  'owner_id', 
  'price_level', 
  'created_by', 
  'legacy_number', 
  'account_owner_number',
  'ptd_sales', 
  'ptd_gp_percent', 
  'ytd_sales', 
  'ytd_gp_percent', 
  'lyr_sales', 
  'lyr_gp_percent'
)
ORDER BY column_name;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
