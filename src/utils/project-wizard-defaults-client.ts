import { createClient } from './supabase/client';
import { projectId, publicAnonKey } from './supabase/info';
import { getServerHeaders } from './server-headers';

export interface ProjectWizardDefault {
  id?: string;
  organization_id: string;
  planner_type: 'deck' | 'garage' | 'shed' | 'roof' | 'kitchen' | 'finishing';
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

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

function getPlannerDefaultsStorageKey(organizationId: string, userId: string): string {
  return `planner_defaults_${organizationId}_${userId}`;
}

function readPlannerDefaultsFromLocalStorage(organizationId: string, userId: string): Record<string, string> {
  try {
    const key = getPlannerDefaultsStorageKey(organizationId, userId);
    const raw = localStorage.getItem(key);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writePlannerDefaultsToLocalStorage(organizationId: string, userId: string, defaults: Record<string, string>): void {
  try {
    const key = getPlannerDefaultsStorageKey(organizationId, userId);
    localStorage.setItem(key, JSON.stringify(defaults));
  } catch {
    // best-effort cache only
  }
}

/**
 * Get all project wizard defaults for an organization (organization-level only)
 * Routes through the Edge Function server to bypass RLS.
 * @param organizationId - The organization ID
 */
export async function getProjectWizardDefaults(organizationId: string): Promise<ProjectWizardDefault[]> {
  // Fetching org defaults via server
  
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
      // Server error fetching defaults
      return [];
    }

    const result = await response.json();
    // Defaults fetched successfully
    return result.defaults || [];
  } catch (error) {
    // Unexpected error fetching defaults
    return [];
  }
}

/**
 * Get user-specific defaults from database
 */
export async function getUserDefaults(userId: string, organizationId: string): Promise<Record<string, string>> {
  // Fetching user defaults
  
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      // No session, fall back to local cache
      return readPlannerDefaultsFromLocalStorage(organizationId, userId);
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
        // Server has no defaults (or not reachable); use local cache fallback
        return readPlannerDefaultsFromLocalStorage(organizationId, userId);
      }
      // Error fetching user defaults
      return readPlannerDefaultsFromLocalStorage(organizationId, userId);
    }

    const data = await response.json();
    // User defaults fetched successfully
    const defaults = data.defaults || {};
    writePlannerDefaultsToLocalStorage(organizationId, userId, defaults);
    return defaults;
  } catch (error) {
    // Unexpected error loading user defaults
    return readPlannerDefaultsFromLocalStorage(organizationId, userId);
  }
}

/**
 * Save user-specific defaults to database
 */
export async function saveUserDefaults(userId: string, organizationId: string, defaults: Record<string, string>): Promise<boolean> {
  // Saving user defaults

  // Keep a local cache so planner pricing can still resolve defaults if API read fails.
  writePlannerDefaultsToLocalStorage(organizationId, userId, defaults);
  
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      // No session, cannot save user defaults
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
      // Error saving user defaults
      return false;
    }

    // User defaults saved successfully
    return true;
  } catch (error) {
    // Unexpected error saving user defaults
    return false;
  }
}

/**
 * Delete user-specific defaults from database (restore to org defaults)
 */
export async function deleteUserDefaults(userId: string, organizationId: string): Promise<boolean> {
  // Deleting user defaults
  
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      // No session, cannot delete user defaults
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
      // Error deleting user defaults
      return false;
    }

    // User defaults deleted successfully
    try {
      localStorage.removeItem(getPlannerDefaultsStorageKey(organizationId, userId));
    } catch {
      // ignore cache cleanup errors
    }
    return true;
  } catch (error) {
    // Unexpected error deleting user defaults
    return false;
  }
}

/**
 * Migrate user defaults from localStorage to database
 * This should be called once to migrate existing localStorage data
 */
export async function migrateUserDefaultsFromLocalStorage(userId: string, organizationId: string): Promise<boolean> {
  // Starting migration from localStorage to database
  
  try {
    // Check if there's data in localStorage
    const key = `planner_defaults_${organizationId}_${userId}`;
    const stored = localStorage.getItem(key);
    
    if (!stored) {
      // No localStorage data to migrate
      return true; // Nothing to migrate, but not an error
    }
    
    const localDefaults = JSON.parse(stored);
    const itemCount = Object.keys(localDefaults).length;
    
    if (itemCount === 0) {
      // localStorage data is empty, nothing to migrate
      // Clean up empty localStorage entry
      localStorage.removeItem(key);
      return true;
    }
    
    // Found items in localStorage to migrate
    
    // Check if database already has data
    const existingDefaults = await getUserDefaults(userId, organizationId);
    
    if (Object.keys(existingDefaults).length > 0) {
      // Database already has user defaults, skipping migration
      // Optionally clean up localStorage since data is already in DB
      localStorage.removeItem(key);
      return true;
    }
    
    // Migrate the data
    const success = await saveUserDefaults(userId, organizationId, localDefaults);
    
    if (success) {
      // Migration successful, cleaning up localStorage
      localStorage.removeItem(key);
      return true;
    } else {
      // Migration failed, keeping localStorage data
      return false;
    }
  } catch (error) {
    // Error during migration
    return false;
  }
}

/**
 * Upsert a project wizard default via the server (bypasses RLS)
 */
export async function upsertProjectWizardDefault(defaultConfig: ProjectWizardDefault): Promise<ProjectWizardDefault | null> {
  // Upserting default via server
  
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
      // Server error upserting default
      return null;
    }

    const result = await response.json();
    // Default saved successfully via server
    return result.default || null;
  } catch (error) {
    // Unexpected error upserting default
    return null;
  }
}

/**
 * Batch upsert project wizard defaults via the server (bypasses RLS)
 * More efficient than calling upsertProjectWizardDefault individually.
 */
export async function batchUpsertProjectWizardDefaults(defaults: ProjectWizardDefault[]): Promise<{ savedCount: number; success: boolean }> {
  // Batch upserting defaults via server
  
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
      // Server error in batch upsert
      return { savedCount: 0, success: false };
    }

    const result = await response.json();
    // Batch saved defaults via server
    return { savedCount: result.savedCount || 0, success: true };
  } catch (error) {
    // Unexpected error in batch upsert
    return { savedCount: 0, success: false };
  }
}

/**
 * Delete a project wizard default via the server (bypasses RLS)
 */
export async function deleteProjectWizardDefault(id: string): Promise<boolean> {
  // Deleting default via server
  
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
      // Server error deleting default
      return false;
    }

    // Default deleted successfully via server
    return true;
  } catch (error) {
    // Unexpected error deleting default
    return false;
  }
}

/**
 * Get inventory items for dropdown (limited fields)
 * If itemIds is provided, only fetch those specific items
 */
export async function getInventoryItemsForDropdown(organizationId: string, itemIds?: string[]): Promise<InventoryItem[]> {
  // Fetching inventory items for organization
  
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
        // Using session user for inventory (getUser failed)
      } else {
        // User not authenticated, returning empty inventory
        return [];
      }
    } else {
      authUser = user;
    }

    // If specific item IDs are provided, fetch only those items
    if (itemIds && itemIds.length > 0) {
      // Fetching specific items

      // Large id lists can exceed URL/query limits in PostgREST.
      // Query in chunks and merge results.
      const uniqueIds = Array.from(new Set(itemIds.filter(Boolean)));
      const idChunks = chunkArray(uniqueIds, 50);
      let allMatchedItems: InventoryItem[] = [];

      for (const idChunk of idChunks) {
        const { data, error } = await supabase
          .from('inventory')
          .select('id, name, sku, category, description')
          .eq('organization_id', organizationId)
          .in('id', idChunk);

        if (error) {
          if (error.code === 'PGRST205' || error.code === '42P01') {
            // inventory table does not exist
            return [];
          }
          // Continue; partial data is better than blank UI.
          continue;
        }

        if (data?.length) {
          allMatchedItems = [...allMatchedItems, ...data];
        }
      }

      // Fetched specific items
      return allMatchedItems;
    }

    // Otherwise, fetch ALL items using pagination
    // Fetching all inventory items
    
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
          // inventory table does not exist
          return [];
        }
        // Error fetching inventory items
        return allItems; // Return what we have so far
      }

      if (data && data.length > 0) {
        allItems = [...allItems, ...data];
        // Fetched page of items
        
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

    // Fetched all items
    return allItems;
  } catch (error) {
    // Unexpected error fetching inventory items
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

  // Extracted conversion factors
  return cfMap;
}

/**
 * Get org-level conversion factors from the server (KV-backed).
 */
export async function getOrgConversionFactors(organizationId: string): Promise<Record<string, string>> {
  // Fetching org conversion factors

  try {
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-8405be07/org-conversion-factors/${encodeURIComponent(organizationId)}`,
      {
        method: 'GET',
        headers: await getServerHeaders(),
      }
    );

    if (!response.ok) {
      // Error fetching org CFs
      return {};
    }

    const data = await response.json();
    // Org CFs fetched
    return data.conversionFactors || {};
  } catch (error) {
    // Unexpected error fetching org CFs
    return {};
  }
}

/**
 * Save org-level conversion factors to the server (KV-backed).
 */
export async function saveOrgConversionFactors(organizationId: string, conversionFactors: Record<string, string>): Promise<boolean> {
  // Saving org conversion factors

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
      // Error saving org CFs
      return false;
    }

    // Org CFs saved successfully
    return true;
  } catch (error) {
    // Unexpected error saving org CFs
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
