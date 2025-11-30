import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { TrendingUp, Users, Building, MapPin, DollarSign } from 'lucide-react';
import type { User } from '../../App';
import { createClient } from '../../utils/supabase/client';

interface ContactCustomerReportsProps {
  user: User;
}

export function ContactCustomerReports({ user }: ContactCustomerReportsProps) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalContacts: 0,
    activeCustomers: 0,
    newThisMonth: 0,
  });
  const [contactsByType, setContactsByType] = useState<any[]>([]);
  const [contactsByPriceLevel, setContactsByPriceLevel] = useState<any[]>([]);
  const [topCustomers, setTopCustomers] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, [user.organizationId]);

  const fetchData = async () => {
    const supabase = createClient();
    
    try {
      // Fetch contacts (filtered by organization)
      const { data: contacts } = await supabase
        .from('contacts')
        .select('*')
        .eq('tenant_id', user.organizationId);

      if (contacts) {
        // Calculate date for "this month"
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const newThisMonth = contacts.filter(c => 
          new Date(c.created_at) >= firstDayOfMonth
        ).length;

        setStats({
          totalContacts: contacts.length,
          activeCustomers: contacts.filter(c => c.status === 'active').length,
          newThisMonth,
        });

        // Group by type
        const typeGroups = contacts.reduce((acc: any, contact) => {
          const type = contact.type || 'Other';
          if (!acc[type]) {
            acc[type] = { type, count: 0, value: 0 };
          }
          acc[type].count++;
          return acc;
        }, {});

        const typeData = Object.values(typeGroups).map((group: any) => ({
          ...group,
          percentage: Math.round((group.count / contacts.length) * 100),
        }));

        setContactsByType(typeData);

        // Group by price level
        const priceLevelGroups = contacts.reduce((acc: any, contact) => {
          const level = contact.price_level || contact.priceLevel || 'Retail';
          if (!acc[level]) {
            acc[level] = { level, count: 0 };
          }
          acc[level].count++;
          return acc;
        }, {});

        const priceLevelData = Object.values(priceLevelGroups).map((group: any) => ({
          ...group,
          percentage: Math.round((group.count / contacts.length) * 100),
        }));

        setContactsByPriceLevel(priceLevelData);

        // Get top customers by opportunities/bids value (filtered by organization)
        const { data: opportunities } = await supabase
          .from('opportunities')
          .select('contact_id, value')
          .eq('tenant_id', user.organizationId);

        const { data: bids } = await supabase
          .from('bids')
          .select('contact_id, total_amount')
          .eq('tenant_id', user.organizationId);

        // Calculate total value per contact
        const contactValues = new Map();
        
        opportunities?.forEach(opp => {
          if (opp.contact_id) {
            const current = contactValues.get(opp.contact_id) || 0;
            contactValues.set(opp.contact_id, current + (opp.value || 0));
          }
        });

        bids?.forEach(bid => {
          if (bid.contact_id) {
            const current = contactValues.get(bid.contact_id) || 0;
            contactValues.set(bid.contact_id, current + (bid.total_amount || 0));
          }
        });

        // Get top 5 contacts
        const topContacts = contacts
          .map(contact => ({
            name: contact.name,
            company: contact.company || 'N/A',
            type: contact.type || 'Other',
            totalValue: contactValues.get(contact.id) || 0,
            priceLevel: contact.price_level || contact.priceLevel || 'Retail',
          }))
          .sort((a, b) => b.totalValue - a.totalValue)
          .slice(0, 5);

        setTopCustomers(topContacts);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching contact customer data:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">
      <div className="text-gray-500">Loading contact reports...</div>
    </div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl text-gray-900">Contact & Customer Reports</h2>
        <Select defaultValue="year">
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="30days">Last 30 days</SelectItem>
            <SelectItem value="90days">Last 90 days</SelectItem>
            <SelectItem value="year">This year</SelectItem>
            <SelectItem value="all">All time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Contacts</p>
                <p className="text-2xl mt-2 text-gray-900">{stats.totalContacts}</p>
                <div className="flex items-center gap-1 mt-2">
                  <TrendingUp className="h-3 w-3 text-green-600" />
                  <span className="text-xs text-green-600">+312 this year</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Customers</p>
                <p className="text-2xl mt-2 text-gray-900">{stats.activeCustomers}</p>
                <div className="flex items-center gap-1 mt-2">
                  <TrendingUp className="h-3 w-3 text-green-600" />
                  <span className="text-xs text-green-600">+18% growth</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">New This Month</p>
                <p className="text-2xl mt-2 text-gray-900">{stats.newThisMonth}</p>
                <div className="flex items-center gap-1 mt-2">
                  <TrendingUp className="h-3 w-3 text-green-600" />
                  <span className="text-xs text-green-600">+7% vs last month</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Revenue/Customer</p>
                <p className="text-2xl mt-2 text-gray-900">$96K</p>
                <div className="flex items-center gap-1 mt-2">
                  <TrendingUp className="h-3 w-3 text-green-600" />
                  <span className="text-xs text-green-600">+12%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* New Contacts by Type */}
      <Card>
        <CardHeader>
          <CardTitle>New Contacts Added by Type</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-end justify-between gap-2">
            {contactsByType.map((data, index) => (
              <div key={index} className="flex-1 flex flex-col items-center gap-2">
                <div 
                  className="w-full bg-blue-500 rounded-t hover:bg-blue-600 transition-colors cursor-pointer relative group"
                  style={{ height: `${(data.count / 350) * 100}%` }}
                >
                  <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                    {data.count} contacts
                  </div>
                </div>
                <span className="text-xs text-gray-500">{data.type}</span>
              </div>
            ))}
          </div>
          <div className="mt-6 pt-6 border-t">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-600">Total New Contacts</p>
                <p className="text-2xl text-gray-900 mt-1">2,723</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Monthly Average</p>
                <p className="text-2xl text-gray-900 mt-1">227</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Growth Rate</p>
                <p className="text-2xl text-green-600 mt-1">+115%</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Customer Segmentation by Type */}
      <Card>
        <CardHeader>
          <CardTitle>Customer Segmentation by Type</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm text-gray-600">Type</th>
                  <th className="text-left py-3 px-4 text-sm text-gray-600">Contacts</th>
                  <th className="text-left py-3 px-4 text-sm text-gray-600">Percentage</th>
                  <th className="text-left py-3 px-4 text-sm text-gray-600">Distribution</th>
                </tr>
              </thead>
              <tbody>
                {contactsByType.map((segment, index) => (
                  <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-900">{segment.type}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">{segment.count}</td>
                    <td className="py-3 px-4">
                      <Badge className="bg-blue-100 text-blue-700">{segment.percentage}%</Badge>
                    </td>
                    <td className="py-3 px-4">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="h-2 bg-blue-500 rounded-full"
                          style={{ width: `${segment.percentage}%` }}
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

      {/* Segmentation Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Price Level */}
        <Card>
          <CardHeader>
            <CardTitle>Segmentation by Price Level</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {contactsByPriceLevel.map((segment, index) => (
                <div key={index}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-900">{segment.level}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">{segment.count}</span>
                      <Badge className="bg-blue-100 text-blue-700">
                        {segment.percentage}%
                      </Badge>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="h-2 bg-blue-500 rounded-full"
                      style={{ width: `${segment.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Customers by Revenue */}
      <Card>
        <CardHeader>
          <CardTitle>Top Customers by Revenue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm text-gray-600">Customer</th>
                  <th className="text-left py-3 px-4 text-sm text-gray-600">Company</th>
                  <th className="text-left py-3 px-4 text-sm text-gray-600">Type</th>
                  <th className="text-left py-3 px-4 text-sm text-gray-600">Price Level</th>
                  <th className="text-left py-3 px-4 text-sm text-gray-600">Total Revenue</th>
                </tr>
              </thead>
              <tbody>
                {topCustomers.map((customer, index) => (
                  <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm text-gray-900">{customer.name}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{customer.company}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <Building className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600">{customer.type}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge className="bg-blue-100 text-blue-700">{customer.priceLevel}</Badge>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-4 w-4 text-green-600" />
                        <span className="text-sm text-gray-900">{(customer.totalValue / 1000).toFixed(0)}K</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
