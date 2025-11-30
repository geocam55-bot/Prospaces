# After Migration Cleanup Instructions

## Step 1: Run the Migration
1. Open Supabase Dashboard → SQL Editor
2. Copy all content from `/RUNTHIS-complete-migration.sql`
3. Paste and run the SQL
4. Verify all columns were created successfully (check the verification queries at the bottom)

## Step 2: Remove Temporary Code Blocks

After the migration is successful, you need to remove the TEMPORARY field-stripping code in `/utils/contacts-client.ts`:

### In `createContactClient` function (around line 165-180):
**REMOVE these lines:**
```typescript
// TEMPORARY: Remove fields that may not exist in database yet until migration is run
// TODO: Remove this after running /RUNTHIS-complete-migration.sql
const { 
  address,
  notes,
  owner_id,
  price_level,
  created_by,
  legacy_number, 
  account_owner_number, 
  ptd_sales, 
  ptd_gp_percent, 
  ytd_sales, 
  ytd_gp_percent, 
  lyr_sales, 
  lyr_gp_percent,
  ...safeData 
} = transformedData;
```

**CHANGE:**
```typescript
const newContact = {
  ...safeData,
  organization_id: user.user_metadata?.organizationId,
  created_at: new Date().toISOString(),
};
```

**TO:**
```typescript
const newContact = {
  ...transformedData,
  organization_id: user.user_metadata?.organizationId,
  created_at: new Date().toISOString(),
};
```

### In `updateContactClient` function (around line 215-230):
**REMOVE these lines:**
```typescript
// TEMPORARY: Remove fields that may not exist in database yet until migration is run
// TODO: Remove this after running /RUNTHIS-complete-migration.sql
const { 
  address,
  notes,
  owner_id,
  price_level,
  created_by,
  legacy_number, 
  account_owner_number, 
  ptd_sales, 
  ptd_gp_percent, 
  ytd_sales, 
  ytd_gp_percent, 
  lyr_sales, 
  lyr_gp_percent,
  ...safeData 
} = transformedData;
```

**CHANGE:**
```typescript
const { data, error } = await supabase
  .from('contacts')
  .update(safeData)
  .eq('id', id)
  .select()
  .single();
```

**TO:**
```typescript
const { data, error } = await supabase
  .from('contacts')
  .update(transformedData)
  .eq('id', id)
  .select()
  .single();
```

## Step 3: Test
After making these changes:
1. Reload your app
2. Try creating a contact with all fields including Legacy # and Account Owner #
3. Verify the fields are saved correctly
4. Test Import/Export with the new fields
5. Verify all fields work correctly including address, notes, price level, etc.

## Summary
The temporary code prevents errors now by stripping out fields that don't exist in the database yet. Once you run the migration and remove the temporary blocks, all fields will work perfectly including:
- address
- notes  
- owner_id
- price_level
- created_by
- legacy_number
- account_owner_number
- All 6 sales/GP fields (PTD, YTD, LYR)