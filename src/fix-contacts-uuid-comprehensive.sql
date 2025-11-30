-- ================================================
-- COMPREHENSIVE CONTACTS TABLE UUID FIX
-- This script will properly set up the contacts table with UUID generation
-- ================================================

-- Step 1: Drop the existing contacts table completely
DROP TABLE IF EXISTS public.contacts CASCADE;

-- Step 2: Drop project_managers if it exists (depends on contacts)
DROP TABLE IF EXISTS public.project_managers CASCADE;

-- Step 3: Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Step 4: Create contacts table with proper UUID generation
CREATE TABLE public.contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    company TEXT,
    status TEXT DEFAULT 'Prospect',
    price_level TEXT DEFAULT 'tier1',
    owner_id UUID,
    organization_id TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 5: Create project_managers table with proper UUID generation
CREATE TABLE public.project_managers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    mailing_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 6: Enable RLS on both tables
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_managers ENABLE ROW LEVEL SECURITY;

-- Step 7: Create RLS policies for contacts
CREATE POLICY "Users can view contacts from their organization"
    ON public.contacts
    FOR SELECT
    USING (
        organization_id = (auth.jwt() -> 'user_metadata' ->> 'organizationId')
        OR organization_id IS NULL
    );

CREATE POLICY "Users can insert contacts for their organization"
    ON public.contacts
    FOR INSERT
    WITH CHECK (
        organization_id = (auth.jwt() -> 'user_metadata' ->> 'organizationId')
        OR organization_id IS NULL
    );

CREATE POLICY "Users can update contacts from their organization"
    ON public.contacts
    FOR UPDATE
    USING (
        organization_id = (auth.jwt() -> 'user_metadata' ->> 'organizationId')
        OR organization_id IS NULL
    );

CREATE POLICY "Users can delete contacts from their organization"
    ON public.contacts
    FOR DELETE
    USING (
        organization_id = (auth.jwt() -> 'user_metadata' ->> 'organizationId')
        OR organization_id IS NULL
    );

-- Step 8: Create RLS policies for project_managers
CREATE POLICY "Users can view project managers for their organization's contacts"
    ON public.project_managers
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.contacts
            WHERE contacts.id = project_managers.customer_id
            AND (
                contacts.organization_id = (auth.jwt() -> 'user_metadata' ->> 'organizationId')
                OR contacts.organization_id IS NULL
            )
        )
    );

CREATE POLICY "Users can insert project managers for their organization's contacts"
    ON public.project_managers
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.contacts
            WHERE contacts.id = project_managers.customer_id
            AND (
                contacts.organization_id = (auth.jwt() -> 'user_metadata' ->> 'organizationId')
                OR contacts.organization_id IS NULL
            )
        )
    );

CREATE POLICY "Users can update project managers for their organization's contacts"
    ON public.project_managers
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.contacts
            WHERE contacts.id = project_managers.customer_id
            AND (
                contacts.organization_id = (auth.jwt() -> 'user_metadata' ->> 'organizationId')
                OR contacts.organization_id IS NULL
            )
        )
    );

CREATE POLICY "Users can delete project managers for their organization's contacts"
    ON public.project_managers
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.contacts
            WHERE contacts.id = project_managers.customer_id
            AND (
                contacts.organization_id = (auth.jwt() -> 'user_metadata' ->> 'organizationId')
                OR contacts.organization_id IS NULL
            )
        )
    );

-- Step 9: Create indexes for better performance
CREATE INDEX idx_contacts_organization_id ON public.contacts(organization_id);
CREATE INDEX idx_contacts_email ON public.contacts(email);
CREATE INDEX idx_project_managers_customer_id ON public.project_managers(customer_id);

-- Step 10: Create a function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Step 11: Create triggers for auto-updating updated_at
CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON public.contacts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_project_managers_updated_at BEFORE UPDATE ON public.project_managers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- VERIFICATION: Test that UUID generation works
-- ================================================
-- This will create a test contact and show its UUID
DO $$
DECLARE
    test_id UUID;
BEGIN
    INSERT INTO public.contacts (name, email, phone, company, status)
    VALUES ('Test Contact', 'test@example.com', '555-0000', 'Test Company', 'Prospect')
    RETURNING id INTO test_id;
    
    RAISE NOTICE 'Successfully created test contact with UUID: %', test_id;
    
    -- Clean up the test contact
    DELETE FROM public.contacts WHERE id = test_id;
    RAISE NOTICE 'Test contact deleted. Your contacts table is ready!';
END $$;

-- ================================================
-- SUCCESS MESSAGE
-- ================================================
SELECT 'Contacts table successfully recreated with UUID support!' AS status;
