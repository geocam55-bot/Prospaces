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
    
    // Destructure camelCase AND snake_case contact fields to strip them from ...rest.
    // The bids table does NOT have contact_id, contact_name, or contact_email columns.
    // Contact reference is stored via opportunity_id.
    const {
      items,
      opportunityId,
      validUntil,
      projectManagerId,
      contactId,
      contact_id: _contactIdSnake,
      contactName,
      contact_name: _contactNameSnake,
      contactEmail,
      contact_email: _contactEmailSnake,
      clientName,
      projectName,
      tax,          // Map 'tax' → 'tax_amount' (sent by ScheduledJobs / ImportExport)
      taxPercent,
      taxPercent2,
      taxAmount,
      taxAmount2,
      discountPercent,  // Strip — column does NOT exist on bids table
      discountAmount,   // Strip — column does NOT exist on bids table
      line_items: _lineItemsSnake,  // Strip — column does NOT exist on bids table
      lineItems: _lineItemsCamel,   // Strip — column does NOT exist on bids table
      submittedDate,
      ...rest
    } = data;

    // Allowlist of columns that actually exist on the bids table.
    // Any field NOT in this list will be silently dropped to prevent PGRST204 errors.
    // NOTE: line_items, discount_percent, and discount_amount do NOT exist on the bids table.
    const ALLOWED_BID_COLUMNS = new Set([
      'title', 'amount', 'status', 'valid_until', 'notes', 'terms', 'description',
      'opportunity_id', 'project_manager_id', 'client_name', 'project_name',
      'subtotal', 'tax_rate', 'tax_percent', 'tax_percent_2',
      'tax_amount', 'tax_amount_2', 'total',
      'submitted_date', 'organization_id', 'created_by', 'created_at', 'updated_at',
    ]);

    // Start with only allowed fields from ...rest
    const bidData: any = {};
    for (const [key, value] of Object.entries(rest)) {
      if (ALLOWED_BID_COLUMNS.has(key)) {
        bidData[key] = value;
      } else {
        console.log(`[bids-client] createBidClient — Dropping unknown field: ${key}`);
      }
    }

    // Always set these
    bidData.organization_id = organizationId;
    bidData.created_by = user.id;
    bidData.created_at = new Date().toISOString();
    bidData.updated_at = new Date().toISOString();

    // Map camelCase → snake_case (only include if provided)
    if (validUntil !== undefined) bidData.valid_until = validUntil;
    if (projectManagerId !== undefined) bidData.project_manager_id = projectManagerId || null;
    if (clientName !== undefined) bidData.client_name = clientName;
    if (projectName !== undefined) bidData.project_name = projectName;
    if (taxPercent !== undefined) bidData.tax_percent = taxPercent;
    if (taxPercent2 !== undefined) bidData.tax_percent_2 = taxPercent2;
    if (taxAmount !== undefined) bidData.tax_amount = taxAmount;
    if (taxAmount2 !== undefined) bidData.tax_amount_2 = taxAmount2;
    if (submittedDate !== undefined) bidData.submitted_date = submittedDate;
    // NOTE: discountPercent, discountAmount, line_items, and items are intentionally NOT mapped —
    // these columns do not exist on the bids table.

    // Map 'tax' → 'tax_amount' (ScheduledJobs / ImportExport send 'tax' instead of 'tax_amount')
    if (tax !== undefined && bidData.tax_amount === undefined) bidData.tax_amount = tax;

    // The bids table uses opportunity_id for the customer/contact reference.
    // If caller sent opportunityId, use it. Otherwise fall back to contactId.
    const effectiveOpportunityId = opportunityId || contactId || _contactIdSnake;
    if (effectiveOpportunityId) bidData.opportunity_id = effectiveOpportunityId;
    
    // NOTE: line_items / items are NOT inserted into bids table — that column does not exist.
    // Line items are only stored on the quotes table.
    
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
    // Allowlist of columns that actually exist on the bids table.
    // NOTE: line_items, discount_percent, and discount_amount do NOT exist on the bids table.
    const ALLOWED_BID_COLUMNS = new Set([
      'title', 'amount', 'status', 'valid_until', 'notes', 'terms', 'description',
      'opportunity_id', 'project_manager_id', 'client_name', 'project_name',
      'subtotal', 'tax_rate', 'tax_percent', 'tax_percent_2',
      'tax_amount', 'tax_amount_2', 'total',
      'submitted_date', 'updated_at',
    ]);

    // Explicit camelCase → snake_case mappings
    const CAMEL_TO_SNAKE: Record<string, string> = {
      opportunityId: 'opportunity_id',
      validUntil: 'valid_until',
      projectManagerId: 'project_manager_id',
      clientName: 'client_name',
      projectName: 'project_name',
      taxRate: 'tax_rate',
      taxPercent: 'tax_percent',
      taxPercent2: 'tax_percent_2',
      taxAmount: 'tax_amount',
      taxAmount2: 'tax_amount_2',
      submittedDate: 'submitted_date',
    };

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    // NOTE: line_items / items are NOT sent to bids table — that column does not exist.
    // Line items are only stored on the quotes table.

    // Process all fields from data
    for (const [key, value] of Object.entries(data)) {
      if (key === 'items' || key === 'line_items' || key === 'lineItems') continue; // Skip — column does not exist on bids table
      if (value === undefined) continue;

      // If key is already an allowed snake_case column, use it directly
      if (ALLOWED_BID_COLUMNS.has(key)) {
        updateData[key] = value;
        continue;
      }

      // Try camelCase → snake_case mapping
      const snakeKey = CAMEL_TO_SNAKE[key];
      if (snakeKey && ALLOWED_BID_COLUMNS.has(snakeKey)) {
        updateData[snakeKey] = value;
        continue;
      }

      // Drop unknown fields (e.g., _source, contactId, etc.)
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