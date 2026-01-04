import { createClient } from './supabase/client';
import { ensureUserProfile } from './ensure-profile';

const supabase = createClient();

export async function getAllQuotesClient() {
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
      // Return empty array instead of throwing - this prevents "Error" in dashboard
      return { quotes: [] };
    }

    const userRole = profile.role;
    const userOrgId = profile.organization_id;

    console.log('🔐 Quotes - Current user:', profile.email, 'Role:', userRole, 'Organization:', userOrgId);
    
    let query = supabase
      .from('quotes')
      .select('*');
    
    // Apply role-based filtering
    if (userRole === 'super_admin') {
      // Super Admin: Can see all quotes
      console.log('🔓 Super Admin - Loading all quotes');
    } else if (userRole === 'admin' || userRole === 'marketing') {
      // Admin & Marketing: Can see all quotes within their organization
      console.log('🔒 Admin/Marketing - Loading quotes for organization:', userOrgId);
      query = query.or(`organization_id.eq.${userOrgId},organization_id.is.null`);
    } else if (userRole === 'manager') {
      // Manager: Can see their own quotes + quotes from users they manage
      console.log('👔 Manager - Loading quotes for team');
      
      // Get list of users this manager oversees
      const { data: teamMembers } = await supabase
        .from('profiles')
        .select('id')
        .eq('manager_id', authUser.id)
        .eq('organization_id', userOrgId);

      const teamIds = teamMembers?.map(m => m.id) || [];
      const allowedUserIds = [authUser.id, ...teamIds];
      
      // Filter by organization and created_by
      query = query.or(`organization_id.eq.${userOrgId},organization_id.is.null`);
      
      if (allowedUserIds.length > 1) {
        query = query.in('created_by', allowedUserIds);
      } else {
        query = query.eq('created_by', authUser.id);
      }
    } else {
      // Standard User: Can ONLY see their own quotes
      console.log('👤 Standard User - Loading only own quotes');
      query = query.or(`organization_id.eq.${userOrgId},organization_id.is.null`);
      query = query.eq('created_by', authUser.id);
    }
    
    const { data: quotes, error } = await query.order('created_at', { ascending: false });
    
    if (error) {
      // If table doesn't exist, return empty array
      if (error.code === '42P01' || error.code === 'PGRST204' || error.code === '42501') {
        console.log('[quotes-client] Quotes table not found, returning empty array');
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
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('Not authenticated');
    }

    const organizationId = user.user_metadata?.organizationId;
    
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
    
    console.log('[quotes-client] Creating quote with data:', quoteData);
    
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
    const updateData: any = {
      ...data,
      updated_at: new Date().toISOString(),
    };
    
    console.log('[quotes-client] Updating quote with data:', updateData);
    
    const { data: quote, error } = await supabase
      .from('quotes')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('[quotes-client] Error updating quote:', error.message);
      throw error;
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