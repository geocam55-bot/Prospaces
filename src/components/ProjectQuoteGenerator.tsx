import React, { useState, useEffect } from 'react';
import { FileText, User, Target, DollarSign, Loader2, Check, AlertCircle } from 'lucide-react';
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
  first_name: string;
  last_name: string;
  company_name?: string;
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
      const { contacts: data } = await contactsAPI.getAll();
      setContacts(data || []);
    } catch (error) {
      console.error('Error loading contacts:', error);
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
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Create Quote from {projectType.charAt(0).toUpperCase() + projectType.slice(1)} Plan
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {alert && (
          <Alert variant={alert.type === 'error' ? 'destructive' : 'default'}>
            {alert.type === 'success' ? (
              <Check className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <AlertDescription>{alert.message}</AlertDescription>
          </Alert>
        )}

        {/* Customer Selection */}
        <div>
          <Label htmlFor="customer" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            Customer *
          </Label>
          <Select value={selectedContact} onValueChange={setSelectedContact}>
            <SelectTrigger id="customer">
              <SelectValue placeholder="Select a customer..." />
            </SelectTrigger>
            <SelectContent>
              {isLoading ? (
                <div className="p-4 text-center text-sm text-slate-500">
                  Loading contacts...
                </div>
              ) : contacts.length === 0 ? (
                <div className="p-4 text-center text-sm text-slate-500">
                  No contacts found
                </div>
              ) : (
                contacts.map((contact) => (
                  <SelectItem key={contact.id} value={contact.id}>
                    {contact.first_name} {contact.last_name}
                    {contact.company_name && ` (${contact.company_name})`}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Opportunity Selection */}
        {selectedContact && (
          <div>
            <Label htmlFor="opportunity" className="flex items-center gap-2">
              <Target className="w-4 h-4" />
              Link to Opportunity (Optional)
            </Label>
            <Select value={selectedOpportunity} onValueChange={setSelectedOpportunity}>
              <SelectTrigger id="opportunity">
                <SelectValue placeholder="Select an opportunity..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None - Create standalone quote</SelectItem>
                {opportunities.length > 0 ? (
                  opportunities.map((opp) => (
                    <SelectItem key={opp.id} value={opp.id}>
                      {opp.opportunity_name} ({opp.status})
                    </SelectItem>
                  ))
                ) : (
                  <div className="p-4 text-center text-sm text-slate-500">
                    No opportunities found for this customer
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Quote Title */}
        <div>
          <Label htmlFor="quoteTitle">Quote Title *</Label>
          <Input
            id="quoteTitle"
            value={quoteTitle}
            onChange={(e) => setQuoteTitle(e.target.value)}
            placeholder={`${projectType.charAt(0).toUpperCase() + projectType.slice(1)} Construction Quote`}
          />
        </div>

        {/* Markup Percentage */}
        <div>
          <Label htmlFor="markup" className="flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Markup Percentage
          </Label>
          <div className="flex items-center gap-2">
            <Input
              id="markup"
              type="number"
              value={markup}
              onChange={(e) => setMarkup(Number(e.target.value))}
              min="0"
              max="100"
              className="w-24"
            />
            <span className="text-sm text-slate-600">%</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Materials Cost: ${totalCost.toFixed(2)} → Quote Amount: ${finalAmount.toFixed(2)}
          </p>
        </div>

        {/* Quote Notes */}
        <div>
          <Label htmlFor="quoteNotes">Notes (Optional)</Label>
          <Textarea
            id="quoteNotes"
            value={quoteNotes}
            onChange={(e) => setQuoteNotes(e.target.value)}
            placeholder="Add any additional notes or terms..."
            rows={3}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-4">
          <Button 
            onClick={handleGenerateQuote}
            disabled={isSaving || !selectedContact || !quoteTitle.trim()}
            className="flex-1"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating Quote...
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
          >
            Cancel
          </Button>
        </div>

        {/* Materials Summary */}
        <div className="border-t pt-4 mt-4">
          <h4 className="text-sm font-medium mb-2">Materials Included ({materials.length} items)</h4>
          <div className="max-h-40 overflow-y-auto text-sm text-slate-600 space-y-1">
            {materials.slice(0, 5).map((material, index) => (
              <div key={index} className="flex justify-between">
                <span>{material.name || material.item}</span>
                <span>{material.quantity} {material.unit || 'ea'}</span>
              </div>
            ))}
            {materials.length > 5 && (
              <p className="text-xs text-slate-500 italic">
                + {materials.length - 5} more items...
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
