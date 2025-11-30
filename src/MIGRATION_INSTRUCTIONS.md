# Database Migration Instructions - CRITICAL FIXES

## Problems
1. **Missing `organization_id` column**: The `project_managers` and `opportunities` tables don't have the required `organization_id` column
2. **UUID type mismatch**: The `customer_id` columns are defined as UUID type, but your contacts have mixed ID formats (numeric IDs like "1763478008499-xrshjleb4" and UUIDs)

## Solution
This migration will:
1. Add `organization_id` column to both tables (if missing)
2. Change `customer_id` from UUID to TEXT to support all ID formats
3. Create necessary indexes
4. Verify the changes

## Steps to Fix

### 1. Open Supabase SQL Editor
1. Go to your Supabase dashboard
2. Click on "SQL Editor" in the left sidebar
3. Click "New query"

### 2. Run the Migration SQL
**Use the comprehensive migration file**: `/COMPLETE-FIX-MIGRATION.sql`

Copy and paste the entire contents and click "Run":

See the complete SQL in `/COMPLETE-FIX-MIGRATION.sql` - it handles everything automatically!

### 3. Handle Existing Records (If Needed)
If you have existing records in `project_managers` or `opportunities` without an `organization_id`:

1. Check the verification output at the end of the migration
2. If you see records missing `organization_id`, uncomment the UPDATE section in the migration file
3. Replace `'YOUR_ORG_ID'` with your actual organization ID
4. Re-run the migration

**To find your organization ID:**
```sql
SELECT id, name FROM public.organizations LIMIT 5;
```

### 4. Verify the Results
After running the migration, you should see output showing:
- `project_managers.customer_id` = `text`
- `project_managers.organization_id` = `text`
- `opportunities.customer_id` = `text`
- `opportunities.organization_id` = `text`

### 5. Test the Application
Once the migration is complete, try:
1. Opening a contact with a numeric ID (e.g., "1763478008499-xrshjleb4")
2. Adding a project manager to that contact
3. Creating an opportunity
4. All errors should now be resolved!

## What Was Fixed

### Code Changes
1. **Updated schema files** (`SETUP_DATABASE.sql` and `database-setup.sql`)
   - Ensured `customer_id` is `text` type in both tables
   - Ensured `organization_id` exists in both tables

2. **Fixed project-managers-client.ts**
   - Added `organization_id` field (was missing and is required)
   - Now retrieves organization from authenticated user metadata

3. **Fixed opportunities-client.ts**
   - Added `organization_id` field (was missing and is required)
   - Now retrieves organization from authenticated user metadata

### Migration Files Created
- `/COMPLETE-FIX-MIGRATION.sql` - **USE THIS ONE** - Comprehensive migration that handles everything
- `/add-organization-id-to-project-managers.sql` - Simple version (for reference)
- `/fix-project-managers-customer-id.sql` - Previous migration (superseded)

### Code Files Modified
- `/utils/project-managers-client.ts` - Added organization_id support
- `/utils/opportunities-client.ts` - Added organization_id support
- `/SETUP_DATABASE.sql` - Already had correct schema
- `/database-setup.sql` - Already had correct schema

## Important Notes
- This migration is **safe to run** - it uses conditional logic to only make necessary changes
- **No data will be lost**
- The migration is **idempotent** (safe to run multiple times)
- If you have existing records, you'll need to update them with your organization ID
- **Run this migration IMMEDIATELY** to fix the current errors
