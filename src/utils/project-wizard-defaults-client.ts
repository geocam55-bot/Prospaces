import { createClient } from './supabase/client';
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
 * Routes through the Edge Function server to bypass RLS.
 * @param organizationId - The organization ID
 */
export async function getProjectWizardDefaults(organizationId: string): Promise<ProjectWizardDefault[]> {
  console.log('[project-wizard-defaults] 📊 Fetching org defaults via server for:', organizationId);
  
  try {
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-8405be07/project-wizard-defaults?organization_id=${encodeURIComponent(organizationId)}`,
      {
        method: 'GET',
        headers: await getServerHeaders(),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      console.error('[project-wizard-defaults] ❌ Server error fetching defaults:', errorData);
      return [];
    }

    const result = await response.json();
    console.log('[project-wizard-defaults] ✅ Defaults fetched successfully:', result.defaults?.length || 0, 'records');
    return result.defaults || [];
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
      `https://${projectId}.supabase.co/functions/v1/make-server-8405be07/user-planner-defaults/${organizationId}/${userId}`,
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
      `https://${projectId}.supabase.co/functions/v1/make-server-8405be07/user-planner-defaults/${organizationId}/${userId}`,
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
      `https://${projectId}.supabase.co/functions/v1/make-server-8405be07/user-planner-defaults/${organizationId}/${userId}`,
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
 * Upsert a project wizard default via the server (bypasses RLS)
 */
export async function upsertProjectWizardDefault(defaultConfig: ProjectWizardDefault): Promise<ProjectWizardDefault | null> {
  console.log('[project-wizard-defaults] 💾 Upserting default via server:', defaultConfig);
  
  try {
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-8405be07/project-wizard-defaults`,
      {
        method: 'POST',
        headers: await getServerHeaders(),
        body: JSON.stringify(defaultConfig),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      console.error('[project-wizard-defaults] ❌ Server error upserting default:', errorData);
      return null;
    }

    const result = await response.json();
    console.log('[project-wizard-defaults] ✅ Default saved successfully via server');
    return result.default || null;
  } catch (error) {
    console.error('[project-wizard-defaults] ❌ Unexpected error upserting default:', error);
    return null;
  }
}

/**
 * Batch upsert project wizard defaults via the server (bypasses RLS)
 * More efficient than calling upsertProjectWizardDefault individually.
 */
export async function batchUpsertProjectWizardDefaults(defaults: ProjectWizardDefault[]): Promise<{ savedCount: number; success: boolean }> {
  console.log('[project-wizard-defaults] 💾 Batch upserting', defaults.length, 'defaults via server');
  
  try {
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-8405be07/project-wizard-defaults/batch`,
      {
        method: 'POST',
        headers: await getServerHeaders(),
        body: JSON.stringify({ defaults }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      console.error('[project-wizard-defaults] ❌ Server error in batch upsert:', errorData);
      return { savedCount: 0, success: false };
    }

    const result = await response.json();
    console.log('[project-wizard-defaults] ✅ Batch saved', result.savedCount, 'defaults via server');
    return { savedCount: result.savedCount || 0, success: true };
  } catch (error) {
    console.error('[project-wizard-defaults] ❌ Unexpected error in batch upsert:', error);
    return { savedCount: 0, success: false };
  }
}

/**
 * Delete a project wizard default via the server (bypasses RLS)
 */
export async function deleteProjectWizardDefault(id: string): Promise<boolean> {
  console.log('[project-wizard-defaults] 🗑️ Deleting default via server:', id);
  
  try {
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-8405be07/project-wizard-defaults/${encodeURIComponent(id)}`,
      {
        method: 'DELETE',
        headers: await getServerHeaders(),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      console.error('[project-wizard-defaults] ❌ Server error deleting default:', errorData);
      return false;
    }

    console.log('[project-wizard-defaults] ✅ Default deleted successfully via server');
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

/**
 * Extract conversion factors from user defaults for a given planner type.
 * CF entries are stored with `-cf` suffix keys (e.g., "deck-treated-Deck Screws-cf": "10").
 * Returns a map of lowercased category name -> numeric conversion factor.
 */
export function extractConversionFactors(
  userDefaults: Record<string, string>,
  plannerType: string,
  materialType?: string
): Record<string, number> {
  const cfMap: Record<string, number> = {};
  // Lowercase the prefix so 'Treated' matches 'treated', etc.
  const prefix = `${plannerType}-${(materialType || 'default').toLowerCase()}-`;

  Object.entries(userDefaults).forEach(([key, value]) => {
    if (key.toLowerCase().startsWith(prefix) && key.endsWith('-cf')) {
      // Extract category name: remove prefix and '-cf' suffix
      const categoryName = key.slice(prefix.length, -3); // remove prefix and "-cf"
      const numVal = parseFloat(value);
      if (!isNaN(numVal) && numVal > 0 && numVal !== 1) {
        cfMap[categoryName.toLowerCase()] = numVal;
      }
    }
  });

  console.log('[project-wizard-defaults] 📐 Extracted conversion factors:', cfMap);
  return cfMap;
}

/**
 * Get org-level conversion factors from the server (KV-backed).
 */
export async function getOrgConversionFactors(organizationId: string): Promise<Record<string, string>> {
  console.log('[project-wizard-defaults] 📐 Fetching org conversion factors for:', organizationId);

  try {
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-8405be07/org-conversion-factors/${encodeURIComponent(organizationId)}`,
      {
        method: 'GET',
        headers: await getServerHeaders(),
      }
    );

    if (!response.ok) {
      console.error('[project-wizard-defaults] ❌ Error fetching org CFs:', response.statusText);
      return {};
    }

    const data = await response.json();
    console.log('[project-wizard-defaults] ✅ Org CFs fetched:', Object.keys(data.conversionFactors || {}).length, 'entries');
    return data.conversionFactors || {};
  } catch (error) {
    console.error('[project-wizard-defaults] ❌ Unexpected error fetching org CFs:', error);
    return {};
  }
}

/**
 * Save org-level conversion factors to the server (KV-backed).
 */
export async function saveOrgConversionFactors(organizationId: string, conversionFactors: Record<string, string>): Promise<boolean> {
  console.log('[project-wizard-defaults] 💾 Saving org conversion factors:', Object.keys(conversionFactors).length, 'entries');

  try {
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-8405be07/org-conversion-factors/${encodeURIComponent(organizationId)}`,
      {
        method: 'POST',
        headers: await getServerHeaders(),
        body: JSON.stringify({ conversionFactors }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      console.error('[project-wizard-defaults] ❌ Error saving org CFs:', errorData);
      return false;
    }

    console.log('[project-wizard-defaults] ✅ Org CFs saved successfully');
    return true;
  } catch (error) {
    console.error('[project-wizard-defaults] ❌ Unexpected error saving org CFs:', error);
    return false;
  }
}

/**
 * Extract org-level conversion factors for a specific planner type from the flat map.
 * Org CFs are stored as "plannerType-materialType-categoryName": "value".
 * Returns a map of lowercased category name -> numeric conversion factor.
 */
export function extractOrgConversionFactors(
  orgCFs: Record<string, string>,
  plannerType: string,
  materialType?: string
): Record<string, number> {
  const cfMap: Record<string, number> = {};
  // Lowercase the prefix so 'Treated' matches 'treated', etc.
  const prefix = `${plannerType}-${(materialType || 'default').toLowerCase()}-`;

  Object.entries(orgCFs).forEach(([key, value]) => {
    if (key.toLowerCase().startsWith(prefix)) {
      const categoryName = key.slice(prefix.length);
      const numVal = parseFloat(value);
      if (!isNaN(numVal) && numVal > 0 && numVal !== 1) {
        cfMap[categoryName.toLowerCase()] = numVal;
      }
    }
  });

  return cfMap;
}