-- ================================================
-- FIX OPPORTUNITIES TABLE COLUMN NAMES
-- This migration:
-- 1. Adds missing owner_id column
-- 2. Renames stage to status
-- 3. Ensures customer_id is TEXT type
-- 4. Ensures organization_id exists and is TEXT
-- ================================================

-- Step 1: Add owner_id column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'opportunities' 
    AND column_name = 'owner_id'
  ) THEN
    -- Add owner_id column
    ALTER TABLE public.opportunities 
      ADD COLUMN owner_id uuid;
    
    -- If created_by exists, copy its data to owner_id
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'opportunities' 
      AND column_name = 'created_by'
    ) THEN
      UPDATE public.opportunities 
      SET owner_id = created_by 
      WHERE created_by IS NOT NULL;
      
      RAISE NOTICE 'Added owner_id column and copied data from created_by';
    ELSE
      RAISE NOTICE 'Added owner_id column (no created_by to copy from)';
    END IF;
  ELSE
    RAISE NOTICE 'owner_id column already exists';
  END IF;
END $$;

-- Step 2: Add status column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'opportunities' 
    AND column_name = 'status'
  ) THEN
    -- Add status column
    ALTER TABLE public.opportunities 
      ADD COLUMN status text DEFAULT 'open';
    
    -- If stage exists, copy its data to status
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'opportunities' 
      AND column_name = 'stage'
    ) THEN
      UPDATE public.opportunities 
      SET status = stage 
      WHERE stage IS NOT NULL;
      
      RAISE NOTICE 'Added status column and copied data from stage';
    ELSE
      RAISE NOTICE 'Added status column (no stage to copy from)';
    END IF;
  ELSE
    RAISE NOTICE 'status column already exists';
  END IF;
END $$;

-- Step 3: Ensure customer_id is TEXT type (not UUID)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'opportunities' 
    AND column_name = 'customer_id'
    AND data_type = 'uuid'
  ) THEN
    -- First, drop the foreign key constraint if it exists
    ALTER TABLE public.opportunities 
      DROP CONSTRAINT IF EXISTS opportunities_customer_id_fkey;
    
    -- Convert customer_id to TEXT
    ALTER TABLE public.opportunities 
      ALTER COLUMN customer_id TYPE text;
    
    RAISE NOTICE 'Changed customer_id to TEXT in opportunities';
  ELSE
    RAISE NOTICE 'customer_id is already TEXT or does not exist';
  END IF;
END $$;

-- Step 4: Ensure organization_id exists and is TEXT
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'opportunities' 
    AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE public.opportunities 
      ADD COLUMN organization_id text;
    RAISE NOTICE 'Added organization_id column';
  ELSE
    RAISE NOTICE 'organization_id column already exists';
  END IF;
END $$;

-- Step 5: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_opportunities_customer 
  ON public.opportunities(customer_id);
  
CREATE INDEX IF NOT EXISTS idx_opportunities_owner 
  ON public.opportunities(owner_id);
  
CREATE INDEX IF NOT EXISTS idx_opportunities_org 
  ON public.opportunities(organization_id);
  
CREATE INDEX IF NOT EXISTS idx_opportunities_status 
  ON public.opportunities(status);

-- Step 6: Enable Row Level Security if not already enabled
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;

-- Step 7: Create RLS policies for multi-tenant isolation
DO $$ 
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "authenticated_users_read_opportunities" ON public.opportunities;
  DROP POLICY IF EXISTS "authenticated_users_insert_opportunities" ON public.opportunities;
  DROP POLICY IF EXISTS "authenticated_users_update_opportunities" ON public.opportunities;
  DROP POLICY IF EXISTS "authenticated_users_delete_opportunities" ON public.opportunities;
  
  -- Create new policies
  CREATE POLICY "authenticated_users_read_opportunities" 
    ON public.opportunities
    FOR SELECT 
    TO authenticated 
    USING (
      organization_id = COALESCE(
        current_setting('app.current_organization_id', true),
        (current_setting('request.jwt.claims', true)::json->>'organizationId')::text,
        auth.jwt()->>'organizationId'
      )
    );

  CREATE POLICY "authenticated_users_insert_opportunities" 
    ON public.opportunities
    FOR INSERT 
    TO authenticated 
    WITH CHECK (
      organization_id = COALESCE(
        current_setting('app.current_organization_id', true),
        (current_setting('request.jwt.claims', true)::json->>'organizationId')::text,
        auth.jwt()->>'organizationId'
      )
    );

  CREATE POLICY "authenticated_users_update_opportunities" 
    ON public.opportunities
    FOR UPDATE 
    TO authenticated 
    USING (
      organization_id = COALESCE(
        current_setting('app.current_organization_id', true),
        (current_setting('request.jwt.claims', true)::json->>'organizationId')::text,
        auth.jwt()->>'organizationId'
      )
    );

  CREATE POLICY "authenticated_users_delete_opportunities" 
    ON public.opportunities
    FOR DELETE 
    TO authenticated 
    USING (
      organization_id = COALESCE(
        current_setting('app.current_organization_id', true),
        (current_setting('request.jwt.claims', true)::json->>'organizationId')::text,
        auth.jwt()->>'organizationId'
      )
    );

  RAISE NOTICE 'Created RLS policies for opportunities';
END $$;

-- ============================================================================
-- VERIFY THE CHANGES
-- ============================================================================

-- Check the final schema
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'opportunities'
  AND column_name IN ('customer_id', 'owner_id', 'status', 'stage', 'organization_id', 'created_by')
ORDER BY column_name;

-- Show summary
DO $$
DECLARE
  rec RECORD;
BEGIN
  RAISE NOTICE '================================================';
  RAISE NOTICE 'OPPORTUNITIES TABLE MIGRATION COMPLETE';
  RAISE NOTICE '================================================';
  
  FOR rec IN 
    SELECT 
      column_name, 
      data_type, 
      is_nullable
    FROM information_schema.columns 
    WHERE table_name = 'opportunities'
    ORDER BY ordinal_position
  LOOP
    RAISE NOTICE 'Column: % | Type: % | Nullable: %', rec.column_name, rec.data_type, rec.is_nullable;
  END LOOP;
  
  RAISE NOTICE '================================================';
END $$;
