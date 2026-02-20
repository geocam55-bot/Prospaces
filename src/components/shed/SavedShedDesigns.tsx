import React, { useState, useEffect } from 'react';
import { createClient } from '../../utils/supabase/client';
import { ShedConfig, SavedShedDesign } from '../../types/shed';
import { CustomerSelector } from '../project-wizard/CustomerSelector';
import { OpportunitySelector } from '../project-wizard/OpportunitySelector';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { FileText, Trash2, Download, Save, User } from 'lucide-react';
import { Alert, AlertDescription } from '../ui/alert';
import type { User as AppUser } from '../../App';

interface SavedShedDesignsProps {
  user: AppUser;
  currentConfig: ShedConfig;
  materials: any[];
  totalCost: number;
  onLoadDesign: (config: ShedConfig, designInfo?: {
    name?: string;
    description?: string;
    customerName?: string;
    customerCompany?: string;
  }) => void;
}

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  price_level: string;
}

interface SavedDesign {
  id: string;
  name: string;
  description: string;
  config: ShedConfig;
  customer_id: string | null;
  customer_name: string | null;
  customer_company: string | null;
  price_tier: string;
  total_cost: number;
  materials: any[];
  created_at: string;
  updated_at: string;
}

export function SavedShedDesigns({ 
  user,
  currentConfig, 
  materials,
  totalCost,
  onLoadDesign 
}: SavedShedDesignsProps) {
  const [designs, setDesigns] = useState<SavedDesign[]>([]);
  const [saveName, setSaveName] = useState('');
  const [saveDescription, setSaveDescription] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedOpportunityId, setSelectedOpportunityId] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Only load if we have a valid organization ID
    if (user.organizationId) {
      loadDesigns();
    } else {
      console.warn('[SavedShedDesigns] Skipping load - organizationId is undefined');
    }
  }, [user.organizationId]);

  const loadDesigns = async () => {
    // Guard against undefined organizationId
    if (!user.organizationId) {
      console.error('[SavedShedDesigns] Cannot load designs - organizationId is undefined');
      setSaveMessage('Unable to load designs. Please refresh the page.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setSaveMessage(''); // Clear any previous messages
    console.log('[SavedShedDesigns] Loading designs for org:', user.organizationId);
    
    try {
      const { data, error } = await createClient()
        .from('saved_shed_designs')
        .select(`
          id,
          name,
          description,
          config,
          customer_id,
          price_tier,
          total_cost,
          materials,
          created_at,
          updated_at
        `)
        .eq('organization_id', user.organizationId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[SavedShedDesigns] Error loading designs:', error);
        throw error;
      }

      console.log('[SavedShedDesigns] Loaded designs:', data?.length || 0);

      // Fetch customer details separately for designs that have a customer_id
      const designsWithCustomers = await Promise.all(
        (data || []).map(async (design: any) => {
          let customerName = null;
          let customerCompany = null;

          if (design.customer_id) {
            const { data: contact } = await createClient()
              .from('contacts')
              .select('name, company')
              .eq('id', design.customer_id)
              .single();
            
            if (contact) {
              customerName = contact.name;
              customerCompany = contact.company;
            }
          }

          return {
            id: design.id,
            name: design.name,
            description: design.description,
            config: design.config,
            customer_id: design.customer_id,
            customer_name: customerName,
            customer_company: customerCompany,
            price_tier: design.price_tier,
            total_cost: design.total_cost,
            materials: design.materials,
            created_at: design.created_at,
            updated_at: design.updated_at,
          };
        })
      );

      setDesigns(designsWithCustomers);
    } catch (error) {
      console.error('Error loading saved designs:', error);
      setSaveMessage('Error loading designs. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const saveDesign = async () => {
    if (!saveName.trim()) {
      setSaveMessage('Please enter a name for your design');
      return;
    }

    setIsSaving(true);
    try {
      const { data, error } = await createClient()
        .from('saved_shed_designs')
        .insert({
          organization_id: user.organizationId,
          user_id: user.id,
          customer_id: selectedCustomer?.id || null,
          opportunity_id: selectedOpportunityId,
          name: saveName.trim(),
          description: saveDescription.trim() || null,
          config: currentConfig,
          price_tier: selectedCustomer?.price_level || 't1',
          total_cost: totalCost,
          materials: materials,
        })
        .select()
        .single();

      if (error) {
        console.error('Supabase error details:', error);
        throw new Error(`Database error: ${error.message}`);
      }

      console.log('✓ Design saved to Supabase successfully:', data);
      setSaveName('');
      setSaveDescription('');
      setSelectedCustomer(null);
      setSelectedOpportunityId(null);
      setSaveMessage('Design saved successfully to database!');
      setTimeout(() => setSaveMessage(''), 3000);
      
      await loadDesigns();
    } catch (error: any) {
      console.error('Error saving design:', error);
      setSaveMessage(`Error saving design: ${error.message || 'Please check console for details'}`);
      setTimeout(() => setSaveMessage(''), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  const deleteDesign = async (id: string) => {
    if (!confirm('Are you sure you want to delete this design?')) return;

    try {
      const { error } = await createClient()
        .from('saved_shed_designs')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await loadDesigns();
    } catch (error) {
      console.error('Error deleting design:', error);
      setSaveMessage('Error deleting design. Please try again.');
    }
  };

  const exportDesign = (design: SavedDesign) => {
    const exportData = {
      name: design.name,
      description: design.description,
      config: design.config,
      materials: design.materials,
      total_cost: design.total_cost,
      exported_at: new Date().toISOString(),
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `shed-design-${design.name.replace(/\s+/g, '-')}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Save Current Design */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Save className="w-4 h-4" />
            Save Current Design
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="saveName">Design Name *</Label>
            <Input
              id="saveName"
              placeholder="e.g., Client Smith - 10x12 Barn Style Shed"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && saveDesign()}
            />
          </div>

          <div>
            <Label htmlFor="saveDescription">Description (Optional)</Label>
            <Textarea
              id="saveDescription"
              placeholder="Add notes about this design..."
              value={saveDescription}
              onChange={(e) => setSaveDescription(e.target.value)}
              rows={3}
            />
          </div>

          <CustomerSelector
            organizationId={user.organizationId}
            selectedCustomer={selectedCustomer}
            onCustomerSelect={setSelectedCustomer}
          />
          
          <OpportunitySelector
            organizationId={user.organizationId}
            customerId={selectedCustomer?.id || null}
            selectedOpportunityId={selectedOpportunityId}
            onOpportunitySelect={setSelectedOpportunityId}
          />
          
          {saveMessage && (
            <Alert className={saveMessage.includes('success') ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50'}>
              <AlertDescription className={saveMessage.includes('success') ? 'text-green-800' : 'text-yellow-800'}>
                {saveMessage}
              </AlertDescription>
            </Alert>
          )}
          
          <Button 
            onClick={saveDesign} 
            className="w-full"
            disabled={isSaving}
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Design'}
          </Button>
          
          <div className="text-xs text-slate-500 space-y-1">
            <p>• Designs are saved to your organization's database</p>
            <p>• Current: {currentConfig.width}' × {currentConfig.length}' {currentConfig.style} shed</p>
            <p>• Estimated Cost: ${totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
        </CardContent>
      </Card>

      {/* Saved Designs List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="w-4 h-4" />
            Saved Designs ({designs.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-slate-500">
              Loading designs...
            </div>
          ) : designs.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No saved designs yet</p>
              <p className="text-sm mt-1">Save your first design above to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {designs.map((design) => (
                <div
                  key={design.id}
                  className="border border-slate-200 rounded-lg p-4 hover:border-green-300 hover:bg-green-50/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="font-medium text-slate-900">{design.name}</h3>
                      {design.description && (
                        <p className="text-sm text-slate-600 mt-1">{design.description}</p>
                      )}
                      <div className="text-sm text-slate-600 mt-2">
                        {design.config.width}' × {design.config.length}' • {design.config.style} style
                        {design.config.hasLoft && ' • w/Loft'}
                      </div>
                      {design.customer_name && (
                        <div className="flex items-center gap-2 mt-2 text-sm text-slate-700">
                          <User className="w-3 h-3" />
                          <span>{design.customer_name}</span>
                          {design.customer_company && (
                            <span className="text-slate-500">({design.customer_company})</span>
                          )}
                          <span className="text-green-600 ml-2">
                            {design.price_tier.toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                        <span>Saved {new Date(design.created_at).toLocaleDateString()}</span>
                        <span>•</span>
                        <span className="text-green-600">${design.total_cost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 mt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => onLoadDesign(design.config, {
                        name: design.name,
                        description: design.description,
                        customerName: design.customer_name,
                        customerCompany: design.customer_company,
                      })}
                    >
                      Load Design
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => exportDesign(design)}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 hover:bg-red-50"
                      onClick={() => deleteDesign(design.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}