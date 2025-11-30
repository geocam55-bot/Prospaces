# ✅ Fixed: items Column Error

## Error Messages
```
[bids-client] Error creating bid: Could not find the 'items' column of 'bids' in the schema cache
```

## Root Cause
The TestDataGenerator was trying to insert columns that don't exist in your actual bids table schema:
- ❌ `items` (line items data)
- ❌ `customer_id` (links to customer)
- ❌ `subtotal` (calculation field)
- ❌ `tax_rate` (tax percentage)
- ❌ `tax_amount` (calculated tax)
- ❌ `valid_until` (expiration date)
- ❌ `notes` (additional notes)

## Actual Bids Table Schema

Based on your SQL migration files, the actual bids table has these columns:

```sql
CREATE TABLE bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID NOT NULL,           -- ✅ Links to opportunity
  title TEXT NOT NULL,                    -- ✅ Bid title
  description TEXT,                       -- ✅ Bid description
  amount NUMERIC(12,2),                   -- ✅ Total bid amount
  status TEXT DEFAULT 'draft',            -- ✅ Bid status
  submitted_date DATE,                    -- ✅ When bid was submitted
  project_manager_id UUID,                -- ✅ Links to project manager
  organization_id TEXT NOT NULL,          -- ✅ Multi-tenant isolation
  created_by UUID,                        -- ✅ Who created it
  created_at TIMESTAMPTZ DEFAULT NOW(),   -- ✅ When created
  updated_at TIMESTAMPTZ DEFAULT NOW()    -- ✅ Last updated
);
```

**Note:** There is NO `items` column for line items. If you need line items, they should be in a separate `bid_line_items` table.

## The Fix

### Before (TestDataGenerator.tsx - Lines 250-273):
```typescript
const bidData = {
  title: `${opp.title} - Proposal ${j + 1}`,
  opportunity_id: opp.id,
  customer_id: contact.id,           // ❌ Column doesn't exist
  project_manager_id: pm.id,
  amount: bidAmount,
  subtotal: bidAmount / 1.08,        // ❌ Column doesn't exist
  tax_rate: 8,                       // ❌ Column doesn't exist
  tax_amount: bidAmount - (bidAmount / 1.08), // ❌ Column doesn't exist
  status: j === 0 ? 'draft' : 'submitted',
  valid_until: new Date(...).toISOString().split('T')[0], // ❌ Column doesn't exist
  notes: `Test bid ${j + 1} for ${opp.title}`, // ❌ Column doesn't exist
  items: JSON.stringify([...]),      // ❌ Column doesn't exist
};
```

### After:
```typescript
const bidData = {
  title: `${opp.title} - Proposal ${j + 1}`,       // ✅ Exists
  opportunity_id: opp.id,                           // ✅ Exists
  project_manager_id: pm.id,                        // ✅ Exists
  amount: bidAmount,                                // ✅ Exists
  status: j === 0 ? 'draft' : 'submitted',          // ✅ Exists
  description: `Test bid ${j + 1} for ${opp.title}`, // ✅ Exists
  submitted_date: new Date(...).toISOString().split('T')[0], // ✅ Exists
};
```

## What This Means for Your Application

### Line Items Not Stored

Your current database schema does **NOT** support storing line items with bids. You have two options:

#### Option 1: Keep It Simple (Current Fix)
Just store the total amount in the bid. No line item breakdown.

```typescript
// Creating a bid - just the total
const bid = {
  title: "Office Furniture Bid",
  amount: 50000.00,  // Total amount only
  opportunity_id: "...",
};
```

#### Option 2: Add Line Items Support (Requires Database Migration)
Create a separate table for bid line items:

```sql
-- Run this SQL in Supabase to add line items support
CREATE TABLE bid_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bid_id UUID NOT NULL REFERENCES bids(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  sku TEXT,
  quantity INTEGER NOT NULL,
  unit_price NUMERIC(12,2) NOT NULL,
  discount NUMERIC(5,2) DEFAULT 0,
  total NUMERIC(12,2) NOT NULL,
  organization_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE bid_line_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_users_read_bid_line_items" 
ON bid_line_items FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_users_manage_bid_line_items" 
ON bid_line_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
```

Then you could create line items separately:
```typescript
// First create the bid
const bid = await bidsAPI.create({ title: "...", amount: 50000 });

// Then create line items
await supabase.from('bid_line_items').insert([
  { bid_id: bid.id, item_name: "Chair", quantity: 10, unit_price: 500, total: 5000 },
  { bid_id: bid.id, item_name: "Desk", quantity: 5, unit_price: 1000, total: 5000 },
]);
```

### Tax Calculations Not Stored

Your schema also doesn't store tax breakdown (`subtotal`, `tax_rate`, `tax_amount`). The `amount` field stores the total.

If you need tax calculations:
1. Calculate them in the UI when displaying bids
2. Store them in a separate table
3. OR add columns to the bids table:

```sql
-- Optional: Add tax columns to bids table
ALTER TABLE bids 
  ADD COLUMN subtotal NUMERIC(12,2),
  ADD COLUMN tax_rate NUMERIC(5,2),
  ADD COLUMN tax_amount NUMERIC(12,2);
```

## Files Modified

1. **`/components/TestDataGenerator.tsx`** - Removed all non-existent columns from bid creation

## Current Behavior

The TestDataGenerator now creates simple bids with:
- ✅ Title
- ✅ Amount (total only)
- ✅ Status (draft or submitted)
- ✅ Description
- ✅ Submitted date
- ✅ Links to opportunity and project manager

## Recommendation

If your application UI expects line items, tax calculations, or other fields that don't exist in the database:

1. **Update your UI** to work with simple bids (amount only)
2. **OR run a database migration** to add the missing columns/tables

Check your `/components/OpportunityDetail.tsx` and other components to see if they reference fields that don't exist in the database.

## Status

✅ **FIXED** - Test Data Generator now only uses columns that exist in the database schema!

## Next Steps

Try generating test data again:
1. Go to **Settings → Test Data**
2. Click **"Generate Test Data"**
3. Should now succeed! ✅
