import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Copy, Check, ExternalLink, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';

const MIGRATION_SQL = `-- Create profiles table to store user information
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  role TEXT NOT NULL DEFAULT 'standard_user',
  organization_id TEXT,
  status TEXT DEFAULT 'active',
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create index on organization_id for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_organization_id ON public.profiles(organization_id);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own profile
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id);

-- Policy: Admins can view profiles in their organization
CREATE POLICY "Admins can view organization profiles"
ON public.profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND (
      auth.users.raw_user_meta_data->>'role' = 'admin'
      OR auth.users.raw_user_meta_data->>'role' = 'super_admin'
    )
    AND (
      auth.users.raw_user_meta_data->>'role' = 'super_admin'
      OR auth.users.raw_user_meta_data->>'organizationId' = organization_id
    )
  )
);

-- Policy: Admins can update profiles in their organization
CREATE POLICY "Admins can update organization profiles"
ON public.profiles FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND (
      auth.users.raw_user_meta_data->>'role' = 'admin'
      OR auth.users.raw_user_meta_data->>'role' = 'super_admin'
    )
    AND (
      auth.users.raw_user_meta_data->>'role' = 'super_admin'
      OR auth.users.raw_user_meta_data->>'organizationId' = organization_id
    )
  )
);

-- Policy: Admins can insert profiles in their organization
CREATE POLICY "Admins can insert organization profiles"
ON public.profiles FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND (
      auth.users.raw_user_meta_data->>'role' = 'admin'
      OR auth.users.raw_user_meta_data->>'role' = 'super_admin'
    )
    AND (
      auth.users.raw_user_meta_data->>'role' = 'super_admin'
      OR auth.users.raw_user_meta_data->>'organizationId' = organization_id
    )
  )
);

-- Policy: Super admins can delete any profile
CREATE POLICY "Super admins can delete profiles"
ON public.profiles FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.raw_user_meta_data->>'role' = 'super_admin'
  )
);

-- Function to automatically create/update profile on user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role, organization_id, status, last_login)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'standard_user'),
    NEW.raw_user_meta_data->>'organizationId',
    'active',
    NEW.last_sign_in_at
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, profiles.name),
    role = COALESCE(EXCLUDED.role, profiles.role),
    organization_id = COALESCE(EXCLUDED.organization_id, profiles.organization_id),
    last_login = EXCLUDED.last_login,
    updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill existing users (if any)
INSERT INTO public.profiles (id, email, name, role, organization_id, status, last_login, created_at)
SELECT 
  id,
  email,
  COALESCE(raw_user_meta_data->>'name', email),
  COALESCE(raw_user_meta_data->>'role', 'standard_user'),
  raw_user_meta_data->>'organizationId',
  'active',
  last_sign_in_at,
  created_at
FROM auth.users
ON CONFLICT (id) DO NOTHING;`;

export function MigrationHelper() {
  const [copied, setCopied] = useState(false);
  const [showSQL, setShowSQL] = useState(false);
  const [copyMethod, setCopyMethod] = useState<'clipboard' | 'textarea' | 'failed'>('clipboard');

  const handleCopy = async () => {
    try {
      // Try modern Clipboard API first
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(MIGRATION_SQL);
        setCopied(true);
        setCopyMethod('clipboard');
        setTimeout(() => setCopied(false), 2000);
        return;
      }
    } catch (error) {
      console.log('Clipboard API not available, using fallback...');
    }

    // Fallback: Create a temporary textarea
    try {
      const textarea = document.createElement('textarea');
      textarea.value = MIGRATION_SQL;
      textarea.style.position = 'fixed';
      textarea.style.left = '-999999px';
      textarea.style.top = '-999999px';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      
      const successful = document.execCommand('copy');
      document.body.removeChild(textarea);
      
      if (successful) {
        setCopied(true);
        setCopyMethod('textarea');
        setTimeout(() => setCopied(false), 2000);
      } else {
        setCopyMethod('failed');
        // Auto-show SQL if copy failed
        setShowSQL(true);
      }
    } catch (error) {
      console.error('Copy failed:', error);
      setCopyMethod('failed');
      // Auto-show SQL if copy failed
      setShowSQL(true);
    }
  };

  return (
    <Card className="border-red-200 bg-red-50">
      <CardHeader>
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
          <div className="flex-1">
            <CardTitle className="text-red-900">Database Setup Required</CardTitle>
            <CardDescription className="text-red-700 mt-1">
              The profiles table needs to be created in your Supabase database to enable multi-tenant user management.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Quick Setup:</strong> Follow these 3 simple steps to enable user management.
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-sm font-semibold shrink-0">
              1
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-900">Copy the SQL migration</p>
              <p className="text-sm text-gray-600 mt-1">Click the button below to copy the SQL code to your clipboard</p>
              <div className="flex gap-2 mt-2">
                <Button
                  onClick={handleCopy}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 text-green-600" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copy SQL Migration
                    </>
                  )}
                </Button>
                <Button
                  onClick={() => setShowSQL(!showSQL)}
                  variant="ghost"
                  size="sm"
                >
                  {showSQL ? 'Hide' : 'View'} SQL
                </Button>
              </div>
              {showSQL && (
                <pre className="mt-3 p-3 bg-gray-900 text-gray-100 rounded text-xs overflow-x-auto max-h-64 overflow-y-auto">
                  {MIGRATION_SQL}
                </pre>
              )}
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-sm font-semibold shrink-0">
              2
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-900">Open Supabase SQL Editor</p>
              <p className="text-sm text-gray-600 mt-1">
                Go to your Supabase dashboard → SQL Editor → New Query
              </p>
              <Button
                asChild
                variant="outline"
                size="sm"
                className="gap-2 mt-2"
              >
                <a
                  href="https://supabase.com/dashboard"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open Supabase Dashboard
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-sm font-semibold shrink-0">
              3
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-900">Run the migration</p>
              <p className="text-sm text-gray-600 mt-1">
                Paste the SQL code and click <strong>Run</strong> or press <kbd className="px-1.5 py-0.5 bg-gray-200 rounded text-xs font-mono">Ctrl+Enter</kbd>
              </p>
              <p className="text-sm text-gray-600 mt-2">
                ✅ After running, refresh this page to verify the setup
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-900">
            <strong>💡 What this migration does:</strong>
          </p>
          <ul className="text-sm text-blue-800 mt-2 space-y-1 list-disc list-inside ml-2">
            <li>Creates a <code className="bg-blue-100 px-1 rounded">profiles</code> table to store user data</li>
            <li>Sets up Row Level Security (RLS) policies for multi-tenant isolation</li>
            <li>Enables SUPER_ADMIN to view ALL users across ALL organizations</li>
            <li>Automatically syncs profiles when users sign up or log in</li>
            <li>Backfills existing users from the auth.users table</li>
          </ul>
        </div>

        <div className="mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
          <p className="text-sm text-yellow-900">
            <strong>⚠️ Need help?</strong> Check <code className="bg-yellow-100 px-1 rounded">/supabase/README.md</code> for detailed instructions and troubleshooting.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}