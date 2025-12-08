# 🔄 Database Fix Flow Diagram

## Current Problem Flow

```
User tries to sign in/sign up
         ↓
Auth creates user in auth.users table ✅
         ↓
Trigger: handle_new_user() fires
         ↓
❌ ERROR: Tries to access "users" table (doesn't exist!)
         ↓
❌ ERROR 42501: "permission denied for table users"
         ↓
❌ Profile creation FAILS
         ↓
❌ User CANNOT log in
```

---

## After Fix Flow

```
User tries to sign in/sign up
         ↓
Auth creates user in auth.users table ✅
         ↓
Trigger: handle_new_user() fires ✅
         ↓
1. Creates organization in organizations table ✅
         ↓
2. Creates profile in profiles table ✅
   (with proper RLS policies allowing insert)
         ↓
✅ Profile created successfully
         ↓
✅ User logged in successfully
```

---

## What the Fix Does

### 1. Adds Missing Column
```
contacts table
├── existing columns...
└── legacy_number (NEW!) ← For CSV import matching
```

### 2. Fixes RLS Policies on Profiles
```
BEFORE:
profiles table
└── ❌ Restrictive policies blocking inserts

AFTER:
profiles table
├── ✅ Users can insert own profile
├── ✅ Users can read own profile
├── ✅ Users can update own profile
├── ✅ Super admins can read all profiles
└── ✅ Super admins can update all profiles
```

### 3. Fixes handle_new_user() Function
```
BEFORE:
handle_new_user()
├── Creates organization ✅
├── Tries to access "users" table ❌
└── ERROR 42501 ❌

AFTER:
handle_new_user()
├── Creates organization ✅
├── Creates profile in "profiles" table ✅
├── Has error handling ✅
└── Returns success ✅
```

### 4. Fixes Organizations RLS
```
organizations table
├── ✅ Authenticated users can insert (for auto-creation)
├── ✅ Users can read own organization
├── ✅ Admins can update own organization
└── ✅ Super admins can read all organizations
```

### 5. Grants Permissions
```
authenticated role
├── ✅ Can use auth schema
├── ✅ Can SELECT, INSERT, UPDATE on profiles
├── ✅ Can SELECT, INSERT, UPDATE on organizations
└── ✅ Can SELECT on auth.users
```

### 6. Fixes Contacts RLS
```
contacts table
├── ✅ Users can insert contacts in their org
└── ✅ Users can update contacts in their org
    (Critical for CSV import!)
```

---

## Database Table Relationships

```
auth.users (Supabase managed)
    ↓
    │ (trigger: on_auth_user_created)
    ↓
handle_new_user() function
    ├──→ Creates organizations table entry
    └──→ Creates profiles table entry
              ↓
         User Profile ✅
         ├── id (from auth.users)
         ├── email
         ├── role
         ├── organization_id ←──┐
         └── ...                  │
                                  │
         organizations table      │
         ├── id ──────────────────┘
         ├── name
         └── ...
```

---

## Error Code Reference

| Error Code | Meaning | Fix |
|------------|---------|-----|
| **42501** | Permission denied | Grant permissions + fix function |
| **400** | Bad request (missing column) | Add legacy_number column |
| **403** | Forbidden (RLS blocking) | Fix RLS policies |
| **23505** | Duplicate key (unique constraint) | Handled gracefully in code |
| **23503** | Foreign key violation | Fixed by proper org creation |

---

## Security Maintained ✅

```
Multi-Tenant Isolation
    ↓
Organization A          Organization B
├── User 1              ├── User 3
│   ├── Can read own    │   ├── Can read own
│   └── Can NOT read B  │   └── Can NOT read A
└── User 2              └── User 4
    ├── Can read own        ├── Can read own
    └── Can NOT read B      └── Can NOT read A

Super Admin (org-less or special org)
└── Can read/update ALL organizations ✅
```

---

## Before vs After Comparison

### User Sign Up Flow

#### BEFORE (Broken ❌)
```
1. User submits sign-up form
2. Supabase creates auth user ✅
3. Trigger fires: handle_new_user()
4. ❌ Tries to access "users" table
5. ❌ ERROR 42501: permission denied
6. ❌ No profile created
7. ❌ User cannot log in
```

#### AFTER (Fixed ✅)
```
1. User submits sign-up form
2. Supabase creates auth user ✅
3. Trigger fires: handle_new_user()
4. ✅ Creates organization
5. ✅ Creates profile in "profiles" table
6. ✅ Profile created successfully
7. ✅ User logs in automatically
```

### CSV Import Flow

#### BEFORE (Broken ❌)
```
1. User uploads CSV file
2. App tries to insert contacts
3. ❌ ERROR 400: column "legacy_number" doesn't exist
4. ❌ Import fails
```

#### AFTER (Fixed ✅)
```
1. User uploads CSV file
2. App tries to insert contacts
3. ✅ legacy_number column exists
4. ✅ RLS policies allow insert
5. ✅ Import succeeds
```

---

## Deployment Flow

```
Step 1: Open Supabase
    ↓
Step 2: Open SQL Editor
    ↓
Step 3: Copy /URGENT_DATABASE_FIXES.sql
    ↓
Step 4: Paste into SQL Editor
    ↓
Step 5: Click "Run"
    ↓
    │ (2-5 seconds execution time)
    ↓
Step 6: Verify Results
    ├── ✅ ALTER TABLE commands succeeded
    ├── ✅ CREATE POLICY commands succeeded
    ├── ✅ CREATE FUNCTION command succeeded
    ├── ✅ GRANT commands succeeded
    └── ✅ Verification queries show data
    ↓
Step 7: Test App
    ├── ✅ Sign in works
    ├── ✅ Sign up works
    └── ✅ CSV import works
    ↓
🎉 SUCCESS!
```

---

## Files Involved

```
Project Files:
├── /URGENT_DATABASE_FIXES.sql          ← The fix (run this!)
├── /DEPLOY_URGENT_FIXES_NOW.md         ← Detailed instructions
├── /QUICK_FIX_CHECKLIST.md             ← Step-by-step checklist
└── /FIX_FLOW_DIAGRAM.md                ← This file (visual guide)

Affected Database Tables:
├── contacts                             ← Gets legacy_number column
├── profiles                             ← Gets fixed RLS policies
├── organizations                        ← Gets fixed RLS policies
└── auth.users                           ← Trigger updated

Affected Functions:
└── handle_new_user()                    ← Fixed to not reference "users" table
```

---

## Quick Reference Commands

### Run the Fix
```sql
-- Copy and paste ALL of /URGENT_DATABASE_FIXES.sql into Supabase SQL Editor
-- Then click "Run"
```

### Verify the Fix
```sql
-- Check legacy_number column
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'contacts' AND column_name = 'legacy_number';

-- Check profiles policies
SELECT policyname FROM pg_policies WHERE tablename = 'profiles';

-- Check handle_new_user function
SELECT routine_name FROM information_schema.routines 
WHERE routine_name = 'handle_new_user';
```

---

## Timeline

```
Past (Broken):
❌ User sign-up fails with 42501 error
❌ CSV import fails with 400 error
❌ Profile creation blocked by RLS

Present (Fixing):
🔧 Running URGENT_DATABASE_FIXES.sql
🔧 Updating policies and permissions
🔧 Fixing trigger function

Future (Fixed):
✅ User sign-up works smoothly
✅ CSV import works successfully
✅ Profiles created automatically
✅ Multi-tenant security maintained
```

---

**Next Action**: Run `/URGENT_DATABASE_FIXES.sql` in Supabase SQL Editor → Test your app → Success! 🎉
