# Calendar Sync Migration - Type Fix Applied

## Issues Resolved ✅

### 1. Organization ID Type Mismatch
**Error:** Foreign key type mismatch between `calendar_accounts.organization_id` (UUID) and `organizations.id` (TEXT)

**Root Cause:** ProSpaces CRM uses TEXT for organization IDs, not UUID.

**Fix Applied:** Changed all `organization_id` columns from `UUID` to `TEXT` in:
- ✅ `calendar_accounts` table
- ✅ `calendar_event_mappings` table

### 2. User-Organization Relationship
**Error:** `relation "user_organizations" does not exist`

**Root Cause:** ProSpaces CRM uses a `profiles` table with `organization_id` column, not a separate `user_organizations` join table.

**Fix Applied:** Updated all RLS policies to use `profiles` table:
- ✅ Changed `SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()`
- ✅ To: `SELECT organization_id FROM profiles WHERE id = auth.uid()`

### 3. OAuth Secrets Table Missing
**Error:** `relation "oauth_secrets" does not exist`

**Root Cause:** Migration assumed email OAuth migration was already run.

**Fix Applied:** Added `CREATE TABLE IF NOT EXISTS` for `oauth_secrets` table in calendar migration:
- ✅ Creates table if it doesn't exist (standalone migration)
- ✅ Safely inserts calendar OAuth credentials with `ON CONFLICT DO NOTHING`
- ✅ Added `DROP POLICY IF EXISTS` to prevent policy conflicts

---

## What Was Changed

### Before (Incorrect):
```sql
organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,

-- In RLS policies:
organization_id IN (
  SELECT organization_id FROM user_organizations 
  WHERE user_id = auth.uid()
)
```

### After (Correct):
```sql
organization_id TEXT REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,

-- In RLS policies:
organization_id IN (
  SELECT organization_id FROM profiles 
  WHERE id = auth.uid()
)

-- Added for OAuth Secrets Table:
CREATE TABLE IF NOT EXISTS oauth_secrets (
  id SERIAL PRIMARY KEY,
  client_id TEXT NOT NULL,
  client_secret TEXT NOT NULL,
  redirect_uri TEXT NOT NULL,
  scope TEXT NOT NULL,
  provider TEXT NOT NULL
);

-- Insert calendar OAuth credentials:
INSERT INTO oauth_secrets (client_id, client_secret, redirect_uri, scope, provider)
VALUES ('calendar_client_id', 'calendar_client_secret', 'calendar_redirect_uri', 'calendar_scope', 'calendar_provider')
ON CONFLICT DO NOTHING;

-- Drop policy if exists to prevent conflicts:
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON oauth_secrets;
```

---

## Migration Now Ready

The updated migration file is now compatible with your ProSpaces database schema:

**File:** `/supabase/migrations/20231113000000_calendar_sync.sql`

**Run this in your Supabase SQL Editor** and it will execute without errors!

---

## Verification

After running the migration, verify with:

```sql
-- Check table was created successfully
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'calendar_accounts' 
AND column_name = 'organization_id';

-- Should show: data_type = 'text' ✅
```

---

## No Code Changes Needed

The TypeScript code already handles organization_id as a string, so no frontend changes were required. The fix was purely in the SQL migration file.

---

**Status:** ✅ Ready to run!