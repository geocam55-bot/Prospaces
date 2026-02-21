import { createClient } from './supabase/client';
import { ensureUserProfile } from './ensure-profile';
import { projectId, publicAnonKey } from './supabase/info';
import { getServerHeaders } from './server-headers';

export interface ProjectWizardDefault {
  id?: string;
  organization_id: string;
  planner_type: 'deck' | 'garage' | 'shed' | 'roof' | 'kitchen';
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
 * Get all project wizard defaults for an organization (organization-level only)
 * User-specific defaults are stored in localStorage
 * @param organizationId - The organization ID
 */
export async function getProjectWizardDefaults(organizationId: string): Promise<ProjectWizardDefault[]> {
  console.log('[project-wizard-defaults] 📊 Fetching org defaults for:', organizationId);
  
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.warn('[project-wizard-defaults] ⚠️ User not authenticated, returning empty defaults');
      return [];
    }

    // Get organization-level defaults only
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
    return data || [];
  } catch (error) {
    console.error('[project-wizard-defaults] ❌ Unexpected error fetching defaults:', error);
    return [];
  }
}

/**
 * Get user-specific defaults from database
 */
export async function getUserDefaults(userId: string, organizationId: string): Promise<Record<string, string>> {
  console.log('[project-wizard-defaults] 📊 Fetching user defaults for:', { userId, organizationId });
  
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      console.warn('[project-wizard-defaults] ⚠️ No session, returning empty user defaults');
      return {};
    }

    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/server/make-server-8405be07/user-planner-defaults/${organizationId}/${userId}`,
      {
        method: 'GET',
        headers: await getServerHeaders(),
      }
    );

    if (!response.ok) {
      if (response.status === 404 || response.status === 500) {
        // No defaults found, return empty object
        console.log('[project-wizard-defaults] ℹ️ No user defaults found (or error), returning empty object');
        return {};
      }
      console.error('[project-wizard-defaults] ❌ Error fetching user defaults:', response.statusText);
      return {};
    }

    const data = await response.json();
    console.log('[project-wizard-defaults] ✅ User defaults fetched successfully:', Object.keys(data.defaults || {}).length, 'items');
    return data.defaults || {};
  } catch (error) {
    console.error('[project-wizard-defaults] ❌ Unexpected error loading user defaults:', error);
    return {};
  }
}

/**
 * Save user-specific defaults to database
 */
export async function saveUserDefaults(userId: string, organizationId: string, defaults: Record<string, string>): Promise<boolean> {
  console.log('[project-wizard-defaults] 💾 Saving user defaults:', { userId, organizationId, defaultsCount: Object.keys(defaults).length });
  
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      console.warn('[project-wizard-defaults] ⚠️ No session, cannot save user defaults');
      return false;
    }

    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/server/make-server-8405be07/user-planner-defaults/${organizationId}/${userId}`,
      {
        method: 'POST',
        headers: await getServerHeaders(),
        body: JSON.stringify({ defaults }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[project-wizard-defaults] ❌ Error saving user defaults:', errorData);
      return false;
    }

    console.log('[project-wizard-defaults] ✅ User defaults saved successfully');
    return true;
  } catch (error) {
    console.error('[project-wizard-defaults] ❌ Unexpected error saving user defaults:', error);
    return false;
  }
}

/**
 * Delete user-specific defaults from database (restore to org defaults)
 */
export async function deleteUserDefaults(userId: string, organizationId: string): Promise<boolean> {
  console.log('[project-wizard-defaults] 🗑️ Deleting user defaults:', { userId, organizationId });
  
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      console.warn('[project-wizard-defaults] ⚠️ No session, cannot delete user defaults');
      return false;
    }

    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/server/make-server-8405be07/user-planner-defaults/${organizationId}/${userId}`,
      {
        method: 'DELETE',
        headers: await getServerHeaders(),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[project-wizard-defaults] ❌ Error deleting user defaults:', errorData);
      return false;
    }

    console.log('[project-wizard-defaults] ✅ User defaults deleted successfully');
    return true;
  } catch (error) {
    console.error('[project-wizard-defaults] ❌ Unexpected error deleting user defaults:', error);
    return false;
  }
}

/**
 * Migrate user defaults from localStorage to database
 * This should be called once to migrate existing localStorage data
 */
export async function migrateUserDefaultsFromLocalStorage(userId: string, organizationId: string): Promise<boolean> {
  console.log('[project-wizard-defaults] 🔄 Starting migration from localStorage to database');
  
  try {
    // Check if there's data in localStorage
    const key = `planner_defaults_${organizationId}_${userId}`;
    const stored = localStorage.getItem(key);
    
    if (!stored) {
      console.log('[project-wizard-defaults] ℹ️ No localStorage data to migrate');
      return true; // Nothing to migrate, but not an error
    }
    
    const localDefaults = JSON.parse(stored);
    const itemCount = Object.keys(localDefaults).length;
    
    if (itemCount === 0) {
      console.log('[project-wizard-defaults] ℹ️ localStorage data is empty, nothing to migrate');
      // Clean up empty localStorage entry
      localStorage.removeItem(key);
      return true;
    }
    
    console.log('[project-wizard-defaults] 📦 Found', itemCount, 'items in localStorage to migrate');
    
    // Check if database already has data
    const existingDefaults = await getUserDefaults(userId, organizationId);
    
    if (Object.keys(existingDefaults).length > 0) {
      console.log('[project-wizard-defaults] ℹ️ Database already has user defaults, skipping migration');
      // Optionally clean up localStorage since data is already in DB
      localStorage.removeItem(key);
      return true;
    }
    
    // Migrate the data
    const success = await saveUserDefaults(userId, organizationId, localDefaults);
    
    if (success) {
      console.log('[project-wizard-defaults] ✅ Migration successful, cleaning up localStorage');
      // Clean up localStorage after successful migration
      localStorage.removeItem(key);
      return true;
    } else {
      console.error('[project-wizard-defaults] ❌ Migration failed, keeping localStorage data');
      return false;
    }
  } catch (error) {
    console.error('[project-wizard-defaults] ❌ Error during migration:', error);
    return false;
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