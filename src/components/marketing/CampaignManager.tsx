import { useState, useEffect } from 'react';
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
import { campaignsAPI } from '../../utils/api';
import { toast } from 'sonner';
import type { User } from '../../App';

interface CampaignManagerProps {
  user: User;
}

export function CampaignManager({ user }: CampaignManagerProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isABTestDialogOpen, setIsABTestDialogOpen] = useState(false);
  const [selectedCampaignType, setSelectedCampaignType] = useState('email');
  const [isCreating, setIsCreating] = useState(false);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  
  // Form state
  const [campaignName, setCampaignName] = useState('');
  const [audienceSegment, setAudienceSegment] = useState('');
  const [subjectLine, setSubjectLine] = useState('');
  const [previewText, setPreviewText] = useState('');
  const [emailContent, setEmailContent] = useState('');
  const [scheduleType, setScheduleType] = useState('now');
  const [scheduleDateTime, setScheduleDateTime] = useState('');

  // Load campaigns on mount
  useEffect(() => {
    loadCampaigns();
  }, []);

  const loadCampaigns = async () => {
    try {
      const { campaigns: data } = await campaignsAPI.getAll();
      setCampaigns(data || []);
    } catch (error) {
      console.error('Error loading campaigns:', error);
      toast.error('Failed to load campaigns');
    }
  };

  const handleCreateCampaign = async () => {
    if (!campaignName.trim()) {
      toast.error('Please enter a campaign name');
      return;
    }

    setIsCreating(true);
    try {
      const campaignData = {
        name: campaignName,
        type: selectedCampaignType,
        status: scheduleType === 'now' ? 'active' : 'scheduled',
        description: emailContent || previewText,
        start_date: scheduleType === 'schedule' && scheduleDateTime ? new Date(scheduleDateTime).toISOString() : new Date().toISOString(),
      };

      await campaignsAPI.create(campaignData);
      toast.success('Campaign created successfully!');
      setIsCreateDialogOpen(false);
      
      // Reset form
      setCampaignName('');
      setAudienceSegment('');
      setSubjectLine('');
      setPreviewText('');
      setEmailContent('');
      setScheduleType('now');
      setScheduleDateTime('');
      
      // Reload campaigns
      await loadCampaigns();
    } catch (error: any) {
      console.error('Error creating campaign:', error);
      toast.error(error.message || 'Failed to create campaign');
    } finally {
      setIsCreating(false);
    }
  };

  const handleOpenABTestDialog = () => {
    setIsABTestDialogOpen(true);
  };

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
              <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
                <TabsTrigger value="email" className="text-xs sm:text-sm">Email</TabsTrigger>
                <TabsTrigger value="sms" className="text-xs sm:text-sm">SMS</TabsTrigger>
                <TabsTrigger value="social" className="text-xs sm:text-sm">Social</TabsTrigger>
                <TabsTrigger value="multi" className="text-xs sm:text-sm">Multi-channel</TabsTrigger>
              </TabsList>

              <TabsContent value="email" className="space-y-4 mt-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Campaign Name</Label>
                    <Input placeholder="e.g., Spring Newsletter" value={campaignName} onChange={(e) => setCampaignName(e.target.value)} />
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
                    <Input placeholder="Your compelling subject line" value={subjectLine} onChange={(e) => setSubjectLine(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Preview Text</Label>
                    <Input placeholder="This appears after the subject in inbox" value={previewText} onChange={(e) => setPreviewText(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Email Content</Label>
                    <Textarea 
                      placeholder="Write your email content here... (Supports dynamic fields like {{firstName}}, {{company}})"
                      rows={8}
                      value={emailContent}
                      onChange={(e) => setEmailContent(e.target.value)}
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
                      <Input type="datetime-local" value={scheduleDateTime} onChange={(e) => setScheduleDateTime(e.target.value)} />
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                    <div>
                      <p className="text-sm text-gray-900">A/B Testing</p>
                      <p className="text-xs text-gray-600">Test subject lines, content, or send times</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleOpenABTestDialog}>Configure</Button>
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
              <Button className="flex-1" onClick={handleCreateCampaign} disabled={isCreating}>
                {isCreating ? 'Creating...' : 'Create Campaign'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* A/B Test Configuration Dialog */}
      <Dialog open={isABTestDialogOpen} onOpenChange={setIsABTestDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>A/B Test Configuration</DialogTitle>
            <DialogDescription>Set up variants to test different elements of your campaign</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Test Element</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="What do you want to test?" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="subject">Subject Line</SelectItem>
                  <SelectItem value="content">Email Content</SelectItem>
                  <SelectItem value="sendtime">Send Time</SelectItem>
                  <SelectItem value="sender">Sender Name</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Variant A</Label>
              <Input placeholder="Enter first variant" />
            </div>
            <div className="space-y-2">
              <Label>Variant B</Label>
              <Input placeholder="Enter second variant" />
            </div>
            <div className="space-y-2">
              <Label>Test Size (%)</Label>
              <Input type="number" min="10" max="50" defaultValue="20" placeholder="20" />
              <p className="text-xs text-gray-500">Percentage of audience to include in test</p>
            </div>
            <div className="space-y-2">
              <Label>Success Metric</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="How will you measure success?" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="opens">Open Rate</SelectItem>
                  <SelectItem value="clicks">Click Rate</SelectItem>
                  <SelectItem value="conversions">Conversion Rate</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2 mt-6">
            <Button variant="outline" onClick={() => setIsABTestDialogOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button className="flex-1" onClick={() => { setIsABTestDialogOpen(false); toast.success('A/B test configured!'); }}>
              Save Configuration
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
                  <p className="text-lg text-gray-900 mt-1">{(campaign.audience || 0).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Sent</p>
                  <p className="text-lg text-gray-900 mt-1">{(campaign.sent || 0).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Opened</p>
                  <p className="text-lg text-gray-900 mt-1">{campaign.opened || 0}</p>
                  <p className="text-xs text-gray-500">{(campaign.sent || 0) > 0 ? (((campaign.opened || 0) / (campaign.sent || 1)) * 100).toFixed(1) : 0}%</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Clicked</p>
                  <p className="text-lg text-gray-900 mt-1">{campaign.clicked || 0}</p>
                  <p className="text-xs text-gray-500">{(campaign.opened || 0) > 0 ? (((campaign.clicked || 0) / (campaign.opened || 1)) * 100).toFixed(1) : 0}%</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Converted</p>
                  <p className="text-lg text-gray-900 mt-1">{campaign.converted || 0}</p>
                  <p className="text-xs text-green-600">{(campaign.sent || 0) > 0 ? (((campaign.converted || 0) / (campaign.sent || 1)) * 100).toFixed(1) : 0}%</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Revenue</p>
                  <p className="text-lg text-gray-900 mt-1">${(campaign.revenue || 0).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Schedule</p>
                  <p className="text-sm text-gray-900 mt-1">{campaign.schedule || 'Not scheduled'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}