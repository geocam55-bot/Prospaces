import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Avatar, AvatarFallback } from './ui/avatar';
import { 
  MessageSquare, 
  Send, 
  TrendingUp, 
  DollarSign, 
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  BarChart3,
  Users,
  ArrowRight,
  Target,
  Award,
  ThumbsUp,
  ThumbsDown,
  Loader2,
  Edit
} from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { opportunitiesAPI, bidsAPI, quotesAPI, notesAPI } from '../utils/api';
import type { User } from '../App';

// Simple date formatting functions
const format = (date: Date, formatStr: string): string => {
  if (formatStr === 'MMM dd, yyyy') {
    return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
  }
  return date.toLocaleDateString();
};

const formatDistanceToNow = (date: Date, options?: { addSuffix?: boolean }): string => {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return options?.addSuffix ? 'just now' : 'just now';
  if (diffInSeconds < 3600) {
    const mins = Math.floor(diffInSeconds / 60);
    return options?.addSuffix ? `${mins} minute${mins > 1 ? 's' : ''} ago` : `${mins} minute${mins > 1 ? 's' : ''}`;
  }
  if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return options?.addSuffix ? `${hours} hour${hours > 1 ? 's' : ''} ago` : `${hours} hour${hours > 1 ? 's' : ''}`;
  }
  const days = Math.floor(diffInSeconds / 86400);
  return options?.addSuffix ? `${days} day${days > 1 ? 's' : ''} ago` : `${days} day${days > 1 ? 's' : ''}`;
};

interface OpportunityChatProps {
  opportunityId: string;
  user: User;
  opportunity: {
    id: string;
    title: string;
    description: string;
    customerName: string;
    status: 'open' | 'in_progress' | 'won' | 'lost';
    value: number;
    expectedCloseDate: string;
    createdAt: string;
  };
  onClose?: () => void;
  onEdit?: () => void;
}

interface ChatMessage {
  id: string;
  opportunityId: string;
  userId: string;
  userName: string;
  message: string;
  messageType: 'comment' | 'status_change' | 'bid_submitted' | 'milestone';
  createdAt: string;
  metadata?: any;
}

interface Bid {
  id: string;
  opportunityId: string;
  opportunity_id?: string;
  title: string;
  bidAmount?: number;
  amount?: number;
  submissionDate: string;
  submission_date?: string;
  created_at?: string;
  status: 'draft' | 'submitted' | 'accepted' | 'rejected';
  notes?: string;
  taggedProjectManagers?: string[];
}

interface ProgressStage {
  stage: string;
  status: 'completed' | 'current' | 'upcoming';
  completedAt?: string;
  icon: any;
}

export function OpportunityChat({ opportunityId, user, opportunity, onClose, onEdit }: OpportunityChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [bids, setBids] = useState<Bid[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [activeTab, setActiveTab] = useState('discussion');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadData();
  }, [opportunityId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadData = async () => {
    try {
      setIsLoading(true);
      
      // Load actual notes from database
      let loadedMessages: ChatMessage[] = [];
      try {
        const { notes } = await notesAPI.getAll();
        console.log('[OpportunityChat] Loaded notes from database:', notes);
        
        // Convert notes to chat messages
        loadedMessages = notes.map((note: any) => ({
          id: note.id,
          opportunityId,
          userId: note.created_by || note.owner_id,
          userName: 'User', // We'd need to join with profiles to get the actual name
          message: note.content || note.text || '',
          messageType: 'comment' as const,
          createdAt: note.created_at || note.createdAt
        }));
        
        console.log('[OpportunityChat] Converted notes to messages:', loadedMessages.length);
      } catch (notesError) {
        console.error('[OpportunityChat] Error loading notes:', notesError);
        // Continue with empty messages if notes fail to load
      }
      
      // Add sample milestone messages
      const milestoneMessages: ChatMessage[] = [
        {
          id: 'milestone-1',
          opportunityId,
          userId: user.id,
          userName: user.full_name || user.email || 'User',
          message: 'Opportunity created and assigned',
          messageType: 'milestone',
          createdAt: opportunity.createdAt,
          metadata: { stage: 'Created' }
        }
      ];
      
      // Combine and sort all messages by date
      const allMessages = [...milestoneMessages, ...loadedMessages].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      
      setMessages(allMessages);
      
      // Load bids from BOTH bids and quotes tables
      try {
        console.log('[OpportunityChat] 🔍 About to load bids and quotes for opportunity:', opportunityId);
        const [bidsResult, quotesResult] = await Promise.all([
          bidsAPI.getByOpportunity(opportunityId),
          quotesAPI.getQuotesByOpportunity(opportunityId)
        ]);
        
        console.log('[OpportunityChat] Raw bids data:', bidsResult.bids);
        console.log('[OpportunityChat] Raw quotes data:', quotesResult.quotes);
        console.log('[OpportunityChat] Number of bids returned:', bidsResult.bids?.length || 0);
        console.log('[OpportunityChat] Number of quotes returned:', quotesResult.quotes?.length || 0);
        
        // Merge bids and quotes
        const allBids = [...(bidsResult.bids || []), ...(quotesResult.quotes || [])];
        
        console.log('[OpportunityChat] Total bids + quotes:', allBids.length);
        console.log('[OpportunityChat] Sample bid object:', allBids[0]);
        console.log('[OpportunityChat] Sample quote object (if exists):', allBids.find(b => b.quote_number || b.quoteNumber));
        
        // Normalize the bids data to handle both snake_case and camelCase
        const normalizedBids = allBids.map((bid: any) => {
          console.log('[OpportunityChat] Processing bid/quote:', bid.title, 'Fields:', Object.keys(bid));
          console.log('[OpportunityChat] Amount fields check:', {
            amount: bid.amount,
            bidAmount: bid.bidAmount,
            total: bid.total,
            total_amount: bid.total_amount,
            quote_amount: bid.quote_amount,
            subtotal: bid.subtotal,
            grand_total: bid.grand_total
          });
          
          return {
            ...bid,
            bidAmount: bid.amount || bid.bidAmount || bid.total || bid.total_amount || bid.quote_amount || bid.subtotal || bid.grand_total || 0,
            submissionDate: bid.submission_date || bid.submissionDate || bid.created_at || new Date().toISOString()
          };
        });
        
        console.log('[OpportunityChat] Total normalized bids (bids + quotes):', normalizedBids.length);
        console.log('[OpportunityChat] Normalized bids:', normalizedBids);
        setBids(normalizedBids);
        
        // Add bid submitted messages
        const bidMessages = normalizedBids.map((bid: Bid) => ({
          id: `bid-${bid.id}`,
          opportunityId,
          userId: user.id,
          userName: user.full_name || user.email || 'User',
          message: `Bid submitted: ${bid.title}`,
          messageType: 'bid_submitted' as const,
          createdAt: bid.submissionDate
        }));
        
        setMessages([...allMessages, ...bidMessages].sort((a, b) => 
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        ));
      } catch (bidsError) {
        console.error('[OpportunityChat] ❌ Error loading bids/quotes:', bidsError);
        console.error('[OpportunityChat] ❌ Error stack:', (bidsError as Error).stack);
        // Continue without bids if there's an error
        setBids([]);
      }
    } catch (error) {
      console.error('Failed to load opportunity data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    setIsSending(true);
    try {
      // Save note to database - using minimal fields
      const noteData = {
        text: newMessage,
      };
      
      console.log('[OpportunityChat] Attempting to save note:', noteData);
      
      const { note } = await notesAPI.create(noteData);
      
      console.log('[OpportunityChat] Note saved successfully:', note);
      
      // Create message object for UI
      const message: ChatMessage = {
        id: note.id,
        opportunityId,
        userId: user.id,
        userName: user.full_name || user.email || 'User',
        message: newMessage,
        messageType: 'comment',
        createdAt: note.created_at || new Date().toISOString()
      };

      setMessages([...messages, message]);
      setNewMessage('');
    } catch (error) {
      console.error('Failed to save note:', error);
      // Still add to UI even if save fails
      const message: ChatMessage = {
        id: Date.now().toString(),
        opportunityId,
        userId: user.id,
        userName: user.full_name || user.email || 'User',
        message: newMessage,
        messageType: 'comment',
        createdAt: new Date().toISOString()
      };
      setMessages([...messages, message]);
      setNewMessage('');
    } finally {
      setIsSending(false);
    }
  };

  const getProgressStages = (): ProgressStage[] => {
    const stages = [
      { stage: 'Open', status: 'completed' as const, icon: Target },
      { stage: 'In Progress', status: opportunity.status === 'open' ? 'upcoming' as const : 'current' as const, icon: Clock },
      { stage: 'Bid Submitted', status: bids.length > 0 ? 'completed' as const : 'upcoming' as const, icon: FileText },
      { stage: opportunity.status === 'won' ? 'Won' : 'Closed', status: ['won', 'lost'].includes(opportunity.status) ? 'completed' as const : 'upcoming' as const, icon: opportunity.status === 'won' ? Award : AlertTriangle }
    ];

    return stages;
  };

  const calculateMetrics = () => {
    const totalBidAmount = bids.reduce((sum, bid) => sum + (bid.bidAmount || 0), 0);
    const averageBidAmount = bids.length > 0 ? totalBidAmount / bids.length : 0;
    const highestBid = bids.length > 0 ? Math.max(...bids.map(b => b.bidAmount || 0)) : 0;
    const lowestBid = bids.length > 0 ? Math.min(...bids.map(b => b.bidAmount || 0)) : 0;
    const variance = opportunity.value > 0 ? ((averageBidAmount - opportunity.value) / opportunity.value) * 100 : 0;

    return {
      totalBidAmount,
      averageBidAmount,
      highestBid,
      lowestBid,
      variance,
      bidCount: bids.length
    };
  };

  const metrics = calculateMetrics();
  const progressStages = getProgressStages();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'won': return 'bg-green-500';
      case 'lost': return 'bg-red-500';
      case 'in_progress': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getBidStatusColor = (status: string) => {
    switch (status) {
      case 'accepted': return 'bg-green-500';
      case 'rejected': return 'bg-red-500';
      case 'submitted': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getBidStatusLabel = (status: string) => {
    switch (status) {
      case 'draft': return 'Open';
      case 'submitted': return 'Open';
      case 'accepted': return 'Won';
      case 'rejected': return 'Lost';
      default: return status;
    }
  };

  const getMessageIcon = (type: string) => {
    switch (type) {
      case 'bid_submitted': return FileText;
      case 'status_change': return TrendingUp;
      case 'milestone': return CheckCircle2;
      default: return MessageSquare;
    }
  };

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Opportunity Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-2xl">{opportunity.title}</CardTitle>
              <CardDescription className="mt-2">{opportunity.customerName}</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={`${getStatusColor(opportunity.status)} text-white`}>
                {opportunity.status.replace('_', ' ').toUpperCase()}
              </Badge>
              {onEdit && (
                <Button variant="outline" size="sm" onClick={onEdit}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Opportunity Value</p>
                <p className="text-xl">${opportunity.value.toLocaleString()}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-lg">
                <Calendar className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Expected Close</p>
                <p className="text-xl">{format(new Date(opportunity.expectedCloseDate), 'MMM dd, yyyy')}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 rounded-lg">
                <FileText className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Bids Submitted</p>
                <p className="text-xl">{bids.length}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Progress Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Progress Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <div className="flex items-center justify-between">
              {progressStages.map((stage, index) => {
                const Icon = stage.icon;
                return (
                  <div key={stage.stage} className="flex flex-col items-center flex-1">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 ${
                      stage.status === 'completed' ? 'bg-green-500 text-white' :
                      stage.status === 'current' ? 'bg-blue-500 text-white animate-pulse' :
                      'bg-gray-200 text-gray-400'
                    }`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <p className={`text-sm text-center ${
                      stage.status === 'completed' || stage.status === 'current' ? 'font-semibold' : 'text-gray-500'
                    }`}>
                      {stage.stage}
                    </p>
                    {stage.status === 'completed' && (
                      <CheckCircle2 className="h-4 w-4 text-green-500 mt-1" />
                    )}
                    {index < progressStages.length - 1 && (
                      <div className={`absolute top-6 left-[${(index + 0.5) * 25}%] w-1/4 h-0.5 ${
                        progressStages[index + 1].status === 'completed' ? 'bg-green-500' : 'bg-gray-200'
                      }`} style={{ left: `calc(${(index / (progressStages.length - 1)) * 100}% + ${50 / (progressStages.length - 1)}%)` }} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for Discussion and Bid Comparison */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <TabsList className="inline-flex w-auto min-w-full md:grid md:w-full md:grid-cols-3">
            <TabsTrigger value="discussion" className="flex items-center gap-1.5 whitespace-nowrap px-3 sm:px-4 text-xs sm:text-sm">
              <MessageSquare className="h-4 w-4 flex-shrink-0" />
              Discussion
            </TabsTrigger>
            <TabsTrigger value="comparison" className="flex items-center gap-1.5 whitespace-nowrap px-3 sm:px-4 text-xs sm:text-sm">
              <BarChart3 className="h-4 w-4 flex-shrink-0" />
              Bid Comparison
            </TabsTrigger>
            <TabsTrigger value="analysis" className="flex items-center gap-1.5 whitespace-nowrap px-3 sm:px-4 text-xs sm:text-sm">
              <Target className="h-4 w-4 flex-shrink-0" />
              Analysis
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Discussion Tab */}
        <TabsContent value="discussion" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Discussion Thread</CardTitle>
              <CardDescription>Track all updates and comments for this opportunity</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 mb-6 max-h-[500px] overflow-y-auto">
                {messages.map((msg) => {
                  const MessageIcon = getMessageIcon(msg.messageType);
                  return (
                    <div key={msg.id} className={`flex gap-3 p-4 rounded-lg ${
                      msg.messageType === 'milestone' ? 'bg-blue-50 border border-blue-200' :
                      msg.messageType === 'bid_submitted' ? 'bg-green-50 border border-green-200' :
                      'bg-gray-50'
                    }`}>
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-blue-600 text-white">
                          {msg.userName.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold">{msg.userName}</p>
                          <MessageIcon className="h-4 w-4 text-gray-400" />
                          <p className="text-xs text-gray-500">
                            {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                        <p className="text-gray-700">{msg.message}</p>
                        {msg.metadata?.bidAmount && (
                          <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                            <DollarSign className="h-4 w-4" />
                            <span className="font-semibold">${msg.metadata.bidAmount.toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="flex gap-2">
                <Textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Add a comment or update..."
                  className="flex-1"
                  rows={3}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || isSending}
                  className="self-end"
                >
                  {isSending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bid Comparison Tab */}
        <TabsContent value="comparison" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Bid vs Opportunity Comparison</CardTitle>
              <CardDescription>Compare submitted bids against the opportunity value</CardDescription>
            </CardHeader>
            <CardContent>
              {bids.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">No bids submitted yet</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm text-gray-600">Opportunity Value</p>
                        <Target className="h-5 w-5 text-blue-600" />
                      </div>
                      <p className="text-2xl font-bold text-blue-600">
                        ${opportunity.value.toLocaleString()}
                      </p>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm text-gray-600">Average Bid Amount</p>
                        <BarChart3 className="h-5 w-5 text-green-600" />
                      </div>
                      <p className="text-2xl font-bold text-green-600">
                        ${metrics.averageBidAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </p>
                      <p className={`text-sm mt-1 ${metrics.variance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {metrics.variance > 0 ? '+' : ''}{metrics.variance.toFixed(1)}% from target
                      </p>
                    </div>
                  </div>

                  {/* Pie Chart showing bids as percentage of opportunity value */}
                  <div className="border rounded-lg p-6">
                    <h3 className="font-semibold mb-4">Bid Distribution vs Opportunity Value</h3>
                    <div className="flex flex-col lg:flex-row items-center justify-center gap-8">
                      {/* Pie Chart */}
                      <div className="w-full lg:w-1/2 flex justify-center">
                        <PieChart width={400} height={400}>
                          <Pie
                            data={[
                              ...bids.map((bid, index) => ({
                                name: bid.title,
                                value: bid.bidAmount || 0,
                                fill: `hsl(${(index * 360) / bids.length}, 70%, 50%)`,
                                isBid: true
                              })),
                              // Add unused portion of opportunity
                              ...(metrics.totalBidAmount < opportunity.value ? [{
                                name: 'Unused Opportunity',
                                value: opportunity.value - metrics.totalBidAmount,
                                fill: '#E5E7EB',
                                isBid: false
                              }] : [])
                            ]}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent, isBid }) => 
                              isBid !== false 
                                ? `${name}: ${(percent * 100).toFixed(1)}%` 
                                : `Unused: ${(percent * 100).toFixed(1)}%`
                            }
                            outerRadius={120}
                            dataKey="value"
                          >
                            {[
                              ...bids.map((bid, index) => (
                                <Cell key={`cell-${index}`} fill={`hsl(${(index * 360) / bids.length}, 70%, 50%)`} />
                              )),
                              ...(metrics.totalBidAmount < opportunity.value ? [
                                <Cell key="cell-unused" fill="#E5E7EB" />
                              ] : [])
                            ]}
                          </Pie>
                          <Tooltip 
                            formatter={(value: number) => `$${value.toLocaleString()}`}
                            contentStyle={{ backgroundColor: 'white', border: '1px solid #ccc', borderRadius: '8px' }}
                          />
                          <Legend 
                            verticalAlign="bottom" 
                            height={36}
                            formatter={(value) => {
                              if (value === 'Unused Opportunity') {
                                return `${value} ($${(opportunity.value - metrics.totalBidAmount).toLocaleString()})`;
                              }
                              const bid = bids.find(b => b.title === value);
                              return `${value} ($${(bid?.bidAmount || 0).toLocaleString()})`;
                            }}
                          />
                        </PieChart>
                      </div>

                      {/* Bid Details List */}
                      <div className="w-full lg:w-1/2 space-y-3">
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-4">
                          <p className="text-sm text-gray-600 mb-1">Total Opportunity Value</p>
                          <p className="text-3xl font-bold text-blue-600">${opportunity.value.toLocaleString()}</p>
                          <div className="mt-3 pt-3 border-t border-blue-200">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Total Bids:</span>
                              <span className="font-semibold">${metrics.totalBidAmount.toLocaleString()}</span>
                            </div>
                            {metrics.totalBidAmount < opportunity.value ? (
                              <div className="flex justify-between text-sm mt-1">
                                <span className="text-gray-600">Unused:</span>
                                <span className="font-semibold text-gray-500">
                                  ${(opportunity.value - metrics.totalBidAmount).toLocaleString()} 
                                  ({((1 - metrics.totalBidAmount / opportunity.value) * 100).toFixed(1)}%)
                                </span>
                              </div>
                            ) : metrics.totalBidAmount > opportunity.value ? (
                              <div className="flex justify-between text-sm mt-1">
                                <span className="text-gray-600">Over Budget:</span>
                                <span className="font-semibold text-red-600">
                                  +${(metrics.totalBidAmount - opportunity.value).toLocaleString()} 
                                  ({(((metrics.totalBidAmount / opportunity.value) - 1) * 100).toFixed(1)}%)
                                </span>
                              </div>
                            ) : null}
                          </div>
                        </div>
                        
                        {bids.map((bid, index) => {
                          const bidAmount = bid.bidAmount || 0;
                          const percentage = opportunity.value > 0 ? (bidAmount / opportunity.value) * 100 : 0;
                          const difference = bidAmount - opportunity.value;
                          
                          return (
                            <div 
                              key={bid.id} 
                              className="p-4 border rounded-lg hover:shadow-md transition-shadow"
                              style={{ borderLeftWidth: '4px', borderLeftColor: `hsl(${(index * 360) / bids.length}, 70%, 50%)` }}
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex-1">
                                  <p className="font-semibold">{bid.title}</p>
                                  <p className="text-sm text-gray-500">{bid.notes}</p>
                                </div>
                                <Badge className={`${getBidStatusColor(bid.status)} text-white text-xs ml-2`}>
                                  {getBidStatusLabel(bid.status)}
                                </Badge>
                              </div>
                              
                              <div className="flex items-center justify-between mt-3">
                                <div>
                                  <p className="text-2xl font-bold">${bidAmount.toLocaleString()}</p>
                                  <p className="text-sm text-gray-500">
                                    {percentage.toFixed(1)}% of opportunity value
                                  </p>
                                </div>
                                <div className="text-right">
                                  <div className="flex items-center gap-1">
                                    {difference > 0 ? (
                                      <ThumbsDown className="h-4 w-4 text-red-500" />
                                    ) : difference < 0 ? (
                                      <ThumbsUp className="h-4 w-4 text-green-500" />
                                    ) : (
                                      <CheckCircle2 className="h-4 w-4 text-gray-500" />
                                    )}
                                    <span className={`font-medium text-sm ${
                                      difference > 0 ? 'text-red-600' :
                                      difference < 0 ? 'text-green-600' :
                                      'text-gray-600'
                                    }`}>
                                      {difference > 0 ? '+' : ''}{difference.toLocaleString()}
                                    </span>
                                  </div>
                                  <p className="text-xs text-gray-500 mt-1">
                                    Submitted: {format(new Date(bid.submissionDate), 'MMM dd, yyyy')}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analysis Tab */}
        <TabsContent value="analysis" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Opportunity Analysis</CardTitle>
              <CardDescription>Insights and recommendations based on bids</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Key Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-white border rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Total Bids</p>
                    <p className="text-2xl font-bold">{metrics.bidCount}</p>
                  </div>
                  <div className="p-4 bg-white border rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Highest Bid</p>
                    <p className="text-2xl font-bold">${metrics.highestBid.toLocaleString()}</p>
                  </div>
                  <div className="p-4 bg-white border rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Lowest Bid</p>
                    <p className="text-2xl font-bold">${metrics.lowestBid.toLocaleString()}</p>
                  </div>
                  <div className="p-4 bg-white border rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Bid Range</p>
                    <p className="text-2xl font-bold">
                      ${(metrics.highestBid - metrics.lowestBid).toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Insights */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-lg">Insights</h3>
                  
                  {bids.length === 0 && (
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-blue-900">No Bids Yet</p>
                        <p className="text-sm text-blue-700 mt-1">
                          Create and submit bids to start comparing against the opportunity value.
                        </p>
                      </div>
                    </div>
                  )}

                  {metrics.variance > 10 && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-red-900">Bids Above Target</p>
                        <p className="text-sm text-red-700 mt-1">
                          Average bid amount is {metrics.variance.toFixed(1)}% higher than opportunity value. 
                          Consider reviewing bid costs or adjusting opportunity value.
                        </p>
                      </div>
                    </div>
                  )}

                  {metrics.variance < -10 && (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-green-900">Bids Below Target</p>
                        <p className="text-sm text-green-700 mt-1">
                          Average bid amount is {Math.abs(metrics.variance).toFixed(1)}% lower than opportunity value. 
                          Great positioning for competitive pricing!
                        </p>
                      </div>
                    </div>
                  )}

                  {metrics.variance >= -10 && metrics.variance <= 10 && bids.length > 0 && (
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-blue-900">Well Aligned</p>
                        <p className="text-sm text-blue-700 mt-1">
                          Bid amounts are well aligned with opportunity value (within ±10%).
                        </p>
                      </div>
                    </div>
                  )}

                  {new Date(opportunity.expectedCloseDate) < new Date() && (
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
                      <Clock className="h-5 w-5 text-yellow-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-yellow-900">Past Expected Close Date</p>
                        <p className="text-sm text-yellow-700 mt-1">
                          This opportunity is past its expected close date. Consider updating the timeline or closing the opportunity.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}