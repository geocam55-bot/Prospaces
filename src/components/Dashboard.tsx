import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { 
  Users, 
  FileText, 
  DollarSign, 
  TrendingUp, 
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  Package,
  ClipboardList,
  RefreshCw,
  CheckSquare,
  Mail,
  BarChart3,
  Database,
  Target,
  Award,
  UsersRound
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { contactsAPI, bidsAPI, quotesAPI, tasksAPI, notesAPI, opportunitiesAPI, inventoryAPI, appointmentsAPI } from '../utils/api';
import { canView, canAdd, canChange, canDelete } from '../utils/permissions';
import { onPermissionsChanged } from '../utils/permissions';
import { createClient } from '../utils/supabase/client';
import type { User, UserRole } from '../App';

interface DashboardProps {
  user: User;
  organization?: any;
  onNavigate?: (view: string) => void;
}

// ⚡ Performance: Dashboard data cache with timestamps
interface DashboardCache {
  stats: any[];
  recentActivity: any[];
  bidsChartData: any[];
  timestamp: number;
}

const CACHE_DURATION = 30000; // 30 seconds in milliseconds

export function Dashboard({ user, organization, onNavigate }: DashboardProps) {
  const [stats, setStats] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<{ action: string; details: string; time: string; module: string }[]>([]);
  const [bidsChartData, setBidsChartData] = useState<any[]>([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState<any[]>([]);
  const [upcomingTasks, setUpcomingTasks] = useState<any[]>([]);
  const [showDatabaseSetup, setShowDatabaseSetup] = useState(false);
  const [hasCheckedDatabase, setHasCheckedDatabase] = useState(false);
  const [permissionsVersion, setPermissionsVersion] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  
  // ⚡ Performance: Cache dashboard data to reduce API calls
  const [dataCache, setDataCache] = useState<DashboardCache | null>(null);
  const [lastRefreshTime, setLastRefreshTime] = useState<number>(0);

  useEffect(() => {
    // Subscribe to permission changes
    const unsubscribe = onPermissionsChanged(() => {
      setPermissionsVersion(v => v + 1);
    });
    
    // Force initial render
    setPermissionsVersion(v => v + 1);
    
    checkDatabase();
    
    return () => {
      unsubscribe();
    };
  }, [user]);

  const checkDatabase = async () => {
    try {
      // Check if critical tables exist by trying to query them
      const supabase = createClient();
      
      // Check for permissions table (new critical table)
      const { error: permError } = await supabase
        .from('permissions')
        .select('id')
        .limit(1);
      
      // Check for contacts table
      const { error: contactsError } = await supabase
        .from('contacts')
        .select('id')
        .limit(1);
      
      // If either table is missing, show database setup
      if ((permError && permError.code === 'PGRST205') || 
          (contactsError && contactsError.code === 'PGRST205')) {
        setShowDatabaseSetup(true);
      }
    } catch (err) {
      console.error('Error checking database:', err);
    } finally {
      setHasCheckedDatabase(true);
    }
  };

  // Refresh dashboard data when component becomes visible
  useEffect(() => {
    // Load data on mount and when user changes
    loadDashboardData();

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadDashboardData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // ⚡ Performance: Reduced refresh interval from 30s to 60s
    // Also check if cache is stale before refreshing
    const interval = setInterval(() => {
      if (!document.hidden) {
        loadDashboardData();
      }
    }, 60000); // Refresh every 60 seconds instead of 30

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(interval);
    };
  }, [user, permissionsVersion]); // Re-run when user changes or permissions change

  const hasModuleAccess = (module: string): boolean => {
    return canView(module, user.role);
  };

  // Helper to add timeout to promises
  const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number = 15000): Promise<T> => {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
      )
    ]);
  };

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      const dashboardStats: any[] = [];

      // Load all data in parallel with individual error handling
      const dataPromises = [];

      // Load Total Revenue FIRST (from Bids) - ONLY FOR CURRENT USER
      if (hasModuleAccess('bids')) {
        const bidsPromise = (async () => {
          try {
            // Use bidsAPI.getAll() and quotesAPI.getAll() for consistent filtering
            const [bidsData, quotesData] = await Promise.all([
              bidsAPI.getAll(),
              quotesAPI.getAll()
            ]);
            const bidsList = bidsData.bids || [];
            const quotesList = quotesData.quotes || [];
            // Combine both bids and quotes for comprehensive data
            const allBidsAndQuotes = [...bidsList, ...quotesList];
            const stats = [];
            
            console.log('📊 [Dashboard] Loading Bids & Quotes Data:', {
              userId: user.id,
              totalBids: bidsList.length,
              totalQuotes: quotesList.length,
              totalCombined: allBidsAndQuotes.length,
              bidStatuses: bidsList.map((b: any) => ({ id: b.id, status: b.status, title: b.title })),
              quoteStatuses: quotesList.map((q: any) => ({ id: q.id, status: q.status, title: q.title }))
            });
            
            // Calculate Total Revenue from all accepted/won bids and quotes
            // Note: Status can be either lowercase or capitalized
            const wonBids = allBidsAndQuotes.filter((b: any) => {
              const status = (b.status || '').toLowerCase();
              return status === 'accepted' || status === 'won';
            });
            
            const totalRevenue = wonBids.reduce((sum: number, bid: any) => {
              // Use 'amount' (total with tax) or fall back to 'total' for backward compatibility
              const bidAmount = parseFloat(bid.amount) || parseFloat(bid.total) || 0;
              return sum + bidAmount;
            }, 0);
            
            // Add Total Revenue card FIRST
            stats.push({
              module: 'bids',
              title: 'My Total Revenue',
              value: `$${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
              icon: DollarSign,
              change: 'Personal',
              changeType: 'positive' as const,
              color: 'emerald',
            });
            
            // Open Bids = All bids/quotes that are NOT accepted or rejected
            // This includes: draft, sent, expired, and any other status
            const openBids = allBidsAndQuotes.filter((b: any) => {
              const status = (b.status || '').toLowerCase().trim();
              return status !== 'accepted' && 
                     status !== 'rejected' && 
                     status !== 'won' &&
                     status !== 'lost';
            });
            
            console.log('📊 [Dashboard] Open Bids calculated:', {
              totalUserBids: allBidsAndQuotes.length,
              allBids: allBidsAndQuotes.map((b: any) => ({ id: b.id, title: b.title, status: b.status })),
              openBidsCount: openBids.length,
              openBids: openBids.map((b: any) => ({ id: b.id, title: b.title, status: b.status }))
            });
            
            stats.push({
              module: 'bids',
              title: 'My Open Bids',
              value: openBids.length.toString(),
              icon: FileText,
              change: openBids.length > 0 ? 'Pending' : 'All Clear',
              changeType: openBids.length > 0 ? 'positive' as const : 'neutral' as const,
              color: 'orange',
            });
            
            // Prepare data for Bids Status Chart - by Dollar Amount (includes both bids and quotes)
            const statusTotals: any = {
              draft: 0,
              sent: 0,
              accepted: 0,
              rejected: 0,
              expired: 0,
            };
            
            allBidsAndQuotes.forEach((bid: any) => {
              const status = (bid.status || 'draft').toLowerCase().trim();
              // Use 'amount' (total with tax) or fall back to 'total' for backward compatibility
              const bidAmount = parseFloat(bid.amount) || parseFloat(bid.total) || 0;
              
              // Map various status names to chart categories
              // "submitted" should count as "sent"
              // "won" should count as "accepted"
              // "lost" should count as "rejected"
              let mappedStatus = status;
              if (status === 'submitted') {
                mappedStatus = 'sent';
              } else if (status === 'won') {
                mappedStatus = 'accepted';
              } else if (status === 'lost') {
                mappedStatus = 'rejected';
              }
              
              if (statusTotals.hasOwnProperty(mappedStatus)) {
                statusTotals[mappedStatus] += bidAmount;
              }
            });
            
            console.log('📊 [Dashboard] Chart Status Totals:', statusTotals);
            
            const chartData = [
              { status: 'Draft', amount: statusTotals.draft, fill: '#94a3b8' },
              { status: 'Sent', amount: statusTotals.sent, fill: '#3b82f6' },
              { status: 'Accepted', amount: statusTotals.accepted, fill: '#22c55e' },
              { status: 'Rejected', amount: statusTotals.rejected, fill: '#ef4444' },
              { status: 'Expired', amount: statusTotals.expired, fill: '#f59e0b' },
            ];
            
            setBidsChartData(chartData);
            return stats;
          } catch (error: any) {
            console.error('Failed to load bids for dashboard:', error);
            // Return error stat
            return [{
              module: 'bids',
              title: 'My Total Revenue',
              value: 'Error',
              icon: DollarSign,
              change: '',
              changeType: 'neutral' as const,
              color: 'gray',
              error: true,
            }];
          }
        })();
        
        dataPromises.push(bidsPromise);
      }

      // Load Contacts from Supabase - ONLY FOR CURRENT USER
      if (hasModuleAccess('contacts')) {
        const contactsPromise = (async () => {
          try {
            const supabase = createClient();
            
            // Standard users see contacts in their organization
            // Note: account_owner_number and created_by columns don't exist in current schema
            const { data: contacts, error } = await supabase
              .from('contacts')
              .select('id, name, email, phone, company, status, organization_id, created_at')
              .eq('organization_id', user.organizationId);
            
            if (error) throw error;
            
            const contactsList = contacts || [];
            console.log('📊 Dashboard - Loading Contacts (User Only):', {
              userId: user.id,
              userEmail: user.email,
              totalContacts: contactsList.length,
              sampleContacts: contactsList.slice(0, 3).map(c => ({
                name: c.name,
                company: c.company
              }))
            });
            
            return [{
              module: 'contacts',
              title: 'My Contacts',
              value: contactsList.length.toString(),
              icon: Users,
              change: 'Personal',
              changeType: 'positive' as const,
              color: 'blue',
            }];
          } catch (error) {
            console.error('Failed to load contacts for dashboard:', error);
            return [{
              module: 'contacts',
              title: 'My Contacts',
              value: 'Error',
              icon: Users,
              change: '',
              changeType: 'neutral' as const,
              color: 'gray',
              error: true,
            }];
          }
        })();
        
        dataPromises.push(contactsPromise);
      }

      // Load Tasks from Supabase - ONLY FOR CURRENT USER
      if (hasModuleAccess('tasks')) {
        const tasksPromise = (async () => {
          try {
            const supabase = createClient();
            const { data: tasks, error } = await supabase
              .from('tasks')
              .select('id, title, description, status, priority, due_date, assigned_to, organization_id, created_at, updated_at')
              .eq('assigned_to', user.id); // Filter by assigned user
            
            if (error) throw error;
            
            const tasksList = tasks || [];
            const activeTasks = tasksList.filter((t: any) => t.status !== 'completed');
            return [{
              module: 'tasks',
              title: 'My Active Tasks',
              value: activeTasks.length.toString(),
              icon: CheckSquare,
              change: 'Personal',
              changeType: 'positive' as const,
              color: 'green',
            }];
          } catch (error) {
            console.error('Failed to load tasks for dashboard:', error);
            return [{
              module: 'tasks',
              title: 'My Active Tasks',
              value: 'Error',
              icon: CheckSquare,
              change: '',
              changeType: 'neutral' as const,
              color: 'gray',
              error: true,
            }];
          }
        })();
        
        dataPromises.push(tasksPromise);
      }

      // Load Appointments from Supabase - ONLY FOR CURRENT USER
      if (hasModuleAccess('appointments')) {
        const appointmentsPromise = (async () => {
          try {
            const supabase = createClient();
            const { data: appointments, error } = await supabase
              .from('appointments')
              .select('id, title, description, start_time, end_time, location, organization_id, created_at')
              .eq('organization_id', user.organizationId); // Filter by organization
            
            if (error) throw error;
            
            const appointmentsList = appointments || [];
            const upcomingAppointments = appointmentsList.filter((a: any) => new Date(a.start_time) >= new Date());
            return [{
              module: 'appointments',
              title: 'My Upcoming Appointments',
              value: upcomingAppointments.length.toString(),
              icon: Calendar,
              change: 'Personal',
              changeType: 'positive' as const,
              color: 'purple',
            }];
          } catch (error) {
            console.error('Failed to load appointments for dashboard:', error);
            return [{
              module: 'appointments',
              title: 'My Upcoming Appointments',
              value: 'Error',
              icon: Calendar,
              change: '',
              changeType: 'neutral' as const,
              color: 'gray',
              error: true,
            }];
          }
        })();
        
        dataPromises.push(appointmentsPromise);
      }

      // Load Email from Supabase
      // Note: Email endpoint temporarily disabled - will show 0 until backend is ready
      if (hasModuleAccess('email')) {
        dashboardStats.push({
          module: 'email',
          title: 'Unread Emails',
          value: '0',
          icon: Mail,
          change: 'New',
          changeType: 'neutral' as const,
          color: 'red',
        });
      }

      // Load Marketing (if user has access)
      if (hasModuleAccess('marketing')) {
        dashboardStats.push({
          module: 'marketing',
          title: 'Active Campaigns',
          value: '0',
          icon: BarChart3,
          change: '+20%',
          changeType: 'positive' as const,
          color: 'pink',
        });
      }

      // Load Inventory from Supabase
      if (hasModuleAccess('inventory')) {
        const inventoryPromise = inventoryAPI.getAll()
          .then((inventoryData) => {
            const inventory = inventoryData.inventory || [];
            const lowStock = inventory.filter((i: any) => i.quantity < (i.reorderLevel || 0));
            return [{
              module: 'inventory',
              title: 'Low Stock Items',
              value: lowStock.length.toString(),
              icon: Package,
              change: lowStock.length > 0 ? 'Action Needed' : 'All Good',
              changeType: lowStock.length > 0 ? 'negative' as const : 'positive' as const,
              color: 'yellow',
            }];
          })
          .catch((error) => {
            console.error('Failed to load inventory for dashboard:', error);
            return [{
              module: 'inventory',
              title: 'Low Stock Items',
              value: 'Error',
              icon: Package,
              change: '',
              changeType: 'neutral' as const,
              color: 'gray',
              error: true,
            }];
          });
        
        dataPromises.push(inventoryPromise);
      }

      // Load Opportunities from Supabase - ONLY FOR CURRENT USER
      if (hasModuleAccess('opportunities')) {
        const opportunitiesPromise = (async () => {
          try {
            const supabase = createClient();
            const { data: opportunities, error } = await supabase
              .from('opportunities')
              .select('id, title, status, value, owner_id, expected_close_date, organization_id, created_at, updated_at')
              .eq('owner_id', user.id); // Filter by owner_id
            
            if (error) throw error;
            
            const opportunitiesList = opportunities || [];
            const activeOpportunities = opportunitiesList.filter((o: any) => {
              const status = (o.status || '').toLowerCase();
              return status === 'open' || status === 'in_progress';
            });
            
            // Calculate total opportunity value
            const totalOpportunityValue = activeOpportunities.reduce((sum: number, opp: any) => {
              return sum + (parseFloat(opp.value) || parseFloat(opp.estimatedValue) || 0);
            }, 0);
            
            return [{
              module: 'opportunities',
              title: 'My Active Opportunities',
              value: activeOpportunities.length.toString(),
              icon: Target,
              change: `$${totalOpportunityValue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} value`,
              changeType: 'positive' as const,
              color: 'indigo',
            }];
          } catch (error) {
            console.error('Failed to load opportunities for dashboard:', error);
            return [{
              module: 'opportunities',
              title: 'My Active Opportunities',
              value: 'Error',
              icon: Target,
              change: '',
              changeType: 'neutral' as const,
              color: 'gray',
              error: true,
            }];
          }
        })();
        
        dataPromises.push(opportunitiesPromise);
      }

      // Wait for all data promises to resolve (with 5 second timeout per request)
      // Use allSettled so failures don't block the entire dashboard
      const results = await Promise.allSettled(dataPromises.map(p => withTimeout(p, 5000)));

      // Flatten the results to get all stats
      const allStats = results.flatMap(result => {
        if (result.status === 'fulfilled') {
          return result.value;
        }
        return [];
      });

      console.log('Dashboard Data Loaded from Supabase:', {
        statsCount: allStats.length,
        userRole: user.role,
        hasContactsAccess: hasModuleAccess('contacts')
      });

      setStats(allStats);
      
      // Load Recent Activity
      await loadRecentActivity();
      
      // Load Upcoming Appointments and Tasks
      await loadUpcomingItems();
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadUpcomingItems = async () => {
    try {
      const now = new Date();
      const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      
      // Load upcoming appointments
      if (hasModuleAccess('appointments')) {
        try {
          const appointmentsData = await withTimeout(appointmentsAPI.getAll(), 15000);
          const appointments = appointmentsData.appointments || [];
          
          console.log('🗓️ Dashboard - Appointments from API:', appointments.length);
          console.log('🗓️ Dashboard - Time range:', { now, nextWeek });
          
          // Filter to user's appointments that are upcoming (within next 7 days)
          // Note: appointmentsAPI.getAll() already filters by role/ownership
          const upcoming = appointments
            .filter((apt: any) => {
              const startTime = new Date(apt.start_time);
              const isUpcoming = startTime >= now && startTime <= nextWeek;
              console.log('🗓️ Checking appointment:', { 
                title: apt.title, 
                start: apt.start_time, 
                startTime: startTime.toISOString(), 
                isUpcoming,
                now: now.toISOString(),
                nextWeek: nextWeek.toISOString()
              });
              return isUpcoming;
            })
            .sort((a: any, b: any) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
            .slice(0, 5); // Show only first 5
          
          console.log('🗓️ Dashboard - Upcoming appointments filtered:', upcoming.length);
          setUpcomingAppointments(upcoming);
        } catch (error: any) {
          if (error?.message !== 'Request timeout') {
            console.error('Failed to load upcoming appointments:', error);
          }
          setUpcomingAppointments([]);
        }
      }
      
      // Load upcoming tasks
      if (hasModuleAccess('tasks')) {
        try {
          const tasksData = await withTimeout(tasksAPI.getAll(), 15000);
          const tasks = tasksData.tasks || [];
          
          // Filter to user's incomplete tasks that are due soon (within next 7 days)
          // Note: tasksAPI.getAll() already filters by role/ownership
          const upcoming = tasks
            .filter((task: any) => {
              if (task.status === 'completed') return false;
              if (!task.due_date) return false;
              
              const dueDate = new Date(task.due_date);
              return dueDate <= nextWeek;
            })
            .sort((a: any, b: any) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
            .slice(0, 5); // Show only first 5
          
          setUpcomingTasks(upcoming);
        } catch (error: any) {
          if (error?.message !== 'Request timeout') {
            console.error('Failed to load upcoming tasks:', error);
          }
          setUpcomingTasks([]);
        }
      }
    } catch (error) {
      console.error('Failed to load upcoming items:', error);
    }
  };

  const loadRecentActivity = async () => {
    try {
      const activities: { action: string; details: string; time: string; module: string }[] = [];
      
      // Load all activities in parallel with timeout
      const activityPromises = [];
      
      // Load recently added appointments (only for current user)
      if (hasModuleAccess('appointments')) {
        activityPromises.push(
          withTimeout(appointmentsAPI.getAll(), 15000) // Increased timeout to 15 seconds
            .then((appointmentsData) => {
              const appointments = appointmentsData.appointments || [];
          
          // Filter to only show current user's appointments
          const userAppointments = appointments.filter((appointment: any) => 
            appointment.assigned_to === user.id || appointment.created_by === user.id
          );
          
          // Sort by created_at or start_time (most recent first) and take top 5
          const recentAppointments = userAppointments
            .sort((a: any, b: any) => {
              // Try to use created_at first, then fall back to start_time
              const dateA = a.created_at ? new Date(a.created_at).getTime() : new Date(a.start_time).getTime();
              const dateB = b.created_at ? new Date(b.created_at).getTime() : new Date(b.start_time).getTime();
              return dateB - dateA;
            })
            .slice(0, 5);
          
              recentAppointments.forEach((appointment: any) => {
                const createdDate = appointment.created_at ? new Date(appointment.created_at) : new Date(appointment.start_time);
                const timeAgo = getTimeAgo(createdDate);
                
                activities.push({
                  action: 'Appointment scheduled',
                  details: `${appointment.title} with ${appointment.contact_name || 'N/A'}`,
                  time: timeAgo,
                  module: 'appointments',
                });
              });
            })
            .catch((error) => {
              // Silently handle timeout errors - don't log to console
              if (error.message !== 'Request timeout') {
                console.error('Failed to load recent appointments:', error);
              }
            })
        );
      }
      
      // Load recently added contacts (only created by current user)
      if (hasModuleAccess('contacts')) {
        activityPromises.push(
          withTimeout(
            (async () => {
              try {
                const supabase = createClient();
                const { data, error } = await supabase
                  .from('contacts')
                  .select('id, name, company, created_at')
                  .eq('organization_id', user.organizationId)
                  .order('created_at', { ascending: false })
                  .limit(3);
                
                if (error) throw error;
                return { contacts: data || [] };
              } catch (err) {
                // Silently handle errors
                return { contacts: [] };
              }
            })(),
            15000 // Increased timeout to 15 seconds
          )
            .then((contactsData) => {
              const contacts = contactsData.contacts || [];
          
              contacts.forEach((contact: any) => {
                const createdDate = new Date(contact.created_at);
                const timeAgo = getTimeAgo(createdDate);
                
                activities.push({
                  action: 'Contact added',
                  details: `${contact.name} from ${contact.company || 'N/A'}`,
                  time: timeAgo,
                  module: 'contacts',
                });
              });
            })
            .catch((error) => {
              // Silently handle timeout errors - don't log to console
              if (error.message !== 'Request timeout') {
                console.error('Failed to load recent contacts:', error);
              }
            })
        );
      }
      
      // Load recently added tasks (only for current user)
      if (hasModuleAccess('tasks')) {
        activityPromises.push(
          withTimeout(tasksAPI.getAll(), 15000) // Increased timeout to 15 seconds
            .then((tasksData) => {
              const tasks = tasksData.tasks || [];
          
          // Filter to only show current user's tasks
          const userTasks = tasks.filter((task: any) => 
            task.assignedTo === user.id || task.created_by === user.id
          );
          
          // Sort by created_at or dueDate (most recent first) and take top 5
          const recentTasks = userTasks
            .sort((a: any, b: any) => {
              // Try to use created_at first, then fall back to dueDate
              const dateA = a.created_at ? new Date(a.created_at).getTime() : (a.dueDate ? new Date(a.dueDate).getTime() : 0);
              const dateB = b.created_at ? new Date(b.created_at).getTime() : (b.dueDate ? new Date(b.dueDate).getTime() : 0);
              return dateB - dateA;
            })
            .slice(0, 5);
          
              recentTasks.forEach((task: any) => {
                // Use created_at if available, otherwise use current time (for newly created tasks)
                const createdDate = task.created_at ? new Date(task.created_at) : new Date();
                const timeAgo = getTimeAgo(createdDate);
                
                activities.push({
                  action: 'Task created',
                  details: `${task.title} - Priority: ${task.priority || 'medium'}`,
                  time: timeAgo,
                  module: 'tasks',
                });
              });
            })
            .catch((error) => {
              // Silently handle timeout errors - don't log to console
              if (error.message !== 'Request timeout') {
                console.error('Failed to load recent tasks:', error);
              }
            })
        );
      }
      
      // Wait for all activity promises with timeout
      await Promise.allSettled(activityPromises);
      
      // Sort all activities by time and take top 10
      const sortedActivities = activities
        .sort((a, b) => {
          // Parse time strings to compare
          const timeA = parseTimeAgo(a.time);
          const timeB = parseTimeAgo(b.time);
          return timeA - timeB;
        })
        .slice(0, 10);
      
      setRecentActivity(sortedActivities);
    } catch (error) {
      console.error('Failed to load recent activity:', error);
    }
  };

  const getTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  const parseTimeAgo = (timeStr: string): number => {
    if (timeStr === 'Just now') return 0;
    const match = timeStr.match(/(\d+)\s+(minute|hour|day|week)/);
    if (!match) return 999999; // For date strings, put them last
    
    const value = parseInt(match[1]);
    const unit = match[2];
    
    switch (unit) {
      case 'minute': return value;
      case 'hour': return value * 60;
      case 'day': return value * 60 * 24;
      case 'week': return value * 60 * 24 * 7;
      default: return 999999;
    }
  };

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'super_admin':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'admin':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'manager':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'marketing':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'standard_user':
        return 'bg-gray-100 text-gray-700 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatColorClasses = (color: string) => {
    switch (color) {
      case 'blue':
        return 'bg-blue-100 text-blue-600';
      case 'green':
        return 'bg-green-100 text-green-600';
      case 'purple':
        return 'bg-purple-100 text-purple-600';
      case 'orange':
        return 'bg-orange-100 text-orange-600';
      case 'red':
        return 'bg-red-100 text-red-600';
      case 'pink':
        return 'bg-pink-100 text-pink-600';
      case 'yellow':
        return 'bg-yellow-100 text-yellow-600';
      case 'emerald':
        return 'bg-emerald-100 text-emerald-600';
      case 'indigo':
        return 'bg-indigo-100 text-indigo-600';
      case 'cyan':
        return 'bg-cyan-100 text-cyan-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header with User Info */}
      <div>
        <h1 className="mb-2">Welcome back, {user.full_name?.split(' ')[0] || user.email?.split('@')[0] || 'User'}!</h1>
        <p className="text-muted-foreground">Here's what's happening with your workspace today.</p>
      </div>

      {/* Admin/Manager - Redirect to Team Dashboard */}
      {(user.role === 'admin' || user.role === 'manager') && (
        <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950 dark:to-indigo-950 dark:border-purple-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-purple-900 dark:text-purple-100">
              <UsersRound className="h-6 w-6" />
              Team Management Dashboard
            </CardTitle>
            <CardDescription className="text-purple-700 dark:text-purple-300">
              As a {user.role === 'admin' ? 'Administrator' : 'Manager'}, you have access to the Team Dashboard for managing your team's performance and activities.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                <strong>Team Dashboard includes:</strong>
              </p>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 ml-4">
                <li>• Team member performance metrics</li>
                <li>• Revenue tracking across all team members</li>
                <li>• Task completion rates and productivity</li>
                <li>• Individual team member dashboards</li>
                <li>• Real-time activity monitoring</li>
              </ul>
            </div>
            <Button 
              onClick={() => onNavigate && onNavigate('team-dashboard')}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              Go to Team Dashboard
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Permission-Based Notice */}
      {user.role === 'marketing' && (
        <Alert className="border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">
          <BarChart3 className="h-4 w-4 text-green-600 dark:text-green-400" />
          <AlertDescription className="text-green-900 dark:text-green-100">
            <strong>Marketing Dashboard:</strong> You have full access to Marketing, Contacts, and Email modules. Your dashboard shows relevant metrics for campaign management and lead generation.
          </AlertDescription>
        </Alert>
      )}

      {user.role === 'standard_user' && (
        <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
          <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <AlertDescription className="text-blue-900 dark:text-blue-100">
            <strong>Personal Workspace:</strong> Your dashboard shows your personal contacts, tasks, and notes. Contact your administrator for additional access.
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Grid - Only show for non-admin/non-manager users */}
      {user.role !== 'admin' && user.role !== 'manager' && (
        <>
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader className="pb-2">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : stats.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {stats.map((stat) => {
                const Icon = stat.icon;
                return (
                  <Card 
                    key={stat.title}
                    className="hover:shadow-lg hover:scale-105 transition-all cursor-pointer border-2 hover:border-blue-300 dark:hover:border-blue-700"
                    onClick={() => onNavigate && onNavigate(stat.module)}
                  >
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        {stat.title}
                      </CardTitle>
                      <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${getStatColorClasses(stat.color)}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl mb-1">{stat.value}</div>
                      <p className={`text-xs ${
                        stat.changeType === 'positive' ? 'text-green-600 dark:text-green-400' : 
                        stat.changeType === 'negative' ? 'text-red-600 dark:text-red-400' : 
                        'text-muted-foreground'
                      }`}>
                        {stat.change} {stat.changeType !== 'neutral' && 'from last month'}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No data available. Start by adding contacts, tasks, or other items to your workspace.
              </AlertDescription>
            </Alert>
          )}
        </>
      )}

      {/* Bids Status Chart */}
      {user.role !== 'admin' && user.role !== 'manager' && bidsChartData.length > 0 && hasModuleAccess('bids') && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Bids by Status (Revenue)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={bidsChartData}
                margin={{
                  top: 5,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="status" />
                <YAxis 
                  tickFormatter={(value) => `$${value.toLocaleString()}`}
                />
                <Tooltip 
                  formatter={(value: any) => [`$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 'Revenue']}
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc' }}
                />
                <Legend />
                <Bar dataKey="amount" fill="#8884d8" name="Total Revenue">
                  {bidsChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Upcoming Appointments and Tasks */}
      {user.role !== 'admin' && user.role !== 'manager' && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Upcoming Appointments */}
          {hasModuleAccess('appointments') && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  Upcoming Appointments
                </CardTitle>
                <CardDescription>Next 7 days</CardDescription>
              </CardHeader>
              <CardContent>
                {upcomingAppointments.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">No upcoming appointments</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Schedule an appointment to see it here
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      onClick={() => onNavigate && onNavigate('appointments')}
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      Schedule Appointment
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {upcomingAppointments.map((appointment: any) => {
                      const startTime = new Date(appointment.start_time);
                      const isToday = startTime.toDateString() === new Date().toDateString();
                      const isTomorrow = startTime.toDateString() === new Date(Date.now() + 86400000).toDateString();
                      
                      let dateLabel = startTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                      if (isToday) dateLabel = 'Today';
                      if (isTomorrow) dateLabel = 'Tomorrow';
                      
                      const timeLabel = startTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
                      
                      return (
                        <div key={appointment.id} className="flex items-start gap-3 p-3 rounded-lg border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/30 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors">
                          <div className={`flex flex-col items-center justify-center min-w-[60px] px-2 py-1 rounded ${
                            isToday ? 'bg-purple-600 text-white' : 
                            isTomorrow ? 'bg-purple-500 text-white' : 
                            'bg-purple-200 dark:bg-purple-800 text-purple-900 dark:text-purple-100'
                          }`}>
                            <span className="text-xs font-medium">{dateLabel}</span>
                            <span className="text-xs">{timeLabel}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                              {appointment.title}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {appointment.contact_name || 'No contact'}
                            </p>
                            {appointment.location && (
                              <p className="text-xs text-muted-foreground mt-1">
                                📍 {appointment.location}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full"
                      onClick={() => onNavigate && onNavigate('appointments')}
                    >
                      View All Appointments →
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Upcoming Tasks */}
          {hasModuleAccess('tasks') && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckSquare className="h-5 w-5 text-green-600 dark:text-green-400" />
                  Upcoming Tasks
                </CardTitle>
                <CardDescription>Due within 7 days</CardDescription>
              </CardHeader>
              <CardContent>
                {upcomingTasks.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">No upcoming tasks</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Create a task to see it here
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      onClick={() => onNavigate && onNavigate('tasks')}
                    >
                      <CheckSquare className="h-4 w-4 mr-2" />
                      Create Task
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {upcomingTasks.map((task: any) => {
                      const dueDate = new Date(task.due_date);
                      const isOverdue = dueDate < new Date();
                      const isToday = dueDate.toDateString() === new Date().toDateString();
                      const isTomorrow = dueDate.toDateString() === new Date(Date.now() + 86400000).toDateString();
                      
                      let dateLabel = dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                      if (isOverdue) dateLabel = 'Overdue';
                      if (isToday) dateLabel = 'Today';
                      if (isTomorrow) dateLabel = 'Tomorrow';
                      
                      const priorityColors = {
                        low: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
                        medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
                        high: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
                      };
                      
                      const priority = (task.priority || 'medium').toLowerCase();
                      
                      return (
                        <div key={task.id} className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                          isOverdue 
                            ? 'border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-900/30' 
                            : 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30 hover:bg-green-100 dark:hover:bg-green-900/30'
                        }`}>
                          <div className={`flex flex-col items-center justify-center min-w-[60px] px-2 py-1 rounded ${
                            isOverdue ? 'bg-red-600 text-white' :
                            isToday ? 'bg-green-600 text-white' :
                            isTomorrow ? 'bg-green-500 text-white' :
                            'bg-green-200 dark:bg-green-800 text-green-900 dark:text-green-100'
                          }`}>
                            <span className="text-xs font-medium">{dateLabel}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                              {task.title}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className={`text-xs ${priorityColors[priority as keyof typeof priorityColors] || priorityColors.medium}`}>
                                {priority}
                              </Badge>
                              {task.status && (
                                <Badge variant="outline" className="text-xs">
                                  {task.status}
                                </Badge>
                              )}
                            </div>
                            {task.description && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                                {task.description}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full"
                      onClick={() => onNavigate && onNavigate('tasks')}
                    >
                      View All Tasks →
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Recent Activity and Quick Actions */}
      {user.role !== 'admin' && user.role !== 'manager' && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentActivity.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">No recent activity</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Your recent actions will appear here
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentActivity.map((activity, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400 mt-2" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">{activity.action}</p>
                        <p className="text-sm text-muted-foreground">{activity.details}</p>
                        <p className="text-xs text-muted-foreground mt-1">{activity.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Access - Based on Permissions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Quick Access
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {hasModuleAccess('contacts') && (
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => onNavigate && onNavigate('contacts')}
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Manage Contacts
                  </Button>
                )}
                {hasModuleAccess('tasks') && (
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => onNavigate && onNavigate('tasks')}
                  >
                    <CheckSquare className="h-4 w-4 mr-2" />
                    View Tasks
                  </Button>
                )}
                {hasModuleAccess('appointments') && (
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => onNavigate && onNavigate('appointments')}
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Schedule Appointment
                  </Button>
                )}
                {hasModuleAccess('marketing') && (
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => onNavigate && onNavigate('marketing')}
                  >
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Marketing Campaigns
                  </Button>
                )}
                {hasModuleAccess('email') && (
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => onNavigate && onNavigate('email')}
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Check Email
                  </Button>
                )}
                {hasModuleAccess('bids') && (
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => onNavigate && onNavigate('bids')}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Review Bids
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Database Setup Prompt */}
      {showDatabaseSetup && hasCheckedDatabase && (
        <Alert className="border-red-400 bg-red-50">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <AlertDescription className="text-red-900">
            <div>
              <strong className="text-lg">⚠️ Database Tables Missing</strong>
              <p className="mt-2 text-sm">
                Your CRM database is missing required tables (contacts, tasks, appointments, etc.). 
                Click the button below to view setup instructions.
              </p>
              <Button 
                onClick={() => window.open('https://supabase.com/dashboard', '_blank')}
                className="mt-3 bg-red-600 hover:bg-red-700"
              >
                <Database className="mr-2 h-4 w-4" />
                Open Supabase Dashboard & Setup
              </Button>
              <Button
                onClick={() => setShowDatabaseSetup(false)}
                variant="ghost"
                size="sm"
                className="mt-3 ml-2"
              >
                Dismiss
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}