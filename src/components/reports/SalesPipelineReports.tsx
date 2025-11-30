import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { TrendingUp, DollarSign, Calendar, Edit2 } from 'lucide-react';
import type { User } from '../../App';
import { createClient } from '../../utils/supabase/client';

interface SalesPipelineReportsProps {
  user: User;
  showCost?: boolean;
}

export function SalesPipelineReports({ user, showCost = false }: SalesPipelineReportsProps) {
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30days');
  const [pipelineByStage, setPipelineByStage] = useState<any[]>([]);
  const [topOpportunities, setTopOpportunities] = useState<any[]>([]);
  const [totals, setTotals] = useState({
    totalOpportunities: 0,
    totalPipelineValue: 0,
    totalPipelineCost: 0,
    avgDealSize: 0,
    avgDealCost: 0,
  });
  const [conversionRates, setConversionRates] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, [user.organizationId, timeRange]);

  const fetchData = async () => {
    const supabase = createClient();
    
    try {
      // Calculate date range based on timeRange
      const now = new Date();
      let startDate = new Date();
      
      switch (timeRange) {
        case '7days':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30days':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90days':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
      }

      console.log('📊 [SalesPipelineReports] Fetching data for org:', user.organizationId, 'Time range:', timeRange);

      // Fetch opportunities (filtered by organization and date range)
      // Don't use joins since foreign keys may not be set up
      const { data: allOpportunities, error: oppError } = await supabase
        .from('opportunities')
        .select('*')
        .eq('organization_id', user.organizationId);

      if (oppError) {
        console.error('❌ [SalesPipelineReports] Error fetching opportunities:', oppError);
      } else {
        console.log('✅ [SalesPipelineReports] Fetched opportunities:', allOpportunities?.length || 0);
      }

      // Filter by date range (created or updated in range)
      const opportunities = allOpportunities?.filter(o => {
        const createdDate = new Date(o.created_at);
        const updatedDate = new Date(o.updated_at);
        return createdDate >= startDate || updatedDate >= startDate;
      }) || [];

      if (opportunities.length > 0) {
        // Group by stage
        const stages = ['Prospecting', 'Qualification', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'];
        const stageColors = ['blue', 'indigo', 'purple', 'pink', 'green', 'red'];
        
        const totalValue = opportunities.reduce((sum, opp) => sum + (opp.value || 0), 0);
        const totalCost = opportunities.reduce((sum, opp) => sum + (opp.cost || 0), 0);
        
        const grouped = stages.map((stage, idx) => {
          const stageOpps = opportunities.filter(o => o.stage === stage);
          const stageValue = stageOpps.reduce((sum, opp) => sum + (opp.value || 0), 0);
          const stageCost = stageOpps.reduce((sum, opp) => sum + (opp.cost || 0), 0);
          
          return {
            stage,
            count: stageOpps.length,
            value: stageValue,
            cost: stageCost,
            percentage: totalValue > 0 ? Math.round((stageValue / totalValue) * 100) : 0,
            color: stageColors[idx]
          };
        }).filter(s => s.count > 0);
        
        setPipelineByStage(grouped);

        // Calculate conversion rates between stages
        const conversionData = [];
        for (let i = 0; i < stages.length - 2; i++) {
          const currentStage = stages[i];
          const nextStage = stages[i + 1];
          const currentCount = opportunities.filter(o => o.stage === currentStage).length;
          const nextCount = opportunities.filter(o => o.stage === nextStage).length;
          
          if (currentCount > 0) {
            conversionData.push({
              from: currentStage,
              to: nextStage,
              rate: Math.round((nextCount / currentCount) * 100)
            });
          }
        }
        setConversionRates(conversionData);

        // Get top opportunities by value (active ones only)
        const top = opportunities
          .filter(o => o.stage !== 'Closed Won' && o.stage !== 'Closed Lost')
          .sort((a, b) => (b.value || 0) - (a.value || 0))
          .slice(0, 5)
          .map(opp => ({
            id: opp.id,
            name: opp.title || 'Untitled',
            value: opp.value || 0,
            cost: opp.cost || 0,
            stage: opp.stage || opp.status || 'Unknown',
            probability: opp.probability || 50,
            expectedClose: opp.expected_close_date || new Date().toISOString().split('T')[0],
            owner: 'Loading...',
            ownerId: opp.owner_id || opp.created_by,
            contactName: 'Loading...',
            contactId: opp.customer_id
          }));
        
        // Fetch owner names for top opportunities
        const ownerIds = [...new Set(top.map(o => o.ownerId).filter(Boolean))];
        if (ownerIds.length > 0) {
          const { data: owners } = await supabase
            .from('profiles')
            .select('id, name')
            .in('id', ownerIds);
          
          if (owners) {
            top.forEach(opp => {
              const owner = owners.find(u => u.id === opp.ownerId);
              if (owner) {
                opp.owner = owner.name || 'Unassigned';
              } else {
                opp.owner = 'Unassigned';
              }
            });
          }
        }

        // Fetch contact names for top opportunities
        const contactIds = [...new Set(top.map(o => o.contactId).filter(Boolean))];
        if (contactIds.length > 0) {
          const { data: contacts } = await supabase
            .from('contacts')
            .select('id, name')
            .in('id', contactIds);
          
          if (contacts) {
            top.forEach(opp => {
              const contact = contacts.find(c => c.id === opp.contactId);
              if (contact) {
                opp.contactName = contact.name || 'N/A';
              } else {
                opp.contactName = 'N/A';
              }
            });
          }
        }
        
        setTopOpportunities(top);

        // Calculate totals
        const totalOpportunities = opportunities.length;
        const totalPipelineValue = totalValue;
        const totalPipelineCost = totalCost;
        const avgDealSize = totalOpportunities > 0 ? totalValue / totalOpportunities : 0;
        const avgDealCost = totalOpportunities > 0 ? totalCost / totalOpportunities : 0;
        
        setTotals({
          totalOpportunities,
          totalPipelineValue,
          totalPipelineCost,
          avgDealSize,
          avgDealCost
        });
      } else {
        // Reset to empty states
        setPipelineByStage([]);
        setTopOpportunities([]);
        setConversionRates([]);
        setTotals({
          totalOpportunities: 0,
          totalPipelineValue: 0,
          totalPipelineCost: 0,
          avgDealSize: 0,
          avgDealCost: 0
        });
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching sales pipeline data:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">
      <div className="text-gray-500">Loading sales reports...</div>
    </div>;
  }

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'Prospecting': return 'bg-blue-100 text-blue-700';
      case 'Qualification': return 'bg-indigo-100 text-indigo-700';
      case 'Proposal': return 'bg-purple-100 text-purple-700';
      case 'Negotiation': return 'bg-pink-100 text-pink-700';
      case 'Closed Won': return 'bg-green-100 text-green-700';
      case 'Closed Lost': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl text-gray-900">Sales & Pipeline Reports</h2>
        <Select value={timeRange} onValueChange={setTimeRange}>
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

      {pipelineByStage.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-gray-500">
              <TrendingUp className="h-12 w-12 mx-auto mb-3 text-gray-400" />
              <p>No opportunities found for the selected time period</p>
              <p className="text-sm mt-1">Create your first opportunity to see pipeline reports</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Opportunity Pipeline by Stage */}
          <Card>
            <CardHeader>
              <CardTitle>Opportunity Pipeline by Stage</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {pipelineByStage.map((stage) => {
                  const displayValue = showCost ? stage.cost : stage.value;
                  return (
                    <div key={stage.stage}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-gray-900">{stage.stage}</span>
                          <Badge className={`bg-${stage.color}-100 text-${stage.color}-700`}>
                            {stage.count} deals
                          </Badge>
                        </div>
                        <span className="text-sm text-gray-900">${(displayValue / 1000).toFixed(0)}K</span>
                      </div>
                      <div className="h-8 bg-gray-200 rounded-lg overflow-hidden relative">
                        <div
                          className={`h-full bg-${stage.color}-500 flex items-center px-3 text-white text-sm`}
                          style={{ width: `${Math.max(stage.percentage, 2)}%` }}
                        >
                          {stage.percentage > 0 && `${stage.percentage}%`}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 pt-6 border-t">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Total Opportunities</p>
                    <p className="text-2xl text-gray-900 mt-1">{totals.totalOpportunities}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">
                      {showCost ? 'Total Pipeline Cost' : 'Total Pipeline Value'}
                    </p>
                    <p className="text-2xl text-gray-900 mt-1">
                      ${showCost 
                        ? (totals.totalPipelineCost / 1000).toFixed(0) 
                        : (totals.totalPipelineValue / 1000).toFixed(0)}K
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">
                      {showCost ? 'Avg Deal Cost' : 'Avg Deal Size'}
                    </p>
                    <p className="text-2xl text-gray-900 mt-1">
                      ${showCost 
                        ? (totals.avgDealCost / 1000).toFixed(0) 
                        : (totals.avgDealSize / 1000).toFixed(0)}K
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Conversion Rates */}
          {conversionRates.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Stage Conversion Rates</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {conversionRates.map((conversion, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="h-4 w-4 text-green-600" />
                        <span className="text-xs text-gray-500">{conversion.from} → {conversion.to}</span>
                      </div>
                      <p className="text-2xl text-gray-900">{conversion.rate}%</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Top Opportunities by Value */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Top Opportunities by Value</CardTitle>
                <p className="text-sm text-gray-500">Go to Opportunities page to edit</p>
              </div>
            </CardHeader>
            <CardContent>
              {topOpportunities.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 text-sm text-gray-600">Opportunity</th>
                        <th className="text-left py-3 px-4 text-sm text-gray-600">
                          {showCost ? 'Cost' : 'Value'}
                        </th>
                        <th className="text-left py-3 px-4 text-sm text-gray-600">Stage</th>
                        <th className="text-left py-3 px-4 text-sm text-gray-600">Probability</th>
                        <th className="text-left py-3 px-4 text-sm text-gray-600">Expected Close</th>
                        <th className="text-left py-3 px-4 text-sm text-gray-600">Owner</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topOpportunities.map((opp, index) => {
                        const displayAmount = showCost ? opp.cost : opp.value;
                        return (
                          <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 px-4 text-sm text-gray-900">{opp.name}</td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-1">
                                <DollarSign className="h-4 w-4 text-green-600" />
                                <span className="text-sm text-gray-900">
                                  {displayAmount > 0 ? `${(displayAmount / 1000).toFixed(0)}K` : '—'}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <Badge className={getStageColor(opp.stage)}>{opp.stage}</Badge>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-[60px]">
                                  <div 
                                    className="bg-green-500 h-2 rounded-full"
                                    style={{ width: `${opp.probability}%` }}
                                  />
                                </div>
                                <span className="text-sm text-gray-600">{opp.probability}%</span>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-1 text-sm text-gray-600">
                                <Calendar className="h-4 w-4" />
                                {new Date(opp.expectedClose).toLocaleDateString()}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-600">{opp.owner}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-8 text-center text-gray-500">
                  All opportunities are either won or lost. Great job closing deals!
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}