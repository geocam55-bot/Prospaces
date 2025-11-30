-- ============================================================================
-- REFRESH SUPABASE SCHEMA CACHE
-- ============================================================================
-- This fixes the error: "Could not find the 'city' column of 'contacts' in the schema cache"
-- Run this in your Supabase SQL Editor
-- ============================================================================

-- Notify PostgREST to reload its schema cache
NOTIFY pgrst, 'reload schema';

-- Alternative: If the above doesn't work, you can also manually check the current schema
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'contacts'
ORDER BY ordinal_position;

-- ============================================================================
-- After running this:
-- 1. Wait 10-15 seconds for the cache to refresh
-- 2. Try creating a contact again
-- 3. If it still fails, try restarting your Supabase project from the dashboard
-- ============================================================================
