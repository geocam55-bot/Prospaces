import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { TrendingUp, FileText, MessageSquare, Phone, Calendar, AlertTriangle } from 'lucide-react';
import type { User } from '../../App';
import { createClient } from '../../utils/supabase/client';

interface NotesActivityReportsProps {
  user: User;
}

export function NotesActivityReports({ user }: NotesActivityReportsProps) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalNotes: 0,
    totalActivities: 0,
    avgNotesPerContact: 0,
    mostActiveUser: '',
  });
  const [activityByType, setActivityByType] = useState<any[]>([]);
  const [teamActivity, setTeamActivity] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, [user.organizationId]);

  const fetchData = async () => {
    const supabase = createClient();
    
    try {
      // Fetch notes
      const { data: notes } = await supabase
        .from('notes')
        .select('*, users(name)')
        .eq('tenant_id', user.organizationId);

      // Fetch appointments (as activities)
      const { data: appointments } = await supabase
        .from('appointments')
        .select('*, users(name)')
        .eq('tenant_id', user.organizationId);

      // Fetch contacts for average calculation
      const { data: contacts } = await supabase
        .from('contacts')
        .select('id')
        .eq('tenant_id', user.organizationId);

      const totalNotes = notes?.length || 0;
      const totalAppointments = appointments?.length || 0;
      const totalActivities = totalNotes + totalAppointments;

      // Calculate notes per contact
      const avgNotesPerContact = contacts && contacts.length > 0
        ? (totalNotes / contacts.length).toFixed(1)
        : 0;

      // Find most active user
      const { data: users } = await supabase
        .from('users')
        .select('*')
        .eq('tenant_id', user.organizationId);

      let mostActiveUser = 'N/A';
      let maxActivity = 0;

      if (users && notes && appointments) {
        users.forEach(u => {
          const userNotes = notes.filter(n => n.created_by === u.id).length;
          const userAppts = appointments.filter(a => a.owner_id === u.id).length;
          const total = userNotes + userAppts;
          
          if (total > maxActivity) {
            maxActivity = total;
            mostActiveUser = u.name;
          }
        });
      }

      setStats({
        totalNotes,
        totalActivities,
        avgNotesPerContact: Number(avgNotesPerContact),
        mostActiveUser,
      });

      // Activity by type
      const activityTypes = [
        { type: 'Notes', count: totalNotes, icon: 'FileText' },
        { type: 'Appointments', count: totalAppointments, icon: 'Calendar' },
        { type: 'Calls', count: 0, icon: 'Phone' },
        { type: 'Emails', count: 0, icon: 'MessageSquare' },
      ];

      setActivityByType(activityTypes.filter(a => a.count > 0));

      // Team activity
      if (users && notes && appointments) {
        const teamStats = users.map(u => {
          const userNotes = notes.filter(n => n.created_by === u.id).length;
          const userAppts = appointments.filter(a => a.owner_id === u.id).length;
          
          return {
            name: u.name,
            notes: userNotes,
            appointments: userAppts,
            calls: 0,
            emails: 0,
            total: userNotes + userAppts,
          };
        }).filter(t => t.total > 0).slice(0, 5);
        
        setTeamActivity(teamStats);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching notes activity data:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">
      <div className="text-gray-500">Loading activity reports...</div>
    </div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl text-gray-900">Notes & Activity Tracking</h2>
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
                <p className="text-sm text-gray-600">Total Interactions</p>
                <p className="text-2xl mt-2 text-gray-900">{stats.totalActivities.toLocaleString()}</p>
                <div className="flex items-center gap-1 mt-2">
                  <TrendingUp className="h-3 w-3 text-green-600" />
                  <span className="text-xs text-green-600">+345 this week</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Accounts</p>
                <p className="text-2xl mt-2 text-gray-900">1,234</p>
                <div className="flex items-center gap-1 mt-2">
                  <TrendingUp className="h-3 w-3 text-green-600" />
                  <span className="text-xs text-green-600">+56</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Inactive Accounts</p>
                <p className="text-2xl mt-2 text-red-600">87</p>
                <div className="flex items-center gap-1 mt-2">
                  <AlertTriangle className="h-3 w-3 text-red-600" />
                  <span className="text-xs text-red-600">Needs attention</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Interactions/Account</p>
                <p className="text-2xl mt-2 text-gray-900">{stats.avgNotesPerContact}</p>
                <div className="flex items-center gap-1 mt-2">
                  <TrendingUp className="h-3 w-3 text-green-600" />
                  <span className="text-xs text-green-600">+0.8</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity by Type */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Activity Breakdown by Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activityByType.map((activity) => {
                const Icon = activity.icon;
                return (
                  <div key={activity.type}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`h-8 w-8 rounded-lg bg-${activity.color}-100 flex items-center justify-center`}>
                          <Icon className={`h-4 w-4 text-${activity.color}-600`} />
                        </div>
                        <span className="text-sm text-gray-900">{activity.type}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-900">{activity.count.toLocaleString()}</span>
                        <Badge className={`bg-${activity.color}-100 text-${activity.color}-700`}>
                          {activity.percentage}%
                        </Badge>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 bg-${activity.color}-500 rounded-full`}
                        style={{ width: `${activity.percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* User Activity Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Activity by Team Member</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-2 text-xs text-gray-600">User</th>
                    <th className="text-left py-2 px-2 text-xs text-gray-600">Notes</th>
                    <th className="text-left py-2 px-2 text-xs text-gray-600">Calls</th>
                    <th className="text-left py-2 px-2 text-xs text-gray-600">Emails</th>
                    <th className="text-left py-2 px-2 text-xs text-gray-600">Mtgs</th>
                    <th className="text-left py-2 px-2 text-xs text-gray-600">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {teamActivity.map((user, index) => (
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2 px-2 text-xs text-gray-900">{user.name}</td>
                      <td className="py-2 px-2 text-xs text-gray-600">{user.notes}</td>
                      <td className="py-2 px-2 text-xs text-gray-600">{user.calls}</td>
                      <td className="py-2 px-2 text-xs text-gray-600">{user.emails}</td>
                      <td className="py-2 px-2 text-xs text-gray-600">{user.appointments}</td>
                      <td className="py-2 px-2">
                        <Badge className="bg-blue-100 text-blue-700 text-xs">{user.total}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}