-- ============================================================================
-- MIGRATION: Add Missing Columns to Bids Table
-- ============================================================================
-- This migration adds support for:
-- 1. Line items (stored as JSONB for flexibility)
-- 2. Tax calculations (subtotal, tax_rate, tax_amount)
-- 3. Additional bid fields (valid_until, notes)
--
-- Run this in your Supabase SQL Editor
-- ============================================================================

-- Add missing columns to bids table
ALTER TABLE public.bids
  ADD COLUMN IF NOT EXISTS subtotal NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS tax_rate NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valid_until DATE,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb;

-- Add helpful comment
COMMENT ON COLUMN public.bids.items IS 'Line items stored as JSONB array. Each item should have: id, itemId, itemName, sku, quantity, unitPrice, discount, total';
COMMENT ON COLUMN public.bids.subtotal IS 'Subtotal before tax';
COMMENT ON COLUMN public.bids.tax_rate IS 'Tax rate as percentage (e.g., 8.5 for 8.5%)';
COMMENT ON COLUMN public.bids.tax_amount IS 'Calculated tax amount';
COMMENT ON COLUMN public.bids.valid_until IS 'Bid expiration/validity date';
COMMENT ON COLUMN public.bids.notes IS 'Additional notes or comments about the bid';

-- Create index on valid_until for queries filtering by expiration
CREATE INDEX IF NOT EXISTS idx_bids_valid_until ON public.bids(valid_until);

-- ============================================================================
-- OPTIONAL: Update existing bids to have valid tax calculations
-- ============================================================================
-- This will set subtotal = amount and tax fields to 0 for existing bids
-- Comment out if you don't want to update existing data

UPDATE public.bids
SET 
  subtotal = amount,
  tax_rate = 0,
  tax_amount = 0,
  items = '[]'::jsonb
WHERE subtotal IS NULL;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these to verify the migration worked correctly

-- Check the bids table structure
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'bids'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check if any bids exist and their new columns
SELECT 
  id,
  title,
  amount,
  subtotal,
  tax_rate,
  tax_amount,
  valid_until,
  items,
  notes
FROM public.bids
LIMIT 5;

-- ============================================================================
-- SUCCESS!
-- ============================================================================
-- Your bids table now supports:
-- ✅ Line items (as JSONB)
-- ✅ Tax calculations (subtotal, tax_rate, tax_amount)
-- ✅ Expiration dates (valid_until)
-- ✅ Notes/comments (notes)
--
-- You can now use the TestDataGenerator without errors!
-- ============================================================================
