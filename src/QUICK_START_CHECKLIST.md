# Quick Start Checklist - Project Wizard Save Designs

## ⚡ Setup (5 minutes)

### Step 1: Run SQL Migration
- [ ] Open Supabase Dashboard
- [ ] Go to SQL Editor
- [ ] Open `/supabase/migrations/create_project_wizard_saved_designs.sql`
- [ ] Copy entire file contents
- [ ] Paste into SQL Editor
- [ ] Click "Run"
- [ ] Verify "Success. No rows returned" message

### Step 2: Verify Tables Created
Run this query:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE 'saved_%_designs';
```
- [ ] See `saved_deck_designs`
- [ ] See `saved_garage_designs`
- [ ] See `saved_shed_designs`

### Step 3: Hard Refresh Your App
- [ ] Press `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
- [ ] Wait for app to fully reload

## ✅ Quick Test (2 minutes)

### Test 1: Save a Garage Design
- [ ] Log in to ProSpaces CRM
- [ ] Go to **Project Wizards** → **Garage Planner**
- [ ] Design a garage (change size, doors, etc.)
- [ ] Click **Saved Designs** tab
- [ ] Enter name: "Test Garage 1"
- [ ] Click **Save Design**
- [ ] See "Design saved successfully!" message
- [ ] See your design in the list below

### Test 2: Save with Customer
- [ ] Go to **Saved Designs** tab (any planner)
- [ ] Click in "Search customers" field
- [ ] Type a customer name
- [ ] Select a customer from dropdown
- [ ] See price tier (e.g., "T2") displayed
- [ ] Enter design name
- [ ] Click **Save Design**
- [ ] See customer name and company in saved design card

### Test 3: Load a Design
- [ ] Click **Load Design** on any saved design
- [ ] Switch to **Design** tab automatically
- [ ] See configuration loaded (verify dimensions match)

### Test 4: Export a Design
- [ ] Go to **Saved Designs** tab
- [ ] Click download icon (⬇) on any design
- [ ] See JSON file download
- [ ] Open file and verify it contains design data

## 🎯 You're Done!

All three Project Wizards (Deck, Shed, Garage) now have:
✅ Save designs to database
✅ Customer selection with price tiers
✅ Load saved designs
✅ Export designs as JSON
✅ Delete designs
✅ Organization-based isolation

## 🚀 What You Can Do Now

### Save Designs
1. Design a project in any planner
2. Go to "Saved Designs" tab
3. Enter a name (required)
4. Add description (optional)
5. Select customer (optional)
6. Click "Save Design"

### Search Customers
- Type in search field to find customers
- Search by name, email, or company
- Price tier automatically applied
- Shows which pricing level will be used

### Manage Saved Designs
- **Load**: Instantly load configuration
- **Export**: Download as JSON file
- **Delete**: Remove with confirmation
- **View**: See all organization's designs

### Customer Price Tiers
When you select a customer:
- **T1**: Standard retail pricing
- **T2**: Contractor pricing
- **T3**: Preferred contractor pricing
- **T4**: Volume contractor pricing

The materials will be priced according to the customer's tier.

## 📞 Need Help?

### Common Issues

**"Error loading designs"**
- Hard refresh the app (Ctrl+Shift+R)
- Check you're logged in
- Verify SQL migration ran successfully

**Customers not appearing**
- Make sure you have customers in Contacts module
- Verify customer has same organization_id as you
- Check customer name is not empty

**Price tier not showing**
- Customer may not have price_tier set
- Go to Contacts → Edit customer
- Set price_tier to t1, t2, t3, or t4

**Design won't save**
- Check design name is not empty
- Verify you have internet connection
- Check browser console for errors

## 🎨 Next Features to Build

Once you're comfortable with Save Designs, you can add:

1. **Create Quote from Design**
   - Button to generate quote
   - Pre-fill customer info
   - Include all materials

2. **Email Design to Customer**
   - PDF generation
   - Email with design summary
   - Professional formatting

3. **Project Association**
   - Link design to existing project
   - Track project phases
   - Material ordering from design

4. **Organization Templates**
   - Save as template for team
   - Standard configurations
   - Quick start designs

## 📚 Documentation

- **Setup Details**: See `/SETUP_INSTRUCTIONS.md`
- **Full Summary**: See `/PROJECT_WIZARD_SAVE_DESIGNS_SUMMARY.md`
- **SQL Migration**: `/supabase/migrations/create_project_wizard_saved_designs.sql`

---

**That's it! You're all set up and ready to save designs! 🎉**
