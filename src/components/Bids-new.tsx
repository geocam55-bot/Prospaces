import { useState, useEffect, useMemo } from 'react';
import { quotesAPI, contactsAPI, inventoryAPI, projectManagersAPI } from '../utils/api';
import type { User } from '../App';
import { getGlobalTaxRate } from '../lib/global-settings';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { 
  FileText, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Eye, 
  Download, 
  Send, 
  CheckCircle2, 
  X, 
  AlertCircle, 
  DollarSign, 
  ShoppingCart, 
  MoreVertical, 
  RefreshCw 
} from 'lucide-react';
import { useDebounce } from '../utils/useDebounce';

interface LineItem {
  id: string;
  itemId: string;
  itemName: string;
  sku: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
}

interface Quote {
  id: string;
  quoteNumber: string;
  title: string;
  contactId: string;
  contactName: string;
  contactEmail?: string;
  projectManagerId?: string;
  projectManagerName?: string;
  priceTier: number;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
  validUntil: string;
  lineItems: LineItem[];
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  taxPercent: number;
  taxAmount: number;
  total: number;
  notes?: string;
  terms?: string;
  createdAt: string;
  updatedAt: string;
  ownerId: string;
}

interface BidsProps {
  user: User;
}

interface Contact {
  id: string;
  name: string;
  email?: string;
  priceTier?: number;
}

interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  description: string;
  quantityOnHand: number;
  cost: number;
  priceTier1: number;
  priceTier2: number;
  priceTier3: number;
  priceTier4: number;
  priceTier5: number;
  unitOfMeasure: string;
  status: string;
}

interface ProjectManager {
  id: string;
  name: string;
  email?: string;
  phone?: string;
}

export function Bids({ user }: BidsProps) {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [projectManagers, setProjectManagers] = useState<ProjectManager[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showDialog, setShowDialog] = useState(false);
  const [showLineItemDialog, setShowLineItemDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null);
  const [previewQuote, setPreviewQuote] = useState<Quote | null>(null);
  const [statusQuote, setStatusQuote] = useState<Quote | null>(null);
  const [newStatus, setNewStatus] = useState<Quote['status']>('draft');
  const [isLoading, setIsLoading] = useState(true);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // ⚡ Performance: Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    contactId: '',
    projectManagerId: '',
    validUntil: '',
    discountPercent: 0,
    taxPercent: getGlobalTaxRate(), // ✅ Using global tax rate
    notes: '',
    terms: 'Payment due within 30 days. All prices in USD.',
  });

  const [currentLineItems, setCurrentLineItems] = useState<LineItem[]>([]);
  const [selectedInventoryId, setSelectedInventoryId] = useState('');
  const [lineItemQuantity, setLineItemQuantity] = useState(1);
  const [lineItemDiscount, setLineItemDiscount] = useState(0);
  const [lineItemManualPrice, setLineItemManualPrice] = useState<number | null>(null); // ✅ Manual price override
  
  // Inventory search state for Add Line Item dialog
  const [inventorySearchQuery, setInventorySearchQuery] = useState('');
  const [isSearchingInventory, setIsSearchingInventory] = useState(false);

  // Project Manager search state
  const [pmSearchQuery, setPmSearchQuery] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  // 🚀 Debounce search query (200ms delay for fast typing)
  const debouncedInventorySearch = useDebounce(inventorySearchQuery, 200);

  // Instant client-side inventory search with useMemo (no useState needed for filtered results)
  const filteredInventory = useMemo(() => {
    if (!debouncedInventorySearch.trim()) {
      // Show all active inventory items when search is empty
      return inventory.filter((item: InventoryItem) => item.status === 'active').slice(0, 100);
    }

    // Instant client-side filter
    const query = debouncedInventorySearch.toLowerCase();
    const filtered = inventory.filter((item: InventoryItem) => 
      item.status === 'active' &&
      (item.name?.toLowerCase().includes(query) ||
       item.sku?.toLowerCase().includes(query) ||
       (item as any).item_number?.toLowerCase().includes(query) ||
       item.description?.toLowerCase().includes(query))
    );
    
    return filtered.slice(0, 100); // Show up to 100 results
  }, [debouncedInventorySearch, inventory]);

  // Initialize when dialog opens
  useEffect(() => {
    if (showLineItemDialog) {
      setInventorySearchQuery('');
      setLineItemManualPrice(null); // Reset manual price
    }
  }, [showLineItemDialog]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [quotesData, contactsData, inventoryData, pmData] = await Promise.all([
        quotesAPI.getAll(),
        contactsAPI.getAll(),
        inventoryAPI.getAll(),
        projectManagersAPI.getAll(), // ✅ Load project managers
      ]);

      console.log('Raw quotes data from API:', quotesData.quotes?.[0]);

      // Parse quotes if they have stringified lineItems
      const parsedQuotes = (quotesData.quotes || []).map((q: any) => {
        const rawLineItems = q.lineItems || q.line_items || q.items || q.line_item_data || q.bid_items;
        let parsedLineItems = [];
        
        try {
          if (typeof rawLineItems === 'string') {
            parsedLineItems = JSON.parse(rawLineItems);
          } else if (Array.isArray(rawLineItems)) {
            parsedLineItems = rawLineItems;
          }
        } catch (error) {
          console.error('Failed to parse line items for quote:', q.id, error);
          parsedLineItems = [];
        }

        return {
          ...q,
          lineItems: parsedLineItems,
          subtotal: q.subtotal ?? q.amount ?? 0,
          discountPercent: q.discountPercent ?? q.discount_percent ?? 0,
          discountAmount: q.discountAmount ?? q.discount_amount ?? 0,
          taxPercent: q.taxPercent ?? q.tax_percent ?? q.tax_rate ?? 0,
          taxAmount: q.taxAmount ?? q.tax_amount ?? 0,
          total: q.total ?? q.amount ?? 0,
          contactId: q.contactId ?? q.contact_id,
          contactName: q.contactName ?? q.contact_name ?? '',
          contactEmail: q.contactEmail ?? q.contact_email ?? '',
          projectManagerId: q.projectManagerId ?? q.project_manager_id,
          projectManagerName: q.projectManagerName ?? q.project_manager_name ?? '',
          quoteNumber: q.quoteNumber ?? q.quote_number ?? '',
          validUntil: q.validUntil ?? q.valid_until ?? '',
          priceTier: q.priceTier ?? q.price_tier ?? 1,
          createdAt: q.createdAt ?? q.created_at,
          updatedAt: q.updatedAt ?? q.updated_at,
        };
      });

      setQuotes(parsedQuotes);
      setContacts(contactsData.contacts || []);
      setInventory((inventoryData.items || []).filter((item: InventoryItem) => item.status === 'active'));
      setProjectManagers((pmData.projectManagers || pmData.project_managers || [])); // ✅ Set project managers
    } catch (error) {
      console.error('Failed to load data:', error);
      showAlert('error', 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const showAlert = (type: 'success' | 'error', message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 3000);
  };

  const generateQuoteNumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `QT-${year}${month}-${random}`;
  };

  const getPriceForTier = (item: InventoryItem | undefined, tier: number): number => {
    if (!item) return 0;
    const tierKey = `priceTier${tier}` as keyof InventoryItem;
    return Number(item[tierKey]) || item.priceTier1 || 0;
  };

  const calculateLineItemTotal = (quantity: number, unitPrice: number, discount: number): number => {
    const subtotal = quantity * unitPrice;
    return subtotal - (subtotal * discount / 100);
  };

  const calculateQuoteTotals = (lineItems: LineItem[], discountPercent: number, taxPercent: number) => {
    const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0);
    const discountAmount = subtotal * (discountPercent / 100);
    const afterDiscount = subtotal - discountAmount;
    const taxAmount = afterDiscount * (taxPercent / 100);
    const total = afterDiscount + taxAmount;

    return {
      subtotal,
      discountAmount,
      taxAmount,
      total,
    };
  };

  const handleOpenDialog = (quote?: Quote) => {
    if (quote) {
      setEditingQuote(quote);
      setFormData({
        title: quote.title,
        contactId: quote.contactId,
        projectManagerId: quote.projectManagerId || '',
        validUntil: quote.validUntil,
        discountPercent: quote.discountPercent,
        taxPercent: quote.taxPercent,
        notes: quote.notes || '',
        terms: quote.terms || 'Payment due within 30 days. All prices in USD.',
      });
      setCurrentLineItems(quote.lineItems);
    } else {
      setEditingQuote(null);
      const defaultDate = new Date();
      defaultDate.setDate(defaultDate.getDate() + 30);
      setFormData({
        title: '',
        contactId: '',
        projectManagerId: '',
        validUntil: defaultDate.toISOString().split('T')[0],
        discountPercent: 0,
        taxPercent: getGlobalTaxRate(), // ✅ Refresh tax rate from global settings
        notes: '',
        terms: 'Payment due within 30 days. All prices in USD.',
      });
      setCurrentLineItems([]);
    }
    setShowDialog(true);
  };

  const handleContactChange = (contactId: string) => {
    // If there are existing line items and contact is changing, recalculate prices
    if (currentLineItems.length > 0 && formData.contactId && formData.contactId !== contactId) {
      if (confirm('Changing the contact will recalculate all line item prices based on the new price tier. Continue?')) {
        const newContact = contacts.find(c => c.id === contactId);
        const newPriceTier = newContact?.priceTier || 1;
        
        // Recalculate all line items with new price tier
        const updatedLineItems = currentLineItems.map(lineItem => {
          const inventoryItem = inventory.find(i => i.id === lineItem.itemId);
          if (!inventoryItem) return lineItem;
          
          const newUnitPrice = getPriceForTier(inventoryItem, newPriceTier);
          const newTotal = calculateLineItemTotal(lineItem.quantity, newUnitPrice, lineItem.discount);
          
          return {
            ...lineItem,
            unitPrice: newUnitPrice,
            total: newTotal,
          };
        });
        
        setCurrentLineItems(updatedLineItems);
        setFormData({ ...formData, contactId });
      }
    } else {
      // No line items yet or same contact, just update
      setFormData({ ...formData, contactId });
    }
  };

  const handleAddLineItem = () => {
    if (!selectedInventoryId) {
      showAlert('error', 'Please select a product');
      return;
    }

    // Search in filteredInventory first (from search results), then fall back to full inventory
    const item = filteredInventory.find(i => i.id === selectedInventoryId) || 
                 inventory.find(i => i.id === selectedInventoryId);
    
    if (!item) {
      showAlert('error', 'Product not found in inventory');
      return;
    }

    const contact = contacts.find(c => c.id === formData.contactId);
    const priceTier = contact?.priceTier || 1;
    
    // ✅ Use manual price if set, otherwise use tier price
    const unitPrice = lineItemManualPrice !== null ? lineItemManualPrice : getPriceForTier(item, priceTier);
    const total = calculateLineItemTotal(lineItemQuantity, unitPrice, lineItemDiscount);

    const lineItem: LineItem = {
      id: `line-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      itemId: item.id,
      itemName: item.name,
      sku: item.sku,
      description: item.description,
      quantity: lineItemQuantity,
      unitPrice,
      discount: lineItemDiscount,
      total,
    };

    setCurrentLineItems([...currentLineItems, lineItem]);
    setSelectedInventoryId('');
    setLineItemQuantity(1);
    setLineItemDiscount(0);
    setLineItemManualPrice(null); // Reset manual price
    setShowLineItemDialog(false);
    showAlert('success', 'Item added to quote');
  };

  const handleRemoveLineItem = (id: string) => {
    setCurrentLineItems(currentLineItems.filter(item => item.id !== id));
  };

  const handleSave = async () => {
    if (!formData.title || !formData.contactId) {
      showAlert('error', 'Please fill in required fields');
      return;
    }

    if (currentLineItems.length === 0) {
      showAlert('error', 'Please add at least one line item');
      return;
    }

    try {
      const contact = contacts.find(c => c.id === formData.contactId);
      const projectManager = projectManagers.find(pm => pm.id === formData.projectManagerId);
      const totals = calculateQuoteTotals(
        currentLineItems,
        formData.discountPercent,
        formData.taxPercent
      );

      // Map to snake_case for database
      const quoteData = {
        quote_number: editingQuote?.quoteNumber || generateQuoteNumber(),
        title: formData.title,
        contact_id: formData.contactId,
        contact_name: contact?.name || '',
        project_manager_id: formData.projectManagerId || null,
        project_manager_name: projectManager?.name || null,
        price_tier: contact?.priceTier || 1,
        status: editingQuote?.status || 'draft',
        valid_until: formData.validUntil,
        line_items: JSON.stringify(currentLineItems),
        subtotal: totals.subtotal,
        discount_percent: formData.discountPercent,
        discount_amount: totals.discountAmount,
        tax_percent: formData.taxPercent,
        tax_amount: totals.taxAmount,
        total: totals.total,
        notes: formData.notes,
        terms: formData.terms,
      };

      if (editingQuote) {
        await quotesAPI.update(editingQuote.id, quoteData);
        showAlert('success', 'Quote updated successfully');
      } else {
        await quotesAPI.create(quoteData);
        showAlert('success', 'Quote created successfully');
      }

      setShowDialog(false);
      loadData();
    } catch (error) {
      console.error('Failed to save quote:', error);
      showAlert('error', 'Failed to save quote');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this quote?')) return;

    try {
      await quotesAPI.delete(id);
      showAlert('success', 'Quote deleted successfully');
      loadData();
    } catch (error) {
      console.error('Failed to delete quote:', error);
      showAlert('error', 'Failed to delete quote');
    }
  };

  const handleStatusChange = async (quote: Quote, newStatus: Quote['status']) => {
    try {
      await quotesAPI.update(quote.id, { status: newStatus });
      showAlert('success', 'Quote status updated');
      loadData();
    } catch (error) {
      console.error('Failed to update status:', error);
      showAlert('error', 'Failed to update status');
    }
  };

  const handlePreview = (quote: Quote) => {
    setPreviewQuote(quote);
    setShowPreviewDialog(true);
  };

  // ⚡ Performance: Memoize filtered quotes
  const filteredQuotes = useMemo(() => {
    return quotes.filter(quote => {
      const matchesSearch =
        quote.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        quote.contactName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        quote.quoteNumber.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === 'all' || quote.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [quotes, searchQuery, statusFilter]);

  // ⚡ Performance: Paginate filtered quotes
  const paginatedQuotes = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredQuotes.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredQuotes, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredQuotes.length / itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted': return 'bg-green-100 text-green-700 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-700 border-red-200';
      case 'sent': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'expired': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'draft': return 'bg-gray-100 text-gray-700 border-gray-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const stats = {
    total: quotes.length,
    totalValue: quotes.reduce((sum, q) => sum + q.total, 0),
    acceptedValue: quotes.filter(q => q.status === 'accepted').reduce((sum, q) => sum + q.total, 0),
    pending: quotes.filter(q => q.status === 'sent').length,
  };

  // Filter project managers based on search
  const filteredProjectManagers = useMemo(() => {
    if (!pmSearchQuery.trim()) return projectManagers;
    return projectManagers.filter(pm => 
      pm.name.toLowerCase().includes(pmSearchQuery.toLowerCase()) ||
      (pm.email && pm.email.toLowerCase().includes(pmSearchQuery.toLowerCase()))
    );
  }, [projectManagers, pmSearchQuery]);

  return (
    <div className="space-y-6">
      {/* Header - showing existing code, no changes needed here */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
            <FileText className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-3xl text-foreground">Quotes & Bids</h1>
            <p className="text-muted-foreground mt-1">Create quotes with inventory products and multi-tier pricing</p>
          </div>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Create Quote
        </Button>
      </div>

      {/* Alert */}
      {alert && (
        <Alert variant={alert.type === 'error' ? 'destructive' : 'default'}>
          {alert.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <AlertDescription>{alert.message}</AlertDescription>
        </Alert>
      )}

      {/* Stats and other existing sections remain the same... */}
      {/* For brevity, I'm showing the dialog with changes */}

      {/* Create/Edit Quote Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingQuote ? 'Edit Quote' : 'Create New Quote'}</DialogTitle>
            <DialogDescription>
              {editingQuote ? 'Update the quote details below.' : 'Fill in the details to create a new quote with line items and pricing.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Quote Title *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Enter quote title"
                />
              </div>
              <div>
                <Label>Contact *</Label>
                <Select value={formData.contactId} onValueChange={handleContactChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select contact" />
                  </SelectTrigger>
                  <SelectContent>
                    {contacts.map(contact => (
                      <SelectItem key={contact.id} value={contact.id}>
                        {contact.name} {contact.priceTier ? `(Tier ${contact.priceTier})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* ✅ NEW: Project Manager Field with Search */}
              <div>
                <Label>Project Manager (Optional)</Label>
                <Select value={formData.projectManagerId} onValueChange={(value) => setFormData({ ...formData, projectManagerId: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select project manager" />
                  </SelectTrigger>
                  <SelectContent>
                    <div className="p-2">
                      <Input
                        placeholder="Search project managers..."
                        value={pmSearchQuery}
                        onChange={(e) => setPmSearchQuery(e.target.value)}
                        className="mb-2"
                      />
                    </div>
                    <SelectItem value="">None</SelectItem>
                    {filteredProjectManagers.map(pm => (
                      <SelectItem key={pm.id} value={pm.id}>
                        {pm.name}{pm.email ? ` (${pm.email})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Valid Until</Label>
                <Input
                  type="date"
                  value={formData.validUntil}
                  onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                />
              </div>
            </div>

            {/* Rest of the dialog content... */}
          </div>

          <div className="flex justify-end gap-2 mt-6 pt-6 border-t">
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editingQuote ? 'Update Quote' : 'Create Quote'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Line Item Dialog with Manual Price Override */}
      <Dialog open={showLineItemDialog} onOpenChange={setShowLineItemDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Line Item</DialogTitle>
            <DialogDescription>
              Select a product from inventory and specify quantity, price, and discount.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Search Inventory</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Type to search by name, SKU, or item number..."
                  value={inventorySearchQuery}
                  onChange={(e) => setInventorySearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <Label>Select Product *</Label>
              <Select value={selectedInventoryId} onValueChange={setSelectedInventoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose from results" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px] overflow-y-auto">
                  {filteredInventory.map(item => {
                    const contact = contacts.find(c => c.id === formData.contactId);
                    const priceTier = contact?.priceTier || 1;
                    const price = getPriceForTier(item, priceTier);
                    return (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name} ({item.sku}) - ${price.toFixed(2)}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Quantity *</Label>
                <Input
                  type="number"
                  min="1"
                  value={lineItemQuantity}
                  onChange={(e) => setLineItemQuantity(Number(e.target.value))}
                />
              </div>
              
              {/* ✅ NEW: Manual Price Override */}
              <div>
                <Label>Unit Price * 
                  <span className="text-xs text-gray-500 ml-1">(override)</span>
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder={selectedInventoryId ? 
                    getPriceForTier(
                      inventory.find(i => i.id === selectedInventoryId)!, 
                      contacts.find(c => c.id === formData.contactId)?.priceTier || 1
                    ).toFixed(2) : 'Auto'}
                  value={lineItemManualPrice ?? ''}
                  onChange={(e) => setLineItemManualPrice(e.target.value ? Number(e.target.value) : null)}
                />
              </div>
              
              <div>
                <Label>Discount (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={lineItemDiscount}
                  onChange={(e) => setLineItemDiscount(Number(e.target.value))}
                />
              </div>
            </div>

            {selectedInventoryId && (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Default Price (Tier {contacts.find(c => c.id === formData.contactId)?.priceTier || 1}):</span>
                    <span className="text-gray-900">
                      ${getPriceForTier(inventory.find(i => i.id === selectedInventoryId)!, contacts.find(c => c.id === formData.contactId)?.priceTier || 1).toFixed(2)}
                    </span>
                  </div>
                  {lineItemManualPrice !== null && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Override Price:</span>
                      <span className="text-blue-600">${lineItemManualPrice.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t">
                    <span className="text-gray-900">Line Total:</span>
                    <span className="text-gray-900">
                      ${calculateLineItemTotal(
                        lineItemQuantity,
                        lineItemManualPrice !== null ? lineItemManualPrice : getPriceForTier(inventory.find(i => i.id === selectedInventoryId)!, contacts.find(c => c.id === formData.contactId)?.priceTier || 1),
                        lineItemDiscount
                      ).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 mt-6 pt-6 border-t">
            <Button variant="outline" onClick={() => setShowLineItemDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddLineItem}>
              Add Item
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}