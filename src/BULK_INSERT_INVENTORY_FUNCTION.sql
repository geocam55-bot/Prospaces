-- ============================================================================
-- Create a database function to bulk insert inventory items
-- This bypasses PostgREST's schema cache issues
-- NOTE: Cost column temporarily removed - works without migration
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
BEGIN
  -- Loop through each item in the JSON array
  FOR item IN SELECT * FROM jsonb_array_elements(items)
  LOOP
    BEGIN
      -- Insert each item using only the columns that exist (NO COST YET)
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