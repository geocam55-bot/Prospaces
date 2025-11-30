import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { createClient } from '../utils/supabase/client';
import { CheckCircle2, XCircle, Loader2, Database } from 'lucide-react';

export function BidsTableMigration() {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const runMigration = async () => {
    setIsRunning(true);
    setError(null);
    setResults([]);

    try {
      // Check current schema
      setResults(prev => [...prev, '🔍 Checking current bids table schema...']);
      
      const { data: sampleBid } = await supabase
        .from('bids')
        .select('*')
        .limit(1);
      
      if (sampleBid && sampleBid.length > 0) {
        const columns = Object.keys(sampleBid[0]);
        setResults(prev => [...prev, `📋 Current columns: ${columns.join(', ')}`]);
      }

      // SQL to add missing columns to bids table
      const migrations = [
        {
          name: 'Add notes column',
          sql: `ALTER TABLE public.bids ADD COLUMN IF NOT EXISTS notes TEXT;`
        },
        {
          name: 'Add line_items column',
          sql: `ALTER TABLE public.bids ADD COLUMN IF NOT EXISTS line_items JSONB;`
        },
        {
          name: 'Add subtotal column',
          sql: `ALTER TABLE public.bids ADD COLUMN IF NOT EXISTS subtotal NUMERIC(12,2);`
        },
        {
          name: 'Add discount_percent column',
          sql: `ALTER TABLE public.bids ADD COLUMN IF NOT EXISTS discount_percent NUMERIC(5,2);`
        },
        {
          name: 'Add discount_amount column',
          sql: `ALTER TABLE public.bids ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(12,2);`
        },
        {
          name: 'Add tax_percent column',
          sql: `ALTER TABLE public.bids ADD COLUMN IF NOT EXISTS tax_percent NUMERIC(5,2);`
        },
        {
          name: 'Add tax_amount column',
          sql: `ALTER TABLE public.bids ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(12,2);`
        },
        {
          name: 'Add total column',
          sql: `ALTER TABLE public.bids ADD COLUMN IF NOT EXISTS total NUMERIC(12,2);`
        },
        {
          name: 'Add valid_until column',
          sql: `ALTER TABLE public.bids ADD COLUMN IF NOT EXISTS valid_until TIMESTAMPTZ;`
        },
        {
          name: 'Add project_manager_id column',
          sql: `ALTER TABLE public.bids ADD COLUMN IF NOT EXISTS project_manager_id UUID REFERENCES public.project_managers(id);`
        },
        {
          name: 'Add created_by column',
          sql: `ALTER TABLE public.bids ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);`
        }
      ];

      setResults(prev => [...prev, '\n📝 Running migrations...']);
      
      for (const migration of migrations) {
        try {
          const { error: migrationError } = await supabase.rpc('exec_sql', {
            sql: migration.sql
          });

          if (migrationError) {
            // If the RPC doesn't exist, show instructions
            if (migrationError.code === '42883') {
              setResults(prev => [...prev, `\n⚠️ Cannot run migrations automatically.`]);
              setResults(prev => [...prev, `\n📋 Please run these SQL commands manually in the Supabase SQL Editor:\n`]);
              migrations.forEach(m => {
                setResults(prev => [...prev, `-- ${m.name}`]);
                setResults(prev => [...prev, m.sql]);
                setResults(prev => [...prev, '']);
              });
              break;
            }
            throw migrationError;
          }
          
          setResults(prev => [...prev, `✅ ${migration.name}`]);
        } catch (err: any) {
          setResults(prev => [...prev, `❌ ${migration.name}: ${err.message}`]);
        }
      }

      setResults(prev => [...prev, '\n✨ Migration complete! Please refresh the page.']);
    } catch (err: any) {
      setError(err.message);
      setResults(prev => [...prev, `\n❌ Migration failed: ${err.message}`]);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Bids Table Migration
        </CardTitle>
        <CardDescription>
          Add missing columns to the bids table to support line items, notes, and tax calculations
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <p className="text-sm text-gray-600">
            This migration will add the following columns to the bids table:
          </p>
          <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
            <li><code>notes</code> - Text notes for the bid</li>
            <li><code>line_items</code> - JSON array of line items</li>
            <li><code>subtotal</code> - Bid subtotal before tax</li>
            <li><code>discount_percent</code> - Discount percentage</li>
            <li><code>discount_amount</code> - Calculated discount amount</li>
            <li><code>tax_percent</code> - Tax percentage</li>
            <li><code>tax_amount</code> - Calculated tax amount</li>
            <li><code>total</code> - Final total amount</li>
            <li><code>valid_until</code> - Bid expiration date</li>
            <li><code>project_manager_id</code> - Reference to project manager</li>
            <li><code>created_by</code> - User who created the bid</li>
          </ul>
        </div>

        <Button 
          onClick={runMigration} 
          disabled={isRunning}
          className="w-full"
        >
          {isRunning ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Running Migration...
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Run Migration
            </>
          )}
        </Button>

        {results.length > 0 && (
          <div className="bg-gray-50 rounded-lg p-4 space-y-1 max-h-96 overflow-y-auto">
            <p className="text-xs font-mono text-gray-800 whitespace-pre-wrap">
              {results.map((result, index) => (
                <div key={index}>{result}</div>
              ))}
            </p>
          </div>
        )}

        <Alert>
          <AlertDescription className="text-sm">
            <strong>Manual Alternative:</strong> If the automatic migration doesn't work, 
            copy and run the SQL commands shown above in your Supabase SQL Editor 
            (Settings → Database → SQL Editor).
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
