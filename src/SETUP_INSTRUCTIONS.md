# Project Wizard Saved Designs Setup Instructions

## Overview
This setup enables the Project Wizards (Deck, Shed, Garage) to save designs to Supabase with customer association and price tier integration.

## Features Implemented
✅ Save designs to Supabase database
✅ Associate designs with customers
✅ Automatically pull customer price tier
✅ Store materials list with pricing
✅ Load, export, and delete saved designs
✅ Organization-based data isolation with RLS

## Supabase Setup

### Step 1: Run the SQL Migration
1. Go to your Supabase Dashboard → SQL Editor
2. Copy and paste the entire contents of `/supabase/migrations/create_project_wizard_saved_designs.sql`
3. Click "Run" to execute the migration

This will create:
- `saved_deck_designs` table
- `saved_shed_designs` table
- `saved_garage_designs` table
- Row Level Security (RLS) policies
- Indexes for performance
- Foreign key constraints
- Auto-update timestamps

### Step 2: Verify Tables Were Created
Run this query in SQL Editor to verify:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE 'saved_%_designs';
```

You should see 3 tables listed.

### Step 3: Verify RLS Policies
Run this query to check RLS policies:

```sql
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename LIKE 'saved_%_designs';
```

You should see 12 policies (4 per table: SELECT, INSERT, UPDATE, DELETE).

## How It Works

### Customer Selection
1. When saving a design, users can search and select a customer
2. The customer's `price_tier` (t1, t2, t3, t4) is automatically pulled
3. Materials are priced according to the customer's tier
4. Customer information is stored with the design for reference

### Organization Defaults
- Designs are automatically associated with the user's organization
- Only users within the same organization can view each other's designs
- Organization-specific pricing from `t1_product_catalog` is used

### Price Tier Priority
1. **Customer selected**: Uses customer's `price_tier` from contacts table
2. **No customer**: Defaults to T1 pricing
3. **Organization defaults**: Can be configured in Project Wizard Settings

### Data Flow
1. User designs a deck/shed/garage
2. User clicks "Saved Designs" tab
3. User enters design name and (optionally) selects customer
4. System saves:
   - Configuration (JSON)
   - Materials list with pricing
   - Total cost
   - Customer association
   - Price tier used
5. Design appears in organization's saved designs list

## Testing Checklist

### Test 1: Save Design Without Customer
- [ ] Go to any Project Wizard (Deck, Shed, or Garage)
- [ ] Design a project
- [ ] Go to "Saved Designs" tab
- [ ] Enter a name (e.g., "Test Design 1")
- [ ] Click "Save Design"
- [ ] Verify "Design saved successfully!" message appears
- [ ] Verify design appears in the list below

### Test 2: Save Design With Customer
- [ ] Make sure you have at least one customer in Contacts
- [ ] Go to any Project Wizard
- [ ] Go to "Saved Designs" tab
- [ ] Click in the "Search customers" field
- [ ] Select a customer
- [ ] Verify price tier is displayed
- [ ] Enter a design name
- [ ] Click "Save Design"
- [ ] Verify design shows customer name and price tier

### Test 3: Load Saved Design
- [ ] Click "Load Design" on any saved design
- [ ] Verify you switch to "Design" tab
- [ ] Verify configuration matches the saved design

### Test 4: Export Design
- [ ] Click the download icon on any design
- [ ] Verify a JSON file downloads
- [ ] Open the JSON file and verify it contains the design data

### Test 5: Delete Design
- [ ] Click the trash icon on a design
- [ ] Confirm the deletion
- [ ] Verify design is removed from the list

### Test 6: Multi-Tenant Isolation
- [ ] Save a design as one user
- [ ] Log out and log in as a user from a DIFFERENT organization
- [ ] Go to Saved Designs
- [ ] Verify you CANNOT see the other organization's design

## Database Schema

### saved_deck_designs
```sql
- id (UUID, PK)
- organization_id (UUID, FK → organizations)
- user_id (UUID, FK → auth.users)
- customer_id (UUID, FK → contacts, nullable)
- name (TEXT)
- description (TEXT, nullable)
- config (JSONB) -- Deck configuration
- price_tier (TEXT) -- t1, t2, t3, t4, custom
- total_materials_cost (DECIMAL)
- total_labor_cost (DECIMAL)
- total_cost (DECIMAL)
- materials (JSONB) -- Enriched materials array
- project_id (UUID, FK → projects, nullable)
- quote_id (TEXT, nullable)
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)
```

Same schema for `saved_shed_designs` and `saved_garage_designs`.

## Integration Points

### Contacts Table
- Pulls `price_tier` from customer record
- Displays customer name and company
- Links design to specific customer for quote generation

### Organizations Table
- Isolates designs by organization
- Uses organization's T1 catalog for pricing
- Can extend to use organization's default margins

### T1 Product Catalog
- Materials are enriched with T1 pricing
- Pricing reflects customer's tier
- Supports all material types (framing, decking, roofing, etc.)

## Future Enhancements

### Planned Features
- [ ] Convert saved design directly to Quote
- [ ] Associate saved design with existing Project
- [ ] Email design to customer
- [ ] Share design link with customer (public view)
- [ ] Version history for designs
- [ ] Duplicate design feature
- [ ] Bulk export designs
- [ ] Design templates (organization-wide)

### Quote Integration
When ready, you can add a "Create Quote" button that:
1. Loads the design
2. Creates a new quote in the system
3. Pre-fills customer information
4. Includes all materials and pricing
5. Applies organization's markup/margins

## Troubleshooting

### "Error loading designs"
- Check RLS policies are enabled
- Verify user is authenticated
- Check user has valid organization_id

### "Error saving design"
- Verify all required fields are filled
- Check customer_id exists if customer selected
- Verify materials array is valid JSON

### Designs not appearing
- Check organization_id matches
- Verify RLS SELECT policy
- Check created_at timestamp

### Price tier not showing
- Verify customer has price_tier set
- Check contacts table for the customer
- Ensure price_tier is one of: t1, t2, t3, t4

## Support
If you encounter any issues:
1. Check browser console for errors
2. Check Supabase logs in Dashboard
3. Verify SQL migration ran successfully
4. Test RLS policies directly in SQL Editor
