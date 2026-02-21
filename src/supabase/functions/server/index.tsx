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
  if (!token) return { error: 'Missing auth token (send X-User-Token header)', status: 401, supabase, user: null as any, profile: null as any };
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
    const RU = Deno.env.get('AZURE_REDIRECT_URI');
    if (!CID || !RU) return c.json({ error: 'Azure not configured' }, 500);
    const state = crypto.randomUUID();
    await kv.set(`oauth_state:${state}`, { userId: user.id, provider: 'microsoft', ts: new Date().toISOString() });
    const url = new URL('https://login.microsoftonline.com/common/oauth2/v2.0/authorize');
    url.searchParams.set('client_id', CID);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('redirect_uri', RU);
    url.searchParams.set('response_mode', 'query');
    url.searchParams.set('scope', 'offline_access Mail.Read Mail.ReadWrite Mail.Send User.Read Calendars.Read Calendars.ReadWrite');
    url.searchParams.set('state', state);
    url.searchParams.set('prompt', 'consent');
    return c.json({ success: true, authUrl: url.toString(), pollId: state });
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
      body: new URLSearchParams({ client_id: Deno.env.get('AZURE_CLIENT_ID') ?? '', client_secret: Deno.env.get('AZURE_CLIENT_SECRET') ?? '', code, redirect_uri: Deno.env.get('AZURE_REDIRECT_URI') ?? '', grant_type: 'authorization_code' }),
    });
    const td = await tr.json();
    if (td.error) {
      await kv.set(`oauth_result:${state}`, { success: false, error: td.error_description || td.error });
      return c.html(`<html><body><h2>Token error</h2><p>${td.error_description}</p><script>window.close()</script></body></html>`);
    }
    const ur = await fetch('https://graph.microsoft.com/v1.0/me', { headers: { Authorization: `Bearer ${td.access_token}` } });
    const ui = await ur.json();
    const email = ui.mail || ui.userPrincipalName || 'unknown';
    const aid = `outlook_${email.replace(/[^a-z0-9]/gi, '_').toLowerCase()}`;
    await kv.set(`email_account:${sd.userId}:${aid}`, { id: aid, provider: 'outlook', email, displayName: ui.displayName || email, access_token: td.access_token, refresh_token: td.refresh_token, token_expires_at: new Date(Date.now() + td.expires_in * 1000).toISOString(), userId: sd.userId, connectedAt: new Date().toISOString(), status: 'active' });
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
    const ru = Deno.env.get('GOOGLE_REDIRECT_URI');
    if (!cid || !ru) return c.json({ error: 'Google not configured' }, 500);
    const state = crypto.randomUUID();
    await kv.set(`oauth_state:${state}`, { userId: user.id, provider: 'google', ts: new Date().toISOString() });
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.searchParams.set('client_id', cid);
    url.searchParams.set('redirect_uri', ru);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile');
    url.searchParams.set('state', state);
    url.searchParams.set('access_type', 'offline');
    url.searchParams.set('prompt', 'consent');
    return c.json({ success: true, authUrl: url.toString(), pollId: state });
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
    const aid = `gmail_${(ui.email || 'x').replace(/[^a-z0-9]/gi, '_').toLowerCase()}`;
    await kv.set(`email_account:${sd.userId}:${aid}`, { id: aid, provider: 'gmail', email: ui.email, displayName: ui.name || ui.email, access_token: td.access_token, refresh_token: td.refresh_token, token_expires_at: new Date(Date.now() + td.expires_in * 1000).toISOString(), userId: sd.userId, connectedAt: new Date().toISOString(), status: 'active' });
    const result = { success: true, accountId: aid, email: ui.email, provider: 'gmail' };
    await kv.set(`oauth_result:${state}`, result);
    return c.html(`<html><body><h2>Connected!</h2><p>${ui.email}</p><script>try{window.opener&&window.opener.postMessage(${JSON.stringify(JSON.stringify(result))},'*')}catch(e){}setTimeout(()=>window.close(),2000)</script></body></html>`);
  } catch (err: any) { return c.html(`<html><body><h2>Error</h2><script>window.close()</script></body></html>`); }
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