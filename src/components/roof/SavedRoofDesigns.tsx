import React, { useState, useEffect } from 'react';
import { RoofConfig, MaterialItem } from '../../types/roof';
import { createClient } from '../../utils/supabase/client';
import { CustomerSelector } from '../project-wizard/CustomerSelector';
import { OpportunitySelector } from '../project-wizard/OpportunitySelector';
import { Save, Trash2, Download, FileText, AlertCircle, User } from 'lucide-react';
import type { User as AppUser } from '../../App';

interface SavedRoofDesignsProps {
  user: AppUser;
  currentConfig: RoofConfig;
  materials: MaterialItem[];
  totalCost: number;
  onLoadDesign: (config: RoofConfig, info?: { name?: string; description?: string; customerName?: string; customerCompany?: string }) => void;
}

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  price_level: string;
}

export function SavedRoofDesigns({ user, currentConfig, materials, totalCost, onLoadDesign }: SavedRoofDesignsProps) {
  const [savedDesigns, setSavedDesigns] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [designName, setDesignName] = useState('');
  const [designDescription, setDesignDescription] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedOpportunityId, setSelectedOpportunityId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    loadSavedDesigns();
  }, [user.organizationId]);

  const loadSavedDesigns = async () => {
    try {
      setIsLoading(true);
      const supabase = createClient();
      
      const { data, error } = await supabase
        .from('saved_designs')
        .select('*')
        .eq('organization_id', user.organizationId)
        .eq('design_type', 'roof')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setSavedDesigns(data || []);
    } catch (error) {
      console.error('Error loading saved designs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveDesign = async () => {
    if (!designName.trim()) {
      setSaveError('Please enter a design name');
      return;
    }

    try {
      setIsSaving(true);
      setSaveError('');
      const supabase = createClient();

      const designData = {
        organization_id: user.organizationId,
        design_type: 'roof',
        name: designName,
        description: designDescription,
        customer_name: selectedCustomer?.name,
        customer_company: selectedCustomer?.company,
        config: currentConfig,
        materials: materials,
        total_cost: totalCost,
        created_by: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('saved_designs')
        .insert([designData]);

      if (error) throw error;

      // Reset form and reload designs
      setDesignName('');
      setDesignDescription('');
      setSelectedCustomer(null);
      setSelectedOpportunityId(null);
      setShowSaveDialog(false);
      await loadSavedDesigns();
    } catch (error) {
      console.error('Error saving design:', error);
      setSaveError('Failed to save design. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteDesign = async (id: string) => {
    if (!confirm('Are you sure you want to delete this design?')) return;

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('saved_designs')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await loadSavedDesigns();
    } catch (error) {
      console.error('Error deleting design:', error);
    }
  };

  const handleLoadDesign = (design: any) => {
    onLoadDesign(design.config, {
      name: design.name,
      description: design.description,
      customerName: design.customer_name,
      customerCompany: design.customer_company,
    });
  };

  return (
    <div className="space-y-6">
      {/* Save Current Design */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <h2 className="text-slate-900 mb-4">Save Current Design</h2>
        
        {!showSaveDialog ? (
          <button
            onClick={() => setShowSaveDialog(true)}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
          >
            <Save className="w-4 h-4" />
            Save This Design
          </button>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-slate-700 text-sm mb-1">
                Design Name *
              </label>
              <input
                type="text"
                value={designName}
                onChange={(e) => setDesignName(e.target.value)}
                placeholder="e.g., Smith Residence Roof"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-slate-700 text-sm mb-1">
                Description
              </label>
              <textarea
                value={designDescription}
                onChange={(e) => setDesignDescription(e.target.value)}
                placeholder="Add notes about this design..."
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-700 text-sm mb-1">
                  Customer Name
                </label>
                <CustomerSelector
                  organizationId={user.organizationId}
                  selectedCustomer={selectedCustomer}
                  onCustomerSelect={setSelectedCustomer}
                />
              </div>
              <div>
                <label className="block text-slate-700 text-sm mb-1">
                  Opportunity
                </label>
                <OpportunitySelector
                  organizationId={user.organizationId}
                  customerId={selectedCustomer?.id || null}
                  selectedOpportunityId={selectedOpportunityId}
                  onOpportunitySelect={setSelectedOpportunityId}
                />
              </div>
            </div>

            {saveError && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                <AlertCircle className="w-4 h-4" />
                {saveError}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleSaveDesign}
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Saving...' : 'Save Design'}
              </button>
              <button
                onClick={() => {
                  setShowSaveDialog(false);
                  setSaveError('');
                }}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Saved Designs List */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <h2 className="text-slate-900 mb-4">Saved Designs</h2>

        {isLoading ? (
          <div className="text-center py-8 text-slate-600">
            Loading saved designs...
          </div>
        ) : savedDesigns.length === 0 ? (
          <div className="text-center py-8 text-slate-600">
            <FileText className="w-12 h-12 mx-auto mb-3 text-slate-400" />
            <p>No saved designs yet</p>
            <p className="text-sm mt-1">Save your first roof design to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {savedDesigns.map((design) => (
              <div
                key={design.id}
                className="p-4 border-2 border-slate-200 rounded-lg hover:border-orange-400 transition-colors"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-900 truncate">
                      {design.name}
                    </h3>
                    {design.description && (
                      <p className="text-sm text-slate-600 mt-1 line-clamp-2">
                        {design.description}
                      </p>
                    )}
                    {design.customer_name && (
                      <p className="text-xs text-slate-500 mt-1">
                        Customer: {design.customer_name}
                      </p>
                    )}
                  </div>
                </div>

                <div className="text-xs text-slate-500 space-y-1 mb-3">
                  <div>
                    {design.config.length}' × {design.config.width}' • {design.config.style} roof
                  </div>
                  <div>
                    {design.config.pitch} pitch • {design.config.shingleType}
                  </div>
                  {design.total_cost > 0 && (
                    <div className="font-semibold text-orange-600">
                      Est. Cost: ${design.total_cost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  )}
                  <div>
                    Saved: {new Date(design.created_at).toLocaleDateString()}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleLoadDesign(design)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm"
                  >
                    <Download className="w-4 h-4" />
                    Load
                  </button>
                  <button
                    onClick={() => handleDeleteDesign(design.id)}
                    className="flex items-center justify-center gap-2 px-3 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors text-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}