import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import {
  ArrowLeft,
  Edit,
  DollarSign,
  Calendar,
  Plus,
  Trash2,
  FileText,
  Loader2,
  MoreVertical,
  User,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { bidsAPI, contactsAPI, projectManagersAPI, inventoryAPI, quotesAPI } from '../utils/api';
import { createClient } from '../utils/supabase/client';
import type { User } from '../App';
import { canAdd, canChange, canDelete } from '../utils/permissions';
import { BidLineItems, LineItemsTable } from './BidLineItems';

interface Opportunity {
  id: string;
  title: string;
  description: string;
  customerId: string;
  status: 'Open' | 'In Progress' | 'Won' | 'Lost';
  value: number;
  expectedCloseDate: string;
  createdAt: string;
}

interface LineItem {
  id: string;
  itemId: string;
  itemName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
}

interface Bid {
  id: string;
  title: string;
  customerId: string;
  opportunityId: string;
  projectManagerId?: string;
  amount: number;
  subtotal?: number;
  taxRate?: number;
  taxAmount?: number;
  status: string;
  validUntil: string;
  items: LineItem[];
  notes?: string;
  createdAt: string;
  contacts?: { id: string; name: string; company: string };
  project_managers?: { id: string; name: string };
}

interface Contact {
  id: string;
  name: string;
  company: string;
}

interface ProjectManager {
  id: string;
  name: string;
  customerId: string;
}

interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  description: string;
  priceTier1: number;
}

interface OpportunityDetailProps {
  opportunity: Opportunity;
  user: User;
  onBack: () => void;
  onEdit: (opportunity: Opportunity) => void;
}

export function OpportunityDetail({ opportunity, user, onBack, onEdit }: OpportunityDetailProps) {
  const [bids, setBids] = useState<Bid[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [projectManagers, setProjectManagers] = useState<ProjectManager[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isAddBidDialogOpen, setIsAddBidDialogOpen] = useState(false);
  const [isEditBidDialogOpen, setIsEditBidDialogOpen] = useState(false);
  const [editingBid, setEditingBid] = useState<Bid | null>(null);
  const [taxRate, setTaxRate] = useState(0);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  
  // Other state variables
  const [newBid, setNewBid] = useState({
    title: '',
    amount: '',
    status: 'Submitted',
    validUntil: '',
    notes: '',
    projectManagerId: '',
  });
  const [currentLineItems, setCurrentLineItems] = useState<LineItem[]>([]);
  const [isLineItemDialogOpen, setIsLineItemDialogOpen] = useState(false);
  const [selectedPMFilter, setSelectedPMFilter] = useState('all');

  useEffect(() => {
    console.log('OpportunityDetail mounted for opportunity:', opportunity.id);
    loadData();
    // Load default tax rate from organization settings
    const orgId = localStorage.getItem('currentOrgId') || 'org_001';
    const stored = localStorage.getItem(`global_settings_${orgId}`);
    if (stored) {
      const settings = JSON.parse(stored);
      setTaxRate(settings.taxRate || 0);
      console.log('Loaded tax rate:', settings.taxRate || 0);
    }
  }, [opportunity.id]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      console.log('[loadData] Starting to load data for opportunity:', opportunity.id);
      
      const [bidsData, quotesData, contactsData, pmsData, inventoryData] = await Promise.all([
        bidsAPI.getByOpportunity(opportunity.id),
        quotesAPI.getAll(),
        contactsAPI.getAll(),
        projectManagersAPI.getByCustomer(opportunity.customerId),
        inventoryAPI.getAll(),
      ]);
      
      console.log('[loadData] Raw bidsData:', bidsData);
      console.log('[loadData] Number of bids loaded:', bidsData.bids?.length || 0);
      console.log('[loadData] All quotes from API:', quotesData.quotes?.length || 0);
      console.log('[loadData] Opportunity customer ID:', opportunity.customerId);
      
      // Parse bids line items if they're stringified and map snake_case to camelCase
      const parsedBids = (bidsData.bids || []).map((b: any) => {
        console.log('[loadData] Processing bid:', b);
        let lineItems = [];
        try {
          if (typeof b.items === 'string') {
            lineItems = JSON.parse(b.items);
          } else if (Array.isArray(b.items)) {
            lineItems = b.items;
          } else if (b.line_items) {
            lineItems = typeof b.line_items === 'string' ? JSON.parse(b.line_items) : b.line_items;
          }
        } catch (e) {
          console.error('Failed to parse bid line items:', e);
        }
        
        return {
          id: b.id,
          title: b.title,
          customerId: b.customer_id || b.customerId,
          opportunityId: b.opportunity_id || b.opportunityId,
          projectManagerId: b.project_manager_id || b.projectManagerId,
          amount: b.amount,
          subtotal: b.subtotal,
          taxRate: b.tax_rate || b.taxRate,
          taxAmount: b.tax_amount || b.taxAmount,
          status: b.status,
          validUntil: b.valid_until || b.validUntil,
          notes: b.notes,
          items: lineItems,
          createdAt: b.created_at || b.createdAt,
          contacts: b.contacts,
          project_managers: b.project_managers,
          _source: 'bids', // Tag to identify source
        };
      });
      
      // Filter quotes by customer_id OR opportunity_id (if quotes table has it)
      const allQuotes = quotesData.quotes || [];
      const quotesForOpportunity = allQuotes.filter((q: any) => {
        // Check if quote has opportunity_id matching this opportunity
        if (q.opportunity_id === opportunity.id) {
          console.log('[loadData] ✅ Quote matched by opportunity_id:', q.id, q.title);
          return true;
        }
        // Fallback: Check if quote has customer_id matching this opportunity's customer
        if (q.contact_id === opportunity.customerId || q.customer_id === opportunity.customerId) {
          console.log('[loadData] ✅ Quote matched by customer_id:', q.id, q.title);
          return true;
        }
        return false;
      });
      
      console.log('[loadData] Quotes for this opportunity:', quotesForOpportunity.length);
      
      // Parse line items for each quote and convert to bid format
      const parsedQuotes = quotesForOpportunity.map((quote: any) => {
        let parsedLineItems: any[] = [];
        const rawLineItems = quote.lineItems || quote.line_items || quote.items;
        if (rawLineItems) {
          try {
            if (typeof rawLineItems === 'string') {
              parsedLineItems = JSON.parse(rawLineItems);
            } else if (Array.isArray(rawLineItems)) {
              parsedLineItems = rawLineItems;
            }
            // Ensure cost field exists for backward compatibility
            parsedLineItems = parsedLineItems.map(item => ({
              ...item,
              cost: item.cost ?? 0,
            }));
          } catch (error) {
            console.error('Failed to parse line items for quote:', quote.id, error);
          }
        }
        
        // Convert quote to bid format for display consistency
        return {
          id: quote.id,
          title: quote.title || 'Quote',
          customerId: quote.contact_id || quote.customer_id,
          opportunityId: opportunity.id,
          amount: quote.total || quote.amount || 0,
          status: quote.status || 'draft',
          validUntil: quote.valid_until || quote.validUntil || new Date().toISOString(),
          notes: quote.notes || '',
          createdAt: quote.created_at || quote.createdAt,
          items: parsedLineItems,
          subtotal: quote.subtotal || 0,
          taxRate: quote.tax_percent || quote.taxPercent || 0,
          taxAmount: quote.tax_amount || quote.taxAmount || 0,
          _source: 'quotes', // Tag to identify source
        };
      });
      
      // Merge bids and quotes
      const allBids = [...parsedBids, ...parsedQuotes].sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      
      console.log('[loadData] Total merged bids + quotes:', allBids.length);
      console.log('[loadData] Parsed bids:', parsedBids);
      console.log('[loadData] Project managers loaded:', pmsData.projectManagers?.length || 0);
      
      setBids(allBids);
      setContacts(contactsData.contacts || []);
      setProjectManagers(pmsData.projectManagers || []);
      setInventoryItems(inventoryData.items || []);
    } catch (error) {
      console.error('[loadData] Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateTotalFromLineItems = (items: LineItem[]) => {
    return items.reduce((sum, item) => sum + item.total, 0);
  };

  const handleAddLineItem = (item: LineItem) => {
    setCurrentLineItems([...currentLineItems, item]);
    setIsLineItemDialogOpen(false);
  };

  const handleRemoveLineItem = (id: string) => {
    setCurrentLineItems(currentLineItems.filter(item => item.id !== id));
  };

  const handleAddBid = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const subtotal = currentLineItems.length > 0 
        ? calculateTotalFromLineItems(currentLineItems)
        : parseFloat(newBid.amount);
      
      const taxAmount = subtotal * (taxRate / 100);
      const totalAmount = subtotal + taxAmount;

      const { bid: createdBid } = await bidsAPI.create({
        title: newBid.title,
        opportunity_id: opportunity.id,
        project_manager_id: newBid.projectManagerId || null,
        subtotal: subtotal,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        amount: totalAmount,
        status: newBid.status,
        valid_until: newBid.validUntil,
        notes: newBid.notes,
        items: currentLineItems,
      });
      
      // Transform the returned bid from snake_case to camelCase
      const transformedBid: Bid = {
        id: createdBid.id,
        title: createdBid.title,
        customerId: createdBid.customer_id || createdBid.customerId,
        opportunityId: createdBid.opportunity_id || createdBid.opportunityId,
        projectManagerId: createdBid.project_manager_id || createdBid.projectManagerId,
        amount: createdBid.amount,
        subtotal: createdBid.subtotal,
        taxRate: createdBid.tax_rate || createdBid.taxRate,
        taxAmount: createdBid.tax_amount || createdBid.taxAmount,
        status: createdBid.status,
        validUntil: createdBid.valid_until || createdBid.validUntil,
        notes: createdBid.notes,
        items: typeof createdBid.items === 'string' ? JSON.parse(createdBid.items) : (createdBid.items || []),
        createdAt: createdBid.created_at || createdBid.createdAt,
        contacts: createdBid.contacts,
        project_managers: createdBid.project_managers,
      };
      
      setBids([...bids, transformedBid]);
      setNewBid({
        title: '',
        amount: '',
        status: 'Submitted',
        validUntil: '',
        notes: '',
        projectManagerId: '',
      });
      setCurrentLineItems([]);
      setIsAddBidDialogOpen(false);
      setAlert({ type: 'success', message: 'Bid created successfully!' });
    } catch (error) {
      console.error('Failed to create bid:', error);
      setAlert({ type: 'error', message: 'Failed to create bid. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditBid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBid) return;
    setIsSaving(true);

    try {
      const subtotal = currentLineItems.length > 0 
        ? calculateTotalFromLineItems(currentLineItems)
        : (editingBid.subtotal || editingBid.amount || 0);
      
      const taxAmount = subtotal * (taxRate / 100);
      const totalAmount = subtotal + taxAmount;

      const { bid: updatedBid } = await bidsAPI.update(editingBid.id, {
        title: editingBid.title,
        subtotal: subtotal,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        amount: totalAmount,
        status: editingBid.status,
        valid_until: editingBid.validUntil,
        notes: editingBid.notes,
        project_manager_id: editingBid.projectManagerId || null,
        items: currentLineItems,
      });
      
      // Transform the returned bid from snake_case to camelCase
      const transformedBid: Bid = {
        id: updatedBid.id,
        title: updatedBid.title,
        customerId: updatedBid.customer_id || updatedBid.customerId,
        opportunityId: updatedBid.opportunity_id || updatedBid.opportunityId,
        projectManagerId: updatedBid.project_manager_id || updatedBid.projectManagerId,
        amount: updatedBid.amount,
        subtotal: updatedBid.subtotal,
        taxRate: updatedBid.tax_rate || updatedBid.taxRate,
        taxAmount: updatedBid.tax_amount || updatedBid.taxAmount,
        status: updatedBid.status,
        validUntil: updatedBid.valid_until || updatedBid.validUntil,
        notes: updatedBid.notes,
        items: typeof updatedBid.items === 'string' ? JSON.parse(updatedBid.items) : (updatedBid.items || []),
        createdAt: updatedBid.created_at || updatedBid.createdAt,
        contacts: updatedBid.contacts,
        project_managers: updatedBid.project_managers,
      };
      
      setBids(bids.map(b => (b.id === transformedBid.id ? transformedBid : b)));
      setEditingBid(null);
      setCurrentLineItems([]);
      setIsEditBidDialogOpen(false);
      setAlert({ type: 'success', message: 'Bid updated successfully!' });
    } catch (error) {
      console.error('Failed to update bid:', error);
      setAlert({ type: 'error', message: 'Failed to update bid. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteBid = async (id: string) => {
    if (!confirm('Are you sure you want to delete this bid?')) return;

    try {
      await bidsAPI.delete(id);
      setBids(bids.filter(b => b.id !== id));
      setAlert({ type: 'success', message: 'Bid deleted successfully!' });
    } catch (error) {
      console.error('Failed to delete bid:', error);
      setAlert({ type: 'error', message: 'Failed to delete bid. Please try again.' });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Open':
        return 'bg-blue-100 text-blue-700';
      case 'In Progress':
        return 'bg-yellow-100 text-yellow-700';
      case 'Won':
        return 'bg-green-100 text-green-700';
      case 'Lost':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getBidStatusColor = (status: string) => {
    switch (status) {
      case 'Draft':
        return 'bg-gray-100 text-gray-700';
      case 'Sent':
        return 'bg-blue-100 text-blue-700';
      case 'Accepted':
        return 'bg-green-100 text-green-700';
      case 'Rejected':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const openEditDialog = (bid: Bid) => {
    console.log('Opening edit dialog for bid:', bid);
    setEditingBid(bid);
    setCurrentLineItems(bid.items || []);
    // Set the tax rate from the bid, or use the default
    if (bid.taxRate !== undefined && bid.taxRate !== null) {
      setTaxRate(bid.taxRate);
      console.log('Set tax rate from bid:', bid.taxRate);
    }
    console.log('Edit state - editingBid:', bid, 'currentLineItems:', bid.items || []);
    setIsEditBidDialogOpen(true);
  };

  // Filter bids by project manager
  const filteredBids = bids.filter(bid => {
    if (selectedPMFilter === 'all') return true;
    if (selectedPMFilter === 'none') return !bid.projectManagerId;
    return bid.projectManagerId === selectedPMFilter;
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Button variant="ghost" onClick={onBack} className="mb-2">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Opportunities
          </Button>
          <h1 className="text-3xl">{opportunity.title}</h1>
          <p className="text-gray-600 mt-1">{opportunity.description}</p>
        </div>
        {canChange('bids', user.role) && (
          <Button onClick={() => onEdit(opportunity)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit Opportunity
          </Button>
        )}
      </div>

      {/* Opportunity Information */}
      <Card>
        <CardHeader>
          <CardTitle>Opportunity Information</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <div className="text-sm text-gray-600 mb-1">Status</div>
            <span className={`inline-block px-3 py-1 text-sm rounded ${getStatusColor(opportunity.status)}`}>
              {opportunity.status}
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
              <DollarSign className="h-4 w-4" />
              Value
            </div>
            <p className="text-gray-900">${opportunity.value.toLocaleString()}</p>
          </div>
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
              <Calendar className="h-4 w-4" />
              Expected Close
            </div>
            <p className="text-gray-900">
              {new Date(opportunity.expectedCloseDate).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Bids Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Bids & Quotes</CardTitle>
            {canAdd('bids', user.role) && (
              <Dialog open={isAddBidDialogOpen} onOpenChange={(open) => {
                setIsAddBidDialogOpen(open);
                if (!open) setCurrentLineItems([]);
              }}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Bid
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-h-[90vh] overflow-y-auto max-w-4xl">
                  <DialogHeader>
                    <DialogTitle>Create New Bid</DialogTitle>
                    <DialogDescription>
                      Create a bid/quote for {opportunity.title}
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleAddBid} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="bid-title">Bid Title *</Label>
                      <Input
                        id="bid-title"
                        value={newBid.title}
                        onChange={(e) => setNewBid({ ...newBid, title: e.target.value })}
                        placeholder="e.g., Website Redesign Quote"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="bid-projectManager">Project Manager</Label>
                      <Select
                        value={newBid.projectManagerId || 'none'}
                        onValueChange={(value) => setNewBid({ ...newBid, projectManagerId: value === 'none' ? '' : value })}
                      >
                        <SelectTrigger id="bid-projectManager">
                          <SelectValue placeholder="Select a project manager" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {projectManagers.map((pm) => (
                            <SelectItem key={pm.id} value={pm.id}>
                              {pm.name} ({pm.email})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-gray-500">
                        Bids and quotes will be emailed to this person
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="bid-status">Status *</Label>
                      <Select
                        value={newBid.status}
                        onValueChange={(value) => setNewBid({ ...newBid, status: value })}
                      >
                        <SelectTrigger id="bid-status">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Draft">Draft</SelectItem>
                          <SelectItem value="Sent">Sent</SelectItem>
                          <SelectItem value="Accepted">Accepted</SelectItem>
                          <SelectItem value="Rejected">Rejected</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="bid-validUntil">Valid Until *</Label>
                      <Input
                        id="bid-validUntil"
                        type="date"
                        value={newBid.validUntil}
                        onChange={(e) => setNewBid({ ...newBid, validUntil: e.target.value })}
                        required
                      />
                    </div>

                    {/* Line Items Section */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Line Items from Inventory</Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setIsLineItemDialogOpen(true)}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Line Item
                        </Button>
                      </div>
                      <LineItemsTable
                        items={currentLineItems}
                        onRemove={handleRemoveLineItem}
                        editable={true}
                        taxRate={taxRate}
                      />
                    </div>

                    {/* Tax Rate Input */}
                    <div className="space-y-2">
                      <Label htmlFor="bid-taxRate">Tax Rate (%)</Label>
                      <Input
                        id="bid-taxRate"
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={taxRate}
                        onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                        placeholder="e.g., 8.5"
                      />
                      <p className="text-xs text-gray-500">
                        Default from organization settings. You can override for this bid.
                      </p>
                    </div>

                    {/* Total Summary with Tax */}
                    {currentLineItems.length > 0 && (
                      <div className="border rounded-lg p-4 bg-gray-50 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Subtotal:</span>
                          <span className="text-gray-900">${calculateTotalFromLineItems(currentLineItems).toFixed(2)}</span>
                        </div>
                        {taxRate > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Tax ({taxRate}%):</span>
                            <span className="text-gray-900">${(calculateTotalFromLineItems(currentLineItems) * (taxRate / 100)).toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-base border-t pt-2">
                          <span className="font-semibold text-gray-900">Total:</span>
                          <span className="font-semibold text-gray-900">
                            ${(calculateTotalFromLineItems(currentLineItems) * (1 + taxRate / 100)).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Manual Amount (if no line items) */}
                    {currentLineItems.length === 0 && (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="bid-amount">Subtotal *</Label>
                          <Input
                            id="bid-amount"
                            type="number"
                            step="0.01"
                            value={newBid.amount}
                            onChange={(e) => setNewBid({ ...newBid, amount: e.target.value })}
                            placeholder="0.00"
                            required
                          />
                        </div>
                        {parseFloat(newBid.amount) > 0 && (
                          <div className="border rounded-lg p-4 bg-gray-50 space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Subtotal:</span>
                              <span className="text-gray-900">${parseFloat(newBid.amount || '0').toFixed(2)}</span>
                            </div>
                            {taxRate > 0 && (
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Tax ({taxRate}%):</span>
                                <span className="text-gray-900">${(parseFloat(newBid.amount || '0') * (taxRate / 100)).toFixed(2)}</span>
                              </div>
                            )}
                            <div className="flex justify-between text-base border-t pt-2">
                              <span className="font-semibold text-gray-900">Total:</span>
                              <span className="font-semibold text-gray-900">
                                ${(parseFloat(newBid.amount || '0') * (1 + taxRate / 100)).toFixed(2)}
                              </span>
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="bid-notes">Notes (Optional)</Label>
                      <Textarea
                        id="bid-notes"
                        value={newBid.notes}
                        onChange={(e) => setNewBid({ ...newBid, notes: e.target.value })}
                        rows={3}
                        placeholder="Additional notes or terms..."
                      />
                    </div>

                    <div className="flex gap-2 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setNewBid({
                            title: '',
                            amount: '',
                            status: 'Submitted',
                            validUntil: '',
                            notes: '',
                            projectManagerId: '',
                          });
                          setCurrentLineItems([]);
                          setIsAddBidDialogOpen(false);
                        }}
                        className="flex-1"
                        disabled={isSaving}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" className="flex-1" disabled={isSaving}>
                        {isSaving ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          'Create Bid'
                        )}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Project Manager Filter */}
          {projectManagers.length > 0 && bids.length > 0 && (
            <div className="mb-4">
              <Label htmlFor="pm-filter" className="text-sm text-gray-600">Filter by Project Manager</Label>
              <Select value={selectedPMFilter} onValueChange={setSelectedPMFilter}>
                <SelectTrigger id="pm-filter" className="w-64 mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Project Managers</SelectItem>
                  <SelectItem value="none">No Project Manager</SelectItem>
                  {projectManagers.map((pm) => (
                    <SelectItem key={pm.id} value={pm.id}>
                      {pm.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : filteredBids.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No bids created yet</p>
              <p className="text-sm mt-1">Create bids to track quotes and proposals for this opportunity</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredBids.map((bid) => (
                <div key={bid.id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                          <FileText className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">{bid.title}</h4>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <DollarSign className="h-3 w-3" />
                            ${bid.amount.toLocaleString()}
                            {bid.items && bid.items.length > 0 && (
                              <span className="text-xs text-gray-500">({bid.items.length} items)</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="ml-13 space-y-2">
                        <div className="flex items-center gap-4 text-sm">
                          <span className={`inline-block px-2 py-1 text-xs rounded ${getBidStatusColor(bid.status)}`}>
                            {bid.status}
                          </span>
                          <div className="flex items-center gap-1 text-gray-600">
                            <Calendar className="h-3 w-3" />
                            Valid until {new Date(bid.validUntil).toLocaleDateString()}
                          </div>
                        </div>
                        {bid.project_managers && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <User className="h-3 w-3" />
                            PM: {bid.project_managers.name}
                          </div>
                        )}
                        {bid.notes && (
                          <p className="text-sm text-gray-600 mt-2">{bid.notes}</p>
                        )}
                        {bid.items && bid.items.length > 0 && (
                          <div className="mt-3">
                            <LineItemsTable items={bid.items} onRemove={() => {}} editable={false} />
                          </div>
                        )}
                      </div>
                    </div>
                    {canChange('bids', user.role) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditDialog(bid)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          {canDelete('bids', user.role) && (
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => handleDeleteBid(bid.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Bid Dialog */}
      <Dialog open={isEditBidDialogOpen} onOpenChange={(open) => {
        setIsEditBidDialogOpen(open);
        if (!open) {
          setEditingBid(null);
          setCurrentLineItems([]);
        }
      }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto max-w-4xl">
          <DialogHeader>
            <DialogTitle>Edit Bid</DialogTitle>
            <DialogDescription>Update the bid information</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditBid} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-bid-title">Bid Title *</Label>
              <Input
                id="edit-bid-title"
                value={editingBid?.title || ''}
                onChange={(e) => setEditingBid(editingBid ? { ...editingBid, title: e.target.value } : null)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-bid-projectManager">Project Manager</Label>
              <Select
                value={editingBid?.projectManagerId || 'none'}
                onValueChange={(value) => setEditingBid(editingBid ? { ...editingBid, projectManagerId: value === 'none' ? '' : value } : null)}
              >
                <SelectTrigger id="edit-bid-projectManager">
                  <SelectValue placeholder="Select a project manager" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {projectManagers.map((pm) => (
                    <SelectItem key={pm.id} value={pm.id}>
                      {pm.name} ({pm.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                Bids and quotes will be emailed to this person
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-bid-status">Status *</Label>
              <Select
                value={editingBid?.status || 'Draft'}
                onValueChange={(value) => setEditingBid(editingBid ? { ...editingBid, status: value } : null)}
              >
                <SelectTrigger id="edit-bid-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Draft">Draft</SelectItem>
                  <SelectItem value="Sent">Sent</SelectItem>
                  <SelectItem value="Accepted">Accepted</SelectItem>
                  <SelectItem value="Rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-bid-validUntil">Valid Until *</Label>
              <Input
                id="edit-bid-validUntil"
                type="date"
                value={editingBid?.validUntil?.split('T')[0] || ''}
                onChange={(e) => setEditingBid(editingBid ? { ...editingBid, validUntil: e.target.value } : null)}
                required
              />
            </div>

            {/* Line Items Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Line Items from Inventory</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsLineItemDialogOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Line Item
                </Button>
              </div>
              <LineItemsTable
                items={currentLineItems}
                onRemove={handleRemoveLineItem}
                editable={true}
                taxRate={taxRate}
              />
            </div>

            {/* Tax Rate Input */}
            <div className="space-y-2">
              <Label htmlFor="edit-bid-taxRate">Tax Rate (%)</Label>
              <Input
                id="edit-bid-taxRate"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={taxRate}
                onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                placeholder="e.g., 8.5"
              />
              <p className="text-xs text-gray-500">
                Tax rate for this bid. You can override the default rate.
              </p>
            </div>

            {/* Total Summary with Tax */}
            {currentLineItems.length > 0 && (
              <div className="border rounded-lg p-4 bg-gray-50 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="text-gray-900">${calculateTotalFromLineItems(currentLineItems).toFixed(2)}</span>
                </div>
                {taxRate > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Tax ({taxRate}%):</span>
                    <span className="text-gray-900">${(calculateTotalFromLineItems(currentLineItems) * (taxRate / 100)).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base border-t pt-2">
                  <span className="font-semibold text-gray-900">Total:</span>
                  <span className="font-semibold text-gray-900">
                    ${(calculateTotalFromLineItems(currentLineItems) * (1 + taxRate / 100)).toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            {/* Manual Amount (if no line items) */}
            {currentLineItems.length === 0 && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="edit-bid-amount">Subtotal *</Label>
                  <Input
                    id="edit-bid-amount"
                    type="number"
                    step="0.01"
                    value={editingBid?.subtotal || editingBid?.amount || ''}
                    onChange={(e) =>
                      setEditingBid(editingBid ? { ...editingBid, subtotal: parseFloat(e.target.value), amount: parseFloat(e.target.value) } : null)
                    }
                    required
                  />
                </div>
                {editingBid && (editingBid.subtotal || editingBid.amount) > 0 && (
                  <div className="border rounded-lg p-4 bg-gray-50 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Subtotal:</span>
                      <span className="text-gray-900">${(editingBid.subtotal || editingBid.amount || 0).toFixed(2)}</span>
                    </div>
                    {taxRate > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Tax ({taxRate}%):</span>
                        <span className="text-gray-900">${((editingBid.subtotal || editingBid.amount || 0) * (taxRate / 100)).toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-base border-t pt-2">
                      <span className="font-semibold text-gray-900">Total:</span>
                      <span className="font-semibold text-gray-900">
                        ${((editingBid.subtotal || editingBid.amount || 0) * (1 + taxRate / 100)).toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="edit-bid-notes">Notes</Label>
              <Textarea
                id="edit-bid-notes"
                value={editingBid?.notes || ''}
                onChange={(e) => setEditingBid(editingBid ? { ...editingBid, notes: e.target.value } : null)}
                rows={3}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditingBid(null);
                  setCurrentLineItems([]);
                  setIsEditBidDialogOpen(false);
                }}
                className="flex-1"
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Line Item Dialog */}
      <BidLineItems
        isOpen={isLineItemDialogOpen}
        onClose={() => setIsLineItemDialogOpen(false)}
        inventoryItems={inventoryItems}
        currentItems={currentLineItems}
        onAddItem={handleAddLineItem}
      />

      {/* Alert */}
      {alert && (
        <div
          className={`p-4 rounded-lg mb-4 ${
            alert.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}
        >
          <p className="font-semibold">{alert.type === 'success' ? 'Success' : 'Error'}</p>
          <p className="text-sm">{alert.message}</p>
        </div>
      )}
    </div>
  );
}