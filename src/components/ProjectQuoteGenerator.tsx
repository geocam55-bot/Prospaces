import React, { useState, useEffect } from 'react';
import { FileText, User, Target, DollarSign, Loader2, Check, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Alert, AlertDescription } from './ui/alert';
import { contactsAPI, opportunitiesAPI, quotesAPI } from '../utils/api';
import type { User as AppUser } from '../App';

interface ProjectQuoteGeneratorProps {
  user: AppUser;
  projectType: 'deck' | 'garage' | 'shed';
  materials: any[];
  totalCost: number;
  projectData: any;
}

interface Contact {
  id: string;
  name: string;
  company?: string;
  email?: string;
}

interface Opportunity {
  id: string;
  opportunity_name: string;
  status: string;
  value: number;
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
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [selectedContact, setSelectedContact] = useState<string>('');
  const [selectedOpportunity, setSelectedOpportunity] = useState<string>('none');
  const [quoteTitle, setQuoteTitle] = useState('');
  const [quoteNotes, setQuoteNotes] = useState('');
  const [markup, setMarkup] = useState(20); // Default 20% markup
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

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
      loadOpportunities(selectedContact);
    } else {
      setOpportunities([]);
      setSelectedOpportunity('none');
    }
  }, [selectedContact]);

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

  const loadOpportunities = async (contactId: string) => {
    try {
      const { opportunities: data } = await opportunitiesAPI.getByCustomer(contactId);
      setOpportunities(data || []);
    } catch (error) {
      console.error('Error loading opportunities:', error);
    }
  };

  const showAlert = (type: 'success' | 'error', message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 5000);
  };

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

      // Calculate quote amount with markup
      const quoteAmount = totalCost * (1 + markup / 100);

      // Build line items from materials
      const lineItems = materials.map((material, index) => ({
        id: `item_${index}`,
        description: material.name || material.item,
        quantity: material.quantity,
        unit: material.unit || 'ea',
        unit_price: material.costPerUnit || material.cost || 0,
        total: (material.quantity * (material.costPerUnit || material.cost || 0)),
      }));

      // Create quote data
      const quoteData = {
        title: quoteTitle,
        contact_id: selectedContact,
        opportunity_id: selectedOpportunity !== 'none' ? selectedOpportunity : null,
        amount: quoteAmount,
        status: 'draft',
        valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
        notes: quoteNotes,
        line_items: lineItems,
        metadata: {
          project_type: projectType,
          project_data: projectData,
          materials_cost: totalCost,
          markup_percentage: markup,
        },
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
        setSelectedOpportunity('none');
      }, 2000);

    } catch (error: any) {
      console.error('Error creating quote:', error);
      showAlert('error', error.message || 'Failed to create quote');
    } finally {
      setIsSaving(false);
    }
  };

  const finalAmount = totalCost * (1 + markup / 100);

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

          {/* Opportunity Selection */}
          <div>
            <Label htmlFor="opportunity" className="flex items-center gap-1.5 mb-1.5 text-sm">
              <Target className="w-3.5 h-3.5" />
              Link to Opportunity (Optional)
            </Label>
            <Select 
              value={selectedOpportunity} 
              onValueChange={setSelectedOpportunity}
              disabled={!selectedContact}
            >
              <SelectTrigger id="opportunity" className="h-9">
                <SelectValue placeholder="Select an opportunity..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None - Standalone quote</SelectItem>
                {opportunities.length > 0 ? (
                  opportunities.map((opp) => (
                    <SelectItem key={opp.id} value={opp.id}>
                      {opp.opportunity_name} ({opp.status})
                    </SelectItem>
                  ))
                ) : (
                  <div className="p-2 text-center text-xs text-slate-500">
                    No opportunities for this customer
                  </div>
                )}
              </SelectContent>
            </Select>
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

        <div className="space-y-3">
          {/* Markup Percentage */}
          <div>
            <Label htmlFor="markup" className="flex items-center gap-1.5 mb-1.5 text-sm">
              <DollarSign className="w-3.5 h-3.5" />
              Markup %
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="markup"
                type="number"
                value={markup}
                onChange={(e) => setMarkup(Number(e.target.value))}
                min="0"
                max="100"
                className="w-20 h-9"
              />
              <span className="text-xs text-slate-600">
                ${totalCost.toFixed(2)} → ${finalAmount.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Materials Summary */}
          <div>
            <Label className="text-sm mb-1.5 block">Materials ({materials.length} items)</Label>
            <div className="h-9 flex items-center text-xs text-slate-600 bg-slate-50 rounded-md px-3 border">
              {materials.length > 0 ? (
                <span className="truncate">
                  {materials.slice(0, 2).map(m => m.name || m.item).join(', ')}
                  {materials.length > 2 && ` +${materials.length - 2} more`}
                </span>
              ) : (
                <span className="text-slate-400">No materials</span>
              )}
            </div>
          </div>
        </div>

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