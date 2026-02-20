import { useState } from 'react';
import { Search, UserCheck, AlertTriangle, RefreshCw } from 'lucide-react';
import { createClient } from '../utils/supabase/client';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { RLSSetupGuide } from './RLSSetupGuide';
import { copyToClipboard as clipboardUtil } from '../utils/clipboard';

// Helper function to copy text to clipboard
const copyToClipboard = async (text: string) => {
  try {
    const success = await clipboardUtil(text);
    if (success) return;
  } catch (error) {
    console.log('Clipboard copy failed', error);
  }
  // Final fallback: show alert
  console.error('All clipboard methods failed');
};

const supabase = createClient();

interface UserRecoveryProps {
  currentUserId: string;
  currentOrganizationId: string;
  currentUserRole?: string;
}

export function UserRecovery({ currentUserId, currentOrganizationId, currentUserRole }: UserRecoveryProps) {
  const [searchEmail, setSearchEmail] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any>(null);
  const [recovering, setRecovering] = useState(false);

  const searchUser = async () => {
    setSearching(true);
    setSearchResults(null);

    try {
      console.log('🔍 Searching for user:', searchEmail);

      // Search in auth.users
      const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
      
      if (authError) {
        console.log('⚠️ Cannot access auth.users (admin only)');
      }

      const authUser = authUsers?.users?.find(u => 
        u.email?.toLowerCase() === searchEmail.toLowerCase()
      );

      // Search in profiles
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .ilike('email', searchEmail);

      console.log('📊 Search results:', {
        authUser: authUser ? 'Found' : 'Not found',
        profileData,
        profileError
      });

      // Search across ALL organizations (to see if user is in different org)
      const { data: allProfiles, error: allProfilesError } = await supabase
        .from('profiles')
        .select('*')
        .ilike('email', searchEmail);

      console.log('🌐 All profiles search:', { allProfiles, allProfilesError });

      setSearchResults({
        email: searchEmail,
        authUser: authUser ? {
          id: authUser.id,
          email: authUser.email,
          created_at: authUser.created_at,
          confirmed_at: authUser.confirmed_at
        } : null,
        profile: profileData?.[0] || null,
        allProfiles: allProfiles || [],
        profileError,
        allProfilesError,
        currentOrg: currentOrganizationId
      });

      if (!authUser && !profileData?.[0]) {
        toast.error('User not found in system');
      } else if (authUser && !profileData?.[0]) {
        toast.warning('User exists in auth but missing profile record');
      } else if (profileData?.[0]?.organization_id !== currentOrganizationId) {
        toast.warning('User found but in different organization');
      } else {
        toast.success('User found');
      }

    } catch (error) {
      console.error('❌ Error searching user:', error);
      toast.error('Error searching for user');
    } finally {
      setSearching(false);
    }
  };

  const createProfile = async () => {
    if (!searchResults?.authUser) {
      toast.error('No auth user found to create profile for');
      return;
    }

    setRecovering(true);

    try {
      console.log('🔧 Creating profile for user:', searchResults.authUser);

      const { data, error } = await supabase
        .from('profiles')
        .insert([{
          id: searchResults.authUser.id,
          email: searchResults.authUser.email,
          name: searchResults.authUser.email.split('@')[0],
          organization_id: currentOrganizationId,
          role: 'standard_user',
          status: 'active'
        }])
        .select();

      if (error) {
        console.error('❌ Error creating profile:', error);
        toast.error('Failed to create profile: ' + error.message);
        return;
      }

      if (!data || data.length === 0) {
        console.error('❌ No rows inserted');
        toast.error('Failed to create profile: No data returned');
        return;
      }

      console.log('✅ Profile created:', data[0]);
      toast.success('Profile created successfully');
      
      // Re-search to show updated results
      await searchUser();

    } catch (error) {
      console.error('❌ Error:', error);
      toast.error('Error creating profile');
    } finally {
      setRecovering(false);
    }
  };

  const moveToOrganization = async () => {
    if (!searchResults?.profile) {
      toast.error('No profile found to update');
      return;
    }

    setRecovering(true);

    try {
      console.log('🔧 Moving user to organization:', searchResults.profile.email);
      console.log('🔧 Target organization:', currentOrganizationId);
      console.log('🔧 Current user role:', currentUserRole);

      // Use the server-side function that bypasses RLS
      const { data, error } = await supabase.rpc('assign_user_to_organization', {
        p_user_email: searchResults.profile.email,
        p_organization_id: currentOrganizationId
      });

      if (error) {
        console.error('❌ Error calling function:', error);
        
        // Check if function doesn't exist
        if (error.message.includes('function') && error.message.includes('does not exist')) {
          toast.error('⚠️ Database functions not installed. Please run the SQL setup script first. See /SQL_FIX_USER_ORGANIZATION.sql');
          console.log('\n💡 SETUP REQUIRED:');
          console.log('   1. Open Supabase SQL Editor');
          console.log('   2. Run the SQL from /SQL_FIX_USER_ORGANIZATION.sql');
          console.log('   3. Try again');
        } else {
          toast.error('Failed to update organization: ' + error.message);
        }
        return;
      }

      // Check the result from the function
      if (!data || !data.success) {
        console.error('❌ Function returned error:', data?.error);
        toast.error('⚠️ ' + (data?.error || 'Failed to assign user to organization'));
        return;
      }

      console.log('✅ Organization updated successfully!');
      console.log('   User ID:', data.user_id);
      console.log('   Email:', data.email);
      console.log('   Organization:', data.organization_id);
      
      toast.success('User moved to your organization successfully!');
      
      // Re-search to show updated results
      await searchUser();

    } catch (error: any) {
      console.error('❌ Unexpected error:', error);
      toast.error('Error updating organization: ' + error.message);
    } finally {
      setRecovering(false);
    }
  };

  const deleteAndRecreate = async () => {
    if (!searchResults?.profile) {
      toast.error('No profile to delete');
      return;
    }

    if (!confirm('This will delete the existing profile and recreate it. Continue?')) {
      return;
    }

    setRecovering(true);

    try {
      console.log('🔧 Attempting to delete profile:', searchResults.profile.id);
      
      // Delete existing profile
      const { data: deleteData, error: deleteError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', searchResults.profile.id)
        .select();

      if (deleteError) {
        console.error('❌ Error deleting profile:', deleteError);
        
        // Check if it's an RLS error
        if (deleteError.code === '42501' || deleteError.message.includes('policy')) {
          toast.error('⚠️ RLS Policy Error: Cannot delete profile in other organization. Use the SQL script below instead.', {
            duration: 5000
          });
        } else {
          toast.error('Failed to delete profile: ' + deleteError.message);
        }
        return;
      }

      if (!deleteData || deleteData.length === 0) {
        console.error('❌ No rows deleted - RLS policy blocking');
        toast.error('⚠️ Cannot delete profile - RLS policies are blocking this operation. Use the SQL script below instead.', {
          duration: 5000
        });
        return;
      }

      console.log('✅ Profile deleted, creating new one...');
      // Create new profile
      await createProfile();

    } catch (error) {
      console.error('❌ Error:', error);
      toast.error('Error during delete and recreate - Use SQL script below instead');
    } finally {
      setRecovering(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* RLS Setup Guide - Show this first */}
      <RLSSetupGuide />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            User Recovery Tool
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              This tool helps find and recover missing users. It will search across auth.users and profiles tables.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label>Email Address</Label>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="user@example.com"
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && searchUser()}
              />
              <Button onClick={searchUser} disabled={searching}>
                <Search className="h-4 w-4 mr-2" />
                {searching ? 'Searching...' : 'Search'}
              </Button>
            </div>
          </div>

          {searchResults && (
            <div className="space-y-4 mt-6">
              <div className="border rounded-lg p-4 space-y-3">
                <h3 className="font-medium">Search Results for: {searchResults.email}</h3>
                
                {/* Auth User Status */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div>
                      <p className="text-sm font-medium">Auth User (auth.users)</p>
                      <p className="text-xs text-gray-600">
                        {searchResults.authUser ? (
                          <>
                            ✅ Found - ID: {searchResults.authUser.id.substring(0, 8)}...
                            <br />
                            Created: {new Date(searchResults.authUser.created_at).toLocaleDateString()}
                          </>
                        ) : (
                          '❌ Not found in authentication system'
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Profile Status */}
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div>
                      <p className="text-sm font-medium">Profile (profiles table)</p>
                      <p className="text-xs text-gray-600">
                        {searchResults.profile ? (
                          <>
                            ✅ Found - Organization: {searchResults.profile.organization_id}
                            <br />
                            {searchResults.profile.organization_id === searchResults.currentOrg ? (
                              <span className="text-green-600">✓ In your organization</span>
                            ) : (
                              <span className="text-orange-600">⚠️ In different organization</span>
                            )}
                            <br />
                            Role: {searchResults.profile.role}
                            <br />
                            Status: {searchResults.profile.status}
                          </>
                        ) : (
                          '❌ No profile record found'
                        )}
                      </p>
                    </div>
                  </div>

                  {/* All Profiles Found */}
                  {searchResults.allProfiles && searchResults.allProfiles.length > 0 && (
                    <div className="p-3 bg-blue-50 rounded border border-blue-200">
                      <p className="text-sm font-medium text-blue-900">
                        Found {searchResults.allProfiles.length} profile(s) across all organizations:
                      </p>
                      {searchResults.allProfiles.map((profile: any, idx: number) => (
                        <div key={idx} className="text-xs text-blue-800 mt-2 pl-4">
                          • Org: {profile.organization_id} | Role: {profile.role} | Status: {profile.status}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Recovery Actions */}
                <div className="space-y-2 pt-4 border-t">
                  <p className="text-sm font-medium">Recovery Actions:</p>
                  
                  {searchResults.authUser && !searchResults.profile && (
                    <Button 
                      onClick={createProfile} 
                      disabled={recovering}
                      className="w-full"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Create Profile in Your Organization
                    </Button>
                  )}

                  {searchResults.profile && searchResults.profile.organization_id !== searchResults.currentOrg && (
                    <>
                      <Alert className="border-orange-200 bg-orange-50">
                        <AlertTriangle className="h-4 w-4 text-orange-600" />
                        <AlertDescription className="text-orange-900">
                          <strong>User in Different Organization</strong>
                          <p className="text-sm mt-1">
                            This user is in organization: <code className="bg-orange-100 px-1 rounded">{searchResults.profile.organization_id}</code>
                          </p>
                          <p className="text-sm mt-2">
                            <strong>⚠️ Note:</strong> Due to Row Level Security (RLS) policies, moving users between organizations requires super_admin privileges. 
                            If the "Move User" button fails, use "Delete & Recreate" instead.
                          </p>
                        </AlertDescription>
                      </Alert>

                      <Button 
                        onClick={moveToOrganization} 
                        disabled={recovering}
                        variant="outline"
                        className="w-full"
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Try to Move User (May Fail if Not Super Admin)
                      </Button>

                      <Button 
                        onClick={deleteAndRecreate} 
                        disabled={recovering}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Delete & Recreate (Recommended)
                      </Button>
                    </>
                  )}

                  {searchResults.profile && searchResults.profile.organization_id === searchResults.currentOrg && (
                    <Alert className="border-green-200 bg-green-50">
                      <AlertDescription className="text-green-900">
                        ✅ User is already in your organization. No action needed.
                      </AlertDescription>
                    </Alert>
                  )}

                  {!searchResults.authUser && !searchResults.profile && (
                    <Alert>
                      <AlertDescription>
                        User not found in the system. They may need to sign up first.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </div>

              {/* SQL Script for RLS Bypass */}
              {searchResults.profile && searchResults.profile.organization_id !== searchResults.currentOrg && (
                <div className="border rounded-lg p-4 space-y-3 bg-blue-50 border-blue-200">
                  <h3 className="font-medium text-blue-900">🛠️ Manual SQL Fix (Bypasses RLS)</h3>
                  <p className="text-sm text-blue-800">
                    If the buttons above fail due to RLS policies, copy and run this SQL in your Supabase SQL Editor:
                  </p>
                  <div className="bg-gray-900 text-green-400 p-4 rounded font-mono text-xs overflow-x-auto">
                    <pre>{`-- Move user ${searchResults.email} to organization ${currentOrganizationId}
UPDATE public.profiles 
SET organization_id = '${currentOrganizationId}'
WHERE id = '${searchResults.profile.id}';

-- Verify the update
SELECT id, email, organization_id, role, status 
FROM public.profiles 
WHERE email = '${searchResults.email}';`}</pre>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const sql = `-- Move user ${searchResults.email} to organization ${currentOrganizationId}\nUPDATE public.profiles \nSET organization_id = '${currentOrganizationId}'\nWHERE id = '${searchResults.profile.id}';\n\n-- Verify the update\nSELECT id, email, organization_id, role, status \nFROM public.profiles \nWHERE email = '${searchResults.email}';`;
                        copyToClipboard(sql);
                        toast.success('SQL copied to clipboard!');
                      }}
                    >
                      📋 Copy SQL
                    </Button>
                    <Button
                      size="sm"
                      onClick={searchUser}
                      disabled={searching}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Re-check After Running SQL
                    </Button>
                  </div>
                  <Alert className="border-yellow-300 bg-yellow-50">
                    <AlertDescription className="text-yellow-900 text-xs">
                      <strong>How to run this SQL:</strong>
                      <ol className="list-decimal pl-5 mt-2 space-y-1">
                        <li>Go to your Supabase Dashboard</li>
                        <li>Navigate to SQL Editor</li>
                        <li>Click "New Query"</li>
                        <li>Paste the SQL above</li>
                        <li>Click "Run" or press Ctrl+Enter</li>
                        <li>Return here and click "Re-check After Running SQL"</li>
                      </ol>
                    </AlertDescription>
                  </Alert>
                </div>
              )}
            </div>
          )}

          <div className="text-xs text-gray-500 space-y-1 mt-4">
            <p><strong>Troubleshooting Tips:</strong></p>
            <ul className="list-disc pl-5 space-y-1">
              <li>If user exists in auth but no profile: Click "Create Profile"</li>
              <li>If user is in different organization: Use "Delete & Recreate" (recommended for non-super admins)</li>
              <li>"Move User" button requires super_admin role due to RLS policies</li>
              <li>"Delete & Recreate" bypasses RLS by creating a fresh profile in your organization</li>
              <li>After recovery, user should appear in the Users list immediately</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}