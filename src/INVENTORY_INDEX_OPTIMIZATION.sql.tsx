-- ============================================================================
-- INVENTORY TABLE INDEX OPTIMIZATION
-- ============================================================================
-- This script adds optimized indexes to dramatically improve search performance
-- Run this in your Supabase SQL Editor

-- ============================================================================
-- STEP 1: Add Text Search Index (for name, sku, description)
-- ============================================================================

-- Create a GIN index for full-text search on name, sku, and description
-- This allows fast searching across multiple text columns
CREATE INDEX IF NOT EXISTS idx_inventory_text_search ON public.inventory 
USING GIN (
  to_tsvector('english', 
    COALESCE(name, '') || ' ' || 
    COALESCE(sku, '') || ' ' || 
    COALESCE(description, '')
  )
);

-- ============================================================================
-- STEP 2: Add Composite Indexes for Common Query Patterns
-- ============================================================================

-- Composite index for organization + category (common filtering pattern)
CREATE INDEX IF NOT EXISTS idx_inventory_org_category 
ON public.inventory(organization_id, category);

-- ============================================================================
-- STEP 3: Add Trigram Index for Fuzzy/Partial Matching
-- ============================================================================

-- Enable pg_trgm extension for fuzzy searching (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Trigram indexes for fuzzy/partial search on name and SKU
CREATE INDEX IF NOT EXISTS idx_inventory_name_trgm 
ON public.inventory USING gin (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_inventory_sku_trgm 
ON public.inventory USING gin (sku gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_inventory_description_trgm 
ON public.inventory USING gin (description gin_trgm_ops);

-- ============================================================================
-- STEP 4: Add Index on quantity for Low Stock queries
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_inventory_quantity 
ON public.inventory(quantity);

-- ============================================================================
-- STEP 5: Update existing indexes to be CONCURRENTLY (non-blocking)
-- ============================================================================

-- Note: If you need to rebuild existing indexes without locking the table,
-- use CREATE INDEX CONCURRENTLY, but this can't be done in a transaction.

-- ============================================================================
-- STEP 6: Add Statistics Target (improves query planner decisions)
-- ============================================================================

ALTER TABLE public.inventory 
ALTER COLUMN name SET STATISTICS 1000;

ALTER TABLE public.inventory 
ALTER COLUMN sku SET STATISTICS 1000;

ALTER TABLE public.inventory 
ALTER COLUMN category SET STATISTICS 500;

-- ============================================================================
-- STEP 7: Analyze table to update statistics
-- ============================================================================

ANALYZE public.inventory;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check all indexes on inventory table
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'inventory' 
ORDER BY indexname;

-- Check table size and index sizes
SELECT
    pg_size_pretty(pg_total_relation_size('public.inventory')) as total_size,
    pg_size_pretty(pg_relation_size('public.inventory')) as table_size,
    pg_size_pretty(pg_total_relation_size('public.inventory') - pg_relation_size('public.inventory')) as indexes_size;

-- ============================================================================
-- PERFORMANCE TEST QUERIES
-- ============================================================================

-- Test 1: Full-text search (should use idx_inventory_text_search)
EXPLAIN ANALYZE
SELECT * FROM public.inventory
WHERE to_tsvector('english', COALESCE(name, '') || ' ' || COALESCE(sku, '') || ' ' || COALESCE(description, ''))
@@ to_tsquery('english', 'widget');

-- Test 2: Fuzzy search (should use idx_inventory_name_trgm)
EXPLAIN ANALYZE
SELECT * FROM public.inventory
WHERE name ILIKE '%widget%';

-- Test 3: Composite filter (should use idx_inventory_org_category)
EXPLAIN ANALYZE
SELECT * FROM public.inventory
WHERE organization_id = 'your-org-id'
  AND category = 'Electronics';

-- ============================================================================
-- NOTES
-- ============================================================================
-- 
-- Expected Performance Improvements:
-- - Simple text search: 100-1000x faster for large datasets
-- - Fuzzy/partial search: 50-500x faster
-- - Multi-column filters: 10-100x faster
-- - Low stock queries: 10-50x faster
--
-- Index Storage:
-- - Text search indexes: ~20-30% of table size
-- - Trigram indexes: ~30-40% of table size
-- - Composite indexes: ~5-10% per index
--
-- Trade-offs:
-- - Indexes speed up SELECT queries but slightly slow INSERT/UPDATE/DELETE
-- - For inventory, reads far outnumber writes, so this is beneficial
-- - Indexes consume disk space (typically 50-100% of table size total)
--
-- ============================================================================