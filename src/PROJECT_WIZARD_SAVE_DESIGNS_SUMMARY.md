# Project Wizard Save Designs - Implementation Summary

## ✅ What Was Completed

### 1. Supabase Database Tables
Created three new tables with full RLS policies:
- **`saved_deck_designs`** - Store deck configurations
- **`saved_shed_designs`** - Store shed configurations  
- **`saved_garage_designs`** - Store garage configurations

Each table includes:
- Design metadata (name, description)
- Full configuration (JSON)
- Customer association
- Price tier tracking
- Materials list with pricing
- Total cost calculation
- Timestamps (created_at, updated_at)

### 2. Customer Integration
**New Component: `CustomerSelector`**
- Search customers by name, email, or company
- Dropdown with auto-complete
- Displays customer's price tier
- Shows which pricing will be applied
- Clears selection easily
- Real-time search with debouncing

### 3. Saved Design Components
Updated/Created these components with full Supabase integration:

**`SavedDeckDesigns` (NEW)**
- Save deck designs with customer association
- Load saved designs back into configurator
- Export designs as JSON
- Delete designs with confirmation
- View customer and pricing information

**`SavedShedDesigns` (UPDATED)**
- Migrated from localStorage to Supabase
- Added customer selection
- Added description field
- Shows price tier and total cost
- Organization-scoped viewing

**`SavedGarageDesigns` (UPDATED)**
- Migrated from localStorage to Supabase
- Added customer selection
- Added description field
- Shows price tier and total cost
- Organization-scoped viewing

### 4. Planner Integration
Updated all three planners to pass required props:

**`DeckPlanner`**
- Passes user, config, materials, totalCost to SavedDeckDesigns
- Enables full save/load functionality

**`ShedPlanner`**
- Passes user, config, materials, totalCost to SavedShedDesigns
- Enables full save/load functionality

**`GaragePlanner`**
- Passes user, config, materials, totalCost to SavedGarageDesigns
- Enables full save/load functionality

### 5. Bug Fixes
**Fixed Material Spreading Errors:**
- `GaragePlanner`: Added null checks for `insulation` and `electrical`
- `ShedPlanner`: Fixed incorrect property names (removed `loft`, `shelving`, added proper ones)
- All planners now handle optional material categories gracefully

**Fixed Password Reset Flow:**
- Updated `loadUserData` in `App.tsx` to check `needs_password_change`
- Prevents user data from loading when password change is required
- Ensures Change Password dialog stays open

## 📊 Data Flow

### Saving a Design
```
User Designs → Click "Saved Designs" Tab → Optionally Select Customer
  ↓
Enter Name + Description → Click "Save Design"
  ↓
System Enriches Materials with Customer's Price Tier
  ↓
Saves to Supabase with:
  - organization_id (for multi-tenancy)
  - user_id (who created it)
  - customer_id (optional)
  - config (full JSON configuration)
  - materials (enriched with pricing)
  - price_tier (t1/t2/t3/t4)
  - total_cost
  ↓
Success! Design appears in list
```

### Loading a Design
```
User Clicks "Load Design" on Saved Design
  ↓
System extracts config JSON
  ↓
Updates planner configuration
  ↓
Switches to "Design" tab
  ↓
User can modify and re-save
```

## 🔒 Security & Multi-Tenancy

### Row Level Security (RLS)
All three tables have 4 policies each:

1. **SELECT**: Users can view designs from their organization
2. **INSERT**: Users can create designs in their organization
3. **UPDATE**: Users can update their own designs
4. **DELETE**: Users can delete their own designs

### Data Isolation
- Designs are scoped to `organization_id`
- Users cannot see designs from other organizations
- Customer lookup is scoped to user's organization
- Price catalogs are organization-specific

## 💰 Pricing Integration

### Price Tier Priority
1. **Customer Selected**: Uses customer's `price_tier` from contacts table
2. **No Customer**: Defaults to T1 pricing
3. Pricing pulled from organization's `t1_product_catalog`

### Supported Tiers
- **T1**: Tier 1 pricing
- **T2**: Tier 2 pricing
- **T3**: Tier 3 pricing
- **T4**: Tier 4 pricing
- **Custom**: Custom pricing (future)

## 📋 Next Steps - What You Need to Do

### 1. Run the SQL Migration
```bash
# Go to Supabase Dashboard → SQL Editor
# Copy/paste contents of: /supabase/migrations/create_project_wizard_saved_designs.sql
# Click "Run"
```

### 2. Verify Setup
Run these queries in SQL Editor:

**Check tables exist:**
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE 'saved_%_designs';
```

**Check RLS policies:**
```sql
SELECT tablename, policyname 
FROM pg_policies 
WHERE tablename LIKE 'saved_%_designs';
```

### 3. Test Each Feature

**Test Save:**
- Go to Deck Planner → Saved Designs tab
- Enter a name
- Select a customer (optional)
- Click "Save Design"
- Verify success message

**Test Load:**
- Click "Load Design" on any saved design
- Verify config loads correctly
- Verify you switch to Design tab

**Test Customer Selection:**
- Make sure you have customers in Contacts
- Search for a customer by name
- Verify price tier shows
- Save design with customer
- Verify customer info appears in saved design

**Test Export:**
- Click download icon on a design
- Verify JSON file downloads
- Check JSON contains all data

**Test Delete:**
- Click trash icon on a design
- Confirm deletion
- Verify design is removed

### 4. Test Multi-Tenant Isolation
- Save a design as User A
- Log in as User B (different organization)
- Go to Saved Designs
- Verify User B CANNOT see User A's design

## 🎯 Future Enhancements

### Ready to Implement
1. **Create Quote from Design**: Add button to generate quote from saved design
2. **Associate with Project**: Link design to existing project
3. **Email to Customer**: Send design PDF via email
4. **Public Share Link**: Create shareable link for customers
5. **Design Templates**: Save as organization-wide templates
6. **Batch Operations**: Export multiple designs at once

### Quote Integration Example
```typescript
const createQuoteFromDesign = async (design: SavedDesign) => {
  const quote = {
    customer_id: design.customer_id,
    organization_id: user.organizationId,
    items: design.materials.map(m => ({
      description: m.description,
      quantity: m.quantity,
      unit_price: m.price,
      total: m.quantity * m.price,
    })),
    total: design.total_cost,
    notes: `Generated from saved ${projectType} design: ${design.name}`,
  };
  
  await supabase.from('quotes').insert(quote);
};
```

## 📁 Files Modified/Created

### New Files
- `/supabase/migrations/create_project_wizard_saved_designs.sql`
- `/components/project-wizard/CustomerSelector.tsx`
- `/components/deck/SavedDeckDesigns.tsx`
- `/SETUP_INSTRUCTIONS.md`
- `/PROJECT_WIZARD_SAVE_DESIGNS_SUMMARY.md`

### Updated Files
- `/components/garage/SavedGarageDesigns.tsx` - Full Supabase integration
- `/components/shed/SavedShedDesigns.tsx` - Full Supabase integration
- `/components/planners/GaragePlanner.tsx` - Pass props, fix material spreading
- `/components/planners/ShedPlanner.tsx` - Pass props, fix material spreading
- `/components/planners/DeckPlanner.tsx` - Import new component, pass props
- `/App.tsx` - Fix password reset flow

## 🐛 Bugs Fixed

1. **GaragePlanner Material Spreading Error**
   - Issue: `materials.insulation is not iterable`
   - Fix: Added `...(materials.insulation || [])`

2. **ShedPlanner Material Spreading Error**
   - Issue: Tried to spread non-existent `loft` and `shelving` properties
   - Fix: Used correct property names from ShedMaterials type

3. **Password Reset Dialog Disappearing**
   - Issue: `loadUserData` was being called and overwriting the `needs_password_change` flag
   - Fix: Added check to prevent loading user data when password change is required

## ✨ Key Features

### Customer-Aware Pricing
- Automatically applies correct price tier based on customer
- Shows which tier is being used
- Saves pricing with design for historical accuracy

### Seamless UX
- Search customers with instant feedback
- Save designs with one click
- Load designs instantly
- Export for external use

### Organization Defaults
- Can configure default markups in Project Wizard Settings
- Respects organization's T1 catalog
- Maintains pricing consistency

### Data Integrity
- Foreign key constraints prevent orphaned data
- Timestamps track creation and updates
- JSONB validation ensures config integrity

## 🎉 Ready to Use!

Once you run the SQL migration, the Save Designs feature will be fully functional across all three Project Wizards. Users can save designs, associate them with customers, and leverage the customer's pricing tier automatically.
