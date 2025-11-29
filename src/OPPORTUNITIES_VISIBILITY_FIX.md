# Opportunities Visibility Fix

## Problem
User larry.lee@ronaatlantic.ca was showing 0 opportunities on the Dashboard, but actually has 1 opportunity in the database.

## Root Cause
The Dashboard was only checking the `created_by` field when loading opportunities:

```typescript
// BEFORE (WRONG):
.eq('created_by', user.id)
```

However, opportunities in the database can have either:
- `created_by` field - The user who created the opportunity
- `owner_id` field - The user who owns/is responsible for the opportunity

The user's opportunity was likely assigned with `owner_id` but not `created_by`, so it wasn't appearing on the dashboard.

## Solution
Updated the Dashboard to check **both** fields using Supabase's `.or()` operator:

```typescript
// AFTER (CORRECT):
.or(`created_by.eq.${user.id},owner_id.eq.${user.id}`)
```

This matches the same logic already used in the opportunities-client.ts file (lines 64, 74).

## Files Modified
- `/components/Dashboard.tsx`
  - Line ~475: Updated opportunities query to check both `created_by` and `owner_id`

## Result
✅ Opportunities assigned to a user (via `owner_id`) now appear on their dashboard
✅ Opportunities created by a user (via `created_by`) still appear on their dashboard
✅ Dashboard now matches the same filtering logic used in the Opportunities module
✅ larry.lee@ronaatlantic.ca should now see their 1 opportunity

## Context
The opportunities table has dual ownership fields to support:
1. **created_by** - For tracking who initially created the opportunity
2. **owner_id** - For tracking who is currently responsible for the opportunity

Both fields need to be checked when filtering "My Opportunities" to ensure users see all opportunities they own or created.

## Testing
1. Log in as larry.lee@ronaatlantic.ca
2. View the Dashboard
3. ✅ "My Active Opportunities" card should now show "1" instead of "0"
4. The opportunity value should also display in the "change" field

## Additional Notes
This fix ensures consistency across the entire CRM. The opportunities-client.ts file already had this correct filtering logic, but the Dashboard had an outdated query. Now both use the same approach.
