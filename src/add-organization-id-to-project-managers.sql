-- ================================================
-- ADD ORGANIZATION_ID COLUMN TO PROJECT_MANAGERS TABLE
-- This migration adds the missing organization_id column
-- ================================================

-- Step 1: Add organization_id column to project_managers
-- Make it nullable first in case there's existing data
ALTER TABLE public.project_managers 
  ADD COLUMN IF NOT EXISTS organization_id text;

-- Step 2: If you have existing data, update it with a default organization
-- Uncomment and modify this if you have existing records:
-- UPDATE public.project_managers 
-- SET organization_id = 'YOUR_DEFAULT_ORG_ID' 
-- WHERE organization_id IS NULL;

-- Step 3: Make the column NOT NULL (only after updating existing records)
-- Uncomment this after you've updated any existing records:
-- ALTER TABLE public.project_managers 
--   ALTER COLUMN organization_id SET NOT NULL;

-- Step 4: Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_project_managers_org 
  ON public.project_managers(organization_id);

-- Step 5: Verify the changes
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'project_managers' 
  AND column_name = 'organization_id';
