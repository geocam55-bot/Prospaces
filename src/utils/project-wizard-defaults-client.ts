import { createClient } from './supabase/client';
import { ensureUserProfile } from './ensure-profile';

export interface ProjectWizardDefault {
  id?: string;
  organization_id: string;
  planner_type: 'deck' | 'garage' | 'shed' | 'roof';
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
      console.warn('[project-wizard-defaults] ⚠️ User not authenticated, cannot upsert');
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
 * If itemIds is provided, only fetch those specific items
 */
export async function getInventoryItemsForDropdown(organizationId: string, itemIds?: string[]): Promise<InventoryItem[]> {
  console.log('[project-wizard-defaults] 📊 Fetching inventory items for org:', organizationId, itemIds ? `(${itemIds.length} specific items)` : '(all items)');
  
  try {
    const supabase = createClient();
    
    // Try to get user, with fallback to session
    let authUser;
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      // Fallback: check if there's a session
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        authUser = session.user;
        console.log('[project-wizard-defaults] ✅ Using session user for inventory (getUser failed)');
      } else {
        console.warn('[project-wizard-defaults] ⚠️ User not authenticated, returning empty inventory');
        return [];
      }
    } else {
      authUser = user;
    }

    // If specific item IDs are provided, fetch only those items
    if (itemIds && itemIds.length > 0) {
      console.log('[project-wizard-defaults] 🎯 Fetching specific items:', itemIds.length);
      
      const { data, error } = await supabase
        .from('inventory')
        .select('id, name, sku, category, description')
        .eq('organization_id', organizationId)
        .in('id', itemIds);

      if (error) {
        if (error.code === 'PGRST205' || error.code === '42P01') {
          console.warn('[project-wizard-defaults] ⚠️ inventory table does not exist.');
          return [];
        }
        console.error('[project-wizard-defaults] ❌ Error fetching inventory items:', error);
        return [];
      }

      console.log('[project-wizard-defaults] ✅ Fetched', data?.length || 0, 'specific items');
      return data || [];
    }

    // Otherwise, fetch ALL items using pagination
    console.log('[project-wizard-defaults] 🔄 Fetching all inventory items (may take a moment)...');
    
    let allItems: InventoryItem[] = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;
    
    while (hasMore) {
      const { data, error } = await supabase
        .from('inventory')
        .select('id, name, sku, category, description')
        .eq('organization_id', organizationId)
        .order('name', { ascending: true })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (error) {
        if (error.code === 'PGRST205' || error.code === '42P01') {
          console.warn('[project-wizard-defaults] ⚠️ inventory table does not exist.');
          return [];
        }
        console.error('[project-wizard-defaults] ❌ Error fetching inventory items:', error);
        return allItems; // Return what we have so far
      }

      if (data && data.length > 0) {
        allItems = [...allItems, ...data];
        console.log('[project-wizard-defaults] 📦 Fetched page', page + 1, '- Total items:', allItems.length);
        
        // If we got less than pageSize, we've reached the end
        if (data.length < pageSize) {
          hasMore = false;
        } else {
          page++;
        }
      } else {
        hasMore = false;
      }
    }

    console.log('[project-wizard-defaults] ✅ Fetched all', allItems.length, 'items');
    return allItems;
  } catch (error) {
    console.error('[project-wizard-defaults] ❌ Unexpected error fetching inventory items:', error);
    return [];
  }
}