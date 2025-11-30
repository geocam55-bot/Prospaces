import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { TrendingUp, TrendingDown, Mail, Users, MousePointer, DollarSign, Target, Zap } from 'lucide-react';
import type { User } from '../../App';

interface MarketingDashboardProps {
  user: User;
}

export function MarketingDashboard({ user }: MarketingDashboardProps) {
  const stats = [
    {
      title: 'Active Campaigns',
      value: '0',
      change: '+0 this week',
      trend: 'up',
      icon: Mail,
      color: 'blue'
    },
    {
      title: 'Total Leads',
      value: '0',
      change: '+0% from last month',
      trend: 'up',
      icon: Users,
      color: 'green'
    },
    {
      title: 'Avg. Open Rate',
      value: '0%',
      change: '+0% from last month',
      trend: 'up',
      icon: MousePointer,
      color: 'purple'
    },
    {
      title: 'Conversion Rate',
      value: '0%',
      change: '0% from last month',
      trend: 'neutral',
      icon: Target,
      color: 'orange'
    },
    {
      title: 'Revenue Attribution',
      value: '$0',
      change: '+$0 this month',
      trend: 'up',
      icon: DollarSign,
      color: 'emerald'
    },
    {
      title: 'Active Journeys',
      value: '0',
      change: '0 paused',
      trend: 'neutral',
      icon: Zap,
      color: 'indigo'
    },
  ];

  const recentCampaigns: any[] = [];

  const topPerformingContent: any[] = [];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stats.map((stat) => {
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
              {recentCampaigns.map((campaign, index) => (
                <div key={index} className="flex items-center justify-between pb-4 border-b last:border-b-0 last:pb-0">
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">{campaign.name}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-gray-500">{campaign.type}</span>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        campaign.status === 'Active' ? 'bg-green-100 text-green-700' :
                        campaign.status === 'Scheduled' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {campaign.status}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Sent: {campaign.sent}</p>
                    <p className="text-xs text-gray-500">Opened: {campaign.opened}</p>
                    <p className="text-xs text-gray-500">Clicked: {campaign.clicked}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Performing Content */}
        <Card>
          <CardHeader>
            <CardTitle>Top Performing Content</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topPerformingContent.map((content, index) => (
                <div key={index} className="flex items-center justify-between pb-4 border-b last:border-b-0 last:pb-0">
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">{content.title}</p>
                    <p className="text-xs text-gray-500 mt-1">{content.type}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-900">{content.clicks} clicks</p>
                    <p className="text-xs text-green-600 mt-1">{content.conversions} conversions</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lead Funnel Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Lead Funnel This Month</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { stage: 'Visitors', count: 0, percentage: 0, color: 'blue' },
              { stage: 'Leads Captured', count: 0, percentage: 0, color: 'indigo' },
              { stage: 'Qualified Leads', count: 0, percentage: 0, color: 'purple' },
              { stage: 'Opportunities', count: 0, percentage: 0, color: 'pink' },
              { stage: 'Customers', count: 0, percentage: 0, color: 'green' },
            ].map((stage, index) => (
              <div key={index}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-900">{stage.stage}</span>
                  <span className="text-sm text-gray-600">{stage.count.toLocaleString()} ({stage.percentage}%)</span>
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
  );
}