import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { TrendingUp, TrendingDown, Clock, DollarSign } from 'lucide-react';
import type { User } from '../../App';
import { createClient } from '../../utils/supabase/client';

interface BidProposalReportsProps {
  user: User;
  showCost?: boolean;
}

export function BidProposalReports({ user, showCost = false }: BidProposalReportsProps) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalBids: 0,
    wonBids: 0,
    lostBids: 0,
    winRate: 0,
    avgValue: 0,
    avgCycle: 0,
  });
  const [winRateBySalesRep, setWinRateBySalesRep] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, [user.organizationId]);

  const fetchData = async () => {
    const supabase = createClient();
    
    try {
      console.log('📊 [BidProposalReports] Fetching data for org:', user.organizationId);

      // Fetch bids and quotes (filtered by organization)
      const { data: bids, error: bidsError } = await supabase
        .from('bids')
        .select('*')
        .eq('organization_id', user.organizationId);

      if (bidsError) {
        console.error('❌ [BidProposalReports] Error fetching bids:', bidsError);
      }

      const { data: quotes, error: quotesError } = await supabase
        .from('quotes')
        .select('*')
        .eq('organization_id', user.organizationId);

      if (quotesError) {
        console.error('❌ [BidProposalReports] Error fetching quotes:', quotesError);
      }

      const allBids = [...(bids || []), ...(quotes || [])];
      console.log('✅ [BidProposalReports] Fetched bids:', bids?.length || 0, 'quotes:', quotes?.length || 0);

      if (allBids.length > 0) {
        const wonBids = allBids.filter(b => b.status === 'accepted' || b.status === 'won').length;
        const lostBids = allBids.filter(b => b.status === 'rejected' || b.status === 'lost').length;
        const totalValue = allBids.reduce((sum, b) => sum + (b.total_amount || 0), 0);
        
        // Calculate average cycle time
        const bidsWithDates = allBids.filter(b => b.created_at && (b.accepted_date || b.closed_date));
        const avgCycle = bidsWithDates.length > 0
          ? Math.round(bidsWithDates.reduce((sum, b) => {
              const start = new Date(b.created_at);
              const end = new Date(b.accepted_date || b.closed_date);
              return sum + (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
            }, 0) / bidsWithDates.length)
          : 0;

        setStats({
          totalBids: allBids.length,
          wonBids,
          lostBids,
          winRate: wonBids + lostBids > 0 ? Math.round((wonBids / (wonBids + lostBids)) * 100) : 0,
          avgValue: Math.round(totalValue / allBids.length),
          avgCycle,
        });

        // Calculate win rate by sales rep (filtered by organization)
        const { data: users, error: usersError } = await supabase
          .from('profiles')
          .select('*')
          .eq('organization_id', user.organizationId);

        if (usersError) {
          console.error('❌ [BidProposalReports] Error fetching users:', usersError);
        }

        if (users) {
          const repStats = users.map(u => {
            const userBids = allBids.filter(b => b.created_by === u.id || b.assigned_to === u.id);
            const userWon = userBids.filter(b => b.status === 'accepted' || b.status === 'won').length;
            const userLost = userBids.filter(b => b.status === 'rejected' || b.status === 'lost').length;
            const userTotal = userWon + userLost;
            
            return {
              name: u.name,
              total: userTotal,
              won: userWon,
              lost: userLost,
              winRate: userTotal > 0 ? Math.round((userWon / userTotal) * 100) : 0,
              avgValue: userBids.length > 0 
                ? Math.round(userBids.reduce((sum, b) => sum + (b.total_amount || 0), 0) / userBids.length)
                : 0,
            };
          }).filter(r => r.total > 0).slice(0, 5);
          
          setWinRateBySalesRep(repStats);
        }
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching bid proposal data:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">
      <div className="text-gray-500">Loading bid reports...</div>
    </div>;
  }

  const bidMetrics = [
    { month: 'Jan', avgValue: 42000, avgCycle: 18 },
    { month: 'Feb', avgValue: 38000, avgCycle: 21 },
    { month: 'Mar', avgValue: 45000, avgCycle: 19 },
    { month: 'Apr', avgValue: 41000, avgCycle: 17 },
    { month: 'May', avgValue: 48000, avgCycle: 16 },
    { month: 'Jun', avgValue: 52000, avgCycle: 15 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl text-gray-900">Bid & Proposal Reports</h2>
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
                <p className="text-sm text-gray-600">Overall Win Rate</p>
                <p className="text-2xl mt-2 text-gray-900">{stats.winRate}%</p>
                <div className="flex items-center gap-1 mt-2">
                  <TrendingUp className="h-3 w-3 text-green-600" />
                  <span className="text-xs text-green-600">+5% vs last month</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Bids Submitted</p>
                <p className="text-2xl mt-2 text-gray-900">{stats.totalBids}</p>
                <div className="flex items-center gap-1 mt-2">
                  <TrendingUp className="h-3 w-3 text-green-600" />
                  <span className="text-xs text-green-600">+12 this month</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Bid Value</p>
                <p className="text-2xl mt-2 text-gray-900">${(stats.avgValue / 1000).toFixed(0)}K</p>
                <div className="flex items-center gap-1 mt-2">
                  <TrendingUp className="h-3 w-3 text-green-600" />
                  <span className="text-xs text-green-600">+$3K</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Cycle Time</p>
                <p className="text-2xl mt-2 text-gray-900">{stats.avgCycle} days</p>
                <div className="flex items-center gap-1 mt-2">
                  <TrendingDown className="h-3 w-3 text-green-600" />
                  <span className="text-xs text-green-600">-2 days faster</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Win Rate by Sales Rep */}
      <Card>
        <CardHeader>
          <CardTitle>Bid Win Rate by Sales Representative</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm text-gray-600">Sales Rep</th>
                  <th className="text-left py-3 px-4 text-sm text-gray-600">Total Bids</th>
                  <th className="text-left py-3 px-4 text-sm text-gray-600">Won</th>
                  <th className="text-left py-3 px-4 text-sm text-gray-600">Lost</th>
                  <th className="text-left py-3 px-4 text-sm text-gray-600">Win Rate</th>
                  <th className="text-left py-3 px-4 text-sm text-gray-600">Avg Value</th>
                </tr>
              </thead>
              <tbody>
                {winRateBySalesRep.map((rep, index) => (
                  <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm text-gray-900">{rep.name}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{rep.total}</td>
                    <td className="py-3 px-4">
                      <Badge className="bg-green-100 text-green-700">{rep.won}</Badge>
                    </td>
                    <td className="py-3 px-4">
                      <Badge className="bg-red-100 text-red-700">{rep.lost}</Badge>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-sm ${
                        rep.winRate >= 65 ? 'text-green-600' :
                        rep.winRate >= 55 ? 'text-orange-600' :
                        'text-red-600'
                      }`}>
                        {rep.winRate}%
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-900">{(rep.avgValue / 1000).toFixed(0)}K</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Bid Value & Cycle Time Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Average Bid Value Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-end justify-between gap-2">
              {bidMetrics.map((data, index) => (
                <div key={index} className="flex-1 flex flex-col items-center gap-2">
                  <div 
                    className="w-full bg-blue-500 rounded-t hover:bg-blue-600 transition-colors cursor-pointer relative group"
                    style={{ height: `${(data.avgValue / 60000) * 100}%` }}
                  >
                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                      ${(data.avgValue / 1000).toFixed(0)}K
                    </div>
                  </div>
                  <span className="text-xs text-gray-500">{data.month}</span>
                </div>
              ))}
            </div>
            <div className="mt-6 pt-6 border-t">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Avg Value</p>
                  <p className="text-xl text-gray-900 mt-1">$44K</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Change</p>
                  <p className="text-xl text-green-600 mt-1">+24%</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Average Cycle Time Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-end justify-between gap-2">
              {bidMetrics.map((data, index) => (
                <div key={index} className="flex-1 flex flex-col items-center gap-2">
                  <div 
                    className="w-full bg-orange-500 rounded-t hover:bg-orange-600 transition-colors cursor-pointer relative group"
                    style={{ height: `${(data.avgCycle / 25) * 100}%` }}
                  >
                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                      {data.avgCycle} days
                    </div>
                  </div>
                  <span className="text-xs text-gray-500">{data.month}</span>
                </div>
              ))}
            </div>
            <div className="mt-6 pt-6 border-t">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Avg Cycle Time</p>
                  <p className="text-xl text-gray-900 mt-1">17 days</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Improvement</p>
                  <p className="text-xl text-green-600 mt-1">-14%</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}