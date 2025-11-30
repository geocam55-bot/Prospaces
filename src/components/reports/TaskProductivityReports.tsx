import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { TrendingUp, TrendingDown, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import type { User } from '../../App';
import { createClient } from '../../utils/supabase/client';

interface TaskProductivityReportsProps {
  user: User;
}

export function TaskProductivityReports({ user }: TaskProductivityReportsProps) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalTasks: 0,
    completedTasks: 0,
    overdueTasks: 0,
    avgCompletionTime: 0,
    completionRate: 0,
  });
  const [tasksByStatus, setTasksByStatus] = useState<any[]>([]);
  const [tasksByPriority, setTasksByPriority] = useState<any[]>([]);
  const [teamProductivity, setTeamProductivity] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, [user.organizationId]);

  const fetchData = async () => {
    const supabase = createClient();
    
    try {
      // Fetch tasks
      const { data: tasks } = await supabase
        .from('tasks')
        .select('*, users(name)')
        .eq('tenant_id', user.organizationId);

      if (tasks) {
        const now = new Date();
        const completed = tasks.filter(t => t.status === 'completed').length;
        const overdue = tasks.filter(t => 
          t.status !== 'completed' && 
          t.due_date && 
          new Date(t.due_date) < now
        ).length;

        // Calculate average completion time
        const completedTasks = tasks.filter(t => t.status === 'completed' && t.completed_at);
        const avgTime = completedTasks.length > 0
          ? Math.round(completedTasks.reduce((sum, t) => {
              const start = new Date(t.created_at);
              const end = new Date(t.completed_at);
              return sum + (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
            }, 0) / completedTasks.length)
          : 0;

        setStats({
          totalTasks: tasks.length,
          completedTasks: completed,
          overdueTasks: overdue,
          avgCompletionTime: avgTime,
          completionRate: tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0,
        });

        // Group by status
        const statusGroups = tasks.reduce((acc: any, task) => {
          const status = task.status || 'pending';
          if (!acc[status]) {
            acc[status] = { status, count: 0 };
          }
          acc[status].count++;
          return acc;
        }, {});

        const statusData = Object.values(statusGroups).map((group: any) => ({
          ...group,
          percentage: Math.round((group.count / tasks.length) * 100),
        }));

        setTasksByStatus(statusData);

        // Group by priority
        const priorityGroups = tasks.reduce((acc: any, task) => {
          const priority = task.priority || 'medium';
          if (!acc[priority]) {
            acc[priority] = { priority, count: 0 };
          }
          acc[priority].count++;
          return acc;
        }, {});

        const priorityData = Object.values(priorityGroups).map((group: any) => ({
          ...group,
          percentage: Math.round((group.count / tasks.length) * 100),
        }));

        setTasksByPriority(priorityData);

        // Calculate team productivity
        const { data: users } = await supabase
          .from('users')
          .select('*')
          .eq('tenant_id', user.organizationId);

        if (users) {
          const productivity = users.map(u => {
            const userTasks = tasks.filter(t => t.assigned_to === u.id);
            const userCompleted = userTasks.filter(t => t.status === 'completed').length;
            const userOverdue = userTasks.filter(t => 
              t.status !== 'completed' && 
              t.due_date && 
              new Date(t.due_date) < now
            ).length;
            
            const userCompletedWithTime = userTasks.filter(t => t.status === 'completed' && t.completed_at);
            const userAvgTime = userCompletedWithTime.length > 0
              ? Math.round(userCompletedWithTime.reduce((sum, t) => {
                  const start = new Date(t.created_at);
                  const end = new Date(t.completed_at);
                  return sum + (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
                }, 0) / userCompletedWithTime.length)
              : 0;
            
            return {
              name: u.name,
              assigned: userTasks.length,
              completed: userCompleted,
              overdue: userOverdue,
              completionRate: userTasks.length > 0 
                ? Math.round((userCompleted / userTasks.length) * 100)
                : 0,
              avgCompletionTime: userAvgTime,
            };
          }).filter(p => p.assigned > 0).slice(0, 5);
          
          setTeamProductivity(productivity);
        }
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching task productivity data:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">
      <div className="text-gray-500">Loading task reports...</div>
    </div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl text-gray-900">Task & Appointment Productivity</h2>
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
                <p className="text-sm text-gray-600">Overall Completion Rate</p>
                <p className="text-2xl mt-2 text-gray-900">{stats.completionRate}%</p>
                <div className="flex items-center gap-1 mt-2">
                  <TrendingUp className="h-3 w-3 text-green-600" />
                  <span className="text-xs text-green-600">+3% this month</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Tasks Completed</p>
                <p className="text-2xl mt-2 text-gray-900">{stats.completedTasks}</p>
                <div className="flex items-center gap-1 mt-2">
                  <TrendingUp className="h-3 w-3 text-green-600" />
                  <span className="text-xs text-green-600">+45 this week</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Overdue Tasks</p>
                <p className="text-2xl mt-2 text-red-600">{stats.overdueTasks}</p>
                <div className="flex items-center gap-1 mt-2">
                  <TrendingDown className="h-3 w-3 text-green-600" />
                  <span className="text-xs text-green-600">-8 vs last week</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Completion Time</p>
                <p className="text-2xl mt-2 text-gray-900">{stats.avgCompletionTime} days</p>
                <div className="flex items-center gap-1 mt-2">
                  <TrendingDown className="h-3 w-3 text-green-600" />
                  <span className="text-xs text-green-600">-0.3 days</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Task Completion Rate by User */}
      <Card>
        <CardHeader>
          <CardTitle>Task Completion Rate by User</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm text-gray-600">User</th>
                  <th className="text-left py-3 px-4 text-sm text-gray-600">Assigned</th>
                  <th className="text-left py-3 px-4 text-sm text-gray-600">Completed</th>
                  <th className="text-left py-3 px-4 text-sm text-gray-600">Overdue</th>
                  <th className="text-left py-3 px-4 text-sm text-gray-600">Completion Rate</th>
                  <th className="text-left py-3 px-4 text-sm text-gray-600">Avg Time</th>
                  <th className="text-left py-3 px-4 text-sm text-gray-600">Performance</th>
                </tr>
              </thead>
              <tbody>
                {teamProductivity.map((user, index) => (
                  <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm text-gray-900">{user.name}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{user.assigned}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm text-gray-900">{user.completed}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge className={`${
                        user.overdue > 10 ? 'bg-red-100 text-red-700' :
                        user.overdue > 5 ? 'bg-orange-100 text-orange-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {user.overdue}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-sm ${
                        user.completionRate >= 90 ? 'text-green-600' :
                        user.completionRate >= 80 ? 'text-orange-600' :
                        'text-red-600'
                      }`}>
                        {user.completionRate}%
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600">{user.avgCompletionTime} days</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            user.completionRate >= 90 ? 'bg-green-500' :
                            user.completionRate >= 80 ? 'bg-orange-500' :
                            'bg-red-500'
                          }`}
                          style={{ width: `${user.completionRate}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Productivity Insights */}
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-blue-600" />
            <CardTitle>Productivity Insights</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="p-3 bg-white rounded-lg">
              <p className="text-sm text-gray-900">
                💡 <strong>Emily Davis</strong> has the highest completion rate (93%) and fastest turnaround time (1.9 days).
              </p>
            </div>
            <div className="p-3 bg-white rounded-lg">
              <p className="text-sm text-gray-900">
                ⚠️ <strong>David Wilson</strong> has 12 overdue tasks and may need support or task reallocation.
              </p>
            </div>
            <div className="p-3 bg-white rounded-lg">
              <p className="text-sm text-gray-900">
                📈 Overall team productivity is up 15% this month with 90% completion rate.
              </p>
            </div>
            <div className="p-3 bg-white rounded-lg">
              <p className="text-sm text-gray-900">
                🎯 Appointment attendance rate of 91% is excellent - 9% above industry average.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}