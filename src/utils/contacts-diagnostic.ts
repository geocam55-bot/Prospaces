import { createClient } from './supabase/client';

const supabase = createClient();

/**
 * Diagnostic function to check what's actually in the contacts table
 * This bypasses normal filtering to show RLS issues
 */
export async function diagnoseContactsRLS() {
  console.log('🔍 === STARTING RLS DIAGNOSTIC ===');
  
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return {
        error: 'No authenticated user found',
        user: null,
        contacts: null
      };
    }
    
    console.log('👤 Current User Info:');
    console.log('  - Email:', user.email);
    console.log('  - User ID:', user.id);
    console.log('  - Organization ID:', user.user_metadata?.organizationId);
    console.log('  - Role:', user.user_metadata?.role);
    
    // Try to query contacts table without any filters
    const { data: allContacts, error: contactsError, count } = await supabase
      .from('contacts')
      .select('*', { count: 'exact' })
      .limit(100); // Limit to prevent overwhelming
    
    console.log('📊 Database Query Results:');
    console.log('  - Error:', contactsError);
    console.log('  - Rows returned:', allContacts?.length || 0);
    console.log('  - Total count (with RLS):', count);
    
    if (allContacts && allContacts.length > 0) {
      // Group by organization_id
      const orgGroups = allContacts.reduce((acc: any, contact: any) => {
        const orgId = contact.organization_id || 'NULL';
        if (!acc[orgId]) acc[orgId] = [];
        acc[orgId].push(contact);
        return acc;
      }, {});
      
      console.log('📊 Contacts Grouped by Organization ID:');
      Object.keys(orgGroups).forEach(orgId => {
        console.log(`  - ${orgId}: ${orgGroups[orgId].length} contacts`);
        console.log(`    Sample:`, orgGroups[orgId].slice(0, 2).map((c: any) => ({
          name: c.name,
          company: c.company,
          account_owner_number: c.account_owner_number
        })));
      });
      
      // Show account owner distribution
      const accountOwners = allContacts.reduce((acc: any, contact: any) => {
        const owner = contact.account_owner_number || 'NULL';
        acc[owner] = (acc[owner] || 0) + 1;
        return acc;
      }, {});
      
      console.log('📊 Contacts Grouped by Account Owner:');
      Object.keys(accountOwners).forEach(owner => {
        console.log(`  - ${owner}: ${accountOwners[owner]} contacts`);
      });
    } else {
      console.log('⚠️ NO CONTACTS RETURNED!');
      if (contactsError) {
        console.log('❌ Database Error:', contactsError);
      } else {
        console.log('⚠️ This means RLS is blocking access or the table is empty');
        console.log('');
        console.log('🔍 NEXT STEPS TO DIAGNOSE:');
        console.log('1. Open Supabase Dashboard: https://usorqldwroecyxucmtuw.supabase.co');
        console.log('2. Go to Table Editor > contacts table');
        console.log('3. Check if there are any rows in the table');
        console.log('4. If there are rows, check the "organization_id" column');
        console.log('5. The organization_id should be: ' + user.user_metadata?.organizationId);
        console.log('');
        console.log('📋 SQL TO RUN IN SUPABASE SQL EDITOR:');
        console.log('-- Check all contacts and their organization_ids');
        console.log('SELECT id, name, company, organization_id, account_owner_number FROM contacts LIMIT 10;');
        console.log('');
        console.log('-- Count contacts by organization_id');
        console.log('SELECT organization_id, COUNT(*) FROM contacts GROUP BY organization_id;');
        console.log('');
        console.log('-- Fix organization_id (ONLY if contacts exist with wrong org)');
        console.log(`UPDATE contacts SET organization_id = '${user.user_metadata?.organizationId}' WHERE organization_id IS NULL OR organization_id != '${user.user_metadata?.organizationId}';`);
      }
    }
    
    // Try to check RLS policies (this will only work if we have service role access)
    console.log('\n🔒 Checking RLS Policies...');
    const { data: policies, error: policiesError } = await supabase
      .rpc('get_policies', { table_name: 'contacts' })
      .single();
    
    if (policiesError) {
      console.log('⚠️ Cannot retrieve policies (need service role):', policiesError.message);
    } else {
      console.log('RLS Policies:', policies);
    }
    
    console.log('\n🔍 === DIAGNOSTIC COMPLETE ===\n');
    
    return {
      user: {
        email: user.email,
        id: user.id,
        organizationId: user.user_metadata?.organizationId,
        role: user.user_metadata?.role
      },
      contacts: allContacts,
      totalCount: count,
      error: contactsError
    };
    
  } catch (error: any) {
    console.error('❌ Diagnostic failed:', error);
    return {
      error: error.message,
      user: null,
      contacts: null
    };
  }
}