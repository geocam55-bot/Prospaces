# Re-Enable Cost Field (After Migration)

## When to Use This
After you've successfully run `/RUN_THIS_IN_SUPABASE.sql` and the cost column exists in your database, you can re-enable cost field support in the application code.

## Status: Currently Disabled
The cost field is currently **disabled** in the code to prevent PGRST204 errors. This allows imports to work while you run the migration.

## What's Disabled
- Cost field removed from SELECT queries
- Cost field removed from INSERT/UPDATE operations  
- Cost field removed from CSV export headers
- Cost field removed from import templates

## How to Re-Enable (After Migration)

### 1. Update inventory-client.ts

**In SELECT queries, change:**
```typescript
.select('id, name, sku, description, category, quantity, quantity_on_order, unit_price, organization_id, created_at, updated_at')
```

**To:**
```typescript
.select('id, name, sku, description, category, quantity, quantity_on_order, unit_price, cost, organization_id, created_at, updated_at')
```

**In create/update functions, re-enable:**
```typescript
if (itemData.cost !== undefined) {
  const cost = typeof itemData.cost === 'string' 
    ? parseFloat(itemData.cost) 
    : itemData.cost;
  cleanData.cost = Math.round(cost * 100);
}
```

### 2. Update ImportExport.tsx

**In DATABASE_FIELDS.inventory, add back:**
```typescript
{ value: 'cost', label: 'Cost', required: false },
```

**In handleExportInventory, change header to:**
```typescript
'name,sku,description,category,quantity,quantity_on_order,unit_price,cost'
```

**And map to:**
```typescript
`\"${i.name}\",\"${i.sku}\",\"${i.description || ''}\",\"${i.category}\",\"${i.quantity}\",\"${i.quantity_on_order}\",\"${i.unit_price}\",\"${i.cost || ''}\"`
```

**In downloadTemplate, change to:**
```typescript
csvContent = 'name,sku,description,category,quantity,quantity_on_order,unit_price,cost\\nSample Item,SKU-001,Sample description,Electronics,100,50,99.99,75.00';
```

### 3. Update ScheduledJobs.tsx

**In executeExport for inventory, change header to:**
```typescript
'name,sku,description,category,quantity,quantity_on_order,unit_price,cost'
```

**And map to:**
```typescript
`\\\"${i.name}\\\",\\\"${i.sku}\\\",\\\"${i.description || ''}\\\",\\\"${i.category}\\\",\\\"${i.quantity}\\\",\\\"${i.quantity_on_order}\\\",\\\"${i.unit_price}\\\",\\\"${i.cost || ''}\\\"`
```

## Verification

After re-enabling:
1. Create a new inventory item with cost
2. Export inventory - verify cost appears in CSV
3. Import inventory with cost - verify it imports correctly
4. View inventory list - verify cost displays

## Don't Re-Enable Until:
- ✅ You've run `/RUN_THIS_IN_SUPABASE.sql`
- ✅ The script completed successfully
- ✅ You've waited 10-15 seconds for schema cache refresh
- ✅ You've verified no PGRST204 errors

---

**Note:** The current code works fine without cost. Only re-enable when you need cost tracking and have completed the migration.
