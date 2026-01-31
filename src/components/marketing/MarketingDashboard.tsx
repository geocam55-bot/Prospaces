import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { TrendingUp, TrendingDown, Mail, Users, MousePointer, DollarSign, Target, Zap } from 'lucide-react';
import type { User } from '../../App';
import { campaignsAPI, contactsAPI, journeysAPI } from '../../utils/api';

interface MarketingDashboardProps {
  user: User;
}

export function MarketingDashboard({ user }: MarketingDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    activeCampaigns: 0,
    totalLeads: 0,
    avgOpenRate: 0,
    conversionRate: 0,
    revenue: 0,
    activeJourneys: 0
  });
  const [recentCampaigns, setRecentCampaigns] = useState<any[]>([]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Fetch data in parallel
        const [campaignsData, contactsData, journeysData] = await Promise.all([
          campaignsAPI.getAll(),
          contactsAPI.getAll(),
          journeysAPI.getAll(user.organizationId || '')
        ]);

        const campaigns = campaignsData.campaigns || [];
        const contacts = contactsData.contacts || [];
        const journeys = journeysData || []; // journeysAPI.getAll returns array directly? Let's check api.ts

        // Check api.ts for journeysAPI.getAll return type
        // It calls getJourneys from marketing-client.ts which returns { journeys: ... } from server OR array if using old method?
        // Wait, I checked api.ts earlier:
        // export const journeysAPI = { getAll: (organizationId) => getJourneys(organizationId) }
        // And marketing-client.ts getJourneys returns Promise<Journey[]> (array).
        // So journeysData is Journey[].

        // Calculate stats
        const activeCampaignsCount = campaigns.filter((c: any) => c.status === 'active' || c.status === 'Active').length;
        
        const totalSent = campaigns.reduce((sum: number, c: any) => sum + (c.sent_count || c.sent || 0), 0);
        const totalOpened = campaigns.reduce((sum: number, c: any) => sum + (c.opened_count || c.opened || 0), 0);
        const totalConverted = campaigns.reduce((sum: number, c: any) => sum + (c.converted_count || c.converted || 0), 0);
        const totalRevenue = campaigns.reduce((sum: number, c: any) => sum + (c.revenue || 0), 0);

        const avgOpenRate = totalSent > 0 ? (totalOpened / totalSent) * 100 : 0;
        const conversionRate = totalSent > 0 ? (totalConverted / totalSent) * 100 : 0;

        const activeJourneysCount = Array.isArray(journeys) ? journeys.filter((j: any) => j.status === 'active').length : 0;

        setStats({
          activeCampaigns: activeCampaignsCount,
          totalLeads: contacts.length,
          avgOpenRate,
          conversionRate,
          revenue: totalRevenue,
          activeJourneys: activeJourneysCount
        });

        setRecentCampaigns(campaigns.slice(0, 5));

      } catch (error) {
        console.error('Error loading marketing dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user.organizationId) {
      loadData();
    }
  }, [user.organizationId]);

  const dashboardStats = [
    {
      title: 'Active Campaigns',
      value: stats.activeCampaigns.toString(),
      change: 'currently running',
      trend: 'neutral',
      icon: Mail,
      color: 'blue'
    },
    {
      title: 'Total Leads',
      value: stats.totalLeads.toLocaleString(),
      change: 'total contacts',
      trend: 'up',
      icon: Users,
      color: 'green'
    },
    {
      title: 'Avg. Open Rate',
      value: `${stats.avgOpenRate.toFixed(1)}%`,
      change: 'across campaigns',
      trend: 'neutral',
      icon: MousePointer,
      color: 'purple'
    },
    {
      title: 'Conversion Rate',
      value: `${stats.conversionRate.toFixed(1)}%`,
      change: 'overall',
      trend: 'neutral',
      icon: Target,
      color: 'orange'
    },
    {
      title: 'Revenue Attribution',
      value: `$${stats.revenue.toLocaleString()}`,
      change: 'total revenue',
      trend: 'up',
      icon: DollarSign,
      color: 'emerald'
    },
    {
      title: 'Active Journeys',
      value: stats.activeJourneys.toString(),
      change: 'automated flows',
      trend: 'neutral',
      icon: Zap,
      color: 'indigo'
    },
  ];

  const topPerformingContent: any[] = []; // Placeholder

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {dashboardStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm text-gray-600">{stat.title}</p>
                    <p className="text-2xl mt-2 text-gray-900">{stat.value}</p>
                    <div className="flex items-center gap-1 mt-2">
                      {stat.trend === 'up' && <TrendingUp className="h-3 w-3 text-green-600" />}
                      {stat.trend === 'down' && <TrendingDown className="h-3 w-3 text-red-600" />}
                      <span className={`text-xs ${
                        stat.trend === 'up' ? 'text-green-600' : 
                        stat.trend === 'down' ? 'text-red-600' : 
                        'text-gray-500'
                      }`}>
                        {stat.change}
                      </span>
                    </div>
                  </div>
                  <div className={`h-12 w-12 rounded-lg bg-${stat.color}-100 flex items-center justify-center`}>
                    <Icon className={`h-6 w-6 text-${stat.color}-600`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Campaigns */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Campaigns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentCampaigns.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No recent campaigns</p>
              ) : (
                recentCampaigns.map((campaign, index) => (
                  <div key={index} className="flex items-center justify-between pb-4 border-b last:border-b-0 last:pb-0">
                    <div className="flex-1">
                      <p className="text-sm text-gray-900 font-medium">{campaign.name}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-gray-500 capitalize">{campaign.type}</span>
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          campaign.status === 'Active' || campaign.status === 'active' ? 'bg-green-100 text-green-700' :
                          campaign.status === 'Scheduled' || campaign.status === 'scheduled' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {campaign.status}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Sent: {(campaign.sent_count || campaign.sent || 0).toLocaleString()}</p>
                      <p className="text-xs text-gray-500">Opened: {(campaign.opened_count || campaign.opened || 0).toLocaleString()}</p>
                      <p className="text-xs text-gray-500">Clicked: {(campaign.clicked_count || campaign.clicked || 0).toLocaleString()}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Lead Funnel Overview - Simplified visualization using stats */}
        <Card>
          <CardHeader>
            <CardTitle>Lead Funnel Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { stage: 'Total Leads', count: stats.totalLeads, percentage: 100, color: 'blue' },
                { stage: 'Sent Campaigns', count: recentCampaigns.reduce((sum, c) => sum + (c.sent_count || c.sent || 0), 0), percentage: stats.totalLeads > 0 ? Math.min(100, (recentCampaigns.reduce((sum, c) => sum + (c.sent_count || c.sent || 0), 0) / stats.totalLeads) * 100) : 0, color: 'indigo' },
                // Approximating 'Qualified' as Opened for now
                { stage: 'Engaged (Opened)', count: recentCampaigns.reduce((sum, c) => sum + (c.opened_count || c.opened || 0), 0), percentage: stats.totalLeads > 0 ? Math.min(100, (recentCampaigns.reduce((sum, c) => sum + (c.opened_count || c.opened || 0), 0) / stats.totalLeads) * 100) : 0, color: 'purple' },
                { stage: 'Conversions', count: recentCampaigns.reduce((sum, c) => sum + (c.converted_count || c.converted || 0), 0), percentage: stats.totalLeads > 0 ? Math.min(100, (recentCampaigns.reduce((sum, c) => sum + (c.converted_count || c.converted || 0), 0) / stats.totalLeads) * 100) : 0, color: 'green' },
              ].map((stage, index) => (
                <div key={index}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-900">{stage.stage}</span>
                    <span className="text-sm text-gray-600">{stage.count.toLocaleString()} ({stage.percentage.toFixed(1)}%)</span>
                  </div>
                  <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full bg-${stage.color}-500`}
                      style={{ width: `${stage.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}