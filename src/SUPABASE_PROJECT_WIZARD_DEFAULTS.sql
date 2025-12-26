-- =====================================================
-- SUPABASE PROJECT WIZARD DEFAULTS SQL SCRIPT
-- =====================================================
-- This script creates the table for storing project wizard 
-- default material selections from inventory.
--
-- Run this script in your Supabase SQL Editor to create the table.
-- =====================================================

-- Table: project_wizard_defaults
-- Stores organization-level default materials for each project wizard planner
CREATE TABLE IF NOT EXISTS project_wizard_defaults (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  planner_type TEXT NOT NULL, -- 'deck', 'garage', 'shed'
  material_type TEXT, -- For deck: 'spruce', 'treated', 'composite', 'cedar'
  material_category TEXT NOT NULL, -- e.g., 'decking', 'joists', 'posts', 'framing', 'roofing', 'siding', etc.
  inventory_item_id TEXT, -- References inventory table item id
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, planner_type, material_type, material_category)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_project_wizard_defaults_org_id ON project_wizard_defaults(organization_id);
CREATE INDEX IF NOT EXISTS idx_project_wizard_defaults_planner ON project_wizard_defaults(planner_type);
CREATE INDEX IF NOT EXISTS idx_project_wizard_defaults_lookup ON project_wizard_defaults(organization_id, planner_type, material_type);

-- Enable Row Level Security (RLS)
ALTER TABLE project_wizard_defaults ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES FOR project_wizard_defaults
-- =====================================================

-- Policy: Users can view defaults for their organization
CREATE POLICY "Users can view project wizard defaults" ON project_wizard_defaults
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.organization_id = project_wizard_defaults.organization_id
    )
  );

-- Policy: Admins and Super Admins can insert defaults
CREATE POLICY "Admins can insert project wizard defaults" ON project_wizard_defaults
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.organization_id = project_wizard_defaults.organization_id
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- Policy: Admins and Super Admins can update defaults
CREATE POLICY "Admins can update project wizard defaults" ON project_wizard_defaults
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.organization_id = project_wizard_defaults.organization_id
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- Policy: Admins and Super Admins can delete defaults
CREATE POLICY "Admins can delete project wizard defaults" ON project_wizard_defaults
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.organization_id = project_wizard_defaults.organization_id
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- =====================================================
-- FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_project_wizard_defaults_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for project_wizard_defaults
DROP TRIGGER IF EXISTS update_project_wizard_defaults_updated_at ON project_wizard_defaults;
CREATE TRIGGER update_project_wizard_defaults_updated_at
  BEFORE UPDATE ON project_wizard_defaults
  FOR EACH ROW
  EXECUTE FUNCTION update_project_wizard_defaults_updated_at();

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON project_wizard_defaults TO authenticated;

-- =====================================================
-- END OF SCRIPT
-- =====================================================

-- To verify the table was created successfully, run:
-- SELECT * FROM project_wizard_defaults;
