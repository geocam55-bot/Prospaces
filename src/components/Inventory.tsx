import { useState, useEffect, useMemo, useTransition, useDeferredValue, useRef } from 'react';
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
  Upload,
  Clipboard,
  X,
  Loader2,
} from 'lucide-react';
import { inventoryAPI } from '../utils/api';
import type { User } from '../App';
import { DatabaseInit } from './DatabaseInit';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { advancedSearch, getSearchSuggestions } from '../utils/advanced-search';
import { InventorySearchHelp } from './InventorySearchHelp';
import { useDebounce } from '../utils/useDebounce';
import { createClient } from '../utils/supabase/client';
import { ensureUserProfile } from '../utils/ensure-profile';
import { InventoryOptimizationBanner } from './InventoryOptimizationBanner';
import { InventoryDuplicateCleaner } from './InventoryDuplicateCleaner';
import { InventoryIndexFixer } from './InventoryIndexFixer';
import { loadInventoryPage } from '../utils/inventory-loader';
import { showOptimizationInstructions } from '../utils/show-optimization-instructions';
import { getPriceTierLabel, isTierActive, getActiveTierNumbers } from '../lib/global-settings';
import { InventoryDiagnostic } from './InventoryDiagnostic';

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
  departmentCode?: string;
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
  const [organizationId, setOrganizationId] = useState<string | null>(null);
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
  
  // ⚡ Performance optimization: Track if search is computing
  const [isSearching, setIsSearching] = useState(false);
  const [, startTransition] = useTransition();
  
  // ⚡ Performance tracking
  const [loadTimeMs, setLoadTimeMs] = useState(0);
  
  // ⚡ Track if background loading is in progress to prevent duplicates
  const loadingRef = useRef(false);
  
  // ⚡ Track total count for pagination
  const [totalCount, setTotalCount] = useState(0);
  
  // 📊 Track total value from server (for all filtered results)
  const [serverTotalValue, setServerTotalValue] = useState(0);
  
  // 📊 Track low stock count from server (qty <= 0, across all pages)
  const [serverLowStockCount, setServerLowStockCount] = useState(0);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category: '',
    description: '',
    unitOfMeasure: 'ea',
    priceLevels: '',
    departmentCode: '',
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

  // Access token for image uploads
  const [accessToken, setAccessToken] = useState<string | null>(null);

  // 🚀 Debounce search query for suggestions (300ms delay)
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  
  // ✅ Use deferred value to prevent search input from blocking during large renders
  const deferredSearchQuery = useDeferredValue(searchQuery);

  useEffect(() => {
    // Get access token for image uploads
    const getAccessToken = async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        setAccessToken(session.access_token);
      }
    };
    getAccessToken();
    
    loadInventory();
  }, [currentPage, itemsPerPage, debouncedSearchQuery, categoryFilter, statusFilter]);

  // ⚡ Server-side filtering is now active - items are already filtered
  // No need for client-side filtering since loadInventoryPage handles it
  const filteredItems = items;
  
  // 🔮 Generate search suggestions (debounced to reduce calculations)
  useEffect(() => {
    if (debouncedSearchQuery.length >= 2) {
      const suggestions = getSearchSuggestions(items, debouncedSearchQuery, 5);
      setSearchSuggestions(suggestions);
    } else {
      setSearchSuggestions([]);
    }
  }, [debouncedSearchQuery, items]);

  const supabase = createClient();

  // Helper to map database items
  const mapInventoryItem = (dbItem: any): InventoryItem => {
    const unitPriceInDollars = dbItem.unit_price ? dbItem.unit_price / 100 : 0;
    const costInDollars = dbItem.cost ? dbItem.cost / 100 : 0;
    
    // ✅ FIX: Use != null check instead of truthiness to properly handle $0.00 prices
    // A value of 0 is a legitimate price ($0.00) and should NOT trigger fallback
    
    // Auto-migrate: if T5 is inactive but has data, carry it into T2 (VIP) if T2 is NULL or 0.
    const t5Inactive = !isTierActive(5);
    const t5Value = dbItem.price_tier_5 != null ? dbItem.price_tier_5 : null;
    
    // Determine the base/retail price (T1 or unit_price)
    const priceTier1 = dbItem.price_tier_1 != null ? dbItem.price_tier_1 / 100 : unitPriceInDollars;
    
    // For T2-T4: if the tier is NULL in the DB, fall back to priceTier1 (Retail).
    // Business logic: if no specific tier price is set, the item sells at Retail.
    // A value of 0 in the DB is a legitimate $0.00 price and is preserved as-is.
    // T2 (VIP): also check inactive T5 for auto-migration
    // ✅ FIX: Also migrate when T2 is 0 (not just NULL) if T5 has a real non-zero value.
    // This handles the case where a previous import put VIP data into price_tier_5.
    const shouldMigrateT5toT2 = t5Inactive && t5Value != null && t5Value !== 0
      && (dbItem.price_tier_2 == null || dbItem.price_tier_2 === 0);
    const priceTier2 = shouldMigrateT5toT2 ? t5Value / 100
                     : dbItem.price_tier_2 != null ? dbItem.price_tier_2 / 100
                     : priceTier1;
    const priceTier3 = dbItem.price_tier_3 != null ? dbItem.price_tier_3 / 100 : priceTier1;
    const priceTier4 = dbItem.price_tier_4 != null ? dbItem.price_tier_4 / 100 : priceTier1;
    // T5: if tier is inactive, always default to 0 regardless of DB value
    const priceTier5 = t5Inactive ? 0 : (dbItem.price_tier_5 != null ? dbItem.price_tier_5 / 100 : priceTier1);
    
    return {
      id: dbItem.id,
      name: dbItem.name || '',
      sku: dbItem.sku || '',
      category: dbItem.category || '',
      description: dbItem.description || '',
      unitOfMeasure: dbItem.unit_of_measure || 'ea',
      quantityOnHand: dbItem.quantity || 0,
      quantityOnOrder: dbItem.quantity_on_order || 0,
      reorderLevel: 0,
      minStock: 0,
      maxStock: 0,
      cost: costInDollars,
      priceTier1,
      priceTier2,
      priceTier3,
      priceTier4,
      priceTier5,
      departmentCode: dbItem.department_code || '',
      status: 'active',
      tags: [],
      imageUrl: dbItem.image_url || '',
      createdAt: dbItem.created_at || '',
      updatedAt: dbItem.updated_at || '',
    };
  };

  // ⚡ Load remaining items in background without blocking UI
  const loadRemainingItems = async (userOrgId: string, totalCount: number) => {
    // Prevent duplicate loading
    if (loadingRef.current) {
      console.log('⏭️ Background loading already in progress, skipping...');
      return;
    }
    
    loadingRef.current = true;
    
    try {
      let offset = 200; // Start after first batch
      const batchSize = 1000;
      
      while (offset < totalCount) {
        const batchQuery = supabase
          .from('inventory')
          .select('id, name, sku, description, category, quantity, quantity_on_order, unit_price, cost, price_tier_1, price_tier_2, price_tier_3, price_tier_4, price_tier_5, department_code, unit_of_measure, image_url, organization_id, created_at, updated_at')
          .eq('organization_id', userOrgId)
          .order('name', { ascending: true })
          .range(offset, offset + batchSize - 1);
        
        const { data: batchData, error: batchError } = await batchQuery;
        
        if (batchError) {
          console.error('❌ Error loading batch:', batchError);
          break;
        }
        
        if (batchData && batchData.length > 0) {
          console.log(`📦 Background: Loaded ${batchData.length} items (${offset + batchData.length}/${totalCount})`);
          
          // Update items progressively (non-blocking) with deduplication
          setItems(prevItems => {
            const newItems = batchData.map(mapInventoryItem);
            
            // Create a Map to deduplicate by ID
            const itemMap = new Map<string, any>();
            
            // Add existing items first
            prevItems.forEach(item => {
              itemMap.set(item.id, item);
            });
            
            // Add/update with new items
            newItems.forEach(item => {
              itemMap.set(item.id, item);
            });
            
            // Convert back to array
            const uniqueItems = Array.from(itemMap.values());
            console.log(`📊 [Background] Total unique items: ${uniqueItems.length} (was ${prevItems.length}, added ${newItems.length})`);
            return uniqueItems;
          });
          
          offset += batchData.length;
          
          // Add small delay to prevent blocking (allows UI to remain responsive)
          await new Promise(resolve => setTimeout(resolve, 50));
        } else {
          break;
        }
      }
      
      console.log(`✅ [Inventory] Background loading complete!`);
    } catch (error) {
      console.error('❌ Error in background loading:', error);
    } finally {
      loadingRef.current = false;
    }
  };

  const loadInventory = async () => {
    const startTime = performance.now();
    
    // Reset background loading flag on fresh load
    loadingRef.current = false;
    
    try {
      setIsLoading(true);
      console.log(`🔄 [Inventory] Loading page ${currentPage} with ${itemsPerPage} items per page...`);
      
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      if (authError || !authUser) {
        console.error('❌ User not authenticated:', authError?.message || 'No user found');
        setIsLoading(false);
        setTableExists(false);
        showAlert('error', 'Please log in to access inventory');
        return;
      }
      
      const profile = await ensureUserProfile(authUser.id);
      const userOrgId = profile.organization_id;
      
      if (!userOrgId) {
        console.error('❌ No organization_id found for user!');
        console.error('ℹ️ User profile:', profile);
        setIsLoading(false);
        setTableExists(false);
        showAlert('error', 'Your account is not assigned to an organization. Please contact your administrator.');
        return;
      }
      
      // Save organization ID for duplicate cleaner
      setOrganizationId(userOrgId);
      
      // ⚡ Use the optimized loader with proper pagination
      const { items: loadedItems, totalCount: count, loadTime, totalValue, lowStockCount: serverLowStock } = await loadInventoryPage({
        organizationId: userOrgId,
        currentPage,
        itemsPerPage,
        searchQuery: debouncedSearchQuery, // Use debounced search for server-side filtering
        categoryFilter,
        statusFilter
      });
      
      // Map the loaded items
      const mappedItems = loadedItems.map(mapInventoryItem);
      
      console.log(`📊 [Inventory] Loaded ${mappedItems.length} items (page ${currentPage}/${Math.ceil(count / itemsPerPage)}, total: ${count})`);
      setItems(mappedItems);
      setTotalCount(count);
      setServerTotalValue(totalValue || 0); // 📊 Store server-calculated total value
      setServerLowStockCount(serverLowStock || 0); // 📊 Store server-calculated low stock count
      setTableExists(true);
      setIsLoading(false);
      
      // Track load time
      setLoadTimeMs(loadTime);
      
      console.log(`✅ [Inventory] Loaded page ${currentPage} in ${loadTime.toFixed(0)}ms`);
      
      // Show optimization instructions if critically slow (not for 1-2s loads)
      if (loadTime > 5000 && count > 1000 && currentPage === 1) {
        console.warn(`⚠️ Slow inventory performance detected: ${(loadTime / 1000).toFixed(1)}s for first page`);
        showOptimizationInstructions();
      }
      
      // Log performance metrics for monitoring
      if (currentPage === 1) {
        if (loadTime < 2000) {
          console.log(`✅ [Inventory] Excellent performance: ${loadTime.toFixed(0)}ms for ${count} items`);
        } else if (loadTime < 5000) {
          console.info(`ℹ️ [Inventory] Acceptable performance: ${(loadTime / 1000).toFixed(1)}s for ${count} items - Consider adding indexes for faster loads`);
        }
      }
      
      // ⚡ Log pagination info on first page
      if (currentPage === 1 && count > 0) {
        console.log(`✅ [Inventory] Server-side pagination active - showing page 1 of ${Math.ceil(count / itemsPerPage)}`);
        // Note: Duplicate detection is now handled by the always-mounted InventoryDuplicateCleaner component
        // which uses the server-side dedup-scan endpoint (no client-side 78K+ SKU fetch)
      }
      
    } catch (error: any) {
      console.error('❌ [Inventory] Failed to load inventory:', error?.message || error);
      if (error?.code) {
        console.error('❌ Error code:', error.code);
      }
      
      if (error?.code === 'PGRST205' || error?.message?.includes('Could not find the table') || error?.message?.includes('relation "inventory" does not exist')) {
        setTableExists(false);
        showAlert('error', 'Inventory table not found. Please contact your administrator.');
      } else if (error?.message?.includes('organization')) {
        showAlert('error', 'Organization access error. Please contact your administrator.');
      } else {
        const errorMsg = error?.message || 'Failed to load inventory items';
        showAlert('error', errorMsg.length > 100 ? 'Failed to load inventory items' : errorMsg);
      }
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
        priceLevels: (item as any).priceLevels || '',
        departmentCode: (item as any).departmentCode || '',
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
        priceLevels: '',
        departmentCode: '',
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

  // Helper function to convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  // Handle image upload from file
  const handleImageUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (!accessToken) {
      toast.error('Authentication required to upload images');
      return;
    }

    const loadingToast = toast.loading('Uploading image...');

    try {
      // Convert file to base64
      const base64 = await fileToBase64(file);
      
      // Upload to server
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-8405be07/upload-image`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageData: base64,
          fileName: file.name,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      const { url } = await response.json();
      
      // Update form data with permanent URL
      setFormData(prev => ({ ...prev, imageUrl: url }));
      toast.success('Image uploaded successfully', { id: loadingToast });
    } catch (error) {
      console.error('Failed to upload image:', error);
      toast.error(`Failed to upload image: ${error.message}`, { id: loadingToast });
    }
  };

  // Handle image paste
  const handleImagePaste = async (event: React.ClipboardEvent) => {
    const items = event.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        event.preventDefault();
        const file = items[i].getAsFile();
        if (file) {
          await handleImageUpload(file);
        }
        break;
      }
    }
  };

  const handleSave = async () => {
    try {
      console.log('💾 [Inventory] handleSave - Starting save...');
      console.log('💾 [Inventory] Form data:', formData);
      console.log('💾 [Inventory] Editing item:', editingItem);
      
      // ✅ Validate required fields
      if (!formData.name || formData.name.trim() === '') {
        showAlert('error', 'Missing required field: Item Name');
        return;
      }
      
      if (!formData.sku || formData.sku.trim() === '') {
        showAlert('error', 'Missing required field: SKU');
        return;
      }
      
      // ✅ FIX: Match the actual database schema with ALL columns including price tiers
      const itemData: any = {
        name: formData.name.trim(),
        sku: formData.sku.trim(),
        description: formData.description || '',
        category: formData.category || '',
        quantity: Number(formData.quantityOnHand) || 0,
        quantity_on_order: Number(formData.quantityOnOrder) || 0,
        unit_price: Number(formData.priceTier1) || 0,
        cost: Number(formData.cost) || 0,
        price_tier_1: Number(formData.priceTier1) || 0,
        price_tier_2: Number(formData.priceTier2) || 0,
        price_tier_3: Number(formData.priceTier3) || 0,
        price_tier_4: Number(formData.priceTier4) || 0,
        price_tier_5: Number(formData.priceTier5) || 0,
        department_code: formData.departmentCode || '',
        unit_of_measure: formData.unitOfMeasure || 'ea',
        image_url: formData.imageUrl || '',
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

  // 📊 KPI stats — all from server-side queries (accurate across ALL pages, not just current page)
  // Low stock items on current page (for the low-stock tab listing)
  const lowStockItems = items.filter(item => 
    item.quantityOnHand <= 0
  );

  // ✅ Use server-calculated total value (paginated aggregate, handles 78K+ items)
  const totalValue = serverTotalValue;
  
  // ✅ Use totalCount for display (server-side exact count, not page-limited)
  const displayTotalItems = totalCount > 0 ? totalCount : items.length;
  // ✅ FIX: "In Stock" shows items with quantity > 0 across ALL items, not just current page
  // Since there's no status column in the DB, all items are "active".
  // The meaningful KPI is: total items minus out-of-stock items.
  const displayInStockItems = totalCount > 0 ? totalCount - serverLowStockCount : items.length;
  // ✅ FIX: Low stock count from server (qty <= 0 across ALL pages, not just current page's 50 items)
  const displayLowStockCount = serverLowStockCount;

  // Show database setup if table doesn't exist
  if (!tableExists && !isLoading) {
    return <DatabaseInit onComplete={loadInventory} currentUser={user} />;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center justify-end gap-3">
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Add Item
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Items</p>
                <p className="text-2xl text-gray-900 mt-1">{displayTotalItems.toLocaleString()}</p>
              </div>
              <Package className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">In Stock</p>
                <p className="text-2xl text-gray-900 mt-1">{displayInStockItems.toLocaleString()}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Out of Stock</p>
                <p className="text-2xl text-gray-900 mt-1">{displayLowStockCount.toLocaleString()}</p>
              </div>
              <AlertTriangle className={`h-8 w-8 ${displayLowStockCount > 0 ? 'text-red-600' : 'text-yellow-600'}`} />
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
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <TabsList className="inline-flex w-auto min-w-full">
            <TabsTrigger value="items" className="whitespace-nowrap">All Items</TabsTrigger>
            <TabsTrigger value="low-stock" className="whitespace-nowrap">
              Out of Stock
              {displayLowStockCount > 0 && (
                <Badge className="ml-2 bg-red-100 text-red-700">{displayLowStockCount.toLocaleString()}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="diagnostic" className="whitespace-nowrap">
              Diagnostic
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="items" className="space-y-4 mt-6">
          {/* Database Performance Fix - Show prominently if slow */}
          {loadTimeMs > 5000 && (
            <InventoryIndexFixer />
          )}
          
          {/* Performance Optimization Banner - Only show if not critically slow */}
          {loadTimeMs > 0 && loadTimeMs <= 5000 && (
            <InventoryOptimizationBanner 
              organizationId={user.organizationId}
              itemCount={items.length}
              loadTimeMs={loadTimeMs}
            />
          )}
          
          {/* Duplicate Cleaner — always mounted; self-hides if no duplicates */}
          {organizationId && (
            <InventoryDuplicateCleaner
              organizationId={organizationId}
              onCleanupComplete={() => {
                loadInventory();
              }}
            />
          )}
          
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
          {searchQuery && totalCount > 0 && (
            <div className="flex items-center justify-between text-sm text-gray-600 px-2">
              <span>
                Found <strong>{totalCount}</strong> {totalCount === 1 ? 'item' : 'items'}
                {useAdvancedSearch && ' (server-side search)'}
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
              filteredItems.map((item: any) => (
                <Card key={item.id} className={
                  item.quantityOnHand <= 0
                    ? 'border-red-300' 
                    : (item._searchScore && item._searchScore > 0.8 ? 'border-purple-200' : '')
                }>
                  <CardContent className="pt-6">
                    <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                      {/* Product Image */}
                      <div className="w-full lg:w-32 h-32 flex-shrink-0">
                        {item.imageUrl ? (
                          <img 
                            src={item.imageUrl} 
                            alt={item.name} 
                            className="w-full h-full object-contain rounded border bg-gray-50" 
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center rounded border bg-gray-100">
                            <ImageIcon className="h-12 w-12 text-gray-300" />
                          </div>
                        )}
                      </div>
                      
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
                              {item.quantityOnHand <= 0 && (
                                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  Out of Stock
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
                        {(() => {
                          const activeTiers = getActiveTierNumbers();
                          const gridCols = activeTiers.length <= 2 ? 'grid-cols-2' : activeTiers.length === 3 ? 'grid-cols-3' : activeTiers.length === 4 ? 'grid-cols-4' : 'grid-cols-5';
                          return (
                        <div className={`grid ${gridCols} gap-2`}>
                          {activeTiers.map((tier) => {
                            const label = getPriceTierLabel(tier);
                            const tierValue = item[`priceTier${tier}` as keyof InventoryItem] as number;
                            const activeTierValues = activeTiers.map(t => item[`priceTier${t}` as keyof InventoryItem] as number);
                            const allSame = activeTierValues.every(v => v === activeTierValues[0]);
                            const isDistinct = !allSame && tier > activeTiers[0] && tierValue !== item.priceTier1;
                            return (
                              <div key={tier} className="text-center">
                                <div className={`rounded px-2 py-1 ${
                                  isDistinct ? 'bg-green-50 border border-green-200' : 'bg-gray-100'
                                }`}>
                                  <p className={`text-xs ${isDistinct ? 'text-green-700 font-medium' : 'text-gray-600'}`} title={`T${tier} — ${label}`}>{label}</p>
                                  <p className={`text-sm mt-1 ${
                                    isDistinct ? 'text-green-900 font-semibold' : 'text-gray-900'
                                  }`}>
                                    {`$${tierValue?.toFixed(2) || '0.00'}`}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                          );
                        })()}
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
          {totalCount > itemsPerPage && (
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-4">
                <div className="text-sm text-gray-600">
                  Showing {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} items
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
                    const totalPages = Math.ceil(totalCount / itemsPerPage);
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
                  Page {currentPage} of {Math.ceil(totalCount / itemsPerPage)}
                </span>
                
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage * itemsPerPage >= totalCount}
                  onClick={() => setCurrentPage(currentPage + 1)}
                >
                  Next
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage * itemsPerPage >= totalCount}
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
              Items with zero or negative quantity on hand.
              {displayLowStockCount > lowStockItems.length && (
                <span className="ml-1 font-medium">
                  Showing {lowStockItems.length} on this page — {displayLowStockCount.toLocaleString()} total across all pages.
                </span>
              )}
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 gap-4">
            {lowStockItems.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  {displayLowStockCount > 0 ? (
                    <>
                      <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-yellow-500" />
                      <p className="text-gray-500">{displayLowStockCount.toLocaleString()} out-of-stock items exist but none are on this page.</p>
                      <p className="text-sm text-gray-400 mt-1">Try searching or browsing other pages to find them.</p>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500" />
                      <p className="text-gray-500">All items are properly stocked!</p>
                    </>
                  )}
                </CardContent>
              </Card>
            ) : (
              lowStockItems.map(item => (
                <Card key={item.id} className="border-red-300">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-5 w-5 text-red-600" />
                          <h3 className="text-lg text-gray-900">{item.name}</h3>
                          <Badge variant="outline" className="bg-red-50 text-red-700">
                            Out of Stock
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">SKU: {item.sku}</p>
                        <div className="flex gap-6 mt-3">
                          <div>
                            <p className="text-xs text-gray-500">Current Stock</p>
                            <p className="text-sm text-red-600 font-medium mt-1">{item.quantityOnHand} {item.unitOfMeasure}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Category</p>
                            <p className="text-sm text-gray-900 mt-1">{item.category || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Cost</p>
                            <p className="text-sm text-gray-900 mt-1">${item.cost.toFixed(2)}</p>
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

        <TabsContent value="diagnostic" className="space-y-4 mt-6">
          <InventoryDiagnostic user={user} />
        </TabsContent>
      </Tabs>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white" onPaste={handleImagePaste}>
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
              <p className="text-xs text-gray-500">Tier 1 is also used as the base Unit Price. Set each tier independently for tiered pricing.</p>
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
                {getActiveTierNumbers().map(tier => {
                  const tierKey = `priceTier${tier}` as keyof typeof formData;
                  return (
                    <div key={tier}>
                      <label className="text-sm text-gray-700">T{tier} — {getPriceTierLabel(tier)}</label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData[tierKey] as number}
                        onChange={(e) => setFormData({ ...formData, [tierKey]: Number(e.target.value) })}
                        placeholder="0.00"
                      />
                    </div>
                  );
                })}
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
                <div>
                  <label className="text-sm text-gray-700">Price Levels</label>
                  <Input
                    value={formData.priceLevels}
                    onChange={(e) => setFormData({ ...formData, priceLevels: e.target.value })}
                    placeholder="Enter price levels"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-700">Department Code</label>
                  <Input
                    value={formData.departmentCode}
                    onChange={(e) => setFormData({ ...formData, departmentCode: e.target.value })}
                    placeholder="Enter department code"
                  />
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

            {/* Product Image */}
            <div className="space-y-4">
              <h3 className="text-sm text-gray-900">Product Image</h3>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <label className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload(file);
                      }}
                      className="hidden"
                    />
                    <Button 
                      variant="outline" 
                      className="w-full" 
                      type="button" 
                      onClick={(e) => {
                        const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                        input?.click();
                      }}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Image
                    </Button>
                  </label>
                  <Button 
                    variant="outline" 
                    type="button"
                    onClick={() => {
                      toast.info('Press Ctrl+V (or Cmd+V on Mac) to paste an image');
                    }}
                    title="Paste image from clipboard"
                  >
                    <Clipboard className="h-4 w-4" />
                  </Button>
                </div>
                {formData.imageUrl && (
                  <div className="relative mt-2">
                    <img 
                      src={formData.imageUrl} 
                      alt="Product" 
                      className="w-full h-48 object-contain rounded border bg-gray-50" 
                    />
                    <Button
                      size="sm"
                      variant="destructive"
                      className="absolute top-2 right-2"
                      onClick={() => setFormData(prev => ({ ...prev, imageUrl: '' }))}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}
                <p className="text-xs text-gray-500">
                  Upload an image or paste from clipboard (Ctrl+V / Cmd+V)
                </p>
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