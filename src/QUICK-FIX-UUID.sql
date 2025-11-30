-- =============================================
-- QUICK FIX: Convert contacts to use UUID
-- =============================================
-- COPY AND PASTE THIS INTO SUPABASE SQL EDITOR
-- =============================================

-- This will delete all existing data and recreate tables with UUID
-- Run this entire script at once

BEGIN;

-- Drop all tables in correct order (child tables first)
DROP TABLE IF EXISTS bids CASCADE;
DROP TABLE IF EXISTS opportunities CASCADE;
DROP TABLE IF EXISTS project_managers CASCADE;
DROP TABLE IF EXISTS appointments CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS notes CASCADE;
DROP TABLE IF EXISTS contacts CASCADE;

-- Recreate contacts with UUID
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

-- Recreate project_managers with UUID
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

-- Recreate opportunities with UUID
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

-- Recreate bids with UUID
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

-- Recreate notes with UUID
CREATE TABLE notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    organization_id TEXT NOT NULL,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recreate tasks with UUID
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'pending',
    due_date DATE,
    priority TEXT DEFAULT 'medium',
    organization_id TEXT NOT NULL,
    created_by UUID,
    assigned_to UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recreate appointments with UUID
CREATE TABLE appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    location TEXT,
    organization_id TEXT NOT NULL,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_contacts_organization_id ON contacts(organization_id);
CREATE INDEX idx_contacts_email ON contacts(email);
CREATE INDEX idx_project_managers_customer_id ON project_managers(customer_id);
CREATE INDEX idx_opportunities_customer_id ON opportunities(customer_id);
CREATE INDEX idx_bids_opportunity_id ON bids(opportunity_id);
CREATE INDEX idx_notes_contact_id ON notes(contact_id);
CREATE INDEX idx_tasks_contact_id ON tasks(contact_id);
CREATE INDEX idx_appointments_contact_id ON appointments(contact_id);

-- Enable RLS
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_managers ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Create permissive policies
CREATE POLICY "Allow all authenticated" ON contacts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all authenticated" ON project_managers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all authenticated" ON opportunities FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all authenticated" ON bids FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all authenticated" ON notes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all authenticated" ON tasks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all authenticated" ON appointments FOR ALL USING (true) WITH CHECK (true);

COMMIT;

-- Test: Create a sample contact
INSERT INTO contacts (name, email, phone, company, organization_id)
VALUES ('Sample Contact', 'sample@test.com', '555-1234', 'Sample Company', 'test-org')
RETURNING id, name, email;

-- Verify the ID is a UUID
SELECT 
    table_name,
    column_name,
    data_type,
    column_default
FROM information_schema.columns
WHERE table_name = 'contacts' AND column_name = 'id';
