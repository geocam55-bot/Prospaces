import { useState, useEffect, useMemo, useTransition, useDeferredValue } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Alert, AlertDescription } from './ui/alert';
import {
  Package,
  Plus,
  Search,
  Edit,
  Trash2,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  DollarSign,
  Barcode,
  MapPin,
  Tag,
  FileText,
  Image as ImageIcon,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Sparkles,
  Zap,
} from 'lucide-react';
import { inventoryAPI } from '../utils/api';
import type { User } from '../App';
import { DatabaseInit } from './DatabaseInit';
import { advancedSearch, getSearchSuggestions } from '../utils/advanced-search';
import { InventorySearchHelp } from './InventorySearchHelp';

interface InventoryProps {
  user: User;
}

interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  description: string;
  unitOfMeasure: string;
  quantityOnHand: number;
  quantityOnOrder?: number;
  reorderLevel: number;
  minStock?: number;
  maxStock?: number;
  cost: number;
  priceTier1: number;
  priceTier2: number;
  priceTier3: number;
  priceTier4: number;
  priceTier5: number;
  supplier?: string;
  supplierSKU?: string;
  leadTimeDays?: number;
  barcode?: string;
  location?: string;
  imageUrl?: string;
  tags?: string[];
  notes?: string;
  status: 'active' | 'inactive' | 'discontinued';
  createdAt: string;
  updatedAt: string;
}

export function Inventory({ user }: InventoryProps) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showDialog, setShowDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [activeTab, setActiveTab] = useState('items');
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [tableExists, setTableExists] = useState(true);
  
  // ✅ Pagination state to prevent rendering all 14k+ items at once
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50); // Made this state so user can change it
  
  // 🔮 Advanced search features
  const [useAdvancedSearch, setUseAdvancedSearch] = useState(true);
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category: '',
    description: '',
    unitOfMeasure: 'ea',
    quantityOnHand: 0,
    quantityOnOrder: 0,
    reorderLevel: 0,
    minStock: 0,
    maxStock: 0,
    cost: 0,
    priceTier1: 0,
    priceTier2: 0,
    priceTier3: 0,
    priceTier4: 0,
    priceTier5: 0,
    supplier: '',
    supplierSKU: '',
    leadTimeDays: 0,
    barcode: '',
    location: '',
    imageUrl: '',
    tags: '',
    notes: '',
    status: 'active' as 'active' | 'inactive' | 'discontinued',
  });

  useEffect(() => {
    loadInventory();
  }, []);

  // ✅ Use deferred value to prevent search input from blocking during large renders
  const deferredSearchQuery = useDeferredValue(searchQuery);

  // 🔮 Advanced search with fuzzy matching, semantic search, and NLP
  const filteredItems = useMemo(() => {
    let result = items;

    // Apply category filter first
    if (categoryFilter !== 'all') {
      result = result.filter(item => item.category === categoryFilter);
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      result = result.filter(item => item.status === statusFilter);
    }

    // Apply search
    if (deferredSearchQuery.trim()) {
      if (useAdvancedSearch) {
        // 🌟 Advanced Search with fuzzy matching, semantic understanding, and NLP
        const searchResults = advancedSearch(result, deferredSearchQuery, {
          fuzzyThreshold: 0.7,
          includeInactive: statusFilter !== 'active',
          minScore: 0.2,
          maxResults: 1000,
          sortBy: 'relevance',
        });
        
        // Return items with their relevance scores
        return searchResults.map(r => ({
          ...r.item,
          _searchScore: r.score,
          _matchedFields: r.matchedFields,
          _matchType: r.matchType,
        }));
      } else {
        // Basic search (original)
        const query = deferredSearchQuery.toLowerCase();
        return result.filter(item =>
          item.name?.toLowerCase().includes(query) ||
          item.sku?.toLowerCase().includes(query) ||
          item.description?.toLowerCase().includes(query) ||
          item.category?.toLowerCase().includes(query) ||
          item.barcode?.toLowerCase().includes(query) ||
          item.location?.toLowerCase().includes(query) ||
          item.supplier?.toLowerCase().includes(query)
        );
      }
    }

    return result;
  }, [items, deferredSearchQuery, categoryFilter, statusFilter, useAdvancedSearch]);
  
  // 🔮 Generate search suggestions
  useEffect(() => {
    if (searchQuery.length >= 2) {
      const suggestions = getSearchSuggestions(items, searchQuery, 5);
      setSearchSuggestions(suggestions);
    } else {
      setSearchSuggestions([]);
    }
  }, [searchQuery, items]);

  const loadInventory = async () => {
    try {
      setIsLoading(true);
      console.log('🔄 [Inventory] Starting to load inventory...');
      const data = await inventoryAPI.getAll();
      console.log('✅ [Inventory] Loaded items:', data.items?.length || 0);
      console.log('📋 [Inventory] Sample SKUs:', data.items?.slice(0, 5).map(i => i.sku) || []);
      setItems(data.items || []);
      setTableExists(true); // Table exists
    } catch (error: any) {
      console.error('❌ [Inventory] Failed to load inventory:', error);
      
      // Check if it's a "table not found" error
      if (error?.code === 'PGRST205' || error?.message?.includes('Could not find the table')) {
        setTableExists(false); // Table doesn't exist
      } else {
        showAlert('error', 'Failed to load inventory items');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const showAlert = (type: 'success' | 'error', message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 3000);
  };

  const handleOpenDialog = (item?: InventoryItem) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        name: item.name,
        sku: item.sku,
        category: item.category,
        description: item.description,
        unitOfMeasure: item.unitOfMeasure,
        quantityOnHand: item.quantityOnHand,
        quantityOnOrder: item.quantityOnOrder || 0,
        reorderLevel: item.reorderLevel,
        minStock: item.minStock || 0,
        maxStock: item.maxStock || 0,
        cost: item.cost,
        priceTier1: item.priceTier1,
        priceTier2: item.priceTier2,
        priceTier3: item.priceTier3,
        priceTier4: item.priceTier4,
        priceTier5: item.priceTier5,
        supplier: item.supplier || '',
        supplierSKU: item.supplierSKU || '',
        leadTimeDays: item.leadTimeDays || 0,
        barcode: item.barcode || '',
        location: item.location || '',
        imageUrl: item.imageUrl || '',
        tags: item.tags?.join(', ') || '',
        notes: item.notes || '',
        status: item.status,
      });
    } else {
      setEditingItem(null);
      setFormData({
        name: '',
        sku: '',
        category: '',
        description: '',
        unitOfMeasure: 'ea',
        quantityOnHand: 0,
        quantityOnOrder: 0,
        reorderLevel: 0,
        minStock: 0,
        maxStock: 0,
        cost: 0,
        priceTier1: 0,
        priceTier2: 0,
        priceTier3: 0,
        priceTier4: 0,
        priceTier5: 0,
        supplier: '',
        supplierSKU: '',
        leadTimeDays: 0,
        barcode: '',
        location: '',
        imageUrl: '',
        tags: '',
        notes: '',
        status: 'active',
      });
    }
    setShowDialog(true);
  };

  const handleSave = async () => {
    try {
      console.log('💾 [Inventory] handleSave - Starting save...');
      console.log('💾 [Inventory] Form data:', formData);
      console.log('💾 [Inventory] Editing item:', editingItem);
      
      // Match the actual database schema (simple version)
      const itemData = {
        name: formData.name,
        sku: formData.sku,
        description: formData.description,
        category: formData.category,
        quantity: Number(formData.quantityOnHand),
        quantity_on_order: Number(formData.quantityOnOrder),
        unit_price: Number(formData.priceTier1), // Changed from 'price' to 'unit_price' to match DB schema
        // Note: Advanced fields will be ignored until schema is updated
      };

      console.log('💾 [Inventory] Item data to save:', itemData);

      if (editingItem) {
        console.log('🔄 [Inventory] Updating item:', editingItem.id);
        const result = await inventoryAPI.update(editingItem.id, itemData);
        console.log('✅ [Inventory] Update result:', result);
        showAlert('success', 'Item updated successfully');
      } else {
        console.log('➕ [Inventory] Creating new item...');
        const result = await inventoryAPI.create(itemData);
        console.log('✅ [Inventory] Create result:', result);
        showAlert('success', 'Item created successfully');
      }

      setShowDialog(false);
      setCurrentPage(1); // ✅ Reset to page 1 to see the new/updated item
      setSearchQuery(''); // ✅ Clear search to show all items
      setCategoryFilter('all'); // ✅ Clear category filter
      setStatusFilter('all'); // ✅ Clear status filter
      console.log('🔄 [Inventory] Reloading inventory...');
      await loadInventory(); // ✅ Reload all items
      console.log('✅ [Inventory] Save complete!');
    } catch (error) {
      console.error('❌ [Inventory] Failed to save item:', error);
      showAlert('error', 'Failed to save item');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      await inventoryAPI.delete(id);
      showAlert('success', 'Item deleted successfully');
      loadInventory();
    } catch (error) {
      console.error('Failed to delete item:', error);
      showAlert('error', 'Failed to delete item');
    }
  };

  const categories = [...new Set(items.map(item => item.category))].filter(Boolean);
  
  // Server-side filtering now, so filteredItems = items
  // const filteredItems = items;

  const lowStockItems = items.filter(item => 
    item.status === 'active' && item.quantityOnHand <= item.reorderLevel
  );

  const totalValue = items.reduce((sum, item) => sum + (item.quantityOnHand * item.cost), 0);
  const activeItems = items.filter(item => item.status === 'active').length;

  // Show database setup if table doesn't exist
  if (!tableExists && !isLoading) {
    return <DatabaseInit onComplete={loadInventory} currentUser={user} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
            <Package className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <h1 className="text-3xl text-gray-900">Inventory Management</h1>
            <p className="text-gray-600 mt-1">Track stock levels and multi-tier pricing {items.length > 1000 && '(All items loaded)'}</p>
          </div>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Add Item
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

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Items</p>
                <p className="text-2xl text-gray-900 mt-1">{items.length}</p>
              </div>
              <Package className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Items</p>
                <p className="text-2xl text-gray-900 mt-1">{activeItems}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Low Stock Alerts</p>
                <p className="text-2xl text-gray-900 mt-1">{lowStockItems.length}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Value</p>
                <p className="text-2xl text-gray-900 mt-1">${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="items">All Items</TabsTrigger>
          <TabsTrigger value="low-stock">
            Low Stock
            {lowStockItems.length > 0 && (
              <Badge className="ml-2 bg-yellow-100 text-yellow-700">{lowStockItems.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="items" className="space-y-4 mt-6">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {/* Search Mode Toggle */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-medium text-gray-700">Search</h3>
                    {useAdvancedSearch && (
                      <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                        <Sparkles className="h-3 w-3 mr-1" />
                        AI-Powered
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {useAdvancedSearch && (
                      <InventorySearchHelp onExampleClick={(query) => setSearchQuery(query)} />
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setUseAdvancedSearch(!useAdvancedSearch)}
                      className="text-xs"
                    >
                      {useAdvancedSearch ? (
                        <>
                          <Zap className="h-3 w-3 mr-1" />
                          Advanced: ON
                        </>
                      ) : (
                        'Basic Search'
                      )}
                    </Button>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder={useAdvancedSearch 
                        ? "Try: 'tools under $50', 'red paint in stock', 'screws or bolts'..." 
                        : "Search by name, SKU, or description..."
                      }
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setShowSuggestions(true);
                      }}
                      onFocus={() => setShowSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                      className="pl-10"
                    />
                    
                    {/* Search Suggestions */}
                    {showSuggestions && searchSuggestions.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg">
                        {searchSuggestions.map((suggestion, idx) => (
                          <button
                            key={idx}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 first:rounded-t-md last:rounded-b-md"
                            onClick={() => {
                              setSearchQuery(suggestion);
                              setShowSuggestions(false);
                            }}
                          >
                            <Search className="h-3 w-3 inline mr-2 text-gray-400" />
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="discontinued">Discontinued</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Search Info */}
              {useAdvancedSearch && searchQuery && (
                <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-md">
                  <p className="text-sm text-purple-900">
                    <Sparkles className="h-4 w-4 inline mr-1" />
                    <strong>AI Search Active:</strong> Using fuzzy matching, semantic understanding, and natural language processing
                  </p>
                  <p className="text-xs text-purple-700 mt-1">
                    Try: "tools under $50" • "red paint" • "low stock items" • "screws or bolts" • "cheap materials"
                  </p>
                </div>
              )}
            </div>
            </CardContent>
          </Card>

          {/* Search Results Summary */}
          {searchQuery && filteredItems.length > 0 && (
            <div className="flex items-center justify-between text-sm text-gray-600 px-2">
              <span>
                Found <strong>{filteredItems.length}</strong> {filteredItems.length === 1 ? 'item' : 'items'}
                {useAdvancedSearch && ' (sorted by relevance)'}
              </span>
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchQuery('')}
                  className="text-xs"
                >
                  Clear search
                </Button>
              )}
            </div>
          )}

          {/* Items List */}
          <div className="grid grid-cols-1 gap-4">
            {isLoading ? (
              <Card>
                <CardContent className="py-12 text-center text-gray-500">
                  Loading inventory...
                </CardContent>
              </Card>
            ) : filteredItems.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500">
                    {searchQuery ? 'No items match your search' : 'No inventory items found'}
                  </p>
                  {searchQuery && (
                    <p className="text-sm text-gray-400 mt-2">
                      Try using different keywords or{' '}
                      <button
                        onClick={() => setSearchQuery('')}
                        className="text-purple-600 hover:underline"
                      >
                        clear your search
                      </button>
                    </p>
                  )}
                  <Button className="mt-4" onClick={() => handleOpenDialog()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Item
                  </Button>
                </CardContent>
              </Card>
            ) : (
              filteredItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((item: any) => (
                <Card key={item.id} className={
                  item.quantityOnHand <= item.reorderLevel 
                    ? 'border-yellow-300' 
                    : (item._searchScore && item._searchScore > 0.8 ? 'border-purple-200' : '')
                }>
                  <CardContent className="pt-6">
                    <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                      {/* Left Section - Item Info */}
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-lg text-gray-900">{item.name}</h3>
                              <Badge variant="outline" className={
                                item.status === 'active' ? 'bg-green-50 text-green-700 border-green-200' :
                                item.status === 'inactive' ? 'bg-gray-50 text-gray-700 border-gray-200' :
                                'bg-red-50 text-red-700 border-red-200'
                              }>
                                {item.status}
                              </Badge>
                              {item.quantityOnHand <= item.reorderLevel && (
                                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  Low Stock
                                </Badge>
                              )}
                              {/* Search Match Indicators */}
                              {useAdvancedSearch && item._matchType && searchQuery && (
                                <Badge variant="outline" className={
                                  item._matchType === 'exact' ? 'bg-purple-100 text-purple-800 border-purple-300' :
                                  item._matchType === 'fuzzy' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                                  item._matchType === 'semantic' ? 'bg-green-100 text-green-800 border-green-300' :
                                  'bg-gray-100 text-gray-800 border-gray-300'
                                }>
                                  {item._matchType === 'exact' && '🎯 Exact'}
                                  {item._matchType === 'fuzzy' && '✨ Fuzzy'}
                                  {item._matchType === 'semantic' && '🧠 Smart'}
                                  {item._matchType === 'partial' && '📝 Match'}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mt-1">SKU: {item.sku}</p>
                            {item.description && (
                              <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                            )}
                            {/* Show matched fields for advanced search */}
                            {useAdvancedSearch && item._matchedFields && item._matchedFields.length > 0 && searchQuery && (
                              <p className="text-xs text-purple-600 mt-2">
                                <Sparkles className="h-3 w-3 inline mr-1" />
                                Matched in: {item._matchedFields.join(', ')}
                                {item._searchScore && (
                                  <span className="ml-2 text-purple-500">
                                    ({Math.round(item._searchScore * 100)}% relevant)
                                  </span>
                                )}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => handleOpenDialog(item)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleDelete(item.id)}>
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
                          <div>
                            <p className="text-xs text-gray-500">Category</p>
                            <p className="text-sm text-gray-900 mt-1">{item.category || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Quantity On Hand</p>
                            <p className="text-sm text-gray-900 mt-1">
                              {item.quantityOnHand} {item.unitOfMeasure}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Reorder Level</p>
                            <p className="text-sm text-gray-900 mt-1">{item.reorderLevel}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Cost</p>
                            <p className="text-sm text-gray-900 mt-1">${item.cost.toFixed(2)}</p>
                          </div>
                        </div>

                        {/* Additional Details */}
                        <div className="flex flex-wrap gap-4 mt-3">
                          {item.supplier && (
                            <div className="flex items-center gap-1 text-xs text-gray-600">
                              <Tag className="h-3 w-3" />
                              Supplier: {item.supplier}
                            </div>
                          )}
                          {item.location && (
                            <div className="flex items-center gap-1 text-xs text-gray-600">
                              <MapPin className="h-3 w-3" />
                              {item.location}
                            </div>
                          )}
                          {item.barcode && (
                            <div className="flex items-center gap-1 text-xs text-gray-600">
                              <Barcode className="h-3 w-3" />
                              {item.barcode}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right Section - Pricing Tiers */}
                      <div className="lg:w-80 border-l-0 lg:border-l lg:pl-4">
                        <p className="text-sm text-gray-700 mb-2">Price Tiers</p>
                        <div className="grid grid-cols-5 gap-2">
                          {[1, 2, 3, 4, 5].map(tier => (
                            <div key={tier} className="text-center">
                              <div className="bg-gray-100 rounded px-2 py-1">
                                <p className="text-xs text-gray-600">T{tier}</p>
                                <p className="text-sm text-gray-900 mt-1">
                                  ${item[`priceTier${tier}` as keyof InventoryItem]?.toFixed(2) || '0.00'}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="mt-3 p-2 bg-blue-50 rounded text-xs text-blue-700">
                          Margin: {item.cost > 0 ? ((item.priceTier1 - item.cost) / item.cost * 100).toFixed(1) : 0}%
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Pagination */}
          {filteredItems.length > itemsPerPage && (
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-4">
                <div className="text-sm text-gray-600">
                  Showing {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredItems.length)} of {filteredItems.length} items
                </div>
                <Select value={itemsPerPage.toString()} onValueChange={(value) => {
                  setItemsPerPage(Number(value));
                  setCurrentPage(1); // Reset to first page when changing items per page
                }}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="25">25 / page</SelectItem>
                    <SelectItem value="50">50 / page</SelectItem>
                    <SelectItem value="100">100 / page</SelectItem>
                    <SelectItem value="200">200 / page</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(1)}
                >
                  First
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(currentPage - 1)}
                >
                  Previous
                </Button>
                
                {/* Page numbers */}
                <div className="hidden sm:flex items-center gap-1">
                  {(() => {
                    const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
                    const pages = [];
                    const maxVisible = 5;
                    
                    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
                    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
                    
                    if (endPage - startPage < maxVisible - 1) {
                      startPage = Math.max(1, endPage - maxVisible + 1);
                    }
                    
                    if (startPage > 1) {
                      pages.push(
                        <Button
                          key={1}
                          variant="outline"
                          size="sm"
                          className={currentPage === 1 ? 'bg-blue-50 border-blue-300' : ''}
                          onClick={() => setCurrentPage(1)}
                        >
                          1
                        </Button>
                      );
                      if (startPage > 2) {
                        pages.push(<span key="ellipsis1" className="px-2">...</span>);
                      }
                    }
                    
                    for (let i = startPage; i <= endPage; i++) {
                      pages.push(
                        <Button
                          key={i}
                          variant="outline"
                          size="sm"
                          className={currentPage === i ? 'bg-blue-50 border-blue-300' : ''}
                          onClick={() => setCurrentPage(i)}
                        >
                          {i}
                        </Button>
                      );
                    }
                    
                    if (endPage < totalPages) {
                      if (endPage < totalPages - 1) {
                        pages.push(<span key="ellipsis2" className="px-2">...</span>);
                      }
                      pages.push(
                        <Button
                          key={totalPages}
                          variant="outline"
                          size="sm"
                          className={currentPage === totalPages ? 'bg-blue-50 border-blue-300' : ''}
                          onClick={() => setCurrentPage(totalPages)}
                        >
                          {totalPages}
                        </Button>
                      );
                    }
                    
                    return pages;
                  })()}
                </div>
                
                <span className="mx-2 text-sm sm:hidden">
                  Page {currentPage} of {Math.ceil(filteredItems.length / itemsPerPage)}
                </span>
                
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage * itemsPerPage >= filteredItems.length}
                  onClick={() => setCurrentPage(currentPage + 1)}
                >
                  Next
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage * itemsPerPage >= filteredItems.length}
                  onClick={() => setCurrentPage(Math.ceil(filteredItems.length / itemsPerPage))}
                >
                  Last
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="low-stock" className="space-y-4 mt-6">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              The following items are at or below their reorder level and may need restocking.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 gap-4">
            {lowStockItems.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500" />
                  <p className="text-gray-500">All items are properly stocked!</p>
                </CardContent>
              </Card>
            ) : (
              lowStockItems.map(item => (
                <Card key={item.id} className="border-yellow-300">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-5 w-5 text-yellow-600" />
                          <h3 className="text-lg text-gray-900">{item.name}</h3>
                          <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
                            Low Stock
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">SKU: {item.sku}</p>
                        <div className="flex gap-6 mt-3">
                          <div>
                            <p className="text-xs text-gray-500">Current Stock</p>
                            <p className="text-sm text-gray-900 mt-1">{item.quantityOnHand} {item.unitOfMeasure}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Reorder Level</p>
                            <p className="text-sm text-gray-900 mt-1">{item.reorderLevel}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Supplier</p>
                            <p className="text-sm text-gray-900 mt-1">{item.supplier || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Lead Time</p>
                            <p className="text-sm text-gray-900 mt-1">{item.leadTimeDays || 0} days</p>
                          </div>
                        </div>
                      </div>
                      <Button onClick={() => handleOpenDialog(item)}>Update Stock</Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit Item' : 'Add New Item'}</DialogTitle>
            <DialogDescription>
              {editingItem ? 'Update the details of an existing inventory item.' : 'Add a new item to your inventory.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-sm text-gray-900">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-700">Item Name *</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter item name"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-700">SKU *</label>
                  <Input
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    placeholder="Enter SKU"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-700">Category</label>
                  <Input
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="Enter category"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-700">Unit of Measure</label>
                  <Select value={formData.unitOfMeasure} onValueChange={(value) => setFormData({ ...formData, unitOfMeasure: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ea">Each (ea)</SelectItem>
                      <SelectItem value="box">Box</SelectItem>
                      <SelectItem value="case">Case</SelectItem>
                      <SelectItem value="lb">Pound (lb)</SelectItem>
                      <SelectItem value="kg">Kilogram (kg)</SelectItem>
                      <SelectItem value="ft">Foot (ft)</SelectItem>
                      <SelectItem value="m">Meter (m)</SelectItem>
                      <SelectItem value="gal">Gallon (gal)</SelectItem>
                      <SelectItem value="l">Liter (l)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm text-gray-700">Description</label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Enter item description"
                    rows={2}
                  />
                </div>
              </div>
            </div>

            {/* Stock Information */}
            <div className="space-y-4">
              <h3 className="text-sm text-gray-900">Stock Information</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-sm text-gray-700">Quantity On Hand</label>
                  <Input
                    type="number"
                    value={formData.quantityOnHand}
                    onChange={(e) => setFormData({ ...formData, quantityOnHand: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-700">Quantity On Order</label>
                  <Input
                    type="number"
                    value={formData.quantityOnOrder}
                    onChange={(e) => setFormData({ ...formData, quantityOnOrder: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-700">Reorder Level</label>
                  <Input
                    type="number"
                    value={formData.reorderLevel}
                    onChange={(e) => setFormData({ ...formData, reorderLevel: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-700">Min Stock</label>
                  <Input
                    type="number"
                    value={formData.minStock}
                    onChange={(e) => setFormData({ ...formData, minStock: Number(e.target.value) })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-700">Max Stock</label>
                  <Input
                    type="number"
                    value={formData.maxStock}
                    onChange={(e) => setFormData({ ...formData, maxStock: Number(e.target.value) })}
                  />
                </div>
              </div>
            </div>

            {/* Pricing Information */}
            <div className="space-y-4">
              <h3 className="text-sm text-gray-900">Pricing (Multi-Tier)</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm text-gray-700">Cost (Base)</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.cost}
                    onChange={(e) => setFormData({ ...formData, cost: Number(e.target.value) })}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-700">Tier 1 Price</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.priceTier1}
                    onChange={(e) => setFormData({ ...formData, priceTier1: Number(e.target.value) })}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-700">Tier 2 Price</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.priceTier2}
                    onChange={(e) => setFormData({ ...formData, priceTier2: Number(e.target.value) })}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-700">Tier 3 Price</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.priceTier3}
                    onChange={(e) => setFormData({ ...formData, priceTier3: Number(e.target.value) })}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-700">Tier 4 Price</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.priceTier4}
                    onChange={(e) => setFormData({ ...formData, priceTier4: Number(e.target.value) })}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-700">Tier 5 Price</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.priceTier5}
                    onChange={(e) => setFormData({ ...formData, priceTier5: Number(e.target.value) })}
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>

            {/* Supplier Information */}
            <div className="space-y-4">
              <h3 className="text-sm text-gray-900">Supplier Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm text-gray-700">Supplier</label>
                  <Input
                    value={formData.supplier}
                    onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                    placeholder="Supplier name"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-700">Supplier SKU</label>
                  <Input
                    value={formData.supplierSKU}
                    onChange={(e) => setFormData({ ...formData, supplierSKU: e.target.value })}
                    placeholder="Supplier SKU"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-700">Lead Time (days)</label>
                  <Input
                    type="number"
                    value={formData.leadTimeDays}
                    onChange={(e) => setFormData({ ...formData, leadTimeDays: Number(e.target.value) })}
                  />
                </div>
              </div>
            </div>

            {/* Additional Details */}
            <div className="space-y-4">
              <h3 className="text-sm text-gray-900">Additional Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm text-gray-700">Barcode/UPC</label>
                  <Input
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    placeholder="Enter barcode"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-700">Location/Bin</label>
                  <Input
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="e.g., Aisle 5, Bin 12"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-700">Status</label>
                  <Select value={formData.status} onValueChange={(value: any) => setFormData({ ...formData, status: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="discontinued">Discontinued</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-3">
                  <label className="text-sm text-gray-700">Tags (comma-separated)</label>
                  <Input
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    placeholder="e.g., electronics, featured, on-sale"
                  />
                </div>
                <div className="md:col-span-3">
                  <label className="text-sm text-gray-700">Notes</label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Additional notes about this item"
                    rows={3}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-6 pt-6 border-t">
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editingItem ? 'Update Item' : 'Create Item'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}