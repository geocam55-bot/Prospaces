# Quick Start Guide: Tax Rate 2 & Quote Terms

## 🚀 Getting Started

### Step 1: Run the Database Migration
1. Open your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Open the file `/SQL_MIGRATION_TAX_RATE_2.sql`
4. Copy and paste the entire script into the SQL Editor
5. Click **Run** to execute the migration
6. Verify success messages in the output

### Step 2: Configure Global Settings (Admin Only)
1. Login as **Admin** or **Super Admin**
2. Navigate to **Settings** (gear icon in sidebar)
3. Click the **Organizations** tab
4. Scroll to the **Global Settings** card
5. Configure the following:
   - **Tax Rate 1 (%)**: Your primary tax rate (e.g., `8.5`)
   - **Tax Rate 2 (%)**: Your secondary tax rate (e.g., `2.0`) - leave `0` if not needed
   - **Default Terms for Quotes**: Update with your standard terms
6. Click **Save Global Settings**

### Step 3: Create Your First Quote with Tax Rate 2
1. Navigate to **Bids & Quotes** module
2. Click **Create Quote** button
3. Fill in quote details:
   - Title, Contact, Valid Until date
   - Add line items from inventory
4. Notice in the **Pricing** section:
   - **Tax Rate 1 (%)**: Pre-filled from global settings (editable)
   - **Tax Rate 2 (%)**: Pre-filled from global settings (editable)
   - **Quote Discount (%)**: Optional discount to apply
5. View the **Quote Summary** showing:
   - Subtotal
   - Discount (if applicable)
   - Tax 1 amount
   - Tax 2 amount (if Tax Rate 2 > 0)
   - **Total** (includes both taxes)
6. Click **Save Quote**

## 📊 How Tax Calculations Work

### Example Scenario
- **Subtotal**: $1,000.00
- **Quote Discount**: 10%
- **Tax Rate 1**: 8.5% (State Tax)
- **Tax Rate 2**: 2.0% (County Tax)

### Calculation Breakdown
```
Subtotal:               $1,000.00
Discount (10%):         -$100.00
─────────────────────────────────
After Discount:         $900.00

Tax 1 (8.5%):           $76.50      ($900.00 × 0.085)
Tax 2 (2.0%):           $18.00      ($900.00 × 0.020)
─────────────────────────────────
Total Taxes:            $94.50
─────────────────────────────────
TOTAL:                  $994.50
```

**Important Notes:**
- Both tax rates apply to the **after-discount** amount
- Taxes are calculated independently (not compounded)
- Tax 2 only displays if the rate is greater than 0%

## 🎯 Use Cases

### Single Tax Rate (Most Common)
- Set **Tax Rate 1** to your sales tax rate
- Leave **Tax Rate 2** at `0`
- Only Tax 1 will display on quotes

### Multiple Tax Jurisdictions
- **Tax Rate 1**: State sales tax (e.g., 6%)
- **Tax Rate 2**: City/County tax (e.g., 2.5%)
- Both taxes display separately on quotes

### No Tax Required
- Set both **Tax Rate 1** and **Tax Rate 2** to `0`
- No tax lines will appear on quotes

## ✏️ Customizing Per Quote

While global settings provide defaults, you can customize tax rates for individual quotes:

1. When creating/editing a quote
2. Navigate to the **Pricing** section
3. Change either tax rate field to your desired value
4. The quote summary updates automatically
5. Save the quote with custom tax rates

This is useful for:
- Tax-exempt customers
- International orders
- Special promotional pricing
- Different tax jurisdictions

## 📋 Quote Terms Feature

### Setting Default Terms
1. In **Global Settings**, enter your standard terms:
   ```
   Payment due within 30 days. 
   All prices in USD.
   Products are sold as-is.
   Custom orders are non-refundable.
   ```
2. These terms auto-populate on all new quotes
3. Save time by not retyping standard terms

### Customizing Per Quote
1. Scroll to the **Terms** field when creating a quote
2. Edit or replace the default terms as needed
3. Useful for special contract conditions

## 🔍 Viewing Quotes

### Quote List View
- Each quote card shows:
  - Subtotal
  - Discount (if applied)
  - **Tax 1** with percentage and amount
  - **Tax 2** with percentage and amount (if > 0)
  - **Total** amount

### Quote Preview/Detail View
- Full breakdown of all calculations
- Line items with individual pricing
- Detailed tax calculations
- Terms and conditions section
- Professional quote summary

## ❓ Frequently Asked Questions

### Can I have different tax rates for different customers?
Yes! While global settings provide defaults, you can customize tax rates when creating each quote.

### What if I don't need Tax Rate 2?
Simply leave it at `0` in Global Settings. It won't appear on quotes if it's zero.

### Can I change tax rates on existing quotes?
Yes! Edit the quote and update the tax rate fields. The totals will recalculate automatically.

### Do both taxes compound on each other?
No, both tax rates apply independently to the after-discount subtotal. They don't compound.

### Can different users have different default tax rates?
Tax rates are set at the organization level, not per-user. However, users can customize rates per quote.

## 🆘 Troubleshooting

### Tax Rate 2 field not showing
1. Verify you ran the SQL migration script
2. Check browser console for errors
3. Try logging out and back in
4. Clear browser cache

### Tax calculations seem incorrect
1. Remember both taxes apply to the after-discount amount
2. Verify tax rates are entered as percentages (e.g., `8.5` not `0.085`)
3. Check that discount percentage is also correct

### Global settings not saving
1. Verify you're logged in as Admin or Super Admin
2. Check Supabase connection in browser console
3. Verify organization_settings table exists
4. Check RLS policies allow admin updates

## 📞 Support

For additional help:
1. Check the `/SETTINGS_UPDATE_SUMMARY.md` for technical details
2. Review the SQL migration output for any errors
3. Check browser console for JavaScript errors
4. Verify Supabase connection and table structure

## 🎉 You're All Set!

Your ProSpaces CRM now supports:
- ✅ Multiple tax rates per quote
- ✅ Separate display of each tax
- ✅ Accurate total calculations
- ✅ Default quote terms
- ✅ Per-quote customization
- ✅ Professional quote presentation

Start creating quotes with comprehensive tax handling today!
