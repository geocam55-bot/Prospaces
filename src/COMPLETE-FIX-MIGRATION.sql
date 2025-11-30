-- ================================================
-- COMPLETE FIX FOR PROJECT_MANAGERS AND OPPORTUNITIES
-- This migration fixes all schema issues:
-- 1. Adds organization_id column (if missing)
-- 2. Changes customer_id from UUID to TEXT (to support mixed ID formats)
-- ================================================

-- ============================================================================
-- PART 1: FIX PROJECT_MANAGERS TABLE
-- ============================================================================

-- Step 1: Add organization_id column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'project_managers' 
    AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE public.project_managers 
      ADD COLUMN organization_id text;
    RAISE NOTICE 'Added organization_id column to project_managers';
  ELSE
    RAISE NOTICE 'organization_id column already exists in project_managers';
  END IF;
END $$;

-- Step 2: Change customer_id from UUID to TEXT (if it's currently UUID)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'project_managers' 
    AND column_name = 'customer_id'
    AND data_type = 'uuid'
  ) THEN
    ALTER TABLE public.project_managers 
      ALTER COLUMN customer_id TYPE text;
    RAISE NOTICE 'Changed customer_id to TEXT in project_managers';
  ELSE
    RAISE NOTICE 'customer_id is already TEXT in project_managers';
  END IF;
END $$;

-- Step 3: Create indexes (if they don't exist)
CREATE INDEX IF NOT EXISTS idx_project_managers_customer 
  ON public.project_managers(customer_id);
  
CREATE INDEX IF NOT EXISTS idx_project_managers_org 
  ON public.project_managers(organization_id);

-- ============================================================================
-- PART 2: FIX OPPORTUNITIES TABLE
-- ============================================================================

-- Step 1: Add organization_id column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'opportunities' 
    AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE public.opportunities 
      ADD COLUMN organization_id text;
    RAISE NOTICE 'Added organization_id column to opportunities';
  ELSE
    RAISE NOTICE 'organization_id column already exists in opportunities';
  END IF;
END $$;

-- Step 2: Change customer_id from UUID to TEXT (if it's currently UUID)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'opportunities' 
    AND column_name = 'customer_id'
    AND data_type = 'uuid'
  ) THEN
    ALTER TABLE public.opportunities 
      ALTER COLUMN customer_id TYPE text;
    RAISE NOTICE 'Changed customer_id to TEXT in opportunities';
  ELSE
    RAISE NOTICE 'customer_id is already TEXT in opportunities';
  END IF;
END $$;

-- Step 3: Create indexes (if they don't exist)
CREATE INDEX IF NOT EXISTS idx_opportunities_customer 
  ON public.opportunities(customer_id);
  
CREATE INDEX IF NOT EXISTS idx_opportunities_org 
  ON public.opportunities(organization_id);

-- ============================================================================
-- PART 3: UPDATE EXISTING RECORDS (IF NEEDED)
-- ============================================================================

-- If you have existing records without organization_id, you need to update them
-- Uncomment and modify this section if needed:

/*
-- Get your organization ID from an existing user/profile
-- Replace 'YOUR_ORG_ID' with your actual organization ID

UPDATE public.project_managers 
SET organization_id = 'YOUR_ORG_ID' 
WHERE organization_id IS NULL;

UPDATE public.opportunities 
SET organization_id = 'YOUR_ORG_ID' 
WHERE organization_id IS NULL;

-- After updating existing records, make the columns NOT NULL
ALTER TABLE public.project_managers 
  ALTER COLUMN organization_id SET NOT NULL;

ALTER TABLE public.opportunities 
  ALTER COLUMN organization_id SET NOT NULL;
*/

-- ============================================================================
-- PART 4: VERIFY THE CHANGES
-- ============================================================================

-- Check the final schema
SELECT 
  table_name, 
  column_name, 
  data_type, 
  is_nullable 
FROM information_schema.columns 
WHERE table_name IN ('project_managers', 'opportunities')
  AND column_name IN ('customer_id', 'organization_id')
ORDER BY table_name, column_name;

-- Check if there are any records missing organization_id
SELECT 
  'project_managers' as table_name,
  COUNT(*) as records_missing_org_id
FROM public.project_managers 
WHERE organization_id IS NULL
UNION ALL
SELECT 
  'opportunities' as table_name,
  COUNT(*) as records_missing_org_id
FROM public.opportunities 
WHERE organization_id IS NULL;
