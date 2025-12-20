import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { Copy, CheckCircle, ExternalLink, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '../utils/supabase/client';
import { copyToClipboard } from '../utils/clipboard';

const supabase = createClient();

const RLS_FIX_SQL = `-- Enable RLS on profiles table (if not already enabled)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles in their organization" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update profiles in organization" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.profiles;
DROP POLICY IF EXISTS "Enable update for users based on id" ON public.profiles;
DROP POLICY IF EXISTS "Enable delete for users based on id" ON public.profiles;

-- Create a simple policy to allow all authenticated users to read profiles
CREATE POLICY "Enable read access for authenticated users"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to insert their own profile
CREATE POLICY "Enable insert for authenticated users only"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Allow users to delete their own profile
CREATE POLICY "Enable delete for users based on id"
ON public.profiles
FOR DELETE
TO authenticated
USING (auth.uid() = id);`;

interface RLSPolicyFixerProps {
  onSuccess: () => void;
}

export function RLSPolicyFixer({ onSuccess }: RLSPolicyFixerProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isTesting, setIsTesting] = useState(false);

  // Log when component mounts
  console.log('🔧 [RLSPolicyFixer] Component is rendering - RLS fix needed!');

  const testRLS = async () => {
    setIsTesting(true);
    try {
      console.log('🧪 Testing RLS configuration...');
      
      // Try to read from profiles table
      const { data, error, count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact' });
      
      console.log('🧪 RLS Test Result:', { data, error, count, dataLength: data?.length });
      
      if (error) {
        console.error('❌ RLS Test Failed:', error);
        toast.error(`RLS is still blocking: ${error.message}. Make sure you ran the SQL in Supabase!`, { autoClose: 5000 });
      } else if (data && data.length > 0) {
        console.log('✅ RLS Test Passed! Found', data.length, 'users');
        toast.success(`Success! Found ${data.length} users. Refreshing...`, { autoClose: 2000 });
        setTimeout(() => onSuccess(), 2000);
      } else {
        console.warn('⚠️ RLS Test Passed but no users found');
        toast.info('RLS is working! Now syncing users from auth...', { autoClose: 2000 });
        // Auto-sync users
        setTimeout(() => syncUsers(), 2000);
      }
    } catch (err: any) {
      console.error('❌ Test exception:', err);
      toast.error(`Test failed: ${err.message}`);
    } finally {
      setIsTesting(false);
    }
  };

  const syncUsers = async () => {
    try {
      console.log('🔄 Syncing users from auth.users to profiles...');
      toast.info('Syncing users from authentication...', { autoClose: 3000 });

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('Not authenticated. Please log in.');
        return;
      }

      console.log('👤 Current user:', user.id, user.email);

      // Check if current user exists in profiles
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (existingProfile) {
        console.log('✅ User already exists in profiles');
        toast.success('Profile already exists! Refreshing...', { autoClose: 2000 });
        setTimeout(() => onSuccess(), 2000);
      } else {
        console.log('➕ Creating profile for current user...');
        
        // Insert current user into profiles
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email || '',
            full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
            role: 'admin', // First user is admin
            organization_id: crypto.randomUUID(), // Create new org
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (insertError) {
          console.error('❌ Failed to create profile:', insertError);
          toast.error(`Failed to create profile: ${insertError.message}`);
        } else {
          console.log('✅ Profile created successfully!');
          toast.success('Profile created! Refreshing...', { autoClose: 2000 });
          setTimeout(() => onSuccess(), 2000);
        }
      }
    } catch (err: any) {
      console.error('❌ Sync exception:', err);
      toast.error(`Sync failed: ${err.message}`);
    }
  };

  const copySQL = () => {
    copyToClipboard(RLS_FIX_SQL).then(() => {
      toast.success('SQL copied to clipboard!');
    }).catch(() => {
      toast.error('Failed to copy SQL');
    });
  };

  const openSupabaseSQL = () => {
    const projectRef = supabase.supabaseUrl.split('//')[1]?.split('.')[0];
    const sqlEditorUrl = `https://supabase.com/dashboard/project/${projectRef}/sql/new`;
    window.open(sqlEditorUrl, '_blank');
  };

  if (!isExpanded) {
    return (
      <Card className="border-yellow-400 bg-yellow-50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="text-sm font-semibold text-yellow-900">RLS Policy Issue Detected</p>
                <p className="text-xs text-yellow-700">Click to fix security policies</p>
              </div>
            </div>
            <Button onClick={() => setIsExpanded(true)} size="sm" variant="outline">
              Fix Now
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-red-500 bg-red-50 shadow-lg">
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <Shield className="h-8 w-8 text-red-600 mt-1" />
            <div className="flex-1">
              <h3 className="text-xl font-bold text-red-900">🚨 ACTION REQUIRED: RLS Policies Not Configured</h3>
              <p className="text-sm text-red-800 mt-2">
                Your users exist in Supabase, but Row Level Security (RLS) policies are blocking read access. 
                <strong> Follow the 4 steps below to fix this NOW:</strong>
              </p>
            </div>
          </div>

          <div className="bg-white border-2 border-red-400 rounded-lg p-5">
            <p className="text-base text-red-900 font-bold mb-3">
              📝 FOLLOW THESE 4 STEPS:
            </p>
            <ol className="text-sm text-gray-900 space-y-3 ml-4 list-decimal">
              <li className="font-semibold">
                Click the <span className="bg-gray-200 px-2 py-1 rounded">Copy SQL</span> button below
                <span className="text-green-600 ml-2">✓ SQL copied to clipboard</span>
              </li>
              <li className="font-semibold">
                Click the <span className="bg-yellow-500 px-2 py-1 rounded text-white">Open Supabase SQL Editor</span> button below
                <span className="text-gray-600 block mt-1 font-normal">→ This opens Supabase in a new tab</span>
              </li>
              <li className="font-semibold">
                In Supabase, paste the SQL and click the green <span className="bg-green-600 px-2 py-1 rounded text-white">RUN</span> button
                <span className="text-gray-600 block mt-1 font-normal">→ Wait for "Success" message</span>
              </li>
              <li className="font-semibold">
                Come back here and click <span className="bg-green-600 px-2 py-1 rounded text-white">Test RLS Configuration</span>
                <span className="text-gray-600 block mt-1 font-normal">→ Your users will load!</span>
              </li>
            </ol>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={copySQL}
              className="flex-1 h-14 text-base font-bold"
              variant="outline"
            >
              <Copy className="mr-2 h-5 w-5" />
              1️⃣ Copy SQL
            </Button>
            <Button
              onClick={openSupabaseSQL}
              className="flex-1 h-14 text-base font-bold bg-yellow-600 hover:bg-yellow-700"
            >
              <ExternalLink className="mr-2 h-5 w-5" />
              2️⃣ Open Supabase SQL Editor
            </Button>
          </div>

          {/* SQL Display */}
          <details className="bg-gray-900 text-green-400 rounded-lg border-2 border-green-500">
            <summary className="cursor-pointer p-4 text-sm font-bold text-green-300 hover:bg-gray-800 rounded-lg">
              📋 Click to View SQL Script (Copy this!)
            </summary>
            <div className="p-4 text-xs overflow-x-auto max-h-96 overflow-y-auto font-mono">
              <pre>{RLS_FIX_SQL}</pre>
            </div>
          </details>

          <Button
            onClick={testRLS}
            className="w-full h-14 text-base font-bold bg-green-600 hover:bg-green-700"
            disabled={isTesting}
          >
            <CheckCircle className="mr-2 h-5 w-5" />
            {isTesting ? 'Testing...' : '4️⃣ Test RLS Configuration'}
          </Button>

          <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4">
            <p className="text-sm text-yellow-900 font-semibold mb-2">
              ⚠️ Still seeing "No users found"?
            </p>
            <p className="text-xs text-yellow-800 mb-3">
              Your auth user needs to be synced to the profiles table. Click below to create your profile:
            </p>
            <Button
              onClick={syncUsers}
              className="w-full bg-blue-600 hover:bg-blue-700"
              size="sm"
            >
              🔄 Create My Profile Now
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}