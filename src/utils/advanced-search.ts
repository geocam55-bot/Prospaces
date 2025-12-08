/**
 * Advanced Search Engine for Inventory
 * 
 * Features:
 * - Fuzzy Search: Handles misspellings and approximate matches
 * - Semantic Search: Understands meaning behind words
 * - Full-Text Search: Searches across all fields
 * - Natural Language: Conversational queries, flexible word order
 */

// ============================================
// 1. FUZZY MATCHING - Levenshtein Distance
// ============================================

/**
 * Calculate Levenshtein distance between two strings
 * Returns the minimum number of single-character edits needed
 */
function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix: number[][] = [];

  if (len1 === 0) return len2;
  if (len2 === 0) return len1;

  // Initialize matrix
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  // Fill matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return matrix[len1][len2];
}

/**
 * Calculate similarity score (0-1) based on Levenshtein distance
 */
function similarityScore(str1: string, str2: string): number {
  const maxLen = Math.max(str1.length, str2.length);
  if (maxLen === 0) return 1;
  const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
  return 1 - distance / maxLen;
}

/**
 * Check if two strings are fuzzy matches
 * @param str1 - First string
 * @param str2 - Second string
 * @param threshold - Similarity threshold (0-1), default 0.7
 */
function isFuzzyMatch(str1: string, str2: string, threshold: number = 0.7): boolean {
  return similarityScore(str1, str2) >= threshold;
}

// ============================================
// 2. SEMANTIC SEARCH - Word Mapping
// ============================================

/**
 * Simple stemmer to handle plurals and common word variations
 * Converts words to their root form for better matching
 */
function stem(word: string): string {
  const lower = word.toLowerCase();
  
  // Handle common plural forms
  if (lower.endsWith('ies') && lower.length > 4) {
    return lower.slice(0, -3) + 'y'; // batteries -> battery
  }
  if (lower.endsWith('es') && lower.length > 3) {
    // Check for -ches, -shes, -xes, -zes, -sses
    if (lower.endsWith('ches') || lower.endsWith('shes') || 
        lower.endsWith('xes') || lower.endsWith('zes') || 
        lower.endsWith('sses')) {
      return lower.slice(0, -2); // boxes -> box, brushes -> brush
    }
    return lower.slice(0, -2); // tries to handle -es plurals
  }
  if (lower.endsWith('s') && lower.length > 3 && !lower.endsWith('ss')) {
    return lower.slice(0, -1); // hammers -> hammer, tools -> tool
  }
  
  // Handle common verb forms
  if (lower.endsWith('ing') && lower.length > 5) {
    return lower.slice(0, -3); // painting -> paint
  }
  if (lower.endsWith('ed') && lower.length > 4) {
    return lower.slice(0, -2); // painted -> paint
  }
  
  return lower;
}

/**
 * Semantic word mappings for inventory-related terms
 * Maps synonyms and related words to common concepts
 */
const semanticMappings: Record<string, string[]> = {
  // Product types
  'tool': ['equipment', 'instrument', 'device', 'apparatus', 'implement'],
  'material': ['supply', 'substance', 'component', 'part', 'piece'],
  'hardware': ['fastener', 'screw', 'bolt', 'nail', 'bracket'],
  'paint': ['coating', 'finish', 'stain', 'primer', 'sealant'],
  'electric': ['electrical', 'electronic', 'power', 'wiring', 'electric'],
  'wood': ['lumber', 'timber', 'plywood', 'wooden', 'hardwood'],
  
  // Sizes
  'small': ['tiny', 'mini', 'compact', 'little', 'petite'],
  'large': ['big', 'huge', 'giant', 'jumbo', 'oversized'],
  'medium': ['mid', 'average', 'standard', 'regular', 'normal'],
  
  // Colors
  'red': ['crimson', 'scarlet', 'burgundy', 'maroon', 'cherry'],
  'blue': ['navy', 'azure', 'cobalt', 'cyan', 'turquoise'],
  'green': ['lime', 'olive', 'emerald', 'forest', 'mint'],
  'white': ['ivory', 'cream', 'off-white', 'pearl', 'snow'],
  'black': ['ebony', 'charcoal', 'onyx', 'jet', 'midnight'],
  
  // Quantities
  'cheap': ['inexpensive', 'affordable', 'budget', 'economical', 'low-cost'],
  'expensive': ['costly', 'premium', 'high-end', 'luxury', 'pricey'],
  'heavy': ['weighty', 'massive', 'substantial', 'hefty', 'dense'],
  'light': ['lightweight', 'portable', 'feather', 'airy', 'delicate'],
  
  // Status
  'available': ['in-stock', 'ready', 'on-hand', 'stocked', 'inventory'],
  'unavailable': ['out-of-stock', 'depleted', 'empty', 'sold-out', 'exhausted'],
  'new': ['fresh', 'recent', 'latest', 'brand-new', 'unused'],
  'old': ['vintage', 'antique', 'used', 'worn', 'aged'],
};

/**
 * Expand query with semantic equivalents AND word stems
 */
function expandSemanticQuery(query: string): string[] {
  const words = query.toLowerCase().split(/\s+/);
  const expanded = new Set<string>([query.toLowerCase()]);
  
  for (const word of words) {
    // Add the word itself
    expanded.add(word);
    
    // Add stemmed version (handles plurals)
    const stemmed = stem(word);
    expanded.add(stemmed);
    
    // Add semantic equivalents for both original and stemmed
    for (const [key, synonyms] of Object.entries(semanticMappings)) {
      if (word === key || stemmed === key || synonyms.includes(word) || synonyms.includes(stemmed)) {
        expanded.add(key);
        expanded.add(stem(key)); // Also add stemmed version of key
        synonyms.forEach(syn => {
          expanded.add(syn);
          expanded.add(stem(syn)); // Add stemmed version of synonym
        });
      }
    }
  }
  
  return Array.from(expanded);
}

// ============================================
// 3. NATURAL LANGUAGE PROCESSING
// ============================================

/**
 * Extract meaningful terms from natural language query
 * Removes common words (stop words) and focuses on important terms
 */
function extractSearchTerms(query: string): string[] {
  const stopWords = new Set([
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
    'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
    'to', 'was', 'will', 'with', 'show', 'me', 'find', 'search',
    'looking', 'need', 'want', 'get', 'have', 'i', 'we', 'you',
    'my', 'our', 'your', 'all', 'any', 'some', 'what', 'where',
    'when', 'how', 'who', 'which', 'this', 'these', 'those',
  ]);
  
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word));
}

/**
 * Parse natural language queries for specific intents
 */
interface QueryIntent {
  type: 'price' | 'quantity' | 'category' | 'status' | 'general';
  operator?: 'greater' | 'less' | 'equal' | 'between';
  value?: number | string;
  value2?: number; // For 'between' operator
}

function parseQueryIntent(query: string): QueryIntent[] {
  const intents: QueryIntent[] = [];
  const lowerQuery = query.toLowerCase();
  
  // Price queries
  const pricePatterns = [
    { pattern: /(?:under|less\s+than|below|cheaper\s+than)\s*\$?(\d+(?:\.\d+)?)/i, operator: 'less' as const },
    { pattern: /(?:over|more\s+than|above|expensive\s+than)\s*\$?(\d+(?:\.\d+)?)/i, operator: 'greater' as const },
    { pattern: /(?:around|about|approximately)\s*\$?(\d+(?:\.\d+)?)/i, operator: 'equal' as const },
    { pattern: /(?:between)\s*\$?(\d+(?:\.\d+)?)\s*(?:and|to)\s*\$?(\d+(?:\.\d+)?)/i, operator: 'between' as const },
  ];
  
  for (const { pattern, operator } of pricePatterns) {
    const match = lowerQuery.match(pattern);
    if (match) {
      intents.push({
        type: 'price',
        operator,
        value: parseFloat(match[1]),
        value2: match[2] ? parseFloat(match[2]) : undefined,
      });
    }
  }
  
  // Quantity queries
  const quantityPatterns = [
    { pattern: /(?:low\s+stock|running\s+low|need\s+reorder|almost\s+out)/i, operator: 'less' as const, value: 10 },
    { pattern: /(?:in\s+stock|available|have)/i, operator: 'greater' as const, value: 0 },
    { pattern: /(?:out\s+of\s+stock|no\s+stock|unavailable)/i, operator: 'equal' as const, value: 0 },
  ];
  
  for (const { pattern, operator, value } of quantityPatterns) {
    if (pattern.test(lowerQuery)) {
      intents.push({
        type: 'quantity',
        operator,
        value,
      });
    }
  }
  
  // Status queries
  if (/\b(active|available|current)\b/i.test(lowerQuery)) {
    intents.push({ type: 'status', value: 'active' });
  }
  if (/\b(inactive|unavailable|disabled)\b/i.test(lowerQuery)) {
    intents.push({ type: 'status', value: 'inactive' });
  }
  if (/\b(discontinued|obsolete|retired)\b/i.test(lowerQuery)) {
    intents.push({ type: 'status', value: 'discontinued' });
  }
  
  return intents;
}

// ============================================
// 4. MAIN SEARCH FUNCTION
// ============================================

export interface SearchableItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  description: string;
  supplier?: string;
  barcode?: string;
  location?: string;
  tags?: string[];
  quantityOnHand: number;
  cost: number;
  priceTier1: number;
  status: 'active' | 'inactive' | 'discontinued';
  [key: string]: any; // Allow additional fields
}

export interface SearchResult<T extends SearchableItem> {
  item: T;
  score: number;
  matchedFields: string[];
  matchType: 'exact' | 'fuzzy' | 'semantic' | 'partial';
}

export interface SearchOptions {
  fuzzyThreshold?: number;      // 0-1, default 0.7
  includeInactive?: boolean;     // Include inactive items
  minScore?: number;             // Minimum score to include (0-1)
  maxResults?: number;           // Maximum number of results
  sortBy?: 'relevance' | 'name' | 'price' | 'quantity';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Advanced search function with fuzzy matching, semantic understanding, and NLP
 */
export function advancedSearch<T extends SearchableItem>(
  items: T[],
  query: string,
  options: SearchOptions = {}
): SearchResult<T>[] {
  const {
    fuzzyThreshold = 0.7,
    includeInactive = true,
    minScore = 0.3,
    maxResults = 100,
    sortBy = 'relevance',
    sortOrder = 'desc',
  } = options;
  
  if (!query || query.trim().length === 0) {
    return items.map(item => ({
      item,
      score: 1,
      matchedFields: [],
      matchType: 'exact' as const,
    }));
  }
  
  const queryLower = query.toLowerCase().trim();
  const searchTerms = extractSearchTerms(query);
  const semanticTerms = expandSemanticQuery(query);
  const intents = parseQueryIntent(query);
  
  const results: SearchResult<T>[] = [];
  
  for (const item of items) {
    // Skip inactive items if not requested
    if (!includeInactive && item.status !== 'active') {
      continue;
    }
    
    let totalScore = 0;
    let matchCount = 0;
    const matchedFields: string[] = [];
    let bestMatchType: 'exact' | 'fuzzy' | 'semantic' | 'partial' = 'partial';
    
    // Fields to search with their weights
    const searchFields = [
      { field: 'name', weight: 10, value: item.name },
      { field: 'sku', weight: 8, value: item.sku },
      { field: 'description', weight: 6, value: item.description },
      { field: 'category', weight: 7, value: item.category },
      { field: 'supplier', weight: 4, value: item.supplier },
      { field: 'barcode', weight: 5, value: item.barcode },
      { field: 'location', weight: 3, value: item.location },
      { field: 'tags', weight: 5, value: item.tags?.join(' ') },
    ];
    
    // 1. Check each field for matches
    for (const { field, weight, value } of searchFields) {
      if (!value) continue;
      
      const fieldValue = value.toLowerCase();
      
      // Exact match (highest score)
      if (fieldValue === queryLower) {
        totalScore += weight * 10;
        matchCount++;
        matchedFields.push(field);
        bestMatchType = 'exact';
        continue;
      }
      
      // Contains exact query
      if (fieldValue.includes(queryLower)) {
        totalScore += weight * 8;
        matchCount++;
        matchedFields.push(field);
        if (bestMatchType !== 'exact') {
          bestMatchType = 'partial';
        }
        continue;
      }
      
      // Semantic match
      for (const term of semanticTerms) {
        if (fieldValue.includes(term)) {
          totalScore += weight * 6;
          matchCount++;
          matchedFields.push(field);
          if (bestMatchType === 'partial') {
            bestMatchType = 'semantic';
          }
          break;
        }
      }
      
      // Fuzzy match
      const words = fieldValue.split(/\s+/);
      for (const word of words) {
        if (isFuzzyMatch(word, queryLower, fuzzyThreshold)) {
          totalScore += weight * 5;
          matchCount++;
          matchedFields.push(field);
          if (bestMatchType === 'partial') {
            bestMatchType = 'fuzzy';
          }
          break;
        }
      }
      
      // Individual search terms
      for (const term of searchTerms) {
        if (fieldValue.includes(term)) {
          totalScore += weight * 3;
          matchCount++;
          if (!matchedFields.includes(field)) {
            matchedFields.push(field);
          }
        }
      }
    }
    
    // 2. Apply intent-based filtering
    let passesIntentFilter = true;
    
    for (const intent of intents) {
      switch (intent.type) {
        case 'price':
          const price = item.priceTier1;
          if (intent.operator === 'less' && price >= (intent.value as number)) {
            passesIntentFilter = false;
          } else if (intent.operator === 'greater' && price <= (intent.value as number)) {
            passesIntentFilter = false;
          } else if (intent.operator === 'between' && 
                     (price < (intent.value as number) || price > (intent.value2 as number))) {
            passesIntentFilter = false;
          } else if (intent.operator === 'equal') {
            const range = (intent.value as number) * 0.2; // 20% range
            if (Math.abs(price - (intent.value as number)) > range) {
              passesIntentFilter = false;
            }
          }
          if (passesIntentFilter) {
            totalScore += 20; // Bonus for matching intent
          }
          break;
          
        case 'quantity':
          const qty = item.quantityOnHand;
          if (intent.operator === 'less' && qty >= (intent.value as number)) {
            passesIntentFilter = false;
          } else if (intent.operator === 'greater' && qty <= (intent.value as number)) {
            passesIntentFilter = false;
          } else if (intent.operator === 'equal' && qty !== (intent.value as number)) {
            passesIntentFilter = false;
          }
          if (passesIntentFilter) {
            totalScore += 20;
          }
          break;
          
        case 'status':
          if (item.status !== intent.value) {
            passesIntentFilter = false;
          } else {
            totalScore += 15;
          }
          break;
      }
    }
    
    if (!passesIntentFilter) {
      continue;
    }
    
    // 3. Normalize score (0-1)
    const maxPossibleScore = searchFields.reduce((sum, f) => sum + f.weight * 10, 0) + 
                             (intents.length * 20);
    const normalizedScore = totalScore / maxPossibleScore;
    
    // Add to results if meets minimum score
    if (normalizedScore >= minScore || matchCount > 0) {
      results.push({
        item,
        score: normalizedScore,
        matchedFields: Array.from(new Set(matchedFields)),
        matchType: bestMatchType,
      });
    }
  }
  
  // 4. Sort results
  results.sort((a, b) => {
    if (sortBy === 'relevance') {
      return sortOrder === 'desc' ? b.score - a.score : a.score - b.score;
    } else if (sortBy === 'name') {
      return sortOrder === 'desc' 
        ? b.item.name.localeCompare(a.item.name)
        : a.item.name.localeCompare(b.item.name);
    } else if (sortBy === 'price') {
      return sortOrder === 'desc'
        ? b.item.priceTier1 - a.item.priceTier1
        : a.item.priceTier1 - b.item.priceTier1;
    } else if (sortBy === 'quantity') {
      return sortOrder === 'desc'
        ? b.item.quantityOnHand - a.item.quantityOnHand
        : a.item.quantityOnHand - b.item.quantityOnHand;
    }
    return 0;
  });
  
  // 5. Limit results
  return results.slice(0, maxResults);
}

// ============================================
// 5. UTILITY FUNCTIONS
// ============================================

/**
 * Highlight matching text in a string
 */
export function highlightMatches(text: string, query: string): string {
  if (!query) return text;
  
  const regex = new RegExp(`(${query})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
}

/**
 * Get search suggestions based on partial input
 */
export function getSearchSuggestions<T extends SearchableItem>(
  items: T[],
  partialQuery: string,
  maxSuggestions: number = 5
): string[] {
  if (!partialQuery || partialQuery.length < 2) {
    return [];
  }
  
  const suggestions = new Set<string>();
  const queryLower = partialQuery.toLowerCase();
  
  for (const item of items) {
    if (suggestions.size >= maxSuggestions) break;
    
    if (item.name.toLowerCase().startsWith(queryLower)) {
      suggestions.add(item.name);
    } else if (item.sku.toLowerCase().startsWith(queryLower)) {
      suggestions.add(item.sku);
    } else if (item.category.toLowerCase().startsWith(queryLower)) {
      suggestions.add(item.category);
    }
  }
  
  return Array.from(suggestions).slice(0, maxSuggestions);
}