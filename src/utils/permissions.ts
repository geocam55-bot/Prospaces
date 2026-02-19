import type { UserRole } from '../App';
import { createClient } from './supabase/client';

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

export const ALL_ROLES: UserRole[] = ['super_admin', 'admin', 'director', 'manager', 'marketing', 'standard_user'];

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

    // Step 3: Try to fetch from Supabase as an additional override layer (non-blocking)
    const supabase = createClient();

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Permissions fetch timeout')), 1000)
    );

    const fetchPromise = supabase
      .from('permissions')
      .select('*')
      .eq('role', role);

    try {
      const { data, error } = await Promise.race([fetchPromise, timeoutPromise]) as any;

      if (error) {
        if (error.code === 'PGRST205') {
          console.log(`Permissions table not found, using defaults + localStorage for ${role}`);
          return;
        }
        console.warn('Failed to fetch permissions from Supabase, using defaults + localStorage:', error);
        return;
      }

      if (data && data.length > 0) {
        console.log(`📥 Loading ${data.length} permissions from database for role: ${role}`);
        data.forEach((perm: any) => {
          const key = `${perm.module}:${perm.role}`;
          permissionsCache.set(key, {
            visible: perm.visible,
            add: perm.add,
            change: perm.change,
            delete: perm.delete,
          });
        });
        console.log(`✅ Successfully loaded ${data.length} permissions for role ${role} from Supabase`);
        notifyPermissionsChanged();
      } else {
        console.log(`⚠️ No permissions found in database for ${role}, using defaults + localStorage`);
      }
    } catch (timeoutError) {
      console.log('⚠️ Permissions fetch timed out, using defaults + localStorage');
    }
  } catch (err) {
    console.error('Error initializing permissions:', err);
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
      console.log('No localStorage permissions found, using hardcoded defaults');
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

    console.log(`✅ Applied ${count} permission overrides from Security Settings (localStorage)`);
    notifyPermissionsChanged();
  } catch (err) {
    console.warn('Failed to load permissions from localStorage:', err);
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
  console.log(`\n🔍 DEBUG: All permissions for ${role}:`);
  ALL_MODULES.forEach(module => {
    const key = `${module}:${role}`;
    const perm = permissionsCache.get(key);
    if (perm) {
      console.log(`  ${module}:`, perm);
    } else {
      console.log(`  ${module}: NOT FOUND IN CACHE`);
    }
  });
  console.log(`Total cache size: ${permissionsCache.size}\n`);
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
