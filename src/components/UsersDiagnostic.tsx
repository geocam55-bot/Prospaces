import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { AlertCircle, RefreshCw, Database, Users, CheckCircle } from 'lucide-react';
import { createClient } from '../utils/supabase/client';
import { getAccessToken } from '../utils/api';

const supabase = createClient();

export function UsersDiagnostic({ onRefresh }: { onRefresh?: () => void }) {
  const [isChecking, setIsChecking] = useState(false);
  const [diagnosticInfo, setDiagnosticInfo] = useState<any>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  const runDiagnostics = async () => {
    setIsChecking(true);
    setDiagnosticInfo(null);
    
    try {
      const info: any = {
        timestamp: new Date().toISOString(),
        checks: [],
      };

      // Get access token
      const token = getAccessToken();
      
      if (!token) {
        info.checks.push({
          name: 'Access Token',
          status: 'error',
          details: { error: 'No access token found. Please refresh the page.' },
        });
        setDiagnosticInfo(info);
        return;
      }

      info.checks.push({
        name: 'Access Token',
        status: 'success',
        details: 'Token found and valid',
      });

      // Check 1: Current user
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      info.checks.push({
        name: 'Current User',
        status: user ? 'success' : 'error',
        details: user ? {
          id: user.id,
          email: user.email,
          role: user.user_metadata?.role,
          orgId: user.user_metadata?.organizationId,
        } : { error: userError?.message },
      });

      // Check 2: Profiles table structure
      const { data: profilesSchema, error: schemaError } = await supabase
        .from('profiles')
        .select('*')
        .limit(0);
      
      info.checks.push({
        name: 'Profiles Table',
        status: schemaError ? 'error' : 'success',
        details: schemaError ? { error: schemaError.message, code: schemaError.code } : 'Table exists and is accessible',
      });

      // Check 3: Count profiles
      const { count: profileCount, error: countError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
      
      info.checks.push({
        name: 'Profiles Count',
        status: countError ? 'error' : 'success',
        details: countError ? { error: countError.message } : { count: profileCount || 0 },
      });

      // Check 4: Query profiles with current user's org
      if (user?.user_metadata?.organizationId) {
        const { data: orgProfiles, error: orgError } = await supabase
          .from('profiles')
          .select('*')
          .eq('organization_id', user.user_metadata.organizationId);
        
        info.checks.push({
          name: 'Organization Profiles',
          status: orgError ? 'error' : 'success',
          details: orgError ? { error: orgError.message } : { 
            count: orgProfiles?.length || 0,
            profiles: orgProfiles?.map(p => ({ email: p.email, role: p.role })) 
          },
        });
      }

      // Check 5: Try to query all profiles (for super_admin)
      const { data: allProfiles, error: allError } = await supabase
        .from('profiles')
        .select('*');
      
      info.checks.push({
        name: 'All Profiles Query',
        status: allError ? 'error' : 'success',
        details: allError ? { error: allError.message, code: allError.code } : { 
          count: allProfiles?.length || 0,
          sample: allProfiles?.slice(0, 3).map(p => ({ email: p.email, role: p.role, org: p.organization_id }))
        },
      });

      setDiagnosticInfo(info);
    } catch (error: any) {
      setDiagnosticInfo({
        error: error.message,
      });
    } finally {
      setIsChecking(false);
    }
  };

  const syncCurrentUser = async () => {
    setIsSyncing(true);
    setSyncResult(null);

    try {
      // Get access token first
      const token = getAccessToken();
      
      if (!token) {
        console.error('[UsersDiagnostic] No access token found');
        setSyncResult('❌ Error: Not authenticated. Please refresh the page and try again.');
        return;
      }

      console.log('[UsersDiagnostic] Got access token, fetching user...');
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      
      if (!user || userError) {
        console.error('[UsersDiagnostic] Failed to get user:', userError);
        setSyncResult(`❌ Error: Not authenticated. ${userError?.message || 'Please refresh the page and try again.'}`);
        return;
      }

      console.log('[UsersDiagnostic] Attempting to sync user:', {
        id: user.id,
        email: user.email,
        role: user.user_metadata?.role,
        orgId: user.user_metadata?.organizationId,
      });

      // Try to insert current user into profiles
      const profileData = {
        id: user.id,
        email: user.email!,
        name: user.user_metadata?.name || user.email!,
        role: user.user_metadata?.role || 'standard_user',
        organization_id: user.user_metadata?.organizationId,
        status: 'active',
        last_login: new Date().toISOString(),
        created_at: user.created_at,
      };

      console.log('[UsersDiagnostic] Profile data to insert:', profileData);

      const { data, error } = await supabase
        .from('profiles')
        .upsert(profileData, {
          onConflict: 'id',
        })
        .select();

      console.log('[UsersDiagnostic] Upsert result:', { data, error });

      if (error) {
        console.error('[UsersDiagnostic] Sync error:', error);
        setSyncResult(`❌ Error: ${error.message} (Code: ${error.code})\n\nThis usually means RLS policies are blocking the insert. You may need to run the SQL migration in Supabase Dashboard.`);
      } else {
        console.log('[UsersDiagnostic] Sync successful!');
        setSyncResult('✅ Success! Current user synced to profiles table. Click "Refresh Users List" below to see changes.');
        if (onRefresh) {
          onRefresh();
        }
      }
    } catch (error: any) {
      console.error('[UsersDiagnostic] Exception:', error);
      setSyncResult(`❌ Error: ${error.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-900">
          <Database className="h-5 w-5" />
          Users Diagnostic Tool
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-blue-800">
          Use this tool to diagnose issues with the users/profiles table and sync data.
        </p>

        <div className="flex gap-2">
          <Button 
            onClick={runDiagnostics} 
            disabled={isChecking}
            variant="outline"
            size="sm"
          >
            {isChecking ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Checking...
              </>
            ) : (
              <>
                <AlertCircle className="h-4 w-4 mr-2" />
                Run Diagnostics
              </>
            )}
          </Button>

          <Button 
            onClick={syncCurrentUser} 
            disabled={isSyncing}
            size="sm"
          >
            {isSyncing ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <Users className="h-4 w-4 mr-2" />
                Sync Current User
              </>
            )}
          </Button>
        </div>

        {syncResult && (
          <Alert className={syncResult.includes('Success') ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
            {syncResult.includes('Success') ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-600" />
            )}
            <AlertDescription className={syncResult.includes('Success') ? 'text-green-800' : 'text-red-800'}>
              <div className="space-y-2">
                <p>{syncResult}</p>
                {syncResult.includes('42501') && (
                  <div className="mt-3 p-3 bg-red-100 rounded border border-red-300">
                    <p className="font-semibold mb-2">⚠️ RLS Policy Error Detected</p>
                    
                    {syncResult.includes('table users') && (
                      <div className="mb-3 p-2 bg-yellow-100 border border-yellow-300 rounded">
                        <p className="text-xs font-semibold text-yellow-900">
                          ⚠️ WARNING: The error mentions "table users" but the app uses "profiles" table.
                        </p>
                        <p className="text-xs text-yellow-800 mt-1">
                          Make sure you created a table called "profiles" (not "users") in Supabase.
                        </p>
                      </div>
                    )}
                    
                    <p className="text-xs mb-2">
                      The profiles table exists but RLS policies are blocking access. 
                      <strong> Copy the SQL below and run it in your Supabase SQL Editor:</strong>
                    </p>
                    <div className="relative">
                      <textarea 
                        readOnly
                        className="text-xs bg-white p-3 rounded w-full h-96 font-mono border border-red-200"
                        value={`-- Step 1: Drop existing policies if any
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all org profiles" ON profiles;
DROP POLICY IF EXISTS "Super admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update org profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can delete org profiles" ON profiles;

-- Step 2: Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Step 3: Create comprehensive RLS policies

-- SELECT policies
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all org profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'super_admin')
      AND (
        p.role = 'super_admin' 
        OR p.organization_id = profiles.organization_id
      )
    )
  );

-- INSERT policies
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can insert org profiles"
  ON profiles FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'super_admin')
      AND (
        p.role = 'super_admin' 
        OR p.organization_id = profiles.organization_id
      )
    )
  );

-- UPDATE policies
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can update org profiles"
  ON profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'super_admin')
      AND (
        p.role = 'super_admin' 
        OR p.organization_id = profiles.organization_id
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'super_admin')
      AND (
        p.role = 'super_admin' 
        OR p.organization_id = profiles.organization_id
      )
    )
  );

-- DELETE policies
CREATE POLICY "Admins can delete org profiles"
  ON profiles FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'super_admin')
      AND (
        p.role = 'super_admin' 
        OR p.organization_id = profiles.organization_id
      )
    )
  );

-- Step 4: Create trigger to auto-sync new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role, organization_id, status, created_at)
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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Step 5: Sync existing users from auth.users
INSERT INTO profiles (id, email, name, role, organization_id, status, last_login, created_at)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'name', au.email) as name,
  COALESCE(au.raw_user_meta_data->>'role', 'standard_user') as role,
  (au.raw_user_meta_data->>'organizationId')::uuid as organization_id,
  'active' as status,
  au.last_sign_in_at as last_login,
  au.created_at
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM profiles p WHERE p.id = au.id
);`}
                        onClick={(e) => {
                          const textarea = e.currentTarget;
                          textarea.select();
                        }}
                      />
                      <p className="text-xs text-red-700 mt-2 font-semibold">
                        👆 Click the text box above, press Ctrl+A (or Cmd+A on Mac) to select all, then Ctrl+C (or Cmd+C) to copy
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {diagnosticInfo && (
          <div className="space-y-3 mt-4">
            <p className="text-sm text-blue-900">
              <strong>Diagnostic Results:</strong>
            </p>
            {diagnosticInfo.error ? (
              <Alert className="border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  {diagnosticInfo.error}
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-2">
                {diagnosticInfo.checks?.map((check: any, index: number) => (
                  <div 
                    key={index}
                    className={`p-3 rounded border ${
                      check.status === 'success' 
                        ? 'bg-green-50 border-green-200' 
                        : 'bg-red-50 border-red-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {check.status === 'success' ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-600" />
                      )}
                      <strong className="text-sm">{check.name}</strong>
                    </div>
                    <pre className="text-xs bg-white p-2 rounded overflow-auto">
                      {JSON.stringify(check.details, null, 2)}
                    </pre>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}