import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { bidsAPI, quotesAPI, usersAPI } from '../utils/api';
import { canView } from '../utils/permissions';
import { onPermissionsChanged } from '../utils/permissions';
import type { User } from '../App';
import { PermissionGate } from './PermissionGate';

import { DashboardTabs } from './dashboard/DashboardTabs';
import { DashboardFilters } from './dashboard/DashboardFilters';
import { OverviewTab } from './dashboard/OverviewTab';
import { AgentsTab } from './dashboard/AgentsTab';
import { DealsTab } from './dashboard/DealsTab';

interface ManagerDashboardProps {
  user: User;
  organization?: any;
  onNavigate?: (view: string) => void;
}

export function ManagerDashboard({ user, organization, onNavigate }: ManagerDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [userProfiles, setUserProfiles] = useState<any[]>([]);

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
      const [bidsData, quotesData, usersData] = await Promise.all([
        hasModuleAccess('bids') ? bidsAPI.getAll('team') : { bids: [] },
        hasModuleAccess('quotes') ? quotesAPI.getAll('team') : { quotes: [] },
        usersAPI.getAll() // Fetch all users for Agents tab
      ]);

      const allBids = [...(bidsData.bids || []), ...(quotesData.quotes || [])];
      const opportunities: any[] = []; // Removed opportunities
      const users = usersData.users || [];
      
      console.log('🔍 [Team Dashboard] Data fetched:', {
        bids: allBids.length,
        opportunities: opportunities.length,
        users: users.length
      });
      
      setOpportunities(opportunities);
      setUserProfiles(users);

      // --- Calculate Overview Metrics ---

      // 1. Total Sales (Won Deals/Quotes)
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
      
      console.log('📊 [Team] Avg Days to Close - Won deals:', wonDeals.length, 'Avg days:', avgDaysToClose.toFixed(1));

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
      
      console.log('📊 [Team] Avg Open Deal Age - Open opps:', openOpps.length, 'Valid:', validDealsCount, 'Avg days:', avgOpenDealAge.toFixed(1));

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
      
      console.log('📊 [Team Dashboard] Metrics calculated:', {
        totalSales: `$${(totalSales / 1000).toFixed(1)}k`,
        winRate: `${winRate.toFixed(1)}%`,
        avgDaysToClose: avgDaysToClose.toFixed(1),
        pipelineValue: `$${(pipelineValue / 1000).toFixed(1)}k`,
        openDeals: openDealsCount,
        avgOpenDealAge: avgOpenDealAge.toFixed(1)
      });

      // --- Prepare Chart Data ---

      // 1. Sales Pipeline (Donut) - Combined Opportunities and Deals by Status
      const statusCounts: Record<string, number> = {};
      
      // Count Opportunities by status
      opportunities.forEach((o: any) => {
        const status = o.status || 'open';
        const displayName = status === 'in_progress' ? 'In Progress' : 
                           status.charAt(0).toUpperCase() + status.slice(1);
        statusCounts[displayName] = (statusCounts[displayName] || 0) + 1;
      });
      
      // Count Deals by status
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

      // 4. Projection (Line) - Calculate from actual opportunities
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

  return (
    <PermissionGate user={user} module="team-dashboard" action="view">
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        {/* Navigation Tabs */}
        <DashboardTabs activeTab={activeTab} onTabChange={setActiveTab} />
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="bg-white"
            onClick={loadDashboardData}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Main Content Area - Spans 3 columns */}
        {/* Added min-w-0 to fix Recharts width calculation in Grid */}
        <div className="xl:col-span-3 min-w-0">
          {activeTab === 'overview' && (
             <OverviewTab metrics={metrics} charts={charts} />
          )}
          {activeTab === 'agents' && (
             <AgentsTab opportunities={opportunities} users={userProfiles} />
          )}
          {activeTab === 'deals' && (
             <DealsTab opportunities={opportunities} users={userProfiles} />
          )}
        </div>

        {/* Right Sidebar Filters - Spans 1 column */}
        <div className="xl:col-span-1">
          <DashboardFilters />
        </div>
      </div>
    </div>
    </PermissionGate>
  );
}