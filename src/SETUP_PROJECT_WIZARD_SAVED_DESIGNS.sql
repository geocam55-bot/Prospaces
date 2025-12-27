-- =====================================================
-- COMPLETE PROJECT WIZARD SAVED DESIGNS SETUP
-- Run this in your Supabase SQL Editor to ensure all tables are created
-- =====================================================

-- =====================================================
-- 1. CREATE SAVED DECK DESIGNS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.saved_deck_designs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  
  -- Design metadata
  name TEXT NOT NULL,
  description TEXT,
  
  -- Design configuration (JSON)
  config JSONB NOT NULL,
  
  -- Pricing information
  price_tier TEXT DEFAULT 't1', -- t1, t2, t3, t4, custom
  total_cost DECIMAL(10, 2) DEFAULT 0,
  
  -- Materials list (enriched with pricing)
  materials JSONB,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 2. CREATE SAVED SHED DESIGNS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.saved_shed_designs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  
  -- Design metadata
  name TEXT NOT NULL,
  description TEXT,
  
  -- Design configuration (JSON)
  config JSONB NOT NULL,
  
  -- Pricing information
  price_tier TEXT DEFAULT 't1', -- t1, t2, t3, t4, custom
  total_cost DECIMAL(10, 2) DEFAULT 0,
  
  -- Materials list (enriched with pricing)
  materials JSONB,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 3. CREATE SAVED GARAGE DESIGNS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.saved_garage_designs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  
  -- Design metadata
  name TEXT NOT NULL,
  description TEXT,
  
  -- Design configuration (JSON)
  config JSONB NOT NULL,
  
  -- Pricing information
  price_tier TEXT DEFAULT 't1', -- t1, t2, t3, t4, custom
  total_cost DECIMAL(10, 2) DEFAULT 0,
  
  -- Materials list (enriched with pricing)
  materials JSONB,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 4. CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Deck Designs Indexes
CREATE INDEX IF NOT EXISTS idx_saved_deck_designs_org ON saved_deck_designs(organization_id);
CREATE INDEX IF NOT EXISTS idx_saved_deck_designs_user ON saved_deck_designs(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_deck_designs_customer ON saved_deck_designs(customer_id);
CREATE INDEX IF NOT EXISTS idx_saved_deck_designs_created ON saved_deck_designs(created_at DESC);

-- Shed Designs Indexes
CREATE INDEX IF NOT EXISTS idx_saved_shed_designs_org ON saved_shed_designs(organization_id);
CREATE INDEX IF NOT EXISTS idx_saved_shed_designs_user ON saved_shed_designs(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_shed_designs_customer ON saved_shed_designs(customer_id);
CREATE INDEX IF NOT EXISTS idx_saved_shed_designs_created ON saved_shed_designs(created_at DESC);

-- Garage Designs Indexes
CREATE INDEX IF NOT EXISTS idx_saved_garage_designs_org ON saved_garage_designs(organization_id);
CREATE INDEX IF NOT EXISTS idx_saved_garage_designs_user ON saved_garage_designs(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_garage_designs_customer ON saved_garage_designs(customer_id);
CREATE INDEX IF NOT EXISTS idx_saved_garage_designs_created ON saved_garage_designs(created_at DESC);

-- =====================================================
-- 5. ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE saved_deck_designs ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_shed_designs ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_garage_designs ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 6. CREATE RLS POLICIES FOR DECK DESIGNS
-- =====================================================

DROP POLICY IF EXISTS "Users can view their organization's deck designs" ON saved_deck_designs;
CREATE POLICY "Users can view their organization's deck designs"
  ON saved_deck_designs FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create deck designs in their organization" ON saved_deck_designs;
CREATE POLICY "Users can create deck designs in their organization"
  ON saved_deck_designs FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
    AND user_id = auth.uid()
  );

DROP POLICY IF EXISTS "Users can update their own deck designs" ON saved_deck_designs;
CREATE POLICY "Users can update their own deck designs"
  ON saved_deck_designs FOR UPDATE
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own deck designs" ON saved_deck_designs;
CREATE POLICY "Users can delete their own deck designs"
  ON saved_deck_designs FOR DELETE
  USING (user_id = auth.uid());

-- =====================================================
-- 7. CREATE RLS POLICIES FOR SHED DESIGNS
-- =====================================================

DROP POLICY IF EXISTS "Users can view their organization's shed designs" ON saved_shed_designs;
CREATE POLICY "Users can view their organization's shed designs"
  ON saved_shed_designs FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create shed designs in their organization" ON saved_shed_designs;
CREATE POLICY "Users can create shed designs in their organization"
  ON saved_shed_designs FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
    AND user_id = auth.uid()
  );

DROP POLICY IF EXISTS "Users can update their own shed designs" ON saved_shed_designs;
CREATE POLICY "Users can update their own shed designs"
  ON saved_shed_designs FOR UPDATE
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own shed designs" ON saved_shed_designs;
CREATE POLICY "Users can delete their own shed designs"
  ON saved_shed_designs FOR DELETE
  USING (user_id = auth.uid());

-- =====================================================
-- 8. CREATE RLS POLICIES FOR GARAGE DESIGNS
-- =====================================================

DROP POLICY IF EXISTS "Users can view their organization's garage designs" ON saved_garage_designs;
CREATE POLICY "Users can view their organization's garage designs"
  ON saved_garage_designs FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create garage designs in their organization" ON saved_garage_designs;
CREATE POLICY "Users can create garage designs in their organization"
  ON saved_garage_designs FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
    AND user_id = auth.uid()
  );

DROP POLICY IF EXISTS "Users can update their own garage designs" ON saved_garage_designs;
CREATE POLICY "Users can update their own garage designs"
  ON saved_garage_designs FOR UPDATE
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own garage designs" ON saved_garage_designs;
CREATE POLICY "Users can delete their own garage designs"
  ON saved_garage_designs FOR DELETE
  USING (user_id = auth.uid());

-- =====================================================
-- 9. CREATE UPDATED_AT TRIGGER FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 10. CREATE TRIGGERS FOR UPDATED_AT
-- =====================================================

DROP TRIGGER IF EXISTS update_saved_deck_designs_updated_at ON saved_deck_designs;
CREATE TRIGGER update_saved_deck_designs_updated_at
  BEFORE UPDATE ON saved_deck_designs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_saved_shed_designs_updated_at ON saved_shed_designs;
CREATE TRIGGER update_saved_shed_designs_updated_at
  BEFORE UPDATE ON saved_shed_designs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_saved_garage_designs_updated_at ON saved_garage_designs;
CREATE TRIGGER update_saved_garage_designs_updated_at
  BEFORE UPDATE ON saved_garage_designs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 11. GRANT PERMISSIONS
-- =====================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON saved_deck_designs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON saved_shed_designs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON saved_garage_designs TO authenticated;

-- =====================================================
-- 12. VERIFICATION QUERIES
-- =====================================================

-- Verify tables exist
DO $$
BEGIN
  RAISE NOTICE '=== VERIFICATION RESULTS ===';
  
  -- Check if tables exist
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'saved_deck_designs') THEN
    RAISE NOTICE '✓ saved_deck_designs table exists';
  ELSE
    RAISE WARNING '✗ saved_deck_designs table NOT found';
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'saved_shed_designs') THEN
    RAISE NOTICE '✓ saved_shed_designs table exists';
  ELSE
    RAISE WARNING '✗ saved_shed_designs table NOT found';
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'saved_garage_designs') THEN
    RAISE NOTICE '✓ saved_garage_designs table exists';
  ELSE
    RAISE WARNING '✗ saved_garage_designs table NOT found';
  END IF;
  
  -- Check if project_wizard_defaults table exists
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'project_wizard_defaults') THEN
    RAISE NOTICE '✓ project_wizard_defaults table exists';
  ELSE
    RAISE WARNING '✗ project_wizard_defaults table NOT found - MATERIALS PRICING WILL NOT WORK';
  END IF;
  
  RAISE NOTICE '=== END VERIFICATION ===';
END
$$;

-- Show table counts
SELECT 
  'saved_deck_designs' as table_name,
  COUNT(*) as record_count
FROM saved_deck_designs
UNION ALL
SELECT 
  'saved_shed_designs' as table_name,
  COUNT(*) as record_count
FROM saved_shed_designs
UNION ALL
SELECT 
  'saved_garage_designs' as table_name,
  COUNT(*) as record_count
FROM saved_garage_designs
UNION ALL
SELECT 
  'project_wizard_defaults' as table_name,
  COUNT(*) as record_count
FROM project_wizard_defaults;

-- Show if project_wizard_defaults has any data
SELECT 
  planner_type,
  material_type,
  COUNT(*) as material_categories_configured
FROM project_wizard_defaults
GROUP BY planner_type, material_type
ORDER BY planner_type, material_type;