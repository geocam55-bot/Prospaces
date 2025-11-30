import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { 
  Plus, 
  Play, 
  Pause,
  Edit,
  Copy,
  Trash2,
  MoreVertical,
  Mail,
  MessageSquare,
  Clock,
  GitBranch,
  Filter,
  CheckCircle
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import type { User } from '../../App';

interface JourneyBuilderProps {
  user: User;
}

export function JourneyBuilder({ user }: JourneyBuilderProps) {
  const [selectedJourney, setSelectedJourney] = useState<number | null>(null);

  const journeys = [
    {
      id: 1,
      name: 'Welcome Series',
      status: 'Active',
      trigger: 'New Contact Created',
      enrolled: 234,
      completed: 187,
      steps: 5,
      avgTime: '7 days',
      conversionRate: 24
    },
    {
      id: 2,
      name: 'Abandoned Cart Recovery',
      status: 'Active',
      trigger: 'Cart Abandoned',
      enrolled: 456,
      completed: 289,
      steps: 3,
      avgTime: '24 hours',
      conversionRate: 18
    },
    {
      id: 3,
      name: 'Re-engagement Campaign',
      status: 'Paused',
      trigger: 'Inactive for 30 days',
      enrolled: 123,
      completed: 45,
      steps: 4,
      avgTime: '14 days',
      conversionRate: 12
    },
    {
      id: 4,
      name: 'Product Education Series',
      status: 'Active',
      trigger: 'Product Purchased',
      enrolled: 89,
      completed: 67,
      steps: 6,
      avgTime: '10 days',
      conversionRate: 31
    },
  ];

  const journeySteps = [
    { type: 'trigger', icon: Play, title: 'Trigger: Form Submitted', color: 'green' },
    { type: 'delay', icon: Clock, title: 'Wait 1 hour', color: 'blue' },
    { type: 'email', icon: Mail, title: 'Send Welcome Email', color: 'purple' },
    { type: 'delay', icon: Clock, title: 'Wait 2 days', color: 'blue' },
    { type: 'condition', icon: GitBranch, title: 'Did they open email?', color: 'orange' },
    { type: 'email', icon: Mail, title: 'Send Follow-up (Yes)', color: 'purple' },
    { type: 'email', icon: Mail, title: 'Send Re-engagement (No)', color: 'purple' },
    { type: 'delay', icon: Clock, title: 'Wait 3 days', color: 'blue' },
    { type: 'sms', icon: MessageSquare, title: 'Send SMS Reminder', color: 'indigo' },
    { type: 'end', icon: CheckCircle, title: 'Journey Complete', color: 'green' },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-green-100 text-green-700';
      case 'Paused':
        return 'bg-yellow-100 text-yellow-700';
      case 'Draft':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl text-gray-900">Customer Journey Builder</h2>
          <p className="text-sm text-gray-600 mt-1">Create automated workflows based on customer behavior</p>
        </div>
        <Button className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Create Journey
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Journey List */}
        <div className="lg:col-span-1 space-y-4">
          {journeys.map((journey) => (
            <Card
              key={journey.id}
              className={`cursor-pointer transition-all ${
                selectedJourney === journey.id ? 'ring-2 ring-blue-500' : ''
              }`}
              onClick={() => setSelectedJourney(journey.id)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-sm">{journey.name}</CardTitle>
                    </div>
                    <Badge className={`${getStatusColor(journey.status)} mt-2`}>
                      {journey.status}
                    </Badge>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        {journey.status === 'Active' ? (
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
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">Trigger:</span>
                    <span className="text-gray-900">{journey.trigger}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">Enrolled:</span>
                    <span className="text-gray-900">{journey.enrolled}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">Completed:</span>
                    <span className="text-gray-900">{journey.completed}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">Avg. Time:</span>
                    <span className="text-gray-900">{journey.avgTime}</span>
                  </div>
                  <div className="pt-2 border-t">
                    <p className="text-xs text-gray-600">Conversion Rate</p>
                    <p className="text-lg text-green-600">{journey.conversionRate}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Journey Visual Builder */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Journey Flow</CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">
                    <Filter className="h-4 w-4 mr-2" />
                    Add Step
                  </Button>
                  <Button size="sm">
                    Save Changes
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {selectedJourney ? (
                <div className="space-y-4">
                  <div className="relative">
                    {/* Journey Steps Visualization */}
                    <div className="space-y-6">
                      {journeySteps.map((step, index) => {
                        const Icon = step.icon;
                        const isCondition = step.type === 'condition';
                        
                        return (
                          <div key={index} className="relative">
                            {index > 0 && !isCondition && (
                              <div className="absolute left-6 -top-6 w-0.5 h-6 bg-gray-300" />
                            )}
                            
                            {isCondition && (
                              <div className="absolute left-6 top-12 w-0.5 h-full bg-gray-300" />
                            )}
                            
                            <div className={`flex items-start gap-4 ${isCondition ? 'ml-0' : ''}`}>
                              <div className={`h-12 w-12 rounded-lg bg-${step.color}-100 flex items-center justify-center flex-shrink-0`}>
                                <Icon className={`h-6 w-6 text-${step.color}-600`} />
                              </div>
                              <div className="flex-1 bg-white border-2 border-gray-200 rounded-lg p-4 hover:border-blue-500 cursor-pointer transition-colors">
                                <p className="text-sm text-gray-900">{step.title}</p>
                                <p className="text-xs text-gray-500 mt-1 capitalize">{step.type}</p>
                              </div>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </div>

                            {/* Branch visualization for conditions */}
                            {isCondition && (
                              <div className="ml-12 mt-4 space-y-4">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-0.5 bg-gray-300" />
                                  <Badge className="bg-green-100 text-green-700">Yes</Badge>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-0.5 bg-gray-300" />
                                  <Badge className="bg-red-100 text-red-700">No</Badge>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Journey Stats */}
                  <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="pt-6">
                      <div className="grid grid-cols-4 gap-4">
                        <div>
                          <p className="text-xs text-gray-600">Total Steps</p>
                          <p className="text-xl text-gray-900 mt-1">{journeySteps.length}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Avg. Duration</p>
                          <p className="text-xl text-gray-900 mt-1">7 days</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Active Users</p>
                          <p className="text-xl text-gray-900 mt-1">156</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Drop-off Rate</p>
                          <p className="text-xl text-red-600 mt-1">8%</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="flex items-center justify-center h-96 text-gray-500">
                  <div className="text-center">
                    <Play className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p>Select a journey to view and edit</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Available Triggers */}
      <Card>
        <CardHeader>
          <CardTitle>Available Triggers & Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="text-sm text-gray-900 mb-3">Entry Triggers</h3>
              <div className="space-y-2">
                {['Form Submitted', 'Contact Created', 'Tag Added', 'Page Visited', 'Email Clicked', 'Purchase Made'].map((trigger) => (
                  <div key={trigger} className="p-2 bg-gray-50 rounded text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">
                    {trigger}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-sm text-gray-900 mb-3">Actions</h3>
              <div className="space-y-2">
                {['Send Email', 'Send SMS', 'Add Tag', 'Update Score', 'Create Task', 'Send Notification'].map((action) => (
                  <div key={action} className="p-2 bg-gray-50 rounded text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">
                    {action}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-sm text-gray-900 mb-3">Control Flow</h3>
              <div className="space-y-2">
                {['Wait/Delay', 'If/Then Branch', 'A/B Split', 'Go To Step', 'End Journey', 'Repeat Loop'].map((control) => (
                  <div key={control} className="p-2 bg-gray-50 rounded text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">
                    {control}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
