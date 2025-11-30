# ProSpaces CRM - Permissions Analysis

## Overview
This document compares the defined access permissions in the system with what is actually visible and actionable to users in the UI.

---

## Role Definitions

The system has 5 roles defined:
1. **super_admin** - Full system access across all organizations
2. **admin** - Organization-wide access with some restrictions
3. **manager** - Team-level access with limited administrative capabilities
4. **marketing** - Marketing-focused access
5. **standard_user** - Personal/limited access

---

## Detailed Permissions Matrix

### 1. SUPER ADMIN
**Defined Permissions (from `/utils/permissions.ts`):**
- ✅ All modules: visible, add, change, delete

**Actual UI Implementation:**
- ✅ Navigation: All items visible (Dashboard, Contacts, Tasks, Appointments, Bids, Notes, Email, Marketing, Inventory, Organizations, Users, Security, Import/Export, Settings)
- ✅ All CRUD operations available on all modules
- ✅ Can manage organizations (Organizations page)
- ✅ Can manage users across all organizations
- ✅ Access to Security module
- ✅ Access to Import/Export

**Status:** ✅ CORRECTLY IMPLEMENTED

---

### 2. ADMIN
**Defined Permissions (from `/utils/permissions.ts`):**
- ✅ All modules visible EXCEPT Organizations (tenants)
- ✅ Can add/change/delete all modules
- ⚠️ **Exception:** Cannot delete users
- ❌ Cannot see Organizations (tenants) module

**Actual UI Implementation:**
- ✅ Navigation shows: Dashboard, Contacts, Tasks, Appointments, Bids, Notes, Email, Marketing, Inventory, Users, Security, Import/Export, Settings
- ❌ Organizations NOT visible (correct)
- ✅ Security IS visible (correct - hardcoded in Navigation.tsx line 59)
- ✅ Import/Export IS visible (correct - hardcoded in Navigation.tsx line 60)
- ⚠️ **POTENTIAL ISSUE:** Need to verify if user delete restriction is enforced in Users component

**Status:** ⚠️ MOSTLY CORRECT - Need to verify user delete restriction

---

### 3. MANAGER
**Defined Permissions (from `/utils/permissions.ts`):**
- ✅ Can view: Dashboard, Contacts, Tasks, Appointments, Bids, Notes, Email, Marketing, Inventory
- ❌ Cannot see: Organizations (tenants), Security, Users, Settings
- ✅ Can add/change: Contacts, Tasks, Appointments, Bids, Notes, Email, Inventory
- ⚠️ **Cannot** add/change: Settings, Users
- ✅ Can only delete: Marketing items

**Actual UI Implementation:**
- ✅ Navigation should show: Dashboard, Contacts, Tasks, Appointments, Bids, Notes, Email, Marketing, Inventory
- ❌ Should NOT show: Organizations, Users, Security, Import/Export
- ⚠️ **Settings might be visible** - defined in navItems but filtered by canView (line 62)
- ⚠️ **POTENTIAL ISSUE:** Users component needs verification - should not be visible to managers

**Issues Found:**
1. ⚠️ Settings module: permissions.ts shows managers can VIEW settings (visible: true) but cannot add/change (add: false, change: false)
2. ⚠️ Users module: permissions.ts shows managers can VIEW users (visible: true) but cannot add/change (add: false, change: false)
3. ❌ Navigation.tsx line 58 uses `canView('users', user.role)` which would show Users to managers

**Status:** ❌ INCORRECT - Managers should not see Users or Settings according to business logic, but permissions.ts allows viewing

---

### 4. MARKETING
**Defined Permissions (from `/utils/permissions.ts`):**
- ✅ Can view: Dashboard, Contacts, Tasks, Appointments, Notes, Email, Marketing, Inventory
- ❌ Cannot see: Organizations (tenants), Security, **Users**, **Settings**, **Bids**
- ✅ Can add/change: Marketing, Contacts, Email
- ✅ Can only delete: Marketing items

**Actual UI Implementation:**
- ✅ Navigation should show: Dashboard, Contacts, Tasks, Appointments, Notes, Email, Marketing, Inventory
- ❌ Should NOT show: Organizations, Users, Security, Import/Export, Settings, **Bids**
- ✅ Bids correctly hidden (visible: false in permissions)
- ✅ Users correctly hidden (visible: false in permissions)
- ✅ Settings correctly hidden (visible: false in permissions)

**Functional Restrictions:**
- ✅ Can add/edit contacts (for lead management)
- ✅ Can create/edit marketing campaigns
- ✅ Can send emails
- ✅ Cannot modify bids/quotes
- ✅ Cannot manage users or system settings

**Status:** ✅ CORRECTLY IMPLEMENTED

---

### 5. STANDARD USER
**Defined Permissions (from `/utils/permissions.ts`):**
- ✅ Can view: Dashboard, Contacts, Tasks, Appointments, Bids, Notes, Email, Marketing, Inventory
- ❌ Cannot see: Organizations (tenants), Security, **Users**, **Settings**
- ✅ Can add/change: Contacts, Tasks, Notes (personal modules only)
- ❌ Cannot delete anything

**Actual UI Implementation:**
- ✅ Navigation should show: Dashboard, Contacts, Tasks, Appointments, Bids, Notes, Email, Marketing, Inventory
- ❌ Should NOT show: Organizations, Users, Security, Import/Export, Settings
- ⚠️ Can VIEW but not modify: Appointments, Bids, Email, Marketing, Inventory

**Functional Restrictions:**
- ✅ Can only add/edit their own contacts, tasks, and notes
- ❌ Cannot create appointments (view only)
- ❌ Cannot create bids (view only)
- ❌ Cannot send emails (view only)
- ❌ Cannot manage inventory (view only)

**Status:** ✅ MOSTLY CORRECT - View-only access properly restricted

---

## Critical Issues Found

### 🔴 HIGH PRIORITY

1. **Manager Role Inconsistency**
   - **Issue:** Managers can see Users and Settings modules according to permissions.ts
   - **Expected:** Managers should NOT see Users or Settings (line 52-53 says they cannot see security, but lines 55-60 show visible:true for all other modules)
   - **Location:** `/utils/permissions.ts` lines 50-61
   - **Fix Required:** Change lines 57-58 to set `visible: false` for users and settings modules

2. **Bids Module - No Permission Checks**
   - **Issue:** Bids.tsx does NOT import or use canAdd/canChange/canDelete functions
   - **Impact:** All users can create/edit/delete bids regardless of role
   - **Expected:** Should follow same pattern as Contacts.tsx and Tasks.tsx
   - **Location:** `/components/Bids.tsx`
   - **Fix Required:** Add permission checks for add/edit/delete operations

3. **Admin User Delete Restriction**
   - **Issue:** Need to verify if admins are prevented from deleting users
   - **Expected:** permissions.ts line 47 sets `delete: module === 'users' ? false : true`
   - **Location:** `/components/Users.tsx`
   - **Fix Required:** Verify implementation

---

### 🟡 MEDIUM PRIORITY

4. **Appointments Module - No Permission Checks**
   - **Issue:** Appointments.tsx likely missing granular permission checks
   - **Impact:** Standard users and marketing users might be able to create/edit when they should only view
   - **Location:** `/components/Appointments.tsx`
   - **Fix Required:** Add permission checks

5. **Notes Module - No Permission Checks**
   - **Issue:** Notes.tsx likely missing granular permission checks
   - **Location:** `/components/Notes.tsx`
   - **Fix Required:** Add permission checks

6. **Email Module - No Permission Checks**
   - **Issue:** Email.tsx likely missing granular permission checks
   - **Impact:** Standard users might be able to send emails when they should only view
   - **Location:** `/components/Email.tsx`
   - **Fix Required:** Add permission checks

7. **Marketing Module - No Permission Checks**
   - **Issue:** Marketing.tsx likely missing granular permission checks
   - **Location:** `/components/Marketing.tsx`
   - **Fix Required:** Add permission checks

8. **Inventory Module - No Permission Checks**
   - **Issue:** Inventory.tsx likely missing granular permission checks
   - **Location:** `/components/Inventory.tsx`
   - **Fix Required:** Add permission checks

---

### 🟢 LOW PRIORITY

9. **Settings Module Access**
   - **Issue:** All roles can see Settings according to permissions.ts
   - **Expected Behavior:** Might want to restrict Settings to admins and super_admins only
   - **Current:** Managers and marketing can VIEW but not CHANGE
   - **Consider:** Should managers/marketing see settings at all?

10. **Import/Export Access**
    - **Current:** Only super_admin and admin can access (hardcoded in Navigation.tsx line 60)
    - **Not in Permissions Matrix:** import-export module not defined in permissions.ts
    - **Recommendation:** Add to permissions.ts for consistency

---

## Modules Using Permission System Correctly

✅ **Contacts.tsx** - Lines 17, 145, 251, 308, 317, 328
- Properly imports and uses canAdd, canChange, canDelete
- Add button hidden when user lacks permission
- Edit/Delete actions in dropdown menu conditional

✅ **Tasks.tsx** - Lines 19, 142, 245
- Properly imports and uses canAdd, canChange, canDelete
- Add button hidden when user lacks permission
- Delete action conditional

✅ **PermissionGate.tsx** - Reusable component for permission checking
- Provides PermissionGate and PermissionButton components
- Used in Contacts and Tasks

---

## Modules Missing Permission Checks

❌ **Bids.tsx** - No permission imports or checks
❌ **Appointments.tsx** - Needs verification
❌ **Notes.tsx** - Needs verification
❌ **Email.tsx** - Needs verification  
❌ **Marketing.tsx** - Needs verification
❌ **Inventory.tsx** - Needs verification

---

## Recommended Actions

### Immediate (Before Production)

1. **Fix Manager Permissions**
   ```typescript
   // In /utils/permissions.ts line 50-61
   } else if (role === 'manager') {
     if (module === 'tenants' || module === 'security' || module === 'users' || module === 'settings') {
       permissionsCache.set(key, { visible: false, add: false, change: false, delete: false });
     } else {
       // ... rest of logic
     }
   }
   ```

2. **Add Permission Checks to Bids.tsx**
   - Import: `import { canAdd, canChange, canDelete } from '../utils/permissions';`
   - Wrap "Add Quote" button with permission check
   - Add conditional rendering for edit/delete actions

3. **Verify Admin Cannot Delete Users**
   - Check Users.tsx for delete functionality
   - Ensure delete button/action checks `canDelete('users', user.role)`

### Short Term

4. Add permission checks to remaining modules (Appointments, Notes, Email, Marketing, Inventory)
5. Add import-export to permissions.ts matrix
6. Consider restricting Settings visibility to admin/super_admin only

### Long Term

7. Consider implementing row-level security (RLS) in Supabase to enforce data isolation at database level
8. Add automated tests for permission system
9. Create admin UI for managing custom permission matrices
10. Consider implementing team-based permissions for managers

---

## Testing Checklist

- [ ] Create test accounts for each role
- [ ] Verify each role sees correct navigation items
- [ ] Test add/edit/delete operations for each module per role
- [ ] Verify managers cannot access Users or Settings
- [ ] Verify admins cannot delete users
- [ ] Verify marketing users cannot access Bids
- [ ] Verify standard users can only modify personal data
- [ ] Test cross-organization data isolation

---

## Documentation Notes

The permissions system is well-architected with:
- Centralized permission logic in `/utils/permissions.ts`
- Reusable `PermissionGate` component
- Permission caching for performance
- Clear separation of concerns

However, implementation is incomplete across several modules, creating potential security issues where users might have more access than intended.
