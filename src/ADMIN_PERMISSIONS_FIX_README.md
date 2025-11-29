# Admin Permissions Fix

## Issue
Admin users were unable to modify Role Permissions in the User Management page, even though the UI indicated they should have access. This was due to a mismatch between the frontend permission check and the backend Row Level Security (RLS) policy.

## Root Cause
- **Frontend**: The `PermissionsManager` component allows both `super_admin` AND `admin` roles to manage permissions
- **Backend**: The RLS policy on the `permissions` table only allowed `super_admin` to manage permissions

## Solution
Updated the RLS policy on the `permissions` table to allow both `super_admin` and `admin` roles to manage permissions.

## Files Changed
1. `/fix-admin-permissions-policy.sql` - **New migration file (APPLY THIS FIRST)**
2. `/SETUP_DATABASE.sql` - Updated for future deployments
3. `/database-setup.sql` - Updated for future deployments

## How to Apply the Fix

### Step 1: Run the Migration SQL
Open your Supabase SQL Editor and run the contents of `/fix-admin-permissions-policy.sql`:

```sql
-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "superadmins_manage_permissions" ON public.permissions;

-- Create a new policy that allows both super_admin and admin to manage permissions
CREATE POLICY "admins_manage_permissions" ON public.permissions
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('super_admin', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('super_admin', 'admin')
    )
  );
```

### Step 2: Verify the Fix
1. Log in as an Admin user
2. Navigate to Users → Role Permissions Management
3. Try to modify permissions for any role
4. Click "Save Changes"
5. Verify that the changes are saved successfully

## What Changed

### Before
```sql
CREATE POLICY "superadmins_manage_permissions" ON public.permissions
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin'));
```

### After
```sql
CREATE POLICY "admins_manage_permissions" ON public.permissions
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin')));
```

## Affected Roles
- ✅ **Super Admin**: Can manage permissions (no change)
- ✅ **Admin**: Can now manage permissions (FIXED)
- ❌ **Manager**: Cannot manage permissions (no change)
- ❌ **Marketing**: Cannot manage permissions (no change)
- ❌ **Standard User**: Cannot manage permissions (no change)

## Testing Checklist
- [ ] Admin user can view Role Permissions Management page
- [ ] Admin user can toggle permission switches
- [ ] Admin user can save permission changes
- [ ] Changes persist after page reload
- [ ] Non-admin users still cannot access permission management
- [ ] Super Admin functionality remains unchanged

## Notes
- This fix is backward compatible
- No data migration is needed
- The policy change takes effect immediately after running the SQL
- All existing permissions data remains unchanged
