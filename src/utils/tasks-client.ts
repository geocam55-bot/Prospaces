import { createClient } from './supabase/client';
import { ensureUserProfile } from './ensure-profile';

export async function getAllTasksClient() {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      // User not authenticated yet - return empty array silently
      // This can happen during initial page load before auth is initialized
      return { tasks: [] };
    }

    // Get user's profile to check their role
    let profile;
    try {
      profile = await ensureUserProfile(user.id);
    } catch (profileError) {
      console.error('❌ Failed to get user profile:', profileError);
      // Return empty array instead of throwing - this prevents "Error" in dashboard
      return { tasks: [] };
    }

    const userRole = profile.role;
    const userOrgId = profile.organization_id;

    console.log('🔐 Tasks - Current user:', profile.email, 'Role:', userRole, 'Organization:', userOrgId);

    let query = supabase
      .from('tasks')
      .select('*');

    // Apply role-based filtering
    if (userRole === 'super_admin') {
      // Super Admin: Can see all tasks
      console.log('🔓 Super Admin - Loading all tasks');
    } else if (userRole === 'admin') {
      // Admin: Can ONLY see their own tasks (Team Dashboard shows team data)
      console.log('🔒 Admin - Loading own tasks only (strict filtering)');
      query = query.eq('organization_id', userOrgId).or(`owner_id.eq.${user.id},assigned_to.eq.${user.id}`);
    } else if (userRole === 'manager') {
      // Manager: Can ONLY see their own tasks (Team Dashboard shows team data)
      console.log('👔 Manager - Loading own tasks only (strict filtering)');
      query = query.eq('organization_id', userOrgId).or(`owner_id.eq.${user.id},assigned_to.eq.${user.id}`);
    } else if (userRole === 'director') {
      // Director: Same data access as Manager - sees only their own tasks
      console.log('🎯 Director - Loading own tasks only (strict filtering)');
      query = query.eq('organization_id', userOrgId).or(`owner_id.eq.${user.id},assigned_to.eq.${user.id}`);
    } else if (userRole === 'marketing') {
      // Marketing: Can see all tasks within their organization
      console.log('📢 Marketing - Loading tasks for organization:', userOrgId);
      query = query.eq('organization_id', userOrgId);
    } else {
      // Standard User: Check if they're the ONLY user in the org
      // If so, show all tasks. Otherwise, only show their own.
      console.log('👤 Standard User - Checking organization users...');
      
      const { data: orgUsers, error: usersError } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('organization_id', userOrgId)
        .neq('role', 'super_admin'); // Don't count super admins
      
      console.log('👤 Organization users:', orgUsers?.length, orgUsers?.map(u => u.email));
      
      if (!usersError && orgUsers && orgUsers.length === 1) {
        // Only one user in org - show all tasks in organization
        console.log('👤 Only user in organization - Loading all organization tasks');
        query = query.eq('organization_id', userOrgId);
      } else if (!usersError && orgUsers && orgUsers.length > 1) {
        // Multiple users - check if this is a legacy data scenario
        console.log('👤 Multiple users in organization - Checking for legacy data...');
        
        // First, try to get tasks owned by current user
        const { count: ownCount } = await supabase
          .from('tasks')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', userOrgId)
          .or(`owner_id.eq.${user.id},assigned_to.eq.${user.id}`);
        
        // If user has 0 tasks but org has tasks, this is likely legacy data
        // Show all org tasks to avoid confusion
        if (ownCount === 0) {
          console.log('👤 No tasks owned by user but org has tasks - showing all org tasks (legacy data scenario)');
          query = query.eq('organization_id', userOrgId);
        } else {
          // User has some tasks - show only their own
          console.log('👤 User has tasks - Loading only own tasks');
          query = query.eq('organization_id', userOrgId);
          query = query.or(`owner_id.eq.${user.id},assigned_to.eq.${user.id}`);
        }
      } else {
        // Fallback - show only own tasks
        console.log('👤 Standard User - Loading only own tasks');
        query = query.eq('organization_id', userOrgId);
        query = query.or(`owner_id.eq.${user.id},assigned_to.eq.${user.id}`);
      }
    }

    const { data, error } = await query.order('due_date', { ascending: true });

    if (error) throw error;

    console.log('📊 Tasks filtered data - Total rows:', data?.length || 0);

    return { tasks: data || [] };
  } catch (error: any) {
    console.error('Error loading tasks:', error);
    // Return empty array instead of throwing to prevent "Error" in dashboard
    return { tasks: [] };
  }
}

export async function createTaskClient(taskData: any) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error('Not authenticated');

    const newTask = {
      ...taskData,
      organization_id: user.user_metadata?.organizationId,
      owner_id: user.id,
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('tasks')
      .insert([newTask])
      .select()
      .single();

    if (error) throw error;

    return { task: data };
  } catch (error: any) {
    console.error('Error creating task:', error);
    throw error;
  }
}

export async function updateTaskClient(id: string, taskData: any) {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('tasks')
      .update(taskData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return { task: data };
  } catch (error: any) {
    console.error('Error updating task:', error);
    throw error;
  }
}

export async function deleteTaskClient(id: string) {
  try {
    const supabase = createClient();
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    console.error('Error deleting task:', error);
    throw error;
  }
}