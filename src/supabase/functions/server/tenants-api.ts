import { Hono } from 'npm:hono';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import * as kv from './kv_store.tsx';

const PREFIX = '/make-server-8405be07';

function getSupabase() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );
}

function extractUserToken(c: any): string | null {
  const userToken = c.req.header('X-User-Token');
  if (userToken) return userToken;
  const authHeader = c.req.header('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1] || null;
    if (token && token.length > 300) return token;
  }
  return null;
}

async function authenticateSuperAdmin(c: any) {
  const supabase = getSupabase();
  const token = extractUserToken(c);
  if (!token) return { error: 'Missing auth token', status: 401, supabase };

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return { error: 'Unauthorized: ' + (authError?.message || 'No user'), status: 401, supabase };

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  const role = profile?.role || user.user_metadata?.role || 'standard_user';

  if (role !== 'super_admin') {
    return { error: 'Forbidden: super_admin required', status: 403, supabase };
  }

  return { error: null, status: 200, supabase, user, profile: { ...profile, role } };
}

export function tenantsAPI(app: Hono) {

  // ── CREATE ORGANIZATION ───────────────────────────────────────────────
  app.post(`${PREFIX}/tenants`, async (c) => {
    try {
      const auth = await authenticateSuperAdmin(c);
      if (auth.error) return c.json({ error: auth.error }, auth.status as any);

      const data = await c.req.json();

      // Generate org ID from name
      let orgId = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const { data: existingOrg } = await auth.supabase
        .from('organizations').select('id').eq('id', orgId).single();
      if (existingOrg) {
        orgId = `${orgId}-${Date.now()}`;
      }

      const dbData: any = {
        id: orgId,
        name: data.name,
        status: data.status || 'active',
        logo: data.logo || null,
        ai_suggestions_enabled: data.ai_suggestions_enabled ?? false,
        marketing_enabled: data.marketing_enabled ?? true,
        inventory_enabled: data.inventory_enabled ?? true,
        import_export_enabled: data.import_export_enabled ?? true,
        documents_enabled: data.documents_enabled ?? true,
      };

      console.log('[tenants-api] Creating organization:', orgId);
      const { data: org, error } = await auth.supabase
        .from('organizations')
        .insert([dbData])
        .select()
        .single();

      if (error) {
        console.log('[tenants-api] Create error:', error.message);
        return c.json({ error: error.message }, 500);
      }

      // Save extra fields to KV
      try {
        const extraFields = {
          domain: data.domain || '',
          billing_email: data.billingEmail || '',
          phone: data.phone || '',
          address: data.address || '',
          plan: data.plan || 'starter',
          custom_plan_price: data.customPlanPrice || '',
          notes: data.notes || '',
          features: data.features || [],
        };
        await kv.set(`org_details:${orgId}`, extraFields);
        console.log('[tenants-api] Extra org details saved to KV for', orgId);
      } catch (kvErr: any) {
        console.log('[tenants-api] KV save failed (non-critical):', kvErr.message);
      }

      // Set default org mode
      try {
        await kv.set(`org_mode:${orgId}`, { user_mode: data.user_mode || 'multi' });
        console.log('[tenants-api] Org mode set for', orgId);
      } catch (modeErr: any) {
        console.log('[tenants-api] Mode save failed (non-critical):', modeErr.message);
      }

      return c.json({ tenant: org }, 201);
    } catch (err: any) {
      console.log('[tenants-api] Create error:', err.message);
      return c.json({ error: err.message }, 500);
    }
  });

  // ── UPDATE ORGANIZATION ───────────────────────────────────────────────
  app.put(`${PREFIX}/tenants/:id`, async (c) => {
    try {
      const auth = await authenticateSuperAdmin(c);
      if (auth.error) return c.json({ error: auth.error }, auth.status as any);

      const id = c.req.param('id');
      const data = await c.req.json();

      const dbData: any = {
        name: data.name,
        status: data.status,
        logo: data.logo || null,
        ai_suggestions_enabled: data.ai_suggestions_enabled,
        marketing_enabled: data.marketing_enabled,
        inventory_enabled: data.inventory_enabled,
        import_export_enabled: data.import_export_enabled,
        documents_enabled: data.documents_enabled,
      };

      console.log('[tenants-api] Updating organization:', id);
      const { data: org, error } = await auth.supabase
        .from('organizations')
        .update(dbData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.log('[tenants-api] Update error:', error.message, error.code, error.details);
        return c.json({ error: error.message, code: error.code }, 500);
      }

      // Save extra fields to KV
      try {
        const extraFields = {
          domain: data.domain || '',
          billing_email: data.billingEmail || '',
          phone: data.phone || '',
          address: data.address || '',
          plan: data.plan || 'starter',
          custom_plan_price: data.customPlanPrice || '',
          notes: data.notes || '',
          features: data.features || [],
        };
        await kv.set(`org_details:${id}`, extraFields);
      } catch (kvErr: any) {
        console.log('[tenants-api] KV save failed (non-critical):', kvErr.message);
      }

      // Sync plan to subscription KV so Billing page stays in sync
      if (data.plan) {
        try {
          const sub: any = await kv.get(`subscription:${id}`);
          if (sub) {
            sub.plan_id = data.plan;
            sub.updated_at = new Date().toISOString();
            await kv.set(`subscription:${id}`, sub);
            console.log(`[tenants-api] Synced plan '${data.plan}' to subscription for org ${id}`);
          }
        } catch (syncErr: any) {
          console.log('[tenants-api] Subscription sync failed (non-critical):', syncErr.message);
        }
      }

      return c.json({ tenant: org });
    } catch (err: any) {
      console.log('[tenants-api] Update error:', err.message);
      return c.json({ error: err.message }, 500);
    }
  });

  // ── UPDATE FEATURES (for AI toggle, etc.) ─────────────────────────────
  app.patch(`${PREFIX}/tenants/:id/features`, async (c) => {
    try {
      const auth = await authenticateSuperAdmin(c);
      if (auth.error) return c.json({ error: auth.error }, auth.status as any);

      const id = c.req.param('id');
      const features = await c.req.json();

      console.log('[tenants-api] Updating features for:', id, features);
      const { data: org, error } = await auth.supabase
        .from('organizations')
        .update(features)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.log('[tenants-api] Feature update error:', error.message);
        return c.json({ error: error.message }, 500);
      }

      return c.json({ tenant: org });
    } catch (err: any) {
      console.log('[tenants-api] Feature update error:', err.message);
      return c.json({ error: err.message }, 500);
    }
  });

  // ── DELETE ORGANIZATION ───────────────────────────────────────────────
  app.delete(`${PREFIX}/tenants/:id`, async (c) => {
    try {
      const auth = await authenticateSuperAdmin(c);
      if (auth.error) return c.json({ error: auth.error }, auth.status as any);

      const id = c.req.param('id');
      console.log('[tenants-api] Starting comprehensive deletion of organization:', id);

      const tables = [
        'bids', 'opportunities', 'project_managers', 'contacts',
        'appointments', 'notes', 'tasks', 'quotes', 'documents',
        'inventory',
      ];

      for (const table of tables) {
        console.log(`[tenants-api] Deleting from ${table}...`);
        const { data: deleted, error } = await auth.supabase
          .from(table)
          .delete()
          .eq('organization_id', id)
          .select('id');
        if (error) console.log(`[tenants-api] Error deleting ${table}:`, error.message);
        else console.log(`[tenants-api] Deleted ${deleted?.length || 0} ${table}`);
      }

      // Delete storage files
      try {
        const { data: files } = await auth.supabase.storage.from('documents').list(id);
        if (files && files.length > 0) {
          const filePaths = files.map((file: any) => `${id}/${file.name}`);
          await auth.supabase.storage.from('documents').remove(filePaths);
          console.log(`[tenants-api] Deleted ${files.length} storage files`);
        }
      } catch (storageErr: any) {
        console.log('[tenants-api] Storage cleanup error (non-critical):', storageErr.message);
      }

      // Delete profiles
      const { data: profilesDeleted, error: profilesError } = await auth.supabase
        .from('profiles')
        .delete()
        .eq('organization_id', id)
        .select('id');
      if (profilesError) console.log('[tenants-api] Error deleting profiles:', profilesError.message);
      else console.log(`[tenants-api] Deleted ${profilesDeleted?.length || 0} profiles`);

      // Delete the organization
      const { data: orgData, error: orgError } = await auth.supabase
        .from('organizations')
        .delete()
        .eq('id', id)
        .select();

      if (orgError) {
        console.log('[tenants-api] Error deleting organization:', orgError.message);
        return c.json({ error: orgError.message }, 500);
      }

      // Clean up KV
      try {
        await kv.del(`org_details:${id}`);
        await kv.del(`org_mode:${id}`);
      } catch {}

      console.log('[tenants-api] Successfully deleted organization:', id);
      return c.json({ success: true });
    } catch (err: any) {
      console.log('[tenants-api] Delete error:', err.message);
      return c.json({ error: err.message }, 500);
    }
  });
}