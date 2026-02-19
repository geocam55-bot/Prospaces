import { useState, useEffect } from 'react';
import { tenantsAPI } from '../utils/api';
import type { User, Organization } from '../App';
import { PermissionGate } from './PermissionGate';
import { canView, canAdd, canChange, canDelete } from '../utils/permissions';
import { CleanupUnusedOrganizations } from './CleanupUnusedOrganizations';
import { 
  Building2, 
  Plus, 
  Search, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Users as UsersIcon,
  FileText,
  AlertCircle,
  Lock,
  X,
  CheckCircle2,
  Image as ImageIcon
} from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { AIToggleSwitch } from './AIToggleSwitch';

interface Tenant {
  id: string;
  name: string;
  domain?: string;
  status: 'active' | 'inactive' | 'suspended';
  plan: 'free' | 'starter' | 'professional' | 'enterprise';
  userCount: number;
  contactsCount: number;
  createdAt: string;
  updatedAt: string;
  maxUsers?: number;
  maxContacts?: number;
  features: string[];
  billingEmail?: string;
  phone?: string;
  address?: string;
  notes?: string;
  logo?: string; // Base64 encoded logo
  ai_suggestions_enabled?: boolean; // AI Suggestions feature flag
  marketing_enabled?: boolean; // Marketing module toggle
  inventory_enabled?: boolean; // Inventory module toggle
  import_export_enabled?: boolean; // Import/Export module toggle
  documents_enabled?: boolean; // Documents module toggle
}

interface TenantsProps {
  user: User;
  organization?: Organization | null;
}

export function Tenants({ user, organization }: TenantsProps) {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showDialog, setShowDialog] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null); // Track which org is being deleted
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    domain: '',
    status: 'active' as const,
    plan: 'starter' as const,
    maxUsers: 10,
    maxContacts: 1000,
    billingEmail: '',
    phone: '',
    address: '',
    notes: '',
    logo: '',
    ai_suggestions_enabled: false,
    marketing_enabled: false,
    inventory_enabled: false,
    import_export_enabled: false,
    documents_enabled: false,
  });

  // Only super_admin can access this module
  const canAccessTenants = canView('tenants', user.role);

  useEffect(() => {
    if (canAccessTenants) {
      loadTenants();
    }
  }, [canAccessTenants]);

  const loadTenants = async () => {
    try {
      setIsLoading(true);
      console.log('[Tenants] 🔄 Loading tenants...');
      const data = await tenantsAPI.getAll();
      console.log('[Tenants] ✅ Received data:', data);
      console.log('[Tenants] 📊 Tenants count:', data.tenants?.length);
      console.log('[Tenants] 📋 First tenant:', data.tenants?.[0]);
      setTenants(data.tenants || []);
    } catch (error) {
      console.error('[Tenants] ❌ Failed to load tenants:', error);
      showAlert('error', 'Failed to load tenants');
    } finally {
      setIsLoading(false);
    }
  };

  const showAlert = (type: 'success' | 'error', message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 3000);
  };

  const handleOpenDialog = (tenant?: Tenant) => {
    if (tenant) {
      setEditingTenant(tenant);
      setFormData({
        name: tenant.name,
        domain: tenant.domain || '',
        status: tenant.status,
        plan: tenant.plan,
        maxUsers: tenant.maxUsers || 10,
        maxContacts: tenant.maxContacts || 1000,
        billingEmail: tenant.billingEmail || '',
        phone: tenant.phone || '',
        address: tenant.address || '',
        notes: tenant.notes || '',
        logo: tenant.logo || '',
        ai_suggestions_enabled: tenant.ai_suggestions_enabled || false,
        marketing_enabled: tenant.marketing_enabled || false,
        inventory_enabled: tenant.inventory_enabled || false,
        import_export_enabled: tenant.import_export_enabled || false,
        documents_enabled: tenant.documents_enabled || false,
      });
    } else {
      setEditingTenant(null);
      setFormData({
        name: '',
        domain: '',
        status: 'active',
        plan: 'starter',
        maxUsers: 10,
        maxContacts: 1000,
        billingEmail: '',
        phone: '',
        address: '',
        notes: '',
        logo: '',
        ai_suggestions_enabled: false,
        marketing_enabled: false,
        inventory_enabled: false,
        import_export_enabled: false,
        documents_enabled: false,
      });
    }
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!formData.name) {
      showAlert('error', 'Organization name is required');
      return;
    }

    try {
      setIsSaving(true);

      const tenantData = {
        name: formData.name,
        domain: formData.domain,
        status: formData.status,
        plan: formData.plan,
        maxUsers: formData.maxUsers,
        maxContacts: formData.maxContacts,
        billingEmail: formData.billingEmail,
        phone: formData.phone,
        address: formData.address,
        notes: formData.notes,
        features: getPlanFeatures(formData.plan),
        logo: formData.logo,
        ai_suggestions_enabled: formData.ai_suggestions_enabled,
        marketing_enabled: formData.marketing_enabled,
        inventory_enabled: formData.inventory_enabled,
        import_export_enabled: formData.import_export_enabled,
        documents_enabled: formData.documents_enabled,
      };

      if (editingTenant) {
        await tenantsAPI.update(editingTenant.id, tenantData);
        showAlert('success', 'Organization updated successfully');
      } else {
        await tenantsAPI.create(tenantData);
        showAlert('success', 'Organization created successfully');
      }

      setShowDialog(false);
      loadTenants();
    } catch (error) {
      console.error('Failed to save tenant:', error);
      showAlert('error', 'Failed to save organization');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this organization? This action cannot be undone and will affect all users in this organization.')) {
      return;
    }

    console.log('[Tenants] 🗑️ Starting deletion for organization:', id);
    
    try {
      setIsDeleting(id);
      console.log('[Tenants] 📞 Calling tenantsAPI.delete()...');
      const result = await tenantsAPI.delete(id);
      console.log('[Tenants] ✅ Delete result:', result);
      showAlert('success', 'Organization deleted successfully');
      console.log('[Tenants] 🔄 Reloading tenants list...');
      await loadTenants();
      console.log('[Tenants] ✅ Tenants list reloaded');
    } catch (error: any) {
      console.error('[Tenants] ❌ Failed to delete tenant:', error);
      console.error('[Tenants] ❌ Error details:', {
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
        fullError: error
      });
      showAlert('error', `Failed to delete organization: ${error?.message || 'Unknown error'}`);
    } finally {
      setIsDeleting(null);
    }
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      showAlert('error', 'Logo file size must be less than 2MB');
      return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      showAlert('error', 'Please upload an image file');
      return;
    }

    // Convert to base64
    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData({ ...formData, logo: reader.result as string });
    };
    reader.onerror = () => {
      showAlert('error', 'Failed to read image file');
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setFormData({ ...formData, logo: '' });
  };

  const getPlanFeatures = (plan: string): string[] => {
    const features: Record<string, string[]> = {
      free: ['Up to 5 users', 'Up to 100 contacts', 'Basic features', 'Email support'],
      starter: ['Up to 10 users', 'Up to 1,000 contacts', 'Standard features', 'Email support', 'Marketing automation'],
      professional: ['Up to 50 users', 'Up to 10,000 contacts', 'Advanced features', 'Priority support', 'Marketing automation', 'Custom reports'],
      enterprise: ['Unlimited users', 'Unlimited contacts', 'All features', '24/7 support', 'Marketing automation', 'Custom reports', 'API access', 'Dedicated account manager'],
    };
    return features[plan] || [];
  };

  const getPlanColor = (plan: string) => {
    const colors: Record<string, string> = {
      free: 'bg-gray-100 text-gray-700 border-gray-200',
      starter: 'bg-blue-100 text-blue-700 border-blue-200',
      professional: 'bg-purple-100 text-purple-700 border-purple-200',
      enterprise: 'bg-amber-100 text-amber-700 border-amber-200',
    };
    return colors[plan] || 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: 'bg-green-100 text-green-700 border-green-200',
      inactive: 'bg-gray-100 text-gray-700 border-gray-200',
      suspended: 'bg-red-100 text-red-700 border-red-200',
    };
    return colors[status] || 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const filteredTenants = tenants.filter(tenant => {
    const matchesSearch =
      tenant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (tenant.domain && tenant.domain.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (tenant.billingEmail && tenant.billingEmail.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || tenant.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: tenants.length,
    active: tenants.filter(t => t.status === 'active').length,
    totalUsers: tenants.reduce((sum, t) => sum + t.userCount, 0),
    totalContacts: tenants.reduce((sum, t) => sum + (t.contactsCount || 0), 0),
  };

  console.log('[Tenants] 📊 Stats calculated:', stats);
  console.log('[Tenants] 📋 Tenants array:', tenants);

  if (!canAccessTenants) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Alert variant="destructive" className="max-w-md">
          <Lock className="h-4 w-4" />
          <AlertDescription>
            Access Denied. Only Super Administrators can manage tenant organizations.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <PermissionGate user={user} module="tenants" action="view">
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-4">
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => loadTenants()} title="Refresh data">
            Refresh
          </Button>
          {canAdd('tenants', user.role) && (
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Organization
            </Button>
          )}
        </div>
      </div>

      {/* Alert */}
      {alert && (
        <Alert variant={alert.type === 'error' ? 'destructive' : 'default'}>
          {alert.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <AlertDescription>{alert.message}</AlertDescription>
        </Alert>
      )}

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Organizations</p>
                <p className="text-2xl text-gray-900 mt-1">{stats.total}</p>
              </div>
              <Building2 className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Organizations</p>
                <p className="text-2xl text-gray-900 mt-1">{stats.active}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Users</p>
                <p className="text-2xl text-gray-900 mt-1">{stats.totalUsers}</p>
              </div>
              <UsersIcon className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Contacts</p>
                <p className="text-2xl text-gray-900 mt-1">{stats.totalContacts.toLocaleString()}</p>
              </div>
              <FileText className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search organizations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tenants List */}
      <div className="grid grid-cols-1 gap-4">
        {isLoading ? (
          <Card>
            <CardContent className="py-12 text-center text-gray-500">
              Loading organizations...
            </CardContent>
          </Card>
        ) : filteredTenants.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Building2 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500">No organizations found</p>
              {canAdd('tenants', user.role) && (
                <Button className="mt-4" onClick={() => handleOpenDialog()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Organization
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredTenants.map(tenant => (
            <Card key={tenant.id}>
              <CardContent className="pt-6">
                <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                  {/* Left Section */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        {tenant.logo ? (
                          <div className="h-12 w-12 rounded-lg border border-gray-200 bg-white flex items-center justify-center overflow-hidden">
                            <img 
                              src={tenant.logo} 
                              alt={`${tenant.name} logo`} 
                              className="h-full w-full object-contain p-1"
                            />
                          </div>
                        ) : (
                          <div className="h-12 w-12 rounded-lg bg-purple-100 flex items-center justify-center">
                            <Building2 className="h-6 w-6 text-purple-600" />
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg text-gray-900">{tenant.name}</h3>
                            <Badge variant="outline" className={getStatusColor(tenant.status)}>
                              {tenant.status}
                            </Badge>
                            <Badge variant="outline" className={getPlanColor(tenant.plan)}>
                              {tenant.plan}
                            </Badge>
                          </div>
                          {tenant.domain && (
                            <p className="text-sm text-gray-600 mt-1">{tenant.domain}</p>
                          )}
                          {tenant.billingEmail && (
                            <p className="text-sm text-gray-600">{tenant.billingEmail}</p>
                          )}
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button 
                            className="inline-flex items-center justify-center rounded-md text-sm ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-gray-100 hover:text-gray-900 h-9 w-9"
                            disabled={isDeleting === tenant.id}
                          >
                            {isDeleting === tenant.id ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                            ) : (
                              <MoreVertical className="h-4 w-4" />
                            )}
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {canChange('tenants', user.role) && (
                            <DropdownMenuItem onClick={() => handleOpenDialog(tenant)} disabled={isDeleting === tenant.id}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                          )}
                          {canDelete('tenants', user.role) && (
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => handleDelete(tenant.id)}
                              disabled={isDeleting === tenant.id}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              {isDeleting === tenant.id ? 'Deleting...' : 'Delete'}
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
                      <div>
                        <p className="text-xs text-gray-500">Users</p>
                        <p className="text-sm text-gray-900 mt-1">
                          {tenant.userCount} / {tenant.maxUsers || '∞'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Contacts</p>
                        <p className="text-sm text-gray-900 mt-1">
                          {(tenant.contactsCount || 0).toLocaleString()} / {tenant.maxContacts?.toLocaleString() || '∞'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Created</p>
                        <p className="text-sm text-gray-900 mt-1">
                          {new Date(tenant.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Updated</p>
                        <p className="text-sm text-gray-900 mt-1">
                          {new Date(tenant.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {tenant.features && tenant.features.length > 0 && (
                      <div className="mt-4">
                        <p className="text-xs text-gray-500 mb-2">Features:</p>
                        <div className="flex flex-wrap gap-2">
                          {tenant.features.map((feature, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {feature}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white">
          <DialogHeader>
            <DialogTitle>{editingTenant ? 'Edit Organization' : 'Create New Organization'}</DialogTitle>
            <DialogDescription>
              {editingTenant ? 'Update organization details and subscription plan' : 'Add a new tenant organization to your CRM system'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-sm text-gray-900">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Organization Name *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Acme Corporation"
                  />
                </div>
                <div>
                  <Label>Domain</Label>
                  <Input
                    value={formData.domain}
                    onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                    placeholder="acme.com"
                  />
                </div>
                <div>
                  <Label>Billing Email</Label>
                  <Input
                    type="email"
                    value={formData.billingEmail}
                    onChange={(e) => setFormData({ ...formData, billingEmail: e.target.value })}
                    placeholder="billing@acme.com"
                  />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </div>
              <div>
                <Label>Address</Label>
                <Input
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="123 Main St, City, State, ZIP"
                />
              </div>
            </div>

            {/* Logo Upload */}
            <div className="space-y-4">
              <h3 className="text-sm text-gray-900">Organization Logo</h3>
              <div>
                <Label>Upload Logo</Label>
                <div className="mt-2">
                  {formData.logo ? (
                    <div className="flex items-start gap-4">
                      <img 
                        src={formData.logo} 
                        alt="Organization logo" 
                        className="h-20 w-20 object-contain rounded-lg border border-gray-200 bg-white p-2"
                      />
                      <div className="flex-1">
                        <p className="text-sm text-gray-600 mb-2">Logo uploaded successfully</p>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={handleRemoveLogo}
                          type="button"
                        >
                          <X className="h-4 w-4 mr-2" />
                          Remove Logo
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                      <input
                        type="file"
                        id="logo-upload"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                      <label htmlFor="logo-upload" className="cursor-pointer">
                        <div className="flex flex-col items-center">
                          <ImageIcon className="h-12 w-12 text-gray-400 mb-3" />
                          <p className="text-sm text-gray-600 mb-1">
                            Click to upload or drag and drop
                          </p>
                          <p className="text-xs text-gray-500">
                            PNG, JPG, GIF up to 2MB
                          </p>
                        </div>
                      </label>
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-2">
                    This logo will be displayed on the organization pages
                  </p>
                </div>
              </div>
            </div>

            {/* Subscription */}
            <div className="space-y-4">
              <h3 className="text-sm text-gray-900">Subscription & Limits</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Status</Label>
                  <Select value={formData.status} onValueChange={(value: any) => setFormData({ ...formData, status: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Plan</Label>
                  <Select value={formData.plan} onValueChange={(value: any) => setFormData({ ...formData, plan: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">Free (5 users, 100 contacts)</SelectItem>
                      <SelectItem value="starter">Starter (10 users, 1K contacts)</SelectItem>
                      <SelectItem value="professional">Professional (50 users, 10K contacts)</SelectItem>
                      <SelectItem value="enterprise">Enterprise (Unlimited)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Max Users</Label>
                  <Input
                    type="number"
                    value={formData.maxUsers ?? 10}
                    onChange={(e) => setFormData({ ...formData, maxUsers: parseInt(e.target.value) || 10 })}
                    placeholder="10"
                  />
                </div>
                <div>
                  <Label>Max Contacts</Label>
                  <Input
                    type="number"
                    value={formData.maxContacts ?? 1000}
                    onChange={(e) => setFormData({ ...formData, maxContacts: parseInt(e.target.value) || 1000 })}
                    placeholder="1000"
                  />
                </div>
                <div>
                  <Label>AI Suggestions Enabled</Label>
                  <AIToggleSwitch
                    checked={formData.ai_suggestions_enabled}
                    onCheckedChange={(checked) => setFormData({ ...formData, ai_suggestions_enabled: checked })}
                  />
                </div>
                <div>
                  <Label>Marketing Module Enabled</Label>
                  <AIToggleSwitch
                    checked={formData.marketing_enabled}
                    onCheckedChange={(checked) => setFormData({ ...formData, marketing_enabled: checked })}
                  />
                </div>
                <div>
                  <Label>Inventory Module Enabled</Label>
                  <AIToggleSwitch
                    checked={formData.inventory_enabled}
                    onCheckedChange={(checked) => setFormData({ ...formData, inventory_enabled: checked })}
                  />
                </div>
                <div>
                  <Label>Import/Export Module Enabled</Label>
                  <AIToggleSwitch
                    checked={formData.import_export_enabled}
                    onCheckedChange={(checked) => setFormData({ ...formData, import_export_enabled: checked })}
                  />
                </div>
                <div>
                  <Label>Documents Module Enabled</Label>
                  <AIToggleSwitch
                    checked={formData.documents_enabled}
                    onCheckedChange={(checked) => setFormData({ ...formData, documents_enabled: checked })}
                  />
                </div>
              </div>
            </div>

            {/* Plan Features Preview */}
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-700 mb-2">Plan Features:</p>
              <div className="flex flex-wrap gap-2">
                {getPlanFeatures(formData.plan).map((feature, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {feature}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <Label>Notes (Internal)</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Internal notes about this organization..."
                rows={3}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-6 pt-6 border-t">
            <Button variant="outline" onClick={() => setShowDialog(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Saving...' : editingTenant ? 'Update Organization' : 'Create Organization'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cleanup Unused Organizations */}
      <CleanupUnusedOrganizations />
    </div>
    </PermissionGate>
  );
}