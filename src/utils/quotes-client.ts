import { createClient } from './supabase/client';
import { ensureUserProfile } from './ensure-profile';
import { projectId, publicAnonKey } from './supabase/info';
import { getServerHeaders } from './server-headers';

const supabase = createClient();

export async function getQuoteTrackingStatusClient() {
  try {
    const headers = await getServerHeaders();
    const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-8405be07/quotes/tracking-status`, {
      headers,
    });

    if (!response.ok) {
      // Don't log 404s (function not deployed yet) or 503s (booting) as critical errors
      if (response.status !== 404 && response.status !== 503) {
        console.warn('Failed to fetch tracking status:', response.statusText);
      }
      return { trackingStatus: {} };
    }

    return await response.json();
  } catch (error: any) {
    // Only log actual errors, not "Failed to fetch" network glitches
    if (error?.message !== 'Failed to fetch' && error?.message !== 'Load failed') {
      console.warn('Failed to get tracking status:', error);
    }
    return { trackingStatus: {} };
  }
}

export async function getAllQuotesClient() {
  // ── Attempt 1: Server-side endpoint (bypasses RLS) ──
  try {
    const headers = await getServerHeaders();
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-8405be07/quotes`,
      { headers }
    );

    if (response.ok) {
      const data = await response.json();
      console.log(`[quotes-client] Server endpoint returned ${data.quotes?.length || 0} quotes (role=${data.meta?.role})`);
      return { quotes: data.quotes || [] };
    }

    console.warn('[quotes-client] Server endpoint failed, falling back to direct query:', response.status, response.statusText);
  } catch (err: any) {
    console.warn('[quotes-client] Server endpoint error, falling back to direct query:', err.message);
  }

  // ── Attempt 2: Direct Supabase query (may be blocked by RLS) ──
  try {
    // Try to get user, with fallback to session
    let authUser;
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      // Fallback: check if there's a session
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        authUser = session.user;
        console.log('✅ Using session user for quotes (getUser failed)');
      } else {
        // Silently return empty during initial load
        return { quotes: [] };
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
      return { quotes: [] };
    }

    const userRole = profile.role;
    const userOrgId = profile.organization_id;

    console.log('🔐 Quotes (fallback) - Current user:', profile.email, 'Role:', userRole, 'Organization:', userOrgId);
    
    let query = supabase
      .from('quotes')
      .select('*');
    
    // Apply role-based filtering
    // FIXED: Include 'director' in elevated roles (was missing before)
    if (['super_admin', 'admin', 'manager', 'director', 'marketing'].includes(userRole)) {
      console.log('🔓 Organization View - Loading all quotes for organization:', userOrgId);
      if (userOrgId) {
        query = query.or(`organization_id.eq.${userOrgId},organization_id.is.null`);
      }
    } else {
      console.log('👤 Personal View - Loading only own quotes for user:', authUser.id);
      if (userOrgId) {
        query = query.or(`organization_id.eq.${userOrgId},organization_id.is.null`);
      }
      query = query.eq('created_by', authUser.id);
    }
    
    const { data: quotes, error } = await query.order('created_at', { ascending: false });
    
    if (error) {
      if (error.code === '42P01' || error.code === 'PGRST204' || error.code === '42501') {
        console.log('[quotes-client] Quotes table not found or access denied, returning empty array');
        return { quotes: [] };
      }
      throw error;
    }
    
    console.log('📊 Quotes filtered data - Total rows:', quotes?.length || 0);
    
    return { quotes: quotes || [] };
  } catch (error: any) {
    console.error('[quotes-client] Error:', error.message);
    return { quotes: [] };
  }
}

export async function getQuotesByOpportunityClient(opportunityId: string) {
  // ⚠️ CRITICAL: DO NOT ADD CONTACT ACCESS CHECKS HERE!
  // The contacts table does NOT have the following columns:
  // - account_owner_number (does not exist)
  // - created_by (does not exist)
  // 
  // Access control is already handled by:
  // 1. Opportunity-level filtering (if user can see opportunity, they can see quotes)
  // 2. Organization-level filtering (quotes filtered by organization_id)
  // 
  // This function was broken because it tried to query non-existent contact columns.
  // DO NOT try to "improve" access control by querying the contacts table!
  
  if (!opportunityId) {
    console.error('[getQuotesByOpportunityClient] No opportunity ID provided');
    return { quotes: [] };
  }
  
  if (typeof opportunityId !== 'string') {
    console.error('[getQuotesByOpportunityClient] Opportunity ID is not a string:', typeof opportunityId);
    return { quotes: [] };
  }
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error('[getQuotesByOpportunityClient] Not authenticated');
      throw new Error('Not authenticated');
    }

    // Get user's profile to check their role
    const profile = await ensureUserProfile(user.id);

    const userRole = profile.role;
    const userOrgId = profile.organization_id;
    
    // IMPORTANT: When viewing quotes for a specific opportunity, we need to check
    // if the user has access to the opportunity/contact first, THEN show ALL quotes for that opportunity
    
    // First, get the opportunity to check which contact it belongs to
    const { data: opportunity, error: oppError } = await supabase
      .from('opportunities')
      .select('id, customer_id, organization_id')
      .eq('id', opportunityId)
      .maybeSingle();
    
    if (oppError || !opportunity) {
      console.log('[getQuotesByOpportunityClient] Opportunity not found or access denied');
      return { quotes: [] };
    }
    
    if (!opportunity.customer_id) {
      console.log('[getQuotesByOpportunityClient] Opportunity has no customer_id');
      return { quotes: [] };
    }
    
    // Simplified access check: if user can see the opportunity (which they can since they navigated here),
    // then they can see all quotes for that contact
    // The opportunity filtering already ensures proper access control
    
    // Get ALL quotes for this contact (quotes are linked to contacts, not opportunities)
    // Filter by the opportunity's organization_id to ensure data isolation
    let query = supabase
      .from('quotes')
      .select('*')
      .eq('contact_id', opportunity.customer_id);
    
    // Filter by organization to ensure data isolation
    if (userRole !== 'super_admin' && opportunity.organization_id) {
      query = query.or(`organization_id.eq.${opportunity.organization_id},organization_id.is.null`);
    } else if (userRole !== 'super_admin' && userOrgId) {
      // Fallback to user's org if opportunity doesn't have an org
      query = query.or(`organization_id.eq.${userOrgId},organization_id.is.null`);
    }
    
    const { data: quotes, error } = await query;
    
    if (error) {
      console.error('[getQuotesByOpportunityClient] Error loading quotes:', error);
      return { quotes: [] };
    }
    
    return { quotes: quotes || [] };
  } catch (error: any) {
    console.error('[getQuotesByOpportunityClient] Error:', error.message);
    return { quotes: [] };
  }
}

export async function createQuoteClient(data: any) {
  // ── Attempt 1: Server-side endpoint (bypasses RLS, authoritative org ID) ──
  try {
    const headers = await getServerHeaders();
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-8405be07/quotes`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
      }
    );

    if (response.ok) {
      const result = await response.json();
      console.log('[quotes-client] Quote created via server endpoint:', result.quote?.id);
      return { quote: result.quote };
    }

    const errBody = await response.text();
    console.warn('[quotes-client] Server create failed, falling back to direct insert:', response.status, errBody);
  } catch (err: any) {
    console.warn('[quotes-client] Server create error, falling back to direct insert:', err.message);
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
      console.log('[quotes-client] Retrieved organization_id from profile:', organizationId);
    } catch (profileError) {
      console.warn('[quotes-client] Failed to fetch profile, falling back to metadata:', profileError);
      organizationId = user.user_metadata?.organizationId || null;
    }
    
    // Generate quote number if not provided
    const generateQuoteNumber = () => {
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      return `QT-${year}${month}-${random}`;
    };
    
    // ✅ Keep opportunity_id if provided - quotes CAN be linked to opportunities
    const quoteData = {
      ...data,
      quote_number: data.quote_number || generateQuoteNumber(),
      organization_id: organizationId,
      created_by: user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    console.log('[quotes-client] Creating quote (fallback) with org:', organizationId);
    
    const { data: quote, error } = await supabase
      .from('quotes')
      .insert([quoteData])
      .select()
      .single();
    
    if (error) {
      console.error('[quotes-client] Error creating quote:', error.message);
      throw error;
    }
    
    return { quote };
  } catch (error: any) {
    console.error('[quotes-client] Error creating quote:', error.message);
    throw error;
  }
}

export async function updateQuoteClient(id: string, data: any) {
  try {
    // Sanitize and map data to snake_case
    const allowedColumns = [
      'quote_number', 'title', 'contact_id', 'contact_name', 
      'price_tier', 'status', 'valid_until', 'line_items', 
      'subtotal', 'discount_percent', 'discount_amount', 
      'tax_percent', 'tax_percent_2', 'tax_amount', 'tax_amount_2', 
      'total', 'notes', 'terms', 'organization_id', 'created_by', 
      'created_at', 'updated_at'
    ];
    
    const dbData: any = {};
    
    // Helper to map camelCase to snake_case
    const toSnakeCase = (str: string) => str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    
    // Explicit mappings for fields that might not match simple snake_case conversion
    const mappings: Record<string, string> = {
      'quoteNumber': 'quote_number',
      'contactId': 'contact_id',
      'contactName': 'contact_name',
      'priceTier': 'price_tier',
      'validUntil': 'valid_until',
      'lineItems': 'line_items',
      'discountPercent': 'discount_percent',
      'discountAmount': 'discount_amount',
      'taxPercent': 'tax_percent',
      'taxPercent2': 'tax_percent_2',
      'taxAmount': 'tax_amount',
      'taxAmount2': 'tax_amount_2',
    };

    Object.keys(data).forEach(key => {
      // 1. Check if key is already a valid column
      if (allowedColumns.includes(key)) {
        dbData[key] = data[key];
        return;
      }
      
      // 2. Check explicit mappings
      if (mappings[key] && allowedColumns.includes(mappings[key])) {
        // Special handling for line_items - stringify if array
        if (mappings[key] === 'line_items' && Array.isArray(data[key])) {
          dbData[mappings[key]] = JSON.stringify(data[key]);
        } else {
          dbData[mappings[key]] = data[key];
        }
        return;
      }
      
      // 3. Try auto-conversion to snake_case
      const snakeKey = toSnakeCase(key);
      if (allowedColumns.includes(snakeKey)) {
        dbData[snakeKey] = data[key];
        return;
      }
      
      // If we reach here, the key is not recognized/allowed (e.g. contactEmail)
      // and will be dropped.
    });

    const updateData: any = {
      ...dbData,
      updated_at: new Date().toISOString(),
    };
    
    console.log('[quotes-client] Updating quote with sanitized data:', updateData);
    
    const { data: quote, error } = await supabase
      .from('quotes')
      .update(updateData)
      .eq('id', id)
      .select()
      .maybeSingle();
    
    if (error) {
      console.error('[quotes-client] Error updating quote:', error.message);
      throw error;
    }

    if (!quote) {
      console.error('[quotes-client] Error updating quote: Quote not found or permission denied');
      throw new Error('Quote not found or permission denied');
    }
    
    return { quote };
  } catch (error: any) {
    console.error('[quotes-client] Error updating quote:', error.message);
    throw error;
  }
}

export async function deleteQuoteClient(id: string) {
  try {
    const { error } = await supabase
      .from('quotes')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('[quotes-client] Error deleting quote:', error.message);
      throw error;
    }
    
    return { success: true };
  } catch (error: any) {
    console.error('[quotes-client] Error deleting quote:', error.message);
    throw error;
  }
}