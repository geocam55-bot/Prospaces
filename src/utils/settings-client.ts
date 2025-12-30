import { createClient } from './supabase/client';

const supabase = createClient();

export interface UserPreferences {
  user_id: string;
  organization_id: string;
  notifications_email: boolean;
  notifications_push: boolean;
  notifications_task_assignments: boolean;
  notifications_appointments: boolean;
  notifications_bids: boolean;
  profile_picture?: string;
  created_at?: string;
  updated_at?: string;
}

export interface OrganizationSettings {
  organization_id: string;
  tax_rate: number;
  tax_rate_2: number;
  default_price_level: string;
  quote_terms: string;
  organization_name?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Get user preferences from Supabase
 */
export async function getUserPreferencesClient(userId: string, organizationId: string): Promise<UserPreferences | null> {
  console.log('[settings-client] 📊 Fetching user preferences for user:', userId);
  
  try {
    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No preferences found, return null
        console.log('[settings-client] ℹ️ No preferences found for user:', userId);
        return null;
      }
      if (error.code === 'PGRST205' || error.code === '42P01') {
        // Table doesn't exist
        console.warn('[settings-client] ⚠️ user_preferences table does not exist yet. Please run the SQL setup script.');
        return null;
      }
      console.error('[settings-client] ❌ Error fetching user preferences:', error);
      return null;
    }

    console.log('[settings-client] ✅ User preferences fetched successfully');
    return data;
  } catch (error) {
    console.error('[settings-client] ❌ Unexpected error fetching user preferences:', error);
    return null;
  }
}

/**
 * Upsert user preferences to Supabase
 */
export async function upsertUserPreferencesClient(preferences: Partial<UserPreferences>): Promise<UserPreferences | null> {
  console.log('[settings-client] 💾 Upserting user preferences');
  
  try {
    const { data, error } = await supabase
      .from('user_preferences')
      .upsert({
        ...preferences,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,organization_id'
      })
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST205' || error.code === '42P01') {
        console.warn('[settings-client] ⚠️ user_preferences table does not exist. Please run the SQL setup script.');
        return null;
      }
      if (error.code === '42501') {
        // RLS policy violation - silently fall back to localStorage (expected behavior)
        return null;
      }
      console.error('[settings-client] ❌ Error upserting user preferences:', error);
      return null;
    }

    console.log('[settings-client] ✅ User preferences saved successfully');
    return data;
  } catch (error) {
    console.error('[settings-client] ❌ Unexpected error upserting user preferences:', error);
    return null;
  }
}

/**
 * Get organization settings from Supabase
 */
export async function getOrganizationSettingsClient(organizationId: string): Promise<OrganizationSettings | null> {
  console.log('[settings-client] 📊 Fetching organization settings for org:', organizationId);
  
  try {
    const { data, error } = await supabase
      .from('organization_settings')
      .select('*')
      .eq('organization_id', organizationId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No settings found, return null
        console.log('[settings-client] ℹ️ No settings found for organization:', organizationId);
        return null;
      }
      if (error.code === 'PGRST205' || error.code === '42P01') {
        // Table doesn't exist
        console.warn('[settings-client] ⚠️ organization_settings table does not exist yet. Please run the SQL setup script.');
        return null;
      }
      console.error('[settings-client] ❌ Error fetching organization settings:', error);
      return null;
    }

    console.log('[settings-client] ✅ Organization settings fetched successfully');
    return data;
  } catch (error) {
    console.error('[settings-client] ❌ Unexpected error fetching organization settings:', error);
    return null;
  }
}

/**
 * Upsert organization settings to Supabase
 */
export async function upsertOrganizationSettingsClient(settings: Partial<OrganizationSettings>): Promise<OrganizationSettings | null> {
  console.log('[settings-client] 💾 Upserting organization settings:', settings);
  
  try {
    // First, verify the user is authenticated and has the right role
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error('[settings-client] ❌ User not authenticated');
      throw new Error('You must be logged in to update organization settings');
    }

    // Check user profile and role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, organization_id')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('[settings-client] ❌ Error fetching user profile:', profileError);
      throw new Error('Could not verify user permissions');
    }

    console.log('[settings-client] 👤 User profile:', { role: profile?.role, org: profile?.organization_id });

    if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
      console.error('[settings-client] ❌ User does not have admin permissions. Role:', profile?.role);
      throw new Error('You must be an admin or super admin to update organization settings');
    }

    if (settings.organization_id && settings.organization_id !== profile.organization_id) {
      console.error('[settings-client] ❌ User cannot modify settings for different organization');
      throw new Error('You can only update settings for your own organization');
    }

    const { data, error } = await supabase
      .from('organization_settings')
      .upsert({
        ...settings,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'organization_id'
      })
      .select()
      .single();

    if (error) {
      console.error('[settings-client] ❌ Supabase error details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });

      if (error.code === 'PGRST205' || error.code === '42P01') {
        console.warn('[settings-client] ⚠️ organization_settings table does not exist. Please run the SQL setup script.');
        throw new Error('Database tables not set up. Please contact your administrator.');
      }
      if (error.code === '42501') {
        console.error('[settings-client] ❌ RLS policy violation - checking diagnostics...');
        console.error('[settings-client] 📋 User ID:', user.id);
        console.error('[settings-client] 📋 User Role:', profile?.role);
        console.error('[settings-client] 📋 Organization ID:', settings.organization_id);
        throw new Error(`Permission denied. Please ensure:\n1. Your role is 'admin' or 'super_admin'\n2. You are updating your own organization's settings\n3. The RLS policies are properly configured (run SUPABASE_FIX_ORG_SETTINGS_RLS_V3.sql)`);
      }
      
      throw new Error(error.message || 'Failed to save organization settings');
    }

    console.log('[settings-client] ✅ Organization settings saved successfully:', data);
    return data;
  } catch (error: any) {
    console.error('[settings-client] ❌ Error in upsertOrganizationSettingsClient:', error);
    throw error;
  }
}

/**
 * Update organization name
 */
export async function updateOrganizationNameClient(organizationId: string, name: string): Promise<void> {
  console.log('[settings-client] 💾 Updating organization name');
  
  const { error } = await supabase
    .from('organizations')
    .update({ name })
    .eq('id', organizationId);

  if (error) {
    console.error('[settings-client] ❌ Error updating organization name:', error);
    throw error;
  }

  console.log('[settings-client] ✅ Organization name updated successfully');
}

/**
 * Update user profile (name only)
 */
export async function updateUserProfileClient(userId: string, updates: { name?: string; avatar_url?: string }): Promise<void> {
  console.log('[settings-client] 💾 Updating user profile', { userId, updates });
  
  try {
    const updateData: any = {};
    if (updates.name) updateData.name = updates.name;
    // Note: We don't update avatar_url here anymore - use user_preferences.profile_picture instead
    
    if (Object.keys(updateData).length === 0) {
      console.log('[settings-client] ℹ️ No updates to apply');
      return;
    }
    
    const { data, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('[settings-client] ❌ Error updating user profile:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        updateData
      });
      
      // Provide more specific error messages
      if (error.code === '42703') {
        throw new Error('Database column not found. The profiles table may need to be updated.');
      } else if (error.code === '42501') {
        throw new Error('Permission denied. You may not have access to update your profile.');
      } else if (error.code === 'PGRST116') {
        throw new Error('Profile not found. Please try logging out and back in.');
      } else {
        throw new Error(error.message || 'Failed to update profile');
      }
    }

    console.log('[settings-client] ✅ User profile updated successfully:', data);
  } catch (error: any) {
    console.error('[settings-client] ❌ Unexpected error updating user profile:', error);
    throw error;
  }
}