import { Hono } from 'npm:hono';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import * as kv from './kv_store.tsx';

/**
 * Marketing routes for Journeys and Landing Pages.
 * Data is stored in the KV store with key patterns:
 *   journey:{orgId}:{journeyId}
 *   landing_page:{orgId}:{pageId}
 */
export function marketing(app: Hono) {

  // Helper: authenticate user and resolve their organization ID
  async function authenticateAndGetOrg(c: any): Promise<{ userId: string; orgId: string } | null> {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) return null;

    const accessToken = authHeader.split(' ')[1];
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    if (error || !user) return null;

    // Try to resolve org from profiles
    let orgId: string | null = null;

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (profile?.organization_id) {
      orgId = profile.organization_id;
    } else {
      // Fallback: organization_members table
      const { data: membership } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .limit(1)
        .single();

      if (membership?.organization_id) {
        orgId = membership.organization_id;
      } else {
        // Fallback: user metadata
        orgId = user.user_metadata?.organization_id || null;
      }
    }

    if (!orgId) return null;
    return { userId: user.id, orgId };
  }

  // ============== JOURNEYS ==============

  // GET all journeys for the user's org
  app.get('/make-server-8405be07/marketing/journeys', async (c) => {
    console.log('GET /marketing/journeys');
    try {
      const auth = await authenticateAndGetOrg(c);
      if (!auth) return c.json({ error: 'Unauthorized' }, 401);

      const journeys = await kv.getByPrefix(`journey:${auth.orgId}:`);
      // Sort by created_at descending
      journeys.sort((a: any, b: any) => {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateB - dateA;
      });

      return c.json({ journeys });
    } catch (error: any) {
      console.error('Error fetching journeys:', error);
      return c.json({ error: 'Failed to fetch journeys', message: error.message }, 500);
    }
  });

  // POST create a new journey
  app.post('/make-server-8405be07/marketing/journeys', async (c) => {
    console.log('POST /marketing/journeys');
    try {
      const auth = await authenticateAndGetOrg(c);
      if (!auth) return c.json({ error: 'Unauthorized' }, 401);

      const body = await c.req.json();
      const id = body.id || crypto.randomUUID();
      const now = new Date().toISOString();

      const journey = {
        ...body,
        id,
        organization_id: auth.orgId,
        created_by: auth.userId,
        created_at: body.created_at || now,
        updated_at: now,
      };

      await kv.set(`journey:${auth.orgId}:${id}`, journey);
      console.log(`Created journey ${id} for org ${auth.orgId}`);

      return c.json({ journey });
    } catch (error: any) {
      console.error('Error creating journey:', error);
      return c.json({ error: 'Failed to create journey', message: error.message }, 500);
    }
  });

  // PUT update a journey
  app.put('/make-server-8405be07/marketing/journeys/:id', async (c) => {
    const id = c.req.param('id');
    console.log(`PUT /marketing/journeys/${id}`);
    try {
      const auth = await authenticateAndGetOrg(c);
      if (!auth) return c.json({ error: 'Unauthorized' }, 401);

      const existing = await kv.get(`journey:${auth.orgId}:${id}`);
      if (!existing) return c.json({ error: 'Journey not found' }, 404);

      const updates = await c.req.json();
      const journey = {
        ...existing,
        ...updates,
        id,
        organization_id: auth.orgId,
        updated_at: new Date().toISOString(),
      };

      await kv.set(`journey:${auth.orgId}:${id}`, journey);
      console.log(`Updated journey ${id}`);

      return c.json({ journey });
    } catch (error: any) {
      console.error('Error updating journey:', error);
      return c.json({ error: 'Failed to update journey', message: error.message }, 500);
    }
  });

  // DELETE a journey
  app.delete('/make-server-8405be07/marketing/journeys/:id', async (c) => {
    const id = c.req.param('id');
    console.log(`DELETE /marketing/journeys/${id}`);
    try {
      const auth = await authenticateAndGetOrg(c);
      if (!auth) return c.json({ error: 'Unauthorized' }, 401);

      await kv.del(`journey:${auth.orgId}:${id}`);
      console.log(`Deleted journey ${id}`);

      return c.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting journey:', error);
      return c.json({ error: 'Failed to delete journey', message: error.message }, 500);
    }
  });

  // ============== LANDING PAGES ==============

  // GET all landing pages
  app.get('/make-server-8405be07/marketing/landing-pages', async (c) => {
    console.log('GET /marketing/landing-pages');
    try {
      const auth = await authenticateAndGetOrg(c);
      if (!auth) return c.json({ error: 'Unauthorized' }, 401);

      const pages = await kv.getByPrefix(`landing_page:${auth.orgId}:`);
      pages.sort((a: any, b: any) => {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateB - dateA;
      });

      return c.json({ pages });
    } catch (error: any) {
      console.error('Error fetching landing pages:', error);
      return c.json({ error: 'Failed to fetch landing pages', message: error.message }, 500);
    }
  });

  // POST create a new landing page
  app.post('/make-server-8405be07/marketing/landing-pages', async (c) => {
    console.log('POST /marketing/landing-pages');
    try {
      const auth = await authenticateAndGetOrg(c);
      if (!auth) return c.json({ error: 'Unauthorized' }, 401);

      const body = await c.req.json();
      const id = body.id || crypto.randomUUID();
      const now = new Date().toISOString();

      const page = {
        ...body,
        id,
        organization_id: auth.orgId,
        created_by: auth.userId,
        created_at: body.created_at || now,
        updated_at: now,
      };

      await kv.set(`landing_page:${auth.orgId}:${id}`, page);
      return c.json({ page });
    } catch (error: any) {
      console.error('Error creating landing page:', error);
      return c.json({ error: 'Failed to create landing page', message: error.message }, 500);
    }
  });

  // PUT update a landing page
  app.put('/make-server-8405be07/marketing/landing-pages/:id', async (c) => {
    const id = c.req.param('id');
    console.log(`PUT /marketing/landing-pages/${id}`);
    try {
      const auth = await authenticateAndGetOrg(c);
      if (!auth) return c.json({ error: 'Unauthorized' }, 401);

      const existing = await kv.get(`landing_page:${auth.orgId}:${id}`);
      if (!existing) return c.json({ error: 'Landing page not found' }, 404);

      const updates = await c.req.json();
      const page = {
        ...existing,
        ...updates,
        id,
        organization_id: auth.orgId,
        updated_at: new Date().toISOString(),
      };

      await kv.set(`landing_page:${auth.orgId}:${id}`, page);
      return c.json({ page });
    } catch (error: any) {
      console.error('Error updating landing page:', error);
      return c.json({ error: 'Failed to update landing page', message: error.message }, 500);
    }
  });

  // DELETE a landing page
  app.delete('/make-server-8405be07/marketing/landing-pages/:id', async (c) => {
    const id = c.req.param('id');
    console.log(`DELETE /marketing/landing-pages/${id}`);
    try {
      const auth = await authenticateAndGetOrg(c);
      if (!auth) return c.json({ error: 'Unauthorized' }, 401);

      await kv.del(`landing_page:${auth.orgId}:${id}`);
      return c.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting landing page:', error);
      return c.json({ error: 'Failed to delete landing page', message: error.message }, 500);
    }
  });

  // ============== LEAD SCORES ==============

  // GET all lead scores for the user's organization
  app.get('/make-server-8405be07/marketing/lead-scores', async (c) => {
    console.log('GET /marketing/lead-scores');
    try {
      const auth = await authenticateAndGetOrg(c);
      if (!auth) return c.json({ error: 'Unauthorized' }, 401);

      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );

      // Try to fetch from lead_scores table
      const { data, error } = await supabase
        .from('lead_scores')
        .select('*')
        .eq('organization_id', auth.orgId)
        .order('score', { ascending: false });

      if (error) {
        console.error('Error fetching lead scores from DB:', error);
        // If table doesn't exist, return empty array
        if (error.code === '42P01') {
          return c.json({ scores: [] });
        }
        throw error;
      }

      return c.json({ scores: data || [] });
    } catch (error: any) {
      console.error('Error fetching lead scores:', error);
      return c.json({ error: 'Failed to fetch lead scores', message: error.message }, 500);
    }
  });

  // ============== DUPLICATE INVENTORY CLEANUP ==============

  // POST: Server-side batch deduplication of inventory SKUs
  app.post('/make-server-8405be07/marketing/inventory-deduplicate', async (c) => {
    console.log('POST /marketing/inventory-deduplicate');
    try {
      const authHeader = c.req.header('Authorization');
      if (!authHeader) return c.json({ error: 'No authorization header' }, 401);

      const accessToken = authHeader.split(' ')[1];
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );

      const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
      if (authError || !user) return c.json({ error: 'Unauthorized' }, 401);

      const body = await c.req.json();
      const { organizationId, batchSize = 200 } = body;
      if (!organizationId) return c.json({ error: 'organizationId is required' }, 400);

      console.log(`Deduplicating inventory for org ${organizationId}`);

      // Use SQL RPC to find duplicates efficiently
      // Fetch all ids and skus, group in-memory
      let allItems: { id: string; sku: string; created_at: string }[] = [];
      let offset = 0;
      const pageSize = 5000;

      while (true) {
        const { data, error } = await supabase
          .from('inventory')
          .select('id, sku, created_at')
          .eq('organization_id', organizationId)
          .not('sku', 'is', null)
          .order('created_at', { ascending: true })
          .range(offset, offset + pageSize - 1);

        if (error) {
          console.error('Error fetching inventory for dedup:', error);
          return c.json({ error: 'Failed to fetch inventory', message: error.message }, 500);
        }

        if (!data || data.length === 0) break;
        allItems = allItems.concat(data);
        if (data.length < pageSize) break;
        offset += pageSize;
      }

      // Group by SKU, keep oldest (first in created_at ASC order), mark rest for deletion
      const skuGroups = new Map<string, string[]>();
      for (const item of allItems) {
        if (!item.sku) continue;
        if (!skuGroups.has(item.sku)) {
          skuGroups.set(item.sku, []);
        }
        skuGroups.get(item.sku)!.push(item.id);
      }

      const idsToDelete: string[] = [];
      let duplicateSkuCount = 0;
      for (const [_sku, ids] of skuGroups) {
        if (ids.length > 1) {
          duplicateSkuCount++;
          // Keep the first (oldest), delete the rest
          idsToDelete.push(...ids.slice(1));
        }
      }

      if (idsToDelete.length === 0) {
        return c.json({ success: true, duplicateSkus: 0, deleted: 0, message: 'No duplicates found' });
      }

      console.log(`Found ${duplicateSkuCount} duplicate SKUs, ${idsToDelete.length} records to delete`);

      // Batch delete
      let deletedCount = 0;
      let errorCount = 0;
      for (let i = 0; i < idsToDelete.length; i += batchSize) {
        const batch = idsToDelete.slice(i, i + batchSize);
        const { error: deleteError } = await supabase
          .from('inventory')
          .delete()
          .in('id', batch)
          .eq('organization_id', organizationId);

        if (deleteError) {
          console.error(`Batch delete error at offset ${i}:`, deleteError.message);
          errorCount += batch.length;
        } else {
          deletedCount += batch.length;
        }
      }

      console.log(`Dedup complete: ${deletedCount} deleted, ${errorCount} errors`);

      return c.json({
        success: true,
        duplicateSkus: duplicateSkuCount,
        deleted: deletedCount,
        errors: errorCount,
        totalScanned: allItems.length,
      });
    } catch (error: any) {
      console.error('Error in inventory-deduplicate:', error);
      return c.json({ error: 'Internal server error', message: error.message }, 500);
    }
  });
}