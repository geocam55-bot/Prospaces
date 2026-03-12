import { createClient } from './supabase/client';
import { ensureUserProfile } from './ensure-profile';
import { projectId } from './supabase/info';
import { getServerHeaders } from './server-headers';

const PG_COLUMNS = [
  'id', 'name', 'description', 'type', 'status', 'start_date', 'end_date', 
  'owner_id', 'organization_id', 'created_at', 'updated_at'
];

function unpackCampaign(c: any) {
  if (!c) return c;
  let meta = {};
  if (c.description && c.description.startsWith('{')) {
    try {
      meta = JSON.parse(c.description);
    } catch(e) {}
  }
  return { ...meta, ...c }; // Postgres columns take precedence, but meta provides the rest
}

function packCampaignData(newData: any, existingData: any = {}) {
  const pgData: any = {};
  const meta: any = existingData.description && existingData.description.startsWith('{') 
    ? JSON.parse(existingData.description) : {};
  
  for (const key of Object.keys(newData)) {
    if (PG_COLUMNS.includes(key)) {
      pgData[key] = newData[key];
    } else {
      meta[key] = newData[key];
    }
  }

  if (Object.keys(meta).length > 0) {
    pgData.description = JSON.stringify(meta);
  }
  
  return pgData;
}

export async function getAllCampaignsClient() {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      // User not authenticated, returning empty campaigns
      return { campaigns: [] };
    }

    // Get user's profile to check their role
    let profile;
    try {
      profile = await ensureUserProfile(user.id);
    } catch (profileError) {
      // Failed to get user profile
      return { campaigns: [] };
    }

    const userRole = profile.role;
    const userOrgId = profile.organization_id;

    // Applying role-based campaign filtering

    let query = supabase
      .from('campaigns')
      .select('*');

    // Apply role-based filtering
    if (userRole === 'super_admin') {
      // Super Admin: Can see all campaigns
    } else if (userRole === 'admin' || userRole === 'marketing') {
      // Admin & Marketing: Can see all campaigns within their organization
      query = query.eq('organization_id', userOrgId);
    } else if (userRole === 'manager') {
      // Manager: Can see campaigns within their organization
      query = query.eq('organization_id', userOrgId);
    } else if (userRole === 'director') {
      // Director: Same as Manager - sees campaigns within their organization
      query = query.eq('organization_id', userOrgId);
    } else {
      // Standard User: Can see campaigns within their organization (read-only for most)
      query = query.eq('organization_id', userOrgId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;

    // Campaigns filtered data loaded

    const unpackedCampaigns = (data || []).map(unpackCampaign);

    return { campaigns: unpackedCampaigns };
  } catch (error: any) {
    // Error loading campaigns
    return { campaigns: [] };
  }
}

export async function createCampaignClient(campaignData: any) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    const profile = await ensureUserProfile(user.id);

    const packedData = packCampaignData(campaignData);

    const { data, error } = await supabase
      .from('campaigns')
      .insert([{
        ...packedData,
        owner_id: user.id,
        organization_id: profile.organization_id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }])
      .select()
      .single();

    if (error) throw error;

    // Campaign created
    return { campaign: unpackCampaign(data) };
  } catch (error: any) {
    // Error creating campaign
    throw error;
  }
}

export async function updateCampaignClient(id: string, campaignData: any) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Fetch existing to preserve description/metadata
    const { data: existing } = await supabase.from('campaigns').select('*').eq('id', id).single();
    if (!existing) throw new Error('Campaign not found');

    const packedData = packCampaignData(campaignData, existing);

    const { data, error } = await supabase
      .from('campaigns')
      .update({
        ...packedData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Campaign updated
    return { campaign: unpackCampaign(data) };
  } catch (error: any) {
    // Error updating campaign
    throw error;
  }
}

export async function deleteCampaignClient(id: string) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { error } = await supabase
      .from('campaigns')
      .delete()
      .eq('id', id);

    if (error) throw error;

    // Campaign deleted
    return { success: true };
  } catch (error: any) {
    // Error deleting campaign
    throw error;
  }
}

export async function sendCampaignClient(id: string) {
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('User not authenticated');
    }

    const profile = await ensureUserProfile(session.user.id);
    
    const headers = await getServerHeaders();
    const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-8405be07/campaigns/${id}/send`, {
      method: 'POST',
      headers,
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to send campaign');
    }

    // Campaign sent
    return result;
  } catch (error: any) {
    // Error sending campaign
    throw error;
  }
}
