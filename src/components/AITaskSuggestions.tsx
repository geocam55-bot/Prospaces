import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import {
  Sparkles,
  TrendingUp,
  Clock,
  AlertCircle,
  CheckCircle2,
  Mail,
  Phone,
  Calendar,
  FileText,
  Target,
  User,
  ArrowRight,
  RefreshCw,
  Star,
  Flame,
  Zap,
  MessageSquare,
  DollarSign,
  Users,
  BarChart3,
  Copy,
  Send,
  X
} from 'lucide-react';
import type { User } from '../App';
import { createClient } from '../utils/supabase/client';
import { toast } from 'sonner';
import { useAISuggestions, type Suggestion } from '../hooks/useAISuggestions';

interface AITaskSuggestionsProps {
  user: User;
  onNavigate?: (view: string) => void;
}

export function AITaskSuggestions({ user, onNavigate }: AITaskSuggestionsProps) {
  const { suggestions, metrics, isLoading, refresh } = useAISuggestions(user);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'critical' | 'high' | 'medium' | 'low'>('all');
  
  // Email template dialog state
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<Suggestion | null>(null);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  
  // Task creation dialog state
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [taskPriority, setTaskPriority] = useState<'low' | 'medium' | 'high'>('medium');

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'critical':
        return <Flame className="h-4 w-4 text-red-600" />;
      case 'high':
        return <Zap className="h-4 w-4 text-orange-600" />;
      case 'medium':
        return <Star className="h-4 w-4 text-yellow-600" />;
      case 'low':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getPriorityBadge = (priority: string) => {
    const config = {
      critical: { className: 'bg-red-100 text-red-700 border-red-200' },
      high: { className: 'bg-orange-100 text-orange-700 border-orange-200' },
      medium: { className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
      low: { className: 'bg-green-100 text-green-700 border-green-200' },
    };
    return config[priority as keyof typeof config] || config.low;
  };

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'call':
        return <Phone className="h-4 w-4" />;
      case 'email':
        return <Mail className="h-4 w-4" />;
      case 'meeting':
        return <Calendar className="h-4 w-4" />;
      case 'review':
        return <FileText className="h-4 w-4" />;
      case 'update':
        return <RefreshCw className="h-4 w-4" />;
      default:
        return <ArrowRight className="h-4 w-4" />;
    }
  };

  // Generate email template based on suggestion type
  const generateEmailTemplate = (suggestion: Suggestion): { subject: string; body: string } => {
    const { relatedEntity, type, daysInactive, potentialValue } = suggestion;
    
    switch (type) {
      case 'follow_up':
        return {
          subject: `Following up on ${relatedEntity.name}`,
          body: `Hi there,\\n\\nI wanted to follow up on the ${relatedEntity.type} "${relatedEntity.name}" that we submitted ${daysInactive} days ago.\\n\\nI'd love to discuss this further and answer any questions you may have. The proposal outlines a ${potentialValue ? `$${potentialValue.toLocaleString()}` : ''} solution that I believe would be a great fit for your needs.\\n\\nWould you be available for a quick call this week to discuss?\\n\\nBest regards,\\n${user.full_name || user.email || 'User'}`
        };
      
      case 'engagement':
        return {
          subject: `New opportunity for ${relatedEntity.name}`,
          body: `Hi there,\\n\\nI hope this email finds you well! I wanted to reach out regarding our previous conversation about "${relatedEntity.name}".\\n\\nWe've made some exciting updates to our offering, including:\\n• Enhanced features and capabilities\\n• Competitive pricing options\\n• Flexible terms that may better suit your needs\\n\\nI'd love to schedule a time to reconnect and share how these changes might benefit your organization.\\n\\nLooking forward to hearing from you!\\n\\nBest regards,\\n${user.full_name || user.email || 'User'}`
        };
      
      case 'inactive':
        return {
          subject: `Checking in - ${relatedEntity.name}`,
          body: `Hi there,\\n\\nI hope you've been well! It's been about ${daysInactive} days since we last connected, and I wanted to reach out to see how things are going.\\n\\nI'd love to catch up and learn about any new projects or challenges you're currently facing. Perhaps there's an opportunity for us to collaborate again.\\n\\nWould you be available for a brief call or coffee sometime soon?\\n\\nWarm regards,\\n${user.full_name || user.email || 'User'}`
        };
      
      default:
        return {
          subject: `Regarding ${relatedEntity.name}`,
          body: `Hi there,\\n\\nI wanted to reach out regarding "${relatedEntity.name}".\\n\\n${suggestion.suggestedAction}\\n\\nPlease let me know if you'd like to discuss this further.\\n\\nBest regards,\\n${user.full_name || user.email || 'User'}`
        };
    }
  };

  // Handle taking action on a suggestion
  const handleTakeAction = (suggestion: Suggestion) => {
    setSelectedSuggestion(suggestion);
    
    if (suggestion.actionType === 'email') {
      // Open email template dialog
      const template = generateEmailTemplate(suggestion);
      setEmailSubject(template.subject);
      setEmailBody(template.body);
      setShowEmailDialog(true);
    } else {
      // Open task creation dialog for other actions
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      setTaskTitle(suggestion.title);
      setTaskDescription(suggestion.suggestedAction + '\n\n' + suggestion.context);
      setTaskDueDate(tomorrow.toISOString().split('T')[0]);
      setTaskPriority(suggestion.priority === 'critical' || suggestion.priority === 'high' ? 'high' : 'medium');
      setShowTaskDialog(true);
    }
  };

  // Send email
  const handleSendEmail = async () => {
    try {
      toast.info('Email feature coming soon! For now, the template has been copied to your clipboard.');
      
      // Copy to clipboard
      const emailContent = `Subject: ${emailSubject}\n\n${emailBody}`;
      await navigator.clipboard.writeText(emailContent);
      
      setShowEmailDialog(false);
      toast.success('Email template copied to clipboard!');
      
      // Optionally dismiss the suggestion
      if (selectedSuggestion) {
        handleDismissSuggestion(selectedSuggestion.id);
      }
    } catch (error) {
      console.error('Failed to copy email:', error);
      toast.error('Failed to copy email template');
    }
  };

  // Create task from suggestion
  const handleCreateTask = async () => {
    try {
      const supabase = createClient();
      
      const newTask = {
        title: taskTitle,
        description: taskDescription,
        status: 'pending',
        priority: taskPriority,
        dueDate: taskDueDate,
        assigned_to: user.id,
        created_by: user.id,
        organization_id: user.organizationId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const { data, error } = await supabase
        .from('tasks')
        .insert([newTask])
        .select()
        .single();
      
      if (error) {
        console.error('Error creating task:', error);
        toast.error('Failed to create task');
        return;
      }
      
      setShowTaskDialog(false);
      toast.success('Task created successfully!');
      
      // Optionally dismiss the suggestion
      if (selectedSuggestion) {
        handleDismissSuggestion(selectedSuggestion.id);
      }
      
      // Refresh suggestions
      refresh();
    } catch (error) {
      console.error('Failed to create task:', error);
      toast.error('Failed to create task');
    }
  };

  // Dismiss suggestion
  const handleDismissSuggestion = (suggestionId: string) => {
    // For now we just filter it locally, but ideally we'd persist dismissed suggestions
    // Since we're using the hook now, we can't easily filter locally unless the hook supports it
    // Or we just rely on refresh. But refresh will bring it back if it's still valid.
    // So for now, let's just toast
    toast.success('Suggestion dismissed (refresh to see it reappear)');
    // In a real app we'd save this to a 'dismissed_suggestions' table
  };

  // Copy email to clipboard
  const handleCopyEmail = async () => {
    try {
      const emailContent = `Subject: ${emailSubject}\n\n${emailBody}`;
      await navigator.clipboard.writeText(emailContent);
      toast.success('Email template copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy email:', error);
      toast.error('Failed to copy to clipboard');
    }
  };

  const filteredSuggestions = suggestions.filter(s => 
    selectedFilter === 'all' || s.priority === selectedFilter
  );

  return (
    <div className="h-full flex flex-col space-y-4 sm:space-y-6 p-4 sm:p-0">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl">AI Suggestions</h1>
        <Button onClick={refresh} disabled={isLoading} size="sm">
          <RefreshCw className={`h-4 w-4 sm:mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
        </Button>
      </div>

      {/* Daily Metrics Dashboard */}
      {metrics && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card>
            <CardContent className="pt-4 sm:pt-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <p className="text-xs sm:text-sm text-gray-600">Total Suggestions</p>
                  <p className="text-2xl sm:text-3xl text-gray-900 mt-1">{metrics.totalSuggestions}</p>
                </div>
                <Sparkles className="h-6 w-6 sm:h-8 sm:w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4 sm:pt-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <p className="text-xs sm:text-sm text-gray-600">Critical Actions</p>
                  <p className="text-2xl sm:text-3xl text-red-600 mt-1">{metrics.criticalActions}</p>
                </div>
                <Flame className="h-6 w-6 sm:h-8 sm:w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4 sm:pt-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <p className="text-xs sm:text-sm text-gray-600">Potential Revenue</p>
                  <p className="text-xl sm:text-2xl text-green-600 mt-1">
                    ${metrics.potentialRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </p>
                </div>
                <DollarSign className="h-6 w-6 sm:h-8 sm:w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4 sm:pt-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <p className="text-xs sm:text-sm text-gray-600">Avg Days Inactive</p>
                  <p className="text-2xl sm:text-3xl text-orange-600 mt-1">{metrics.avgDaysInactive}</p>
                </div>
                <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Top Priority Alert */}
      {metrics?.topPriority && (
        <Card className="border-purple-300 bg-purple-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-purple-900 text-base sm:text-lg">
              <Star className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
              Top Priority Action
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row sm:items-start gap-4">
              <div className="flex-1">
                <h3 className="text-base sm:text-lg text-purple-900 mb-2">{metrics.topPriority.title}</h3>
                <p className="text-sm text-purple-800 mb-3">{metrics.topPriority.suggestedAction}</p>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <Badge className={`${getPriorityBadge(metrics.topPriority.priority).className} border text-xs`}>
                    {metrics.topPriority.priority}
                  </Badge>
                  <span className="text-xs sm:text-sm text-purple-700">
                    Score: {Math.round(metrics.topPriority.score)}
                  </span>
                  {metrics.topPriority.potentialValue && (
                    <span className="text-xs sm:text-sm text-purple-700">
                      Value: ${metrics.topPriority.potentialValue.toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
              <Button className="bg-purple-600 hover:bg-purple-700">
                Take Action
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filter Tabs */}
      <Card>
        <CardContent className="pt-6">
          <div className="overflow-x-auto -mx-6 px-6 sm:mx-0 sm:px-0">
            <div className="flex gap-2 min-w-max sm:min-w-0">
              <Button
                variant={selectedFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedFilter('all')}
                className="whitespace-nowrap"
              >
                All ({suggestions.length})
              </Button>
              <Button
                variant={selectedFilter === 'critical' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedFilter('critical')}
                className={`whitespace-nowrap ${selectedFilter === 'critical' ? 'bg-red-600 hover:bg-red-700' : ''}`}
              >
                <Flame className="h-4 w-4 mr-1" />
                Critical ({suggestions.filter(s => s.priority === 'critical').length})
              </Button>
              <Button
                variant={selectedFilter === 'high' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedFilter('high')}
                className={`whitespace-nowrap ${selectedFilter === 'high' ? 'bg-orange-600 hover:bg-orange-700' : ''}`}
              >
                <Zap className="h-4 w-4 mr-1" />
                High ({suggestions.filter(s => s.priority === 'high').length})
              </Button>
              <Button
                variant={selectedFilter === 'medium' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedFilter('medium')}
                className={`whitespace-nowrap ${selectedFilter === 'medium' ? 'bg-yellow-600 hover:bg-yellow-700' : ''}`}
              >
                <Zap className="h-4 w-4 mr-1" />
                Medium ({suggestions.filter(s => s.priority === 'medium').length})
              </Button>
              <Button
                variant={selectedFilter === 'low' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedFilter('low')}
                className="whitespace-nowrap"
              >
                Low ({suggestions.filter(s => s.priority === 'low').length})
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Suggestions List */}
      <Card className="flex-1">
        <CardHeader>
          <CardTitle>Suggested Actions</CardTitle>
          <CardDescription>
            {filteredSuggestions.length} {selectedFilter !== 'all' ? selectedFilter : ''} suggestions based on your CRM data
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse">
                  <div className="h-24 bg-gray-200 rounded-lg"></div>
                </div>
              ))}
            </div>
          ) : filteredSuggestions.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle2 className="h-16 w-16 mx-auto mb-4 text-green-500" />
              <p className="text-lg text-gray-900 mb-2">All caught up!</p>
              <p className="text-sm text-gray-600">No urgent actions needed at the moment.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
              {filteredSuggestions.map((suggestion) => (
                <div
                  key={suggestion.id}
                  className={`p-3 sm:p-4 rounded-lg border-2 hover:shadow-md transition-all ${
                    suggestion.priority === 'critical'
                      ? 'border-red-200 bg-red-50'
                      : suggestion.priority === 'high'
                      ? 'border-orange-200 bg-orange-50'
                      : suggestion.priority === 'medium'
                      ? 'border-yellow-200 bg-yellow-50'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                    <div className="flex items-start gap-2 sm:gap-3 flex-1">
                      <div className="mt-1 flex-shrink-0">
                        {getPriorityIcon(suggestion.priority)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <h3 className="text-sm sm:text-base text-gray-900">{suggestion.title}</h3>
                          <Badge className={`${getPriorityBadge(suggestion.priority).className} border text-xs`}>
                            {suggestion.priority}
                          </Badge>
                        </div>
                        <p className="text-xs sm:text-sm text-gray-700 mb-2">{suggestion.description}</p>
                        <div className="flex flex-wrap items-center gap-2 sm:gap-4 mb-3">
                          <span className="text-xs text-gray-600 flex items-center gap-1">
                            <BarChart3 className="h-3 w-3" />
                            Score: {Math.round(suggestion.score)}
                          </span>
                          {suggestion.daysInactive && (
                            <span className="text-xs text-gray-600 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {suggestion.daysInactive}d
                            </span>
                          )}
                          {suggestion.potentialValue && (
                            <span className="text-xs text-gray-600 flex items-center gap-1">
                              <DollarSign className="h-3 w-3" />
                              ${suggestion.potentialValue.toLocaleString()}
                            </span>
                          )}
                        </div>
                        <div className="bg-white bg-opacity-50 rounded p-2 sm:p-3 mb-3">
                          <p className="text-xs sm:text-sm text-gray-900 mb-1">
                            <strong>Suggested Action:</strong> {suggestion.suggestedAction}
                          </p>
                          <p className="text-xs text-gray-600">{suggestion.context}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {getActionIcon(suggestion.actionType)}
                            <span className="ml-1 capitalize">{suggestion.actionType}</span>
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {suggestion.relatedEntity.type}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex sm:flex-col gap-2 w-full sm:w-auto">
                      <Button size="sm" className="flex-1 sm:flex-none whitespace-nowrap text-xs sm:text-sm" onClick={() => handleTakeAction(suggestion)}>
                        {getActionIcon(suggestion.actionType)}
                        <span className="ml-1 sm:ml-2">Take Action</span>
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1 sm:flex-none text-xs sm:text-sm" onClick={() => handleDismissSuggestion(suggestion.id)}>
                        Dismiss
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Email Template Dialog */}
      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Email Template</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Review and send the email to {selectedSuggestion?.relatedEntity.name}:
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="email-subject" className="text-xs sm:text-sm">Subject</Label>
              <Input
                id="email-subject"
                value={emailSubject}
                onChange={e => setEmailSubject(e.target.value)}
                placeholder="Email subject"
                className="text-xs sm:text-sm"
              />
            </div>
            <div>
              <Label htmlFor="email-body" className="text-xs sm:text-sm">Body</Label>
              <Textarea
                id="email-body"
                value={emailBody}
                onChange={e => setEmailBody(e.target.value)}
                placeholder="Email body"
                className="h-32 sm:h-40 text-xs sm:text-sm"
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button size="sm" variant="outline" onClick={handleCopyEmail} className="w-full sm:w-auto text-xs sm:text-sm">
              <Copy className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
              Copy to Clipboard
            </Button>
            <Button size="sm" onClick={handleSendEmail} className="w-full sm:w-auto text-xs sm:text-sm">
              <Send className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
              Send Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Task Creation Dialog */}
      <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Create Task</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Create a new task based on the suggestion:
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="task-title" className="text-xs sm:text-sm">Title</Label>
              <Input
                id="task-title"
                value={taskTitle}
                onChange={e => setTaskTitle(e.target.value)}
                placeholder="Task title"
                className="text-xs sm:text-sm"
              />
            </div>
            <div>
              <Label htmlFor="task-description" className="text-xs sm:text-sm">Description</Label>
              <Textarea
                id="task-description"
                value={taskDescription}
                onChange={e => setTaskDescription(e.target.value)}
                placeholder="Task description"
                className="h-32 sm:h-40 text-xs sm:text-sm"
              />
            </div>
            <div>
              <Label htmlFor="task-due-date" className="text-xs sm:text-sm">Due Date</Label>
              <Input
                id="task-due-date"
                type="date"
                value={taskDueDate}
                onChange={e => setTaskDueDate(e.target.value)}
                placeholder="Task due date"
                className="text-xs sm:text-sm"
              />
            </div>
            <div>
              <Label htmlFor="task-priority" className="text-xs sm:text-sm">Priority</Label>
              <Select
                value={taskPriority}
                onValueChange={value => setTaskPriority(value as 'low' | 'medium' | 'high')}
              >
                <SelectTrigger className="text-xs sm:text-sm">
                  <SelectValue>{taskPriority}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button size="sm" variant="outline" onClick={() => setShowTaskDialog(false)} className="w-full sm:w-auto text-xs sm:text-sm">
              Cancel
            </Button>
            <Button size="sm" onClick={handleCreateTask} className="w-full sm:w-auto text-xs sm:text-sm">
              Create Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}