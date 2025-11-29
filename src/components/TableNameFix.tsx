import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { AlertCircle, Database, CheckCircle } from 'lucide-react';
import { createClient } from '../utils/supabase/client';

const supabase = createClient();

export function TableNameFix() {
  const [isChecking, setIsChecking] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const checkTables = async () => {
    setIsChecking(true);
    setResult(null);

    try {
      // Check if 'users' table exists
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .limit(1);

      // Check if 'profiles' table exists  
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .limit(1);

      let message = '📊 Table Check Results:\n\n';

      if (!usersError) {
        message += '✅ Found table: "users"\n';
        message += `   Records: ${usersData?.length || 0}\n\n`;
      } else {
        message += '❌ Table "users" not found or not accessible\n';
        message += `   Error: ${usersError.message}\n\n`;
      }

      if (!profilesError) {
        message += '✅ Found table: "profiles"\n';
        message += `   Records: ${profilesData?.length || 0}\n\n`;
      } else {
        message += '❌ Table "profiles" not found or not accessible\n';
        message += `   Error: ${profilesError.message}\n\n`;
      }

      // Provide recommendation
      if (!usersError && profilesError) {
        message += '\n⚠️ ISSUE FOUND: You have a "users" table but this app needs a "profiles" table.\n\n';
        message += '📋 SOLUTION: Run this SQL in Supabase SQL Editor to rename the table:\n\n';
        message += 'ALTER TABLE users RENAME TO profiles;';
      } else if (profilesError) {
        message += '\n⚠️ ISSUE FOUND: No "profiles" table exists.\n\n';
        message += '📋 SOLUTION: Create the table by clicking the button below.';
      } else {
        message += '\n✅ Table structure looks correct! If you still see errors, check RLS policies.';
      }

      setResult(message);
    } catch (error: any) {
      setResult(`❌ Error checking tables: ${error.message}`);
    } finally {
      setIsChecking(false);
    }
  };

  const createProfilesTable = async () => {
    setIsChecking(true);
    setResult(null);

    const sql = `
-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  name text NOT NULL,
  role text NOT NULL DEFAULT 'standard_user',
  organization_id uuid REFERENCES organizations(id),
  status text NOT NULL DEFAULT 'active',
  last_login timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Sync existing users
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
);
`;

    setResult(`📋 Copy this SQL and run it in Supabase SQL Editor:\n\n${sql}`);
    setIsChecking(false);
  };

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-900">
          <Database className="h-5 w-5" />
          Table Name Diagnostic
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-orange-800">
          The error mentions "table users" but this app uses "profiles" table. Let's check what tables you have.
        </p>

        <div className="flex gap-2">
          <Button 
            onClick={checkTables}
            disabled={isChecking}
            size="sm"
            variant="outline"
          >
            {isChecking ? 'Checking...' : 'Check Tables'}
          </Button>

          <Button 
            onClick={createProfilesTable}
            disabled={isChecking}
            size="sm"
          >
            Show SQL to Create Profiles Table
          </Button>
        </div>

        {result && (
          <Alert className="border-orange-200 bg-white">
            <AlertCircle className="h-4 w-4 text-orange-600" />
            <AlertDescription>
              <pre className="text-xs whitespace-pre-wrap font-mono">
                {result}
              </pre>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
