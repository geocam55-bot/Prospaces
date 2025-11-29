import { createClient } from './supabase/client';

const supabase = createClient();

/**
 * Sync the current user's profile to the profiles table
 * This ensures that when a user logs in, their profile exists in the database
 */
export async function syncCurrentUserProfile() {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.log('[syncProfile] No active session, skipping profile sync');
      return { success: false, error: 'Not authenticated' };
    }

    console.log(`[syncProfile] Syncing profile for user: ${user.email}`);

    // First check if a profile with this email exists but different ID
    const { data: existingProfile, error: checkError } = await supabase
      .from('profiles')
      .select('id, email, name, role, organization_id')
      .eq('email', user.email)
      .maybeSingle();

    if (!checkError && existingProfile && existingProfile.id !== user.id) {
      console.warn('[syncProfile] ⚠️ Profile exists with different ID');
      console.warn('[syncProfile] Auth User ID:', user.id);
      console.warn('[syncProfile] Existing Profile ID:', existingProfile.id);
      console.warn('[syncProfile] This needs to be fixed in the database. Run FIX_MATT_PROFILE_DUPLICATE.sql');
      
      // Try to update the existing profile to match the auth user ID
      const { data: updatedProfile, error: updateError } = await supabase
        .from('profiles')
        .update({
          id: user.id,
          updated_at: new Date().toISOString(),
        })
        .eq('email', user.email)
        .select()
        .maybeSingle();

      if (updateError) {
        console.error('[syncProfile] ❌ Failed to update profile ID:', updateError);
        console.log('[syncProfile] Returning existing profile to allow app to continue');
        return { success: true, profile: existingProfile, warning: 'Profile ID mismatch' };
      }

      console.log('[syncProfile] ✅ Profile ID updated successfully');
      return { success: true, profile: updatedProfile };
    }

    // Prepare profile data
    const profileData = {
      id: user.id,
      email: user.email,
      name: user.user_metadata?.name || user.email,
      role: user.user_metadata?.role || 'standard_user',
      organization_id: user.user_metadata?.organizationId,
      status: 'active',
      created_at: user.created_at,
      updated_at: new Date().toISOString(),
    };

    // Upsert to profiles table (insert or update if exists)
    const { data, error } = await supabase
      .from('profiles')
      .upsert(profileData, {
        onConflict: 'id',
        ignoreDuplicates: false,
      })
      .select()
      .single();

    if (error) {
      // Handle duplicate email error (23505)
      if (error.code === '23505') {
        console.warn('[syncProfile] ⚠️ Duplicate email constraint violation');
        console.warn('[syncProfile] This should have been caught earlier. Trying to fetch existing profile...');
        
        const { data: fallbackProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('email', user.email)
          .maybeSingle();
        
        if (fallbackProfile) {
          console.log('[syncProfile] ✅ Found existing profile, returning it');
          return { success: true, profile: fallbackProfile, warning: 'Used existing profile' };
        }
      }
      
      // Silently log error - profile sync is non-critical
      console.debug('[syncProfile] Error upserting profile:', error);
      
      // If table doesn't exist, that's okay - we'll rely on localStorage
      if (error.code === '42P01' || error.code === 'PGRST204' || error.code === 'PGRST205') {
        console.debug('[syncProfile] Profiles table does not exist yet - skipping sync');
        return { success: false, error: 'Table does not exist' };
      }
      
      // Silently fail on other errors - profile sync is non-critical
      return { success: false, error: error.message };
    }

    console.log('[syncProfile] ✅ Profile synced successfully:', data);
    return { success: true, profile: data };
  } catch (error: any) {
    // Catch all errors including network/timeout errors
    // Silently log - don't show to user as this is non-critical
    console.debug('[syncProfile] Unexpected error:', error);
    
    // Don't re-throw - profile sync is non-critical
    // This prevents "Failed to send a request to the Edge Function" from bubbling up
    return { success: false, error: error.message || 'Unknown error' };
  }
}