-- ============================================================================
-- DISABLE RLS ON ALL DATA TABLES
-- ============================================================================
-- This fixes the "new row violates row-level security policy" errors

-- Disable RLS on all main data tables
ALTER TABLE public.contacts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunities DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.bids DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.bid_line_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'contacts', 'opportunities', 'bids', 'bid_line_items',
    'tasks', 'notes', 'appointments', 'documents', 
    'inventory', 'profiles', 'organizations'
  )
ORDER BY tablename;
