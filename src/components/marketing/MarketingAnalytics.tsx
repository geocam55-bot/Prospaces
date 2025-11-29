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
  Activity
} from 'lucide-react';
import type { User } from '../../App';

interface MarketingAnalyticsProps {
  user: User;
}

export function MarketingAnalytics({ user }: MarketingAnalyticsProps) {
  const channelPerformance = [
    { channel: 'Email', sent: 15420, opened: 4389, clicked: 982, converted: 156, revenue: 87500, cost: 2100 },
    { channel: 'SMS', sent: 8950, opened: 7605, clicked: 1521, converted: 203, revenue: 101500, cost: 1800 },
    { channel: 'Facebook Ads', sent: 45000, opened: 13500, clicked: 2250, converted: 315, revenue: 157500, cost: 8500 },
    { channel: 'Instagram', sent: 32000, opened: 9600, clicked: 1920, converted: 256, revenue: 128000, cost: 6400 },
    { channel: 'LinkedIn', sent: 12500, opened: 3750, clicked: 625, converted: 94, revenue: 94000, cost: 3750 },
  ];

  const campaignAttribution = [
    { campaign: 'Summer Product Launch', leads: 1245, opportunities: 342, customers: 89, revenue: 445000, roi: 312, cost: 12000 },
    { campaign: 'Re-engagement Campaign', leads: 892, opportunities: 267, customers: 67, revenue: 335000, roi: 287, cost: 9500 },
    { campaign: 'Webinar Series Q1', leads: 1567, opportunities: 423, customers: 124, revenue: 620000, roi: 345, cost: 15000 },
    { campaign: 'Free Trial Promotion', leads: 2134, opportunities: 598, customers: 187, revenue: 935000, roi: 421, cost: 18500 },
    { campaign: 'Partner Referral Program', leads: 734, opportunities: 198, customers: 56, revenue: 280000, roi: 289, cost: 8200 },
  ];

  const funnelData = [
    { stage: 'Awareness', count: 125340, dropoff: 0 },
    { stage: 'Interest', count: 78920, dropoff: 37 },
    { stage: 'Consideration', count: 45680, dropoff: 42 },
    { stage: 'Intent', count: 16290, dropoff: 64 },
    { stage: 'Purchase', count: 8945, dropoff: 45 },
  ];

  const contentPerformance = [
    { title: 'Ultimate Guide to CRM Implementation', type: 'eBook', downloads: 3456, views: 12340, leads: 892, revenue: 445000 },
    { title: 'Webinar: Sales Automation Best Practices', type: 'Webinar', downloads: 2134, views: 8920, leads: 623, revenue: 311500 },
    { title: 'Case Study: Enterprise Success Story', type: 'Case Study', downloads: 1890, views: 6780, leads: 478, revenue: 239000 },
    { title: 'Industry Report 2025', type: 'Report', downloads: 4567, views: 15670, leads: 1234, revenue: 617000 },
    { title: 'Product Demo Video Series', type: 'Video', downloads: 0, views: 23450, leads: 1567, revenue: 783500 },
    { title: 'ROI Calculator Tool', type: 'Interactive', downloads: 2890, views: 9340, leads: 734, revenue: 367000 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl text-gray-900">Marketing Analytics</h2>
          <p className="text-sm text-gray-600 mt-1">Track performance and optimize your campaigns</p>
        </div>
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

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="channels">Channels</TabsTrigger>
          <TabsTrigger value="attribution">Attribution</TabsTrigger>
          <TabsTrigger value="funnel">Funnel</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { 
                title: 'Total Revenue', 
                value: '$0', 
                change: '+0%', 
                trend: 'up', 
                icon: DollarSign,
                color: 'green' 
              },
              { 
                title: 'Marketing ROI', 
                value: '0%', 
                change: '+0 points', 
                trend: 'up', 
                icon: TrendingUp,
                color: 'blue' 
              },
              { 
                title: 'Conversion Rate', 
                value: '0%', 
                change: '+0%', 
                trend: 'up', 
                icon: Target,
                color: 'purple' 
              },
              { 
                title: 'Cost per Lead', 
                value: '$0', 
                change: '-$0', 
                trend: 'down', 
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
                          {metric.trend === 'up' ? (
                            <TrendingUp className="h-3 w-3 text-green-600" />
                          ) : (
                            <TrendingDown className="h-3 w-3 text-green-600" />
                          )}
                          <span className="text-xs text-green-600">{metric.change}</span>
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

          {/* Performance Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Performance Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-end justify-between gap-2">
                {[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0].map((value, index) => (
                  <div key={index} className="flex-1 flex flex-col items-center gap-2">
                    <div className="w-full bg-blue-500 rounded-t" style={{ height: `${value}%` }} />
                    <span className="text-xs text-gray-500">{index + 1}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-center gap-8 mt-6">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-blue-500" />
                  <span className="text-sm text-gray-600">Revenue</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-green-500" />
                  <span className="text-sm text-gray-600">Conversions</span>
                </div>
              </div>
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
                      <th className="text-left py-3 px-4 text-sm text-gray-600">ROI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {channelPerformance.map((channel) => (
                      <tr key={channel.channel} className="border-b border-gray-100">
                        <td className="py-3 px-4 text-sm text-gray-900">{channel.channel}</td>
                        <td className="py-3 px-4 text-sm text-gray-600">{channel.sent.toLocaleString()}</td>
                        <td className="py-3 px-4">
                          <div>
                            <p className="text-sm text-gray-900">{channel.opened.toLocaleString()}</p>
                            <p className="text-xs text-gray-500">
                              {((channel.opened / channel.sent) * 100).toFixed(1)}%
                            </p>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div>
                            <p className="text-sm text-gray-900">{channel.clicked.toLocaleString()}</p>
                            <p className="text-xs text-gray-500">
                              {((channel.clicked / channel.opened) * 100).toFixed(1)}%
                            </p>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div>
                            <p className="text-sm text-gray-900">{channel.converted}</p>
                            <p className="text-xs text-green-600">
                              {((channel.converted / channel.sent) * 100).toFixed(1)}%
                            </p>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-900">
                          ${channel.revenue.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-sm text-green-600">
                          {((channel.revenue / (channel.sent * 0.5)) * 100).toFixed(0)}%
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
                      <th className="text-left py-3 px-4 text-sm text-gray-600">Leads</th>
                      <th className="text-left py-3 px-4 text-sm text-gray-600">Opportunities</th>
                      <th className="text-left py-3 px-4 text-sm text-gray-600">Customers</th>
                      <th className="text-left py-3 px-4 text-sm text-gray-600">Revenue</th>
                      <th className="text-left py-3 px-4 text-sm text-gray-600">ROI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {campaignAttribution.map((campaign) => (
                      <tr key={campaign.campaign} className="border-b border-gray-100">
                        <td className="py-3 px-4 text-sm text-gray-900">{campaign.campaign}</td>
                        <td className="py-3 px-4 text-sm text-gray-600">{campaign.leads}</td>
                        <td className="py-3 px-4">
                          <div>
                            <p className="text-sm text-gray-900">{campaign.opportunities}</p>
                            <p className="text-xs text-gray-500">
                              {((campaign.opportunities / campaign.leads) * 100).toFixed(1)}%
                            </p>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div>
                            <p className="text-sm text-gray-900">{campaign.customers}</p>
                            <p className="text-xs text-green-600">
                              {((campaign.customers / campaign.leads) * 100).toFixed(1)}%
                            </p>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-900">
                          ${campaign.revenue.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-sm text-green-600">
                          {campaign.roi}%
                        </td>
                      </tr>
                    ))}
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
                        className="h-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center text-white"
                        style={{ width: `${(stage.count / funnelData[0].count) * 100}%` }}
                      >
                        {((stage.count / funnelData[0].count) * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 p-4 bg-blue-50 rounded-lg">
                <h3 className="text-sm text-gray-900 mb-2">Optimization Suggestions</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• Largest drop-off is between Consideration → Intent (64.3%)</li>
                  <li>• Consider retargeting campaigns for users in Consideration stage</li>
                  <li>• Overall conversion rate: {((funnelData[4].count / funnelData[0].count) * 100).toFixed(2)}%</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="content" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Content Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-sm text-gray-600">Content</th>
                      <th className="text-left py-3 px-4 text-sm text-gray-600">Type</th>
                      <th className="text-left py-3 px-4 text-sm text-gray-600">Engagement</th>
                      <th className="text-left py-3 px-4 text-sm text-gray-600">Leads Generated</th>
                      <th className="text-left py-3 px-4 text-sm text-gray-600">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contentPerformance.map((content) => (
                      <tr key={content.title} className="border-b border-gray-100">
                        <td className="py-3 px-4 text-sm text-gray-900">{content.title}</td>
                        <td className="py-3 px-4">
                          <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">
                            {content.type}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {content.downloads || content.views?.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-900">{content.leads}</td>
                        <td className="py-3 px-4 text-sm text-green-600">
                          ${content.revenue.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}