import { useState, useEffect, useMemo } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Alert, AlertDescription } from './ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { getGlobalTaxRate, priceLevelToTier } from '../lib/global-settings';
import { useDebounce } from '../utils/useDebounce';
import { advancedSearch } from '../utils/advanced-search';
import { 
  ArrowLeft, 
  Edit, 
  Mail, 
  Phone, 
  Building, 
  DollarSign,
  Plus,
  Trash2,
  UserPlus,
  MapPin,
  Loader2,
  MoreVertical,
  AlertCircle,
  Target,
  Calendar,
  Eye,
  TrendingUp,
  FileText,
  Upload,
  Download,
  File,
  Receipt,
  ShoppingCart,
  Search
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { projectManagersAPI, opportunitiesAPI, bidsAPI, quotesAPI, inventoryAPI } from '../utils/api';
import type { User } from '../App';
import { canAdd, canChange, canDelete } from '../utils/permissions';
import { BidLineItems, LineItemsTable } from './BidLineItems';
import { ProjectManagersTableSetup } from './ProjectManagersTableSetup';
import { FixContactsTable } from './FixContactsTable';
import { 
  getAllDocumentsClient, 
  uploadDocumentClient, 
  deleteDocumentClient,
  downloadDocumentClient,
  type Document 
} from '../utils/documents-client';
import { toast } from 'sonner';

interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  status: string;
  priceLevel: 'Retail' | 'Wholesale' | 'Contractor' | 'Premium' | 'Standard';
  createdAt: string;
  legacyNumber?: string;
  accountOwnerNumber?: string;
  ptdSales?: number;
  ptdGpPercent?: number;
  ytdSales?: number;
  ytdGpPercent?: number;
  lyrSales?: number;
  lyrGpPercent?: number;
  address?: string;
  notes?: string;
}

interface ProjectManager {
  id: string;
  customerId: string;
  name: string;
  email: string;
  phone: string;
  mailingAddress: string;
  createdAt: string;
  updatedAt: string;
}

interface Opportunity {
  id: string;
  title: string;
  description: string;
  customerId: string;
  status: 'open' | 'in_progress' | 'won' | 'lost';
  value: number;
  expectedCloseDate: string;
  createdAt: string;
  updatedAt: string;
}

interface Bid {
  id: string;
  title: string;
  opportunity_id: string;
  amount: number;
  status: string;
  valid_until: string;
  notes?: string;
  created_at: string;
  project_managers?: { id: string; name: string };
  line_items?: string | LineItem[]; // Can be JSON string from DB or parsed array
  subtotal?: number;
  discount_percent?: number;
  discount_amount?: number;
  tax_percent?: number;
  tax_amount?: number;
  total?: number;
}

interface LineItem {
  id: string;
  itemId: string;
  itemName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  cost: number;
  discount: number;
  total: number;
}

interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  description: string;
  cost: number;
  priceTier1: number;
  price_tier_1: number;
}

interface ContactDetailProps {
  contact: Contact;
  user: User;
  onBack: () => void;
  onEdit: (contact: Contact) => void;
}

export function ContactDetail({ contact, user, onBack, onEdit }: ContactDetailProps) {
  const [projectManagers, setProjectManagers] = useState<ProjectManager[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingOpps, setIsLoadingOpps] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isAddPMDialogOpen, setIsAddPMDialogOpen] = useState(false);
  const [isEditPMDialogOpen, setIsEditPMDialogOpen] = useState(false);
  const [isAddOppDialogOpen, setIsAddOppDialogOpen] = useState(false);
  const [editingPM, setEditingPM] = useState<ProjectManager | null>(null);
  const [tableNotFound, setTableNotFound] = useState(false);
  const [newPM, setNewPM] = useState({
    name: '',
    email: '',
    phone: '',
    mailingAddress: '',
  });
  const [newOpp, setNewOpp] = useState({
    title: '',
    description: '',
    status: 'open' as 'open' | 'in_progress' | 'won' | 'lost',
    value: '',
    expectedCloseDate: '',
  });
  const [documents, setDocuments] = useState<Document[]>([]);
  
  // Bids management state
  const [isBidsDialogOpen, setIsBidsDialogOpen] = useState(false);
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null);
  const [bids, setBids] = useState<Bid[]>([]);
  const [isLoadingBids, setIsLoadingBids] = useState(false);
  const [isAddBidDialogOpen, setIsAddBidDialogOpen] = useState(false);
  const [isEditBidDialogOpen, setIsEditBidDialogOpen] = useState(false);
  const [editingBid, setEditingBid] = useState<Bid | null>(null);
  const [newBid, setNewBid] = useState({
    title: '',
    amount: '',
    status: 'draft',
    validUntil: '',
    notes: '',
    projectManagerId: '',
  });

  // Line items and inventory state
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [editingBidLineItems, setEditingBidLineItems] = useState<LineItem[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [isLineItemDialogOpen, setIsLineItemDialogOpen] = useState(false);
  const [isEditLineItemDialogOpen, setIsEditLineItemDialogOpen] = useState(false);
  const [bidSubtotal, setBidSubtotal] = useState('');
  const [bidTaxRate, setBidTaxRate] = useState(() => {
    const globalTaxRate = getGlobalTaxRate();
    return globalTaxRate.toString();
  });
  const [bidDiscountPercent, setBidDiscountPercent] = useState(0);
  
  // Inventory search for line items
  const [inventorySearchQuery, setInventorySearchQuery] = useState('');
  const [selectedInventoryId, setSelectedInventoryId] = useState('');
  const [lineItemQuantity, setLineItemQuantity] = useState(1);
  const [lineItemDiscount, setLineItemDiscount] = useState(0);
  const [lineItemUnitPrice, setLineItemUnitPrice] = useState(0);

  // 🚀 Debounce search query (200ms delay for fast typing)
  const debouncedInventorySearch = useDebounce(inventorySearchQuery, 200);

  // Filtered inventory for search - using advanced search
  const filteredInventory = useMemo(() => {
    if (!debouncedInventorySearch.trim()) {
      return inventoryItems.filter(item => item.status === 'active').slice(0, 100); // Show first 100 active items
    }
    
    // 🚀 Use advanced search with fuzzy matching, plural handling, and multi-word support
    const searchResults = advancedSearch(inventoryItems, debouncedInventorySearch, {
      fuzzyThreshold: 0.7,      // Allow small typos
      includeInactive: false,   // Only show active items
      minScore: 0.1,            // Lower threshold for more results
      maxResults: 100,
      sortBy: 'relevance',
    });
    
    return searchResults.map(result => result.item);
  }, [debouncedInventorySearch, inventoryItems]);

  // Auto-populate unit price when inventory item is selected
  useEffect(() => {
    if (selectedInventoryId && contact.priceLevel) {
      const item = inventoryItems.find(i => i.id === selectedInventoryId);
      if (item) {
        const priceTier = priceLevelToTier(contact.priceLevel || 'Retail');
        const price = getPriceForTier(item, priceTier);
        setLineItemUnitPrice(price);
      }
    }
  }, [selectedInventoryId, contact.priceLevel, inventoryItems]);

  // Check if contact has a valid UUID
  useEffect(() => {
    loadProjectManagers();
    loadOpportunities();
    loadDocuments();
    loadInventoryItems();
  }, [contact.id]);

  // Auto-calculate subtotal from line items
  useEffect(() => {
    const calculatedSubtotal = lineItems.reduce((sum, item) => sum + item.total, 0);
    setBidSubtotal(calculatedSubtotal.toFixed(2));
  }, [lineItems]);

  const loadProjectManagers = async () => {
    try {
      setIsLoading(true);
      setTableNotFound(false);
      const { projectManagers: pms } = await projectManagersAPI.getByCustomer(contact.id);
      setProjectManagers(pms || []);
    } catch (error: any) {
      console.error('Failed to load project managers:', error);
      // Check if it's a table not found error
      if (error?.code === 'PGRST205' || error?.code === '42P01' || 
          error?.message?.includes('Could not find the table')) {
        setTableNotFound(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const loadOpportunities = async () => {
    try {
      setIsLoadingOpps(true);
      const { opportunities: opps } = await opportunitiesAPI.getByCustomer(contact.id);
      setOpportunities(opps || []);
    } catch (error: any) {
      console.error('Failed to load opportunities:', error);
    } finally {
      setIsLoadingOpps(false);
    }
  };

  const loadDocuments = async () => {
    try {
      const { documents: docs } = await getAllDocumentsClient(contact.id);
      setDocuments(docs || []);
    } catch (error: any) {
      console.error('Failed to load documents:', error);
    }
  };

  const loadInventoryItems = async () => {
    try {
      const { items } = await inventoryAPI.getAll();
      // Map price_tier_1 to priceTier1 for compatibility
      const mappedItems = items.map((item: any) => ({
        ...item,
        priceTier1: item.price_tier_1 || item.priceTier1 || 0,
      }));
      setInventoryItems(mappedItems);
    } catch (error: any) {
      console.error('Failed to load inventory items:', error);
    }
  };

  const handleAddProjectManager = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const { projectManager } = await projectManagersAPI.create({
        ...newPM,
        customerId: contact.id,
      });
      setProjectManagers([...projectManagers, projectManager]);
      setNewPM({ name: '', email: '', phone: '', mailingAddress: '' });
      setIsAddPMDialogOpen(false);
    } catch (error) {
      console.error('Failed to create project manager:', error);
      alert('Failed to create project manager. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditProjectManager = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPM) return;
    setIsSaving(true);

    try {
      const { projectManager } = await projectManagersAPI.update(editingPM.id, {
        name: editingPM.name,
        email: editingPM.email,
        phone: editingPM.phone,
        mailingAddress: editingPM.mailingAddress,
      });
      setProjectManagers(projectManagers.map(pm => (pm.id === projectManager.id ? projectManager : pm)));
      setEditingPM(null);
      setIsEditPMDialogOpen(false);
    } catch (error) {
      console.error('Failed to update project manager:', error);
      alert('Failed to update project manager. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProjectManager = async (id: string) => {
    if (!confirm('Are you sure you want to delete this project manager?')) return;

    try {
      await projectManagersAPI.delete(id);
      setProjectManagers(projectManagers.filter(pm => pm.id !== id));
    } catch (error) {
      console.error('Failed to delete project manager:', error);
      alert('Failed to delete project manager. Please try again.');
    }
  };

  const handleAddOpportunity = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const { opportunity } = await opportunitiesAPI.create({
        ...newOpp,
        customerId: contact.id,
        value: parseFloat(newOpp.value) || 0,
      });
      setOpportunities([...opportunities, opportunity]);
      setNewOpp({ title: '', description: '', status: 'open', value: '', expectedCloseDate: '' });
      setIsAddOppDialogOpen(false);
    } catch (error) {
      console.error('Failed to create opportunity:', error);
      alert('Failed to create opportunity. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUploadDocument = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const { document } = await uploadDocumentClient(file, {
        contactId: contact.id,
        contactName: `${contact.name} - ${contact.company}`,
      });
      setDocuments([...documents, document]);
      toast.success('Document uploaded successfully');
      // Reset file input
      e.target.value = '';
    } catch (error) {
      console.error('Failed to upload document:', error);
      toast.error('Failed to upload document');
    }
  };

  const handleDeleteDocument = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      await deleteDocumentClient(id);
      setDocuments(documents.filter(doc => doc.id !== id));
      toast.success('Document deleted successfully');
    } catch (error) {
      console.error('Failed to delete document:', error);
      toast.error('Failed to delete document');
    }
  };

  const handleDownloadDocument = async (filePath: string, fileName: string) => {
    try {
      const blob = await downloadDocumentClient(filePath);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('Document downloaded successfully');
    } catch (error) {
      console.error('Failed to download document:', error);
      toast.error('Failed to download document');
    }
  };

  const loadBids = async (opportunityId: string) => {
    try {
      setIsLoadingBids(true);
      console.log('[ContactDetail.loadBids] Loading bids for opportunity:', opportunityId);
      console.log('[ContactDetail.loadBids] Current contact:', contact?.id, contact?.name);
      
      // Load both bids and quotes
      const [bidsResult, quotesResult] = await Promise.all([
        bidsAPI.getByOpportunity(opportunityId),
        quotesAPI.getAll(),
      ]);
      
      const bidList = bidsResult.bids || [];
      const allQuotes = quotesResult.quotes || [];
      
      console.log('[loadBids] Raw bid data from API:', bidList);
      console.log('[loadBids] All quotes from API:', allQuotes.length);
      console.log('[loadBids] Current contact ID:', contact?.id);
      console.log('[loadBids] First quote contact_id:', allQuotes[0]?.contact_id || allQuotes[0]?.contactId);
      
      // Filter quotes by contact_id matching this contact
      const quotesForContact = allQuotes.filter((q: any) => 
        q.contact_id === contact?.id || q.contactId === contact?.id
      );
      
      console.log('[loadBids] Quotes for this contact:', quotesForContact.length);
      console.log('[loadBids] Filtered quotes:', quotesForContact);
      
      // Parse line items for each bid
      const parsedBids = (bidList || []).map((bid: Bid) => {
        let parsedLineItems: LineItem[] = [];
        if (bid.line_items) {
          try {
            if (typeof bid.line_items === 'string') {
              parsedLineItems = JSON.parse(bid.line_items);
            } else if (Array.isArray(bid.line_items)) {
              parsedLineItems = bid.line_items;
            }
            // Ensure cost field exists for backward compatibility
            parsedLineItems = parsedLineItems.map(item => ({
              ...item,
              cost: item.cost ?? 0,
            }));
          } catch (error) {
            console.error('Failed to parse line items for bid:', bid.id, error);
          }
        }
        console.log(`[loadBids] Bid ${bid.id} has ${parsedLineItems.length} line items:`, parsedLineItems);
        return {
          ...bid,
          line_items: parsedLineItems,
          _source: 'bids', // Tag to identify source
        };
      });
      
      // Parse line items for each quote and convert to bid format
      const parsedQuotes = quotesForContact.map((quote: any) => {
        let parsedLineItems: LineItem[] = [];
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
          opportunity_id: opportunityId,
          amount: quote.total || quote.amount || 0,
          status: quote.status || 'draft',
          valid_until: quote.valid_until || quote.validUntil || new Date().toISOString(),
          notes: quote.notes || '',
          created_at: quote.created_at || quote.createdAt,
          line_items: parsedLineItems,
          subtotal: quote.subtotal || 0,
          discount_percent: quote.discount_percent || quote.discountPercent || 0,
          discount_amount: quote.discount_amount || quote.discountAmount || 0,
          tax_percent: quote.tax_percent || quote.taxPercent || 0,
          tax_amount: quote.tax_amount || quote.taxAmount || 0,
          _source: 'quotes', // Tag to identify source
        };
      });
      
      // Merge bids and quotes
      const allBids = [...parsedBids, ...parsedQuotes].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      
      console.log('[loadBids] Total merged bids + quotes:', allBids.length);
      setBids(allBids);
    } catch (error: any) {
      console.error('Failed to load bids:', error);
    } finally {
      setIsLoadingBids(false);
    }
  };

  // Helper functions for line items management
  const getPriceForTier = (item: InventoryItem | undefined, tier: number = 1): number => {
    if (!item) return 0;
    // Try priceTier1, priceTier2, etc.
    const tierKey = `priceTier${tier}` as keyof InventoryItem;
    if (tierKey in item) {
      return Number(item[tierKey]) || 0;
    }
    // Fallback to price_tier_1
    return item.price_tier_1 || item.priceTier1 || 0;
  };

  const calculateLineItemTotal = (quantity: number, unitPrice: number, discount: number): number => {
    const subtotal = quantity * unitPrice;
    return subtotal - (subtotal * discount / 100);
  };

  const calculateBidTotals = (items: LineItem[], discountPercent: number, taxPercent: number) => {
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
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

  const handleAddBid = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      // Use manual subtotal if provided, otherwise calculate from line items
      const calculatedSubtotal = lineItems.reduce((sum, item) => sum + item.total, 0);
      const subtotal = bidSubtotal ? parseFloat(bidSubtotal) : calculatedSubtotal;
      const taxRate = parseFloat(bidTaxRate) || 0;
      const taxAmount = subtotal * (taxRate / 100);
      const total = subtotal + taxAmount;
      
      const { bid } = await bidsAPI.create({
        ...newBid,
        opportunityId: selectedOpportunity?.id || '',
        amount: total,
        projectManagerId: newBid.projectManagerId || undefined,
        items: lineItems, // Save line items
        subtotal: subtotal,
        tax_percent: taxRate,
        tax_amount: taxAmount,
        total: total,
        discount_percent: 0,
        discount_amount: 0,
      });
      
      // Reload bids from server to ensure we have the latest data
      if (selectedOpportunity?.id) {
        await loadBids(selectedOpportunity.id);
      }
      
      setNewBid({ title: '', amount: '', status: 'draft', validUntil: '', notes: '', projectManagerId: '' });
      setLineItems([]);
      setBidSubtotal('');
      setBidTaxRate(getGlobalTaxRate().toString());
      setIsAddBidDialogOpen(false);
    } catch (error) {
      console.error('Failed to create bid:', error);
      alert('Failed to create bid. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddLineItem = (item: LineItem) => {
    setLineItems([...lineItems, item]);
    setIsLineItemDialogOpen(false);
  };

  const handleRemoveLineItem = (id: string) => {
    setLineItems(lineItems.filter(item => item.id !== id));
  };

  // Handlers for editing bid line items
  const handleAddEditLineItem = () => {
    if (!selectedInventoryId) {
      alert('Please select a product');
      return;
    }

    const item = inventoryItems.find(i => i.id === selectedInventoryId);
    if (!item) {
      alert('Product not found');
      return;
    }

    // Use the custom unit price (already set via useEffect or manually edited)
    const total = calculateLineItemTotal(lineItemQuantity, lineItemUnitPrice, lineItemDiscount);

    const lineItem: LineItem = {
      id: `line-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      itemId: item.id,
      itemName: item.name,
      sku: item.sku,
      quantity: lineItemQuantity,
      unitPrice: lineItemUnitPrice, // Use editable unit price
      cost: item.cost || 0, // Include cost from inventory
      discount: lineItemDiscount,
      total,
    };

    setEditingBidLineItems([...editingBidLineItems, lineItem]);
    setSelectedInventoryId('');
    setLineItemQuantity(1);
    setLineItemDiscount(0);
    setLineItemUnitPrice(0);
    setIsEditLineItemDialogOpen(false);
  };

  const handleRemoveEditLineItem = (id: string) => {
    setEditingBidLineItems(editingBidLineItems.filter(item => item.id !== id));
  };

  const handleEditBid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBid) return;
    setIsSaving(true);

    try {
      // Calculate totals from line items
      const totals = calculateBidTotals(
        editingBidLineItems,
        bidDiscountPercent,
        parseFloat(bidTaxRate) || 0
      );

      // Only send fields that exist in the bids table schema
      const { bid } = await bidsAPI.update(editingBid.id, {
        title: editingBid.title,
        amount: totals.total, // Store final total in amount field
        status: editingBid.status,
        validUntil: editingBid.valid_until,
        projectManagerId: editingBid.project_managers?.id || undefined,
        items: editingBidLineItems, // Save line items
        subtotal: totals.subtotal,
        tax_percent: parseFloat(bidTaxRate) || 0,
        tax_amount: totals.taxAmount,
        total: totals.total,
        discount_percent: bidDiscountPercent,
        discount_amount: totals.discountAmount,
      });
      
      // Reload bids from server to ensure we have the latest data
      if (selectedOpportunity?.id) {
        await loadBids(selectedOpportunity.id);
      }
      
      setEditingBid(null);
      setEditingBidLineItems([]);
      setIsEditBidDialogOpen(false);
    } catch (error) {
      console.error('Failed to update bid:', error);
      alert('Failed to update bid. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteBid = async (id: string) => {
    if (!confirm('Are you sure you want to delete this bid?')) return;

    try {
      await bidsAPI.delete(id);
      // Reload bids from server to ensure we have the latest data
      if (selectedOpportunity?.id) {
        await loadBids(selectedOpportunity.id);
      }
    } catch (error) {
      console.error('Failed to delete bid:', error);
      alert('Failed to delete bid. Please try again.');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Button
            variant="ghost"
            onClick={onBack}
            className="mb-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Contacts
          </Button>
          <h1 className="text-3xl font-bold">{contact.name}</h1>
          <p className="text-gray-600 mt-1">{contact.company}</p>
        </div>
        {canChange('contacts', user.role) && (
          <Button onClick={() => onEdit(contact)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit Contact
          </Button>
        )}
      </div>

      {/* Table Setup Warning */}
      {tableNotFound && <ProjectManagersTableSetup />}

      {/* Contact Information */}
      <Card>
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center gap-2 text-gray-600 mb-1">
              <Mail className="h-4 w-4" />
              <span className="text-sm">Email</span>
            </div>
            <p className="text-gray-900">{contact.email}</p>
          </div>
          <div>
            <div className="flex items-center gap-2 text-gray-600 mb-1">
              <Phone className="h-4 w-4" />
              <span className="text-sm">Phone</span>
            </div>
            <p className="text-gray-900">{contact.phone}</p>
          </div>
          <div>
            <div className="flex items-center gap-2 text-gray-600 mb-1">
              <Building className="h-4 w-4" />
              <span className="text-sm">Company</span>
            </div>
            <p className="text-gray-900">{contact.company}</p>
          </div>
          <div>
            <div className="flex items-center gap-2 text-gray-600 mb-1">
              <DollarSign className="h-4 w-4" />
              <span className="text-sm">Price Level</span>
            </div>
            <span className="inline-block px-3 py-1 text-sm rounded bg-purple-100 text-purple-700">
              {contact.priceLevel ? contact.priceLevel.replace('tier', 'Tier ') : 'Not Set'}
            </span>
          </div>
          {contact.legacyNumber && (
            <div>
              <div className="flex items-center gap-2 text-gray-600 mb-1">
                <span className="text-sm">Legacy #</span>
              </div>
              <p className="text-gray-900">{contact.legacyNumber}</p>
            </div>
          )}
          {contact.accountOwnerNumber && (
            <div>
              <div className="flex items-center gap-2 text-gray-600 mb-1">
                <span className="text-sm">Account Owner #</span>
              </div>
              <p className="text-gray-900">{contact.accountOwnerNumber}</p>
            </div>
          )}
          {contact.address && (
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 text-gray-600 mb-1">
                <MapPin className="h-4 w-4" />
                <span className="text-sm">Address</span>
              </div>
              <p className="text-gray-900">{contact.address}</p>
            </div>
          )}
          {contact.notes && (
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 text-gray-600 mb-1">
                <span className="text-sm">Notes</span>
              </div>
              <p className="text-gray-900">{contact.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sales & Financial Data */}
      {(contact.ptdSales || contact.ptdGpPercent || contact.ytdSales || contact.ytdGpPercent || contact.lyrSales || contact.lyrGpPercent) && (
        <Card>
          <CardHeader>
            <CardTitle>Sales & Financial Data</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(contact.ptdSales !== undefined || contact.ptdGpPercent !== undefined) && (
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2 text-blue-600 mb-2">
                  <TrendingUp className="h-5 w-5" />
                  <span>PTD (Period to Date)</span>
                </div>
                {contact.ptdSales !== undefined && (
                  <div className="mb-2">
                    <p className="text-sm text-gray-600">Sales</p>
                    <p className="text-gray-900">${contact.ptdSales.toLocaleString()}</p>
                  </div>
                )}
                {contact.ptdGpPercent !== undefined && (
                  <div>
                    <p className="text-sm text-gray-600">GP%</p>
                    <p className="text-gray-900">{contact.ptdGpPercent}%</p>
                  </div>
                )}
              </div>
            )}
            {(contact.ytdSales !== undefined || contact.ytdGpPercent !== undefined) && (
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="flex items-center gap-2 text-green-600 mb-2">
                  <TrendingUp className="h-5 w-5" />
                  <span>YTD (Year to Date)</span>
                </div>
                {contact.ytdSales !== undefined && (
                  <div className="mb-2">
                    <p className="text-sm text-gray-600">Sales</p>
                    <p className="text-gray-900">${contact.ytdSales.toLocaleString()}</p>
                  </div>
                )}
                {contact.ytdGpPercent !== undefined && (
                  <div>
                    <p className="text-sm text-gray-600">GP%</p>
                    <p className="text-gray-900">{contact.ytdGpPercent}%</p>
                  </div>
                )}
              </div>
            )}
            {(contact.lyrSales !== undefined || contact.lyrGpPercent !== undefined) && (
              <div className="p-4 bg-purple-50 rounded-lg">
                <div className="flex items-center gap-2 text-purple-600 mb-2">
                  <TrendingUp className="h-5 w-5" />
                  <span>LYR (Last Year)</span>
                </div>
                {contact.lyrSales !== undefined && (
                  <div className="mb-2">
                    <p className="text-sm text-gray-600">Sales</p>
                    <p className="text-gray-900">${contact.lyrSales.toLocaleString()}</p>
                  </div>
                )}
                {contact.lyrGpPercent !== undefined && (
                  <div>
                    <p className="text-sm text-gray-600">GP%</p>
                    <p className="text-gray-900">{contact.lyrGpPercent}%</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Project Managers */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Project Managers</CardTitle>
            {canAdd('contacts', user.role) && (
              <Dialog open={isAddPMDialogOpen} onOpenChange={setIsAddPMDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Project Manager
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Add Project Manager</DialogTitle>
                    <DialogDescription>
                      Add a new project manager for {contact.name}
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleAddProjectManager} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="pm-name">Full Name *</Label>
                      <Input
                        id="pm-name"
                        value={newPM.name}
                        onChange={(e) => setNewPM({ ...newPM, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pm-email">Email Address *</Label>
                      <Input
                        id="pm-email"
                        type="email"
                        value={newPM.email}
                        onChange={(e) => setNewPM({ ...newPM, email: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pm-phone">Phone Number *</Label>
                      <Input
                        id="pm-phone"
                        value={newPM.phone}
                        onChange={(e) => setNewPM({ ...newPM, phone: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pm-mailingAddress">Mailing Address *</Label>
                      <Textarea
                        id="pm-mailingAddress"
                        value={newPM.mailingAddress}
                        onChange={(e) => setNewPM({ ...newPM, mailingAddress: e.target.value })}
                        rows={3}
                        required
                      />
                    </div>
                    <div className="flex gap-2 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setNewPM({ name: '', email: '', phone: '', mailingAddress: '' });
                          setIsAddPMDialogOpen(false);
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
                            Adding...
                          </>
                        ) : (
                          'Add Project Manager'
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
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : tableNotFound ? (
            <div className="text-center py-8 text-gray-500">
              <UserPlus className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Project Managers table not found</p>
              <p className="text-sm mt-1">Please contact your administrator to set up the table</p>
            </div>
          ) : projectManagers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <UserPlus className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No project managers added yet</p>
              <p className="text-sm mt-1">Add project managers to keep track of key contacts</p>
            </div>
          ) : (
            <div className="space-y-4">
              {projectManagers.map((pm) => (
                <div key={pm.id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                          {pm.name.charAt(0)}
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">{pm.name}</h4>
                          <div className="flex items-center gap-1 text-sm text-gray-600">
                            <Mail className="h-3 w-3" />
                            {pm.email}
                          </div>
                        </div>
                      </div>
                      <div className="ml-12 space-y-1 text-sm">
                        <div className="flex items-center gap-2 text-gray-600">
                          <Phone className="h-3 w-3" />
                          {pm.phone}
                        </div>
                        <div className="flex items-start gap-2 text-gray-600">
                          <MapPin className="h-3 w-3 mt-0.5" />
                          <span>{pm.mailingAddress}</span>
                        </div>
                      </div>
                    </div>
                    {canChange('contacts', user.role) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setEditingPM(pm);
                              setIsEditPMDialogOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          {canDelete('contacts', user.role) && (
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => handleDeleteProjectManager(pm.id)}
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

      {/* Opportunities */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Opportunities & Bids</CardTitle>
            <div className="flex items-center gap-2">
              {canAdd('contacts', user.role) && (
                <Button size="sm" onClick={() => setIsAddOppDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Opportunity
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingOpps ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : opportunities.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Target className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No opportunities added yet</p>
              <p className="text-sm mt-1">Create opportunities to track potential business and manage bids</p>
            </div>
          ) : (
            <div className="space-y-4">
              {opportunities.map((opp) => {
                const statusColors = {
                  open: 'bg-blue-100 text-blue-700',
                  in_progress: 'bg-yellow-100 text-yellow-700',
                  won: 'bg-green-100 text-green-700',
                  lost: 'bg-red-100 text-red-700',
                };
                
                return (
                  <div key={opp.id} className="border rounded-lg p-4 hover:bg-gray-50 transition">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Target className="h-5 w-5 text-blue-600" />
                          <h4 className="font-semibold text-gray-900">{opp.title}</h4>
                          <Badge className={statusColors[opp.status]}>
                            {opp.status === 'in_progress' ? 'In Progress' : opp.status.charAt(0).toUpperCase() + opp.status.slice(1)}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-3 ml-7">{opp.description}</p>
                        <div className="ml-7 flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-1 text-gray-600">
                            <DollarSign className="h-4 w-4" />
                            <span>${opp.value.toLocaleString()}</span>
                          </div>
                          <div className="flex items-center gap-1 text-gray-600">
                            <Calendar className="h-4 w-4" />
                            <span>Close: {new Date(opp.expectedCloseDate).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center gap-1 text-gray-600">
                            <TrendingUp className="h-4 w-4" />
                            <span>Created: {new Date(opp.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedOpportunity(opp);
                          loadBids(opp.id);
                          setIsBidsDialogOpen(true);
                        }}
                      >
                        <Receipt className="h-4 w-4 mr-2" />
                        View & Manage Bids
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Documents */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Documents</CardTitle>
            {canAdd('contacts', user.role) && (
              <div className="flex items-center gap-2">
                <Label htmlFor="document-upload" className="sr-only">Upload Document</Label>
                <Input
                  id="document-upload"
                  type="file"
                  onChange={handleUploadDocument}
                  className="hidden"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => document.getElementById('document-upload')?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Document
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No documents added yet</p>
              <p className="text-sm mt-1">Upload documents to keep track of important files</p>
            </div>
          ) : (
            <div className="space-y-4">
              {documents.map((doc) => (
                <div key={doc.id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <File className="h-5 w-5 text-blue-600" />
                        <h4 className="font-semibold text-gray-900">{doc.fileName}</h4>
                      </div>
                      <p className="text-sm text-gray-600 mb-3 ml-7">{doc.description}</p>
                      <div className="ml-7 flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1 text-gray-600">
                          <Calendar className="h-4 w-4" />
                          <span>Uploaded: {new Date(doc.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    {canChange('contacts', user.role) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleDownloadDocument(doc.filePath, doc.fileName)}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </DropdownMenuItem>
                          {canDelete('contacts', user.role) && (
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => handleDeleteDocument(doc.id)}
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

      {/* Edit Project Manager Dialog */}
      <Dialog open={isEditPMDialogOpen} onOpenChange={setIsEditPMDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Project Manager</DialogTitle>
            <DialogDescription>
              Update the project manager's information
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditProjectManager} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-pm-name">Full Name *</Label>
              <Input
                id="edit-pm-name"
                value={editingPM?.name || ''}
                onChange={(e) => setEditingPM(editingPM ? { ...editingPM, name: e.target.value } : null)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-pm-email">Email Address *</Label>
              <Input
                id="edit-pm-email"
                type="email"
                value={editingPM?.email || ''}
                onChange={(e) => setEditingPM(editingPM ? { ...editingPM, email: e.target.value } : null)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-pm-phone">Phone Number *</Label>
              <Input
                id="edit-pm-phone"
                value={editingPM?.phone || ''}
                onChange={(e) => setEditingPM(editingPM ? { ...editingPM, phone: e.target.value } : null)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-pm-mailingAddress">Mailing Address *</Label>
              <Textarea
                id="edit-pm-mailingAddress"
                value={editingPM?.mailingAddress || ''}
                onChange={(e) => setEditingPM(editingPM ? { ...editingPM, mailingAddress: e.target.value } : null)}
                rows={3}
                required
              />
            </div>
            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditingPM(null);
                  setIsEditPMDialogOpen(false);
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

      {/* Add Opportunity Dialog */}
      <Dialog open={isAddOppDialogOpen} onOpenChange={setIsAddOppDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Opportunity</DialogTitle>
            <DialogDescription>
              Add a new opportunity for {contact.name}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddOpportunity} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="opp-title">Title *</Label>
              <Input
                id="opp-title"
                value={newOpp.title}
                onChange={(e) => setNewOpp({ ...newOpp, title: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="opp-description">Description *</Label>
              <Textarea
                id="opp-description"
                value={newOpp.description}
                onChange={(e) => setNewOpp({ ...newOpp, description: e.target.value })}
                rows={3}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="opp-status">Status *</Label>
              <Select
                value={newOpp.status}
                onValueChange={(value) => setNewOpp({ ...newOpp, status: value as 'open' | 'in_progress' | 'won' | 'lost' })}
                required
              >
                <SelectTrigger>
                  <SelectValue>{newOpp.status}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="won">Won</SelectItem>
                  <SelectItem value="lost">Lost</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="opp-value">Value *</Label>
              <Input
                id="opp-value"
                type="number"
                value={newOpp.value}
                onChange={(e) => setNewOpp({ ...newOpp, value: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="opp-expectedCloseDate">Expected Close Date *</Label>
              <Input
                id="opp-expectedCloseDate"
                type="date"
                value={newOpp.expectedCloseDate}
                onChange={(e) => setNewOpp({ ...newOpp, expectedCloseDate: e.target.value })}
                required
              />
            </div>
            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setNewOpp({ title: '', description: '', status: 'open', value: '', expectedCloseDate: '' });
                  setIsAddOppDialogOpen(false);
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
                    Adding...
                  </>
                ) : (
                  'Add Opportunity'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Bid Dialog */}
      <Dialog open={isAddBidDialogOpen} onOpenChange={(open) => {
        setIsAddBidDialogOpen(open);
        if (!open) {
          setLineItems([]);
          setBidSubtotal('');
          setBidTaxRate(getGlobalTaxRate().toString());
        }
      }}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Bid</DialogTitle>
            <DialogDescription>
              Add a new bid for {selectedOpportunity?.title}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddBid} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bid-title">Title *</Label>
                <Input
                  id="bid-title"
                  value={newBid.title}
                  onChange={(e) => setNewBid({ ...newBid, title: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bid-status">Status *</Label>
                <Select
                  value={newBid.status}
                  onValueChange={(value) => setNewBid({ ...newBid, status: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue>{newBid.status}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="submitted">Submitted</SelectItem>
                    <SelectItem value="accepted">Accepted</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bid-project-manager">Project Manager</Label>
                <Select
                  value={newBid.projectManagerId}
                  onValueChange={(value) => setNewBid({ ...newBid, projectManagerId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select project manager" />
                  </SelectTrigger>
                  <SelectContent>
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
                <Label htmlFor="bid-validUntil">Valid Until *</Label>
                <Input
                  id="bid-validUntil"
                  type="date"
                  value={newBid.validUntil}
                  onChange={(e) => setNewBid({ ...newBid, validUntil: e.target.value })}
                  required
                />
              </div>
            </div>

            {/* Line Items Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Line Items *</Label>
                <Button 
                  type="button"
                  size="sm" 
                  onClick={() => setIsLineItemDialogOpen(true)}
                  variant="outline"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Line Item
                </Button>
              </div>
              
              <LineItemsTable 
                items={lineItems} 
                onRemove={handleRemoveLineItem}
                editable={true}
              />

              {lineItems.length === 0 && (
                <p className="text-xs text-red-600 mt-1">
                  * Please add at least one line item
                </p>
              )}
            </div>

            {/* Subtotal and Tax Section */}
            <div className="grid grid-cols-2 gap-4 border-t pt-4">
              <div className="space-y-2">
                <Label htmlFor="bid-subtotal">Subtotal *</Label>
                <Input
                  id="bid-subtotal"
                  type="number"
                  step="0.01"
                  value={bidSubtotal}
                  onChange={(e) => setBidSubtotal(e.target.value)}
                  required
                  placeholder="Auto-calculated from line items"
                />
                <p className="text-xs text-gray-500">
                  Auto-calculated, but you can override
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bid-tax-rate">Tax Rate (%)</Label>
                <Input
                  id="bid-tax-rate"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={bidTaxRate}
                  onChange={(e) => setBidTaxRate(e.target.value)}
                  placeholder="0"
                />
                <p className="text-xs text-gray-500">
                  From Global Settings, but you can override
                </p>
              </div>
            </div>

            {/* Total Display */}
            {bidSubtotal && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-700">Subtotal:</span>
                    <span className="text-gray-900">${parseFloat(bidSubtotal || '0').toFixed(2)}</span>
                  </div>
                  {parseFloat(bidTaxRate) > 0 && (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-700">Tax ({bidTaxRate}%):</span>
                        <span className="text-gray-900">
                          ${(parseFloat(bidSubtotal || '0') * (parseFloat(bidTaxRate) / 100)).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-blue-300">
                        <span className="text-gray-900">Total Bid Amount:</span>
                        <span className="text-gray-900">
                          ${(parseFloat(bidSubtotal || '0') * (1 + parseFloat(bidTaxRate) / 100)).toFixed(2)}
                        </span>
                      </div>
                    </>
                  )}
                  {parseFloat(bidTaxRate) === 0 && (
                    <div className="flex justify-between pt-2 border-t border-blue-300">
                      <span className="text-gray-900">Total Bid Amount:</span>
                      <span className="text-gray-900">${parseFloat(bidSubtotal || '0').toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="bid-notes">Notes</Label>
              <Textarea
                id="bid-notes"
                value={newBid.notes}
                onChange={(e) => setNewBid({ ...newBid, notes: e.target.value })}
                rows={3}
              />
            </div>

            <div className="flex gap-2 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setNewBid({ title: '', amount: '', status: 'draft', validUntil: '', notes: '', projectManagerId: '' });
                  setLineItems([]);
                  setBidSubtotal('');
                  setBidTaxRate(getGlobalTaxRate().toString());
                  setIsAddBidDialogOpen(false);
                }}
                className="flex-1"
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="flex-1" 
                disabled={isSaving || !newBid.title}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  'Add Bid'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Line Items Dialog */}
      <BidLineItems
        isOpen={isLineItemDialogOpen}
        onClose={() => setIsLineItemDialogOpen(false)}
        inventoryItems={inventoryItems}
        currentItems={lineItems}
        onAddItem={handleAddLineItem}
        priceTier={priceLevelToTier(contact.priceLevel || 'Retail')}
      />

      {/* Edit Bid Dialog */}
      <Dialog open={isEditBidDialogOpen} onOpenChange={setIsEditBidDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Bid</DialogTitle>
            <DialogDescription>
              Update the bid's information and line items
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditBid} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-bid-title">Title *</Label>
                <Input
                  id="edit-bid-title"
                  value={editingBid?.title || ''}
                  onChange={(e) => setEditingBid(editingBid ? { ...editingBid, title: e.target.value } : null)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-bid-status">Status *</Label>
                <Select
                  value={editingBid?.status || ''}
                  onValueChange={(value) => setEditingBid(editingBid ? { ...editingBid, status: value } : null)}
                  required
                >
                  <SelectTrigger>
                    <SelectValue>{editingBid?.status || 'draft'}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="submitted">Submitted</SelectItem>
                    <SelectItem value="accepted">Accepted</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-bid-validUntil">Valid Until *</Label>
                <Input
                  id="edit-bid-validUntil"
                  type="date"
                  value={editingBid?.valid_until || ''}
                  onChange={(e) => setEditingBid(editingBid ? { ...editingBid, valid_until: e.target.value } : null)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Contact Price Level</Label>
                <Input
                  value={contact.priceLevel || 'Retail'}
                  disabled
                  className="bg-gray-50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-bid-project-manager">Project Manager</Label>
                <Select
                  value={editingBid?.project_managers?.id || ''}
                  onValueChange={(value) => {
                    if (editingBid) {
                      const pm = projectManagers.find(p => p.id === value);
                      setEditingBid({ 
                        ...editingBid, 
                        project_managers: pm ? { id: pm.id, name: pm.name } : undefined 
                      });
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select project manager" />
                  </SelectTrigger>
                  <SelectContent>
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
            </div>

            {/* Line Items Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm text-gray-900">Line Items</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditLineItemDialogOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </div>

              {editingBidLineItems.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <ShoppingCart className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm text-gray-500">No items added yet</p>
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left py-2 px-4 text-xs text-gray-600">Item</th>
                        <th className="text-right py-2 px-4 text-xs text-gray-600">Qty</th>
                        <th className="text-right py-2 px-4 text-xs text-gray-600">Unit Price</th>
                        <th className="text-right py-2 px-4 text-xs text-gray-600">Discount</th>
                        <th className="text-right py-2 px-4 text-xs text-gray-600">Total</th>
                        <th className="w-12"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {editingBidLineItems.map(item => (
                        <tr key={item.id} className="border-t">
                          <td className="py-2 px-4">
                            <p className="text-sm text-gray-900">{item.itemName}</p>
                            <p className="text-xs text-gray-500">SKU: {item.sku}</p>
                          </td>
                          <td className="py-2 px-4 text-right text-sm">{item.quantity}</td>
                          <td className="py-2 px-4 text-right text-sm">${item.unitPrice.toFixed(2)}</td>
                          <td className="py-2 px-4 text-right text-sm">{item.discount}%</td>
                          <td className="py-2 px-4 text-right text-sm">${item.total.toFixed(2)}</td>
                          <td className="py-2 px-4">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveEditLineItem(item.id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Pricing */}
            {editingBidLineItems.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-sm text-gray-900">Pricing</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Bid Discount (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={bidDiscountPercent}
                      onChange={(e) => setBidDiscountPercent(Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <Label>Tax Rate (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={bidTaxRate}
                      onChange={(e) => setBidTaxRate(e.target.value)}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      From Global Settings, but you can override
                    </p>
                  </div>
                </div>

                {/* Bid Summary */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Subtotal:</span>
                      <span className="text-gray-900">
                        ${calculateBidTotals(editingBidLineItems, bidDiscountPercent, parseFloat(bidTaxRate) || 0).subtotal.toFixed(2)}
                      </span>
                    </div>
                    {bidDiscountPercent > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Discount ({bidDiscountPercent}%):</span>
                        <span className="text-red-600">
                          -${calculateBidTotals(editingBidLineItems, bidDiscountPercent, parseFloat(bidTaxRate) || 0).discountAmount.toFixed(2)}
                        </span>
                      </div>
                    )}
                    {parseFloat(bidTaxRate) > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Tax ({bidTaxRate}%):</span>
                        <span className="text-gray-900">
                          ${calculateBidTotals(editingBidLineItems, bidDiscountPercent, parseFloat(bidTaxRate) || 0).taxAmount.toFixed(2)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between pt-2 border-t border-gray-300">
                      <span className="text-gray-900">Total:</span>
                      <span className="text-xl text-gray-900">
                        ${calculateBidTotals(editingBidLineItems, bidDiscountPercent, parseFloat(bidTaxRate) || 0).total.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="edit-bid-notes">Notes</Label>
              <Textarea
                id="edit-bid-notes"
                value={editingBid?.notes || ''}
                onChange={(e) => setEditingBid(editingBid ? { ...editingBid, notes: e.target.value } : null)}
                rows={3}
              />
            </div>

            <div className="flex gap-2 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditingBid(null);
                  setEditingBidLineItems([]);
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

      {/* Add Line Item Dialog for Edit Bid */}
      <Dialog open={isEditLineItemDialogOpen} onOpenChange={setIsEditLineItemDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Line Item</DialogTitle>
            <DialogDescription>
              Select a product from inventory and specify quantity and discount.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Search Inventory</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Type to search by name or SKU..."
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
                  <SelectValue placeholder={filteredInventory.length > 0 ? "Choose from results below" : "Search above to find products"} />
                </SelectTrigger>
                <SelectContent className="max-h-[300px] overflow-y-auto">
                  {filteredInventory.length > 0 ? (
                    filteredInventory.map(item => {
                      const priceTier = priceLevelToTier(contact.priceLevel || 'Retail');
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
                  {inventoryItems.find(i => i.id === selectedInventoryId)?.description}
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-4">
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
                  const priceLevel = contact.priceLevel || 'Retail';
                  const priceTier = priceLevelToTier(priceLevel);
                  return (
                    <p className="text-xs text-gray-500 mt-1">
                      {priceLevel} default: $
                      {getPriceForTier(inventoryItems.find(i => i.id === selectedInventoryId)!, priceTier).toFixed(2)}
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
              <div>
                <Label>Line Discount (%)</Label>
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

            {selectedInventoryId && lineItemUnitPrice > 0 && (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Unit Price:</span>
                    <span className="text-gray-900">${lineItemUnitPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Quantity:</span>
                    <span className="text-gray-900">{lineItemQuantity}</span>
                  </div>
                  {lineItemDiscount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Discount:</span>
                      <span className="text-red-600">{lineItemDiscount}%</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t">
                    <span className="text-gray-900">Line Total:</span>
                    <span className="text-gray-900">
                      ${calculateLineItemTotal(
                        lineItemQuantity,
                        lineItemUnitPrice,
                        lineItemDiscount
                      ).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 mt-6 pt-6 border-t">
            <Button 
              type="button"
              variant="outline" 
              onClick={() => {
                setIsEditLineItemDialogOpen(false);
                setSelectedInventoryId('');
                setLineItemQuantity(1);
                setLineItemDiscount(0);
                setInventorySearchQuery('');
              }}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleAddEditLineItem}>
              Add Item
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View & Manage Bids Dialog */}
      <Dialog open={isBidsDialogOpen} onOpenChange={setIsBidsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bids for {selectedOpportunity?.title}</DialogTitle>
            <DialogDescription>
              View and manage bids for this opportunity
            </DialogDescription>
          </DialogHeader>
          
          {/* Opportunity Summary */}
          {selectedOpportunity && (
            <div className="mb-4 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <p className="text-sm text-gray-600">Opportunity Value</p>
                  <p className="text-xl font-semibold">${selectedOpportunity.value.toLocaleString()}</p>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-600">Expected Close</p>
                  <p className="text-xl font-semibold">{new Date(selectedOpportunity.expectedCloseDate).toLocaleDateString()}</p>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-600">Status</p>
                  <Badge className={
                    selectedOpportunity.status === 'open' ? 'bg-blue-100 text-blue-700' :
                    selectedOpportunity.status === 'in_progress' ? 'bg-yellow-100 text-yellow-700' :
                    selectedOpportunity.status === 'won' ? 'bg-green-100 text-green-700' :
                    'bg-red-100 text-red-700'
                  }>
                    {selectedOpportunity.status === 'in_progress' ? 'In Progress' : selectedOpportunity.status.charAt(0).toUpperCase() + selectedOpportunity.status.slice(1)}
                  </Badge>
                </div>
              </div>
            </div>
          )}

          {/* Bids List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Bids ({bids.length})</h3>
              {canAdd('contacts', user.role) && (
                <Button size="sm" onClick={() => setIsAddBidDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Bid
                </Button>
              )}
            </div>

            {isLoadingBids ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : bids.length === 0 ? (
              <div className="text-center py-8 text-gray-500 border rounded-lg">
                <Receipt className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No bids added yet</p>
                <p className="text-sm mt-1">Click "Add Bid" to create your first bid for this opportunity</p>
              </div>
            ) : (
              <div className="space-y-3">
                {bids.map((bid) => {
                  const statusColors = {
                    draft: 'bg-gray-100 text-gray-700',
                    submitted: 'bg-blue-100 text-blue-700',
                    accepted: 'bg-green-100 text-green-700',
                    rejected: 'bg-red-100 text-red-700',
                  };
                  
                  return (
                    <div key={bid.id} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Receipt className="h-5 w-5 text-blue-600" />
                            <h4 className="font-semibold text-gray-900">{bid.title}</h4>
                            <Badge className={statusColors[bid.status as keyof typeof statusColors] || statusColors.draft}>
                              {bid.status.charAt(0).toUpperCase() + bid.status.slice(1)}
                            </Badge>
                          </div>
                          <div className="ml-7 space-y-1">
                            <div className="flex items-center gap-4 text-sm">
                              <div className="flex items-center gap-1 text-gray-600">
                                <DollarSign className="h-4 w-4" />
                                <span className="font-semibold">${bid.amount.toLocaleString()}</span>
                              </div>
                              <div className="flex items-center gap-1 text-gray-600">
                                <Calendar className="h-4 w-4" />
                                <span>Valid until: {new Date(bid.valid_until).toLocaleDateString()}</span>
                              </div>
                            </div>
                            {bid.project_managers && (
                              <div className="flex items-center gap-1 text-sm text-gray-600">
                                <UserPlus className="h-4 w-4" />
                                <span>PM: {bid.project_managers.name}</span>
                              </div>
                            )}
                            {bid.notes && (
                              <p className="text-sm text-gray-600 mt-2">{bid.notes}</p>
                            )}
                            
                            {/* Line Items Section */}
                            {bid.line_items && Array.isArray(bid.line_items) && bid.line_items.length > 0 && (
                              <div className="mt-3 pt-3 border-t">
                                <p className="text-xs font-semibold text-gray-700 mb-2">Line Items ({bid.line_items.length})</p>
                                <div className="space-y-1">
                                  {bid.line_items.map((item: LineItem, idx: number) => (
                                    <div key={item.id || idx} className="flex items-center justify-between text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded">
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium">{item.itemName}</span>
                                        {item.sku && <span className="text-gray-400">({item.sku})</span>}
                                      </div>
                                      <div className="flex items-center gap-3">
                                        <span>Qty: {item.quantity}</span>
                                        <span>@${item.unitPrice.toFixed(2)}</span>
                                        {item.discount > 0 && <span className="text-red-600">-{item.discount}%</span>}
                                        <span className="font-semibold">${item.total.toFixed(2)}</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            <p className="text-xs text-gray-500 mt-1">
                              Created: {new Date(bid.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        {canChange('contacts', user.role) && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => {
                                  // Parse line items if they exist
                                  let parsedLineItems: LineItem[] = [];
                                  if (bid.line_items) {
                                    try {
                                      if (typeof bid.line_items === 'string') {
                                        parsedLineItems = JSON.parse(bid.line_items);
                                      } else if (Array.isArray(bid.line_items)) {
                                        parsedLineItems = bid.line_items;
                                      }
                                    } catch (error) {
                                      console.error('Failed to parse line items:', error);
                                    }
                                  }
                                  setEditingBid(bid);
                                  setEditingBidLineItems(parsedLineItems);
                                  setBidDiscountPercent(bid.discount_percent || 0);
                                  setBidTaxRate((bid.tax_percent || getGlobalTaxRate()).toString());
                                  setIsEditBidDialogOpen(true);
                                }}
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              {canDelete('contacts', user.role) && (
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
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex justify-end pt-4 border-t">
            <Button variant="outline" onClick={() => setIsBidsDialogOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}