import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Badge } from '../ui/badge';
import { Plus, TrendingUp, Star, Mail, MousePointer, FileText, Calendar, Edit, Trash2 } from 'lucide-react';
import { Slider } from '../ui/slider';
import type { User } from '../../App';

interface LeadScoringProps {
  user: User;
}

export function LeadScoring({ user }: LeadScoringProps) {
  const [isCreateRuleOpen, setIsCreateRuleOpen] = useState(false);

  const scoringRules = [
    { id: 1, action: 'Email Opened', points: 5, category: 'Engagement' },
    { id: 2, action: 'Link Clicked', points: 10, category: 'Engagement' },
    { id: 3, action: 'Form Submitted', points: 25, category: 'Conversion' },
    { id: 4, action: 'Downloaded Resource', points: 15, category: 'Interest' },
    { id: 5, action: 'Visited Pricing Page', points: 20, category: 'Intent' },
    { id: 6, action: 'Requested Demo', points: 50, category: 'Intent' },
    { id: 7, action: 'Inactive for 30 days', points: -10, category: 'Decay' },
    { id: 8, action: 'Unsubscribed', points: -50, category: 'Negative' },
  ];

  const topLeads = [
    { id: 1, name: 'Sarah Johnson', email: 'sarah@techco.com', score: 95, status: 'Hot', company: 'TechCo', lastActivity: '2 hours ago' },
    { id: 2, name: 'Michael Brown', email: 'michael@startup.io', score: 87, status: 'Hot', company: 'Startup Inc', lastActivity: '5 hours ago' },
    { id: 3, name: 'Emily Davis', email: 'emily@corp.com', score: 78, status: 'Warm', company: 'BigCorp', lastActivity: '1 day ago' },
    { id: 4, name: 'David Wilson', email: 'david@company.com', score: 72, status: 'Warm', company: 'Company LLC', lastActivity: '2 days ago' },
    { id: 5, name: 'Lisa Anderson', email: 'lisa@business.com', score: 65, status: 'Warm', company: 'Business Inc', lastActivity: '3 days ago' },
  ];

  const segments = [
    { name: 'Hot Leads (80-100)', count: 45, percentage: 5 },
    { name: 'Warm Leads (50-79)', count: 234, percentage: 25 },
    { name: 'Cold Leads (1-49)', count: 456, percentage: 50 },
    { name: 'Unscored', count: 187, percentage: 20 },
  ];

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-red-600';
    if (score >= 50) return 'text-orange-600';
    return 'text-blue-600';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Hot':
        return 'bg-red-100 text-red-700';
      case 'Warm':
        return 'bg-orange-100 text-orange-700';
      case 'Cold':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl text-gray-900">Lead Scoring</h2>
          <p className="text-sm text-gray-600 mt-1">Automatically score and prioritize leads based on behavior</p>
        </div>
        <Dialog open={isCreateRuleOpen} onOpenChange={setIsCreateRuleOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Scoring Rule
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Scoring Rule</DialogTitle>
              <DialogDescription>Define a new rule to score leads based on their actions.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Action/Behavior</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select action" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email_open">Email Opened</SelectItem>
                    <SelectItem value="link_click">Link Clicked</SelectItem>
                    <SelectItem value="form_submit">Form Submitted</SelectItem>
                    <SelectItem value="page_visit">Page Visit</SelectItem>
                    <SelectItem value="demo_request">Demo Requested</SelectItem>
                    <SelectItem value="download">Downloaded Resource</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="engagement">Engagement</SelectItem>
                    <SelectItem value="interest">Interest</SelectItem>
                    <SelectItem value="intent">Purchase Intent</SelectItem>
                    <SelectItem value="conversion">Conversion</SelectItem>
                    <SelectItem value="decay">Score Decay</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Points ({0})</Label>
                <Slider defaultValue={[10]} max={100} min={-50} step={5} />
                <p className="text-xs text-gray-500">Use negative values for score decay</p>
              </div>
              <div className="flex gap-2 mt-6">
                <Button variant="outline" onClick={() => setIsCreateRuleOpen(false)} className="flex-1">
                  Cancel
                </Button>
                <Button className="flex-1">Create Rule</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Scoring Rules */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Scoring Rules</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {scoringRules.map((rule) => (
                  <div key={rule.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100">
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-lg ${
                        rule.points > 0 ? 'bg-green-100' : 'bg-red-100'
                      } flex items-center justify-center`}>
                        <span className={`text-sm ${
                          rule.points > 0 ? 'text-green-700' : 'text-red-700'
                        }`}>
                          {rule.points > 0 ? '+' : ''}{rule.points}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm text-gray-900">{rule.action}</p>
                        <p className="text-xs text-gray-500">{rule.category}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lead Segments */}
        <Card>
          <CardHeader>
            <CardTitle>Lead Segments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {segments.map((segment, index) => (
                <div key={index}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-900">{segment.name}</span>
                    <span className="text-sm text-gray-600">{segment.count}</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500"
                      style={{ width: `${segment.percentage}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{segment.percentage}% of total leads</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Scoring Leads */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Top Scoring Leads</CardTitle>
            <Button variant="outline" size="sm">View All</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm text-gray-600">Lead</th>
                  <th className="text-left py-3 px-4 text-sm text-gray-600">Company</th>
                  <th className="text-left py-3 px-4 text-sm text-gray-600">Score</th>
                  <th className="text-left py-3 px-4 text-sm text-gray-600">Status</th>
                  <th className="text-left py-3 px-4 text-sm text-gray-600">Last Activity</th>
                  <th className="text-left py-3 px-4 text-sm text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {topLeads.map((lead) => (
                  <tr key={lead.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div>
                        <p className="text-sm text-gray-900">{lead.name}</p>
                        <p className="text-xs text-gray-500">{lead.email}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm text-gray-600">{lead.company}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Star className={`h-4 w-4 ${getScoreColor(lead.score)}`} />
                        <span className={`text-lg ${getScoreColor(lead.score)}`}>{lead.score}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge className={getStatusBadge(lead.status)}>{lead.status}</Badge>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm text-gray-600">{lead.lastActivity}</span>
                    </td>
                    <td className="py-3 px-4">
                      <Button variant="outline" size="sm">Contact</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* AI Insights */}
      <Card className="bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200">
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-purple-600" />
            <CardTitle>AI-Powered Insights</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="p-3 bg-white rounded-lg">
              <p className="text-sm text-gray-900">💡 Leads who visit the pricing page 3+ times are 5x more likely to convert. Consider increasing scoring weight.</p>
            </div>
            <div className="p-3 bg-white rounded-lg">
              <p className="text-sm text-gray-900">🎯 Your "Hot Leads" segment has a 67% higher conversion rate. Prioritize immediate follow-up.</p>
            </div>
            <div className="p-3 bg-white rounded-lg">
              <p className="text-sm text-gray-900">📊 Leads scoring 80+ typically convert within 7 days. Create urgency-based campaigns for this segment.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}