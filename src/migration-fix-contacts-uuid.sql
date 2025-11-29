-- =============================================
-- FIX CONTACTS TABLE ID TO USE UUID
-- =============================================
-- This script will convert the contacts table ID from integer to UUID
-- WARNING: This will delete all existing contacts!
-- =============================================

-- Step 1: Check current schema
SELECT 
    table_name,
    column_name,
    data_type,
    column_default
FROM information_schema.columns
WHERE table_name IN ('contacts', 'project_managers', 'opportunities', 'bids')
    AND column_name = 'id'
ORDER BY table_name;

-- Step 2: Check foreign key constraints
SELECT
    tc.table_name, 
    tc.constraint_name, 
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND (ccu.table_name = 'contacts' OR tc.table_name IN ('project_managers', 'opportunities', 'bids', 'notes', 'tasks', 'appointments'));

-- =============================================
-- EXECUTE THE FOLLOWING STEPS IN ORDER:
-- =============================================

-- Step 3: Drop all foreign key constraints that reference contacts
-- (Run this for each constraint found in Step 2)
-- Example:
-- ALTER TABLE project_managers DROP CONSTRAINT IF EXISTS project_managers_customer_id_fkey;
-- ALTER TABLE opportunities DROP CONSTRAINT IF EXISTS opportunities_customer_id_fkey;
-- ALTER TABLE bids DROP CONSTRAINT IF EXISTS bids_opportunity_id_fkey;
-- ALTER TABLE notes DROP CONSTRAINT IF EXISTS notes_contact_id_fkey;
-- ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_contact_id_fkey;
-- ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_contact_id_fkey;

-- Step 4: Backup and clear existing data (DESTRUCTIVE!)
-- DELETE FROM appointments WHERE contact_id IS NOT NULL;
-- DELETE FROM tasks WHERE contact_id IS NOT NULL;
-- DELETE FROM notes WHERE contact_id IS NOT NULL;
-- DELETE FROM bids;
-- DELETE FROM opportunities;
-- DELETE FROM project_managers;
-- DELETE FROM contacts;

-- Step 5: Drop and recreate the contacts table with UUID
DROP TABLE IF EXISTS contacts CASCADE;

CREATE TABLE contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    company TEXT,
    status TEXT DEFAULT 'Prospect',
    price_level TEXT DEFAULT 'tier1',
    organization_id TEXT NOT NULL,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 6: Drop and recreate project_managers table
DROP TABLE IF EXISTS project_managers CASCADE;

CREATE TABLE project_managers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    mailing_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 7: Drop and recreate opportunities table
DROP TABLE IF EXISTS opportunities CASCADE;

CREATE TABLE opportunities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    value DECIMAL(12, 2),
    stage TEXT DEFAULT 'prospecting',
    probability INTEGER DEFAULT 0,
    expected_close_date DATE,
    organization_id TEXT NOT NULL,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 8: Drop and recreate bids table
DROP TABLE IF EXISTS bids CASCADE;

CREATE TABLE bids (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    opportunity_id UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    amount DECIMAL(12, 2),
    status TEXT DEFAULT 'draft',
    submitted_date DATE,
    project_manager_id UUID REFERENCES project_managers(id) ON DELETE SET NULL,
    organization_id TEXT NOT NULL,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 9: Update notes table to use UUID for contact_id
ALTER TABLE notes DROP CONSTRAINT IF EXISTS notes_contact_id_fkey;
ALTER TABLE notes ALTER COLUMN contact_id TYPE UUID USING NULL;
ALTER TABLE notes ADD CONSTRAINT notes_contact_id_fkey 
    FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE;

-- Step 10: Update tasks table to use UUID for contact_id
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_contact_id_fkey;
ALTER TABLE tasks ALTER COLUMN contact_id TYPE UUID USING NULL;
ALTER TABLE tasks ADD CONSTRAINT tasks_contact_id_fkey 
    FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE;

-- Step 11: Update appointments table to use UUID for contact_id
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_contact_id_fkey;
ALTER TABLE appointments ALTER COLUMN contact_id TYPE UUID USING NULL;
ALTER TABLE appointments ADD CONSTRAINT appointments_contact_id_fkey 
    FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE;

-- Step 12: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_contacts_organization_id ON contacts(organization_id);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
CREATE INDEX IF NOT EXISTS idx_project_managers_customer_id ON project_managers(customer_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_customer_id ON opportunities(customer_id);
CREATE INDEX IF NOT EXISTS idx_bids_opportunity_id ON bids(opportunity_id);

-- Step 13: Enable RLS (Row Level Security) - but with permissive policies
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_managers ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE bids ENABLE ROW LEVEL SECURITY;

-- Step 14: Create permissive RLS policies (allow all authenticated users for now)
CREATE POLICY "Allow all for authenticated users" ON contacts
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for authenticated users" ON project_managers
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for authenticated users" ON opportunities
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for authenticated users" ON bids
    FOR ALL USING (true) WITH CHECK (true);

-- Step 15: Verify the changes
SELECT 
    table_name,
    column_name,
    data_type,
    column_default
FROM information_schema.columns
WHERE table_name IN ('contacts', 'project_managers', 'opportunities', 'bids')
    AND column_name = 'id'
ORDER BY table_name;

-- Test creating a new contact
INSERT INTO contacts (name, email, phone, company, organization_id)
VALUES ('Test Contact', 'test@example.com', '555-0100', 'Test Company', 'test-org')
RETURNING id, name, email;
