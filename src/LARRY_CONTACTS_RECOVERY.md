# Larry's Lost Contacts - Diagnostic & Recovery Guide

## Problem
User larry.lee@ronaatlantic.ca has lost all his contacts in the CRM. They are not appearing in the Contacts module.

## Potential Causes
Contacts could be invisible due to several reasons:

1. **Wrong organization_id** - Contacts may have been imported or created with:
   - NULL organization_id (orphaned contacts)
   - Wrong organization_id (from a different organization)
   - Mismatched organization_id that doesn't match Larry's profile

2. **Data Migration Issue** - During data imports or migrations, contacts may have lost their organization association

3. **Filtering Logic** - The CRM filters contacts based on:
   - `organization_id` matching the user's organization
   - `created_by` matching the user's ID (for regular users)
   - `account_owner_number` matching the user's email (for regular users)

## Diagnostic Tool

I've created a diagnostic tool called **FindLarryContacts** that helps you:

1. **Find Larry's user profile** - Verifies Larry exists and gets his organization_id
2. **Search for contacts in multiple ways:**
   - Contacts created by Larry (created_by = Larry's user ID)
   - Contacts owned by Larry (account_owner_number contains larry.lee)
   - All contacts in Larry's organization
   - Orphaned contacts (contacts with NULL organization_id)

3. **Automatically fix the issue** - Updates contacts to have the correct organization_id

## How to Use the Diagnostic Tool

### Step 1: Access the Tool
1. Log in as an **Admin** or **Super Admin** user
2. Navigate to **Settings** (gear icon in navigation)
3. Click on the **"Test Data"** tab
4. Scroll down to find **"Find Larry's Contacts Diagnostic Tool"**

### Step 2: Run the Diagnostic
1. Click the **"Search for Larry's Contacts"** button
2. The tool will search for:
   - Larry's profile information
   - All contacts that might belong to Larry
   - Orphaned contacts that might need to be assigned

### Step 3: Review the Results
The tool will show you:
- **Larry's Profile Info**: ID, email, name, role, organization_id
- **Contacts Created By Larry**: Number found and details
- **Contacts Owned By Larry**: Contacts where account_owner_number matches
- **All Contacts in Larry's Organization**: Total count
- **Orphaned Contacts**: Contacts with NULL organization_id

### Step 4: Fix the Contacts (if needed)
If the tool detects contacts with the wrong organization_id:
1. A yellow alert box will appear
2. Click **"Fix Larry's Contacts Organization IDs"**
3. The tool will automatically update all affected contacts
4. A green success message will appear
5. Larry should now be able to see his contacts!

## Manual SQL Fix (Alternative)

If you prefer to fix this directly in the database, you can run this SQL in your Supabase SQL Editor:

### Step 1: Find Larry's Organization ID
```sql
SELECT id, email, name, role, organization_id 
FROM profiles 
WHERE email = 'larry.lee@ronaatlantic.ca';
```

### Step 2: Find Orphaned Contacts
```sql
-- Find contacts that should belong to Larry but have wrong/missing org_id
SELECT 
  c.id,
  c.name,
  c.company,
  c.account_owner_number,
  c.organization_id,
  c.created_by
FROM contacts c
WHERE 
  -- Contacts owned by Larry but wrong org
  (c.account_owner_number ILIKE '%larry.lee%' AND c.organization_id != '[LARRY_ORG_ID]')
  OR
  -- Contacts created by Larry but wrong org
  (c.created_by = '[LARRY_USER_ID]' AND c.organization_id != '[LARRY_ORG_ID]')
  OR
  -- Orphaned contacts (NULL org_id)
  c.organization_id IS NULL;
```

### Step 3: Fix the Organization IDs
```sql
-- Update contacts created by Larry
UPDATE contacts 
SET organization_id = '[LARRY_ORG_ID]'
WHERE created_by = '[LARRY_USER_ID]' 
  AND (organization_id IS NULL OR organization_id != '[LARRY_ORG_ID]');

-- Update contacts owned by Larry
UPDATE contacts 
SET organization_id = '[LARRY_ORG_ID]'
WHERE account_owner_number ILIKE '%larry.lee%'
  AND (organization_id IS NULL OR organization_id != '[LARRY_ORG_ID]');
```

**IMPORTANT**: Replace `[LARRY_ORG_ID]` and `[LARRY_USER_ID]` with the actual values from Step 1!

## How the CRM Filters Contacts

Understanding how contacts are filtered will help prevent this issue in the future:

### For Regular Users (like Larry):
```typescript
// User can see contacts where:
// 1. organization_id matches their organization AND
// 2. (account_owner_number matches their email OR created_by matches their user ID)
query = query
  .eq('organization_id', userOrgId)
  .or(`account_owner_number.ilike.${userEmail},created_by.eq.${user.id}`);
```

### For Admins:
```typescript
// Admin can see ALL contacts in their organization
query = query.eq('organization_id', userOrgId);
```

### For Super Admins:
```typescript
// Super Admin can see ALL contacts across ALL organizations
// No filtering applied
```

## Prevention Tips

To prevent contacts from becoming "lost" in the future:

1. **Always ensure organization_id is set** when importing contacts
2. **Use the fixed import functions** - The inventory import fix also applies to contacts
3. **Verify imports** - After importing data, check that the count matches your expectations
4. **Regular backups** - Use the Import/Export module to backup your data regularly
5. **Use the diagnostic tool** - Run it periodically to check for orphaned contacts

## Files Modified/Created

- **Created**: `/components/FindLarryContacts.tsx` - Diagnostic tool component
- **Modified**: `/components/Settings.tsx` - Added diagnostic tool to Test Data tab

## Testing

After running the fix:
1. Log out and log in as larry.lee@ronaatlantic.ca
2. Navigate to the Contacts module
3. ✅ All contacts should now be visible
4. Verify the count matches your expectations

## Related Issues

This fix is similar to the **Inventory Import Fix** we did earlier:
- Both issues were caused by using `user.user_metadata?.organizationId` instead of `profile.organization_id`
- Both have been corrected to use the authoritative source (profile table)
- The diagnostic tool can be adapted for other modules if needed

## Support

If the diagnostic tool doesn't find or fix Larry's contacts, please check:
1. Is Larry's profile in the database? (Check profiles table)
2. Do the contacts actually exist? (Check contacts table directly)
3. Are there RLS (Row Level Security) policies blocking access?
4. Check the browser console for any error messages

You can also use the SQL queries above to manually investigate and fix the issue.
