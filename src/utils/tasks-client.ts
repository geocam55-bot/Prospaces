import { createClient } from './supabase/client';
import { ensureUserProfile } from './ensure-profile';

export async function getAllTasksClient() {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.warn('⚠️ User not authenticated, returning empty tasks');
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
      // Admin: Can see all tasks within their organization
      console.log('🔒 Admin - Loading tasks for organization:', userOrgId);
      query = query.eq('organization_id', userOrgId);
    } else if (userRole === 'manager') {
      // Manager: Can see their own tasks + tasks from users they manage
      console.log('👔 Manager - Loading tasks for team');
      
      // Get list of users this manager oversees
      const { data: teamMembers } = await supabase
        .from('profiles')
        .select('id')
        .eq('manager_id', user.id)
        .eq('organization_id', userOrgId);

      const teamIds = teamMembers?.map(m => m.id) || [];
      const allowedUserIds = [user.id, ...teamIds];
      
      // Filter: created by manager/team OR assigned to manager/team
      query = query.eq('organization_id', userOrgId);
      
      if (allowedUserIds.length > 1) {
        query = query.or(
          allowedUserIds.map(id => `created_by.eq.${id},assigned_to.eq.${id}`).join(',')
        );
      } else {
        query = query.or(`created_by.eq.${user.id},assigned_to.eq.${user.id}`);
      }
    } else if (userRole === 'marketing') {
      // Marketing: Can see all tasks within their organization
      console.log('📢 Marketing - Loading tasks for organization:', userOrgId);
      query = query.eq('organization_id', userOrgId);
    } else {
      // Standard User: Can ONLY see their own tasks
      console.log('👤 Standard User - Loading only own tasks');
      query = query.eq('organization_id', userOrgId);
      query = query.or(`created_by.eq.${user.id},assigned_to.eq.${user.id}`);
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
      created_by: user.id,
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