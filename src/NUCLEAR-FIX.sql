-- =============================================
-- NUCLEAR OPTION: Complete Reset with UUID
-- =============================================
-- This will COMPLETELY DESTROY and rebuild all tables
-- Run this in Supabase SQL Editor
-- =============================================

-- First, disable RLS on everything
ALTER TABLE IF EXISTS appointments DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS notes DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS bids DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS opportunities DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS project_managers DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS contacts DISABLE ROW LEVEL SECURITY;

-- Drop all policies
DROP POLICY IF EXISTS "Allow all authenticated" ON appointments;
DROP POLICY IF EXISTS "Allow all authenticated" ON tasks;
DROP POLICY IF EXISTS "Allow all authenticated" ON notes;
DROP POLICY IF EXISTS "Allow all authenticated" ON bids;
DROP POLICY IF EXISTS "Allow all authenticated" ON opportunities;
DROP POLICY IF EXISTS "Allow all authenticated" ON project_managers;
DROP POLICY IF EXISTS "Allow all authenticated" ON contacts;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON appointments;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON tasks;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON notes;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON bids;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON opportunities;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON project_managers;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON contacts;

-- Drop all tables (in correct dependency order)
DROP TABLE IF EXISTS appointments CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS notes CASCADE;
DROP TABLE IF EXISTS bids CASCADE;
DROP TABLE IF EXISTS opportunities CASCADE;
DROP TABLE IF EXISTS project_managers CASCADE;
DROP TABLE IF EXISTS contacts CASCADE;

-- Wait a moment (this is just a comment to separate operations)
-- Now recreate everything with UUID from scratch

-- =============================================
-- CONTACTS TABLE with UUID
-- =============================================
CREATE TABLE public.contacts (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    company TEXT,
    status TEXT DEFAULT 'Prospect'::text,
    price_level TEXT DEFAULT 'tier1'::text,
    organization_id TEXT NOT NULL,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    CONSTRAINT contacts_pkey PRIMARY KEY (id)
);

-- =============================================
-- PROJECT MANAGERS TABLE with UUID
-- =============================================
CREATE TABLE public.project_managers (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    mailing_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    CONSTRAINT project_managers_pkey PRIMARY KEY (id),
    CONSTRAINT project_managers_customer_id_fkey FOREIGN KEY (customer_id) 
        REFERENCES public.contacts(id) ON DELETE CASCADE
);

-- =============================================
-- OPPORTUNITIES TABLE with UUID
-- =============================================
CREATE TABLE public.opportunities (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    value NUMERIC(12,2),
    stage TEXT DEFAULT 'prospecting'::text,
    probability INTEGER DEFAULT 0,
    expected_close_date DATE,
    organization_id TEXT NOT NULL,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    CONSTRAINT opportunities_pkey PRIMARY KEY (id),
    CONSTRAINT opportunities_customer_id_fkey FOREIGN KEY (customer_id) 
        REFERENCES public.contacts(id) ON DELETE CASCADE
);

-- =============================================
-- BIDS TABLE with UUID
-- =============================================
CREATE TABLE public.bids (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    opportunity_id UUID NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    amount NUMERIC(12,2),
    status TEXT DEFAULT 'draft'::text,
    submitted_date DATE,
    project_manager_id UUID,
    organization_id TEXT NOT NULL,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    CONSTRAINT bids_pkey PRIMARY KEY (id),
    CONSTRAINT bids_opportunity_id_fkey FOREIGN KEY (opportunity_id) 
        REFERENCES public.opportunities(id) ON DELETE CASCADE,
    CONSTRAINT bids_project_manager_id_fkey FOREIGN KEY (project_manager_id) 
        REFERENCES public.project_managers(id) ON DELETE SET NULL
);

-- =============================================
-- NOTES TABLE with UUID
-- =============================================
CREATE TABLE public.notes (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    contact_id UUID,
    content TEXT NOT NULL,
    organization_id TEXT NOT NULL,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    CONSTRAINT notes_pkey PRIMARY KEY (id),
    CONSTRAINT notes_contact_id_fkey FOREIGN KEY (contact_id) 
        REFERENCES public.contacts(id) ON DELETE CASCADE
);

-- =============================================
-- TASKS TABLE with UUID
-- =============================================
CREATE TABLE public.tasks (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    contact_id UUID,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'pending'::text,
    due_date DATE,
    priority TEXT DEFAULT 'medium'::text,
    organization_id TEXT NOT NULL,
    created_by UUID,
    assigned_to UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    CONSTRAINT tasks_pkey PRIMARY KEY (id),
    CONSTRAINT tasks_contact_id_fkey FOREIGN KEY (contact_id) 
        REFERENCES public.contacts(id) ON DELETE CASCADE
);

-- =============================================
-- APPOINTMENTS TABLE with UUID
-- =============================================
CREATE TABLE public.appointments (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    contact_id UUID,
    title TEXT NOT NULL,
    description TEXT,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    location TEXT,
    organization_id TEXT NOT NULL,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    CONSTRAINT appointments_pkey PRIMARY KEY (id),
    CONSTRAINT appointments_contact_id_fkey FOREIGN KEY (contact_id) 
        REFERENCES public.contacts(id) ON DELETE CASCADE
);

-- =============================================
-- CREATE INDEXES
-- =============================================
CREATE INDEX idx_contacts_organization_id ON public.contacts(organization_id);
CREATE INDEX idx_contacts_email ON public.contacts(email);
CREATE INDEX idx_project_managers_customer_id ON public.project_managers(customer_id);
CREATE INDEX idx_opportunities_customer_id ON public.opportunities(customer_id);
CREATE INDEX idx_bids_opportunity_id ON public.bids(opportunity_id);
CREATE INDEX idx_bids_project_manager_id ON public.bids(project_manager_id);
CREATE INDEX idx_notes_contact_id ON public.notes(contact_id);
CREATE INDEX idx_tasks_contact_id ON public.tasks(contact_id);
CREATE INDEX idx_appointments_contact_id ON public.appointments(contact_id);

-- =============================================
-- ENABLE RLS BUT WITH PERMISSIVE POLICIES
-- =============================================
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_managers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Create wide-open policies (we'll lock this down later)
CREATE POLICY "contacts_all" ON public.contacts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "project_managers_all" ON public.project_managers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "opportunities_all" ON public.opportunities FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "bids_all" ON public.bids FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "notes_all" ON public.notes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "tasks_all" ON public.tasks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "appointments_all" ON public.appointments FOR ALL USING (true) WITH CHECK (true);

-- =============================================
-- VERIFICATION
-- =============================================

-- Check the schema
SELECT 
    table_name,
    column_name,
    data_type,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name IN ('contacts', 'project_managers', 'opportunities', 'bids')
    AND column_name = 'id'
ORDER BY table_name;

-- Test creating a contact
INSERT INTO public.contacts (name, email, phone, company, organization_id)
VALUES ('Test Contact', 'test@example.com', '555-1234', 'Test Co', 'test-org')
RETURNING id, name, email;

-- Show what was created
SELECT id, name, email, created_at FROM public.contacts ORDER BY created_at DESC LIMIT 3;
