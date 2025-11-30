-- ============================================================================
-- Migration Script: Add Cost Column to Inventory Table
-- ============================================================================
-- This script adds the 'cost' column to the inventory table.
-- Run this in your Supabase SQL Editor if you already have an inventory table
-- without the cost column.
-- ============================================================================

-- Add cost column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'inventory' 
    AND column_name = 'cost'
  ) THEN
    ALTER TABLE public.inventory 
    ADD COLUMN cost numeric(12,2) DEFAULT 0;
    
    RAISE NOTICE 'Cost column added to inventory table';
  ELSE
    RAISE NOTICE 'Cost column already exists in inventory table';
  END IF;
END $$;

-- ============================================================================
-- INSTRUCTIONS:
-- ============================================================================
-- 1. Go to your Supabase Dashboard
-- 2. Navigate to the SQL Editor
-- 3. Copy and paste this entire script
-- 4. Run the script
-- 5. The cost column will be added to your inventory table
-- ============================================================================
