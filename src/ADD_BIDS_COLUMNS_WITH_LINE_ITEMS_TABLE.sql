-- ============================================================================
-- MIGRATION: Add Missing Columns + Separate Line Items Table
-- ============================================================================
-- This migration adds:
-- 1. Separate bid_line_items table (normalized approach)
-- 2. Tax calculation columns to bids
-- 3. Additional bid fields (valid_until, notes)
--
-- This is the RECOMMENDED approach for production systems
-- Run this in your Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- STEP 1: Add missing columns to bids table
-- ============================================================================

ALTER TABLE public.bids
  ADD COLUMN IF NOT EXISTS subtotal NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS tax_rate NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valid_until DATE,
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add helpful comments
COMMENT ON COLUMN public.bids.subtotal IS 'Subtotal before tax (sum of all line items)';
COMMENT ON COLUMN public.bids.tax_rate IS 'Tax rate as percentage (e.g., 8.5 for 8.5%)';
COMMENT ON COLUMN public.bids.tax_amount IS 'Calculated tax amount';
COMMENT ON COLUMN public.bids.valid_until IS 'Bid expiration/validity date';
COMMENT ON COLUMN public.bids.notes IS 'Additional notes or comments about the bid';

-- Create index on valid_until
CREATE INDEX IF NOT EXISTS idx_bids_valid_until ON public.bids(valid_until);

-- ============================================================================
-- STEP 2: Create bid_line_items table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.bid_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bid_id UUID NOT NULL REFERENCES public.bids(id) ON DELETE CASCADE,
  item_id UUID,  -- Optional: reference to inventory items table
  item_name TEXT NOT NULL,
  sku TEXT,
  description TEXT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),
  discount NUMERIC(5,2) DEFAULT 0 CHECK (discount >= 0 AND discount <= 100),
  discount_amount NUMERIC(12,2) DEFAULT 0,
  subtotal NUMERIC(12,2) NOT NULL,
  total NUMERIC(12,2) NOT NULL,
  sort_order INTEGER DEFAULT 0,
  organization_id TEXT NOT NULL,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add helpful comments
COMMENT ON TABLE public.bid_line_items IS 'Individual line items for bids';
COMMENT ON COLUMN public.bid_line_items.item_id IS 'Optional reference to inventory.items table';
COMMENT ON COLUMN public.bid_line_items.discount IS 'Discount percentage (0-100)';
COMMENT ON COLUMN public.bid_line_items.discount_amount IS 'Calculated discount amount in currency';
COMMENT ON COLUMN public.bid_line_items.subtotal IS 'Quantity × Unit Price';
COMMENT ON COLUMN public.bid_line_items.total IS 'Subtotal - Discount Amount';
COMMENT ON COLUMN public.bid_line_items.sort_order IS 'Display order of line items';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_bid_line_items_bid ON public.bid_line_items(bid_id);
CREATE INDEX IF NOT EXISTS idx_bid_line_items_item ON public.bid_line_items(item_id);
CREATE INDEX IF NOT EXISTS idx_bid_line_items_org ON public.bid_line_items(organization_id);

-- ============================================================================
-- STEP 3: Enable Row Level Security (RLS)
-- ============================================================================

ALTER TABLE public.bid_line_items ENABLE ROW LEVEL SECURITY;

-- Policy for reading line items
CREATE POLICY "authenticated_users_read_bid_line_items" 
ON public.bid_line_items
FOR SELECT 
TO authenticated 
USING (true);

-- Policy for managing line items (insert, update, delete)
CREATE POLICY "authenticated_users_manage_bid_line_items" 
ON public.bid_line_items
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- ============================================================================
-- STEP 4: Create helper function to calculate bid totals
-- ============================================================================

CREATE OR REPLACE FUNCTION public.calculate_bid_totals(bid_uuid UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  line_items_total NUMERIC(12,2);
  bid_tax_rate NUMERIC(5,2);
  calculated_tax NUMERIC(12,2);
  final_amount NUMERIC(12,2);
BEGIN
  -- Get the sum of all line items for this bid
  SELECT COALESCE(SUM(total), 0)
  INTO line_items_total
  FROM public.bid_line_items
  WHERE bid_id = bid_uuid;
  
  -- Get the tax rate for this bid
  SELECT COALESCE(tax_rate, 0)
  INTO bid_tax_rate
  FROM public.bids
  WHERE id = bid_uuid;
  
  -- Calculate tax amount
  calculated_tax := ROUND((line_items_total * bid_tax_rate / 100), 2);
  
  -- Calculate final amount
  final_amount := line_items_total + calculated_tax;
  
  -- Update the bid with calculated values
  UPDATE public.bids
  SET 
    subtotal = line_items_total,
    tax_amount = calculated_tax,
    amount = final_amount,
    updated_at = NOW()
  WHERE id = bid_uuid;
END;
$$;

COMMENT ON FUNCTION public.calculate_bid_totals(UUID) IS 'Automatically calculates and updates bid totals based on line items';

-- ============================================================================
-- STEP 5: Create trigger to auto-calculate totals
-- ============================================================================

CREATE OR REPLACE FUNCTION public.trigger_calculate_bid_totals()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Calculate totals for the affected bid
  IF TG_OP = 'DELETE' THEN
    PERFORM public.calculate_bid_totals(OLD.bid_id);
  ELSE
    PERFORM public.calculate_bid_totals(NEW.bid_id);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Attach trigger to bid_line_items table
DROP TRIGGER IF EXISTS trigger_bid_line_items_calculate_totals ON public.bid_line_items;

CREATE TRIGGER trigger_bid_line_items_calculate_totals
AFTER INSERT OR UPDATE OR DELETE ON public.bid_line_items
FOR EACH ROW
EXECUTE FUNCTION public.trigger_calculate_bid_totals();

-- ============================================================================
-- STEP 6: Update existing bids with default values
-- ============================================================================

UPDATE public.bids
SET 
  subtotal = amount,
  tax_rate = 0,
  tax_amount = 0
WHERE subtotal IS NULL;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check bids table structure
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'bids'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check bid_line_items table structure
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'bid_line_items'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Test the calculation function with a sample bid
-- (Will show 0 if no line items exist yet)
DO $$
DECLARE
  test_bid_id UUID;
BEGIN
  SELECT id INTO test_bid_id FROM public.bids LIMIT 1;
  IF test_bid_id IS NOT NULL THEN
    PERFORM public.calculate_bid_totals(test_bid_id);
    RAISE NOTICE 'Calculation function tested successfully on bid: %', test_bid_id;
  ELSE
    RAISE NOTICE 'No bids found to test calculation function';
  END IF;
END $$;

-- ============================================================================
-- EXAMPLE USAGE
-- ============================================================================

-- Example: Creating a bid with line items

-- 1. Create the bid
-- INSERT INTO public.bids (
--   opportunity_id, 
--   title, 
--   amount, 
--   subtotal,
--   tax_rate,
--   status, 
--   organization_id
-- ) VALUES (
--   '00000000-0000-0000-0000-000000000000',  -- Replace with actual opportunity_id
--   'Sample Bid',
--   0,  -- Will be auto-calculated
--   0,  -- Will be auto-calculated
--   8.5,  -- 8.5% tax rate
--   'draft',
--   'org_001'
-- ) RETURNING id;

-- 2. Add line items (replace bid_id with the ID from step 1)
-- INSERT INTO public.bid_line_items (
--   bid_id,
--   item_name,
--   sku,
--   quantity,
--   unit_price,
--   discount,
--   discount_amount,
--   subtotal,
--   total,
--   organization_id
-- ) VALUES
-- (
--   '00000000-0000-0000-0000-000000000000',  -- Replace with actual bid_id
--   'Office Chair',
--   'SKU-001',
--   10,
--   500.00,
--   10,  -- 10% discount
--   500.00,  -- 10% of 5000
--   5000.00,  -- 10 × 500
--   4500.00,  -- 5000 - 500 discount
--   'org_001'
-- ),
-- (
--   '00000000-0000-0000-0000-000000000000',  -- Replace with actual bid_id
--   'Standing Desk',
--   'SKU-002',
--   5,
--   1000.00,
--   0,  -- No discount
--   0,
--   5000.00,  -- 5 × 1000
--   5000.00,
--   'org_001'
-- );

-- 3. The trigger will automatically update the bid:
--    subtotal = 9500.00 (4500 + 5000)
--    tax_amount = 807.50 (9500 × 8.5%)
--    amount = 10307.50 (9500 + 807.50)

-- ============================================================================
-- SUCCESS!
-- ============================================================================
-- Your bids table now supports:
-- ✅ Separate line items table (normalized)
-- ✅ Tax calculations (subtotal, tax_rate, tax_amount)
-- ✅ Automatic total calculation via triggers
-- ✅ Expiration dates (valid_until)
-- ✅ Notes/comments (notes)
--
-- Next step: Update your TestDataGenerator to use bid_line_items table
-- ============================================================================
