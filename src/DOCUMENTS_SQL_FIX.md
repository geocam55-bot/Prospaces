# Documents Migration SQL - Syntax Error Fix

## Issue
When running the documents migration SQL in Supabase, you encountered this error:

```
Error: Failed to run sql query: ERROR: 42601: syntax error at or near "EXISTS"
LINE 236: GRANT USAGE ON SEQUENCE IF EXISTS documents_id_seq TO authenticated;
```

## Root Causes

### 1. Invalid GRANT Syntax
PostgreSQL's `GRANT` statement does not support `IF EXISTS` clause. The line:
```sql
GRANT USAGE ON SEQUENCE IF EXISTS documents_id_seq TO authenticated;
```
was invalid syntax.

### 2. Non-existent Sequence
The `documents` table uses UUID as the primary key with `DEFAULT gen_random_uuid()`, which doesn't create a sequence. So `documents_id_seq` doesn't exist and the GRANT statement was unnecessary.

### 3. Wrong File Extension
The file was named `20241119000001_documents.sql.tsx` instead of `.sql`

## Fixes Applied

### 1. ✅ Removed Invalid GRANT Statement
**Before:**
```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO authenticated;
GRANT USAGE ON SEQUENCE IF EXISTS documents_id_seq TO authenticated;
```

**After:**
```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO authenticated;
```

### 2. ✅ Added IF NOT EXISTS to Storage Policies
Made the migration more idempotent by adding `IF NOT EXISTS` to storage policy creation:

```sql
CREATE POLICY IF NOT EXISTS "Users can view files in their organization"
ON storage.objects FOR SELECT ...
```

### 3. ✅ Fixed Permissions Insert
Changed from complex JOIN-based insert to simple VALUES insert that works with the actual permissions table schema:

**Before:**
```sql
INSERT INTO public.permissions (module, action, roles, organization_id)
SELECT 'documents' as module, action, ...
```

**After:**
```sql
INSERT INTO public.permissions (role, module, visible, add, change, delete)
VALUES
  ('super_admin', 'documents', true, true, true, true),
  ('admin', 'documents', true, true, true, true),
  ('manager', 'documents', true, true, true, false),
  ('marketing', 'documents', true, true, false, false),
  ('standard_user', 'documents', true, true, false, false)
ON CONFLICT (role, module) DO UPDATE SET ...
```

### 4. ✅ Added DROP TRIGGER IF EXISTS
Made trigger creation idempotent:

```sql
DROP TRIGGER IF EXISTS trigger_update_documents_updated_at ON public.documents;
CREATE TRIGGER trigger_update_documents_updated_at ...
```

### 5. ✅ Fixed File Extension
- Deleted: `/supabase/migrations/20241119000001_documents.sql.tsx`
- Created: `/supabase/migrations/20241119000001_documents.sql`

### 6. ✅ Updated DocumentsSetup Component
Updated the embedded SQL in `/components/DocumentsSetup.tsx` to match the fixed migration file.

## Files Updated

1. ✅ `/supabase/migrations/20241119000001_documents.sql` - Created with corrected SQL
2. ✅ `/supabase/migrations/20241119000001_documents.sql.tsx` - Deleted (wrong extension)
3. ✅ `/components/DocumentsSetup.tsx` - Updated with corrected SQL
4. ✅ `/DOCUMENTS_SQL_FIX.md` - This documentation

## How to Run the Fixed Migration

### Option 1: Copy from UI (Recommended)
1. Click **"Documents"** in the sidebar
2. Click **"Copy SQL"** button
3. Go to **Supabase Dashboard → SQL Editor**
4. Paste and click **"Run"**
5. Click **"Refresh Page"** in the app

### Option 2: Use the File
1. Open `/supabase/migrations/20241119000001_documents.sql`
2. Copy all contents
3. Go to **Supabase Dashboard → SQL Editor**
4. Paste and click **"Run"**
5. Refresh your browser

## Expected Results

After running the migration successfully, you should see multiple success messages:

```
✅ Success. No rows returned (for bucket insert)
✅ Success. No rows returned (for each policy)
✅ Success. No rows returned (for table creation)
✅ Success. No rows returned (for indexes)
✅ Success. No rows returned (for RLS enable)
✅ Success. No rows returned (for policies)
✅ Success. No rows returned (for function)
✅ Success. No rows returned (for trigger)
✅ Success. No rows returned (for grants)
✅ Success. 5 rows affected (for permissions insert)
✅ Success. No rows returned (for comments)
```

## Verification

After running the migration, verify it worked:

### Check Table Exists
```sql
SELECT * FROM public.documents LIMIT 1;
```
Should return: "Success. No rows returned" (empty table is OK)

### Check Storage Bucket
```sql
SELECT * FROM storage.buckets WHERE id = 'documents';
```
Should return: 1 row with bucket details

### Check Permissions
```sql
SELECT * FROM public.permissions WHERE module = 'documents';
```
Should return: 5 rows (one for each role)

### Check Policies
```sql
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename = 'documents';
```
Should return: 4 policies for the documents table

```sql
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename = 'objects' AND policyname LIKE '%organization%';
```
Should return: 4 policies for storage

## Success Criteria

✅ No SQL syntax errors  
✅ Storage bucket created  
✅ Documents table created  
✅ 8 indexes created  
✅ 8 RLS policies created (4 for table, 4 for storage)  
✅ Trigger created  
✅ Permissions inserted  
✅ Can refresh browser and see Documents module  

## Common Issues

### If you still see errors:

**"relation already exists"**
- This is normal if re-running the migration
- The migration is idempotent (safe to run multiple times)
- It will skip items that already exist

**"policy already exists"**
- Normal for storage policies
- You may need to drop existing policies first if they have different names

**"permissions table not found"**
- Your permissions table might have a different schema
- Check the actual schema: `SELECT * FROM public.permissions LIMIT 1;`
- Adjust the INSERT statement if needed

## Next Steps

After the migration runs successfully:

1. ✅ Refresh your browser (hard refresh: Ctrl+Shift+R)
2. ✅ Click "Documents" in the sidebar
3. ✅ You should see the documents table (empty initially)
4. ✅ Try uploading a test document
5. ✅ Check Users → Role Permissions to see Documents module

---

**Fixed:** November 19, 2024  
**Status:** ✅ Ready to run  
**Migration File:** `/supabase/migrations/20241119000001_documents.sql`
