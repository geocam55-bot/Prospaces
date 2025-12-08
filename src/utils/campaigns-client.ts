import { createClient } from './supabase/client';
import { ensureUserProfile } from './ensure-profile';

export async function getAllCampaignsClient() {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.warn('⚠️ User not authenticated, returning empty campaigns');
      return { campaigns: [] };
    }

    // Get user's profile to check their role
    let profile;
    try {
      profile = await ensureUserProfile(user.id);
    } catch (profileError) {
      console.error('❌ Failed to get user profile:', profileError);
      return { campaigns: [] };
    }

    const userRole = profile.role;
    const userOrgId = profile.organization_id;

    console.log('🔐 Campaigns - Current user:', profile.email, 'Role:', userRole, 'Organization:', userOrgId);

    let query = supabase
      .from('campaigns')
      .select('*');

    // Apply role-based filtering
    if (userRole === 'super_admin') {
      // Super Admin: Can see all campaigns
      console.log('🔓 Super Admin - Loading all campaigns');
    } else if (userRole === 'admin' || userRole === 'marketing') {
      // Admin & Marketing: Can see all campaigns within their organization
      console.log('🔒 Admin/Marketing - Loading campaigns for organization:', userOrgId);
      query = query.eq('organization_id', userOrgId);
    } else if (userRole === 'manager') {
      // Manager: Can see campaigns within their organization
      console.log('👔 Manager - Loading campaigns for organization:', userOrgId);
      query = query.eq('organization_id', userOrgId);
    } else {
      // Standard User: Can see campaigns within their organization (read-only for most)
      console.log('👤 Standard User - Loading campaigns for organization:', userOrgId);
      query = query.eq('organization_id', userOrgId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;

    console.log('📊 Campaigns filtered data - Total rows:', data?.length || 0);

    return { campaigns: data || [] };
  } catch (error: any) {
    console.error('Error loading campaigns:', error);
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

    const { data, error } = await supabase
      .from('campaigns')
      .insert([{
        ...campaignData,
        owner_id: user.id,
        organization_id: profile.organization_id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }])
      .select()
      .single();

    if (error) throw error;

    console.log('✅ Campaign created:', data);
    return { campaign: data };
  } catch (error: any) {
    console.error('Error creating campaign:', error);
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

    const { data, error } = await supabase
      .from('campaigns')
      .update({
        ...campaignData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    console.log('✅ Campaign updated:', data);
    return { campaign: data };
  } catch (error: any) {
    console.error('Error updating campaign:', error);
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

    console.log('✅ Campaign deleted:', id);
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting campaign:', error);
    throw error;
  }
}
