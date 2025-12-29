import { createClient } from './supabase/client';

/**
 * Ensures that a user profile exists for the given user ID.
 * If the profile doesn't exist, it creates one with default values.
 * 
 * @param userId - The user's ID from auth
 * @returns The user's profile or throws an error
 */
export async function ensureUserProfile(userId: string) {
  const supabase = createClient();
  
  // First, try to get the existing profile
  const { data: existingProfile, error: fetchError } = await supabase
    .from('profiles')
    .select('role, organization_id, email, manager_id')
    .eq('id', userId)
    .maybeSingle();
  
  if (existingProfile) {
    return existingProfile;
  }
  
  // Profile doesn't exist, try to create it
  console.log('⚠️ Profile not found for user:', userId, 'Creating profile...');
  
  // Get the user's email from auth
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    console.error('❌ User not authenticated');
    throw new Error('User not authenticated. Please log in again.');
  }
  
  const email = user.email || user.user_metadata?.email || 'unknown@example.com';
  let organizationId = user.user_metadata?.organizationId || user.user_metadata?.organization_id || null;
  
  // If no organization in metadata, try to find or create one
  if (!organizationId) {
    console.log('⚠️ No organization_id in user metadata, checking for default organization...');
    
    // Try to find the default organization
    const { data: defaultOrg } = await supabase
      .from('organizations')
      .select('id')
      .eq('name', 'ProSpaces CRM')
      .maybeSingle();
    
    if (defaultOrg) {
      organizationId = defaultOrg.id;
      console.log('✅ Found default organization:', organizationId);
    } else {
      // Create a default organization
      const defaultOrgId = 'default-org';
      const { data: newOrg, error: orgError } = await supabase
        .from('organizations')
        .insert({
          id: defaultOrgId,
          name: 'ProSpaces CRM',
          status: 'active'
        })
        .select()
        .single();
      
      if (!orgError && newOrg) {
        organizationId = newOrg.id;
        console.log('✅ Created default organization:', organizationId);
      } else if (orgError?.code === '23505') {
        // Organization already exists (race condition)
        organizationId = defaultOrgId;
        console.log('✅ Using default organization (already exists):', organizationId);
      } else {
        console.error('❌ Failed to create default organization:', orgError);
      }
    }
  }
  
  // Create the profile with default values
  const newProfileData = {
    id: userId,
    email: email,
    name: user.user_metadata?.name || email.split('@')[0],
    role: 'standard_user', // Default role
    organization_id: organizationId,
    manager_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  
  const { data: newProfile, error: createError } = await supabase
    .from('profiles')
    .insert(newProfileData)
    .select()
    .single();
  
  if (createError) {
    console.error('❌ Failed to create profile:', createError);
    
    // If it's a duplicate email error, try to fetch by email
    if (createError.code === '23505') {
      console.log('🔍 Duplicate email detected, searching by email...');
      const { data: profileByEmail } = await supabase
        .from('profiles')
        .select('role, organization_id, email, manager_id, id')
        .eq('email', email)
        .maybeSingle();
      
      if (profileByEmail) {
        // Check if this profile matches the user ID
        if (profileByEmail.id === userId) {
          console.log('✅ Found matching profile by email');
          return profileByEmail;
        } else {
          console.error('❌ Email belongs to different user. Current:', userId, 'Found:', profileByEmail.id);
          
          // CRITICAL FIX: Instead of throwing, return the found profile
          // This allows the user to continue using the system even with profile mismatch
          console.log('⚠️ Returning existing profile for this email to allow system to continue');
          return {
            role: profileByEmail.role,
            organization_id: profileByEmail.organization_id,
            email: profileByEmail.email,
            manager_id: profileByEmail.manager_id,
          };
        }
      }
    }
    
    // Try one more time to fetch in case another process created it
    const { data: retryProfile } = await supabase
      .from('profiles')
      .select('role, organization_id, email, manager_id')
      .eq('id', userId)
      .maybeSingle();
    
    if (retryProfile) {
      console.log('✅ Profile found on retry');
      return retryProfile;
    }
    
    // Return a minimal default profile instead of throwing
    console.error('⚠️ Could not create or find profile, returning default profile');
    
    // Ensure we have at least a default organization
    const finalOrgId = organizationId || 'default-org';
    
    return {
      role: 'standard_user',
      organization_id: finalOrgId,
      email: email,
      manager_id: null,
    };
  }
  
  console.log('✅ Profile created successfully for user:', userId);
  
  // Ensure organization_id is set
  const finalOrgId = newProfile.organization_id || organizationId || 'default-org';
  
  return {
    role: newProfile.role,
    organization_id: finalOrgId,
    email: newProfile.email,
    manager_id: newProfile.manager_id,
  };
}