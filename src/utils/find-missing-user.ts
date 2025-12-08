/**
 * Find Missing User Utility
 * Helps diagnose and recover missing users like matt.brennan@ronaatlantic.ca
 */

import { createClient } from './supabase/client';

export interface UserDiagnostic {
  found: boolean;
  inAuth: boolean;
  inProfiles: boolean;
  hasOrganization: boolean;
  isActive: boolean;
  details?: any;
  issues: string[];
  fixes: string[];
}

/**
 * Comprehensive diagnostic for a missing user
 */
export async function findMissingUser(email: string): Promise<UserDiagnostic> {
  const supabase = createClient();
  const diagnostic: UserDiagnostic = {
    found: false,
    inAuth: false,
    inProfiles: false,
    hasOrganization: false,
    isActive: false,
    issues: [],
    fixes: []
  };

  try {
    console.log(`\n🔍 Searching for user: ${email}\n`);

    // Check 1: Search in auth.users via profiles (we can't directly query auth.users)
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (profiles) {
      diagnostic.found = true;
      diagnostic.inProfiles = true;
      diagnostic.hasOrganization = !!profiles.organization_id;
      diagnostic.isActive = profiles.status === 'active';
      diagnostic.details = profiles;

      console.log('✅ Found in profiles table');
      console.log('   User ID:', profiles.id);
      console.log('   Organization:', profiles.organization_id || '❌ NONE');
      console.log('   Status:', profiles.status);
      console.log('   Role:', profiles.role);

      // Check for issues
      if (!profiles.organization_id) {
        diagnostic.issues.push('User has no organization assigned');
        diagnostic.fixes.push(`Run: assignUserToOrganization('${email}', 'rona-atlantic')`);
      }

      if (profiles.status !== 'active') {
        diagnostic.issues.push(`User status is '${profiles.status}' instead of 'active'`);
        diagnostic.fixes.push('Update profile status to active');
      }

      // Try to get auth user info through RPC or session
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        diagnostic.inAuth = true;
        console.log('✅ Current session user:', authUser.email);
      }

    } else {
      console.log('❌ Not found in profiles table');
      diagnostic.issues.push('User not found in profiles table');
      
      // Check if maybe they're in auth but not profiles
      diagnostic.fixes.push('User may exist in auth.users but not in profiles');
      diagnostic.fixes.push(`Run SQL: SELECT * FROM auth.users WHERE email = '${email}'`);
      diagnostic.fixes.push(`Or run: createOrgAndAssignUser('Rona Atlantic', '${email}')`);
    }

    // Check 2: Verify organization exists
    const orgId = 'rona-atlantic';
    const { data: org, error: orgError } = await supabase
      .from('tenants')
      .select('id, name, status')
      .eq('id', orgId)
      .maybeSingle();

    if (org) {
      console.log(`✅ Organization '${org.name}' exists (${org.status})`);
      if (org.status !== 'active') {
        diagnostic.issues.push(`Organization '${orgId}' is not active`);
        diagnostic.fixes.push(`Activate organization: UPDATE tenants SET status = 'active' WHERE id = '${orgId}'`);
      }
    } else {
      console.log(`❌ Organization '${orgId}' not found`);
      diagnostic.issues.push(`Organization '${orgId}' does not exist`);
      diagnostic.fixes.push(`Create organization: INSERT INTO tenants (id, name, status) VALUES ('${orgId}', 'Rona Atlantic', 'active')`);
    }

    // Check 3: List all users in the organization to see who's there
    const { data: orgUsers, error: usersError } = await supabase
      .from('profiles')
      .select('email, role, status')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });

    if (orgUsers && orgUsers.length > 0) {
      console.log(`\n👥 Users in '${orgId}' organization:`);
      orgUsers.forEach(u => {
        console.log(`   - ${u.email} (${u.role}, ${u.status})`);
      });
    } else {
      console.log(`\n⚠️  No users found in '${orgId}' organization`);
    }

  } catch (error: any) {
    console.error('❌ Error during diagnostic:', error.message);
    diagnostic.issues.push(`Error: ${error.message}`);
  }

  // Summary
  console.log('\n📊 DIAGNOSTIC SUMMARY');
  console.log('═══════════════════════════════════');
  console.log('Found:', diagnostic.found ? '✅' : '❌');
  console.log('In Profiles:', diagnostic.inProfiles ? '✅' : '❌');
  console.log('Has Organization:', diagnostic.hasOrganization ? '✅' : '❌');
  console.log('Is Active:', diagnostic.isActive ? '✅' : '❌');
  
  if (diagnostic.issues.length > 0) {
    console.log('\n⚠️  ISSUES FOUND:');
    diagnostic.issues.forEach((issue, i) => console.log(`${i + 1}. ${issue}`));
  }

  if (diagnostic.fixes.length > 0) {
    console.log('\n🔧 SUGGESTED FIXES:');
    diagnostic.fixes.forEach((fix, i) => console.log(`${i + 1}. ${fix}`));
  }

  return diagnostic;
}

/**
 * Quick recovery function using the server-side RPC
 */
export async function recoverMissingUser(email: string, orgId: string = 'rona-atlantic'): Promise<boolean> {
  const supabase = createClient();
  
  console.log(`\n🔧 Attempting to recover user: ${email}`);
  console.log(`   Organization: ${orgId}\n`);

  try {
    // First check if user exists in profiles
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (profile?.id) {
      // User exists, just assign to organization
      console.log('✅ User found, assigning to organization...');
      
      const { data, error } = await supabase.rpc('assign_user_to_organization', {
        p_user_email: email,
        p_organization_id: orgId
      });

      if (error) {
        console.error('❌ Failed to assign user:', error.message);
        console.log('\n💡 Trying direct update as fallback...');
        
        // Fallback: Direct update
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            organization_id: orgId,
            status: 'active',
            updated_at: new Date().toISOString()
          })
          .eq('id', profile.id);

        if (updateError) {
          console.error('❌ Fallback also failed:', updateError.message);
          return false;
        }
        
        console.log('✅ User recovered using fallback method!');
        return true;
      }

      console.log('✅ User recovered successfully!');
      console.log('Result:', data);
      return true;

    } else {
      // User doesn't exist in profiles, might need full recreation
      console.log('⚠️  User not found in profiles table');
      console.log('💡 You may need to run the SQL script: /FIND_MATT_BRENNAN.sql');
      console.log('   Or contact the user to sign up again');
      return false;
    }

  } catch (error: any) {
    console.error('❌ Error during recovery:', error.message);
    return false;
  }
}

/**
 * Search for users by partial email or name
 */
export async function searchUsers(searchTerm: string): Promise<void> {
  const supabase = createClient();
  
  console.log(`\n🔍 Searching for users matching: "${searchTerm}"\n`);

  try {
    const { data: users, error } = await supabase
      .from('profiles')
      .select('email, organization_id, role, status, created_at')
      .or(`email.ilike.%${searchTerm}%,role.ilike.%${searchTerm}%`)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('❌ Search failed:', error.message);
      return;
    }

    if (!users || users.length === 0) {
      console.log('❌ No users found matching your search');
      return;
    }

    console.log(`✅ Found ${users.length} user(s):\n`);
    users.forEach((user, i) => {
      console.log(`${i + 1}. ${user.email}`);
      console.log(`   Organization: ${user.organization_id || '❌ NONE'}`);
      console.log(`   Role: ${user.role || 'standard_user'}`);
      console.log(`   Status: ${user.status}`);
      console.log(`   Created: ${new Date(user.created_at).toLocaleString()}`);
      console.log('');
    });

  } catch (error: any) {
    console.error('❌ Error during search:', error.message);
  }
}

/**
 * Export for browser console
 */
if (typeof window !== 'undefined') {
  (window as any).findMissingUser = findMissingUser;
  (window as any).recoverMissingUser = recoverMissingUser;
  (window as any).searchUsers = searchUsers;
  
  console.log('🔧 Missing User Utilities loaded!');
  console.log('   Available commands:');
  console.log('   - findMissingUser("matt.brennan@ronaatlantic.ca")');
  console.log('   - recoverMissingUser("matt.brennan@ronaatlantic.ca")');
  console.log('   - searchUsers("matt")');
}