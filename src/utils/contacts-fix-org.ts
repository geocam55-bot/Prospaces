import { createClient } from './supabase/client';

const supabase = createClient();

/**
 * Fix organization_id mismatch by updating all contacts to match the current user's organization
 * This is needed when contacts are imported with the wrong organization_id
 */
export async function fixContactsOrganizationId() {
  console.log('🔧 === STARTING ORGANIZATION FIX ===');
  
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return {
        error: 'No authenticated user found',
        success: false
      };
    }
    
    const userOrgId = user.user_metadata?.organizationId;
    
    if (!userOrgId) {
      return {
        error: 'User does not have an organization ID',
        success: false
      };
    }
    
    console.log('👤 Current User:');
    console.log('  - Email:', user.email);
    console.log('  - Organization ID:', userOrgId);
    
    // First, let's use a direct database query to see what's actually in the table
    // We need to bypass RLS, which we can't do with the anon key
    // Instead, let's try to update all contacts to the user's org (this will only work if user is admin)
    
    console.log('🔧 Attempting to fix contacts organization_id...');
    
    // Try updating with a broad filter - this may not work due to RLS
    const { data: updatedContacts, error: updateError } = await supabase
      .from('contacts')
      .update({ organization_id: userOrgId })
      .neq('organization_id', userOrgId) // Only update if different
      .select();
    
    if (updateError) {
      console.error('❌ Update failed:', updateError);
      
      // If we can't update, it might be because RLS is preventing us from seeing the rows
      // Let's try a different approach - use the service role through a backend function
      return {
        error: `Cannot update contacts: ${updateError.message}. This likely means the contacts belong to a different organization and RLS is preventing access. You may need to use the Supabase dashboard to manually update the organization_id.`,
        success: false,
        updateError
      };
    }
    
    console.log('✅ Updated', updatedContacts?.length || 0, 'contacts to organization:', userOrgId);
    
    if (updatedContacts && updatedContacts.length > 0) {
      console.log('📊 Sample updated contacts:', updatedContacts.slice(0, 3).map(c => ({
        name: c.name,
        company: c.company,
        organization_id: c.organization_id
      })));
    }
    
    console.log('🔧 === FIX COMPLETE ===\n');
    
    return {
      success: true,
      updatedCount: updatedContacts?.length || 0,
      organizationId: userOrgId
    };
    
  } catch (error: any) {
    console.error('❌ Fix failed:', error);
    return {
      error: error.message,
      success: false
    };
  }
}

/**
 * Alternative approach: Create a SQL function in Supabase that can be called to fix org IDs
 * This would need to be run in the Supabase SQL editor:
 * 
 * CREATE OR REPLACE FUNCTION fix_contacts_organization_id(target_org_id TEXT)
 * RETURNS TABLE(updated_count INTEGER) AS $$
 * DECLARE
 *   count INTEGER;
 * BEGIN
 *   UPDATE contacts
 *   SET organization_id = target_org_id
 *   WHERE organization_id IS NULL OR organization_id != target_org_id;
 *   
 *   GET DIAGNOSTICS count = ROW_COUNT;
 *   RETURN QUERY SELECT count;
 * END;
 * $$ LANGUAGE plpgsql SECURITY DEFINER;
 */
