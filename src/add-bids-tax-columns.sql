-- Add tax-related columns to bids table
-- This migration adds support for tax calculations on bids

ALTER TABLE public.bids 
ADD COLUMN IF NOT EXISTS tax_rate numeric(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_amount numeric(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS subtotal numeric(12,2);

-- Update existing bids to have subtotal = amount (for backwards compatibility)
UPDATE public.bids 
SET subtotal = amount 
WHERE subtotal IS NULL;

-- Add comments for documentation
COMMENT ON COLUMN public.bids.tax_rate IS 'Tax rate percentage (e.g., 8.5 for 8.5%)';
COMMENT ON COLUMN public.bids.tax_amount IS 'Calculated tax amount based on subtotal and tax_rate';
COMMENT ON COLUMN public.bids.subtotal IS 'Subtotal before tax (sum of line items or manual amount)';
COMMENT ON COLUMN public.bids.amount IS 'Total amount including tax (subtotal + tax_amount)';
