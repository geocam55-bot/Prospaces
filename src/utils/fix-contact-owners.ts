import { createClient } from './supabase/client';

/**
 * Fixes contacts that have organization_id but missing or incorrect owner_id
 * This is a one-time fix for contacts imported via CSV or created before owner_id was properly set
 */
export async function fixContactOwners() {
  try {
    const supabase = createClient();
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Not authenticated');
    }
    
    // Get user's profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (profileError || !profile) {
      throw new Error('Failed to get user profile');
    }
    
    const userOrgId = profile.organization_id;
    const userRole = profile.role;
    
    console.log('🔧 Fix Contact Owners');
    console.log('👤 User:', profile.email);
    console.log('🏢 Organization:', userOrgId);
    console.log('🎭 Role:', userRole);
    
    // Check contacts without owner_id in this organization
    const { data: contactsWithoutOwner, error: checkError } = await supabase
      .from('contacts')
      .select('id, name, company, owner_id, organization_id')
      .eq('organization_id', userOrgId)
      .is('owner_id', null);
    
    if (checkError) {
      console.error('❌ Error checking contacts:', checkError);
      throw checkError;
    }
    
    console.log(`📊 Found ${contactsWithoutOwner?.length || 0} contacts without owner_id`);
    
    if (!contactsWithoutOwner || contactsWithoutOwner.length === 0) {
      console.log('✅ All contacts already have owner_id set');
      return {
        success: true,
        message: 'All contacts already have owner_id set',
        updated: 0
      };
    }
    
    // Update all contacts without owner_id to current user
    const { data: updated, error: updateError } = await supabase
      .from('contacts')
      .update({ owner_id: user.id })
      .eq('organization_id', userOrgId)
      .is('owner_id', null)
      .select();
    
    if (updateError) {
      console.error('❌ Error updating contacts:', updateError);
      throw updateError;
    }
    
    console.log(`✅ Updated ${updated?.length || 0} contacts with owner_id = ${user.id}`);
    
    return {
      success: true,
      message: `Successfully updated ${updated?.length || 0} contacts`,
      updated: updated?.length || 0
    };
  } catch (error: any) {
    console.error('❌ Error fixing contact owners:', error);
    throw error;
  }
}

/**
 * Assigns all contacts in the organization to the current user
 * Use this if you're the admin and want to claim all contacts
 */
export async function claimAllOrganizationContacts() {
  try {
    const supabase = createClient();
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Not authenticated');
    }
    
    // Get user's profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (profileError || !profile) {
      throw new Error('Failed to get user profile');
    }
    
    const userOrgId = profile.organization_id;
    const userRole = profile.role;
    
    // Only admins can claim all contacts
    if (userRole !== 'admin' && userRole !== 'super_admin') {
      throw new Error('Only admins can claim all organization contacts');
    }
    
    console.log('🔧 Claim All Organization Contacts');
    console.log('👤 User:', profile.email);
    console.log('🏢 Organization:', userOrgId);
    console.log('🎭 Role:', userRole);
    
    // Get all contacts in organization
    const { data: allContacts, error: checkError } = await supabase
      .from('contacts')
      .select('id, name, company, owner_id, organization_id')
      .eq('organization_id', userOrgId);
    
    if (checkError) {
      console.error('❌ Error checking contacts:', checkError);
      throw checkError;
    }
    
    console.log(`📊 Found ${allContacts?.length || 0} contacts in organization`);
    
    if (!allContacts || allContacts.length === 0) {
      console.log('⚠️ No contacts found in organization');
      return {
        success: true,
        message: 'No contacts found in organization',
        updated: 0
      };
    }
    
    // Update ALL contacts in organization to current user
    const { data: updated, error: updateError } = await supabase
      .from('contacts')
      .update({ owner_id: user.id })
      .eq('organization_id', userOrgId)
      .select();
    
    if (updateError) {
      console.error('❌ Error updating contacts:', updateError);
      throw updateError;
    }
    
    console.log(`✅ Claimed ${updated?.length || 0} contacts for ${profile.email}`);
    
    return {
      success: true,
      message: `Successfully claimed ${updated?.length || 0} contacts`,
      updated: updated?.length || 0
    };
  } catch (error: any) {
    console.error('❌ Error claiming contacts:', error);
    throw error;
  }
}

// Make functions available in browser console for debugging
if (typeof window !== 'undefined') {
  (window as any).fixContactOwners = fixContactOwners;
  (window as any).claimAllOrganizationContacts = claimAllOrganizationContacts;
}
