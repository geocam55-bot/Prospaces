# Fix: Saved Designs Not Saving to Supabase

## Issue Summary
**Issue 1**: Saved Designs in Project Wizards (Deck, Shed, and Garage Planners) were suspected to be saving only to localStorage. However, **the code is already configured to save to Supabase**. There is no localStorage usage in the saved designs components.

**Issue 2**: Materials sections in Project Wizards are not showing pricing because **Material Defaults have not been configured** in Settings → Project Wizard Settings.

## Root Cause

### Saved Designs Issue
The database tables for saved designs may not have been created in your Supabase instance yet, or there may be issues with Row Level Security (RLS) policies preventing saves.

### Materials Pricing Issue
The materials pricing feature requires:
1. The `project_wizard_defaults` table to exist in Supabase
2. Material defaults to be configured (mapping material categories to inventory items)
3. Inventory items with T1 pricing to be set up

Without these configurations, materials will show quantities but no pricing.

## Solution

### Step 1: Run the Database Setup SQL

Open your Supabase SQL Editor and run the file:
```
/SETUP_PROJECT_WIZARD_SAVED_DESIGNS.sql
```

This will:
1. ✅ Create `saved_deck_designs` table
2. ✅ Create `saved_shed_designs` table
3. ✅ Create `saved_garage_designs` table
4. ✅ Set up proper indexes for performance
5. ✅ Enable Row Level Security (RLS)
6. ✅ Create RLS policies for all three tables
7. ✅ Set up triggers for `updated_at` timestamps
8. ✅ Grant proper permissions to authenticated users
9. ✅ Run verification queries to confirm setup

### Step 2: Verify Tables Exist

After running the SQL, you should see output like:
```
✓ saved_deck_designs table exists
✓ saved_shed_designs table exists
✓ saved_garage_designs table exists
```

And a table showing record counts:
```
table_name              | record_count
------------------------|-------------
saved_deck_designs      | 0
saved_shed_designs      | 0
saved_garage_designs    | 0
```

### Step 3: Test Saving a Design

1. Navigate to Project Wizards > Deck Planner (or Shed/Garage)
2. Configure a design
3. Click on "Saved Designs" tab
4. Enter a design name
5. (Optional) Select a customer
6. (Optional) Add a description
7. Click "Save Design"

**With the updated code, you will now see:**
- ✅ More detailed error messages if something goes wrong
- ✅ Console logs showing successful saves: `"✓ Design saved to Supabase successfully"`
- ✅ Better error details in the console if there's a database issue

### Step 4: Check Browser Console

Open your browser's Developer Tools (F12) and check the Console tab:

**If saving successfully:**
```
✓ Design saved to Supabase successfully: {id: "...", name: "...", ...}
```

**If there's an error:**
```
Supabase error details: {message: "...", code: "...", ...}
Error saving design: Database error: [specific error message]
```

### Step 5: Verify in Supabase Dashboard

1. Go to your Supabase project dashboard
2. Click on "Table Editor" in the left sidebar
3. Look for these tables:
   - `saved_deck_designs`
   - `saved_shed_designs`
   - `saved_garage_designs`
4. Check if records appear after saving designs

## What Was Changed

### 1. Database Setup
- Created comprehensive SQL migration file: `/SETUP_PROJECT_WIZARD_SAVED_DESIGNS.sql`
- Ensures all tables, indexes, RLS policies, and permissions are properly configured

### 2. Enhanced Error Handling
Updated all three saved design components with better error handling:

**Before:**
```typescript
catch (error) {
  console.error('Error saving design:', error);
  setSaveMessage('Error saving design. Please try again.');
}
```

**After:**
```typescript
catch (error: any) {
  console.error('Supabase error details:', error);
  throw new Error(`Database error: ${error.message}`);
}
catch (error: any) {
  console.error('Error saving design:', error);
  setSaveMessage(`Error saving design: ${error.message || 'Please check console for details'}`);
  setTimeout(() => setSaveMessage(''), 5000);
}
```

### 3. Success Confirmation
Added console logging for successful saves:
```typescript
console.log('✓ Design saved to Supabase successfully:', data);
setSaveMessage('Design saved successfully to database!');
```

## Database Schema

### Tables Created

#### saved_deck_designs
```sql
- id (UUID, Primary Key)
- organization_id (TEXT, FK to organizations)
- user_id (UUID, FK to auth.users)
- customer_id (UUID, FK to contacts, nullable)
- name (TEXT, required)
- description (TEXT, nullable)
- config (JSONB, design configuration)
- price_tier (TEXT, default: 't1')
- total_cost (DECIMAL(10,2), default: 0)
- materials (JSONB, materials list)
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)
```

#### saved_shed_designs
Same schema as `saved_deck_designs`

#### saved_garage_designs
Same schema as `saved_deck_designs`

### Row Level Security Policies

For each table, the following policies are created:

1. **SELECT**: Users can view designs from their organization
   ```sql
   organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
   ```

2. **INSERT**: Users can create designs in their organization
   ```sql
   organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
   AND user_id = auth.uid()
   ```

3. **UPDATE**: Users can update their own designs
   ```sql
   user_id = auth.uid()
   ```

4. **DELETE**: Users can delete their own designs
   ```sql
   user_id = auth.uid()
   ```

## Troubleshooting

### Issue: "relation 'saved_deck_designs' does not exist"
**Solution:** Run the SQL setup file from Step 1 above.

### Issue: "new row violates row-level security policy"
**Solution:** Check that:
1. The user has a valid `organization_id` in their profile
2. The RLS policies were created correctly (re-run the SQL setup)

### Issue: "Error loading designs"
**Solution:** 
1. Check browser console for detailed error
2. Verify user has access to the organization
3. Check Supabase logs in the dashboard

### Issue: Designs save but don't appear in the list
**Solution:**
1. Check that `organization_id` matches between save and load
2. Refresh the page to reload designs
3. Check Supabase Table Editor to see if records exist

## Files Modified

1. `/components/deck/SavedDeckDesigns.tsx` - Enhanced error handling and logging
2. `/components/shed/SavedShedDesigns.tsx` - Enhanced error handling and logging
3. `/components/garage/SavedGarageDesigns.tsx` - Enhanced error handling and logging

## Files Created

1. `/SETUP_PROJECT_WIZARD_SAVED_DESIGNS.sql` - Complete database setup script
2. `/FIX_SAVED_DESIGNS_SUPABASE.md` - This documentation file

## Verification Checklist

- [ ] Run `/SETUP_PROJECT_WIZARD_SAVED_DESIGNS.sql` in Supabase SQL Editor
- [ ] Confirm all three tables exist in Supabase Table Editor
- [ ] Test saving a deck design
- [ ] Test saving a shed design
- [ ] Test saving a garage design
- [ ] Verify designs appear in the "Saved Designs" list
- [ ] Test loading a saved design
- [ ] Test deleting a saved design
- [ ] Check browser console for success messages
- [ ] Verify designs persist across page refreshes

## Next Steps

After running the database setup:

1. **Test thoroughly** - Save designs from all three planners
2. **Check Supabase logs** - Monitor for any errors in the Supabase dashboard
3. **Verify RLS policies** - Ensure users can only see their organization's designs
4. **Monitor performance** - The indexes should make queries fast even with many designs

## Support

If you continue to experience issues after following this guide:

1. Check the browser console for detailed error messages
2. Check the Supabase logs in the dashboard (Logs section)
3. Verify your user has a valid `organization_id` in the `profiles` table
4. Ensure the `organizations` table has a record for your organization

---

## Materials Pricing Setup

For detailed instructions on setting up Materials Pricing (the other half of this fix), see:
📄 **[/SETUP_MATERIALS_PRICING.md](/SETUP_MATERIALS_PRICING.md)**

Quick steps:
1. Run `/SUPABASE_PROJECT_WIZARD_DEFAULTS.sql` to create the `project_wizard_defaults` table
2. Add inventory items for common materials (lumber, hardware, etc.)
3. Navigate to Settings → Project Wizard Settings
4. Map each material category to an inventory item
5. Save and test in the planners

Without materials pricing configured, Project Wizards will show material quantities but no costs.

---

**Status**: ✅ Ready to Deploy

The code is now configured with:
- Proper Supabase integration (no localStorage)
- Enhanced error handling and debugging
- Comprehensive database setup script
- Full RLS policies for multi-tenant security