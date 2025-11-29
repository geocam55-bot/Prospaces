import { createClient } from './supabase/client';

const supabase = createClient();

/**
 * Diagnostic tool to find users with invalid timestamp-based organization IDs
 * Run in browser console: diagnoseInvalidOrgs()
 */
export async function diagnoseInvalidOrgs() {
  console.log('\n🔍 DIAGNOSING INVALID ORGANIZATION IDs\n');
  console.log('='.repeat(70));
  
  try {
    // Step 1: Check for timestamp-based organization IDs in profiles
    console.log('\n📋 Step 1: Checking profiles table...');
    
    const { data: allProfiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, name, organization_id, role, status, created_at');
    
    if (profilesError) {
      console.error('❌ Error fetching profiles:', profilesError.message);
      return { error: profilesError.message };
    }
    
    // Filter for timestamp-based org IDs (org-1234567890123)
    const timestampPattern = /^org-\d{13,}$/;
    const invalidProfiles = allProfiles?.filter(p => 
      p.organization_id && timestampPattern.test(p.organization_id)
    ) || [];
    
    if (invalidProfiles.length > 0) {
      console.log(`\n❌ FOUND ${invalidProfiles.length} USER(S) WITH INVALID ORGANIZATION IDs:\n`);
      invalidProfiles.forEach((profile, i) => {
        console.log(`${i + 1}. ${profile.email}`);
        console.log(`   Invalid Org ID: ${profile.organization_id}`);
        console.log(`   User ID: ${profile.id}`);
        console.log(`   Role: ${profile.role}`);
        console.log(`   Status: ${profile.status}`);
        console.log(`   Created: ${new Date(profile.created_at).toLocaleString()}\n`);
      });
    } else {
      console.log('✅ No users with invalid organization IDs found in profiles');
    }
    
    // Step 2: Check for invalid organizations in organizations table
    console.log('\n📋 Step 2: Checking organizations table...');
    
    const { data: allOrgs, error: orgsError } = await supabase
      .from('organizations')
      .select('id, name, status, created_at');
    
    if (orgsError) {
      console.error('❌ Error fetching organizations:', orgsError.message);
    } else {
      const invalidOrgs = allOrgs?.filter(o => timestampPattern.test(o.id)) || [];
      
      if (invalidOrgs.length > 0) {
        console.log(`\n❌ FOUND ${invalidOrgs.length} INVALID ORGANIZATION(S):\n`);
        invalidOrgs.forEach((org, i) => {
          console.log(`${i + 1}. ${org.name || 'Unnamed'}`);
          console.log(`   Invalid ID: ${org.id}`);
          console.log(`   Status: ${org.status}`);
          console.log(`   Created: ${new Date(org.created_at).toLocaleString()}\n`);
        });
      } else {
        console.log('✅ No invalid organizations found in organizations table');
      }
    }
    
    // Step 3: Show valid organizations
    console.log('\n📋 Step 3: Listing valid organizations...\n');
    
    const validOrgs = allOrgs?.filter(o => !timestampPattern.test(o.id) && o.status === 'active') || [];
    
    if (validOrgs.length > 0) {
      console.log(`✅ Found ${validOrgs.length} valid organization(s):\n`);
      validOrgs.forEach((org, i) => {
        console.log(`${i + 1}. ${org.name}`);
        console.log(`   ID: ${org.id}`);
        console.log(`   Status: ${org.status}\n`);
      });
    } else {
      console.log('⚠️ No valid organizations found!');
      console.log('\n💡 You may need to create a default organization first:');
      console.log('   Go to Tenants module → Create Organization');
    }
    
    // Step 4: Provide fix instructions
    if (invalidProfiles.length > 0 || (allOrgs && allOrgs.filter(o => timestampPattern.test(o.id)).length > 0)) {
      console.log('\n' + '='.repeat(70));
      console.log('⚠️ ISSUES FOUND - FOLLOW THESE STEPS TO FIX:');
      console.log('='.repeat(70));
      
      if (validOrgs.length > 0) {
        const targetOrg = validOrgs[0];
        console.log('\n📋 QUICK FIX SQL (Run in Supabase SQL Editor):\n');
        console.log('-- Fix all affected users');
        console.log(`UPDATE public.profiles`);
        console.log(`SET organization_id = '${targetOrg.id}', updated_at = NOW()`);
        console.log(`WHERE organization_id ~ '^org-\\d{13,}$';\n`);
        console.log(`UPDATE auth.users`);
        console.log(`SET raw_user_meta_data = jsonb_set(`);
        console.log(`  COALESCE(raw_user_meta_data, '{}'::jsonb),`);
        console.log(`  '{organizationId}', '"${targetOrg.id}"'::jsonb`);
        console.log(`) WHERE id IN (`);
        console.log(`  SELECT id FROM public.profiles WHERE organization_id = '${targetOrg.id}'`);
        console.log(`);\n`);
        console.log(`-- Delete invalid organizations`);
        console.log(`DELETE FROM public.organizations WHERE id ~ '^org-\\d{13,}$';`);
      } else {
        console.log('\n⚠️ NO VALID ORGANIZATIONS FOUND!');
        console.log('\n📋 Create a default organization first:\n');
        console.log(`INSERT INTO public.organizations (id, name, status, created_at, updated_at)`);
        console.log(`VALUES ('default-organization', 'Default Organization', 'active', NOW(), NOW());`);
        console.log('\nThen run the fix SQL from above.');
      }
      
      console.log('\n📚 For detailed instructions, see:');
      console.log('   /QUICK_FIX_INVALID_ORGS.md');
      console.log('   /SQL_CLEANUP_INVALID_ORGS.sql');
    } else {
      console.log('\n' + '='.repeat(70));
      console.log('✅ ALL CLEAR - NO ISSUES FOUND!');
      console.log('='.repeat(70));
      console.log('\nAll users have valid organization IDs.');
      console.log('All organizations use proper slug format.');
    }
    
    return {
      invalidProfiles,
      invalidOrgs: allOrgs?.filter(o => timestampPattern.test(o.id)) || [],
      validOrgs,
      summary: {
        totalProfiles: allProfiles?.length || 0,
        invalidProfiles: invalidProfiles.length,
        totalOrgs: allOrgs?.length || 0,
        invalidOrgs: allOrgs?.filter(o => timestampPattern.test(o.id)).length || 0,
        validOrgs: validOrgs.length,
      }
    };
    
  } catch (error: any) {
    console.error('\n❌ ERROR:', error.message);
    return { error: error.message };
  }
}

/**
 * Quick check if current user has invalid organization
 */
export async function checkMyOrg() {
  console.log('\n🔍 Checking your organization...\n');
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.log('❌ Not logged in');
      return null;
    }
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, email, organization_id')
      .eq('id', user.id)
      .single();
    
    if (!profile) {
      console.log('❌ Profile not found');
      return null;
    }
    
    console.log('📧 Email:', profile.email);
    console.log('🏢 Organization ID:', profile.organization_id);
    
    const timestampPattern = /^org-\d{13,}$/;
    if (profile.organization_id && timestampPattern.test(profile.organization_id)) {
      console.log('\n❌ YOUR ORGANIZATION ID IS INVALID!');
      console.log('   This is a timestamp-based ID that doesn\'t exist.');
      console.log('\n💡 Run: diagnoseInvalidOrgs() for fix instructions');
      return { valid: false, organizationId: profile.organization_id };
    } else {
      console.log('✅ Your organization ID is valid');
      
      // Check if org exists
      const { data: org } = await supabase
        .from('organizations')
        .select('name, status')
        .eq('id', profile.organization_id)
        .single();
      
      if (org) {
        console.log('🏢 Organization Name:', org.name);
        console.log('📊 Status:', org.status);
        return { valid: true, organizationId: profile.organization_id, organization: org };
      } else {
        console.log('⚠️ Organization exists in profile but not in organizations table');
        return { valid: false, organizationId: profile.organization_id, missing: true };
      }
    }
    
  } catch (error: any) {
    console.error('❌ ERROR:', error.message);
    return { error: error.message };
  }
}

// Auto-load into window
if (typeof window !== 'undefined') {
  (window as any).diagnoseInvalidOrgs = diagnoseInvalidOrgs;
  (window as any).checkMyOrg = checkMyOrg;
  
  console.log('🔧 Invalid Org Diagnostic Tools Loaded!');
  console.log('   • diagnoseInvalidOrgs() - Find all invalid organization IDs');
  console.log('   • checkMyOrg() - Check your own organization');
}
