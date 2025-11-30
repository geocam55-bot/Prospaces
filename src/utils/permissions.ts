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

/**
 * Initialize permissions from backend
 */
export async function initializePermissions(role: UserRole) {
  // Clear existing permissions first
  permissionsCache.clear();
  
  try {
    // ⚡ Set default permissions immediately for faster startup
    initializeDefaultPermissions();
    
    // Try to fetch permissions from Supabase in background (non-blocking)
    const supabase = createClient();
    
    // Add timeout to prevent slow queries from blocking startup
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
        // If table doesn't exist (PGRST205), silently use defaults
        if (error.code === 'PGRST205') {
          console.log(`Permissions table not found, using default permissions for ${role}`);
          return;
        }
        
        // For other errors, warn but still use defaults
        console.warn('Failed to fetch permissions from Supabase, using defaults:', error);
        return;
      }
      
      if (data && data.length > 0) {
        // Load permissions from database - override defaults
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
        // No permissions found for this role, use defaults (already set)
        console.log(`⚠️ No permissions found in database for ${role}, using hardcoded defaults`);
      }
    } catch (timeoutError) {
      // Timeout - use defaults that are already set
      console.log('⚠️ Permissions fetch timed out, using default permissions');
    }
  } catch (err) {
    console.error('Error initializing permissions:', err);
    // Defaults are already set, so we're fine
  }
}

/**
 * Initialize default permissions when backend is unavailable
 */
function initializeDefaultPermissions() {
  const modules = [
    'dashboard', 'ai-suggestions', 'contacts', 'tasks', 'appointments', 'opportunities', 'bids', 'notes',
    'email', 'marketing', 'inventory', 'users', 'settings', 'tenants', 'security', 'import-export',
    'documents', 'team-dashboard', 'reports'
  ];
  const roles: UserRole[] = ['super_admin', 'admin', 'manager', 'marketing', 'standard_user'];

  modules.forEach(module => {
    roles.forEach(role => {
      const key = `${module}:${role}`;
      
      if (role === 'super_admin') {
        permissionsCache.set(key, { visible: true, add: true, change: true, delete: true });
      } else if (role === 'admin') {
        // Admin can see security but not tenants
        if (module === 'tenants') {
          permissionsCache.set(key, { visible: false, add: false, change: false, delete: false });
        } else {
          permissionsCache.set(key, {
            visible: true,
            add: true,
            change: true,
            delete: module === 'users' ? false : true,
          });
        }
      } else if (role === 'manager') {
        // Manager cannot see tenants, security, users, settings, or import-export
        if (module === 'tenants' || module === 'security' || module === 'users' || module === 'settings' || module === 'import-export') {
          permissionsCache.set(key, { visible: false, add: false, change: false, delete: false });
        } else {
          permissionsCache.set(key, {
            visible: true,
            add: true,
            change: true,
            delete: module === 'marketing',
          });
        }
      } else if (role === 'marketing') {
        // Marketing cannot see tenants, security, users, settings, bids, or import-export
        if (module === 'tenants' || module === 'security' || module === 'users' || module === 'settings' || module === 'import-export') {
          permissionsCache.set(key, { visible: false, add: false, change: false, delete: false });
        } else {
          permissionsCache.set(key, {
            visible: module !== 'bids',
            add: module === 'marketing' || module === 'contacts' || module === 'email' || module === 'opportunities',
            change: module === 'marketing' || module === 'contacts' || module === 'email' || module === 'opportunities',
            delete: module === 'marketing',
          });
        }
      } else {
        // standard_user - only personal data access
        const isPersonalModule = module === 'contacts' || module === 'tasks' || module === 'notes';
        const canViewModule = module === 'dashboard' || isPersonalModule || module === 'appointments';
        
        // Explicitly deny these modules
        if (module === 'tenants' || module === 'security' || module === 'import-export' || 
            module === 'users' || module === 'settings' || module === 'bids' || module === 'opportunities' ||
            module === 'email' || module === 'marketing' || module === 'inventory') {
          permissionsCache.set(key, { visible: false, add: false, change: false, delete: false });
        } else {
          // Allow personal modules and dashboard
          permissionsCache.set(key, {
            visible: canViewModule,
            add: isPersonalModule,
            change: isPersonalModule,
            delete: false,
          });
        }
      }
    });
  });
  
  // Notify listeners that permissions have been initialized
  notifyPermissionsChanged();
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
  const modules = [
    'dashboard', 'ai-suggestions', 'contacts', 'tasks', 'appointments', 'opportunities', 'bids', 'notes',
    'email', 'marketing', 'inventory', 'users', 'settings', 'tenants', 'security', 'import-export',
    'documents', 'team-dashboard', 'reports'
  ];
  
  modules.forEach(module => {
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