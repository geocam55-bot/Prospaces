import { useState, useEffect } from 'react';
import { DatabaseSetup } from './DatabaseSetup';
import { SimpleSyncButton } from './SimpleSyncButton';
import { OneTimeSetup } from './OneTimeSetup';
import { ManagerMigrationHelper } from './ManagerMigrationHelper';
import type { User, UserRole } from '../App';
import { PermissionGate } from './PermissionGate';
import { canView, canAdd, canChange, canDelete } from '../utils/permissions';
import { tenantsAPI, usersAPI } from '../utils/api';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Search, Plus, UserPlus, Edit, Trash2, MoreVertical, Building2, Shield, AlertCircle, Key, Copy } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';
import { copyToClipboard } from '../utils/clipboard';
import { ProfilesSyncFixer } from './ProfilesSyncFixer';
import { QuickOrgFix } from './QuickOrgFix';
import { PermissionsManager } from './PermissionsManager';
import { UserRecovery } from './UserRecovery';
import { ProfilesTableFix } from './ProfilesTableFix';
import { FindMissingUser } from './FindMissingUser';
import { FixInvalidOrgIds } from './FixInvalidOrgIds';
import { InvalidOrgIdAlert } from './InvalidOrgIdAlert';
import { createClient } from '../utils/supabase/client';
import { toast } from 'sonner';
import { useDebounce } from '../utils/useDebounce';
import { projectId, publicAnonKey } from '../utils/supabase/info';

const supabase = createClient();

interface UsersProps {
  user: User;
}

interface OrgUser extends User {
  status: 'active' | 'invited' | 'inactive';
  lastLogin?: string;
  managerId?: string;
}

interface Tenant {
  id: string;
  name: string;
  status: 'active' | 'inactive' | 'suspended';
  logo?: string;
}

export function Users({ user }: UsersProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300); // 🚀 Debounce search for better performance
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<OrgUser | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoadingTenants, setIsLoadingTenants] = useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [usingClientSide, setUsingClientSide] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [showAllOrgs, setShowAllOrgs] = useState(false); // Debug toggle
  const [showProfilesFix, setShowProfilesFix] = useState(false); // Show profiles table fix
  const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [resetPasswordUser, setResetPasswordUser] = useState<OrgUser | null>(null);
  const [showOrgChangeWarning, setShowOrgChangeWarning] = useState(false);
  const [originalOrganizationId, setOriginalOrganizationId] = useState('');
  const [pendingOrgChange, setPendingOrgChange] = useState<string | null>(null);
  const [isInviteCredentialsDialogOpen, setIsInviteCredentialsDialogOpen] = useState(false);
  const [inviteCredentials, setInviteCredentials] = useState<{ email: string; tempPassword: string; name: string } | null>(null);

  // Check permissions using the permissions system
  // Director can VIEW users but not add/edit/delete
  const canViewUsers = canView('users', user.role);
  const canManageUsers = canAdd('users', user.role) || canChange('users', user.role);
  const canManageAllUsers = canDelete('users', user.role) || (user.role === 'super_admin' || user.role === 'admin');

  const [users, setUsers] = useState<OrgUser[]>([]);

  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    role: 'standard_user' as UserRole,
    organizationId: user.organizationId,
  });

  const [editUser, setEditUser] = useState({
    name: '',
    email: '',
    role: 'standard_user' as UserRole,
    organizationId: '',
    status: 'active' as 'active' | 'invited' | 'inactive',
    managerId: '',
  });

  // Load users on mount
  useEffect(() => {
    loadUsers();
  }, []);

  // Load tenants if super admin
  useEffect(() => {
    if (user.role === 'super_admin') {
      loadTenants();
    }
  }, [user.role]);



  const loadUsers = async () => {
    setIsLoadingUsers(true);
    setError(null); // Clear previous errors
    
    try {
      // Build query - super_admin sees all users, admin sees only their org
      let query = supabase
        .from('profiles')
        .select('*');
      
      // Only filter by organization if NOT super_admin
      if (user.role !== 'super_admin') {
        query = query.eq('organization_id', user.organizationId);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('[Users Component] ❌ Error loading users:', error);
        
        // Check if it's the infinite recursion error
        if (error.code === '42P17' || error.message?.includes('infinite recursion')) {
          setError('infinite recursion: ' + JSON.stringify(error, null, 2));
        } else {
          setError(JSON.stringify(error, null, 2));
        }
        
        setShowDebug(true);
        setUsers([]);
        return;
      }
      
      if (!data || data.length === 0) {
        // No users found - sync helper will be shown
        setUsers([]);
        setShowDebug(false); // Don't show debug, show sync helper instead
        return;
      }

      // Map snake_case column names to camelCase for consistency
      const mappedUsers = data.map(user => ({
        ...user,
        organizationId: user.organization_id,
      }));

      setUsers(mappedUsers);
      setError(null);
    } catch (err) {
      console.error('[Users Component] ❌ Unexpected error:', err);
      setError(String(err));
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const loadTenants = async () => {
    try {
      setIsLoadingTenants(true);
      
      // Load organizations directly from Supabase for SUPER_ADMIN
      const { data: organizations, error } = await supabase
        .from('organizations')
        .select('*')
        .order('name', { ascending: true });
      
      if (error) {
        console.error('Failed to load organizations:', error);
        return;
      }
      
      // Map to tenant format
      const loadedTenants = organizations?.map(org => ({
        id: org.id,
        name: org.name,
        status: org.status || 'active',
        logo: org.logo,
      })) || [];
      
      setTenants(loadedTenants);
    } catch (error) {
      console.error('Failed to load tenants:', error);
    } finally {
      setIsLoadingTenants(false);
    }
  };

  const filteredUsers = users.filter(u => {
    const query = debouncedSearchQuery.toLowerCase().trim();
    
    // 🔍 Enhanced search: search across multiple fields
    const matchesSearch = !query || 
      u.name.toLowerCase().includes(query) ||
      u.email.toLowerCase().includes(query) ||
      u.role.toLowerCase().includes(query) ||
      (u.status && u.status.toLowerCase().includes(query));
    
    // Admin users should not see super_admin users
    const roleFilter = user.role === 'super_admin' || u.role !== 'super_admin';
    
    return matchesSearch && roleFilter;
  });

  // Get list of managers/directors for the manager dropdown
  const managers = users.filter(u => (u.role === 'manager' || u.role === 'director') && u.status === 'active');

  // Check if there's an organization mismatch (user is not seeing their own org)
  const hasOrgMismatch = users.length > 0 && user.role !== 'super_admin' && 
    !users.some(u => u.organizationId === user.organizationId);

  // Check if user has invalid timestamp-based org ID
  const hasInvalidOrgId = /^org-[0-9]+$/.test(user.organizationId);

  // Helper to get organization name
  const getOrgName = (organizationId: string) => {
    // For Super Admin - look up from tenants list
    if (user.role === 'super_admin') {
      const tenant = tenants.find(t => t.id === organizationId);
      if (tenant) {
        return tenant.name;
      }
      // If tenant not found, show the organization ID (useful for debugging)
      return organizationId || 'Unknown';
    }
    
    // For regular Admin - check if it's their organization
    if (user.role === 'admin') {
      if (organizationId === user.organizationId) {
        // Show their organization name if available, otherwise show ID
        return user.organizationName || organizationId || 'My Organization';
      }
      // Shouldn't happen (admin seeing other org's users), but handle gracefully
      return organizationId || 'Unknown';
    }
    
    return organizationId || 'Unknown';
  };

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    inviteUser();
  };

  const inviteUser = async () => {
    try {
      setShowProfilesFix(false); // Reset before trying
      
      // For super_admin, pass the selected organizationId
      const inviteData: any = {
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
      };
      
      // If super_admin, include the organizationId
      if (user.role === 'super_admin') {
        inviteData.organizationId = newUser.organizationId;
      }
      
      // Call API to invite user (now creates a real Supabase Auth account)
      const result = await usersAPI.invite(inviteData);
      
      // Reload users to show the newly invited user
      await loadUsers();
      
      // Reset form and close dialog
      setNewUser({ name: '', email: '', role: 'standard_user', organizationId: user.organizationId });
      setIsAddDialogOpen(false);
      
      // Show the credentials dialog so admin can share the temp password
      if (result?.tempPassword) {
        setInviteCredentials({
          email: inviteData.email,
          tempPassword: result.tempPassword,
          name: inviteData.name,
        });
        setIsInviteCredentialsDialogOpen(true);
        toast.success('User account created! Share the temporary password with the user.');
      } else {
        toast.success('User invited successfully!');
      }
    } catch (error: any) {
      console.error('Failed to invite user:', error);
      
      // Check for organization not found error
      if (error.message?.includes('does not exist') && error.message?.includes('Organization')) {
        toast.error(error.message + ' Please create it in the Tenants module first.');
      } else if (error.message?.includes('profiles_id_fkey') || error.message?.includes('is not present in table')) {
        setShowProfilesFix(true);
        toast.error('Database migration required. See instructions above.');
      } else if (error.message?.includes('already exists')) {
        toast.error('A user with this email already exists');
      } else {
        toast.error('Failed to invite user: ' + (error.message || 'Unknown error'));
      }
    }
  };

  const handleDeleteUser = async (id: string) => {
    // Find the user to check their role
    const userToDelete = users.find(u => u.id === id);
    
    // Prevent admin from deleting super_admin users
    if (user.role === 'admin' && userToDelete?.role === 'super_admin') {
      toast.error('You do not have permission to delete Super Admin users');
      return;
    }
    
    if (!confirm('Are you sure you want to remove this user?')) {
      return;
    }
    
    try {
      await usersAPI.delete(id);
      await loadUsers(); // Reload users after deletion
    } catch (error) {
      console.error('Failed to delete user:', error);
      alert('Failed to remove user. Please try again.');
    }
  };

  const handleEditUser = (orgUser: OrgUser) => {
    // Prevent admin from editing super_admin users
    if (user.role === 'admin' && orgUser.role === 'super_admin') {
      toast.error('You do not have permission to edit Super Admin users');
      return;
    }
    
    setSelectedUser(orgUser);
    setOriginalOrganizationId(orgUser.organizationId); // Store original for comparison
    setEditUser({
      name: orgUser.name,
      email: orgUser.email,
      role: orgUser.role,
      organizationId: orgUser.organizationId,
      status: orgUser.status,
      managerId: orgUser.managerId || '',
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    // Check if organization changed
    const orgChanged = editUser.organizationId !== originalOrganizationId;
    
    // If organization changed, show warning and require confirmation
    if (orgChanged && user.role === 'super_admin') {
      const oldOrgName = getOrgName(originalOrganizationId);
      const newOrgName = getOrgName(editUser.organizationId);
      
      const confirmed = confirm(
        `⚠️ ORGANIZATION CHANGE WARNING\n\n` +
        `You are about to move ${selectedUser.name} from:\n` +
        `  "${oldOrgName}"\n` +
        `to:\n` +
        `  "${newOrgName}"\n\n` +
        `This will affect their access to data and may cause issues.\n\n` +
        `Are you absolutely sure you want to do this?`
      );
      
      if (!confirmed) {
        toast.info('User update cancelled');
        return;
      }
      
      // Log the organization change for audit purposes
      console.log('🔄 ORGANIZATION CHANGE:', {
        user: selectedUser.name,
        email: selectedUser.email,
        oldOrg: oldOrgName,
        newOrg: newOrgName,
        oldOrgId: originalOrganizationId,
        newOrgId: editUser.organizationId,
        changedBy: user.email,
        timestamp: new Date().toISOString()
      });
      
      toast.success(`User organization changed from "${oldOrgName}" to "${newOrgName}"`);
    }

    try {
      // First, try to update with manager_id
      let updateData: any = {
        name: editUser.name,
        email: editUser.email,
        role: editUser.role,
        organization_id: editUser.organizationId,
        status: editUser.status,
        updated_at: new Date().toISOString(),
      };

      // Try to include manager_id - if it fails, we'll retry without it
      updateData.manager_id = editUser.managerId || null;

      let { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', selectedUser.id);

      // If we get a column not found error for manager_id, retry without it
      if (error && error.code === 'PGRST204' && error.message?.includes('manager_id')) {
        // Show migration helper
        setError('MANAGER_COLUMN_MISSING');
        
        // Retry the update without manager_id
        const { manager_id, ...updateDataWithoutManager } = updateData;
        const { error: retryError } = await supabase
          .from('profiles')
          .update(updateDataWithoutManager)
          .eq('id', selectedUser.id);

        if (retryError) {
          console.error('Failed to update user:', retryError);
          toast.error('Failed to update user: ' + retryError.message);
          return;
        }

        toast.warning('User updated, but manager assignment requires database migration. See instructions above.');
        await loadUsers();
        setIsEditDialogOpen(false);
        setSelectedUser(null);
        return;
      }

      if (error) {
        console.error('Failed to update user:', error);
        toast.error('Failed to update user: ' + error.message);
        return;
      }

      toast.success('User updated successfully!');

      // Reload users to show the updated user
      await loadUsers();

      // Close dialog
      setIsEditDialogOpen(false);
      setSelectedUser(null);
    } catch (error) {
      console.error('Failed to update user:', error);
      toast.error('Failed to update user. Please try again.');
    }
  };

  const handleResetPassword = async (orgUser: OrgUser) => {
    // Prevent admin from resetting super_admin passwords
    if (user.role === 'admin' && orgUser.role === 'super_admin') {
      toast.error('You do not have permission to reset Super Admin passwords');
      return;
    }
    
    console.log('🔄 Resetting password for user:', orgUser.email);
    setResetPasswordUser(orgUser);
    setIsResettingPassword(true);
    
    // Generate a secure temporary password
    const tempPassword = generateSecurePassword();
    console.log('═══════════════════════════════════════════════════════');
    console.log('🔐 GENERATED PASSWORD FOR:', orgUser.email);
    console.log('Password:', tempPassword);
    console.log('User:', orgUser.name);
    console.log('Email:', orgUser.email);
    console.log('═══════════════════════════════════════════════════════');
    setNewPassword(tempPassword);
    
    try {
      // Call the server endpoint to reset the password
      console.log('🔐 Calling server to reset password...');
      const serverUrl = `https://${projectId}.supabase.co/functions/v1/make-server-8405be07/reset-password`;
      
      const response = await fetch(serverUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({
          userEmail: orgUser.email,
          tempPassword: tempPassword
        })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        console.error('❌ Server returned error:', result);
        throw new Error(result.error || 'Failed to reset password');
      }

      console.log('✅ Password reset successfully!');
      console.log('✅ Server result:', JSON.stringify(result, null, 2));
      
      // Check if profile was updated
      if (!result.profileUpdated && result.warning) {
        console.warn('⚠️ WARNING:', result.warning);
        toast.warning('Password reset successful! Note: Run the database migration to enable password change prompts.', {
          duration: 8000,
        });
      } else if (result.profileUpdated) {
        console.log('✅ Profile flags updated - user will be prompted to change password on login');
      }
      
      // Try to send password reset email (optional - not critical)
      try {
        console.log('📧 Attempting to send password reset email...');
        await supabase.auth.resetPasswordForEmail(orgUser.email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        console.log('✅ Password reset email sent');
      } catch (emailError) {
        console.log('⚠️  Email not sent (non-critical):', emailError);
      }

      // Show the dialog with the generated password
      setIsResetPasswordDialogOpen(true);
      toast.success('✅ Temporary password set! User can now log in.');
    } catch (error: any) {
      console.error('❌ Exception during password reset:', error);
      console.error('Exception details:', JSON.stringify(error, null, 2));
      toast.error(error.message || 'Failed to set temporary password');
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleCopyPassword = async () => {
    if (!newPassword) {
      toast.error('No password to copy');
      return;
    }

    const success = await copyToClipboard(newPassword);
    
    if (success) {
      toast.success('Password copied to clipboard!');
    } else {
      toast.error('Could not copy automatically. Please select and copy the password manually.');
    }
  };

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case 'super_admin': return 'bg-purple-100 text-purple-700';
      case 'admin': return 'bg-blue-100 text-blue-700';
      case 'director': return 'bg-indigo-100 text-indigo-700';
      case 'manager': return 'bg-green-100 text-green-700';
      case 'marketing': return 'bg-amber-100 text-amber-700';
      case 'standard_user': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700';
      case 'invited': return 'bg-yellow-100 text-yellow-700';
      case 'inactive': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!canViewUsers) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl text-foreground">Users</h1>
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            You don't have permission to manage users. Only Admins, Directors, and Super Admins can access this section.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <PermissionGate user={user} module="users" action="view">
    <div className="p-6 space-y-6">
      <Tabs defaultValue="users" className="space-y-6">
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <TabsList className="inline-flex w-auto min-w-full md:grid md:w-full md:grid-cols-3">
            <TabsTrigger value="users" className="whitespace-nowrap px-3 sm:px-4 text-xs sm:text-sm">User Management</TabsTrigger>
            <TabsTrigger value="permissions" className="whitespace-nowrap px-3 sm:px-4 text-xs sm:text-sm">Role Permissions</TabsTrigger>
            <TabsTrigger value="recovery" className="whitespace-nowrap px-3 sm:px-4 text-xs sm:text-sm">User Recovery</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="users" className="space-y-6">
          {/* Invalid Organization ID Alert - Shows prominently if user has timestamp-based org ID */}
          {hasInvalidOrgId && !isLoadingUsers && (
            <InvalidOrgIdAlert 
              invalidOrgId={user.organizationId}
              correctOrgId="rona-atlantic"
            />
          )}

          {/* Loading State */}
          {isLoadingUsers && (
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="p-8">
                <div className="flex flex-col items-center justify-center space-y-4">
                  <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600"></div>
                  <div className="text-center">
                    <h3 className="text-lg font-semibold text-blue-900">Loading Users...</h3>
                    <p className="text-sm text-blue-700 mt-1">Please wait while we fetch your users from the database</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Error Display - For other errors */}
          {error && !error.includes('infinite recursion') && !isLoadingUsers && (
            <Alert className="border-red-400 bg-red-50">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <AlertDescription className="text-red-900">
                <strong>Error loading users:</strong>
                <pre className="mt-2 text-xs bg-red-100 p-2 rounded">{error}</pre>
                <Button 
                  onClick={loadUsers} 
                  variant="outline" 
                  size="sm" 
                  className="mt-3"
                >
                  Try Again
                </Button>
              </AlertDescription>
            </Alert>
          )}
          
          {/* Setup Guide - Shows only when there's a problem */}
          {showDebug && users.length > 0 && <ProfilesSyncFixer onRefresh={loadUsers} />}
          
          {/* Manager Migration Helper - Shows when manager_id column is missing */}
          {error === 'MANAGER_COLUMN_MISSING' && <ManagerMigrationHelper />}
          
          {/* Profiles Table Fix - Shows when foreign key constraint error occurs */}
          {showProfilesFix && <ProfilesTableFix />}
          
          {/* Organization Info Card */}
          <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
                  <Building2 className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Current Organization</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Organization Name</p>
                      <p className="font-medium text-gray-900">{user.organizationName || 'ProSpaces CRM'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Organization ID</p>
                      <p className="font-mono text-sm text-gray-900 bg-white px-2 py-1 rounded border border-gray-200 inline-block">
                        {user.organizationId}
                      </p>
                    </div>
                  </div>
                  {user.role === 'super_admin' && (
                    <div className="mt-3 flex items-center gap-2 text-sm text-purple-700 bg-purple-100 px-3 py-1.5 rounded-md inline-flex">
                      <Shield className="h-4 w-4" />
                      <span>You can view, edit, and delete users from ALL organizations</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-4">
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={loadUsers}
                disabled={isLoadingUsers}
                className="flex items-center gap-2"
              >
                <svg 
                  className={`h-4 w-4 ${isLoadingUsers ? 'animate-spin' : ''}`} 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </Button>
              {canManageUsers && (
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Invite User
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-white">
                  <DialogHeader>
                    <DialogTitle>Invite New User</DialogTitle>
                    <DialogDescription>
                      Add a new user to your organization by filling out the form below.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleAddUser} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        value={newUser.name}
                        onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={newUser.email}
                        onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                        required
                      />
                    </div>

                    {/* Organization selector - only for super admins */}
                    {user.role === 'super_admin' && (
                      <div className="space-y-2">
                        <Label htmlFor="organization">Organization *</Label>
                        <Select 
                          value={newUser.organizationId} 
                          onValueChange={(value) => setNewUser({ ...newUser, organizationId: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={isLoadingTenants ? "Loading..." : "Select organization"} />
                          </SelectTrigger>
                          <SelectContent>
                            {tenants.map((tenant) => (
                              <SelectItem key={tenant.id} value={tenant.id}>
                                <div className="flex items-center gap-2">
                                  {tenant.logo ? (
                                    <img 
                                      src={tenant.logo} 
                                      alt={tenant.name} 
                                      className="h-4 w-4 object-contain"
                                    />
                                  ) : (
                                    <Building2 className="h-4 w-4" />
                                  )}
                                  <span>{tenant.name}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-gray-500">
                          Select which organization this user will belong to
                        </p>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="role">Role</Label>
                      <Select value={newUser.role} onValueChange={(value: UserRole) => setNewUser({ ...newUser, role: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="standard_user">Standard User</SelectItem>
                          <SelectItem value="marketing">Marketing</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="director">Director</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                          {user.role === 'super_admin' && (
                            <SelectItem value="super_admin">Super Admin</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-gray-500 mt-1">
                        {newUser.role === 'standard_user' && 'Can manage only their own data'}
                        {newUser.role === 'marketing' && 'Full access to marketing and campaigns, limited access to contacts'}
                        {newUser.role === 'manager' && 'Can manage data of users they oversee'}
                        {newUser.role === 'director' && 'Same as Manager, plus full user visibility on Team Dashboard'}
                        {newUser.role === 'admin' && 'Full access within the organization'}
                        {newUser.role === 'super_admin' && 'Full access across all organizations'}
                      </p>
                    </div>
                    <div className="flex gap-2 pt-4">
                      <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)} className="flex-1">
                        Cancel
                      </Button>
                      <Button type="submit" className="flex-1">
                        <UserPlus className="h-4 w-4 mr-2" />
                        Send Invite
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
              )}
            </div>
          </div>

          <Card>
            <CardHeader>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search users by name, email, role, or status..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardHeader>
            <CardContent>
              {usingClientSide && users.length > 0 && (
                <Alert className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Local Mode:</strong> Currently showing users that you've invited in this session. Deploy the backend to see all organization users and sync across devices.
                  </AlertDescription>
                </Alert>
              )}
              <div className="overflow-x-auto">
                {isLoadingUsers ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center space-y-3">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="text-gray-600">Loading users...</p>
                    </div>
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                      <UserPlus className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg text-gray-900 mb-2">No users found</h3>
                    <p className="text-gray-600 mb-4">
                      {searchQuery ? 'Try adjusting your search query' : 'Get started by inviting your first team member'}
                    </p>
                    {!searchQuery && canManageUsers && (
                      <Button onClick={() => setIsAddDialogOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Invite User
                      </Button>
                    )}
                  </div>
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 text-sm text-gray-600">Actions</th>
                        <th className="text-left py-3 px-4 text-sm text-gray-600">User</th>
                        {(user.role === 'super_admin' || user.role === 'admin') && (
                          <th className="text-left py-3 px-4 text-sm text-gray-600">Organization</th>
                        )}
                        <th className="text-left py-3 px-4 text-sm text-gray-600">Role</th>
                        <th className="text-left py-3 px-4 text-sm text-gray-600">Status</th>
                        <th className="text-left py-3 px-4 text-sm text-gray-600">Last Login</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((orgUser) => (
                        <tr key={orgUser.id} className="border-b border-gray-100 hover:bg-gray-50">
                          {canManageUsers && (
                          <td className="py-3 px-4">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" disabled={orgUser.id === user.id}>
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="start">
                                <DropdownMenuItem onClick={() => handleEditUser(orgUser)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit User
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-red-600"
                                  onClick={() => handleDeleteUser(orgUser.id)}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Remove
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-blue-600"
                                  onClick={() => handleResetPassword(orgUser)}
                                >
                                  <Shield className="h-4 w-4 mr-2" />
                                  Reset Password
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                          )}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                                {orgUser.name.charAt(0)}
                              </div>
                              <div>
                                <p className="text-sm text-gray-900">{orgUser.name}</p>
                                <p className="text-xs text-gray-500">{orgUser.email}</p>
                              </div>
                            </div>
                          </td>
                          {(user.role === 'super_admin' || user.role === 'admin') && (
                            <td className="py-3 px-4">
                              <div className="flex flex-col">
                                <span className="text-sm text-gray-900">
                                  {getOrgName(orgUser.organizationId)}
                                </span>
                                <span className="text-xs text-gray-400 font-mono">
                                  ID: {orgUser.organizationId}
                                </span>
                              </div>
                            </td>
                          )}
                          <td className="py-3 px-4">
                            <span className={`inline-block px-2 py-1 text-xs rounded ${getRoleColor(orgUser.role)}`}>
                              {orgUser.role.replace('_', ' ').toUpperCase()}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-block px-2 py-1 text-xs rounded ${getStatusColor(orgUser.status)}`}>
                              {orgUser.status}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-sm text-gray-600">{formatDate(orgUser.lastLogin)}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Edit User Dialog */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="max-h-[90vh] overflow-hidden flex flex-col bg-white">
              <DialogHeader>
                <DialogTitle>Edit User</DialogTitle>
                <DialogDescription>
                  Update the user's details and permissions.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleUpdateUser} className="space-y-4 overflow-y-auto pr-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={editUser.name}
                    onChange={(e) => setEditUser({ ...editUser, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={editUser.email}
                    onChange={(e) => setEditUser({ ...editUser, email: e.target.value })}
                    required
                  />
                </div>

                {/* Organization selector - only for super admins */}
                {user.role === 'super_admin' && (
                  <div className="space-y-2">
                    <Label htmlFor="organization" className="flex items-center gap-2">
                      Organization *
                      {editUser.organizationId !== originalOrganizationId && (
                        <span className="text-xs text-orange-600 font-semibold bg-orange-100 px-2 py-0.5 rounded">
                          ⚠️ CHANGED
                        </span>
                      )}
                    </Label>
                    <Select 
                      value={editUser.organizationId} 
                      onValueChange={(value) => setEditUser({ ...editUser, organizationId: value })}
                    >
                      <SelectTrigger className={editUser.organizationId !== originalOrganizationId ? 'border-orange-500 border-2' : ''}>
                        <SelectValue placeholder={isLoadingTenants ? "Loading..." : "Select organization"} />
                      </SelectTrigger>
                      <SelectContent>
                        {tenants.map((tenant) => (
                          <SelectItem key={tenant.id} value={tenant.id}>
                            <div className="flex items-center gap-2">
                              {tenant.logo ? (
                                <img 
                                  src={tenant.logo} 
                                  alt={tenant.name} 
                                  className="h-4 w-4 object-contain"
                                />
                              ) : (
                                <Building2 className="h-4 w-4" />
                              )}
                              <span>{tenant.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {editUser.organizationId !== originalOrganizationId ? (
                      <Alert className="border-orange-500 bg-orange-50">
                        <AlertCircle className="h-4 w-4 text-orange-600" />
                        <AlertDescription className="text-orange-900 text-xs">
                          <strong>⚠️ Warning:</strong> Changing organization will affect this user's access to data. You will be asked to confirm before saving.
                        </AlertDescription>
                      </Alert>
                    ) : (
                      <p className="text-xs text-gray-500">
                        Select which organization this user will belong to
                      </p>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select value={editUser.role} onValueChange={(value: UserRole) => setEditUser({ ...editUser, role: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard_user">Standard User</SelectItem>
                      <SelectItem value="marketing">Marketing</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="director">Director</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      {user.role === 'super_admin' && (
                        <SelectItem value="super_admin">Super Admin</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 mt-1">
                    {editUser.role === 'standard_user' && 'Can manage only their own data'}
                    {editUser.role === 'marketing' && 'Full access to marketing and campaigns, limited access to contacts'}
                    {editUser.role === 'manager' && 'Can manage data of users they oversee'}
                    {editUser.role === 'director' && 'Same as Manager, plus full user visibility on Team Dashboard'}
                    {editUser.role === 'admin' && 'Full access within the organization'}
                    {editUser.role === 'super_admin' && 'Full access across all organizations'}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={editUser.status} onValueChange={(value: 'active' | 'invited' | 'inactive') => setEditUser({ ...editUser, status: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="invited">Invited</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 mt-1">
                    {editUser.status === 'active' && 'User has full access to the system'}
                    {editUser.status === 'invited' && 'User has been invited but not yet accepted'}
                    {editUser.status === 'inactive' && 'User account is temporarily disabled'}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="manager">Manager (Optional)</Label>
                  <Select value={editUser.managerId || 'none'} onValueChange={(value) => setEditUser({ ...editUser, managerId: value === 'none' ? '' : value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a manager" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Manager</SelectItem>
                      {managers.map((manager) => (
                        <SelectItem key={manager.id} value={manager.id}>
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-xs">
                              {manager.name.charAt(0)}
                            </div>
                            <span>{manager.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 mt-1">
                    {managers.length === 0 
                      ? 'No active managers available. Assign a Manager role to a user first.' 
                      : 'Assign a manager who will oversee this user'}
                  </p>
                </div>
                <div className="flex gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)} className="flex-1">
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Update User
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          {/* Reset Password Dialog */}
          <Dialog open={isResetPasswordDialogOpen} onOpenChange={setIsResetPasswordDialogOpen}>
            <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-hidden flex flex-col bg-white">
              <DialogHeader>
                <DialogTitle>🔐 Password Generated</DialogTitle>
                <DialogDescription>
                  Temporary password for {resetPasswordUser?.name} ({resetPasswordUser?.email})
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 overflow-y-auto pr-2">
                {/* Generated Password - Large and Prominent */}
                <div className="space-y-2">
                  <Label>Generated Temporary Password</Label>
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-300 rounded-lg p-6">
                    <div className="flex items-center justify-between gap-3">
                      <code className="text-3xl font-mono font-bold text-blue-900 select-all break-all flex-1">
                        {newPassword}
                      </code>
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleCopyPassword}
                        className="flex-shrink-0"
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copy
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-red-600 font-semibold">
                    ⚠️ This password is shown only once. Copy it before closing this dialog!
                  </p>
                </div>

                {/* Success Notice */}
                <Alert className="bg-green-50 border-green-300 border-2">
                  <AlertCircle className="h-5 w-5 text-green-600" />
                  <AlertDescription className="text-green-900">
                    <strong className="text-base">✅ Password is Active!</strong>
                    <p className="mt-2 text-sm">The user can now <strong>login immediately</strong> with the temporary password shown above. They will be prompted to change it on first login.</p>
                  </AlertDescription>
                </Alert>

                {/* Instructions */}
                <div className="space-y-3">
                  <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4">
                    <h5 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                      <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">1</span>
                      📋 Share the Password
                    </h5>
                    <div className="text-sm text-blue-900 space-y-2 ml-8">
                      <p>Send this temporary password to <strong>{resetPasswordUser?.email}</strong>:</p>
                      <div className="bg-white border border-blue-300 rounded p-3">
                        <p className="font-mono text-lg font-bold text-blue-900">{newPassword}</p>
                      </div>
                      <p className="text-xs text-blue-700 mt-2">⚠️ They will be required to change this password on first login.</p>
                    </div>
                  </div>

                  {/* Method 2: Supabase Dashboard UI */}
                  <details className="bg-blue-50 border-2 border-blue-300 rounded-lg">
                    <summary className="p-4 cursor-pointer font-semibold text-blue-900 flex items-center gap-2">
                      <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">2</span>
                      🔧 Alternative: Supabase Dashboard UI (Click to expand)
                    </summary>
                    <div className="px-4 pb-4 text-sm text-blue-900 space-y-2 mt-2">
                      <ol className="list-decimal list-inside space-y-1 ml-4">
                        <li>Go to Supabase Dashboard → Authentication → Users</li>
                        <li>Find: <code className="bg-blue-100 px-2 py-0.5 rounded font-mono text-xs">{resetPasswordUser?.email}</code></li>
                        <li>Click "..." menu → "Update User"</li>
                        <li>Check "Auto Confirm User" and enter password: <code className="bg-blue-100 px-2 py-0.5 rounded font-mono text-xs">{newPassword}</code></li>
                        <li>Click "Save"</li>
                      </ol>
                    </div>
                  </details>

                  {/* Method 3: Email (when available) */}
                  <details className="bg-gray-100 border-2 border-gray-300 rounded-lg opacity-70">
                    <summary className="p-4 cursor-pointer font-semibold text-gray-600 flex items-center gap-2">
                      <span className="bg-gray-400 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">3</span>
                      📧 Email Method (Not Available - Email Not Configured)
                    </summary>
                    <div className="px-4 pb-4 text-sm text-gray-600 space-y-2 mt-2">
                      <p className="font-medium">Once email is configured in Supabase, you can:</p>
                      <ol className="list-decimal list-inside space-y-1 ml-4">
                        <li>Click "Reset Password" button</li>
                        <li>User receives email with reset link</li>
                        <li>User clicks link and enters the password you provide</li>
                        <li>Password is automatically set</li>
                      </ol>
                      <p className="text-xs mt-2 italic bg-gray-200 p-2 rounded">
                        💡 To enable: Configure SMTP in Supabase Dashboard → Settings → Auth → Email Templates
                      </p>
                    </div>
                  </details>
                </div>

                {/* User Information */}
                <div className="bg-gray-100 border border-gray-300 rounded-lg p-3">
                  <h5 className="font-semibold text-gray-900 mb-2 text-sm">👤 User Information</h5>
                  <div className="text-sm text-gray-700 space-y-1">
                    <div><strong>Name:</strong> {resetPasswordUser?.name}</div>
                    <div><strong>Email:</strong> {resetPasswordUser?.email}</div>
                    <div><strong>Role:</strong> {resetPasswordUser?.role}</div>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t mt-4">
                <Button 
                  type="button"
                  variant="outline"
                  onClick={handleCopyPassword}
                  className="flex-1"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Password
                </Button>
                <Button 
                  type="button" 
                  onClick={() => {
                    setIsResetPasswordDialogOpen(false);
                    setResetPasswordUser(null);
                    setNewPassword('');
                  }} 
                  className="flex-1"
                >
                  Done
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Invite Credentials Dialog - shown after creating a new user account */}
          <Dialog open={isInviteCredentialsDialogOpen} onOpenChange={setIsInviteCredentialsDialogOpen}>
            <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-hidden flex flex-col bg-white">
              <DialogHeader>
                <DialogTitle>Account Created Successfully</DialogTitle>
                <DialogDescription>
                  A new account has been created for {inviteCredentials?.name}. Share the login credentials below.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 overflow-y-auto pr-2">
                {/* Credentials Card */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-lg p-5 space-y-3">
                  <div>
                    <Label className="text-xs text-green-700 uppercase tracking-wide">Email</Label>
                    <p className="font-mono text-lg font-semibold text-green-900 select-all">{inviteCredentials?.email}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-green-700 uppercase tracking-wide">Temporary Password</Label>
                    <div className="flex items-center justify-between gap-3 mt-1">
                      <code className="text-2xl font-mono font-bold text-green-900 select-all break-all flex-1">
                        {inviteCredentials?.tempPassword}
                      </code>
                      <Button
                        type="button"
                        size="sm"
                        onClick={async () => {
                          if (inviteCredentials?.tempPassword) {
                            const success = await copyToClipboard(inviteCredentials.tempPassword);
                            if (success) toast.success('Password copied!');
                            else toast.error('Copy failed. Please select and copy manually.');
                          }
                        }}
                        className="flex-shrink-0"
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copy
                      </Button>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-red-600 font-semibold">
                  This password is shown only once. Copy it before closing this dialog!
                </p>

                <Alert className="bg-blue-50 border-blue-300 border-2">
                  <AlertCircle className="h-5 w-5 text-blue-600" />
                  <AlertDescription className="text-blue-900">
                    <strong>Next Steps:</strong>
                    <ol className="list-decimal list-inside mt-2 space-y-1 text-sm">
                      <li>Share the email and temporary password with <strong>{inviteCredentials?.name}</strong></li>
                      <li>They can sign in immediately at the login page</li>
                      <li>They will be prompted to change their password on first login</li>
                    </ol>
                  </AlertDescription>
                </Alert>
              </div>

              <div className="flex gap-2 pt-4 border-t mt-4">
                <Button 
                  type="button"
                  variant="outline"
                  onClick={async () => {
                    if (inviteCredentials) {
                      const text = `Login Credentials for ${inviteCredentials.name}:\nEmail: ${inviteCredentials.email}\nTemporary Password: ${inviteCredentials.tempPassword}\n\nPlease sign in and change your password immediately.`;
                      const success = await copyToClipboard(text);
                      if (success) toast.success('Full credentials copied!');
                      else toast.error('Copy failed. Please copy manually.');
                    }
                  }}
                  className="flex-1"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy All
                </Button>
                <Button 
                  type="button" 
                  onClick={() => {
                    setIsInviteCredentialsDialogOpen(false);
                    setInviteCredentials(null);
                  }} 
                  className="flex-1"
                >
                  Done
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="permissions" className="space-y-6">
          <PermissionsManager userRole={user.role} />
        </TabsContent>

        <TabsContent value="recovery" className="space-y-6">
          <FixInvalidOrgIds />
          <FindMissingUser />
          <UserRecovery 
            currentUserId={user.id} 
            currentOrganizationId={user.organizationId}
            currentUserRole={user.role}
          />
        </TabsContent>
      </Tabs>
    </div>
    </PermissionGate>
  );
}

// Function to generate a secure temporary password
function generateSecurePassword(length: number = 12): string {
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+[]{}|;:,.<>?";
  let password = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    password += charset[randomIndex];
  }
  return password;
}