import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { Alert, AlertDescription } from './ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Shield, Save, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { createClient } from '../utils/supabase/client';
import { toast } from 'sonner';
import { PermissionsTableSetup } from './PermissionsTableSetup';
import type { UserRole } from '../App';

const supabase = createClient();

interface Permission {
  id?: string;
  role: UserRole;
  module: string;
  visible: boolean;
  add: boolean;
  change: boolean;
  delete: boolean;
}

interface PermissionsManagerProps {
  userRole: UserRole;
}

const MODULES = [
  { id: 'dashboard', name: 'Dashboard', description: 'Main dashboard and analytics' },
  { id: 'ai-suggestions', name: 'AI Suggestions', description: 'Intelligent task recommendations' },
  { id: 'team-dashboard', name: 'Team Dashboard', description: 'Team performance monitoring (Manager/Admin only)' },
  { id: 'contacts', name: 'Contacts', description: 'Customer and lead management' },
  { id: 'tasks', name: 'Tasks', description: 'Task and to-do management' },
  { id: 'appointments', name: 'Appointments', description: 'Calendar and scheduling' },
  { id: 'opportunities', name: 'Opportunities', description: 'Business opportunities and pipeline' },
  { id: 'bids', name: 'Deals', description: 'Quotes and proposals' },
  { id: 'notes', name: 'Notes', description: 'Notes and documentation' },
  { id: 'documents', name: 'Documents', description: 'Document storage and management' },
  { id: 'email', name: 'Email', description: 'Email integration and campaigns' },
  { id: 'marketing', name: 'Marketing', description: 'Marketing automation and campaigns' },
  { id: 'inventory', name: 'Inventory', description: 'Product and inventory management' },
  { id: 'project-wizards', name: 'Project Wizards', description: 'Deck, garage, shed, and roof design planners' },
  { id: 'reports', name: 'Reports', description: 'Business intelligence and analytics reports' },
  { id: 'users', name: 'Users', description: 'User management' },
  { id: 'settings', name: 'Settings', description: 'System settings' },
  { id: 'tenants', name: 'Tenants', description: 'Multi-tenant management (Super Admin only)' },
  { id: 'security', name: 'Security', description: 'Security and audit logs' },
  { id: 'import-export', name: 'Import/Export', description: 'Data import and export' },
];

const ROLES: { value: UserRole; label: string; description: string }[] = [
  { value: 'super_admin', label: 'Super Admin', description: 'Full system access across all organizations' },
  { value: 'admin', label: 'Admin', description: 'Full access within organization' },
  { value: 'director', label: 'Director', description: 'Same as Manager, plus full user visibility on Team Dashboard' },
  { value: 'manager', label: 'Manager', description: 'Manage teams and operations' },
  { value: 'marketing', label: 'Marketing', description: 'Marketing and campaign management' },
  { value: 'standard_user', label: 'Standard User', description: 'Basic user access' },
];

export function PermissionsManager({ userRole }: PermissionsManagerProps) {
  const [selectedRole, setSelectedRole] = useState<UserRole>('standard_user');
  const [permissions, setPermissions] = useState<Record<string, Permission>>({});
  const [originalPermissions, setOriginalPermissions] = useState<Record<string, Permission>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [tableNotFound, setTableNotFound] = useState(false);

  // Only super_admin and admin can manage permissions
  const canManagePermissions = userRole === 'super_admin' || userRole === 'admin';
  
  // Filter roles - Admin should not see or manage super_admin permissions
  const visibleRoles = ROLES.filter(role => 
    userRole === 'super_admin' || role.value !== 'super_admin'
  );

  useEffect(() => {
    loadPermissions(selectedRole);
  }, [selectedRole]);

  useEffect(() => {
    // Check if there are any changes
    const changed = Object.keys(permissions).some(module => {
      const current = permissions[module];
      const original = originalPermissions[module];
      if (!original) return false;
      return (
        current.visible !== original.visible ||
        current.add !== original.add ||
        current.change !== original.change ||
        current.delete !== original.delete
      );
    });
    setHasChanges(changed);
  }, [permissions, originalPermissions]);

  const loadPermissions = async (role: UserRole) => {
    setIsLoading(true);
    setTableNotFound(false);
    try {
      const { data, error } = await supabase
        .from('permissions')
        .select('*')
        .eq('role', role);

      if (error) {
        // Check if it's a table not found error
        if (error.code === 'PGRST205' || error.code === '42P01') {
          console.error('Permissions table not found:', error);
          setTableNotFound(true);
          setIsLoading(false);
          return;
        }
        throw error;
      }

      // Convert array to object keyed by module
      const permsMap: Record<string, Permission> = {};
      
      // ALWAYS initialize all modules first with defaults
      MODULES.forEach(module => {
        permsMap[module.id] = {
          role,
          module: module.id,
          visible: false,
          add: false,
          change: false,
          delete: false,
        };
      });

      // Then override with database values if they exist
      if (data && data.length > 0) {
        data.forEach((perm: any) => {
          permsMap[perm.module] = {
            id: perm.id,
            role: perm.role,
            module: perm.module,
            visible: perm.visible,
            add: perm.add,
            change: perm.change,
            delete: perm.delete,
          };
        });
      }

      setPermissions(permsMap);
      setOriginalPermissions(JSON.parse(JSON.stringify(permsMap))); // Deep copy
      setTableNotFound(false);
    } catch (err) {
      console.error('Error loading permissions:', err);
      toast.error('Failed to load permissions');
    } finally {
      setIsLoading(false);
    }
  };

  const updatePermission = (module: string, field: keyof Permission, value: boolean) => {
    setPermissions(prev => ({
      ...prev,
      [module]: {
        ...prev[module],
        [field]: value,
      },
    }));
  };

  const savePermissions = async () => {
    setIsSaving(true);
    try {
      // Separate new records from existing records
      const existingRecords = Object.values(permissions).filter(perm => perm.id);
      const newRecords = Object.values(permissions).filter(perm => !perm.id);

      // Update existing records
      if (existingRecords.length > 0) {
        const updateData = existingRecords.map(perm => ({
          id: perm.id,
          role: perm.role,
          module: perm.module,
          visible: perm.visible,
          add: perm.add,
          change: perm.change,
          delete: perm.delete,
        }));

        const { error: updateError } = await supabase
          .from('permissions')
          .upsert(updateData, {
            onConflict: 'id',
          });

        if (updateError) throw updateError;
      }

      // Insert new records without id field
      if (newRecords.length > 0) {
        const insertData = newRecords.map(perm => ({
          role: perm.role,
          module: perm.module,
          visible: perm.visible,
          add: perm.add,
          change: perm.change,
          delete: perm.delete,
        }));

        const { error: insertError } = await supabase
          .from('permissions')
          .insert(insertData);

        if (insertError) throw insertError;
      }

      // Reload to get the updated data with IDs
      await loadPermissions(selectedRole);
      
      toast.success(`Permissions saved for ${ROLES.find(r => r.value === selectedRole)?.label}!`);
    } catch (err) {
      console.error('Error saving permissions:', err);
      toast.error('Failed to save permissions');
    } finally {
      setIsSaving(false);
    }
  };

  const resetPermissions = () => {
    setPermissions(JSON.parse(JSON.stringify(originalPermissions)));
  };

  if (!canManagePermissions) {
    return (
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          You don't have permission to manage role permissions. Only Super Admins and Admins can access this section.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl text-gray-900 mb-2">Role Permissions Management</h2>
        <p className="text-gray-600">
          Configure what each role can access and modify in the system. Changes are saved to the database. {/* Updated to include Opportunities module */}
        </p>
      </div>

      {tableNotFound ? (
        <PermissionsTableSetup />
      ) : (
        <Tabs value={selectedRole} onValueChange={(value) => setSelectedRole(value as UserRole)}>
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <TabsList className={`inline-flex w-auto min-w-full lg:grid lg:w-full lg:grid-cols-${visibleRoles.length}`}>
              {visibleRoles.map(role => (
                <TabsTrigger key={role.value} value={role.value} className="whitespace-nowrap">
                  {role.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {visibleRoles.map(role => (
            <TabsContent key={role.value} value={role.value} className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    {role.label} Permissions
                  </CardTitle>
                  <CardDescription>{role.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="text-center space-y-3">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="text-gray-600">Loading permissions...</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {hasChanges && (
                        <Alert className="mb-4 border-yellow-400 bg-yellow-50">
                          <AlertCircle className="h-4 w-4 text-yellow-600" />
                          <AlertDescription className="text-yellow-900">
                            You have unsaved changes. Click "Save Changes" to apply them.
                          </AlertDescription>
                        </Alert>
                      )}

                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-gray-200 dark:border-gray-700">
                              <th className="text-left py-3 px-4 text-sm text-muted-foreground">Module</th>
                              <th className="text-center py-3 px-4 text-sm text-muted-foreground">Visible</th>
                              <th className="text-center py-3 px-4 text-sm text-muted-foreground">Add</th>
                              <th className="text-center py-3 px-4 text-sm text-muted-foreground">Change</th>
                              <th className="text-center py-3 px-4 text-sm text-muted-foreground">Delete</th>
                            </tr>
                          </thead>
                          <tbody>
                            {MODULES.map(module => {
                              const perm = permissions[module.id];
                              if (!perm) return null;

                              return (
                                <tr key={module.id} className="border-b border-gray-100 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800">
                                  <td className="py-3 px-4">
                                    <div>
                                      <p className="text-sm text-foreground">{module.name}</p>
                                      <p className="text-xs text-muted-foreground">{module.description}</p>
                                    </div>
                                  </td>
                                  <td className="py-3 px-4 text-center">
                                    <Switch
                                      checked={perm.visible}
                                      onCheckedChange={(checked) => updatePermission(module.id, 'visible', checked)}
                                    />
                                  </td>
                                  <td className="py-3 px-4 text-center">
                                    <Switch
                                      checked={perm.add}
                                      onCheckedChange={(checked) => updatePermission(module.id, 'add', checked)}
                                      disabled={!perm.visible}
                                    />
                                  </td>
                                  <td className="py-3 px-4 text-center">
                                    <Switch
                                      checked={perm.change}
                                      onCheckedChange={(checked) => updatePermission(module.id, 'change', checked)}
                                      disabled={!perm.visible}
                                    />
                                  </td>
                                  <td className="py-3 px-4 text-center">
                                    <Switch
                                      checked={perm.delete}
                                      onCheckedChange={(checked) => updatePermission(module.id, 'delete', checked)}
                                      disabled={!perm.visible}
                                    />
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      <div className="flex gap-3 mt-6">
                        <Button
                          onClick={savePermissions}
                          disabled={!hasChanges || isSaving}
                          className="flex-1"
                        >
                          {isSaving ? (
                            <>
                              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save className="h-4 w-4 mr-2" />
                              Save Changes
                            </>
                          )}
                        </Button>
                        <Button
                          onClick={resetPermissions}
                          variant="outline"
                          disabled={!hasChanges || isSaving}
                        >
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Reset
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}