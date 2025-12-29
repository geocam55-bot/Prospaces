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
 * Parse natural language search queries for price filters
 */
function parseSearchQuery(query: string): {
  searchTerms: string;
  priceFilter?: { operator: 'lt' | 'gt' | 'gte' | 'lte', value: number };
} {
  if (!query || !query.trim()) {
    return { searchTerms: '' };
  }

  let cleanedQuery = query.toLowerCase();
  let priceFilter: { operator: 'lt' | 'gt' | 'gte' | 'lte', value: number } | undefined;

  // Check for price patterns
  const pricePatterns = [
    { regex: /under\s+\$?(\d+(?:\.\d{2})?)/i, operator: 'lt' as const },
    { regex: /less\s+than\s+\$?(\d+(?:\.\d{2})?)/i, operator: 'lt' as const },
    { regex: /below\s+\$?(\d+(?:\.\d{2})?)/i, operator: 'lt' as const },
    { regex: /over\s+\$?(\d+(?:\.\d{2})?)/i, operator: 'gt' as const },
    { regex: /more\s+than\s+\$?(\d+(?:\.\d{2})?)/i, operator: 'gt' as const },
    { regex: /above\s+\$?(\d+(?:\.\d{2})?)/i, operator: 'gt' as const },
  ];

  for (const pattern of pricePatterns) {
    const match = cleanedQuery.match(pattern.regex);
    if (match) {
      priceFilter = {
        operator: pattern.operator,
        value: parseFloat(match[1]),
      };
      // Remove the price phrase from the search query
      cleanedQuery = cleanedQuery.replace(pattern.regex, ' ');
      break;
    }
  }

  // Remove standalone prices like "$40"
  cleanedQuery = cleanedQuery.replace(/\$\d+(?:\.\d{2})?/gi, ' ');

  // Clean up extra spaces
  const searchTerms = cleanedQuery.replace(/\s+/g, ' ').trim();

  return { searchTerms, priceFilter };
}

/**
 * Simple stemming function to handle singular/plural
 */
function stem(word: string): string {
  word = word.toLowerCase();
  if (word.endsWith('ies')) return word.slice(0, -3) + 'y';
  if (word.endsWith('es')) return word.slice(0, -2);
  if (word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1);
  return word;
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
    
    // ⚡ Enhanced server-side search with natural language support
    if (searchQuery && searchQuery.trim()) {
      const { searchTerms, priceFilter } = parseSearchQuery(searchQuery);
      
      console.log('🔍 [Inventory Search]', {
        originalQuery: searchQuery,
        searchTerms,
        priceFilter,
      });
      
      // Apply text search if there are search terms
      if (searchTerms) {
        // Handle both singular and plural forms by searching for stemmed version
        const stemmedSearch = stem(searchTerms);
        
        console.log('🔍 [Inventory Search] Stemming:', {
          original: searchTerms,
          stemmed: stemmedSearch,
        });
        
        // Search for both original and stemmed versions
        if (stemmedSearch !== searchTerms) {
          query = query.or(
            `name.ilike.%${searchTerms}%,sku.ilike.%${searchTerms}%,description.ilike.%${searchTerms}%,category.ilike.%${searchTerms}%,` +
            `name.ilike.%${stemmedSearch}%,sku.ilike.%${stemmedSearch}%,description.ilike.%${stemmedSearch}%,category.ilike.%${stemmedSearch}%`
          );
        } else {
          query = query.or(`name.ilike.%${searchTerms}%,sku.ilike.%${searchTerms}%,description.ilike.%${searchTerms}%,category.ilike.%${searchTerms}%`);
        }
      }
      
      // Apply price filter if present
      if (priceFilter) {
        console.log('💰 [Inventory Search] Applying price filter:', priceFilter);
        
        if (priceFilter.operator === 'lt') {
          query = query.lt('unit_price', priceFilter.value);
        } else if (priceFilter.operator === 'gt') {
          query = query.gt('unit_price', priceFilter.value);
        } else if (priceFilter.operator === 'lte') {
          query = query.lte('unit_price', priceFilter.value);
        } else if (priceFilter.operator === 'gte') {
          query = query.gte('unit_price', priceFilter.value);
        }
      }
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
      console.error('❌ Database error loading inventory:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      console.error('❌ Error code:', error.code);
      console.error('❌ Error message:', error.message);
      throw new Error(`Database error: ${error.message} (Code: ${error.code || 'unknown'})`);
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