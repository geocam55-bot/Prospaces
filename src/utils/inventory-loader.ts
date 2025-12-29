import { createClient } from './supabase/client';

const supabase = createClient();

export interface LoadInventoryOptions {
  organizationId: string;
  currentPage: number;
  itemsPerPage: number;
  searchQuery?: string;
  categoryFilter?: string;
  statusFilter?: string;
}

export interface LoadInventoryResult {
  items: any[];
  totalCount: number;
  loadTime: number;
}

/**
 * ⚡ Optimized server-side paginated inventory loader
 * Only loads the current page of items - MUCH faster than loading all 35k+ items
 */
export async function loadInventoryPage(options: LoadInventoryOptions): Promise<LoadInventoryResult> {
  const startTime = performance.now();
  const { organizationId, currentPage, itemsPerPage, searchQuery, categoryFilter, statusFilter } = options;
  
  try {
    // Calculate pagination range
    const from = (currentPage - 1) * itemsPerPage;
    const to = from + itemsPerPage - 1;
    
    // Build query with server-side filtering
    let query = supabase
      .from('inventory')
      .select('id, name, sku, description, category, quantity, quantity_on_order, unit_price, cost, organization_id, created_at, updated_at', { count: 'exact' })
      .eq('organization_id', organizationId);
    
    // ⚡ Server-side search filtering (much faster than client-side)
    if (searchQuery && searchQuery.trim()) {
      const search = searchQuery.trim();
      query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%,description.ilike.%${search}%,category.ilike.%${search}%`);
    }
    
    // ⚡ Server-side category filtering
    if (categoryFilter && categoryFilter !== 'all') {
      query = query.eq('category', categoryFilter);
    }
    
    // Apply sorting and pagination
    query = query
      .order('name', { ascending: true })
      .range(from, to);
    
    const { data, error, count } = await query;
    
    if (error) {
      console.error('❌ Error loading inventory:', error);
      throw error;
    }
    
    const endTime = performance.now();
    const loadTime = endTime - startTime;
    
    console.log(`✅ [Inventory Loader] Loaded ${data?.length || 0} items (page ${currentPage}, total: ${count}) in ${loadTime.toFixed(0)}ms`);
    
    return {
      items: data || [],
      totalCount: count || 0,
      loadTime,
    };
  } catch (error) {
    const endTime = performance.now();
    throw error;
  }
}

/**
 * Check for duplicate SKUs in the database (runs async without blocking UI)
 */
export async function checkForDuplicates(organizationId: string): Promise<number> {
  try {
    const { data } = await supabase
      .from('inventory')
      .select('sku')
      .eq('organization_id', organizationId)
      .not('sku', 'is', null);
    
    if (!data) return 0;
    
    const skuMap = new Map<string, number>();
    data.forEach(item => {
      if (item.sku) {
        skuMap.set(item.sku, (skuMap.get(item.sku) || 0) + 1);
      }
    });
    
    const duplicates = Array.from(skuMap.entries()).filter(([_, count]) => count > 1);
    return duplicates.length;
  } catch (error) {
    console.error('❌ Error checking for duplicates:', error);
    return 0;
  }
}
