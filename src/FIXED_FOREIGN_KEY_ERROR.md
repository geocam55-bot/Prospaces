# Fixed: Foreign Key Constraint Error on User Invitation

## Problem
When inviting users, the system was throwing this error:
```
insert or update on table "profiles" violates foreign key constraint "profiles_organization_id_fkey"
Key is not present in table "organizations"
```

## Root Cause
The user invitation code was trying to assign users to organizations that **don't exist** in the `organizations` table. This happened because:

1. The system tries to assign a user to an `organization_id`
2. But that organization hasn't been created in the Tenants module yet
3. PostgreSQL's foreign key constraint rejects the insert

## Solution Applied

### 1. **Validation Check** (Primary Fix)
Added organization existence validation in `/utils/users-client.ts`:

```typescript
// Verify organization exists before proceeding
if (orgId) {
  const { data: orgExists, error: orgError } = await supabase
    .from('organizations')
    .select('id')
    .eq('id', orgId)
    .single();
  
  if (orgError || !orgExists) {
    throw new Error(
      `Organization with ID "${orgId}" does not exist. ` +
      `Please create the organization first in the Tenants module.`
    );
  }
}
```

### 2. **Improved Error Handling**
Updated error messages in `/components/Users.tsx` to show actionable guidance:

```typescript
if (error.message?.includes('does not exist') && error.message?.includes('Organization')) {
  toast.error(error.message + ' Please create it in the Tenants module first.');
}
```

## How to Use

### For Super Admins:
1. **First:** Go to **Tenants** module and create the organization
2. **Then:** Go to **Users** module and invite users to that organization

### For Regular Admins:
- Users are automatically assigned to your organization
- Make sure your organization exists in the Tenants module
- If you get an error, contact your Super Admin

## Verification

After the fix, when inviting a user:

✅ **SUCCESS:** If organization exists
- User is invited successfully
- User appears in the Users list with status "invited"

❌ **HELPFUL ERROR:** If organization doesn't exist
- Clear error message: `Organization with ID "xyz" does not exist. Please create the organization first in the Tenants module.`
- System doesn't create orphaned profile records
- Database integrity is maintained

## Create Organization First

To create an organization:

1. Login as **super_admin** or **admin**
2. Navigate to **Tenants** module (in the sidebar)
3. Click **"Add Tenant"**
4. Fill in:
   - Name: e.g., "Rona Atlantic"
   - Status: "Active"
   - (Optional) Logo, domain, etc.
5. Click **"Add Tenant"**
6. Note the Organization ID (it will be auto-generated or based on the name)

Then you can invite users to that organization!

## Database Schema Reference

The foreign key constraint that was being violated:

```sql
ALTER TABLE public.profiles
ADD CONSTRAINT profiles_organization_id_fkey 
FOREIGN KEY (organization_id) 
REFERENCES public.organizations(id);
```

This constraint ensures:
- Every user belongs to a valid organization
- No orphaned user records
- Data integrity across the system

## Additional Notes

- This fix also helps with the larry.lee@ronaatlantic.ca issue
- Make sure "Rona Atlantic" organization exists before inviting Larry
- Use the browser console tools we created: `fixUserTenant('email@example.com')`
