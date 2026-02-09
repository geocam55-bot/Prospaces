import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Alert, AlertDescription } from './ui/alert';
import {
  Shield,
  Lock,
  Search,
  Save,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  History,
  Copy,
  Filter
} from 'lucide-react';
import { Checkbox } from './ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import type { User, UserRole } from '../App';
import { useDebounce } from '../utils/useDebounce';

interface SecurityProps {
  user: User;
}

interface ModulePermission {
  module: string;
  role: UserRole;
  visible: boolean;
  add: boolean;
  change: boolean;
  delete: boolean;
}

interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  module: string;
  role: UserRole;
  changes: string;
}

export function Security({ user }: SecurityProps) {
  const [permissions, setPermissions] = useState<ModulePermission[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300); // 🚀 Debounce search for better performance
  const [selectedModule, setSelectedModule] = useState<string>('all');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Check if user has access to this page
  const canAccessSecurity = user.role === 'super_admin' || user.role === 'admin';

  const modules = [
    { id: 'dashboard', name: 'Dashboard', icon: '📊' },
    { id: 'ai-suggestions', name: 'AI Suggestions', icon: '🤖' },
    { id: 'team-dashboard', name: 'Team Dashboard', icon: '👥' },
    { id: 'contacts', name: 'Contacts', icon: '👥' },
    { id: 'tasks', name: 'Tasks', icon: '✓' },
    { id: 'appointments', name: 'Appointments', icon: '📅' },
    { id: 'opportunities', name: 'Opportunities', icon: '🎯' },
    { id: 'bids', name: 'Deals', icon: '📄' },
    { id: 'notes', name: 'Notes', icon: '📝' },
    { id: 'documents', name: 'Documents', icon: '📁' },
    { id: 'email', name: 'Email', icon: '✉️' },
    { id: 'marketing', name: 'Marketing', icon: '📈' },
    { id: 'inventory', name: 'Inventory', icon: '📦' },
    { id: 'project-wizards', name: 'Project Wizards', icon: '🪄' },
    { id: 'reports', name: 'Reports', icon: '📊' },
    { id: 'users', name: 'Users', icon: '👤' },
    { id: 'settings', name: 'Settings', icon: '⚙️' },
    { id: 'tenants', name: 'Tenants', icon: '🏢' },
    { id: 'security', name: 'Security', icon: '🔒' },
    { id: 'import-export', name: 'Import/Export', icon: '🔄' },
  ];

  const allRoles: UserRole[] = ['super_admin', 'admin', 'manager', 'marketing', 'standard_user'];
  
  // Filter roles - Admin should not see or manage super_admin permissions
  const roles = allRoles.filter(role => 
    user.role === 'super_admin' || role !== 'super_admin'
  );

  const roleLabels = {
    super_admin: 'Super Admin',
    admin: 'Admin',
    manager: 'Manager',
    marketing: 'Marketing',
    standard_user: 'Standard User',
  };

  useEffect(() => {
    if (canAccessSecurity) {
      loadPermissions();
      loadAuditLogs();
    }
  }, [canAccessSecurity]);

  const loadPermissions = async () => {
    try {
      // Load permissions from localStorage instead of API
      const orgId = localStorage.getItem('currentOrgId') || 'org_001';
      const storedPerms = localStorage.getItem(`permissions_${orgId}`);
      
      if (storedPerms) {
        const permsArray = JSON.parse(storedPerms);
        
        // 🔄 Migration: Check if ai-suggestions module exists in stored permissions
        const hasAISuggestions = permsArray.some((p: ModulePermission) => p.module === 'ai-suggestions');
        
        if (!hasAISuggestions) {
          // Add ai-suggestions permissions for all roles
          console.log('📦 Migrating permissions: Adding AI Suggestions module');
          roles.forEach(role => {
            if (role === 'super_admin') {
              permsArray.push({
                module: 'ai-suggestions',
                role,
                visible: true,
                add: true,
                change: true,
                delete: true,
              });
            } else if (role === 'admin') {
              permsArray.push({
                module: 'ai-suggestions',
                role,
                visible: true,
                add: true,
                change: true,
                delete: true,
              });
            } else if (role === 'manager') {
              permsArray.push({
                module: 'ai-suggestions',
                role,
                visible: true,
                add: true,
                change: true,
                delete: false,
              });
            } else if (role === 'marketing') {
              permsArray.push({
                module: 'ai-suggestions',
                role,
                visible: true,
                add: false,
                change: false,
                delete: false,
              });
            } else {
              // standard_user
              permsArray.push({
                module: 'ai-suggestions',
                role,
                visible: false,
                add: false,
                change: false,
                delete: false,
              });
            }
          });
          
          // Save the migrated permissions back to localStorage
          localStorage.setItem(`permissions_${orgId}`, JSON.stringify(permsArray));
          console.log('✅ AI Suggestions permissions added and saved');
        }
        
        setPermissions(permsArray);
      } else {
        // Initialize with default permissions if none exist
        initializeDefaultPermissions();
      }
    } catch (error) {
      console.error('Failed to load permissions:', error);
      // Initialize with default permissions if loading fails
      initializeDefaultPermissions();
    }
  };

  const loadAuditLogs = async () => {
    try {
      // Load audit logs from localStorage instead of API
      const orgId = localStorage.getItem('currentOrgId') || 'org_001';
      const storedLogs = localStorage.getItem(`audit_logs_${orgId}`);
      
      if (storedLogs) {
        const logsArray = JSON.parse(storedLogs);
        setAuditLogs(logsArray);
      } else {
        setAuditLogs([]);
      }
    } catch (error) {
      console.error('Failed to load audit logs:', error);
      setAuditLogs([]);
    }
  };

  const initializeDefaultPermissions = () => {
    const defaultPerms: ModulePermission[] = [];
    modules.forEach(module => {
      roles.forEach(role => {
        if (role === 'super_admin') {
          // Super Admin has full access to everything
          defaultPerms.push({
            module: module.id,
            role,
            visible: true,
            add: true,
            change: true,
            delete: true,
          });
        } else if (role === 'admin') {
          // Admin has full access except deleting users
          defaultPerms.push({
            module: module.id,
            role,
            visible: true,
            add: true,
            change: true,
            delete: module.id === 'users' ? false : true,
          });
        } else if (role === 'manager') {
          // Manager has access to most modules but limited on users/settings
          // Marketing: Full access (view, add, change campaigns/leads/analytics)
          defaultPerms.push({
            module: module.id,
            role,
            visible: true,
            add: module.id === 'settings' || module.id === 'users' ? false : true,
            change: module.id === 'settings' || module.id === 'users' ? false : true,
            delete: module.id === 'marketing' ? true : false, // Managers can delete campaigns
          });
        } else if (role === 'marketing') {
          // Marketing Role: Full access to Marketing module + limited access to contacts/email
          // Perfect for marketing team members who manage campaigns, leads, and email marketing
          defaultPerms.push({
            module: module.id,
            role,
            visible: module.id !== 'users' && module.id !== 'settings' && module.id !== 'bids',
            add: module.id === 'marketing' || module.id === 'contacts' || module.id === 'email',
            change: module.id === 'marketing' || module.id === 'contacts' || module.id === 'email',
            delete: module.id === 'marketing', // Can delete campaigns/leads only
          });
        } else {
          // Standard User has limited access
          // Marketing: View only (can see campaigns/analytics but cannot modify)
          const isPersonalModule = module.id === 'contacts' || module.id === 'tasks' || module.id === 'notes';
          const canViewOnly = module.id === 'dashboard' || module.id === 'marketing' || module.id === 'email';
          
          defaultPerms.push({
            module: module.id,
            role,
            visible: module.id !== 'users' && module.id !== 'settings',
            add: isPersonalModule,
            change: isPersonalModule,
            delete: false,
          });
        }
      });
    });
    setPermissions(defaultPerms);
  };

  const getPermission = (module: string, role: UserRole, type: 'visible' | 'add' | 'change' | 'delete'): boolean => {
    const perm = permissions.find(p => p.module === module && p.role === role);
    return perm ? perm[type] : false;
  };

  const updatePermission = (module: string, role: UserRole, type: 'visible' | 'add' | 'change' | 'delete', value: boolean) => {
    setPermissions(prev => {
      const updated = [...prev];
      const index = updated.findIndex(p => p.module === module && p.role === role);
      
      if (index >= 0) {
        updated[index] = { ...updated[index], [type]: value };
        
        // If visible is unchecked, uncheck all other permissions
        if (type === 'visible' && !value) {
          updated[index].add = false;
          updated[index].change = false;
          updated[index].delete = false;
        }
        
        // If any permission is checked, ensure visible is checked
        if ((type === 'add' || type === 'change' || type === 'delete') && value) {
          updated[index].visible = true;
        }
      } else {
        updated.push({
          module,
          role,
          visible: type === 'visible' ? value : false,
          add: type === 'add' ? value : false,
          change: type === 'change' ? value : false,
          delete: type === 'delete' ? value : false,
        });
      }
      
      return updated;
    });
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage(null);
    
    try {
      // Save permissions to localStorage
      const orgId = localStorage.getItem('currentOrgId') || 'org_001';
      localStorage.setItem(`permissions_${orgId}`, JSON.stringify(permissions));
      
      // Create audit log entry
      const logEntry: AuditLog = {
        id: Date.now().toString(),
        timestamp: new Date().toLocaleString(),
        user: user.full_name || user.email || 'User',
        action: 'Updated permissions',
        module: 'all',
        role: 'admin',
        changes: `${permissions.length} permissions updated`,
      };
      
      // Save audit log
      const storedLogs = localStorage.getItem(`audit_logs_${orgId}`);
      const logs = storedLogs ? JSON.parse(storedLogs) : [];
      logs.unshift(logEntry); // Add to beginning
      localStorage.setItem(`audit_logs_${orgId}`, JSON.stringify(logs.slice(0, 50))); // Keep last 50 logs
      
      setSaveMessage({ type: 'success', text: 'Permissions saved successfully!' });
      setHasChanges(false);
      await loadAuditLogs();
      
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      console.error('Failed to save permissions:', error);
      setSaveMessage({ type: 'error', text: 'Failed to save permissions. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    loadPermissions();
    setHasChanges(false);
    setSaveMessage(null);
  };

  const handleBulkUpdate = (role: UserRole, type: 'visible' | 'add' | 'change' | 'delete', value: boolean) => {
    const modulesToUpdate = selectedModule === 'all' 
      ? modules.map(m => m.id)
      : [selectedModule];
    
    modulesToUpdate.forEach(module => {
      updatePermission(module, role, type, value);
    });
  };

  const copyPermissions = (fromRole: UserRole, toRole: UserRole) => {
    modules.forEach(module => {
      const sourcePerms = permissions.find(p => p.module === module.id && p.role === fromRole);
      if (sourcePerms) {
        updatePermission(module.id, toRole, 'visible', sourcePerms.visible);
        updatePermission(module.id, toRole, 'add', sourcePerms.add);
        updatePermission(module.id, toRole, 'change', sourcePerms.change);
        updatePermission(module.id, toRole, 'delete', sourcePerms.delete);
      }
    });
  };

  const filteredModules = modules.filter(module => {
    const query = debouncedSearchQuery.toLowerCase().trim();
    if (!query) return true;
    
    // 🔍 Enhanced search: search module name
    return module.name.toLowerCase().includes(query);
  });

  if (!canAccessSecurity) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You don't have permission to access Security Settings. Only Super Admins and Admins can manage permissions.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center justify-end gap-2">
          {hasChanges && (
            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
              Unsaved Changes
            </Badge>
          )}
          <Button variant="outline" onClick={handleReset} disabled={!hasChanges || isSaving}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <Button onClick={handleSave} disabled={!hasChanges || isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {saveMessage && (
        <Alert variant={saveMessage.type === 'success' ? 'default' : 'destructive'}>
          {saveMessage.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <AlertDescription>{saveMessage.text}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="permissions">
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <TabsList className="inline-flex w-auto min-w-full">
            <TabsTrigger value="permissions" className="whitespace-nowrap">Permissions Matrix</TabsTrigger>
            <TabsTrigger value="bulk" className="whitespace-nowrap">Bulk Operations</TabsTrigger>
            <TabsTrigger value="audit" className="whitespace-nowrap">Audit Logs</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="permissions" className="space-y-6 mt-6">
          {/* Search and Filter */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search modules..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={selectedModule} onValueChange={setSelectedModule}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Filter by module" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Modules</SelectItem>
                    {modules.map(module => (
                      <SelectItem key={module.id} value={module.id}>
                        {module.icon} {module.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Permissions Matrix */}
          <div className="space-y-4">
            {filteredModules.map(module => (
              <Card key={module.id}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <span className="text-2xl">{module.icon}</span>
                    <span className="text-gray-900">{module.name}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-3">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 w-40">Role</th>
                          <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700 w-24">
                            <div className="flex flex-col items-center gap-1">
                              <Lock className="h-4 w-4" />
                              <span>Visible</span>
                            </div>
                          </th>
                          <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700 w-24">
                            <div className="flex flex-col items-center gap-1">
                              <span>➕</span>
                              <span>Add</span>
                            </div>
                          </th>
                          <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700 w-24">
                            <div className="flex flex-col items-center gap-1">
                              <span>✏️</span>
                              <span>Change</span>
                            </div>
                          </th>
                          <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700 w-24">
                            <div className="flex flex-col items-center gap-1">
                              <span>🗑️</span>
                              <span>Delete</span>
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {roles.map(role => (
                          <tr key={role} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className={
                                  role === 'super_admin' ? 'bg-red-50 text-red-700 border-red-200' :
                                  role === 'admin' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                  role === 'manager' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                  role === 'marketing' ? 'bg-green-50 text-green-700 border-green-200' :
                                  'bg-gray-50 text-gray-700 border-gray-200'
                                }>
                                  {roleLabels[role]}
                                </Badge>
                                {role === 'super_admin' && (
                                  <Badge variant="outline" className="text-xs bg-gray-100 text-gray-600">
                                    Protected
                                  </Badge>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <Checkbox
                                checked={getPermission(module.id, role, 'visible')}
                                onCheckedChange={(checked) => 
                                  updatePermission(module.id, role, 'visible', checked as boolean)
                                }
                                disabled={role === 'super_admin'}
                                title={role === 'super_admin' ? 'Super Admin permissions cannot be modified' : ''}
                              />
                            </td>
                            <td className="py-3 px-4 text-center">
                              <Checkbox
                                checked={getPermission(module.id, role, 'add')}
                                onCheckedChange={(checked) => 
                                  updatePermission(module.id, role, 'add', checked as boolean)
                                }
                                disabled={role === 'super_admin' || !getPermission(module.id, role, 'visible')}
                                title={role === 'super_admin' ? 'Super Admin permissions cannot be modified' : ''}
                              />
                            </td>
                            <td className="py-3 px-4 text-center">
                              <Checkbox
                                checked={getPermission(module.id, role, 'change')}
                                onCheckedChange={(checked) => 
                                  updatePermission(module.id, role, 'change', checked as boolean)
                                }
                                disabled={role === 'super_admin' || !getPermission(module.id, role, 'visible')}
                                title={role === 'super_admin' ? 'Super Admin permissions cannot be modified' : ''}
                              />
                            </td>
                            <td className="py-3 px-4 text-center">
                              <Checkbox
                                checked={getPermission(module.id, role, 'delete')}
                                onCheckedChange={(checked) => 
                                  updatePermission(module.id, role, 'delete', checked as boolean)
                                }
                                disabled={role === 'super_admin' || !getPermission(module.id, role, 'visible')}
                                title={role === 'super_admin' ? 'Super Admin permissions cannot be modified' : ''}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="bulk" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Bulk Permission Updates</CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Quickly apply permissions across multiple modules or copy permissions between roles
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Bulk Update by Role */}
              <div className="space-y-4">
                <h3 className="text-sm text-gray-900">Update Permissions for All Modules</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {roles.filter(r => r !== 'super_admin').map(role => (
                    <Card key={role} className="bg-gray-50">
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between mb-4">
                          <Badge className={
                            role === 'admin' ? 'bg-blue-100 text-blue-700' :
                            role === 'manager' ? 'bg-purple-100 text-purple-700' :
                            role === 'marketing' ? 'bg-green-100 text-green-700' :
                            'bg-gray-100 text-gray-700'
                          }>
                            {roleLabels[role]}
                          </Badge>
                        </div>
                        <div className="space-y-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full justify-start"
                            onClick={() => handleBulkUpdate(role, 'visible', true)}
                          >
                            Enable Visible for All
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full justify-start"
                            onClick={() => handleBulkUpdate(role, 'add', true)}
                          >
                            Enable Add for All
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full justify-start"
                            onClick={() => handleBulkUpdate(role, 'change', true)}
                          >
                            Enable Change for All
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full justify-start text-red-600 hover:text-red-700"
                            onClick={() => {
                              handleBulkUpdate(role, 'add', false);
                              handleBulkUpdate(role, 'change', false);
                              handleBulkUpdate(role, 'delete', false);
                            }}
                          >
                            Revoke All Permissions
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Copy Permissions */}
              <div className="space-y-4">
                <h3 className="text-sm text-gray-900">Copy Permissions Between Roles</h3>
                <Card className="bg-blue-50">
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm text-gray-700">Copy From</label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent>
                            {roles.map(role => (
                              <SelectItem key={role} value={role}>
                                {roleLabels[role]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm text-gray-700">Copy To</label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent>
                            {roles.map(role => (
                              <SelectItem key={role} value={role}>
                                {roleLabels[role]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <Button className="w-full mt-4" variant="outline">
                      <Copy className="h-4 w-4 mr-2" />
                      Copy Permissions
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-gray-600" />
                <CardTitle>Audit Logs</CardTitle>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                Track all changes to security permissions
              </p>
            </CardHeader>
            <CardContent>
              {auditLogs.length > 0 ? (
                <div className="space-y-3">
                  {auditLogs.map(log => (
                    <div key={log.id} className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm text-gray-900">{log.action}</p>
                          <p className="text-xs text-gray-600 mt-1">
                            Module: <span className="font-medium">{log.module}</span> • 
                            Role: <span className="font-medium">{roleLabels[log.role]}</span>
                          </p>
                          <p className="text-xs text-gray-500 mt-1">{log.changes}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500">{log.user}</p>
                          <p className="text-xs text-gray-400">{log.timestamp}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <History className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No audit logs yet</p>
                  <p className="text-sm mt-1">Changes to permissions will appear here</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}