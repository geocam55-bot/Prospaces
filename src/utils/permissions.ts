import type { UserRole } from '../App';
import { createClient } from './supabase/client';

// Import server connection info for KV-based permission loading
import { projectId, publicAnonKey } from './supabase/info';
import { getServerHeaders } from './server-headers';

const SERVER_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-8405be07`;

export interface Permission {
  visible: boolean;
  add: boolean;
  change: boolean;
  delete: boolean;
}

// Cache for permissions
let permissionsCache: Map<string, Permission> = new Map();

// Listeners for permission updates
let permissionListeners: Array<() => void> = [];

/**
 * Subscribe to permission changes
 */
export function onPermissionsChanged(callback: () => void) {
  permissionListeners.push(callback);
  // Return unsubscribe function
  return () => {
    permissionListeners = permissionListeners.filter(cb => cb !== callback);
  };
}

/**
 * Notify all listeners that permissions have changed
 */
function notifyPermissionsChanged() {
  permissionListeners.forEach(callback => callback());
}

// Canonical list of all modules — used by both Security.tsx defaults and runtime enforcement
export const ALL_MODULES = [
  'dashboard', 'ai-suggestions', 'contacts', 'tasks', 'appointments', 'opportunities',
  'bids', 'quotes', 'notes', 'email', 'marketing', 'inventory',
  'users', 'settings', 'tenants', 'security', 'import-export',
  'documents', 'team-dashboard', 'reports', 'project-wizards', 'admin', 'kitchen-planner'
];

export const ALL_ROLES: UserRole[] = ['super_admin', 'admin', 'director', 'manager', 'marketing', 'designer', 'standard_user'];

/**
 * Get the canonical default permission for a given module + role.
 * This is the single source of truth used by both the runtime cache
 * AND the Security Settings UI when no admin overrides exist.
 */
export function getDefaultPermission(module: string, role: UserRole): Permission {
  if (role === 'super_admin') {
    return { visible: true, add: true, change: true, delete: true };
  }

  if (role === 'admin') {
    if (module === 'tenants') {
      return { visible: false, add: false, change: false, delete: false };
    }
    return {
      visible: true,
      add: true,
      change: true,
      delete: module === 'users' ? false : true,
    };
  }

  if (role === 'director') {
    // Director: Same as Manager for most things, but can VIEW users (read-only)
    if (module === 'tenants' || module === 'security' || module === 'import-export') {
      return { visible: false, add: false, change: false, delete: false };
    }
    if (module === 'users') {
      return { visible: true, add: false, change: false, delete: false };
    }
    if (module === 'settings') {
      return { visible: true, add: false, change: true, delete: false };
    }
    return {
      visible: true,
      add: true,
      change: true,
      delete: module === 'marketing',
    };
  }

  if (role === 'manager') {
    if (module === 'tenants' || module === 'security' || module === 'users' || module === 'import-export') {
      return { visible: false, add: false, change: false, delete: false };
    }
    if (module === 'settings') {
      return { visible: true, add: false, change: true, delete: false };
    }
    return {
      visible: true,
      add: true,
      change: true,
      delete: module === 'marketing',
    };
  }

  if (role === 'marketing') {
    if (module === 'tenants' || module === 'security' || module === 'users' || module === 'settings' || module === 'import-export') {
      return { visible: false, add: false, change: false, delete: false };
    }
    return {
      visible: module !== 'bids' && module !== 'quotes',
      add: module === 'marketing' || module === 'contacts' || module === 'email' || module === 'opportunities',
      change: module === 'marketing' || module === 'contacts' || module === 'email' || module === 'opportunities',
      delete: module === 'marketing',
    };
  }

  if (role === 'designer') {
    // Designer role: Focused on Project Wizards and design tools
    // Admin can enable additional modules via Security Settings
    if (module === 'tenants' || module === 'security' || module === 'users' || module === 'import-export') {
      return { visible: false, add: false, change: false, delete: false };
    }
    if (module === 'dashboard') {
      return { visible: true, add: false, change: false, delete: false };
    }
    if (module === 'project-wizards' || module === 'kitchen-planner') {
      return { visible: true, add: true, change: true, delete: true };
    }
    if (module === 'settings') {
      return { visible: true, add: false, change: true, delete: false };
    }
    // All other modules are hidden by default (admin can enable them)
    return { visible: false, add: false, change: false, delete: false };
  }

  // standard_user — only personal data access
  const isPersonalModule = module === 'contacts' || module === 'tasks' || module === 'notes';
  const canViewModule = module === 'dashboard' || isPersonalModule || module === 'appointments' || module === 'settings';

  if (module === 'tenants' || module === 'security' || module === 'import-export' ||
      module === 'users' || module === 'bids' || module === 'quotes' || module === 'opportunities' ||
      module === 'email' || module === 'marketing' || module === 'inventory' ||
      module === 'admin' || module === 'team-dashboard') {
    return { visible: false, add: false, change: false, delete: false };
  }

  if (module === 'settings') {
    return { visible: true, add: false, change: true, delete: false };
  }

  return {
    visible: canViewModule,
    add: isPersonalModule,
    change: isPersonalModule,
    delete: false,
  };
}

/**
 * Initialize permissions from backend + localStorage overrides
 */
export async function initializePermissions(role: UserRole) {
  // Clear existing permissions first
  permissionsCache.clear();

  try {
    // Step 1: Set canonical defaults for ALL roles (needed for admin lookups across roles)
    ALL_MODULES.forEach(module => {
      ALL_ROLES.forEach(r => {
        const key = `${module}:${r}`;
        permissionsCache.set(key, getDefaultPermission(module, r));
      });
    });

    // Step 2: Apply localStorage overrides (saved by Security Settings UI)
    loadFromLocalStorage();

    // Step 3: Try to fetch from server KV store as the authoritative source (non-blocking)
    const orgId = localStorage.getItem('currentOrgId') || 'org_001';

    const headers = await getServerHeaders();

    // If there's no user token, skip the server fetch — it will 401 anyway
    if (!headers['X-User-Token']) {
      // No user token available yet, using defaults + localStorage (skipping server fetch)
      return;
    }

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Permissions fetch timeout')), 3000)
    );

    try {
      const res = await Promise.race([
        fetch(`${SERVER_BASE}/permissions?organization_id=${encodeURIComponent(orgId)}`, {
          headers,
        }),
        timeoutPromise,
      ]);

      if (res.ok) {
        const json = await res.json();
        if (json.permissions && Array.isArray(json.permissions) && json.permissions.length > 0) {
          // Loaded permissions from server (KV store)

          // Apply server permissions as overrides
          let count = 0;
          json.permissions.forEach((perm: any) => {
            if (perm.module && perm.role) {
              const key = `${perm.module}:${perm.role}`;
              permissionsCache.set(key, {
                visible: !!perm.visible,
                add: !!perm.add,
                change: !!perm.change,
                delete: !!perm.delete,
              });
              count++;
            }
          });

          // Sync server data back to localStorage for offline use
          localStorage.setItem(`permissions_${orgId}`, JSON.stringify(json.permissions));
          // Applied permissions from server, synced to localStorage
          notifyPermissionsChanged();
        } else {
          // No permissions found in server KV store, using defaults + localStorage
        }
      } else if (res.status === 401) {
        // Token may be stale — refresh session and retry once
        try {
          const { createClient: createSB } = await import('./supabase/client');
          const sb = createSB();
          const { data: { session: refreshed } } = await sb.auth.refreshSession();
          if (refreshed?.access_token) {
            const retryHeaders = await getServerHeaders();
            const retryRes = await fetch(
              `${SERVER_BASE}/permissions?organization_id=${encodeURIComponent(orgId)}`,
              { headers: retryHeaders }
            );
            if (retryRes.ok) {
              const retryJson = await retryRes.json();
              if (retryJson.permissions && Array.isArray(retryJson.permissions) && retryJson.permissions.length > 0) {
                let count = 0;
                retryJson.permissions.forEach((perm: any) => {
                  if (perm.module && perm.role) {
                    const key = `${perm.module}:${perm.role}`;
                    permissionsCache.set(key, {
                      visible: !!perm.visible,
                      add: !!perm.add,
                      change: !!perm.change,
                      delete: !!perm.delete,
                    });
                    count++;
                  }
                });
                localStorage.setItem(`permissions_${orgId}`, JSON.stringify(retryJson.permissions));
                // Retry succeeded — applied permissions from server
                notifyPermissionsChanged();
              } else {
                // Retry succeeded but no permissions in KV, using defaults + localStorage
              }
            } else {
              // Retry also returned non-200, using defaults + localStorage
            }
          } else {
            // Session refresh returned no token, using defaults + localStorage
          }
        } catch (retryErr: any) {
          // Session refresh/retry failed, using defaults + localStorage
        }
      } else {
        // Server returned non-200, using defaults + localStorage
      }
    } catch (timeoutError) {
      // Server fetch timed out, using defaults + localStorage
    }
  } catch (err) {
    // Error initializing permissions
  }
}

/**
 * Load permissions saved by Security Settings (Security.tsx) from localStorage.
 * These overrides take precedence over hardcoded defaults.
 */
function loadFromLocalStorage() {
  try {
    const orgId = localStorage.getItem('currentOrgId') || 'org_001';
    const storedPerms = localStorage.getItem(`permissions_${orgId}`);

    if (!storedPerms) {
      // No localStorage permissions found, using hardcoded defaults
      return;
    }

    const permsArray = JSON.parse(storedPerms);
    if (!Array.isArray(permsArray) || permsArray.length === 0) {
      return;
    }

    let count = 0;
    permsArray.forEach((perm: any) => {
      if (perm.module && perm.role) {
        const key = `${perm.module}:${perm.role}`;
        permissionsCache.set(key, {
          visible: !!perm.visible,
          add: !!perm.add,
          change: !!perm.change,
          delete: !!perm.delete,
        });
        count++;
      }
    });

    // Applied permission overrides from Security Settings (localStorage)
    notifyPermissionsChanged();
  } catch (err) {
    // Failed to load permissions from localStorage
  }
}

/**
 * Refresh permissions from localStorage. Call this after Security Settings saves.
 */
export function refreshPermissionsFromStorage() {
  // Re-apply defaults first
  ALL_MODULES.forEach(module => {
    ALL_ROLES.forEach(r => {
      const key = `${module}:${r}`;
      permissionsCache.set(key, getDefaultPermission(module, r));
    });
  });

  // Then apply localStorage overrides
  loadFromLocalStorage();
}

/**
 * Check if user can view a module
 */
export function canView(module: string, role: UserRole): boolean {
  const key = `${module}:${role}`;
  const perm = permissionsCache.get(key);
  return perm?.visible ?? false;
}

/**
 * Check if user can add to a module
 */
export function canAdd(module: string, role: UserRole): boolean {
  const key = `${module}:${role}`;
  const perm = permissionsCache.get(key);
  return perm?.add ?? false;
}

/**
 * Check if user can change/edit in a module
 */
export function canChange(module: string, role: UserRole): boolean {
  const key = `${module}:${role}`;
  const perm = permissionsCache.get(key);
  return perm?.change ?? false;
}

/**
 * Check if user can delete in a module
 */
export function canDelete(module: string, role: UserRole): boolean {
  const key = `${module}:${role}`;
  const perm = permissionsCache.get(key);
  return perm?.delete ?? false;
}

/**
 * Get all permissions for a module and role
 */
export function getPermissions(module: string, role: UserRole): Permission {
  const key = `${module}:${role}`;
  const perm = permissionsCache.get(key);
  return perm ?? { visible: false, add: false, change: false, delete: false };
}

/**
 * Debug function to dump all permissions for a role
 */
export function debugPermissions(role: UserRole) {
  // Debug function — no-op in production (console statements removed)
  return;
}

/**
 * Check if user has any permission (visible, add, change, or delete)
 */
export function hasAnyPermission(module: string, role: UserRole): boolean {
  const perms = getPermissions(module, role);
  return perms.visible || perms.add || perms.change || perms.delete;
}

/**
 * Clear permissions cache (use when user logs out)
 */
export function clearPermissions() {
  permissionsCache.clear();
}