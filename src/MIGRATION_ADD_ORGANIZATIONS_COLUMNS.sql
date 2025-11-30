-- ============================================
-- ADD MISSING COLUMNS TO ORGANIZATIONS TABLE
-- Run this in Supabase SQL Editor
-- ============================================

-- Add columns for tenant management if they don't exist
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS domain text,
  ADD COLUMN IF NOT EXISTS plan text DEFAULT 'starter',
  ADD COLUMN IF NOT EXISTS billing_email text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS max_users integer DEFAULT 10,
  ADD COLUMN IF NOT EXISTS max_contacts integer DEFAULT 1000,
  ADD COLUMN IF NOT EXISTS features jsonb DEFAULT '[]'::jsonb;

-- Verify the columns were added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'organizations'
AND table_schema = 'public'
ORDER BY ordinal_position;
