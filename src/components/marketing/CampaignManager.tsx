import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Badge } from '../ui/badge';
import { 
  Plus, 
  Mail, 
  MessageSquare, 
  Facebook, 
  Instagram,
  Play,
  Pause,
  Copy,
  Trash2,
  MoreVertical,
  Calendar,
  Users,
  TrendingUp,
  Edit
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import type { User } from '../../App';

interface CampaignManagerProps {
  user: User;
}

export function CampaignManager({ user }: CampaignManagerProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedCampaignType, setSelectedCampaignType] = useState('email');

  const campaigns = [
    {
      id: 1,
      name: 'Summer Product Launch',
      type: 'Email',
      status: 'Active',
      channel: 'email',
      audience: 2450,
      sent: 2450,
      opened: 698,
      clicked: 147,
      converted: 23,
      revenue: 12500,
      schedule: 'Daily at 10:00 AM',
      created: '2025-01-15'
    },
    {
      id: 2,
      name: 'Re-engagement Campaign',
      type: 'Multi-channel',
      status: 'Active',
      channel: 'multi',
      audience: 1200,
      sent: 1200,
      opened: 384,
      clicked: 92,
      converted: 15,
      revenue: 8900,
      schedule: 'Trigger-based',
      created: '2025-01-10'
    },
    {
      id: 3,
      name: 'Webinar Follow-up',
      type: 'Email',
      status: 'Completed',
      channel: 'email',
      audience: 850,
      sent: 850,
      opened: 289,
      clicked: 71,
      converted: 12,
      revenue: 6700,
      schedule: 'One-time',
      created: '2025-01-05'
    },
    {
      id: 4,
      name: 'SMS Flash Sale',
      type: 'SMS',
      status: 'Scheduled',
      channel: 'sms',
      audience: 3200,
      sent: 0,
      opened: 0,
      clicked: 0,
      converted: 0,
      revenue: 0,
      schedule: 'Jan 20, 2025 at 2:00 PM',
      created: '2025-01-12'
    },
  ];

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'email':
        return <Mail className="h-4 w-4" />;
      case 'sms':
        return <MessageSquare className="h-4 w-4" />;
      case 'facebook':
        return <Facebook className="h-4 w-4" />;
      case 'instagram':
        return <Instagram className="h-4 w-4" />;
      default:
        return <Mail className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-green-100 text-green-700';
      case 'Paused':
        return 'bg-yellow-100 text-yellow-700';
      case 'Scheduled':
        return 'bg-blue-100 text-blue-700';
      case 'Completed':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl text-gray-900">Campaign Management</h2>
          <p className="text-sm text-gray-600 mt-1">Create and manage omnichannel marketing campaigns</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create Campaign
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Campaign</DialogTitle>
              <DialogDescription>Choose the type of campaign you want to create.</DialogDescription>
            </DialogHeader>
            <Tabs value={selectedCampaignType} onValueChange={setSelectedCampaignType}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="email">Email</TabsTrigger>
                <TabsTrigger value="sms">SMS</TabsTrigger>
                <TabsTrigger value="social">Social</TabsTrigger>
                <TabsTrigger value="multi">Multi-channel</TabsTrigger>
              </TabsList>

              <TabsContent value="email" className="space-y-4 mt-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Campaign Name</Label>
                    <Input placeholder="e.g., Spring Newsletter" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Audience Segment</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select segment" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Contacts</SelectItem>
                          <SelectItem value="engaged">Engaged Users</SelectItem>
                          <SelectItem value="inactive">Inactive Users</SelectItem>
                          <SelectItem value="new">New Leads</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Campaign Type</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="one-time">One-time Send</SelectItem>
                          <SelectItem value="drip">Drip Campaign</SelectItem>
                          <SelectItem value="trigger">Trigger-based</SelectItem>
                          <SelectItem value="recurring">Recurring</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Subject Line</Label>
                    <Input placeholder="Your compelling subject line" />
                  </div>
                  <div className="space-y-2">
                    <Label>Preview Text</Label>
                    <Input placeholder="This appears after the subject in inbox" />
                  </div>
                  <div className="space-y-2">
                    <Label>Email Content</Label>
                    <Textarea 
                      placeholder="Write your email content here... (Supports dynamic fields like {{firstName}}, {{company}})"
                      rows={8}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Schedule</Label>
                    <div className="grid grid-cols-2 gap-4">
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Send immediately" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="now">Send Immediately</SelectItem>
                          <SelectItem value="schedule">Schedule for Later</SelectItem>
                          <SelectItem value="optimize">AI Optimize Send Time</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input type="datetime-local" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                    <div>
                      <p className="text-sm text-gray-900">A/B Testing</p>
                      <p className="text-xs text-gray-600">Test subject lines, content, or send times</p>
                    </div>
                    <Button variant="outline" size="sm">Configure</Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="sms" className="space-y-4 mt-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Campaign Name</Label>
                    <Input placeholder="e.g., Flash Sale Alert" />
                  </div>
                  <div className="space-y-2">
                    <Label>Audience Segment</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select segment" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All SMS Subscribers</SelectItem>
                        <SelectItem value="vip">VIP Customers</SelectItem>
                        <SelectItem value="cart">Abandoned Cart</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Message (160 characters)</Label>
                    <Textarea 
                      placeholder="Your SMS message..."
                      rows={4}
                      maxLength={160}
                    />
                    <p className="text-xs text-gray-500">Character count: 0/160</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Include Link</Label>
                    <Input placeholder="https://your-landing-page.com" />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="social" className="space-y-4 mt-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Campaign Name</Label>
                    <Input placeholder="e.g., Social Media Promotion" />
                  </div>
                  <div className="space-y-2">
                    <Label>Platforms</Label>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex items-center gap-2">
                        <Facebook className="h-4 w-4" />
                        Facebook
                      </Button>
                      <Button variant="outline" size="sm" className="flex items-center gap-2">
                        <Instagram className="h-4 w-4" />
                        Instagram
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Post Content</Label>
                    <Textarea 
                      placeholder="Your social media post..."
                      rows={6}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="multi" className="space-y-4 mt-4">
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Create coordinated campaigns across email, SMS, and social media channels
                  </p>
                  <div className="space-y-2">
                    <Label>Campaign Name</Label>
                    <Input placeholder="e.g., Product Launch - Multi-channel" />
                  </div>
                  <div className="space-y-2">
                    <Label>Select Channels</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {['Email', 'SMS', 'Facebook', 'Instagram'].map((channel) => (
                        <Button key={channel} variant="outline" className="justify-start">
                          {channel}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex gap-2 mt-6">
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)} className="flex-1">
                Cancel
              </Button>
              <Button className="flex-1">Create Campaign</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Campaigns Grid */}
      <div className="grid grid-cols-1 gap-6">
        {campaigns.map((campaign) => (
          <Card key={campaign.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    {getChannelIcon(campaign.channel)}
                  </div>
                  <div>
                    <CardTitle className="text-lg">{campaign.name}</CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className={getStatusColor(campaign.status)}>{campaign.status}</Badge>
                      <span className="text-xs text-gray-500">•</span>
                      <span className="text-xs text-gray-500">{campaign.type}</span>
                    </div>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      {campaign.status === 'Active' ? (
                        <>
                          <Pause className="h-4 w-4 mr-2" />
                          Pause
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4 mr-2" />
                          Activate
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Copy className="h-4 w-4 mr-2" />
                      Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-red-600">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                <div>
                  <p className="text-xs text-gray-500">Audience</p>
                  <p className="text-lg text-gray-900 mt-1">{campaign.audience.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Sent</p>
                  <p className="text-lg text-gray-900 mt-1">{campaign.sent.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Opened</p>
                  <p className="text-lg text-gray-900 mt-1">{campaign.opened}</p>
                  <p className="text-xs text-gray-500">{campaign.sent > 0 ? ((campaign.opened / campaign.sent) * 100).toFixed(1) : 0}%</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Clicked</p>
                  <p className="text-lg text-gray-900 mt-1">{campaign.clicked}</p>
                  <p className="text-xs text-gray-500">{campaign.opened > 0 ? ((campaign.clicked / campaign.opened) * 100).toFixed(1) : 0}%</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Converted</p>
                  <p className="text-lg text-gray-900 mt-1">{campaign.converted}</p>
                  <p className="text-xs text-green-600">{campaign.sent > 0 ? ((campaign.converted / campaign.sent) * 100).toFixed(1) : 0}%</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Revenue</p>
                  <p className="text-lg text-gray-900 mt-1">${campaign.revenue.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Schedule</p>
                  <p className="text-sm text-gray-900 mt-1">{campaign.schedule}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}