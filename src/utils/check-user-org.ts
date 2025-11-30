import { createClient } from './supabase/client';

/**
 * Check what organization a specific user is attached to
 * 
 * Run in browser console:
 * checkUserOrg('larry.lee@ronaatlantic.ca')
 */
export async function checkUserOrg(email: string) {
  console.log(`🔍 Checking organization for: ${email}\n`);
  
  const supabase = createClient();
  
  try {
    // Check profiles table
    console.log('📋 Checking profiles table...');
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
      .single();
    
    if (profileError) {
      console.error('❌ Profile not found:', profileError.message);
      console.log('\n💡 This user may not exist in profiles table yet.');
      console.log('   Checking auth.users instead...\n');
    } else if (profile) {
      console.log('✅ Found in profiles table:');
      console.log('   Email:', profile.email);
      console.log('   Name:', profile.name);
      console.log('   Role:', profile.role);
      console.log('   Organization ID:', profile.organization_id);
      console.log('   Status:', profile.status);
      console.log('   Created:', profile.created_at);
      console.log('   Last Login:', profile.last_login);
      
      // Get organization details
      if (profile.organization_id) {
        console.log('\n📋 Fetching organization details...');
        const { data: tenant, error: tenantError } = await supabase
          .from('tenants')
          .select('*')
          .eq('id', profile.organization_id)
          .single();
        
        if (tenantError) {
          console.error('⚠️ Organization not found:', tenantError.message);
        } else if (tenant) {
          console.log('✅ Organization Details:');
          console.log('   ID:', tenant.id);
          console.log('   Name:', tenant.name);
          console.log('   Status:', tenant.status);
          console.log('   Created:', tenant.created_at);
        }
      }
      
      return profile;
    }
    
    // If not in profiles, check auth metadata
    console.log('📋 Checking auth.users metadata (via SQL)...');
    console.log('⚠️ Note: Client cannot directly query auth.users');
    console.log('\n🔧 Run this in Supabase SQL Editor:');
    console.log(`
SELECT 
  id,
  email,
  raw_user_meta_data->>'name' as name,
  raw_user_meta_data->>'role' as role,
  raw_user_meta_data->>'organizationId' as organization_id,
  created_at,
  last_sign_in_at
FROM auth.users
WHERE email = '${email}';
    `);
    
    console.log('\n💡 If user exists in auth.users but not profiles:');
    console.log('   Run this to sync:');
    console.log(`
INSERT INTO public.profiles (id, email, name, role, organization_id, status, created_at)
SELECT 
  id,
  email,
  COALESCE(raw_user_meta_data->>'name', email) as name,
  COALESCE(raw_user_meta_data->>'role', 'standard_user') as role,
  COALESCE(raw_user_meta_data->>'organizationId', 'default-org') as organization_id,
  'active' as status,
  created_at
FROM auth.users
WHERE email = '${email}'
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  organization_id = EXCLUDED.organization_id;
    `);
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.log('\n💡 Make sure you have access to query these tables.');
  }
}

/**
 * List all users and their organizations
 */
export async function listAllUsersWithOrgs() {
  console.log('🔍 Fetching all users and their organizations...\n');
  
  const supabase = createClient();
  
  try {
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('email, name, role, organization_id, status')
      .order('organization_id', { ascending: true })
      .order('email', { ascending: true });
    
    if (error) {
      console.error('❌ Error:', error.message);
      return;
    }
    
    if (!profiles || profiles.length === 0) {
      console.log('⚠️ No users found in profiles table');
      return;
    }
    
    // Group by organization
    const byOrg: any = {};
    profiles.forEach((p: any) => {
      const orgId = p.organization_id || 'no-org';
      if (!byOrg[orgId]) {
        byOrg[orgId] = [];
      }
      byOrg[orgId].push(p);
    });
    
    console.log(`✅ Found ${profiles.length} users in ${Object.keys(byOrg).length} organizations:\n`);
    
    for (const [orgId, users] of Object.entries(byOrg)) {
      console.log(`📁 Organization: ${orgId}`);
      console.log(`   Users (${(users as any).length}):`);
      (users as any).forEach((u: any) => {
        console.log(`   • ${u.email}`);
        console.log(`     - Name: ${u.name}`);
        console.log(`     - Role: ${u.role}`);
        console.log(`     - Status: ${u.status}`);
      });
      console.log('');
    }
    
    return byOrg;
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

/**
 * Change a user's organization
 */
export async function changeUserOrg(email: string, newOrgId: string) {
  console.log(`🔄 Changing organization for ${email} to ${newOrgId}...\n`);
  
  const supabase = createClient();
  
  try {
    // Update profiles table
    const { data, error } = await supabase
      .from('profiles')
      .update({ organization_id: newOrgId })
      .eq('email', email)
      .select()
      .single();
    
    if (error) {
      console.error('❌ Error:', error.message);
      return;
    }
    
    console.log('✅ Successfully updated organization!');
    console.log('   Email:', data.email);
    console.log('   New Organization:', data.organization_id);
    
    console.log('\n⚠️ IMPORTANT: Also update auth.users metadata:');
    console.log('   Run this in Supabase SQL Editor:');
    console.log(`
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  raw_user_meta_data,
  '{organizationId}',
  '"${newOrgId}"'::jsonb
)
WHERE email = '${email}';
    `);
    
    return data;
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

// Auto-load into window
if (typeof window !== 'undefined') {
  (window as any).checkUserOrg = checkUserOrg;
  (window as any).listAllUsersWithOrgs = listAllUsersWithOrgs;
  (window as any).changeUserOrg = changeUserOrg;
  console.log('🔧 User org tools loaded!');
  console.log('   • checkUserOrg("email@example.com")');
  console.log('   • listAllUsersWithOrgs()');
  console.log('   • changeUserOrg("email@example.com", "new-org-id")');
}
