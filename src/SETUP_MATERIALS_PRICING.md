# Setup Guide: Materials Pricing in Project Wizards

## Issue
The Materials sections in Project Wizards (Deck, Shed, Garage Planners) are not showing pricing because the **Material Defaults** have not been configured yet.

## How Materials Pricing Works

1. **Project Wizards calculate materials** based on design specifications (dimensions, style, etc.)
2. **enrichMaterialsWithPricing** function looks up each material category in the `project_wizard_defaults` table
3. **Matches to Inventory items** using the configured inventory_item_id
4. **Fetches T1 pricing** from the inventory item
5. **Calculates total costs** by multiplying unit price × quantity

## Prerequisites

### 1. Database Tables Must Exist
Run these SQL scripts in your Supabase SQL Editor:

✅ **First**: `/SUPABASE_PROJECT_WIZARD_DEFAULTS.sql` - Creates the `project_wizard_defaults` table
✅ **Second**: `/SETUP_PROJECT_WIZARD_SAVED_DESIGNS.sql` - Creates saved designs tables and verifies setup

### 2. Inventory Items Must Exist
Before you can configure material defaults, you need inventory items in your system:

- Navigate to **Inventory** module
- Add products for materials (lumber, hardware, roofing, etc.)
- Set pricing (T1, T2, T3, T4 tiers)
- Each material needs a corresponding inventory item

## Step-by-Step Setup

### Step 1: Run Database Setup Scripts

1. Open Supabase Dashboard → SQL Editor
2. Run `/SUPABASE_PROJECT_WIZARD_DEFAULTS.sql`
3. Run `/SETUP_PROJECT_WIZARD_SAVED_DESIGNS.sql`
4. Check the output for verification results

**Expected Output:**
```
✓ saved_deck_designs table exists
✓ saved_shed_designs table exists
✓ saved_garage_designs table exists
✓ project_wizard_defaults table exists
```

### Step 2: Add Inventory Items

Navigate to **Inventory** module and add items for common materials:

#### Deck Materials Example:
- **Framing**: 2x8 Treated Joists, 2x10 Treated Beams, 6x6 Posts
- **Decking**: 5/4x6 Decking Boards (various types)
- **Railing**: Railing Posts, Top Rail, Bottom Rail, Balusters
- **Hardware**: Joist Hangers, Post Anchors, Screws, Nails

#### Shed Materials Example:
- **Foundation**: 4x6 Skids, Concrete Blocks
- **Framing**: 2x4 Studs, 2x6 Floor Joists
- **Roofing**: Shingles, Felt, Ridge Cap
- **Siding**: LP SmartSide, T1-11, Vinyl
- **Hardware**: Nails, Screws, Hurricane Ties

#### Garage Materials Example:
- **Foundation**: Concrete (per sq ft), Rebar, Wire Mesh
- **Framing**: 2x4 Wall Studs, 2x6 Wall Studs, Trusses
- **Roofing**: Shingles, Felt, Drip Edge
- **Doors**: Garage Doors, Entry Doors
- **Windows**: Various window sizes
- **Electrical**: Wire, Outlets, Lights

### Step 3: Configure Material Defaults

1. Navigate to **Settings** → **Project Wizard Settings**
2. You'll see sections for:
   - **Deck Planner** (with tabs for Spruce, Treated, Composite, Cedar)
   - **Garage Planner**
   - **Shed Planner**

3. For each material category, select the corresponding inventory item from the dropdown
4. Click **Save** at the bottom

#### Example: Deck Planner - Treated Lumber

| Material Category | Inventory Item |
|------------------|----------------|
| Joists | 2x8 #2 Treated Lumber - 16' |
| Beams | 2x10 #2 Treated Lumber - 16' |
| Posts | 6x6 Treated Post - 8' |
| Decking Boards | 5/4x6 Treated Deck Board - 16' |
| Railing Posts | 4x4 Treated Post - 8' |
| ... | ... |

### Step 4: Test Materials Pricing

1. Navigate to **Project Wizards**
2. Open **Deck Planner** (or Shed/Garage)
3. Configure a design
4. Click on **Materials** tab
5. You should now see:
   - ✅ Material list with quantities
   - ✅ Unit prices (from inventory T1 pricing)
   - ✅ Total costs per line item
   - ✅ Grand total at the bottom

### Step 5: Verify in Browser Console

Open Developer Tools (F12) and check the Console tab:

**Successful pricing:**
```
[enrichMaterials] 🔍 Enriching materials with T1 pricing
[enrichMaterials] Found defaults: 25
[enrichMaterials] ✅ Matched "2x8 Joists - 16'" (Joists) -> T1: $12.50 x 15 = $187.50
[enrichMaterials] ✅ Total T1 price: 4250.00
```

**No defaults configured:**
```
[enrichMaterials] ⚠️ No inventory items mapped for this project type
[enrichMaterials] Available defaults: []
```

## Troubleshooting

### Issue: "No pricing shown in Materials tab"

**Cause**: Material defaults not configured

**Solution**:
1. Go to Settings → Project Wizard Settings
2. Configure inventory items for each material category
3. Click Save
4. Refresh the planner

### Issue: "project_wizard_defaults table does not exist"

**Cause**: Database setup not completed

**Solution**:
1. Run `/SUPABASE_PROJECT_WIZARD_DEFAULTS.sql` in Supabase SQL Editor
2. Verify table exists in Supabase Table Editor

### Issue: "Inventory items not showing in dropdown"

**Cause**: No inventory items exist or RLS policy issue

**Solution**:
1. Navigate to Inventory module
2. Add inventory items
3. Verify items are assigned to your organization
4. Check browser console for errors

### Issue: "Some materials have pricing, others don't"

**Cause**: Incomplete material defaults configuration

**Solution**:
1. Go to Settings → Project Wizard Settings
2. Scroll through all categories
3. Configure missing items (those showing "-- Select Item --")
4. Save

### Issue: "RLS policy error when saving defaults"

**Cause**: User doesn't have admin role

**Solution**:
- Only Admin and Super Admin users can configure Project Wizard Settings
- Check your user role in Settings → Users
- Contact your organization admin

## Understanding Material Categories

### Deck Planner Categories

Material defaults vary by deck material type (Spruce, Treated, Composite, Cedar):

**Framing** (same for all types):
- Joists
- Rim Joists
- Beams
- Posts
- Stair Stringers

**Decking** (varies by material type):
- Decking Boards
- Stair Treads

**Railing** (varies by material type):
- Railing Posts
- Railing Top Rail
- Railing Bottom Rail
- Railing Balusters

**Hardware**:
- Joist Hangers
- Post Anchors
- Concrete Mix
- Screws, Nails

### Shed Planner Categories

**Foundation**:
- Foundation Skids, Concrete Blocks, Runners

**Framing**:
- Floor Joists, Wall Framing, Roof Rafters

**Roofing**:
- Felt, Shingles, Ridge Cap

**Siding**:
- House Wrap, Siding

**Doors & Windows**:
- Doors, Windows, Hardware

**Hardware & Electrical**:
- Nails, Screws, Wire, Lights

### Garage Planner Categories

**Foundation**:
- Concrete Slab, Vapor Barrier, Rebar

**Framing**:
- Wall Studs (2x4, 2x6), Trusses, Sheathing

**Roofing**:
- Felt, Shingles, Ridge Cap

**Siding**:
- House Wrap, Siding, Trim

**Doors**:
- Garage Doors, Opener, Entry Door

**Windows & Electrical**:
- Windows, Sub-Panel, Wire, Outlets

## Best Practices

### 1. Create Inventory Items First
Before configuring Project Wizard Settings, create comprehensive inventory:
- Multiple sizes of common materials
- Different grades/qualities
- Various brands if needed

### 2. Use Consistent Naming
Make inventory item names clear:
- ✅ Good: "2x8 #2 Treated Lumber - 16'"
- ❌ Bad: "Lumber 1"

### 3. Set Realistic Pricing
Project Wizards use T1 (Tier 1) pricing:
- Set T1 as your base retail price
- Configure T2-T4 for contractor/wholesale discounts
- Update prices regularly to match market rates

### 4. Test Each Planner
After configuration:
- Create a test design in Deck Planner
- Create a test design in Shed Planner
- Create a test design in Garage Planner
- Verify pricing appears for all

### 5. Document Your Mappings
Keep a spreadsheet showing which inventory items map to which categories:
- Helps when adding new inventory
- Makes updates easier
- Useful for training team members

## Verification Checklist

- [ ] Database tables created (run SQL scripts)
- [ ] Inventory items added (at least common materials)
- [ ] Deck Planner defaults configured (all 4 material types)
- [ ] Garage Planner defaults configured
- [ ] Shed Planner defaults configured
- [ ] Test design in Deck Planner shows pricing
- [ ] Test design in Shed Planner shows pricing
- [ ] Test design in Garage Planner shows pricing
- [ ] Browser console shows successful enrichment logs
- [ ] Saved designs include materials with pricing

## Console Debugging

### Check if defaults exist:
```javascript
// In browser console:
console.log('Testing material defaults lookup...');
```

Look for these log messages:
```
[enrichMaterials] 🔍 Enriching materials with T1 pricing
[enrichMaterials] Found defaults: 25
[enrichMaterials] Defaults map: [["joists", "abc123"], ["beams", "def456"], ...]
```

### Check if inventory items found:
```
[enrichMaterials] Fetched inventory items: 25
[enrichMaterials] ✅ Matched "2x8 Joists - 16'" (Joists) -> T1: $12.50 x 15 = $187.50
```

### Common warning messages:
```
⚠️ No inventory items mapped for this project type
⚠️ No pricing found for "Description" (category: Category)
⚠️ project_wizard_defaults table does not exist
```

## Next Steps After Setup

1. **Save Test Designs** - Verify saved designs include pricing
2. **Print Plans** - Test the Print Plan functionality
3. **Generate Quotes** - Create quotes from designs
4. **Train Users** - Show team how to use Project Wizards
5. **Regular Updates** - Update inventory pricing as costs change

## Support

If materials still don't show pricing after following this guide:

1. **Check Supabase Logs** - Look for errors in the Logs section
2. **Verify RLS Policies** - Ensure user has proper permissions
3. **Check Console** - Browser console shows detailed debug info
4. **Verify Organization ID** - Ensure user, inventory, and defaults all use same org ID

---

**Status**: Ready for Configuration

Once you complete the steps above, materials pricing will automatically appear in all Project Wizards!
