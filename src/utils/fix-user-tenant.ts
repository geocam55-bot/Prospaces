import { createClient } from './supabase/client';

/**
 * Complete diagnostic and fix tool for user tenant issues
 * Run in browser console: fixUserTenant('larry.lee@ronaatlantic.ca')
 */
export async function fixUserTenant(email: string) {
  console.log(`\n🔧 TENANT FIX UTILITY FOR: ${email}\n`);
  console.log('=' .repeat(60));
  
  const supabase = createClient();
  
  try {
    // Step 1: Check profile
    console.log('\n📋 Step 1: Checking profiles table...');
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
      .single();
    
    if (profileError) {
      console.error('❌ Profile not found:', profileError.message);
      console.log('\n💡 User does not exist in profiles table.');
      console.log('   This user needs to be created through the signup process.');
      return { error: 'Profile not found' };
    }
    
    console.log('✅ Profile found:');
    console.log('   ID:', profile.id);
    console.log('   Email:', profile.email);
    console.log('   Name:', profile.name);
    console.log('   Role:', profile.role);
    console.log('   Organization ID:', profile.organization_id || '❌ MISSING');
    console.log('   Status:', profile.status);
    
    // Step 2: Check organization
    if (!profile.organization_id) {
      console.log('\n❌ PROBLEM FOUND: User has no organization_id!');
      console.log('\n📋 Step 2: Fetching available organizations...');
      
      const { data: orgs, error: orgsError } = await supabase
        .from('organizations')
        .select('id, name, status')
        .eq('status', 'active')
        .order('name');
      
      if (orgsError) {
        console.error('❌ Failed to fetch organizations:', orgsError.message);
        return { error: 'Cannot fetch organizations' };
      }
      
      if (!orgs || orgs.length === 0) {
        console.log('❌ No organizations found in the system!');
        console.log('\n💡 SOLUTION: Create an organization first:');
        console.log('   1. Login as super_admin');
        console.log('   2. Go to Tenants module');
        console.log('   3. Create "Rona Atlantic" organization');
        console.log('   4. Then run: assignUserToOrg("' + email + '", "org-id")');
        return { error: 'No organizations available' };
      }
      
      console.log(`\n✅ Found ${orgs.length} active organization(s):`);
      orgs.forEach((org, i) => {
        console.log(`   ${i + 1}. ${org.name} (ID: ${org.id})`);
      });
      
      console.log('\n💡 SOLUTION OPTIONS:');
      console.log('   A. Assign to existing organization:');
      console.log('      assignUserToOrg("' + email + '", "org-id")');
      console.log('\n   B. Create new organization via Tenants module');
      console.log('      then assign user to it');
      
      return { 
        profile, 
        organizations: orgs,
        needsAssignment: true 
      };
    }
    
    console.log('\n📋 Step 2: Checking organization...');
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', profile.organization_id)
      .single();
    
    if (orgError) {
      console.error('❌ Organization not found:', orgError.message);
      console.log('\n💡 PROBLEM: User is assigned to non-existent organization!');
      console.log('   Current org ID:', profile.organization_id);
      console.log('\n💡 SOLUTION: Reassign to valid organization:');
      console.log('      assignUserToOrg("' + email + '", "valid-org-id")');
      
      // Fetch valid orgs
      const { data: validOrgs } = await supabase
        .from('organizations')
        .select('id, name, status')
        .eq('status', 'active')
        .order('name');
      
      if (validOrgs && validOrgs.length > 0) {
        console.log('\n   Available organizations:');
        validOrgs.forEach((o, i) => {
          console.log(`   ${i + 1}. ${o.name} (ID: ${o.id})`);
        });
      }
      
      return { 
        profile, 
        organizations: validOrgs,
        invalidOrgId: profile.organization_id 
      };
    }
    
    console.log('✅ Organization found:');
    console.log('   ID:', org.id);
    console.log('   Name:', org.name);
    console.log('   Status:', org.status);
    
    if (org.status !== 'active') {
      console.log('\n⚠️ WARNING: Organization is not active!');
      console.log('   This may prevent user from accessing the system.');
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ DIAGNOSIS COMPLETE - NO ISSUES FOUND!');
    console.log('=' .repeat(60));
    console.log('\nUser is properly assigned to:', org.name);
    console.log('\nIf user still cannot login, check:');
    console.log('   1. User status is "active":', profile.status);
    console.log('   2. Organization status is "active":', org.status);
    console.log('   3. Auth metadata matches (check Supabase dashboard)');
    
    return { profile, organization: org, status: 'ok' };
    
  } catch (error: any) {
    console.error('\n❌ UNEXPECTED ERROR:', error.message);
    console.log('\n💡 You may need super_admin access to run this tool.');
    return { error: error.message };
  }
}

/**
 * Assign user to an organization
 * Run in browser console: assignUserToOrg('email@example.com', 'org-id')
 */
export async function assignUserToOrg(email: string, organizationId: string) {
  console.log(`\n🔄 Assigning ${email} to organization ${organizationId}...\n`);
  
  const supabase = createClient();
  
  try {
    // Use the server-side function that bypasses RLS
    const { data, error } = await supabase.rpc('assign_user_to_organization', {
      p_user_email: email,
      p_organization_id: organizationId
    });
    
    if (error) {
      console.error('❌ Failed to assign user:', error.message);
      console.log('\n💡 Make sure you have run the SQL setup script first!');
      console.log('   See: /SQL_FIX_USER_ORGANIZATION.sql');
      return { error: error.message };
    }
    
    if (!data.success) {
      console.error('❌ Assignment failed:', data.error);
      return { error: data.error };
    }
    
    console.log('✅ User assigned successfully!');
    console.log('   Email:', data.email);
    console.log('   Organization ID:', data.organization_id);
    console.log('   User ID:', data.user_id);
    console.log('\n✅ Assignment complete!');
    console.log('   User should now be able to access the system.');
    console.log('   Ask them to logout and login again.');
    
    return data;
    
  } catch (error: any) {
    console.error('\n❌ UNEXPECTED ERROR:', error.message);
    console.log('\n💡 FALLBACK: Run this SQL in Supabase SQL Editor:\n');
    console.log(`-- Update profiles table`);
    console.log(`UPDATE public.profiles`);
    console.log(`SET organization_id = '${organizationId}', status = 'active'`);
    console.log(`WHERE email = '${email}';\n`);
    console.log(`-- Update auth metadata`);
    console.log(`UPDATE auth.users`);
    console.log(`SET raw_user_meta_data = jsonb_set(`);
    console.log(`  COALESCE(raw_user_meta_data, '{}'::jsonb),`);
    console.log(`  '{organizationId}', '"${organizationId}"'::jsonb`);
    console.log(`)`);
    console.log(`WHERE email = '${email}';`);
    
    return { error: error.message };
  }
}

/**
 * Create organization and assign user
 * Run in browser console: createOrgAndAssignUser('Rona Atlantic', 'larry.lee@ronaatlantic.ca')
 */
export async function createOrgAndAssignUser(orgName: string, email: string) {
  console.log(`\n🏢 Creating organization "${orgName}" and assigning ${email}...\n`);
  
  const supabase = createClient();
  
  try {
    // Use the server-side function that bypasses RLS and creates org
    const { data, error } = await supabase.rpc('create_org_and_assign_user', {
      p_org_name: orgName,
      p_user_email: email
    });
    
    if (error) {
      console.error('❌ Failed:', error.message);
      console.log('\n💡 Make sure you have run the SQL setup script first!');
      console.log('   See: /SQL_FIX_USER_ORGANIZATION.sql');
      
      // Fallback to manual method
      console.log('\n💡 Trying fallback method...');
      const orgId = orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert([{
          id: orgId,
          name: orgName,
          status: 'active',
        }])
        .select()
        .single();
      
      if (orgError && !orgError.message.includes('duplicate')) {
        console.error('❌ Failed to create organization:', orgError.message);
        return { error: orgError.message };
      }
      
      if (orgError && orgError.message.includes('duplicate')) {
        console.log('✅ Organization already exists. Assigning user...');
      } else {
        console.log('✅ Organization created:', org.name);
      }
      
      return await assignUserToOrg(email, orgId);
    }
    
    if (!data.success) {
      console.error('❌ Failed:', data.error);
      return { error: data.error };
    }
    
    if (data.organization_created) {
      console.log('✅ Organization created:', data.organization_name);
      console.log('   ID:', data.organization_id);
    } else {
      console.log('✅ Organization already exists:', data.organization_id);
    }
    
    console.log('✅ User assigned successfully!');
    console.log('   Email:', data.email);
    console.log('   User ID:', data.user_id);
    console.log('\n✅ All done!');
    console.log('   User should now be able to access the system.');
    console.log('   Ask them to logout and login again.');
    
    return data;
    
  } catch (error: any) {
    console.error('\n❌ UNEXPECTED ERROR:', error.message);
    return { error: error.message };
  }
}

// Auto-load into window
if (typeof window !== 'undefined') {
  (window as any).fixUserTenant = fixUserTenant;
  (window as any).assignUserToOrg = assignUserToOrg;
  (window as any).createOrgAndAssignUser = createOrgAndAssignUser;
  
  console.log('🔧 Tenant Fix Tools Loaded!');
  console.log('   • fixUserTenant("email@example.com") - Diagnose issues');
  console.log('   • assignUserToOrg("email@example.com", "org-id") - Assign to org');
  console.log('   • createOrgAndAssignUser("Org Name", "email@example.com") - Create & assign');
}