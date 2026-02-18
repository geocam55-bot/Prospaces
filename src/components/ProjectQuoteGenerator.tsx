import React, { useState, useEffect } from 'react';
import { FileText, User, DollarSign, Loader2, Check, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Alert, AlertDescription } from './ui/alert';
import { contactsAPI, quotesAPI, settingsAPI } from '../utils/api';
import { getGlobalTaxRate, getGlobalTaxRate2, getDefaultQuoteTerms, getPriceTierLabel } from '../lib/global-settings';
import type { User as AppUser } from '../App';

interface ProjectQuoteGeneratorProps {
  user: AppUser;
  projectType: 'deck' | 'garage' | 'shed' | 'roof' | 'kitchen';
  materials: any[];
  totalCost: number;
  projectData: any;
}

interface Contact {
  id: string;
  name: string;
  company?: string;
  email?: string;
  priceLevel?: string; // Named price level (dynamically configured in Admin Settings)
}

export function ProjectQuoteGenerator({ 
  user, 
  projectType, 
  materials, 
  totalCost,
  projectData 
}: ProjectQuoteGeneratorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<string>('');
  const [quoteTitle, setQuoteTitle] = useState('');
  const [quoteNotes, setQuoteNotes] = useState('');
  const [customerPriceLevel, setCustomerPriceLevel] = useState<string>(getPriceTierLabel(1));
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  
  // Organization tax settings
  const [orgTaxRate, setOrgTaxRate] = useState<number>(0);
  const [orgTaxRate2, setOrgTaxRate2] = useState<number>(0);

  // Load organization settings on mount
  useEffect(() => {
    loadOrganizationSettings();
  }, [user.organizationId]);

  // Load contacts on mount
  useEffect(() => {
    loadContacts();
  }, []);

  // Reload contacts when dialog opens
  useEffect(() => {
    if (isOpen && contacts.length === 0) {
      loadContacts();
    }
  }, [isOpen]);

  // Load opportunities when contact is selected
  useEffect(() => {
    if (selectedContact && selectedContact !== '') {
      // Find selected contact and get their price level
      const contact = contacts.find(c => c.id === selectedContact);
      if (contact) {
        const priceLevel = contact.priceLevel || getPriceTierLabel(1);
        setCustomerPriceLevel(priceLevel);
        console.log('[ProjectQuoteGenerator] Customer price level:', priceLevel);
      }
    } else {
      setCustomerPriceLevel(getPriceTierLabel(1)); // Reset to default
    }
  }, [selectedContact, contacts]);

  const loadOrganizationSettings = async () => {
    try {
      const orgSettings = await settingsAPI.getOrganizationSettings(user.organizationId);
      if (orgSettings) {
        setOrgTaxRate(orgSettings.tax_rate || 0);
        setOrgTaxRate2(orgSettings.tax_rate_2 || 0);
        console.log('[ProjectQuoteGenerator] Loaded tax rates:', orgSettings.tax_rate, orgSettings.tax_rate_2);
      } else {
        // Fallback to localStorage if no settings in database
        const fallbackRate = getGlobalTaxRate();
        const fallbackRate2 = getGlobalTaxRate2();
        setOrgTaxRate(fallbackRate);
        setOrgTaxRate2(fallbackRate2);
        console.log('[ProjectQuoteGenerator] Using fallback tax rates:', fallbackRate, fallbackRate2);
      }
    } catch (error) {
      console.error('[ProjectQuoteGenerator] Error loading organization settings:', error);
      // Fallback to localStorage on error
      const fallbackRate = getGlobalTaxRate();
      const fallbackRate2 = getGlobalTaxRate2();
      setOrgTaxRate(fallbackRate);
      setOrgTaxRate2(fallbackRate2);
    }
  };

  const loadContacts = async () => {
    try {
      setIsLoading(true);
      console.log('[ProjectQuoteGenerator] Loading contacts...');
      const { contacts: data } = await contactsAPI.getAll();
      console.log('[ProjectQuoteGenerator] Loaded contacts:', data?.length || 0, data);
      setContacts(data || []);
    } catch (error) {
      console.error('[ProjectQuoteGenerator] Error loading contacts:', error);
      showAlert('error', 'Failed to load contacts');
    } finally {
      setIsLoading(false);
    }
  };

  const showAlert = (type: 'success' | 'error', message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 5000);
  };

  // totalCost now represents T1 pricing from inventory
  const quotePrice = totalCost;

  // Get tax rates for display
  const taxRate = orgTaxRate || getGlobalTaxRate();
  const taxRate2 = orgTaxRate2 || getGlobalTaxRate2();
  const taxAmount = (totalCost * taxRate) / 100;
  const taxAmount2 = (totalCost * taxRate2) / 100;
  const quoteTotalWithTax = totalCost + taxAmount + taxAmount2;

  const handleGenerateQuote = async () => {
    if (!selectedContact) {
      showAlert('error', 'Please select a customer');
      return;
    }

    if (!quoteTitle.trim()) {
      showAlert('error', 'Please enter a quote title');
      return;
    }

    try {
      setIsSaving(true);

      // Use T1 pricing from inventory (totalCost is already T1 price)
      const quoteAmount = quotePrice;

      // Build line items from materials
      const lineItems = materials.map((material, index) => ({
        id: `item_${index}`,
        itemId: material.itemId, // Add inventory item ID for linking to inventory
        itemName: material.description || material.name || material.item || 'Material',
        sku: material.sku || `PROJ-${projectType.toUpperCase()}-${index + 1}`,
        description: material.description || material.name || material.item || 'Material',
        quantity: material.quantity,
        unit: material.unit || 'ea',
        unitPrice: material.unitPrice || material.costPerUnit || material.cost || 0,
        cost: material.cost || 0,
        total: material.totalCost || (material.quantity * (material.unitPrice || material.costPerUnit || material.cost || 0)),
      }));

      // Build enhanced notes with project and pricing information
      const enhancedNotes = [
        `Project Type: ${projectType.charAt(0).toUpperCase() + projectType.slice(1)}`,
        quoteNotes ? `\\nAdditional Notes:\\n${quoteNotes}` : ''
      ].filter(Boolean).join('\\n');

      // Get global organization settings
      const defaultTerms = getDefaultQuoteTerms();

      // Calculate subtotal
      const subtotal = quoteAmount;
      
      // Calculate tax amounts
      const discountPercent = 0;
      const discountAmount = 0;
      const afterDiscount = subtotal - discountAmount;
      const total = afterDiscount + taxAmount + taxAmount2;

      // Create quote data
      const quoteData = {
        title: quoteTitle,
        contact_id: selectedContact,
        subtotal: subtotal,
        discount_percent: discountPercent,
        discount_amount: discountAmount,
        tax_percent: taxRate,
        tax_percent_2: taxRate2,
        tax_amount: taxAmount,
        tax_amount_2: taxAmount2,
        total: total,
        status: 'draft',
        valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
        notes: enhancedNotes,
        terms: defaultTerms,
        line_items: lineItems,
      };

      console.log('[ProjectQuoteGenerator] Creating quote:', quoteData);

      await quotesAPI.create(quoteData);

      showAlert('success', 'Quote created successfully!');
      
      // Reset form
      setTimeout(() => {
        setIsOpen(false);
        setQuoteTitle('');
        setQuoteNotes('');
        setSelectedContact('');
      }, 2000);

    } catch (error: any) {
      console.error('Error creating quote:', error);
      showAlert('error', error.message || 'Failed to create quote');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) {
    return (
      <div className="print:hidden">
        <Button 
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2"
          variant="outline"
        >
          <FileText className="w-4 h-4" />
          Create Quote for Customer
        </Button>
      </div>
    );
  }

  return (
    <Card className="print:hidden">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileText className="w-4 h-4" />
          Create Quote from {projectType.charAt(0).toUpperCase() + projectType.slice(1)} Plan
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {alert && (
          <Alert variant={alert.type === 'error' ? 'destructive' : 'default'} className="py-2">
            {alert.type === 'success' ? (
              <Check className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <AlertDescription className="text-sm">{alert.message}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-3">
          {/* Customer Selection */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <Label htmlFor="customer" className="flex items-center gap-1.5 text-sm">
                <User className="w-3.5 h-3.5" />
                Customer *
              </Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={loadContacts}
                disabled={isLoading}
                className="h-6 py-0 px-2 text-xs"
              >
                <RefreshCw className={`w-3 h-3 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
            <Select value={selectedContact} onValueChange={setSelectedContact}>
              <SelectTrigger id="customer" className="h-9">
                <SelectValue placeholder="Select a customer..." />
              </SelectTrigger>
              <SelectContent>
                {isLoading ? (
                  <SelectItem value="loading" disabled>Loading contacts...</SelectItem>
                ) : contacts.length === 0 ? (
                  <SelectItem value="empty" disabled>No contacts found</SelectItem>
                ) : (
                  contacts.map((contact) => (
                    <SelectItem key={contact.id} value={contact.id}>
                      {contact.name}{contact.company ? ` (${contact.company})` : ''}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {contacts.length === 0 && !isLoading && (
              <p className="text-xs text-slate-500 mt-1">
                No contacts found. Create a contact first.
              </p>
            )}
          </div>
        </div>

        {/* Quote Title */}
        <div>
          <Label htmlFor="quoteTitle" className="text-sm mb-1.5 block">Quote Title *</Label>
          <Input
            id="quoteTitle"
            value={quoteTitle}
            onChange={(e) => setQuoteTitle(e.target.value)}
            placeholder={`${projectType.charAt(0).toUpperCase() + projectType.slice(1)} Construction Quote`}
            className="h-9"
          />
        </div>

        {/* Materials Summary */}
        <div>
          <Label className="text-sm mb-1.5 block">Materials ({materials.length} items)</Label>
          <div className="h-9 flex items-center text-xs text-slate-600 bg-slate-50 rounded-md px-3 border">
            {materials.length > 0 ? (
              <span className="truncate">
                {materials.slice(0, 2).map(m => m.description || m.name || m.item || 'Material').join(', ')}
                {materials.length > 2 && ` +${materials.length - 2} more`}
              </span>
            ) : (
              <span className="text-slate-400">No materials</span>
            )}
          </div>
        </div>

        {/* Price Summary */}
        {selectedContact && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-700">Subtotal:</span>
              <span className="text-slate-900">${totalCost.toFixed(2)}</span>
            </div>
            {taxRate > 0 && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600">Tax ({taxRate}%):</span>
                <span className="text-slate-700">${taxAmount.toFixed(2)}</span>
              </div>
            )}
            {taxRate2 > 0 && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600">Tax 2 ({taxRate2}%):</span>
                <span className="text-slate-700">${taxAmount2.toFixed(2)}</span>
              </div>
            )}
            <div className="flex items-center justify-between border-t border-blue-300 pt-2">
              <span className="text-slate-900 font-medium">Total (incl. tax):</span>
              <span className="text-blue-900 font-semibold">${quoteTotalWithTax.toFixed(2)}</span>
            </div>
            {totalCost === 0 && (
              <div className="text-xs text-amber-600 pt-1 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                ⚠️ No pricing set. Configure Item Defaults in Organization Settings.
              </div>
            )}
          </div>
        )}

        {/* Quote Notes */}
        <div>
          <Label htmlFor="quoteNotes" className="text-sm mb-1.5 block">Notes (Optional)</Label>
          <Textarea
            id="quoteNotes"
            value={quoteNotes}
            onChange={(e) => setQuoteNotes(e.target.value)}
            placeholder="Add any additional notes or terms..."
            rows={2}
            className="text-sm resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button 
            onClick={handleGenerateQuote}
            disabled={isSaving || !selectedContact || !quoteTitle.trim()}
            className="flex-1 h-9"
            size="sm"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <FileText className="w-4 h-4 mr-2" />
                Create Quote
              </>
            )}
          </Button>
          <Button 
            onClick={() => setIsOpen(false)}
            variant="outline"
            disabled={isSaving}
            size="sm"
            className="h-9"
          >
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}