import { CheckCircle2, AlertCircle, Database, Copy, Loader2 } from 'lucide-react';
import { createClient } from '../utils/supabase/client';
import { toast } from 'sonner';

const supabase = createClient();

interface DatabaseAutoSetupProps {
  onComplete: () => void;
}

export function DatabaseAutoSetup({ onComplete }: DatabaseAutoSetupProps) {
  const [missingTables, setMissingTables] = useState<string[]>([]);
  const [isChecking, setIsChecking] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [createdTables, setCreatedTables] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState('');

  const REQUIRED_TABLES = [
    'contacts',
    'tasks',
    'appointments',
    'notes',
    'bids',
    'files',
    'inventory',
    'campaigns',
    'leads',
    'email_templates',
    'automation_workflows',
    'permissions'
  ];

  useEffect(() => {
    checkTables();
  }, []);

  const checkTables = async () => {
    setIsChecking(true);
    const missing: string[] = [];

    for (const table of REQUIRED_TABLES) {
      try {
        const { error } = await supabase
          .from(table)
          .select('id')
          .limit(1);

        if (error && error.code === 'PGRST205') {
          missing.push(table);
        }
      } catch (err) {
        console.error(`Error checking table ${table}:`, err);
      }
    }

    setMissingTables(missing);
    setIsChecking(false);
  };

  const createTables = async () => {
    setIsCreating(true);
    const created: string[] = [];

    try {
      // Create tables one by one
      for (const table of missingTables) {
        setCurrentStep(`Creating ${table} table...`);
        
        const sql = getTableSQL(table);
        
        // Execute SQL via Supabase REST API
        const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
        
        if (error) {
          console.error(`Failed to create ${table}:`, error);
          toast.error(`Failed to create ${table} table. Please use manual SQL setup.`);
        } else {
          created.push(table);
          setCreatedTables([...created]);
          toast.success(`✅ Created ${table} table`);
        }
      }

      setCurrentStep('Setup complete!');
      toast.success('🎉 All tables created successfully!');
      
      setTimeout(() => {
        onComplete();
      }, 2000);
    } catch (err) {
      console.error('Error creating tables:', err);
      toast.error('Failed to create tables. Please use manual SQL setup.');
    } finally {
      setIsCreating(false);
    }
  };

  const getTableSQL = (tableName: string): string => {
    const sqlMap: Record<string, string> = {
      contacts: `
        CREATE TABLE IF NOT EXISTS public.contacts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          organization_id TEXT NOT NULL,
          name TEXT NOT NULL,
          email TEXT,
          phone TEXT,
          company TEXT,
          position TEXT,
          status TEXT DEFAULT 'active',
          tags TEXT[],
          notes TEXT,
          created_by UUID REFERENCES auth.users(id),
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS contacts_org_idx ON public.contacts(organization_id);
        CREATE INDEX IF NOT EXISTS contacts_email_idx ON public.contacts(email);
        
        ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY "Users can view contacts in their org" ON public.contacts
          FOR SELECT USING (
            organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
          );
        
        CREATE POLICY "Users can insert contacts in their org" ON public.contacts
          FOR INSERT WITH CHECK (
            organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
          );
        
        CREATE POLICY "Users can update contacts in their org" ON public.contacts
          FOR UPDATE USING (
            organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
          );
        
        CREATE POLICY "Users can delete contacts in their org" ON public.contacts
          FOR DELETE USING (
            organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
          );
      `,
      tasks: `
        CREATE TABLE IF NOT EXISTS public.tasks (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          organization_id TEXT NOT NULL,
          title TEXT NOT NULL,
          description TEXT,
          status TEXT DEFAULT 'pending',
          priority TEXT DEFAULT 'medium',
          due_date TIMESTAMPTZ,
          assigned_to UUID REFERENCES auth.users(id),
          contact_id UUID REFERENCES public.contacts(id),
          created_by UUID REFERENCES auth.users(id),
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS tasks_org_idx ON public.tasks(organization_id);
        CREATE INDEX IF NOT EXISTS tasks_assigned_idx ON public.tasks(assigned_to);
        CREATE INDEX IF NOT EXISTS tasks_status_idx ON public.tasks(status);
        
        ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY "Users can view tasks in their org" ON public.tasks
          FOR SELECT USING (
            organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
          );
        
        CREATE POLICY "Users can insert tasks in their org" ON public.tasks
          FOR INSERT WITH CHECK (
            organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
          );
        
        CREATE POLICY "Users can update tasks in their org" ON public.tasks
          FOR UPDATE USING (
            organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
          );
        
        CREATE POLICY "Users can delete tasks in their org" ON public.tasks
          FOR DELETE USING (
            organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
          );
      `,
      appointments: `
        CREATE TABLE IF NOT EXISTS public.appointments (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          organization_id TEXT NOT NULL,
          title TEXT NOT NULL,
          description TEXT,
          start_time TIMESTAMPTZ NOT NULL,
          end_time TIMESTAMPTZ NOT NULL,
          location TEXT,
          attendees UUID[],
          contact_id UUID REFERENCES public.contacts(id),
          status TEXT DEFAULT 'scheduled',
          created_by UUID REFERENCES auth.users(id),
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS appointments_org_idx ON public.appointments(organization_id);
        CREATE INDEX IF NOT EXISTS appointments_start_idx ON public.appointments(start_time);
        
        ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY "Users can view appointments in their org" ON public.appointments
          FOR SELECT USING (
            organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
          );
        
        CREATE POLICY "Users can insert appointments in their org" ON public.appointments
          FOR INSERT WITH CHECK (
            organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
          );
        
        CREATE POLICY "Users can update appointments in their org" ON public.appointments
          FOR UPDATE USING (
            organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
          );
        
        CREATE POLICY "Users can delete appointments in their org" ON public.appointments
          FOR DELETE USING (
            organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
          );
      `,
      notes: `
        CREATE TABLE IF NOT EXISTS public.notes (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          organization_id TEXT NOT NULL,
          title TEXT,
          content TEXT NOT NULL,
          contact_id UUID REFERENCES public.contacts(id),
          task_id UUID REFERENCES public.tasks(id),
          created_by UUID REFERENCES auth.users(id),
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS notes_org_idx ON public.notes(organization_id);
        CREATE INDEX IF NOT EXISTS notes_contact_idx ON public.notes(contact_id);
        
        ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY "Users can view notes in their org" ON public.notes
          FOR SELECT USING (
            organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
          );
        
        CREATE POLICY "Users can insert notes in their org" ON public.notes
          FOR INSERT WITH CHECK (
            organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
          );
        
        CREATE POLICY "Users can update notes in their org" ON public.notes
          FOR UPDATE USING (
            organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
          );
        
        CREATE POLICY "Users can delete notes in their org" ON public.notes
          FOR DELETE USING (
            organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
          );
      `,
      bids: `
        CREATE TABLE IF NOT EXISTS public.bids (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          organization_id TEXT NOT NULL,
          title TEXT NOT NULL,
          amount DECIMAL(10,2),
          status TEXT DEFAULT 'draft',
          contact_id UUID REFERENCES public.contacts(id),
          valid_until TIMESTAMPTZ,
          created_by UUID REFERENCES auth.users(id),
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS bids_org_idx ON public.bids(organization_id);
        CREATE INDEX IF NOT EXISTS bids_contact_idx ON public.bids(contact_id);
        
        ALTER TABLE public.bids ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY "Users can view bids in their org" ON public.bids
          FOR SELECT USING (
            organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
          );
        
        CREATE POLICY "Users can insert bids in their org" ON public.bids
          FOR INSERT WITH CHECK (
            organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
          );
        
        CREATE POLICY "Users can update bids in their org" ON public.bids
          FOR UPDATE USING (
            organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
          );
        
        CREATE POLICY "Users can delete bids in their org" ON public.bids
          FOR DELETE USING (
            organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
          );
      `,
      files: `
        CREATE TABLE IF NOT EXISTS public.files (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          organization_id TEXT NOT NULL,
          name TEXT NOT NULL,
          file_path TEXT NOT NULL,
          file_type TEXT,
          file_size BIGINT,
          contact_id UUID REFERENCES public.contacts(id),
          created_by UUID REFERENCES auth.users(id),
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS files_org_idx ON public.files(organization_id);
        CREATE INDEX IF NOT EXISTS files_contact_idx ON public.files(contact_id);
        
        ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY "Users can view files in their org" ON public.files
          FOR SELECT USING (
            organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
          );
        
        CREATE POLICY "Users can insert files in their org" ON public.files
          FOR INSERT WITH CHECK (
            organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
          );
        
        CREATE POLICY "Users can update files in their org" ON public.files
          FOR UPDATE USING (
            organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
          );
        
        CREATE POLICY "Users can delete files in their org" ON public.files
          FOR DELETE USING (
            organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
          );
      `,
      inventory: `
        CREATE TABLE IF NOT EXISTS public.inventory (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          organization_id TEXT NOT NULL,
          name TEXT NOT NULL,
          description TEXT,
          sku TEXT,
          quantity INTEGER DEFAULT 0,
          quantity_on_order INTEGER DEFAULT 0,
          unit_price NUMERIC(12,2) DEFAULT 0,
          cost NUMERIC(12,2) DEFAULT 0,
          category TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        CREATE INDEX IF NOT EXISTS inventory_org_idx ON public.inventory(organization_id);
        CREATE INDEX IF NOT EXISTS inventory_sku_idx ON public.inventory(sku);
        
        ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY "Users can view inventory in their org" ON public.inventory
          FOR SELECT USING (
            organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
          );
        
        CREATE POLICY "Users can insert inventory in their org" ON public.inventory
          FOR INSERT WITH CHECK (
            organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
          );
        
        CREATE POLICY "Users can update inventory in their org" ON public.inventory
          FOR UPDATE USING (
            organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
          );
        
        CREATE POLICY "Users can delete inventory in their org" ON public.inventory
          FOR DELETE USING (
            organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
          );
      `,
      campaigns: `
        CREATE TABLE IF NOT EXISTS public.campaigns (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          organization_id TEXT NOT NULL,
          name TEXT NOT NULL,
          type TEXT DEFAULT 'email',
          status TEXT DEFAULT 'draft',
          start_date TIMESTAMPTZ,
          end_date TIMESTAMPTZ,
          target_audience JSONB,
          metrics JSONB,
          created_by UUID REFERENCES auth.users(id),
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS campaigns_org_idx ON public.campaigns(organization_id);
        CREATE INDEX IF NOT EXISTS campaigns_status_idx ON public.campaigns(status);
        
        ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY "Users can view campaigns in their org" ON public.campaigns
          FOR SELECT USING (
            organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
          );
        
        CREATE POLICY "Users can insert campaigns in their org" ON public.campaigns
          FOR INSERT WITH CHECK (
            organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
          );
        
        CREATE POLICY "Users can update campaigns in their org" ON public.campaigns
          FOR UPDATE USING (
            organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
          );
        
        CREATE POLICY "Users can delete campaigns in their org" ON public.campaigns
          FOR DELETE USING (
            organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
          );
      `,
      leads: `
        CREATE TABLE IF NOT EXISTS public.leads (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          organization_id TEXT NOT NULL,
          name TEXT NOT NULL,
          email TEXT,
          phone TEXT,
          company TEXT,
          source TEXT,
          score INTEGER DEFAULT 0,
          status TEXT DEFAULT 'new',
          contact_id UUID REFERENCES public.contacts(id),
          created_by UUID REFERENCES auth.users(id),
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS leads_org_idx ON public.leads(organization_id);
        CREATE INDEX IF NOT EXISTS leads_status_idx ON public.leads(status);
        CREATE INDEX IF NOT EXISTS leads_score_idx ON public.leads(score);
        
        ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY "Users can view leads in their org" ON public.leads
          FOR SELECT USING (
            organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
          );
        
        CREATE POLICY "Users can insert leads in their org" ON public.leads
          FOR INSERT WITH CHECK (
            organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
          );
        
        CREATE POLICY "Users can update leads in their org" ON public.leads
          FOR UPDATE USING (
            organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
          );
        
        CREATE POLICY "Users can delete leads in their org" ON public.leads
          FOR DELETE USING (
            organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
          );
      `,
      email_templates: `
        CREATE TABLE IF NOT EXISTS public.email_templates (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          organization_id TEXT NOT NULL,
          name TEXT NOT NULL,
          subject TEXT,
          body TEXT,
          variables JSONB,
          created_by UUID REFERENCES auth.users(id),
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS email_templates_org_idx ON public.email_templates(organization_id);
        
        ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY "Users can view email templates in their org" ON public.email_templates
          FOR SELECT USING (
            organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
          );
        
        CREATE POLICY "Users can insert email templates in their org" ON public.email_templates
          FOR INSERT WITH CHECK (
            organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
          );
        
        CREATE POLICY "Users can update email templates in their org" ON public.email_templates
          FOR UPDATE USING (
            organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
          );
        
        CREATE POLICY "Users can delete email templates in their org" ON public.email_templates
          FOR DELETE USING (
            organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
          );
      `,
      automation_workflows: `
        CREATE TABLE IF NOT EXISTS public.automation_workflows (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          organization_id TEXT NOT NULL,
          name TEXT NOT NULL,
          trigger_type TEXT,
          conditions JSONB,
          actions JSONB,
          status TEXT DEFAULT 'active',
          created_by UUID REFERENCES auth.users(id),
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS automation_workflows_org_idx ON public.automation_workflows(organization_id);
        CREATE INDEX IF NOT EXISTS automation_workflows_status_idx ON public.automation_workflows(status);
        
        ALTER TABLE public.automation_workflows ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY "Users can view automation workflows in their org" ON public.automation_workflows
          FOR SELECT USING (
            organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
          );
        
        CREATE POLICY "Users can insert automation workflows in their org" ON public.automation_workflows
          FOR INSERT WITH CHECK (
            organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
          );
        
        CREATE POLICY "Users can update automation workflows in their org" ON public.automation_workflows
          FOR UPDATE USING (
            organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
          );
        
        CREATE POLICY "Users can delete automation workflows in their org" ON public.automation_workflows
          FOR DELETE USING (
            organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
          );
      `,
      permissions: `
        CREATE TABLE IF NOT EXISTS public.permissions (\n          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          organization_id TEXT NOT NULL,
          module TEXT NOT NULL,
          role TEXT NOT NULL,
          visible BOOLEAN DEFAULT false,
          add BOOLEAN DEFAULT false,
          change BOOLEAN DEFAULT false,
          delete BOOLEAN DEFAULT false,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE(organization_id, module, role)
        );

        CREATE INDEX IF NOT EXISTS permissions_org_idx ON public.permissions(organization_id);
        CREATE INDEX IF NOT EXISTS permissions_role_idx ON public.permissions(role);
        CREATE INDEX IF NOT EXISTS permissions_module_idx ON public.permissions(module);
        
        ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY "Users can view all permissions" ON public.permissions
          FOR SELECT USING (true);
        
        CREATE POLICY "Only super_admin can modify permissions" ON public.permissions
          FOR ALL USING (
            EXISTS (
              SELECT 1 FROM public.profiles 
              WHERE id = auth.uid() 
              AND role = 'super_admin'
            )
          );
      `
    };

    return sqlMap[tableName] || '';
  };

  const getAllSQL = (): string => {
    return missingTables.map(table => getTableSQL(table)).join('\n\n');
  };

  const copySQL = () => {
    const sql = getAllSQL();
    copyToClipboard(sql);
    toast.success('📋 SQL copied to clipboard!');
  };

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Checking Database...</h3>
            <p className="text-sm text-gray-600">Verifying required tables</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (missingTables.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Database Ready!</h3>
            <p className="text-sm text-gray-600 mb-4">All required tables are set up</p>
            <Button onClick={onComplete}>Continue to CRM</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-red-100 p-4">
      <Card className="max-w-4xl w-full shadow-2xl">
        <CardHeader className="bg-red-50 border-b-2 border-red-200">
          <div className="text-center">
            <Database className="h-16 w-16 text-red-600 mx-auto mb-3" />
            <CardTitle className="text-3xl text-red-900">Database Setup Required</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-8">
          <Alert className="border-yellow-400 bg-yellow-50 mb-6">
            <AlertCircle className="h-5 w-5 text-yellow-600" />
            <AlertDescription className="text-yellow-900">
              <strong>Missing {missingTables.length} tables:</strong> Your CRM requires the following database tables to function properly.
            </AlertDescription>
          </Alert>

          <div className="space-y-6">
            <div className="bg-white border-2 border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Missing Tables:</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {missingTables.map((table) => (
                  <div
                    key={table}
                    className={`px-3 py-2 rounded text-sm ${
                      createdTables.includes(table)
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-50 text-red-800'
                    }`}
                  >
                    {createdTables.includes(table) ? '✓ ' : '⚠️ '}
                    {table}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-6">
              <h3 className="font-semibold text-blue-900 mb-3 text-lg">Setup Instructions:</h3>
              <p className="text-sm text-blue-800 mb-4">
                Copy the SQL below and execute it in your Supabase SQL Editor:
              </p>
              
              <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800 mb-4">
                <li>Go to your <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="underline font-semibold">Supabase Dashboard</a></li>
                <li>Click on "SQL Editor" in the left sidebar</li>
                <li>Click "New Query"</li>
                <li>Paste the SQL code (use the Copy button below)</li>
                <li>Click "Run" to execute the SQL</li>
                <li>Return here and click "Refresh" to verify</li>
              </ol>

              <div className="bg-white border border-blue-200 rounded p-4 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono text-gray-600">SQL Setup Script</span>
                  <Button
                    onClick={copySQL}
                    variant="outline"
                    size="sm"
                    className="h-8"
                  >
                    <Copy className="h-4 w-4 mr-1" />
                    Copy SQL
                  </Button>
                </div>
                <pre className="text-xs bg-gray-50 p-3 rounded overflow-x-auto max-h-64 overflow-y-auto">
                  {getAllSQL()}
                </pre>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={checkTables}
                  variant="outline"
                  className="flex-1"
                >
                  Refresh & Check Again
                </Button>
                <Button
                  onClick={onComplete}
                  variant="ghost"
                  className="flex-1"
                >
                  Skip for Now
                </Button>
              </div>
            </div>

            {isCreating && (
              <Alert className="border-blue-400 bg-blue-50">
                <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                <AlertDescription className="text-blue-900">
                  <strong>{currentStep}</strong>
                  <div className="mt-2 text-sm">
                    Created {createdTables.length} of {missingTables.length} tables
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
