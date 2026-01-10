import { useState, useEffect, useMemo } from 'react';
import { quotesAPI, bidsAPI, contactsAPI, inventoryAPI, projectManagersAPI, settingsAPI } from '../utils/api';
import type { User } from '../App';
import { getGlobalTaxRate, getGlobalTaxRate2, getDefaultQuoteTerms, priceLevelToTier } from '../lib/global-settings';
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
import { advancedSearch } from '../utils/advanced-search';
import { EmailQuoteDialog } from './EmailQuoteDialog';

interface LineItem {
  id: string;
  itemId: string;
  itemName: string;
  sku: string;
  description: string;
  quantity: number;
  unitPrice: number;
  cost: number;
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
  priceTier: number;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
  validUntil: string;
  lineItems: LineItem[];
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  taxPercent: number;
  taxPercent2?: number;
  taxAmount: number;
  taxAmount2?: number;
  total: number;
  notes?: string;
  terms?: string;
  createdAt: string;
  updatedAt: string;
  ownerId: string;
  readAt?: string;
}

interface BidsProps {
  user: User;
}

interface Contact {
  id: string;
  name: string;
  email?: string;
  priceLevel?: string; // Named price level like 'Retail', 'Wholesale', etc.
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

  // Email Dialog State
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [emailQuote, setEmailQuote] = useState<Quote | null>(null);
  const [sentQuotes, setSentQuotes] = useState<Set<string>>(new Set());

  // Organization settings
  const [orgSettings, setOrgSettings] = useState<{
    taxRate: number;
    taxRate2: number;
    quoteTerms: string;
  }>({
    taxRate: 0,
    taxRate2: 0,
    quoteTerms: 'Payment due within 30 days. All prices in USD.',
  });

  // ⚡ Performance: Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    contactId: '',
    validUntil: '',
    discountPercent: 0,
    taxPercent: getGlobalTaxRate(),
    taxPercent2: getGlobalTaxRate2(),
    notes: '',
    terms: getDefaultQuoteTerms(),
  });

  const [currentLineItems, setCurrentLineItems] = useState<LineItem[]>([]);
  const [selectedInventoryId, setSelectedInventoryId] = useState('');
  const [lineItemQuantity, setLineItemQuantity] = useState(1);
  const [lineItemDiscount, setLineItemDiscount] = useState(0);
  const [lineItemUnitPrice, setLineItemUnitPrice] = useState(0);
  
  // Inventory search state for Add Line Item dialog
  const [inventorySearchQuery, setInventorySearchQuery] = useState('');
  const [isSearchingInventory, setIsSearchingInventory] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  // 🚀 Debounce search query (200ms delay for fast typing)
  const debouncedInventorySearch = useDebounce(inventorySearchQuery, 200);

  // 🌟 Advanced inventory search with fuzzy matching, plurals, and semantic understanding
  const filteredInventory = useMemo(() => {
    if (!debouncedInventorySearch.trim()) {
      // Show all active inventory items when search is empty
      return inventory.filter((item: InventoryItem) => item.status === 'active').slice(0, 100);
    }

    // 🚀 Use advanced search with fuzzy matching, plural handling (hammer/hammers), and semantic search
    const searchResults = advancedSearch(inventory, debouncedInventorySearch, {
      fuzzyThreshold: 0.6,      // Optimal for typo tolerance
      includeInactive: false,   // Only show active items
      minScore: 0.05,           // Low threshold to catch fuzzy matches
      maxResults: 100,          // Limit results
      sortBy: 'relevance',      // Sort by best match
    });
    
    return searchResults.map(result => result.item);
  }, [debouncedInventorySearch, inventory]);

  // Initialize when dialog opens
  useEffect(() => {
    if (showLineItemDialog) {
      setInventorySearchQuery('');
    }
  }, [showLineItemDialog]);

  // Auto-populate unit price when inventory item is selected
  useEffect(() => {
    if (selectedInventoryId && formData.contactId) {
      const item = inventory.find(i => i.id === selectedInventoryId);
      const contact = contacts.find(c => c.id === formData.contactId);
      if (item && contact) {
        const priceTier = priceLevelToTier(contact.priceLevel || 'Retail');
        const price = getPriceForTier(item, priceTier);
        setLineItemUnitPrice(price);
      }
    }
  }, [selectedInventoryId, formData.contactId, inventory, contacts]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      // ⚡ Performance: Load only essential data first (quotes, bids, contacts)
      // Inventory and project managers will be loaded when needed (when adding/editing)
      const [quotesData, bidsData, contactsData, orgSettingsData, trackingData] = await Promise.all([
        quotesAPI.getAll(),
        bidsAPI.getAll(), // Also load from bids table
        contactsAPI.getAll(),
        settingsAPI.getOrganizationSettings(user.organizationId),
        quotesAPI.getTrackingStatus(),
      ]);

      // Load organization settings
      if (orgSettingsData) {
        setOrgSettings({
          taxRate: orgSettingsData.tax_rate || 0,
          taxRate2: orgSettingsData.tax_rate_2 || 0,
          quoteTerms: orgSettingsData.quote_terms || 'Payment due within 30 days. All prices in USD.',
        });
      }

      // Parse quotes if they have stringified lineItems
      const parsedQuotes = (quotesData.quotes || []).map((q: any) => {
        // Handle both line_items (snake_case from DB) and lineItems (camelCase)
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

        const tracking = trackingData?.trackingStatus?.[q.id];

        return {
          ...q,
          lineItems: parsedLineItems,
          subtotal: q.subtotal ?? q.amount ?? 0,
          discountPercent: q.discountPercent ?? q.discount_percent ?? 0,
          discountAmount: q.discountAmount ?? q.discount_amount ?? 0,
          taxPercent: q.taxPercent ?? q.tax_percent ?? q.tax_rate ?? 0,
          taxPercent2: q.taxPercent2 ?? q.tax_percent_2 ?? 0,
          taxAmount: q.taxAmount ?? q.tax_amount ?? 0,
          taxAmount2: q.taxAmount2 ?? q.tax_amount_2 ?? 0,
          total: q.total ?? q.amount ?? 0,
          contactId: q.contactId ?? q.contact_id,
          contactName: q.contactName ?? q.contact_name ?? '',
          contactEmail: q.contactEmail ?? q.contact_email ?? '',
          quoteNumber: q.quoteNumber ?? q.quote_number ?? '',
          validUntil: q.validUntil ?? q.valid_until ?? '',
          priceTier: q.priceTier ?? q.price_tier ?? 1,
          createdAt: q.createdAt ?? q.created_at,
          updatedAt: q.updatedAt ?? q.updated_at,
          readAt: tracking?.readAt || q.readAt || q.read_at,
        };
      });

      // Parse bids from bids table (same structure as quotes)
      const parsedBids = (bidsData.bids || []).map((b: any) => {
        const rawLineItems = b.lineItems || b.line_items || b.items || b.line_item_data || b.bid_items;
        let parsedLineItems = [];
        
        try {
          if (typeof rawLineItems === 'string') {
            parsedLineItems = JSON.parse(rawLineItems);
          } else if (Array.isArray(rawLineItems)) {
            parsedLineItems = rawLineItems;
          }
        } catch (error) {
          console.error('Failed to parse line items for bid:', b.id, error);
          parsedLineItems = [];
        }

        // Convert bid to quote format so it displays consistently
        return {
          ...b,
          lineItems: parsedLineItems,
          title: b.title || '',
          subtotal: b.subtotal ?? b.amount ?? 0,
          discountPercent: b.discountPercent ?? b.discount_percent ?? 0,
          discountAmount: b.discountAmount ?? b.discount_amount ?? 0,
          taxPercent: b.taxPercent ?? b.tax_percent ?? b.tax_rate ?? 0,
          taxPercent2: b.taxPercent2 ?? b.tax_percent_2 ?? 0,
          taxAmount: b.taxAmount ?? b.tax_amount ?? 0,
          taxAmount2: b.taxAmount2 ?? b.tax_amount_2 ?? 0,
          total: b.total ?? b.amount ?? 0,
          contactId: b.contactId ?? b.contact_id ?? b.opportunity_id,
          contactName: b.contactName ?? b.contact_name ?? '',
          contactEmail: b.contactEmail ?? b.contact_email ?? '',
          quoteNumber: b.quoteNumber ?? b.quote_number ?? b.id?.substring(0, 8) ?? '',
          validUntil: b.validUntil ?? b.valid_until ?? new Date(Date.now() + 30*24*60*60*1000).toISOString(),
          priceTier: b.priceTier ?? b.price_tier ?? 1,
          status: b.status ?? 'draft',
          createdAt: b.createdAt ?? b.created_at,
          updatedAt: b.updatedAt ?? b.updated_at,
          readAt: b.readAt ?? b.read_at,
          _source: 'bids', // Tag to identify source table
        };
      });

      // Merge quotes and bids, sort by creation date
      const allQuotes = [...parsedQuotes, ...parsedBids].sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setQuotes(allQuotes);
      setContacts(contactsData.contacts || []);
      
      // ⚡ Performance: Load inventory and project managers in background (non-blocking)
      loadInventoryAndManagers();
    } catch (error) {
      console.error('Failed to load data:', error);
      showAlert('error', 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };
  
  // ⚡ Performance: Separate function to load inventory and project managers
  const loadInventoryAndManagers = async () => {
    try {
      const [inventoryData, projectManagersData] = await Promise.all([
        inventoryAPI.getAll(),
        projectManagersAPI.getAll(),
      ]);
      
      setInventory((inventoryData.items || []).filter((item: InventoryItem) => item.status === 'active'));
      setProjectManagers(projectManagersData.projectManagers || []);
    } catch (error) {
      console.error('Failed to load inventory/managers:', error);
      // Don't show error alert - this is background loading
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

  const calculateQuoteTotals = (lineItems: LineItem[], discountPercent: number, taxPercent: number, taxPercent2: number = 0) => {
    const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0);
    const discountAmount = subtotal * (discountPercent / 100);
    const afterDiscount = subtotal - discountAmount;
    const taxAmount = afterDiscount * (taxPercent / 100);
    const taxAmount2 = afterDiscount * (taxPercent2 / 100);
    const total = afterDiscount + taxAmount + taxAmount2;

    return {
      subtotal,
      discountAmount,
      taxAmount,
      taxAmount2,
      total,
    };
  };

  const handleOpenDialog = (quote?: Quote) => {
    if (quote) {
      setEditingQuote(quote);
      setFormData({
        title: quote.title,
        contactId: quote.contactId,
        validUntil: quote.validUntil,
        discountPercent: quote.discountPercent,
        // Use quote's tax rates if they exist (> 0), otherwise use org defaults
        taxPercent: quote.taxPercent > 0 ? quote.taxPercent : orgSettings.taxRate,
        taxPercent2: (quote.taxPercent2 && quote.taxPercent2 > 0) ? quote.taxPercent2 : orgSettings.taxRate2,
        notes: quote.notes || '',
        // Use quote's terms if they exist, otherwise use org defaults
        terms: quote.terms || orgSettings.quoteTerms,
      });
      // Ensure line items have cost field and valid total
      const lineItemsWithCost = quote.lineItems.map(item => {
        // Calculate what the total *should* be
        const calculatedTotal = item.quantity * item.unitPrice * (1 - (item.discount || 0) / 100);
        
        // If the stored total is 0 but we have valid quantity and price, use the calculated total
        // This fixes the issue where imported bids might have 0 total
        const shouldUseCalculated = item.total === 0 && calculatedTotal > 0;
        
        return {
          ...item,
          cost: item.cost ?? 0,
          total: shouldUseCalculated ? calculatedTotal : (item.total ?? calculatedTotal)
        };
      });
      setCurrentLineItems(lineItemsWithCost);
    } else {
      setEditingQuote(null);
      const defaultDate = new Date();
      defaultDate.setDate(defaultDate.getDate() + 30);
      setFormData({
        title: '',
        contactId: '',
        validUntil: defaultDate.toISOString().split('T')[0],
        discountPercent: 0,
        taxPercent: orgSettings.taxRate,
        taxPercent2: orgSettings.taxRate2,
        notes: '',
        terms: orgSettings.quoteTerms,
      });
      setCurrentLineItems([]);
    }
    setShowDialog(true);
  };

  const handleContactChange = (contactId: string) => {
    // If there are existing line items and contact is changing, recalculate prices
    if (currentLineItems.length > 0 && formData.contactId && formData.contactId !== contactId) {
      if (confirm('Changing the contact will recalculate all line item prices based on the new price level. Continue?')) {
        const newContact = contacts.find(c => c.id === contactId);
        const newPriceTier = priceLevelToTier(newContact?.priceLevel || 'Retail');
        
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

    // Use the custom unit price (already set via useEffect or manually edited)
    const total = lineItemQuantity * lineItemUnitPrice;

    const lineItem: LineItem = {
      id: `line-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      itemId: item.id,
      itemName: item.name,
      sku: item.sku,
      description: item.description,
      quantity: lineItemQuantity,
      unitPrice: lineItemUnitPrice, // Use editable unit price
      cost: item.cost || 0,
      discount: 0, // Keep for backwards compatibility but not used
      total,
    };

    setCurrentLineItems([...currentLineItems, lineItem]);
    setSelectedInventoryId('');
    setLineItemQuantity(1);
    setLineItemUnitPrice(0);
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
      const totals = calculateQuoteTotals(
        currentLineItems,
        formData.discountPercent,
        formData.taxPercent,
        formData.taxPercent2 || 0
      );

      // Map to snake_case for database
      const quoteData = {
        quote_number: editingQuote?.quoteNumber || generateQuoteNumber(),
        title: formData.title,
        contact_id: formData.contactId,
        contact_name: contact?.name || '',
        price_tier: priceLevelToTier(contact?.priceLevel || 'Retail'),
        status: editingQuote?.status || 'draft',
        valid_until: formData.validUntil,
        line_items: JSON.stringify(currentLineItems),
        subtotal: totals.subtotal,
        discount_percent: formData.discountPercent,
        discount_amount: totals.discountAmount,
        tax_percent: formData.taxPercent,
        tax_percent_2: formData.taxPercent2 || 0,
        tax_amount: totals.taxAmount,
        tax_amount_2: totals.taxAmount2 || 0,
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
      await quotesAPI.update(quote.id, { ...quote, status: newStatus });
      showAlert('success', 'Quote status updated');
      loadData();
    } catch (error) {
      console.error('Failed to update status:', error);
      showAlert('error', 'Failed to update status');
    }
  };

  const handleEmailQuote = (quote: Quote) => {
    // If quote doesn't have email, try to find it from contacts list
    let quoteToEmail = { ...quote };
    if (!quoteToEmail.contactEmail && quoteToEmail.contactId) {
      const contact = contacts.find(c => c.id === quoteToEmail.contactId);
      if (contact && contact.email) {
        quoteToEmail.contactEmail = contact.email;
      }
    }
    
    setEmailQuote(quoteToEmail);
    setShowEmailDialog(true);
  };

  const handleEmailSuccess = async () => {
    if (emailQuote) {
      setSentQuotes(prev => new Set(prev).add(emailQuote.id));
      
      // Update quote status to 'sent' if it's currently 'draft'
      if (emailQuote.status === 'draft') {
        try {
          await quotesAPI.update(emailQuote.id, { ...emailQuote, status: 'sent' });
          loadData(); // Reload to reflect status change
        } catch (error) {
          console.error('Failed to update quote status after sending email:', error);
        }
      }
    }
  };

  const handlePreview = (quote: Quote) => {
    setPreviewQuote(quote);
    setShowPreviewDialog(true);
  };

  // ⚡ Performance: Memoize filtered quotes to avoid re-filtering on every render
  const filteredQuotes = useMemo(() => {
    return quotes.filter(quote => {
      const matchesSearch =
        quote.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        quote.contactName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        quote.quoteNumber.toLowerCase().includes(searchQuery.toLowerCase());

      const effectiveStatus = (quote.status === 'sent' && quote.readAt) ? 'viewed' : (quote.status || '');
      const status = effectiveStatus.toLowerCase();
      const matchesStatus = statusFilter === 'all' || 
                            (statusFilter === 'open' && status !== 'accepted' && status !== 'rejected' && status !== 'won' && status !== 'lost') ||
                            status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [quotes, searchQuery, statusFilter]);

  // ⚡ Performance: Paginate filtered quotes - only render current page
  const paginatedQuotes = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredQuotes.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredQuotes, currentPage, itemsPerPage]);

  // Calculate total pages
  const totalPages = Math.ceil(filteredQuotes.length / itemsPerPage);

  // Reset to page 1 when search query or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted': return 'bg-green-100 text-green-700 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-700 border-red-200';
      case 'sent': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'viewed': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
      case 'expired': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'draft': return 'bg-gray-100 text-gray-700 border-gray-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  // Calculate stats with detailed logging
  const openBidsDetails: any[] = [];
  const stats = {
    total: quotes.length,
    totalValue: quotes.reduce((sum, q) => sum + q.total, 0),
    acceptedValue: quotes.filter(q => q.status === 'accepted').reduce((sum, q) => sum + q.total, 0),
    pending: quotes.filter(q => q.status === 'sent').length,
    open: quotes.filter(q => {
      const status = (q.status || '').toLowerCase().trim();
      const isOpen = status !== 'accepted' && status !== 'rejected' && status !== 'won' && status !== 'lost';
      if (isOpen) {
        openBidsDetails.push({ id: q.id, title: q.title, status: q.status, normalizedStatus: status });
      }
      return isOpen;
    }).length,
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center justify-end gap-3">
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Create Quote
          </Button>
        </div>
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

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Quotes</p>
                <p className="text-2xl text-gray-900 mt-1">{stats.total}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Value</p>
                <p className="text-2xl text-gray-900 mt-1">${stats.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Accepted Value</p>
                <p className="text-2xl text-gray-900 mt-1">${stats.acceptedValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
              </div>
              <DollarSign className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Open Quotes</p>
                <p className="text-2xl text-gray-900 mt-1">{stats.open}</p>
              </div>
              <Send className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search quotes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="open">Open (Not Accepted/Rejected)</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="viewed">Viewed</SelectItem>
                <SelectItem value="accepted">Accepted</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Quotes List */}
      <div className="grid grid-cols-1 gap-4">
        {isLoading ? (
          <Card>
            <CardContent className="py-12 text-center text-gray-500">
              Loading quotes...
            </CardContent>
          </Card>
        ) : filteredQuotes.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500">No quotes found</p>
              <Button className="mt-4" onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Quote
              </Button>
            </CardContent>
          </Card>
        ) : (
          paginatedQuotes.map(quote => (
            <Card key={quote.id}>
              <CardContent className="pt-6">
                <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                  {/* Left Section */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg text-gray-900">{quote.title}</h3>
                          {(() => {
                            const displayStatus = (quote.status === 'sent' && quote.readAt) ? 'viewed' : quote.status;
                            return (
                              <Badge variant="outline" className={getStatusColor(displayStatus)}>
                                {displayStatus}
                              </Badge>
                            );
                          })()}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">Quote #{quote.quoteNumber}</p>
                        <p className="text-sm text-gray-600">Contact: {quote.contactName}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => handleEmailQuote(quote)}
                          className="gap-2"
                        >
                          <Send className="h-4 w-4" />
                          {quote.status === 'sent' || sentQuotes.has(quote.id) ? 'Resend Quote' : 'Send Quote'}
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handlePreview(quote)}>
                            <Eye className="h-4 w-4 mr-2" />
                            Preview
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleOpenDialog(quote)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            setStatusQuote(quote);
                            setNewStatus(quote.status);
                            setShowStatusDialog(true);
                          }}>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Change Status
                          </DropdownMenuItem>
                          {quote.status === 'draft' && (
                            <DropdownMenuItem onClick={() => handleStatusChange(quote, 'sent')}>
                              <Send className="h-4 w-4 mr-2" />
                              Mark as Sent
                            </DropdownMenuItem>
                          )}
                          {quote.status === 'sent' && (
                            <>
                              <DropdownMenuItem onClick={() => handleStatusChange(quote, 'accepted')}>
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                Mark as Accepted
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleStatusChange(quote, 'rejected')}>
                                <X className="h-4 w-4 mr-2" />
                                Mark as Rejected
                              </DropdownMenuItem>
                            </>
                          )}
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => handleDelete(quote.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
                      <div>
                        <p className="text-xs text-gray-500">Line Items</p>
                        <p className="text-sm text-gray-900 mt-1">{quote.lineItems.length} items</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Price Tier</p>
                        <p className="text-sm text-gray-900 mt-1">Tier {quote.priceTier}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Valid Until</p>
                        <p className="text-sm text-gray-900 mt-1">
                          {new Date(quote.validUntil).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Created</p>
                        <p className="text-sm text-gray-900 mt-1">
                          {new Date(quote.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Right Section - Totals */}
                  <div className="lg:w-64 border-l-0 lg:border-l lg:pl-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Subtotal:</span>
                        <span className="text-gray-900">${quote.subtotal.toFixed(2)}</span>
                      </div>
                      {quote.discountAmount > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Discount ({quote.discountPercent}%):</span>
                          <span className="text-red-600">-${quote.discountAmount.toFixed(2)}</span>
                        </div>
                      )}
                      {quote.taxAmount > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Tax 1 ({quote.taxPercent}%):</span>
                          <span className="text-gray-900">${quote.taxAmount.toFixed(2)}</span>
                        </div>
                      )}
                      {(quote.taxAmount2 || 0) > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Tax 2 ({quote.taxPercent2}%):</span>
                          <span className="text-gray-900">${(quote.taxAmount2 || 0).toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between pt-2 border-t">
                        <span className="text-gray-900">Total:</span>
                        <span className="text-lg text-gray-900">${quote.total.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(currentPage - 1)}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <div className="mx-2">
            Page {currentPage} of {totalPages}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      )}

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
                        {contact.name} {contact.priceLevel ? `(${contact.priceLevel})` : ''}
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
              <div>
                <Label>Selected Contact Price Level</Label>
                <Input
                  value={formData.contactId ? (contacts.find(c => c.id === formData.contactId)?.priceLevel || 'Retail') : 'Select a contact'}
                  disabled
                  className="bg-gray-50"
                />
              </div>
            </div>

            {/* Line Items */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm text-gray-900">Line Items</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowLineItemDialog(true)}
                  disabled={!formData.contactId}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </div>

              {currentLineItems.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <ShoppingCart className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm text-gray-500">No items added yet</p>
                  {!formData.contactId && (
                    <p className="text-xs text-gray-400 mt-1">Select a contact first</p>
                  )}
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left py-2 px-4 text-xs text-gray-600">Item</th>
                        <th className="text-right py-2 px-4 text-xs text-gray-600">Cost</th>
                        <th className="text-right py-2 px-4 text-xs text-gray-600">Qty</th>
                        <th className="text-right py-2 px-4 text-xs text-gray-600">Unit Price</th>
                        <th className="text-right py-2 px-4 text-xs text-gray-600">Total</th>
                        <th className="w-12"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentLineItems.map(item => {
                        // Find current cost from inventory table
                        const inventoryItem = inventory.find(inv => inv.id === item.itemId);
                        const currentCost = inventoryItem?.cost ?? item.cost ?? 0;
                        return (
                          <tr key={item.id} className="border-t">
                            <td className="py-2 px-4">
                              <p className="text-sm text-gray-900">{item.itemName}</p>
                              <p className="text-xs text-gray-500">SKU: {item.sku}</p>
                            </td>
                            <td className="py-2 px-4 text-right text-sm">
                              ${currentCost.toFixed(2)}
                              {!inventoryItem && (
                                <span className="block text-xs text-red-500">Item not in inventory</span>
                              )}
                            </td>
                            <td className="py-2 px-4 text-right text-sm">{item.quantity}</td>
                            <td className="py-2 px-4 text-right text-sm">${(item.unitPrice ?? 0).toFixed(2)}</td>
                            <td className="py-2 px-4 text-right text-sm">${(item.total ?? 0).toFixed(2)}</td>
                            <td className="py-2 px-4">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveLineItem(item.id)}
                              >
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Pricing */}
            {currentLineItems.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-sm text-gray-900">Pricing</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Quote Discount (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.discountPercent}
                      onChange={(e) => setFormData({ ...formData, discountPercent: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label>Tax Rate 1 (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.taxPercent}
                      onChange={(e) => setFormData({ ...formData, taxPercent: Number(e.target.value) })}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Primary tax rate
                    </p>
                  </div>
                  <div>
                    <Label>Tax Rate 2 (%) - Optional</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.taxPercent2 || 0}
                      onChange={(e) => setFormData({ ...formData, taxPercent2: Number(e.target.value) })}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Secondary tax rate
                    </p>
                  </div>
                </div>

                {/* Quote Summary */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Subtotal:</span>
                      <span className="text-gray-900">
                        ${calculateQuoteTotals(currentLineItems, formData.discountPercent, formData.taxPercent, formData.taxPercent2 || 0).subtotal.toFixed(2)}
                      </span>
                    </div>
                    {formData.discountPercent > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Discount ({formData.discountPercent}%):</span>
                        <span className="text-red-600">
                          -${calculateQuoteTotals(currentLineItems, formData.discountPercent, formData.taxPercent, formData.taxPercent2 || 0).discountAmount.toFixed(2)}
                        </span>
                      </div>
                    )}
                    {formData.taxPercent > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Tax 1 ({formData.taxPercent}%):</span>
                        <span className="text-gray-900">
                          ${calculateQuoteTotals(currentLineItems, formData.discountPercent, formData.taxPercent, formData.taxPercent2 || 0).taxAmount.toFixed(2)}
                        </span>
                      </div>
                    )}
                    {(formData.taxPercent2 || 0) > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Tax 2 ({formData.taxPercent2}%):</span>
                        <span className="text-gray-900">
                          ${calculateQuoteTotals(currentLineItems, formData.discountPercent, formData.taxPercent, formData.taxPercent2 || 0).taxAmount2?.toFixed(2) || '0.00'}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between pt-2 border-t border-gray-300">
                      <span className="text-gray-900">Total:</span>
                      <span className="text-xl text-gray-900">
                        ${calculateQuoteTotals(currentLineItems, formData.discountPercent, formData.taxPercent, formData.taxPercent2 || 0).total.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Additional Information */}
            <div className="space-y-4">
              <div>
                <Label>Notes (Internal)</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Internal notes (not visible to client)"
                  rows={2}
                />
              </div>
              <div>
                <Label>Terms & Conditions</Label>
                <Textarea
                  value={formData.terms}
                  onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
                  placeholder="Payment terms and conditions"
                  rows={3}
                />
              </div>
            </div>
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

      {/* Add Line Item Dialog */}
      <Dialog open={showLineItemDialog} onOpenChange={setShowLineItemDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Line Item</DialogTitle>
            <DialogDescription>
              Select a product from inventory and specify quantity and price.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Search Inventory</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Try: 'Hammers under $40', 'Screws', 'Paint red'..."
                  value={inventorySearchQuery}
                  onChange={(e) => setInventorySearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              {isSearchingInventory && (
                <p className="text-xs text-gray-500 mt-1">Searching...</p>
              )}
              {filteredInventory.length === 0 && inventorySearchQuery && !isSearchingInventory && (
                <p className="text-xs text-red-600 mt-1">No items found. Try a different search.</p>
              )}
              {!inventorySearchQuery && (
                <p className="text-xs text-gray-500 mt-1">💡 Supports natural language: plurals, typos, and price filters (e.g., "under $40")</p>
              )}
            </div>

            <div>
              <Label>Select Product *</Label>
              <Select value={selectedInventoryId} onValueChange={setSelectedInventoryId}>
                <SelectTrigger>
                  <SelectValue placeholder={filteredInventory.length > 0 ? "Choose from results below" : "Search above to find products"} />
                </SelectTrigger>
                <SelectContent className="max-h-[300px] overflow-y-auto">
                  {filteredInventory.length > 0 ? (
                    filteredInventory.map(item => {
                      const contact = contacts.find(c => c.id === formData.contactId);
                      const priceTier = priceLevelToTier(contact?.priceLevel || 'Retail');
                      const price = getPriceForTier(item, priceTier);
                      return (
                        <SelectItem key={item.id} value={item.id}>
                          <div className="flex items-center justify-between gap-4 w-full">
                            <div>
                              <span className="font-medium">{item.name}</span>
                              <span className="text-xs text-gray-500 ml-2">({item.sku})</span>
                            </div>
                            <span className="text-sm text-gray-600">${price.toFixed(2)}</span>
                          </div>
                        </SelectItem>
                      );
                    })
                  ) : (
                    <SelectItem value="no-items" disabled>
                      {inventorySearchQuery ? 'No items found' : 'Type above to search'}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              {selectedInventoryId && (
                <div className="mt-2 p-3 bg-blue-50 rounded text-xs text-blue-700">
                  {inventory.find(i => i.id === selectedInventoryId)?.description}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Unit Price *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={lineItemUnitPrice}
                  onChange={(e) => setLineItemUnitPrice(Number(e.target.value))}
                />
                {selectedInventoryId && (() => {
                  const contact = contacts.find(c => c.id === formData.contactId);
                  const priceLevel = contact?.priceLevel || 'Retail';
                  const priceTier = priceLevelToTier(priceLevel);
                  return (
                    <p className="text-xs text-gray-500 mt-1">
                      {priceLevel} default: $
                      {getPriceForTier(inventory.find(i => i.id === selectedInventoryId)!, priceTier).toFixed(2)}
                    </p>
                  );
                })()}
              </div>
              <div>
                <Label>Quantity *</Label>
                <Input
                  type="number"
                  min="1"
                  value={lineItemQuantity}
                  onChange={(e) => setLineItemQuantity(Number(e.target.value))}
                />
              </div>
            </div>

            {selectedInventoryId && lineItemUnitPrice > 0 && (() => {
              const selectedItem = inventory.find(i => i.id === selectedInventoryId);
              return (
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Cost:</span>
                      <span className="text-gray-900">${(selectedItem?.cost || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Unit Price:</span>
                      <span className="text-gray-900">${lineItemUnitPrice.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Quantity:</span>
                      <span className="text-gray-900">{lineItemQuantity}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t">
                      <span className="text-gray-900">Line Total:</span>
                      <span className="text-gray-900">
                        ${(lineItemQuantity * lineItemUnitPrice).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}
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

      {/* Preview Quote Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Quote Preview</DialogTitle>
            <DialogDescription>
              Preview how the quote will look before sending it to the client.
            </DialogDescription>
          </DialogHeader>

          {previewQuote && (
            <div className="space-y-6 p-6 bg-white">
              {/* Header */}
              <div className="flex justify-between items-start border-b pb-4">
                <div>
                  <h2 className="text-2xl text-gray-900">QUOTATION</h2>
                  <p className="text-sm text-gray-600 mt-1">Quote #{previewQuote.quoteNumber}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Date: {new Date(previewQuote.createdAt).toLocaleDateString()}</p>
                  <p className="text-sm text-gray-600">Valid Until: {new Date(previewQuote.validUntil).toLocaleDateString()}</p>
                </div>
              </div>

              {/* Contact Info */}
              <div>
                <h3 className="text-sm text-gray-600 mb-2">Quote For:</h3>
                <p className="text-gray-900">{previewQuote.contactName}</p>
                {previewQuote.contactEmail && (
                  <p className="text-sm text-gray-600">{previewQuote.contactEmail}</p>
                )}
              </div>

              {/* Title */}
              <div>
                <h3 className="text-lg text-gray-900">{previewQuote.title}</h3>
              </div>

              {/* Line Items */}
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="text-left py-3 px-4 text-sm text-gray-700">Item</th>
                      <th className="text-right py-3 px-4 text-sm text-gray-700">Qty</th>
                      <th className="text-right py-3 px-4 text-sm text-gray-700">Unit Price</th>
                      <th className="text-right py-3 px-4 text-sm text-gray-700">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewQuote.lineItems.map(item => (
                      <tr key={item.id} className="border-t">
                        <td className="py-3 px-4">
                          <p className="text-sm text-gray-900">{item.itemName}</p>
                          <p className="text-xs text-gray-500">{item.description}</p>
                        </td>
                        <td className="py-3 px-4 text-right text-sm">{item.quantity}</td>
                        <td className="py-3 px-4 text-right text-sm">${item.unitPrice.toFixed(2)}</td>
                        <td className="py-3 px-4 text-right text-sm">${item.total.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="flex justify-end">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="text-gray-900">${previewQuote.subtotal.toFixed(2)}</span>
                  </div>
                  {previewQuote.discountAmount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Discount ({previewQuote.discountPercent}%):</span>
                      <span className="text-red-600">-${previewQuote.discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  {previewQuote.taxAmount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Tax 1 ({previewQuote.taxPercent}%):</span>
                      <span className="text-gray-900">${previewQuote.taxAmount.toFixed(2)}</span>
                    </div>
                  )}
                  {(previewQuote.taxAmount2 || 0) > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Tax 2 ({previewQuote.taxPercent2}%):</span>
                      <span className="text-gray-900">${(previewQuote.taxAmount2 || 0).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t">
                    <span className="text-gray-900">Total:</span>
                    <span className="text-xl text-gray-900">${previewQuote.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Terms */}
              {previewQuote.terms && (
                <div className="pt-4 border-t">
                  <h3 className="text-sm text-gray-700 mb-2">Terms & Conditions:</h3>
                  <p className="text-sm text-gray-600 whitespace-pre-line">{previewQuote.terms}</p>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 mt-6 pt-6 border-t">
            <Button variant="outline" onClick={() => setShowPreviewDialog(false)}>
              Close
            </Button>
            <Button>
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Change Status Dialog */}
      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Change Quote Status</DialogTitle>
            <DialogDescription>
              Update the quote status to reflect its current state in your workflow.
            </DialogDescription>
          </DialogHeader>

          {statusQuote && (
            <div className="space-y-4">
              <div>
                <Label>Current Status</Label>
                <Input
                  value={statusQuote.status}
                  disabled
                  className="bg-gray-50"
                />
              </div>
              <div>
                <Label>New Status</Label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select new status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="accepted">Accepted</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 mt-6 pt-6 border-t">
            <Button variant="outline" onClick={() => setShowStatusDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              if (statusQuote) {
                handleStatusChange(statusQuote, newStatus);
                setShowStatusDialog(false);
              }
            }}>
              Update Status
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <EmailQuoteDialog
        open={showEmailDialog}
        onOpenChange={setShowEmailDialog}
        quote={emailQuote}
        onSuccess={handleEmailSuccess}
      />
    </div>
  );
}