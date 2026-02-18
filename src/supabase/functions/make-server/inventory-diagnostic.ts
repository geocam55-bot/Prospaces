import { Hono } from 'npm:hono';
import { createClient } from 'jsr:@supabase/supabase-js@2';

export function inventoryDiagnostic(app: Hono) {
  // Run diagnostic - bypasses RLS to see ALL inventory items
  app.post('/inventory-diagnostic/run', async (c) => {
    console.log('🔍 Inventory diagnostic endpoint hit');

    try {
      // Verify user is authenticated
      const authHeader = c.req.header('Authorization');
      if (!authHeader) {
        return c.json({ error: 'No authorization header' }, 401);
      }

      const accessToken = authHeader.split(' ')[1];

      // Use service role to bypass RLS
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );

      // Verify the user
      const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
      if (authError || !user) {
        console.error('Auth error:', authError);
        return c.json({ error: 'Unauthorized' }, 401);
      }

      // Get user's profile and org ID
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, organization_id, full_name, role')
        .eq('id', user.id)
        .single();

      if (profileError || !profile) {
        console.error('Profile error:', profileError);
        return c.json({ error: 'Profile not found' }, 404);
      }

      const userOrgId = profile.organization_id;
      console.log('🔍 User:', profile.email, 'Org:', userOrgId);

      // 1. Total items in database (bypassing RLS)
      const { count: totalCount, error: totalError } = await supabase
        .from('inventory')
        .select('*', { count: 'exact', head: true });

      if (totalError) {
        console.error('Total count error:', totalError);
      }
      console.log('📊 Total items in database:', totalCount);

      // 2. Items in user's organization
      const { count: userOrgCount, error: userOrgError } = await supabase
        .from('inventory')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', userOrgId);

      if (userOrgError) {
        console.error('User org count error:', userOrgError);
      }
      console.log('📊 Items in user org:', userOrgCount);

      // 3. Items with NULL organization_id
      const { count: nullOrgCount, error: nullOrgError } = await supabase
        .from('inventory')
        .select('*', { count: 'exact', head: true })
        .is('organization_id', null);

      if (nullOrgError) {
        console.error('Null org count error:', nullOrgError);
      }
      console.log('📊 Items with null org:', nullOrgCount);

      // 4. Get distinct organization_ids and their counts
      const { data: allOrgItems, error: orgItemsError } = await supabase
        .from('inventory')
        .select('organization_id')
        .not('organization_id', 'is', null)
        .limit(100000);

      const orgCounts: Record<string, number> = {};
      if (allOrgItems) {
        allOrgItems.forEach((item: any) => {
          const orgId = item.organization_id;
          orgCounts[orgId] = (orgCounts[orgId] || 0) + 1;
        });
      }

      const orgBreakdown = Object.entries(orgCounts).map(([org_id, count]) => ({
        org_id,
        count,
        is_user_org: org_id === userOrgId,
      }));

      console.log('📊 Org breakdown:', orgBreakdown);

      // 5. Get sample items from different scenarios
      const { data: userOrgSamples } = await supabase
        .from('inventory')
        .select('id, name, sku, category, quantity, organization_id, created_at')
        .eq('organization_id', userOrgId)
        .order('created_at', { ascending: false })
        .limit(5);

      const { data: nullOrgSamples } = await supabase
        .from('inventory')
        .select('id, name, sku, category, quantity, organization_id, created_at')
        .is('organization_id', null)
        .order('created_at', { ascending: false })
        .limit(5);

      const otherOrgIds = Object.keys(orgCounts).filter(id => id !== userOrgId);
      let otherOrgSamples: any[] = [];
      if (otherOrgIds.length > 0) {
        const { data: otherSamples } = await supabase
          .from('inventory')
          .select('id, name, sku, category, quantity, organization_id, created_at')
          .in('organization_id', otherOrgIds.slice(0, 3))
          .order('created_at', { ascending: false })
          .limit(5);
        otherOrgSamples = otherSamples || [];
      }

      // 6. Check recent import jobs
      const { data: recentJobs } = await supabase
        .from('scheduled_jobs')
        .select('*')
        .eq('data_type', 'inventory')
        .order('created_at', { ascending: false })
        .limit(10);

      const result = {
        user: {
          email: profile.email,
          orgId: userOrgId,
          role: profile.role,
          userId: user.id,
        },
        counts: {
          totalInDatabase: totalCount || 0,
          inUserOrg: userOrgCount || 0,
          withNullOrg: nullOrgCount || 0,
          inOtherOrgs: (totalCount || 0) - (userOrgCount || 0) - (nullOrgCount || 0),
        },
        orgBreakdown,
        samples: {
          userOrg: userOrgSamples || [],
          nullOrg: nullOrgSamples || [],
          otherOrgs: otherOrgSamples,
        },
        recentJobs: recentJobs || [],
        diagnosis: getDiagnosis(totalCount || 0, userOrgCount || 0, nullOrgCount || 0, orgBreakdown, userOrgId),
      };

      console.log('✅ Diagnostic complete:', JSON.stringify(result.counts));
      console.log('🩺 Diagnosis:', result.diagnosis);

      return c.json(result);

    } catch (error: any) {
      console.error('❌ Diagnostic error:', error);
      return c.json({ error: 'Internal server error', message: error.message }, 500);
    }
  });

  // Fix: Reassign items with wrong/null organization_id to user's org
  app.post('/inventory-diagnostic/fix-org-ids', async (c) => {
    console.log('🔧 Fix org IDs endpoint hit');

    try {
      const authHeader = c.req.header('Authorization');
      if (!authHeader) {
        return c.json({ error: 'No authorization header' }, 401);
      }

      const accessToken = authHeader.split(' ')[1];
      const body = await c.req.json();
      const { fixType, targetOrgId, sourceOrgId } = body;

      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );

      // Verify user
      const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
      if (authError || !user) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      // Get user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, organization_id, role')
        .eq('id', user.id)
        .single();

      if (!profile) {
        return c.json({ error: 'Profile not found' }, 404);
      }

      const userOrgId = targetOrgId || profile.organization_id;
      let updatedCount = 0;

      if (fixType === 'null_to_user') {
        console.log('🔧 Fixing NULL org items -> ', userOrgId);

        let hasMore = true;
        while (hasMore) {
          const { data: batch, error: batchError } = await supabase
            .from('inventory')
            .select('id')
            .is('organization_id', null)
            .limit(1000);

          if (batchError) {
            console.error('Batch fetch error:', batchError);
            break;
          }

          if (!batch || batch.length === 0) {
            hasMore = false;
            break;
          }

          const ids = batch.map((item: any) => item.id);
          const { error: updateError } = await supabase
            .from('inventory')
            .update({ organization_id: userOrgId })
            .in('id', ids);

          if (updateError) {
            console.error('Batch update error:', updateError);
            break;
          }

          updatedCount += ids.length;
          console.log(`📦 Updated batch: ${ids.length} items (total: ${updatedCount})`);

          if (batch.length < 1000) {
            hasMore = false;
          }
        }

      } else if (fixType === 'other_to_user' && sourceOrgId) {
        console.log(`🔧 Fixing items from org ${sourceOrgId} -> ${userOrgId}`);

        let hasMore = true;
        while (hasMore) {
          const { data: batch } = await supabase
            .from('inventory')
            .select('id')
            .eq('organization_id', sourceOrgId)
            .limit(1000);

          if (!batch || batch.length === 0) {
            hasMore = false;
            break;
          }

          const ids = batch.map((item: any) => item.id);
          const { error: updateError } = await supabase
            .from('inventory')
            .update({ organization_id: userOrgId })
            .in('id', ids);

          if (updateError) {
            console.error('Batch update error:', updateError);
            break;
          }

          updatedCount += ids.length;
          console.log(`📦 Updated batch: ${ids.length} items (total: ${updatedCount})`);

          if (batch.length < 1000) {
            hasMore = false;
          }
        }

      } else if (fixType === 'all_to_user') {
        console.log(`🔧 Fixing ALL items -> ${userOrgId}`);

        // First fix null org items
        let hasMore = true;
        while (hasMore) {
          const { data: batch } = await supabase
            .from('inventory')
            .select('id')
            .is('organization_id', null)
            .limit(1000);

          if (!batch || batch.length === 0) {
            hasMore = false;
            break;
          }

          const ids = batch.map((item: any) => item.id);
          await supabase
            .from('inventory')
            .update({ organization_id: userOrgId })
            .in('id', ids);

          updatedCount += ids.length;
          if (batch.length < 1000) hasMore = false;
        }

        // Then fix items in other orgs
        hasMore = true;
        while (hasMore) {
          const { data: batch } = await supabase
            .from('inventory')
            .select('id')
            .neq('organization_id', userOrgId)
            .limit(1000);

          if (!batch || batch.length === 0) {
            hasMore = false;
            break;
          }

          const ids = batch.map((item: any) => item.id);
          await supabase
            .from('inventory')
            .update({ organization_id: userOrgId })
            .in('id', ids);

          updatedCount += ids.length;
          console.log(`📦 Updated batch: ${ids.length} items (total: ${updatedCount})`);

          if (batch.length < 1000) hasMore = false;
        }
      }

      console.log(`✅ Fix complete: ${updatedCount} items updated`);

      return c.json({
        success: true,
        updatedCount,
        targetOrgId: userOrgId,
      });

    } catch (error: any) {
      console.error('❌ Fix error:', error);
      return c.json({ error: 'Internal server error', message: error.message }, 500);
    }
  });
}

function getDiagnosis(
  total: number,
  inUserOrg: number,
  withNullOrg: number,
  orgBreakdown: { org_id: string; count: number; is_user_org: boolean }[],
  userOrgId: string
): { issue: string; severity: 'none' | 'warning' | 'critical'; recommendation: string } {

  if (total === 0) {
    return {
      issue: 'No inventory items found in the database at all.',
      severity: 'critical',
      recommendation: 'The import may have failed entirely. Try re-importing your data.',
    };
  }

  if (inUserOrg === total && withNullOrg === 0) {
    return {
      issue: 'All items are correctly assigned to your organization.',
      severity: 'none',
      recommendation: 'Everything looks good! If items still don\'t show, check the Inventory page pagination/filters.',
    };
  }

  if (inUserOrg === 0 && withNullOrg > 0 && withNullOrg === total) {
    return {
      issue: `All ${total.toLocaleString()} items have NULL organization_id.`,
      severity: 'critical',
      recommendation: 'Items were imported without an organization_id. Click "Fix: Assign Orphaned Items" to assign them to your organization.',
    };
  }

  if (inUserOrg === 0 && withNullOrg === 0) {
    const otherOrgs = orgBreakdown.filter(o => !o.is_user_org);
    if (otherOrgs.length > 0) {
      const otherTotal = otherOrgs.reduce((sum, o) => sum + o.count, 0);
      return {
        issue: `All ${otherTotal.toLocaleString()} items are assigned to a different organization ID.`,
        severity: 'critical',
        recommendation: 'Items were imported under a different organization. Click "Fix: Reassign All Items" to move them to your organization.',
      };
    }
  }

  if (inUserOrg > 0 && withNullOrg > 0) {
    return {
      issue: `${inUserOrg.toLocaleString()} items are in your org, but ${withNullOrg.toLocaleString()} have no organization assigned.`,
      severity: 'warning',
      recommendation: 'Some items are orphaned. Click "Fix: Assign Orphaned Items" to claim them.',
    };
  }

  if (inUserOrg > 0 && inUserOrg < total) {
    const missing = total - inUserOrg;
    return {
      issue: `Only ${inUserOrg.toLocaleString()} of ${total.toLocaleString()} items are in your organization. ${missing.toLocaleString()} items are elsewhere.`,
      severity: 'warning',
      recommendation: 'Some items are assigned to other organizations or have no org. Review the breakdown and fix as needed.',
    };
  }

  return {
    issue: 'Unable to determine specific issue.',
    severity: 'warning',
    recommendation: 'Review the detailed counts and org breakdown below.',
  };
}
