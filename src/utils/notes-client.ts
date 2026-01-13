import { createClient } from './supabase/client';
import { ensureUserProfile } from './ensure-profile';
import { projectId } from './supabase/info';

const BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-8405be07`;

async function getAuthHeader() {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ? `Bearer ${session.access_token}` : null;
}

export async function getAllNotesClient() {
  try {
    const authHeader = await getAuthHeader();
    
    if (!authHeader) {
      // Silently return empty during initial load
      return { notes: [] };
    }

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return { notes: [] };

    // Get user's profile to check their role
    let profile;
    try {
      profile = await ensureUserProfile(user.id);
    } catch (profileError) {
      console.error('❌ Failed to get user profile:', profileError);
      return { notes: [] };
    }

    const userRole = profile.role;
    
    // Fetch from Edge Function (KV Store)
    const response = await fetch(`${BASE_URL}/notes`, {
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch notes: ${response.statusText}`);
    }

    const data = await response.json();
    let notes = data.notes || [];

    // Apply role-based filtering in memory
    if (userRole === 'super_admin') {
      // Super Admin: Can see all notes (API returns org notes, super admin might want cross-org but KV structure separates by org)
      // For now, accept org notes.
    } else if (userRole === 'admin') {
      // Admin: Can ONLY see their own notes (strict filtering)
      notes = notes.filter((n: any) => n.ownerId === user.id);
    } else if (userRole === 'manager') {
      // Manager: Can ONLY see their own notes
      notes = notes.filter((n: any) => n.ownerId === user.id);
    } else if (userRole === 'marketing') {
      // Marketing: Can see all notes within their organization
      // No filtering needed
    } else {
      // Standard User: Can ONLY see their own notes
      notes = notes.filter((n: any) => n.ownerId === user.id);
    }

    // Sort by createdAt descending
    notes.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return { notes };
  } catch (error: any) {
    console.error('Error loading notes:', error);
    return { notes: [] };
  }
}

export async function createNoteClient(noteData: any) {
  try {
    const authHeader = await getAuthHeader();
    if (!authHeader) throw new Error('Not authenticated');

    const response = await fetch(`${BASE_URL}/notes`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(noteData)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to create note: ${response.statusText}`);
    }

    const data = await response.json();
    return { note: data.note };
  } catch (error: any) {
    console.error('Error creating note:', error);
    throw error;
  }
}

export async function deleteNoteClient(id: string) {
  try {
    const authHeader = await getAuthHeader();
    if (!authHeader) throw new Error('Not authenticated');

    const response = await fetch(`${BASE_URL}/notes/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to delete note: ${response.statusText}`);
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error deleting note:', error);
    throw error;
  }
}