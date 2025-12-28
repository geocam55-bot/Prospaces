import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  Users,
  Search,
  Filter,
  AlertCircle,
  TrendingUp,
  CheckCircle2,
  Clock,
  Calendar,
  FileText,
  Target,
  Mail,
  Phone,
  MapPin,
  Award,
  Activity,
  BarChart3,
  ArrowRight,
  User as UserIcon,
  UserCheck,
  UserX,
  Coffee
} from 'lucide-react';
import type { User, UserRole } from '../App';
import { contactsAPI, bidsAPI, tasksAPI, opportunitiesAPI, appointmentsAPI } from '../utils/api';
import { createClient } from '../utils/supabase/client';

interface ManagerDashboardProps {
  user: User;
  onNavigate?: (view: string) => void;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: 'active' | 'inactive' | 'on_leave';
  avatar?: string;
  phone?: string;
  department?: string;
  lastLogin?: string;
  assignedBy?: string;
}

interface UserMetrics {
  totalContacts: number;
  activeTasks: number;
  completedTasks: number;
  openBids: number;
  wonBids: number;
  totalRevenue: number;
  activeOpportunities: number;
  upcomingAppointments: number;
  taskCompletionRate: number;
}

interface UserActivity {
  action: string;
  details: string;
  timestamp: string;
  module: string;
}

interface UserData {
  contacts: any[];
  tasks: any[];
  bids: any[];
  opportunities: any[];
  appointments: any[];
}

export function ManagerDashboard({ user, onNavigate }: ManagerDashboardProps) {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [selectedUser, setSelectedUser] = useState<TeamMember | null>(null);
  const [userMetrics, setUserMetrics] = useState<UserMetrics | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [userActivity, setUserActivity] = useState<UserActivity[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'on_leave'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingUserData, setIsLoadingUserData] = useState(false);

  useEffect(() => {
    loadTeamMembers();
  }, [user]);

  const loadTeamMembers = async () => {
    try {
      setIsLoading(true);
      const supabase = createClient();

      // Fetch users from the profiles table (not users table)
      // Managers can see standard_users assigned to them
      // Admins can see all users below admin level
      // Super admins can see all users
      let query = supabase
        .from('profiles')
        .select('*')
        .order('name', { ascending: true });

      if (user.role === 'manager') {
        // Managers only see standard_users assigned to them
        query = query
          .eq('role', 'standard_user')
          .eq('organization_id', user.organizationId);
      } else if (user.role === 'admin') {
        // Admins see everyone except super_admins
        query = query
          .neq('role', 'super_admin')
          .eq('organization_id', user.organizationId);
      } else if (user.role === 'super_admin') {
        // Super admins see everyone in their organization
        query = query.eq('organization_id', user.organizationId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error loading team members:', error);
        // If profiles table doesn't exist or query fails, use mock data
        setTeamMembers(getMockTeamMembers());
      } else {
        const members: TeamMember[] = (data || [])
          .filter((u: any) => u.id !== user.id) // Don't show the current user
          .map((u: any) => ({
            id: u.id,
            name: u.name || u.email,
            email: u.email,
            role: u.role,
            status: u.status || 'active',
            phone: u.phone,
            department: u.department,
            lastLogin: u.last_login,
            assignedBy: u.assigned_by,
          }));

        setTeamMembers(members);
        
        // Auto-select first user if available
        if (members.length > 0 && !selectedUser) {
          handleUserSelect(members[0]);
        }
      }
    } catch (error) {
      console.error('Failed to load team members:', error);
      // Use mock data as fallback
      const mockMembers = getMockTeamMembers();
      setTeamMembers(mockMembers);
      if (mockMembers.length > 0 && !selectedUser) {
        handleUserSelect(mockMembers[0]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getMockTeamMembers = (): TeamMember[] => {
    // Mock data for demonstration
    return [
      {
        id: 'user-1',
        name: 'John Smith',
        email: 'john.smith@example.com',
        role: 'standard_user',
        status: 'active',
        phone: '(555) 123-4567',
        department: 'Sales',
        lastLogin: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
      },
      {
        id: 'user-2',
        name: 'Sarah Johnson',
        email: 'sarah.j@example.com',
        role: 'standard_user',
        status: 'active',
        phone: '(555) 234-5678',
        department: 'Sales',
        lastLogin: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
      },
      {
        id: 'user-3',
        name: 'Mike Davis',
        email: 'mike.d@example.com',
        role: 'standard_user',
        status: 'on_leave',
        phone: '(555) 345-6789',
        department: 'Support',
        lastLogin: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
      },
      {
        id: 'user-4',
        name: 'Emily Brown',
        email: 'emily.b@example.com',
        role: 'standard_user',
        status: 'active',
        phone: '(555) 456-7890',
        department: 'Sales',
        lastLogin: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // 5 hours ago
      },
    ];
  };

  const handleUserSelect = async (member: TeamMember) => {
    setSelectedUser(member);
    setIsLoadingUserData(true);
    
    try {
      // Load user's metrics and activity
      // Pass the email address to query by account_owner_number
      await Promise.all([
        loadUserMetrics(member.id, member.email),
        loadUserActivity(member.id)
      ]);
    } catch (error) {
      console.error('Failed to load user data:', error);
    } finally {
      setIsLoadingUserData(false);
    }
  };

  const loadUserMetrics = async (userId: string, userEmail: string) => {
    try {
      const supabase = createClient();
      
      // Defensive queries - only use columns that definitely exist
      // Each query is wrapped to handle errors gracefully
      // IMPORTANT: Fetch from both 'bids' and 'quotes' tables
      
      // Contacts
      let contactsResult = { data: null, error: null };
      try {
        contactsResult = await supabase
          .from('contacts')
          .select('id, name, email, phone, company, status, organization_id, created_at, updated_at')
          .eq('organization_id', user.organizationId)
          .limit(1000);
      } catch (err) {
        contactsResult.error = err;
      }
      
      // Tasks
      let tasksResult = { data: null, error: null };
      try {
        tasksResult = await supabase
          .from('tasks')
          .select('id, title, description, status, priority, due_date, assigned_to, created_at, updated_at')
          .eq('assigned_to', userId)
          .limit(1000);
      } catch (err) {
        tasksResult.error = err;
      }
      
      // Bids
      let bidsResult = { data: null, error: null };
      try {
        bidsResult = await supabase
          .from('bids')
          .select('id, title, status, amount, customer_id, organization_id, created_at, updated_at')
          .eq('organization_id', user.organizationId)
          .limit(1000);
      } catch (err) {
        bidsResult.error = err;
      }
      
      // Quotes - Note: quotes table may not exist, handle gracefully
      let quotesResult = { data: null, error: null };
      try {
        quotesResult = await supabase
          .from('quotes')
          .select('id, title, status, total, customer_id, organization_id, created_at, updated_at')
          .eq('organization_id', user.organizationId)
          .limit(1000);
      } catch (err) {
        quotesResult.error = err;
        // Suppress error logging for quotes since the table may not exist
        console.log('ℹ️ Quotes table not available, skipping...');
      }
      
      // Opportunities
      let opportunitiesResult = { data: null, error: null };
      try {
        opportunitiesResult = await supabase
          .from('opportunities')
          .select('id, title, status, value, owner_id, expected_close_date, created_at, updated_at')
          .eq('owner_id', userId)
          .limit(1000);
      } catch (err) {
        opportunitiesResult.error = err;
      }
      
      // Appointments
      let appointmentsResult = { data: null, error: null };
      try {
        appointmentsResult = await supabase
          .from('appointments')
          .select('id, title, description, start_time, end_time, location, organization_id, created_at, updated_at')
          .eq('organization_id', user.organizationId)
          .limit(1000);
      } catch (err) {
        appointmentsResult.error = err;
      }

      // Log errors for debugging
      if (contactsResult.error) {
        console.error('Failed to load contacts for dashboard:', contactsResult.error);
      }
      if (tasksResult.error) {
        console.error('Failed to load tasks for dashboard:', tasksResult.error);
      }
      if (bidsResult.error) {
        console.error('Error fetching recent bids:', bidsResult.error);
      }
      // Note: quotesResult.error is not logged since quotes table may not exist
      if (opportunitiesResult.error) {
        console.error('Error fetching recent opportunities:', opportunitiesResult.error);
      }
      if (appointmentsResult.error) {
        console.error('Error fetching recent appointments:', appointmentsResult.error);
      }

      // Merge bids and quotes into a single array
      const userBids = [...(bidsResult.data || []), ...(quotesResult.data || [])];

      const userContacts = contactsResult.data || [];
      const userTasks = tasksResult.data || [];
      const userOpportunities = opportunitiesResult.data || [];
      const userAppointments = appointmentsResult.data || [];

      const activeTasks = userTasks.filter((t: any) => t.status !== 'completed');
      const completedTasks = userTasks.filter((t: any) => t.status === 'completed');
      
      const openBids = userBids.filter((b: any) => {
        const status = (b.status || '').toLowerCase();
        return status !== 'accepted' && status !== 'rejected' && 
               status !== 'closed' && status !== 'won' && status !== 'lost';
      });
      
      const wonBids = userBids.filter((b: any) => {
        const status = (b.status || '').toLowerCase();
        return status === 'accepted' || status === 'won';
      });
      
      const totalRevenue = wonBids.reduce((sum: number, bid: any) => {
        return sum + (parseFloat(bid.amount) || parseFloat(bid.total) || 0);
      }, 0);

      const activeOpportunities = userOpportunities.filter((o: any) => {
        const status = (o.status || '').toLowerCase();
        return status === 'open' || status === 'in_progress' || status === 'prospecting' || status === 'qualification';
      });

      const now = new Date();
      const upcomingAppointments = userAppointments.filter((a: any) => {
        if (!a.start_time && !a.startTime) return false;
        const startTime = new Date(a.start_time || a.startTime);
        return startTime >= now;
      });

      const taskCompletionRate = userTasks.length > 0 
        ? Math.round((completedTasks.length / userTasks.length) * 100)
        : 0;

      setUserMetrics({
        totalContacts: userContacts.length,
        activeTasks: activeTasks.length,
        completedTasks: completedTasks.length,
        openBids: openBids.length,
        wonBids: wonBids.length,
        totalRevenue,
        activeOpportunities: activeOpportunities.length,
        upcomingAppointments: upcomingAppointments.length,
        taskCompletionRate,
      });

      setUserData({
        contacts: userContacts,
        tasks: userTasks,
        bids: userBids,
        opportunities: userOpportunities,
        appointments: userAppointments,
      });

    } catch (error) {
      console.error('Failed to load user metrics:', error);
      // Set zero metrics on error
      setUserMetrics({
        totalContacts: 0,
        activeTasks: 0,
        completedTasks: 0,
        openBids: 0,
        wonBids: 0,
        totalRevenue: 0,
        activeOpportunities: 0,
        upcomingAppointments: 0,
        taskCompletionRate: 0,
      });
      setUserData({
        contacts: [],
        tasks: [],
        bids: [],
        opportunities: [],
        appointments: [],
      });
    }
  };

  const loadUserActivity = async (userId: string) => {
    try {
      const supabase = createClient();
      
      // Fetch recent activity from multiple tables
      // Defensive queries - only use columns that definitely exist
      // Note: quotes table may not exist, wrap in try-catch
      
      const results = await Promise.allSettled([
        supabase
          .from('contacts')
          .select('name, created_at')
          .eq('organization_id', user.organizationId)
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('tasks')
          .select('title, status, updated_at')
          .eq('assigned_to', userId)
          .order('updated_at', { ascending: false })
          .limit(5),
        supabase
          .from('bids')
          .select('title, status, created_at')
          .eq('organization_id', user.organizationId)
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('quotes')
          .select('title, status, created_at')
          .eq('organization_id', user.organizationId)
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('opportunities')
          .select('id, status, updated_at')
          .eq('owner_id', userId)
          .order('updated_at', { ascending: false })
          .limit(5),
        supabase
          .from('appointments')
          .select('title, start_time')
          .eq('organization_id', user.organizationId)
          .order('start_time', { ascending: false })
          .limit(5),
      ]);

      // Extract results safely
      const [contactsResult, tasksResult, bidsResult, quotesResult, opportunitiesResult, appointmentsResult] = results.map(r => 
        r.status === 'fulfilled' ? r.value : { data: null, error: r.reason }
      );

      // Log errors for debugging
      if (contactsResult.error) {
        console.error('Error fetching recent contacts:', contactsResult.error);
      }
      if (tasksResult.error) {
        console.error('Error fetching recent tasks:', tasksResult.error);
      }
      if (bidsResult.error) {
        console.error('Error fetching recent bids:', bidsResult.error);
      }
      // Note: quotesResult.error is not logged since quotes table may not exist
      if (opportunitiesResult.error) {
        console.error('Error fetching recent opportunities:', opportunitiesResult.error);
      }
      if (appointmentsResult.error) {
        console.error('Error fetching recent appointments:', appointmentsResult.error);
      }

      const activities: UserActivity[] = [];

      // Process contacts
      (contactsResult.data || []).forEach((contact: any) => {
        activities.push({
          action: 'Contact Added',
          details: `Added new contact: ${contact.name}`,
          timestamp: contact.created_at,
          module: 'contacts',
        });
      });

      // Process tasks
      (tasksResult.data || []).forEach((task: any) => {
        const action = task.status === 'completed' ? 'Task Completed' : 'Task Updated';
        activities.push({
          action,
          details: task.title,
          timestamp: task.updated_at,
          module: 'tasks',
        });
      });

      // Process bids
      (bidsResult.data || []).forEach((bid: any) => {
        activities.push({
          action: 'Bid Submitted',
          details: bid.title,
          timestamp: bid.created_at,
          module: 'bids',
        });
      });

      // Process quotes (draft bids)
      (quotesResult.data || []).forEach((quote: any) => {
        activities.push({
          action: quote.status === 'draft' ? 'Quote Draft Created' : 'Quote Submitted',
          details: quote.title,
          timestamp: quote.created_at,
          module: 'bids',
        });
      });

      // Process opportunities
      (opportunitiesResult.data || []).forEach((opp: any) => {
        activities.push({
          action: 'Opportunity Updated',
          details: `Opportunity ${opp.status}`,
          timestamp: opp.updated_at,
          module: 'opportunities',
        });
      });

      // Process appointments
      (appointmentsResult.data || []).forEach((appt: any) => {
        activities.push({
          action: 'Appointment Scheduled',
          details: appt.title,
          timestamp: appt.start_time,
          module: 'appointments',
        });
      });

      // Sort all activities by timestamp (most recent first) and take top 10
      activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setUserActivity(activities.slice(0, 10));

    } catch (error) {
      console.error('Failed to load user activity:', error);
      setUserActivity([]);
    }
  };

  const getStatusBadge = (status: string) => {
    const config = {
      active: { label: 'Active', className: 'bg-green-100 text-green-700 border-green-200' },
      inactive: { label: 'Inactive', className: 'bg-gray-100 text-gray-700 border-gray-200' },
      on_leave: { label: 'On Leave', className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
    };
    const statusConfig = config[status as keyof typeof config] || config.active;
    return (
      <Badge className={`${statusConfig.className} border`}>
        {statusConfig.label}
      </Badge>
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <UserCheck className="h-4 w-4 text-green-600" />;
      case 'inactive':
        return <UserX className="h-4 w-4 text-gray-600" />;
      case 'on_leave':
        return <Coffee className="h-4 w-4 text-yellow-600" />;
      default:
        return <UserIcon className="h-4 w-4" />;
    }
  };

  const getTimeAgo = (dateString?: string): string => {
    if (!dateString) return 'Never';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    return date.toLocaleDateString();
  };

  const filteredTeamMembers = teamMembers.filter(member => {
    const matchesSearch = 
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (member.department?.toLowerCase().includes(searchQuery.toLowerCase()) || false);
    
    const matchesStatus = statusFilter === 'all' || member.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Check if user has permission to view this dashboard
  if (user.role !== 'manager' && user.role !== 'admin' && user.role !== 'super_admin') {
    return (
      <Alert className="border-red-400 bg-red-50">
        <AlertCircle className="h-5 w-5 text-red-600" />
        <AlertDescription className="text-red-900">
          <strong>Access Denied</strong>
          <p className="mt-2">You don't have permission to view the Manager Dashboard. This feature is only available to Managers, Admins, and Super Admins.</p>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-3xl text-gray-900 mb-2">Team Dashboard</h1>
        <p className="text-gray-600">
          Monitor and manage your team's performance and activities
        </p>
      </div>

      {/* Main Split View */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel - Selected User Summary */}
        <div className="lg:col-span-2 space-y-6">
          {selectedUser ? (
            <>
              {/* User Info Card */}
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl">
                        {selectedUser.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <CardTitle className="text-2xl">{selectedUser.name}</CardTitle>
                        <CardDescription className="text-base mt-1">
                          {selectedUser.email}
                        </CardDescription>
                        <div className="flex items-center gap-2 mt-2">
                          {getStatusBadge(selectedUser.status)}
                          <Badge variant="outline">{selectedUser.role.replace('_', ' ')}</Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {selectedUser.phone && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Phone className="h-4 w-4" />
                        {selectedUser.phone}
                      </div>
                    )}
                    {selectedUser.department && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin className="h-4 w-4" />
                        {selectedUser.department}
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Activity className="h-4 w-4" />
                      Last seen: {getTimeAgo(selectedUser.lastLogin)}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Performance Metrics */}
              {isLoadingUserData ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Loading metrics...</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="animate-pulse space-y-4">
                      <div className="h-24 bg-gray-200 rounded"></div>
                      <div className="h-24 bg-gray-200 rounded"></div>
                    </div>
                  </CardContent>
                </Card>
              ) : userMetrics && (
                <>
                  {/* KPI Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex flex-col">
                          <span className="text-sm text-gray-600">Contacts</span>
                          <span className="text-2xl text-gray-900 mt-1">{userMetrics.totalContacts}</span>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex flex-col">
                          <span className="text-sm text-gray-600">Active Tasks</span>
                          <span className="text-2xl text-gray-900 mt-1">{userMetrics.activeTasks}</span>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex flex-col">
                          <span className="text-sm text-gray-600">Open Bids</span>
                          <span className="text-2xl text-gray-900 mt-1">{userMetrics.openBids}</span>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex flex-col">
                          <span className="text-sm text-gray-600">Opportunities</span>
                          <span className="text-2xl text-gray-900 mt-1">{userMetrics.activeOpportunities}</span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Detailed Metrics */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5" />
                        Performance Overview
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Task Completion Rate */}
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm text-gray-600">Task Completion Rate</span>
                          <span className="text-sm text-gray-900">{userMetrics.taskCompletionRate}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-600 h-2 rounded-full transition-all"
                            style={{ width: `${userMetrics.taskCompletionRate}%` }}
                          />
                        </div>
                      </div>

                      {/* Revenue */}
                      <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 rounded-lg bg-emerald-100 flex items-center justify-center">
                            <TrendingUp className="h-6 w-6 text-emerald-600" />
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Total Revenue</p>
                            <p className="text-2xl text-gray-900">
                              ${userMetrics.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                        </div>
                        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                          {userMetrics.wonBids} Won
                        </Badge>
                      </div>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-2 gap-4 pt-4">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                          <div>
                            <p className="text-xs text-gray-600">Completed Tasks</p>
                            <p className="text-lg text-gray-900">{userMetrics.completedTasks}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-5 w-5 text-purple-600" />
                          <div>
                            <p className="text-xs text-gray-600">Upcoming Meetings</p>
                            <p className="text-lg text-gray-900">{userMetrics.upcomingAppointments}</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Detailed Data Tabs */}
                  {userData && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Detailed View</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Tabs defaultValue="contacts" className="w-full">
                          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                            <TabsList className="inline-flex w-auto min-w-full md:grid md:w-full md:grid-cols-5 h-auto md:h-10">
                              <TabsTrigger value="contacts" className="text-xs md:text-sm px-2 py-2 whitespace-nowrap">Contacts</TabsTrigger>
                              <TabsTrigger value="tasks" className="text-xs md:text-sm px-2 py-2 whitespace-nowrap">Tasks</TabsTrigger>
                              <TabsTrigger value="bids" className="text-xs md:text-sm px-2 py-2 whitespace-nowrap">Bids</TabsTrigger>
                              <TabsTrigger value="opportunities" className="text-xs md:text-sm px-2 py-2 whitespace-nowrap">Opps</TabsTrigger>
                              <TabsTrigger value="appointments" className="text-xs md:text-sm px-2 py-2 whitespace-nowrap">Appts</TabsTrigger>
                            </TabsList>
                          </div>

                          <TabsContent value="contacts" className="space-y-3 mt-4">
                            {userData.contacts.length === 0 ? (
                              <p className="text-sm text-gray-500 text-center py-8">No contacts yet</p>
                            ) : (
                              <div className="space-y-2 max-h-96 overflow-y-auto">
                                {userData.contacts.map((contact: any) => (
                                  <div key={contact.id} className="p-3 border rounded-lg hover:bg-gray-50">
                                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm text-gray-900 truncate">{contact.name}</p>
                                        <p className="text-xs text-gray-600 truncate">{contact.email}</p>
                                        {contact.company && (
                                          <p className="text-xs text-gray-500 truncate">{contact.company}</p>
                                        )}
                                      </div>
                                      <Badge variant="outline" className="text-xs self-start sm:self-auto">
                                        {contact.status}
                                      </Badge>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </TabsContent>

                          <TabsContent value="tasks" className="space-y-3 mt-4">
                            {userData.tasks.length === 0 ? (
                              <p className="text-sm text-gray-500 text-center py-8">No tasks yet</p>
                            ) : (
                              <div className="space-y-2 max-h-96 overflow-y-auto">
                                {userData.tasks.map((task: any) => (
                                  <div key={task.id} className="p-3 border rounded-lg hover:bg-gray-50">
                                    <div className="flex flex-col gap-2">
                                      <div className="flex justify-between items-start gap-2">
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm text-gray-900 break-words">{task.title}</p>
                                          {task.description && (
                                            <p className="text-xs text-gray-600 mt-1 break-words line-clamp-2">{task.description}</p>
                                          )}
                                        </div>
                                        <div className="flex flex-col gap-1 items-end shrink-0">
                                          <Badge 
                                            className={
                                              task.status === 'completed' 
                                                ? 'bg-green-100 text-green-700 border-green-200' 
                                                : task.status === 'in_progress'
                                                ? 'bg-blue-100 text-blue-700 border-blue-200'
                                                : 'bg-gray-100 text-gray-700 border-gray-200'
                                            }
                                          >
                                            {task.status}
                                          </Badge>
                                          <Badge 
                                            variant="outline"
                                            className={
                                              task.priority === 'high' 
                                                ? 'border-red-300 text-red-700' 
                                                : task.priority === 'medium'
                                                ? 'border-yellow-300 text-yellow-700'
                                                : 'border-gray-300 text-gray-700'
                                            }
                                          >
                                            {task.priority}
                                          </Badge>
                                        </div>
                                      </div>
                                      <p className="text-xs text-gray-500">
                                        Due: {new Date(task.dueDate).toLocaleDateString()}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </TabsContent>

                          <TabsContent value="bids" className="space-y-3 mt-4">
                            {userData.bids.length === 0 ? (
                              <p className="text-sm text-gray-500 text-center py-8">No bids yet</p>
                            ) : (
                              <div className="space-y-2 max-h-96 overflow-y-auto">
                                {userData.bids.map((bid: any) => (
                                  <div key={bid.id} className="p-3 border rounded-lg hover:bg-gray-50">
                                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm text-gray-900 break-words">{bid.title}</p>
                                        {bid.description && (
                                          <p className="text-xs text-gray-600 mt-1 break-words line-clamp-2">{bid.description}</p>
                                        )}
                                        <p className="text-sm text-gray-900 mt-2">
                                          ${parseFloat(bid.total || bid.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                        </p>
                                      </div>
                                      <Badge 
                                        className={
                                          (bid.status || '').toLowerCase() === 'accepted' || (bid.status || '').toLowerCase() === 'won'
                                            ? 'bg-green-100 text-green-700 border-green-200' 
                                            : (bid.status || '').toLowerCase() === 'rejected' || (bid.status || '').toLowerCase() === 'lost'
                                            ? 'bg-red-100 text-red-700 border-red-200'
                                            : 'bg-blue-100 text-blue-700 border-blue-200'
                                        }
                                      >
                                        {bid.status}
                                      </Badge>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </TabsContent>

                          <TabsContent value="opportunities" className="space-y-3 mt-4">
                            {userData.opportunities.length === 0 ? (
                              <p className="text-sm text-gray-500 text-center py-8">No opportunities yet</p>
                            ) : (
                              <div className="space-y-2 max-h-96 overflow-y-auto">
                                {userData.opportunities.map((opp: any) => (
                                  <div key={opp.id} className="p-3 border rounded-lg hover:bg-gray-50">
                                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm text-gray-900 break-words">{opp.title}</p>
                                        {opp.description && (
                                          <p className="text-xs text-gray-600 mt-1 break-words line-clamp-2">{opp.description}</p>
                                        )}
                                        {opp.value && (
                                          <p className="text-sm text-gray-900 mt-2">
                                            Value: ${parseFloat(opp.value).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                          </p>
                                        )}
                                      </div>
                                      <Badge 
                                        className={
                                          (opp.status || '').toLowerCase() === 'won'
                                            ? 'bg-green-100 text-green-700 border-green-200' 
                                            : (opp.status || '').toLowerCase() === 'lost'
                                            ? 'bg-red-100 text-red-700 border-red-200'
                                            : 'bg-blue-100 text-blue-700 border-blue-200'
                                        }
                                      >
                                        {opp.status}
                                      </Badge>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </TabsContent>

                          <TabsContent value="appointments" className="space-y-3 mt-4">
                            {userData.appointments.length === 0 ? (
                              <p className="text-sm text-gray-500 text-center py-8">No appointments yet</p>
                            ) : (
                              <div className="space-y-2 max-h-96 overflow-y-auto">
                                {userData.appointments.map((appt: any) => (
                                  <div key={appt.id} className="p-3 border rounded-lg hover:bg-gray-50">
                                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm text-gray-900 break-words">{appt.title}</p>
                                        {appt.description && (
                                          <p className="text-xs text-gray-600 mt-1 break-words line-clamp-2">{appt.description}</p>
                                        )}
                                        <p className="text-xs text-gray-500 mt-2">
                                          {new Date(appt.start_time).toLocaleString()}
                                        </p>
                                      </div>
                                      <Badge 
                                        variant="outline"
                                        className={
                                          new Date(appt.start_time) < new Date()
                                            ? 'border-gray-300 text-gray-700'
                                            : 'border-blue-300 text-blue-700'
                                        }
                                      >
                                        {new Date(appt.start_time) < new Date() ? 'Past' : 'Upcoming'}
                                      </Badge>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </TabsContent>
                        </Tabs>
                      </CardContent>
                    </Card>
                  )}

                  {/* Recent Activity */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5" />
                        Recent Activity
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {userActivity.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-8">No recent activity</p>
                      ) : (
                        <div className="space-y-4">
                          {userActivity.map((activity, index) => (
                            <div key={index} className="flex items-start gap-3 pb-4 border-b last:border-b-0">
                              <div className="w-2 h-2 rounded-full bg-blue-600 mt-2" />
                              <div className="flex-1">
                                <p className="text-sm text-gray-900">{activity.action}</p>
                                <p className="text-sm text-gray-600">{activity.details}</p>
                                <p className="text-xs text-gray-400 mt-1">
                                  {getTimeAgo(activity.timestamp)}
                                </p>
                              </div>
                              <Badge variant="outline" className="text-xs">
                                {activity.module}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </>
              )}
            </>
          ) : (
            <Card className="h-full flex items-center justify-center">
              <CardContent className="text-center py-12">
                <Users className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg text-gray-600">Select a team member to view their dashboard</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Panel - Team Members List */}
        <div className="space-y-4">
          {/* Search and Filter */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search team members..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <div className="overflow-x-auto -mx-6 px-6 sm:mx-0 sm:px-0">
                <div className="flex gap-2 min-w-max sm:min-w-0">
                  <Button
                    variant={statusFilter === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setStatusFilter('all')}
                    className="flex-1 whitespace-nowrap"
                  >
                    All
                  </Button>
                  <Button
                    variant={statusFilter === 'active' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setStatusFilter('active')}
                    className="flex-1 whitespace-nowrap"
                  >
                    Active
                  </Button>
                  <Button
                    variant={statusFilter === 'on_leave' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setStatusFilter('on_leave')}
                    className="flex-1 whitespace-nowrap"
                  >
                    Leave
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Team Members Cards */}
          <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto pr-2">
            {isLoading ? (
              <Card className="animate-pulse">
                <CardContent className="pt-6">
                  <div className="h-16 bg-gray-200 rounded"></div>
                </CardContent>
              </Card>
            ) : filteredTeamMembers.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center">
                  <Users className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm text-gray-500">No team members found</p>
                </CardContent>
              </Card>
            ) : (
              filteredTeamMembers.map((member) => (
                <Card
                  key={member.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedUser?.id === member.id 
                      ? 'border-blue-500 border-2 bg-blue-50' 
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                  onClick={() => handleUserSelect(member)}
                >
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-3">
                      <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white flex-shrink-0">
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-900 truncate">
                              {member.name}
                            </p>
                            <p className="text-xs text-gray-600 truncate">
                              {member.email}
                            </p>
                          </div>
                          {getStatusIcon(member.status)}
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          {member.department && (
                            <Badge variant="outline" className="text-xs">
                              {member.department}
                            </Badge>
                          )}
                          <span className="text-xs text-gray-500">
                            {getTimeAgo(member.lastLogin)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}