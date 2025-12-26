import { createClient } from './supabase/client';
import { ensureUserProfile } from './ensure-profile';

export interface ProjectWizardDefault {
  id?: string;
  organization_id: string;
  planner_type: 'deck' | 'garage' | 'shed';
  material_type?: string; // For deck: 'spruce', 'treated', 'composite', 'cedar'
  material_category: string; // e.g., 'decking', 'joists', 'posts', etc.
  inventory_item_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  description: string;
}

/**
 * Get all project wizard defaults for an organization
 */
export async function getProjectWizardDefaults(organizationId: string): Promise<ProjectWizardDefault[]> {
  console.log('[project-wizard-defaults] 📊 Fetching defaults for org:', organizationId);
  
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.warn('[project-wizard-defaults] ⚠️ User not authenticated, returning empty defaults');
      return [];
    }

    const { data, error } = await supabase
      .from('project_wizard_defaults')
      .select('*')
      .eq('organization_id', organizationId);

    if (error) {
      if (error.code === 'PGRST205' || error.code === '42P01') {
        console.warn('[project-wizard-defaults] ⚠️ project_wizard_defaults table does not exist. Please run the SQL setup script.');
        return [];
      }
      console.error('[project-wizard-defaults] ❌ Error fetching defaults:', error);
      return [];
    }

    console.log('[project-wizard-defaults] ✅ Defaults fetched successfully:', data?.length || 0, 'records');
    console.log('[project-wizard-defaults] 📋 Default records:', data);
    return data || [];
  } catch (error) {
    console.error('[project-wizard-defaults] ❌ Unexpected error fetching defaults:', error);
    return [];
  }
}

/**
 * Upsert a project wizard default
 */
export async function upsertProjectWizardDefault(defaultConfig: ProjectWizardDefault): Promise<ProjectWizardDefault | null> {
  console.log('[project-wizard-defaults] 💾 Upserting default:', defaultConfig);
  
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error('[project-wizard-defaults] ❌ User not authenticated, cannot upsert');
      return null;
    }

    console.log('[project-wizard-defaults] 👤 User authenticated:', user.id);

    const { data, error } = await supabase
      .from('project_wizard_defaults')
      .upsert({
        ...defaultConfig,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'organization_id,planner_type,material_type,material_category',
        ignoreDuplicates: false
      })
      .select()
      .single();

    if (error) {
      console.error('[project-wizard-defaults] ❌ Supabase error details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });

      if (error.code === 'PGRST205' || error.code === '42P01') {
        console.warn('[project-wizard-defaults] ⚠️ project_wizard_defaults table does not exist. Please run the SQL setup script.');
        return null;
      }
      if (error.code === '42501') {
        console.error('[project-wizard-defaults] ❌ RLS policy violation - user does not have permission to upsert');
        return null;
      }
      console.error('[project-wizard-defaults] ❌ Error upserting default:', error);
      return null;
    }

    console.log('[project-wizard-defaults] ✅ Default saved successfully:', data);
    return data;
  } catch (error) {
    console.error('[project-wizard-defaults] ❌ Unexpected error upserting default:', error);
    return null;
  }
}

/**
 * Delete a project wizard default
 */
export async function deleteProjectWizardDefault(id: string): Promise<boolean> {
  console.log('[project-wizard-defaults] 🗑️ Deleting default:', id);
  
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.warn('[project-wizard-defaults] ⚠️ User not authenticated, cannot delete');
      return false;
    }

    const { error } = await supabase
      .from('project_wizard_defaults')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[project-wizard-defaults] ❌ Error deleting default:', error);
      return false;
    }

    console.log('[project-wizard-defaults] ✅ Default deleted successfully');
    return true;
  } catch (error) {
    console.error('[project-wizard-defaults] ❌ Unexpected error deleting default:', error);
    return false;
  }
}

/**
 * Get inventory items for dropdown (limited fields)
 */
export async function getInventoryItemsForDropdown(organizationId: string): Promise<InventoryItem[]> {
  console.log('[project-wizard-defaults] 📊 Fetching inventory items for org:', organizationId);
  
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.warn('[project-wizard-defaults] ⚠️ User not authenticated, returning empty inventory');
      return [];
    }

    // ✅ CRITICAL FIX: Load ALL items by fetching in batches (Supabase has a hard 1000 row limit per query)
    // We'll fetch 1000 items at a time to handle 14k+ SKUs
    console.log('[project-wizard-defaults] 🔄 Fetching inventory in batches...');
    
    const allData: InventoryItem[] = [];
    let offset = 0;
    const batchSize = 1000;
    let hasMore = true;
    
    while (hasMore) {
      const { data, error } = await supabase
        .from('inventory')
        .select('id, name, sku, category, description')
        .eq('organization_id', organizationId)
        .order('name', { ascending: true })
        .range(offset, offset + batchSize - 1);

      if (error) {
        if (error.code === 'PGRST205' || error.code === '42P01') {
          console.warn('[project-wizard-defaults] ⚠️ inventory table does not exist.');
          return [];
        }
        console.error('[project-wizard-defaults] ❌ Error fetching inventory items:', error);
        return [];
      }

      if (data && data.length > 0) {
        allData.push(...data);
        console.log(`[project-wizard-defaults] 📦 Fetched batch: ${data.length} items (total so far: ${allData.length})`);
        
        // If we got fewer items than batchSize, we've reached the end
        if (data.length < batchSize) {
          hasMore = false;
        } else {
          offset += batchSize;
        }
      } else {
        hasMore = false;
      }
    }

    console.log('[project-wizard-defaults] ✅ Total inventory items fetched:', allData.length);
    return allData;
  } catch (error) {
    console.error('[project-wizard-defaults] ❌ Unexpected error fetching inventory items:', error);
    return [];
  }
}