import { createClient } from './supabase/client';
import { projectId, publicAnonKey } from './supabase/info';
import { getServerHeaders } from './server-headers';

const supabase = createClient();

export interface ClientUser {
  id: string;
  email: string;
  name: string;
  role: string;
  organization_id: string;
  status: 'active' | 'invited' | 'inactive';
  last_login?: string;
  created_at: string;
}

/**
 * Simple, direct approach to get current user
 */
async function getCurrentUser() {
  try {
    // Get user directly from Supabase client
    // This is more robust than relying on a potentially unset global token
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      console.error('[users-client] User error:', error);
      return null;
    }
    
    return user;
  } catch (error: any) {
    // Only log actual errors, not "Failed to fetch" network glitches which are common
    if (error?.message !== 'Failed to fetch' && error?.message !== 'Load failed') {
      console.error('[users-client] Exception in getCurrentUser:', error);
    }
    return null;
  }
}

/**
 * Get the current user's access token for server calls
 */
async function getAccessToken(): Promise<string | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  } catch {
    return null;
  }
}

/**
 * Fetch profiles from the server-side API (bypasses RLS)
 */
async function fetchProfilesFromServer(accessToken: string): Promise<any[] | null> {
  try {
    const serverUrl = `https://${projectId}.supabase.co/functions/v1/make-server-8405be07/profiles`;

    const headers = await getServerHeaders();
    const response = await fetch(serverUrl, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const body = await response.text();
      console.error(`[users-client] Server profiles API error ${response.status}:`, body);
      return null;
    }

    const result = await response.json();
    console.log(`[users-client] Server returned ${result.profiles?.length || 0} profiles (source: ${result.source})`);
    return result.profiles || null;
  } catch (error: any) {
    if (error?.message !== 'Failed to fetch' && error?.message !== 'Load failed') {
      console.error('[users-client] Error calling server profiles API:', error);
    }
    return null;
  }
}

/**
 * Ensure the current user has a profile row (creates one if missing)
 */
async function ensureCurrentUserProfile(accessToken: string): Promise<void> {
  try {
    const serverUrl = `https://${projectId}.supabase.co/functions/v1/make-server-8405be07/profiles/ensure`;

    const headers = await getServerHeaders();
    const response = await fetch(serverUrl, {
      method: 'GET',
      headers,
    });

    if (response.ok) {
      const result = await response.json();
      if (result.created) {
        console.log('[users-client] Auto-created missing profile for current user');
      }
    }
  } catch (error: any) {
    // Non-critical — don't block the flow
    if (error?.message !== 'Failed to fetch' && error?.message !== 'Load failed') {
      console.warn('[users-client] Could not ensure profile:', error);
    }
  }
}

/**
 * Check if profiles table exists and is accessible
 */
async function checkProfilesTableExists(): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);
    
    // If no error, table exists and is accessible
    if (!error) {
      return true;
    }
    
    // These error codes mean table doesn't exist or isn't set up
    if (error.code === '42P01' || error.code === 'PGRST204' || error.code === 'PGRST205' || error.code === '42501') {
      return false;
    }
    
    // Other errors - assume table doesn't exist
    return false;
  } catch (error) {
    return false;
  }
}

/**
 * Get all users - tries server-side API first (bypasses RLS), falls back to direct query
 */
export async function getAllUsersClient(): Promise<{ users: ClientUser[] }> {
  try {
    console.log('[users-client] Starting getAllUsersClient...');
    
    // Get current user
    const user = await getCurrentUser();
    
    if (!user) {
      console.error('[users-client] Not authenticated');
      // Return empty array instead of throwing to prevent dashboard crashes
      return { users: [] };
    }

    const currentUserRole = user.user_metadata?.role || 'standard_user';
    const currentUserOrgId = user.user_metadata?.organizationId;
    
    console.log(`[users-client] Current user: ${user.email}, Role: ${currentUserRole}, Org: ${currentUserOrgId}`);

    // Always include current user as fallback data
    const currentUserData: ClientUser = {
      id: user.id,
      email: user.email!,
      name: user.user_metadata?.name || user.email!,
      role: currentUserRole,
      organization_id: currentUserOrgId,
      status: 'active',
      last_login: user.last_sign_in_at || undefined,
      created_at: user.created_at!,
    };

    // Check permissions
    if (currentUserRole !== 'super_admin' && currentUserRole !== 'admin' && currentUserRole !== 'director' && currentUserRole !== 'manager') {
      console.log('[users-client] Insufficient permissions — returning current user only');
      return { users: [currentUserData] };
    }

    // ── Strategy 1: Server-side API (bypasses RLS) ──
    const accessToken = await getAccessToken();
    if (accessToken) {
      // Ensure the current user has a profile row before querying
      await ensureCurrentUserProfile(accessToken);

      const serverProfiles = await fetchProfilesFromServer(accessToken);
      if (serverProfiles && serverProfiles.length > 0) {
        const usersMap = new Map<string, ClientUser>();
        // Add current user first (source of truth for auth data)
        usersMap.set(user.id, currentUserData);
        // Overlay with profile data
        serverProfiles.forEach((profile: any) => {
          usersMap.set(profile.id, {
            id: profile.id,
            email: profile.email,
            name: profile.name || profile.email,
            role: profile.role || 'standard_user',
            organization_id: profile.organization_id,
            status: profile.status || 'active',
            last_login: profile.last_login || undefined,
            created_at: profile.created_at,
          });
        });
        console.log(`[users-client] Returning ${usersMap.size} users (via server API)`);
        return { users: Array.from(usersMap.values()) };
      }
      console.log('[users-client] Server API returned no profiles — falling back to direct query');
    }

    // ── Strategy 2: Direct Supabase query (may be blocked by RLS) ──
    console.log('[users-client] Trying direct profiles query...');

    const profilesTableExists = await checkProfilesTableExists();
    if (!profilesTableExists) {
      console.log('[users-client] Profiles table not set up — returning current user only');
      return { users: [currentUserData] };
    }

    try {
      let query = supabase.from('profiles').select('*');
      
      // Filter by organization for regular admins and managers
      if (currentUserRole !== 'super_admin' && currentUserOrgId) {
        query = query.eq('organization_id', currentUserOrgId);
      }
      
      const { data: profiles, error } = await query;
      
      if (error) {
        console.error('[users-client] Error querying profiles:', error);
        return { users: [currentUserData] };
      }
      
      if (!profiles || profiles.length === 0) {
        console.warn('[users-client] Direct query returned 0 profiles (likely RLS blocking). Returning current user.');
        return { users: [currentUserData] };
      }

      // Build users array from profiles
      const usersMap = new Map<string, ClientUser>();
      usersMap.set(user.id, currentUserData);
      
      profiles.forEach((profile: any) => {
        usersMap.set(profile.id, {
          id: profile.id,
          email: profile.email,
          name: profile.name || profile.email,
          role: profile.role || 'standard_user',
          organization_id: profile.organization_id,
          status: profile.status || 'active',
          last_login: profile.last_login || undefined,
          created_at: profile.created_at,
        });
      });
      
      console.log(`[users-client] Returning ${usersMap.size} users (via direct query)`);
      return { users: Array.from(usersMap.values()) };
    } catch (error: any) {
      console.error('[users-client] Failed to query profiles:', error);
      return { users: [currentUserData] };
    }
  } catch (error: any) {
    // Only log actual errors, not "Failed to fetch" network glitches
    if (error?.message !== 'Failed to fetch' && error?.message !== 'Load failed') {
      console.error('[users-client] Error in getAllUsersClient:', error);
    }
    // Return empty array instead of throwing to be safe
    return { users: [] };
  }
}

/**
 * Invite a new user — creates a real Supabase Auth account via the server-side
 * admin API so the user can immediately sign in with a temporary password.
 */
export async function inviteUserClient(data: { email: string; name: string; role: string; organizationId?: string }) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      throw new Error('Not authenticated');
    }

    const currentUserRole = user.user_metadata?.role || 'standard_user';
    let currentUserOrgId = user.user_metadata?.organizationId;

    // FALLBACK: If metadata has invalid org ID, fetch from profiles table
    if (!currentUserOrgId || currentUserOrgId.match(/^org-[0-9]+$/)) {
      console.log('[users-client] Fetching org ID from profiles table...');
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('email', user.email)
        .single();
      
      if (profile?.organization_id) {
        currentUserOrgId = profile.organization_id;
        console.log('[users-client] Using org ID from profiles table:', currentUserOrgId);
      }
    }

    if (currentUserRole !== 'super_admin' && currentUserRole !== 'admin') {
      throw new Error('Forbidden: Insufficient permissions');
    }

    const orgId = data.organizationId || currentUserOrgId;

    if (!orgId) {
      throw new Error('Organization ID is required to invite users.');
    }

    // Generate a temporary password
    const tempPassword = generateTempPassword();

    console.log('[users-client] Calling server to create auth account for:', data.email);

    // Call the server endpoint to create a real Supabase Auth account
    const serverUrl = `https://${projectId}.supabase.co/functions/v1/make-server-8405be07/create-user`;

    const headers = await getServerHeaders();
    const response = await fetch(serverUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        email: data.email.toLowerCase(),
        name: data.name,
        role: data.role,
        organizationId: orgId,
        tempPassword,
      }),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      console.error('[users-client] Server error creating user:', result);
      throw new Error(result.error || 'Failed to create user account');
    }

    console.log('[users-client] User account created successfully:', result);

    return {
      user: {
        id: result.userId,
        email: data.email.toLowerCase(),
        name: data.name,
        role: data.role,
        organization_id: orgId,
        status: 'active',
      },
      tempPassword,
    };
  } catch (error: any) {
    console.error('[users-client] Error in inviteUserClient:', error);
    throw error;
  }
}

/**
 * Generate a secure temporary password
 */
function generateTempPassword(length: number = 14): string {
  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const digits = '0123456789';
  const special = '!@#$%&*';
  const all = lower + upper + digits + special;
  // Ensure at least one of each type
  let password = '';
  password += lower[Math.floor(Math.random() * lower.length)];
  password += upper[Math.floor(Math.random() * upper.length)];
  password += digits[Math.floor(Math.random() * digits.length)];
  password += special[Math.floor(Math.random() * special.length)];
  for (let i = 4; i < length; i++) {
    password += all[Math.floor(Math.random() * all.length)];
  }
  // Shuffle
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

/**
 * Update a user
 */
export async function updateUserClient(id: string, updates: Partial<ClientUser>) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      throw new Error('Not authenticated');
    }

    // Check if profiles table exists
    const profilesTableExists = await checkProfilesTableExists();
    
    if (!profilesTableExists) {
      throw new Error('Profiles table not set up. Please run the database migration first.');
    }

    // Update in profiles table
    const { data: profile, error } = await supabase
      .from('profiles')
      .update({
        name: updates.name,
        email: updates.email,
        role: updates.role,
        organization_id: updates.organization_id,
        status: updates.status,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[users-client] Error updating user:', error);
      throw new Error('Failed to update user: ' + error.message);
    }

    return { user: profile };
  } catch (error: any) {
    console.error('[users-client] Error in updateUserClient:', error);
    throw error;
  }
}

/**
 * Delete a user
 */
export async function deleteUserClient(id: string) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      throw new Error('Not authenticated');
    }

    if (user.id === id) {
      throw new Error('Cannot delete yourself');
    }

    // Check if profiles table exists
    const profilesTableExists = await checkProfilesTableExists();
    
    if (!profilesTableExists) {
      throw new Error('Profiles table not set up. Please run the database migration first.');
    }

    // Delete from profiles table
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[users-client] Error deleting user:', error);
      throw new Error('Failed to delete user: ' + error.message);
    }

    return { success: true };
  } catch (error: any) {
    console.error('[users-client] Error in deleteUserClient:', error);
    throw error;
  }
}

/**
 * Reset user password
 * Sends a password reset email to the user using Supabase's built-in flow
 */
export async function resetPasswordClient(userId: string, newPassword: string) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      throw new Error('Not authenticated');
    }

    const currentUserRole = user.user_metadata?.role || 'standard_user';
    
    // Check permissions
    if (currentUserRole !== 'super_admin' && currentUserRole !== 'admin') {
      throw new Error('Forbidden: Insufficient permissions');
    }

    // Check if profiles table exists
    const profilesTableExists = await checkProfilesTableExists();
    
    if (!profilesTableExists) {
      throw new Error('Profiles table not set up. Please run the database migration first.');
    }

    // Get the target user's email
    const { data: targetProfile, error: profileFetchError } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', userId)
      .single();

    if (profileFetchError || !targetProfile) {
      throw new Error('User not found');
    }

    // Store the temporary password and flag in profiles table
    const { data: profile, error } = await supabase
      .from('profiles')
      .update({
        temp_password: newPassword,
        temp_password_created_at: new Date().toISOString(),
        needs_password_change: true, // Flag that user must change password on next login
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('[users-client] Error storing temporary password:', error);
      throw new Error('Failed to reset password: ' + error.message);
    }

    console.log('[users-client] Temporary password stored for user:', userId);
    console.log('[users-client] User must use this password to sign in, then will be prompted to change it');
    return { success: true, password: newPassword, email: targetProfile.email };
  } catch (error: any) {
    console.error('[users-client] Error in resetPasswordClient:', error);
    throw error;
  }
}