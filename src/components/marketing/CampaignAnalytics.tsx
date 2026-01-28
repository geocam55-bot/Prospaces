import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { 
  Mail, 
  MousePointerClick, 
  Clock, 
  DollarSign, 
  TrendingUp, 
  Users,
  Eye,
  Target,
  Globe
} from 'lucide-react';
import { projectId } from '../../utils/supabase/info';
import { createClient } from '../../utils/supabase/client';

interface CampaignAnalyticsProps {
  campaign: any;
}

export function CampaignAnalytics({ campaign }: CampaignAnalyticsProps) {
  const [analytics, setAnalytics] = useState({
    emailsSent: campaign.sent || 0,
    emailsOpened: campaign.opened || 0,
    landingPageClicks: campaign.landing_page_clicks || 0,
    avgTimeSpent: campaign.avg_time_spent || 0,
    conversions: campaign.converted || 0,
    revenue: campaign.revenue || 0,
  });
  
  const [landingPageAnalytics, setLandingPageAnalytics] = useState<any>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  // Fetch landing page analytics
  useEffect(() => {
    const fetchLandingPageAnalytics = async () => {
      if (!campaign.landing_page_slug || !campaign.id) return;
      
      setLoadingAnalytics(true);
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          console.error('No session found');
          return;
        }

        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-8405be07/analytics/campaign/${campaign.id}/landing-page`,
          {
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          setLandingPageAnalytics(data);
          console.log('Landing page analytics:', data);
        } else {
          console.error('Failed to fetch landing page analytics:', response.statusText);
        }
      } catch (error) {
        console.error('Error fetching landing page analytics:', error);
      } finally {
        setLoadingAnalytics(false);
      }
    };

    fetchLandingPageAnalytics();
  }, [campaign.id, campaign.landing_page_slug]);

  // Calculate rates
  const openRate = analytics.emailsSent > 0 
    ? ((analytics.emailsOpened / analytics.emailsSent) * 100).toFixed(1)
    : '0.0';
  
  const clickThroughRate = analytics.emailsOpened > 0
    ? ((analytics.landingPageClicks / analytics.emailsOpened) * 100).toFixed(1)
    : '0.0';
  
  const conversionRate = analytics.emailsSent > 0
    ? ((analytics.conversions / analytics.emailsSent) * 100).toFixed(1)
    : '0.0';

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Mail className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Emails Sent</p>
                <p className="text-xl font-semibold text-gray-900">{analytics.emailsSent.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                <Eye className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Opened</p>
                <p className="text-xl font-semibold text-gray-900">{analytics.emailsOpened.toLocaleString()}</p>
                <p className="text-xs text-green-600">{openRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <MousePointerClick className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Landing Page Clicks</p>
                <p className="text-xl font-semibold text-gray-900">{analytics.landingPageClicks.toLocaleString()}</p>
                <p className="text-xs text-purple-600">{clickThroughRate}% CTR</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-orange-100 flex items-center justify-center">
                <Target className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Conversions</p>
                <p className="text-xl font-semibold text-gray-900">{analytics.conversions.toLocaleString()}</p>
                <p className="text-xs text-orange-600">{conversionRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Engagement Metrics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Avg. Time on Landing Page</span>
              <Badge variant="outline">{formatTime(analytics.avgTimeSpent)}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Click-Through Rate</span>
              <Badge variant="outline">{clickThroughRate}%</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Open Rate</span>
              <Badge variant="outline">{openRate}%</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Revenue Impact
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Total Revenue</span>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                ${analytics.revenue.toLocaleString()}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Revenue per Email</span>
              <Badge variant="outline">
                ${analytics.emailsSent > 0 ? (analytics.revenue / analytics.emailsSent).toFixed(2) : '0.00'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Conversion Rate</span>
              <Badge variant="outline">{conversionRate}%</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Campaign Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Campaign Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500">Campaign Name</p>
              <p className="text-sm text-gray-900 font-medium">{campaign.name}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Status</p>
              <Badge className={
                campaign.status === 'Active' ? 'bg-green-100 text-green-700' :
                campaign.status === 'Paused' ? 'bg-yellow-100 text-yellow-700' :
                campaign.status === 'Completed' ? 'bg-gray-100 text-gray-700' :
                'bg-blue-100 text-blue-700'
              }>
                {campaign.status}
              </Badge>
            </div>
            <div>
              <p className="text-xs text-gray-500">Audience Segment</p>
              <p className="text-sm text-gray-900">{campaign.audience_segment || 'All Contacts'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Landing Page</p>
              <p className="text-sm text-gray-900">{campaign.landing_page_name || 'None'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Start Date</p>
              <p className="text-sm text-gray-900">
                {campaign.start_date ? new Date(campaign.start_date).toLocaleDateString() : 'Not started'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Type</p>
              <p className="text-sm text-gray-900 capitalize">{campaign.type || 'Email'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Landing Page Analytics */}
      {campaign.landing_page_slug && landingPageAnalytics && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Landing Page Analytics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-xs text-gray-600 mb-1">Page Visits</p>
                <p className="text-2xl font-bold text-gray-900">{landingPageAnalytics.stats.visits}</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-xs text-gray-600 mb-1">Conversions</p>
                <p className="text-2xl font-bold text-gray-900">{landingPageAnalytics.stats.conversions}</p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <p className="text-xs text-gray-600 mb-1">Conversion Rate</p>
                <p className="text-2xl font-bold text-gray-900">{landingPageAnalytics.stats.conversionRate}%</p>
              </div>
            </div>

            {/* UTM Source Breakdown */}
            {Object.keys(landingPageAnalytics.utmBreakdown || {}).length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Traffic Sources</h4>
                <div className="space-y-2">
                  {Object.entries(landingPageAnalytics.utmBreakdown).map(([source, data]: [string, any]) => (
                    <div key={source} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="capitalize">{source}</Badge>
                        <span className="text-sm text-gray-600">
                          {data.visits} visit{data.visits !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-600">
                          {data.conversions} conversion{data.conversions !== 1 ? 's' : ''}
                        </span>
                        <Badge className="bg-green-100 text-green-700">
                          {data.visits > 0 ? ((data.conversions / data.visits) * 100).toFixed(1) : 0}% CVR
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}