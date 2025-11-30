-- =====================================================
-- SUPABASE SETTINGS TABLES SQL SCRIPT
-- =====================================================
-- This script creates the necessary tables for storing user preferences
-- and organization settings in Supabase.
--
-- Run this script in your Supabase SQL Editor to create the tables.
-- =====================================================

-- Table: user_preferences
-- Stores user-level preferences including notifications and profile picture
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  notifications_email BOOLEAN DEFAULT true,
  notifications_push BOOLEAN DEFAULT true,
  notifications_task_assignments BOOLEAN DEFAULT true,
  notifications_appointments BOOLEAN DEFAULT true,
  notifications_bids BOOLEAN DEFAULT false,
  profile_picture TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, organization_id)
);

-- Table: organization_settings
-- Stores organization-level settings including tax rates, default price level, and quote terms
CREATE TABLE IF NOT EXISTS organization_settings (
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  tax_rate NUMERIC(5, 2) DEFAULT 0,
  tax_rate_2 NUMERIC(5, 2) DEFAULT 0,
  default_price_level TEXT DEFAULT 'Retail',
  quote_terms TEXT DEFAULT 'Payment due within 30 days. All prices in USD.',
  organization_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (organization_id)
);

-- Add new columns to existing organization_settings table if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='organization_settings' AND column_name='tax_rate_2') THEN
    ALTER TABLE organization_settings ADD COLUMN tax_rate_2 NUMERIC(5, 2) DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='organization_settings' AND column_name='quote_terms') THEN
    ALTER TABLE organization_settings ADD COLUMN quote_terms TEXT DEFAULT 'Payment due within 30 days. All prices in USD.';
  END IF;
END $$;

-- Add profile_picture column to profiles table if it doesn't exist
-- This allows profile pictures to be stored in both user_preferences and profiles
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='profiles' AND column_name='profile_picture') THEN
    ALTER TABLE profiles ADD COLUMN profile_picture TEXT;
  END IF;
END $$;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_org_id ON user_preferences(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_settings_org_id ON organization_settings(organization_id);

-- Enable Row Level Security (RLS) on both tables
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_settings ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES FOR user_preferences
-- =====================================================

-- Policy: Users can view their own preferences
CREATE POLICY "Users can view own preferences" ON user_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own preferences
CREATE POLICY "Users can insert own preferences" ON user_preferences
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own preferences
CREATE POLICY "Users can update own preferences" ON user_preferences
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Users can delete their own preferences
CREATE POLICY "Users can delete own preferences" ON user_preferences
  FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- RLS POLICIES FOR organization_settings
-- =====================================================

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
-- FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for user_preferences
DROP TRIGGER IF EXISTS update_user_preferences_updated_at ON user_preferences;
CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for organization_settings
DROP TRIGGER IF EXISTS update_organization_settings_updated_at ON organization_settings;
CREATE TRIGGER update_organization_settings_updated_at
  BEFORE UPDATE ON organization_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON user_preferences TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON organization_settings TO authenticated;

-- =====================================================
-- END OF SCRIPT
-- =====================================================

-- To verify the tables were created successfully, run:
-- SELECT * FROM user_preferences;
-- SELECT * FROM organization_settings;
