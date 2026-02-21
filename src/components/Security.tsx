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
import { PermissionGate } from './PermissionGate';
import { canView } from '../utils/permissions';
import { useDebounce } from '../utils/useDebounce';
import { ALL_MODULES, ALL_ROLES, getDefaultPermission, refreshPermissionsFromStorage } from '../utils/permissions';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { createClient } from '../utils/supabase/client';
import { getServerHeaders } from '../utils/server-headers';

const SERVER_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-8405be07`;

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
  const [isLoading, setIsLoading] = useState(false);

  // Check if user has access to this page
  const canAccessSecurity = canView('security', user.role);

  const modules = [
    { id: 'dashboard', name: 'Dashboard', icon: '📊' },
    { id: 'ai-suggestions', name: 'AI Suggestions', icon: '🤖' },
    { id: 'team-dashboard', name: 'Team Dashboard', icon: '👥' },
    { id: 'contacts', name: 'Contacts', icon: '👥' },
    { id: 'tasks', name: 'Tasks', icon: '✓' },
    { id: 'appointments', name: 'Appointments', icon: '📅' },
    { id: 'opportunities', name: 'Opportunities', icon: '🎯' },
    { id: 'bids', name: 'Deals', icon: '📄' },
    { id: 'quotes', name: 'Quotes', icon: '💰' },
    { id: 'notes', name: 'Notes', icon: '📝' },
    { id: 'documents', name: 'Documents', icon: '📁' },
    { id: 'email', name: 'Email', icon: '✉️' },
    { id: 'marketing', name: 'Marketing', icon: '📈' },
    { id: 'inventory', name: 'Inventory', icon: '📦' },
    { id: 'project-wizards', name: 'Project Wizards', icon: '🪄' },
    { id: 'kitchen-planner', name: 'Kitchen Planner', icon: '🍳' },
    { id: 'reports', name: 'Reports', icon: '📊' },
    { id: 'admin', name: 'Admin Menu', icon: '🛠️' },
    { id: 'users', name: 'Users', icon: '👤' },
    { id: 'settings', name: 'Settings', icon: '⚙️' },
    { id: 'tenants', name: 'Tenants', icon: '🏢' },
    { id: 'security', name: 'Security', icon: '🔒' },
    { id: 'import-export', name: 'Import/Export', icon: '🔄' },
  ];

  const allRoles: UserRole[] = ALL_ROLES;
  
  // Filter roles - Admin should not see or manage super_admin permissions
  const roles = allRoles.filter(role => 
    user.role === 'super_admin' || role !== 'super_admin'
  );

  const roleLabels = {
    super_admin: 'Super Admin',
    admin: 'Admin',
    director: 'Director',
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

  /**
   * Helper: get the access token for authenticated server calls.
   * Tries Supabase session first, falls back to publicAnonKey.
   */
  const getAuthToken = async (): Promise<string> => {
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) return session.access_token;
    } catch (e) {
      console.warn('[Security] Failed to get session, using anon key:', e);
    }
    return publicAnonKey;
  };

  const loadPermissions = async () => {
    setIsLoading(true);
    const orgId = localStorage.getItem('currentOrgId') || user.organizationId || user.organization_id || 'org_001';

    try {
      // Try server first (KV store)
      const headers = await getServerHeaders();
      const res = await Promise.race([
        fetch(`${SERVER_BASE}/permissions?organization_id=${encodeURIComponent(orgId)}`, {
          headers,
        }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 8000)),
      ]);

      if (res.ok) {
        const json = await res.json();
        if (json.permissions && Array.isArray(json.permissions) && json.permissions.length > 0) {
          console.log(`[Security] Loaded ${json.permissions.length} permissions from server (KV store)`);

          // Sync server data back to localStorage for offline/fast use
          localStorage.setItem(`permissions_${orgId}`, JSON.stringify(json.permissions));
          setPermissions(json.permissions);
          setIsLoading(false);
          return;
        } else {
          console.log('[Security] Server returned no permissions, checking localStorage');
        }
      } else {
        const errText = await res.text().catch(() => '');
        console.warn(`[Security] Server returned ${res.status}: ${errText}`);
      }
    } catch (err) {
      console.warn('[Security] Failed to load permissions from server, falling back to localStorage:', err);
    }

    // Fallback: load from localStorage
    try {
      const storedPerms = localStorage.getItem(`permissions_${orgId}`);

      if (storedPerms) {
        const permsArray = JSON.parse(storedPerms);

        // Migration: Check if ai-suggestions module exists in stored permissions
        const hasAISuggestions = permsArray.some((p: ModulePermission) => p.module === 'ai-suggestions');

        if (!hasAISuggestions) {
          console.log('[Security] Migrating permissions: Adding AI Suggestions module');
          roles.forEach(role => {
            if (role === 'super_admin' || role === 'admin') {
              permsArray.push({ module: 'ai-suggestions', role, visible: true, add: true, change: true, delete: true });
            } else if (role === 'manager' || role === 'director') {
              permsArray.push({ module: 'ai-suggestions', role, visible: true, add: true, change: true, delete: false });
            } else if (role === 'marketing') {
              permsArray.push({ module: 'ai-suggestions', role, visible: true, add: false, change: false, delete: false });
            } else {
              permsArray.push({ module: 'ai-suggestions', role, visible: false, add: false, change: false, delete: false });
            }
          });
          localStorage.setItem(`permissions_${orgId}`, JSON.stringify(permsArray));
          console.log('[Security] AI Suggestions permissions added and saved');
        }

        setPermissions(permsArray);
      } else {
        initializeDefaultPermissions();
      }
    } catch (error) {
      console.error('[Security] Failed to load permissions from localStorage:', error);
      initializeDefaultPermissions();
    }

    setIsLoading(false);
  };

  const loadAuditLogs = async () => {
    const orgId = localStorage.getItem('currentOrgId') || user.organizationId || user.organization_id || 'org_001';

    try {
      // Try server first
      const headers = await getServerHeaders();
      const res = await Promise.race([
        fetch(`${SERVER_BASE}/permissions/audit-logs?organization_id=${encodeURIComponent(orgId)}`, {
          headers,
        }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 8000)),
      ]);

      if (res.ok) {
        const json = await res.json();
        if (json.logs && Array.isArray(json.logs)) {
          console.log(`[Security] Loaded ${json.logs.length} audit logs from server`);
          // Sync to localStorage
          localStorage.setItem(`audit_logs_${orgId}`, JSON.stringify(json.logs));
          setAuditLogs(json.logs);
          return;
        }
      }
    } catch (err) {
      console.warn('[Security] Failed to load audit logs from server:', err);
    }

    // Fallback: load from localStorage
    try {
      const storedLogs = localStorage.getItem(`audit_logs_${orgId}`);
      if (storedLogs) {
        setAuditLogs(JSON.parse(storedLogs));
      } else {
        setAuditLogs([]);
      }
    } catch (error) {
      console.error('[Security] Failed to load audit logs from localStorage:', error);
      setAuditLogs([]);
    }
  };

  const initializeDefaultPermissions = () => {
    const defaultPerms: ModulePermission[] = [];
    modules.forEach(module => {
      roles.forEach(role => {
        const perm = getDefaultPermission(module.id, role);
        defaultPerms.push({
          module: module.id,
          role,
          ...perm,
        });
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

    const orgId = localStorage.getItem('currentOrgId') || user.organizationId || user.organization_id || 'org_001';

    // Create audit log entry
    const logEntry: AuditLog = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      user: user.full_name || user.email || 'User',
      action: 'Updated permissions',
      module: 'all',
      role: user.role as UserRole,
      changes: `${permissions.length} permissions updated`,
    };

    // Always save to localStorage first (instant, offline-safe)
    localStorage.setItem(`permissions_${orgId}`, JSON.stringify(permissions));
    refreshPermissionsFromStorage();

    // Save audit log to localStorage
    const storedLogs = localStorage.getItem(`audit_logs_${orgId}`);
    const localLogs = storedLogs ? JSON.parse(storedLogs) : [];
    localLogs.unshift(logEntry);
    localStorage.setItem(`audit_logs_${orgId}`, JSON.stringify(localLogs.slice(0, 100)));

    // Now persist to server (KV store) for cross-session / cross-device persistence
    let serverSaved = false;
    try {
      const headers = await getServerHeaders();
      const res = await Promise.race([
        fetch(`${SERVER_BASE}/permissions`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({
            permissions,
            organization_id: orgId,
            changedBy: user.full_name || user.email || 'User',
            changeDescription: `${permissions.length} permissions updated`,
          }),
        }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000)),
      ]);

      if (res.ok) {
        const json = await res.json();
        console.log(`[Security] Permissions saved to server (KV store): ${json.count} entries`);
        serverSaved = true;
      } else {
        const errBody = await res.text().catch(() => '');
        console.error(`[Security] Server save failed (${res.status}): ${errBody}`);
      }
    } catch (err) {
      console.error('[Security] Failed to save permissions to server:', err);
    }

    if (serverSaved) {
      setSaveMessage({ type: 'success', text: 'Permissions saved to database successfully!' });
    } else {
      setSaveMessage({ type: 'success', text: 'Permissions saved locally. Server sync will retry on next save.' });
    }

    setHasChanges(false);
    await loadAuditLogs();

    setTimeout(() => setSaveMessage(null), 5000);
    setIsSaving(false);
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
    <PermissionGate user={user} module="security" action="view">
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
                                  role === 'director' ? 'bg-orange-50 text-orange-700 border-orange-200' :
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
                            role === 'director' ? 'bg-orange-100 text-orange-700' :
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
    </PermissionGate>
  );
}