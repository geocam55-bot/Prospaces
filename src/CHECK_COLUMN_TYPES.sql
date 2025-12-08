-- ============================================================================
-- DIAGNOSTIC: Check column types to find TEXT vs UUID mismatches
-- ============================================================================

-- Check profiles table structure
SELECT 
  'PROFILES TABLE' as table_name,
  column_name, 
  data_type,
  udt_name
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'profiles'
ORDER BY ordinal_position;

-- Check organizations table structure
SELECT 
  'ORGANIZATIONS TABLE' as table_name,
  column_name, 
  data_type,
  udt_name
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'organizations'
ORDER BY ordinal_position;

-- Check contacts table structure
SELECT 
  'CONTACTS TABLE' as table_name,
  column_name, 
  data_type,
  udt_name
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'contacts'
ORDER BY ordinal_position;

-- List all existing helper functions
SELECT 
  'EXISTING FUNCTIONS' as info,
  routine_name,
  routine_type,
  data_type as return_type,
  type_udt_name
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND (routine_name LIKE '%user%' OR routine_name LIKE '%org%')
ORDER BY routine_name;
