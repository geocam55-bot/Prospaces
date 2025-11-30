-- Migration: Add quantity_on_order column to inventory table
-- Run this in your Supabase SQL Editor

-- Add quantity_on_order column to inventory table
ALTER TABLE inventory 
ADD COLUMN IF NOT EXISTS quantity_on_order integer DEFAULT 0;

-- Add a comment to document the column
COMMENT ON COLUMN inventory.quantity_on_order IS 'Number of units currently on order from suppliers';

-- Verify the column was added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'inventory' 
AND column_name IN ('quantity', 'quantity_on_order');
