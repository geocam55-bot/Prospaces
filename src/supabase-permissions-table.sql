-- =====================================================
-- ProSpaces CRM - Permissions Table Migration
-- =====================================================
-- This script creates the permissions table for role-based access control
-- Run this in your Supabase SQL Editor

-- Create permissions table
CREATE TABLE IF NOT EXISTS permissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  role TEXT NOT NULL,
  module TEXT NOT NULL,
  visible BOOLEAN DEFAULT false,
  add BOOLEAN DEFAULT false,
  change BOOLEAN DEFAULT false,
  delete BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Ensure unique combination of role and module
  UNIQUE(role, module)
);

-- Enable Row Level Security
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;

-- Policy: Super Admin can do everything
CREATE POLICY "Super Admin full access" 
ON permissions
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'super_admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'super_admin'
  )
);

-- Policy: Admin can do everything
CREATE POLICY "Admin full access" 
ON permissions
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Policy: All authenticated users can read permissions for their role
CREATE POLICY "Users can read own role permissions" 
ON permissions
FOR SELECT
TO authenticated
USING (
  role = (
    SELECT profiles.role FROM profiles
    WHERE profiles.id = auth.uid()
  )
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_permissions_role ON permissions(role);
CREATE INDEX IF NOT EXISTS idx_permissions_module ON permissions(module);
CREATE INDEX IF NOT EXISTS idx_permissions_role_module ON permissions(role, module);

-- Insert default permissions for all roles
INSERT INTO permissions (role, module, visible, add, change, delete) VALUES
-- Super Admin - Full Access
('super_admin', 'dashboard', true, true, true, true),
('super_admin', 'contacts', true, true, true, true),
('super_admin', 'tasks', true, true, true, true),
('super_admin', 'appointments', true, true, true, true),
('super_admin', 'bids', true, true, true, true),
('super_admin', 'notes', true, true, true, true),
('super_admin', 'email', true, true, true, true),
('super_admin', 'marketing', true, true, true, true),
('super_admin', 'inventory', true, true, true, true),
('super_admin', 'users', true, true, true, true),
('super_admin', 'settings', true, true, true, true),
('super_admin', 'tenants', true, true, true, true),
('super_admin', 'security', true, true, true, true),
('super_admin', 'import-export', true, true, true, true),

-- Admin - Full Access except Tenants
('admin', 'dashboard', true, true, true, true),
('admin', 'contacts', true, true, true, true),
('admin', 'tasks', true, true, true, true),
('admin', 'appointments', true, true, true, true),
('admin', 'bids', true, true, true, true),
('admin', 'notes', true, true, true, true),
('admin', 'email', true, true, true, true),
('admin', 'marketing', true, true, true, true),
('admin', 'inventory', true, true, true, true),
('admin', 'users', true, true, true, false),
('admin', 'settings', true, true, true, true),
('admin', 'tenants', false, false, false, false),
('admin', 'security', true, true, true, true),
('admin', 'import-export', true, true, true, true),

-- Manager - Limited Access
('manager', 'dashboard', true, true, true, true),
('manager', 'contacts', true, true, true, true),
('manager', 'tasks', true, true, true, true),
('manager', 'appointments', true, true, true, true),
('manager', 'bids', true, true, true, true),
('manager', 'notes', true, true, true, true),
('manager', 'email', true, true, true, true),
('manager', 'marketing', true, true, true, true),
('manager', 'inventory', true, true, true, true),
('manager', 'users', false, false, false, false),
('manager', 'settings', false, false, false, false),
('manager', 'tenants', false, false, false, false),
('manager', 'security', false, false, false, false),
('manager', 'import-export', false, false, false, false),

-- Marketing - Marketing Focused
('marketing', 'dashboard', true, false, false, false),
('marketing', 'contacts', true, true, true, false),
('marketing', 'tasks', true, true, true, false),
('marketing', 'appointments', true, true, true, false),
('marketing', 'bids', false, false, false, false),
('marketing', 'notes', true, true, true, false),
('marketing', 'email', true, true, true, false),
('marketing', 'marketing', true, true, true, true),
('marketing', 'inventory', true, false, false, false),
('marketing', 'users', false, false, false, false),
('marketing', 'settings', false, false, false, false),
('marketing', 'tenants', false, false, false, false),
('marketing', 'security', false, false, false, false),
('marketing', 'import-export', false, false, false, false),

-- Standard User - Everything except Marketing and Inventory (as per your requirements)
('standard_user', 'dashboard', true, false, false, false),
('standard_user', 'contacts', true, true, true, false),
('standard_user', 'tasks', true, true, true, false),
('standard_user', 'appointments', true, true, true, false),
('standard_user', 'bids', true, true, true, false),
('standard_user', 'notes', true, true, true, false),
('standard_user', 'email', true, true, true, false),
('standard_user', 'marketing', false, false, false, false),
('standard_user', 'inventory', false, false, false, false),
('standard_user', 'users', true, false, false, false),
('standard_user', 'settings', true, true, true, false),
('standard_user', 'tenants', false, false, false, false),
('standard_user', 'security', false, false, false, false),
('standard_user', 'import-export', false, false, false, false)

ON CONFLICT (role, module) DO NOTHING;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Permissions table created successfully!';
  RAISE NOTICE '✅ Default permissions inserted for all roles';
  RAISE NOTICE '📝 Standard User now has access to everything except Marketing and Inventory';
END $$;
