-- ================================================
-- SIMPLE OPPORTUNITIES TABLE FIX
-- This migration fixes the opportunities table to match what the app expects
-- Safe to run multiple times (idempotent)
-- ================================================

-- Step 1: Add owner_id column if it doesn't exist
DO $$ 
BEGIN
  -- Check if owner_id exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'opportunities' 
    AND column_name = 'owner_id'
  ) THEN
    ALTER TABLE public.opportunities ADD COLUMN owner_id uuid;
    RAISE NOTICE '✓ Added owner_id column';
    
    -- If created_by exists, copy its data
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public'
      AND table_name = 'opportunities' 
      AND column_name = 'created_by'
    ) THEN
      UPDATE public.opportunities SET owner_id = created_by WHERE created_by IS NOT NULL;
      RAISE NOTICE '✓ Copied created_by to owner_id';
    END IF;
  ELSE
    RAISE NOTICE '- owner_id column already exists';
  END IF;
END $$;

-- Step 2: Add status column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public'
    AND table_name = 'opportunities' 
    AND column_name = 'status'
  ) THEN
    ALTER TABLE public.opportunities ADD COLUMN status text DEFAULT 'open';
    RAISE NOTICE '✓ Added status column';
    
    -- If stage exists, copy its data
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public'
      AND table_name = 'opportunities' 
      AND column_name = 'stage'
    ) THEN
      -- Map old stage values to new status values
      UPDATE public.opportunities 
      SET status = CASE 
        WHEN stage = 'prospecting' THEN 'open'
        WHEN stage = 'qualification' THEN 'open'
        WHEN stage = 'proposal' THEN 'in_progress'
        WHEN stage = 'negotiation' THEN 'in_progress'
        WHEN stage = 'closed_won' THEN 'won'
        WHEN stage = 'closed_lost' THEN 'lost'
        ELSE 'open'
      END
      WHERE stage IS NOT NULL;
      RAISE NOTICE '✓ Copied and mapped stage to status';
    END IF;
  ELSE
    RAISE NOTICE '- status column already exists';
  END IF;
END $$;

-- Step 3: Ensure organization_id column exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public'
    AND table_name = 'opportunities' 
    AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE public.opportunities ADD COLUMN organization_id text;
    RAISE NOTICE '✓ Added organization_id column';
  ELSE
    RAISE NOTICE '- organization_id column already exists';
  END IF;
END $$;

-- Step 4: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_opportunities_customer 
  ON public.opportunities(customer_id);
  
CREATE INDEX IF NOT EXISTS idx_opportunities_owner 
  ON public.opportunities(owner_id);
  
CREATE INDEX IF NOT EXISTS idx_opportunities_org 
  ON public.opportunities(organization_id);
  
CREATE INDEX IF NOT EXISTS idx_opportunities_status 
  ON public.opportunities(status);

DO $$
BEGIN
  RAISE NOTICE '✓ Created/verified indexes';
END $$;

-- Step 5: Enable Row Level Security
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  RAISE NOTICE '✓ Enabled RLS';
END $$;

-- Step 6: Drop and recreate RLS policies
DO $$ 
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "opportunities_select_policy" ON public.opportunities;
  DROP POLICY IF EXISTS "opportunities_insert_policy" ON public.opportunities;
  DROP POLICY IF EXISTS "opportunities_update_policy" ON public.opportunities;
  DROP POLICY IF EXISTS "opportunities_delete_policy" ON public.opportunities;
  DROP POLICY IF EXISTS "authenticated_users_read_opportunities" ON public.opportunities;
  DROP POLICY IF EXISTS "authenticated_users_insert_opportunities" ON public.opportunities;
  DROP POLICY IF EXISTS "authenticated_users_update_opportunities" ON public.opportunities;
  DROP POLICY IF EXISTS "authenticated_users_delete_opportunities" ON public.opportunities;
  
  RAISE NOTICE '✓ Dropped old policies';
  
  -- Create new policies that work with or without organization_id
  CREATE POLICY "opportunities_select_policy" 
    ON public.opportunities
    FOR SELECT 
    TO authenticated 
    USING (
      organization_id IS NULL OR
      organization_id = COALESCE(
        (auth.jwt()->>'organizationId')::text,
        (current_setting('request.jwt.claims', true)::json->>'organizationId')::text,
        ''
      )
    );

  CREATE POLICY "opportunities_insert_policy" 
    ON public.opportunities
    FOR INSERT 
    TO authenticated 
    WITH CHECK (true);

  CREATE POLICY "opportunities_update_policy" 
    ON public.opportunities
    FOR UPDATE 
    TO authenticated 
    USING (
      organization_id IS NULL OR
      organization_id = COALESCE(
        (auth.jwt()->>'organizationId')::text,
        (current_setting('request.jwt.claims', true)::json->>'organizationId')::text,
        ''
      )
    );

  CREATE POLICY "opportunities_delete_policy" 
    ON public.opportunities
    FOR DELETE 
    TO authenticated 
    USING (
      organization_id IS NULL OR
      organization_id = COALESCE(
        (auth.jwt()->>'organizationId')::text,
        (current_setting('request.jwt.claims', true)::json->>'organizationId')::text,
        ''
      )
    );

  RAISE NOTICE '✓ Created RLS policies';
END $$;

-- Step 7: Show final schema
DO $$
DECLARE
  rec RECORD;
BEGIN
  RAISE NOTICE '================================================';
  RAISE NOTICE 'OPPORTUNITIES TABLE SCHEMA:';
  RAISE NOTICE '================================================';
  
  FOR rec IN 
    SELECT 
      column_name, 
      data_type,
      character_maximum_length,
      is_nullable,
      column_default
    FROM information_schema.columns 
    WHERE table_schema = 'public'
    AND table_name = 'opportunities'
    ORDER BY ordinal_position
  LOOP
    RAISE NOTICE '  % (%) %', 
      rec.column_name, 
      rec.data_type,
      CASE WHEN rec.is_nullable = 'NO' THEN 'NOT NULL' ELSE 'NULL' END;
  END LOOP;
  
  RAISE NOTICE '================================================';
  RAISE NOTICE '✅ Migration complete!';
  RAISE NOTICE '================================================';
END $$;