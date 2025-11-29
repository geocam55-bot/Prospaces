# 🚨 URGENT: Fix PGRST204 Error - Add Cost Column

## Problem
You're getting a `PGRST204` error because the `cost` column doesn't exist in your Supabase inventory table yet.

```
Error: Could not find the 'cost' column of 'inventory' in the schema cache
```

## Solution (2 Minutes)

### Step 1: Add the Cost Column
1. Open your Supabase Dashboard
2. Go to **SQL Editor** (left sidebar)
3. Create a **New Query**
4. Copy and paste the ENTIRE contents of `/RUN_THIS_IN_SUPABASE.sql`
5. Click **Run** (or press Ctrl+Enter)
6. Wait for "Success" message

### Step 2: Verify
After running the script:
- Wait 5-10 seconds for the schema cache to refresh
- Go back to your app
- Try importing inventory again
- The PGRST204 error should be gone ✅

## What the Script Does

1. ✅ Adds `cost` column to inventory table (if missing)
2. ✅ Adds `quantity_on_order` column (if missing)
3. ✅ Updates the `bulk_insert_inventory()` function to handle cost
4. ✅ Refreshes the PostgREST schema cache

## After Running the Script

Your inventory imports/exports will support the cost field:

**CSV Format:**
```csv
name,sku,description,category,quantity,quantity_on_order,unit_price,cost
Sample Item,SKU-001,Sample description,Electronics,100,50,99.99,75.00
```

## Current Status

✅ Code is updated and ready (cost handling temporarily disabled until migration)
⏳ Database needs the cost column added
⏳ Need to run `/RUN_THIS_IN_SUPABASE.sql`

## Need Help?

If you still get errors after running the script:
1. Check the Supabase SQL Editor output for any error messages
2. Make sure the script completed successfully
3. Wait 10-15 seconds and refresh your app
4. If still having issues, manually verify the cost column exists:
   ```sql
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'inventory';
   ```

---

**Next Step:** Open `/RUN_THIS_IN_SUPABASE.sql` and run it in your Supabase SQL Editor now! 🚀
