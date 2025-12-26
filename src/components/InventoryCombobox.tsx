import React, { useState, useMemo } from 'react';
import { Check, ChevronsUpDown, Search } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { ScrollArea } from './ui/scroll-area';
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

  // Debounce search query for better performance (increased to 300ms)
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Filter items based on search query with advanced search
  const filteredItems = useMemo(() => {
    if (!debouncedSearch.trim()) {
      // 🚀 Performance: Only show first 100 items when search is empty (prevents rendering 14k+ items)
      return items.slice(0, 100);
    }

    // 🌟 Advanced Search with fuzzy matching, semantic understanding, and NLP (same as Inventory module)
    const searchResults = advancedSearch(items, debouncedSearch, {
      fuzzyThreshold: 0.6,  // Lower threshold for more results
      includeInactive: true,  // Show all items in dropdown
      minScore: 0.1,  // Lower minScore to allow more matches
      maxResults: 100,  // Limit to 100 results for performance
      sortBy: 'relevance',
    });
    
    // Return items from search results
    return searchResults.map(r => r.item);
  }, [debouncedSearch, items]);

  // Find the selected item
  const selectedItem = items.find((item) => item.id === value);
  
  // Display text
  const displayText = value === 'none' 
    ? 'None' 
    : selectedItem 
      ? `${selectedItem.name} (${selectedItem.sku})`
      : placeholder;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          <span className="truncate">{displayText}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <div className="flex flex-col">
          {/* Search Input */}
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name, SKU, or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
            {debouncedSearch && (
              <p className="text-xs text-gray-500 mt-1">
                {filteredItems.length} item{filteredItems.length !== 1 ? 's' : ''} found
              </p>
            )}
            {!debouncedSearch && items.length > 100 && (
              <p className="text-xs text-gray-500 mt-1">
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
                filteredItems.map((item) => (
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
                    <div className="flex flex-col items-start text-left">
                      <span>{item.name}</span>
                      <span className="text-xs text-gray-500">SKU: {item.sku}</span>
                    </div>
                  </button>
                ))
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