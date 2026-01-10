import React, { useState, useEffect } from 'react';
import { createClient } from '../../utils/supabase/client';
import { Search, User, X } from 'lucide-react';

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  price_level: string;
}

interface CustomerSelectorProps {
  organizationId: string;
  selectedCustomer: Customer | null;
  onCustomerSelect: (customer: Customer | null) => void;
  userId?: string;
}

export function CustomerSelector({ 
  organizationId, 
  selectedCustomer, 
  onCustomerSelect,
  userId
}: CustomerSelectorProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Load customers on mount and when search changes
  useEffect(() => {
    if (organizationId) {
      loadCustomers();
    }
  }, [organizationId]);

  // Reload when search query changes (with debounce effect)
  useEffect(() => {
    if (!organizationId) return;
    
    const timer = setTimeout(() => {
      loadCustomers();
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadCustomers = async () => {
    setIsLoading(true);
    try {
      // Filter customers to only show those owned by the current user OR unassigned
      // Note: This matches the user's request to "only look at the Users Customers"
      let query = createClient()
        .from('contacts')
        .select('id, name, email, phone, company, price_level')
        .eq('organization_id', organizationId)
        .order('name');

      // If userId is provided, only show contacts owned by this user
      if (userId) {
        query = query.eq('owner_id', userId);
      }

      if (searchQuery) {
        query = query.or(`name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,company.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query.limit(50); // Increased limit slightly

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error loading customers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectCustomer = (customer: Customer) => {
    onCustomerSelect(customer);
    setIsDropdownOpen(false);
    setSearchQuery('');
  };

  const handleClearCustomer = () => {
    onCustomerSelect(null);
    setSearchQuery('');
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm text-slate-700">
        Customer (Optional)
      </label>
      
      {selectedCustomer ? (
        <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="text-sm text-slate-900">{selectedCustomer.name}</div>
              {selectedCustomer.company && (
                <div className="text-xs text-slate-600">{selectedCustomer.company}</div>
              )}
              <div className="text-xs text-green-600 mt-1">
                Price Tier: {selectedCustomer.price_level}
              </div>
            </div>
          </div>
          <button
            onClick={handleClearCustomer}
            className="p-1 text-slate-400 hover:text-slate-600 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsDropdownOpen(true);
              }}
              onFocus={() => setIsDropdownOpen(true)}
              placeholder="Search customers by name, email, or company..."
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          {isDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setIsDropdownOpen(false)}
              />
              <div className="absolute z-20 w-full mt-1 bg-white border border-slate-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {isLoading ? (
                  <div className="p-4 text-center text-slate-500">
                    Loading customers...
                  </div>
                ) : customers.length === 0 ? (
                  <div className="p-4 text-center text-slate-500">
                    No customers found
                  </div>
                ) : (
                  <div className="py-1">
                    {customers.map((customer) => (
                      <button
                        key={customer.id}
                        onClick={() => handleSelectCustomer(customer)}
                        className="w-full px-4 py-3 text-left hover:bg-slate-50 flex items-start gap-3 border-b border-slate-100 last:border-b-0"
                      >
                        <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <User className="w-4 h-4 text-slate-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-slate-900 truncate">
                            {customer.name}
                          </div>
                          {customer.company && (
                            <div className="text-xs text-slate-600 truncate">
                              {customer.company}
                            </div>
                          )}
                          <div className="flex items-center gap-3 mt-1">
                            {customer.email && (
                              <div className="text-xs text-slate-500 truncate">
                                {customer.email}
                              </div>
                            )}
                            <div className="text-xs text-green-600">
                              {customer.price_level}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
      
      {selectedCustomer && (
        <div className="text-xs text-slate-600">
          Materials will be priced at <span className="text-green-600">{selectedCustomer.price_level.toUpperCase()}</span> tier
        </div>
      )}
    </div>
  );
}