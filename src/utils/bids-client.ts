import { createClient } from './supabase/client';
import { ensureUserProfile } from './ensure-profile';

const supabase = createClient();

export async function getAllBidsClient() {
  try {
    // Try to get user, with fallback to session
    let authUser;
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      // Fallback: check if there's a session
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        authUser = session.user;
        console.log('✅ Using session user for bids (getUser failed)');
      } else {
        // Silently return empty during initial load
        return { bids: [] };
      }
    } else {
      authUser = user;
    }

    // Get user's profile to check their role
    let profile;
    try {
      profile = await ensureUserProfile(authUser.id);
    } catch (profileError) {
      console.error('❌ Failed to get user profile:', profileError);
      // Return empty array instead of throwing - this prevents "Error" in dashboard
      return { bids: [] };
    }

    const userRole = profile.role;
    const userOrgId = profile.organization_id;

    console.log('🔐 Bids - Current user:', profile.email, 'Role:', userRole, 'Organization:', userOrgId);
    
    // Try to query bids table with related data
    // NOTE: Defensive query - don't join if relationships don't exist yet
    let query = supabase
      .from('bids')
      .select('*');
    
    // Apply role-based filtering
    if (userRole === 'super_admin') {
      // Super Admin: Can see all bids
      console.log('🔓 Super Admin - Loading all bids');
      // Include NULL organization_ids for backwards compatibility
      // query = query; // no filter needed
    } else if (userRole === 'admin') {
      // Admin: Can ONLY see their own bids (Team Dashboard shows team data)
      console.log('🔒 Admin - Loading own bids only (strict filtering)');
      query = query.or(`organization_id.eq.${userOrgId},organization_id.is.null`).eq('created_by', authUser.id);
    } else if (userRole === 'manager') {
      // Manager: Can ONLY see their own bids (Team Dashboard shows team data)
      console.log('👔 Manager - Loading own bids only (strict filtering)');
      query = query.or(`organization_id.eq.${userOrgId},organization_id.is.null`).eq('created_by', authUser.id);
    } else if (userRole === 'marketing') {
      // Marketing: Can see all bids within their organization (for campaigns)
      console.log('📢 Marketing - Loading bids for organization:', userOrgId);
      query = query.or(`organization_id.eq.${userOrgId},organization_id.is.null`);
    } else {
      // Standard User: Can ONLY see their own bids
      console.log('👤 Standard User - Loading only own bids');
      query = query.or(`organization_id.eq.${userOrgId},organization_id.is.null`);
      query = query.eq('created_by', authUser.id);
    }
    
    const { data: bids, error } = await query;
    
    if (error) {
      // If table doesn't exist, return empty array
      if (error.code === '42P01' || error.code === 'PGRST204' || error.code === '42501') {
        console.log('[bids-client] Bids table not found, returning empty array');
        return { bids: [] };
      }
      throw error;
    }
    
    console.log('📊 Bids filtered data - Total rows:', bids?.length || 0);
    
    return { bids: bids || [] };
  } catch (error: any) {
    console.error('[bids-client] Error:', error.message);
    return { bids: [] };
  }
}

export async function getBidsByOpportunityClient(opportunityId: string) {
  // ⚠️ NOTE: The contacts table does NOT have account_owner_number or created_by columns.
  // This function only queries organization_id which DOES exist.
  // If you need to add contact-based filtering, verify the column exists first!
  // See /docs/DATABASE_SCHEMA_NOTES.md for details.
  
  try {
    console.log('[getBidsByOpportunityClient] Starting query for opportunity:', opportunityId);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('Not authenticated');
    }

    // Get user's profile to check their role
    const profile = await ensureUserProfile(user.id);

    const userRole = profile.role;
    const userOrgId = profile.organization_id;

    console.log('[getBidsByOpportunityClient] User:', profile.email, 'Role:', userRole, 'Organization:', userOrgId);
    
    // IMPORTANT: When viewing bids for a specific opportunity, we need to check
    // if the user has access to the opportunity/contact first, THEN show ALL bids for that opportunity
    
    // First, get the opportunity to check which contact it belongs to
    const { data: opportunity, error: oppError } = await supabase
      .from('opportunities')
      .select('id, customer_id, organization_id')
      .eq('id', opportunityId)
      .maybeSingle();
    
    if (oppError || !opportunity) {
      console.log('[getBidsByOpportunityClient] ❌ Opportunity not found or access denied');
      return { bids: [] };
    }
    
    // Check if user has access to this opportunity's contact
    if (opportunity.customer_id) {
      const { data: contact } = await supabase
        .from('contacts')
        .select('id, owner_id, organization_id')
        .eq('id', opportunity.customer_id)
        .maybeSingle();
      
      if (contact) {
        const hasContactAccess = 
          userRole === 'super_admin' || // Super admin sees everything
          (userRole === 'admin' && contact.organization_id === userOrgId) || // Admin sees org contacts
          (userRole === 'marketing' && contact.organization_id === userOrgId) || // Marketing sees org contacts
          (userRole === 'manager' && contact.organization_id === userOrgId) || // Manager sees org contacts
          (userRole === 'standard_user' && contact.organization_id === userOrgId); // Standard user sees org contacts (since they own the opportunity)
        
        if (!hasContactAccess) {
          console.log('[getBidsByOpportunityClient] ❌ User does not have access to this contact');
          return { bids: [] };
        }
      }
    }
    
    console.log('[getBidsByOpportunityClient] ✅ User has access - loading ALL bids for this opportunity');
    
    // Get ALL bids for this opportunity (no user ownership filtering)
    // Since we've already verified contact/opportunity access, show all bids for this opportunity
    // Filter by the opportunity's organization to ensure data isolation at the org level
    let query = supabase
      .from('bids')
      .select('*')
      .eq('opportunity_id', opportunityId);
    
    // Filter by the opportunity's organization_id to ensure data isolation
    // This ensures we only show bids that belong to the same organization as the opportunity
    if (userRole !== 'super_admin' && opportunity.organization_id) {
      console.log('[getBidsByOpportunityClient] Applying org filter for opportunity org:', opportunity.organization_id);
      query = query.or(`organization_id.eq.${opportunity.organization_id},organization_id.is.null`);
    } else if (userRole !== 'super_admin') {
      // Fallback to user's org if opportunity doesn't have an org
      console.log('[getBidsByOpportunityClient] Applying org filter for user org:', userOrgId);
      query = query.or(`organization_id.eq.${userOrgId},organization_id.is.null`);
    } else {
      console.log('[getBidsByOpportunityClient] Super admin - no org filter applied');
    }
    
    const { data: bids, error } = await query;
    
    console.log('[getBidsByOpportunityClient] Query result:', { bidsCount: bids?.length, error });
    if (bids && bids.length > 0) {
      console.log('[getBidsByOpportunityClient] Bid titles:', bids.map(b => b.title));
      console.log('[getBidsByOpportunityClient] Bid org IDs:', bids.map(b => ({ title: b.title, org_id: b.organization_id })));
      console.log('[getBidsByOpportunityClient] First bid full data:', bids[0]);
    } else {
      console.log('[getBidsByOpportunityClient] ⚠️ No bids found. Debugging info:');
      console.log('  - Opportunity ID searched:', opportunityId);
      console.log('  - User org ID:', userOrgId);
      console.log('  - Opportunity org ID:', opportunity.organization_id);
      
      // Try to fetch all bids without filters to see what exists
      const { data: allBids } = await supabase.from('bids').select('id, title, opportunity_id, organization_id').limit(10);
      console.log('  - Sample of ALL bids in database (first 10):', allBids);
    }
    
    if (error) {
      console.error('[getBidsByOpportunityClient] Error loading bids for opportunity:', error);
      return { bids: [] };
    }
    
    console.log('[getBidsByOpportunityClient] Successfully loaded', bids?.length || 0, 'bids');
    return { bids: bids || [] };
  } catch (error: any) {
    console.error('[getBidsByOpportunityClient] Error:', error.message);
    return { bids: [] };
  }
}

export async function createBidClient(data: any) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('Not authenticated');
    }

    const organizationId = user.user_metadata?.organizationId;
    
    // Map fields and handle line items
    const { items, opportunityId, validUntil, projectManagerId, ...rest } = data;
    
    const bidData: any = {
      ...rest,
      opportunity_id: opportunityId,
      valid_until: validUntil,
      project_manager_id: projectManagerId || null,
      organization_id: organizationId,
      created_by: user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    // Store items as line_items JSON if provided
    if (items && Array.isArray(items)) {
      bidData.line_items = items;
    }
    
    console.log('[bids-client] Creating bid with data:', bidData);
    console.log('[bids-client] Opportunity ID being set:', bidData.opportunity_id);
    console.log('[bids-client] Organization ID being set:', bidData.organization_id);
    
    const { data: bid, error } = await supabase
      .from('bids')
      .insert([bidData])
      .select()
      .single();
    
    if (error) {
      console.error('[bids-client] ❌ Error creating bid:', error);
      throw error;
    }
    
    console.log('[bids-client] ✅ Bid created successfully:', bid);
    console.log('[bids-client] Saved opportunity_id:', bid.opportunity_id);
    console.log('[bids-client] Saved organization_id:', bid.organization_id);
    
    return { bid };
  } catch (error: any) {
    console.error('[bids-client] Error creating bid:', error.message);
    throw error;
  }
}

export async function updateBidClient(id: string, data: any) {
  try {
    // Explicitly exclude fields that don't exist in the database schema
    const { 
      items, 
      line_items,
      opportunityId, 
      validUntil, 
      projectManagerId,
      ...rest 
    } = data;
    
    // Build update data with only fields that should be in the database
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };
    
    // Map known fields from camelCase to snake_case
    if (data.title !== undefined) updateData.title = data.title;
    if (data.amount !== undefined) updateData.amount = data.amount;
    if (data.status !== undefined) updateData.status = data.status;
    if (opportunityId !== undefined) updateData.opportunity_id = opportunityId;
    if (validUntil !== undefined) updateData.valid_until = validUntil;
    if (projectManagerId !== undefined) updateData.project_manager_id = projectManagerId;
    
    // Include optional fields that might exist in the database schema
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.subtotal !== undefined) updateData.subtotal = data.subtotal;
    if (data.tax_rate !== undefined) updateData.tax_rate = data.tax_rate;
    if (data.tax_percent !== undefined) updateData.tax_percent = data.tax_percent;
    if (data.tax_amount !== undefined) updateData.tax_amount = data.tax_amount;
    if (data.total !== undefined) updateData.total = data.total;
    if (data.discount_percent !== undefined) updateData.discount_percent = data.discount_percent;
    if (data.discount_amount !== undefined) updateData.discount_amount = data.discount_amount;
    
    // Store items as line_items JSON if provided
    if (items && Array.isArray(items)) {
      updateData.line_items = items;
    }
    
    console.log('[bids-client] Updating bid with data:', updateData);
    
    const { data: bid, error } = await supabase
      .from('bids')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    return { bid };
  } catch (error: any) {
    console.error('[bids-client] Error updating bid:', error.message);
    throw error;
  }
}

export async function deleteBidClient(id: string) {
  try {
    const { error } = await supabase
      .from('bids')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    return { success: true };
  } catch (error: any) {
    console.error('[bids-client] Error deleting bid:', error.message);
    throw error;
  }
}

// Fix organization IDs for bids that have NULL organization_id
export async function fixBidOrganizationIds() {
  try {
    console.log('[fixBidOrganizationIds] Starting to fix NULL organization IDs...');
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('Not authenticated');
    }

    const organizationId = user.user_metadata?.organizationId;
    console.log('[fixBidOrganizationIds] Current user organization ID:', organizationId);
    
    if (!organizationId) {
      throw new Error('No organization ID found for user');
    }
    
    // First, let's see how many bids have NULL organization_id
    const { data: nullBids, error: queryError } = await supabase
      .from('bids')
      .select('*')
      .is('organization_id', null);
    
    console.log('[fixBidOrganizationIds] Bids with NULL organization_id:', nullBids);
    console.log('[fixBidOrganizationIds] Query error:', queryError);
    
    if (queryError) {
      console.error('[fixBidOrganizationIds] Error querying NULL bids:', queryError);
    }
    
    // Update all bids with NULL organization_id to the current user's organization
    const { data, error } = await supabase
      .from('bids')
      .update({ organization_id: organizationId })
      .is('organization_id', null)
      .select();
    
    console.log('[fixBidOrganizationIds] Update result:', { data, error });
    
    if (error) {
      console.error('[fixBidOrganizationIds] Update error details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      throw error;
    }
    
    console.log('[fixBidOrganizationIds] Fixed organization IDs for', data?.length || 0, 'bids');
    return { count: data?.length || 0, bids: data };
  } catch (error: any) {
    console.error('[fixBidOrganizationIds] Error fixing organization IDs:', error.message);
    console.error('[fixBidOrganizationIds] Full error:', error);
    throw error;
  }
}