-- ================================================
-- FIX PROJECT_MANAGERS AND OPPORTUNITIES TABLES TO SUPPORT MIXED ID FORMATS
-- This changes customer_id from UUID to TEXT to support both
-- old numeric contact IDs and new UUID contact IDs
-- ================================================

-- Step 1: Alter customer_id column in project_managers from UUID to TEXT
ALTER TABLE public.project_managers 
  ALTER COLUMN customer_id TYPE TEXT;

-- Step 2: Alter customer_id column in opportunities from UUID to TEXT
ALTER TABLE public.opportunities 
  ALTER COLUMN customer_id TYPE TEXT;

-- Step 3: Verify the changes
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name IN ('project_managers', 'opportunities')
  AND column_name = 'customer_id';
