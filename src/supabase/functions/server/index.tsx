import { Hono } from 'npm:hono';
import { cors } from 'npm:hono/cors';
import { logger } from 'npm:hono/logger';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import * as kv from './kv_store.tsx';

// ═══════════════════════════════════════════════════════════════════════════
// ProSpaces CRM — Consolidated Edge Function (v5 — 2025-02-21)
// ═══════════════════════════════════════════════════════════════════════════

const PREFIX = '/make-server-8405be07';

function extractUserToken(c: any): string | null {
  // Primary: X-User-Token header (dual-header auth pattern)
  const userToken = c.req.header('X-User-Token');
  if (userToken) return userToken;

  // Fallback: Authorization header — but ONLY if it does NOT look like the
  // Supabase anon key (which the gateway requires but is not a user JWT).
  // Anon keys are short JWTs (~200 chars); user access tokens are longer (~800+).
  const authHeader = c.req.header('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1] || null;
    if (token && token.length > 300) return token; // likely a real user JWT
  }
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
  if (!token) {
    // Log headers for debugging (redacted)
    const hasXUT = !!c.req.header('X-User-Token');
    const authLen = c.req.header('Authorization')?.length || 0;
    console.log(`[auth] 401: X-User-Token present=${hasXUT}, Authorization length=${authLen}, path=${c.req.path}`);
    return { error: 'Missing auth token (send X-User-Token header)', status: 401, supabase, user: null as any, profile: null as any };
  }
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return { error: 'Unauthorized: ' + (authError?.message || 'No user'), status: 401, supabase, user: null as any, profile: null as any };
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  const effectiveRole = profile?.role || user.user_metadata?.role || 'standard_user';
  const effectiveOrg = profile?.organization_id || user.user_metadata?.organizationId;
  return { error: null, status: 200, supabase, user, profile: { ...profile, role: effectiveRole, organization_id: effectiveOrg } };
}

const app = new Hono();

// ── HEALTH ──────────────────────────────────────────────────────────────
app.get(`${PREFIX}/health`, (c) => {
  return c.json({ status: 'ok', version: 'v5-2025-02-21', timestamp: new Date().toISOString() });
});

// ── PERMISSIONS ─────────────────────────────────────────────────────────
app.get(`${PREFIX}/permissions`, async (c) => {
  try {
    const auth = await authenticateUser(c);
    if (auth.error) return c.json({ error: auth.error }, auth.status);
    const orgId = c.req.query('organization_id') || auth.profile.organization_id;
    if (!orgId) return c.json({ error: 'Missing organization_id' }, 400);
    const permissions = await kv.get(`permissions:${orgId}`);
    return c.json({ permissions: permissions || [], source: 'kv' });
  } catch (err: any) { return c.json({ error: err.message }, 500); }
});

app.put(`${PREFIX}/permissions`, async (c) => {
  try {
    const auth = await authenticateUser(c);
    if (auth.error) return c.json({ error: auth.error }, auth.status);
    if (!['admin', 'super_admin'].includes(auth.profile.role)) return c.json({ error: 'Forbidden' }, 403);
    const orgId = auth.profile.organization_id;
    const body = await c.req.json();
    await kv.set(`permissions:${orgId}`, body.permissions);
    if (body.changedBy) {
      const auditKey = `audit_logs:${orgId}`;
      let logs: any[] = [];
      try { logs = (await kv.get(auditKey)) || []; } catch {}
      logs.unshift({ timestamp: new Date().toISOString(), changedBy: body.changedBy, changeDescription: body.changeDescription });
      if (logs.length > 100) logs = logs.slice(0, 100);
      await kv.set(auditKey, logs);
    }
    return c.json({ success: true });
  } catch (err: any) { return c.json({ error: err.message }, 500); }
});

app.get(`${PREFIX}/permissions/audit-logs`, async (c) => {
  try {
    const auth = await authenticateUser(c);
    if (auth.error) return c.json({ error: auth.error }, auth.status);
    const orgId = c.req.query('organization_id') || auth.profile.organization_id;
    const logs = await kv.get(`audit_logs:${orgId}`);
    return c.json({ auditLogs: logs || [] });
  } catch (err: any) { return c.json({ error: err.message }, 500); }
});

// ── CONTACTS ────────────────────────────────────────────────────────────
app.get(`${PREFIX}/contacts`, async (c) => {
  try {
    const auth = await authenticateUser(c);
    if (auth.error) return c.json({ error: auth.error }, auth.status);
    const scope = c.req.query('scope') || 'personal';
    let query = auth.supabase.from('contacts').select('*');
    if (auth.profile.role !== 'super_admin') {
      if (scope === 'personal') {
        query = query.eq('organization_id', auth.profile.organization_id).eq('owner_id', auth.user.id);
      } else if (['admin', 'manager', 'director', 'marketing'].includes(auth.profile.role)) {
        query = query.eq('organization_id', auth.profile.organization_id);
      } else {
        query = query.eq('organization_id', auth.profile.organization_id).eq('owner_id', auth.user.id);
      }
    }
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) return c.json({ error: error.message }, 500);
    return c.json({ contacts: data || [], meta: { count: data?.length || 0, role: auth.profile.role } });
  } catch (err: any) { return c.json({ error: err.message }, 500); }
});

app.patch(`${PREFIX}/contacts/:id`, async (c) => {
  try {
    const auth = await authenticateUser(c);
    if (auth.error) return c.json({ error: auth.error }, auth.status);
    const id = c.req.param('id');
    const body = await c.req.json();
    body.updated_at = new Date().toISOString();
    const { data, error } = await auth.supabase.from('contacts').update(body).eq('id', id).select('*').single();
    if (error) return c.json({ error: error.message }, 500);
    return c.json({ contact: data });
  } catch (err: any) { return c.json({ error: err.message }, 500); }
});

app.post(`${PREFIX}/contacts`, async (c) => {
  try {
    const auth = await authenticateUser(c);
    if (auth.error) return c.json({ error: auth.error }, auth.status);
    const body = await c.req.json();
    body.organization_id = auth.profile.organization_id;
    body.owner_id = auth.user.id;
    body.created_at = new Date().toISOString();
    body.updated_at = new Date().toISOString();
    const { data, error } = await auth.supabase.from('contacts').insert([body]).select('*').single();
    if (error) return c.json({ error: error.message }, 500);
    return c.json({ contact: data }, 201);
  } catch (err: any) { return c.json({ error: err.message }, 500); }
});

app.delete(`${PREFIX}/contacts/:id`, async (c) => {
  try {
    const auth = await authenticateUser(c);
    if (auth.error) return c.json({ error: auth.error }, auth.status);
    const { error } = await auth.supabase.from('contacts').delete().eq('id', c.req.param('id'));
    if (error) return c.json({ error: error.message }, 500);
    return c.json({ success: true });
  } catch (err: any) { return c.json({ error: err.message }, 500); }
});

// ── QUOTES ──────────────────────────────────────────────────────────────
app.get(`${PREFIX}/quotes`, async (c) => {
  try {
    const auth = await authenticateUser(c);
    if (auth.error) return c.json({ error: auth.error }, auth.status);
    const scope = c.req.query('scope') || 'personal';
    let query = auth.supabase.from('quotes').select('*');
    if (auth.profile.role !== 'super_admin') {
      if (auth.profile.organization_id) query = query.or(`organization_id.eq.${auth.profile.organization_id},organization_id.is.null`);
      if (scope === 'personal' || !['admin', 'manager', 'director', 'marketing'].includes(auth.profile.role)) {
        query = query.eq('created_by', auth.user.id);
      }
    }
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) return c.json({ error: error.message }, 500);
    return c.json({ quotes: data || [], meta: { count: data?.length || 0, role: auth.profile.role } });
  } catch (err: any) { return c.json({ error: err.message }, 500); }
});

app.post(`${PREFIX}/quotes`, async (c) => {
  try {
    const auth = await authenticateUser(c);
    if (auth.error) return c.json({ error: auth.error }, auth.status);
    const body = await c.req.json();
    body.organization_id = auth.profile.organization_id;
    body.created_by = auth.user.id;
    body.created_at = new Date().toISOString();
    body.updated_at = new Date().toISOString();
    const { data, error } = await auth.supabase.from('quotes').insert([body]).select('*').single();
    if (error) return c.json({ error: error.message }, 500);
    return c.json({ quote: data }, 201);
  } catch (err: any) { return c.json({ error: err.message }, 500); }
});

app.get(`${PREFIX}/quotes/tracking-status`, async (c) => {
  try {
    const auth = await authenticateUser(c);
    if (auth.error) return c.json({ error: auth.error }, auth.status);
    const { error: colErr } = await auth.supabase.from('quotes').select('tracking_status').limit(0);
    if (colErr) return c.json({ trackingStatuses: [], columnExists: false });
    let query = auth.supabase.from('quotes').select('id, tracking_status, status, title, contact_name');
    if (auth.profile.role !== 'super_admin' && auth.profile.organization_id) {
      query = query.or(`organization_id.eq.${auth.profile.organization_id},organization_id.is.null`);
    }
    const { data } = await query;
    return c.json({ trackingStatuses: data || [], columnExists: true });
  } catch (err: any) { return c.json({ error: err.message }, 500); }
});

// ── BIDS ────────────────────────────────────────────────────────────────
app.get(`${PREFIX}/bids`, async (c) => {
  try {
    const auth = await authenticateUser(c);
    if (auth.error) return c.json({ error: auth.error }, auth.status);
    const scope = c.req.query('scope') || 'personal';
    let query = auth.supabase.from('bids').select('*');
    if (auth.profile.role !== 'super_admin') {
      if (auth.profile.organization_id) query = query.or(`organization_id.eq.${auth.profile.organization_id},organization_id.is.null`);
      if (scope === 'personal' || !['admin', 'manager', 'director', 'marketing'].includes(auth.profile.role)) {
        query = query.eq('created_by', auth.user.id);
      }
    }
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) return c.json({ error: error.message }, 500);
    return c.json({ bids: data || [], meta: { count: data?.length || 0, role: auth.profile.role } });
  } catch (err: any) { return c.json({ error: err.message }, 500); }
});

app.post(`${PREFIX}/bids`, async (c) => {
  try {
    const auth = await authenticateUser(c);
    if (auth.error) return c.json({ error: auth.error }, auth.status);
    const body = await c.req.json();
    body.organization_id = body.organization_id || auth.profile.organization_id;
    body.created_by = body.created_by || auth.user.id;
    body.created_at = new Date().toISOString();
    body.updated_at = new Date().toISOString();
    if (!body.status) body.status = 'Draft';
    const { data, error } = await auth.supabase.from('bids').insert([body]).select('*').single();
    if (error) return c.json({ error: error.message }, 500);
    return c.json({ bid: data }, 201);
  } catch (err: any) { return c.json({ error: err.message }, 500); }
});

// ── PROFILES ────────────────────────────────────────────────────────────
app.get(`${PREFIX}/profiles`, async (c) => {
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
  } catch (err: any) { return c.json({ error: err.message }, 500); }
});

app.get(`${PREFIX}/profiles/ensure`, async (c) => {
  try {
    const auth = await authenticateUser(c);
    if (auth.error) return c.json({ error: auth.error }, auth.status);
    const { data: existing } = await auth.supabase.from('profiles').select('id').eq('id', auth.user.id).maybeSingle();
    if (existing) return c.json({ created: false, profileId: existing.id });
    const { data: np, error } = await auth.supabase.from('profiles').insert([{
      id: auth.user.id, email: auth.user.email, name: auth.user.user_metadata?.name || auth.user.email,
      role: auth.user.user_metadata?.role || 'standard_user', organization_id: auth.user.user_metadata?.organizationId,
      status: 'active', created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }]).select().single();
    if (error) return c.json({ error: error.message }, 500);
    return c.json({ created: true, profileId: np?.id });
  } catch (err: any) { return c.json({ error: err.message }, 500); }
});

// ── SETTINGS ────────────────────────────────────────────────────────────
app.get(`${PREFIX}/settings/organization`, async (c) => {
  try {
    const auth = await authenticateUser(c);
    if (auth.error) return c.json({ error: auth.error }, auth.status);
    const orgId = c.req.query('organization_id') || auth.profile.organization_id;
    const { data, error } = await auth.supabase.from('organization_settings').select('*').eq('organization_id', orgId).single();
    if (error) {
      if (error.code === 'PGRST116') return c.json({ settings: null, source: 'server-not-found' });
      if (error.code === 'PGRST205' || error.code === '42P01') return c.json({ settings: null, source: 'server-table-missing' });
      return c.json({ error: error.message }, 500);
    }
    return c.json({ settings: data, source: 'server' });
  } catch (err: any) { return c.json({ error: err.message }, 500); }
});

app.put(`${PREFIX}/settings/organization`, async (c) => {
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
  } catch (err: any) { return c.json({ error: err.message }, 500); }
});

app.get(`${PREFIX}/settings/theme`, async (c) => {
  try {
    const auth = await authenticateUser(c);
    if (auth.error) return c.json({ error: auth.error }, auth.status);
    const theme = await kv.get(`user_theme:${auth.user.id}`);
    return c.json({ theme: theme || null });
  } catch (err: any) { return c.json({ error: err.message }, 500); }
});

app.put(`${PREFIX}/settings/theme`, async (c) => {
  try {
    const auth = await authenticateUser(c);
    if (auth.error) return c.json({ error: auth.error }, auth.status);
    const { theme } = await c.req.json();
    await kv.set(`user_theme:${auth.user.id}`, theme);
    return c.json({ success: true });
  } catch (err: any) { return c.json({ error: err.message }, 500); }
});

app.patch(`${PREFIX}/settings/profile`, async (c) => {
  try {
    const auth = await authenticateUser(c);
    if (auth.error) return c.json({ error: auth.error }, auth.status);
    const body = await c.req.json();
    const targetId = body.user_id || auth.user.id;
    if (auth.profile.role !== 'super_admin' && targetId !== auth.user.id) return c.json({ error: 'Forbidden' }, 403);
    const upd: any = {};
    if (body.name) upd.name = body.name;
    if ('avatar_url' in body) upd.avatar_url = body.avatar_url;
    if (Object.keys(upd).length === 0) return c.json({ success: true });
    const { data, error } = await auth.supabase.from('profiles').update(upd).eq('id', targetId).select().single();
    if (error) return c.json({ error: error.message }, 500);
    return c.json({ profile: data, source: 'server' });
  } catch (err: any) { return c.json({ error: err.message }, 500); }
});

// ── PORTAL ──────────────────────────────────────────────────────────────
function hexEncode(buf: ArrayBuffer): string { return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join(''); }
async function hashEmail(e: string): Promise<string> { return hexEncode(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(e.toLowerCase().trim()))); }
async function hashPassword(p: string): Promise<string> { return hexEncode(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(p))); }
function genToken(): string { const b = new Uint8Array(32); crypto.getRandomValues(b); return hexEncode(b.buffer); }
function genInvite(): string { const b = new Uint8Array(6); crypto.getRandomValues(b); return hexEncode(b.buffer).toUpperCase(); }

const P = `${PREFIX}/portal`;

app.get(`${P}/crm-messages`, async (c) => {
  try {
    const auth = await authenticateUser(c);
    if (auth.error) return c.json({ error: auth.error }, auth.status);
    const orgId = auth.profile.organization_id;
    if (!orgId) return c.json({ error: 'No org' }, 400);
    const msgs = await kv.getByPrefix(`portal_message:${orgId}:`);
    const cIds = [...new Set((msgs || []).map((m: any) => m.contactId).filter(Boolean))];
    let cMap: Record<string, any> = {};
    if (cIds.length > 0) {
      const { data } = await auth.supabase.from('contacts').select('id, name, email, company').in('id', cIds);
      if (data) data.forEach((ct: any) => { cMap[ct.id] = ct; });
    }
    const enriched = (msgs || []).map((m: any) => ({
      ...m, contactName: cMap[m.contactId]?.name || m.senderEmail || 'Unknown',
      contactCompany: cMap[m.contactId]?.company || '', contactEmail: cMap[m.contactId]?.email || m.senderEmail || '',
    }));
    enriched.sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    return c.json({ messages: enriched });
  } catch (err: any) { return c.json({ error: err.message }, 500); }
});

app.post(`${P}/invite`, async (c) => {
  try {
    const auth = await authenticateUser(c);
    if (auth.error) return c.json({ error: auth.error }, auth.status);
    const { contactId, email } = await c.req.json();
    const code = genInvite();
    await kv.set(`portal_invite:${code}`, { contactId, orgId: auth.profile.organization_id, email: email.toLowerCase().trim(), expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(), createdBy: auth.user.id });
    await kv.set(`portal_access_log:${auth.profile.organization_id}:${contactId}`, { enabled: true, enabledAt: new Date().toISOString(), enabledBy: auth.user.email || auth.user.id });
    return c.json({ success: true, inviteCode: code });
  } catch (err: any) { return c.json({ error: err.message }, 500); }
});

app.post(`${P}/register`, async (c) => {
  try {
    const { inviteCode, password } = await c.req.json();
    const invite = await kv.get(`portal_invite:${inviteCode}`);
    if (!invite) return c.json({ error: 'Invalid invite' }, 404);
    if (new Date(invite.expiresAt) < new Date()) return c.json({ error: 'Expired' }, 410);
    const eh = await hashEmail(invite.email);
    const existing = await kv.get(`portal_user:${eh}`);
    if (existing) return c.json({ error: 'Account exists' }, 409);
    await kv.set(`portal_user:${eh}`, { email: invite.email, contactId: invite.contactId, orgId: invite.orgId, passwordHash: await hashPassword(password), createdAt: new Date().toISOString() });
    const tok = genToken();
    await kv.set(`portal_session:${tok}`, { email: invite.email, contactId: invite.contactId, orgId: invite.orgId, expiresAt: new Date(Date.now() + 86400000).toISOString() });
    await kv.del(`portal_invite:${inviteCode}`);
    return c.json({ success: true, sessionToken: tok, contactId: invite.contactId });
  } catch (err: any) { return c.json({ error: err.message }, 500); }
});

app.post(`${P}/login`, async (c) => {
  try {
    const { email, password } = await c.req.json();
    const eh = await hashEmail(email);
    const pu = await kv.get(`portal_user:${eh}`);
    if (!pu) return c.json({ error: 'Not found' }, 404);
    if (await hashPassword(password) !== pu.passwordHash) return c.json({ error: 'Wrong password' }, 401);
    const tok = genToken();
    await kv.set(`portal_session:${tok}`, { email: pu.email, contactId: pu.contactId, orgId: pu.orgId, expiresAt: new Date(Date.now() + 86400000).toISOString() });
    return c.json({ success: true, sessionToken: tok, contactId: pu.contactId });
  } catch (err: any) { return c.json({ error: err.message }, 500); }
});

app.get(`${P}/session`, async (c) => {
  try {
    const tok = c.req.header('X-Portal-Token');
    if (!tok) return c.json({ error: 'No token' }, 401);
    const s = await kv.get(`portal_session:${tok}`);
    if (!s || new Date(s.expiresAt) < new Date()) return c.json({ error: 'Invalid' }, 401);
    return c.json({ valid: true, ...s });
  } catch (err: any) { return c.json({ error: err.message }, 500); }
});

app.get(`${P}/messages`, async (c) => {
  try {
    const tok = c.req.header('X-Portal-Token');
    if (!tok) return c.json({ error: 'No token' }, 401);
    const s = await kv.get(`portal_session:${tok}`);
    if (!s) return c.json({ error: 'Invalid' }, 401);
    const msgs = await kv.getByPrefix(`portal_message:${s.orgId}:${s.contactId}:`);
    return c.json({ messages: msgs || [] });
  } catch (err: any) { return c.json({ error: err.message }, 500); }
});

app.post(`${P}/messages`, async (c) => {
  try {
    const tok = c.req.header('X-Portal-Token');
    if (!tok) return c.json({ error: 'No token' }, 401);
    const s = await kv.get(`portal_session:${tok}`);
    if (!s) return c.json({ error: 'Invalid' }, 401);
    const { subject, body } = await c.req.json();
    const id = crypto.randomUUID();
    const msg = { id, contactId: s.contactId, orgId: s.orgId, from: 'customer', senderEmail: s.email, subject, body, createdAt: new Date().toISOString(), read: false, replies: [] };
    await kv.set(`portal_message:${s.orgId}:${s.contactId}:${id}`, msg);
    return c.json({ success: true, message: msg });
  } catch (err: any) { return c.json({ error: err.message }, 500); }
});

app.post(`${P}/reply`, async (c) => {
  try {
    const auth = await authenticateUser(c);
    if (auth.error) return c.json({ error: auth.error }, auth.status);
    const { messageId, contactId, body: rb } = await c.req.json();
    const key = `portal_message:${auth.profile.organization_id}:${contactId}:${messageId}`;
    const msg = await kv.get(key);
    if (!msg) return c.json({ error: 'Not found' }, 404);
    msg.replies = msg.replies || [];
    msg.replies.push({ from: 'crm', body: rb, createdAt: new Date().toISOString(), senderName: auth.profile.name || auth.user.email });
    msg.read = true;
    await kv.set(key, msg);
    return c.json({ success: true, message: msg });
  } catch (err: any) { return c.json({ error: err.message }, 500); }
});

app.get(`${P}/users`, async (c) => {
  try {
    const auth = await authenticateUser(c);
    if (auth.error) return c.json({ error: auth.error }, auth.status);
    const logs = await kv.getByPrefix(`portal_access_log:${auth.profile.organization_id}:`);
    return c.json({ portalUsers: logs || [] });
  } catch (err: any) { return c.json({ error: err.message }, 500); }
});

// ── AZURE OAUTH ─────────────────────────────────────────────────────────
app.post(`${PREFIX}/microsoft-oauth-init`, async (c) => {
  try {
    const token = extractUserToken(c);
    if (!token) return c.json({ error: '[v5] Auth required', version: 'v5' }, 401);
    const supabase = getSupabase();
    const { data: { user }, error: ue } = await supabase.auth.getUser(token);
    if (ue || !user) return c.json({ error: '[v5] Auth failed: ' + (ue?.message || 'No user'), version: 'v5' }, 401);
    const CID = Deno.env.get('AZURE_CLIENT_ID');
    if (!CID) return c.json({ error: 'Azure not configured (missing AZURE_CLIENT_ID)' }, 500);

    // Accept frontendOrigin from request body so redirect goes to frontend
    const body = await c.req.json().catch(() => ({}));
    const frontendOrigin = body.frontendOrigin;
    // Use the bare origin (no /oauth-callback path) — the SPA detects ?code=&state= on any path
    const redirectUri = frontendOrigin
      ? frontendOrigin.replace(/\/+$/, '')
      : (Deno.env.get('AZURE_REDIRECT_URI') ?? '');

    if (!redirectUri) return c.json({ error: 'No redirect URI available (send frontendOrigin or set AZURE_REDIRECT_URI)' }, 500);
    console.log(`[Azure OAuth] redirect_uri = ${redirectUri}`);

    const state = crypto.randomUUID();
    await kv.set(`oauth_state:${state}`, { userId: user.id, provider: 'microsoft', redirectUri, ts: new Date().toISOString() });
    const url = new URL('https://login.microsoftonline.com/common/oauth2/v2.0/authorize');
    url.searchParams.set('client_id', CID);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('response_mode', 'query');
    url.searchParams.set('scope', 'offline_access Mail.Read Mail.ReadWrite Mail.Send User.Read Calendars.Read Calendars.ReadWrite');
    url.searchParams.set('state', state);
    url.searchParams.set('prompt', 'consent');
    return c.json({ success: true, authUrl: url.toString(), pollId: state, registeredRedirectUri: redirectUri });
  } catch (err: any) { return c.json({ error: err.message }, 500); }
});

// ── UNIVERSAL OAUTH EXCHANGE (frontend-redirect flow) ───────────────────
// Auto-detects provider from stored state — works for both Microsoft and Google
app.post(`${PREFIX}/oauth-exchange`, async (c) => {
  try {
    const { code, state } = await c.req.json();
    if (!code || !state) return c.json({ error: 'Missing code or state' }, 400);
    const sd = await kv.get(`oauth_state:${state}`);
    if (!sd) return c.json({ error: 'Invalid or expired OAuth state' }, 400);
    await kv.del(`oauth_state:${state}`);

    const provider = sd.provider; // 'microsoft' or 'google'
    console.log(`[OAuth Exchange] provider=${provider}, userId=${sd.userId}`);

    if (provider === 'microsoft' || provider === 'outlook') {
      const redirectUri = sd.redirectUri || Deno.env.get('AZURE_REDIRECT_URI') || '';
      const tr = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ client_id: Deno.env.get('AZURE_CLIENT_ID') ?? '', client_secret: Deno.env.get('AZURE_CLIENT_SECRET') ?? '', code, redirect_uri: redirectUri, grant_type: 'authorization_code' }),
      });
      const td = await tr.json();
      if (td.error) {
        const errMsg = td.error_description || td.error;
        await kv.set(`oauth_result:${state}`, { success: false, error: errMsg });
        return c.json({ success: false, error: errMsg }, 400);
      }
      const ur = await fetch('https://graph.microsoft.com/v1.0/me', { headers: { Authorization: `Bearer ${td.access_token}` } });
      const ui = await ur.json();
      const email = ui.mail || ui.userPrincipalName || 'unknown';
      const kvKey = `outlook_${email.replace(/[^a-z0-9]/gi, '_').toLowerCase()}`;
      const existingAccount = await kv.get(`email_account:${sd.userId}:${kvKey}`);
      const aid = (existingAccount && existingAccount.id && existingAccount.id.includes('-')) ? existingAccount.id : crypto.randomUUID();
      await kv.set(`email_account:${sd.userId}:${kvKey}`, { id: aid, kvKey, provider: 'outlook', email, displayName: ui.displayName || email, access_token: td.access_token, refresh_token: td.refresh_token, token_expires_at: new Date(Date.now() + td.expires_in * 1000).toISOString(), userId: sd.userId, connectedAt: new Date().toISOString(), status: 'active' });
      const result = { success: true, accountId: aid, email, provider: 'outlook' };
      await kv.set(`oauth_result:${state}`, result);
      return c.json(result);

    } else if (provider === 'google' || provider === 'gmail') {
      const redirectUri = sd.redirectUri || Deno.env.get('GOOGLE_REDIRECT_URI') || '';
      const tr = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ client_id: Deno.env.get('GOOGLE_CLIENT_ID') ?? '', client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET') ?? '', code, redirect_uri: redirectUri, grant_type: 'authorization_code' }),
      });
      const td = await tr.json();
      if (td.error) {
        const errMsg = td.error_description || td.error;
        await kv.set(`oauth_result:${state}`, { success: false, error: errMsg });
        return c.json({ success: false, error: errMsg }, 400);
      }
      const ur = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', { headers: { Authorization: `Bearer ${td.access_token}` } });
      const ui = await ur.json();
      const kvKey = `gmail_${(ui.email || 'x').replace(/[^a-z0-9]/gi, '_').toLowerCase()}`;
      const existingAccount = await kv.get(`email_account:${sd.userId}:${kvKey}`);
      const aid = (existingAccount && existingAccount.id && existingAccount.id.includes('-')) ? existingAccount.id : crypto.randomUUID();
      await kv.set(`email_account:${sd.userId}:${kvKey}`, { id: aid, kvKey, provider: 'gmail', email: ui.email, displayName: ui.name || ui.email, access_token: td.access_token, refresh_token: td.refresh_token, token_expires_at: new Date(Date.now() + td.expires_in * 1000).toISOString(), userId: sd.userId, connectedAt: new Date().toISOString(), status: 'active' });
      const result = { success: true, accountId: aid, email: ui.email, provider: 'gmail' };
      await kv.set(`oauth_result:${state}`, result);
      return c.json(result);

    } else {
      return c.json({ error: `Unknown provider: ${provider}` }, 400);
    }
  } catch (err: any) { return c.json({ error: err.message }, 500); }
});

// Keep legacy endpoints for backward compatibility
app.post(`${PREFIX}/microsoft-oauth-exchange`, async (c) => {
  try {
    const { code, state } = await c.req.json();
    if (!code || !state) return c.json({ error: 'Missing code or state' }, 400);
    const sd = await kv.get(`oauth_state:${state}`);
    if (!sd) return c.json({ error: 'Invalid or expired OAuth state' }, 400);
    await kv.del(`oauth_state:${state}`);
    const redirectUri = sd.redirectUri || Deno.env.get('AZURE_REDIRECT_URI') || '';
    const tr = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: Deno.env.get('AZURE_CLIENT_ID') ?? '', client_secret: Deno.env.get('AZURE_CLIENT_SECRET') ?? '', code, redirect_uri: redirectUri, grant_type: 'authorization_code' }),
    });
    const td = await tr.json();
    if (td.error) {
      await kv.set(`oauth_result:${state}`, { success: false, error: td.error_description || td.error });
      return c.json({ success: false, error: td.error_description || td.error }, 400);
    }
    const ur = await fetch('https://graph.microsoft.com/v1.0/me', { headers: { Authorization: `Bearer ${td.access_token}` } });
    const ui = await ur.json();
    const email = ui.mail || ui.userPrincipalName || 'unknown';
    const kvKey = `outlook_${email.replace(/[^a-z0-9]/gi, '_').toLowerCase()}`;
    const existingAccount = await kv.get(`email_account:${sd.userId}:${kvKey}`);
    const aid = (existingAccount && existingAccount.id && existingAccount.id.includes('-')) ? existingAccount.id : crypto.randomUUID();
    await kv.set(`email_account:${sd.userId}:${kvKey}`, { id: aid, kvKey, provider: 'outlook', email, displayName: ui.displayName || email, access_token: td.access_token, refresh_token: td.refresh_token, token_expires_at: new Date(Date.now() + td.expires_in * 1000).toISOString(), userId: sd.userId, connectedAt: new Date().toISOString(), status: 'active' });
    const result = { success: true, accountId: aid, email, provider: 'outlook' };
    await kv.set(`oauth_result:${state}`, result);
    return c.json(result);
  } catch (err: any) { return c.json({ error: err.message }, 500); }
});

app.get(`${PREFIX}/azure-oauth-callback`, async (c) => {
  try {
    const code = c.req.query('code');
    const state = c.req.query('state');
    const err = c.req.query('error');
    if (err) return c.html(`<html><body><h2>Error: ${err}</h2><script>window.close()</script></body></html>`);
    if (!code || !state) return c.html(`<html><body><h2>Missing params</h2><script>window.close()</script></body></html>`);
    const sd = await kv.get(`oauth_state:${state}`);
    if (!sd) return c.html(`<html><body><h2>Invalid state</h2><script>window.close()</script></body></html>`);
    await kv.del(`oauth_state:${state}`);
    const tr = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: Deno.env.get('AZURE_CLIENT_ID') ?? '', client_secret: Deno.env.get('AZURE_CLIENT_SECRET') ?? '', code, redirect_uri: sd.redirectUri, grant_type: 'authorization_code' }),
    });
    const td = await tr.json();
    if (td.error) {
      await kv.set(`oauth_result:${state}`, { success: false, error: td.error_description || td.error });
      return c.html(`<html><body><h2>Token error</h2><p>${td.error_description}</p><script>window.close()</script></body></html>`);
    }
    const ur = await fetch('https://graph.microsoft.com/v1.0/me', { headers: { Authorization: `Bearer ${td.access_token}` } });
    const ui = await ur.json();
    const email = ui.mail || ui.userPrincipalName || 'unknown';
    const kvKey = `outlook_${email.replace(/[^a-z0-9]/gi, '_').toLowerCase()}`;
    const existingAccount = await kv.get(`email_account:${sd.userId}:${kvKey}`);
    const aid = (existingAccount && existingAccount.id && existingAccount.id.includes('-')) ? existingAccount.id : crypto.randomUUID();
    await kv.set(`email_account:${sd.userId}:${kvKey}`, { id: aid, kvKey, provider: 'outlook', email, displayName: ui.displayName || email, access_token: td.access_token, refresh_token: td.refresh_token, token_expires_at: new Date(Date.now() + td.expires_in * 1000).toISOString(), userId: sd.userId, connectedAt: new Date().toISOString(), status: 'active' });
    const result = { success: true, accountId: aid, email, provider: 'outlook' };
    await kv.set(`oauth_result:${state}`, result);
    return c.html(`<html><body><h2>Connected!</h2><p>${email}</p><script>try{window.opener&&window.opener.postMessage(${JSON.stringify(JSON.stringify(result))},'*')}catch(e){}setTimeout(()=>window.close(),2000)</script></body></html>`);
  } catch (err: any) { return c.html(`<html><body><h2>Error</h2><p>${err.message}</p><script>window.close()</script></body></html>`); }
});

app.get(`${PREFIX}/oauth-poll/:pollId`, async (c) => {
  try {
    const r = await kv.get(`oauth_result:${c.req.param('pollId')}`);
    return r ? c.json({ status: 'complete', result: r }) : c.json({ status: 'pending' });
  } catch (err: any) { return c.json({ error: err.message }, 500); }
});

app.get(`${PREFIX}/azure-health`, (c) => c.json({ status: 'ok', configured: !!(Deno.env.get('AZURE_CLIENT_ID') && Deno.env.get('AZURE_CLIENT_SECRET')) }));

// ── GOOGLE OAUTH ────────────────────────────────────────────────────────
app.post(`${PREFIX}/google-oauth-init`, async (c) => {
  try {
    const token = extractUserToken(c);
    if (!token) return c.json({ error: 'Auth required' }, 401);
    const supabase = getSupabase();
    const { data: { user }, error: ue } = await supabase.auth.getUser(token);
    if (ue || !user) return c.json({ error: 'Auth failed' }, 401);
    const cid = Deno.env.get('GOOGLE_CLIENT_ID');
    if (!cid) return c.json({ error: 'Google not configured (missing GOOGLE_CLIENT_ID)' }, 500);

    const body = await c.req.json().catch(() => ({}));
    const frontendOrigin = body.frontendOrigin;
    // Use the bare origin (no /oauth-callback path) — the SPA detects ?code=&state= on any path
    const redirectUri = frontendOrigin
      ? frontendOrigin.replace(/\/+$/, '')
      : (Deno.env.get('GOOGLE_REDIRECT_URI') ?? '');

    if (!redirectUri) return c.json({ error: 'No redirect URI available (send frontendOrigin or set GOOGLE_REDIRECT_URI)' }, 500);
    console.log(`[Google OAuth] redirect_uri = ${redirectUri}`);

    const state = crypto.randomUUID();
    await kv.set(`oauth_state:${state}`, { userId: user.id, provider: 'google', redirectUri, ts: new Date().toISOString() });
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.searchParams.set('client_id', cid);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile');
    url.searchParams.set('state', state);
    url.searchParams.set('access_type', 'offline');
    url.searchParams.set('prompt', 'consent');
    return c.json({ success: true, authUrl: url.toString(), pollId: state, registeredRedirectUri: redirectUri });
  } catch (err: any) { return c.json({ error: err.message }, 500); }
});

app.get(`${PREFIX}/google-oauth-callback`, async (c) => {
  try {
    const code = c.req.query('code');
    const state = c.req.query('state');
    if (!code || !state) return c.html('<html><body><h2>Missing params</h2><script>window.close()</script></body></html>');
    const sd = await kv.get(`oauth_state:${state}`);
    if (!sd) return c.html('<html><body><h2>Invalid state</h2><script>window.close()</script></body></html>');
    await kv.del(`oauth_state:${state}`);
    const tr = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: Deno.env.get('GOOGLE_CLIENT_ID') ?? '', client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET') ?? '', code, redirect_uri: Deno.env.get('GOOGLE_REDIRECT_URI') ?? '', grant_type: 'authorization_code' }),
    });
    const td = await tr.json();
    if (td.error) { await kv.set(`oauth_result:${state}`, { success: false, error: td.error }); return c.html(`<html><body><h2>Error</h2><script>window.close()</script></body></html>`); }
    const ur = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', { headers: { Authorization: `Bearer ${td.access_token}` } });
    const ui = await ur.json();
    const kvKey = `gmail_${(ui.email || 'x').replace(/[^a-z0-9]/gi, '_').toLowerCase()}`;
    const existingAccount = await kv.get(`email_account:${sd.userId}:${kvKey}`);
    const aid = (existingAccount && existingAccount.id && existingAccount.id.includes('-')) ? existingAccount.id : crypto.randomUUID();
    await kv.set(`email_account:${sd.userId}:${kvKey}`, { id: aid, kvKey, provider: 'gmail', email: ui.email, displayName: ui.name || ui.email, access_token: td.access_token, refresh_token: td.refresh_token, token_expires_at: new Date(Date.now() + td.expires_in * 1000).toISOString(), userId: sd.userId, connectedAt: new Date().toISOString(), status: 'active' });
    const result = { success: true, accountId: aid, email: ui.email, provider: 'gmail' };
    await kv.set(`oauth_result:${state}`, result);
    return c.html(`<html><body><h2>Connected!</h2><p>${ui.email}</p><script>try{window.opener&&window.opener.postMessage(${JSON.stringify(JSON.stringify(result))},'*')}catch(e){}setTimeout(()=>window.close(),2000)</script></body></html>`);
  } catch (err: any) { return c.html(`<html><body><h2>Error</h2><script>window.close()</script></body></html>`); }
});

// ── HELPERS: token refresh + KV lookup ──────────────────────────────────
async function getAccountTokensFromKV(userId: string, accountId: string) {
  const all = await kv.getByPrefix(`email_account:${userId}:`);
  if (!all || all.length === 0) return null;
  return all.find((a: any) => a.id === accountId) || null;
}

async function refreshAzureTokenFn(refreshToken: string) {
  const CID = Deno.env.get('AZURE_CLIENT_ID') ?? '';
  const CS = Deno.env.get('AZURE_CLIENT_SECRET') ?? '';
  if (!CID || !CS) throw new Error('Azure credentials not configured');
  const r = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: CID, client_secret: CS, refresh_token: refreshToken, grant_type: 'refresh_token' }),
  });
  if (!r.ok) throw new Error('Failed to refresh Azure token: ' + await r.text());
  return await r.json();
}

async function refreshGoogleTokenFn(refreshToken: string) {
  const CID = Deno.env.get('GOOGLE_CLIENT_ID') ?? '';
  const CS = Deno.env.get('GOOGLE_CLIENT_SECRET') ?? '';
  if (!CID || !CS) throw new Error('Google credentials not configured');
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: CID, client_secret: CS, refresh_token: refreshToken, grant_type: 'refresh_token' }),
  });
  if (!r.ok) throw new Error('Failed to refresh Google token: ' + await r.text());
  return await r.json();
}

// ── EMAIL SYNC (consolidated — replaces azure-sync-emails & nylas-sync-emails) ──
app.post(`${PREFIX}/email-sync`, async (c) => {
  try {
    const auth = await authenticateUser(c);
    if (auth.error) return c.json({ error: auth.error }, auth.status);
    const { accountId, limit: emailLimit = 50 } = await c.req.json();
    if (!accountId) return c.json({ error: 'Missing accountId' }, 400);

    const kvAccount = await getAccountTokensFromKV(auth.user.id, accountId);
    if (!kvAccount) return c.json({ error: 'Email account not found in KV store' }, 404);
    console.log(`[email-sync] provider=${kvAccount.provider}, email=${kvAccount.email}`);

    const orgId = auth.profile?.organization_id;
    if (!orgId) return c.json({ error: 'No organization found for user' }, 400);
    let syncedCount = 0;

    if (kvAccount.provider === 'outlook') {
      let accessToken = kvAccount.access_token;
      const expiresAt = new Date(kvAccount.token_expires_at || 0);
      if (expiresAt <= new Date() && kvAccount.refresh_token) {
        console.log('[email-sync] Outlook token expired, refreshing...');
        const newTokens = await refreshAzureTokenFn(kvAccount.refresh_token);
        accessToken = newTokens.access_token;
        const kvKey = kvAccount.kvKey || `outlook_${kvAccount.email.replace(/[^a-z0-9]/gi, '_').toLowerCase()}`;
        await kv.set(`email_account:${auth.user.id}:${kvKey}`, {
          ...kvAccount, access_token: newTokens.access_token,
          refresh_token: newTokens.refresh_token || kvAccount.refresh_token,
          token_expires_at: new Date(Date.now() + newTokens.expires_in * 1000).toISOString(),
        });
      }
      const graphRes = await fetch(`https://graph.microsoft.com/v1.0/me/messages?$top=${emailLimit}&$orderby=receivedDateTime desc`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!graphRes.ok) return c.json({ error: `Microsoft Graph error: ${await graphRes.text()}` }, 502);
      const messages = (await graphRes.json()).value || [];
      console.log(`[email-sync] Fetched ${messages.length} Outlook emails`);
      for (const msg of messages) {
        const { data: existing } = await auth.supabase.from('emails').select('id').eq('message_id', msg.id).eq('account_id', accountId).maybeSingle();
        if (!existing) {
          const { error: insErr } = await auth.supabase.from('emails').insert({
            id: crypto.randomUUID(), user_id: auth.user.id, organization_id: orgId, account_id: accountId,
            message_id: msg.id, from_email: msg.from?.emailAddress?.address || '',
            to_email: msg.toRecipients?.[0]?.emailAddress?.address || '',
            cc_email: msg.ccRecipients?.map((r: any) => r.emailAddress?.address).join(', ') || null,
            subject: msg.subject || '(No Subject)', body: msg.body?.content || '',
            folder: msg.parentFolderId?.includes('SentItems') ? 'sent' : 'inbox',
            is_read: msg.isRead || false, is_starred: msg.flag?.flagStatus === 'flagged',
            received_at: msg.receivedDateTime,
          });
          if (!insErr) syncedCount++;
          else console.log(`[email-sync] insert err: ${insErr.message}`);
        }
      }
    } else if (kvAccount.provider === 'gmail') {
      const NYLAS_API_KEY = Deno.env.get('NYLAS_API_KEY');
      const nylasGrantId = kvAccount.nylasGrantId || kvAccount.nylas_grant_id;
      if (NYLAS_API_KEY && nylasGrantId) {
        const nylasRes = await fetch(`https://api.us.nylas.com/v3/grants/${nylasGrantId}/messages?limit=${emailLimit}`, {
          headers: { Authorization: `Bearer ${NYLAS_API_KEY}` },
        });
        if (!nylasRes.ok) return c.json({ error: `Nylas API error: ${await nylasRes.text()}` }, 502);
        const messages = (await nylasRes.json()).data || [];
        for (const msg of messages) {
          const { data: existing } = await auth.supabase.from('emails').select('id').eq('message_id', msg.id).eq('account_id', accountId).maybeSingle();
          if (!existing) {
            const { error: insErr } = await auth.supabase.from('emails').insert({
              id: crypto.randomUUID(), user_id: auth.user.id, organization_id: orgId, account_id: accountId,
              message_id: msg.id, from_email: msg.from?.[0]?.email || '',
              to_email: msg.to?.[0]?.email || kvAccount.email,
              cc_email: msg.cc?.map((x: any) => x.email).join(', ') || null,
              subject: msg.subject || '(No Subject)', body: msg.body || msg.snippet || '',
              folder: msg.folders?.includes('SENT') ? 'sent' : 'inbox',
              is_read: msg.unread === false, is_starred: msg.starred || false,
              received_at: new Date(msg.date * 1000).toISOString(),
            });
            if (!insErr) syncedCount++;
          }
        }
      } else {
        let accessToken = kvAccount.access_token;
        const expiresAt = new Date(kvAccount.token_expires_at || 0);
        if (expiresAt <= new Date() && kvAccount.refresh_token) {
          const newTokens = await refreshGoogleTokenFn(kvAccount.refresh_token);
          accessToken = newTokens.access_token;
          const kvKey = kvAccount.kvKey || `gmail_${kvAccount.email.replace(/[^a-z0-9]/gi, '_').toLowerCase()}`;
          await kv.set(`email_account:${auth.user.id}:${kvKey}`, {
            ...kvAccount, access_token: newTokens.access_token,
            token_expires_at: new Date(Date.now() + newTokens.expires_in * 1000).toISOString(),
          });
        }
        const gmailRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${emailLimit}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!gmailRes.ok) return c.json({ error: 'Gmail API error: ' + await gmailRes.text() }, 502);
        const messageIds = (await gmailRes.json()).messages || [];
        for (const m of messageIds.slice(0, emailLimit)) {
          const { data: existing } = await auth.supabase.from('emails').select('id').eq('message_id', m.id).eq('account_id', accountId).maybeSingle();
          if (!existing) {
            const detRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=full`, {
              headers: { Authorization: `Bearer ${accessToken}` },
            });
            if (detRes.ok) {
              const d = await detRes.json();
              const hdrs = d.payload?.headers || [];
              const getH = (n: string) => hdrs.find((h: any) => h.name.toLowerCase() === n.toLowerCase())?.value || '';
              const { error: insErr } = await auth.supabase.from('emails').insert({
                id: crypto.randomUUID(), user_id: auth.user.id, organization_id: orgId, account_id: accountId,
                message_id: m.id, from_email: getH('From'), to_email: getH('To'),
                cc_email: getH('Cc') || null, subject: getH('Subject') || '(No Subject)',
                body: d.snippet || '', folder: d.labelIds?.includes('SENT') ? 'sent' : 'inbox',
                is_read: !d.labelIds?.includes('UNREAD'), is_starred: d.labelIds?.includes('STARRED'),
                received_at: new Date(parseInt(d.internalDate)).toISOString(),
              });
              if (!insErr) syncedCount++;
            }
          }
        }
      }
    } else {
      return c.json({ error: `Unsupported provider: ${kvAccount.provider}` }, 400);
    }
    await auth.supabase.from('email_accounts').update({ last_sync: new Date().toISOString() }).eq('id', accountId);
    return c.json({ success: true, syncedCount, lastSync: new Date().toISOString() });
  } catch (err: any) {
    console.log(`[email-sync] exception: ${err.message}`);
    return c.json({ error: err.message }, 500);
  }
});

// ── EMAIL SEND (consolidated — replaces azure-send-email & nylas-send-email) ──
app.post(`${PREFIX}/email-send`, async (c) => {
  try {
    const auth = await authenticateUser(c);
    if (auth.error) return c.json({ error: auth.error }, auth.status);
    const { accountId, to, subject, body: emailBody, cc, bcc } = await c.req.json();
    if (!accountId || !to || !subject || !emailBody) return c.json({ error: 'Missing required fields' }, 400);

    const kvAccount = await getAccountTokensFromKV(auth.user.id, accountId);
    if (!kvAccount) return c.json({ error: 'Email account not found' }, 404);
    const orgId = auth.profile?.organization_id;
    if (!orgId) return c.json({ error: 'No organization found for user' }, 400);

    if (kvAccount.provider === 'outlook') {
      let accessToken = kvAccount.access_token;
      if (new Date(kvAccount.token_expires_at || 0) <= new Date() && kvAccount.refresh_token) {
        const nt = await refreshAzureTokenFn(kvAccount.refresh_token);
        accessToken = nt.access_token;
        const kvKey = kvAccount.kvKey || `outlook_${kvAccount.email.replace(/[^a-z0-9]/gi, '_').toLowerCase()}`;
        await kv.set(`email_account:${auth.user.id}:${kvKey}`, { ...kvAccount, access_token: nt.access_token, refresh_token: nt.refresh_token || kvAccount.refresh_token, token_expires_at: new Date(Date.now() + nt.expires_in * 1000).toISOString() });
      }
      const message: any = { subject, body: { contentType: 'HTML', content: emailBody }, toRecipients: (Array.isArray(to) ? to : [to]).map((e: string) => ({ emailAddress: { address: e } })) };
      if (cc) message.ccRecipients = (Array.isArray(cc) ? cc : [cc]).map((e: string) => ({ emailAddress: { address: e } }));
      if (bcc) message.bccRecipients = (Array.isArray(bcc) ? bcc : [bcc]).map((e: string) => ({ emailAddress: { address: e } }));
      const gRes = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', { method: 'POST', headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ message }) });
      if (!gRes.ok) return c.json({ error: 'Graph send error: ' + await gRes.text() }, 502);
      await auth.supabase.from('emails').insert({ id: crypto.randomUUID(), user_id: auth.user.id, organization_id: orgId, account_id: accountId, message_id: crypto.randomUUID(), from_email: kvAccount.email, to_email: Array.isArray(to) ? to[0] : to, cc_email: cc ? (Array.isArray(cc) ? cc.join(', ') : cc) : null, subject, body: emailBody, folder: 'sent', is_read: true, is_starred: false, received_at: new Date().toISOString() });
      return c.json({ success: true, message: 'Email sent via Outlook' });
    } else if (kvAccount.provider === 'gmail') {
      const NYLAS_API_KEY = Deno.env.get('NYLAS_API_KEY');
      const nylasGrantId = kvAccount.nylasGrantId || kvAccount.nylas_grant_id;
      if (NYLAS_API_KEY && nylasGrantId) {
        const nb: any = { subject, body: emailBody, to: (Array.isArray(to) ? to : [to]).map((e: string) => ({ email: e })) };
        if (cc) nb.cc = (Array.isArray(cc) ? cc : [cc]).map((e: string) => ({ email: e }));
        if (bcc) nb.bcc = (Array.isArray(bcc) ? bcc : [bcc]).map((e: string) => ({ email: e }));
        const nRes = await fetch(`https://api.us.nylas.com/v3/grants/${nylasGrantId}/messages/send`, { method: 'POST', headers: { Authorization: `Bearer ${NYLAS_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify(nb) });
        if (!nRes.ok) return c.json({ error: 'Nylas send error: ' + await nRes.text() }, 502);
        await auth.supabase.from('emails').insert({ id: crypto.randomUUID(), user_id: auth.user.id, organization_id: orgId, account_id: accountId, message_id: crypto.randomUUID(), from_email: kvAccount.email, to_email: Array.isArray(to) ? to[0] : to, subject, body: emailBody, folder: 'sent', is_read: true, is_starred: false, received_at: new Date().toISOString() });
        return c.json({ success: true, message: 'Email sent via Nylas/Gmail' });
      } else {
        let accessToken = kvAccount.access_token;
        if (new Date(kvAccount.token_expires_at || 0) <= new Date() && kvAccount.refresh_token) {
          const nt = await refreshGoogleTokenFn(kvAccount.refresh_token);
          accessToken = nt.access_token;
          const kvKey = kvAccount.kvKey || `gmail_${kvAccount.email.replace(/[^a-z0-9]/gi, '_').toLowerCase()}`;
          await kv.set(`email_account:${auth.user.id}:${kvKey}`, { ...kvAccount, access_token: nt.access_token, token_expires_at: new Date(Date.now() + nt.expires_in * 1000).toISOString() });
        }
        const raw = btoa(`From: ${kvAccount.email}\r\nTo: ${Array.isArray(to) ? to.join(', ') : to}\r\n${cc ? `Cc: ${Array.isArray(cc) ? cc.join(', ') : cc}\r\n` : ''}Subject: ${subject}\r\nContent-Type: text/html; charset=utf-8\r\n\r\n${emailBody}`).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        const gRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', { method: 'POST', headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ raw }) });
        if (!gRes.ok) return c.json({ error: 'Gmail send error: ' + await gRes.text() }, 502);
        await auth.supabase.from('emails').insert({ id: crypto.randomUUID(), user_id: auth.user.id, organization_id: orgId, account_id: accountId, message_id: crypto.randomUUID(), from_email: kvAccount.email, to_email: Array.isArray(to) ? to[0] : to, subject, body: emailBody, folder: 'sent', is_read: true, is_starred: false, received_at: new Date().toISOString() });
        return c.json({ success: true, message: 'Email sent via Gmail API' });
      }
    } else {
      return c.json({ error: `Sending not supported for provider: ${kvAccount.provider}` }, 400);
    }
  } catch (err: any) {
    console.log(`[email-send] exception: ${err.message}`);
    return c.json({ error: err.message }, 500);
  }
});

// ── EMAIL ACCOUNTS (server-side upsert — bypasses RLS via service role key) ──
app.post(`${PREFIX}/email-accounts`, async (c) => {
  try {
    const auth = await authenticateUser(c);
    if (auth.error) return c.json({ error: auth.error }, auth.status);
    const body = await c.req.json();
    const accountData: Record<string, any> = {
      ...body,
      user_id: auth.user.id,
      updated_at: new Date().toISOString(),
    };
    // Remove undefined fields that might conflict with NOT NULL columns
    Object.keys(accountData).forEach(k => {
      if (accountData[k] === undefined) delete accountData[k];
    });
    const { data, error } = await auth.supabase
      .from('email_accounts')
      .upsert(accountData, { onConflict: 'id' })
      .select('*')
      .single();
    if (error) {
      console.log(`[email-accounts] upsert error: ${error.message}, code: ${error.code}, details: ${JSON.stringify(error)}`);
      return c.json({ error: error.message }, 500);
    }
    return c.json({ success: true, account: data });
  } catch (err: any) {
    console.log(`[email-accounts] POST exception: ${err.message}`);
    return c.json({ error: err.message }, 500);
  }
});

app.get(`${PREFIX}/email-accounts`, async (c) => {
  try {
    const auth = await authenticateUser(c);
    if (auth.error) return c.json({ error: auth.error }, auth.status);
    const { data, error } = await auth.supabase
      .from('email_accounts')
      .select('*')
      .eq('user_id', auth.user.id);
    if (error) {
      console.log(`[email-accounts] GET error: ${error.message}`);
      return c.json({ error: error.message }, 500);
    }
    return c.json({ accounts: data || [] });
  } catch (err: any) {
    console.log(`[email-accounts] GET exception: ${err.message}`);
    return c.json({ error: err.message }, 500);
  }
});

app.delete(`${PREFIX}/email-accounts/:id`, async (c) => {
  try {
    const auth = await authenticateUser(c);
    if (auth.error) return c.json({ error: auth.error }, auth.status);
    const { error } = await auth.supabase
      .from('email_accounts')
      .delete()
      .eq('id', c.req.param('id'))
      .eq('user_id', auth.user.id);
    if (error) return c.json({ error: error.message }, 500);
    return c.json({ success: true });
  } catch (err: any) { return c.json({ error: err.message }, 500); }
});

// ── UTILITY ─────────────────────────────────────────────────────────────
app.post(`${PREFIX}/create-user`, async (c) => {
  try {
    const { email, name, role, organizationId, tempPassword } = await c.req.json();
    if (!email || !tempPassword) return c.json({ error: 'Missing fields' }, 400);
    const supabase = getSupabase();
    const { data: { users: existing } } = await supabase.auth.admin.listUsers();
    const found = existing?.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());
    let uid: string;
    if (found) {
      uid = found.id;
      await supabase.auth.admin.updateUserById(uid, { password: tempPassword, user_metadata: { name, role, organizationId } });
    } else {
      const { data, error } = await supabase.auth.admin.createUser({ email: email.toLowerCase(), password: tempPassword, user_metadata: { name, role, organizationId }, email_confirm: true });
      if (error) return c.json({ error: error.message }, 500);
      uid = data.user.id;
    }
    await supabase.from('profiles').upsert({ id: uid, email: email.toLowerCase(), name, role, organization_id: organizationId, status: 'active', updated_at: new Date().toISOString() }, { onConflict: 'id' });
    return c.json({ success: true, userId: uid });
  } catch (err: any) { return c.json({ error: err.message }, 500); }
});

app.post(`${PREFIX}/reset-password`, async (c) => {
  try {
    const { userEmail, tempPassword } = await c.req.json();
    const supabase = getSupabase();
    const { data: { users } } = await supabase.auth.admin.listUsers();
    const user = users?.find((u: any) => u.email === userEmail);
    if (!user) return c.json({ error: 'Not found' }, 404);
    const { error } = await supabase.auth.admin.updateUserById(user.id, { password: tempPassword });
    if (error) return c.json({ error: error.message }, 500);
    return c.json({ success: true });
  } catch (err: any) { return c.json({ error: err.message }, 500); }
});

app.post(`${PREFIX}/fix-profile-mismatch`, async (c) => {
  try {
    const supabase = getSupabase();
    const { email, currentUserId } = await c.req.json();
    const { data: old } = await supabase.from('profiles').select('*').eq('email', email).single();
    if (!old) return c.json({ error: 'Not found' }, 404);
    await supabase.from('profiles').delete().eq('email', email);
    const { data, error } = await supabase.from('profiles').insert({ id: currentUserId, email: old.email, name: old.name, role: old.role, organization_id: old.organization_id, status: old.status || 'active', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }).select().single();
    if (error) return c.json({ error: error.message }, 500);
    return c.json({ success: true, profile: data });
  } catch (err: any) { return c.json({ error: err.message }, 500); }
});

// ── PUBLIC ENDPOINTS (no auth required) ─────────────────────────────────

// Public quote/bid view — used when customer clicks "View Quote Online" in email
app.get(`${PREFIX}/public/view`, async (c) => {
  try {
    const id = c.req.query('id');
    const orgId = c.req.query('orgId');
    const type = c.req.query('type') || 'quote';

    if (!id || !orgId) {
      return c.json({ error: 'Missing required parameters: id, orgId' }, 400);
    }

    const supabase = getSupabase();
    const table = type === 'bid' ? 'bids' : 'quotes';

    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single();

    if (error || !data) {
      console.log(`[public/view] Not found: table=${table}, id=${id}, orgId=${orgId}, error=${error?.message}`);
      return c.json({ error: 'Document not found' }, 404);
    }

    // Record view event (fire-and-forget)
    try {
      await kv.set(`tracking:view:${type}:${id}:${Date.now()}`, JSON.stringify({
        type: 'view',
        entityType: type,
        entityId: id,
        orgId,
        timestamp: new Date().toISOString(),
      }));
    } catch (_) { /* ignore tracking errors */ }

    // Strip sensitive fields before returning to public viewer
    const { access_token, refresh_token, nylas_grant_id, imap_password, ...safeData } = data as any;

    return c.json({ data: safeData });
  } catch (err: any) {
    console.log(`[public/view] Error: ${err.message}`);
    return c.json({ error: err.message }, 500);
  }
});

// Public tracking events — logs click/open events from email links
app.post(`${PREFIX}/public/events`, async (c) => {
  try {
    const body = await c.req.json();
    const { type: eventType, entityType, entityId, orgId, url, userAgent } = body;

    if (!entityId || !orgId) {
      return c.json({ error: 'Missing entityId or orgId' }, 400);
    }

    // Store tracking event in KV
    await kv.set(`tracking:${eventType || 'click'}:${entityType || 'quote'}:${entityId}:${Date.now()}`, JSON.stringify({
      type: eventType || 'click',
      entityType: entityType || 'quote',
      entityId,
      orgId,
      url,
      userAgent,
      timestamp: new Date().toISOString(),
    }));

    return c.json({ success: true });
  } catch (err: any) {
    console.log(`[public/events] Error: ${err.message}`);
    return c.json({ error: err.message }, 500);
  }
});

// ── CATCH-ALL ───────────────────────────────────────────────────────────
app.all('*', (c) => {
  return c.json({ error: 'Route not found', method: c.req.method, path: c.req.path, version: 'v5', hint: `GET ${PREFIX}/health` }, 404);
});

// ── Mount with prefix stripping for both deployment targets ─────────────
const server = new Hono();
server.use('*', logger());
server.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowHeaders: ['Authorization', 'X-User-Token', 'Content-Type', 'Accept', 'apikey', 'x-client-info'],
  exposeHeaders: ['Content-Length', 'Content-Type'],
  maxAge: 86400,
}));
// Codespace deployment: function named "server" → paths arrive as /server/make-server-8405be07/...
server.route('/server', app);
// Figma Make preview: paths arrive as /make-server-8405be07/...
server.route('/', app);

console.log('[v5] ProSpaces CRM server starting');
Deno.serve(server.fetch);