import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { Loader2, CheckCircle, AlertCircle, Users, Copy, ExternalLink, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '../utils/supabase/client';
import type { User } from '../App';

const supabase = createClient();

interface UserSyncHelperProps {
  onSuccess: () => void;
  currentUser: User;
}

export function UserSyncHelper({ onSuccess, currentUser }: UserSyncHelperProps) {
  const [isSyncing, setIsSyncing] = useState(true); // Start as true for auto-sync
  const [syncComplete, setSyncComplete] = useState(false);
  const [autoSyncAttempted, setAutoSyncAttempted] = useState(false);
  const [autoSyncFailed, setAutoSyncFailed] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const SYNC_SQL_SCRIPT = `-- Sync existing authenticated users to profiles table
-- Run this in Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql/new)

INSERT INTO public.profiles (id, email, name, role, organization_id, status)
SELECT 
  id,
  email,
  COALESCE(raw_user_meta_data->>'name', split_part(email, '@', 1)),
  COALESCE(raw_user_meta_data->>'role', 'standard_user'),
  raw_user_meta_data->>'organizationId',
  'active'
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;

-- ✅ Sync complete! All authenticated users should now be in the profiles table.`;

  const syncUsers = async () => {
    try {
      setIsSyncing(true);
      setErrorMessage(null);

      // Get the current Supabase auth user
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !authUser) {
        // Auth session missing - this is expected, don't log as error
        setAutoSyncFailed(true);
        return;
      }

      // Try to insert/upsert the current user's profile
      const profileData = {
        id: authUser.id,
        email: currentUser.email,
        name: currentUser.name,
        role: currentUser.role,
        organization_id: currentUser.organizationId,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data, error: insertError } = await supabase
        .from('profiles')
        .upsert([profileData], { onConflict: 'id' })
        .select();

      if (insertError) {
        const msg = `Failed to sync user: ${insertError.message}`;
        setErrorMessage(msg);
        setAutoSyncFailed(true);
        toast.error(msg);
        return;
      }

      toast.success('✅ Your profile has been synced to the database!');
      setSyncComplete(true);
      
      // Reload after a short delay
      setTimeout(() => {
        onSuccess();
      }, 1500);

    } catch (err: any) {
      setAutoSyncFailed(true);
    } finally {
      setIsSyncing(false);
    }
  };

  const copySQL = () => {
    const textarea = document.createElement('textarea');
    textarea.value = SYNC_SQL_SCRIPT;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    
    try {
      document.execCommand('copy');
      toast.success('✅ SQL script copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy:', err);
      toast.error('Failed to copy. Please select and copy the text manually.');
    } finally {
      document.body.removeChild(textarea);
    }
  };

  const openSupabaseSQL = () => {
    const supabaseUrl = supabase.supabaseUrl;
    const projectRef = supabaseUrl.split('//')[1]?.split('.')[0];
    const sqlEditorUrl = `https://supabase.com/dashboard/project/${projectRef}/sql/new`;
    window.open(sqlEditorUrl, '_blank');
  };

  useEffect(() => {
    if (!autoSyncAttempted) {
      setAutoSyncAttempted(true);
      console.log('[UserSyncHelper] 🚀 Auto-syncing user profile on mount...');
      setIsSyncing(true); // Show syncing state immediately
      syncUsers().catch(err => {
        console.error('[UserSyncHelper] ❌ Auto sync failed:', err);
        setAutoSyncFailed(true);
        setIsSyncing(false);
      });
    }
  }, []);

  if (syncComplete) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-900">
            <CheckCircle className="h-5 w-5" />
            Users Synced Successfully!
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="border-green-300 bg-green-100">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-900">
              Your users have been synced to the profiles table. Refreshing...
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-orange-500 bg-orange-50 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-900 text-xl">
          <AlertCircle className="h-6 w-6" />
          ⚠️ Auth Session Missing - Manual Sync Required
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="border-orange-400 bg-orange-100">
          <AlertCircle className="h-5 w-5 text-orange-600" />
          <AlertDescription className="text-orange-900">
            <strong className="text-lg">⚠️ Supabase Authentication Session Not Found</strong>
            <br />
            <span className="text-sm mt-2 block">The automatic sync cannot work because there's no active Supabase auth session. This is normal if you haven't signed in through Supabase yet.</span>
            <br />
            <span className="text-sm font-bold">✅ Solution: Use the SQL script below to sync ALL users at once!</span>
          </AlertDescription>
        </Alert>

        {errorMessage && (
          <Alert className="border-yellow-400 bg-yellow-50">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-900 text-sm">
              {errorMessage}
            </AlertDescription>
          </Alert>
        )}

        {/* SQL Sync - NOW THE PRIMARY SOLUTION */}
        <div className="space-y-3 border-4 border-green-500 rounded-lg p-6 bg-gradient-to-br from-green-50 to-blue-50 shadow-xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-green-600 text-white rounded-full w-10 h-10 flex items-center justify-center text-xl font-bold animate-pulse">
              ✓
            </div>
            <div>
              <h3 className="text-xl font-bold text-green-900">🔧 SQL Sync - Syncs ALL Users (Recommended)</h3>
              <p className="text-sm text-green-800">Run this SQL script in Supabase to sync all authenticated users</p>
            </div>
          </div>

          <div className="space-y-3">
            <Button
              onClick={copySQL}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
              size="lg"
            >
              <Copy className="mr-3 h-6 w-6" />
              <span className="text-lg font-bold">STEP 1: 📋 Copy SQL Script</span>
            </Button>
            
            <Button
              onClick={openSupabaseSQL}
              className="w-full bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
              size="lg"
            >
              <ExternalLink className="mr-3 h-6 w-6" />
              <span className="text-lg font-bold">STEP 2: 🚀 Open Supabase SQL Editor</span>
            </Button>

            <div className="bg-yellow-100 border-4 border-yellow-500 rounded-lg p-5 text-center shadow-md">
              <p className="text-yellow-900 font-bold text-lg mb-2">
                ⚡ STEP 3: Paste & Run in Supabase
              </p>
              <p className="text-yellow-800 text-sm">
                1. Paste the script (Ctrl+V or Cmd+V)<br />
                2. Click the green <strong>"RUN"</strong> button<br />
                3. Wait for "Success" message<br />
                4. Come back here and click the 🔄 Refresh button at the top!
              </p>
            </div>
          </div>

          {/* SQL Script Display - ALWAYS VISIBLE */}
          <div className="relative mt-4">
            <div className="flex items-center justify-between mb-2 bg-gray-800 px-4 py-2 rounded-t-lg">
              <span className="text-green-400 font-mono text-sm">💾 SQL Sync Script (Copy this entire block)</span>
              <Button
                onClick={copySQL}
                variant="outline"
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-white border-green-500"
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy
              </Button>
            </div>
            <div className="bg-gray-900 text-green-400 p-4 rounded-b-lg text-xs overflow-x-auto max-h-96 overflow-y-auto border-2 border-green-500 font-mono">
              <pre>{SYNC_SQL_SCRIPT}</pre>
            </div>
          </div>

          {/* Detailed Instructions */}
          <div className="bg-white border-2 border-green-400 rounded-lg p-4 shadow-md">
            <p className="text-base text-green-900 font-bold mb-3 flex items-center gap-2">
              <span className="text-2xl">📋</span> Complete Step-by-Step Instructions:
            </p>
            <ol className="text-sm text-gray-800 space-y-2 ml-6 list-decimal">
              <li><strong>Click "STEP 1"</strong> button above to copy the SQL script</li>
              <li><strong>Click "STEP 2"</strong> button to open Supabase SQL Editor in a new tab</li>
              <li><strong>In Supabase:</strong> Paste the script (Ctrl+V or Cmd+V)</li>
              <li><strong>Click the green "RUN"</strong> button in Supabase</li>
              <li><strong>Wait for success message</strong></li>
              <li><strong>Come back to this tab</strong> and click the <strong>🔄 Refresh</strong> button at the top</li>
              <li><strong>✅ Done!</strong> All your users will now be loaded!</li>
            </ol>
          </div>
        </div>

        {/* What this does */}
        <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4">
          <p className="text-sm font-bold text-blue-900 mb-2">🔍 What This Script Does:</p>
          <ul className="text-xs text-blue-800 space-y-1 ml-4 list-disc">
            <li>Reads ALL users from your Supabase auth.users table</li>
            <li>Creates corresponding profile records in the profiles table</li>
            <li>Preserves user metadata (name, role, organization)</li>
            <li>Skips users that already exist (safe to run multiple times)</li>
            <li>Fixes the "No users found" error permanently</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}