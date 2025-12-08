# Fixed: profiles.user_id Column Error

## Problem
The application was crashing with the error:
```
ERROR: 42703: column "user_id" does not exist
LINE 12: SELECT user_id FROM profiles WHERE organization_id = 'rona-atlantic'
```

## Root Cause
The `profiles` table uses `id` as its primary key (which references `auth.users(id)`), but some code was incorrectly trying to access a `user_id` column that doesn't exist.

### Profiles Table Schema
```sql
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  name text,
  role text NOT NULL DEFAULT 'standard_user',
  organization_id text,
  status text DEFAULT 'active',
  last_login timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

The `id` column is the user's ID (from auth.users), NOT `user_id`.

## Files Fixed

### 1. `/components/InvalidOrgIdAlert.tsx`
**Line 28** - Changed SQL query in the component that generates fix scripts:

**Before:**
```typescript
WHERE id IN (
  SELECT user_id FROM profiles WHERE organization_id = '${correctOrgId}'
);
```

**After:**
```typescript
WHERE id IN (
  SELECT id FROM profiles WHERE organization_id = '${correctOrgId}'
);
```

### 2. `/utils/find-missing-user.ts`
Fixed multiple references to `user_id` that should have been `id`:

**Line 52** - Console logging:
```typescript
// Before:
console.log('   User ID:', profiles.user_id);

// After:
console.log('   User ID:', profiles.id);
```

**Lines 158-185** - Query and update operations in `recoverMissingUser()`:
```typescript
// Before:
const { data: profile } = await supabase
  .from('profiles')
  .select('user_id')
  .eq('email', email)
  .maybeSingle();

if (profile?.user_id) {
  // ... code ...
  .eq('user_id', profile.user_id);
}

// After:
const { data: profile } = await supabase
  .from('profiles')
  .select('id')
  .eq('email', email)
  .maybeSingle();

if (profile?.id) {
  // ... code ...
  .eq('id', profile.id);
}
```

## Impact
✅ The app will no longer crash when:
- InvalidOrgIdAlert component is displayed
- Users run the find-missing-user utilities
- Any code tries to query profiles with the user_id column

## Testing
After this fix, the following should work correctly:
1. Navigate to the app - no more crashes
2. If you see an invalid org ID alert, the SQL fix should be correct
3. Browser console utilities like `findMissingUser()` and `recoverMissingUser()` will work

## Prevention
When querying the `profiles` table:
- ✅ Use `id` to reference the user's auth ID
- ❌ Don't use `user_id` (this column doesn't exist)

## Related Tables
Other tables may have different column naming:
- `profiles` → uses `id` (references auth.users.id)
- `contacts` → might use `created_by` (references profiles.id)
- `tasks` → might use `created_by` (references profiles.id)
- `oauth_states` → uses `user_id` (different table, different schema)

Always check the table schema before writing queries!
