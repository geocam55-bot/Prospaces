import { useState, useEffect } from 'react';
import { createClient } from '../utils/supabase/client';
import { AlertCircle, CheckCircle, XCircle, ExternalLink, Copy, Check } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { MigrationHelper } from './MigrationHelper';

const supabase = createClient();

interface SetupCheck {
  name: string;
  status: 'checking' | 'success' | 'warning' | 'error';
  message: string;
  details?: string;
  action?: {
    label: string;
    url?: string;
    onClick?: () => void;
  };
}

export function SetupChecker() {
  const [checks, setChecks] = useState<SetupCheck[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    runChecks();
  }, []);

  const runChecks = async () => {
    const newChecks: SetupCheck[] = [];

    // Check 1: Supabase connection
    newChecks.push({ name: 'Supabase Connection', status: 'checking', message: 'Checking...' });
    setChecks([...newChecks]);

    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      
      newChecks[0] = {
        name: 'Supabase Connection',
        status: 'success',
        message: 'Connected to Supabase',
      };
    } catch (error: any) {
      newChecks[0] = {
        name: 'Supabase Connection',
        status: 'error',
        message: 'Failed to connect to Supabase',
        details: error.message,
      };
      setHasError(true);
    }
    setChecks([...newChecks]);

    // Check 2: Profiles table
    newChecks.push({ name: 'Profiles Table', status: 'checking', message: 'Checking...' });
    setChecks([...newChecks]);

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .limit(1);

      if (error) {
        // Check if table doesn't exist OR permission denied (table not set up properly)
        if (error.code === 'PGRST204' || error.code === 'PGRST205' || error.code === '42P01' || error.code === '42501') {
          newChecks[1] = {
            name: 'Profiles Table',
            status: 'error',
            message: 'Profiles table not set up correctly',
            details: 'The profiles table needs to be created with the SQL migration.',
            action: {
              label: 'View Setup Instructions',
              onClick: () => {
                setIsExpanded(true);
                const el = document.getElementById('setup-instructions');
                el?.scrollIntoView({ behavior: 'smooth' });
              },
            },
          };
          setHasError(true);
        } else {
          throw error;
        }
      } else {
        newChecks[1] = {
          name: 'Profiles Table',
          status: 'success',
          message: 'Profiles table exists',
        };
      }
    } catch (error: any) {
      newChecks[1] = {
        name: 'Profiles Table',
        status: 'error',
        message: 'Error checking profiles table',
        details: error.message,
      };
      setHasError(true);
    }
    setChecks([...newChecks]);

    // Check 3: Tenants table
    newChecks.push({ name: 'Tenants Table', status: 'checking', message: 'Checking...' });
    setChecks([...newChecks]);

    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('id')
        .limit(1);

      if (error) {
        if (error.code === 'PGRST204' || error.code === 'PGRST205' || error.code === '42P01') {
          newChecks[2] = {
            name: 'Tenants Table',
            status: 'warning',
            message: 'Tenants table does not exist',
            details: 'Tenants table is recommended for multi-tenant support.',
          };
        } else {
          throw error;
        }
      } else {
        newChecks[2] = {
          name: 'Tenants Table',
          status: 'success',
          message: 'Tenants table exists',
        };
      }
    } catch (error: any) {
      newChecks[2] = {
        name: 'Tenants Table',
        status: 'warning',
        message: 'Could not check tenants table',
        details: error.message,
      };
    }
    setChecks([...newChecks]);

    // Auto-expand if there's an error
    if (hasError) {
      setIsExpanded(true);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <div className="h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />;
    }
  };

  if (checks.length === 0) {
    return null;
  }

  const errorCount = checks.filter(c => c.status === 'error').length;
  const warningCount = checks.filter(c => c.status === 'warning').length;

  if (errorCount === 0 && warningCount === 0 && !isExpanded) {
    return null; // All good, no need to show anything
  }

  return (
    <div className="mb-6">
      <Alert variant={errorCount > 0 ? 'destructive' : warningCount > 0 ? 'default' : 'default'}>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Setup Status</AlertTitle>
        <AlertDescription>
          {errorCount > 0 ? (
            <span className="text-red-600">
              {errorCount} critical issue{errorCount > 1 ? 's' : ''} found
            </span>
          ) : warningCount > 0 ? (
            <span className="text-yellow-600">
              {warningCount} warning{warningCount > 1 ? 's' : ''}
            </span>
          ) : (
            'All systems operational'
          )}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="ml-4 text-sm underline hover:no-underline"
          >
            {isExpanded ? 'Hide details' : 'Show details'}
          </button>
        </AlertDescription>
      </Alert>

      {isExpanded && (
        <div className="mt-4 space-y-3">
          {checks.map((check, idx) => (
            <div
              key={idx}
              className={`flex items-start gap-3 p-4 rounded-lg border ${
                check.status === 'error'
                  ? 'bg-red-50 border-red-200'
                  : check.status === 'warning'
                  ? 'bg-yellow-50 border-yellow-200'
                  : check.status === 'success'
                  ? 'bg-green-50 border-green-200'
                  : 'bg-blue-50 border-blue-200'
              }`}
            >
              <div className="mt-0.5">{getStatusIcon(check.status)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-4">
                  <p className="font-medium text-gray-900">{check.name}</p>
                  {check.action && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={check.action.onClick}
                      className="shrink-0"
                    >
                      {check.action.label}
                      {check.action.url && <ExternalLink className="ml-2 h-3 w-3" />}
                    </Button>
                  )}
                </div>
                <p className="text-sm text-gray-700 mt-1">{check.message}</p>
                {check.details && (
                  <p className="text-sm text-gray-600 mt-1 font-mono">{check.details}</p>
                )}
              </div>
            </div>
          ))}

          {errorCount > 0 && (
            <div id="setup-instructions" className="mt-6">
              <MigrationHelper />
              <div className="mt-4 text-center">
                <Button
                  onClick={runChecks}
                  size="lg"
                >
                  Re-check Setup
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}