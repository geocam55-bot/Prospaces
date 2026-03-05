import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Alert, AlertDescription } from './ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from './ui/dropdown-menu';
import { Plus, Edit, Trash2, Eye, FileText, Search, Filter, Calendar, DollarSign, User, MoreVertical, Send, Building, AlertCircle } from 'lucide-react';
import { bidsAPI, quotesAPI, contactsAPI, inventoryAPI } from '../utils/api';
import { BidLineItems } from './BidLineItems';
import { DealsKanban, Quote } from './DealsKanban';
import { EmailQuoteDialog } from './EmailQuoteDialog';
import { createClient } from '../utils/supabase/client';
import { SubscriptionAgreement, Organization } from './SubscriptionAgreement';
import { toast } from 'sonner@2.0.3';

interface User {
  id: string;
  email: string;
  role: string;
  organization_id?: string;
}

interface Contact {
  id: string;
  name: string;
  email?: string;
}

interface BidsProps {
  user: User;
}

// Legacy Bid interface (from bids table)
interface Bid {
  id: string;
  clientName: string;
  projectName: string;
  description?: string;
  subtotal: number;
  tax: number;
  total: number;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
  validUntil: string;
  notes?: string;
  terms?: string;
  createdAt: string;
  updatedAt: string;
  ownerId: string;
  organizationId?: string;
}

export function Bids({ user }: BidsProps) {
  const [view, setView] = useState<'kanban' | 'list'>('kanban');
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [legacyBids, setLegacyBids] = useState<Bid[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewQuote, setPreviewQuote] = useState<Quote | null>(null);
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [emailQuote, setEmailQuote] = useState<Quote | null>(null);
  const [viewingAgreement, setViewingAgreement] = useState<Quote | null>(null);

  // Load data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const scope = user.role === 'admin' || user.role === 'manager' ? 'team' : 'personal';
      
      // Load both quotes and legacy bids
      const [quotesResponse, bidsResponse, contactsResponse] = await Promise.all([
        quotesAPI.getAll(scope),
        bidsAPI.getAll(scope),
        contactsAPI.getAll(scope),
      ]);

      console.log('Loaded quotes:', quotesResponse.quotes?.length || 0);
      console.log('Loaded legacy bids:', bidsResponse.bids?.length || 0);

      setQuotes(quotesResponse.quotes || []);
      setLegacyBids(bidsResponse.bids || []);
      setContacts(contactsResponse.contacts || []);
    } catch (err: any) {
      console.error('Failed to load bids/quotes:', err);
      setError(err.message || 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  // Convert legacy bid to Quote format for display
  const convertBidToQuote = (bid: Bid): Quote => ({
    id: bid.id,
    quoteNumber: `BID-${bid.id.slice(0, 8)}`,
    title: bid.projectName,
    contactId: '',
    contactName: bid.clientName,
    contactEmail: undefined,
    priceTier: 1,
    status: bid.status === 'sent' ? 'sent' : 
            bid.status === 'accepted' ? 'accepted' : 
            bid.status === 'rejected' ? 'rejected' : 
            bid.status === 'expired' ? 'expired' : 'draft',
    validUntil: bid.validUntil,
    lineItems: [],
    subtotal: bid.subtotal,
    discountPercent: 0,
    discountAmount: 0,
    taxPercent: bid.tax / bid.subtotal * 100,
    taxAmount: bid.tax,
    total: bid.total,
    notes: bid.notes,
    terms: bid.terms,
    createdAt: bid.createdAt,
    updatedAt: bid.updatedAt,
    ownerId: bid.ownerId,
  });

  // Merge quotes and legacy bids
  const allQuotes = [
    ...quotes,
    ...legacyBids.map(convertBidToQuote)
  ];

  // Filter quotes
  const filteredQuotes = allQuotes.filter(quote => {
    const matchesSearch = !searchTerm || 
      quote.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quote.contactName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quote.quoteNumber.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || quote.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleStatusChange = async (quote: Quote, newStatus: Quote['status']) => {
    try {
      await quotesAPI.update(quote.id, { status: newStatus });
      await loadData();
      toast.success('Status updated successfully');
    } catch (err: any) {
      console.error('Failed to update status:', err);
      toast.error('Failed to update status: ' + err.message);
    }
  };

  const handleEdit = (quote: Quote) => {
    setSelectedQuote(quote);
    setIsDialogOpen(true);
  };

  const handlePreview = (quote: Quote) => {
    setPreviewQuote(quote);
    setIsPreviewOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this quote/bid?')) return;
    
    try {
      await quotesAPI.delete(id);
      await loadData();
      toast.success('Deleted successfully');
    } catch (err: any) {
      console.error('Failed to delete:', err);
      toast.error('Failed to delete: ' + err.message);
    }
  };

  const handleEmail = (quote: Quote) => {
    setEmailQuote(quote);
    setIsEmailDialogOpen(true);
  };

  const handleViewAgreement = (quote: Quote) => {
    setViewingAgreement(quote);
  };

  // If viewing agreement, show subscription agreement
  if (viewingAgreement) {
    // Get organization data for the quote
    const getOrgData = async (): Promise<Organization | null> => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('tenants')
          .select('*')
          .eq('id', user.organization_id)
          .single();
        
        if (error) throw error;
        
        return {
          id: data.id,
          name: data.name,
          ai_suggestions_enabled: data.ai_suggestions_enabled,
          marketing_enabled: data.marketing_enabled,
          inventory_enabled: data.inventory_enabled,
          import_export_enabled: data.import_export_enabled,
          documents_enabled: data.documents_enabled,
        };
      } catch (err) {
        console.error('Failed to load organization:', err);
        return null;
      }
    };

    // We need to make this work with async - create a wrapper component
    const [orgData, setOrgData] = useState<Organization | null>(null);
    
    useEffect(() => {
      getOrgData().then(setOrgData);
    }, [viewingAgreement]);

    if (!orgData) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      );
    }

    return (
      <SubscriptionAgreement 
        organization={orgData}
        onBack={() => setViewingAgreement(null)}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="border-b bg-white px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Bids & Quotes</h1>
            <p className="text-sm text-gray-500 mt-1">
              Manage your quotes, proposals, and deals
            </p>
          </div>
          <Button onClick={() => { setSelectedQuote(null); setIsDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            New Quote
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search quotes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="viewed">Viewed</SelectItem>
              <SelectItem value="accepted">Accepted</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
          <Tabs value={view} onValueChange={(v) => setView(v as 'kanban' | 'list')}>
            <TabsList>
              <TabsTrigger value="kanban">Kanban</TabsTrigger>
              <TabsTrigger value="list">List</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="flex items-center gap-2 mt-3 text-sm text-gray-500">
          <span>{filteredQuotes.length} quotes</span>
          <span>•</span>
          <span>Total Value: ${filteredQuotes.reduce((sum, q) => sum + q.total, 0).toLocaleString()}</span>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {view === 'kanban' ? (
          <div className="h-full overflow-auto p-6">
            {filteredQuotes.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <FileText className="h-12 w-12 mb-4" />
                <p className="text-lg font-medium">No bids found</p>
                <p className="text-sm">Create your first quote to get started</p>
              </div>
            ) : (
              <DealsKanban
                quotes={filteredQuotes}
                onStatusChange={handleStatusChange}
                onEdit={handleEdit}
                onPreview={handlePreview}
                onDelete={handleDelete}
                onEmail={handleEmail}
                onViewAgreement={handleViewAgreement}
              />
            )}
          </div>
        ) : (
          <div className="p-6 overflow-auto">
            {filteredQuotes.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                <FileText className="h-12 w-12 mb-4" />
                <p className="text-lg font-medium">No bids found</p>
                <p className="text-sm">Create your first quote to get started</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredQuotes.map(quote => (
                  <Card key={quote.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-lg">{quote.title}</h3>
                            <Badge variant={
                              quote.status === 'accepted' ? 'default' :
                              quote.status === 'rejected' ? 'destructive' :
                              quote.status === 'sent' ? 'secondary' :
                              'outline'
                            }>
                              {quote.status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {quote.contactName || 'No Contact'}
                            </span>
                            <span className="flex items-center gap-1">
                              <DollarSign className="h-3 w-3" />
                              ${quote.total.toLocaleString()}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(quote.validUntil).toLocaleDateString()}
                            </span>
                            <span className="font-mono text-xs">{quote.quoteNumber}</span>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewAgreement(quote)}>
                              <FileText className="h-4 w-4 mr-2" />
                              View Agreement
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleEdit(quote)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handlePreview(quote)}>
                              <Eye className="h-4 w-4 mr-2" />
                              Preview
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEmail(quote)}>
                              <Send className="h-4 w-4 mr-2" />
                              {quote.status === 'sent' ? 'Resend' : 'Send Quote'}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleDelete(quote.id)} className="text-red-600">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Email Dialog */}
      {isEmailDialogOpen && emailQuote && (
        <EmailQuoteDialog
          quote={emailQuote}
          isOpen={isEmailDialogOpen}
          onClose={() => {
            setIsEmailDialogOpen(false);
            setEmailQuote(null);
            loadData();
          }}
        />
      )}

      {/* Preview Dialog */}
      {isPreviewOpen && previewQuote && (
        <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
            <DialogHeader>
              <DialogTitle>Quote Preview</DialogTitle>
              <DialogDescription>
                {previewQuote.quoteNumber} - {previewQuote.title}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-gray-500">Contact</Label>
                  <p className="font-medium">{previewQuote.contactName}</p>
                </div>
                <div>
                  <Label className="text-sm text-gray-500">Total</Label>
                  <p className="font-medium">${previewQuote.total.toLocaleString()}</p>
                </div>
                <div>
                  <Label className="text-sm text-gray-500">Status</Label>
                  <Badge>{previewQuote.status}</Badge>
                </div>
                <div>
                  <Label className="text-sm text-gray-500">Valid Until</Label>
                  <p className="font-medium">{new Date(previewQuote.validUntil).toLocaleDateString()}</p>
                </div>
              </div>
              {previewQuote.notes && (
                <div>
                  <Label className="text-sm text-gray-500">Notes</Label>
                  <p className="text-sm">{previewQuote.notes}</p>
                </div>
              )}
              {previewQuote.terms && (
                <div>
                  <Label className="text-sm text-gray-500">Terms</Label>
                  <p className="text-sm">{previewQuote.terms}</p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
