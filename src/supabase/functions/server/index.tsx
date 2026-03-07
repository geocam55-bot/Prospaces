import { Hono } from 'npm:hono';
// Force reload
import { cors } from 'npm:hono/cors';
import { logger } from 'npm:hono/logger';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import * as kv from './kv_store.tsx';
import { marketing } from './marketing.ts';
import { subscriptions } from './subscriptions.ts';
import { apiKeys } from './api-keys.ts';
import { publicApi } from './public-api.ts';
import { designsApi } from './designs-api.ts';
import { contactsAPI } from './contacts-api.ts';
import { inventoryDiagnostic } from './inventory-diagnostic.ts';
import { auditAPI } from './audit-api.ts';
import { tenantsAPI as tenantsAPIRoutes } from './tenants-api.ts';
import { debugSubscriptions } from './debug-subscriptions.ts';
import { backgroundJobs } from './background-jobs.ts';

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

// ── MIDDLEWARE (applied directly — single-app architecture) ──────────────
app.use('*', logger(console.log));
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowHeaders: ['Authorization', 'X-User-Token', 'X-Portal-Token', 'X-API-Key', 'Content-Type', 'Accept', 'apikey', 'x-client-info'],
  exposeHeaders: ['Content-Length', 'Content-Type'],
  maxAge: 86400,
}));

// ── ROOT / HEALTH ────────────────────────────────────────────────────────
app.get('/', (c) => {
  return c.json({ status: 'ok', app: 'ProSpaces CRM', version: 'v5', timestamp: new Date().toISOString() });
});
app.get(`${PREFIX}`, (c) => {
  return c.json({ status: 'ok', app: 'ProSpaces CRM', version: 'v5', timestamp: new Date().toISOString() });
});
app.get(`${PREFIX}/`, (c) => {
  return c.json({ status: 'ok', app: 'ProSpaces CRM', version: 'v5', timestamp: new Date().toISOString() });
});
app.get(`${PREFIX}/health`, (c) => {
  return c.json({ status: 'ok', version: 'v5-2025-02-21', timestamp: new Date().toISOString() });
});

// ── APPOINTMENT COUNT (for notification badge) ──────────────────────────
app.get(`${PREFIX}/appointments/count`, async (c) => {
  try {
    const auth = await authenticateUser(c);
    if (auth.error) return c.json({ error: auth.error }, auth.status);
    const now = new Date().toISOString();
    const { count, error } = await auth.supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('owner_id', auth.user.id)
      .gt('start_time', now);
    if (error) {
      console.log(`[appointments/count] Query error for user ${auth.user.id}: ${error.message}`);
      return c.json({ count: 0 });
    }
    return c.json({ count: count || 0 });
  } catch (err: any) {
    console.log(`[appointments/count] Unexpected error: ${err.message}`);
    return c.json({ count: 0 });
  }
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

// ── CONTACTS (delegated to contacts-api.ts — column detection + KV fallback for price_level) ──
contactsAPI(app);

// ── TENANTS (server-side CRUD bypassing RLS for super_admin) ──
tenantsAPIRoutes(app);

// ── DEBUG ROUTES ──
debugSubscriptions(app);

// ── ORG STATS (for Tenants / Organizations module) ─────────────────────
// Returns user counts and contact counts per organization, bypassing RLS
// via the service role key. Only super_admin can call this.
app.get(`${PREFIX}/org-stats`, async (c) => {
  try {
    const auth = await authenticateUser(c);
    if (auth.error) return c.json({ error: auth.error }, auth.status);
    if (auth.profile.role !== 'super_admin') {
      return c.json({ error: 'Only super admins can access org stats' }, 403);
    }

    const supabase = getSupabase(); // service role — bypasses RLS

    // Get all organization IDs from query param
    const orgIds = c.req.query('org_ids');
    const ids = orgIds ? orgIds.split(',').filter(Boolean) : [];

    if (ids.length === 0) {
      return c.json({ stats: {} });
    }

    // Count users and contacts per org in parallel
    const statsEntries = await Promise.all(ids.map(async (orgId: string) => {
      const [usersResult, contactsResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', orgId),
        supabase
          .from('contacts')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', orgId),
      ]);

      if (usersResult.error) console.log(`[org-stats] Error counting users for ${orgId}:`, usersResult.error.message);
      if (contactsResult.error) console.log(`[org-stats] Error counting contacts for ${orgId}:`, contactsResult.error.message);

      return [orgId, {
        userCount: usersResult.count ?? 0,
        contactsCount: contactsResult.count ?? 0,
      }] as const;
    }));

    const stats = Object.fromEntries(statsEntries);
    return c.json({ stats });
  } catch (err: any) {
    console.log('[org-stats] Error:', err.message);
    return c.json({ error: err.message }, 500);
  }
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
    if (!body.quote_number) {
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      body.quote_number = `QT-${year}${month}-${random}`;
    }
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
    if (!body.status) body.status = 'draft';
    const { data, error } = await auth.supabase.from('bids').insert([body]).select('*').single();
    if (error) return c.json({ error: error.message }, 500);
    return c.json({ bid: data }, 201);
  } catch (err: any) { return c.json({ error: err.message }, 500); }
});

app.post(`${PREFIX}/interior-planner/draft`, async (c) => {
  try {
    const auth = await authenticateUser(c);
    if (auth.error) return c.json({ error: auth.error }, auth.status);
    const body = await c.req.json();
    // Using stringify with a large base64 image
    await kv.set(`interior_draft_${auth.user.id}`, JSON.stringify(body));
    return c.json({ success: true });
  } catch (err: any) { 
    return c.json({ error: err.message }, 500); 
  }
});

app.get(`${PREFIX}/interior-planner/draft`, async (c) => {
  try {
    const auth = await authenticateUser(c);
    if (auth.error) return c.json({ error: auth.error }, auth.status);
    const draftStr = await kv.get(`interior_draft_${auth.user.id}`);
    if (!draftStr) return c.json({ draft: null });
    // draftStr is stored as string so we parse it
    const draft = typeof draftStr === 'string' ? JSON.parse(draftStr) : draftStr;
    return c.json({ draft });
  } catch (err: any) { 
    return c.json({ error: err.message }, 500); 
  }
});

// ── RECOVER LOST DEALS (Fix NULL organization_id) ───────────────────────
app.post(`${PREFIX}/recover-deals`, async (c) => {
  try {
    const auth = await authenticateUser(c);
    if (auth.error) return c.json({ error: auth.error }, auth.status);

    const orgId = auth.profile.organization_id;
    if (!orgId) return c.json({ error: 'User has no organization' }, 400);

    // Use service role to bypass RLS and fix records
    const supabase = getSupabase();
    
    // 1. Fix Quotes created by this user
    const { data: fixedQuotes, error: qError } = await supabase
      .from('quotes')
      .update({ organization_id: orgId })
      .eq('created_by', auth.user.id)
      .is('organization_id', null)
      .select();

    if (qError) console.error('[recover-deals] Quotes error:', qError);

    // 2. Fix Bids created by this user
    const { data: fixedBids, error: bError } = await supabase
      .from('bids')
      .update({ organization_id: orgId })
      .eq('created_by', auth.user.id)
      .is('organization_id', null)
      .select();

    if (bError) console.error('[recover-deals] Bids error:', bError);

    // 3. Admin Power: If admin, also fix any orphan records that belong to contacts in this org
    // (This handles imported deals where created_by might be generic but contact is linked)
    let adminFixedQuotes = 0;
    let adminFixedBids = 0;

    if (['admin', 'super_admin'].includes(auth.profile.role)) {
       // Find contacts in this org
       const { data: contacts } = await supabase.from('contacts').select('id').eq('organization_id', orgId);
       if (contacts && contacts.length > 0) {
         const contactIds = contacts.map((ct: any) => ct.id);
         
         // Fix quotes linked to these contacts but with NULL org
         const { data: fq } = await supabase
           .from('quotes')
           .update({ organization_id: orgId })
           .in('contact_id', contactIds)
           .is('organization_id', null)
           .select();
         adminFixedQuotes = fq?.length || 0;

         // Fix bids linked to opportunities linked to these contacts
         // (More complex join, skipping for now to keep it fast/safe)
       }
    }

    return c.json({ 
      success: true, 
      fixedQuotes: (fixedQuotes?.length || 0) + adminFixedQuotes, 
      fixedBids: (fixedBids?.length || 0) + adminFixedBids
    });

  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
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
    console.log(`[profiles] Returning ${data?.length || 0} profiles for role=${auth.profile.role}, org=${auth.profile.organization_id}`);
    return c.json({ profiles: data || [], source: 'server' });
  } catch (err: any) { return c.json({ error: err.message }, 500); }
});

app.get(`${PREFIX}/profiles/ensure`, async (c) => {
  try {
    const auth = await authenticateUser(c);
    if (auth.error) return c.json({ error: auth.error }, auth.status);
    const { data: existing } = await auth.supabase.from('profiles').select('*').eq('id', auth.user.id).maybeSingle();
    if (existing) {
      // If user_metadata has needs_password_change or a different org than what's on the profile,
      // it means admin just created/updated this user — sync the profile to match.
      const metaOrg = auth.user.user_metadata?.organizationId;
      const metaNeedsPw = auth.user.user_metadata?.needs_password_change === true;
      const orgMismatch = metaOrg && metaOrg !== existing.organization_id;
      const pwMissing = metaNeedsPw && !existing.needs_password_change;

      if (orgMismatch || pwMissing) {
        const updates: any = { updated_at: new Date().toISOString() };
        if (orgMismatch) {
          // Verify the metadata org actually exists before overwriting
          const { data: orgCheck } = await auth.supabase.from('organizations').select('id').eq('id', metaOrg).maybeSingle();
          if (orgCheck) {
            updates.organization_id = metaOrg;
            console.log(`[profiles/ensure] Fixing org mismatch: ${existing.organization_id} -> ${metaOrg}`);
          }
        }
        if (pwMissing) {
          updates.needs_password_change = true;
          console.log(`[profiles/ensure] Setting needs_password_change=true from metadata`);
        }
        const { data: updated } = await auth.supabase.from('profiles')
          .update(updates).eq('id', auth.user.id).select().single();
        if (updated) return c.json({ created: false, profileId: updated.id, profile: updated, fixed: true });
      }
      return c.json({ created: false, profileId: existing.id, profile: existing });
    }

    // Also check by email in case of ID mismatch
    if (auth.user.email) {
      const { data: byEmail } = await auth.supabase.from('profiles').select('*').eq('email', auth.user.email.toLowerCase()).maybeSingle();
      if (byEmail) {
        // Build update payload: fix ID + sync org and needs_password_change from metadata
        const metaOrg = auth.user.user_metadata?.organizationId;
        const metaNeedsPw = auth.user.user_metadata?.needs_password_change === true;
        const updatePayload: any = { id: auth.user.id, updated_at: new Date().toISOString() };
        if (metaNeedsPw) updatePayload.needs_password_change = true;
        if (metaOrg && metaOrg !== byEmail.organization_id) {
          const { data: orgCheck } = await auth.supabase.from('organizations').select('id').eq('id', metaOrg).maybeSingle();
          if (orgCheck) updatePayload.organization_id = metaOrg;
        }
        const { data: updated, error: updateErr } = await auth.supabase.from('profiles')
          .update(updatePayload)
          .eq('email', auth.user.email.toLowerCase())
          .select().single();
        if (updated && !updateErr) {
          return c.json({ created: false, profileId: updated.id, profile: updated, fixed: 'id_mismatch' });
        }
        return c.json({ created: false, profileId: byEmail.id, profile: byEmail, note: 'id_mismatch_unfixed' });
      }
    }

    // Resolve a valid organization_id
    let orgId = auth.user.user_metadata?.organizationId || null;
    if (orgId) {
      const { data: orgCheck } = await auth.supabase.from('organizations').select('id').eq('id', orgId).maybeSingle();
      if (!orgCheck) {
        console.log(`[profiles/ensure] Org ${orgId} from metadata doesn't exist, will find/create one`);
        orgId = null;
      }
    }
    if (!orgId) {
      const { data: anyOrg } = await auth.supabase.from('organizations').select('id').limit(1).maybeSingle();
      if (anyOrg) {
        orgId = anyOrg.id;
        console.log(`[profiles/ensure] Using existing org: ${orgId}`);
      } else {
        const newOrgId = crypto.randomUUID();
        const { data: createdOrg, error: orgErr } = await auth.supabase.from('organizations').insert({
          id: newOrgId, name: `${auth.user.email?.split('@')[0] || 'User'}'s Organization`, created_at: new Date().toISOString(),
        }).select().single();
        if (createdOrg && !orgErr) {
          orgId = createdOrg.id;
          console.log(`[profiles/ensure] Created new org: ${orgId}`);
        } else {
          console.error(`[profiles/ensure] Failed to create org: ${orgErr?.message}`);
          return c.json({ error: `Cannot create organization: ${orgErr?.message}` }, 500);
        }
      }
    }

    // Carry over needs_password_change from user_metadata (set by create-user endpoint)
    const needsPwChange = auth.user.user_metadata?.needs_password_change === true;

    const { data: np, error } = await auth.supabase.from('profiles').insert([{
      id: auth.user.id, email: auth.user.email, name: auth.user.user_metadata?.name || auth.user.email,
      role: auth.user.user_metadata?.role || 'standard_user', organization_id: orgId,
      needs_password_change: needsPwChange,
      status: 'active', created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }]).select().single();
    if (error) {
      console.error(`[profiles/ensure] Profile insert error: ${error.code} ${error.message}`);
      return c.json({ error: error.message, code: error.code }, 500);
    }
    return c.json({ created: true, profileId: np?.id, profile: np });
  } catch (err: any) {
    console.error(`[profiles/ensure] Exception: ${err.message}`);
    return c.json({ error: err.message }, 500);
  }
});

// ── SYNC AUTH USERS → PROFILES ──────────────────────────────────────────
app.get(`${PREFIX}/profiles/find-missing`, async (c) => {
  try {
    const auth = await authenticateUser(c);
    if (auth.error) return c.json({ error: auth.error }, auth.status);
    if (auth.profile.role !== 'super_admin' && auth.profile.role !== 'admin') {
      return c.json({ error: 'Forbidden' }, 403);
    }
    const targetOrg = c.req.query('organization_id') || auth.profile.organization_id;
    if (!targetOrg) return c.json({ error: 'No organization context' }, 400);

    const { data: { users: authUsers }, error: listErr } = await auth.supabase.auth.admin.listUsers({ perPage: 1000 });
    if (listErr) return c.json({ error: `Failed to list auth users: ${listErr.message}` }, 500);

    const { data: orgProfiles } = await auth.supabase.from('profiles').select('id, email').eq('organization_id', targetOrg);
    const profileIds = new Set((orgProfiles || []).map((p: any) => p.id));
    const profileEmails = new Set((orgProfiles || []).map((p: any) => p.email?.toLowerCase()));

    const missing: any[] = [];
    for (const au of (authUsers || [])) {
      const metaOrg = au.user_metadata?.organizationId;
      if (metaOrg !== targetOrg) continue;
      if (profileIds.has(au.id)) continue;
      if (au.email && profileEmails.has(au.email.toLowerCase())) continue;
      missing.push({ id: au.id, email: au.email, name: au.user_metadata?.name || au.email, role: au.user_metadata?.role || 'standard_user', created_at: au.created_at });
    }

    const wrongOrg: any[] = [];
    const { data: allProfiles } = await auth.supabase.from('profiles').select('id, email, organization_id, name, role');
    for (const au of (authUsers || [])) {
      const metaOrg = au.user_metadata?.organizationId;
      if (metaOrg !== targetOrg) continue;
      const prof = (allProfiles || []).find((p: any) => p.id === au.id || p.email?.toLowerCase() === au.email?.toLowerCase());
      if (prof && prof.organization_id !== targetOrg) {
        wrongOrg.push({ id: au.id, email: au.email, name: au.user_metadata?.name || prof.name || au.email, role: au.user_metadata?.role || prof.role || 'standard_user', currentOrg: prof.organization_id, profileId: prof.id });
      }
    }

    return c.json({ missing, wrongOrg, orgId: targetOrg });
  } catch (err: any) {
    console.error('[profiles/find-missing] Error:', err);
    return c.json({ error: err.message }, 500);
  }
});

app.post(`${PREFIX}/profiles/fix-missing`, async (c) => {
  try {
    const auth = await authenticateUser(c);
    if (auth.error) return c.json({ error: auth.error }, auth.status);
    if (auth.profile.role !== 'super_admin' && auth.profile.role !== 'admin') {
      return c.json({ error: 'Forbidden' }, 403);
    }
    const { users, organizationId } = await c.req.json();
    if (!users || !Array.isArray(users) || !organizationId) {
      return c.json({ error: 'users array and organizationId required' }, 400);
    }
    if (auth.profile.role !== 'super_admin' && auth.profile.organization_id !== organizationId) {
      return c.json({ error: 'Forbidden: wrong organization' }, 403);
    }

    const results: any[] = [];
    for (const u of users) {
      try {
        const { data, error } = await auth.supabase.from('profiles').upsert({
          id: u.id, email: u.email?.toLowerCase(), name: u.name || u.email,
          role: u.role || 'standard_user', organization_id: organizationId,
          status: 'active', updated_at: new Date().toISOString(),
        }, { onConflict: 'id' }).select().single();

        if (error) {
          const { error: updateErr } = await auth.supabase.from('profiles')
            .update({ id: u.id, organization_id: organizationId, status: 'active', updated_at: new Date().toISOString() })
            .eq('email', u.email?.toLowerCase());
          results.push({ email: u.email, success: !updateErr, error: updateErr?.message });
        } else {
          results.push({ email: u.email, success: true });
        }
      } catch (err: any) {
        results.push({ email: u.email, success: false, error: err.message });
      }
    }

    return c.json({ results, fixed: results.filter(r => r.success).length });
  } catch (err: any) {
    console.error('[profiles/fix-missing] Error:', err);
    return c.json({ error: err.message }, 500);
  }
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

// ── USER PREFERENCES (KV-backed, bypasses RLS) ─────────────────────────
app.get(`${PREFIX}/settings/user-preferences`, async (c) => {
  try {
    const auth = await authenticateUser(c);
    if (auth.error) return c.json({ error: auth.error }, auth.status);
    const userId = c.req.query('user_id') || auth.user.id;
    const orgId = c.req.query('organization_id') || auth.profile.organization_id;
    if (!orgId) return c.json({ error: 'Missing organization_id' }, 400);

    // Try DB first, fall back to KV
    const { data, error } = await auth.supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .eq('organization_id', orgId)
      .single();

    if (data && !error) {
      return c.json({ preferences: data, source: 'server-db' });
    }

    // Table missing or row not found → try KV
    const kvData = await kv.get(`user_prefs:${orgId}:${userId}`);
    return c.json({ preferences: kvData || null, source: kvData ? 'server-kv' : 'server-not-found' });
  } catch (err: any) {
    console.error('[settings] Error fetching user preferences:', err);
    return c.json({ error: err.message }, 500);
  }
});

app.put(`${PREFIX}/settings/user-preferences`, async (c) => {
  try {
    const auth = await authenticateUser(c);
    if (auth.error) return c.json({ error: auth.error }, auth.status);
    const body = await c.req.json();
    const userId = body.user_id || auth.user.id;
    const orgId = body.organization_id || auth.profile.organization_id;
    if (!orgId) return c.json({ error: 'Missing organization_id' }, 400);

    const prefs = { ...body, user_id: userId, organization_id: orgId, updated_at: new Date().toISOString() };

    // Try DB upsert first
    const { data, error } = await auth.supabase
      .from('user_preferences')
      .upsert(prefs, { onConflict: 'user_id,organization_id' })
      .select()
      .single();

    if (data && !error) {
      return c.json({ preferences: data, source: 'server-db' });
    }

    // Table missing or RLS issue → fall back to KV
    console.warn('[settings] user_preferences upsert failed, using KV:', error?.message);
    await kv.set(`user_prefs:${orgId}:${userId}`, prefs);
    return c.json({ preferences: prefs, source: 'server-kv' });
  } catch (err: any) {
    console.error('[settings] Error upserting user preferences:', err);
    return c.json({ error: err.message }, 500);
  }
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
    const body = await c.req.json();
    const contactId = body.contactId;
    if (!contactId) return c.json({ error: 'contactId is required' }, 400);
    // Fetch contact details from DB
    const supabase = getSupabase();
    const { data: contact, error: cErr } = await supabase.from('contacts').select('name, email, company').eq('id', contactId).single();
    if (cErr || !contact) return c.json({ error: 'Contact not found' }, 404);
    const email = body.email || contact.email;
    if (!email) return c.json({ error: 'Contact has no email address' }, 400);
    const contactName = contact.name || contact.company || email;
    const code = genInvite();
    await kv.set(`portal_invite:${code}`, { contactId, orgId: auth.profile.organization_id, email: email.toLowerCase().trim(), contactName, expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(), createdBy: auth.user.id });
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
    if (existing) return c.json({ error: 'Account exists — please sign in instead' }, 409);
    const contactName = invite.contactName || invite.email;
    await kv.set(`portal_user:${eh}`, { email: invite.email, contactId: invite.contactId, orgId: invite.orgId, passwordHash: await hashPassword(password), name: contactName, createdAt: new Date().toISOString() });
    const tok = genToken();
    await kv.set(`portal_session:${tok}`, { email: invite.email, contactId: invite.contactId, orgId: invite.orgId, expiresAt: new Date(Date.now() + 86400000).toISOString() });
    await kv.del(`portal_invite:${inviteCode}`);
    console.log(`[portal] Registered: ${invite.email}, contactId=${invite.contactId}`);
    return c.json({ success: true, token: tok, user: { email: invite.email, name: contactName, contactId: invite.contactId } });
  } catch (err: any) { console.error('[portal] Register error:', err); return c.json({ error: err.message }, 500); }
});

app.post(`${P}/login`, async (c) => {
  try {
    const { email, password } = await c.req.json();
    const eh = await hashEmail(email);
    const pu = await kv.get(`portal_user:${eh}`);
    if (!pu) return c.json({ error: 'Invalid email or password' }, 401);
    if (await hashPassword(password) !== pu.passwordHash) return c.json({ error: 'Invalid email or password' }, 401);
    const tok = genToken();
    await kv.set(`portal_session:${tok}`, { email: pu.email, contactId: pu.contactId, orgId: pu.orgId, expiresAt: new Date(Date.now() + 86400000).toISOString() });
    console.log(`[portal] Login: ${pu.email}`);
    return c.json({ success: true, token: tok, user: { email: pu.email, name: pu.name || pu.email, contactId: pu.contactId } });
  } catch (err: any) { console.error('[portal] Login error:', err); return c.json({ error: err.message }, 500); }
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

// ── POST /portal/messages/:id/read — mark message as read by customer ──
app.post(`${P}/messages/:id/read`, async (c) => {
  try {
    const s = await portalSession(c);
    if (!s) return c.json({ error: 'Unauthorized' }, 401);
    const msgId = c.req.param('id');
    const key = `portal_message:${s.orgId}:${s.contactId}:${msgId}`;
    const msg = await kv.get(key);
    if (msg) {
      msg.read = true;
      msg.customerUnread = false;
      await kv.set(key, msg);
    }
    return c.json({ success: true });
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

app.get(`${P}/portal-users`, async (c) => {
  try {
    const auth = await authenticateUser(c);
    if (auth.error) return c.json({ error: auth.error }, auth.status);
    const logs = await kv.getByPrefix(`portal_access_log:${auth.profile.organization_id}:`);
    return c.json({ portalUsers: logs || [] });
  } catch (err: any) { return c.json({ error: err.message }, 500); }
});

// Portal session validator helper
async function portalSession(c: any): Promise<{ contactId: string; orgId: string; email: string } | null> {
  const tok = c.req.header('X-Portal-Token');
  if (!tok) return null;
  const s = await kv.get(`portal_session:${tok}`);
  if (!s || new Date(s.expiresAt) < new Date()) return null;
  return s;
}

// ── GET /portal/dashboard — main customer dashboard data ──
app.get(`${P}/dashboard`, async (c) => {
  try {
    const s = await portalSession(c);
    if (!s) return c.json({ error: 'Unauthorized' }, 401);
    const supabase = getSupabase();

    // Fetch contact
    let contact = null;
    try {
      const { data } = await supabase.from('contacts').select('*').eq('id', s.contactId).single();
      contact = data;
    } catch (e: any) { console.warn('[portal] Contact query error:', e.message); }

    // Fetch quotes
    let quotes: any[] = [];
    try {
      const { data } = await supabase.from('quotes').select('*').eq('contact_id', s.contactId).order('created_at', { ascending: false }).limit(20);
      quotes = data || [];
    } catch (e: any) { console.warn('[portal] Quotes query error:', e.message); }

    // Fetch bids/projects linked to this contact's opportunities
    let bids: any[] = [];
    try {
      // Try via opportunities first
      const { data: opps } = await supabase.from('opportunities').select('id').eq('contact_id', s.contactId);
      if (opps && opps.length > 0) {
        const oppIds = opps.map((o: any) => o.id);
        const { data: bidsData } = await supabase.from('bids').select('*').in('opportunity_id', oppIds).order('created_at', { ascending: false }).limit(10);
        bids = bidsData || [];
      }
    } catch (e: any) { console.warn('[portal] Bids query error:', e.message); }

    // Fetch upcoming appointments
    let appointments: any[] = [];
    try {
      const { data } = await supabase.from('appointments').select('*').eq('contact_id', s.contactId).gte('start_time', new Date().toISOString()).order('start_time', { ascending: true }).limit(5);
      appointments = data || [];
    } catch (e: any) { console.warn('[portal] Appointments query error:', e.message); }

    // Fetch portal messages
    let messages: any[] = [];
    try {
      messages = await kv.getByPrefix(`portal_message:${s.orgId}:${s.contactId}:`) || [];
    } catch (e: any) { console.warn('[portal] Messages query error:', e.message); }

    // Fetch organization
    let org = null;
    try {
      const { data } = await supabase.from('organizations').select('id, name').eq('id', s.orgId).single();
      org = data;
    } catch (e: any) { console.warn('[portal] Org query error:', e.message); }

    console.log(`[portal] Dashboard for ${s.email}: ${quotes.length} quotes, ${bids.length} bids, ${appointments.length} appts`);

    return c.json({
      contact,
      quotes,
      bids,
      appointments,
      messages,
      organization: org,
      unreadMessages: messages.filter((m: any) => m.customerUnread === true).length,
    });
  } catch (err: any) { console.error('[portal] Dashboard error:', err); return c.json({ error: 'Dashboard failed: ' + err.message }, 500); }
});

// ── GET /portal/quotes — all quotes for the customer ──
app.get(`${P}/quotes`, async (c) => {
  try {
    const s = await portalSession(c);
    if (!s) return c.json({ error: 'Unauthorized' }, 401);
    const supabase = getSupabase();
    const { data, error } = await supabase.from('quotes').select('*').eq('contact_id', s.contactId).order('created_at', { ascending: false });
    if (error) { console.error('[portal] Quotes error:', error); return c.json({ quotes: [] }); }
    return c.json({ quotes: data || [] });
  } catch (err: any) { return c.json({ error: err.message }, 500); }
});

// ── GET /portal/projects — bids/projects for the customer ──
app.get(`${P}/projects`, async (c) => {
  try {
    const s = await portalSession(c);
    if (!s) return c.json({ error: 'Unauthorized' }, 401);
    const supabase = getSupabase();
    let projects: any[] = [];
    try {
      const { data: opps } = await supabase.from('opportunities').select('id').eq('contact_id', s.contactId);
      if (opps && opps.length > 0) {
        const { data } = await supabase.from('bids').select('*').in('opportunity_id', opps.map((o: any) => o.id)).order('created_at', { ascending: false });
        projects = data || [];
      }
    } catch (e: any) { console.warn('[portal] Projects query:', e.message); }
    return c.json({ projects });
  } catch (err: any) { return c.json({ error: err.message }, 500); }
});

// ── GET /portal/documents — documents for the customer ──
app.get(`${P}/documents`, async (c) => {
  try {
    const s = await portalSession(c);
    if (!s) return c.json({ error: 'Unauthorized' }, 401);
    const supabase = getSupabase();
    let documents: any[] = [];
    try {
      const { data } = await supabase.from('documents').select('*').eq('contact_id', s.contactId).order('created_at', { ascending: false });
      documents = data || [];
    } catch (e: any) { console.warn('[portal] Documents query:', e.message); }
    return c.json({ documents });
  } catch (err: any) { return c.json({ error: err.message }, 500); }
});

// ── PUT /portal/profile — customer updates their contact info ──
app.put(`${P}/profile`, async (c) => {
  try {
    const s = await portalSession(c);
    if (!s) return c.json({ error: 'Unauthorized' }, 401);
    const supabase = getSupabase();
    const body = await c.req.json();
    const allowed = ['phone', 'address', 'company'];
    const updates: Record<string, any> = {};
    for (const f of allowed) { if (body[f] !== undefined) updates[f] = body[f]; }
    if (Object.keys(updates).length === 0) return c.json({ error: 'No valid fields' }, 400);
    updates.updated_at = new Date().toISOString();
    const { data, error } = await supabase.from('contacts').update(updates).eq('id', s.contactId).select().single();
    if (error) return c.json({ error: 'Update failed: ' + error.message }, 500);
    return c.json({ success: true, contact: data });
  } catch (err: any) { return c.json({ error: err.message }, 500); }
});

// ── POST /portal/quotes/:id/accept ──
app.post(`${P}/quotes/:id/accept`, async (c) => {
  try {
    const s = await portalSession(c);
    if (!s) return c.json({ error: 'Unauthorized' }, 401);
    const supabase = getSupabase();
    const qid = c.req.param('id');
    const { data, error } = await supabase.from('quotes').update({ status: 'accepted', updated_at: new Date().toISOString() }).eq('id', qid).eq('contact_id', s.contactId).select().single();
    if (error) return c.json({ error: 'Accept failed: ' + error.message }, 500);
    console.log(`[portal] Quote ${qid} accepted by ${s.email}`);
    return c.json({ success: true, quote: data });
  } catch (err: any) { return c.json({ error: err.message }, 500); }
});

// ── POST /portal/quotes/:id/reject ──
app.post(`${P}/quotes/:id/reject`, async (c) => {
  try {
    const s = await portalSession(c);
    if (!s) return c.json({ error: 'Unauthorized' }, 401);
    const supabase = getSupabase();
    const qid = c.req.param('id');
    const { data, error } = await supabase.from('quotes').update({ status: 'rejected', updated_at: new Date().toISOString() }).eq('id', qid).eq('contact_id', s.contactId).select().single();
    if (error) return c.json({ error: 'Reject failed: ' + error.message }, 500);
    console.log(`[portal] Quote ${qid} rejected by ${s.email}`);
    return c.json({ success: true, quote: data });
  } catch (err: any) { return c.json({ error: err.message }, 500); }
});

// ── POST /portal/logout ──
app.post(`${P}/logout`, async (c) => {
  try {
    const tok = c.req.header('X-Portal-Token');
    if (tok) await kv.del(`portal_session:${tok}`);
    return c.json({ success: true });
  } catch (err: any) { return c.json({ error: err.message }, 500); }
});

// ── DELETE /portal/revoke/:contactId — CRM admin revokes portal access ──
app.delete(`${P}/revoke/:contactId`, async (c) => {
  try {
    const auth = await authenticateUser(c);
    if (auth.error) return c.json({ error: auth.error }, auth.status);
    const contactId = c.req.param('contactId');
    const orgId = auth.profile.organization_id;
    await kv.del(`portal_access_log:${orgId}:${contactId}`);
    return c.json({ success: true });
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
    const purpose = body.purpose || 'email'; // 'email' | 'calendar' | 'both'
    await kv.set(`oauth_state:${state}`, { userId: user.id, provider: 'microsoft', redirectUri, purpose, ts: new Date().toISOString() });
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
    const purpose = sd.purpose || 'email'; // 'email' | 'calendar' | 'both'
    const calendarEnabled = purpose === 'calendar' || purpose === 'both';
    const emailEnabled = purpose === 'email' || purpose === 'both';
    console.log(`[OAuth Exchange] provider=${provider}, userId=${sd.userId}, purpose=${purpose}`);

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
      await kv.set(`email_account:${sd.userId}:${kvKey}`, {
        id: aid, kvKey, provider: 'outlook', email, displayName: ui.displayName || email,
        access_token: td.access_token, refresh_token: td.refresh_token,
        token_expires_at: new Date(Date.now() + td.expires_in * 1000).toISOString(),
        userId: sd.userId, connectedAt: new Date().toISOString(), status: 'active',
        calendar_enabled: calendarEnabled || (existingAccount?.calendar_enabled ?? false),
        email_enabled: emailEnabled || (existingAccount?.email_enabled ?? true),
      });
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
      await kv.set(`email_account:${sd.userId}:${kvKey}`, {
        id: aid, kvKey, provider: 'gmail', email: ui.email, displayName: ui.name || ui.email,
        access_token: td.access_token, refresh_token: td.refresh_token,
        token_expires_at: new Date(Date.now() + td.expires_in * 1000).toISOString(),
        userId: sd.userId, connectedAt: new Date().toISOString(), status: 'active',
        calendar_enabled: calendarEnabled || (existingAccount?.calendar_enabled ?? false),
        email_enabled: emailEnabled || (existingAccount?.email_enabled ?? true),
      });
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
    const legacyPurpose = sd.purpose || 'email';
    const legacyCalEnabled = legacyPurpose === 'calendar' || legacyPurpose === 'both';
    const legacyEmailEnabled = legacyPurpose === 'email' || legacyPurpose === 'both';
    await kv.set(`email_account:${sd.userId}:${kvKey}`, { id: aid, kvKey, provider: 'outlook', email, displayName: ui.displayName || email, access_token: td.access_token, refresh_token: td.refresh_token, token_expires_at: new Date(Date.now() + td.expires_in * 1000).toISOString(), userId: sd.userId, connectedAt: new Date().toISOString(), status: 'active', calendar_enabled: legacyCalEnabled || (existingAccount?.calendar_enabled ?? false), email_enabled: legacyEmailEnabled || (existingAccount?.email_enabled ?? true) });
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
    const cbPurpose = sd.purpose || 'email';
    const cbCalEnabled = cbPurpose === 'calendar' || cbPurpose === 'both';
    const cbEmailEnabled = cbPurpose === 'email' || cbPurpose === 'both';
    await kv.set(`email_account:${sd.userId}:${kvKey}`, { id: aid, kvKey, provider: 'outlook', email, displayName: ui.displayName || email, access_token: td.access_token, refresh_token: td.refresh_token, token_expires_at: new Date(Date.now() + td.expires_in * 1000).toISOString(), userId: sd.userId, connectedAt: new Date().toISOString(), status: 'active', calendar_enabled: cbCalEnabled || (existingAccount?.calendar_enabled ?? false), email_enabled: cbEmailEnabled || (existingAccount?.email_enabled ?? true) });
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
    const purpose = body.purpose || 'email'; // 'email' | 'calendar' | 'both'
    await kv.set(`oauth_state:${state}`, { userId: user.id, provider: 'google', redirectUri, purpose, ts: new Date().toISOString() });
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.searchParams.set('client_id', cid);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events');
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
    const gcbPurpose = sd.purpose || 'email';
    const gcbCalEnabled = gcbPurpose === 'calendar' || gcbPurpose === 'both';
    const gcbEmailEnabled = gcbPurpose === 'email' || gcbPurpose === 'both';
    await kv.set(`email_account:${sd.userId}:${kvKey}`, { id: aid, kvKey, provider: 'gmail', email: ui.email, displayName: ui.name || ui.email, access_token: td.access_token, refresh_token: td.refresh_token, token_expires_at: new Date(Date.now() + td.expires_in * 1000).toISOString(), userId: sd.userId, connectedAt: new Date().toISOString(), status: 'active', calendar_enabled: gcbCalEnabled || (existingAccount?.calendar_enabled ?? false), email_enabled: gcbEmailEnabled || (existingAccount?.email_enabled ?? true) });
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

// ── EMAIL SYNC (consolidated — direct Google & Microsoft APIs) ──
app.post(`${PREFIX}/email-sync`, async (c) => {
  try {
    const auth = await authenticateUser(c);
    if (auth.error) return c.json({ error: auth.error }, auth.status);
    const { accountId, limit: emailLimit = 50 } = await c.req.json();
    if (!accountId) return c.json({ error: 'Missing accountId' }, 400);

    // Try KV first, then fall back to DB lookup
    let kvAccount = await getAccountTokensFromKV(auth.user.id, accountId);
    if (!kvAccount) {
      // Account may only exist in the email_accounts table (not yet stored in KV)
      const { data: dbAccount } = await auth.supabase
        .from('email_accounts')
        .select('*')
        .eq('id', accountId)
        .eq('user_id', auth.user.id)
        .single();
      if (dbAccount) {
        console.log(`[email-sync] Account found in DB (not KV): ${dbAccount.email}`);
        kvAccount = {
          id: dbAccount.id,
          provider: dbAccount.provider,
          email: dbAccount.email,
          access_token: dbAccount.access_token,
          refresh_token: dbAccount.refresh_token,
          token_expires_at: dbAccount.token_expires_at,
        };
      }
    }
    if (!kvAccount) return c.json({ error: 'Email account not found in KV store or database' }, 404);
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
      
      // Load synced message IDs from KV store to prevent re-syncing deleted emails
      const syncedMsgKey = `email_synced_msgs:${auth.user.id}:${accountId}`;
      const syncedMsgIdsRaw = await kv.get(syncedMsgKey);
      const syncedMsgIds = new Set<string>(Array.isArray(syncedMsgIdsRaw) ? syncedMsgIdsRaw : []);
      const newlySyncedIds = new Set<string>();
      
      for (const msg of messages) {
        // Skip if already synced before (even if deleted from emails table)
        if (syncedMsgIds.has(msg.id)) {
          continue;
        }
        // Also check if it currently exists in the emails table
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
          if (!insErr) {
            syncedCount++;
            newlySyncedIds.add(msg.id);
          } else {
            console.log(`[email-sync] insert err: ${insErr.message}`);
          }
        } else {
          // Email exists, mark as synced
          newlySyncedIds.add(msg.id);
        }
      }
      
      // Update the synced message IDs in KV store
      if (newlySyncedIds.size > 0) {
        const updatedSyncedIds = new Set([...syncedMsgIds, ...newlySyncedIds]);
        await kv.set(syncedMsgKey, Array.from(updatedSyncedIds));
      }
    } else if (kvAccount.provider === 'gmail') {
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
        
        // Load synced message IDs from KV store to prevent re-syncing deleted emails
        const syncedMsgKey = `email_synced_msgs:${auth.user.id}:${accountId}`;
        const syncedMsgIdsRaw = await kv.get(syncedMsgKey);
        const syncedMsgIds = new Set<string>(Array.isArray(syncedMsgIdsRaw) ? syncedMsgIdsRaw : []);
        const newlySyncedIds = new Set<string>();
        
        for (const m of messageIds.slice(0, emailLimit)) {
          // Skip if already synced before (even if deleted from emails table)
          if (syncedMsgIds.has(m.id)) {
            continue;
          }
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
              if (!insErr) {
                syncedCount++;
                newlySyncedIds.add(m.id);
              }
            }
          } else {
            // Email exists, mark as synced
            newlySyncedIds.add(m.id);
          }
        }
        
        // Update the synced message IDs in KV store
        if (newlySyncedIds.size > 0) {
          const updatedSyncedIds = new Set([...syncedMsgIds, ...newlySyncedIds]);
          await kv.set(syncedMsgKey, Array.from(updatedSyncedIds));
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

// ── EMAIL SEND (consolidated — direct Google & Microsoft APIs) ──
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

      const parseEmails = (input: any) => {
        if (!input) return [];
        if (Array.isArray(input)) return input;
        return input.split(',').map((e: string) => e.trim()).filter(Boolean);
      };

      const toArray = parseEmails(to);
      const ccArray = parseEmails(cc);
      const bccArray = parseEmails(bcc);

      const message: any = { subject, body: { contentType: 'HTML', content: emailBody }, toRecipients: toArray.map((e: string) => ({ emailAddress: { address: e } })) };
      if (ccArray.length > 0) message.ccRecipients = ccArray.map((e: string) => ({ emailAddress: { address: e } }));
      if (bccArray.length > 0) message.bccRecipients = bccArray.map((e: string) => ({ emailAddress: { address: e } }));
      
      const gRes = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', { method: 'POST', headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ message }) });
      if (!gRes.ok) {
        const errText = await gRes.text();
        console.log(`[email-send] Graph API error (${gRes.status}): ${errText}`);
        try {
          const errJson = JSON.parse(errText);
          const code = errJson?.error?.code || '';
          if (code === 'ErrorAccountSuspend' || code.includes('Suspend')) {
            return c.json({ error: `Your Microsoft account (${kvAccount.email}) has been suspended. Please sign in to outlook.com and follow the verification steps to reactivate it, then try again.` }, 502);
          }
          if (code === 'InvalidAuthenticationToken' || code === 'TokenExpired') {
            return c.json({ error: `Your Microsoft account token has expired. Please reconnect your Outlook account in Settings → Email Accounts.` }, 401);
          }
          if (code === 'MailboxNotEnabledForRESTAPI') {
            return c.json({ error: `This Microsoft account (${kvAccount.email}) does not have a mailbox enabled. Please use a different account.` }, 502);
          }
          return c.json({ error: `Microsoft Graph error: ${errJson?.error?.message || errText}` }, 502);
        } catch (_) {
          return c.json({ error: 'Outlook send failed: ' + errText }, 502);
        }
      }
      await auth.supabase.from('emails').insert({ id: crypto.randomUUID(), user_id: auth.user.id, organization_id: orgId, account_id: accountId, message_id: crypto.randomUUID(), from_email: kvAccount.email, to_email: Array.isArray(to) ? to[0] : to, cc_email: cc ? (Array.isArray(cc) ? cc.join(', ') : cc) : null, subject, body: emailBody, folder: 'sent', is_read: true, is_starred: false, received_at: new Date().toISOString() });
      return c.json({ success: true, message: 'Email sent via Outlook' });
    } else if (kvAccount.provider === 'gmail') {
      let accessToken = kvAccount.access_token;
      if (new Date(kvAccount.token_expires_at || 0) <= new Date() && kvAccount.refresh_token) {
        const nt = await refreshGoogleTokenFn(kvAccount.refresh_token);
        accessToken = nt.access_token;
        const kvKey = kvAccount.kvKey || `gmail_${kvAccount.email.replace(/[^a-z0-9]/gi, '_').toLowerCase()}`;
        await kv.set(`email_account:${auth.user.id}:${kvKey}`, { ...kvAccount, access_token: nt.access_token, token_expires_at: new Date(Date.now() + nt.expires_in * 1000).toISOString() });
      }

      const parseEmails = (input: any) => {
        if (!input) return [];
        if (Array.isArray(input)) return input;
        return input.split(',').map((e: string) => e.trim()).filter(Boolean);
      };

      const toArray = parseEmails(to);
      const ccArray = parseEmails(cc);
      
      const rawText = `From: ${kvAccount.email}\r\nTo: ${toArray.join(', ')}\r\n${ccArray.length > 0 ? `Cc: ${ccArray.join(', ')}\r\n` : ''}Subject: =?utf-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=\r\nContent-Type: text/html; charset=utf-8\r\n\r\n${emailBody}`;
      
      const base64Encoded = btoa(unescape(encodeURIComponent(rawText)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const gRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', { method: 'POST', headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ raw: base64Encoded }) });
      if (!gRes.ok) return c.json({ error: 'Gmail send error: ' + await gRes.text() }, 502);
      await auth.supabase.from('emails').insert({ id: crypto.randomUUID(), user_id: auth.user.id, organization_id: orgId, account_id: accountId, message_id: crypto.randomUUID(), from_email: kvAccount.email, to_email: toArray[0] || '', subject, body: emailBody, folder: 'sent', is_read: true, is_starred: false, received_at: new Date().toISOString() });
      return c.json({ success: true, message: 'Email sent via Gmail API' });
    } else {
      return c.json({ error: `Sending not supported for provider: ${kvAccount.provider}` }, 400);
    }
  } catch (err: any) {
    console.log(`[email-send] exception: ${err.message}`);
    return c.json({ error: err.message }, 500);
  }
});

// ── DIAGNOSE SPECIFIC EMAILS (Temporary Helper) ─────────────────────────
app.get(`${PREFIX}/diagnose-missing-deals`, async (c) => {
  try {
    const auth = await authenticateUser(c);
    if (auth.error) return c.json({ error: auth.error }, auth.status);

    const emails = ['george.campbell@ronaatlantic.ca', 'larry.lee@ronaatlantic.ca'];
    const supabase = getSupabase(); // service role

    const report: any = {};

    for (const email of emails) {
      // 1. Find Contact
      const { data: contacts } = await supabase
        .from('contacts')
        .select('id, organization_id, name, email')
        .ilike('email', email);
      
      const contactInfo = contacts && contacts.length > 0 ? contacts[0] : null;
      
      const emailReport: any = {
        contactFound: !!contactInfo,
        contact: contactInfo,
        quotes: [],
        bids: []
      };

      if (contactInfo) {
        // 2. Find Quotes by Contact ID
        const { data: quotes } = await supabase
          .from('quotes')
          .select('id, quote_number, title, total, status, organization_id, created_at')
          .eq('contact_id', contactInfo.id);
        
        emailReport.quotes = quotes || [];

        // 3. Find Opportunities -> Bids
        const { data: opps } = await supabase
          .from('opportunities')
          .select('id')
          .eq('customer_id', contactInfo.id);

        const allOppIds = (opps || []).map((o: any) => o.id);
        
        if (allOppIds.length > 0) {
           const { data: bids } = await supabase
            .from('bids')
            .select('id, title, amount, status, organization_id, created_at')
            .in('opportunity_id', allOppIds);
           emailReport.bids = bids || [];
        }
      } else {
         const { data: quotes } = await supabase
          .from('quotes')
          .select('id, quote_number, title, total, status, organization_id, created_at')
          .ilike('contact_name', `%${email}%`);
         
         if (quotes && quotes.length > 0) emailReport.quotesByText = quotes;
      }

      report[email] = emailReport;
    }

    return c.json({ report });

  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// ── DIAGNOSE INVENTORY (Find where items are hiding) ────────────────────
app.get(`${PREFIX}/diagnose-inventory`, async (c) => {
  try {
    const auth = await authenticateUser(c);
    if (auth.error) return c.json({ error: auth.error }, auth.status);

    const orgId = auth.profile.organization_id;
    const supabase = getSupabase(); // service role

    // 1. Total Count
    const { count: total } = await supabase.from('inventory').select('id', { count: 'exact', head: true });
    
    // 2. Count by Org
    const { count: myOrg } = await supabase.from('inventory').select('id', { count: 'exact', head: true }).eq('organization_id', orgId);
    const { count: nullOrg } = await supabase.from('inventory').select('id', { count: 'exact', head: true }).is('organization_id', null);
    
    // 3. Find top other orgs (manual grouping since no group by)
    const { data: others } = await supabase
      .from('inventory')
      .select('organization_id, name, sku')
      .neq('organization_id', orgId)
      .not('organization_id', 'is', null)
      .limit(50);

    const othersByOrg: any = {};
    if (others) {
        others.forEach((item: any) => {
            const oid = item.organization_id;
            if (!othersByOrg[oid]) othersByOrg[oid] = { count: 0, samples: [] };
            othersByOrg[oid].count++;
            if (othersByOrg[oid].samples.length < 3) othersByOrg[oid].samples.push(`${item.sku} - ${item.name}`);
        });
    }

    return c.json({
        totalItems: total,
        myOrgCount: myOrg,
        nullOrgCount: nullOrg,
        otherOrgs: othersByOrg,
        myOrgId: orgId
    });

  } catch (err: any) {
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
    
    // Merge accounts from both DB table and KV store (OAuth accounts live in KV)
    const accountsMap = new Map<string, any>();
    
    // 1. Load from DB table
    const { data: dbData, error: dbError } = await auth.supabase
      .from('email_accounts')
      .select('*')
      .eq('user_id', auth.user.id);
    if (dbError) {
      console.log(`[email-accounts] DB read error (may not have table): ${dbError.message}`);
    }
    if (dbData) {
      for (const a of dbData) {
        accountsMap.set(a.id, a);
      }
    }
    
    // 2. Load from KV store (OAuth accounts are stored here)
    const kvAccounts = await kv.getByPrefix(`email_account:${auth.user.id}:`);
    if (kvAccounts && kvAccounts.length > 0) {
      for (const kva of kvAccounts) {
        if (kva.id && (kva.status === 'active' || kva.connected === true)) {
          const existing = accountsMap.get(kva.id);
          accountsMap.set(kva.id, {
            ...(existing || {}),
            id: kva.id,
            user_id: auth.user.id,
            provider: kva.provider,
            email: kva.email,
            connected: true,
            last_sync: kva.last_sync || existing?.last_sync,
            display_name: kva.displayName,
          });
        }
      }
    }
    
    const mergedAccounts = Array.from(accountsMap.values());
    console.log(`[email-accounts] GET returning ${mergedAccounts.length} accounts (${dbData?.length || 0} DB + ${kvAccounts?.length || 0} KV) for user ${auth.user.id}`);
    return c.json({ accounts: mergedAccounts });
  } catch (err: any) {
    console.log(`[email-accounts] GET exception: ${err.message}`);
    return c.json({ error: err.message }, 500);
  }
});

// ── CALENDAR ACCOUNTS (KV-based, filtered by calendar_enabled) ──────────
app.get(`${PREFIX}/calendar-accounts`, async (c) => {
  try {
    const auth = await authenticateUser(c);
    if (auth.error) return c.json({ error: auth.error }, auth.status as any);
    const allKv = await kv.getByPrefix(`email_account:${auth.user.id}:`);
    const calAccounts = (allKv || [])
      .filter((a: any) => a.calendar_enabled === true && a.status === 'active')
      .map((a: any) => ({
        id: a.id, kvKey: a.kvKey, provider: a.provider, email: a.email,
        displayName: a.displayName, connected: true,
        last_sync: a.last_sync, connectedAt: a.connectedAt,
        calendar_enabled: true,
      }));
    console.log(`[calendar-accounts] Returning ${calAccounts.length} calendar-enabled accounts for user ${auth.user.id}`);
    return c.json({ accounts: calAccounts });
  } catch (err: any) {
    console.error('[calendar-accounts] GET error:', err.message);
    return c.json({ error: err.message }, 500);
  }
});

// Mark/unmark an existing email account as calendar-enabled
app.post(`${PREFIX}/calendar-accounts/toggle`, async (c) => {
  try {
    const auth = await authenticateUser(c);
    if (auth.error) return c.json({ error: auth.error }, auth.status as any);
    const { accountId, enabled } = await c.req.json();
    if (!accountId) return c.json({ error: 'Missing accountId' }, 400);
    const allKv = await kv.getByPrefix(`email_account:${auth.user.id}:`);
    const account = (allKv || []).find((a: any) => a.id === accountId);
    if (!account) return c.json({ error: 'Account not found' }, 404);
    const kvKey = account.kvKey || `${account.provider === 'gmail' ? 'gmail' : 'outlook'}_${account.email.replace(/[^a-z0-9]/gi, '_').toLowerCase()}`;
    await kv.set(`email_account:${auth.user.id}:${kvKey}`, {
      ...account,
      calendar_enabled: enabled !== false,
    });
    console.log(`[calendar-accounts] Toggled calendar_enabled=${enabled !== false} for account ${accountId}`);
    return c.json({ success: true });
  } catch (err: any) {
    console.error('[calendar-accounts] toggle error:', err.message);
    return c.json({ error: err.message }, 500);
  }
});

app.delete(`${PREFIX}/email-accounts/:id`, async (c) => {
  try {
    const auth = await authenticateUser(c);
    if (auth.error) return c.json({ error: auth.error }, auth.status);
    const accountId = c.req.param('id');
    console.log(`[email-accounts] DELETE request for accountId=${accountId}, userId=${auth.user.id}`);
    
    let deletedFromDb = false;
    let deletedFromKv = false;
    const supabaseAdmin = getSupabase();
    
    // Step 1: Find the account's email so we can purge ALL duplicate entries
    let targetEmail: string | null = null;
    
    // Check DB for the email
    const { data: dbAccount } = await supabaseAdmin
      .from('email_accounts')
      .select('email')
      .eq('id', accountId)
      .maybeSingle();
    if (dbAccount?.email) targetEmail = dbAccount.email;
    
    // Step 2: Query ALL KV entries for this user — raw table gives us actual keys
    const { data: kvRows, error: kvQueryError } = await supabaseAdmin
      .from('kv_store_8405be07')
      .select('key, value')
      .like('key', `email_account:${auth.user.id}:%`);
    
    if (kvQueryError) {
      console.warn(`[email-accounts] KV query error: ${kvQueryError.message}`);
    }
    
    // Find target email from KV if not found in DB
    if (!targetEmail && kvRows) {
      for (const row of kvRows) {
        const val = row.value;
        if (val && (val.id === accountId || row.key === `email_account:${auth.user.id}:${accountId}`)) {
          targetEmail = val.email;
          break;
        }
      }
    }
    
    console.log(`[email-accounts] DELETE target: email=${targetEmail}, accountId=${accountId}, userId=${auth.user.id}`);
    
    // Step 3: Delete ALL DB entries by ID and by email (catches duplicates)
    const { error: dbDelById } = await supabaseAdmin
      .from('email_accounts')
      .delete()
      .eq('id', accountId);
    if (dbDelById) {
      console.warn(`[email-accounts] DB delete by ID error: ${dbDelById.message}`);
    } else {
      deletedFromDb = true;
      console.log(`[email-accounts] DB delete by ID done for ${accountId}`);
    }
    
    if (targetEmail) {
      const { error: dbDelByEmail } = await supabaseAdmin
        .from('email_accounts')
        .delete()
        .eq('email', targetEmail)
        .eq('user_id', auth.user.id);
      if (dbDelByEmail) {
        console.warn(`[email-accounts] DB delete by email error: ${dbDelByEmail.message}`);
      } else {
        deletedFromDb = true;
        console.log(`[email-accounts] DB delete by email done for ${targetEmail}`);
      }
    }
    
    // Step 4: Delete ALL KV entries matching by ID, key suffix, OR email
    const keysToDelete: string[] = [];
    if (kvRows && kvRows.length > 0) {
      console.log(`[email-accounts] Found ${kvRows.length} KV rows for user ${auth.user.id}`);
      for (const row of kvRows) {
        const val = row.value;
        const matchById = val && val.id === accountId;
        const matchByKey = row.key === `email_account:${auth.user.id}:${accountId}`;
        const matchByEmail = !!(targetEmail && val && val.email === targetEmail);
        if (matchById || matchByKey || matchByEmail) {
          keysToDelete.push(row.key);
          console.log(`[email-accounts] Matched KV key: ${row.key} (byId=${matchById}, byKey=${matchByKey}, byEmail=${matchByEmail})`);
        }
      }
    }
    
    // Fallback: also try direct UUID-based key
    const directKey = `email_account:${auth.user.id}:${accountId}`;
    if (!keysToDelete.includes(directKey)) {
      keysToDelete.push(directKey);
    }
    
    for (const key of keysToDelete) {
      try {
        await kv.del(key);
        deletedFromKv = true;
        console.log(`[email-accounts] Deleted KV key: ${key}`);
      } catch (delErr: any) {
        console.warn(`[email-accounts] Failed to delete KV key ${key}: ${delErr.message}`);
      }
    }
    
    // Clean up by_email index
    if (targetEmail) {
      try {
        await kv.del(`email_account:by_email:${targetEmail}`);
        console.log(`[email-accounts] Deleted by_email index for: ${targetEmail}`);
      } catch {}
    }
    
    if (!deletedFromDb && !deletedFromKv) {
      console.warn(`[email-accounts] Account ${accountId} (${targetEmail}) not found in DB or KV`);
    }
    
    console.log(`[email-accounts] DELETE complete: accountId=${accountId}, deletedFromDb=${deletedFromDb}, deletedFromKv=${deletedFromKv}`);
    return c.json({ success: true, deletedFromDb, deletedFromKv });
  } catch (err: any) {
    console.error(`[email-accounts] DELETE exception: ${err.message}`);
    return c.json({ error: err.message }, 500);
  }
});

// ── UTILITY ─────────────────────────────────────────────────────────────
app.post(`${PREFIX}/create-user`, async (c) => {
  try {
    const { email, name, role, organizationId, tempPassword, organizationName } = await c.req.json();
    if (!email || !tempPassword) return c.json({ error: 'Missing fields' }, 400);
    const supabase = getSupabase();

    // Verify the organization exists; auto-create the row if missing
    if (organizationId) {
      const { data: orgCheck } = await supabase.from('organizations').select('id').eq('id', organizationId).maybeSingle();
      if (!orgCheck) {
        console.log(`[create-user] Organization ${organizationId} not in table – auto-creating row`);
        const { error: orgErr } = await supabase.from('organizations').insert({
          id: organizationId,
          name: organizationName || organizationId || 'Organization',
          created_at: new Date().toISOString(),
        });
        if (orgErr) {
          // Ignore duplicate-key (23505) – another request may have created it concurrently
          if (orgErr.code !== '23505') {
            console.error(`[create-user] Failed to auto-create org: ${orgErr.code} ${orgErr.message}`);
            return c.json({ error: `Failed to initialize organization: ${orgErr.message}` }, 500);
          }
        }
      }
    }

    const { data: { users: existing } } = await supabase.auth.admin.listUsers();
    const found = existing?.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());
    let uid: string;
    if (found) {
      uid = found.id;
      await supabase.auth.admin.updateUserById(uid, { password: tempPassword, email_confirm: true, user_metadata: { name, role, organizationId, needs_password_change: true } });
    } else {
      const { data, error } = await supabase.auth.admin.createUser({ email: email.toLowerCase(), password: tempPassword, user_metadata: { name, role, organizationId, needs_password_change: true }, email_confirm: true });
      if (error) return c.json({ error: error.message }, 500);
      uid = data.user.id;
    }

    // Fix ID mismatch: if a profile exists for this email with a different ID, update it
    const { data: existingProfile } = await supabase.from('profiles').select('id, email').eq('email', email.toLowerCase()).maybeSingle();
    if (existingProfile && existingProfile.id !== uid) {
      console.log(`[create-user] Existing profile ID ${existingProfile.id} differs from auth ID ${uid}. Updating...`);
      await supabase.from('profiles').update({ id: uid, name, role, organization_id: organizationId, needs_password_change: true, updated_at: new Date().toISOString() }).eq('email', email.toLowerCase());
      return c.json({ success: true, userId: uid });
    }

    const { error: upsertError } = await supabase.from('profiles').upsert({
      id: uid, email: email.toLowerCase(), name, role, organization_id: organizationId,
      status: 'active', needs_password_change: true, updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });
    if (upsertError) {
      console.error(`[create-user] Profile upsert error: ${upsertError.code} ${upsertError.message}`);
      return c.json({ error: `User auth created but profile failed: ${upsertError.message}`, userId: uid }, 500);
    }
    return c.json({ success: true, userId: uid });
  } catch (err: any) { return c.json({ error: err.message }, 500); }
});

// ── CONFIRM EMAIL (auto-fix unconfirmed admin-created users) ────────────
app.post(`${PREFIX}/confirm-email`, async (c) => {
  try {
    const { email } = await c.req.json();
    if (!email) return c.json({ error: 'Missing email' }, 400);
    const supabase = getSupabase();
    // Verify a profile exists for this email (only fix known users, not random requests)
    const { data: profile } = await supabase.from('profiles').select('id').eq('email', email.toLowerCase()).maybeSingle();
    if (!profile) return c.json({ error: 'No profile found' }, 404);
    // Find the auth user
    const { data: { users } } = await supabase.auth.admin.listUsers();
    const authUser = users?.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());
    if (!authUser) return c.json({ error: 'No auth user found' }, 404);
    // Confirm their email
    const { error } = await supabase.auth.admin.updateUserById(authUser.id, { email_confirm: true });
    if (error) return c.json({ error: error.message }, 500);
    console.log(`[confirm-email] Confirmed email for ${email}`);
    return c.json({ success: true });
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

    const now = new Date().toISOString();

    // Record view event (fire-and-forget)
    try {
      await kv.set(`tracking:view:${type}:${id}:${Date.now()}`, JSON.stringify({
        type: 'view',
        entityType: type,
        entityId: id,
        orgId,
        timestamp: now,
      }));
    } catch (_) { /* ignore tracking errors */ }

    // Auto-update deal status from 'sent' → 'viewed'
    const currentStatus = ((data as any).status || '').toLowerCase();
    if (currentStatus === 'sent') {
      try {
        await supabase
          .from(table)
          .update({ status: 'viewed' })
          .eq('id', id);
        console.log(`[public/view] Updated ${type} ${id} status: sent → viewed`);
        (data as any).status = 'viewed';
      } catch (updateErr: any) {
        console.log(`[public/view] Failed to update status to viewed: ${updateErr.message}`);
      }
      // Store read_at timestamp in KV (column may not exist on DB table)
      try {
        await kv.set(`deal_read_at:${orgId}:${id}`, now);
      } catch (_) { /* ignore */ }
    }

    // Record deal activity event for marketing feed
    try {
      const activityId = crypto.randomUUID();
      const dealNumber = (data as any).quote_number || (data as any).bid_number || '';
      const contactName = (data as any).contact_name || (data as any).client_name || '';
      await kv.set(`deal_activity:${orgId}:${activityId}`, {
        id: activityId,
        organization_id: orgId,
        deal_id: id,
        deal_type: type,
        deal_title: (data as any).title || dealNumber || id,
        deal_number: dealNumber,
        contact_name: contactName,
        contact_email: (data as any).contact_email || '',
        deal_total: (data as any).total || (data as any).amount || 0,
        event_type: 'deal_viewed',
        description: `Customer viewed ${type}${dealNumber ? ` #${dealNumber}` : ''} "${(data as any).title || 'Untitled'}"`,
        created_at: now,
      });
    } catch (_) { /* ignore activity tracking errors */ }

    // Strip sensitive fields before returning to public viewer
    const { access_token, refresh_token, imap_password, ...safeData } = data as any;

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

    const now = new Date().toISOString();

    // Store tracking event in KV
    await kv.set(`tracking:${eventType || 'click'}:${entityType || 'quote'}:${entityId}:${Date.now()}`, JSON.stringify({
      type: eventType || 'click',
      entityType: entityType || 'quote',
      entityId,
      orgId,
      url,
      userAgent,
      timestamp: now,
    }));

    // Look up deal details from DB to enrich the activity record
    let dealTitle = '';
    let dealNumber = '';
    let contactName = '';
    let contactEmail = '';
    let dealTotal = 0;
    try {
      const supabase = getSupabase();
      const table = entityType === 'bid' ? 'bids' : 'quotes';
      // Select all fields — different tables have different column names
      const { data: dealData } = await supabase
        .from(table)
        .select('*')
        .eq('id', entityId)
        .eq('organization_id', orgId)
        .single();
      if (dealData) {
        dealTitle = (dealData as any).title || '';
        dealNumber = (dealData as any).quote_number || (dealData as any).bid_number || '';
        contactName = (dealData as any).contact_name || (dealData as any).client_name || '';
        contactEmail = (dealData as any).contact_email || '';
        dealTotal = (dealData as any).total || (dealData as any).amount || 0;
      }
    } catch (_) { /* best-effort enrichment */ }

    // Also record as deal activity for the marketing feed
    try {
      const activityId = crypto.randomUUID();
      const evtLabel = eventType === 'click' ? 'deal_link_clicked' : (eventType || 'deal_interaction');
      await kv.set(`deal_activity:${orgId}:${activityId}`, {
        id: activityId,
        organization_id: orgId,
        deal_id: entityId,
        deal_type: entityType || 'quote',
        deal_title: dealTitle || entityId,
        deal_number: dealNumber,
        contact_name: contactName,
        contact_email: contactEmail,
        deal_total: dealTotal,
        event_type: evtLabel,
        description: `Customer ${eventType === 'click' ? 'clicked link in' : 'interacted with'} ${entityType || 'quote'}${dealNumber ? ` #${dealNumber}` : ''}`,
        created_at: now,
      });
    } catch (_) { /* ignore activity errors */ }

    return c.json({ success: true });
  } catch (err: any) {
    console.log(`[public/events] Error: ${err.message}`);
    return c.json({ error: err.message }, 500);
  }
});

// ── MARKETING (journeys, landing pages, scoring rules) ──────────────────
marketing(app);

// ── SAVED DESIGNS (deck, garage, shed, roof, kitchen — service-role to bypass RLS) ──
designsApi(app);

// ── AUDIT LOGS (Enterprise — writes to audit_logs Supabase table) ────────
auditAPI(app);

// ── INVENTORY DIAGNOSTIC (duplicate SKU scan, cleanup, import jobs) ──────
inventoryDiagnostic(app);

// ── ORG USER MODE (KV-backed single/multi user toggle) ──────────────────
app.get(`${PREFIX}/settings/org-mode`, async (c) => {
  try {
    const auth = await authenticateUser(c);
    if (auth.error) return c.json({ error: auth.error }, auth.status);
    const orgId = c.req.query('organization_id') || auth.profile.organization_id;
    if (!orgId) return c.json({ error: 'Missing organization_id' }, 400);
    console.log(`[org-mode] GET org_mode for org=${orgId}`);
    const data = await kv.get(`org_mode:${orgId}`);
    return c.json({ orgMode: data || { user_mode: 'single' }, source: data ? 'kv' : 'default' });
  } catch (err: any) {
    console.error('[org-mode] GET error:', err);
    return c.json({ error: err.message }, 500);
  }
});

app.put(`${PREFIX}/settings/org-mode`, async (c) => {
  try {
    const auth = await authenticateUser(c);
    if (auth.error) return c.json({ error: auth.error }, auth.status);
    if (!['admin', 'super_admin'].includes(auth.profile.role)) {
      return c.json({ error: 'Only admin or super_admin can change organization user mode' }, 403);
    }
    const body = await c.req.json();
    const orgId = body.organization_id || auth.profile.organization_id;
    if (!orgId) return c.json({ error: 'Missing organization_id' }, 400);

    const userMode = body.user_mode;
    if (!userMode || !['single', 'multi'].includes(userMode)) {
      return c.json({ error: 'Invalid user_mode. Must be "single" or "multi".' }, 400);
    }

    if (auth.profile.role !== 'super_admin' && orgId !== auth.profile.organization_id) {
      return c.json({ error: 'Cannot update settings for a different organization' }, 403);
    }

    const data = {
      user_mode: userMode,
      organization_id: orgId,
      updated_at: new Date().toISOString(),
      updated_by: auth.user.email || auth.user.id,
    };

    await kv.set(`org_mode:${orgId}`, data);
    console.log(`[org-mode] PUT org_mode for org=${orgId}: ${userMode} by ${auth.user.email}`);
    return c.json({ orgMode: data, source: 'kv' });
  } catch (err: any) {
    console.error('[org-mode] PUT error:', err);
    return c.json({ error: err.message }, 500);
  }
});

// ── ORG DETAILS KV FALLBACK (domain, billing_email, phone, address, plan, notes, features) ──
app.get(`${PREFIX}/settings/org-details/:orgId`, async (c) => {
  try {
    const auth = await authenticateUser(c);
    if (auth.error) return c.json({ error: auth.error }, auth.status);
    const orgId = c.req.param('orgId');
    if (!orgId) return c.json({ error: 'Missing orgId' }, 400);
    console.log(`[org-details] GET for org=${orgId}`);
    const data = await kv.get(`org_details:${orgId}`);
    return c.json({ details: data || {}, source: data ? 'kv' : 'default' });
  } catch (err: any) {
    console.error('[org-details] GET error:', err);
    return c.json({ error: err.message }, 500);
  }
});

app.put(`${PREFIX}/settings/org-details/:orgId`, async (c) => {
  try {
    const auth = await authenticateUser(c);
    if (auth.error) return c.json({ error: auth.error }, auth.status);
    if (!['admin', 'super_admin'].includes(auth.profile.role)) {
      return c.json({ error: 'Only admin or super_admin can update org details' }, 403);
    }
    const orgId = c.req.param('orgId');
    if (!orgId) return c.json({ error: 'Missing orgId' }, 400);
    const body = await c.req.json();
    const data = {
      ...body,
      updated_at: new Date().toISOString(),
      updated_by: auth.user.email || auth.user.id,
    };
    await kv.set(`org_details:${orgId}`, data);
    console.log(`[org-details] PUT for org=${orgId} by ${auth.user.email}`);
    return c.json({ details: data, source: 'kv' });
  } catch (err: any) {
    console.error('[org-details] PUT error:', err);
    return c.json({ error: err.message }, 500);
  }
});

// ── SUBSCRIPTIONS & BILLING ─────────────────────────────────────────────
subscriptions(app);

// ── PROJECT WIZARD DEFAULTS (server-side — bypasses RLS via service role key) ──
app.get(`${PREFIX}/project-wizard-defaults`, async (c) => {
  try {
    const auth = await authenticateUser(c);
    if (auth.error) return c.json({ error: auth.error }, auth.status);
    const orgId = c.req.query('organization_id') || auth.profile.organization_id;
    if (!orgId) return c.json({ error: 'Missing organization_id' }, 400);
    console.log(`[project-wizard-defaults] GET defaults for org=${orgId}`);

    const supabase = getSupabase(); // service role — bypasses RLS
    const { data, error } = await supabase
      .from('project_wizard_defaults')
      .select('*')
      .eq('organization_id', orgId);

    if (error) {
      if (error.code === 'PGRST205' || error.code === '42P01') {
        console.warn('[project-wizard-defaults] Table does not exist');
        return c.json({ defaults: [], source: 'server-table-missing' });
      }
      console.error('[project-wizard-defaults] GET error:', error);
      return c.json({ error: error.message, code: error.code }, 500);
    }

    return c.json({ defaults: data || [], source: 'server' });
  } catch (err: any) {
    console.error('[project-wizard-defaults] GET exception:', err);
    return c.json({ error: err.message }, 500);
  }
});

app.post(`${PREFIX}/project-wizard-defaults`, async (c) => {
  try {
    const auth = await authenticateUser(c);
    if (auth.error) return c.json({ error: auth.error }, auth.status);
    if (!['admin', 'super_admin'].includes(auth.profile.role)) {
      return c.json({ error: 'Only admin or super_admin can update project wizard defaults' }, 403);
    }

    const body = await c.req.json();
    const orgId = body.organization_id || auth.profile.organization_id;
    if (!orgId) return c.json({ error: 'Missing organization_id' }, 400);

    if (auth.profile.role !== 'super_admin' && orgId !== auth.profile.organization_id) {
      return c.json({ error: 'Cannot update defaults for a different organization' }, 403);
    }

    console.log(`[project-wizard-defaults] POST upsert for org=${orgId}, planner=${body.planner_type}, category=${body.material_category}`);

    const supabase = getSupabase(); // service role — bypasses RLS
    const record = {
      ...body,
      organization_id: orgId,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('project_wizard_defaults')
      .upsert(record, {
        onConflict: 'organization_id,planner_type,material_type,material_category',
        ignoreDuplicates: false,
      })
      .select()
      .single();

    if (error) {
      console.error('[project-wizard-defaults] POST upsert error:', error);
      return c.json({ error: error.message, code: error.code }, 500);
    }

    return c.json({ default: data, source: 'server' });
  } catch (err: any) {
    console.error('[project-wizard-defaults] POST exception:', err);
    return c.json({ error: err.message }, 500);
  }
});

app.post(`${PREFIX}/project-wizard-defaults/batch`, async (c) => {
  try {
    const auth = await authenticateUser(c);
    if (auth.error) return c.json({ error: auth.error }, auth.status);
    if (!['admin', 'super_admin'].includes(auth.profile.role)) {
      return c.json({ error: 'Only admin or super_admin can update project wizard defaults' }, 403);
    }

    const { defaults: items } = await c.req.json();
    if (!Array.isArray(items) || items.length === 0) {
      return c.json({ error: 'Missing or empty defaults array' }, 400);
    }

    const orgId = items[0].organization_id || auth.profile.organization_id;
    if (!orgId) return c.json({ error: 'Missing organization_id' }, 400);

    if (auth.profile.role !== 'super_admin' && orgId !== auth.profile.organization_id) {
      return c.json({ error: 'Cannot update defaults for a different organization' }, 403);
    }

    console.log(`[project-wizard-defaults] BATCH upsert ${items.length} defaults for org=${orgId}`);

    const supabase = getSupabase(); // service role — bypasses RLS
    const records = items.map((item: any) => ({
      ...item,
      organization_id: orgId,
      updated_at: new Date().toISOString(),
    }));

    const { data, error } = await supabase
      .from('project_wizard_defaults')
      .upsert(records, {
        onConflict: 'organization_id,planner_type,material_type,material_category',
        ignoreDuplicates: false,
      })
      .select();

    if (error) {
      console.error('[project-wizard-defaults] BATCH error:', error);
      return c.json({ error: error.message, code: error.code }, 500);
    }

    console.log(`[project-wizard-defaults] BATCH saved ${data?.length || 0} defaults`);
    return c.json({ defaults: data || [], savedCount: data?.length || 0, source: 'server' });
  } catch (err: any) {
    console.error('[project-wizard-defaults] BATCH exception:', err);
    return c.json({ error: err.message }, 500);
  }
});

app.delete(`${PREFIX}/project-wizard-defaults/:id`, async (c) => {
  try {
    const auth = await authenticateUser(c);
    if (auth.error) return c.json({ error: auth.error }, auth.status);
    if (!['admin', 'super_admin'].includes(auth.profile.role)) {
      return c.json({ error: 'Only admin or super_admin can delete project wizard defaults' }, 403);
    }

    const id = c.req.param('id');
    console.log(`[project-wizard-defaults] DELETE id=${id}`);

    const supabase = getSupabase(); // service role — bypasses RLS
    const { error } = await supabase
      .from('project_wizard_defaults')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[project-wizard-defaults] DELETE error:', error);
      return c.json({ error: error.message, code: error.code }, 500);
    }

    return c.json({ success: true });
  } catch (err: any) {
    console.error('[project-wizard-defaults] DELETE exception:', err);
    return c.json({ error: err.message }, 500);
  }
});

// ── ORG CONVERSION FACTORS (KV-backed) ──────────────────────────────────
// GET org-level conversion factors
app.get(`${PREFIX}/org-conversion-factors/:organizationId`, async (c) => {
  try {
    const auth = await authenticateUser(c);
    if (auth.error) return c.json({ error: auth.error }, auth.status);

    const orgId = c.req.param('organizationId');
    console.log(`[org-cf] GET conversion factors for org=${orgId}`);

    const data = await kv.get(`org_cf:${orgId}`);
    return c.json({ conversionFactors: data || {} });
  } catch (err: any) {
    console.error('[org-cf] GET error:', err);
    return c.json({ error: err.message }, 500);
  }
});

// POST (save) org-level conversion factors
app.post(`${PREFIX}/org-conversion-factors/:organizationId`, async (c) => {
  try {
    const auth = await authenticateUser(c);
    if (auth.error) return c.json({ error: auth.error }, auth.status);
    if (!['admin', 'super_admin'].includes(auth.profile.role)) {
      return c.json({ error: 'Only admin or super_admin can set org conversion factors' }, 403);
    }

    const orgId = c.req.param('organizationId');
    const body = await c.req.json();
    const cf = body.conversionFactors;

    if (!cf || typeof cf !== 'object') {
      return c.json({ error: 'conversionFactors must be an object' }, 400);
    }

    console.log(`[org-cf] POST saving ${Object.keys(cf).length} conversion factors for org=${orgId}`);
    await kv.set(`org_cf:${orgId}`, cf);
    return c.json({ success: true, count: Object.keys(cf).length });
  } catch (err: any) {
    console.error('[org-cf] POST error:', err);
    return c.json({ error: err.message }, 500);
  }
});

// ── API KEY MANAGEMENT (Enterprise) ─────────────────────────────────────
app.route('/', apiKeys);

// ── PUBLIC REST API (Enterprise, API-key auth) ──────────────────────────
app.route('/', publicApi);

// ── BACKGROUND IMPORT JOBS ──────────────────────────────────────────────
backgroundJobs(app);

// ── CALENDAR SYNC (direct Google Calendar & Microsoft Graph APIs) ──
app.post(`${PREFIX}/calendar-sync`, async (c) => {
  try {
    const auth = await authenticateUser(c);
    if (auth.error) return c.json({ error: auth.error }, auth.status as any);
    const { supabase, user, profile } = auth;

    const { accountId } = await c.req.json();
    if (!accountId) return c.json({ error: 'Missing accountId' }, 400);

    console.log('[calendar-sync] Request for account:', accountId);

    const orgId = profile.organization_id;
    if (!orgId) return c.json({ success: false, error: 'User organization not found' }, 400);

    // Look up account from KV first, then DB
    let kvAccount = await getAccountTokensFromKV(user.id, accountId);
    if (!kvAccount) {
      const { data: dbAccount } = await supabase
        .from('email_accounts').select('*').eq('id', accountId).eq('user_id', user.id).single();
      if (dbAccount) {
        kvAccount = {
          id: dbAccount.id, provider: dbAccount.provider, email: dbAccount.email,
          access_token: dbAccount.access_token, refresh_token: dbAccount.refresh_token,
          token_expires_at: dbAccount.token_expires_at, kvKey: dbAccount.id,
        };
      }
    }
    if (!kvAccount) return c.json({ success: false, error: `Email account not found. Account ID: ${accountId}` }, 404);

    console.log(`[calendar-sync] provider=${kvAccount.provider}, email=${kvAccount.email}, calendar_enabled=${kvAccount.calendar_enabled}`);

    // Skip accounts that were not connected for calendar access
    if (!kvAccount.calendar_enabled) {
      console.log(`[calendar-sync] Skipping account ${kvAccount.email} — calendar_enabled is not set. Account was likely connected for email only.`);
      return c.json({
        success: true, syncedCount: 0, skipped: true,
        skipReason: 'Account not enabled for calendar sync. Please reconnect via Calendar setup.',
      });
    }

    // Time range: last 30 days to next 90 days
    const now = new Date();
    const rangeStart = new Date(now.getTime() - 30 * 86400000);
    const rangeEnd = new Date(now.getTime() + 90 * 86400000);
    let syncedCount = 0;

    if (kvAccount.provider === 'gmail') {
      // ── Google Calendar API ──
      let accessToken = kvAccount.access_token;
      if (new Date(kvAccount.token_expires_at || 0) <= now && kvAccount.refresh_token) {
        console.log('[calendar-sync] Google token expired, refreshing...');
        try {
          const nt = await refreshGoogleTokenFn(kvAccount.refresh_token);
          accessToken = nt.access_token;
          const kvKey = kvAccount.kvKey || `gmail_${kvAccount.email.replace(/[^a-z0-9]/gi, '_').toLowerCase()}`;
          await kv.set(`email_account:${user.id}:${kvKey}`, {
            ...kvAccount, access_token: nt.access_token,
            token_expires_at: new Date(Date.now() + nt.expires_in * 1000).toISOString(),
          });
        } catch (refreshErr: any) {
          console.error('[calendar-sync] Google token refresh failed:', refreshErr.message);
          return c.json({
            success: false,
            error: `Google token refresh failed. Please disconnect and reconnect your Gmail account to restore calendar access.`,
            needsReconnect: true,
          }, 502);
        }
      }

      const calUrl = `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
        `timeMin=${rangeStart.toISOString()}&timeMax=${rangeEnd.toISOString()}` +
        `&maxResults=250&singleEvents=true&orderBy=startTime`;
      const calRes = await fetch(calUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
      if (!calRes.ok) {
        const errText = await calRes.text();
        console.error(`[calendar-sync] Google Calendar API error (${calRes.status}):`, errText);
        if (calRes.status === 401 || calRes.status === 403) {
          return c.json({
            success: false,
            error: `Google Calendar access denied (${calRes.status}). Your Google account may need to be reconnected with calendar permissions. Please disconnect and reconnect your Gmail account.`,
            needsReconnect: true,
          }, 502);
        }
        return c.json({ success: false, error: `Google Calendar API error: ${errText}` }, 502);
      }
      const calData = await calRes.json();
      const events = calData.items || [];
      console.log(`[calendar-sync] Google Calendar: ${events.length} events`);

      for (const event of events) {
        try {
          if (event.status === 'cancelled') continue;
          const calEventKey = `cal_event:google:${kvAccount.email}:${event.id}`;
          const { data: existingMapping } = await supabase
            .from('kv_store_8405be07').select('value').eq('key', calEventKey).single();

          const evStart = event.start?.dateTime || event.start?.date;
          const evEnd = event.end?.dateTime || event.end?.date;
          if (!evStart) { console.warn('[calendar-sync] Skipping event with no start:', event.id); continue; }

          const appointmentData: Record<string, any> = {
            organization_id: orgId, owner_id: user.id,
            title: event.summary || '(No Title)',
            description: event.description || null,
            location: event.location || null,
            start_time: new Date(evStart).toISOString(),
            end_time: evEnd ? new Date(evEnd).toISOString() : new Date(evStart).toISOString(),
          };

          if (existingMapping?.value) {
            const existingId = JSON.parse(existingMapping.value);
            await supabase.from('appointments').update(appointmentData).eq('id', existingId);
          } else {
            const { data: insertResult, error: insertError } = await supabase
              .from('appointments').insert(appointmentData).select('id').single();
            if (insertError) {
              console.error('[calendar-sync] Insert error:', { eventId: event.id, error: insertError });
            } else {
              await supabase.from('kv_store_8405be07')
                .upsert({ key: calEventKey, value: JSON.stringify(insertResult.id) });
              syncedCount++;
            }
          }
        } catch (evErr) {
          console.error('[calendar-sync] Exception for event:', event.id, evErr);
        }
      }

    } else if (kvAccount.provider === 'outlook') {
      // ── Microsoft Graph Calendar API ──
      let accessToken = kvAccount.access_token;
      if (new Date(kvAccount.token_expires_at || 0) <= now && kvAccount.refresh_token) {
        console.log('[calendar-sync] Outlook token expired, refreshing...');
        try {
          const nt = await refreshAzureTokenFn(kvAccount.refresh_token);
          accessToken = nt.access_token;
          const kvKey = kvAccount.kvKey || `outlook_${kvAccount.email.replace(/[^a-z0-9]/gi, '_').toLowerCase()}`;
          await kv.set(`email_account:${user.id}:${kvKey}`, {
            ...kvAccount, access_token: nt.access_token,
            refresh_token: nt.refresh_token || kvAccount.refresh_token,
            token_expires_at: new Date(Date.now() + nt.expires_in * 1000).toISOString(),
          });
        } catch (refreshErr: any) {
          console.error('[calendar-sync] Outlook token refresh failed:', refreshErr.message);
          return c.json({
            success: false,
            error: `Outlook token refresh failed. Please disconnect and reconnect your Outlook account.`,
            needsReconnect: true,
          }, 502);
        }
      }

      const graphUrl = `https://graph.microsoft.com/v1.0/me/calendarView?` +
        `startDateTime=${rangeStart.toISOString()}&endDateTime=${rangeEnd.toISOString()}` +
        `&$top=250&$orderby=start/dateTime`;
      const graphRes = await fetch(graphUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
      if (!graphRes.ok) {
        const errText = await graphRes.text();
        console.error(`[calendar-sync] Microsoft Graph Calendar error (${graphRes.status}):`, errText);
        if (graphRes.status === 401 || graphRes.status === 403) {
          return c.json({
            success: false,
            error: `Outlook Calendar access denied (${graphRes.status}). Your Outlook account may need to be reconnected. Please disconnect and reconnect your Outlook account.`,
            needsReconnect: true,
          }, 502);
        }
        return c.json({ success: false, error: `Microsoft Graph Calendar error: ${errText}` }, 502);
      }
      const graphData = await graphRes.json();
      const events = graphData.value || [];
      console.log(`[calendar-sync] Outlook Calendar: ${events.length} events`);

      for (const event of events) {
        try {
          if (event.isCancelled) continue;
          const calEventKey = `cal_event:outlook:${kvAccount.email}:${event.id}`;
          const { data: existingMapping } = await supabase
            .from('kv_store_8405be07').select('value').eq('key', calEventKey).single();

          const evStart = event.start?.dateTime ? new Date(event.start.dateTime + 'Z').toISOString() : null;
          const evEnd = event.end?.dateTime ? new Date(event.end.dateTime + 'Z').toISOString() : null;
          if (!evStart) { console.warn('[calendar-sync] Skipping event with no start:', event.id); continue; }

          const appointmentData: Record<string, any> = {
            organization_id: orgId, owner_id: user.id,
            title: event.subject || '(No Title)',
            description: event.bodyPreview || null,
            location: event.location?.displayName || null,
            start_time: evStart,
            end_time: evEnd || evStart,
          };

          if (existingMapping?.value) {
            const existingId = JSON.parse(existingMapping.value);
            await supabase.from('appointments').update(appointmentData).eq('id', existingId);
          } else {
            const { data: insertResult, error: insertError } = await supabase
              .from('appointments').insert(appointmentData).select('id').single();
            if (insertError) {
              console.error('[calendar-sync] Insert error:', { eventId: event.id, error: insertError });
            } else {
              await supabase.from('kv_store_8405be07')
                .upsert({ key: calEventKey, value: JSON.stringify(insertResult.id) });
              syncedCount++;
            }
          }
        } catch (evErr) {
          console.error('[calendar-sync] Exception for event:', event.id, evErr);
        }
      }

    } else {
      return c.json({ success: false, error: `Calendar sync not supported for provider: ${kvAccount.provider}` }, 400);
    }

    // Update last sync timestamp
    await supabase.from('email_accounts')
      .update({ last_sync: new Date().toISOString() }).eq('id', accountId);

    return c.json({
      success: true, syncedCount,
      lastSync: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('[calendar-sync] Error:', err);
    return c.json({ success: false, error: err.message || 'Calendar sync failed' }, 500);
  }
});

// ── GENERIC KV ROUTES (Authenticated) ───────────────────────────────────
app.get(`${PREFIX}/kv/get/:key`, async (c) => {
  try {
    const auth = await authenticateUser(c);
    if (auth.error) return c.json({ error: auth.error }, auth.status);
    const key = c.req.param('key');
    if (!key) return c.json({ error: 'Missing key' }, 400);
    const val = await kv.get(key);
    if (val === undefined || val === null) return c.json({ error: 'Not found' }, 404);
    // Return wrapped in a 'value' property
    return c.json({ value: val });
  } catch (err: any) { return c.json({ error: err.message }, 500); }
});

app.post(`${PREFIX}/kv/set`, async (c) => {
  try {
    const auth = await authenticateUser(c);
    if (auth.error) return c.json({ error: auth.error }, auth.status);
    const body = await c.req.json();
    if (!body.key) return c.json({ error: 'Missing key' }, 400);
    // Parse value if it is a JSON string to store as an object, or store as is
    let valToStore = body.value;
    if (typeof body.value === 'string') {
      try { valToStore = JSON.parse(body.value); } catch { /* ignore */ }
    }
    await kv.set(body.key, valToStore);
    return c.json({ success: true });
  } catch (err: any) { return c.json({ error: err.message }, 500); }
});

// ── CATCH-ALL ───────────────────────────────────────────────────────────
// Return 200 with diagnostic info so platform health checks always succeed.
// The `matched: false` flag lets callers distinguish real routes from the fallback.
app.all('*', (c) => {
  console.log(`[catch-all] Unmatched route: ${c.req.method} ${c.req.path}`);
  return c.json({ status: 'ok', matched: false, method: c.req.method, path: c.req.path, version: 'v5', timestamp: new Date().toISOString() });
});

// ── Mount with prefix stripping for both deployment targets ─────────────
console.log('[v5] ProSpaces CRM server starting — single-app architecture');

Deno.serve(app.fetch);