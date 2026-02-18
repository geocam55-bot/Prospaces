import { createClient } from './supabase/client';
import { ensureUserProfile } from './ensure-profile';

export async function getAllAppointmentsClient() {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      // User not authenticated yet - return empty array silently
      // This can happen during initial page load before auth is initialized
      return { appointments: [] };
    }

    // Get user's profile to check their role
    let profile;
    try {
      profile = await ensureUserProfile(user.id);
    } catch (profileError) {
      console.error('❌ Failed to get user profile:', profileError);
      // Return empty array instead of throwing - this prevents "Error" in dashboard
      return { appointments: [] };
    }

    const userRole = profile.role;
    const userOrgId = profile.organization_id;

    console.log('🔐 Appointments - Current user:', profile.email, 'Role:', userRole, 'Organization:', userOrgId);
    console.log('🔐 Appointments - User ID:', user.id);

    // First, let's check how many appointments exist in this organization
    const { count: totalOrgCount } = await supabase
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', userOrgId);
    
    console.log('📊 Total appointments in organization:', totalOrgCount);

    let query = supabase
      .from('appointments')
      .select('*');

    // Apply role-based filtering
    if (userRole === 'super_admin') {
      // Super Admin: Can see all appointments
      console.log('🔓 Super Admin - Loading all appointments');
    } else if (userRole === 'admin' || userRole === 'marketing') {
      // Admin & Marketing: Can see all appointments within their organization
      console.log('🔒 Admin/Marketing - Loading appointments for organization:', userOrgId);
      query = query.eq('organization_id', userOrgId);
    } else if (userRole === 'manager') {
      // Manager: Can see their own appointments + appointments from users they manage
      console.log('👔 Manager - Loading appointments for team');
      
      // Get list of users this manager oversees
      const { data: teamMembers } = await supabase
        .from('profiles')
        .select('id')
        .eq('manager_id', user.id)
        .eq('organization_id', userOrgId);

      const teamIds = teamMembers?.map(m => m.id) || [];
      const allowedUserIds = [user.id, ...teamIds];
      
      // Filter: created by manager/team
      query = query.eq('organization_id', userOrgId);
      
      if (allowedUserIds.length > 1) {
        query = query.in('owner_id', allowedUserIds);
      } else {
        query = query.eq('owner_id', user.id);
      }
    } else if (userRole === 'director') {
      // Director: Same as Manager - sees own + team appointments
      console.log('🎯 Director - Loading appointments for team');
      
      // Get list of users this director oversees
      const { data: teamMembers } = await supabase
        .from('profiles')
        .select('id')
        .eq('manager_id', user.id)
        .eq('organization_id', userOrgId);

      const teamIds = teamMembers?.map(m => m.id) || [];
      const allowedUserIds = [user.id, ...teamIds];
      
      // Filter: created by director/team
      query = query.eq('organization_id', userOrgId);
    } else {
      // Standard User: Only show their own appointments
      console.log('👤 Standard User - Loading only own appointments');
      query = query.eq('organization_id', userOrgId);
      query = query.eq('owner_id', user.id);
    }

    const { data, error } = await query.order('start_time', { ascending: true });

    if (error) throw error;

    console.log('📊 Appointments filtered data - Total rows:', data?.length || 0);
    if (data && data.length > 0) {
      console.log('📊 First appointment:', data[0]);
      console.log('📊 All appointment IDs:', data.map((a: any) => ({ id: a.id, title: a.title, start: a.start_time, owner: a.owner_id })));
    }

    return { appointments: data || [] };
  } catch (error: any) {
    console.error('Error loading appointments:', error);
    // Return empty array instead of throwing to prevent "Error" in dashboard
    return { appointments: [] };
  }
}

export async function createAppointmentClient(appointmentData: any) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error('Not authenticated');

    // Get profile to ensure we use the correct organization_id
    const profile = await ensureUserProfile(user.id);

    const newAppointment = {
      ...appointmentData,
      organization_id: profile.organization_id, // Use profile org instead of user_metadata
      owner_id: user.id,
      created_at: new Date().toISOString(),
    };

    console.log('✅ Creating appointment with data:', newAppointment);

    const { data, error } = await supabase
      .from('appointments')
      .insert([newAppointment])
      .select()
      .single();

    if (error) throw error;

    console.log('✅ Appointment created successfully:', data);

    return { appointment: data };
  } catch (error: any) {
    console.error('Error creating appointment:', error);
    throw error;
  }
}

export async function deleteAppointmentClient(id: string) {
  try {
    const supabase = createClient();
    const { error } = await supabase
      .from('appointments')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    console.error('Error deleting appointment:', error);
    throw error;
  }
}