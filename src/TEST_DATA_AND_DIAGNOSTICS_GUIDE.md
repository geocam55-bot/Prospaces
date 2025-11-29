# Test Data Generator & Database Diagnostics Guide

## ✅ What Was Done

I've created a comprehensive solution to help you with all three of your requests:

### 1. ✅ Test Data Generator
Created `/components/TestDataGenerator.tsx` - a powerful tool that can:
- Generate realistic test data with proper relationships
- Create 3 contacts, 3 project managers, 3 opportunities, and 6 bids automatically
- Ensure all data is properly linked (Contact → Opportunity → Bid → Project Manager)
- Show you exactly what was created with detailed IDs

### 2. ✅ Database Schema Verification
The Test Data Generator includes automatic schema checking that verifies:
- All tables exist (contacts, opportunities, bids, project_managers)
- Required columns are present
- Foreign key relationships are configured correctly
- Organization IDs are set up properly

### 3. ✅ Bid Filtering Logic Review
Verified and confirmed the bid filtering logic in `/utils/bids-client.ts`:
- ✅ Bids are correctly filtered by `opportunity_id`
- ✅ Organization filtering includes NULL values for backward compatibility
- ✅ Proper joins to opportunities and project managers
- ✅ Correct data mapping from snake_case to camelCase

## How to Access

**Go to Settings → Test Data tab**

The Test Data Generator is now available in your Settings page (only visible to Super Admins and Admins).

## Features

### 🔍 Check Database
Click "Check Database" to:
- Verify all tables exist and are accessible
- Check for required columns
- Count existing data in each table
- Identify any schema issues

### ✨ Generate Test Data
Click "Generate Test Data" to create:
- **3 Contacts:**
  - Acme Corporation
  - TechStart Inc
  - Global Industries

- **3 Project Managers** (one for each contact):
  - John Smith → Acme Corporation
  - Sarah Johnson → TechStart Inc
  - Mike Davis → Global Industries

- **3 Opportunities** (one for each contact):
  - Q1 2024 Software License ($50,000)
  - Office Equipment Upgrade ($100,000)
  - Annual Service Contract ($150,000)

- **6 Bids** (2 per opportunity):
  - Draft bid (80% of opportunity value)
  - Submitted bid (100% of opportunity value)
  - Each bid includes tax calculation and line items

### 🗑️ Delete All Data
Click "Delete All Data" to:
- Remove all data from your current organization
- Deletes in correct order (bids → opportunities → project managers → contacts)
- Requires double confirmation to prevent accidents

## Test Data Structure

When you generate test data, here's what gets created:

```
Contact: Acme Corporation
└── Project Manager: John Smith
    └── Opportunity: Q1 2024 Software License ($50,000)
        ├── Bid 1: "Q1 2024 Software License - Proposal 1" ($40,000 - Draft)
        └── Bid 2: "Q1 2024 Software License - Proposal 2" ($50,000 - Submitted)

Contact: TechStart Inc
└── Project Manager: Sarah Johnson
    └── Opportunity: Office Equipment Upgrade ($100,000)
        ├── Bid 1: "Office Equipment Upgrade - Proposal 1" ($80,000 - Draft)
        └── Bid 2: "Office Equipment Upgrade - Proposal 2" ($100,000 - Submitted)

Contact: Global Industries
└── Project Manager: Mike Davis
    └── Opportunity: Annual Service Contract ($150,000)
        ├── Bid 1: "Annual Service Contract - Proposal 1" ($120,000 - Draft)
        └── Bid 2: "Annual Service Contract - Proposal 2" ($150,000 - Submitted)
```

## Understanding the Bid Filtering

### Why Bids Show 0

Based on your console logs, bids are being filtered correctly but returning 0 results because:

1. **No bids exist yet** for that opportunity (most likely)
2. **Organization ID mismatch** - bids exist but belong to a different organization
3. **Null organization IDs** - old bids without organization_id set

### How Filtering Works

```typescript
// From /utils/bids-client.ts
export async function getBidsByOpportunityClient(opportunityId: string) {
  let query = supabase
    .from('bids')
    .select(`
      *,
      opportunities:opportunity_id(id, title, customer_id),
      project_managers:project_manager_id(id, name)
    `)
    .eq('opportunity_id', opportunityId); // ← Filter by opportunity
    
  // Filter by organization - include NULL for backward compatibility
  if (organizationId) {
    query = query.or(`organization_id.eq.${organizationId},organization_id.is.null`);
  }
}
```

This means:
- ✅ Bids MUST have the correct `opportunity_id`
- ✅ Bids MUST have either:
  - The same `organization_id` as the current user, OR
  - A `NULL` organization_id (legacy data)

## Database Schema Expected

### Bids Table
```sql
CREATE TABLE bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  amount DECIMAL(12, 2),
  subtotal DECIMAL(12, 2),
  tax_rate DECIMAL(5, 2),
  tax_amount DECIMAL(12, 2),
  status TEXT DEFAULT 'draft',
  valid_until DATE,
  notes TEXT,
  items JSONB, -- Line items stored as JSON
  project_manager_id UUID REFERENCES project_managers(id) ON DELETE SET NULL,
  customer_id UUID,
  organization_id TEXT NOT NULL,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Opportunities Table
```sql
CREATE TABLE opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  value DECIMAL(12, 2),
  status TEXT DEFAULT 'open', -- or 'stage' in some schemas
  expected_close_date DATE,
  owner_id UUID, -- or 'created_by' in some schemas
  organization_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Project Managers Table
```sql
CREATE TABLE project_managers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  mailing_address TEXT,
  organization_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Troubleshooting

### Problem: Schema Check Shows Missing Tables

**Solution:** Run the database migration SQL scripts:
1. Go to your Supabase dashboard
2. Navigate to SQL Editor
3. Run `/SETUP_DATABASE.sql` or `/database-setup.sql`

### Problem: Schema Check Shows Missing Columns

**Solution:** Run the column fix migration:
1. Go to Supabase SQL Editor
2. Run `/FIX-OPPORTUNITIES-COLUMNS.sql` or `/SIMPLE-OPPORTUNITIES-FIX.sql`

### Problem: Generated Data Doesn't Appear

**Possible causes:**
1. **RLS Policies blocking access** - Check your RLS policies allow authenticated users
2. **Organization ID mismatch** - Verify your user has an organization_id
3. **Foreign key constraints** - Check that referenced tables exist

**Solution:**
1. Check database permissions
2. Review RLS policies in Supabase
3. Run "Check Database" to see detailed error messages

### Problem: Bids Still Show 0 After Generating Data

**Possible causes:**
1. **Wrong opportunity being viewed** - The IDs don't match
2. **Organization filter too strict** - Not including the right org_id
3. **Data wasn't actually created** - Check for errors in console

**Solution:**
1. Click "Check Database" to verify data exists
2. Check console logs for error messages
3. Try generating data again
4. Expand the "Last Generated Data" section to see created IDs

## Next Steps

1. **✅ Go to Settings → Test Data**
2. **✅ Click "Check Database"** to verify your schema
3. **✅ Click "Generate Test Data"** to create sample data
4. **✅ Go to Contacts** and you should see 3 new contacts
5. **✅ Click on a contact** and view their opportunities
6. **✅ Click on an opportunity** and you should see 2 bids

## Console Logging

The Test Data Generator includes comprehensive logging:
- `[TestDataGenerator]` - Generator status messages
- `[getBidsByOpportunityClient]` - Bid query details
- `[loadData]` - Opportunity detail loading

Watch the console to see exactly what's happening!

---

**Status: ✅ COMPLETE - Test Data Generator Ready to Use!**

All three requests have been addressed:
1. ✅ Test data generation with proper relationships
2. ✅ Database schema verification
3. ✅ Bid filtering logic review and confirmation
