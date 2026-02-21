import { createClient } from './supabase/client';
import { projectId } from './supabase/info';
import { getServerHeaders } from './server-headers';

const BASE_URL = `https://${projectId}.supabase.co/functions/v1/server/make-server-8405be07`;

async function getAuthHeaders(): Promise<Record<string, string>> {
  return await getServerHeaders();
}

const supabase = createClient();

export interface Campaign {
  id?: string;
  organization_id?: string;
  name: string;
  type: 'email' | 'sms' | 'social' | 'multi';
  channel: string;
  status: 'draft' | 'active' | 'paused' | 'scheduled' | 'completed';
  audience_segment?: string;
  campaign_type?: 'one-time' | 'drip' | 'trigger' | 'recurring';
  subject_line?: string;
  preview_text?: string;
  content?: string;
  schedule_type?: string;
  scheduled_at?: string;
  audience_count?: number;
  sent_count?: number;
  opened_count?: number;
  clicked_count?: number;
  converted_count?: number;
  revenue?: number;
  metadata?: any;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ScoringRule {
  id?: string;
  organization_id?: string;
  action: string;
  category: 'engagement' | 'interest' | 'intent' | 'conversion' | 'decay' | 'negative';
  points: number;
  is_active?: boolean;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface LeadScore {
  id?: string;
  organization_id?: string;
  contact_id: string;
  score: number;
  status?: 'hot' | 'warm' | 'cold' | 'unscored';
  last_activity?: string;
  score_history?: any[];
  created_at?: string;
  updated_at?: string;
  contacts?: any;
}

export interface Journey {
  id?: string;
  organization_id?: string;
  name: string;
  status: 'draft' | 'active' | 'paused';
  trigger_type: string;
  trigger_config?: any;
  steps?: any[];
  enrolled_count?: number;
  completed_count?: number;
  avg_duration_days?: number;
  conversion_rate?: number;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface LandingPage {
  id?: string;
  organization_id?: string;
  name: string;
  slug: string;
  status: 'draft' | 'published' | 'archived';
  template?: string;
  content?: any;
  seo_title?: string;
  seo_description?: string;
  views_count?: number;
  conversions_count?: number;
  conversion_rate?: number;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

// Campaign Functions (Keep using Supabase Tables for now as they likely exist)
export async function getCampaigns(organizationId: string): Promise<Campaign[]> {
  const { data, error } = await supabase
    .from('marketing_campaigns')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createCampaign(campaign: Campaign, organizationId: string): Promise<Campaign> {
  const { data: userData } = await supabase.auth.getUser();
  
  const { data, error } = await supabase
    .from('marketing_campaigns')
    .insert([{
      ...campaign,
      organization_id: organizationId,
      created_by: userData?.user?.id
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateCampaign(id: string, updates: Partial<Campaign>): Promise<Campaign> {
  const { data, error } = await supabase
    .from('marketing_campaigns')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteCampaign(id: string): Promise<void> {
  const { error } = await supabase
    .from('marketing_campaigns')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function duplicateCampaign(id: string, organizationId: string): Promise<Campaign> {
  const { data: original, error: fetchError } = await supabase
    .from('marketing_campaigns')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError) throw fetchError;

  const { data: userData } = await supabase.auth.getUser();
  
  const { id: _id, created_at, updated_at, ...campaignData } = original;
  
  const { data, error } = await supabase
    .from('marketing_campaigns')
    .insert([{
      ...campaignData,
      name: `${original.name} (Copy)`,
      status: 'draft',
      organization_id: organizationId,
      created_by: userData?.user?.id
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Lead Scoring Functions (Keep rules in tables if possible, but access scores via API)
export async function getScoringRules(organizationId: string): Promise<ScoringRule[]> {
  try {
    const { data, error } = await supabase
      .from('lead_scoring_rules')
      .select('*')
      .eq('organization_id', organizationId)
      .order('category', { ascending: true });

    if (error) {
      // If table doesn't exist, return empty array
      if (error.code === '42P01' || error.code === 'PGRST205' || error.message?.includes('does not exist')) {
        return [];
      }
      throw error;
    }
    return data || [];
  } catch (error: any) {
    // If table doesn't exist, return empty array
    if (error.code === '42P01' || error.code === 'PGRST205' || error.message?.includes('does not exist')) {
      return [];
    }
    console.error('Error fetching scoring rules:', error);
    return [];
  }
}

export async function createScoringRule(rule: ScoringRule, organizationId: string): Promise<ScoringRule> {
  const { data: userData } = await supabase.auth.getUser();
  
  const { data, error } = await supabase
    .from('lead_scoring_rules')
    .insert([{
      ...rule,
      organization_id: organizationId,
      created_by: userData?.user?.id
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateScoringRule(id: string, updates: Partial<ScoringRule>): Promise<ScoringRule> {
  const { data, error } = await supabase
    .from('lead_scoring_rules')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteScoringRule(id: string): Promise<void> {
  const { error } = await supabase
    .from('lead_scoring_rules')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function getLeadScores(organizationId: string): Promise<LeadScore[]> {
  // Use server endpoint to handle fallback
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${BASE_URL}/marketing/lead-scores`, {
      headers,
    });
    
    if (!response.ok) throw new Error('Failed to fetch lead scores');
    
    const data = await response.json();
    return data.scores || [];
  } catch (error) {
    console.error('Error fetching lead scores:', error);
    return [];
  }
}

export async function updateLeadScore(contactId: string, organizationId: string, scoreChange: number, action: string): Promise<LeadScore> {
  // Keeping this using Supabase client as it's complex logic better handled by direct DB if available
  // or by a specific server endpoint if not.
  // Currently index.tsx uses this logic internally for tracking.
  // If we need manual update, we might need a server endpoint or keep using Supabase if table exists.
  
  const { data: existing } = await supabase
    .from('lead_scores')
    .select('*')
    .eq('contact_id', contactId)
    .eq('organization_id', organizationId)
    .single();

  const newScore = (existing?.score || 0) + scoreChange;
  let status: 'hot' | 'warm' | 'cold' | 'unscored' = 'unscored';
  
  if (newScore >= 80) status = 'hot';
  else if (newScore >= 50) status = 'warm';
  else if (newScore > 0) status = 'cold';

  const scoreHistory = existing?.score_history || [];
  scoreHistory.push({
    action,
    change: scoreChange,
    timestamp: new Date().toISOString()
  });

  if (existing) {
    const { data, error } = await supabase
      .from('lead_scores')
      .update({
        score: newScore,
        status,
        last_activity: new Date().toISOString(),
        score_history: scoreHistory
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } else {
    const { data, error } = await supabase
      .from('lead_scores')
      .insert([{
        contact_id: contactId,
        organization_id: organizationId,
        score: newScore,
        status,
        last_activity: new Date().toISOString(),
        score_history: scoreHistory
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}

// Journey Functions - Using KV Store via Server
export async function getJourneys(organizationId: string): Promise<Journey[]> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${BASE_URL}/marketing/journeys`, {
      headers,
    });
    
    if (!response.ok) throw new Error('Failed to fetch journeys');
    
    const data = await response.json();
    return data.journeys || [];
  } catch (error) {
    console.error('Error fetching journeys:', error);
    return [];
  }
}

export async function createJourney(journey: Journey, organizationId: string): Promise<Journey> {
  const headers = await getAuthHeaders();

  const response = await fetch(`${BASE_URL}/marketing/journeys`, {
    method: 'POST',
    headers,
    body: JSON.stringify(journey)
  });

  if (!response.ok) throw new Error('Failed to create journey');
  const data = await response.json();
  return data.journey;
}

export async function updateJourney(id: string, updates: Partial<Journey>): Promise<Journey> {
  const headers = await getAuthHeaders();

  const response = await fetch(`${BASE_URL}/marketing/journeys/${id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(updates)
  });

  if (!response.ok) throw new Error('Failed to update journey');
  const data = await response.json();
  return data.journey;
}

export async function deleteJourney(id: string): Promise<void> {
  const headers = await getAuthHeaders();

  const response = await fetch(`${BASE_URL}/marketing/journeys/${id}`, {
    method: 'DELETE',
    headers,
  });

  if (!response.ok) throw new Error('Failed to delete journey');
}

// Landing Page Functions - Using KV Store via Server
export async function getLandingPages(organizationId: string): Promise<LandingPage[]> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${BASE_URL}/marketing/landing-pages`, {
      headers,
    });
    
    if (!response.ok) throw new Error('Failed to fetch landing pages');
    
    const data = await response.json();
    return data.pages || [];
  } catch (error) {
    console.error('Error fetching landing pages:', error);
    return [];
  }
}

export async function createLandingPage(page: LandingPage, organizationId: string): Promise<LandingPage> {
  const headers = await getAuthHeaders();

  const response = await fetch(`${BASE_URL}/marketing/landing-pages`, {
    method: 'POST',
    headers,
    body: JSON.stringify(page)
  });

  if (!response.ok) throw new Error('Failed to create landing page');
  const data = await response.json();
  return data.page;
}

export async function updateLandingPage(id: string, updates: Partial<LandingPage>): Promise<LandingPage> {
  const headers = await getAuthHeaders();

  const response = await fetch(`${BASE_URL}/marketing/landing-pages/${id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(updates)
  });

  if (!response.ok) throw new Error('Failed to update landing page');
  const data = await response.json();
  return data.page;
}

export async function deleteLandingPage(id: string): Promise<void> {
  const headers = await getAuthHeaders();

  const response = await fetch(`${BASE_URL}/marketing/landing-pages/${id}`, {
    method: 'DELETE',
    headers,
  });

  if (!response.ok) throw new Error('Failed to delete landing page');
}

// Analytics Functions
export async function trackMarketingEvent(
  organizationId: string,
  eventType: string,
  properties: any
): Promise<void> {
  const { error } = await supabase
    .from('marketing_events')
    .insert([{
      organization_id: organizationId,
      event_type: eventType,
      properties
    }]);

  if (error) throw error;
}

export async function getCampaignStats(organizationId: string) {
  const { data: campaigns } = await supabase
    .from('marketing_campaigns')
    .select('*')
    .eq('organization_id', organizationId);

  const activeCampaigns = campaigns?.filter(c => c.status === 'active').length || 0;
  const totalSent = campaigns?.reduce((sum, c) => sum + (c.sent_count || 0), 0) || 0;
  const totalOpened = campaigns?.reduce((sum, c) => sum + (c.opened_count || 0), 0) || 0;
  const totalClicked = campaigns?.reduce((sum, c) => sum + (c.clicked_count || 0), 0) || 0;
  const totalConverted = campaigns?.reduce((sum, c) => sum + (c.converted_count || 0), 0) || 0;
  const totalRevenue = campaigns?.reduce((sum, c) => sum + (c.revenue || 0), 0) || 0;

  const openRate = totalSent > 0 ? ((totalOpened / totalSent) * 100).toFixed(1) : '0';
  const conversionRate = totalSent > 0 ? ((totalConverted / totalSent) * 100).toFixed(1) : '0';

  return {
    activeCampaigns,
    totalSent,
    totalOpened,
    totalClicked,
    totalConverted,
    totalRevenue,
    openRate,
    conversionRate
  };
}

export async function getLeadScoreStats(organizationId: string) {
  // Use lead scores from API or DB
  const scores = await getLeadScores(organizationId);

  const totalLeads = scores?.length || 0;
  const hotLeads = scores?.filter(s => s.status === 'hot').length || 0;
  const warmLeads = scores?.filter(s => s.status === 'warm').length || 0;
  const coldLeads = scores?.filter(s => s.status === 'cold').length || 0;
  const unscored = scores?.filter(s => s.status === 'unscored').length || 0;

  return {
    totalLeads,
    hotLeads,
    warmLeads,
    coldLeads,
    unscored,
    segments: [
      { name: 'Hot Leads (80-100)', count: hotLeads, percentage: totalLeads > 0 ? Math.round((hotLeads / totalLeads) * 100) : 0 },
      { name: 'Warm Leads (50-79)', count: warmLeads, percentage: totalLeads > 0 ? Math.round((warmLeads / totalLeads) * 100) : 0 },
      { name: 'Cold Leads (1-49)', count: coldLeads, percentage: totalLeads > 0 ? Math.round((coldLeads / totalLeads) * 100) : 0 },
      { name: 'Unscored', count: unscored, percentage: totalLeads > 0 ? Math.round((unscored / totalLeads) * 100) : 0 }
    ]
  };
}