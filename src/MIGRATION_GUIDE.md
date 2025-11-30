# 🚀 Database Migration Guide - Add Missing Bids Columns

## Overview

This guide will help you add the missing columns to your `bids` table so that your ProSpaces CRM can:
- ✅ Store line items for bids
- ✅ Calculate taxes (subtotal, tax rate, tax amount)
- ✅ Track bid expiration dates
- ✅ Add notes to bids

## 📋 Prerequisites

- ✅ Access to your Supabase project dashboard
- ✅ SQL Editor access in Supabase
- ✅ Backup of your data (optional but recommended)

## 🔧 Two Migration Options

You have **two options** for this migration:

### Option 1: Simple JSONB Approach (Recommended for Quick Setup)
**File:** `/ADD_BIDS_COLUMNS_MIGRATION.sql`

**Pros:**
- ✅ Simpler migration
- ✅ Faster to implement
- ✅ Line items stored as JSON in bids table
- ✅ Good for small to medium datasets

**Cons:**
- ❌ Less efficient queries on line items
- ❌ No foreign key constraints on line items
- ❌ Manual total calculations required

### Option 2: Normalized with Separate Table (Recommended for Production)
**File:** `/ADD_BIDS_COLUMNS_WITH_LINE_ITEMS_TABLE.sql`

**Pros:**
- ✅ Proper database normalization
- ✅ Automatic total calculations via triggers
- ✅ Better query performance
- ✅ Foreign key constraints
- ✅ Easier to report on line items

**Cons:**
- ❌ More complex migration
- ❌ Requires managing multiple tables

## 📝 Step-by-Step Instructions

### Step 1: Choose Your Migration Script

**For Quick Setup (Option 1):**
```
Use: /ADD_BIDS_COLUMNS_MIGRATION.sql
```

**For Production (Option 2):**
```
Use: /ADD_BIDS_COLUMNS_WITH_LINE_ITEMS_TABLE.sql
```

### Step 2: Open Supabase SQL Editor

1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Select your ProSpaces CRM project
3. Click **SQL Editor** in the left sidebar
4. Click **New query** button

### Step 3: Copy and Run the Migration Script

1. Open the migration file you chose in Step 1
2. Copy the **entire contents** of the file
3. Paste it into the Supabase SQL Editor
4. Click **Run** (or press Cmd/Ctrl + Enter)

### Step 4: Verify the Migration

The migration script includes verification queries at the bottom. Check the results:

**Expected output for Option 1:**
```
✅ Columns added: subtotal, tax_rate, tax_amount, valid_until, notes, items
✅ Existing bids updated with default values
✅ Indexes created
```

**Expected output for Option 2:**
```
✅ Columns added to bids table
✅ bid_line_items table created
✅ Triggers created for auto-calculation
✅ RLS policies enabled
✅ Helper function created
```

### Step 5: Test with Sample Data

Run this test query to verify the migration worked:

```sql
-- Check bids table structure
SELECT column_name, data_type 
FROM information_schema.columns
WHERE table_name = 'bids' 
  AND table_schema = 'public'
ORDER BY ordinal_position;
```

**Expected columns:**
- id
- opportunity_id
- title
- description
- amount
- status
- submitted_date
- project_manager_id
- organization_id
- created_by
- created_at
- updated_at
- **subtotal** ← NEW
- **tax_rate** ← NEW
- **tax_amount** ← NEW
- **valid_until** ← NEW
- **notes** ← NEW
- **items** ← NEW (Option 1 only)

### Step 6: Test the Test Data Generator

1. Go to your ProSpaces CRM application
2. Navigate to **Settings → Test Data**
3. Click **"Check Database"** - should show all green checkmarks
4. Click **"Generate Test Data"** - should succeed without errors
5. Check that 6 bids were created with line items and tax calculations

## 🎯 What Each Migration Does

### Option 1 (Simple JSONB)

**Adds these columns to `bids` table:**
```sql
ALTER TABLE bids ADD COLUMN:
  - subtotal NUMERIC(12,2)         -- Amount before tax
  - tax_rate NUMERIC(5,2)          -- Tax percentage (e.g., 8.5)
  - tax_amount NUMERIC(12,2)       -- Calculated tax
  - valid_until DATE               -- Bid expiration date
  - notes TEXT                     -- Additional notes
  - items JSONB                    -- Line items as JSON array
```

**Items JSON structure:**
```json
[
  {
    "id": "uuid",
    "itemName": "Product Name",
    "sku": "SKU-001",
    "quantity": 10,
    "unitPrice": 100.00,
    "discount": 5,
    "total": 950.00
  }
]
```

### Option 2 (Normalized)

**Adds these columns to `bids` table:**
```sql
ALTER TABLE bids ADD COLUMN:
  - subtotal NUMERIC(12,2)
  - tax_rate NUMERIC(5,2)
  - tax_amount NUMERIC(12,2)
  - valid_until DATE
  - notes TEXT
```

**Creates new `bid_line_items` table:**
```sql
CREATE TABLE bid_line_items:
  - id UUID PRIMARY KEY
  - bid_id UUID (foreign key to bids)
  - item_id UUID (optional reference to inventory)
  - item_name TEXT
  - sku TEXT
  - description TEXT
  - quantity INTEGER
  - unit_price NUMERIC(12,2)
  - discount NUMERIC(5,2)
  - discount_amount NUMERIC(12,2)
  - subtotal NUMERIC(12,2)
  - total NUMERIC(12,2)
  - sort_order INTEGER
  - organization_id TEXT
  - created_at TIMESTAMPTZ
  - updated_at TIMESTAMPTZ
```

**Creates automatic calculation trigger:**
- When you add/update/delete a line item
- Automatically recalculates bid totals
- Updates subtotal, tax_amount, and amount fields

## 📊 Example: Creating a Bid After Migration

### Option 1 (JSONB):
```typescript
const bid = await bidsAPI.create({
  opportunity_id: "...",
  title: "Office Furniture Bid",
  amount: 10807.50,
  subtotal: 10000.00,
  tax_rate: 8.075,
  tax_amount: 807.50,
  valid_until: "2025-02-28",
  notes: "Includes delivery and installation",
  items: JSON.stringify([
    {
      id: crypto.randomUUID(),
      itemName: "Office Chair",
      sku: "CHR-001",
      quantity: 10,
      unitPrice: 500,
      discount: 0,
      total: 5000
    },
    {
      id: crypto.randomUUID(),
      itemName: "Standing Desk",
      sku: "DSK-001",
      quantity: 5,
      unitPrice: 1000,
      discount: 0,
      total: 5000
    }
  ])
});
```

### Option 2 (Normalized):
```typescript
// 1. Create the bid
const bid = await bidsAPI.create({
  opportunity_id: "...",
  title: "Office Furniture Bid",
  amount: 0,  // Will be auto-calculated
  tax_rate: 8.075,
  valid_until: "2025-02-28",
  notes: "Includes delivery and installation"
});

// 2. Add line items
const supabase = createClient();
await supabase.from('bid_line_items').insert([
  {
    bid_id: bid.id,
    item_name: "Office Chair",
    sku: "CHR-001",
    quantity: 10,
    unit_price: 500.00,
    discount: 0,
    subtotal: 5000.00,
    total: 5000.00,
    organization_id: "org_001"
  },
  {
    bid_id: bid.id,
    item_name: "Standing Desk",
    sku: "DSK-001",
    quantity: 5,
    unit_price: 1000.00,
    discount: 0,
    subtotal: 5000.00,
    total: 5000.00,
    organization_id: "org_001"
  }
]);

// 3. Totals are automatically calculated by trigger!
// subtotal = 10000.00
// tax_amount = 807.50 (10000 × 8.075%)
// amount = 10807.50
```

## ⚠️ Important Notes

### Existing Data
Both migration scripts will:
- ✅ Update existing bids with default values (subtotal = amount, tax = 0)
- ✅ Preserve all existing bid data
- ✅ Add empty arrays for items (Option 1) or no line items (Option 2)

### TestDataGenerator
After migration, the TestDataGenerator will create bids with:
- ✅ 2 line items per bid
- ✅ 8.5% tax rate
- ✅ Proper subtotal/tax calculations
- ✅ 60-day validity period
- ✅ Descriptive notes

## 🔄 Rollback (If Needed)

If you need to undo the migration:

### Option 1 Rollback:
```sql
ALTER TABLE public.bids
  DROP COLUMN IF EXISTS subtotal,
  DROP COLUMN IF EXISTS tax_rate,
  DROP COLUMN IF EXISTS tax_amount,
  DROP COLUMN IF EXISTS valid_until,
  DROP COLUMN IF EXISTS notes,
  DROP COLUMN IF EXISTS items;
```

### Option 2 Rollback:
```sql
-- Drop triggers and functions
DROP TRIGGER IF EXISTS trigger_bid_line_items_calculate_totals ON public.bid_line_items;
DROP FUNCTION IF EXISTS public.trigger_calculate_bid_totals();
DROP FUNCTION IF EXISTS public.calculate_bid_totals(UUID);

-- Drop line items table
DROP TABLE IF EXISTS public.bid_line_items;

-- Drop columns from bids
ALTER TABLE public.bids
  DROP COLUMN IF EXISTS subtotal,
  DROP COLUMN IF EXISTS tax_rate,
  DROP COLUMN IF EXISTS tax_amount,
  DROP COLUMN IF EXISTS valid_until,
  DROP COLUMN IF EXISTS notes;
```

## ✅ Success Checklist

After running the migration, verify:

- [ ] SQL script executed without errors
- [ ] Verification queries show new columns
- [ ] "Check Database" in Test Data Generator shows green checkmarks
- [ ] "Generate Test Data" creates bids successfully
- [ ] Bids have line items and tax calculations
- [ ] OpportunityDetail component shows bid data correctly

## 🆘 Troubleshooting

### Error: "column already exists"
**Cause:** Migration was already run
**Solution:** This is fine! The `IF NOT EXISTS` clauses prevent errors. You can safely ignore this.

### Error: "permission denied"
**Cause:** RLS policies blocking the migration
**Solution:** Make sure you're running as the database owner in Supabase SQL Editor

### TestDataGenerator still fails
**Cause:** Migration didn't complete successfully
**Solution:** 
1. Check the SQL Editor for error messages
2. Run the verification queries manually
3. Try the rollback script and re-run migration

## 📞 Need Help?

If you encounter issues:
1. Check the console logs in your browser
2. Check the Supabase logs in the dashboard
3. Run the verification queries to see what's wrong
4. Use the rollback script if needed

---

**Ready to migrate?** Choose your option and follow the steps above! 🚀
