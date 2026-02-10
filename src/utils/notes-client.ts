import { createClient } from './supabase/client';
import { ensureUserProfile } from './ensure-profile';

const supabase = createClient();

export async function getAllNotesClient() {
  try {
    // Try to get user, with fallback to session
    let authUser;
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      // Fallback: check if there's a session
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        authUser = session.user;
      } else {
        // Silently return empty during initial load
        return { notes: [] };
      }
    } else {
      authUser = user;
    }

    // Get user's profile to check their role
    let profile;
    try {
      profile = await ensureUserProfile(authUser.id);
    } catch (profileError) {
      console.error('❌ Failed to get user profile:', profileError);
      return { notes: [] };
    }

    const userRole = profile.role;
    const userOrgId = profile.organization_id;

    console.log('📝 Notes - Current user:', profile.email, 'Role:', userRole, 'Organization:', userOrgId);

    let query = supabase
      .from('notes')
      .select('*');

    // Apply role-based filtering
    if (userRole === 'super_admin') {
      // Super Admin: Can see all notes (filtered by org if context exists, but usually all)
      // If we want to restrict to org:
      if (userOrgId) {
         query = query.or(`organization_id.eq.${userOrgId},organization_id.is.null`);
      }
    } else if (userRole === 'marketing') {
      // Marketing: Can see all notes within their organization
      console.log('📢 Marketing - Loading all notes for organization:', userOrgId);
      if (userOrgId) {
        query = query.or(`organization_id.eq.${userOrgId},organization_id.is.null`);
      }
    } else {
      // Admin, Manager, Standard User: Can ONLY see their own notes
      // (Mirroring the previous KV logic where Admin/Manager were restricted to own notes)
      console.log('👤 Personal View - Loading only own notes for user:', authUser.id);
      if (userOrgId) {
        query = query.or(`organization_id.eq.${userOrgId},organization_id.is.null`);
      }
      query = query.eq('owner_id', authUser.id);
    }

    const { data: notes, error } = await query.order('created_at', { ascending: false });

    if (error) {
      // If table doesn't exist, return empty array
      if (error.code === '42P01' || error.code === 'PGRST204') {
        console.log('[notes-client] Notes table not found, returning empty array');
        return { notes: [] };
      }
      console.error('[notes-client] Error loading notes:', error);
      throw error;
    }

    return { notes: notes || [] };
  } catch (error: any) {
    console.error('[notes-client] Error:', error.message);
    return { notes: [] };
  }
}

export async function createNoteClient(noteData: any) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('Not authenticated');
    }

    let organizationId = user.user_metadata?.organizationId;
    
    // Fetch org ID from profile if missing in metadata
    if (!organizationId) {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('organization_id')
          .eq('id', user.id)
          .single();
        if (profile) organizationId = profile.organization_id;
      } catch (e) {
        // ignore
      }
    }

    const newNote = {
      title: noteData.title,
      content: noteData.content,
      contact_id: noteData.contact_id || null,
      organization_id: organizationId,
      owner_id: user.id,
      created_by: user.id, // Some tables use created_by, some owner_id. Notes usually uses owner_id but good to set created_by if column exists.
                           // However, to be safe, we'll stick to what we know. 
                           // But wait, if the table expects snake_case, let's include common fields.
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    console.log('[notes-client] Creating note:', newNote);

    const { data: note, error } = await supabase
      .from('notes')
      .insert([newNote])
      .select()
      .single();

    if (error) {
      console.error('[notes-client] Error creating note:', error);
      throw error;
    }

    return { note };
  } catch (error: any) {
    console.error('[notes-client] Error creating note:', error.message);
    throw error;
  }
}

export async function deleteNoteClient(id: string) {
  try {
    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[notes-client] Error deleting note:', error);
      throw error;
    }

    return { success: true };
  } catch (error: any) {
    console.error('[notes-client] Error deleting note:', error.message);
    throw error;
  }
}
