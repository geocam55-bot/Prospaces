import { createClient } from './supabase/client';

/**
 * Creates an auth user for an existing profile
 * This fixes cases where a profile exists but the auth.users record doesn't
 */
export async function createAuthUserForProfile(email: string, password: string = 'TempPassword123!') {
  const supabase = createClient();
  
  try {
    console.log(`🔧 Creating auth user for: ${email}`);
    
    // First check if profile exists
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
      .single();
    
    if (profileError || !profile) {
      throw new Error(`Profile not found for email: ${email}`);
    }
    
    console.log('✅ Profile found:', profile.name, 'Role:', profile.role);
    
    // Check if auth user already exists
    const { data: { user: existingUser } } = await supabase.auth.admin.getUserByEmail(email);
    
    if (existingUser) {
      console.log('⚠️ Auth user already exists with ID:', existingUser.id);
      
      // Update profile to use the correct auth user ID
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ id: existingUser.id })
        .eq('email', email);
      
      if (updateError) {
        console.error('❌ Failed to update profile ID:', updateError);
        throw updateError;
      }
      
      console.log('✅ Profile ID updated to match auth user');
      return { user: existingUser, created: false };
    }
    
    // Create new auth user using the profile's ID
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: profile.name,
          organizationId: profile.organization_id,
          role: profile.role,
        },
        emailRedirectTo: undefined, // Don't send confirmation email in dev
      }
    });
    
    if (error) {
      console.error('❌ Failed to create auth user:', error);
      throw error;
    }
    
    console.log('✅ Auth user created successfully!');
    console.log('📧 Email:', email);
    console.log('🔑 Password:', password);
    console.log('👤 User ID:', data.user?.id);
    
    // Update the profile to use the new auth user ID
    if (data.user) {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ id: data.user.id })
        .eq('email', email);
      
      if (updateError) {
        console.error('⚠️ Warning: Failed to update profile ID:', updateError);
      } else {
        console.log('✅ Profile ID updated to match auth user');
      }
    }
    
    return { user: data.user, created: true };
  } catch (error) {
    console.error('❌ Error in createAuthUserForProfile:', error);
    throw error;
  }
}

// Run this directly if needed
if (typeof window !== 'undefined' && (window as any).__CREATE_LARRY_USER__) {
  createAuthUserForProfile('larry.lee@ronaatlantic.ca')
    .then(result => {
      console.log('✅ Done!', result);
      alert(`User ${result.created ? 'created' : 'found'}! Password: TempPassword123!`);
    })
    .catch(error => {
      console.error('❌ Failed:', error);
      alert(`Failed to create user: ${error.message}`);
    });
}
