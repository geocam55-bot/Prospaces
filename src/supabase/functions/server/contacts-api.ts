import { Hono } from 'npm:hono';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import * as kv from './kv_store.tsx';

// ── Server-side column detection ──────────────────────────────────────
// Probe whether account_owner_number exists, with a TTL so we re-check
// after the user runs the ALTER TABLE SQL.
let _hasAccountOwnerCol: boolean | null = null;
let _aocolCheckTime = 0;
const AOCOL_TTL = 60_000; // re-check every 60 seconds if column was missing

// Server-side column detection for price_level
let _hasPriceLevelCol: boolean | null = null;
let _plcolCheckTime = 0;

async function hasPriceLevelColumn(supabase: any): Promise<boolean> {
  if (_hasPriceLevelCol === true) return true;
  if (_hasPriceLevelCol === false && Date.now() - _plcolCheckTime < AOCOL_TTL) return false;

  const { error } = await supabase
    .from('contacts')
    .select('price_level')
    .limit(0);

  _hasPriceLevelCol = !error;
  _plcolCheckTime = Date.now();
  if (error) {
    console.log('[contacts-api] price_level column not available:', error.code);
  } else {
    console.log('[contacts-api] price_level column detected');
  }
  return _hasPriceLevelCol;
}

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

      // If price_level column doesn't exist, enrich contacts from KV store
      const hasPLCol = await hasPriceLevelColumn(supabase);
      let enrichedContacts = contacts || [];
      if (!hasPLCol && enrichedContacts.length > 0) {
        try {
          // Query KV store directly for all contact price levels in one batch
          const kvKeys = enrichedContacts.map((ct: any) => `contact_price_level:${ct.id}`);
          const kvClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
          );
          const { data: kvRows } = await kvClient
            .from('kv_store_8405be07')
            .select('key, value')
            .in('key', kvKeys);

          if (kvRows && kvRows.length > 0) {
            // Build a map: contactId → price_level
            const plMap = new Map<string, string>();
            for (const row of kvRows) {
              const contactId = row.key.replace('contact_price_level:', '');
              plMap.set(contactId, row.value);
            }
            for (const ct of enrichedContacts) {
              const pl = plMap.get(ct.id);
              if (pl) ct.price_level = pl;
            }
            console.log(`[contacts-api] Enriched ${plMap.size} contacts with KV price_levels`);
          }
        } catch (kvErr: any) {
          console.warn(`[contacts-api] Failed to enrich contacts from KV:`, kvErr.message);
        }
      }

      return c.json({
        contacts: enrichedContacts,
        meta: { count: enrichedContacts.length, role: userRole },
      });
    } catch (error: any) {
      console.error('[contacts-api] Unexpected error:', error);
      return c.json({ error: 'Internal server error in contacts API: ' + error.message }, 500);
    }
  });

  // PATCH /contacts/:id — update a contact (bypasses RLS via service role key)
  app.patch('/make-server-8405be07/contacts/:id', async (c) => {
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      // Authenticate the requesting user
      const accessToken = c.req.header('Authorization')?.split(' ')[1];
      if (!accessToken) {
        return c.json({ error: 'Missing Authorization header in contacts update API' }, 401);
      }

      const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
      if (authError || !user) {
        return c.json({ error: 'Unauthorized in contacts update API: ' + (authError?.message || 'No user') }, 401);
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
      const contactId = c.req.param('id');

      console.log(`[contacts-api] PATCH /contacts/${contactId} — user=${profile.email}, role=${userRole}`);

      // Verify the contact belongs to the user's organization
      const { data: existingContact, error: fetchError } = await supabase
        .from('contacts')
        .select('id, organization_id, owner_id')
        .eq('id', contactId)
        .single();

      if (fetchError || !existingContact) {
        return c.json({ error: 'Contact not found: ' + contactId }, 404);
      }

      // Authorization: check org match and role permissions
      if (existingContact.organization_id !== userOrgId && userRole !== 'super_admin') {
        return c.json({ error: 'Contact does not belong to your organization' }, 403);
      }

      // Standard users can only edit their own contacts
      if (['standard_user', 'restricted'].includes(userRole) && existingContact.owner_id !== user.id) {
        return c.json({ error: 'You can only edit your own contacts' }, 403);
      }

      const body = await c.req.json();

      // Detect which columns exist
      const hasPLCol = await hasPriceLevelColumn(supabase);
      const hasAOCol = await hasAccountOwnerColumn(supabase);

      // Build the update payload with only columns that exist
      const updatePayload: any = {};

      // Standard fields (always exist)
      if (body.name !== undefined) updatePayload.name = body.name;
      if (body.email !== undefined) updatePayload.email = body.email;
      if (body.phone !== undefined) updatePayload.phone = body.phone;
      if (body.company !== undefined) updatePayload.company = body.company;
      if (body.status !== undefined) updatePayload.status = body.status;
      if (body.address !== undefined) updatePayload.address = body.address;
      if (body.notes !== undefined) updatePayload.notes = body.notes;
      if (body.tags !== undefined) updatePayload.tags = body.tags;

      // Conditional columns
      if (hasPLCol && body.price_level !== undefined) {
        updatePayload.price_level = body.price_level;
        console.log(`[contacts-api] Setting price_level in DB column to: "${body.price_level}"`);
      }
      if (!hasPLCol && body.price_level !== undefined) {
        // Column doesn't exist — persist in KV store as fallback
        try {
          await kv.set(`contact_price_level:${contactId}`, body.price_level);
          console.log(`[contacts-api] price_level column missing — saved "${body.price_level}" to KV store for contact ${contactId}`);
        } catch (kvErr: any) {
          console.error(`[contacts-api] Failed to save price_level to KV store:`, kvErr.message);
        }
      }
      if (hasAOCol && body.account_owner_number !== undefined) {
        updatePayload.account_owner_number = body.account_owner_number;
      }
      if (body.legacy_number !== undefined) updatePayload.legacy_number = body.legacy_number;
      if (body.ptd_sales !== undefined) updatePayload.ptd_sales = body.ptd_sales;
      if (body.ptd_gp_percent !== undefined) updatePayload.ptd_gp_percent = body.ptd_gp_percent;
      if (body.ytd_sales !== undefined) updatePayload.ytd_sales = body.ytd_sales;
      if (body.ytd_gp_percent !== undefined) updatePayload.ytd_gp_percent = body.ytd_gp_percent;
      if (body.lyr_sales !== undefined) updatePayload.lyr_sales = body.lyr_sales;
      if (body.lyr_gp_percent !== undefined) updatePayload.lyr_gp_percent = body.lyr_gp_percent;

      updatePayload.updated_at = new Date().toISOString();

      console.log(`[contacts-api] Update payload keys:`, Object.keys(updatePayload));

      const { data: updatedContact, error: updateError } = await supabase
        .from('contacts')
        .update(updatePayload)
        .eq('id', contactId)
        .select('*')
        .single();

      if (updateError) {
        console.error('[contacts-api] Update error:', updateError);
        return c.json({ error: 'Failed to update contact: ' + updateError.message }, 500);
      }

      console.log(`[contacts-api] Contact updated successfully. price_level in response: "${updatedContact?.price_level}"`);

      // If price_level column doesn't exist, enrich the response from KV store
      const enrichedContact = { ...updatedContact };
      if (!hasPLCol) {
        try {
          const kvPriceLevel = await kv.get(`contact_price_level:${contactId}`);
          if (kvPriceLevel) {
            enrichedContact.price_level = kvPriceLevel;
            console.log(`[contacts-api] Enriched contact with KV price_level: "${kvPriceLevel}"`);
          }
        } catch (kvErr: any) {
          console.error(`[contacts-api] Failed to read price_level from KV:`, kvErr.message);
        }
      }

      return c.json({ contact: enrichedContact });
    } catch (error: any) {
      console.error('[contacts-api] Unexpected error during update:', error);
      return c.json({ error: 'Internal server error in contacts update API: ' + error.message }, 500);
    }
  });
}