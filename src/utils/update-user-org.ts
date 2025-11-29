import { createClient } from './supabase/client';
import { getAccessToken } from './api';

/**
 * Temporary utility to update a user's organization
 * 
 * Run in browser console:
 * updateUserOrg('new-organization-id')
 */
export async function updateUserOrg(newOrgId: string) {
  console.log('🔄 Updating user organization...\n');
  
  const supabase = createClient();
  
  try {
    // Get current user
    const token = getAccessToken();
    if (!token) {
      console.error('❌ No access token found. Please log in first.');
      return;
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      console.error('❌ Could not get current user:', userError);
      return;
    }

    console.log(`📋 Current user: ${user.email}`);
    console.log(`📋 Current organization: ${user.user_metadata?.organizationId || 'none'}`);
    console.log(`📋 New organization: ${newOrgId}\n`);

    // Update the user's metadata
    const { data: updatedUser, error: updateError } = await supabase.auth.updateUser({
      data: {
        ...user.user_metadata,
        organizationId: newOrgId
      }
    });

    if (updateError) {
      console.error('❌ Failed to update user metadata:', updateError);
      return;
    }

    // Update the profiles table
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ organization_id: newOrgId })
      .eq('id', user.id);

    if (profileError) {
      console.error('⚠️ Warning: Could not update profiles table:', profileError);
      console.log('   User metadata was updated, but profile may be out of sync');
    } else {
      console.log('✅ Updated profiles table');
    }

    console.log('\n✅ Organization updated successfully!');
    console.log('🔄 Please refresh the page to see changes.');
    console.log('\nTo refresh: location.reload()');
    
    return updatedUser;
  } catch (error: any) {
    console.error('❌ Update failed:', error.message);
    return null;
  }
}

/**
 * List all available organizations/tenants
 */
export async function listOrganizations() {
  console.log('📋 Fetching all organizations...\n');
  
  const supabase = createClient();
  
  try {
    const { data: tenants, error } = await supabase
      .from('tenants')
      .select('id, name, status')
      .order('name');

    if (error) {
      console.error('❌ Failed to fetch organizations:', error);
      return;
    }

    if (!tenants || tenants.length === 0) {
      console.log('⚠️ No organizations found');
      return;
    }

    console.log(`Found ${tenants.length} organization(s):\n`);
    tenants.forEach((tenant, index) => {
      const statusIcon = tenant.status === 'active' ? '✅' : '⏸️';
      console.log(`${index + 1}. ${statusIcon} ${tenant.name}`);
      console.log(`   ID: ${tenant.id}`);
      console.log(`   Status: ${tenant.status}\n`);
    });

    console.log('To update your organization, run:');
    console.log('updateUserOrg("organization-id-here")');
    
    return tenants;
  } catch (error: any) {
    console.error('❌ Failed to list organizations:', error.message);
    return null;
  }
}

/**
 * Get current user's organization
 */
export async function getCurrentOrg() {
  const supabase = createClient();
  
  try {
    const token = getAccessToken();
    if (!token) {
      console.error('❌ No access token found');
      return;
    }

    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      console.error('❌ Could not get current user:', error);
      return;
    }

    const orgId = user.user_metadata?.organizationId;
    console.log(`📋 Current user: ${user.email}`);
    console.log(`📋 Organization ID: ${orgId || 'none'}`);
    
    if (orgId) {
      // Try to get org details
      const { data: tenant } = await supabase
        .from('tenants')
        .select('id, name, status')
        .eq('id', orgId)
        .single();
      
      if (tenant) {
        console.log(`📋 Organization Name: ${tenant.name}`);
        console.log(`📋 Status: ${tenant.status}`);
      }
    }
    
    return { userId: user.id, email: user.email, organizationId: orgId };
  } catch (error: any) {
    console.error('❌ Failed:', error.message);
    return null;
  }
}

// Auto-load into window
if (typeof window !== 'undefined') {
  (window as any).updateUserOrg = updateUserOrg;
  (window as any).listOrganizations = listOrganizations;
  (window as any).getCurrentOrg = getCurrentOrg;
  console.log('🔧 Organization tools loaded!');
  console.log('   • getCurrentOrg() - View current organization');
  console.log('   • listOrganizations() - List all organizations');
  console.log('   • updateUserOrg("org-id") - Update your organization');
}
