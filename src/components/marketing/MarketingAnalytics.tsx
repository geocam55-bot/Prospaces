import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { 
  TrendingUp, 
  TrendingDown,
  Mail,
  MousePointer,
  DollarSign,
  Users,
  Target,
  BarChart3,
  PieChart,
  Activity,
  MessageSquare,
  Facebook,
  Instagram,
  Linkedin
} from 'lucide-react';
import type { User } from '../../App';
import { campaignsAPI } from '../../utils/api';

interface MarketingAnalyticsProps {
  user: User;
}

export function MarketingAnalytics({ user }: MarketingAnalyticsProps) {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30days');

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const { campaigns: data } = await campaignsAPI.getAll();
        setCampaigns(data || []);
      } catch (error) {
        console.error('Error loading campaigns for analytics:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [user.organizationId]);

  // Aggregate data from campaigns
  const totalSent = campaigns.reduce((sum, c) => sum + (c.sent_count || c.sent || 0), 0);
  const totalOpened = campaigns.reduce((sum, c) => sum + (c.opened_count || c.opened || 0), 0);
  const totalClicked = campaigns.reduce((sum, c) => sum + (c.clicked_count || c.clicked || c.landing_page_clicks || 0), 0);
  const totalConverted = campaigns.reduce((sum, c) => sum + (c.converted_count || c.converted || 0), 0);
  const totalRevenue = campaigns.reduce((sum, c) => sum + (c.revenue || 0), 0);
  
  // Calculate specific metrics
  const conversionRate = totalSent > 0 ? ((totalConverted / totalSent) * 100).toFixed(1) : '0.0';
  
  // Group by Channel (Type)
  const channelStats: Record<string, any> = {};
  
  campaigns.forEach(c => {
    const type = c.type || 'email';
    const channelName = type.charAt(0).toUpperCase() + type.slice(1);
    
    if (!channelStats[channelName]) {
      channelStats[channelName] = { 
        channel: channelName, 
        sent: 0, 
        opened: 0, 
        clicked: 0, 
        converted: 0, 
        revenue: 0 
      };
    }
    
    channelStats[channelName].sent += (c.sent_count || c.sent || 0);
    channelStats[channelName].opened += (c.opened_count || c.opened || 0);
    channelStats[channelName].clicked += (c.clicked_count || c.clicked || c.landing_page_clicks || 0);
    channelStats[channelName].converted += (c.converted_count || c.converted || 0);
    channelStats[channelName].revenue += (c.revenue || 0);
  });
  
  const channelPerformance = Object.values(channelStats);
  
  // Fallback for channel performance if empty (so chart isn't just blank)
  if (channelPerformance.length === 0) {
    channelPerformance.push({ channel: 'Email', sent: 0, opened: 0, clicked: 0, converted: 0, revenue: 0 });
  }

  // Funnel Data
  const funnelData = [
    { stage: 'Sent', count: totalSent, dropoff: 0 },
    { stage: 'Opened', count: totalOpened, dropoff: totalSent > 0 ? (100 - (totalOpened/totalSent)*100).toFixed(1) : 0 },
    { stage: 'Clicked', count: totalClicked, dropoff: totalOpened > 0 ? (100 - (totalClicked/totalOpened)*100).toFixed(1) : 0 },
    { stage: 'Converted', count: totalConverted, dropoff: totalClicked > 0 ? (100 - (totalConverted/totalClicked)*100).toFixed(1) : 0 },
  ];

  // Content Performance (Placeholder as we don't have this data yet)
  const contentPerformance: any[] = [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl text-gray-900">Marketing Analytics</h2>
          <p className="text-sm text-gray-600 mt-1">Track performance and optimize your campaigns</p>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
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

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="channels">Channels</TabsTrigger>
          <TabsTrigger value="attribution">Attribution</TabsTrigger>
          <TabsTrigger value="funnel">Funnel</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { 
                title: 'Total Revenue', 
                value: `$${totalRevenue.toLocaleString()}`, 
                change: 'from campaigns', 
                trend: 'neutral', 
                icon: DollarSign,
                color: 'green' 
              },
              { 
                title: 'Campaigns', 
                value: campaigns.length.toString(), 
                change: 'total', 
                trend: 'neutral', 
                icon: BarChart3,
                color: 'blue' 
              },
              { 
                title: 'Conversion Rate', 
                value: `${conversionRate}%`, 
                change: 'overall', 
                trend: 'neutral', 
                icon: Target,
                color: 'purple' 
              },
              { 
                title: 'Total Leads', 
                value: totalConverted.toLocaleString(), 
                change: 'conversions', 
                trend: 'neutral', 
                icon: Users,
                color: 'orange' 
              },
            ].map((metric) => {
              const Icon = metric.icon;
              return (
                <Card key={metric.title}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">{metric.title}</p>
                        <p className="text-2xl text-gray-900 mt-2">{metric.value}</p>
                        <div className="flex items-center gap-1 mt-2">
                          <span className="text-xs text-gray-500">{metric.change}</span>
                        </div>
                      </div>
                      <div className={`h-12 w-12 rounded-lg bg-${metric.color}-100 flex items-center justify-center`}>
                        <Icon className={`h-6 w-6 text-${metric.color}-600`} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Performance Chart Placeholder - Could be replaced with Recharts if we have historical data points */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Campaign Performance</CardTitle>
            </CardHeader>
            <CardContent>
              {campaigns.length > 0 ? (
                <div className="h-64 flex items-end justify-between gap-2 px-2">
                  {campaigns.slice(0, 12).reverse().map((c, index) => {
                    // Simple visualization: bar height relative to max revenue or sent count
                    const maxVal = Math.max(...campaigns.map(cam => cam.revenue || 100));
                    const height = c.revenue ? Math.max(10, (c.revenue / maxVal) * 100) : 5;
                    return (
                      <div key={c.id || index} className="flex-1 flex flex-col items-center gap-2 group relative">
                        <div className="w-full bg-blue-500 rounded-t opacity-80 hover:opacity-100 transition-opacity" style={{ height: `${height}%` }}>
                          <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block bg-black text-white text-xs p-2 rounded whitespace-nowrap z-10">
                            {c.name}<br/>${(c.revenue || 0).toLocaleString()}
                          </div>
                        </div>
                        <span className="text-xs text-gray-500 truncate w-full text-center">{c.name?.substring(0, 6)}..</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-400">
                  No campaign data available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="channels" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Channel Performance Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-sm text-gray-600">Channel</th>
                      <th className="text-left py-3 px-4 text-sm text-gray-600">Sent/Reached</th>
                      <th className="text-left py-3 px-4 text-sm text-gray-600">Opened</th>
                      <th className="text-left py-3 px-4 text-sm text-gray-600">Clicked</th>
                      <th className="text-left py-3 px-4 text-sm text-gray-600">Converted</th>
                      <th className="text-left py-3 px-4 text-sm text-gray-600">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {channelPerformance.map((channel) => (
                      <tr key={channel.channel} className="border-b border-gray-100">
                        <td className="py-3 px-4 text-sm text-gray-900 flex items-center gap-2">
                          {channel.channel === 'Email' && <Mail className="h-4 w-4 text-gray-500" />}
                          {channel.channel === 'Sms' && <MessageSquare className="h-4 w-4 text-gray-500" />}
                          {channel.channel === 'Facebook' && <Facebook className="h-4 w-4 text-gray-500" />}
                          {channel.channel}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">{channel.sent.toLocaleString()}</td>
                        <td className="py-3 px-4">
                          <div>
                            <p className="text-sm text-gray-900">{channel.opened.toLocaleString()}</p>
                            <p className="text-xs text-gray-500">
                              {channel.sent > 0 ? ((channel.opened / channel.sent) * 100).toFixed(1) : 0}%
                            </p>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div>
                            <p className="text-sm text-gray-900">{channel.clicked.toLocaleString()}</p>
                            <p className="text-xs text-gray-500">
                              {channel.opened > 0 ? ((channel.clicked / channel.opened) * 100).toFixed(1) : 0}%
                            </p>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div>
                            <p className="text-sm text-gray-900">{channel.converted}</p>
                            <p className="text-xs text-green-600">
                              {channel.sent > 0 ? ((channel.converted / channel.sent) * 100).toFixed(1) : 0}%
                            </p>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-900">
                          ${channel.revenue.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attribution" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Campaign Attribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-sm text-gray-600">Campaign</th>
                      <th className="text-left py-3 px-4 text-sm text-gray-600">Type</th>
                      <th className="text-left py-3 px-4 text-sm text-gray-600">Sent</th>
                      <th className="text-left py-3 px-4 text-sm text-gray-600">Converted</th>
                      <th className="text-left py-3 px-4 text-sm text-gray-600">Revenue</th>
                      <th className="text-left py-3 px-4 text-sm text-gray-600">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {campaigns.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-gray-500">No campaigns found</td>
                      </tr>
                    ) : (
                      campaigns.map((campaign) => (
                        <tr key={campaign.id} className="border-b border-gray-100">
                          <td className="py-3 px-4 text-sm text-gray-900 font-medium">{campaign.name}</td>
                          <td className="py-3 px-4 text-sm text-gray-600 capitalize">{campaign.type}</td>
                          <td className="py-3 px-4 text-sm text-gray-600">{(campaign.sent_count || campaign.sent || 0).toLocaleString()}</td>
                          <td className="py-3 px-4 text-sm text-gray-600">{(campaign.converted_count || campaign.converted || 0).toLocaleString()}</td>
                          <td className="py-3 px-4 text-sm text-green-600">
                            ${(campaign.revenue || 0).toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600">
                            {campaign.created_at ? new Date(campaign.created_at).toLocaleDateString() : '-'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="funnel" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Marketing Funnel Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {funnelData.map((stage, index) => (
                  <div key={stage.stage}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-900">{stage.stage}</span>
                        {index > 0 && (
                          <span className="text-xs text-red-600">-{stage.dropoff}% drop-off</span>
                        )}
                      </div>
                      <span className="text-sm text-gray-900">{stage.count.toLocaleString()}</span>
                    </div>
                    <div className="h-12 bg-gray-200 rounded-lg overflow-hidden relative">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center text-white transition-all duration-500"
                        style={{ width: `${funnelData[0].count > 0 ? (stage.count / funnelData[0].count) * 100 : 0}%` }}
                      >
                        {funnelData[0].count > 0 ? ((stage.count / funnelData[0].count) * 100).toFixed(1) : 0}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 p-4 bg-blue-50 rounded-lg">
                <h3 className="text-sm text-gray-900 mb-2">Funnel Insights</h3>
                {totalSent > 0 ? (
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li>• Open rate: {((totalOpened / totalSent) * 100).toFixed(1)}%</li>
                    <li>• Click-through rate: {totalOpened > 0 ? ((totalClicked / totalOpened) * 100).toFixed(1) : 0}% of opens</li>
                    <li>• Overall conversion rate: {conversionRate}%</li>
                  </ul>
                ) : (
                  <p className="text-sm text-gray-600">Start sending campaigns to see funnel insights.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}