import { createClient } from './supabase/client';
import { ensureUserProfile } from './ensure-profile';

export async function getAllAppointmentsClient(scope: 'personal' | 'team' = 'personal') {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { appointments: [] };
    }

    let profile;
    try {
      profile = await ensureUserProfile(user.id);
    } catch (profileError) {
      console.error('❌ Failed to get user profile:', profileError);
      return { appointments: [] };
    }

    const userRole = profile.role;
    const userOrgId = profile.organization_id;

    console.log('🔐 Appointments - Current user:', profile.email, 'Role:', userRole, 'Scope:', scope);

    let query = supabase
      .from('appointments')
      .select('*');

    if (scope === 'personal') {
      // Personal scope: ALL roles see only their own appointments
      if (userRole === 'super_admin') {
        console.log('🔓 Super Admin - Loading all appointments');
      } else {
        console.log('👤 Personal scope - Loading only own appointments');
        query = query.eq('organization_id', userOrgId);
        query = query.eq('owner_id', user.id);
      }
    } else {
      // Team scope: role-based filtering
      if (userRole === 'super_admin') {
        console.log('🔓 Super Admin - Loading all appointments');
      } else if (['admin', 'manager', 'director', 'marketing'].includes(userRole)) {
        console.log('📢 Team scope - Loading all org appointments');
        query = query.eq('organization_id', userOrgId);
      } else {
        console.log('👤 Standard User - Loading only own appointments');
        query = query.eq('organization_id', userOrgId);
        query = query.eq('owner_id', user.id);
      }
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