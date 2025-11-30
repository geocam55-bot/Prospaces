# ⚡ Quick Start - 5 Minute Migration

## 🎯 Goal
Add missing columns to your bids table so the Test Data Generator works.

## 🚀 3 Simple Steps

### Step 1: Open Supabase SQL Editor (30 seconds)
1. Go to https://supabase.com/dashboard
2. Select your project
3. Click **SQL Editor** in sidebar
4. Click **New query**

### Step 2: Run Migration Script (1 minute)

**Choose ONE of these options:**

#### 🟢 OPTION A: Simple & Fast (Recommended)
Copy and paste this entire script into SQL Editor and click Run:

```sql
-- Add missing columns to bids table
ALTER TABLE public.bids
  ADD COLUMN IF NOT EXISTS subtotal NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS tax_rate NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valid_until DATE,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb;

-- Update existing bids
UPDATE public.bids
SET 
  subtotal = amount,
  tax_rate = 0,
  tax_amount = 0,
  items = '[]'::jsonb
WHERE subtotal IS NULL;

-- Create index
CREATE INDEX IF NOT EXISTS idx_bids_valid_until ON public.bids(valid_until);
```

#### 🔵 OPTION B: Production-Ready (More Complex)
Use the file `/ADD_BIDS_COLUMNS_WITH_LINE_ITEMS_TABLE.sql`
- Copy the entire contents
- Paste into SQL Editor
- Click Run

### Step 3: Test It (30 seconds)
1. Go to your ProSpaces CRM
2. Navigate to **Settings → Test Data**
3. Click **"Generate Test Data"**
4. Should see success message! ✅

## ✅ Done!

You should now see:
- 3 contacts created
- 3 opportunities created
- 6 bids created (with line items and tax calculations)

## ❌ If It Fails

**Still getting column errors?**
1. Check the SQL Editor for error messages
2. Make sure you clicked "Run" in SQL Editor
3. Try running the verification query:

```sql
SELECT column_name 
FROM information_schema.columns
WHERE table_name = 'bids' 
  AND column_name IN ('subtotal', 'tax_rate', 'tax_amount', 'valid_until', 'notes', 'items');
```

Expected result: Should show all 6 columns

**Still not working?**
- Check `/MIGRATION_GUIDE.md` for detailed troubleshooting
- Check browser console for specific error messages
- Verify you're logged into Supabase with the correct project

---

**Total Time: ~2 minutes** ⏱️

Your ProSpaces CRM is now ready with full bid support including line items, tax calculations, and expiration dates! 🎉
