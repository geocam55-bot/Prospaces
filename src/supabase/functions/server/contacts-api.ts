import { Hono } from 'npm:hono';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import * as kv from './kv_store.tsx';
import { extractUserToken } from './auth-helper.ts';

// ── Server-side column detection ──────────────────────────────────────
// Probe whether account_owner_number exists, with a TTL so we re-check
// after the user runs the ALTER TABLE SQL.
let _hasAccountOwnerCol: boolean | null = null;
let _aocolCheckTime = 0;
const AOCOL_TTL = 60_000; // re-check every 60 seconds if column was missing

// Server-side column detection for price_level
let _hasPriceLevelCol: boolean | null = null;
let _plcolCheckTime = 0;

// Server-side column detection for legacy_number
let _hasLegacyNumberCol: boolean | null = null;
let _lncolCheckTime = 0;

// Server-side column detection for financial columns (ptd_sales, etc.)
let _hasFinancialCols: boolean | null = null;
let _fincolCheckTime = 0;

// Server-side column detection for address, notes, tags
let _hasAddressCol: boolean | null = null;
let _addressColCheckTime = 0;
let _hasNotesCol: boolean | null = null;
let _notesColCheckTime = 0;
let _hasTagsCol: boolean | null = null;
let _tagsColCheckTime = 0;

async function hasAddressColumn(supabase: any): Promise<boolean> {
  if (_hasAddressCol === true) return true;
  if (_hasAddressCol === false && Date.now() - _addressColCheckTime < AOCOL_TTL) return false;
  const { error } = await supabase.from('contacts').select('address').limit(0);
  _hasAddressCol = !error;
  _addressColCheckTime = Date.now();
  if (error) console.log('[contacts-api] address column not available:', error.code);
  else console.log('[contacts-api] address column detected');
  return _hasAddressCol;
}

async function hasNotesColumn(supabase: any): Promise<boolean> {
  if (_hasNotesCol === true) return true;
  if (_hasNotesCol === false && Date.now() - _notesColCheckTime < AOCOL_TTL) return false;
  const { error } = await supabase.from('contacts').select('notes').limit(0);
  _hasNotesCol = !error;
  _notesColCheckTime = Date.now();
  if (error) console.log('[contacts-api] notes column not available:', error.code);
  else console.log('[contacts-api] notes column detected');
  return _hasNotesCol;
}

async function hasTagsColumn(supabase: any): Promise<boolean> {
  if (_hasTagsCol === true) return true;
  if (_hasTagsCol === false && Date.now() - _tagsColCheckTime < AOCOL_TTL) return false;
  const { error } = await supabase.from('contacts').select('tags').limit(0);
  _hasTagsCol = !error;
  _tagsColCheckTime = Date.now();
  if (error) console.log('[contacts-api] tags column not available:', error.code);
  else console.log('[contacts-api] tags column detected');
  return _hasTagsCol;
}

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

async function hasLegacyNumberColumn(supabase: any): Promise<boolean> {
  if (_hasLegacyNumberCol === true) return true;
  if (_hasLegacyNumberCol === false && Date.now() - _lncolCheckTime < AOCOL_TTL) return false;

  const { error } = await supabase
    .from('contacts')
    .select('legacy_number')
    .limit(0);

  _hasLegacyNumberCol = !error;
  _lncolCheckTime = Date.now();
  if (error) {
    console.log('[contacts-api] legacy_number column not available:', error.code);
  } else {
    console.log('[contacts-api] legacy_number column detected');
  }
  return _hasLegacyNumberCol;
}

async function hasFinancialColumns(supabase: any): Promise<boolean> {
  if (_hasFinancialCols === true) return true;
  if (_hasFinancialCols === false && Date.now() - _fincolCheckTime < AOCOL_TTL) return false;

  const { error } = await supabase
    .from('contacts')
    .select('ptd_sales')
    .limit(0);

  _hasFinancialCols = !error;
  _fincolCheckTime = Date.now();
  if (error) {
    console.log('[contacts-api] Financial columns (ptd_sales, etc.) not available:', error.code);
  } else {
    console.log('[contacts-api] Financial columns detected');
  }
  return _hasFinancialCols;
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
      const accessToken = extractUserToken(c);
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

      // Check for scope parameter: 'personal' = only user's own data, 'team' = role-based org data
      const scope = c.req.query('scope') || 'personal';

      // Build the query with role-based filtering
      let query = supabase
        .from('contacts')
        .select('*');

      if (scope === 'personal') {
        // Personal scope: ALL roles see only their own contacts
        if (userRole === 'super_admin') {
          // super_admin still sees everything in personal scope (they have no org)
        } else {
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
      } else {
        // Team scope: role-based filtering (admin/manager see all org data)
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

      // ── ALWAYS enrich optional fields from KV (authoritative source) ──
      // This guarantees price_level, address, notes, tags, and financial data
      // survive even if the DB columns don't exist or the DB write silently drops them.
      let enrichedContacts = contacts || [];
      if (enrichedContacts.length > 0) {
        try {
          const contactIds = enrichedContacts.map((ct: any) => ct.id);
          const overlayKeys = contactIds.map((id: string) => `contact_extras:${id}`);
          const legacyKeys = contactIds.map((id: string) => `contact_price_level:${id}`);

          const { data: kvData, error: kvError } = await supabase
            .from('kv_store_8405be07')
            .select('key, value')
            .in('key', [...overlayKeys, ...legacyKeys]);

          if (kvError) {
            console.warn(`[contacts-api] KV fetch error:`, kvError.message);
          } else if (kvData) {
            const kvMap = new Map();
            for (const row of kvData) {
              kvMap.set(row.key, row.value);
            }

            let enrichCount = 0;
            for (let i = 0; i < enrichedContacts.length; i++) {
              const cid = enrichedContacts[i].id;
              let updated = false;

              // 1. Overlay
              const overlay = kvMap.get(`contact_extras:${cid}`);
              if (overlay && typeof overlay === 'object') {
                if (overlay.price_level !== undefined) enrichedContacts[i].price_level = overlay.price_level;
                if (overlay.address !== undefined && !enrichedContacts[i].address) enrichedContacts[i].address = overlay.address;
                if (overlay.notes !== undefined && !enrichedContacts[i].notes) enrichedContacts[i].notes = overlay.notes;
                if (overlay.tags !== undefined && !enrichedContacts[i].tags) enrichedContacts[i].tags = overlay.tags;
                if (overlay.ptd_sales !== undefined && enrichedContacts[i].ptd_sales == null) enrichedContacts[i].ptd_sales = overlay.ptd_sales;
                if (overlay.ptd_gp_percent !== undefined && enrichedContacts[i].ptd_gp_percent == null) enrichedContacts[i].ptd_gp_percent = overlay.ptd_gp_percent;
                if (overlay.ytd_sales !== undefined && enrichedContacts[i].ytd_sales == null) enrichedContacts[i].ytd_sales = overlay.ytd_sales;
                if (overlay.ytd_gp_percent !== undefined && enrichedContacts[i].ytd_gp_percent == null) enrichedContacts[i].ytd_gp_percent = overlay.ytd_gp_percent;
                if (overlay.lyr_sales !== undefined && enrichedContacts[i].lyr_sales == null) enrichedContacts[i].lyr_sales = overlay.lyr_sales;
                if (overlay.lyr_gp_percent !== undefined && enrichedContacts[i].lyr_gp_percent == null) enrichedContacts[i].lyr_gp_percent = overlay.lyr_gp_percent;
                if (overlay.city !== undefined && !enrichedContacts[i].city) enrichedContacts[i].city = overlay.city;
                if (overlay.province !== undefined && !enrichedContacts[i].province) enrichedContacts[i].province = overlay.province;
                if (overlay.postal_code !== undefined && !enrichedContacts[i].postal_code) enrichedContacts[i].postal_code = overlay.postal_code;
                updated = true;
              }

              // 2. Legacy price_level fallback
              if (!enrichedContacts[i].price_level) {
                let val = kvMap.get(`contact_price_level:${cid}`);
                if (val !== null && val !== undefined) {
                  if (typeof val === 'string' && val.startsWith('"') && val.endsWith('"')) {
                    try { val = JSON.parse(val); } catch { /* use as-is */ }
                  }
                  enrichedContacts[i].price_level = val;
                  updated = true;
                }
              }

              if (updated) enrichCount++;
            }
            console.log(`[contacts-api] Enriched ${enrichCount}/${enrichedContacts.length} contacts from KV store batch query`);
          }
        } catch (kvErr: any) {
          console.warn(`[contacts-api] KV enrichment error (non-fatal):`, kvErr.message);
        }
      }
      
      // Debug: log a sample
      if (enrichedContacts.length > 0) {
        const s = enrichedContacts[0];
        console.log(`[contacts-api] Sample contact: id=${s.id}, name="${s.name}", price_level="${s.price_level}" (type=${typeof s.price_level})`);
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
      const accessToken = extractUserToken(c);
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
      console.log(`[contacts-api] PATCH body keys:`, Object.keys(body));
      console.log(`[contacts-api] PATCH body.price_level:`, JSON.stringify(body.price_level));

      // Detect which columns exist
      const hasAOCol = await hasAccountOwnerColumn(supabase);
      const hasLNCol = await hasLegacyNumberColumn(supabase);
      const hasFinCols = await hasFinancialColumns(supabase);
      const hasPLCol = await hasPriceLevelColumn(supabase);
      const hasAddrCol = await hasAddressColumn(supabase);
      const hasNotCol = await hasNotesColumn(supabase);
      const hasTagCol = await hasTagsColumn(supabase);

      // Build the update payload with only columns that exist
      const updatePayload: any = {};

      // Standard fields (always exist)
      if (body.name !== undefined) updatePayload.name = body.name;
      if (body.email !== undefined) updatePayload.email = body.email;
      if (body.phone !== undefined) updatePayload.phone = body.phone;
      if (body.company !== undefined) updatePayload.company = body.company;
      if (body.status !== undefined) updatePayload.status = body.status;

      // Conditional columns that might not exist yet
      if (hasAddrCol && body.address !== undefined) updatePayload.address = body.address;
      if (hasNotCol && body.notes !== undefined) updatePayload.notes = body.notes;
      if (hasTagCol && body.tags !== undefined) updatePayload.tags = body.tags;

      // ── price_level: check column existence FIRST, then either DB or KV ──
      const priceLevelValue = body.price_level;
      const hasPriceLevelInBody = priceLevelValue !== undefined;
      if (hasPriceLevelInBody && hasPLCol) {
        updatePayload.price_level = priceLevelValue;
        console.log(`[contacts-api] price_level column exists — including in DB update: "${priceLevelValue}"`);
      } else if (hasPriceLevelInBody) {
        console.log(`[contacts-api] price_level column missing — will save "${priceLevelValue}" to KV after DB update`);
      }

      // Conditional columns (non-price_level)
      if (hasAOCol && body.account_owner_number !== undefined) {
        updatePayload.account_owner_number = body.account_owner_number;
      }
      if (hasLNCol && body.legacy_number !== undefined) updatePayload.legacy_number = body.legacy_number;
      if (hasFinCols && body.ptd_sales !== undefined) updatePayload.ptd_sales = body.ptd_sales;
      if (hasFinCols && body.ptd_gp_percent !== undefined) updatePayload.ptd_gp_percent = body.ptd_gp_percent;
      if (hasFinCols && body.ytd_sales !== undefined) updatePayload.ytd_sales = body.ytd_sales;
      if (hasFinCols && body.ytd_gp_percent !== undefined) updatePayload.ytd_gp_percent = body.ytd_gp_percent;
      if (hasFinCols && body.lyr_sales !== undefined) updatePayload.lyr_sales = body.lyr_sales;
      if (hasFinCols && body.lyr_gp_percent !== undefined) updatePayload.lyr_gp_percent = body.lyr_gp_percent;

      updatePayload.updated_at = new Date().toISOString();

      console.log(`[contacts-api] Update payload keys:`, Object.keys(updatePayload));

      // ── Attempt the update ───────────────────────────────────────────
      let updatedContact: any = null;
      let priceLevelSavedToKV = false;

      const { data: updateData, error: updateError } = await supabase
        .from('contacts')
        .update(updatePayload)
        .eq('id', contactId)
        .select('*')
        .single();

      if (updateError) {
        // If the error mentions price_level in schema cache despite our probe,
        // retry once without it (column may have been dropped since the probe)
        const isPriceLevelColumnError = hasPriceLevelInBody && hasPLCol && (
          updateError.code === '42703' ||
          (updateError.message && updateError.message.includes('price_level') && updateError.message.includes('schema cache'))
        );

        if (isPriceLevelColumnError) {
          console.warn(`[contacts-api] Stale cache — price_level column gone. Retrying without it.`);
          _hasPriceLevelCol = false;
          _plcolCheckTime = 0;
          delete updatePayload.price_level;

          const { data: retryData, error: retryError } = await supabase
            .from('contacts')
            .update(updatePayload)
            .eq('id', contactId)
            .select('*')
            .single();

          if (retryError) {
            console.error('[contacts-api] Retry update error:', retryError);
            return c.json({ error: 'Failed to update contact on retry: ' + retryError.message }, 500);
          }
          updatedContact = retryData;
          
          // Column was gone — save price_level to KV instead
          if (hasPriceLevelInBody) {
            try {
              await kv.set(`contact_price_level:${contactId}`, priceLevelValue);
              priceLevelSavedToKV = true;
              console.log(`[contacts-api] price_level saved to KV after retry: "${priceLevelValue}" for contact ${contactId}`);
            } catch (kvErr: any) {
              console.error(`[contacts-api] Failed to save price_level to KV after retry:`, kvErr.message);
            }
          }
        } else {
          console.error('[contacts-api] Update error:', updateError);
          return c.json({ error: 'Failed to update contact: ' + updateError.message }, 500);
        }
      } else {
        updatedContact = updateData;
        // If the update succeeded WITH price_level, confirm the cache
        if (hasPriceLevelInBody && hasPLCol && !_hasPriceLevelCol) {
          _hasPriceLevelCol = true;
          _plcolCheckTime = Date.now();
        }
      }

      // ── Save price_level to KV if the DB column doesn't exist ────────
      if (hasPriceLevelInBody && !hasPLCol) {
        try {
          await kv.set(`contact_price_level:${contactId}`, priceLevelValue);
          priceLevelSavedToKV = true;
          console.log(`[contacts-api] price_level saved to KV: "${priceLevelValue}" for contact ${contactId}`);
        } catch (kvErr: any) {
          console.error(`[contacts-api] Failed to save price_level to KV:`, kvErr.message);
        }
      }

      console.log(`[contacts-api] Contact updated. DB price_level="${updatedContact?.price_level}", KV=${priceLevelSavedToKV}`);

      // ── ALWAYS save optional fields to KV overlay (authoritative source) ──
      // This guarantees price_level, address, notes, tags, and financial data
      // survive even if the DB columns don't exist or the DB write silently drops them.
      try {
        const kvExtras: Record<string, any> = {};
        if (body.price_level !== undefined) kvExtras.price_level = body.price_level;
        if (body.address !== undefined) kvExtras.address = body.address;
        if (body.notes !== undefined) kvExtras.notes = body.notes;
        if (body.tags !== undefined) kvExtras.tags = body.tags;
        // Financial fields — always persist to KV so they survive missing DB columns
        if (body.ptd_sales !== undefined) kvExtras.ptd_sales = body.ptd_sales;
        if (body.ptd_gp_percent !== undefined) kvExtras.ptd_gp_percent = body.ptd_gp_percent;
        if (body.ytd_sales !== undefined) kvExtras.ytd_sales = body.ytd_sales;
        if (body.ytd_gp_percent !== undefined) kvExtras.ytd_gp_percent = body.ytd_gp_percent;
        if (body.lyr_sales !== undefined) kvExtras.lyr_sales = body.lyr_sales;
        if (body.lyr_gp_percent !== undefined) kvExtras.lyr_gp_percent = body.lyr_gp_percent;
        // Location fields
        if (body.city !== undefined) kvExtras.city = body.city;
        if (body.province !== undefined) kvExtras.province = body.province;
        if (body.postal_code !== undefined) kvExtras.postal_code = body.postal_code;
        
        if (Object.keys(kvExtras).length > 0) {
          // Merge with any existing overlay to preserve fields not in this update
          try {
            const existing = await kv.get(`contact_extras:${contactId}`);
            if (existing && typeof existing === 'object') {
              Object.assign(existing, kvExtras);
              await kv.set(`contact_extras:${contactId}`, existing);
            } else {
              await kv.set(`contact_extras:${contactId}`, kvExtras);
            }
          } catch {
            await kv.set(`contact_extras:${contactId}`, kvExtras);
          }
          console.log(`[contacts-api] KV overlay saved for contact ${contactId}:`, Object.keys(kvExtras));
        }
      } catch (kvOverlayErr: any) {
        console.error(`[contacts-api] Failed to save KV overlay:`, kvOverlayErr.message);
      }

      // ── VERIFICATION: re-read the row from DB to confirm write ────────
      try {
        const { data: verifyRow } = await supabase
          .from('contacts')
          .select('id, name, email, phone, company, status, updated_at')
          .eq('id', contactId)
          .single();
        console.log(`[contacts-api] VERIFY — DB row after update: name="${verifyRow?.name}", email="${verifyRow?.email}", status="${verifyRow?.status}", updated_at="${verifyRow?.updated_at}"`);
      } catch (verifyErr: any) {
        console.warn(`[contacts-api] Verification read failed:`, verifyErr.message);
      }

      // Enrich the response with the price_level from KV if needed
      const enrichedContact = { ...updatedContact };
      if (hasPriceLevelInBody) {
        // Always reflect the submitted price_level back in the response,
        // regardless of whether it went to DB or KV (or even if KV save failed).
        // This prevents the UI from reverting to T1 on save.
        enrichedContact.price_level = priceLevelValue;
      }
      // Always reflect submitted financial fields back in the response
      // so the UI doesn't lose them when DB columns don't exist
      if (body.ptd_sales !== undefined) enrichedContact.ptd_sales = body.ptd_sales;
      if (body.ptd_gp_percent !== undefined) enrichedContact.ptd_gp_percent = body.ptd_gp_percent;
      if (body.ytd_sales !== undefined) enrichedContact.ytd_sales = body.ytd_sales;
      if (body.ytd_gp_percent !== undefined) enrichedContact.ytd_gp_percent = body.ytd_gp_percent;
      if (body.lyr_sales !== undefined) enrichedContact.lyr_sales = body.lyr_sales;
      if (body.lyr_gp_percent !== undefined) enrichedContact.lyr_gp_percent = body.lyr_gp_percent;

      return c.json({ contact: enrichedContact });
    } catch (error: any) {
      console.error('[contacts-api] Unexpected error during update:', error);
      return c.json({ error: 'Internal server error in contacts update API: ' + error.message }, 500);
    }
  });

  // POST /contacts — create a new contact (bypasses RLS via service role key)
  app.post('/make-server-8405be07/contacts', async (c) => {
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      // Authenticate the requesting user
      const accessToken = extractUserToken(c);
      if (!accessToken) {
        return c.json({ error: 'Missing Authorization header in contacts create API' }, 401);
      }

      const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
      if (authError || !user) {
        return c.json({ error: 'Unauthorized in contacts create API: ' + (authError?.message || 'No user') }, 401);
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

      const userOrgId = profile.organization_id;

      console.log(`[contacts-api] POST /contacts — user=${profile.email}, org=${userOrgId}`);

      const body = await c.req.json();

      // Detect which columns exist (except price_level — handled optimistically below)
      const hasAOCol = await hasAccountOwnerColumn(supabase);
      const hasLNCol = await hasLegacyNumberColumn(supabase);
      const hasFinCols = await hasFinancialColumns(supabase);
      const hasPLCol = await hasPriceLevelColumn(supabase);
      const hasAddrCol = await hasAddressColumn(supabase);
      const hasNotCol = await hasNotesColumn(supabase);
      const hasTagCol = await hasTagsColumn(supabase);

      // Build the insert payload with only columns that exist
      const insertPayload: any = {
        organization_id: userOrgId,
        owner_id: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Standard fields
      if (body.name !== undefined) insertPayload.name = body.name;
      if (body.email !== undefined) insertPayload.email = body.email;
      if (body.phone !== undefined) insertPayload.phone = body.phone;
      if (body.company !== undefined) insertPayload.company = body.company;
      if (body.status !== undefined) insertPayload.status = body.status;

      // Conditional columns that might not exist yet
      if (hasAddrCol && body.address !== undefined) insertPayload.address = body.address;
      if (hasNotCol && body.notes !== undefined) insertPayload.notes = body.notes;
      if (hasTagCol && body.tags !== undefined) insertPayload.tags = body.tags;

      // ── price_level: check column existence FIRST ──
      const priceLevelValue = body.price_level;
      const hasPriceLevelInBody = priceLevelValue !== undefined;
      if (hasPriceLevelInBody && hasPLCol) {
        insertPayload.price_level = priceLevelValue;
        console.log(`[contacts-api] price_level column exists — including in insert: "${priceLevelValue}"`);
      } else if (hasPriceLevelInBody) {
        console.log(`[contacts-api] price_level column missing — will save "${priceLevelValue}" to KV after insert`);
      }

      // Conditional columns
      if (hasAOCol && body.account_owner_number !== undefined) {
        insertPayload.account_owner_number = body.account_owner_number;
      }
      if (hasLNCol && body.legacy_number !== undefined) insertPayload.legacy_number = body.legacy_number;
      if (hasFinCols && body.ptd_sales !== undefined) insertPayload.ptd_sales = body.ptd_sales;
      if (hasFinCols && body.ptd_gp_percent !== undefined) insertPayload.ptd_gp_percent = body.ptd_gp_percent;
      if (hasFinCols && body.ytd_sales !== undefined) insertPayload.ytd_sales = body.ytd_sales;
      if (hasFinCols && body.ytd_gp_percent !== undefined) insertPayload.ytd_gp_percent = body.ytd_gp_percent;
      if (hasFinCols && body.lyr_sales !== undefined) insertPayload.lyr_sales = body.lyr_sales;
      if (hasFinCols && body.lyr_gp_percent !== undefined) insertPayload.lyr_gp_percent = body.lyr_gp_percent;

      console.log(`[contacts-api] Insert payload keys:`, Object.keys(insertPayload));

      // ── Attempt the insert ──
      let newContact: any = null;
      let priceLevelSavedToKV = false;

      const { data: insertData, error: insertError } = await supabase
        .from('contacts')
        .insert([insertPayload])
        .select('*')
        .single();

      if (insertError) {
        // Safety net: if column detection was stale and price_level is in payload
        const isPriceLevelInsertError = hasPriceLevelInBody && hasPLCol && (
          insertError.code === '42703' ||
          (insertError.message && insertError.message.includes('price_level') && insertError.message.includes('schema cache'))
        );

        if (isPriceLevelInsertError) {
          console.warn(`[contacts-api] Stale cache — price_level column gone on insert. Retrying without it.`);
          _hasPriceLevelCol = false;
          _plcolCheckTime = 0;
          delete insertPayload.price_level;

          const { data: retryData, error: retryError } = await supabase
            .from('contacts')
            .insert([insertPayload])
            .select('*')
            .single();

          if (retryError) {
            console.error('[contacts-api] Retry insert error:', retryError);
            return c.json({ error: 'Failed to create contact on retry: ' + retryError.message }, 500);
          }
          newContact = retryData;
        } else {
          console.error('[contacts-api] Insert error:', insertError);
          return c.json({ error: 'Failed to create contact: ' + insertError.message }, 500);
        }
      } else {
        newContact = insertData;
        if (hasPriceLevelInBody && hasPLCol && !_hasPriceLevelCol) {
          _hasPriceLevelCol = true;
          _plcolCheckTime = Date.now();
        }
      }

      // ── Save price_level to KV if the DB column doesn't exist ────────
      if (hasPriceLevelInBody && !hasPLCol && newContact?.id) {
        try {
          await kv.set(`contact_price_level:${newContact.id}`, priceLevelValue);
          priceLevelSavedToKV = true;
          console.log(`[contacts-api] price_level saved to KV for new contact ${newContact.id}`);
        } catch (kvErr: any) {
          console.error(`[contacts-api] Failed to save price_level to KV:`, kvErr.message);
        }
      }

      console.log(`[contacts-api] Contact created successfully: ${newContact?.id}, name=${newContact?.name}`);

      // Enrich response if price_level was saved to KV
      const enrichedContact = { ...newContact };
      if (priceLevelSavedToKV) {
        enrichedContact.price_level = priceLevelValue;
      }

      // ── ALWAYS save optional fields to KV overlay for new contacts too ──
      if (newContact?.id) {
        try {
          const kvExtras: Record<string, any> = {};
          if (body.price_level !== undefined) kvExtras.price_level = body.price_level;
          if (body.address !== undefined) kvExtras.address = body.address;
          if (body.notes !== undefined) kvExtras.notes = body.notes;
          if (body.tags !== undefined) kvExtras.tags = body.tags;
          // Financial fields — always persist to KV so they survive missing DB columns
          if (body.ptd_sales !== undefined) kvExtras.ptd_sales = body.ptd_sales;
          if (body.ptd_gp_percent !== undefined) kvExtras.ptd_gp_percent = body.ptd_gp_percent;
          if (body.ytd_sales !== undefined) kvExtras.ytd_sales = body.ytd_sales;
          if (body.ytd_gp_percent !== undefined) kvExtras.ytd_gp_percent = body.ytd_gp_percent;
          if (body.lyr_sales !== undefined) kvExtras.lyr_sales = body.lyr_sales;
          if (body.lyr_gp_percent !== undefined) kvExtras.lyr_gp_percent = body.lyr_gp_percent;
          // Location fields
          if (body.city !== undefined) kvExtras.city = body.city;
          if (body.province !== undefined) kvExtras.province = body.province;
          if (body.postal_code !== undefined) kvExtras.postal_code = body.postal_code;
          if (Object.keys(kvExtras).length > 0) {
            await kv.set(`contact_extras:${newContact.id}`, kvExtras);
            console.log(`[contacts-api] KV overlay saved for new contact ${newContact.id}:`, Object.keys(kvExtras));
            // Also reflect in the response
            Object.assign(enrichedContact, kvExtras);
          }
        } catch (kvOverlayErr: any) {
          console.error(`[contacts-api] Failed to save KV overlay for new contact:`, kvOverlayErr.message);
        }
      }

      return c.json({ contact: enrichedContact }, 201);
    } catch (error: any) {
      console.error('[contacts-api] Unexpected error during create:', error);
      return c.json({ error: 'Internal server error in contacts create API: ' + error.message }, 500);
    }
  });

  // DELETE /contacts/:id — delete a contact (bypasses RLS via service role key)
  app.delete('/make-server-8405be07/contacts/:id', async (c) => {
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      const accessToken = extractUserToken(c);
      if (!accessToken) {
        return c.json({ error: 'Missing Authorization header in contacts delete API' }, 401);
      }

      const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
      if (authError || !user) {
        return c.json({ error: 'Unauthorized in contacts delete API: ' + (authError?.message || 'No user') }, 401);
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
      const contactId = c.req.param('id');

      console.log(`[contacts-api] DELETE /contacts/${contactId} — user=${profile.email}, role=${userRole}`);

      // Verify the contact exists and belongs to user's org
      const { data: existingContact, error: fetchError } = await supabase
        .from('contacts')
        .select('id, organization_id, owner_id')
        .eq('id', contactId)
        .single();

      if (fetchError || !existingContact) {
        return c.json({ error: 'Contact not found: ' + contactId }, 404);
      }

      if (existingContact.organization_id !== userOrgId && userRole !== 'super_admin') {
        return c.json({ error: 'Contact does not belong to your organization' }, 403);
      }

      if (['standard_user', 'restricted'].includes(userRole) && existingContact.owner_id !== user.id) {
        return c.json({ error: 'You can only delete your own contacts' }, 403);
      }

      const { error: deleteError } = await supabase
        .from('contacts')
        .delete()
        .eq('id', contactId);

      if (deleteError) {
        console.error('[contacts-api] Delete error:', deleteError);
        return c.json({ error: 'Failed to delete contact: ' + deleteError.message }, 500);
      }

      // Clean up KV price_level entry
      try {
        await kv.del(`contact_price_level:${contactId}`);
        await kv.del(`contact_extras:${contactId}`);
      } catch (_) { /* ignore */ }

      console.log(`[contacts-api] Contact deleted successfully: ${contactId}`);
      return c.json({ success: true });
    } catch (error: any) {
      console.error('[contacts-api] Unexpected error during delete:', error);
      return c.json({ error: 'Internal server error in contacts delete API: ' + error.message }, 500);
    }
  });
}