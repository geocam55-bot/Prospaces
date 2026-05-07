import type { UserRole } from '../App';
import { projectId } from './supabase/info';
import { getServerHeaders } from './server-headers';

const SERVER_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-8405be07`;
const SPACE_PERMISSION_PREFIX = 'space:';

export interface Permission {
  visible: boolean;
  add: boolean;
  change: boolean;
  delete: boolean;
}

export interface PermissionRecord extends Permission {
  module: string;
  role: UserRole;
}

export type SpaceId = 'sales' | 'marketing' | 'design' | 'insights' | 'inventory' | 'it';
export type SpaceAccessLevel = 'none' | 'view' | 'full';

export interface SpaceDefinition {
  id: SpaceId;
  name: string;
  icon: string;
  description: string;
  modules: string[];
}

export const ALL_ROLES: UserRole[] = ['super_admin', 'admin', 'director', 'manager', 'marketing', 'designer', 'standard_user'];

export const ALL_MODULES = [
  'dashboard', 'ai-suggestions', 'contacts', 'tasks', 'appointments', 'opportunities',
  'bids', 'quotes', 'messages', 'notes', 'email', 'marketing', 'inventory',
  'users', 'settings', 'tenants', 'security', 'import-export',
  'documents', 'team-dashboard', 'reports', 'project-wizards', 'admin', 'kitchen-planner',
];

export const MODULE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  'ai-suggestions': 'AI Suggestions',
  contacts: 'Contacts',
  tasks: 'Tasks',
  appointments: 'Appointments',
  opportunities: 'Opportunities',
  bids: 'Deals',
  quotes: 'Quotes',
  messages: 'Message Space',
  notes: 'Notes',
  email: 'Email',
  marketing: 'Marketing',
  inventory: 'Inventory',
  users: 'Users',
  settings: 'Settings',
  tenants: 'Organizations',
  security: 'Security',
  'import-export': 'Import / Export',
  documents: 'Documents',
  'team-dashboard': 'Team Dashboard',
  reports: 'Reports',
  'project-wizards': 'Project Wizards',
  admin: 'Admin',
  'kitchen-planner': 'Kitchen Planner',
};

const SPACE_MODULES: Record<SpaceId, string[]> = {
  sales: [
    'dashboard',
    'ai-suggestions',
    'team-dashboard',
    'contacts',
    'tasks',
    'appointments',
    'opportunities',
    'bids',
    'quotes',
    'messages',
    'notes',
    'email',
    'documents',
    'settings',
  ],
  marketing: ['marketing', 'contacts', 'messages', 'email', 'reports'],
  design: ['project-wizards', 'kitchen-planner', 'messages', 'contacts'],
  insights: ['reports', 'messages'],
  inventory: ['inventory', 'messages'],
  it: ['admin', 'users', 'security', 'tenants', 'import-export', 'messages'],
};

const SPACE_ACCESS_ANCHOR_MODULE: Record<SpaceId, string> = {
  sales: 'contacts',
  marketing: 'marketing',
  design: 'project-wizards',
  insights: 'reports',
  inventory: 'inventory',
  it: 'admin',
};

export const ALL_SPACES: SpaceDefinition[] = [
  {
    id: 'sales',
    name: 'Sales Space',
    icon: '🏢',
    description: 'CRM, contacts, tasks, email, documents, and core account settings.',
    modules: SPACE_MODULES.sales,
  },
  {
    id: 'marketing',
    name: 'Marketing Space',
    icon: '📈',
    description: 'Campaign automation, customer journeys, contact outreach, and reporting.',
    modules: SPACE_MODULES.marketing,
  },
  {
    id: 'design',
    name: 'Design Space',
    icon: '🪄',
    description: 'Project Wizards, kitchen planning, and design-led customer workflows.',
    modules: SPACE_MODULES.design,
  },
  {
    id: 'insights',
    name: 'Insights Space',
    icon: '📊',
    description: 'Business reports, analytics dashboards, and executive visibility.',
    modules: SPACE_MODULES.insights,
  },
  {
    id: 'inventory',
    name: 'Inventory Space',
    icon: '📦',
    description: 'Inventory catalog, stock management, and product operations.',
    modules: SPACE_MODULES.inventory,
  },
  {
    id: 'it',
    name: 'IT Space',
    icon: '🛡️',
    description: 'User administration, security settings, import/export, and tenant controls.',
    modules: SPACE_MODULES.it,
  },
];

const MODULE_TO_SPACES = ALL_SPACES.reduce<Record<string, SpaceId[]>>((acc, space) => {
  space.modules.forEach((module) => {
    acc[module] = acc[module] || [];
    acc[module].push(space.id);
  });
  return acc;
}, {});

const EMPTY_PERMISSION: Permission = { visible: false, add: false, change: false, delete: false };

// Effective module permissions used throughout the CRM
let permissionsCache: Map<string, Permission> = new Map();
// Saved space-level access records from Security Settings
let spacePermissionsCache: Map<string, Permission> = new Map();
// Saved second-level option/module overrides used inside each space
let directPermissionsCache: Map<string, Permission> = new Map();

// Listeners for permission updates
let permissionListeners: Array<() => void> = [];

function permissionKey(module: string, role: UserRole) {
  return `${module}:${role}`;
}

function spaceCacheKey(spaceId: SpaceId, role: UserRole) {
  return `${SPACE_PERMISSION_PREFIX}${spaceId}:${role}`;
}

function clonePermission(permission?: Partial<Permission>): Permission {
  return {
    visible: !!permission?.visible,
    add: !!permission?.add,
    change: !!permission?.change,
    delete: !!permission?.delete,
  };
}

function unionPermissions(a: Permission, b: Permission): Permission {
  return {
    visible: a.visible || b.visible,
    add: a.add || b.add,
    change: a.change || b.change,
    delete: a.delete || b.delete,
  };
}

function capPermissionToRole(base: Permission, override?: Partial<Permission>): Permission {
  if (!override) {
    return { ...base };
  }

  return {
    visible: base.visible && !!override.visible,
    add: base.add && !!override.add,
    change: base.change && !!override.change,
    delete: base.delete && !!override.delete,
  };
}

/**
 * Subscribe to permission changes
 */
export function onPermissionsChanged(callback: () => void) {
  permissionListeners.push(callback);
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

export function getSpacePermissionKey(spaceId: SpaceId): string {
  return `${SPACE_PERMISSION_PREFIX}${spaceId}`;
}

export function isSpacePermissionModule(module: string): boolean {
  return module.startsWith(SPACE_PERMISSION_PREFIX);
}

export function getSpaceIdFromPermissionModule(module: string): SpaceId | null {
  if (!isSpacePermissionModule(module)) return null;
  const raw = module.slice(SPACE_PERMISSION_PREFIX.length) as SpaceId;
  return ALL_SPACES.some(space => space.id === raw) ? raw : null;
}

export function accessLevelToPermission(level: SpaceAccessLevel): Permission {
  if (level === 'full') {
    return { visible: true, add: true, change: true, delete: true };
  }
  if (level === 'view') {
    return { visible: true, add: false, change: false, delete: false };
  }
  return { ...EMPTY_PERMISSION };
}

export function permissionToAccessLevel(permission?: Partial<Permission>): SpaceAccessLevel {
  if (!permission?.visible) return 'none';
  return permission.add || permission.change || permission.delete ? 'full' : 'view';
}

export function formatModuleLabel(module: string): string {
  return MODULE_LABELS[module] || module.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

/**
 * Maximum capability allowed by role for a given module.
 * Space access is applied on top of this role cap.
 */
function getRoleCapabilityPermission(module: string, role: UserRole): Permission {
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
    if (module === 'project-wizards' || module === 'kitchen-planner') {
      return { visible: false, add: false, change: false, delete: false };
    }
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
    if (module === 'project-wizards' || module === 'kitchen-planner') {
      return { visible: false, add: false, change: false, delete: false };
    }
    if (module === 'tenants' || module === 'security' || module === 'users' || module === 'import-export') {
      return { visible: false, add: false, change: false, delete: false };
    }
    if (module === 'settings') {
      return { visible: true, add: false, change: true, delete: false };
    }
    return {
      visible: module !== 'bids' && module !== 'quotes',
      add: module === 'marketing' || module === 'contacts' || module === 'email' || module === 'opportunities' || module === 'messages',
      change: module === 'marketing' || module === 'contacts' || module === 'email' || module === 'opportunities' || module === 'messages',
      delete: module === 'marketing',
    };
  }

  if (role === 'designer') {
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
    return { visible: false, add: false, change: false, delete: false };
  }

  const standardUserPermissions: Partial<Record<string, Permission>> = {
    dashboard: { visible: true, add: false, change: false, delete: false },
    'project-wizards': { visible: true, add: true, change: true, delete: true },
    'kitchen-planner': { visible: true, add: true, change: true, delete: true },
    contacts: { visible: true, add: true, change: true, delete: false },
    tasks: { visible: true, add: true, change: true, delete: false },
    appointments: { visible: true, add: true, change: true, delete: false },
    messages: { visible: true, add: true, change: true, delete: false },
    notes: { visible: true, add: true, change: true, delete: false },
    bids: { visible: true, add: true, change: true, delete: false },
    opportunities: { visible: true, add: true, change: true, delete: false },
    email: { visible: true, add: true, change: true, delete: false },
    documents: { visible: true, add: true, change: false, delete: false },
    settings: { visible: true, add: false, change: true, delete: false },
  };

  return standardUserPermissions[module] || { visible: false, add: false, change: false, delete: false };
}

export function getDefaultSpacePermission(spaceId: SpaceId, role: UserRole): Permission {
  const anchorModule = SPACE_ACCESS_ANCHOR_MODULE[spaceId];
  const anchorPermission = getRoleCapabilityPermission(anchorModule, role);

  if (!anchorPermission.visible) {
    return accessLevelToPermission('none');
  }

  const hasMutatingAccess = anchorPermission.add || anchorPermission.change || anchorPermission.delete;
  return accessLevelToPermission(hasMutatingAccess ? 'full' : 'view');
}

/**
 * Backward-compatible default permission lookup.
 * For spaces, this returns the default space-level access.
 * For modules, this returns the role's maximum capability in that module.
 */
export function getDefaultPermission(module: string, role: UserRole): Permission {
  const spaceId = getSpaceIdFromPermissionModule(module);
  if (spaceId) {
    return getDefaultSpacePermission(spaceId, role);
  }
  return getRoleCapabilityPermission(module, role);
}

function applySpaceAccessToModule(basePermission: Permission, spacePermission: Permission): Permission {
  const level = permissionToAccessLevel(spacePermission);

  if (level === 'none' || !basePermission.visible) {
    return { ...EMPTY_PERMISSION };
  }

  if (level === 'view') {
    return {
      visible: true,
      add: false,
      change: false,
      delete: false,
    };
  }

  return { ...basePermission };
}

function resolveEffectivePermission(module: string, role: UserRole): Permission {
  const basePermission = getRoleCapabilityPermission(module, role);
  const directOverride = directPermissionsCache.get(permissionKey(module, role));
  const effectiveModulePermission = capPermissionToRole(basePermission, directOverride);
  const spaces = MODULE_TO_SPACES[module] || [];

  if (spaces.length === 0) {
    return effectiveModulePermission;
  }

  return spaces.reduce<Permission>((effective, spaceId) => {
    const spacePermission = spacePermissionsCache.get(spaceCacheKey(spaceId, role)) || getDefaultSpacePermission(spaceId, role);
    return unionPermissions(effective, applySpaceAccessToModule(effectiveModulePermission, spacePermission));
  }, { ...EMPTY_PERMISSION });
}

function seedDefaultSpacePermissions() {
  spacePermissionsCache.clear();
  ALL_SPACES.forEach((space) => {
    ALL_ROLES.forEach((role) => {
      spacePermissionsCache.set(spaceCacheKey(space.id, role), getDefaultSpacePermission(space.id, role));
    });
  });
}

function rebuildPermissionsCache() {
  permissionsCache.clear();
  ALL_MODULES.forEach((module) => {
    ALL_ROLES.forEach((role) => {
      permissionsCache.set(permissionKey(module, role), resolveEffectivePermission(module, role));
    });
  });
}

function normalizeRecord(record: any): PermissionRecord | null {
  if (!record?.module || !record?.role) return null;
  return {
    module: String(record.module),
    role: record.role as UserRole,
    visible: !!record.visible,
    add: !!record.add,
    change: !!record.change,
    delete: !!record.delete,
  };
}

function migrateLegacyPermissions(records: PermissionRecord[]): PermissionRecord[] {
  const normalizedSpaceRecords: PermissionRecord[] = [];

  ALL_ROLES.forEach((role) => {
    ALL_SPACES.forEach((space) => {
      const relatedRecords = records.filter((record) => record.role === role && space.modules.includes(record.module));

      if (relatedRecords.length === 0) {
        normalizedSpaceRecords.push({
          module: getSpacePermissionKey(space.id),
          role,
          ...getDefaultSpacePermission(space.id, role),
        });
        return;
      }

      const hasVisible = relatedRecords.some((record) => record.visible);
      const hasMutatingAccess = relatedRecords.some((record) => record.add || record.change || record.delete);

      normalizedSpaceRecords.push({
        module: getSpacePermissionKey(space.id),
        role,
        ...capPermissionToRole(
          getDefaultSpacePermission(space.id, role),
          accessLevelToPermission(!hasVisible ? 'none' : hasMutatingAccess ? 'full' : 'view')
        ),
      });
    });
  });

  const directModuleRecords = records
    .filter((record) => !isSpacePermissionModule(record.module))
    .map((record) => ({
      ...record,
      ...capPermissionToRole(getRoleCapabilityPermission(record.module, record.role), record),
    }));
  return [...normalizedSpaceRecords, ...directModuleRecords];
}

export function normalizePermissionRecords(records: PermissionRecord[] = []): PermissionRecord[] {
  const validRecords = records
    .map(normalizeRecord)
    .filter((record): record is PermissionRecord => !!record);

  if (validRecords.length === 0) {
    return ALL_ROLES.flatMap((role) =>
      ALL_SPACES.map((space) => ({
        module: getSpacePermissionKey(space.id),
        role,
        ...getDefaultSpacePermission(space.id, role),
      }))
    );
  }

  const hasSpaceRecords = validRecords.some((record) => isSpacePermissionModule(record.module));
  if (!hasSpaceRecords) {
    return migrateLegacyPermissions(validRecords);
  }

  const recordMap = new Map<string, PermissionRecord>();
  validRecords.forEach((record) => {
    recordMap.set(`${record.module}:${record.role}`, record);
  });

  const normalizedSpaceRecords = ALL_ROLES.flatMap((role) =>
    ALL_SPACES.map((space) => {
      const existing = recordMap.get(`${getSpacePermissionKey(space.id)}:${role}`);
      return existing ? {
        ...existing,
        ...capPermissionToRole(getDefaultSpacePermission(space.id, role), existing),
      } : {
        module: getSpacePermissionKey(space.id),
        role,
        ...getDefaultSpacePermission(space.id, role),
      };
    })
  );

  const extraDirectRecords = validRecords
    .filter((record) => !isSpacePermissionModule(record.module))
    .map((record) => ({
      ...record,
      ...capPermissionToRole(getRoleCapabilityPermission(record.module, record.role), record),
    }));
  return [...normalizedSpaceRecords, ...extraDirectRecords];
}

function applyPermissionRecords(records: PermissionRecord[] = []) {
  directPermissionsCache.clear();
  seedDefaultSpacePermissions();

  normalizePermissionRecords(records).forEach((record) => {
    const normalizedPermission = clonePermission(record);

    if (isSpacePermissionModule(record.module)) {
      const spaceId = getSpaceIdFromPermissionModule(record.module);
      if (spaceId) {
        spacePermissionsCache.set(spaceCacheKey(spaceId, record.role), normalizedPermission);
      }
      return;
    }

    directPermissionsCache.set(permissionKey(record.module, record.role), normalizedPermission);
  });

  rebuildPermissionsCache();
}

/**
 * Initialize permissions from backend + localStorage overrides
 */
export async function initializePermissions(role: UserRole) {
  permissionsCache.clear();
  directPermissionsCache.clear();
  seedDefaultSpacePermissions();
  rebuildPermissionsCache();

  try {
    loadFromLocalStorage();

    const orgId = localStorage.getItem('currentOrgId') || 'org_001';
    const headers = await getServerHeaders();

    if (!headers['X-User-Token']) {
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
          applyPermissionRecords(json.permissions);
          localStorage.setItem(`permissions_${orgId}`, JSON.stringify(normalizePermissionRecords(json.permissions)));
          notifyPermissionsChanged();
        }
      } else if (res.status === 401) {
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
                applyPermissionRecords(retryJson.permissions);
                localStorage.setItem(`permissions_${orgId}`, JSON.stringify(normalizePermissionRecords(retryJson.permissions)));
                notifyPermissionsChanged();
              }
            }
          }
        } catch {
          // Ignore retry failures and continue using current cached permissions
        }
      }
    } catch {
      // Ignore fetch failures and continue using defaults + local storage
    }
  } catch {
    // Ignore initialization failures and leave default permissions in place
  }
}

/**
 * Load permissions saved by Security Settings from localStorage.
 */
function loadFromLocalStorage() {
  try {
    const orgId = localStorage.getItem('currentOrgId') || 'org_001';
    const storedPerms = localStorage.getItem(`permissions_${orgId}`);

    if (!storedPerms) {
      return;
    }

    const permsArray = JSON.parse(storedPerms);
    if (!Array.isArray(permsArray) || permsArray.length === 0) {
      return;
    }

    applyPermissionRecords(permsArray);
    notifyPermissionsChanged();
  } catch {
    // Ignore malformed local storage permissions and keep defaults
  }
}

/**
 * Refresh permissions from localStorage. Call this after Security Settings saves.
 */
export function refreshPermissionsFromStorage() {
  directPermissionsCache.clear();
  seedDefaultSpacePermissions();
  rebuildPermissionsCache();
  loadFromLocalStorage();
}

export function getSpacePermission(spaceId: SpaceId, role: UserRole): Permission {
  return spacePermissionsCache.get(spaceCacheKey(spaceId, role)) || getDefaultSpacePermission(spaceId, role);
}

export function canAccessSpace(spaceId: SpaceId, role: UserRole, requiredLevel: 'view' | 'full' = 'view'): boolean {
  const accessLevel = permissionToAccessLevel(getSpacePermission(spaceId, role));
  return requiredLevel === 'full' ? accessLevel === 'full' : accessLevel !== 'none';
}

/**
 * Check if user can view a module
 */
export function canView(module: string, role: UserRole): boolean {
  const perm = permissionsCache.get(permissionKey(module, role));
  return perm?.visible ?? false;
}

/**
 * Check if user can add to a module
 */
export function canAdd(module: string, role: UserRole): boolean {
  const perm = permissionsCache.get(permissionKey(module, role));
  return perm?.add ?? false;
}

/**
 * Check if user can change/edit in a module
 */
export function canChange(module: string, role: UserRole): boolean {
  const perm = permissionsCache.get(permissionKey(module, role));
  return perm?.change ?? false;
}

/**
 * Check if user can delete in a module
 */
export function canDelete(module: string, role: UserRole): boolean {
  const perm = permissionsCache.get(permissionKey(module, role));
  return perm?.delete ?? false;
}

/**
 * Get all permissions for a module and role
 */
export function getPermissions(module: string, role: UserRole): Permission {
  return permissionsCache.get(permissionKey(module, role)) ?? { ...EMPTY_PERMISSION };
}

/**
 * Debug function to dump all permissions for a role
 */
export function debugPermissions(_role: UserRole) {
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