import { Hono } from 'npm:hono';
import { cors } from 'npm:hono/cors';
import { logger } from 'npm:hono/logger';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import * as kv from './kv_store.tsx';

// ═══════════════════════════════════════════════════════════════════════════
// ProSpaces CRM — Consolidated Edge Function (v4 — 2025-02-21)
// All routes inlined to avoid multi-file deployment issues.
// ═══════════════════════════════════════════════════════════════════════════

const PREFIX = '/make-server-8405be07';

// ── Auth helper ────────────────────────────────────────────────────────────
function extractUserToken(c: any): string | null {
  const userToken = c.req.header('X-User-Token');
  if (userToken) return userToken;
  const authHeader = c.req.header('Authorization');
  if (authHeader?.startsWith('Bearer ')) return authHeader.split(' ')[1] || null;
  return null;
}

function getSupabase() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );
}

async function authenticateUser(c: any) {
  const supabase = getSupabase();
  const token = extractUserToken(c);
  if (!token) return { error: 'Missing auth token (send X-User-Token header)', status: 401 as const, supabase, user: null as any, profile: null as any };
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return { error: 'Unauthorized: ' + (authError?.message || 'No user'), status: 401 as const, supabase, user: null as any, profile: null as any };
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  const effectiveRole = profile?.role || user.user_metadata?.role || 'standard_user';
  const effectiveOrg = profile?.organization_id || user.user_metadata?.organizationId;
  return { error: null, status: 200 as const, supabase, user, profile: { ...profile, role: effectiveRole, organization_id: effectiveOrg } };
}

// ── Build the api router ───────────────────────────────────────────────────
const api = new Hono();

// ═══════════════════════════════════════════════════════════════════════════
// HEALTH / DEBUG
// ═══════════════════════════════════════════════════════════════════════════
api.get(`${PREFIX}/health`, (c) => {
  return c.json({
    status: 'ok',
    version: 'v4-consolidated-2025-02-21',
    timestamp: new Date().toISOString(),
    note: 'All routes inlined in index.tsx',
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// PERMISSIONS  (KV-based)
// ═══════════════════════════════════════════════════════════════════════════
api.get(`${PREFIX}/permissions`, async (c) => {
  try {
    const auth = await authenticateUser(c);
    if (auth.error) return c.json({ error: auth.error }, auth.status);
    const orgId = c.req.query('organization_id') || auth.profile.organization_id;
    if (!orgId) return c.json({ error: 'Missing organization_id' }, 400);
    console.log(`[permissions] GET org=${orgId} user=${auth.user.email}`);
    const kvKey = `permissions:${orgId}`;
    const permissions = await kv.get(kvKey);
    return c.json({ permissions: permissions || [], source: 'kv' });
  } catch (err: any) {
    console.error('[permissions] GET error:', err);
    return c.json({ error: err.message }, 500);
  }
});

api.put(`${PREFIX}/permissions`, async (c) => {
  try {
    const auth = await authenticateUser(c);
    if (auth.error) return c.json({ error: auth.error }, auth.status);
    if (!['admin', 'super_admin'].includes(auth.profile.role)) return c.json({ error: 'Only admin/super_admin can save permissions' }, 403);
    const orgId = auth.profile.organization_id;
    if (!orgId) return c.json({ error: 'No org found' }, 400);
    const body = await c.req.json();
    const { permissions, changedBy, changeDescription } = body;
    const kvKey = `permissions:${orgId}`;
    await kv.set(kvKey, permissions);
    console.log(`[permissions] Saved ${permissions?.length || 0} permissions for org=${orgId}`);
    // Audit log
    if (changedBy && changeDescription) {
      const auditKey = `audit_logs:${orgId}`;
      let existingLogs: any[] = [];
      try { existingLogs = (await kv.get(auditKey)) || []; } catch {}
      existingLogs.unshift({ timestamp: new Date().toISOString(), changedBy, changeDescription, permissionCount: permissions?.length });
      if (existingLogs.length > 100) existingLogs = existingLogs.slice(0, 100);
      await kv.set(auditKey, existingLogs);
    }
    return c.json({ success: true, source: 'kv' });
  } catch (err: any) {
    console.error('[permissions] PUT error:', err);
    return c.json({ error: err.message }, 500);
  }
});

api.get(`${PREFIX}/permissions/audit-logs`, async (c) => {
  try {
    const auth = await authenticateUser(c);
    if (auth.error) return c.json({ error: auth.error }, auth.status);
    if (!['admin', 'super_admin'].includes(auth.profile.role)) return c.json({ error: 'Only admin/super_admin can view audit logs' }, 403);
    const orgId = c.req.query('organization_id') || auth.profile.organization_id;
    const auditKey = `audit_logs:${orgId}`;
    const logs = await kv.get(auditKey);
    return c.json({ auditLogs: logs || [] });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// CONTACTS
// ═══════════════════════════════════════════════════════════════════════════
api.get(`${PREFIX}/contacts`, async (c) => {
  try {
    const auth = await authenticateUser(c);
    if (auth.error) return c.json({ error: auth.error }, auth.status);
    const userRole = auth.profile.role;
    const userOrgId = auth.profile.organization_id;
    const userEmail = auth.profile.email || auth.user.email || '';
    const scope = c.req.query('scope') || 'personal';
    console.log(`[contacts] GET scope=${scope} user=${userEmail} role=${userRole} org=${userOrgId}`);

    // Detect account_owner_number column
    let hasAOCol = false;
    try {
      const { error } = await auth.supabase.from('contacts').select('account_owner_number').limit(0);
      hasAOCol = !error;
    } catch {}

    let query = auth.supabase.from('contacts').select('*');
    if (scope === 'personal') {
      if (userRole !== 'super_admin') {
        if (hasAOCol && userEmail) {
          query = query.eq('organization_id', userOrgId).or(`owner_id.eq.${auth.user.id},account_owner_number.ilike.${userEmail}`);
        } else {
          query = query.eq('organization_id', userOrgId).eq('owner_id', auth.user.id);
        }
      }
    } else {
      if (userRole === 'super_admin') { /* no filter */ }
      else if (['admin', 'manager', 'director', 'marketing'].includes(userRole)) {
        query = query.eq('organization_id', userOrgId);
      } else {
        if (hasAOCol && userEmail) {
          query = query.eq('organization_id', userOrgId).or(`owner_id.eq.${auth.user.id},account_owner_number.ilike.${userEmail}`);
        } else {
          query = query.eq('organization_id', userOrgId).eq('owner_id', auth.user.id);
        }
      }
    }

    const { data: contacts, error: queryError } = await query.order('created_at', { ascending: false });
    if (queryError) {
      // Retry without account_owner_number if column error
      if (queryError.code === '42703') {
        const retry = auth.supabase.from('contacts').select('*').eq('organization_id', userOrgId).eq('owner_id', auth.user.id).order('created_at', { ascending: false });
        const { data: retryData } = await retry;
        return c.json({ contacts: retryData || [], meta: { count: retryData?.length || 0, role: userRole, fallback: true } });
      }
      return c.json({ error: 'Contacts query failed: ' + queryError.message }, 500);
    }

    // Enrich with KV price_levels if DB column missing
    let enrichedContacts = contacts || [];
    try {
      const { error: plError } = await auth.supabase.from('contacts').select('price_level').limit(0);
      if (plError && enrichedContacts.length > 0) {
        const kvKeys = enrichedContacts.map((ct: any) => `contact_price_level:${ct.id}`);
        const { data: kvRows } = await auth.supabase.from('kv_store_8405be07').select('key, value').in('key', kvKeys);
        if (kvRows) {
          const plMap = new Map<string, string>();
          for (const row of kvRows) plMap.set(row.key.replace('contact_price_level:', ''), row.value);
          for (const ct of enrichedContacts) { const pl = plMap.get(ct.id); if (pl) ct.price_level = pl; }
        }
      }
    } catch {}

    console.log(`[contacts] Returning ${enrichedContacts.length} contacts`);
    return c.json({ contacts: enrichedContacts, meta: { count: enrichedContacts.length, role: userRole } });
  } catch (err: any) {
    console.error('[contacts] GET error:', err);
    return c.json({ error: err.message }, 500);
  }
});

api.patch(`${PREFIX}/contacts/:id`, async (c) => {
  try {
    const auth = await authenticateUser(c);
    if (auth.error) return c.json({ error: auth.error }, auth.status);
    const contactId = c.req.param('id');
    const body = await c.req.json();
    console.log(`[contacts] PATCH ${contactId} keys=${Object.keys(body).join(',')}`);

    // Verify contact exists and belongs to user's org
    const { data: existing } = await auth.supabase.from('contacts').select('id, organization_id, owner_id').eq('id', contactId).single();
    if (!existing) return c.json({ error: 'Contact not found' }, 404);
    if (existing.organization_id !== auth.profile.organization_id && auth.profile.role !== 'super_admin') return c.json({ error: 'Wrong organization' }, 403);

    const updatePayload: any = { updated_at: new Date().toISOString() };
    for (const field of ['name', 'email', 'phone', 'company', 'status', 'address', 'notes', 'tags', 'price_level', 'account_owner_number', 'legacy_number', 'ptd_sales', 'ptd_gp_percent', 'ytd_sales', 'ytd_gp_percent', 'lyr_sales', 'lyr_gp_percent']) {
      if (body[field] !== undefined) updatePayload[field] = body[field];
    }

    const { data: updated, error: updateError } = await auth.supabase.from('contacts').update(updatePayload).eq('id', contactId).select('*').single();
    if (updateError) {
      // Retry without price_level if column doesn't exist
      if (updateError.code === '42703' && body.price_level !== undefined) {
        delete updatePayload.price_level;
        const { data: retry, error: retryErr } = await auth.supabase.from('contacts').update(updatePayload).eq('id', contactId).select('*').single();
        if (retryErr) return c.json({ error: retryErr.message }, 500);
        await kv.set(`contact_price_level:${contactId}`, body.price_level);
        return c.json({ contact: { ...retry, price_level: body.price_level } });
      }
      return c.json({ error: updateError.message }, 500);
    }
    return c.json({ contact: updated });
  } catch (err: any) {
    console.error('[contacts] PATCH error:', err);
    return c.json({ error: err.message }, 500);
  }
});

api.post(`${PREFIX}/contacts`, async (c) => {
  try {
    const auth = await authenticateUser(c);
    if (auth.error) return c.json({ error: auth.error }, auth.status);
    const body = await c.req.json();
    const insertPayload: any = { organization_id: auth.profile.organization_id, owner_id: auth.user.id, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    for (const field of ['name', 'email', 'phone', 'company', 'status', 'address', 'notes', 'tags', 'price_level', 'account_owner_number', 'legacy_number']) {
      if (body[field] !== undefined) insertPayload[field] = body[field];
    }
    const { data, error } = await auth.supabase.from('contacts').insert([insertPayload]).select('*').single();
    if (error) {
      if (error.code === '42703' && body.price_level !== undefined) {
        delete insertPayload.price_level;
        const { data: retry, error: retryErr } = await auth.supabase.from('contacts').insert([insertPayload]).select('*').single();
        if (retryErr) return c.json({ error: retryErr.message }, 500);
        if (retry?.id) await kv.set(`contact_price_level:${retry.id}`, body.price_level);
        return c.json({ contact: { ...retry, price_level: body.price_level } }, 201);
      }
      return c.json({ error: error.message }, 500);
    }
    return c.json({ contact: data }, 201);
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

api.delete(`${PREFIX}/contacts/:id`, async (c) => {
  try {
    const auth = await authenticateUser(c);
    if (auth.error) return c.json({ error: auth.error }, auth.status);
    const contactId = c.req.param('id');
    const { data: existing } = await auth.supabase.from('contacts').select('id, organization_id').eq('id', contactId).single();
    if (!existing) return c.json({ error: 'Contact not found' }, 404);
    if (existing.organization_id !== auth.profile.organization_id && auth.profile.role !== 'super_admin') return c.json({ error: 'Wrong organization' }, 403);
    const { error } = await auth.supabase.from('contacts').delete().eq('id', contactId);
    if (error) return c.json({ error: error.message }, 500);
    return c.json({ success: true });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// QUOTES
// ═══════════════════════════════════════════════════════════════════════════
api.get(`${PREFIX}/quotes`, async (c) => {
  try {
    const auth = await authenticateUser(c);
    if (auth.error) return c.json({ error: auth.error }, auth.status);
    const scope = c.req.query('scope') || 'personal';
    let query = auth.supabase.from('quotes').select('*');
    if (scope === 'personal') {
      if (auth.profile.role !== 'super_admin') {
        if (auth.profile.organization_id) query = query.or(`organization_id.eq.${auth.profile.organization_id},organization_id.is.null`);
        query = query.eq('created_by', auth.user.id);
      }
    } else {
      if (auth.profile.role === 'super_admin') { /* no filter */ }
      else if (['admin', 'manager', 'director', 'marketing'].includes(auth.profile.role)) {
        if (auth.profile.organization_id) query = query.or(`organization_id.eq.${auth.profile.organization_id},organization_id.is.null`);
      } else {
        if (auth.profile.organization_id) query = query.or(`organization_id.eq.${auth.profile.organization_id},organization_id.is.null`);
        query = query.eq('created_by', auth.user.id);
      }
    }
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) return c.json({ error: error.message }, 500);
    return c.json({ quotes: data || [], meta: { count: data?.length || 0, role: auth.profile.role } });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

api.post(`${PREFIX}/quotes`, async (c) => {
  try {
    const auth = await authenticateUser(c);
    if (auth.error) return c.json({ error: auth.error }, auth.status);
    const body = await c.req.json();
    const payload = { ...body, organization_id: auth.profile.organization_id, created_by: auth.user.id, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    const { data, error } = await auth.supabase.from('quotes').insert([payload]).select('*').single();
    if (error) return c.json({ error: error.message }, 500);
    return c.json({ quote: data }, 201);
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

api.get(`${PREFIX}/quotes/tracking-status`, async (c) => {
  try {
    const auth = await authenticateUser(c);
    if (auth.error) return c.json({ error: auth.error }, auth.status);
    // Check if tracking_status column exists
    const { error: colError } = await auth.supabase.from('quotes').select('tracking_status').limit(0);
    if (colError) return c.json({ trackingStatuses: [], columnExists: false });
    let query = auth.supabase.from('quotes').select('id, tracking_status, status, title, contact_name');
    if (auth.profile.role !== 'super_admin' && auth.profile.organization_id) {
      query = query.or(`organization_id.eq.${auth.profile.organization_id},organization_id.is.null`);
    }
    const { data } = await query;
    return c.json({ trackingStatuses: data || [], columnExists: true });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// BIDS
// ═══════════════════════════════════════════════════════════════════════════
api.get(`${PREFIX}/bids`, async (c) => {
  try {
    const auth = await authenticateUser(c);
    if (auth.error) return c.json({ error: auth.error }, auth.status);
    const scope = c.req.query('scope') || 'personal';
    let query = auth.supabase.from('bids').select('*');
    if (scope === 'personal') {
      if (auth.profile.role !== 'super_admin') {
        if (auth.profile.organization_id) query = query.or(`organization_id.eq.${auth.profile.organization_id},organization_id.is.null`);
        query = query.eq('created_by', auth.user.id);
      }
    } else {
      if (auth.profile.role === 'super_admin') { /* no filter */ }
      else if (['admin', 'manager', 'director', 'marketing'].includes(auth.profile.role)) {
        if (auth.profile.organization_id) query = query.or(`organization_id.eq.${auth.profile.organization_id},organization_id.is.null`);
      } else {
        if (auth.profile.organization_id) query = query.or(`organization_id.eq.${auth.profile.organization_id},organization_id.is.null`);
        query = query.eq('created_by', auth.user.id);
      }
    }
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) return c.json({ error: error.message }, 500);
    return c.json({ bids: data || [], meta: { count: data?.length || 0, role: auth.profile.role } });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

api.post(`${PREFIX}/bids`, async (c) => {
  try {
    const auth = await authenticateUser(c);
    if (auth.error) return c.json({ error: auth.error }, auth.status);
    const body = await c.req.json();
    const payload = { ...body, organization_id: body.organization_id || auth.profile.organization_id, created_by: body.created_by || auth.user.id, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    if (!payload.status) payload.status = 'Draft';
    const { data, error } = await auth.supabase.from('bids').insert([payload]).select('*').single();
    if (error) return c.json({ error: error.message }, 500);
    return c.json({ bid: data }, 201);
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// PROFILES
// ═══════════════════════════════════════════════════════════════════════════
api.get(`${PREFIX}/profiles`, async (c) => {
  try {
    const auth = await authenticateUser(c);
    if (auth.error) return c.json({ error: auth.error }, auth.status);
    let query = auth.supabase.from('profiles').select('*');
    if (auth.profile.role !== 'super_admin' && auth.profile.organization_id) {
      query = query.eq('organization_id', auth.profile.organization_id);
    }
    const { data, error } = await query;
    if (error) return c.json({ error: error.message }, 500);
    return c.json({ profiles: data || [] });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

api.get(`${PREFIX}/profiles/ensure`, async (c) => {
  try {
    const auth = await authenticateUser(c);
    if (auth.error) return c.json({ error: auth.error }, auth.status);
    const { data: existing } = await auth.supabase.from('profiles').select('id').eq('id', auth.user.id).maybeSingle();
    if (existing) return c.json({ created: false, profileId: existing.id });
    const { data: newProfile, error } = await auth.supabase.from('profiles').insert([{
      id: auth.user.id, email: auth.user.email, name: auth.user.user_metadata?.name || auth.user.email,
      role: auth.user.user_metadata?.role || 'standard_user', organization_id: auth.user.user_metadata?.organizationId,
      status: 'active', created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }]).select().single();
    if (error) return c.json({ error: error.message }, 500);
    return c.json({ created: true, profileId: newProfile?.id });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// SETTINGS
// ═══════════════════════════════════════════════════════════════════════════
api.get(`${PREFIX}/settings/organization`, async (c) => {
  try {
    const auth = await authenticateUser(c);
    if (auth.error) return c.json({ error: auth.error }, auth.status);
    const orgId = c.req.query('organization_id') || auth.profile.organization_id;
    if (!orgId) return c.json({ error: 'Missing organization_id' }, 400);
    const { data, error } = await auth.supabase.from('organization_settings').select('*').eq('organization_id', orgId).single();
    if (error) {
      if (error.code === 'PGRST116') return c.json({ settings: null, source: 'server-not-found' });
      if (error.code === 'PGRST205' || error.code === '42P01') return c.json({ settings: null, source: 'server-table-missing' });
      return c.json({ error: error.message }, 500);
    }
    return c.json({ settings: data, source: 'server' });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

api.put(`${PREFIX}/settings/organization`, async (c) => {
  try {
    const auth = await authenticateUser(c);
    if (auth.error) return c.json({ error: auth.error }, auth.status);
    if (!['admin', 'super_admin'].includes(auth.profile.role)) return c.json({ error: 'Forbidden' }, 403);
    const body = await c.req.json();
    const orgId = body.organization_id || auth.profile.organization_id;
    const dbSettings: any = { ...body, organization_id: orgId, updated_at: new Date().toISOString() };
    delete dbSettings.price_tier_labels;
    const { data, error } = await auth.supabase.from('organization_settings').upsert(dbSettings, { onConflict: 'organization_id' }).select().single();
    if (error) return c.json({ error: error.message }, 500);
    return c.json({ settings: data, source: 'server' });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

api.get(`${PREFIX}/settings/theme`, async (c) => {
  try {
    const auth = await authenticateUser(c);
    if (auth.error) return c.json({ error: auth.error }, auth.status);
    const theme = await kv.get(`user_theme:${auth.user.id}`);
    return c.json({ theme: theme || null });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

api.put(`${PREFIX}/settings/theme`, async (c) => {
  try {
    const auth = await authenticateUser(c);
    if (auth.error) return c.json({ error: auth.error }, auth.status);
    const { theme } = await c.req.json();
    if (!theme) return c.json({ error: 'Missing theme' }, 400);
    await kv.set(`user_theme:${auth.user.id}`, theme);
    return c.json({ success: true });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

api.patch(`${PREFIX}/settings/profile`, async (c) => {
  try {
    const auth = await authenticateUser(c);
    if (auth.error) return c.json({ error: auth.error }, auth.status);
    const body = await c.req.json();
    const targetUserId = body.user_id || auth.user.id;
    if (auth.profile.role !== 'super_admin' && targetUserId !== auth.user.id) return c.json({ error: 'Cannot update another user' }, 403);
    const updateData: any = {};
    if (body.name) updateData.name = body.name;
    if ('avatar_url' in body) updateData.avatar_url = body.avatar_url;
    if (Object.keys(updateData).length === 0) return c.json({ success: true });
    const { data, error } = await auth.supabase.from('profiles').update(updateData).eq('id', targetUserId).select().single();
    if (error) return c.json({ error: error.message }, 500);
    return c.json({ profile: data, source: 'server' });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// PORTAL — Customer Portal (KV-based)
// ═══════════════════════════════════════════════════════════════════════════
function hexEncode(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}
async function hashEmail(email: string): Promise<string> {
  const data = new TextEncoder().encode(email.toLowerCase().trim());
  return hexEncode(await crypto.subtle.digest('SHA-256', data));
}
async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(password);
  return hexEncode(await crypto.subtle.digest('SHA-256', data));
}
function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return hexEncode(bytes.buffer);
}
function generateInviteCode(): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return hexEncode(bytes.buffer).toUpperCase();
}

const PORTAL = `${PREFIX}/portal`;

api.get(`${PORTAL}/crm-messages`, async (c) => {
  try {
    const auth = await authenticateUser(c);
    if (auth.error) return c.json({ error: auth.error }, auth.status);
    const orgId = auth.profile.organization_id;
    if (!orgId) return c.json({ error: 'No organization found' }, 400);
    const allMessages = await kv.getByPrefix(`portal_message:${orgId}:`);
    const contactIds = [...new Set((allMessages || []).map((m: any) => m.contactId).filter(Boolean))];
    let contactMap: Record<string, any> = {};
    if (contactIds.length > 0) {
      const { data: contacts } = await auth.supabase.from('contacts').select('id, name, email, company').in('id', contactIds);
      if (contacts) contacts.forEach((ct: any) => { contactMap[ct.id] = ct; });
    }
    const enriched = (allMessages || []).map((msg: any) => ({
      ...msg,
      contactName: contactMap[msg.contactId]?.name || msg.senderEmail || 'Unknown',
      contactCompany: contactMap[msg.contactId]?.company || '',
      contactEmail: contactMap[msg.contactId]?.email || msg.senderEmail || '',
    }));
    enriched.sort((a: any, b: any) => {
      const aL = a.replies?.length > 0 ? a.replies[a.replies.length - 1].createdAt : a.createdAt;
      const bL = b.replies?.length > 0 ? b.replies[b.replies.length - 1].createdAt : b.createdAt;
      return new Date(bL).getTime() - new Date(aL).getTime();
    });
    return c.json({ messages: enriched });
  } catch (err: any) {
    console.error('[portal] CRM messages error:', err);
    return c.json({ error: err.message }, 500);
  }
});

api.post(`${PORTAL}/invite`, async (c) => {
  try {
    const auth = await authenticateUser(c);
    if (auth.error) return c.json({ error: auth.error }, auth.status);
    const { contactId, email } = await c.req.json();
    if (!contactId || !email) return c.json({ error: 'Missing contactId or email' }, 400);
    const orgId = auth.profile.organization_id;
    const inviteCode = generateInviteCode();
    await kv.set(`portal_invite:${inviteCode}`, {
      contactId, orgId, email: email.toLowerCase().trim(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      createdBy: auth.user.id,
    });
    await kv.set(`portal_access_log:${orgId}:${contactId}`, {
      enabled: true, enabledAt: new Date().toISOString(), enabledBy: auth.user.email || auth.user.id,
    });
    return c.json({ success: true, inviteCode, expiresIn: '7 days' });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

api.post(`${PORTAL}/register`, async (c) => {
  try {
    const { inviteCode, password } = await c.req.json();
    if (!inviteCode || !password) return c.json({ error: 'Missing inviteCode or password' }, 400);
    const invite = await kv.get(`portal_invite:${inviteCode}`);
    if (!invite) return c.json({ error: 'Invalid or expired invite code' }, 404);
    if (new Date(invite.expiresAt) < new Date()) return c.json({ error: 'Invite code expired' }, 410);
    const emailHash = await hashEmail(invite.email);
    const existing = await kv.get(`portal_user:${emailHash}`);
    if (existing) return c.json({ error: 'Account already exists. Please log in.' }, 409);
    await kv.set(`portal_user:${emailHash}`, {
      email: invite.email.toLowerCase().trim(), contactId: invite.contactId, orgId: invite.orgId,
      passwordHash: await hashPassword(password), name: invite.email.split('@')[0],
      createdAt: new Date().toISOString(), lastLogin: new Date().toISOString(),
    });
    const sessionToken = generateToken();
    await kv.set(`portal_session:${sessionToken}`, {
      email: invite.email.toLowerCase().trim(), contactId: invite.contactId, orgId: invite.orgId,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });
    await kv.del(`portal_invite:${inviteCode}`);
    return c.json({ success: true, sessionToken, contactId: invite.contactId, orgId: invite.orgId });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

api.post(`${PORTAL}/login`, async (c) => {
  try {
    const { email, password } = await c.req.json();
    if (!email || !password) return c.json({ error: 'Missing email or password' }, 400);
    const emailHash = await hashEmail(email);
    const portalUser = await kv.get(`portal_user:${emailHash}`);
    if (!portalUser) return c.json({ error: 'No portal account found' }, 404);
    const pwHash = await hashPassword(password);
    if (pwHash !== portalUser.passwordHash) return c.json({ error: 'Invalid password' }, 401);
    portalUser.lastLogin = new Date().toISOString();
    await kv.set(`portal_user:${emailHash}`, portalUser);
    const sessionToken = generateToken();
    await kv.set(`portal_session:${sessionToken}`, {
      email: portalUser.email, contactId: portalUser.contactId, orgId: portalUser.orgId,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });
    return c.json({ success: true, sessionToken, contactId: portalUser.contactId, orgId: portalUser.orgId });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

api.get(`${PORTAL}/session`, async (c) => {
  try {
    const token = c.req.header('X-Portal-Token');
    if (!token) return c.json({ error: 'Missing X-Portal-Token' }, 401);
    const session = await kv.get(`portal_session:${token}`);
    if (!session) return c.json({ error: 'Invalid session' }, 401);
    if (new Date(session.expiresAt) < new Date()) return c.json({ error: 'Session expired' }, 401);
    return c.json({ valid: true, ...session });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

api.get(`${PORTAL}/messages`, async (c) => {
  try {
    const token = c.req.header('X-Portal-Token');
    if (!token) return c.json({ error: 'Missing X-Portal-Token' }, 401);
    const session = await kv.get(`portal_session:${token}`);
    if (!session || new Date(session.expiresAt) < new Date()) return c.json({ error: 'Invalid session' }, 401);
    const messages = await kv.getByPrefix(`portal_message:${session.orgId}:${session.contactId}:`);
    return c.json({ messages: messages || [] });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

api.post(`${PORTAL}/messages`, async (c) => {
  try {
    const token = c.req.header('X-Portal-Token');
    if (!token) return c.json({ error: 'Missing X-Portal-Token' }, 401);
    const session = await kv.get(`portal_session:${token}`);
    if (!session || new Date(session.expiresAt) < new Date()) return c.json({ error: 'Invalid session' }, 401);
    const { subject, body } = await c.req.json();
    if (!subject || !body) return c.json({ error: 'Missing subject or body' }, 400);
    const msgId = crypto.randomUUID();
    const msgData = {
      id: msgId, contactId: session.contactId, orgId: session.orgId,
      from: 'customer', senderEmail: session.email, subject, body,
      createdAt: new Date().toISOString(), read: false, replies: [],
    };
    await kv.set(`portal_message:${session.orgId}:${session.contactId}:${msgId}`, msgData);
    return c.json({ success: true, message: msgData });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

api.post(`${PORTAL}/reply`, async (c) => {
  try {
    const auth = await authenticateUser(c);
    if (auth.error) return c.json({ error: auth.error }, auth.status);
    const { messageId, contactId, body: replyBody } = await c.req.json();
    if (!messageId || !contactId || !replyBody) return c.json({ error: 'Missing fields' }, 400);
    const orgId = auth.profile.organization_id;
    const key = `portal_message:${orgId}:${contactId}:${messageId}`;
    const msg = await kv.get(key);
    if (!msg) return c.json({ error: 'Message not found' }, 404);
    msg.replies = msg.replies || [];
    msg.replies.push({ from: 'crm', body: replyBody, createdAt: new Date().toISOString(), senderName: auth.profile.name || auth.user.email, customerUnread: true });
    msg.read = true;
    await kv.set(key, msg);
    return c.json({ success: true, message: msg });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

api.get(`${PORTAL}/users`, async (c) => {
  try {
    const auth = await authenticateUser(c);
    if (auth.error) return c.json({ error: auth.error }, auth.status);
    const orgId = auth.profile.organization_id;
    const accessLogs = await kv.getByPrefix(`portal_access_log:${orgId}:`);
    return c.json({ portalUsers: accessLogs || [] });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

api.put(`${PORTAL}/disable`, async (c) => {
  try {
    const auth = await authenticateUser(c);
    if (auth.error) return c.json({ error: auth.error }, auth.status);
    const { contactId } = await c.req.json();
    const orgId = auth.profile.organization_id;
    await kv.set(`portal_access_log:${orgId}:${contactId}`, {
      ...((await kv.get(`portal_access_log:${orgId}:${contactId}`)) || {}),
      enabled: false, disabledAt: new Date().toISOString(), disabledBy: auth.user.email,
    });
    return c.json({ success: true });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// AZURE / MICROSOFT OAUTH
// ═══════════════════════════════════════════════════════════════════════════
api.post(`${PREFIX}/microsoft-oauth-init`, async (c) => {
  try {
    console.log('[Azure OAuth v4] Initiating OAuth flow');
    const token = extractUserToken(c);
    if (!token) return c.json({ error: 'Authorization required (send X-User-Token header)', version: 'v4' }, 401);
    const supabase = getSupabase();
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      console.error('[Azure OAuth v4] Auth failed:', userError?.message);
      return c.json({ error: '[v4] User auth failed: ' + (userError?.message || 'No user found'), version: 'v4' }, 401);
    }
    const AZURE_CLIENT_ID = Deno.env.get('AZURE_CLIENT_ID');
    const AZURE_REDIRECT_URI = Deno.env.get('AZURE_REDIRECT_URI');
    if (!AZURE_CLIENT_ID || !AZURE_REDIRECT_URI) return c.json({ error: 'Azure OAuth not configured' }, 500);
    const state = crypto.randomUUID();
    await kv.set(`oauth_state:${state}`, { userId: user.id, provider: 'microsoft', timestamp: new Date().toISOString() });
    const scopes = ['offline_access', 'Mail.Read', 'Mail.ReadWrite', 'Mail.Send', 'User.Read', 'Calendars.Read', 'Calendars.ReadWrite'].join(' ');
    const authUrl = new URL('https://login.microsoftonline.com/common/oauth2/v2.0/authorize');
    authUrl.searchParams.set('client_id', AZURE_CLIENT_ID);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('redirect_uri', AZURE_REDIRECT_URI);
    authUrl.searchParams.set('response_mode', 'query');
    authUrl.searchParams.set('scope', scopes);
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('prompt', 'consent');
    return c.json({ success: true, authUrl: authUrl.toString(), pollId: state });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

api.get(`${PREFIX}/azure-health`, (c) => {
  return c.json({
    status: 'ok', configured: !!(Deno.env.get('AZURE_CLIENT_ID') && Deno.env.get('AZURE_CLIENT_SECRET') && Deno.env.get('AZURE_REDIRECT_URI')),
    timestamp: new Date().toISOString(),
  });
});

api.get(`${PREFIX}/azure-oauth-callback`, async (c) => {
  try {
    const code = c.req.query('code');
    const state = c.req.query('state');
    const error = c.req.query('error');
    if (error) return c.html(`<html><body><h2>OAuth Error</h2><p>${error}</p><script>window.close();</script></body></html>`);
    if (!code || !state) return c.html(`<html><body><h2>Missing code or state</h2><script>window.close();</script></body></html>`);
    const stateData = await kv.get(`oauth_state:${state}`);
    if (!stateData) return c.html(`<html><body><h2>Invalid or expired state</h2><script>window.close();</script></body></html>`);
    await kv.del(`oauth_state:${state}`);
    const AZURE_CLIENT_ID = Deno.env.get('AZURE_CLIENT_ID') ?? '';
    const AZURE_CLIENT_SECRET = Deno.env.get('AZURE_CLIENT_SECRET') ?? '';
    const AZURE_REDIRECT_URI = Deno.env.get('AZURE_REDIRECT_URI') ?? '';
    const tokenRes = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: AZURE_CLIENT_ID, client_secret: AZURE_CLIENT_SECRET, code, redirect_uri: AZURE_REDIRECT_URI, grant_type: 'authorization_code' }),
    });
    const tokenData = await tokenRes.json();
    if (tokenData.error) {
      await kv.set(`oauth_result:${state}`, { success: false, error: tokenData.error_description || tokenData.error });
      return c.html(`<html><body><h2>Token exchange failed</h2><p>${tokenData.error_description}</p><script>window.close();</script></body></html>`);
    }
    // Get user info
    const userRes = await fetch('https://graph.microsoft.com/v1.0/me', { headers: { Authorization: `Bearer ${tokenData.access_token}` } });
    const userInfo = await userRes.json();
    const userEmail = userInfo.mail || userInfo.userPrincipalName || 'unknown';
    const accountId = `outlook_${userEmail.replace(/[^a-z0-9]/gi, '_').toLowerCase()}`;
    const accountData: any = {
      id: accountId, provider: 'outlook', email: userEmail, displayName: userInfo.displayName || userEmail,
      access_token: tokenData.access_token, refresh_token: tokenData.refresh_token,
      token_expires_at: new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString(),
      userId: stateData.userId, connectedAt: new Date().toISOString(), status: 'active',
    };
    await kv.set(`email_account:${stateData.userId}:${accountId}`, accountData);
    await kv.set(`email_account:by_email:${userEmail}`, accountId);
    const oauthResult = { success: true, accountId, email: userEmail, provider: 'outlook', displayName: userInfo.displayName };
    await kv.set(`oauth_result:${state}`, oauthResult);
    return c.html(`<html><body><h2>Connected!</h2><p>${userEmail} connected successfully.</p><script>try{window.opener&&window.opener.postMessage(${JSON.stringify(JSON.stringify(oauthResult))},'*');}catch(e){}setTimeout(()=>window.close(),2000);</script></body></html>`);
  } catch (err: any) {
    console.error('[Azure OAuth] Callback error:', err);
    return c.html(`<html><body><h2>Error</h2><p>${err.message}</p><script>window.close();</script></body></html>`);
  }
});

api.get(`${PREFIX}/oauth-poll/:pollId`, async (c) => {
  try {
    const pollId = c.req.param('pollId');
    const result = await kv.get(`oauth_result:${pollId}`);
    if (!result) return c.json({ status: 'pending' });
    return c.json({ status: 'complete', result });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

api.post(`${PREFIX}/microsoft-refresh-token`, async (c) => {
  try {
    const auth = await authenticateUser(c);
    if (auth.error) return c.json({ error: auth.error }, auth.status);
    const { accountId } = await c.req.json();
    const accountData = await kv.get(`email_account:${auth.user.id}:${accountId}`);
    if (!accountData || !accountData.refresh_token) return c.json({ error: 'Account not found or no refresh token' }, 404);
    const tokenRes = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: Deno.env.get('AZURE_CLIENT_ID') ?? '', client_secret: Deno.env.get('AZURE_CLIENT_SECRET') ?? '',
        refresh_token: accountData.refresh_token, grant_type: 'refresh_token',
      }),
    });
    const tokenData = await tokenRes.json();
    if (tokenData.error) return c.json({ error: tokenData.error_description || tokenData.error }, 400);
    accountData.access_token = tokenData.access_token;
    if (tokenData.refresh_token) accountData.refresh_token = tokenData.refresh_token;
    accountData.token_expires_at = new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString();
    await kv.set(`email_account:${auth.user.id}:${accountId}`, accountData);
    return c.json({ success: true, expiresAt: accountData.token_expires_at });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

api.post(`${PREFIX}/microsoft-send-email`, async (c) => {
  try {
    const auth = await authenticateUser(c);
    if (auth.error) return c.json({ error: auth.error }, auth.status);
    const { accountId, to, subject, body: emailBody, cc, bcc } = await c.req.json();
    const accountData = await kv.get(`email_account:${auth.user.id}:${accountId}`);
    if (!accountData) return c.json({ error: 'Account not found' }, 404);
    const message: any = {
      subject, body: { contentType: 'HTML', content: emailBody },
      toRecipients: (Array.isArray(to) ? to : [to]).map((e: string) => ({ emailAddress: { address: e } })),
    };
    if (cc) message.ccRecipients = (Array.isArray(cc) ? cc : [cc]).map((e: string) => ({ emailAddress: { address: e } }));
    if (bcc) message.bccRecipients = (Array.isArray(bcc) ? bcc : [bcc]).map((e: string) => ({ emailAddress: { address: e } }));
    const sendRes = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
      method: 'POST', headers: { Authorization: `Bearer ${accountData.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, saveToSentItems: true }),
    });
    if (!sendRes.ok) {
      const errBody = await sendRes.text();
      if (sendRes.status === 401) {
        // Try refresh
        const refreshRes = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
          method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ client_id: Deno.env.get('AZURE_CLIENT_ID') ?? '', client_secret: Deno.env.get('AZURE_CLIENT_SECRET') ?? '', refresh_token: accountData.refresh_token, grant_type: 'refresh_token' }),
        });
        const refreshData = await refreshRes.json();
        if (refreshData.access_token) {
          accountData.access_token = refreshData.access_token;
          if (refreshData.refresh_token) accountData.refresh_token = refreshData.refresh_token;
          accountData.token_expires_at = new Date(Date.now() + (refreshData.expires_in * 1000)).toISOString();
          await kv.set(`email_account:${auth.user.id}:${accountId}`, accountData);
          const retryRes = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
            method: 'POST', headers: { Authorization: `Bearer ${accountData.access_token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ message, saveToSentItems: true }),
          });
          if (!retryRes.ok) return c.json({ error: 'Send failed after token refresh' }, 500);
          return c.json({ success: true });
        }
      }
      return c.json({ error: 'Send failed: ' + errBody }, 500);
    }
    return c.json({ success: true });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

api.post(`${PREFIX}/microsoft-sync-emails`, async (c) => {
  try {
    const auth = await authenticateUser(c);
    if (auth.error) return c.json({ error: auth.error }, auth.status);
    const { accountId, folder = 'inbox', maxResults = 50 } = await c.req.json();
    const accountData = await kv.get(`email_account:${auth.user.id}:${accountId}`);
    if (!accountData) return c.json({ error: 'Account not found' }, 404);
    const url = `https://graph.microsoft.com/v1.0/me/mailFolders/${folder}/messages?$top=${maxResults}&$orderby=receivedDateTime desc&$select=id,subject,from,toRecipients,receivedDateTime,bodyPreview,isRead,hasAttachments`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${accountData.access_token}` } });
    if (!res.ok) {
      if (res.status === 401 && accountData.refresh_token) {
        const refreshRes = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
          method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ client_id: Deno.env.get('AZURE_CLIENT_ID') ?? '', client_secret: Deno.env.get('AZURE_CLIENT_SECRET') ?? '', refresh_token: accountData.refresh_token, grant_type: 'refresh_token' }),
        });
        const refreshData = await refreshRes.json();
        if (refreshData.access_token) {
          accountData.access_token = refreshData.access_token;
          if (refreshData.refresh_token) accountData.refresh_token = refreshData.refresh_token;
          accountData.token_expires_at = new Date(Date.now() + (refreshData.expires_in * 1000)).toISOString();
          await kv.set(`email_account:${auth.user.id}:${accountId}`, accountData);
          const retryRes = await fetch(url, { headers: { Authorization: `Bearer ${accountData.access_token}` } });
          if (retryRes.ok) {
            const retryData = await retryRes.json();
            accountData.last_sync = new Date().toISOString();
            await kv.set(`email_account:${auth.user.id}:${accountId}`, accountData);
            return c.json({ emails: retryData.value || [], total: retryData.value?.length || 0 });
          }
        }
      }
      return c.json({ error: 'Sync failed' }, 500);
    }
    const data = await res.json();
    accountData.last_sync = new Date().toISOString();
    await kv.set(`email_account:${auth.user.id}:${accountId}`, accountData);
    return c.json({ emails: data.value || [], total: data.value?.length || 0 });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// GOOGLE OAUTH
// ═══════════════════════════════════════════════════════════════════════════
api.post(`${PREFIX}/google-oauth-init`, async (c) => {
  try {
    const token = extractUserToken(c);
    if (!token) return c.json({ error: 'Auth required' }, 401);
    const supabase = getSupabase();
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) return c.json({ error: 'Auth failed: ' + (userError?.message || 'No user') }, 401);
    const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const redirectUri = Deno.env.get('GOOGLE_REDIRECT_URI');
    if (!clientId || !redirectUri) return c.json({ error: 'Google OAuth not configured' }, 500);
    const state = crypto.randomUUID();
    await kv.set(`oauth_state:${state}`, { userId: user.id, provider: 'google', timestamp: new Date().toISOString() });
    const scopes = ['https://www.googleapis.com/auth/gmail.readonly', 'https://www.googleapis.com/auth/gmail.send', 'https://www.googleapis.com/auth/gmail.modify', 'https://www.googleapis.com/auth/userinfo.email', 'https://www.googleapis.com/auth/userinfo.profile'].join(' ');
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', scopes);
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'consent');
    return c.json({ success: true, authUrl: authUrl.toString(), pollId: state });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

api.get(`${PREFIX}/google-oauth-callback`, async (c) => {
  try {
    const code = c.req.query('code');
    const state = c.req.query('state');
    if (!code || !state) return c.html('<html><body><h2>Missing params</h2><script>window.close();</script></body></html>');
    const stateData = await kv.get(`oauth_state:${state}`);
    if (!stateData) return c.html('<html><body><h2>Invalid state</h2><script>window.close();</script></body></html>');
    await kv.del(`oauth_state:${state}`);
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: Deno.env.get('GOOGLE_CLIENT_ID') ?? '', client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET') ?? '', code, redirect_uri: Deno.env.get('GOOGLE_REDIRECT_URI') ?? '', grant_type: 'authorization_code' }),
    });
    const tokenData = await tokenRes.json();
    if (tokenData.error) {
      await kv.set(`oauth_result:${state}`, { success: false, error: tokenData.error });
      return c.html(`<html><body><h2>Error</h2><p>${tokenData.error}</p><script>window.close();</script></body></html>`);
    }
    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', { headers: { Authorization: `Bearer ${tokenData.access_token}` } });
    const userInfo = await userRes.json();
    const accountId = `gmail_${(userInfo.email || 'unknown').replace(/[^a-z0-9]/gi, '_').toLowerCase()}`;
    const accountData = {
      id: accountId, provider: 'gmail', email: userInfo.email, displayName: userInfo.name || userInfo.email,
      access_token: tokenData.access_token, refresh_token: tokenData.refresh_token,
      token_expires_at: new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString(),
      userId: stateData.userId, connectedAt: new Date().toISOString(), status: 'active',
    };
    await kv.set(`email_account:${stateData.userId}:${accountId}`, accountData);
    await kv.set(`email_account:by_email:${userInfo.email}`, accountId);
    const result = { success: true, accountId, email: userInfo.email, provider: 'gmail', displayName: userInfo.name };
    await kv.set(`oauth_result:${state}`, result);
    return c.html(`<html><body><h2>Connected!</h2><p>${userInfo.email}</p><script>try{window.opener&&window.opener.postMessage(${JSON.stringify(JSON.stringify(result))},'*');}catch(e){}setTimeout(()=>window.close(),2000);</script></body></html>`);
  } catch (err: any) {
    return c.html(`<html><body><h2>Error</h2><p>${err.message}</p><script>window.close();</script></body></html>`);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// UTILITY ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════
api.post(`${PREFIX}/fix-profile-mismatch`, async (c) => {
  try {
    const supabase = getSupabase();
    const { email, currentUserId } = await c.req.json();
    const { data: old } = await supabase.from('profiles').select('*').eq('email', email).single();
    if (!old) return c.json({ error: 'Profile not found' }, 404);
    await supabase.from('profiles').delete().eq('email', email);
    const { data: newProfile, error } = await supabase.from('profiles').insert({ id: currentUserId, email: old.email, name: old.name || 'User', role: old.role || 'standard_user', organization_id: old.organization_id, status: old.status || 'active', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }).select().single();
    if (error) return c.json({ error: error.message }, 500);
    return c.json({ success: true, profile: newProfile });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

api.post(`${PREFIX}/reset-password`, async (c) => {
  try {
    const { userEmail, tempPassword } = await c.req.json();
    if (!userEmail || !tempPassword) return c.json({ error: 'Missing fields' }, 400);
    const supabase = getSupabase();
    const { data: { users } } = await supabase.auth.admin.listUsers();
    const user = users?.find((u: any) => u.email === userEmail);
    if (!user) return c.json({ error: 'User not found' }, 404);
    const { error } = await supabase.auth.admin.updateUserById(user.id, { password: tempPassword });
    if (error) return c.json({ error: error.message }, 500);
    return c.json({ success: true, userId: user.id });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

api.post(`${PREFIX}/create-user`, async (c) => {
  try {
    const { email, name, role, organizationId, tempPassword } = await c.req.json();
    if (!email || !name || !role || !organizationId || !tempPassword) return c.json({ error: 'Missing fields' }, 400);
    const supabase = getSupabase();
    const { data: { users: existing } } = await supabase.auth.admin.listUsers();
    const existingUser = existing?.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());
    let authUserId: string;
    if (existingUser) {
      authUserId = existingUser.id;
      await supabase.auth.admin.updateUserById(authUserId, { password: tempPassword, user_metadata: { name, role, organizationId } });
    } else {
      const { data: newUser, error } = await supabase.auth.admin.createUser({ email: email.toLowerCase(), password: tempPassword, user_metadata: { name, role, organizationId }, email_confirm: true });
      if (error) return c.json({ error: error.message }, 500);
      authUserId = newUser.user.id;
    }
    const { error: profileError } = await supabase.from('profiles').upsert({ id: authUserId, email: email.toLowerCase(), name, role, organization_id: organizationId, status: 'active', updated_at: new Date().toISOString() }, { onConflict: 'id' });
    if (profileError) console.warn('Profile upsert warning:', profileError.message);
    return c.json({ success: true, userId: authUserId, email: email.toLowerCase() });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// CATCH-ALL 404
// ═══════════════════════════════════════════════════════════════════════════
api.all('*', (c) => {
  const method = c.req.method;
  const path = c.req.path;
  console.log(`[v4] 404: ${method} ${path}`);
  return c.json({ error: 'Route not found', method, path, version: 'v4', hint: `GET ${PREFIX}/health` }, 404);
});

// ═══════════════════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════════════════
const app = new Hono();
app.use('*', logger(console.log));
app.use('*', cors());
app.route('/server', api);
app.route('/', api);

console.log('[index v4] Server starting — all routes consolidated inline');
Deno.serve(app.fetch);
