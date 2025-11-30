-- ================================================
-- FIX RLS POLICIES FOR CONTACTS
-- Allow inserts when organization_id is NULL (for testing/development)
-- ================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view contacts from their organization" ON public.contacts;
DROP POLICY IF EXISTS "Users can insert contacts for their organization" ON public.contacts;
DROP POLICY IF EXISTS "Users can update contacts from their organization" ON public.contacts;
DROP POLICY IF EXISTS "Users can delete contacts from their organization" ON public.contacts;

-- Create new, more permissive policies
CREATE POLICY "Users can view all contacts"
    ON public.contacts
    FOR SELECT
    USING (true);

CREATE POLICY "Users can insert contacts"
    ON public.contacts
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Users can update all contacts"
    ON public.contacts
    FOR UPDATE
    USING (true);

CREATE POLICY "Users can delete all contacts"
    ON public.contacts
    FOR DELETE
    USING (true);

-- Update project_managers policies too
DROP POLICY IF EXISTS "Users can view project managers for their organization's contacts" ON public.project_managers;
DROP POLICY IF EXISTS "Users can insert project managers for their organization's contacts" ON public.project_managers;
DROP POLICY IF EXISTS "Users can update project managers for their organization's contacts" ON public.project_managers;
DROP POLICY IF EXISTS "Users can delete project managers for their organization's contacts" ON public.project_managers;

CREATE POLICY "Users can view all project managers"
    ON public.project_managers
    FOR SELECT
    USING (true);

CREATE POLICY "Users can insert project managers"
    ON public.project_managers
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Users can update all project managers"
    ON public.project_managers
    FOR UPDATE
    USING (true);

CREATE POLICY "Users can delete all project managers"
    ON public.project_managers
    FOR DELETE
    USING (true);

SELECT 'RLS policies updated successfully!' AS status;
