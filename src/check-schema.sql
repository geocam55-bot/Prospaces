-- =============================================
-- CHECK ACTUAL DATABASE SCHEMA
-- =============================================
-- Run this to see what's really in your database
-- =============================================

-- Check the contacts table structure
SELECT 
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'contacts'
ORDER BY ordinal_position;

-- Check what ID type is actually being used
SELECT 
    table_name,
    column_name,
    data_type,
    column_default
FROM information_schema.columns
WHERE table_name IN ('contacts', 'project_managers', 'opportunities', 'bids')
    AND column_name = 'id'
ORDER BY table_name;

-- Check recent contacts to see actual IDs
SELECT id, name, email, created_at 
FROM contacts 
ORDER BY created_at DESC 
LIMIT 5;

-- Check if gen_random_uuid() function exists
SELECT proname 
FROM pg_proc 
WHERE proname = 'gen_random_uuid';
