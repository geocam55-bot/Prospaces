# Inventory Import Visibility Fix

## Problem
After importing inventory items, Admin users could not see the imported products in the Inventory module.

## Root Cause
The import functions (`upsertInventoryBySKUClient` and `bulkUpsertInventoryBySKUClient`) were using `user.user_metadata?.organizationId` to set the `organization_id` field, which may not always be populated or may be outdated.

However, the inventory loading functions (`getAllInventoryClient`) were correctly using `profile.organization_id` from the database, which is the authoritative source.

This mismatch meant:
- Imported items were created with an incorrect/missing `organization_id`
- When loading inventory, the filter `organization_id = profile.organization_id` didn't match the imported items
- Result: Imported items were invisible to the user

## Solution
Updated both import functions to use the same reliable method as all other inventory functions:

1. **Before (WRONG):**
```typescript
const organizationId = user.user_metadata?.organizationId;
```

2. **After (CORRECT):**
```typescript
let profile;
try {
  profile = await ensureUserProfile(user.id);
} catch (profileError) {
  console.error('❌ Failed to get user profile:', profileError);
  throw new Error('Failed to get user profile');
}

const organizationId = profile.organization_id;
```

## Files Modified
- `/utils/inventory-client.ts`
  - `upsertInventoryBySKUClient()` - Now uses profile.organization_id
  - `bulkUpsertInventoryBySKUClient()` - Now uses profile.organization_id

## Result
✅ Inventory items imported through CSV/Excel now have the correct `organization_id`
✅ Admin users can immediately see their imported inventory items
✅ Data isolation between organizations is maintained
✅ All inventory functions now use consistent organization_id retrieval

## Testing
1. Log in as an Admin user
2. Go to Import/Export module
3. Import inventory items using CSV or Excel
4. Navigate to Inventory module
5. ✅ All imported items should now be visible

## Additional Debugging
The console now logs detailed information during import:
- `📦 Upsert inventory - User: [email], Org ID: [uuid]`
- `📦 Bulk upsert X inventory items for org: [uuid]`
- `✅ Clean data to send to database:` [data object]

Check the browser console to verify the organization_id being used during import matches your profile's organization_id.
