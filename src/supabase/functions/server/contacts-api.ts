import { Hono } from 'npm:hono';
import { createClient } from 'jsr:@supabase/supabase-js@2';

// ── Server-side column detection ──────────────────────────────────────
// Probe whether account_owner_number exists, with a TTL so we re-check
// after the user runs the ALTER TABLE SQL.
let _hasAccountOwnerCol: boolean | null = null;
let _aocolCheckTime = 0;
const AOCOL_TTL = 60_000; // re-check every 60 seconds if column was missing

async function hasAccountOwnerColumn(supabase: any): Promise<boolean> {
  // If we already found the column, keep using that (column won't disappear)
  if (_hasAccountOwnerCol === true) return true;
  // If we cached "not found", re-check after TTL in case user ran the SQL
  if (_hasAccountOwnerCol === false && Date.now() - _aocolCheckTime < AOCOL_TTL) return false;

  const { error } = await supabase
    .from('contacts')
    .select('account_owner_number')
    .limit(0);

  _hasAccountOwnerCol = !error;
  _aocolCheckTime = Date.now();
  if (error) {
    console.log('[contacts-api] account_owner_number column not available:', error.code);
  } else {
    console.log('[contacts-api] account_owner_number column detected');
  }
  return _hasAccountOwnerCol;
}

export function contactsAPI(app: Hono) {
  // GET /contacts — returns all contacts visible to the authenticated user
  // Uses service role key to bypass RLS, then applies role-based filtering.
  app.get('/make-server-8405be07/contacts', async (c) => {
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      // Authenticate the requesting user
      const accessToken = c.req.header('Authorization')?.split(' ')[1];
      if (!accessToken) {
        return c.json({ error: 'Missing Authorization header in contacts API' }, 401);
      }

      const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
      if (authError || !user) {
        return c.json({ error: 'Unauthorized in contacts API: ' + (authError?.message || 'No user') }, 401);
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
      const userEmail = profile.email || user.email || '';

      console.log(`[contacts-api] GET /contacts — user=${userEmail}, role=${userRole}, org=${userOrgId}`);

      // Check if account_owner_number column exists
      const hasAOCol = await hasAccountOwnerColumn(supabase);

      // Build the query with role-based filtering
      let query = supabase
        .from('contacts')
        .select('*');

      if (userRole === 'super_admin') {
        // super_admin sees everything — no filter
      } else if (['admin', 'manager', 'director', 'marketing'].includes(userRole)) {
        // Elevated roles see all contacts in their organization
        query = query.eq('organization_id', userOrgId);
      } else {
        // standard_user / restricted — see only their own contacts
        if (hasAOCol && userEmail) {
          query = query
            .eq('organization_id', userOrgId)
            .or(`owner_id.eq.${user.id},account_owner_number.ilike.${userEmail}`);
        } else {
          query = query
            .eq('organization_id', userOrgId)
            .eq('owner_id', user.id);
        }
      }

      const { data: contacts, error: queryError } = await query.order('created_at', { ascending: false });

      if (queryError) {
        console.error('[contacts-api] Query error:', queryError);

        // If the error is a missing column, retry without account_owner_number
        if (queryError.code === '42703' && hasAOCol) {
          console.warn('[contacts-api] Column error detected, retrying without account_owner_number');
          // Reset cache so next request re-probes
          _hasAccountOwnerCol = null;

          const retryQuery = supabase
            .from('contacts')
            .select('*')
            .eq('organization_id', userOrgId)
            .eq('owner_id', user.id)
            .order('created_at', { ascending: false });

          const { data: retryData, error: retryError } = await retryQuery;
          if (retryError) {
            return c.json({ error: 'Contacts query failed on retry: ' + retryError.message }, 500);
          }

          return c.json({
            contacts: retryData || [],
            meta: { count: retryData?.length || 0, role: userRole, fallback: true },
          });
        }

        return c.json({ error: 'Contacts query failed: ' + queryError.message }, 500);
      }

      console.log(`[contacts-api] Returning ${contacts?.length || 0} contacts for role=${userRole}`);

      return c.json({
        contacts: contacts || [],
        meta: { count: contacts?.length || 0, role: userRole },
      });
    } catch (error: any) {
      console.error('[contacts-api] Unexpected error:', error);
      return c.json({ error: 'Internal server error in contacts API: ' + error.message }, 500);
    }
  });
}