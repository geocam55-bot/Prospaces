-- ============================================================================
-- CHECK FOR TRIGGERS AND FUNCTIONS ON PROFILES TABLE
-- ============================================================================

-- Step 1: Check for triggers on profiles table
-- ============================================================================
SELECT 
  '🔍 TRIGGERS ON PROFILES TABLE' as check_type,
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement,
  action_timing
FROM information_schema.triggers
WHERE event_object_table = 'profiles'
  AND event_object_schema = 'public'
ORDER BY trigger_name;

-- Step 2: Check current RLS policies on profiles
-- ============================================================================
SELECT 
  '🔒 CURRENT RLS POLICIES' as check_type,
  schemaname,
  tablename,
  policyname,
  permissive,
  cmd
FROM pg_policies
WHERE tablename = 'profiles'
  AND schemaname = 'public'
ORDER BY policyname;

-- Step 3: Check if RLS is enabled
-- ============================================================================
SELECT 
  '🔐 RLS STATUS' as check_type,
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'profiles'
  AND schemaname = 'public';

-- Step 4: List all functions that reference profiles
-- ============================================================================
SELECT 
  '⚙️ FUNCTIONS REFERENCING PROFILES' as check_type,
  p.proname as function_name,
  pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND pg_get_functiondef(p.oid) ILIKE '%profiles%'
ORDER BY p.proname;