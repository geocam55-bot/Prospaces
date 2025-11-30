import { createClient } from './supabase/client';
import { getAccessToken } from './api';

/**
 * Comprehensive diagnostic tool for SUPER_ADMIN user visibility issues
 * 
 * Run this in browser console:
 * diagnoseSuperAdmin()
 */
export async function diagnoseSuperAdmin() {
  console.log('🔍 Starting SUPER_ADMIN Diagnostics...\n');
  
  const supabase = createClient();
  const results: any = {
    checks: [],
    errors: [],
    recommendations: [],
  };

  // ========================================
  // CHECK 1: Current User Authentication
  // ========================================
  console.log('📋 CHECK 1: Authentication Status');
  try {
    const token = getAccessToken();
    if (!token) {
      console.error('❌ No access token found');
      results.checks.push({ name: 'Authentication', status: 'FAIL', message: 'Not logged in' });
      results.recommendations.push('Please log in first');
      return results;
    }

    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      console.error('❌ Could not get user:', error);
      results.checks.push({ name: 'Authentication', status: 'FAIL', message: error?.message });
      return results;
    }

    const userRole = user.user_metadata?.role || 'unknown';
    const userOrgId = user.user_metadata?.organizationId || 'unknown';
    
    console.log('✅ Authenticated as:', user.email);
    console.log('   Role:', userRole);
    console.log('   Organization ID:', userOrgId);
    console.log('   User ID:', user.id);
    
    results.checks.push({
      name: 'Authentication',
      status: 'PASS',
      data: {
        email: user.email,
        role: userRole,
        organizationId: userOrgId,
        userId: user.id,
      }
    });

    const isSuperAdmin = userRole === 'super_admin';
    const isAdmin = userRole === 'admin';

    if (!isSuperAdmin && !isAdmin) {
      console.error('❌ You are not an admin. Role:', userRole);
      results.recommendations.push('You need to be a super_admin or admin to manage users');
      return results;
    }

    if (isSuperAdmin) {
      console.log('🌟 SUPER_ADMIN detected! You SHOULD see all users from all organizations.\n');
    } else {
      console.log('👔 ADMIN detected. You should only see users from your organization.\n');
    }

    // ========================================
    // CHECK 2: Profiles Table Exists
    // ========================================
    console.log('📋 CHECK 2: Profiles Table');
    let profilesExist = false;
    try {
      const { data: profiles, error: profilesError, count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: false })
        .limit(1);

      if (profilesError) {
        console.error('❌ Profiles table error:', profilesError.message);
        results.checks.push({
          name: 'Profiles Table',
          status: 'FAIL',
          message: profilesError.message
        });
        results.recommendations.push('Run the migration: /supabase/migrations/001_create_profiles_table.sql');
      } else {
        profilesExist = true;
        console.log('✅ Profiles table exists');
        results.checks.push({
          name: 'Profiles Table',
          status: 'PASS',
          message: 'Table exists and is accessible'
        });
      }
    } catch (error: any) {
      console.error('❌ Could not query profiles table:', error.message);
      results.checks.push({
        name: 'Profiles Table',
        status: 'FAIL',
        message: error.message
      });
      results.recommendations.push('Run the migration: /supabase/migrations/001_create_profiles_table.sql');
    }

    // ========================================
    // CHECK 3: Query All Profiles (Super Admin Test)
    // ========================================
    console.log('\n📋 CHECK 3: Profile Query Test');
    if (profilesExist) {
      try {
        const { data: allProfiles, error: queryError } = await supabase
          .from('profiles')
          .select('id, email, name, role, organization_id, status');

        if (queryError) {
          console.error('❌ Could not query profiles:', queryError.message);
          console.error('   This might be an RLS policy issue');
          results.checks.push({
            name: 'Profile Query',
            status: 'FAIL',
            message: queryError.message
          });
          
          if (isSuperAdmin) {
            results.recommendations.push('RLS policies might be blocking super_admin. Check the policies in Supabase Dashboard → Database → Tables → profiles → Policies');
          }
        } else {
          console.log('✅ Query successful!');
          console.log(`   Found ${allProfiles?.length || 0} profiles`);
          
          results.checks.push({
            name: 'Profile Query',
            status: 'PASS',
            message: `Found ${allProfiles?.length || 0} profiles`
          });

          // Group by organization
          const byOrg: any = {};
          (allProfiles || []).forEach((p: any) => {
            const orgId = p.organization_id || 'no-org';
            if (!byOrg[orgId]) {
              byOrg[orgId] = [];
            }
            byOrg[orgId].push(p);
          });

          console.log('\n   📊 Breakdown by Organization:');
          Object.entries(byOrg).forEach(([orgId, profiles]: [string, any]) => {
            console.log(`   • ${orgId}: ${profiles.length} user(s)`);
            profiles.forEach((p: any) => {
              console.log(`     - ${p.email} (${p.role}) [${p.status}]`);
            });
          });

          // Check if current user's org has multiple orgs
          const orgCount = Object.keys(byOrg).length;
          if (isSuperAdmin && orgCount === 1) {
            console.log('\n   ⚠️ WARNING: Only 1 organization found. Super Admin should see multiple organizations if they exist.');
            results.recommendations.push('If you expect to see multiple organizations, check that other organizations have users in the profiles table');
          }

          if (isSuperAdmin && orgCount > 1) {
            console.log(`\n   ✅ Great! You can see ${orgCount} organizations as a Super Admin`);
          }

          if (isAdmin && orgCount > 1) {
            console.log(`\n   ❌ ERROR: Admin should only see 1 organization, but seeing ${orgCount}`);
            console.log('      This is an RLS policy issue. Admin RLS policy is not filtering correctly.');
            results.errors.push('Admin is seeing multiple organizations - RLS policy error');
            results.recommendations.push('Fix the Admin RLS policy to filter by organization_id');
          }
        }
      } catch (error: any) {
        console.error('❌ Query failed:', error.message);
        results.checks.push({
          name: 'Profile Query',
          status: 'FAIL',
          message: error.message
        });
      }
    }

    // ========================================
    // CHECK 4: Auth Users vs Profiles Sync
    // ========================================
    console.log('\n📋 CHECK 4: Auth Users Sync Check');
    // Note: We can't directly query auth.users from the client, but we can check our own user
    console.log('   ℹ️ This check needs to be done in Supabase SQL Editor');
    console.log('   Run this query:');
    console.log(`
      SELECT 
        au.email,
        au.raw_user_meta_data->>'role' as auth_role,
        p.role as profile_role,
        CASE WHEN p.id IS NULL THEN '❌ Missing' ELSE '✅ Synced' END as status
      FROM auth.users au
      LEFT JOIN profiles p ON au.id = p.id;
    `);
    results.recommendations.push('Manually check auth.users vs profiles sync using the SQL query above');

    // ========================================
    // CHECK 5: RLS Policies
    // ========================================
    console.log('\n📋 CHECK 5: RLS Policies Check');
    console.log('   ℹ️ Check RLS policies in Supabase Dashboard:');
    console.log('   1. Go to Dashboard → Database → Tables → profiles');
    console.log('   2. Click "Policies" tab');
    console.log('   3. You should see these policies:');
    console.log('      - "Super admins can view all profiles" (SELECT)');
    console.log('      - "Admins can view org profiles" (SELECT)');
    console.log('      - "Super admins can update all profiles" (UPDATE)');
    console.log('      - "Admins can update org profiles" (UPDATE)');
    console.log('      - etc.');
    
    results.recommendations.push('Verify RLS policies exist for super_admin and admin in Supabase Dashboard');

    // ========================================
    // CHECK 6: LocalStorage Fallback
    // ========================================
    console.log('\n📋 CHECK 6: LocalStorage Cache');
    const registryData = localStorage.getItem('users_registry');
    if (registryData) {
      try {
        const registry = JSON.parse(registryData);
        console.log(`✅ Found ${registry.length} users in localStorage registry`);
        
        // Group by org
        const byOrg: any = {};
        registry.forEach((u: any) => {
          const orgId = u.organization_id || 'no-org';
          if (!byOrg[orgId]) byOrg[orgId] = 0;
          byOrg[orgId]++;
        });
        
        console.log('   Organizations in cache:');
        Object.entries(byOrg).forEach(([org, count]) => {
          console.log(`   • ${org}: ${count} users`);
        });

        results.checks.push({
          name: 'LocalStorage Cache',
          status: 'PASS',
          message: `${registry.length} users in cache`
        });
      } catch (e) {
        console.error('❌ Could not parse localStorage registry');
      }
    } else {
      console.log('⚠️ No users_registry in localStorage');
      console.log('   This is expected if profiles table is working correctly');
      results.checks.push({
        name: 'LocalStorage Cache',
        status: 'INFO',
        message: 'No cache found (expected if using Supabase)'
      });
    }

    // ========================================
    // SUMMARY
    // ========================================
    console.log('\n' + '='.repeat(60));
    console.log('📊 DIAGNOSTIC SUMMARY');
    console.log('='.repeat(60));
    
    const passed = results.checks.filter((c: any) => c.status === 'PASS').length;
    const failed = results.checks.filter((c: any) => c.status === 'FAIL').length;
    
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    
    if (results.errors.length > 0) {
      console.log('\n🚨 ERRORS:');
      results.errors.forEach((e: string) => console.log(`   • ${e}`));
    }
    
    if (results.recommendations.length > 0) {
      console.log('\n💡 RECOMMENDATIONS:');
      results.recommendations.forEach((r: string, i: number) => {
        console.log(`   ${i + 1}. ${r}`);
      });
    }

    console.log('\n' + '='.repeat(60));
    
    if (failed === 0 && isSuperAdmin) {
      console.log('🎉 Everything looks good! You should be able to see all users.');
      console.log('   If you still can\'t see all users in the UI:');
      console.log('   1. Hard refresh the page (Ctrl+Shift+R or Cmd+Shift+R)');
      console.log('   2. Check the Network tab for the /users API call');
      console.log('   3. Check browser console for errors');
    }

    return results;

  } catch (error: any) {
    console.error('❌ Diagnostic failed:', error);
    return { error: error.message, results };
  }
}

// Auto-load into window
if (typeof window !== 'undefined') {
  (window as any).diagnoseSuperAdmin = diagnoseSuperAdmin;
  console.log('🔧 Diagnostic tool loaded! Run: diagnoseSuperAdmin()');
}
