-- Fix contacts table to use UUID instead of TEXT for ID
-- Run this in Supabase SQL Editor

-- Step 1: Create a new contacts table with UUID
CREATE TABLE IF NOT EXISTS public.contacts_new (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  phone text,
  company text,
  address text,
  notes text,
  status text DEFAULT 'active',
  owner_id uuid,
  organization_id text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Step 2: Copy data from old table to new table (if old table exists)
-- This will generate new UUIDs for all contacts
INSERT INTO public.contacts_new (name, email, phone, company, address, notes, status, organization_id, created_at, updated_at)
SELECT 
  name, 
  email, 
  phone, 
  company, 
  COALESCE(address, ''),
  notes,
  COALESCE(status, 'active'),
  COALESCE(organization_id, 'default-org'),
  COALESCE(created_at, now()),
  COALESCE(updated_at, now())
FROM public.contacts
WHERE NOT EXISTS (
  SELECT 1 FROM public.contacts_new WHERE contacts_new.email = contacts.email AND contacts_new.name = contacts.name
);

-- Step 3: Drop the old table
DROP TABLE IF EXISTS public.contacts CASCADE;

-- Step 4: Rename new table to contacts
ALTER TABLE public.contacts_new RENAME TO contacts;

-- Step 5: Create indexes
CREATE INDEX IF NOT EXISTS idx_contacts_organization ON public.contacts(organization_id);
CREATE INDEX IF NOT EXISTS idx_contacts_owner ON public.contacts(owner_id);
CREATE INDEX IF NOT EXISTS idx_contacts_status ON public.contacts(status);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON public.contacts(email);

-- Step 6: Enable RLS
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

-- Step 7: Create RLS Policies
DROP POLICY IF EXISTS "authenticated_users_read_contacts" ON public.contacts;
DROP POLICY IF EXISTS "authenticated_users_manage_contacts" ON public.contacts;

CREATE POLICY "authenticated_users_read_contacts" ON public.contacts
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_users_manage_contacts" ON public.contacts
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Step 8: Create updated_at trigger
CREATE OR REPLACE FUNCTION update_contacts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_contacts_updated_at ON public.contacts;
CREATE TRIGGER update_contacts_updated_at
  BEFORE UPDATE ON public.contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_contacts_updated_at();

-- ✅ Done! Now all new contacts will have proper UUIDs
