# 🔧 Project Wizard Database Fix Instructions

## Overview
This guide will help you fix the Project Wizard errors related to missing database columns and tables.

## Errors Being Fixed
1. ❌ `column contacts.price_level does not exist`
2. ❌ `Could not find the table 'public.saved_deck_designs' in the schema cache`
3. ❌ `Could not find the table 'public.saved_shed_designs' in the schema cache`

## Solution

### Step 1: Run the Migration SQL

1. **Open Supabase Dashboard**
   - Go to your Supabase project at https://supabase.com/dashboard

2. **Navigate to SQL Editor**
   - Click on "SQL Editor" in the left sidebar

3. **Create New Query**
   - Click "+ New query"

4. **Copy and Paste the Migration**
   - Open the file: `/supabase/migrations/fix_project_wizard_dependencies.sql`
   - Copy ALL the contents
   - Paste into the Supabase SQL Editor

5. **Run the Migration**
   - Click the "Run" button (or press Ctrl/Cmd + Enter)
   - Wait for the success message

### Step 2: Verify the Changes

You should see success messages like:
```
✅ Project Wizard dependencies fixed successfully!
✅ Added price_level column to contacts table
✅ Created saved_deck_designs table
✅ Created saved_shed_designs table
✅ All indexes, RLS policies, and triggers are in place
```

### Step 3: Refresh Your Application

1. Refresh your ProSpaces CRM application in the browser
2. Navigate to any Project Wizard (Deck, Shed, or Garage)
3. Test the following:
   - ✅ Customer Selector should load customers with price tiers
   - ✅ Save Design feature should work
   - ✅ Load Saved Designs should display previously saved designs

## What Was Fixed

### 1. **Added `price_level` Column to Contacts Table**
- Column: `price_level` (TEXT)
- Default: 'Retail'
- Possible values: Retail, Wholesale, Contractor, Premium, Standard
- Used by Project Wizards to determine pricing tier

### 2. **Created `saved_deck_designs` Table**
- Complete schema matching `saved_garage_designs`
- Indexes for performance
- Row Level Security (RLS) policies
- Triggers for automatic `updated_at` timestamps

### 3. **Created `saved_shed_designs` Table**
- Complete schema matching `saved_garage_designs`
- Indexes for performance
- Row Level Security (RLS) policies
- Triggers for automatic `updated_at` timestamps

## Code Changes Made

### Updated Files:
1. **CustomerSelector.tsx** - Fixed to use `price_level` instead of `price_tier`
2. **SavedDeckDesigns.tsx** - Fixed query syntax and price_level handling
3. **SavedGarageDesigns.tsx** - Fixed query syntax and price_level handling
4. **SavedShedDesigns.tsx** - Fixed query syntax and price_level handling

### New Files:
1. **fix_project_wizard_dependencies.sql** - Comprehensive migration script

## Troubleshooting

### If you still see errors after running the migration:

1. **Clear Browser Cache**
   - Hard refresh: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)

2. **Check Supabase RLS Policies**
   - Go to "Authentication" > "Policies" in Supabase Dashboard
   - Verify policies exist for `saved_deck_designs` and `saved_shed_designs`

3. **Verify Table Creation**
   - Go to "Table Editor" in Supabase Dashboard
   - You should see:
     - `saved_deck_designs`
     - `saved_shed_designs`
     - `saved_garage_designs`

4. **Check Contacts Table**
   - Go to "Table Editor" > "contacts"
   - Click on the table
   - Verify `price_level` column exists

## Support

If you encounter any issues:
1. Check the browser console for detailed error messages
2. Check the Supabase logs in the Dashboard
3. Verify all migration steps completed successfully

---

**Last Updated:** December 27, 2025
**Version:** 1.0
