-- ProSpaces CRM - Complete Database Setup
-- Run this in Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql/new)

-- ============================================================================
-- PART 1: DROP EXISTING TABLES (Clean Slate)
-- ============================================================================

DROP TABLE IF EXISTS public.files CASCADE;
DROP TABLE IF EXISTS public.appointments CASCADE;
DROP TABLE IF EXISTS public.notes CASCADE;
DROP TABLE IF EXISTS public.tasks CASCADE;
DROP TABLE IF EXISTS public.bids CASCADE;
DROP TABLE IF EXISTS public.opportunities CASCADE;
DROP TABLE IF EXISTS public.project_managers CASCADE;
DROP TABLE IF EXISTS public.contacts CASCADE;
DROP TABLE IF EXISTS public.inventory CASCADE;
DROP TABLE IF EXISTS public.campaigns CASCADE;
DROP TABLE IF EXISTS public.leads CASCADE;
DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.permissions CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.organizations CASCADE;

-- Drop existing functions and triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- ============================================================================
-- PART 2: CREATE ORGANIZATIONS TABLE
-- ============================================================================

CREATE TABLE public.organizations (
  id text PRIMARY KEY,
  name text NOT NULL,
  status text DEFAULT 'active',
  logo text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_users_read_organizations" ON public.organizations
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_users_manage_organizations" ON public.organizations
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================================
-- PART 3: CREATE PROFILES TABLE
-- ============================================================================

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  name text NOT NULL,
  role text NOT NULL DEFAULT 'standard_user',
  organization_id text REFERENCES public.organizations(id) ON DELETE CASCADE,
  status text DEFAULT 'active',
  manager_id uuid,
  last_login timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_profiles_organization ON public.profiles(organization_id);
CREATE INDEX idx_profiles_status ON public.profiles(status);
CREATE INDEX idx_profiles_role ON public.profiles(role);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_users_select_profiles" ON public.profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "admins_can_insert_profiles" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = id OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

CREATE POLICY "users_can_update_profiles" ON public.profiles
  FOR UPDATE TO authenticated
  USING (
    auth.uid() = id OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin') OR
    EXISTS (SELECT 1 FROM public.profiles p1 WHERE p1.id = auth.uid() AND p1.role = 'admin' AND p1.organization_id = public.profiles.organization_id)
  )
  WITH CHECK (
    auth.uid() = id OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin') OR
    EXISTS (SELECT 1 FROM public.profiles p1 WHERE p1.id = auth.uid() AND p1.role = 'admin' AND p1.organization_id = public.profiles.organization_id)
  );

CREATE POLICY "admins_can_delete_profiles" ON public.profiles
  FOR DELETE TO authenticated
  USING (
    auth.uid() = id OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin') OR
    EXISTS (SELECT 1 FROM public.profiles p1 WHERE p1.id = auth.uid() AND p1.role = 'admin' AND p1.organization_id = public.profiles.organization_id)
  );

-- ============================================================================
-- PART 4: CREATE PERMISSIONS TABLE
-- ============================================================================

CREATE TABLE public.permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL,
  module text NOT NULL,
  visible boolean DEFAULT false,
  add boolean DEFAULT false,
  change boolean DEFAULT false,
  delete boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(role, module)
);

ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_users_read_permissions" ON public.permissions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "admins_manage_permissions" ON public.permissions
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin')));

-- ============================================================================
-- PART 5: CREATE CONTACTS TABLE
-- ============================================================================

CREATE TABLE public.contacts (
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

CREATE INDEX idx_contacts_organization ON public.contacts(organization_id);
CREATE INDEX idx_contacts_owner ON public.contacts(owner_id);
CREATE INDEX idx_contacts_status ON public.contacts(status);

ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_users_read_contacts" ON public.contacts
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_users_manage_contacts" ON public.contacts
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================================
-- PART 6: CREATE PROJECT_MANAGERS TABLE
-- ============================================================================

CREATE TABLE public.project_managers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id text NOT NULL,
  name text NOT NULL,
  email text,
  phone text,
  mailing_address text,
  organization_id text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_project_managers_customer ON public.project_managers(customer_id);
CREATE INDEX idx_project_managers_org ON public.project_managers(organization_id);

ALTER TABLE public.project_managers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_users_read_project_managers" ON public.project_managers
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_users_manage_project_managers" ON public.project_managers
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================================
-- PART 7: CREATE OPPORTUNITIES TABLE
-- ============================================================================

CREATE TABLE public.opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  customer_id text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  value numeric(12,2) DEFAULT 0,
  expected_close_date date,
  owner_id uuid,
  organization_id text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_opportunities_customer ON public.opportunities(customer_id);
CREATE INDEX idx_opportunities_owner ON public.opportunities(owner_id);
CREATE INDEX idx_opportunities_org ON public.opportunities(organization_id);
CREATE INDEX idx_opportunities_status ON public.opportunities(status);

ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_users_read_opportunities" ON public.opportunities
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_users_manage_opportunities" ON public.opportunities
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================================
-- PART 8: CREATE BIDS TABLE
-- ============================================================================

CREATE TABLE public.bids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid,
  title text NOT NULL,
  amount numeric(12,2) NOT NULL,
  status text DEFAULT 'pending',
  description text,
  customer_id uuid,
  owner_id uuid,
  organization_id text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_bids_opportunity ON public.bids(opportunity_id);
CREATE INDEX idx_bids_customer ON public.bids(customer_id);
CREATE INDEX idx_bids_owner ON public.bids(owner_id);
CREATE INDEX idx_bids_org ON public.bids(organization_id);
CREATE INDEX idx_bids_status ON public.bids(status);

ALTER TABLE public.bids ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_users_read_bids" ON public.bids
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_users_manage_bids" ON public.bids
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================================
-- PART 9: CREATE TASKS TABLE
-- ============================================================================

CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  status text DEFAULT 'pending',
  priority text DEFAULT 'medium',
  due_date timestamptz,
  contact_id uuid,
  assigned_to uuid,
  owner_id uuid,
  organization_id text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_tasks_contact ON public.tasks(contact_id);
CREATE INDEX idx_tasks_assigned ON public.tasks(assigned_to);
CREATE INDEX idx_tasks_owner ON public.tasks(owner_id);
CREATE INDEX idx_tasks_org ON public.tasks(organization_id);
CREATE INDEX idx_tasks_status ON public.tasks(status);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_users_read_tasks" ON public.tasks
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_users_manage_tasks" ON public.tasks
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================================
-- PART 10: CREATE NOTES TABLE
-- ============================================================================

CREATE TABLE public.notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text,
  contact_id uuid,
  owner_id uuid,
  organization_id text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_notes_contact ON public.notes(contact_id);
CREATE INDEX idx_notes_owner ON public.notes(owner_id);
CREATE INDEX idx_notes_org ON public.notes(organization_id);

ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_users_read_notes" ON public.notes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_users_manage_notes" ON public.notes
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================================
-- PART 11: CREATE APPOINTMENTS TABLE
-- ============================================================================

CREATE TABLE public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  location text,
  contact_id uuid,
  owner_id uuid,
  organization_id text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_appointments_contact ON public.appointments(contact_id);
CREATE INDEX idx_appointments_owner ON public.appointments(owner_id);
CREATE INDEX idx_appointments_org ON public.appointments(organization_id);
CREATE INDEX idx_appointments_start ON public.appointments(start_time);

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_users_read_appointments" ON public.appointments
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_users_manage_appointments" ON public.appointments
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================================
-- PART 12: CREATE INVENTORY TABLE
-- ============================================================================

CREATE TABLE public.inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  sku text,
  quantity integer DEFAULT 0,
  unit_price numeric(12,2) DEFAULT 0,
  cost numeric(12,2) DEFAULT 0,
  category text,
  organization_id text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_inventory_org ON public.inventory(organization_id);
CREATE INDEX idx_inventory_category ON public.inventory(category);
CREATE INDEX idx_inventory_sku ON public.inventory(sku);

ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_users_read_inventory" ON public.inventory
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_users_manage_inventory" ON public.inventory
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================================
-- PART 13: CREATE FILES TABLE
-- ============================================================================

CREATE TABLE public.files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filename text NOT NULL,
  file_url text NOT NULL,
  file_type text,
  file_size integer,
  contact_id uuid,
  owner_id uuid,
  organization_id text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_files_contact ON public.files(contact_id);
CREATE INDEX idx_files_owner ON public.files(owner_id);
CREATE INDEX idx_files_org ON public.files(organization_id);

ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_users_read_files" ON public.files
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_users_manage_files" ON public.files
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================================
-- PART 14: CREATE CAMPAIGNS TABLE (Marketing Automation)
-- ============================================================================

CREATE TABLE public.campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  type text NOT NULL,
  status text DEFAULT 'draft',
  start_date timestamptz,
  end_date timestamptz,
  owner_id uuid,
  organization_id text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_campaigns_owner ON public.campaigns(owner_id);
CREATE INDEX idx_campaigns_org ON public.campaigns(organization_id);
CREATE INDEX idx_campaigns_status ON public.campaigns(status);

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_users_read_campaigns" ON public.campaigns
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_users_manage_campaigns" ON public.campaigns
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================================
-- PART 15: CREATE LEADS TABLE
-- ============================================================================

CREATE TABLE public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  phone text,
  company text,
  source text,
  score integer DEFAULT 0,
  status text DEFAULT 'new',
  owner_id uuid,
  organization_id text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_leads_owner ON public.leads(owner_id);
CREATE INDEX idx_leads_org ON public.leads(organization_id);
CREATE INDEX idx_leads_status ON public.leads(status);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_users_read_leads" ON public.leads
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_users_manage_leads" ON public.leads
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================================
-- PART 16: CREATE AUDIT_LOGS TABLE
-- ============================================================================

CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id uuid,
  details jsonb,
  organization_id text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_audit_logs_user ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_org ON public.audit_logs(organization_id);
CREATE INDEX idx_audit_logs_resource ON public.audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_created ON public.audit_logs(created_at);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_users_read_audit_logs" ON public.audit_logs
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_users_insert_audit_logs" ON public.audit_logs
  FOR INSERT TO authenticated WITH CHECK (true);

-- ============================================================================
-- PART 17: CREATE DEFAULT ORGANIZATION
-- ============================================================================

INSERT INTO public.organizations (id, name, status)
VALUES ('default-org', 'ProSpaces CRM', 'active')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- PART 18: CREATE FUNCTION TO AUTO-CREATE PROFILE ON SIGNUP
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_org_id text;
BEGIN
  -- Get organization ID from metadata, default to 'default-org'
  v_org_id := COALESCE(new.raw_user_meta_data->>'organizationId', 'default-org');
  
  -- Create organization if it doesn't exist
  INSERT INTO public.organizations (id, name, status)
  VALUES (v_org_id, v_org_id, 'active')
  ON CONFLICT (id) DO NOTHING;
  
  -- Create profile
  INSERT INTO public.profiles (id, email, name, role, organization_id, status)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'role', 'standard_user'),
    v_org_id,
    'active'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    updated_at = now();
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- PART 19: SYNC EXISTING AUTH USERS TO PROFILES
-- ============================================================================

-- First, ensure all organizations from existing users are created
INSERT INTO public.organizations (id, name, status)
SELECT DISTINCT 
  COALESCE(raw_user_meta_data->>'organizationId', 'default-org') as org_id,
  COALESCE(raw_user_meta_data->>'organizationId', 'default-org') as org_name,
  'active' as status
FROM auth.users
WHERE COALESCE(raw_user_meta_data->>'organizationId', 'default-org') NOT IN (SELECT id FROM public.organizations)
ON CONFLICT (id) DO NOTHING;

-- Then sync users to profiles
INSERT INTO public.profiles (id, email, name, role, organization_id, status)
SELECT 
  id,
  email,
  COALESCE(raw_user_meta_data->>'name', split_part(email, '@', 1)),
  COALESCE(raw_user_meta_data->>'role', 'standard_user'),
  COALESCE(raw_user_meta_data->>'organizationId', 'default-org'),
  'active'
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  name = EXCLUDED.name,
  updated_at = now();

-- ============================================================================
-- PART 20: INSERT DEFAULT PERMISSIONS
-- ============================================================================

INSERT INTO public.permissions (role, module, visible, add, change, delete) VALUES
-- Super Admin - Full access to everything
('super_admin', 'contacts', true, true, true, true),
('super_admin', 'tasks', true, true, true, true),
('super_admin', 'notes', true, true, true, true),
('super_admin', 'bids', true, true, true, true),
('super_admin', 'opportunities', true, true, true, true),
('super_admin', 'appointments', true, true, true, true),
('super_admin', 'inventory', true, true, true, true),
('super_admin', 'campaigns', true, true, true, true),
('super_admin', 'leads', true, true, true, true),
('super_admin', 'files', true, true, true, true),
('super_admin', 'users', true, true, true, true),
('super_admin', 'dashboard', true, true, true, true),
('super_admin', 'email', true, true, true, true),
('super_admin', 'marketing', true, true, true, true),
('super_admin', 'settings', true, true, true, true),
('super_admin', 'tenants', true, true, true, true),
('super_admin', 'security', true, true, true, true),
('super_admin', 'import-export', true, true, true, true),

-- Admin - Full access within organization
('admin', 'contacts', true, true, true, true),
('admin', 'tasks', true, true, true, true),
('admin', 'notes', true, true, true, true),
('admin', 'bids', true, true, true, true),
('admin', 'opportunities', true, true, true, true),
('admin', 'appointments', true, true, true, true),
('admin', 'inventory', true, true, true, true),
('admin', 'campaigns', true, true, true, true),
('admin', 'leads', true, true, true, true),
('admin', 'files', true, true, true, true),
('admin', 'users', true, true, true, true),

-- Manager - Can manage team data
('manager', 'contacts', true, true, true, true),
('manager', 'tasks', true, true, true, true),
('manager', 'notes', true, true, true, false),
('manager', 'bids', true, true, true, true),
('manager', 'opportunities', true, true, true, true),
('manager', 'appointments', true, true, true, true),
('manager', 'inventory', false, true, true, false),
('manager', 'campaigns', false, true, false, false),
('manager', 'leads', true, true, true, true),
('manager', 'files', true, true, true, false),
('manager', 'users', false, true, false, false),

-- Marketing - Full access to campaigns and leads
('marketing', 'contacts', true, true, true, false),
('marketing', 'tasks', true, true, true, true),
('marketing', 'notes', true, true, true, true),
('marketing', 'bids', false, true, false, false),
('marketing', 'opportunities', false, true, false, false),
('marketing', 'appointments', true, true, true, true),
('marketing', 'inventory', false, true, false, false),
('marketing', 'campaigns', true, true, true, true),
('marketing', 'leads', true, true, true, true),
('marketing', 'files', true, true, true, false),
('marketing', 'users', false, true, false, false),

-- Standard User - Own data only
('standard_user', 'contacts', true, true, true, false),
('standard_user', 'tasks', true, true, true, true),
('standard_user', 'notes', true, true, true, true),
('standard_user', 'bids', true, true, true, false),
('standard_user', 'opportunities', true, true, true, false),
('standard_user', 'appointments', true, true, true, true),
('standard_user', 'inventory', false, true, false, false),
('standard_user', 'campaigns', false, true, false, false),
('standard_user', 'leads', true, true, true, false),
('standard_user', 'files', true, true, true, false),
('standard_user', 'users', false, true, false, false)

ON CONFLICT (role, module) DO UPDATE SET
  visible = EXCLUDED.visible,
  add = EXCLUDED.add,
  change = EXCLUDED.change,
  delete = EXCLUDED.delete,
  updated_at = now();

-- ============================================================================
-- ✅ SETUP COMPLETE!
-- ============================================================================
-- ProSpaces CRM database is now fully initialized with:
-- ✓ Organizations & Profiles
-- ✓ Contacts & Project Managers
-- ✓ Opportunities & Bids
-- ✓ Tasks, Notes, Appointments
-- ✓ Inventory & Files
-- ✓ Marketing (Campaigns & Leads)
-- ✓ Audit Logs
-- ✓ Role-based Permissions
-- ✓ Row Level Security (RLS)
-- ============================================================================