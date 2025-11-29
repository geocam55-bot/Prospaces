# Fix: "Could not find the 'city' column" Error

## Problem
You're getting this error when creating contacts:
```
Error: Could not find the 'city' column of 'contacts' in the schema cache
```

This is a **Supabase schema cache** issue. The database schema has changed, but Supabase's PostgREST API layer still has an old cached version.

## Solution (Multiple Options)

### Option 1: Refresh Schema Cache (RECOMMENDED - Try This First)

1. **Go to Supabase Dashboard** → **SQL Editor**
2. **Run this SQL command:**
   ```sql
   NOTIFY pgrst, 'reload schema';
   ```
3. **Wait 10-15 seconds** for the cache to refresh
4. **Try creating a contact again**

### Option 2: Restart Your Supabase Project

If Option 1 doesn't work:

1. **Go to Supabase Dashboard** → **Settings** → **General**
2. **Click "Pause project"**
3. **Wait for it to pause completely**
4. **Click "Resume project"**
5. **Wait for it to fully restart (1-2 minutes)**
6. **Try creating a contact again**

### Option 3: Verify Schema and Add Missing Columns

If the issue persists, there might actually be missing columns. Run this to check:

```sql
-- Check what columns exist in contacts table
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'contacts'
ORDER BY ordinal_position;
```

If you see that columns are missing, run the full migration from `/RUNTHIS-complete-migration.sql`.

## What Was Fixed in the Code

I've updated `/utils/contacts-client.ts` to:
1. ✅ Filter out any unknown fields before sending to database
2. ✅ Only send fields that actually exist in the schema
3. ✅ Transform `created_at` to `createdAt` so dates display properly

This prevents the "city" column error even if somehow that field gets into the data.

## Why This Happened

The `city`, `state`, `zipCode`, and `country` fields were referenced in the ImportExport component but were never actually added to the database. When Supabase's cache got confused about the schema, it caused this error.

## Next Steps

1. **Try Option 1 first** (refresh schema cache)
2. **If that doesn't work**, try Option 2 (restart project)
3. **Contact creation should now work** with all the new fields including Legacy #, Account Owner #, Address, Notes, and Sales/GP% fields
