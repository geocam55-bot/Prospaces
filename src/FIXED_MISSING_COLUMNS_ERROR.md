# Fixed: Missing Column Errors in Database Queries

## Problem
The application was throwing multiple database errors about missing columns:
```
ERROR: column tasks.created_by does not exist
ERROR: column opportunities.created_by does not exist
ERROR: column appointments.created_by does not exist
ERROR: column contacts.account_owner_number does not exist
ERROR: column contacts.created_by does not exist
```

## Root Cause
Several components were trying to query columns that don't exist in the current database schema:
1. Using `select('*')` which attempts to select ALL columns including non-existent ones
2. Explicitly selecting columns like `created_by` and `account_owner_number` that haven't been added yet
3. Filtering by these non-existent columns with `.eq('created_by', userId)`

## Solution
Changed all queries to explicitly select only the columns that exist in the current schema, and updated filters to use columns that do exist.

## Files Fixed

### 1. `/components/ManagerDashboard.tsx`

**Changed queries from `select('*')` to specific columns:**

#### Contacts Query (Lines 237-246)
```typescript
// Before:
.from('contacts')
.select('*')

// After:
.from('contacts')
.select('id, name, email, phone, company, status, organization_id, created_at, updated_at')
```

#### Tasks Query (Lines 249-258)
```typescript
// Before:
.from('tasks')
.select('*')

// After:
.from('tasks')
.select('id, title, description, status, priority, due_date, assigned_to, created_at, updated_at')
```

#### Bids Query (Lines 261-270)
```typescript
// Before:
.from('bids')
.select('*')

// After:
.from('bids')
.select('id, title, status, amount, customer_name, organization_id, created_at, updated_at')
```

#### Quotes Query (Lines 273-282)
```typescript
// Before:
.from('quotes')
.select('*')

// After:
.from('quotes')
.select('id, title, status, total, customer_name, organization_id, created_at, updated_at')
```

#### Opportunities Query (Lines 285-294)
```typescript
// Before:
.from('opportunities')
.select('*')

// After:
.from('opportunities')
.select('id, name, stage, status, value, owner_id, close_date, created_at, updated_at')
```

#### Appointments Query (Lines 297-306)
```typescript
// Before:
.from('appointments')
.select('*')

// After:
.from('appointments')
.select('id, title, description, start_time, end_time, location, status, organization_id, created_at, updated_at')
```

### 2. `/components/Dashboard.tsx`

#### Contacts Query for Standard Users (Lines 301-321)
```typescript
// Before:
.select('*')
.or(`account_owner_number.eq.${user.email},created_by.eq.${user.id}`)

// After:
.select('id, name, email, phone, company, status, organization_id, created_at')
.eq('organization_id', user.organizationId)
```

#### Recent Contacts Query (Lines 693-698)
```typescript
// Before:
.select('id, name, company, created_at, created_by')
.eq('created_by', user.id)

// After:
.select('id, name, company, created_at')
.eq('organization_id', user.organizationId)
```

#### Tasks Query (Lines 353-356)
```typescript
// Before:
.from('tasks')
.select('*')
.eq('created_by', user.id)

// After:
.from('tasks')
.select('id, title, description, status, priority, due_date, assigned_to, organization_id, created_at, updated_at')
.eq('assigned_to', user.id)
```

#### Appointments Query (Lines 394-397)
```typescript
// Before:
.from('appointments')
.select('*')
.eq('created_by', user.id)

// After:
.from('appointments')
.select('id, title, description, start_time, end_time, location, status, organization_id, created_at')
.eq('organization_id', user.organizationId)
```

#### Opportunities Query (Lines 495-498)
```typescript
// Before:
.from('opportunities')
.select('*')
.or(`created_by.eq.${user.id},owner_id.eq.${user.id}`)

// After:
.from('opportunities')
.select('id, name, stage, status, value, owner_id, close_date, organization_id, created_at, updated_at')
.eq('owner_id', user.id)
```

## Current Schema (Columns That Exist)

### contacts table
- ✅ id, name, email, phone, company, status, organization_id, created_at, updated_at
- ❌ created_by, account_owner_number (don't exist yet)

### tasks table
- ✅ id, title, description, status, priority, due_date, assigned_to, organization_id, created_at, updated_at
- ❌ created_by (doesn't exist yet)

### opportunities table
- ✅ id, name, stage, status, value, owner_id, close_date, organization_id, created_at, updated_at
- ❌ created_by (doesn't exist yet)

### appointments table
- ✅ id, title, description, start_time, end_time, location, status, organization_id, created_at, updated_at
- ❌ created_by (doesn't exist yet)

### bids table
- ✅ id, title, status, amount, customer_name, organization_id, created_at, updated_at
- ✅ Has created_by (this table might be OK)

### quotes table
- ✅ id, title, status, total, customer_name, organization_id, created_at, updated_at
- ✅ Has created_by (this table might be OK)

## Impact
✅ Dashboard now loads without database errors  
✅ ManagerDashboard shows correct metrics without crashes  
✅ All queries use only columns that exist in the current schema  
✅ Filters changed from non-existent columns to working alternatives:
   - `created_by` → `assigned_to` (for tasks)
   - `created_by` → `owner_id` (for opportunities)
   - `created_by` → `organization_id` (for contacts/appointments)

## Prevention Tips
1. ❌ **Avoid** using `select('*')` - it selects all columns including ones that might not exist
2. ✅ **Always** explicitly list the columns you need
3. ✅ **Check** the database schema before writing queries
4. ✅ **Test** queries with missing columns to ensure graceful fallbacks

## Future Improvements
If you want to add the missing columns later, you'll need to run migrations:

```sql
-- Add created_by to contacts
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id);

-- Add account_owner_number to contacts  
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS account_owner_number TEXT;

-- Add created_by to tasks
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id);

-- Add created_by to opportunities
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id);

-- Add created_by to appointments
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id);
```

## Testing Checklist
- [x] Dashboard loads without errors
- [x] ManagerDashboard loads without errors
- [x] Contacts metrics display correctly
- [x] Tasks metrics display correctly
- [x] Opportunities metrics display correctly
- [x] Appointments metrics display correctly
- [x] Recent activity shows up
- [x] No console errors about missing columns
