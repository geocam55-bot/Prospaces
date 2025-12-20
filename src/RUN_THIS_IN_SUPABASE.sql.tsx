-- ============================================================================
-- CRITICAL: Add Cost Column to Inventory Table
-- ============================================================================
-- Copy this entire script and run it in your Supabase SQL Editor
-- https://supabase.com/dashboard/project/_/sql/new
-- ============================================================================

-- Step 1: Add the cost column if it doesn't exist
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
    
    RAISE NOTICE '✅ Cost column added to inventory table';
  ELSE
    RAISE NOTICE 'ℹ️ Cost column already exists in inventory table';
  END IF;
END $$;

-- Step 2: Add quantity_on_order if it doesn't exist (just in case)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'inventory' 
    AND column_name = 'quantity_on_order'
  ) THEN
    ALTER TABLE public.inventory 
    ADD COLUMN quantity_on_order integer DEFAULT 0;
    
    RAISE NOTICE '✅ quantity_on_order column added to inventory table';
  ELSE
    RAISE NOTICE 'ℹ️ quantity_on_order column already exists';
  END IF;
END $$;

-- Step 3: Update the bulk insert function
CREATE OR REPLACE FUNCTION public.bulk_insert_inventory(items jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  item jsonb;
  inserted_count integer := 0;
  failed_count integer := 0;
  error_msg text;
BEGIN
  -- Loop through each item in the JSON array
  FOR item IN SELECT * FROM jsonb_array_elements(items)
  LOOP
    BEGIN
      -- Insert each item using only the columns that exist
      INSERT INTO public.inventory (
        name,
        sku,
        description,
        category,
        quantity,
        quantity_on_order,
        unit_price,
        cost,
        organization_id,
        created_at,
        updated_at
      ) VALUES (
        (item->>'name')::text,
        (item->>'sku')::text,
        (item->>'description')::text,
        (item->>'category')::text,
        COALESCE((item->>'quantity')::integer, 0),
        COALESCE((item->>'quantity_on_order')::integer, 0),
        COALESCE((item->>'unit_price')::numeric, 0),
        COALESCE((item->>'cost')::numeric, 0),
        (item->>'organization_id')::text,
        NOW(),
        NOW()
      );
      
      inserted_count := inserted_count + 1;
    EXCEPTION WHEN OTHERS THEN
      failed_count := failed_count + 1;
      error_msg := SQLERRM;
      RAISE NOTICE 'Failed to insert item: %', error_msg;
    END;
  END LOOP;
  
  RETURN jsonb_build_object(
    'inserted', inserted_count,
    'failed', failed_count
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.bulk_insert_inventory(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.bulk_insert_inventory(jsonb) TO anon;

-- Step 4: Refresh the schema cache (forces PostgREST to reload)
NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- ✅ DONE! 
-- ============================================================================
-- After running this:
-- 1. Wait 5-10 seconds for the schema cache to refresh
-- 2. Go back to your application
-- 3. Try importing inventory again
-- ============================================================================
