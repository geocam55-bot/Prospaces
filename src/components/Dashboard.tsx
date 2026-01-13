import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { toast } from 'sonner@2.0.3';
import { 
  DollarSign, 
  Activity,
  AlertCircle
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
import { bidsAPI, quotesAPI, opportunitiesAPI, appointmentsAPI, tasksAPI } from '../utils/api';
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

  const [isLoading, setIsLoading] = useState(true);
  const [permissionsVersion, setPermissionsVersion] = useState(0);

  useEffect(() => {
    const unsubscribe = onPermissionsChanged(() => setPermissionsVersion(v => v + 1));
    loadDashboardData();
    return () => unsubscribe();
  }, [user, permissionsVersion]);

  const hasModuleAccess = (module: string) => canView(module, user.role);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch data in parallel
      const [bidsData, quotesData, oppsData] = await Promise.all([
        hasModuleAccess('bids') ? bidsAPI.getAll() : { bids: [] },
        hasModuleAccess('quotes') ? quotesAPI.getAll() : { quotes: [] },
        hasModuleAccess('opportunities') ? opportunitiesAPI.getAll() : { opportunities: [] }
      ]);

      const allBidsRaw = [...(bidsData.bids || []), ...(quotesData.quotes || [])];
      const opportunitiesRaw = oppsData.opportunities || [];

      // Filter data for the "Personal Dashboard" - show only data owned/created by the current user
      const allBids = allBidsRaw.filter((item: any) => item.created_by === user.id);
      const opportunities = opportunitiesRaw.filter((item: any) => item.ownerId === user.id);

      // --- Calculate Metrics ---

      // 1. Total Sales (Won Bids/Quotes)
      const wonDeals = allBids.filter(b => ['accepted', 'won'].includes((b.status || '').toLowerCase()));
      const totalSales = wonDeals.reduce((sum, b) => sum + (parseFloat(b.amount || b.total) || 0), 0);

      // 2. Pipeline Value (Open Opportunities)
      const openOpps = opportunities.filter((o: any) => !['won', 'lost', 'closed'].includes((o.status || '').toLowerCase()));
      const pipelineValue = openOpps.reduce((sum: number, o: any) => sum + (parseFloat(o.value || o.estimatedValue) || 0), 0);

      // 3. Open Deals Count
      const openDealsCount = openOpps.length;

      // 4. Win Rate (Won / (Won + Lost))
      const lostDeals = allBids.filter(b => ['rejected', 'lost'].includes((b.status || '').toLowerCase()));
      const totalClosed = wonDeals.length + lostDeals.length;
      const winRate = totalClosed > 0 ? (wonDeals.length / totalClosed) * 100 : 0;

      // 5. Avg Days to Close (Calculated from won deals)
      const totalDaysToClose = wonDeals.reduce((sum, d) => {
        // Use updated_at as proxy for close date if not available
        // In real app, we should use a specific 'closed_at' field
        // Handle both snake_case and camelCase field names
        const createdField = d.created_at || d.createdAt;
        const updatedField = d.updated_at || d.updatedAt || d.created_at || d.createdAt;
        
        const created = new Date(createdField).getTime();
        const closed = new Date(updatedField).getTime();
        
        if (isNaN(created) || isNaN(closed)) return sum;
        
        const days = Math.max(0, (closed - created) / (1000 * 60 * 60 * 24));
        return sum + days;
      }, 0);
      
      const avgDaysToClose = wonDeals.length > 0 ? totalDaysToClose / wonDeals.length : 0;
      
      console.log('📊 Avg Days to Close - Won deals:', wonDeals.length, 'Avg days:', avgDaysToClose.toFixed(1));

      // 6. Weighted Value (Pipeline Value * Probability - using rough stage probabilities)
      const weightedValue = openOpps.reduce((sum: number, o: any) => {
        const val = parseFloat(o.value || o.estimatedValue) || 0;
        const stage = (o.stage || '').toLowerCase();
        let prob = 0.1;
        if (stage === 'proposal') prob = 0.5;
        if (stage === 'negotiation') prob = 0.8;
        return sum + (val * prob);
      }, 0);

      // 7. Avg Open Deal Age (Today - CreatedAt)
      const now = new Date().getTime();
      const totalAge = openOpps.reduce((sum: number, o: any) => {
        // Handle both snake_case and camelCase field names
        const createdField = o.created_at || o.createdAt;
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
      const validDealsCount = openOpps.filter((o: any) => {
        const createdField = o.created_at || o.createdAt;
        return createdField && !isNaN(new Date(createdField).getTime());
      }).length;
      const avgOpenDealAge = validDealsCount > 0 ? totalAge / validDealsCount : 0;
      
      console.log('📊 Avg Open Deal Age - Open opps:', openOpps.length, 'Valid:', validDealsCount, 'Avg days:', avgOpenDealAge.toFixed(1));
      
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

      // 1. Sales Pipeline (Donut) - Combined Opportunities and Bids by Status
      const statusCounts: Record<string, number> = {};
      
      // Count Opportunities by status
      opportunities.forEach((o: any) => {
        const status = o.status || 'open';
        const displayName = status === 'in_progress' ? 'In Progress' : 
                           status.charAt(0).toUpperCase() + status.slice(1);
        statusCounts[displayName] = (statusCounts[displayName] || 0) + 1;
      });
      
      // Count Bids by status
      allBids.forEach((b: any) => {
        const status = b.status || 'draft';
        const displayName = status.charAt(0).toUpperCase() + status.slice(1);
        statusCounts[displayName] = (statusCounts[displayName] || 0) + 1;
      });
      
      const pipelineData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));
      
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

      // 4. Projection (Line) - Remove mock data, calculate from actual opportunities
      // For projection, we'll show open opportunities by expected close month
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
      
      // Add open opportunities to projected (based on expected_close_date if available)
      openOpps.forEach((o: any) => {
        if (o.expectedCloseDate || o.expected_close_date) {
          const closeDate = new Date(o.expectedCloseDate || o.expected_close_date);
          const monthIdx = closeDate.getMonth();
          const amount = parseFloat(o.value || o.estimatedValue) || 0;
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