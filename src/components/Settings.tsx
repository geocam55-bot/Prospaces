import { useState, useEffect } from 'react';
import { toast } from 'sonner@2.0.3';
import { Security } from './Security';
import { ThemeSelector } from './ThemeSelector';
import { ProjectWizardSettings } from './ProjectWizardSettings';
import { DataDiagnostic } from './DataDiagnostic';
import { AIToggleSwitch } from './AIToggleSwitch';
import { PlannerDefaultsMigrationStatus } from './PlannerDefaultsMigrationStatus';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Alert, AlertDescription } from './ui/alert';
import { Textarea } from './ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { 
  Settings as SettingsIcon, 
  Bell, 
  Building2, 
  Camera, 
  Upload, 
  X, 
  DollarSign, 
  Shield, 
  Palette, 
  CheckCircle2, 
  AlertCircle,
  LayoutGrid,
  Monitor,
  Grid,
  Eye,
  Users,
  Plus,
  Trash2,
  Loader2,
  Hammer,
} from 'lucide-react';
import type { User } from '../App';
import { PermissionGate } from './PermissionGate';
import { canView } from '../utils/permissions';
import { tenantsAPI, settingsAPI } from '../utils/api';
import { DEFAULT_PRICE_TIER_LABELS, type PriceTierLabels, getPriceTierLabel, getActivePriceLevels } from '../lib/global-settings';

// Utility: wrap a promise with a timeout to prevent infinite hangs
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`[Settings] Timeout: ${label} took longer than ${ms}ms`));
    }, ms);
    promise.then(
      (val) => { clearTimeout(timer); resolve(val); },
      (err) => { clearTimeout(timer); reject(err); }
    );
  });
}

// Safety-net timeout (ms) for the entire settings load
const SETTINGS_LOAD_TIMEOUT = 15000;
// Per-call timeout for each API call
const API_CALL_TIMEOUT = 8000;

interface SettingsProps {
  user: User;
  organization: any | null;
  onUserUpdate?: (updatedUser: User) => void;
  onOrganizationUpdate?: (updatedOrganization: any) => void;
}

import { EmailDebug } from './EmailDebug';
import { SubscriptionBilling } from './subscription/SubscriptionBilling';
import { BillingPlanConfig } from './subscription/BillingPlanConfig';
import { ApiAccess } from './subscription/ApiAccess';
import { useSubscription } from '../hooks/useSubscription';
import { getOrgMode, setOrgMode } from '../utils/settings-client';
import type { OrgUserMode } from '../utils/settings-client';
import { WorkflowSettingsDialog } from './settings/WorkflowSettingsDialog';
import { CustomFieldsDialog } from './settings/CustomFieldsDialog';

export function Settings({ user, organization, onUserUpdate, onOrganizationUpdate }: SettingsProps) {
  const [orgName, setOrgName] = useState('ProSpaces Organization');
  const [profileData, setProfileData] = useState({
    name: user.full_name || user.email || '',
    profilePicture: user.avatar_url || '',
  });
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingGlobal, setIsSavingGlobal] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingNotifications, setIsSavingNotifications] = useState(false);
  const [isSavingOrg, setIsSavingOrg] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showDatabaseWarning, setShowDatabaseWarning] = useState(false);
  const [showLayoutDialog, setShowLayoutDialog] = useState(false);
  const [showWorkflowDialog, setShowWorkflowDialog] = useState(false);
  const [showCustomFieldsDialog, setShowCustomFieldsDialog] = useState(false);
  const [planRefreshKey, setPlanRefreshKey] = useState(0);
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    taskAssignments: true,
    appointments: true,
    bids: true,
  });

  // Layout configuration state
  const [layoutConfig, setLayoutConfig] = useState({
    dashboardDensity: 'comfortable',
    sidebarPosition: 'left',
    moduleCardSize: 'medium',
    showModuleIcons: true,
    compactMode: false,
    tableRowHeight: 'medium',
  });

  // Global Organization Settings
  const [globalSettings, setGlobalSettings] = useState({
    taxRate: 0,
    taxRate2: 0,
    defaultPriceLevel: getPriceTierLabel(1),
    quoteTerms: 'Payment due within 30 days. All prices in USD.',
    audienceSegments: ['VIP', 'New Lead', 'Active Customer', 'Inactive', 'Prospect'], // Marketing segments
    priceTierLabels: { ...DEFAULT_PRICE_TIER_LABELS } as PriceTierLabels,
  });

  // Organization user mode (single/multi)
  const [userMode, setUserMode] = useState<OrgUserMode>('single');
  const [isSavingUserMode, setIsSavingUserMode] = useState(false);

  // Subscription feature gating (for API Access tab)
  const { hasFeature: subHasFeature } = useSubscription();

  // New segment input
  const [newSegment, setNewSegment] = useState('');

  // Load settings from Supabase on mount
  useEffect(() => {
    loadSettingsFromSupabase();

    // Safety-net: if loading takes too long, force it to complete with localStorage fallback
    const safetyTimer = setTimeout(() => {
      setIsLoading((prev) => {
        if (prev) {
          console.warn('[Settings] Safety-net timeout reached — forcing load from localStorage');
          loadSettingsFromLocalStorage();
          setShowDatabaseWarning(true);
        }
        return false;
      });
    }, SETTINGS_LOAD_TIMEOUT);

    return () => clearTimeout(safetyTimer);
  }, [user.id, user.organizationId]);

  const loadSettingsFromSupabase = async () => {
    try {
      setIsLoading(true);
      setShowDatabaseWarning(false);

      // Guard: if organizationId is missing, skip API calls and use localStorage
      if (!user.organizationId) {
        console.warn('[Settings] No organizationId on user — loading from localStorage only');
        loadSettingsFromLocalStorage();
        return;
      }

      // Load user preferences (with timeout protection)
      let userPrefs = null;
      try {
        userPrefs = await withTimeout(
          settingsAPI.getUserPreferences(user.id, user.organizationId),
          API_CALL_TIMEOUT,
          'getUserPreferences'
        );
      } catch (prefErr) {
        console.warn('[Settings] getUserPreferences failed or timed out:', prefErr);
      }
      
      if (userPrefs) {
        setNotifications({
          email: userPrefs.notifications_email ?? true,
          push: userPrefs.notifications_push ?? true,
          taskAssignments: userPrefs.notifications_task_assignments ?? true,
          appointments: userPrefs.notifications_appointments ?? true,
          bids: userPrefs.notifications_bids ?? true,
        });
        
        // Load profile picture from Supabase
        if (userPrefs.profile_picture) {
          setProfileData(prev => ({ ...prev, profilePicture: userPrefs.profile_picture || '' }));
        }
      } else {
        // Fallback to localStorage for user preferences
        loadSettingsFromLocalStorage();
      }

      // Load organization settings (with timeout protection)
      let orgSettings = null;
      try {
        orgSettings = await withTimeout(
          settingsAPI.getOrganizationSettings(user.organizationId),
          API_CALL_TIMEOUT,
          'getOrganizationSettings'
        );
      } catch (orgErr) {
        console.warn('[Settings] getOrganizationSettings failed or timed out:', orgErr);
      }

      if (orgSettings) {
        // price_tier_labels may not exist as a DB column yet.
        // Merge from localStorage so custom labels aren't lost.
        const orgId = localStorage.getItem('currentOrgId') || user.organizationId;
        let storedPriceTierLabels: PriceTierLabels | null = null;
        try {
          const stored = localStorage.getItem(`global_settings_${orgId}`);
          if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed.priceTierLabels) storedPriceTierLabels = parsed.priceTierLabels;
          }
        } catch (_) { /* ignore parse errors */ }

        setGlobalSettings({
          taxRate: orgSettings.tax_rate ?? 0,
          taxRate2: orgSettings.tax_rate_2 ?? 0,
          defaultPriceLevel: orgSettings.default_price_level || getPriceTierLabel(1),
          quoteTerms: orgSettings.quote_terms || 'Payment due within 30 days. All prices in USD.',
          audienceSegments: orgSettings.audience_segments || ['VIP', 'New Lead', 'Active Customer', 'Inactive', 'Prospect'],
          priceTierLabels: orgSettings.price_tier_labels || storedPriceTierLabels || { ...DEFAULT_PRICE_TIER_LABELS },
        });
        
        // Load organization name
        if (orgSettings.organization_name) {
          setOrgName(orgSettings.organization_name);
        }
      } else {
        // Fallback to localStorage for org settings
        const orgId = localStorage.getItem('currentOrgId') || user.organizationId;
        const stored = localStorage.getItem(`global_settings_${orgId}`);
        if (stored) {
          try {
            const parsedSettings = JSON.parse(stored);
            setGlobalSettings({
              taxRate: parsedSettings.taxRate || 0,
              taxRate2: parsedSettings.taxRate2 || 0,
              defaultPriceLevel: parsedSettings.defaultPriceLevel || getPriceTierLabel(1),
              quoteTerms: parsedSettings.quoteTerms || 'Payment due within 30 days. All prices in USD.',
              audienceSegments: parsedSettings.audienceSegments || ['VIP', 'New Lead', 'Active Customer', 'Inactive', 'Prospect'],
              priceTierLabels: parsedSettings.priceTierLabels || { ...DEFAULT_PRICE_TIER_LABELS },
            });
          } catch (_) { /* ignore parse errors */ }
        }
        
        // Try to get org name from organizations table (also with timeout)
        try {
          const { tenant } = await withTimeout(
            tenantsAPI.getById(user.organizationId),
            API_CALL_TIMEOUT,
            'getOrgName'
          );
          if (tenant) {
            setOrgName(tenant.name);
          }
        } catch (err) {
          console.log('[Settings] Could not load organization name');
        }
      }

      // Load organization user mode from KV store
      try {
        const orgModeData = await withTimeout(
          getOrgMode(user.organizationId),
          API_CALL_TIMEOUT,
          'getOrgMode'
        );
        if (orgModeData?.user_mode) {
          setUserMode(orgModeData.user_mode);
        }
      } catch (modeErr) {
        console.warn('[Settings] getOrgMode failed or timed out:', modeErr);
      }

      console.log('[Settings] ✅ Settings loaded successfully');
    } catch (error) {
      console.error('[Settings] ❌ Error loading settings:', error);
      // Fallback to localStorage if Supabase fails
      loadSettingsFromLocalStorage();
      setShowDatabaseWarning(true);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSettingsFromLocalStorage = () => {
    // Fallback: Load from localStorage
    try {
      const orgId = localStorage.getItem('currentOrgId') || user.organizationId;
      const stored = localStorage.getItem(`global_settings_${orgId}`);
      if (stored) {
        const parsedSettings = JSON.parse(stored);
        setGlobalSettings({
          taxRate: parsedSettings.taxRate || 0,
          taxRate2: parsedSettings.taxRate2 || 0,
          defaultPriceLevel: parsedSettings.defaultPriceLevel || getPriceTierLabel(1),
          quoteTerms: parsedSettings.quoteTerms || 'Payment due within 30 days. All prices in USD.',
          audienceSegments: parsedSettings.audienceSegments || ['VIP', 'New Lead', 'Active Customer', 'Inactive', 'Prospect'],
          priceTierLabels: parsedSettings.priceTierLabels || { ...DEFAULT_PRICE_TIER_LABELS },
        });
      }
    } catch (err) {
      console.warn('[Settings] Failed to parse localStorage settings:', err);
    }
    
    // Load profile picture from localStorage as fallback
    try {
      const storedPicture = localStorage.getItem(`profile_picture_${user.id}`);
      if (storedPicture) {
        setProfileData(prev => ({ ...prev, profilePicture: storedPicture }));
      }
    } catch (err) {
      console.warn('[Settings] Failed to load profile picture from localStorage:', err);
    }
  };

  // Get user initials for avatar fallback
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const showAlert = (type: 'success' | 'error', message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 5000);
  };

  const handleProfilePictureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      showAlert('error', 'Image size must be less than 2MB');
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      showAlert('error', 'Please upload an image file');
      return;
    }

    try {
      setIsUploading(true);

      // Convert to base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        setProfileData({ ...profileData, profilePicture: base64String });
        
        try {
          // Save to Supabase user preferences (profile_picture)
          await settingsAPI.upsertUserPreferences({
            user_id: user.id,
            organization_id: user.organizationId,
            profile_picture: base64String,
            notifications_email: notifications.email,
            notifications_push: notifications.push,
            notifications_task_assignments: notifications.taskAssignments,
            notifications_appointments: notifications.appointments,
            notifications_bids: notifications.bids,
          });
          
          // Keep localStorage as backup
          localStorage.setItem(`profile_picture_${user.id}`, base64String);
          
          if (onUserUpdate) {
            const updatedUser: User = {
              ...user,
              avatar_url: base64String,
            };
            onUserUpdate(updatedUser);
          }
          
          showAlert('success', 'Profile picture updated successfully!');
        } catch (error) {
          console.error('Error updating profile picture:', error);
          showAlert('error', 'Failed to update profile picture');
        } finally {
          setIsUploading(false);
        }
      };

      reader.onerror = () => {
        showAlert('error', 'Failed to read image file');
        setIsUploading(false);
      };

      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      showAlert('error', 'Failed to upload image');
      setIsUploading(false);
    }
  };

  const handleRemoveProfilePicture = async () => {
    try {
      setIsUploading(true);
      setProfileData({ ...profileData, profilePicture: '' });
      
      // Remove from Supabase user_preferences table
      await settingsAPI.upsertUserPreferences({
        user_id: user.id,
        organization_id: user.organizationId,
        profile_picture: '',
        notifications_email: notifications.email,
        notifications_push: notifications.push,
        notifications_task_assignments: notifications.taskAssignments,
        notifications_appointments: notifications.appointments,
        notifications_bids: notifications.bids,
      });
      
      // Remove from localStorage
      localStorage.removeItem(`profile_picture_${user.id}`);
      
      if (onUserUpdate) {
        const updatedUser: User = {
          ...user,
          avatar_url: undefined,
        };
        onUserUpdate(updatedUser);
      }
      
      showAlert('success', 'Profile picture removed successfully!');
    } catch (error) {
      console.error('Error removing profile picture:', error);
      showAlert('error', 'Failed to remove profile picture');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    try {
      console.log('[Settings] 💾 Saving profile...', profileData);
      
      // Save name and avatar_url to Supabase profiles table
      await settingsAPI.updateUserProfile(user.id, {
        name: profileData.name,
        avatar_url: profileData.profilePicture || '',
      });
      
      console.log('[Settings] ✅ Profile table updated, now updating preferences...');
      
      // Save profile picture to user_preferences table
      await settingsAPI.upsertUserPreferences({
        user_id: user.id,
        organization_id: user.organizationId,
        profile_picture: profileData.profilePicture || '',
        notifications_email: notifications.email,
        notifications_push: notifications.push,
        notifications_task_assignments: notifications.taskAssignments,
        notifications_appointments: notifications.appointments,
        notifications_bids: notifications.bids,
      });
      
      console.log('[Settings] ✅ Both tables updated successfully');
      
      if (onUserUpdate) {
        const updatedUser: User = {
          ...user,
          full_name: profileData.name,
          avatar_url: profileData.profilePicture || undefined,
        };
        onUserUpdate(updatedUser);
      }
      
      toast.success('Profile updated successfully!');
      showAlert('success', 'Profile updated successfully!');
    } catch (error: any) {
      console.error('[Settings] ❌ Error updating profile:', error);
      const errorMessage = error?.message || 'Failed to update profile. Please check console for details.';
      toast.error(errorMessage);
      showAlert('error', errorMessage);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSaveOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingOrg(true);
    
    try {
      // Save organization name to Supabase
      await settingsAPI.updateOrganizationName(user.organizationId, orgName);
      
      // Also save to organization_settings table
      await settingsAPI.upsertOrganizationSettings({
        organization_id: user.organizationId,
        tax_rate: globalSettings.taxRate,
        default_price_level: globalSettings.defaultPriceLevel,
        organization_name: orgName,
      });
      
      showAlert('success', 'Organization settings saved successfully!');
    } catch (error) {
      console.error('Error saving organization settings:', error);
      showAlert('error', 'Failed to save organization settings');
    } finally {
      setIsSavingOrg(false);
    }
  };

  const handleSaveNotifications = async () => {
    setIsSavingNotifications(true);
    try {
      // Save notification preferences to Supabase
      await settingsAPI.upsertUserPreferences({
        user_id: user.id,
        organization_id: user.organizationId,
        notifications_email: notifications.email,
        notifications_push: notifications.push,
        notifications_task_assignments: notifications.taskAssignments,
        notifications_appointments: notifications.appointments,
        notifications_bids: notifications.bids,
        profile_picture: profileData.profilePicture,
      });
      
      showAlert('success', 'Notification preferences saved successfully!');
    } catch (error) {
      console.error('Error saving notification preferences:', error);
      showAlert('error', 'Failed to save notification preferences');
    } finally {
      setIsSavingNotifications(false);
    }
  };

  const handleToggleUserMode = async (newMode: OrgUserMode) => {
    setIsSavingUserMode(true);
    try {
      setUserMode(newMode);
      await setOrgMode(user.organizationId, newMode);

      // Update organization object in parent if callback available
      if (onOrganizationUpdate && organization) {
        onOrganizationUpdate({ ...organization, user_mode: newMode });
      }

      toast.success(`Organization switched to ${newMode === 'single' ? 'Single User' : 'Multi User'} mode`);
      showAlert('success', `Organization mode updated to ${newMode === 'single' ? 'Single User' : 'Multi User'}`);
    } catch (error: any) {
      console.error('[Settings] Error updating org user mode:', error);
      // Revert on error
      setUserMode(newMode === 'single' ? 'multi' : 'single');
      const errorMessage = error?.message || 'Failed to update organization mode';
      toast.error(errorMessage);
      showAlert('error', errorMessage);
    } finally {
      setIsSavingUserMode(false);
    }
  };

  const handleSaveGlobalSettings = async () => {
    setIsSavingGlobal(true);
    try {
      // Save to Supabase
      const result = await settingsAPI.upsertOrganizationSettings({
        organization_id: user.organizationId,
        tax_rate: globalSettings.taxRate,
        tax_rate_2: globalSettings.taxRate2,
        default_price_level: globalSettings.defaultPriceLevel,
        quote_terms: globalSettings.quoteTerms,
        organization_name: orgName,
        audience_segments: globalSettings.audienceSegments, // Marketing segments
        price_tier_labels: globalSettings.priceTierLabels,
      });
      
      // Keep localStorage as backup (always save regardless of Supabase status)
      const orgId = localStorage.getItem('currentOrgId') || user.organizationId;
      localStorage.setItem(`global_settings_${orgId}`, JSON.stringify(globalSettings));
      
      if (result) {
        showAlert('success', 'Global settings saved successfully to database!');
      } else {
        // Supabase save failed (likely tables don't exist or RLS prevents it), but localStorage worked
        showAlert('success', 'Settings saved locally. Database sync may require additional setup.');
        console.info('[Settings] Settings saved to localStorage. Database tables may not exist or RLS policies may need configuration.');
      }
    } catch (error: any) {
      console.error('Error saving global settings:', error);
      
      // Check if it's an RLS permission error
      if (error?.message?.includes('Permission denied') || error?.message?.includes('RLS')) {
        showAlert('error', `Database permission error: ${error.message}\n\nYour settings have been saved locally. Please run the SQL script: SUPABASE_FIX_ORG_SETTINGS_RLS_SIMPLE.sql in your Supabase dashboard.`);
      } else {
        // Still try to save to localStorage as fallback
        try {
          const orgId = localStorage.getItem('currentOrgId') || user.organizationId;
          localStorage.setItem(`global_settings_${orgId}`, JSON.stringify(globalSettings));
          showAlert('success', 'Global settings saved locally (offline mode)');
        } catch (localError) {
          showAlert('error', 'Failed to save global settings');
        }
      }
    } finally {
      setIsSavingGlobal(false);
    }
  };

  const handleSaveAppearanceSettings = () => {
    console.log('Save Appearance Settings clicked!');
    // Theme is already auto-saved by ThemeSelector, but we can add more settings here
    toast.success('Appearance settings saved! Theme changes are applied automatically.');
  };

  const canManageSettings = user.role === 'super_admin' || user.role === 'admin';
  const isSuperAdmin = user.role === 'super_admin';
  const canAccessSecurity = canView('security', user.role);

  // Show loading spinner while settings are being fetched
  if (isLoading) {
    return (
      <PermissionGate user={user} module="settings" action="view">
        <div className="p-6">
          <div className="flex items-center justify-center py-16">
            <div className="text-center space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
              <p className="text-sm text-gray-500">Loading settings...</p>
              <p className="text-xs text-gray-400 mt-2">
                If this takes too long, settings will load from local cache automatically.
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-3 text-xs text-gray-400 hover:text-gray-600"
                onClick={() => {
                  console.log('[Settings] User manually skipped loading — using localStorage');
                  loadSettingsFromLocalStorage();
                  setShowDatabaseWarning(true);
                  setIsLoading(false);
                }}
              >
                Skip and use cached settings
              </Button>
            </div>
          </div>
        </div>
      </PermissionGate>
    );
  }

  return (
    <PermissionGate user={user} module="settings" action="view">
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <WorkflowSettingsDialog 
        open={showWorkflowDialog} 
        onOpenChange={setShowWorkflowDialog} 
        organizationId={user.organizationId}
      />
      <CustomFieldsDialog
        open={showCustomFieldsDialog}
        onOpenChange={setShowCustomFieldsDialog}
        organizationId={user.organizationId}
      />
      {/* Database Warning Banner */}
      {showDatabaseWarning && (
        <Alert className="bg-yellow-50 border-yellow-200">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800 flex items-center justify-between gap-4">
            <span>
              Could not load settings from the database. Showing locally saved settings instead.
              Check that the <strong>organization_settings</strong> table exists in your Supabase database.
            </span>
            <Button
              variant="outline"
              size="sm"
              className="shrink-0 border-yellow-400 text-yellow-800 hover:bg-yellow-100"
              onClick={() => loadSettingsFromSupabase()}
            >
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="profile" className="w-full">
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <TabsList className="inline-flex w-auto min-w-full">
            <TabsTrigger value="profile" className="whitespace-nowrap px-3 sm:px-4 text-xs sm:text-sm">Profile</TabsTrigger>
            <TabsTrigger value="notifications" className="whitespace-nowrap px-3 sm:px-4 text-xs sm:text-sm">Notifications</TabsTrigger>
            {canManageSettings && <TabsTrigger value="organization" className="whitespace-nowrap px-3 sm:px-4 text-xs sm:text-sm">Organization</TabsTrigger>}
            {canAccessSecurity && <TabsTrigger value="permissions" className="whitespace-nowrap px-3 sm:px-4 text-xs sm:text-sm">Permissions</TabsTrigger>}
            {canManageSettings && <TabsTrigger value="project-wizards" className="whitespace-nowrap px-3 sm:px-4 text-xs sm:text-sm">Project Wizards</TabsTrigger>}
            {canManageSettings && <TabsTrigger value="diagnostics" className="whitespace-nowrap px-3 sm:px-4 text-xs sm:text-sm">Diagnostics</TabsTrigger>}
            <TabsTrigger value="appearance" className="whitespace-nowrap px-3 sm:px-4 text-xs sm:text-sm">Appearance</TabsTrigger>
            {(userMode === 'single' || canManageSettings) && <TabsTrigger value="billing" className="whitespace-nowrap px-3 sm:px-4 text-xs sm:text-sm">Billing</TabsTrigger>}
            {isSuperAdmin && <TabsTrigger value="billing-plans" className="whitespace-nowrap px-3 sm:px-4 text-xs sm:text-sm">Billing Plans</TabsTrigger>}
            {canManageSettings && <TabsTrigger value="api-access" className="whitespace-nowrap px-3 sm:px-4 text-xs sm:text-sm">API Access</TabsTrigger>}
          </TabsList>
        </div>

        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SettingsIcon className="h-5 w-5" />
                Profile Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={profileData.name}
                  onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" defaultValue={user.email} disabled />
                <p className="text-xs text-gray-500">Contact support to change your email</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Input id="role" defaultValue={user.role.replace('_', ' ').toUpperCase()} disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="organization">Organization</Label>
                <div className="flex items-center gap-2 p-3 border rounded-md bg-gray-50">
                  <Building2 className="h-5 w-5 text-gray-500" />
                  <div className="flex-1">
                    <Input 
                      id="organization" 
                      defaultValue={user.organizationId} 
                      disabled 
                      className="bg-transparent border-none p-0 h-auto font-mono text-sm"
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  {user.role === 'super_admin' 
                    ? 'As a Super Admin, you have access to all organizations' 
                    : 'Your organization ID. Contact a Super Admin to change organizations'}
                </p>
              </div>
              <div className="space-y-2">
                <Label>Profile Picture</Label>
                <div className="flex items-start gap-6">
                  <div className="relative">
                    <Avatar className="h-24 w-24">
                      <AvatarImage src={profileData.profilePicture} alt={profileData.name} />
                      <AvatarFallback className="bg-blue-600 text-white text-2xl">
                        {getInitials(profileData.name)}
                      </AvatarFallback>
                    </Avatar>
                    {!isUploading && (
                      <button
                        type="button"
                        onClick={() => document.getElementById('profile-picture-upload')?.click()}
                        className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition-colors border-2 border-white"
                      >
                        <Camera className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <div className="flex-1 space-y-3">
                    <p className="text-sm text-gray-600">
                      Upload a profile picture to personalize your account. Recommended size: 400x400px
                    </p>
                    <div className="flex gap-2">
                      <input
                        id="profile-picture-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleProfilePictureUpload}
                        disabled={isUploading}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => document.getElementById('profile-picture-upload')?.click()}
                        disabled={isUploading}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        {isUploading ? 'Uploading...' : 'Upload Photo'}
                      </Button>
                      {profileData.profilePicture && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleRemoveProfilePicture}
                          disabled={isUploading}
                        >
                          <X className="h-4 w-4 mr-2" />
                          Remove
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">PNG, JPG, GIF up to 2MB</p>
                  </div>
                </div>
              </div>
              <Button onClick={handleSaveProfile} disabled={isSavingProfile}>
                {isSavingProfile ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Email Notifications</Label>
                  <p className="text-sm text-gray-500">Receive notifications via email</p>
                </div>
                <Switch
                  checked={notifications.email}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, email: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Push Notifications</Label>
                  <p className="text-sm text-gray-500">Receive browser push notifications</p>
                </div>
                <Switch
                  checked={notifications.push}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, push: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Task Assignments</Label>
                  <p className="text-sm text-gray-500">Get notified when tasks are assigned to you</p>
                </div>
                <Switch
                  checked={notifications.taskAssignments}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, taskAssignments: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Appointment Reminders</Label>
                  <p className="text-sm text-gray-500">Reminders for upcoming appointments</p>
                </div>
                <Switch
                  checked={notifications.appointments}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, appointments: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Deal Updates</Label>
                  <p className="text-sm text-gray-500">Updates on deal status changes</p>
                </div>
                <Switch
                  checked={notifications.bids}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, bids: checked })}
                />
              </div>
              <Button onClick={handleSaveNotifications} disabled={isSavingNotifications}>
                {isSavingNotifications ? 'Saving...' : 'Save Preferences'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {canManageSettings && (
          <TabsContent value="organization" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Organization Settings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveOrg} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="orgName">Organization Name</Label>
                    <Input
                      id="orgName"
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="orgId">Organization ID</Label>
                    <Input id="orgId" defaultValue={user.organizationId} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>Custom Fields</Label>
                    <p className="text-sm text-gray-500">Add custom fields to your CRM data types</p>
                    <Button type="button" variant="outline" onClick={() => setShowCustomFieldsDialog(true)}>Manage Custom Fields</Button>
                  </div>
                  <div className="space-y-2">
                    <Label>Workflows</Label>
                    <p className="text-sm text-gray-500">Configure automated workflows and statuses</p>
                    <Button type="button" variant="outline" onClick={() => setShowWorkflowDialog(true)}>Configure Workflows</Button>
                  </div>
                  <Button type="submit" disabled={isSavingOrg}>
                    {isSavingOrg ? 'Saving...' : 'Save Organization Settings'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Organization User Mode Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  User Mode
                </CardTitle>
                <p className="text-sm text-gray-500 mt-1">
                  Control whether this organization operates as a single-user or multi-user workspace
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg border bg-gray-50/50 dark:bg-gray-800/50">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Label className="text-base font-medium">
                        {userMode === 'single' ? 'Single User' : 'Multi User'}
                      </Label>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        userMode === 'multi'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                        {userMode === 'multi' ? 'Team' : 'Solo'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">
                      {userMode === 'single'
                        ? 'Only you have access. Team management features are hidden.'
                        : 'Multiple users can collaborate. Team management and roles are enabled.'}
                    </p>
                  </div>
                  <Switch
                    checked={userMode === 'multi'}
                    onCheckedChange={(checked) => handleToggleUserMode(checked ? 'multi' : 'single')}
                    disabled={isSavingUserMode}
                  />
                </div>

                {/* Mode details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className={`p-3 rounded-lg border-2 transition-colors ${
                    userMode === 'single'
                      ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/10'
                      : 'border-transparent bg-gray-50 dark:bg-gray-800/30'
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`p-1.5 rounded-md ${userMode === 'single' ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-500'}`}>
                        <SettingsIcon className="h-4 w-4" />
                      </div>
                      <span className="font-medium text-sm">Single User</span>
                    </div>
                    <ul className="text-xs text-gray-500 space-y-1">
                      <li>Personal workspace</li>
                      <li>Simplified navigation</li>
                      <li>No team management</li>
                      <li>All data is private</li>
                    </ul>
                  </div>
                  <div className={`p-3 rounded-lg border-2 transition-colors ${
                    userMode === 'multi'
                      ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/10'
                      : 'border-transparent bg-gray-50 dark:bg-gray-800/30'
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`p-1.5 rounded-md ${userMode === 'multi' ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-500'}`}>
                        <Users className="h-4 w-4" />
                      </div>
                      <span className="font-medium text-sm">Multi User</span>
                    </div>
                    <ul className="text-xs text-gray-500 space-y-1">
                      <li>Team collaboration</li>
                      <li>Role-based access</li>
                      <li>User management panel</li>
                      <li>Shared &amp; scoped data</li>
                    </ul>
                  </div>
                </div>

                {isSavingUserMode && (
                  <div className="flex items-center gap-2 text-sm text-blue-600">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Updating organization mode...
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Global Settings Card */}
            {(user.role === 'super_admin' || user.role === 'admin') && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Global Settings
                  </CardTitle>
                  <p className="text-sm text-gray-500 mt-2">
                    <Shield className="h-4 w-4 inline mr-1" />
                    Restricted to Super Admin and Admin only
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="taxRate">Tax Rate 1 (%)</Label>
                      <Input
                        id="taxRate"
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={globalSettings.taxRate}
                        onChange={(e) => setGlobalSettings({ ...globalSettings, taxRate: parseFloat(e.target.value) || 0 })}
                        placeholder="Enter tax rate (e.g., 8.5 for 8.5%)"
                      />
                      <p className="text-xs text-gray-500">
                        Primary tax rate for bids and quotes
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="taxRate2">Tax Rate 2 (%) - Optional</Label>
                      <Input
                        id="taxRate2"
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={globalSettings.taxRate2}
                        onChange={(e) => setGlobalSettings({ ...globalSettings, taxRate2: parseFloat(e.target.value) || 0 })}
                        placeholder="Enter second tax rate (e.g., 2.0 for 2.0%)"
                      />
                      <p className="text-xs text-gray-500">
                        Secondary tax rate (if applicable)
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="defaultPriceLevel">Default Price Level</Label>
                    <Select
                      value={globalSettings.defaultPriceLevel}
                      onValueChange={(value) => setGlobalSettings({ ...globalSettings, defaultPriceLevel: value })}
                    >
                      <SelectTrigger id="defaultPriceLevel">
                        <SelectValue placeholder="Select default price level" />
                      </SelectTrigger>
                      <SelectContent>
                        {[
                          { key: 't1' as const, tier: 1 },
                          { key: 't2' as const, tier: 2 },
                          { key: 't3' as const, tier: 3 },
                          { key: 't4' as const, tier: 4 },
                          { key: 't5' as const, tier: 5 },
                        ]
                          .filter(({ key }) => {
                            const label = (globalSettings.priceTierLabels || DEFAULT_PRICE_TIER_LABELS)[key];
                            return label && label.trim() !== '' && label.trim() !== '0';
                          })
                          .map(({ key, tier }) => {
                            const label = (globalSettings.priceTierLabels || DEFAULT_PRICE_TIER_LABELS)[key];
                            return (
                              <SelectItem key={key} value={label}>
                                T{tier} — {label}
                              </SelectItem>
                            );
                          })}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500">
                      This price level will be used as default when creating new bids and quotes
                    </p>
                  </div>

                  {/* Price Tier Labels */}
                  <div className="space-y-3">
                    <div>
                      <Label className="text-base font-semibold">Price Tier Labels</Label>
                      <p className="text-xs text-gray-500 mt-1">
                        Customize the names shown for each price tier across the entire CRM. Set a tier to "0" or leave blank to disable it.
                      </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                      {([
                        { key: 't1' as const, tier: 1 },
                        { key: 't2' as const, tier: 2 },
                        { key: 't3' as const, tier: 3 },
                        { key: 't4' as const, tier: 4 },
                        { key: 't5' as const, tier: 5 },
                      ]).map(({ key, tier }) => (
                        <div key={key} className="space-y-1">
                          <Label htmlFor={`tierLabel-${key}`} className="text-xs text-gray-600">
                            Tier {tier} Label
                          </Label>
                          <Input
                            id={`tierLabel-${key}`}
                            value={(globalSettings.priceTierLabels || DEFAULT_PRICE_TIER_LABELS)[key] || ''}
                            onChange={(e) => setGlobalSettings(prev => ({
                              ...prev,
                              priceTierLabels: {
                                ...(prev.priceTierLabels || DEFAULT_PRICE_TIER_LABELS),
                                [key]: e.target.value,
                              },
                            }))}
                            placeholder={DEFAULT_PRICE_TIER_LABELS[key]}
                            className="text-sm"
                          />
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setGlobalSettings(prev => ({
                          ...prev,
                          priceTierLabels: { ...DEFAULT_PRICE_TIER_LABELS },
                        }))}
                      >
                        Reset to Defaults
                      </Button>
                      <span className="text-xs text-gray-400">
                        Defaults: Retail, VIP, VIP B, VIP A, 0
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="quoteTerms">Default Terms for Quotes</Label>
                    <Textarea
                      id="quoteTerms"
                      value={globalSettings.quoteTerms}
                      onChange={(e) => setGlobalSettings({ ...globalSettings, quoteTerms: e.target.value })}
                      placeholder="Enter default terms for quotes"
                      rows={4}
                    />
                    <p className="text-xs text-gray-500">
                      These terms will be used as default when creating new quotes and bids
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="audienceSegments">Audience Segments</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="audienceSegments"
                        value={newSegment}
                        onChange={(e) => setNewSegment(e.target.value)}
                        placeholder="Add new segment"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (newSegment.trim()) {
                            setGlobalSettings(prev => ({
                              ...prev,
                              audienceSegments: [...prev.audienceSegments, newSegment.trim()],
                            }));
                            setNewSegment('');
                          }
                        }}
                      >
                        Add
                      </Button>
                    </div>
                    <div className="mt-2">
                      <Label className="text-sm text-gray-500">Current Segments</Label>
                      <div className="flex flex-wrap gap-2">
                        {globalSettings.audienceSegments.map((segment, index) => (
                          <div key={index} className="bg-gray-100 px-2 py-1 rounded text-sm">
                            {segment}
                            <button
                              type="button"
                              className="ml-2 text-red-500"
                              onClick={() => {
                                setGlobalSettings(prev => ({
                                  ...prev,
                                  audienceSegments: prev.audienceSegments.filter(s => s !== segment),
                                }));
                              }}
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <Button onClick={handleSaveGlobalSettings} disabled={isSavingGlobal}>
                    {isSavingGlobal ? 'Saving...' : 'Save Global Settings'}
                  </Button>
                </CardContent>
              </Card>
            )}
            
            <ThemeSelector />
          </TabsContent>
        )}

        {canAccessSecurity && (
          <TabsContent value="permissions" className="space-y-4">
            <Security user={user} />
          </TabsContent>
        )}

        {canManageSettings && (
          <TabsContent value="project-wizards" className="space-y-4">
            <div className="mb-4">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Hammer className="h-6 w-6" />
                Project Wizard Settings
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Configure material defaults and settings for project planning tools
              </p>
            </div>
            
            {(user.role === 'super_admin' || user.role === 'admin') && (
              <ProjectWizardSettings 
                organizationId={user.organizationId}
                onSave={showAlert}
              />
            )}
          </TabsContent>
        )}

        <TabsContent value="diagnostics" className="space-y-4">
          <DataDiagnostic />
        </TabsContent>



        <TabsContent value="appearance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Appearance Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Theme</Label>
                <p className="text-sm text-gray-500">Choose your preferred theme</p>
                <ThemeSelector />
              </div>
              <div className="space-y-2">
                <Label>Language</Label>
                <p className="text-sm text-gray-500">Select your preferred language</p>
                <Button type="button" variant="outline">Manage Languages</Button>
              </div>
              <div className="space-y-2">
                <Label>Layout</Label>
                <p className="text-sm text-gray-500">Configure your dashboard layout</p>
                <Button type="button" variant="outline" onClick={() => setShowLayoutDialog(true)}>Configure Layout</Button>
              </div>
              <Button 
                type="button"
                onClick={handleSaveAppearanceSettings}
              >
                Save Appearance Settings
              </Button>
            </CardContent>
          </Card>

          {/* Planner Defaults Migration Status */}
          <PlannerDefaultsMigrationStatus 
            userId={user.id}
            organizationId={user.organizationId}
          />
        </TabsContent>

        {(userMode === 'single' || canManageSettings) && (
        <TabsContent value="billing" className="space-y-4">
          <SubscriptionBilling user={user} planRefreshKey={planRefreshKey} />
        </TabsContent>
        )}

        {isSuperAdmin && (
          <TabsContent value="billing-plans" className="space-y-4">
            <BillingPlanConfig user={user} onConfigSaved={() => setPlanRefreshKey((k) => k + 1)} />
          </TabsContent>
        )}

        {canManageSettings && (
          <TabsContent value="api-access" className="space-y-4">
            <ApiAccess user={user} hasAccess={subHasFeature('api-access')} />
          </TabsContent>
        )}
        {/* end tabs */}
      </Tabs>

      {alert && (
        <Alert className={`mt-4 ${alert.type === 'success' ? 'bg-green-50 border-green-200' : ''}`} variant={alert.type === 'error' ? 'destructive' : 'default'}>
          {alert.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <AlertDescription className={alert.type === 'success' ? 'text-green-800' : ''}>
            {alert.message}
          </AlertDescription>
        </Alert>
      )}

      {/* Layout Configuration Dialog */}
      <Dialog open={showLayoutDialog} onOpenChange={setShowLayoutDialog}>
        <DialogContent className="sm:max-w-[425px] max-h-[80vh] flex flex-col bg-white">
          <DialogHeader>
            <DialogTitle className="text-gray-900">Configure Layout</DialogTitle>
            <DialogDescription className="text-gray-600">
              Customize your dashboard layout to suit your workflow.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 overflow-y-auto pr-2">
            <div className="space-y-2">
              <Label htmlFor="dashboardDensity" className="text-gray-900 font-medium">Dashboard Density</Label>
              <Select
                value={layoutConfig.dashboardDensity}
                onValueChange={(value) => setLayoutConfig({ ...layoutConfig, dashboardDensity: value })}
              >
                <SelectTrigger id="dashboardDensity" className="bg-white border-gray-300 text-gray-900">
                  <SelectValue placeholder="Select dashboard density" className="text-gray-900" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="comfortable">Comfortable</SelectItem>
                  <SelectItem value="compact">Compact</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-600">
                Adjust the density of your dashboard to fit more or less information.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sidebarPosition" className="text-gray-900 font-medium">Sidebar Position</Label>
              <Select
                value={layoutConfig.sidebarPosition}
                onValueChange={(value) => setLayoutConfig({ ...layoutConfig, sidebarPosition: value })}
              >
                <SelectTrigger id="sidebarPosition" className="bg-white border-gray-300 text-gray-900">
                  <SelectValue placeholder="Select sidebar position" className="text-gray-900" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">Left</SelectItem>
                  <SelectItem value="right">Right</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-600">
                Choose where the sidebar should be positioned on your dashboard.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="moduleCardSize" className="text-gray-900 font-medium">Module Card Size</Label>
              <Select
                value={layoutConfig.moduleCardSize}
                onValueChange={(value) => setLayoutConfig({ ...layoutConfig, moduleCardSize: value })}
              >
                <SelectTrigger id="moduleCardSize" className="bg-white border-gray-300 text-gray-900">
                  <SelectValue placeholder="Select module card size" className="text-gray-900" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">Small</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="large">Large</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-600">
                Set the size of the module cards on your dashboard.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-gray-900 font-medium">Show Module Icons</Label>
                  <p className="text-xs text-gray-600">
                    Toggle the visibility of module icons on your dashboard.
                  </p>
                </div>
                <Switch
                  checked={layoutConfig.showModuleIcons}
                  onCheckedChange={(checked) => setLayoutConfig({ ...layoutConfig, showModuleIcons: checked })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-gray-900 font-medium">Compact Mode</Label>
                  <p className="text-xs text-gray-600">
                    Enable compact mode to reduce the space used by elements on your dashboard.
                  </p>
                </div>
                <Switch
                  checked={layoutConfig.compactMode}
                  onCheckedChange={(checked) => setLayoutConfig({ ...layoutConfig, compactMode: checked })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tableRowHeight" className="text-gray-900 font-medium">Table Row Height</Label>
              <Select
                value={layoutConfig.tableRowHeight}
                onValueChange={(value) => setLayoutConfig({ ...layoutConfig, tableRowHeight: value })}
              >
                <SelectTrigger id="tableRowHeight" className="bg-white border-gray-300 text-gray-900">
                  <SelectValue placeholder="Select table row height" className="text-gray-900" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">Small</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="large">Large</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-600">
                Set the height of the rows in tables on your dashboard.
              </p>
            </div>
          </div>
          <Button
            type="button"
            className="mt-4"
            onClick={() => setShowLayoutDialog(false)}
          >
            Save Layout Settings
          </Button>
        </DialogContent>
      </Dialog>
    </div>
    </PermissionGate>
  );
}