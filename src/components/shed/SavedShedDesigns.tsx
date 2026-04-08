import React, { useState, useEffect } from 'react';
import { createClient } from '../../utils/supabase/client';
import { listDesigns, saveDesign as saveDesignApi, deleteDesign as deleteDesignApi } from '../../utils/designs-client';
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
      // Skipping load - organizationId is undefined
    }
  }, [user.organizationId]);

  const loadDesigns = async () => {
    if (!user.organizationId) {
      // Cannot load designs - organizationId is undefined
      setSaveMessage('Unable to load designs. Please refresh the page.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setSaveMessage('');
    // Loading designs for organization
    
    try {
      const data = await listDesigns('shed');
      // Loaded designs
      setDesigns(data as SavedDesign[]);
    } catch (error) {
      // Error loading saved designs
      setSaveMessage('Error loading designs. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveDesign = async () => {
    if (!saveName.trim()) {
      setSaveMessage('Please enter a name for your design');
      return;
    }

    setIsSaving(true);
    try {
      const data = await saveDesignApi('shed', {
        customer_id: selectedCustomer?.id || null,
        opportunity_id: selectedOpportunityId,
        name: saveName.trim(),
        description: saveDescription.trim() || null,
        config: currentConfig,
        price_tier: selectedCustomer?.price_level || 't1',
        total_cost: totalCost,
        materials: materials,
      });

      // Design saved via server successfully
      setSaveName('');
      setSaveDescription('');
      setSelectedCustomer(null);
      setSelectedOpportunityId(null);
      setSaveMessage('Design saved successfully to database!');
      setTimeout(() => setSaveMessage(''), 3000);
      
      await loadDesigns();
    } catch (error: any) {
      // Error saving design
      setSaveMessage(`Error saving design: ${error.message || 'Please check console for details'}`);
      setTimeout(() => setSaveMessage(''), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteDesign = async (id: string) => {
    if (!confirm('Are you sure you want to delete this design?')) return;

    try {
      await deleteDesignApi('shed', id);
      await loadDesigns();
    } catch (error) {
      // Error deleting design
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
              onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSaveDesign()}
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
            onClick={handleSaveDesign} 
            className="w-full"
            disabled={isSaving}
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Design'}
          </Button>
          
          <div className="text-xs text-muted-foreground space-y-1">
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
            <div className="text-center py-8 text-muted-foreground">
              Loading designs...
            </div>
          ) : designs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No saved designs yet</p>
              <p className="text-sm mt-1">Save your first design above to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {designs.map((design) => (
                <div
                  key={design.id}
                  className="border border-border rounded-lg p-4 hover:border-green-300 hover:bg-green-50/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="font-medium text-foreground">{design.name}</h3>
                      {design.description && (
                        <p className="text-sm text-muted-foreground mt-1">{design.description}</p>
                      )}
                      <div className="text-sm text-muted-foreground mt-2">
                        {design.config.width}' × {design.config.length}' • {design.config.style} style
                        {design.config.hasLoft && ' • w/Loft'}
                      </div>
                      {design.customer_name && (
                        <div className="flex items-center gap-2 mt-2 text-sm text-foreground">
                          <User className="w-3 h-3" />
                          <span>{design.customer_name}</span>
                          {design.customer_company && (
                            <span className="text-muted-foreground">({design.customer_company})</span>
                          )}
                          <span className="text-green-600 ml-2">
                            {design.price_tier.toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
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
                      onClick={() => handleDeleteDesign(design.id)}
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