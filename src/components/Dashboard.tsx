import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { toast } from 'sonner@2.0.3';
import { 
  DollarSign, 
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock,
  Calendar
} from 'lucide-react';
import { ExplicitChartContainer } from './ui/ExplicitChartContainer';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  PieChart, 
  Pie, 
  Cell, 
  Legend 
} from 'recharts';
import { bidsAPI, quotesAPI, appointmentsAPI, tasksAPI } from '../utils/api';
import { canView } from '../utils/permissions';
import { onPermissionsChanged } from '../utils/permissions';
import { createClient } from '../utils/supabase/client';
import type { User } from '../App';

interface DashboardProps {
  user: User;
  organization?: any;
  onNavigate?: (view: string) => void;
}

export function Dashboard({ user, organization, onNavigate }: DashboardProps) {
  const [metrics, setMetrics] = useState({
    totalSales: 0,
    winRate: 0,
    closeRate: 0,
    avgDaysToClose: 0,
    pipelineValue: 0,
    openDeals: 0,
    weightedValue: 0,
    avgOpenDealAge: 0
  });
  
  const [charts, setCharts] = useState({
    pipeline: [] as any[],
    wonDeals: [] as any[],
    lossReasons: [] as any[],
    projection: [] as any[]
  });

  const [tasks, setTasks] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, [user.id]); // Only reload when user changes, not on permission updates

  const hasModuleAccess = (module: string) => canView(module, user.role);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch data in parallel
      const [bidsData, quotesData, tasksData, appointmentsData] = await Promise.all([
        hasModuleAccess('bids') ? bidsAPI.getAll() : { bids: [] }, // Using bids table for Deals
        hasModuleAccess('quotes') ? quotesAPI.getAll() : { quotes: [] },
        hasModuleAccess('tasks') ? tasksAPI.getAll() : { tasks: [] },
        hasModuleAccess('appointments') ? appointmentsAPI.getAll() : { appointments: [] }
      ]);

      const allBidsRaw = [...(bidsData.bids || []), ...(quotesData.quotes || [])];

      // Filter data for the "Personal Dashboard" - show only data owned/created by the current user
      const allBids = allBidsRaw.filter((item: any) => item.created_by === user.id);

      // --- Calculate Metrics ---

      // 1. Total Sales (Won Bids/Quotes)
      const wonDeals = allBids.filter(b => ['accepted', 'won'].includes((b.status || '').toLowerCase()));
      const totalSales = wonDeals.reduce((sum, b) => sum + (parseFloat(b.amount || b.total) || 0), 0);

      // 2. Pipeline Value (Open Deals)
      const openBids = allBids.filter(b => {
        const status = (b.status || '').toLowerCase();
        return !['accepted', 'won', 'rejected', 'lost', 'expired'].includes(status);
      });
      const pipelineValue = openBids.reduce((sum, b) => sum + (parseFloat(b.total || b.amount) || 0), 0);

      // 3. Open Deals Count
      const openDealsCount = openBids.length;

      // 4. Win Rate (Won / (Won + Lost))
      const lostDeals = allBids.filter(b => ['rejected', 'lost'].includes((b.status || '').toLowerCase()));
      const totalClosed = wonDeals.length + lostDeals.length;
      const winRate = totalClosed > 0 ? (wonDeals.length / totalClosed) * 100 : 0;

      // 5. Avg Days to Close (Calculated from won deals)
      console.log('🔍 DEBUG: Won deals for avg calculation:', wonDeals);
      console.log('🔍 DEBUG: Won deals count:', wonDeals.length);
      
      const totalDaysToClose = wonDeals.reduce((sum, d) => {
        // Use updated_at as proxy for close date if not available
        // In real app, we should use a specific 'closed_at' field
        // Handle both snake_case and camelCase field names
        const createdField = d.created_at || d.createdAt;
        const updatedField = d.updated_at || d.updatedAt || d.created_at || d.createdAt;
        
        console.log('🔍 DEBUG: Deal dates -', {
          id: d.id,
          status: d.status,
          created: createdField,
          updated: updatedField
        });
        
        const created = new Date(createdField).getTime();
        const closed = new Date(updatedField).getTime();
        
        if (isNaN(created) || isNaN(closed)) {
          console.log('⚠️ Invalid dates for deal:', d.id);
          return sum;
        }
        
        const days = Math.max(0, (closed - created) / (1000 * 60 * 60 * 24));
        console.log('🔍 DEBUG: Days to close for deal', d.id, ':', days);
        return sum + days;
      }, 0);
      
      const avgDaysToClose = wonDeals.length > 0 ? totalDaysToClose / wonDeals.length : 0;
      
      console.log('📊 Avg Days to Close - Won deals:', wonDeals.length, 'Avg days:', avgDaysToClose.toFixed(1));

      // 6. Weighted Value (Pipeline Value * Probability)
      const weightedValue = openBids.reduce((sum, b) => {
        const val = parseFloat(b.total || b.amount) || 0;
        const status = (b.status || '').toLowerCase();
        let prob = 0.1; // draft
        if (status === 'sent') prob = 0.4;
        if (status === 'viewed') prob = 0.6;
        return sum + (val * prob);
      }, 0);

      // 7. Avg Open Deal Age (Today - CreatedAt)
      const now = new Date().getTime();
      const totalAge = openBids.reduce((sum, b) => {
        // Handle both snake_case and camelCase field names
        const createdField = b.created_at || b.createdAt;
        const createdAt = createdField ? new Date(createdField).getTime() : 0;
        
        // Skip invalid dates
        if (!createdAt || isNaN(createdAt)) {
          return sum;
        }
        
        const daysOld = (now - createdAt) / (1000 * 60 * 60 * 24);
        // Ensure we don't get negative days (future dates)
        return sum + Math.max(0, daysOld);
      }, 0);
      
      // Calculate average only if we have deals, otherwise default to 0
      const validDealsCount = openBids.filter(b => {
        const createdField = b.created_at || b.createdAt;
        return createdField && !isNaN(new Date(createdField).getTime());
      }).length;
      const avgOpenDealAge = validDealsCount > 0 ? totalAge / validDealsCount : 0;
      
      console.log('📊 Avg Open Deal Age - Open bids:', openBids.length, 'Valid:', validDealsCount, 'Avg days:', avgOpenDealAge.toFixed(1));
      
      setMetrics({
        totalSales,
        winRate,
        closeRate: winRate * 0.85, // Mock relation
        avgDaysToClose,
        pipelineValue,
        openDeals: openDealsCount,
        weightedValue,
        avgOpenDealAge
      });

      // --- Prepare Chart Data ---

      // 1. Sales Pipeline (Donut) - Deals by Status
      const statusCounts: Record<string, number> = {};
      
      console.log('📊 About to count pipeline data:');
      console.log('  - allBids.length:', allBids.length);
      console.log('  - allBids data:', allBids);
      
      // Count Deals by status
      allBids.forEach((b: any) => {
        const status = b.status || 'draft';
        // Normalize 'sent' and 'viewed' to 'Active' for simpler chart if desired, or keep granular
        const displayName = status.charAt(0).toUpperCase() + status.slice(1);
        statusCounts[displayName] = (statusCounts[displayName] || 0) + 1;
        console.log('  - Adding deal:', status, '->', displayName);
      });
      
      console.log('📊 Pipeline Status Counts:', statusCounts);
      
      const pipelineData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));
      
      console.log('📊 Pipeline Chart Data:', pipelineData);
      
      // No fallback data - show actual database data only

      // 2. Won Deals Trend (Line)
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      // Initialize with 0
      const trendData = months.map(m => ({ name: m, value: 0, deals: 0 }));
      
      wonDeals.forEach(d => {
        const date = new Date(d.updated_at || d.created_at);
        const monthIdx = date.getMonth();
        const amount = parseFloat(d.amount || d.total) || 0;
        trendData[monthIdx].value += amount;
        trendData[monthIdx].deals += 1;
      });

      // 3. Loss Reasons (Donut) - Calculate from actual lost deals
      const lossReasonCounts: Record<string, number> = {};
      lostDeals.forEach(d => {
        const reason = d.lossReason || d.loss_reason || 'Unknown reason';
        lossReasonCounts[reason] = (lossReasonCounts[reason] || 0) + 1;
      });
      
      const lossReasonData = Object.entries(lossReasonCounts).map(([name, value]) => ({ 
        name, 
        value 
      }));

      // 4. Projection (Line) - Calculate from open deals
      // For projection, we'll show open deals by valid until month (proxy for expected close)
      const projectionData = months.map(m => ({
        name: m,
        projected: 0,
        actual: 0
      }));
      
      // Add won deals to actual
      wonDeals.forEach(d => {
        const date = new Date(d.updated_at || d.created_at);
        const monthIdx = date.getMonth();
        const amount = parseFloat(d.amount || d.total) || 0;
        projectionData[monthIdx].actual += amount;
      });
      
      // Add open deals to projected
      openBids.forEach((b: any) => {
        // Use validUntil as proxy for expected close date
        if (b.validUntil || b.valid_until) {
          const closeDate = new Date(b.validUntil || b.valid_until);
          const monthIdx = closeDate.getMonth();
          const amount = parseFloat(b.total || b.amount) || 0;
          if (monthIdx >= 0 && monthIdx < 12) {
            projectionData[monthIdx].projected += amount;
          }
        }
      });

      setCharts({
        pipeline: pipelineData,
        wonDeals: trendData,
        lossReasons: lossReasonData,
        projection: projectionData
      });

      // Set tasks and appointments
      setTasks(tasksData.tasks || []);
      setAppointments(appointmentsData.appointments || []);

    } catch (error) {
      console.error('Error loading dashboard:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  // Colors for charts
  const PIPELINE_COLORS = ['#0ea5e9', '#6366f1', '#8b5cf6', '#ec4899', '#14b8a6'];
  const LOSS_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#10b981'];

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      
      {/* Top Metrics Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard 
          title="Total sales" 
          value={`$${(metrics.totalSales / 1000).toFixed(1)}k`} 
          className="bg-indigo-600 text-white min-w-0" 
        />
        <MetricCard 
          title="Win rate" 
          value={`${metrics.winRate.toFixed(1)}%`} 
          className="bg-blue-900 text-white min-w-0" 
        />
        <MetricCard 
          title="Close rate" 
          value={`${metrics.closeRate.toFixed(1)}%`} 
          className="bg-sky-600 text-white min-w-0" 
        />
        <MetricCard 
          title="Avg days to close" 
          value={metrics.avgDaysToClose.toFixed(1)} 
          className="bg-teal-500 text-white min-w-0" 
        />
      </div>

      {/* Top Metrics Row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard 
          title="Pipeline value" 
          value={`$${(metrics.pipelineValue / 1000).toFixed(1)}k`} 
          className="bg-indigo-500 text-white min-w-0" 
        />
        <MetricCard 
          title="Open deals" 
          value={metrics.openDeals.toString()} 
          className="bg-blue-800 text-white min-w-0" 
        />
        <MetricCard 
          title="Weighted value" 
          value={`$${(metrics.weightedValue / 1000).toFixed(1)}k`} 
          className="bg-sky-500 text-white min-w-0" 
        />
        <MetricCard 
          title="Avg open deal age" 
          value={metrics.avgOpenDealAge.toFixed(1)} 
          className="bg-emerald-500 text-white min-w-0" 
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Won Deals Trend (Line Chart) - Spans 2 cols */}
        <Card className="lg:col-span-2 shadow-sm border-0 min-w-0">
          <CardHeader>
            <CardTitle className="text-gray-700">Won deals (last 12 months)</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Absolute positioning trick for Recharts */}
            <div className="relative h-[300px] w-full min-w-0">
              <div className="absolute inset-0">
                <ExplicitChartContainer>
                  <LineChart data={charts.wonDeals} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6b7280'}} />
                    <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{fill: '#6b7280'}} width={40} />
                    <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{fill: '#6b7280'}} width={40} />
                    <Tooltip />
                    <Legend />
                    <Line yAxisId="left" type="monotone" dataKey="value" stroke="#0ea5e9" strokeWidth={3} dot={{r: 4}} name="Closed Value ($)" />
                    <Line yAxisId="right" type="monotone" dataKey="deals" stroke="#38bdf8" strokeWidth={3} dot={{r: 4}} name="Won Deals (Qty)" />
                  </LineChart>
                </ExplicitChartContainer>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sales Pipeline (Donut) - Spans 1 col */}
        <Card className="lg:col-span-1 shadow-sm border-0 min-w-0">
          <CardHeader>
            <CardTitle className="text-gray-700">Sales pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative h-[300px] w-full min-w-0">
              <div className="absolute inset-0">
                <ExplicitChartContainer>
                  <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                    <Pie
                      data={charts.pipeline}
                      cx="50%"
                      cy="40%"
                      innerRadius="50%"
                      outerRadius="70%"
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {charts.pipeline.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIPELINE_COLORS[index % PIPELINE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend verticalAlign="bottom" height={72} iconType="circle" wrapperStyle={{ bottom: 0 }} />
                  </PieChart>
                </ExplicitChartContainer>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Deals Projection (Line Chart) - Spans 2 cols */}
        <Card className="lg:col-span-2 shadow-sm border-0 min-w-0">
          <CardHeader>
            <CardTitle className="text-gray-700">Deals projection (future 12 months)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative h-[300px] w-full min-w-0">
              <div className="absolute inset-0">
                <ExplicitChartContainer>
                  <LineChart data={charts.projection} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6b7280'}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#6b7280'}} width={40} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="projected" stroke="#0ea5e9" strokeWidth={3} dot={false} name="Projected Value" />
                    <Line type="monotone" dataKey="actual" stroke="#38bdf8" strokeWidth={3} dot={false} name="Actual / Target" />
                  </LineChart>
                </ExplicitChartContainer>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Deal Loss Reasons (Donut) - Spans 1 col */}
        <Card className="lg:col-span-1 shadow-sm border-0 min-w-0">
          <CardHeader>
            <CardTitle className="text-gray-700">Deal loss reasons</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative h-[300px] w-full min-w-0">
              <div className="absolute inset-0">
                <ExplicitChartContainer>
                  <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                    <Pie
                      data={charts.lossReasons}
                      cx="50%"
                      cy="40%"
                      innerRadius="50%"
                      outerRadius="70%"
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {charts.lossReasons.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={LOSS_COLORS[index % LOSS_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend verticalAlign="bottom" height={72} iconType="circle" wrapperStyle={{ bottom: 0 }} />
                  </PieChart>
                </ExplicitChartContainer>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>

      {/* Tasks & Appointments Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Tasks Section */}
        {hasModuleAccess('tasks') && (
          <Card className="shadow-sm border-0">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-gray-700 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-indigo-600" />
                My Tasks
              </CardTitle>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => onNavigate?.('tasks')}
              >
                View All
              </Button>
            </CardHeader>
            <CardContent>
              {tasks.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No tasks found</p>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {tasks.slice(0, 10).map((task) => (
                    <TaskItem key={task.id} task={task} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Appointments Section */}
        {hasModuleAccess('appointments') && (
          <Card className="shadow-sm border-0">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-gray-700 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                Upcoming Appointments
              </CardTitle>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => onNavigate?.('appointments')}
              >
                View All
              </Button>
            </CardHeader>
            <CardContent>
              {appointments.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No appointments scheduled</p>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {appointments.slice(0, 10).map((appointment) => (
                    <AppointmentItem key={appointment.id} appointment={appointment} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  );
}

function MetricCard({ title, value, className }: { title: string, value: string, className?: string }) {
  return (
    <Card className={`border-0 shadow-sm ${className}`}>
      <CardContent className="p-6">
        <p className="text-sm font-medium opacity-90">{title}</p>
        <p className="text-3xl font-bold mt-2">{value}</p>
      </CardContent>
    </Card>
  );
}

function TaskItem({ task }: { task: any }) {
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed';
  const priorityColors = {
    high: 'text-red-600 bg-red-50',
    medium: 'text-yellow-600 bg-yellow-50',
    low: 'text-green-600 bg-green-50'
  };

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
      <div className={`mt-0.5 ${task.status === 'completed' ? 'text-green-600' : 'text-gray-400'}`}>
        <CheckCircle2 className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`font-medium text-gray-900 ${task.status === 'completed' ? 'line-through text-gray-500' : ''}`}>
          {task.title}
        </p>
        {task.description && (
          <p className="text-sm text-gray-600 mt-1 truncate">{task.description}</p>
        )}
        <div className="flex items-center gap-2 mt-2">
          {task.priority && (
            <span className={`text-xs px-2 py-1 rounded-full ${priorityColors[task.priority as keyof typeof priorityColors] || 'text-gray-600 bg-gray-100'}`}>
              {task.priority}
            </span>
          )}
          {task.dueDate && (
            <span className={`text-xs flex items-center gap-1 ${isOverdue ? 'text-red-600' : 'text-gray-600'}`}>
              <Clock className="h-3 w-3" />
              {new Date(task.dueDate).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function AppointmentItem({ appointment }: { appointment: any }) {
  const startDate = new Date(appointment.startTime || appointment.start_time);
  const endDate = new Date(appointment.endTime || appointment.end_time);
  const isToday = startDate.toDateString() === new Date().toDateString();
  const isPast = startDate < new Date();

  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
      isToday ? 'border-blue-300 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
    }`}>
      <div className={`mt-0.5 ${isToday ? 'text-blue-600' : isPast ? 'text-gray-400' : 'text-indigo-600'}`}>
        <Calendar className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900">{appointment.title}</p>
        {appointment.description && (
          <p className="text-sm text-gray-600 mt-1 truncate">{appointment.description}</p>
        )}
        <div className="flex items-center gap-3 mt-2 text-sm text-gray-600">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            {' - '}
            {endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          {!isToday && (
            <span>{startDate.toLocaleDateString()}</span>
          )}
        </div>
        {appointment.location && (
          <p className="text-xs text-gray-500 mt-1">{appointment.location}</p>
        )}
      </div>
    </div>
  );
}