import { createClient } from './supabase/client';

const supabase = createClient();

export async function debugUsers() {
  console.log('🔍 Starting user debugging...');
  
  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    console.error('❌ Not authenticated:', authError);
    return {
      error: 'Not authenticated',
      details: authError,
    };
  }

  console.log('✅ Current user:', {
    id: user.id,
    email: user.email,
    role: user.user_metadata?.role,
    organizationId: user.user_metadata?.organizationId,
  });

  const isSuperAdmin = user.user_metadata?.role === 'super_admin';
  const isAdmin = user.user_metadata?.role === 'admin';

  if (isSuperAdmin) {
    console.log('🌟 SUPER ADMIN detected! You should see ALL users from ALL organizations.');
  } else if (isAdmin) {
    console.log('👔 ADMIN detected! You should see users from your organization only.');
  } else {
    console.log('⚠️ You need to be an Admin or Super Admin to manage users.');
  }

  // Check if profiles table exists and query it
  console.log('📊 Checking profiles table...');
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('*');

  if (profilesError) {
    console.error('❌ Error querying profiles table:', profilesError);
    console.log('💡 This usually means the profiles table doesn\'t exist yet.');
    console.log('📝 Please run the migration: /supabase/migrations/001_create_profiles_table.sql');
    
    return {
      error: 'Profiles table not found',
      details: profilesError,
      solution: 'Run the migration in Supabase Dashboard → SQL Editor',
    };
  }

  console.log('✅ Profiles table found!');
  console.log(`📋 Total profiles in database: ${profiles?.length || 0}`);
  
  if (profiles && profiles.length > 0) {
    console.log('👥 All profiles:');
    profiles.forEach((profile: any, index: number) => {
      console.log(`  ${index + 1}. ${profile.name} (${profile.email})`);
      console.log(`     - Role: ${profile.role}`);
      console.log(`     - Org ID: ${profile.organization_id}`);
      console.log(`     - Status: ${profile.status}`);
    });

    // Check for larry.lee specifically
    const larry = profiles.find((p: any) => p.email === 'larry.lee@ronaatlantic.ca');
    if (larry) {
      console.log('✅ Found larry.lee@ronaatlantic.ca!');
      console.log('   Larry\'s details:', larry);
      
      // Check if organizationId matches
      if (larry.organization_id === user.user_metadata?.organizationId) {
        console.log('✅ Larry is in YOUR organization!');
      } else {
        console.log('⚠️ Larry is in a DIFFERENT organization:');
        console.log(`   Larry's org: ${larry.organization_id}`);
        console.log(`   Your org: ${user.user_metadata?.organizationId}`);
        console.log('💡 Only Super Admins can see users from other organizations');
      }
    } else {
      console.log('❌ larry.lee@ronaatlantic.ca NOT found in profiles table');
      console.log('💡 Possible reasons:');
      console.log('   1. User exists in Auth but not synced to profiles table');
      console.log('   2. Email might be different');
      console.log('   3. Migration trigger didn\'t run');
    }

    // Filter by organization
    const myOrgUsers = profiles.filter((p: any) => 
      p.organization_id === user.user_metadata?.organizationId
    );
    console.log(`📊 Users in YOUR organization: ${myOrgUsers.length}`);
    myOrgUsers.forEach((p: any, index: number) => {
      console.log(`  ${index + 1}. ${p.name} (${p.email})`);
    });
  } else {
    console.log('⚠️ No profiles found in database');
    console.log('💡 This means the trigger hasn\'t synced auth users to profiles yet');
  }

  // Check auth users directly (this will show all users if you have admin access)
  console.log('\n📋 Checking Supabase Auth users...');
  console.log('💡 Note: Client-side can only see the current user in auth.users');
  
  return {
    success: true,
    currentUser: {
      id: user.id,
      email: user.email,
      role: user.user_metadata?.role,
      organizationId: user.user_metadata?.organizationId,
    },
    profiles: profiles || [],
    totalProfiles: profiles?.length || 0,
    myOrgProfiles: profiles?.filter((p: any) => 
      p.organization_id === user.user_metadata?.organizationId
    ) || [],
  };
}

// Helper to manually sync a user to profiles
export async function manualSyncUser(userId: string) {
  const supabase = createClient();
  
  // Get user from auth
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    console.error('Not authenticated');
    return { error: 'Not authenticated' };
  }

  // Insert/update profile
  const { data, error: upsertError } = await supabase
    .from('profiles')
    .upsert({
      id: user.id,
      email: user.email,
      name: user.user_metadata?.name || user.email,
      role: user.user_metadata?.role || 'standard_user',
      organization_id: user.user_metadata?.organizationId,
      status: 'active',
      last_login: user.last_sign_in_at,
    }, {
      onConflict: 'id'
    });

  if (upsertError) {
    console.error('Error syncing user:', upsertError);
    return { error: upsertError };
  }

  console.log('✅ User synced successfully!');
  return { success: true, data };
}

// Run debug in browser console with: window.debugUsers()
if (typeof window !== 'undefined') {
  (window as any).debugUsers = debugUsers;
  (window as any).manualSyncUser = manualSyncUser;
  console.log('🔧 Debug tools loaded! Run: debugUsers() or manualSyncUser()');
}