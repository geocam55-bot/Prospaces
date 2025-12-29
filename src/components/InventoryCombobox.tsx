import React, { useState, useMemo } from 'react';
import { Check, ChevronsUpDown, Search, Sparkles, Zap } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { useDebounce } from '../utils/useDebounce';
import { advancedSearch } from '../utils/advanced-search';

interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  category?: string;
  description?: string;
  cost?: number;
  priceTier1?: number;
  status?: string;
}

interface InventoryComboboxProps {
  items: InventoryItem[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  id?: string;
}

export function InventoryCombobox({
  items,
  value,
  onChange,
  placeholder = "Select inventory item...",
  id,
}: InventoryComboboxProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [useAdvancedSearch, setUseAdvancedSearch] = useState(true);

  // Debounce search query for better performance
  const debouncedSearch = useDebounce(searchQuery, 300);

  // AI-Powered search with advanced-search.ts engine
  const filteredItems = useMemo(() => {
    console.log('[InventoryCombobox] 🔍 Total items available:', items.length);
    console.log('[InventoryCombobox] 🔍 Search query:', debouncedSearch);
    console.log('[InventoryCombobox] 🔍 Advanced search:', useAdvancedSearch);
    
    if (!debouncedSearch.trim()) {
      // Show first 100 items when search is empty (prevents rendering thousands of items)
      console.log('[InventoryCombobox] 📋 No search query, showing first 100 of', items.length, 'items');
      return items.slice(0, 100);
    }

    if (useAdvancedSearch) {
      // Use AI-powered advanced search engine
      console.log('[InventoryCombobox] 🤖 Using AI-Powered search');
      
      // DIAGNOSTIC: Sample a few items to see what data we have
      const sampleItems = items.slice(0, 5);
      console.log('[InventoryCombobox] 📦 Sample items:', sampleItems.map(i => ({
        name: i.name,
        sku: i.sku,
        category: i.category,
        description: i.description?.substring(0, 50)
      })));
      
      const results = advancedSearch(items, debouncedSearch, {
        fuzzyThreshold: 0.7,  // Match Inventory Module settings
        minScore: 0.3,        // Match Inventory Module settings
        maxResults: 100,
        sortBy: 'relevance',
      });
      
      console.log('[InventoryCombobox] ✅ Advanced search found', results.length, 'matches');
      console.log('[InventoryCombobox] 📊 Top 10 results with scores:', 
        results.slice(0, 10).map(r => ({ 
          name: r.item.name, 
          sku: r.item.sku,
          score: r.score.toFixed(3),
          matchedFields: r.matchedFields,
          matchType: r.matchType
        }))
      );
      
      // DIAGNOSTIC: If no results, test with basic search to compare
      if (results.length === 0) {
        console.log('[InventoryCombobox] ⚠️ No results from advanced search, testing basic search...');
      }
      
      return results.map(r => r.item);
    } else {
      // Fallback: Simple multi-word search
      console.log('[InventoryCombobox] 🔍 Using basic search');
      const searchLower = debouncedSearch.toLowerCase().trim();
      const searchWords = searchLower.split(/\s+/).filter(word => word.length > 0);
      
      const matches = items.filter(item => {
        const searchableText = [
          item.name || '',
          item.sku || '',
          item.category || '',
          item.description || ''
        ].join(' ').toLowerCase();
        
        return searchWords.every(word => searchableText.includes(word));
      });

      console.log('[InventoryCombobox] ✅ Basic search found', matches.length, 'matches');
      
      // Sort by relevance score
      const scoredMatches = matches.map(item => {
        let score = 0;
        const itemName = (item.name || '').toLowerCase();
        const itemSKU = (item.sku || '').toLowerCase();
        
        searchWords.forEach(word => {
          if (itemName === word) score += 1000;
          if (itemSKU === word) score += 900;
          if (itemName.startsWith(word)) score += 500;
          if (itemSKU.startsWith(word)) score += 400;
          if (itemName.includes(word)) score += 100;
          if (itemSKU.includes(word)) score += 80;
          if ((item.category || '').toLowerCase().includes(word)) score += 50;
          if ((item.description || '').toLowerCase().includes(word)) score += 30;
        });
        
        if (searchWords.every(word => itemName.includes(word))) {
          score += 200;
        }
        
        return { item, score };
      });

      return scoredMatches
        .sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score;
          return (a.item.name || '').localeCompare(b.item.name || '');
        })
        .slice(0, 100)
        .map(x => x.item);
    }
  }, [debouncedSearch, items, useAdvancedSearch]);

  // Find the selected item
  const selectedItem = items.find((item) => item.id === value);
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-auto min-h-[40px] py-2"
        >
          <div className="flex flex-col items-start text-left flex-1 min-w-0">
            {value === 'none' ? (
              <span className="truncate">None</span>
            ) : selectedItem ? (
              <>
                <span className="truncate w-full font-medium">{selectedItem.name}</span>
                {selectedItem.description && (
                  <span className="text-xs text-gray-600 truncate w-full">{selectedItem.description}</span>
                )}
                <span className="text-xs text-gray-500">SKU: {selectedItem.sku}</span>
              </>
            ) : (
              <span className="truncate">{placeholder}</span>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0 z-[9999]" align="start">
        <div className="flex flex-col">
          {/* Search Header with AI Badge and Toggle */}
          <div className="p-2 border-b space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-700">Search</span>
                {useAdvancedSearch && (
                  <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-xs py-0 h-5">
                    <Sparkles className="h-3 w-3 mr-1" />
                    AI-Powered
                  </Badge>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setUseAdvancedSearch(!useAdvancedSearch)}
                className="text-xs h-6 px-2"
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
            
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder={useAdvancedSearch 
                  ? "Try: 'treated brown', 'deck board'..." 
                  : "Search by name, SKU..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
            {debouncedSearch && (
              <p className="text-xs text-gray-500">
                {filteredItems.length} item{filteredItems.length !== 1 ? 's' : ''} found
              </p>
            )}
            {!debouncedSearch && items.length > 100 && (
              <p className="text-xs text-gray-500">
                Showing first 100 items. Type to search all {items.length.toLocaleString()} items.
              </p>
            )}
          </div>

          {/* Items List */}
          <ScrollArea className="h-[300px]">
            <div className="p-2">
              {/* None Option */}
              <button
                onClick={() => {
                  onChange('none');
                  setOpen(false);
                  setSearchQuery('');
                }}
                className="w-full flex items-center px-2 py-2 text-sm rounded-md hover:bg-gray-100 transition-colors"
              >
                <Check
                  className={`mr-2 h-4 w-4 ${
                    value === 'none' ? 'opacity-100' : 'opacity-0'
                  }`}
                />
                <span>None</span>
              </button>

              {/* Filtered Items */}
              {filteredItems.length > 0 ? (
                filteredItems.map((item) => {
                  // Determine which price to show (prefer priceTier1, fallback to cost)
                  const price = item.priceTier1 ?? item.cost;
                  
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onChange(item.id);
                        setOpen(false);
                        setSearchQuery('');
                      }}
                      className="w-full flex items-start px-2 py-2 text-sm rounded-md hover:bg-gray-100 transition-colors"
                    >
                      <Check
                        className={`mr-2 h-4 w-4 mt-0.5 flex-shrink-0 ${
                          value === item.id ? 'opacity-100' : 'opacity-0'
                        }`}
                      />
                      <div className="flex flex-col items-start text-left flex-1">
                        <span>{item.name}</span>
                        {item.description && (
                          <span className="text-xs text-gray-600 line-clamp-1">{item.description}</span>
                        )}
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span>SKU: {item.sku}</span>
                          {price !== undefined && price !== null && (
                            <>
                              <span>•</span>
                              <span className="font-medium text-green-600">
                                ${typeof price === 'number' ? price.toFixed(2) : price}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="px-2 py-4 text-sm text-center text-gray-500">
                  No inventory items found
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  );
}