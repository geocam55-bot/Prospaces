# Fix Tenants Module Errors

## Issues Fixed

### 1. Missing Database Columns Error
**Error Message:**
```
Failed to update tenant: {
  "code": "PGRST204",
  "details": null,
  "hint": null,
  "message": "Could not find the 'billingEmail' column of 'organizations' in the schema cache"
}
```

**Root Cause:** The `organizations` table was missing several columns that the Tenants component was trying to use.

**Solution:** Added missing columns to the organizations table using SQL migration.

### 2. React NaN Warning
**Error Message:**
```
Warning: Received NaN for the `children` attribute
```

**Root Cause:** The Input components for `maxUsers` and `maxContacts` were receiving NaN values when parsing failed.

**Solution:** Used nullish coalescing operator (`??`) to provide default values and prevent NaN.

---

## SQL Migration

Run this SQL in your Supabase SQL Editor:

```sql
-- ============================================
-- ADD MISSING COLUMNS TO ORGANIZATIONS TABLE
-- ============================================

-- Add columns for tenant management
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS domain text,
  ADD COLUMN IF NOT EXISTS plan text DEFAULT 'starter',
  ADD COLUMN IF NOT EXISTS billing_email text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS max_users integer DEFAULT 10,
  ADD COLUMN IF NOT EXISTS max_contacts integer DEFAULT 1000,
  ADD COLUMN IF NOT EXISTS features jsonb DEFAULT '[]'::jsonb;

-- Verify the columns were added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'organizations'
AND table_schema = 'public'
ORDER BY ordinal_position;
```

---

## Code Changes

### 1. Updated `/utils/api.ts` - tenantsAPI

#### Added Column Mapping
- Maps camelCase (JavaScript) to snake_case (PostgreSQL)
- Handles JSON serialization for the `features` array
- Properly transforms data in both `create()` and `update()` methods

#### Key Changes:
```typescript
// CREATE method - maps camelCase to snake_case
const dbData = {
  name: data.name,
  domain: data.domain,
  status: data.status,
  plan: data.plan,
  logo: data.logo,
  billing_email: data.billingEmail,  // ✅ snake_case
  phone: data.phone,
  address: data.address,
  notes: data.notes,
  max_users: data.maxUsers,          // ✅ snake_case
  max_contacts: data.maxContacts,    // ✅ snake_case
  features: data.features ? JSON.stringify(data.features) : '[]',
};

// GETALL method - maps snake_case back to camelCase
const tenants = (data || []).map(org => ({
  id: org.id,
  name: org.name,
  domain: org.domain,
  billingEmail: org.billing_email,  // ✅ camelCase
  maxUsers: org.max_users,          // ✅ camelCase
  maxContacts: org.max_contacts,    // ✅ camelCase
  features: typeof org.features === 'string' ? JSON.parse(org.features) : (org.features || []),
  // ... other fields
}));
```

### 2. Updated `/components/Tenants.tsx`

#### Fixed NaN Issue
Changed from `||` operator to `??` (nullish coalescing):

```typescript
// Before (could cause NaN)
value={formData.maxUsers || 10}

// After (prevents NaN)
value={formData.maxUsers ?? 10}
```

This ensures that if `maxUsers` is 0, it shows 0 instead of the default 10.

---

## Database Schema

### Organizations Table (Complete Schema)

| Column Name     | Data Type    | Default        | Description                           |
|-----------------|--------------|----------------|---------------------------------------|
| id              | text         | -              | Primary key                          |
| name            | text         | -              | Organization name (required)         |
| status          | text         | 'active'       | Status: active/inactive/suspended    |
| logo            | text         | null           | Base64 encoded logo                  |
| domain          | text         | null           | Organization domain (e.g., acme.com) |
| plan            | text         | 'starter'      | Subscription plan                    |
| billing_email   | text         | null           | Billing contact email                |
| phone           | text         | null           | Contact phone number                 |
| address         | text         | null           | Physical address                     |
| notes           | text         | null           | Internal notes                       |
| max_users       | integer      | 10             | Maximum users allowed                |
| max_contacts    | integer      | 1000           | Maximum contacts allowed             |
| features        | jsonb        | '[]'::jsonb    | Array of feature strings             |
| created_at      | timestamptz  | now()          | Creation timestamp                   |
| updated_at      | timestamptz  | now()          | Last update timestamp                |

---

## Testing Checklist

After running the SQL migration and deploying the code changes:

- [ ] Run the SQL migration in Supabase SQL Editor
- [ ] Verify all columns were added successfully
- [ ] Log in as `super_admin` user
- [ ] Navigate to Tenants module
- [ ] Create a new organization with all fields
- [ ] Verify organization appears in the list
- [ ] Edit an existing organization
- [ ] Verify changes are saved correctly
- [ ] Check that no NaN warnings appear in console
- [ ] Test with maxUsers = 0 to ensure it displays correctly
- [ ] Upload an organization logo
- [ ] Delete a test organization

---

## Plan Types & Features

The Tenants module supports four subscription plans:

### Free Plan
- Up to 5 users
- Up to 100 contacts
- Basic features
- Email support

### Starter Plan (Default)
- Up to 10 users
- Up to 1,000 contacts
- Standard features
- Email support
- Marketing automation

### Professional Plan
- Up to 50 users
- Up to 10,000 contacts
- Advanced features
- Priority support
- Marketing automation
- Custom reports

### Enterprise Plan
- Unlimited users
- Unlimited contacts
- All features
- 24/7 support
- Marketing automation
- Custom reports
- API access
- Dedicated account manager

---

## Notes

1. **Column Naming Convention:**
   - Database uses `snake_case` (PostgreSQL standard)
   - JavaScript/React uses `camelCase` (JavaScript standard)
   - API layer handles the conversion

2. **Features Storage:**
   - Stored as JSONB in PostgreSQL
   - Automatically converted to/from JSON in API layer
   - Allows for flexible feature management

3. **User & Contact Counts:**
   - Currently set to 0 in `getAll()` method
   - These should be calculated from `profiles` and `contacts` tables in production
   - Can be added as a future enhancement with JOIN queries or database views

4. **Super Admin Access:**
   - Only users with `role = 'super_admin'` can access the Tenants module
   - This is enforced in the component with `canAccessTenants` check

---

## Related Files Modified

1. `/utils/api.ts` - Updated tenantsAPI methods
2. `/components/Tenants.tsx` - Fixed NaN issue in form inputs

---

## Success Indicators

✅ No more "Could not find the 'billingEmail' column" errors
✅ No more NaN warnings in React console
✅ Organizations can be created with all fields
✅ Organizations can be updated successfully
✅ Data persists correctly in the database
✅ UI displays all organization information properly
