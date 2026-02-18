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
  totalValue?: number; // Total inventory value for filtered results
  activeCount?: number; // Count of active items in filtered results
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
      .select('id, name, sku, description, category, quantity, quantity_on_order, unit_price, cost, price_tier_1, price_tier_2, price_tier_3, price_tier_4, price_tier_5, department_code, unit_of_measure, image_url, organization_id, created_at, updated_at', { count: 'exact' })
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
      // ✅ FIX: Convert dollar value to cents since unit_price is stored in cents
      if (priceFilter) {
        const priceInCents = Math.round(priceFilter.value * 100);
        console.log('💰 [Inventory Search] Applying price filter:', priceFilter, '→ cents:', priceInCents);
        
        if (priceFilter.operator === 'lt') {
          query = query.lt('unit_price', priceInCents);
        } else if (priceFilter.operator === 'gt') {
          query = query.gt('unit_price', priceInCents);
        } else if (priceFilter.operator === 'lte') {
          query = query.lte('unit_price', priceInCents);
        } else if (priceFilter.operator === 'gte') {
          query = query.gte('unit_price', priceInCents);
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
    
    // 📊 Calculate total value for ALL filtered results (not just current page)
    // Build same query but select aggregation columns
    let aggregateQuery = supabase
      .from('inventory')
      .select('quantity, cost, unit_price')
      .eq('organization_id', organizationId);
    
    // Apply same filters as main query
    if (searchQuery && searchQuery.trim()) {
      const { searchTerms, priceFilter } = parseSearchQuery(searchQuery);
      
      if (searchTerms) {
        const stemmedSearch = stem(searchTerms);
        if (stemmedSearch !== searchTerms) {
          aggregateQuery = aggregateQuery.or(
            `name.ilike.%${searchTerms}%,sku.ilike.%${searchTerms}%,description.ilike.%${searchTerms}%,category.ilike.%${searchTerms}%,` +
            `name.ilike.%${stemmedSearch}%,sku.ilike.%${stemmedSearch}%,description.ilike.%${stemmedSearch}%,category.ilike.%${stemmedSearch}%`
          );
        } else {
          aggregateQuery = aggregateQuery.or(`name.ilike.%${searchTerms}%,sku.ilike.%${searchTerms}%,description.ilike.%${searchTerms}%,category.ilike.%${searchTerms}%`);
        }
      }
      
      // ✅ FIX: Convert dollar value to cents for aggregate query too
      if (priceFilter) {
        const priceInCents = Math.round(priceFilter.value * 100);
        if (priceFilter.operator === 'lt') {
          aggregateQuery = aggregateQuery.lt('unit_price', priceInCents);
        } else if (priceFilter.operator === 'gt') {
          aggregateQuery = aggregateQuery.gt('unit_price', priceInCents);
        } else if (priceFilter.operator === 'lte') {
          aggregateQuery = aggregateQuery.lte('unit_price', priceInCents);
        } else if (priceFilter.operator === 'gte') {
          aggregateQuery = aggregateQuery.gte('unit_price', priceInCents);
        }
      }
    }
    
    if (categoryFilter && categoryFilter !== 'all') {
      aggregateQuery = aggregateQuery.eq('category', categoryFilter);
    }
    
    const { data: aggregateData } = await aggregateQuery;
    
    // Calculate total value from all filtered items
    let totalValue = 0;
    if (aggregateData) {
      console.log(`📊 [Inventory Loader] Calculating total value from ${aggregateData.length} items...`);
      
      // Debug: Log first few items to see actual values
      if (aggregateData.length > 0) {
        const sample = aggregateData.slice(0, 3);
        console.log('📊 [Sample Items]:', sample.map(item => ({
          quantity: item.quantity,
          cost: item.cost,
          unit_price: item.unit_price,
          costDollars: (item.cost || 0) / 100,
          priceDollars: (item.unit_price || 0) / 100,
        })));
      }
      
      totalValue = aggregateData.reduce((sum, item) => {
        const quantity = item.quantity || 0;
        // Use cost (what we paid) for inventory value, not unit_price (selling price)
        const cost = item.cost || 0;
        return sum + (quantity * cost / 100); // Convert cents to dollars
      }, 0);
      
      console.log(`💰 [Inventory Loader] Calculated total inventory value (Qty × Cost): $${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
    }
    
    const endTime = performance.now();
    const loadTime = endTime - startTime;
    
    console.log(`✅ [Inventory Loader] Loaded ${data?.length || 0} items (page ${currentPage}, total: ${count}) in ${loadTime.toFixed(0)}ms`);
    console.log(`💰 [Inventory Loader] Total value of filtered results: $${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
    
    return {
      items: data || [],
      totalCount: count || 0,
      totalValue,
      loadTime,
    };
  } catch (error) {
    const endTime = performance.now();
    throw error;
  }
}

/**
 * Check for duplicate SKUs in the database (runs async without blocking UI).
 * Uses paginated fetch to handle 78K+ items (Supabase default limit is 1000).
 */
export async function checkForDuplicates(organizationId: string): Promise<number> {
  try {
    // Paginated fetch of all SKUs
    let allSkus: string[] = [];
    let offset = 0;
    const PAGE = 10000;

    while (true) {
      const { data, error } = await supabase
        .from('inventory')
        .select('sku')
        .eq('organization_id', organizationId)
        .not('sku', 'is', null)
        .range(offset, offset + PAGE - 1);

      if (error) {
        console.error('❌ Duplicate check fetch error:', error.message);
        break;
      }
      if (!data || data.length === 0) break;

      for (const item of data) {
        if (item.sku) allSkus.push(item.sku);
      }

      if (data.length < PAGE) break;
      offset += data.length;
    }

    if (allSkus.length === 0) return 0;

    const skuMap = new Map<string, number>();
    for (const sku of allSkus) {
      skuMap.set(sku, (skuMap.get(sku) || 0) + 1);
    }

    let dupCount = 0;
    for (const [_, count] of skuMap) {
      if (count > 1) dupCount++;
    }

    console.log(`🔍 Duplicate check: ${allSkus.length} total SKUs, ${skuMap.size} unique, ${dupCount} with duplicates`);
    return dupCount;
  } catch (error) {
    console.error('❌ Error checking for duplicates:', error);
    return 0;
  }
}