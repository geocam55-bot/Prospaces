import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Loader2, CheckCircle2, XCircle, Database, Trash2 } from 'lucide-react';
import { createClient } from '../utils/supabase/client';
import { contactsAPI, opportunitiesAPI, bidsAPI, projectManagersAPI } from '../utils/api';

interface TestDataStats {
  contacts: number;
  opportunities: number;
  bids: number;
  projectManagers: number;
}

export function TestDataGenerator() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [stats, setStats] = useState<TestDataStats | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [generatedData, setGeneratedData] = useState<{
    contacts: any[];
    opportunities: any[];
    bids: any[];
    projectManagers: any[];
  } | null>(null);
  const [schemaIssues, setSchemaIssues] = useState<string[]>([]);

  const checkDatabaseSchema = async () => {
    const supabase = createClient();
    const issues: string[] = [];

    try {
      // Check contacts table
      const { data: contactSample, error: contactError } = await supabase
        .from('contacts')
        .select('*')
        .limit(1);
      
      if (contactError) {
        issues.push(`❌ Contacts table: ${contactError.message}`);
      } else {
        issues.push('✅ Contacts table exists');
      }

      // Check opportunities table
      const { data: oppSample, error: oppError } = await supabase
        .from('opportunities')
        .select('*')
        .limit(1);
      
      if (oppError) {
        issues.push(`❌ Opportunities table: ${oppError.message}`);
      } else {
        issues.push('✅ Opportunities table exists');
        // Check if it has the correct columns
        if (oppSample && oppSample.length > 0) {
          const columns = Object.keys(oppSample[0]);
          const hasCustomerId = columns.includes('customer_id');
          const hasStatus = columns.includes('status') || columns.includes('stage');
          const hasOwnerId = columns.includes('owner_id') || columns.includes('created_by');
          
          if (!hasCustomerId) issues.push('⚠️ Opportunities missing customer_id column');
          if (!hasStatus) issues.push('⚠️ Opportunities missing status/stage column');
          if (!hasOwnerId) issues.push('⚠️ Opportunities missing owner_id/created_by column');
        }
      }

      // Check bids table
      const { data: bidSample, error: bidError } = await supabase
        .from('bids')
        .select('*')
        .limit(1);
      
      if (bidError) {
        issues.push(`❌ Bids table: ${bidError.message}`);
      } else {
        issues.push('✅ Bids table exists');
        // Check bid columns
        if (bidSample && bidSample.length > 0) {
          const columns = Object.keys(bidSample[0]);
          const hasOpportunityId = columns.includes('opportunity_id');
          const hasOrgId = columns.includes('organization_id');
          const hasProjectManagerId = columns.includes('project_manager_id');
          
          if (!hasOpportunityId) issues.push('⚠️ Bids missing opportunity_id column');
          if (!hasOrgId) issues.push('⚠️ Bids missing organization_id column');
          if (hasProjectManagerId) issues.push('✅ Bids has project_manager_id column');
        }
      }

      // Check project_managers table
      const { data: pmSample, error: pmError } = await supabase
        .from('project_managers')
        .select('*')
        .limit(1);
      
      if (pmError) {
        issues.push(`❌ Project Managers table: ${pmError.message}`);
      } else {
        issues.push('✅ Project Managers table exists');
      }

      return issues;
    } catch (error: any) {
      issues.push(`❌ Error checking schema: ${error.message}`);
      return issues;
    }
  };

  const checkCurrentData = async () => {
    setIsChecking(true);
    setMessage(null);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setMessage({ type: 'error', text: 'Not authenticated' });
        return;
      }

      const organizationId = user.user_metadata?.organizationId;
      
      // Check schema first
      const schemaResults = await checkDatabaseSchema();
      setSchemaIssues(schemaResults);

      // Get all data counts
      const [contactsData, oppsData, bidsData, pmsData] = await Promise.all([
        contactsAPI.getAll(),
        opportunitiesAPI.getAll(),
        bidsAPI.getAll(),
        projectManagersAPI.getAll().catch(() => ({ projectManagers: [] })),
      ]);

      const currentStats: TestDataStats = {
        contacts: contactsData.contacts?.length || 0,
        opportunities: oppsData.opportunities?.length || 0,
        bids: bidsData.bids?.length || 0,
        projectManagers: pmsData.projectManagers?.length || 0,
      };

      setStats(currentStats);
      setMessage({ 
        type: 'info', 
        text: `Current data: ${currentStats.contacts} contacts, ${currentStats.opportunities} opportunities, ${currentStats.bids} bids, ${currentStats.projectManagers} project managers` 
      });
    } catch (error: any) {
      console.error('Error checking data:', error);
      setMessage({ type: 'error', text: `Error: ${error.message}` });
    } finally {
      setIsChecking(false);
    }
  };

  const generateTestData = async () => {
    setIsGenerating(true);
    setMessage(null);
    const generated = {
      contacts: [] as any[],
      opportunities: [] as any[],
      bids: [] as any[],
      projectManagers: [] as any[],
    };

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setMessage({ type: 'error', text: 'Not authenticated. Please log in first.' });
        return;
      }

      const organizationId = user.user_metadata?.organizationId;
      
      if (!organizationId) {
        setMessage({ type: 'error', text: 'No organization ID found. Please check your user profile.' });
        return;
      }

      // Step 1: Create test contacts
      setMessage({ type: 'info', text: 'Creating test contacts...' });
      
      const testContacts = [
        { name: 'Acme Corporation', email: 'contact@acme.com', phone: '555-0101', company: 'Acme Corp' },
        { name: 'TechStart Inc', email: 'hello@techstart.com', phone: '555-0102', company: 'TechStart' },
        { name: 'Global Industries', email: 'info@global.com', phone: '555-0103', company: 'Global Industries' },
      ];

      for (const contact of testContacts) {
        const result = await contactsAPI.create(contact);
        generated.contacts.push(result.contact);
        console.log('Created contact:', result.contact);
      }

      // Step 2: Create project managers for each contact
      setMessage({ type: 'info', text: 'Creating project managers...' });
      
      const pmNames = ['John Smith', 'Sarah Johnson', 'Mike Davis'];
      for (let i = 0; i < generated.contacts.length; i++) {
        const contact = generated.contacts[i];
        const pmResult = await projectManagersAPI.create({
          customerId: contact.id,
          name: pmNames[i],
          email: `${pmNames[i].toLowerCase().replace(' ', '.')}@example.com`,
          phone: `555-020${i + 1}`,
        });
        generated.projectManagers.push(pmResult.projectManager);
        console.log('Created project manager:', pmResult.projectManager);
      }

      // Step 3: Create opportunities for each contact
      setMessage({ type: 'info', text: 'Creating opportunities...' });
      
      const oppTitles = [
        'Q1 2024 Software License',
        'Office Equipment Upgrade',
        'Annual Service Contract',
      ];

      for (let i = 0; i < generated.contacts.length; i++) {
        const contact = generated.contacts[i];
        const oppResult = await opportunitiesAPI.create({
          title: oppTitles[i],
          description: `Strategic opportunity for ${contact.name}`,
          customerId: contact.id,
          status: 'open',
          value: (i + 1) * 50000,
          expectedCloseDate: new Date(Date.now() + (i + 1) * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        });
        generated.opportunities.push(oppResult.opportunity);
        console.log('Created opportunity:', oppResult.opportunity);
      }

      // Step 4: Create bids for each opportunity
      setMessage({ type: 'info', text: 'Creating bids...' });
      
      for (let i = 0; i < generated.opportunities.length; i++) {
        const opp = generated.opportunities[i];
        const contact = generated.contacts[i];
        const pm = generated.projectManagers[i];
        
        // Create 2 bids per opportunity
        for (let j = 0; j < 2; j++) {
          const bidAmount = opp.value * (0.8 + (j * 0.2)); // 80% and 100% of opportunity value
          const taxRate = 8.5; // 8.5% tax
          const subtotal = bidAmount / (1 + taxRate / 100);
          const taxAmount = bidAmount - subtotal;
          
          const bidData = {
            title: `${opp.title} - Proposal ${j + 1}`,
            opportunity_id: opp.id,
            project_manager_id: pm.id,
            amount: bidAmount,
            subtotal: Math.round(subtotal * 100) / 100,
            tax_rate: taxRate,
            tax_amount: Math.round(taxAmount * 100) / 100,
            status: j === 0 ? 'draft' : 'submitted',
            description: `Test bid ${j + 1} for ${opp.title}`,
            notes: `This is a test bid created by the data generator. It includes ${j === 0 ? 'draft' : 'submitted'} status.`,
            valid_until: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            submitted_date: j === 1 ? new Date().toISOString().split('T')[0] : null,
            items: JSON.stringify([
              {
                id: crypto.randomUUID(),
                itemName: 'Professional Services',
                sku: `SERV-${i}-${j}-001`,
                quantity: 1,
                unitPrice: Math.round(subtotal * 0.6 * 100) / 100,
                discount: 0,
                total: Math.round(subtotal * 0.6 * 100) / 100,
              },
              {
                id: crypto.randomUUID(),
                itemName: 'Software License',
                sku: `LIC-${i}-${j}-002`,
                quantity: 10,
                unitPrice: Math.round(subtotal * 0.04 * 100) / 100,
                discount: 0,
                total: Math.round(subtotal * 0.4 * 100) / 100,
              }
            ]),
          };
          
          const bidResult = await bidsAPI.create(bidData);
          generated.bids.push(bidResult.bid);
          console.log('Created bid:', bidResult.bid);
        }
      }

      setGeneratedData(generated);
      setMessage({ 
        type: 'success', 
        text: `✅ Successfully created ${generated.contacts.length} contacts, ${generated.projectManagers.length} project managers, ${generated.opportunities.length} opportunities, and ${generated.bids.length} bids!` 
      });
      
      // Refresh stats
      await checkCurrentData();
    } catch (error: any) {
      console.error('Error generating test data:', error);
      setMessage({ type: 'error', text: `Error: ${error.message}` });
    } finally {
      setIsGenerating(false);
    }
  };

  const deleteAllTestData = async () => {
    if (!confirm('⚠️ WARNING: This will delete ALL data in your database (contacts, opportunities, bids, project managers). This cannot be undone! Are you sure?')) {
      return;
    }

    setIsDeleting(true);
    setMessage(null);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setMessage({ type: 'error', text: 'Not authenticated' });
        return;
      }

      const organizationId = user.user_metadata?.organizationId;

      // Delete in reverse order due to foreign key constraints
      setMessage({ type: 'info', text: 'Deleting bids...' });
      await supabase.from('bids').delete().eq('organization_id', organizationId);

      setMessage({ type: 'info', text: 'Deleting opportunities...' });
      await supabase.from('opportunities').delete().eq('organization_id', organizationId);

      setMessage({ type: 'info', text: 'Deleting project managers...' });
      await supabase.from('project_managers').delete().eq('organization_id', organizationId);

      setMessage({ type: 'info', text: 'Deleting contacts...' });
      await supabase.from('contacts').delete().eq('organization_id', organizationId);

      setMessage({ type: 'success', text: '✅ All test data deleted successfully!' });
      setGeneratedData(null);
      setStats(null);
      
      // Refresh stats
      await checkCurrentData();
    } catch (error: any) {
      console.error('Error deleting test data:', error);
      setMessage({ type: 'error', text: `Error: ${error.message}` });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Test Data Generator & Database Diagnostics
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Schema Check Results */}
          {schemaIssues.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold">Database Schema Status:</h3>
              <div className="bg-gray-50 p-3 rounded-lg space-y-1">
                {schemaIssues.map((issue, idx) => (
                  <div key={idx} className="text-sm font-mono">
                    {issue}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Current Stats */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="text-sm text-gray-600">Contacts</div>
                <div className="text-2xl font-bold">{stats.contacts}</div>
              </div>
              <div className="bg-green-50 p-3 rounded-lg">
                <div className="text-sm text-gray-600">Opportunities</div>
                <div className="text-2xl font-bold">{stats.opportunities}</div>
              </div>
              <div className="bg-purple-50 p-3 rounded-lg">
                <div className="text-sm text-gray-600">Bids</div>
                <div className="text-2xl font-bold">{stats.bids}</div>
              </div>
              <div className="bg-orange-50 p-3 rounded-lg">
                <div className="text-sm text-gray-600">Project Managers</div>
                <div className="text-2xl font-bold">{stats.projectManagers}</div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={checkCurrentData}
              disabled={isChecking}
              variant="outline"
            >
              {isChecking && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <Database className="w-4 h-4 mr-2" />
              Check Database
            </Button>

            <Button
              onClick={generateTestData}
              disabled={isGenerating || isDeleting}
            >
              {isGenerating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {!isGenerating && <CheckCircle2 className="w-4 h-4 mr-2" />}
              Generate Test Data
            </Button>

            <Button
              onClick={deleteAllTestData}
              disabled={isDeleting || isGenerating}
              variant="destructive"
            >
              {isDeleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {!isDeleting && <Trash2 className="w-4 h-4 mr-2" />}
              Delete All Data
            </Button>
          </div>

          {/* Status Message */}
          {message && (
            <Alert className={
              message.type === 'success' ? 'border-green-500 bg-green-50' :
              message.type === 'error' ? 'border-red-500 bg-red-50' :
              'border-blue-500 bg-blue-50'
            }>
              {message.type === 'success' && <CheckCircle2 className="h-4 w-4 text-green-600" />}
              {message.type === 'error' && <XCircle className="h-4 w-4 text-red-600" />}
              <AlertDescription className={
                message.type === 'success' ? 'text-green-800' :
                message.type === 'error' ? 'text-red-800' :
                'text-blue-800'
              }>
                {message.text}
              </AlertDescription>
            </Alert>
          )}

          {/* Generated Data Summary */}
          {generatedData && (
            <div className="space-y-2 border-t pt-4">
              <h3 className="font-semibold">Last Generated Data:</h3>
              <div className="space-y-2 text-sm">
                <details className="bg-gray-50 p-2 rounded">
                  <summary className="cursor-pointer font-medium">
                    Contacts ({generatedData.contacts.length})
                  </summary>
                  <ul className="mt-2 ml-4 space-y-1">
                    {generatedData.contacts.map((c) => (
                      <li key={c.id} className="font-mono text-xs">
                        {c.name} ({c.email}) - ID: {c.id}
                      </li>
                    ))}
                  </ul>
                </details>
                
                <details className="bg-gray-50 p-2 rounded">
                  <summary className="cursor-pointer font-medium">
                    Opportunities ({generatedData.opportunities.length})
                  </summary>
                  <ul className="mt-2 ml-4 space-y-1">
                    {generatedData.opportunities.map((o) => (
                      <li key={o.id} className="font-mono text-xs">
                        {o.title} - ID: {o.id}
                      </li>
                    ))}
                  </ul>
                </details>
                
                <details className="bg-gray-50 p-2 rounded">
                  <summary className="cursor-pointer font-medium">
                    Bids ({generatedData.bids.length})
                  </summary>
                  <ul className="mt-2 ml-4 space-y-1">
                    {generatedData.bids.map((b) => (
                      <li key={b.id} className="font-mono text-xs">
                        {b.title} - ${b.amount} - ID: {b.id}
                      </li>
                    ))}
                  </ul>
                </details>
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="bg-blue-50 p-4 rounded-lg text-sm space-y-2">
            <h4 className="font-semibold">Instructions:</h4>
            <ol className="list-decimal ml-4 space-y-1">
              <li><strong>Check Database:</strong> Verifies your database schema and counts existing data</li>
              <li><strong>Generate Test Data:</strong> Creates 3 contacts, 3 project managers, 3 opportunities, and 6 bids</li>
              <li><strong>Delete All Data:</strong> Removes all data from your current organization (use with caution!)</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}