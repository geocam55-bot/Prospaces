import { createClient } from './supabase/client';
import { projectId, publicAnonKey } from './supabase/info';
import { getServerHeaders } from './server-headers';

const supabase = createClient();

const SERVER_BASE = `https://${projectId}.supabase.co/functions/v1/server/make-server-8405be07`;

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
  audience_segments?: string[]; // Marketing audience segments
  price_tier_labels?: Record<string, string>; // May not exist as a DB column yet
  created_at?: string;
  updated_at?: string;
}

// Fields that may not exist as columns in the organization_settings table.
// These are stripped before upsert to avoid PGRST204 errors,
// and are handled via localStorage fallback instead.
const OPTIONAL_NON_DB_FIELDS = ['price_tier_labels'];

// ─── GET user preferences ──────────────────────────────────────────────────

export async function getUserPreferencesClient(userId: string, organizationId: string): Promise<UserPreferences | null> {
  console.log('[settings-client] 📊 Fetching user preferences for user:', userId);

  if (!userId || !organizationId) {
    console.warn('[settings-client] ⚠️ Missing userId or organizationId', { userId, organizationId });
    return null;
  }

  // Try server endpoint first (bypasses RLS)
  try {
    const headers = await getServerHeaders();
    const res = await fetch(
      `${SERVER_BASE}/settings/user-preferences?user_id=${encodeURIComponent(userId)}&organization_id=${encodeURIComponent(organizationId)}`,
      { headers }
    );
    if (res.ok) {
      const json = await res.json();
      console.log('[settings-client] ✅ User preferences fetched via server');
      return json.preferences || null;
    }
    console.warn('[settings-client] ⚠️ Server returned', res.status, '- falling back to direct Supabase');
  } catch (err) {
    console.warn('[settings-client] ⚠️ Server endpoint failed, falling back:', err);
  }

  // Fallback: direct Supabase query
  try {
    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        console.log('[settings-client] ℹ️ No preferences found for user:', userId);
        return null;
      }
      if (error.code === 'PGRST205' || error.code === '42P01') {
        console.warn('[settings-client] ⚠️ user_preferences table does not exist yet.');
        return null;
      }
      console.error('[settings-client] ❌ Error fetching user preferences:', error);
      return null;
    }

    console.log('[settings-client] ✅ User preferences fetched via direct Supabase');
    return data;
  } catch (error) {
    console.error('[settings-client] ❌ Unexpected error fetching user preferences:', error);
    return null;
  }
}

// ─── UPSERT user preferences ──────────────────────────────────────────────

export async function upsertUserPreferencesClient(preferences: Partial<UserPreferences>): Promise<UserPreferences | null> {
  console.log('[settings-client] 💾 Upserting user preferences');

  // Try server endpoint first (bypasses RLS)
  try {
    const headers = await getServerHeaders();
    const res = await fetch(`${SERVER_BASE}/settings/user-preferences`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(preferences),
    });
    if (res.ok) {
      const json = await res.json();
      console.log('[settings-client] ✅ User preferences saved via server');
      return json.preferences || null;
    }
    const errBody = await res.text();
    console.warn('[settings-client] ⚠️ Server upsert user prefs returned', res.status, errBody, '- falling back');
  } catch (err) {
    console.warn('[settings-client] ⚠️ Server endpoint failed for user prefs upsert, falling back:', err);
  }

  // Fallback: direct Supabase
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
        console.warn('[settings-client] ⚠️ user_preferences table does not exist.');
        return null;
      }
      if (error.code === '42501') {
        // RLS policy violation - silently fall back to localStorage (expected behavior)
        console.warn('[settings-client] ⚠️ RLS blocked user prefs upsert (both server & direct failed)');
        return null;
      }
      console.error('[settings-client] ❌ Error upserting user preferences:', error);
      return null;
    }

    console.log('[settings-client] ✅ User preferences saved via direct Supabase');
    return data;
  } catch (error) {
    console.error('[settings-client] ❌ Unexpected error upserting user preferences:', error);
    return null;
  }
}

// ─── GET organization settings ─────────────────────────────────────────────

export async function getOrganizationSettingsClient(organizationId: string): Promise<OrganizationSettings | null> {
  console.log('[settings-client] 📊 Fetching organization settings for org:', organizationId);

  // Try server endpoint first (bypasses RLS)
  try {
    const headers = await getServerHeaders();
    const res = await fetch(
      `${SERVER_BASE}/settings/organization?organization_id=${encodeURIComponent(organizationId)}`,
      { headers }
    );
    if (res.ok) {
      const json = await res.json();
      console.log('[settings-client] ✅ Organization settings fetched via server');
      return json.settings || null;
    }
    console.warn('[settings-client] ⚠️ Server returned', res.status, '- falling back to direct Supabase');
  } catch (err) {
    console.warn('[settings-client] ⚠️ Server endpoint failed, falling back:', err);
  }

  // Fallback: direct Supabase query
  try {
    const { data, error } = await supabase
      .from('organization_settings')
      .select('*')
      .eq('organization_id', organizationId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        console.log('[settings-client] ℹ️ No settings found for organization:', organizationId);
        return null;
      }
      if (error.code === 'PGRST205' || error.code === '42P01') {
        console.warn('[settings-client] ⚠️ organization_settings table does not exist yet.');
        return null;
      }
      console.error('[settings-client] ❌ Error fetching organization settings:', error);
      return null;
    }

    console.log('[settings-client] ✅ Organization settings fetched via direct Supabase');
    return data;
  } catch (error) {
    console.error('[settings-client] ❌ Unexpected error fetching organization settings:', error);
    return null;
  }
}

// ─── UPSERT organization settings ──────────────────────────────────────────

export async function upsertOrganizationSettingsClient(settings: Partial<OrganizationSettings>): Promise<OrganizationSettings | null> {
  console.log('[settings-client] 💾 Upserting organization settings:', settings);

  // Try server endpoint first (bypasses RLS) — this is the primary path
  try {
    const headers = await getServerHeaders();
    const res = await fetch(`${SERVER_BASE}/settings/organization`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(settings),
    });

    if (res.ok) {
      const json = await res.json();
      console.log('[settings-client] ✅ Organization settings saved via server');
      return json.settings || null;
    }

    const errBody = await res.json().catch(() => ({ error: 'Unknown server error' }));
    console.warn('[settings-client] ⚠️ Server upsert org settings returned', res.status, errBody);

    // If server returned 403 (permission), surface it clearly
    if (res.status === 403) {
      throw new Error(errBody.error || 'Permission denied by server');
    }
    // For other server errors, fall through to direct Supabase
  } catch (err: any) {
    // If it's a permission error from the server, rethrow
    if (err?.message?.includes('Permission denied') || err?.message?.includes('admin')) {
      throw err;
    }
    console.warn('[settings-client] ⚠️ Server endpoint failed for org settings upsert, falling back:', err);
  }

  // Fallback: direct Supabase (may hit RLS — that's expected in some environments)
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('You must be logged in to update organization settings');
    }

    // Strip out any fields that may not exist in the DB
    const dbSettings = { ...settings };
    OPTIONAL_NON_DB_FIELDS.forEach(field => {
      if (field in dbSettings) {
        delete dbSettings[field];
      }
    });

    const { data, error } = await supabase
      .from('organization_settings')
      .upsert({
        ...dbSettings,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'organization_id'
      })
      .select()
      .single();

    if (error) {
      console.error('[settings-client] ❌ Direct Supabase upsert error:', {
        code: error.code,
        message: error.message,
      });

      if (error.code === '42501') {
        throw new Error('Permission denied. The server endpoint also failed. Settings could not be saved to the database.');
      }
      throw new Error(error.message || 'Failed to save organization settings');
    }

    console.log('[settings-client] ✅ Organization settings saved via direct Supabase');
    return data;
  } catch (error: any) {
    console.error('[settings-client] ❌ Error in upsertOrganizationSettingsClient:', error);
    throw error;
  }
}

// ─── Update organization name ──────────────────────────────────────────────

export async function updateOrganizationNameClient(organizationId: string, name: string): Promise<void> {
  console.log('[settings-client] 💾 Updating organization name');

  // Try server endpoint first
  try {
    const headers = await getServerHeaders();
    const res = await fetch(`${SERVER_BASE}/settings/organization-name`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ organization_id: organizationId, name }),
    });

    if (res.ok) {
      console.log('[settings-client] ✅ Organization name updated via server');
      return;
    }
    console.warn('[settings-client] ⚠️ Server returned', res.status, 'for org name update - falling back');
  } catch (err) {
    console.warn('[settings-client] ⚠️ Server endpoint failed for org name update, falling back:', err);
  }

  // Fallback: direct Supabase
  const { error } = await supabase
    .from('organizations')
    .update({ name })
    .eq('id', organizationId);

  if (error) {
    console.error('[settings-client] ❌ Error updating organization name:', error);
    throw error;
  }

  console.log('[settings-client] ✅ Organization name updated via direct Supabase');
}

// ─── Update user profile ──────────────────────────────────────────────────

export async function updateUserProfileClient(userId: string, updates: { name?: string; avatar_url?: string }): Promise<void> {
  console.log('[settings-client] 💾 Updating user profile', { userId, updates });

  // Try server endpoint first
  try {
    const headers = await getServerHeaders();
    const res = await fetch(`${SERVER_BASE}/settings/profile`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ user_id: userId, ...updates }),
    });

    if (res.ok) {
      console.log('[settings-client] ✅ User profile updated via server');
      return;
    }
    console.warn('[settings-client] ⚠️ Server returned', res.status, 'for profile update - falling back');
  } catch (err) {
    console.warn('[settings-client] ⚠️ Server endpoint failed for profile update, falling back:', err);
  }

  // Fallback: direct Supabase
  try {
    const updateData: any = {};
    if (updates.name) updateData.name = updates.name;

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

    console.log('[settings-client] ✅ User profile updated via direct Supabase:', data);
  } catch (error: any) {
    console.error('[settings-client] ❌ Unexpected error updating user profile:', error);
    throw error;
  }
}