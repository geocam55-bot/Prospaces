-- ============================================================================
-- IMMEDIATE FIX: Update bulk_insert_inventory to work WITHOUT cost column
-- ============================================================================
-- Run this in Supabase SQL Editor RIGHT NOW to fix the import error
-- ============================================================================

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
      -- Insert each item WITHOUT cost column (to avoid PGRST204 error)
      INSERT INTO public.inventory (
        name,
        sku,
        description,
        category,
        quantity,
        quantity_on_order,
        unit_price,
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

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.bulk_insert_inventory(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.bulk_insert_inventory(jsonb) TO anon;

-- Force schema cache refresh
NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- ✅ DONE! Your inventory import should work now!
-- ============================================================================
