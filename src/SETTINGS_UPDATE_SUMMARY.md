# Global Settings Enhancement - Tax Rate 2 & Quote Terms

## Summary
Added a second tax rate field and default quote terms to the Global Settings in ProSpaces CRM. These settings are now available in Settings > Organizations > Global Settings (Admin/Super Admin only).

## Changes Made

### 1. Database Schema (`SUPABASE_SETTINGS_TABLES.sql`)
- Added `tax_rate_2` field (NUMERIC(5, 2)) to `organization_settings` table
- Added `quote_terms` field (TEXT) to `organization_settings` table  
- Added migration script to add columns to existing tables

### 2. TypeScript Interfaces (`/utils/settings-client.ts`)
```typescript
export interface OrganizationSettings {
  organization_id: string;
  tax_rate: number;
  tax_rate_2: number;        // NEW
  default_price_level: string;
  quote_terms: string;        // NEW
  organization_name?: string;
  created_at?: string;
  updated_at?: string;
}
```

### 3. Global Settings Utility (`/lib/global-settings.ts`)
Added new helper functions:
- `getGlobalTaxRate2()` - Returns the second tax rate
- `getDefaultQuoteTerms()` - Returns default quote terms

Updated GlobalSettings interface:
```typescript
export interface GlobalSettings {
  taxRate: number;
  taxRate2?: number;           // NEW
  defaultPriceLevel: string;
  quoteTerms?: string;          // NEW
}
```

### 4. Settings Component (`/components/Settings.tsx`)
**UI Changes:**
- Renamed "Tax Rate (%)" to "Tax Rate 1 (%)"
- Added "Tax Rate 2 (%) - Optional" field
- Added "Default Terms for Quotes" textarea (4 rows)
- Organized tax rates in a 2-column grid layout

**State & Logic:**
- Updated `globalSettings` state to include `taxRate2` and `quoteTerms`
- Updated load function to read new fields from Supabase
- Updated save function to persist new fields to Supabase
- Both fields fallback to localStorage if Supabase is unavailable

### 5. Bids Component (`/components/Bids.tsx`)
**Interface Updates:**
```typescript
interface Quote {
  // ... existing fields
  taxPercent: number;
  taxPercent2?: number;      // NEW
  taxAmount: number;
  taxAmount2?: number;       // NEW
  // ... existing fields
}
```

**Form State:**
- Added `taxPercent2` to formData (initialized with `getGlobalTaxRate2()`)
- Updated `terms` to use `getDefaultQuoteTerms()` instead of hardcoded value

**Calculation Logic:**
```typescript
const calculateQuoteTotals = (lineItems, discountPercent, taxPercent, taxPercent2 = 0) => {
  const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0);
  const discountAmount = subtotal * (discountPercent / 100);
  const afterDiscount = subtotal - discountAmount;
  const taxAmount = afterDiscount * (taxPercent / 100);
  const taxAmount2 = afterDiscount * (taxPercent2 / 100);  // NEW
  const total = afterDiscount + taxAmount + taxAmount2;    // UPDATED

  return {
    subtotal,
    discountAmount,
    taxAmount,
    taxAmount2,    // NEW
    total,
  };
};
```

**Dialog Form:**
- Changed tax rate fields layout from 2-column to 3-column grid
- Added "Tax Rate 2 (%) - Optional" input field
- Made Tax Rate 1 editable (removed disabled state)
- Both tax rates can now be customized per quote

**Display Updates:**
- Quote list view: Shows "Tax 1" and "Tax 2" separately when applicable
- Quote preview dialog: Shows both tax amounts in summary
- Quote totals: Include both tax rates in total calculation
- Only shows Tax 2 row if `taxAmount2 > 0`

**Save/Load:**
- Save includes `tax_percent_2` and `tax_amount_2` fields
- Load maps `tax_percent_2` and `tax_amount_2` from database
- Handles both quotes and bids data formats

## Database Fields Mapping

| Frontend Field | Database Field | Type | Default |
|---|---|---|---|
| `taxRate2` | `tax_rate_2` | NUMERIC(5,2) | 0 |
| `quoteTerms` | `quote_terms` | TEXT | 'Payment due within 30 days. All prices in USD.' |
| `taxPercent2` | `tax_percent_2` | NUMERIC(5,2) | 0 |
| `taxAmount2` | `tax_amount_2` | NUMERIC(10,2) | 0 |

## Usage Instructions

### For Admins:
1. Navigate to **Settings** > **Organizations** tab
2. Scroll to **Global Settings** card (Admin/Super Admin only)
3. Set **Tax Rate 1 (%)** - Primary tax rate (e.g., 8.5 for 8.5%)
4. Set **Tax Rate 2 (%) - Optional** - Secondary tax rate if applicable (e.g., 2.0 for 2.0%)
5. Configure **Default Terms for Quotes** - These terms will auto-populate on new quotes
6. Click **Save Global Settings**

### For Users Creating Quotes:
1. Go to **Bids & Quotes** module
2. Click **Create Quote**
3. Tax rates will auto-populate from global settings
4. You can override tax rates per-quote if needed
5. Quote terms will auto-populate from global settings
6. Both tax rates are calculated and displayed separately in quote totals

## SQL Migration Script

**IMPORTANT:** Run the migration script before using the new features!

Execute the `/SQL_MIGRATION_TAX_RATE_2.sql` file in your Supabase SQL Editor. This script:
- Adds `tax_rate_2` and `quote_terms` to `organization_settings` table
- Adds `tax_percent_2` and `tax_amount_2` to `quotes` table
- Adds `tax_percent_2` and `tax_amount_2` to `bids` table (if exists)
- Creates performance indexes on the new fields
- Includes verification queries and rollback script

The script is safe to run multiple times (idempotent) and will skip columns that already exist.

## Files Modified

1. `/SUPABASE_SETTINGS_TABLES.sql` - Database schema
2. `/utils/settings-client.ts` - TypeScript interfaces
3. `/lib/global-settings.ts` - Helper functions
4. `/components/Settings.tsx` - Settings UI
5. `/components/Bids.tsx` - Bids & Quotes module

## Testing Checklist

- [ ] Run SQL migration script in Supabase
- [ ] Login as Admin
- [ ] Set Tax Rate 1 and Tax Rate 2 in Global Settings
- [ ] Set Default Quote Terms in Global Settings
- [ ] Save Global Settings (verify success message)
- [ ] Create a new quote - verify tax rates and terms auto-populate
- [ ] Verify both tax amounts calculate correctly
- [ ] Verify quote totals include both taxes
- [ ] Edit existing quote - verify tax rates load correctly
- [ ] View quote list - verify both tax amounts display
- [ ] Preview quote - verify both tax amounts shown
- [ ] Test with Tax Rate 2 = 0 (should not display Tax 2 row)

## Notes

- Tax Rate 2 is optional and only displays when > 0
- Quote terms support multi-line text (4-row textarea)
- All settings persist to Supabase with localStorage fallback
- Backward compatible - existing quotes work without Tax Rate 2
- Both tax rates apply to the after-discount amount
