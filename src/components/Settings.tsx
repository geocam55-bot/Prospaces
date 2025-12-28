import { useState, useEffect } from 'react';
import { toast } from 'sonner@2.0.3';
import { Security } from './Security';
import { TestDataGenerator } from './TestDataGenerator';
import { ThemeSelector } from './ThemeSelector';
import { FindLarryContacts } from './FindLarryContacts';
import { BidsTableMigration } from './BidsTableMigration';
import { ThemeMigration } from './ThemeMigration';
import { FullCRMDatabaseSetup } from './FullCRMDatabaseSetup';
import { OrganizationFeatureMigration } from './OrganizationFeatureMigration';
import { ProjectWizardSettings } from './ProjectWizardSettings';
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
  AlertCircle 
} from 'lucide-react';
import type { User } from '../App';
import { tenantsAPI, settingsAPI } from '../utils/api';

interface SettingsProps {
  user: User;
  onUserUpdate?: (updatedUser: User) => void;
}

export function Settings({ user, onUserUpdate }: SettingsProps) {
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
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    taskAssignments: true,
    appointments: true,
    bids: false,
  });

  // Global Organization Settings
  const [globalSettings, setGlobalSettings] = useState({
    taxRate: 0,
    taxRate2: 0,
    defaultPriceLevel: 'Retail',
    quoteTerms: 'Payment due within 30 days. All prices in USD.',
  });

  // Load settings from Supabase on mount
  useEffect(() => {
    loadSettingsFromSupabase();
  }, [user.id, user.organizationId]);

  const loadSettingsFromSupabase = async () => {
    try {
      setIsLoading(true);
      let tablesExist = true;

      // Load user preferences
      const userPrefs = await settingsAPI.getUserPreferences(user.id, user.organizationId);
      if (userPrefs === null) {
        // Check console for warnings about missing tables
        const consoleWarnings = console.warn.toString();
        if (consoleWarnings.includes('table does not exist')) {
          tablesExist = false;
        }
      }
      
      if (userPrefs) {
        setNotifications({
          email: userPrefs.notifications_email,
          push: userPrefs.notifications_push,
          taskAssignments: userPrefs.notifications_task_assignments,
          appointments: userPrefs.notifications_appointments,
          bids: userPrefs.notifications_bids,
        });
        
        // Load profile picture from Supabase
        if (userPrefs.profile_picture) {
          setProfileData(prev => ({ ...prev, profilePicture: userPrefs.profile_picture || '' }));
        }
      } else {
        // Fallback to localStorage for user preferences
        loadSettingsFromLocalStorage();
      }

      // Load organization settings
      const orgSettings = await settingsAPI.getOrganizationSettings(user.organizationId);
      if (orgSettings) {
        setGlobalSettings({
          taxRate: orgSettings.tax_rate,
          taxRate2: orgSettings.tax_rate_2 || 0,
          defaultPriceLevel: orgSettings.default_price_level,
          quoteTerms: orgSettings.quote_terms || 'Payment due within 30 days. All prices in USD.',
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
          const parsedSettings = JSON.parse(stored);
          setGlobalSettings({
            taxRate: parsedSettings.taxRate || 0,
            taxRate2: parsedSettings.taxRate2 || 0,
            defaultPriceLevel: parsedSettings.defaultPriceLevel || 'Retail',
            quoteTerms: parsedSettings.quoteTerms || 'Payment due within 30 days. All prices in USD.',
          });
        }
        
        // Try to get org name from organizations table
        try {
          const { tenant } = await tenantsAPI.getById(user.organizationId);
          if (tenant) {
            setOrgName(tenant.name);
          }
        } catch (err) {
          console.log('[Settings] Could not load organization name');
        }
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
    const orgId = localStorage.getItem('currentOrgId') || user.organizationId;
    const stored = localStorage.getItem(`global_settings_${orgId}`);
    if (stored) {
      const parsedSettings = JSON.parse(stored);
      setGlobalSettings({
        taxRate: parsedSettings.taxRate || 0,
        defaultPriceLevel: parsedSettings.defaultPriceLevel || 'Retail',
      });
    }
    
    // Load profile picture from localStorage as fallback
    const storedPicture = localStorage.getItem(`profile_picture_${user.id}`);
    if (storedPicture) {
      setProfileData(prev => ({ ...prev, profilePicture: storedPicture }));
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
          // Save to Supabase user preferences
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

          // Also update Supabase profiles table
          await settingsAPI.updateUserProfile(user.id, {
            profile_picture: base64String,
          });
          
          // Keep localStorage as backup
          localStorage.setItem(`profile_picture_${user.id}`, base64String);
          
          if (onUserUpdate) {
            const updatedUser: User = {
              ...user,
              profilePicture: base64String,
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
      
      // Remove from Supabase
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

      await settingsAPI.updateUserProfile(user.id, {
        profile_picture: '',
      });
      
      // Remove from localStorage
      localStorage.removeItem(`profile_picture_${user.id}`);
      
      if (onUserUpdate) {
        const updatedUser: User = {
          ...user,
          profilePicture: undefined,
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
      // Save to Supabase profiles table - include both name AND profile picture
      const updateData: { name: string; profile_picture?: string } = {
        name: profileData.name,
      };
      
      // Include profile picture if it exists
      if (profileData.profilePicture) {
        updateData.profile_picture = profileData.profilePicture;
      }
      
      await settingsAPI.updateUserProfile(user.id, updateData);
      
      // Also update user preferences to keep everything in sync
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
      
      if (onUserUpdate) {
        const updatedUser: User = {
          ...user,
          name: profileData.name,
          profilePicture: profileData.profilePicture || undefined,
        };
        onUserUpdate(updatedUser);
      }
      
      showAlert('success', 'Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      showAlert('error', 'Failed to update profile');
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
  const canAccessSecurity = user.role === 'super_admin' || user.role === 'admin';

  return (
    <div className="p-6 space-y-6">
      <Tabs defaultValue="profile" className="w-full">
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <TabsList className="inline-flex w-auto min-w-full lg:grid lg:w-full lg:grid-cols-6">
            <TabsTrigger value="profile" className="whitespace-nowrap px-3 sm:px-4 text-xs sm:text-sm">Profile</TabsTrigger>
            <TabsTrigger value="notifications" className="whitespace-nowrap px-3 sm:px-4 text-xs sm:text-sm">Notifications</TabsTrigger>
            {canManageSettings && <TabsTrigger value="organization" className="whitespace-nowrap px-3 sm:px-4 text-xs sm:text-sm">Organization</TabsTrigger>}
            {canAccessSecurity && <TabsTrigger value="permissions" className="whitespace-nowrap px-3 sm:px-4 text-xs sm:text-sm">Permissions</TabsTrigger>}
            <TabsTrigger value="appearance" className="whitespace-nowrap px-3 sm:px-4 text-xs sm:text-sm">Appearance</TabsTrigger>
            {canManageSettings && <TabsTrigger value="testdata" className="whitespace-nowrap px-3 sm:px-4 text-xs sm:text-sm">Test Data</TabsTrigger>}
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
                  <Label>Bid Updates</Label>
                  <p className="text-sm text-gray-500">Updates on bid status changes</p>
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
                    <Button type="button" variant="outline">Manage Custom Fields</Button>
                  </div>
                  <div className="space-y-2">
                    <Label>Workflows</Label>
                    <p className="text-sm text-gray-500">Configure automated workflows and statuses</p>
                    <Button type="button" variant="outline">Configure Workflows</Button>
                  </div>
                  <Button type="submit" disabled={isSavingOrg}>
                    {isSavingOrg ? 'Saving...' : 'Save Organization Settings'}
                  </Button>
                </form>
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
                        <SelectItem value="Standard">Standard</SelectItem>
                        <SelectItem value="Premium">Premium</SelectItem>
                        <SelectItem value="Wholesale">Wholesale</SelectItem>
                        <SelectItem value="Retail">Retail</SelectItem>
                        <SelectItem value="Contractor">Contractor</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500">
                      This price level will be used as default when creating new bids and quotes
                    </p>
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

                  <Button onClick={handleSaveGlobalSettings} disabled={isSavingGlobal}>
                    {isSavingGlobal ? 'Saving...' : 'Save Global Settings'}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Project Wizard Settings Card */}
            {(user.role === 'super_admin' || user.role === 'admin') && (
              <ProjectWizardSettings 
                organizationId={user.organizationId}
                onSave={showAlert}
              />
            )}
          </TabsContent>
        )}

        {canAccessSecurity && (
          <TabsContent value="permissions" className="space-y-4">
            <Security user={user} />
          </TabsContent>
        )}

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
                <Button type="button" variant="outline">Configure Layout</Button>
              </div>
              <Button 
                type="button"
                onClick={handleSaveAppearanceSettings}
              >
                Save Appearance Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {canManageSettings && (
          <TabsContent value="testdata" className="space-y-4">
            <BidsTableMigration />
            
            <TestDataGenerator />
            
            {/* Diagnostic Tool for Finding Lost Contacts */}
            <FindLarryContacts />
            
            {/* Full CRM Database Setup */}
            <FullCRMDatabaseSetup />
            
            {/* Organization Feature Migration */}
            <OrganizationFeatureMigration />
            
            {/* Theme Migration */}
            <ThemeMigration />
          </TabsContent>
        )}
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
    </div>
  );
}