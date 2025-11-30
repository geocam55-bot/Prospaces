# Fix Opportunities Errors

## Current Errors

You're seeing these errors:
1. ❌ `Could not find a relationship between 'opportunities' and 'contacts'`
2. ❌ `Could not find the 'owner_id' column of 'opportunities'`

## Root Cause

The opportunities table in your Supabase database is using an older schema that has:
- `stage` column instead of `status`
- `created_by` column instead of `owner_id`
- A foreign key constraint that the app no longer uses

## Solution

Run the migration script to update your database schema.

### Steps to Fix

#### Option 1: Quick Fix (Recommended)

1. **Open Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Select your project

2. **Open SQL Editor**
   - Click "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Run the Migration**
   - Copy the entire contents of `SIMPLE-OPPORTUNITIES-FIX.sql`
   - Paste into the SQL Editor
   - Click "Run" (or press Ctrl/Cmd + Enter)

4. **Verify Success**
   - You should see green checkmarks (✓) in the output
   - The last line should say "✅ Migration complete!"

5. **Refresh Your App**
   - Go back to your ProSpaces CRM app
   - Refresh the page
   - The errors should be gone!

#### Option 2: Alternative Migration

If the simple fix doesn't work, you can try the more comprehensive migration:
- Use `FIX-OPPORTUNITIES-COLUMNS.sql` instead
- Follow the same steps as above

### What the Migration Does

✅ Adds `owner_id` column (copies data from `created_by` if it exists)  
✅ Adds `status` column (maps data from `stage` if it exists)  
✅ Ensures `organization_id` column exists  
✅ Creates performance indexes  
✅ Sets up Row Level Security (RLS) policies  
✅ Makes the schema match what the app expects  

### After Migration

Once the migration completes:
1. ✅ You can create new opportunities
2. ✅ You can view existing opportunities
3. ✅ Customer names will display correctly
4. ✅ All CRUD operations will work

### Troubleshooting

**Q: I see "column already exists" errors**  
A: That's normal! The migration is designed to be safe to run multiple times.

**Q: I see "table opportunities does not exist"**  
A: You need to create the opportunities table first. Run `SETUP_DATABASE.sql` or `database-setup.sql` first.

**Q: The app still shows errors after migration**  
A: Try these steps:
1. Hard refresh your browser (Ctrl+Shift+R or Cmd+Shift+R)
2. Clear your browser cache
3. Check the browser console for any new errors
4. Verify the migration completed successfully in Supabase

**Q: I can't see any opportunities**  
A: Check that:
1. Your user has `organizationId` in their metadata
2. Existing opportunities have `organization_id` populated
3. RLS policies are not blocking your access

### Need More Help?

1. Check the Supabase logs in your dashboard
2. Look at the browser console (F12) for detailed error messages
3. Verify your authentication is working correctly

## Code Changes Made

The application code has been updated to:
- ✅ Work with both old and new database schemas
- ✅ Handle missing foreign key relationships gracefully
- ✅ Support both `status`/`stage` and `owner_id`/`created_by` columns
- ✅ Provide helpful error messages when schema is outdated

However, **running the migration is still recommended** for best performance and full feature support.
