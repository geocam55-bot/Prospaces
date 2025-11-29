import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { 
  TrendingUp, 
  TrendingDown,
  DollarSign, 
  Target, 
  CheckCircle, 
  Calendar,
  Mail,
  Award
} from 'lucide-react';
import type { User } from '../../App';
import { createClient } from '../../utils/supabase/client';

interface ManagerSummaryReportsProps {
  user: User;
  showCost?: boolean;
}

export function ManagerSummaryReports({ user, showCost = false }: ManagerSummaryReportsProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalOpportunities: 0,
    pipelineValue: 0,
    pipelineCost: 0,
    winRate: 0,
    tasksCompleted: 0,
    upcomingAppointments: 0,
    activeCampaigns: 0,
  });
  const [previousStats, setPreviousStats] = useState({
    totalOpportunities: 0,
    pipelineValue: 0,
    tasksCompleted: 0,
    winRate: 0,
    upcomingAppointments: 0,
    activeCampaigns: 0,
  });
  const [monthlyTrend, setMonthlyTrend] = useState<any[]>([]);
  const [teamPerformance, setTeamPerformance] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, [user.organizationId]);

  const fetchData = async () => {
    const supabase = createClient();
    
    try {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

      console.log('📊 [ManagerSummaryReports] Fetching data for org:', user.organizationId);

      // Fetch opportunities (filtered by organization)
      const { data: opportunities, error: oppError } = await supabase
        .from('opportunities')
        .select('*')
        .eq('organization_id', user.organizationId);

      if (oppError) {
        console.error('❌ [ManagerSummaryReports] Error fetching opportunities:', oppError);
      } else {
        console.log('✅ [ManagerSummaryReports] Fetched opportunities:', opportunities?.length || 0);
      }

      // Fetch tasks (filtered by organization)
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .eq('organization_id', user.organizationId)
        .eq('status', 'completed');

      if (tasksError) {
        console.error('❌ [ManagerSummaryReports] Error fetching tasks:', tasksError);
      }

      // Fetch appointments (filtered by organization)
      const { data: appointments, error: apptError } = await supabase
        .from('appointments')
        .select('*')
        .eq('organization_id', user.organizationId)
        .gte('start_time', new Date().toISOString());

      if (apptError) {
        console.error('❌ [ManagerSummaryReports] Error fetching appointments:', apptError);
      }

      // Fetch campaigns (filtered by organization)
      const { data: campaigns, error: campaignsError } = await supabase
        .from('campaigns')
        .select('*')
        .eq('organization_id', user.organizationId)
        .eq('status', 'active');

      if (campaignsError) {
        console.error('❌ [ManagerSummaryReports] Error fetching campaigns:', campaignsError);
      }

      // Fetch users for team performance (filtered by organization)
      const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select('*')
        .eq('organization_id', user.organizationId);

      if (usersError) {
        console.error('❌ [ManagerSummaryReports] Error fetching users:', usersError);
      }

      // Create user lookup map
      const userMap = new Map(users?.map(u => [u.id, u.name]) || []);

      // Calculate current period stats
      const currentOpps = opportunities?.filter(o => new Date(o.created_at) >= thirtyDaysAgo) || [];
      const previousOpps = opportunities?.filter(o => {
        const created = new Date(o.created_at);
        return created >= sixtyDaysAgo && created < thirtyDaysAgo;
      }) || [];

      const currentTasks = tasks?.filter(t => new Date(t.updated_at) >= thirtyDaysAgo) || [];
      const previousTasks = tasks?.filter(t => {
        const updated = new Date(t.updated_at);
        return updated >= sixtyDaysAgo && updated < thirtyDaysAgo;
      }) || [];

      const totalOpps = opportunities?.length || 0;
      const pipelineValue = opportunities?.reduce((sum, opp) => sum + (opp.value || 0), 0) || 0;
      const pipelineCost = opportunities?.reduce((sum, opp) => sum + (opp.cost || 0), 0) || 0;
      const closedWon = opportunities?.filter(o => o.stage === 'Closed Won').length || 0;
      const closedLost = opportunities?.filter(o => o.stage === 'Closed Lost').length || 0;
      const winRate = closedWon + closedLost > 0 ? Math.round((closedWon / (closedWon + closedLost)) * 100) : 0;

      // Calculate previous period stats for comparison
      const prevClosedWon = previousOpps.filter(o => o.stage === 'Closed Won').length;
      const prevClosedLost = previousOpps.filter(o => o.stage === 'Closed Lost').length;
      const prevWinRate = prevClosedWon + prevClosedLost > 0 ? Math.round((prevClosedWon / (prevClosedLost + prevClosedWon)) * 100) : 0;
      const prevPipelineValue = previousOpps.reduce((sum, opp) => sum + (opp.value || 0), 0);

      setStats({
        totalOpportunities: totalOpps,
        pipelineValue,
        pipelineCost,
        winRate,
        tasksCompleted: tasks?.length || 0,
        upcomingAppointments: appointments?.length || 0,
        activeCampaigns: campaigns?.length || 0,
      });

      setPreviousStats({
        totalOpportunities: previousOpps.length,
        pipelineValue: prevPipelineValue,
        tasksCompleted: previousTasks.length,
        winRate: prevWinRate,
        upcomingAppointments: 0,
        activeCampaigns: 0,
      });

      // Calculate team performance
      if (users && opportunities && tasks) {
        const teamStats = users
          .map(u => {
            const userOpps = opportunities.filter(o => o.assigned_to === u.id);
            const userTasks = tasks.filter(t => t.assigned_to === u.id);
            const userClosedWon = userOpps.filter(o => o.stage === 'Closed Won').length;
            const userClosedTotal = userOpps.filter(o => o.stage === 'Closed Won' || o.stage === 'Closed Lost').length;
            
            return {
              name: u.name,
              opportunities: userOpps.length,
              value: `$${Math.round(userOpps.reduce((sum, o) => sum + (o.value || 0), 0) / 1000)}K`,
              winRate: userClosedTotal > 0 ? Math.round((userClosedWon / userClosedTotal) * 100) : 0,
              tasksCompleted: userTasks.length,
            };
          })
          .filter(member => member.opportunities > 0 || member.tasksCompleted > 0)
          .sort((a, b) => b.opportunities - a.opportunities)
          .slice(0, 5);
        
        setTeamPerformance(teamStats);
      }

      // Get recent activity (from opportunities) with user names
      if (opportunities) {
        const recent = opportunities
          .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
          .slice(0, 5)
          .map(opp => ({
            type: opp.stage === 'Closed Won' ? 'won' : opp.stage === 'Closed Lost' ? 'lost' : 'meeting',
            description: opp.name,
            value: `$${Math.round((opp.value || 0) / 1000)}K`,
            user: userMap.get(opp.assigned_to) || 'Unassigned',
            time: getRelativeTime(opp.updated_at),
          }));
        
        setRecentActivity(recent);
      }

      // Get monthly trend data for current year
      if (opportunities) {
        const currentYear = new Date().getFullYear();
        const trendData = Array.from({ length: 12 }, (_, i) => {
          const monthStart = new Date(currentYear, i, 1);
          const monthEnd = new Date(currentYear, i + 1, 0, 23, 59, 59);
          
          const monthOpps = opportunities.filter(o => {
            const created = new Date(o.created_at);
            return created >= monthStart && created <= monthEnd;
          });
          
          const monthValue = monthOpps.reduce((sum, o) => sum + (o.value || 0), 0);
          
          return {
            month: monthStart.toLocaleString('default', { month: 'short' }),
            value: monthValue,
            count: monthOpps.length
          };
        });
        
        setMonthlyTrend(trendData);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching manager summary data:', error);
      setError('Failed to fetch data. Please try again later.');
      setLoading(false);
    }
  };

  const getRelativeTime = (date: string) => {
    const now = new Date();
    const past = new Date(date);
    const diffMs = now.getTime() - past.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return past.toLocaleDateString();
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">
      <div className="text-gray-500">Loading reports...</div>
    </div>;
  }

  if (error) {
    return <div className="flex items-center justify-center h-64">
      <div className="text-red-500">{error}</div>
    </div>;
  }

  // Calculate percentage changes
  const calculateChange = (current: number, previous: number): { change: string; trend: 'up' | 'down' } => {
    if (previous === 0) {
      return { change: current > 0 ? '+100%' : '0%', trend: current > 0 ? 'up' : 'down' };
    }
    const percentChange = Math.round(((current - previous) / previous) * 100);
    return {
      change: percentChange >= 0 ? `+${percentChange}%` : `${percentChange}%`,
      trend: percentChange >= 0 ? 'up' : 'down'
    };
  };

  const oppsChange = calculateChange(stats.totalOpportunities, previousStats.totalOpportunities);
  const valueChange = calculateChange(stats.pipelineValue, previousStats.pipelineValue);
  const winRateChange = calculateChange(stats.winRate, previousStats.winRate);
  const tasksChange = calculateChange(stats.tasksCompleted, previousStats.tasksCompleted);

  const kpis = [
    {
      title: 'Total Opportunities',
      value: stats.totalOpportunities.toString(),
      change: oppsChange.change,
      trend: oppsChange.trend,
      icon: Target,
      color: 'blue'
    },
    {
      title: showCost ? 'Pipeline Cost' : 'Pipeline Value',
      value: showCost 
        ? `$${(stats.pipelineCost / 1000000).toFixed(1)}M`
        : `$${(stats.pipelineValue / 1000000).toFixed(1)}M`,
      change: valueChange.change,
      trend: valueChange.trend,
      icon: DollarSign,
      color: 'green'
    },
    {
      title: 'Win Rate',
      value: `${stats.winRate}%`,
      change: winRateChange.change,
      trend: winRateChange.trend,
      icon: Award,
      color: 'purple'
    },
    {
      title: 'Tasks Completed',
      value: stats.tasksCompleted.toString(),
      change: tasksChange.change,
      trend: tasksChange.trend,
      icon: CheckCircle,
      color: 'emerald'
    },
    {
      title: 'Upcoming Appointments',
      value: stats.upcomingAppointments.toString(),
      change: `${stats.upcomingAppointments} scheduled`,
      trend: 'up',
      icon: Calendar,
      color: 'orange'
    },
    {
      title: 'Campaign Performance',
      value: `${stats.activeCampaigns} Active`,
      change: `${stats.activeCampaigns} running`,
      trend: 'up',
      icon: Mail,
      color: 'indigo'
    },
  ];

  return (
    <div className="space-y-6">
      {/* Debug Info - Remove after testing */}
      {process.env.NODE_ENV === 'development' && (
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="pt-4">
            <p className="text-sm"><strong>Debug Info:</strong></p>
            <p className="text-xs">Org ID: {user.organizationId}</p>
            <p className="text-xs">Opportunities: {stats.totalOpportunities}</p>
            <p className="text-xs">Tasks: {stats.tasksCompleted}</p>
            <p className="text-xs">Appointments: {stats.upcomingAppointments}</p>
          </CardContent>
        </Card>
      )}

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.title}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm text-gray-600">{kpi.title}</p>
                    <p className="text-2xl mt-2 text-gray-900">{kpi.value}</p>
                    <div className="flex items-center gap-1 mt-2">
                      {kpi.trend === 'up' ? (
                        <TrendingUp className="h-3 w-3 text-green-600" />
                      ) : (
                        <TrendingDown className="h-3 w-3 text-red-600" />
                      )}
                      <span className={`text-xs ${
                        kpi.trend === 'up' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {kpi.change}
                      </span>
                    </div>
                  </div>
                  <div className={`h-12 w-12 rounded-lg bg-${kpi.color}-100 flex items-center justify-center`}>
                    <Icon className={`h-6 w-6 text-${kpi.color}-600`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Team Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Team Performance</CardTitle>
          </CardHeader>
          <CardContent>
            {teamPerformance.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-2 text-sm text-gray-600">Team Member</th>
                      <th className="text-left py-3 px-2 text-sm text-gray-600">Opps</th>
                      <th className="text-left py-3 px-2 text-sm text-gray-600">Value</th>
                      <th className="text-left py-3 px-2 text-sm text-gray-600">Win Rate</th>
                      <th className="text-left py-3 px-2 text-sm text-gray-600">Tasks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teamPerformance.map((member, index) => (
                      <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-2 text-sm text-gray-900">{member.name}</td>
                        <td className="py-3 px-2 text-sm text-gray-600">{member.opportunities}</td>
                        <td className="py-3 px-2 text-sm text-gray-900">{member.value}</td>
                        <td className="py-3 px-2">
                          <span className="text-sm text-green-600">{member.winRate}%</span>
                        </td>
                        <td className="py-3 px-2 text-sm text-gray-600">{member.tasksCompleted}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-8 text-center text-gray-500">
                No team performance data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivity.length > 0 ? (
              <div className="space-y-4">
                {recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-start gap-3 pb-4 border-b last:border-b-0 last:pb-0">
                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      activity.type === 'won' ? 'bg-green-100' :
                      activity.type === 'lost' ? 'bg-red-100' :
                      activity.type === 'meeting' ? 'bg-blue-100' :
                      'bg-purple-100'
                    }`}>
                      {activity.type === 'won' && <TrendingUp className="h-5 w-5 text-green-600" />}
                      {activity.type === 'lost' && <TrendingDown className="h-5 w-5 text-red-600" />}
                      {activity.type === 'meeting' && <Calendar className="h-5 w-5 text-blue-600" />}
                      {activity.type === 'bid' && <Target className="h-5 w-5 text-purple-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900">{activity.description}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-500">{activity.user}</span>
                        <span className="text-xs text-gray-400">•</span>
                        <span className="text-xs text-gray-500">{activity.time}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-900">{activity.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-gray-500">
                No recent activity to display
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pipeline Overview Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Pipeline Trend</CardTitle>
        </CardHeader>
        <CardContent>
          {monthlyTrend.length > 0 ? (
            <>
              <div className="h-64 flex items-end justify-between gap-2">
                {(() => {
                  const maxValue = Math.max(...monthlyTrend.map(d => d.value), 1);
                  return monthlyTrend.map((data, index) => {
                    const heightPercent = maxValue > 0 ? (data.value / maxValue) * 100 : 0;
                    return (
                      <div key={index} className="flex-1 flex flex-col items-center gap-2 group">
                        <div 
                          className="w-full bg-blue-500 rounded-t hover:bg-blue-600 transition-colors cursor-pointer relative" 
                          style={{ height: `${Math.max(heightPercent, 2)}%` }}
                        >
                          <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                            ${(data.value / 1000).toFixed(0)}K
                          </div>
                        </div>
                        <span className="text-xs text-gray-500">{data.month}</span>
                      </div>
                    );
                  });
                })()}
              </div>
              <div className="flex items-center justify-center gap-8 mt-6">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-blue-500" />
                  <span className="text-sm text-gray-600">Pipeline Value</span>
                </div>
              </div>
            </>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              No data available for this year
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}