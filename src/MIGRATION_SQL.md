# Database Migration SQL

## Issue
The automatic migration is failing because the `exec_sql` RPC function doesn't exist in your Supabase database.

## Solution 1: Manual Migration (Recommended)

Copy and paste this SQL into your Supabase SQL Editor:

```sql
-- Add notes column
ALTER TABLE public.bids ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add line_items column
ALTER TABLE public.bids ADD COLUMN IF NOT EXISTS line_items JSONB;

-- Add subtotal column
ALTER TABLE public.bids ADD COLUMN IF NOT EXISTS subtotal NUMERIC(12,2);

-- Add discount_percent column
ALTER TABLE public.bids ADD COLUMN IF NOT EXISTS discount_percent NUMERIC(5,2);

-- Add discount_amount column
ALTER TABLE public.bids ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(12,2);

-- Add tax_percent column
ALTER TABLE public.bids ADD COLUMN IF NOT EXISTS tax_percent NUMERIC(5,2);

-- Add tax_amount column
ALTER TABLE public.bids ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(12,2);

-- Add total column
ALTER TABLE public.bids ADD COLUMN IF NOT EXISTS total NUMERIC(12,2);

-- Add valid_until column
ALTER TABLE public.bids ADD COLUMN IF NOT EXISTS valid_until TIMESTAMPTZ;

-- Add project_manager_id column
ALTER TABLE public.bids ADD COLUMN IF NOT EXISTS project_manager_id UUID REFERENCES public.project_managers(id);

-- Add created_by column
ALTER TABLE public.bids ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
```

### Steps:
1. Go to your Supabase Dashboard
2. Navigate to: **SQL Editor** (in the left sidebar)
3. Click **"New Query"**
4. Paste the SQL above
5. Click **"Run"** or press `Ctrl+Enter` / `Cmd+Enter`
6. Refresh your ProSpaces CRM application

---

## Solution 2: Enable Automatic Migrations (Optional)

If you want to enable automatic migrations from within the app, you need to create the `exec_sql` RPC function.

⚠️ **Security Warning**: This function allows executing arbitrary SQL. Only use in controlled environments.

### Create the exec_sql Function

Run this SQL in your Supabase SQL Editor:

```sql
-- Create the exec_sql function for automatic migrations
CREATE OR REPLACE FUNCTION public.exec_sql(sql text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql;
END;
$$;

-- Grant execute permission to authenticated users
-- Note: You may want to restrict this to specific roles only
GRANT EXECUTE ON FUNCTION public.exec_sql(text) TO authenticated;

-- Optional: Restrict to service_role only (more secure)
-- REVOKE EXECUTE ON FUNCTION public.exec_sql(text) FROM authenticated;
-- GRANT EXECUTE ON FUNCTION public.exec_sql(text) TO service_role;
```

### Security Considerations:
- The `SECURITY DEFINER` means the function runs with the privileges of the function creator
- Consider restricting this function to admin users only
- For production, you might want to create a more restricted version that only allows specific operations
- Alternatively, only grant access to `service_role` and use a server-side endpoint

### After Creating the Function:
1. The automatic migrations in the app will work
2. You can click "Try Automatic Migration" button
3. No need to manually copy/paste SQL anymore

---

## Verification

After running the migration (either method), verify it worked:

```sql
-- Check the bids table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'bids' 
  AND table_schema = 'public'
ORDER BY ordinal_position;
```

You should see all the new columns listed.

---

## Troubleshooting

### If you get "relation does not exist" errors:
- Make sure the `bids` table exists first
- Check that you're in the correct Supabase project

### If you get foreign key constraint errors:
- Make sure the `project_managers` table exists
- The `project_manager_id` column is optional (nullable) so this shouldn't block the migration

### If columns already exist:
- The `IF NOT EXISTS` clause will prevent errors
- Already existing columns will be skipped safely
