import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { CheckCircle2, Copy, ExternalLink, AlertCircle, Database } from 'lucide-react';
import { toast } from 'sonner';
import { copyToClipboard } from '../utils/clipboard';

const supabase = createClient();

interface ProfilesSetupGuideProps {
  onRefresh: () => void;
}

export function ProfilesSetupGuide({ onRefresh }: ProfilesSetupGuideProps) {
  const [copied, setCopied] = useState(false);
  const [step, setStep] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const [diagnosticInfo, setDiagnosticInfo] = useState<any>(null);
  const [showDiagnostic, setShowDiagnostic] = useState(false);

  const runDiagnostic = async () => {
    console.log('[Diagnostic] Running database diagnostic...');
    setShowDiagnostic(true);
    
    try {
      // Check current user
      const { data: { user } } = await supabase.auth.getUser();
      
      // Try to query profiles table
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact' });
      
      // Try to get count without data (bypasses some RLS)
      const { count, error: countError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
      
      const info = {
        currentUser: {
          id: user?.id,
          email: user?.email,
          metadata: user?.user_metadata,
        },
        profilesQuery: {
          rowsReturned: profilesData?.length || 0,
          error: profilesError?.message || null,
          errorCode: profilesError?.code || null,
        },
        profilesCount: {
          totalRows: count,
          error: countError?.message || null,
        },
        timestamp: new Date().toISOString(),
      };
      
      console.log('[Diagnostic] Results:', info);
      setDiagnosticInfo(info);
      
      if (profilesError) {
        toast.error('Database query failed: ' + profilesError.message);
      } else if (!profilesData || profilesData.length === 0) {
        toast.warning(`No profiles visible to you. This means either:\n1. The SQL script hasn't been run yet\n2. RLS policies are blocking the query\n3. Your organization_id doesn't match other users`);
      } else {
        toast.info(`Found ${profilesData.length} profiles visible to you`);
      }
      
    } catch (error) {
      console.error('[Diagnostic] Error:', error);
      toast.error('Diagnostic failed: ' + (error as Error).message);
    }
  };

  const sqlScript = `-- ProSpaces CRM - Profiles Table Setup
-- Copy and paste this entire script into Supabase SQL Editor

-- Step 1: Create profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  name text NOT NULL,
  role text NOT NULL DEFAULT 'standard_user',
  organization_id uuid,
  status text NOT NULL DEFAULT 'active',
  last_login timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Step 2: Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all org profiles" ON profiles;
DROP POLICY IF EXISTS "Super admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can insert org profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update org profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can delete org profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view org profiles" ON profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON profiles;

-- Step 3: Create simple, non-recursive policies
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can view org profiles"
  ON profiles FOR SELECT
  USING (organization_id::text = (auth.jwt()->>'organizationId'));

CREATE POLICY "Allow insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Step 4: Create sync function (SECURITY DEFINER bypasses RLS)
CREATE OR REPLACE FUNCTION sync_auth_to_profiles()
RETURNS TABLE(synced_count int, error_message text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  sync_count int := 0;
BEGIN
  -- Insert all auth.users that don't exist in profiles
  INSERT INTO profiles (id, email, name, role, organization_id, status, last_login, created_at)
  SELECT 
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'name', au.email),
    COALESCE(au.raw_user_meta_data->>'role', 'standard_user'),
    (au.raw_user_meta_data->>'organizationId')::uuid,
    'active',
    au.last_sign_in_at,
    au.created_at
  FROM auth.users au
  WHERE NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = au.id);
  
  GET DIAGNOSTICS sync_count = ROW_COUNT;
  
  RETURN QUERY SELECT sync_count, NULL::text;
EXCEPTION
  WHEN OTHERS THEN
    RETURN QUERY SELECT 0, SQLERRM;
END;
$$;

-- Step 5: Run the sync
SELECT * FROM sync_auth_to_profiles();

-- Step 6: Create trigger for future users
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO profiles (id, email, name, role, organization_id, status, created_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'standard_user'),
    (NEW.raw_user_meta_data->>'organizationId')::uuid,
    'active',
    NEW.created_at
  );
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Verify results
SELECT 
  'Setup complete!' as status,
  COUNT(*) as total_profiles,
  COUNT(DISTINCT organization_id) as total_orgs
FROM profiles;`;

  const handleCopy = async () => {
    try {
      await copyToClipboard(sqlScript);
      setCopied(true);
      toast.success('SQL Script copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback for browsers that block clipboard
      const textarea = document.createElement('textarea');
      textarea.value = sqlScript;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      toast.success('SQL Script copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader>
        <CardTitle className="text-blue-900">
          🚀 Setup Required: Sync Users to Profiles Table
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="border-blue-300 bg-blue-100">
          <AlertDescription className="text-blue-900">
            <p className="font-semibold mb-2">Why you're only seeing one user:</p>
            <p className="text-sm">
              The <code className="bg-blue-200 px-1 rounded">profiles</code> table only contains your current user. 
              All other users exist in <code className="bg-blue-200 px-1 rounded">auth.users</code> but need to be synced to profiles.
            </p>
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          <div className={`flex gap-3 p-3 rounded-lg ${step >= 1 ? 'bg-white border-2 border-blue-300' : 'bg-gray-50'}`}>
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
              step > 1 ? 'bg-green-500 text-white' : 'bg-blue-500 text-white'
            }`}>
              {step > 1 ? '✓' : '1'}
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900 mb-2">Copy SQL Script</p>
              <Button
                onClick={handleCopy}
                size="sm"
                className="gap-2"
                variant={copied ? "outline" : "default"}
              >
                {copied ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copy SQL Script
                  </>
                )}
              </Button>
              {copied && (
                <Button
                  onClick={() => setStep(2)}
                  size="sm"
                  className="ml-2"
                >
                  Next Step →
                </Button>
              )}
            </div>
          </div>

          <div className={`flex gap-3 p-3 rounded-lg ${step >= 2 ? 'bg-white border-2 border-blue-300' : 'bg-gray-50'}`}>
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
              step > 2 ? 'bg-green-500 text-white' : step === 2 ? 'bg-blue-500 text-white' : 'bg-gray-300 text-gray-600'
            }`}>
              {step > 2 ? '✓' : '2'}
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900 mb-2">Open Supabase SQL Editor</p>
              <Button
                onClick={() => {
                  window.open('https://supabase.com/dashboard/project/_/sql/new', '_blank');
                  setStep(3);
                }}
                size="sm"
                variant="outline"
                className="gap-2"
                disabled={step < 2}
              >
                <ExternalLink className="h-4 w-4" />
                Open SQL Editor
              </Button>
            </div>
          </div>

          <div className={`flex gap-3 p-3 rounded-lg ${step >= 3 ? 'bg-white border-2 border-blue-300' : 'bg-gray-50'}`}>
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
              step > 3 ? 'bg-green-500 text-white' : step === 3 ? 'bg-blue-500 text-white' : 'bg-gray-300 text-gray-600'
            }`}>
              {step > 3 ? '✓' : '3'}
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900 mb-2">Paste and Run the SQL</p>
              <p className="text-sm text-gray-600 mb-2">
                In the SQL Editor: Paste the script (Ctrl+V or Cmd+V) and click "Run" or press F5
              </p>
              <Button
                onClick={() => setStep(4)}
                size="sm"
                variant="outline"
              >
                I've Run the SQL →
              </Button>
            </div>
          </div>

          <div className={`flex gap-3 p-3 rounded-lg ${step >= 4 ? 'bg-white border-2 border-green-300' : 'bg-gray-50'}`}>
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
              step === 4 ? 'bg-blue-500 text-white' : 'bg-gray-300 text-gray-600'
            }`}>
              4
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900 mb-2">Refresh Users List</p>
              <p className="text-sm text-gray-600 mb-2">
                Click the button below to reload the users list and see all synced users
              </p>
              <Button
                onClick={async () => {
                  console.log('[ProfilesSetupGuide] Refresh button clicked');
                  setRefreshing(true);
                  try {
                    console.log('[ProfilesSetupGuide] Calling onRefresh...');
                    await onRefresh();
                    console.log('[ProfilesSetupGuide] onRefresh completed');
                  } catch (error) {
                    console.error('[ProfilesSetupGuide] Error during refresh:', error);
                  } finally {
                    setTimeout(() => setRefreshing(false), 1000);
                  }
                }}
                size="sm"
                className="gap-2"
                disabled={refreshing}
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Refreshing...' : 'Refresh Users List'}
              </Button>
            </div>
          </div>
        </div>

        {/* SQL Preview */}
        <details className="mt-4">
          <summary className="cursor-pointer text-sm font-semibold text-blue-900 hover:text-blue-700">
            📄 Preview SQL Script (click to expand)
          </summary>
          <div className="mt-2 p-3 bg-white rounded border border-blue-200 max-h-64 overflow-auto">
            <pre className="text-xs font-mono text-gray-700 whitespace-pre-wrap">
              {sqlScript}
            </pre>
          </div>
        </details>

        {/* Diagnostic Info */}
        {showDiagnostic && (
          <details className="mt-4">
            <summary className="cursor-pointer text-sm font-semibold text-blue-900 hover:text-blue-700">
              📊 Diagnostic Info (click to expand)
            </summary>
            <div className="mt-2 p-3 bg-white rounded border border-blue-200 max-h-64 overflow-auto">
              <pre className="text-xs font-mono text-gray-700 whitespace-pre-wrap">
                {JSON.stringify(diagnosticInfo, null, 2)}
              </pre>
            </div>
          </details>
        )}

        {/* Run Diagnostic Button */}
        <Button
          onClick={runDiagnostic}
          size="sm"
          className="mt-4"
          variant="outline"
        >
          <Database className="h-4 w-4" />
          Run Database Diagnostic
        </Button>
      </CardContent>
    </Card>
  );
}
