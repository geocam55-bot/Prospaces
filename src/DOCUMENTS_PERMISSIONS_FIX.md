# Documents Module - Permissions Fix

## Issue
The Documents module was not appearing in the Role Permissions Manager on the Users page.

## Root Cause
The `documents` module was not included in the `MODULES` array in `/components/PermissionsManager.tsx`.

## Solution Applied

### 1. Updated PermissionsManager.tsx
Added the Documents module to the MODULES array:

```typescript
const MODULES = [
  // ... other modules ...
  { id: 'documents', name: 'Documents', description: 'Document storage and management' },
  // ... other modules ...
];
```

The Documents module is now positioned between "Notes" and "Email" in the permissions list.

## What This Enables

Now you can:

1. **View Documents Permissions:**
   - Go to Users → Role Permissions tab
   - Select any role (Standard User, Manager, Admin, etc.)
   - You'll see "Documents" in the module list

2. **Configure Role-Based Access:**
   - **Visible** - Can the role see the Documents menu and access the module?
   - **Add** - Can the role upload new documents?
   - **Change** - Can the role edit document metadata?
   - **Delete** - Can the role delete documents?

3. **Default Permissions (from migration):**
   The migration SQL already created these default permissions:
   
   | Role | Visible | Add | Change | Delete |
   |------|---------|-----|--------|--------|
   | Super Admin | ✅ | ✅ | ✅ | ✅ |
   | Admin | ✅ | ✅ | ✅ | ✅ |
   | Manager | ✅ | ✅ | ✅ | ❌ |
   | Marketing | ✅ | ✅ | ❌ | ❌ |
   | Standard User | ✅ | ✅ | ❌ | ❌ |

## Testing the Fix

1. **Navigate to Users page**
2. **Click "Role Permissions" tab**
3. **Select any role** (e.g., Standard User)
4. **Look for "Documents" in the module list**
5. **You should now see:**
   ```
   Documents
   Document storage and management
   [Visible] [Add] [Change] [Delete]
   ```

6. **Try toggling permissions:**
   - Toggle the switches to enable/disable permissions
   - Click "Save Changes"
   - The changes will be persisted to the database

## Refresh Required?

After updating the PermissionsManager.tsx file:
- You may need to **refresh your browser** to see the changes
- The module will appear in the permissions list automatically
- If you already ran the migration, the default permissions are already in the database

## Notes

- The Documents module uses the same permission system as all other modules
- Permissions are checked in the UI using `canView()`, `canAdd()`, `canChange()`, and `canDelete()` from `/utils/permissions.ts`
- The PermissionGate and PermissionButton components automatically enforce these permissions
- Changes in the Permissions Manager are immediately applied to all users with that role

## If Documents Still Don't Show Up

1. **Check if migration ran:**
   ```sql
   SELECT * FROM permissions WHERE module = 'documents';
   ```
   Should return 5 rows (one for each role)

2. **Check console for errors:**
   - Open browser DevTools (F12)
   - Look for any errors related to permissions loading

3. **Verify the MODULES array:**
   - Check that "documents" is in the list
   - Make sure there are no typos

4. **Clear browser cache:**
   - Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
   - Or clear browser cache completely

## Success!

You should now be able to:
- ✅ See Documents in the Role Permissions Manager
- ✅ Configure permissions for each role
- ✅ Save custom permission configurations
- ✅ Have the Documents module respect role-based access control

---

**Fixed:** November 19, 2024
