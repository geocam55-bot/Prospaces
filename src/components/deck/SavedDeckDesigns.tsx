import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { DeckConfig } from '../../types/deck';
import { CustomerSelector } from '../project-wizard/CustomerSelector';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { FileText, Trash2, Download, Save, User } from 'lucide-react';
import { Alert, AlertDescription } from '../ui/alert';
import type { User as AppUser } from '../../App';

interface SavedDeckDesignsProps {
  user: AppUser;
  currentConfig: DeckConfig;
  materials: any[];
  totalCost: number;
  onLoadDesign: (config: DeckConfig) => void;
}

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  price_tier: string;
}

interface SavedDesign {
  id: string;
  name: string;
  description: string;
  config: DeckConfig;
  customer_id: string | null;
  customer_name: string | null;
  customer_company: string | null;
  price_tier: string;
  total_cost: number;
  materials: any[];
  created_at: string;
  updated_at: string;
}

export function SavedDeckDesigns({ 
  user,
  currentConfig, 
  materials,
  totalCost,
  onLoadDesign 
}: SavedDeckDesignsProps) {
  const [designs, setDesigns] = useState<SavedDesign[]>([]);
  const [saveName, setSaveName] = useState('');
  const [saveDescription, setSaveDescription] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [saveMessage, setSaveMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadDesigns();
  }, [user.organizationId]);

  const loadDesigns = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('saved_deck_designs')
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
          updated_at,
          contacts:customer_id (
            name,
            company
          )
        `)
        .eq('organization_id', user.organizationId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedDesigns = (data || []).map((design: any) => ({
        id: design.id,
        name: design.name,
        description: design.description,
        config: design.config,
        customer_id: design.customer_id,
        customer_name: design.contacts?.name || null,
        customer_company: design.contacts?.company || null,
        price_tier: design.price_tier,
        total_cost: design.total_cost,
        materials: design.materials,
        created_at: design.created_at,
        updated_at: design.updated_at,
      }));

      setDesigns(formattedDesigns);
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
      const { data, error } = await supabase
        .from('saved_deck_designs')
        .insert({
          organization_id: user.organizationId,
          user_id: user.id,
          customer_id: selectedCustomer?.id || null,
          name: saveName.trim(),
          description: saveDescription.trim() || null,
          config: currentConfig,
          price_tier: selectedCustomer?.price_tier || 't1',
          total_cost: totalCost,
          materials: materials,
        })
        .select()
        .single();

      if (error) throw error;

      setSaveName('');
      setSaveDescription('');
      setSelectedCustomer(null);
      setSaveMessage('Design saved successfully!');
      setTimeout(() => setSaveMessage(''), 3000);
      
      await loadDesigns();
    } catch (error) {
      console.error('Error saving design:', error);
      setSaveMessage('Error saving design. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const deleteDesign = async (id: string) => {
    if (!confirm('Are you sure you want to delete this design?')) return;

    try {
      const { error } = await supabase
        .from('saved_deck_designs')
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
    link.download = `deck-design-${design.name.replace(/\s+/g, '-')}.json`;
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
              placeholder="e.g., Johnson Residence - 14x18 Deck"
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
            <p>• Current: {currentConfig.width}' × {currentConfig.length}' {currentConfig.shape} deck</p>
            <p>• Estimated Cost: ${totalCost.toLocaleString()}</p>
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
                  className="border border-slate-200 rounded-lg p-4 hover:border-purple-300 hover:bg-purple-50/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="font-medium text-slate-900">{design.name}</h3>
                      {design.description && (
                        <p className="text-sm text-slate-600 mt-1">{design.description}</p>
                      )}
                      <div className="text-sm text-slate-600 mt-2">
                        {design.config.width}' × {design.config.length}' • {design.config.shape} shape
                        {design.config.hasStairs && ' • w/Stairs'}
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
                        <span className="text-green-600">${design.total_cost.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 mt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => onLoadDesign(design.config)}
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
