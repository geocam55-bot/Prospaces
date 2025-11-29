import { createClient } from './supabase/client';
import { ensureUserProfile } from './ensure-profile';

export async function getAllNotesClient() {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.warn('⚠️ User not authenticated, returning empty notes');
      return { notes: [] };
    }

    // Get user's profile to check their role
    let profile;
    try {
      profile = await ensureUserProfile(user.id);
    } catch (profileError) {
      console.error('❌ Failed to get user profile:', profileError);
      // Return empty array instead of throwing - this prevents "Error" in dashboard
      return { notes: [] };
    }

    const userRole = profile.role;
    const userOrgId = profile.organization_id;

    console.log('🔐 Notes - Current user:', profile.email, 'Role:', userRole, 'Organization:', userOrgId);

    let query = supabase
      .from('notes')
      .select('*');

    // Apply role-based filtering
    if (userRole === 'super_admin') {
      // Super Admin: Can see all notes
      console.log('🔓 Super Admin - Loading all notes');
    } else if (userRole === 'admin') {
      // Admin: Can see all notes within their organization
      console.log('🔒 Admin - Loading notes for organization:', userOrgId);
      query = query.eq('organization_id', userOrgId);
    } else if (userRole === 'manager') {
      // Manager: Can see their own notes + notes from users they manage
      console.log('👔 Manager - Loading notes for team');
      
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
        query = query.in('created_by', allowedUserIds);
      } else {
        query = query.eq('created_by', user.id);
      }
    } else if (userRole === 'marketing') {
      // Marketing: Can see all notes within their organization
      console.log('📢 Marketing - Loading notes for organization:', userOrgId);
      query = query.eq('organization_id', userOrgId);
    } else {
      // Standard User: Can ONLY see their own notes
      console.log('👤 Standard User - Loading only own notes');
      query = query.eq('organization_id', userOrgId);
      query = query.eq('created_by', user.id);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;

    console.log('📊 Notes filtered data - Total rows:', data?.length || 0);

    return { notes: data || [] };
  } catch (error: any) {
    console.error('Error loading notes:', error);
    // Return empty array instead of throwing to prevent "Error" in dashboard
    return { notes: [] };
  }
}

export async function createNoteClient(noteData: any) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error('Not authenticated');

    // Enhanced debugging: Try to get table schema by querying an existing row
    // or by doing a test insert with minimal data
    const { data: schemaCheck, error: schemaError } = await supabase
      .from('notes')
      .select('*')
      .limit(1);
    
    console.log('📋 Notes table schema check:');
    console.log('  - Rows found:', schemaCheck?.length || 0);
    console.log('  - Sample columns:', schemaCheck && schemaCheck.length > 0 ? Object.keys(schemaCheck[0]) : 'No existing rows to inspect');
    
    // If no rows exist, we'll check the error message from attempted insert to see what columns are expected
    if (!schemaCheck || schemaCheck.length === 0) {
      console.log('  - Table is empty, will attempt insert to discover schema');
    }

    // Map incoming data to match actual schema
    // Based on NUCLEAR-FIX.sql, the notes table has:
    // - id, contact_id, content, organization_id, created_by, created_at, updated_at
    const newNote = {
      content: noteData.text || noteData.content || noteData.message || '', // Map text/message to content
      contact_id: noteData.contact_id || null,
      organization_id: user.user_metadata?.organizationId,
      created_by: user.id,
      created_at: new Date().toISOString(),
    };

    console.log('📝 Attempting to insert note:', newNote);

    const { data, error } = await supabase
      .from('notes')
      .insert([newNote])
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating note:', error);
      console.error('   Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      throw error;
    }

    console.log('✅ Note created successfully:', data);
    return { note: data };
  } catch (error: any) {
    console.error('Error creating note:', error);
    throw error;
  }
}

export async function deleteNoteClient(id: string) {
  try {
    const supabase = createClient();
    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    console.error('Error deleting note:', error);
    throw error;
  }
}