import React from 'react';
import { Copy, ExternalLink, CheckCircle2, AlertCircle, Database } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { toast } from 'react-toastify';
import { copyToClipboard } from '../utils/clipboard';

export function UpdateOrganizationsTable() {
  const [copied, setCopied] = React.useState(false);

  const MIGRATION_SQL = `-- ============================================
-- ADD MISSING COLUMNS TO ORGANIZATIONS TABLE
-- Run this in Supabase SQL Editor
-- ============================================

-- Add columns for tenant management if they don't exist
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS domain text,
  ADD COLUMN IF NOT EXISTS plan text DEFAULT 'starter',
  ADD COLUMN IF NOT EXISTS billing_email text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS max_users integer DEFAULT 10,
  ADD COLUMN IF NOT EXISTS max_contacts integer DEFAULT 1000,
  ADD COLUMN IF NOT EXISTS features jsonb DEFAULT '[]'::jsonb;

-- Update existing records to have default values if NULL
UPDATE public.organizations
SET 
  plan = COALESCE(plan, 'starter'),
  max_users = COALESCE(max_users, 10),
  max_contacts = COALESCE(max_contacts, 1000),
  features = COALESCE(features, '[]'::jsonb)
WHERE plan IS NULL OR max_users IS NULL OR max_contacts IS NULL OR features IS NULL;

-- Verify the columns were added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'organizations'
AND table_schema = 'public'
ORDER BY ordinal_position;`;

  const handleCopyToClipboard = async () => {
    const success = await copyToClipboard(MIGRATION_SQL);
    if (success) {
      setCopied(true);
      toast.success('Migration SQL copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error('Failed to copy. Please copy manually.');
    }
  };

  const openSupabaseSQL = () => {
    window.open('https://supabase.com/dashboard/project/_/sql/new', '_blank');
  };

  return (
    <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-purple-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-900">
          <Database className="h-6 w-6" />
          Update Organizations Table
        </CardTitle>
        <CardDescription>
          Add missing columns to track user counts, contact counts, and other tenant information
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="bg-white border-blue-300">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-900">
            <strong>Database migration needed.</strong> This script adds columns to the organizations table 
            to properly display usage statistics (Users, Contacts, Created, Updated).
          </AlertDescription>
        </Alert>

        <div className="bg-white border border-blue-200 rounded-lg p-4 space-y-3">
          <h3 className="font-semibold text-gray-900">What this migration adds:</h3>
          <ul className="text-sm text-gray-700 space-y-2 list-disc list-inside">
            <li>✅ <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">domain</code> - Organization domain</li>
            <li>✅ <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">plan</code> - Subscription plan (free, starter, professional, enterprise)</li>
            <li>✅ <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">billing_email</code> - Billing contact email</li>
            <li>✅ <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">phone</code> - Organization phone number</li>
            <li>✅ <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">address</code> - Organization address</li>
            <li>✅ <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">notes</code> - Internal notes</li>
            <li>✅ <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">max_users</code> - Maximum user limit</li>
            <li>✅ <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">max_contacts</code> - Maximum contacts limit</li>
            <li>✅ <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">features</code> - Feature flags (JSON)</li>
          </ul>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">Migration SQL Script</h3>
            <div className="flex gap-2">
              <Button
                onClick={handleCopyToClipboard}
                size="sm"
                variant="outline"
                className="gap-2"
              >
                {copied ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copy SQL
                  </>
                )}
              </Button>
              <Button
                onClick={openSupabaseSQL}
                size="sm"
                className="gap-2 bg-blue-600 hover:bg-blue-700"
              >
                <ExternalLink className="h-4 w-4" />
                Open SQL Editor
              </Button>
            </div>
          </div>

          <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-xs max-h-96">
            {MIGRATION_SQL}
          </pre>

          <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4 space-y-3">
            <h4 className="font-medium text-sm text-blue-900 flex items-center gap-2">
              <span className="bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">1</span>
              Quick Setup Instructions:
            </h4>
            <ol className="text-sm text-gray-700 space-y-2 list-decimal list-inside ml-2">
              <li>Click <strong>"Open SQL Editor"</strong> button above (opens Supabase Dashboard)</li>
              <li>Click <strong>"Copy SQL"</strong> to copy the migration script</li>
              <li>Paste the script into the Supabase SQL Editor</li>
              <li>Click <strong>"Run"</strong> to execute</li>
              <li>Refresh the Tenants page to see updated usage statistics</li>
            </ol>
          </div>
        </div>

        <Alert className="bg-green-50 border-green-300">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-900">
            <strong>Safe migration:</strong> Uses <code className="text-xs">ADD COLUMN IF NOT EXISTS</code> 
            so it won't fail if columns already exist. Existing data will not be affected.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
