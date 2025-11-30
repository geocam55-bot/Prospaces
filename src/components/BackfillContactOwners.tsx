import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { AlertCircle, CheckCircle2, Database } from 'lucide-react';
import { createClient } from '../utils/supabase/client';

/**
 * BackfillContactOwners Component
 * 
 * This component backfills the owner_id field for existing contacts
 * that don't have an owner_id set yet. It sets owner_id = created_by
 * so that contacts show up in the Team Dashboard properly.
 */

export function BackfillContactOwners() {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; details?: string } | null>(null);

  const runBackfill = async () => {
    setIsRunning(true);
    setResult(null);

    try {
      const supabase = createClient();

      // Get current user to verify they're an admin
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setResult({
          success: false,
          message: 'Authentication required',
          details: 'You must be logged in to run this operation.'
        });
        setIsRunning(false);
        return;
      }

      console.log('🔍 Finding contacts without owner_id...');

      // Find all contacts that don't have an owner_id but have a created_by
      const { data: contactsWithoutOwner, error: fetchError } = await supabase
        .from('contacts')
        .select('id, name, created_by, owner_id')
        .is('owner_id', null)
        .not('created_by', 'is', null);

      if (fetchError) {
        console.error('❌ Error fetching contacts:', fetchError);
        setResult({
          success: false,
          message: 'Failed to fetch contacts',
          details: fetchError.message
        });
        setIsRunning(false);
        return;
      }

      console.log(`📊 Found ${contactsWithoutOwner?.length || 0} contacts without owner_id`);

      if (!contactsWithoutOwner || contactsWithoutOwner.length === 0) {
        setResult({
          success: true,
          message: 'No contacts need backfilling',
          details: 'All contacts already have an owner_id set.'
        });
        setIsRunning(false);
        return;
      }

      // Backfill owner_id = created_by for each contact
      console.log('✏️ Updating contacts...');
      
      const updates = contactsWithoutOwner.map(contact => ({
        id: contact.id,
        owner_id: contact.created_by
      }));

      // Update in batches
      const batchSize = 100;
      let updatedCount = 0;
      const errors: string[] = [];

      for (let i = 0; i < updates.length; i += batchSize) {
        const batch = updates.slice(i, i + batchSize);
        
        // Update each contact individually to avoid complex upsert logic
        for (const update of batch) {
          const { error: updateError } = await supabase
            .from('contacts')
            .update({ owner_id: update.owner_id })
            .eq('id', update.id);

          if (updateError) {
            console.error(`❌ Error updating contact ${update.id}:`, updateError);
            errors.push(`Contact ${update.id}: ${updateError.message}`);
          } else {
            updatedCount++;
          }
        }

        console.log(`✅ Processed ${Math.min(i + batchSize, updates.length)} / ${updates.length}`);
      }

      if (errors.length > 0) {
        setResult({
          success: false,
          message: `Partially completed: ${updatedCount} contacts updated, ${errors.length} errors`,
          details: errors.slice(0, 5).join('\n') + (errors.length > 5 ? `\n... and ${errors.length - 5} more` : '')
        });
      } else {
        setResult({
          success: true,
          message: `Successfully backfilled ${updatedCount} contacts`,
          details: `All contacts now have owner_id set to their creator.`
        });
      }

    } catch (error: any) {
      console.error('❌ Backfill failed:', error);
      setResult({
        success: false,
        message: 'Backfill operation failed',
        details: error.message
      });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Backfill Contact Owners
        </CardTitle>
        <CardDescription>
          Populate the owner_id field for existing contacts so they appear in the Team Dashboard
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm text-gray-600">
            This operation will update all contacts that don't have an <code className="bg-gray-100 px-1 rounded">owner_id</code> by setting it to their <code className="bg-gray-100 px-1 rounded">created_by</code> value.
          </p>
          <p className="text-sm text-gray-600">
            This is safe to run multiple times and will only affect contacts missing an owner.
          </p>
        </div>

        <Button
          onClick={runBackfill}
          disabled={isRunning}
          className="w-full"
        >
          {isRunning ? 'Running Backfill...' : 'Run Backfill'}
        </Button>

        {result && (
          <Alert className={result.success ? 'border-green-400 bg-green-50' : 'border-red-400 bg-red-50'}>
            {result.success ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-600" />
            )}
            <AlertDescription className={result.success ? 'text-green-900' : 'text-red-900'}>
              <strong>{result.message}</strong>
              {result.details && (
                <pre className="mt-2 text-xs whitespace-pre-wrap bg-white/50 p-2 rounded">
                  {result.details}
                </pre>
              )}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
