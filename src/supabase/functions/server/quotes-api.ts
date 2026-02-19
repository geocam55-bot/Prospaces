import { Hono } from 'npm:hono';
import { createClient } from 'jsr:@supabase/supabase-js@2';

/**
 * Server-side Quotes API — bypasses RLS using the service role key.
 * Applies role-based filtering in code (same pattern as contacts-api.ts).
 */
export function quotesAPI(app: Hono) {

  // ── GET /quotes — list all quotes visible to the authenticated user ──
  app.get('/make-server-8405be07/quotes', async (c) => {
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      // Authenticate the requesting user
      const accessToken = c.req.header('Authorization')?.split(' ')[1];
      if (!accessToken) {
        return c.json({ error: 'Missing Authorization header in quotes API' }, 401);
      }

      const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
      if (authError || !user) {
        return c.json({ error: 'Unauthorized in quotes API: ' + (authError?.message || 'No user') }, 401);
      }

      // Get the user's profile for role and organization
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError || !profile) {
        return c.json({ error: 'Profile not found for user ' + user.id }, 404);
      }

      const userRole = profile.role || 'standard_user';
      const userOrgId = profile.organization_id;

      console.log(`[quotes-api] GET /quotes — user=${profile.email}, role=${userRole}, org=${userOrgId}`);

      // Build the query with role-based filtering
      let query = supabase
        .from('quotes')
        .select('*');

      if (userRole === 'super_admin') {
        // super_admin sees everything — no filter
      } else if (['admin', 'manager', 'director', 'marketing'].includes(userRole)) {
        // Elevated roles see all quotes in their organization
        if (userOrgId) {
          query = query.or(`organization_id.eq.${userOrgId},organization_id.is.null`);
        }
      } else {
        // standard_user / restricted — see only their own quotes
        if (userOrgId) {
          query = query.or(`organization_id.eq.${userOrgId},organization_id.is.null`);
        }
        query = query.eq('created_by', user.id);
      }

      const { data: quotes, error: queryError } = await query.order('created_at', { ascending: false });

      if (queryError) {
        console.error('[quotes-api] Query error:', queryError);
        return c.json({ error: 'Quotes query failed: ' + queryError.message }, 500);
      }

      console.log(`[quotes-api] Returning ${quotes?.length || 0} quotes for role=${userRole}`);

      return c.json({
        quotes: quotes || [],
        meta: { count: quotes?.length || 0, role: userRole },
      });
    } catch (err: any) {
      console.error('[quotes-api] Unexpected error in GET /quotes:', err);
      return c.json({ error: 'Internal server error in quotes API: ' + err.message }, 500);
    }
  });

  // ── GET /bids — list all bids visible to the authenticated user ──
  app.get('/make-server-8405be07/bids', async (c) => {
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      const accessToken = c.req.header('Authorization')?.split(' ')[1];
      if (!accessToken) {
        return c.json({ error: 'Missing Authorization header in bids API' }, 401);
      }

      const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
      if (authError || !user) {
        return c.json({ error: 'Unauthorized in bids API: ' + (authError?.message || 'No user') }, 401);
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError || !profile) {
        return c.json({ error: 'Profile not found for user ' + user.id }, 404);
      }

      const userRole = profile.role || 'standard_user';
      const userOrgId = profile.organization_id;

      console.log(`[quotes-api] GET /bids — user=${profile.email}, role=${userRole}, org=${userOrgId}`);

      let query = supabase
        .from('bids')
        .select('*');

      if (userRole === 'super_admin') {
        // no filter
      } else if (['admin', 'manager', 'director', 'marketing'].includes(userRole)) {
        if (userOrgId) {
          query = query.or(`organization_id.eq.${userOrgId},organization_id.is.null`);
        }
      } else {
        if (userOrgId) {
          query = query.or(`organization_id.eq.${userOrgId},organization_id.is.null`);
        }
        query = query.eq('created_by', user.id);
      }

      const { data: bids, error: queryError } = await query.order('created_at', { ascending: false });

      if (queryError) {
        console.error('[quotes-api] Bids query error:', queryError);
        return c.json({ error: 'Bids query failed: ' + queryError.message }, 500);
      }

      console.log(`[quotes-api] Returning ${bids?.length || 0} bids for role=${userRole}`);

      return c.json({
        bids: bids || [],
        meta: { count: bids?.length || 0, role: userRole },
      });
    } catch (err: any) {
      console.error('[quotes-api] Unexpected error in GET /bids:', err);
      return c.json({ error: 'Internal server error in bids API: ' + err.message }, 500);
    }
  });

  // ── POST /quotes — create a new quote (bypasses RLS) ──
  app.post('/make-server-8405be07/quotes', async (c) => {
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      const accessToken = c.req.header('Authorization')?.split(' ')[1];
      if (!accessToken) {
        return c.json({ error: 'Missing Authorization header' }, 401);
      }

      const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
      if (authError || !user) {
        return c.json({ error: 'Unauthorized: ' + (authError?.message || 'No user') }, 401);
      }

      // Get the user's profile (authoritative source for organization_id)
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id, email')
        .eq('id', user.id)
        .single();

      const organizationId = profile?.organization_id || user.user_metadata?.organizationId || null;
      const body = await c.req.json();

      const quoteData = {
        ...body,
        organization_id: organizationId,
        created_by: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      console.log(`[quotes-api] POST /quotes — user=${profile?.email}, org=${organizationId}`);

      const { data: quote, error } = await supabase
        .from('quotes')
        .insert([quoteData])
        .select()
        .single();

      if (error) {
        console.error('[quotes-api] Insert error:', error);
        return c.json({ error: 'Failed to create quote: ' + error.message }, 500);
      }

      console.log(`[quotes-api] Quote created: ${quote.id}`);
      return c.json({ quote });
    } catch (err: any) {
      console.error('[quotes-api] Unexpected error in POST /quotes:', err);
      return c.json({ error: 'Internal server error: ' + err.message }, 500);
    }
  });

  // ── POST /bids — create a new bid (bypasses RLS) ──
  app.post('/make-server-8405be07/bids', async (c) => {
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      const accessToken = c.req.header('Authorization')?.split(' ')[1];
      if (!accessToken) {
        return c.json({ error: 'Missing Authorization header' }, 401);
      }

      const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
      if (authError || !user) {
        return c.json({ error: 'Unauthorized: ' + (authError?.message || 'No user') }, 401);
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id, email')
        .eq('id', user.id)
        .single();

      const organizationId = profile?.organization_id || user.user_metadata?.organizationId || null;
      const body = await c.req.json();

      const bidData = {
        ...body,
        organization_id: organizationId,
        created_by: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      console.log(`[quotes-api] POST /bids — user=${profile?.email}, org=${organizationId}`);

      const { data: bid, error } = await supabase
        .from('bids')
        .insert([bidData])
        .select()
        .single();

      if (error) {
        console.error('[quotes-api] Bid insert error:', error);
        return c.json({ error: 'Failed to create bid: ' + error.message }, 500);
      }

      console.log(`[quotes-api] Bid created: ${bid.id}`);
      return c.json({ bid });
    } catch (err: any) {
      console.error('[quotes-api] Unexpected error in POST /bids:', err);
      return c.json({ error: 'Internal server error: ' + err.message }, 500);
    }
  });
}
