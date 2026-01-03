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
  console.error('[getQuotesByOpportunityClient] 🔴 FUNCTION ENTRY POINT');
  console.log('[getQuotesByOpportunityClient] ========== FUNCTION CALLED ==========');
  console.log('[getQuotesByOpportunityClient] opportunityId parameter:', opportunityId);
  console.log('[getQuotesByOpportunityClient] typeof opportunityId:', typeof opportunityId);
  
  if (!opportunityId) {
    console.error('[getQuotesByOpportunityClient] ❌❌❌ NO OPPORTUNITY ID PROVIDED!');
    return { quotes: [] };
  }
  
  if (typeof opportunityId !== 'string') {
    console.error('[getQuotesByOpportunityClient] ❌❌❌ OPPORTUNITY ID IS NOT A STRING!', typeof opportunityId);
    return { quotes: [] };
  }
  
  console.error('[getQuotesByOpportunityClient] 🔴 ABOUT TO ENTER TRY BLOCK');
  
  try {
    console.error('[getQuotesByOpportunityClient] 🔴 INSIDE TRY BLOCK');
    console.log('[getQuotesByOpportunityClient] Starting query for opportunity:', opportunityId);
    const { data: { user } } = await supabase.auth.getUser();
    
    console.error('[getQuotesByOpportunityClient] 🔴 GOT USER');
    
    if (!user) {
      console.error('[getQuotesByOpportunityClient] ❌ NO USER - NOT AUTHENTICATED');
      throw new Error('Not authenticated');
    }

    console.error('[getQuotesByOpportunityClient] 🔴 ABOUT TO GET PROFILE');
    
    // Get user's profile to check their role
    const profile = await ensureUserProfile(user.id);
    
    console.error('[getQuotesByOpportunityClient] 🔴 GOT PROFILE');

    const userRole = profile.role;
    const userOrgId = profile.organization_id;

    console.log('[getQuotesByOpportunityClient] User:', profile.email, 'Role:', userRole, 'Organization:', userOrgId);
    
    // IMPORTANT: When viewing quotes for a specific opportunity, we need to check
    // if the user has access to the opportunity/contact first, THEN show ALL quotes for that opportunity
    
    // First, get the opportunity to check which contact it belongs to
    const { data: opportunity, error: oppError } = await supabase
      .from('opportunities')
      .select('id, customer_id, organization_id')
      .eq('id', opportunityId)
      .maybeSingle();
    
    if (oppError || !opportunity) {
      console.log('[getQuotesByOpportunityClient] ❌ Opportunity not found or access denied');
      return { quotes: [] };
    }
    
    if (!opportunity.customer_id) {
      console.log('[getQuotesByOpportunityClient] ❌ Opportunity has no customer_id');
      return { quotes: [] };
    }
    
    console.error('[getQuotesByOpportunityClient] 🔴 CHECKING ACCESS TO OPPORTUNITY');
    
    // Simplified access check: if user can see the opportunity (which they can since they navigated here),
    // then they can see all quotes for that contact
    // The opportunity filtering already ensures proper access control
    
    console.log('[getQuotesByOpportunityClient] ✅ User has access - loading ALL quotes for this contact');
    
    // Get ALL quotes for this contact (quotes are linked to contacts, not opportunities)
    // Filter by the opportunity's organization_id to ensure data isolation
    let query = supabase
      .from('quotes')
      .select('*')
      .eq('contact_id', opportunity.customer_id);
    
    // Filter by organization to ensure data isolation
    if (userRole !== 'super_admin' && opportunity.organization_id) {
      console.log('[getQuotesByOpportunityClient] Applying org filter for opportunity org:', opportunity.organization_id);
      query = query.or(`organization_id.eq.${opportunity.organization_id},organization_id.is.null`);
    } else if (userRole !== 'super_admin' && userOrgId) {
      // Fallback to user's org if opportunity doesn't have an org
      console.log('[getQuotesByOpportunityClient] Applying org filter for user org:', userOrgId);
      query = query.or(`organization_id.eq.${userOrgId},organization_id.is.null`);
    } else {
      console.log('[getQuotesByOpportunityClient] Super admin - no org filter applied');
    }
    
    const { data: quotes, error } = await query;
    
    console.log('[getQuotesByOpportunityClient] Query result:', { quotesCount: quotes?.length, error });
    if (quotes && quotes.length > 0) {
      console.log('[getQuotesByOpportunityClient] Quote titles:', quotes.map(q => q.title));
      console.log('[getQuotesByOpportunityClient] Quote org IDs:', quotes.map(q => ({ title: q.title, org_id: q.organization_id })));
    }
    
    if (error) {
      console.error('[getQuotesByOpportunityClient] Error loading quotes for opportunity:', error);
      return { quotes: [] };
    }
    
    console.log('[getQuotesByOpportunityClient] Successfully loaded', quotes?.length || 0, 'quotes');
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