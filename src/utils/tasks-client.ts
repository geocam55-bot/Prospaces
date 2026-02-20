import { createClient } from './supabase/client';
import { ensureUserProfile } from './ensure-profile';

export async function getAllTasksClient(scope: 'personal' | 'team' = 'personal') {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { tasks: [] };
    }

    let profile;
    try {
      profile = await ensureUserProfile(user.id);
    } catch (profileError) {
      console.error('❌ Failed to get user profile:', profileError);
      return { tasks: [] };
    }

    const userRole = profile.role;
    const userOrgId = profile.organization_id;

    console.log('🔐 Tasks - Current user:', profile.email, 'Role:', userRole, 'Organization:', userOrgId, 'Scope:', scope);

    let query = supabase
      .from('tasks')
      .select('*');

    if (scope === 'personal') {
      // Personal scope: ALL roles see only their own tasks
      if (userRole === 'super_admin') {
        console.log('🔓 Super Admin - Loading all tasks');
      } else {
        console.log('👤 Personal scope - Loading only own tasks');
        query = query.eq('organization_id', userOrgId).or(`owner_id.eq.${user.id},assigned_to.eq.${user.id}`);
      }
    } else {
      // Team scope: role-based filtering
      if (userRole === 'super_admin') {
        console.log('🔓 Super Admin - Loading all tasks');
      } else if (['admin', 'manager', 'director', 'marketing'].includes(userRole)) {
        console.log('📢 Team scope - Loading all org tasks');
        query = query.eq('organization_id', userOrgId);
      } else {
        console.log('👤 Standard User (team scope) - Loading only own tasks');
        query = query.eq('organization_id', userOrgId).or(`owner_id.eq.${user.id},assigned_to.eq.${user.id}`);
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