import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { TrendingUp, TrendingDown, Mail, Users, Target, DollarSign } from 'lucide-react';
import type { User } from '../../App';
import { createClient } from '../../utils/supabase/client';

interface MarketingPerformanceReportsProps {
  user: User;
}

export function MarketingPerformanceReports({ user }: MarketingPerformanceReportsProps) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    activeCampaigns: 0,
    totalLeads: 0,
    conversionRate: 0,
    avgROI: 0,
  });
  const [campaigns, setCampaigns] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, [user.organizationId]);

  const fetchData = async () => {
    const supabase = createClient();
    
    try {
      // Fetch campaigns
      const { data: campaignsData } = await supabase
        .from('campaigns')
        .select('*')
        .eq('tenant_id', user.organizationId);

      // Fetch contacts to calculate conversion metrics
      const { data: contacts } = await supabase
        .from('contacts')
        .select('*, opportunities(id, stage, value)')
        .eq('tenant_id', user.organizationId);

      // Fetch opportunities
      const { data: opportunities } = await supabase
        .from('opportunities')
        .select('*')
        .eq('tenant_id', user.organizationId);

      if (campaignsData) {
        const active = campaignsData.filter(c => c.status === 'active').length;
        
        setStats({
          activeCampaigns: active,
          totalLeads: contacts?.length || 0,
          conversionRate: contacts && opportunities 
            ? Math.round((opportunities.filter(o => o.stage === 'Closed Won').length / contacts.length) * 100)
            : 0,
          avgROI: 245, // Placeholder
        });

        // Map campaigns with engagement data
        const campaignStats = campaignsData.map(campaign => ({
          name: campaign.name,
          status: campaign.status,
          type: campaign.type || 'Email',
          sent: campaign.sent_count || 0,
          opens: campaign.open_count || 0,
          clicks: campaign.click_count || 0,
          conversions: campaign.conversion_count || 0,
          leads: campaign.leads_generated || 0,
          spend: campaign.budget || 0,
          revenue: campaign.revenue_generated || 0,
          roi: campaign.roi || 0,
          openRate: campaign.sent_count 
            ? Math.round((campaign.open_count / campaign.sent_count) * 100)
            : 0,
          clickRate: campaign.sent_count
            ? Math.round((campaign.click_count / campaign.sent_count) * 100)
            : 0,
          conversionRate: campaign.sent_count
            ? Math.round((campaign.conversion_count / campaign.sent_count) * 100)
            : 0,
        })).slice(0, 5);

        setCampaigns(campaignStats);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching marketing performance data:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">
      <div className="text-gray-500">Loading marketing reports...</div>
    </div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl text-gray-900">Marketing Performance Reports</h2>
        <Select defaultValue="30days">
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7days">Last 7 days</SelectItem>
            <SelectItem value="30days">Last 30 days</SelectItem>
            <SelectItem value="90days">Last 90 days</SelectItem>
            <SelectItem value="year">This year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Marketing Spend</p>
                <p className="text-2xl mt-2 text-gray-900">$103K</p>
                <div className="flex items-center gap-1 mt-2">
                  <TrendingUp className="h-3 w-3 text-red-600" />
                  <span className="text-xs text-red-600">+$5K this month</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Revenue Generated</p>
                <p className="text-2xl mt-2 text-gray-900">$2.2M</p>
                <div className="flex items-center gap-1 mt-2">
                  <TrendingUp className="h-3 w-3 text-green-600" />
                  <span className="text-xs text-green-600">+18%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Average ROI</p>
                <p className="text-2xl mt-2 text-green-600">2,142%</p>
                <div className="flex items-center gap-1 mt-2">
                  <TrendingUp className="h-3 w-3 text-green-600" />
                  <span className="text-xs text-green-600">+245%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Leads Generated</p>
                <p className="text-2xl mt-2 text-gray-900">16,069</p>
                <div className="flex items-center gap-1 mt-2">
                  <TrendingUp className="h-3 w-3 text-green-600" />
                  <span className="text-xs text-green-600">+1,234</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Campaign ROI Report */}
      <Card>
        <CardHeader>
          <CardTitle>Campaign ROI Report</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm text-gray-600">Campaign</th>
                  <th className="text-left py-3 px-4 text-sm text-gray-600">Spend</th>
                  <th className="text-left py-3 px-4 text-sm text-gray-600">Revenue</th>
                  <th className="text-left py-3 px-4 text-sm text-gray-600">ROI</th>
                  <th className="text-left py-3 px-4 text-sm text-gray-600">Leads</th>
                  <th className="text-left py-3 px-4 text-sm text-gray-600">Conversions</th>
                  <th className="text-left py-3 px-4 text-sm text-gray-600">Performance</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((campaign, index) => (
                  <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm text-gray-900">{campaign.name}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-4 w-4 text-red-600" />
                        <span className="text-sm text-gray-900">{(campaign.spend / 1000).toFixed(0)}K</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-4 w-4 text-green-600" />
                        <span className="text-sm text-gray-900">{(campaign.revenue / 1000).toFixed(0)}K</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge className="bg-green-100 text-green-700">{campaign.roi.toLocaleString()}%</Badge>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4 text-blue-600" />
                        <span className="text-sm text-gray-900">{campaign.leads.toLocaleString()}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge className="bg-purple-100 text-purple-700">{campaign.conversions}</Badge>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <TrendingUp className="h-4 w-4 text-green-600" />
                        <span className="text-sm text-green-600">Excellent</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 pt-6 border-t grid grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600">Total Spend</p>
              <p className="text-2xl text-gray-900 mt-1">$58.5K</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Revenue</p>
              <p className="text-2xl text-green-600 mt-1">$2.2M</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Avg ROI</p>
              <p className="text-2xl text-green-600 mt-1">3,712%</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Conversions</p>
              <p className="text-2xl text-gray-900 mt-1">723</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Marketing Insights */}
      <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-purple-600" />
            <CardTitle>Marketing Insights</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="p-3 bg-white rounded-lg">
              <p className="text-sm text-gray-900">
                🎯 <strong>Referrals</strong> have the highest qualification rate (80%) and conversion rate (20%) - focus on expanding referral programs.
              </p>
            </div>
            <div className="p-3 bg-white rounded-lg">
              <p className="text-sm text-gray-900">
                💰 <strong>Partner Referral Program</strong> delivers the best ROI at 4,580% - consider increasing investment.
              </p>
            </div>
            <div className="p-3 bg-white rounded-lg">
              <p className="text-sm text-gray-900">
                📧 Email campaigns show strong performance with 50% qualification rate at low cost per lead ($4.89).
              </p>
            </div>
            <div className="p-3 bg-white rounded-lg">
              <p className="text-sm text-gray-900">
                📊 Overall marketing efficiency improved 18% this quarter with average ROI of 2,142%.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}