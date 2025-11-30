import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { CheckCircle, Copy, AlertCircle } from 'lucide-react';
import { copyToClipboard } from '../utils/clipboard';

export function FixedProfilesSQL() {
  const [copied, setCopied] = useState(false);

  const sqlScript = `-- ============================================
-- FIXED: No Infinite Recursion RLS Policies
-- ============================================

-- Step 1: Drop ALL existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all org profiles" ON profiles;
DROP POLICY IF EXISTS "Super admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can insert org profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update org profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can delete org profiles" ON profiles;

-- Step 2: Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Step 3: Create SIMPLE policies (no recursion)

-- SELECT: Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- SELECT: Users can view profiles in their org (using user metadata, not profiles table)
CREATE POLICY "Users can view org profiles"
  ON profiles FOR SELECT
  USING (
    organization_id = (auth.jwt()->>'organizationId')::uuid
  );

-- INSERT: Users can insert their own profile
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- UPDATE: Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- DELETE: Only allow deleting own profile
CREATE POLICY "Users can delete own profile"
  ON profiles FOR DELETE
  USING (auth.uid() = id);

-- Step 4: Create SECURITY DEFINER function to sync users (bypasses RLS)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
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
EXCEPTION
  WHEN unique_violation THEN
    RETURN NEW;
END;
$$;

-- Step 5: Create trigger for auto-sync
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Step 6: Sync existing users (this bypasses RLS using the function)
DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN 
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
    )
  LOOP
    BEGIN
      INSERT INTO profiles (id, email, name, role, organization_id, status, last_login, created_at)
      VALUES (
        user_record.id,
        user_record.email,
        user_record.name,
        user_record.role,
        user_record.organization_id,
        user_record.status,
        user_record.last_login,
        user_record.created_at
      );
    EXCEPTION
      WHEN unique_violation THEN
        -- Skip if already exists
        NULL;
    END;
  END LOOP;
END;
$$;

-- Step 7: Grant necessary permissions
GRANT ALL ON profiles TO authenticated;
GRANT ALL ON profiles TO service_role;

-- Done!
SELECT 'Profiles table setup complete! All users synced.' as result;`;

  const handleCopy = async () => {
    const success = await copyToClipboard(sqlScript);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Card className="border-green-200 bg-green-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-green-900">
          <Database className="h-5 w-5" />
          Fixed SQL Script - No Infinite Recursion
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="border-green-300 bg-green-100">
          <CheckCircle className="h-4 w-4 text-green-700" />
          <AlertDescription className="text-green-900">
            <p className="font-semibold mb-2">✅ This script fixes the infinite recursion error!</p>
            <p className="text-sm">
              The previous policies caused recursion by checking the profiles table within profiles policies. 
              This version uses simpler policies that check auth.uid() and user metadata directly.
            </p>
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm text-green-900 font-semibold">
              📋 Copy and run this SQL in Supabase SQL Editor:
            </p>
            <Button
              onClick={handleCopy}
              size="sm"
              variant="outline"
              className="gap-2"
            >
              {copied ? (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy SQL
                </>
              )}
            </Button>
          </div>
          
          <textarea
            readOnly
            value={sqlScript}
            className="w-full h-96 p-4 text-xs font-mono bg-white border border-green-300 rounded-lg overflow-auto"
            onClick={(e) => e.currentTarget.select()}
          />
        </div>

        <Alert>
          <AlertDescription>
            <p className="text-sm text-gray-700">
              <strong>What this does:</strong>
            </p>
            <ul className="text-sm text-gray-600 space-y-1 mt-2 ml-4 list-disc">
              <li>Removes all existing policies that caused recursion</li>
              <li>Creates simple policies that use auth.uid() and JWT metadata</li>
              <li>Sets up SECURITY DEFINER function to bypass RLS for syncing</li>
              <li>Syncs ALL existing auth.users to profiles automatically</li>
              <li>Sets up trigger for future user signups</li>
            </ul>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}