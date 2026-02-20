import { createClient } from './supabase/client';
import { ensureUserProfile } from './ensure-profile';
import { projectId, publicAnonKey } from './supabase/info';
import { getServerHeaders } from './server-headers';

const supabase = createClient();

export async function getAllBidsClient(scope: 'personal' | 'team' = 'personal') {
  // ── Attempt 1: Server-side endpoint (bypasses RLS) ──
  try {
    const headers = await getServerHeaders();
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-8405be07/bids?scope=${scope}`,
      { headers }
    );

    if (response.ok) {
      const data = await response.json();
      console.log(`[bids-client] Server endpoint returned ${data.bids?.length || 0} bids (role=${data.meta?.role})`);
      return { bids: data.bids || [] };
    }

    console.warn('[bids-client] Server endpoint failed, falling back to direct query:', response.status, response.statusText);
  } catch (err: any) {
    console.warn('[bids-client] Server endpoint error, falling back to direct query:', err.message);
  }

  // ── Attempt 2: Direct Supabase query (may be blocked by RLS) ──
  try {
    let authUser;
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        authUser = session.user;
        console.log('✅ Using session user for bids (getUser failed)');
      } else {
        return { bids: [] };
      }
    } else {
      authUser = user;
    }

    let profile;
    try {
      profile = await ensureUserProfile(authUser.id);
    } catch (profileError) {
      console.error('❌ Failed to get user profile:', profileError);
      return { bids: [] };
    }

    const userRole = profile.role;
    const userOrgId = profile.organization_id;

    console.log('🔐 Bids (fallback) - Current user:', profile.email, 'Role:', userRole, 'Organization:', userOrgId, 'Scope:', scope);
    
    let query = supabase
      .from('bids')
      .select('*');
    
    if (scope === 'personal') {
      // Personal scope: ALL roles see only their own bids
      if (userRole === 'super_admin') {
        // no filter
      } else {
        if (userOrgId) {
          query = query.or(`organization_id.eq.${userOrgId},organization_id.is.null`);
        }
        query = query.eq('created_by', authUser.id);
      }
    } else {
      // Team scope: role-based filtering
      if (['super_admin', 'admin', 'director', 'manager', 'marketing'].includes(userRole)) {
        if (userOrgId) {
          query = query.or(`organization_id.eq.${userOrgId},organization_id.is.null`);
        }
      } else {
        if (userOrgId) {
          query = query.or(`organization_id.eq.${userOrgId},organization_id.is.null`);
        }
        query = query.eq('created_by', authUser.id);
      }
    }
    
    const { data: bids, error } = await query;
    
    if (error) {
      if (error.code === '42P01' || error.code === 'PGRST204' || error.code === '42501') {
        console.log('[bids-client] Bids table not found, returning empty array');
        return { bids: [] };
      }
      throw error;
    }
    
    return { bids: bids || [] };
  } catch (error: any) {
    console.error('[bids-client] Error:', error.message);
    return { bids: [] };
  }
}

export async function getBidsByOpportunityClient(opportunityId: string) {
  try {
    console.log('[getBidsByOpportunityClient] Starting query for opportunity:', opportunityId);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('Not authenticated');
    }

    const profile = await ensureUserProfile(user.id);

    const userRole = profile.role;
    const userOrgId = profile.organization_id;

    console.log('[getBidsByOpportunityClient] User:', profile.email, 'Role:', userRole, 'Organization:', userOrgId);
    
    const { data: opportunity, error: oppError } = await supabase
      .from('opportunities')
      .select('id, customer_id, organization_id')
      .eq('id', opportunityId)
      .maybeSingle();
    
    if (oppError || !opportunity) {
      console.log('[getBidsByOpportunityClient] ❌ Opportunity not found or access denied');
      return { bids: [] };
    }
    
    if (opportunity.customer_id) {
      const { data: contact } = await supabase
        .from('contacts')
        .select('id, owner_id, organization_id')
        .eq('id', opportunity.customer_id)
        .maybeSingle();
      
      if (contact) {
        const hasContactAccess = 
          userRole === 'super_admin' ||
          (['admin', 'marketing', 'director', 'manager', 'standard_user'].includes(userRole) && contact.organization_id === userOrgId);
        
        if (!hasContactAccess) {
          console.log('[getBidsByOpportunityClient] ❌ User does not have access to this contact');
          return { bids: [] };
        }
      }
    }
    
    let query = supabase
      .from('bids')
      .select('*')
      .eq('opportunity_id', opportunityId);
    
    if (userRole !== 'super_admin' && opportunity.organization_id) {
      query = query.or(`organization_id.eq.${opportunity.organization_id},organization_id.is.null`);
    } else if (userRole !== 'super_admin') {
      query = query.or(`organization_id.eq.${userOrgId},organization_id.is.null`);
    }
    
    const { data: bids, error } = await query;
    
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
  // ── Attempt 1: Server-side endpoint (bypasses RLS, authoritative org ID) ──
  try {
    const headers = await getServerHeaders();
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-8405be07/bids`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
      }
    );

    if (response.ok) {
      const result = await response.json();
      console.log('[bids-client] Bid created via server endpoint:', result.bid?.id);
      return { bid: result.bid };
    }

    const errBody = await response.text();
    console.warn('[bids-client] Server create failed, falling back to direct insert:', response.status, errBody);
  } catch (err: any) {
    console.warn('[bids-client] Server create error, falling back to direct insert:', err.message);
  }

  // ── Attempt 2: Direct Supabase insert (fallback) ──
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('Not authenticated');
    }

    // FIXED: Always get organization_id from profile (authoritative source),
    // NOT from user.user_metadata which can be stale/mismatched
    let organizationId: string | null = null;

    try {
      const profile = await ensureUserProfile(user.id);
      organizationId = profile.organization_id;
      console.log('[bids-client] Retrieved organization_id from profile:', organizationId);
    } catch (profileError) {
      console.warn('[bids-client] Failed to fetch profile, falling back to metadata:', profileError);
      organizationId = user.user_metadata?.organizationId || null;
    }
    
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
    
    if (items && Array.isArray(items)) {
      bidData.line_items = items;
    }
    
    console.log('[bids-client] Creating bid (fallback) with org:', organizationId);
    
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
    return { bid };
  } catch (error: any) {
    console.error('[bids-client] Error creating bid:', error.message);
    throw error;
  }
}

export async function updateBidClient(id: string, data: any) {
  try {
    const { 
      items, 
      line_items,
      opportunityId, 
      validUntil, 
      projectManagerId,
      ...rest 
    } = data;
    
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };
    
    if (data.title !== undefined) updateData.title = data.title;
    if (data.amount !== undefined) updateData.amount = data.amount;
    if (data.status !== undefined) updateData.status = data.status;
    if (opportunityId !== undefined) updateData.opportunity_id = opportunityId;
    if (validUntil !== undefined) updateData.valid_until = validUntil;
    if (projectManagerId !== undefined) updateData.project_manager_id = projectManagerId;
    
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.subtotal !== undefined) updateData.subtotal = data.subtotal;
    if (data.tax_rate !== undefined) updateData.tax_rate = data.tax_rate;
    if (data.tax_percent !== undefined) updateData.tax_percent = data.tax_percent;
    if (data.tax_amount !== undefined) updateData.tax_amount = data.tax_amount;
    if (data.total !== undefined) updateData.total = data.total;
    if (data.discount_percent !== undefined) updateData.discount_percent = data.discount_percent;
    if (data.discount_amount !== undefined) updateData.discount_amount = data.discount_amount;
    
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

    // FIXED: Get organization_id from profile, not just metadata
    let organizationId: string | null = null;
    try {
      const profile = await ensureUserProfile(user.id);
      organizationId = profile.organization_id;
    } catch {
      organizationId = user.user_metadata?.organizationId || null;
    }

    console.log('[fixBidOrganizationIds] Current user organization ID:', organizationId);
    
    if (!organizationId) {
      throw new Error('No organization ID found for user');
    }
    
    const { data: nullBids, error: queryError } = await supabase
      .from('bids')
      .select('*')
      .is('organization_id', null);
    
    console.log('[fixBidOrganizationIds] Bids with NULL organization_id:', nullBids?.length || 0);
    
    if (queryError) {
      console.error('[fixBidOrganizationIds] Error querying NULL bids:', queryError);
    }
    
    const { data, error } = await supabase
      .from('bids')
      .update({ organization_id: organizationId })
      .is('organization_id', null)
      .select();
    
    if (error) {
      console.error('[fixBidOrganizationIds] Update error:', error);
      throw error;
    }
    
    console.log('[fixBidOrganizationIds] Fixed organization IDs for', data?.length || 0, 'bids');
    return { count: data?.length || 0, bids: data };
  } catch (error: any) {
    console.error('[fixBidOrganizationIds] Error:', error.message);
    throw error;
  }
}