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
  console.log('[settings-client] 💾 Upserting organization settings');
  
  try {
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
      if (error.code === 'PGRST205' || error.code === '42P01') {
        console.warn('[settings-client] ⚠️ organization_settings table does not exist. Please run the SQL setup script.');
        return null;
      }
      console.error('[settings-client] ❌ Error upserting organization settings:', error);
      return null;
    }

    console.log('[settings-client] ✅ Organization settings saved successfully');
    return data;
  } catch (error) {
    console.error('[settings-client] ❌ Unexpected error upserting organization settings:', error);
    return null;
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
 * Update user profile (name and picture)
 */
export async function updateUserProfileClient(userId: string, updates: { name?: string; profile_picture?: string }): Promise<void> {
  console.log('[settings-client] 💾 Updating user profile');
  
  const { error } = await supabase
    .from('profiles')
    .update({
      ...(updates.name && { name: updates.name }),
      ...(updates.profile_picture !== undefined && { profile_picture: updates.profile_picture }),
    })
    .eq('id', userId);

  if (error) {
    console.error('[settings-client] ❌ Error updating user profile:', error);
    throw error;
  }

  console.log('[settings-client] ✅ User profile updated successfully');
}