# Database Migration Instructions

## Fix Opportunities Table Columns

### Problem
The opportunities table is missing required columns that the application expects:
- `owner_id` - to track who owns the opportunity
- `status` - to track the opportunity status (instead of `stage`)
- The `customer_id` column needs to be TEXT type (not UUID)

### Solution
Run the migration file: `FIX-OPPORTUNITIES-COLUMNS.sql`

### How to Run

#### Option 1: Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy and paste the entire contents of `FIX-OPPORTUNITIES-COLUMNS.sql`
5. Click **Run** (or press Ctrl/Cmd + Enter)
6. Check the output for success messages

#### Option 2: Supabase CLI
```bash
supabase db execute --file FIX-OPPORTUNITIES-COLUMNS.sql
```

### What This Migration Does

1. **Adds `owner_id` column** - If `created_by` exists, copies its data to `owner_id`
2. **Adds `status` column** - If `stage` exists, copies its data to `status`
3. **Converts `customer_id` to TEXT** - Changes from UUID to TEXT to support flexible ID formats
4. **Ensures `organization_id` exists** - Adds if missing
5. **Creates indexes** - For better query performance
6. **Sets up Row Level Security (RLS)** - For multi-tenant data isolation
7. **Creates RLS policies** - Ensures users only see their organization's data

### Verification

After running the migration, you should see output like:
```
NOTICE:  Added owner_id column and copied data from created_by
NOTICE:  Added status column and copied data from stage
NOTICE:  Changed customer_id to TEXT in opportunities
NOTICE:  organization_id column already exists
NOTICE:  Created RLS policies for opportunities
NOTICE:  ================================================
NOTICE:  OPPORTUNITIES TABLE MIGRATION COMPLETE
NOTICE:  ================================================
```

### Expected Schema After Migration

The opportunities table should have these columns:
- `id` (uuid) - Primary key
- `title` (text) - Opportunity title
- `description` (text) - Description
- `customer_id` (text) - Reference to customer/contact
- `status` (text) - Status: 'open', 'in_progress', 'won', 'lost'
- `value` (numeric) - Opportunity value
- `expected_close_date` (date) - Expected close date
- `owner_id` (uuid) - Who owns this opportunity
- `organization_id` (text) - Organization for multi-tenant isolation
- `created_at` (timestamp) - When created
- `updated_at` (timestamp) - Last updated

### Troubleshooting

**Error: "relation opportunities does not exist"**
- The opportunities table hasn't been created yet. Run `NUCLEAR-FIX.sql` or `SETUP_DATABASE.sql` first.

**Error: "column already exists"**
- This is normal! The migration is idempotent and will skip columns that already exist.

**No data showing in app after migration**
- Make sure your user metadata has `organizationId` set
- Check that existing opportunities have `organization_id` populated
- Verify RLS policies are working correctly

### After Migration

Once the migration completes successfully:
1. Refresh your application
2. The errors should be resolved
3. You should be able to create and view opportunities

### Need Help?

If you encounter issues:
1. Check the Supabase logs in the dashboard
2. Verify your user has proper authentication
3. Ensure organization_id is set in user metadata
4. Check that RLS policies are not blocking your access
