-- ============================================================================
-- FIX: Add missing 'cost' column to inventory table
-- ============================================================================
-- This fixes the PGRST204 error: "Could not find the 'cost' column of 'inventory' in the schema cache"
-- The schema cache expects this column but it doesn't exist in the actual table

-- Check if the cost column exists, and add it if it doesn't
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
    
    RAISE NOTICE 'Added cost column to inventory table';
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
-- 5. After running, go to Settings > API and click "Reload schema cache"
-- 6. Test the inventory import again
--
-- This will add the missing 'cost' column that Supabase expects to exist
-- ============================================================================
