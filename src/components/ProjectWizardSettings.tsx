import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Loader2, Save, Hammer, RefreshCw, Home, Warehouse, Building2 } from 'lucide-react';
import {
  getProjectWizardDefaults,
  upsertProjectWizardDefault,
  getInventoryItemsForDropdown,
  ProjectWizardDefault,
  InventoryItem,
} from '../utils/project-wizard-defaults-client';
import { InventoryCombobox } from './InventoryCombobox';

interface ProjectWizardSettingsProps {
  organizationId: string;
  onSave: (type: 'success' | 'error', message: string) => void;
}

// Define material categories for each planner type - organized by category sections
const PLANNER_CATEGORIES = {
  deck: {
    spruce: {
      'Framing': ['Joists', 'Rim Joists', 'Beams', 'Posts', 'Stair Stringers'],
      'Decking': ['Decking Boards', 'Stair Treads'],
      'Railing': ['Railing Posts', 'Railing Top Rail', 'Railing Bottom Rail', 'Railing Balusters'],
      'Hardware': ['Joist Hangers', 'Post Anchors', 'Concrete Mix', 'Structural Screws', 'Deck Screws'],
    },
    treated: {
      'Framing': ['Joists', 'Rim Joists', 'Beams', 'Posts', 'Stair Stringers'],
      'Decking': ['Decking Boards', 'Stair Treads'],
      'Railing': ['Railing Posts', 'Railing Top Rail', 'Railing Bottom Rail', 'Railing Balusters'],
      'Hardware': ['Joist Hangers', 'Post Anchors', 'Concrete Mix', 'Structural Screws', 'Deck Screws'],
    },
    composite: {
      'Framing': ['Joists', 'Rim Joists', 'Beams', 'Posts', 'Stair Stringers'],
      'Decking': ['Decking Boards'],
      'Railing': ['Railing Posts', 'Railing Top Rail', 'Railing Bottom Rail', 'Railing Balusters'],
      'Hardware': ['Deck Clips', 'Screws', 'Plugs', 'Joist Hangers', 'Post Anchors', 'Concrete Mix', 'Structural Screws'],
    },
    cedar: {
      'Framing': ['Joists', 'Rim Joists', 'Beams', 'Posts', 'Stair Stringers'],
      'Decking': ['Decking Boards', 'Stair Treads'],
      'Railing': ['Railing Posts', 'Railing Top Rail', 'Railing Bottom Rail', 'Railing Balusters'],
      'Hardware': ['Joist Hangers', 'Post Anchors', 'Concrete Mix', 'Structural Screws', 'Deck Screws'],
    },
  },
  garage: {
    default: {
      'Foundation': ['Concrete Slab', 'Vapor Barrier', 'Gravel Base', 'Rebar', 'Wire Mesh'],
      'Framing': ['Wall Framing (2x4)', 'Wall Framing (2x6)', 'Plates', 'Headers', 'Blocking/Bracing', 'Roof Trusses', 'Wall Sheathing', 'Roof Sheathing'],
      'Roofing': ['Felt Underlayment', 'Roof Shingles', 'Ridge Cap', 'Drip Edge', 'Roofing Nails'],
      'Siding': ['House Wrap', 'Siding', 'Trim Boards', 'Fascia Boards'],
      'Doors': ['Garage Door', 'Garage Door Opener', 'Entry Door'],
      'Windows': ['Windows'],
      'Hardware': ['16d Common Nails', '8d Common Nails', 'Joist Hangers', 'Hurricane Ties', 'Construction Adhesive', 'Anchor Bolts'],
      'Electrical': ['Sub-Panel', 'Romex Wire', 'LED Shop Lights', 'Outlets (GFCI)', 'Light Switches', 'Junction Boxes'],
      'Insulation': ['Insulation (Walls)', 'Insulation (Ceiling)', 'Vapor Barrier (Insulation)'],
    },
  },
  shed: {
    default: {
      'Foundation': ['Foundation Skids', 'Concrete Blocks', 'Runners', 'Gravel', 'Landscape Fabric', 'Border', 'Concrete Slab', 'Wire Mesh', 'Vapor Barrier'],
      'Framing': ['Floor Joists', 'Rim Joists', 'Wall Framing', 'Plates', 'Headers', 'Roof Rafters', 'Roof Trusses', 'Collar Ties', 'Ridge Board', 'Loft Joists', 'Wall Sheathing', 'Roof Sheathing'],
      'Flooring': ['Floor Decking'],
      'Roofing': ['Felt Underlayment', 'Roof Shingles', 'Ridge Cap', 'Drip Edge', 'Roofing Nails'],
      'Siding': ['House Wrap', 'Siding'],
      'Doors': ['Door', 'Door Hardware', 'Hinges', 'Handle/Latch'],
      'Windows': ['Windows', 'Shutters'],
      'Trim': ['Corner Trim', 'Fascia Boards', 'Door/Window Trim', 'Flower Box Kit'],
      'Hardware': ['16d Common Nails', '8d Box Nails', 'Deck Screws', 'Hurricane Ties', 'Construction Adhesive'],
      'Electrical': ['Electrical Wire', 'Light Fixture', 'Outlet (GFCI)', 'Light Switch', 'Junction Box'],
      'Accessories': ['Shelf Supports', 'Plywood Shelving', 'Shelf Brackets'],
    },
  },
  roof: {
    default: {
      'Roofing': ['Shingles', 'Underlayment', 'Ice & Water Shield', 'Drip Edge', 'Ridge Cap', 'Starter Shingles', 'Roofing Nails', 'Roof Sealant'],
      'Flashing': ['Step Flashing', 'Valley Flashing', 'Chimney Flashing', 'Vent Pipe Flashing', 'Skylight Flashing'],
      'Ventilation': ['Ridge Vent', 'Soffit Vents', 'Gable Vents', 'Roof Vents', 'Turbine Vents', 'Baffles'],
      'Gutters': ['Gutters', 'Downspouts', 'Gutter Hangers', 'End Caps', 'Elbows', 'Gutter Guards'],
      'Decking': ['Roof Sheathing (Plywood)', 'Roof Sheathing (OSB)', 'H-Clips'],
      'Accessories': ['Roof Jacks', 'Roof Anchors', 'Roof Brackets', 'Ridge Vent Connectors'],
    },
  },
};

export function ProjectWizardSettings({ organizationId, onSave }: ProjectWizardSettingsProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [defaults, setDefaults] = useState<Record<string, string>>({});
  const [selectedDeckType, setSelectedDeckType] = useState<'spruce' | 'treated' | 'composite' | 'cedar'>('treated');

  // Refs for scrolling to each planner section
  const deckRef = React.useRef<HTMLDivElement>(null);
  const garageRef = React.useRef<HTMLDivElement>(null);
  const shedRef = React.useRef<HTMLDivElement>(null);
  const roofRef = React.useRef<HTMLDivElement>(null);

  // Scroll to planner section
  const scrollToPlanner = (planner: string) => {
    let ref: React.RefObject<HTMLDivElement> | null = null;
    
    switch (planner) {
      case 'deck':
        ref = deckRef;
        break;
      case 'garage':
        ref = garageRef;
        break;
      case 'shed':
        ref = shedRef;
        break;
      case 'roof':
        ref = roofRef;
        break;
    }
    
    if (ref?.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Add a small offset to account for any fixed headers
      setTimeout(() => {
        window.scrollBy({ top: -20, behavior: 'smooth' });
      }, 300);
    }
  };

  useEffect(() => {
    // Only load if we have a valid organization ID
    if (organizationId) {
      loadData();
    } else {
      console.warn('[ProjectWizardSettings] Skipping load - organizationId is undefined');
    }
  }, [organizationId]);

  const loadData = async () => {
    // Guard against undefined organizationId
    if (!organizationId) {
      console.error('[ProjectWizardSettings] Cannot load data - organizationId is undefined');
      onSave('error', 'Unable to load settings. Please refresh the page.');
      setLoading(false);
      return;
    }

    setLoading(true);
    console.log('[ProjectWizardSettings] ⚡ Loading data for org:', organizationId);
    
    try {
      // First, load just the wizard defaults (fast!)
      console.log('[ProjectWizardSettings] 📋 Step 1: Loading wizard defaults...');
      const wizardDefaults = await getProjectWizardDefaults(organizationId);
      console.log('[ProjectWizardSettings] ✅ Loaded wizard defaults:', wizardDefaults.length);

      // Convert defaults array to lookup object
      const defaultsMap: Record<string, string> = {};
      const itemIdsToFetch: string[] = [];
      
      wizardDefaults.forEach((def) => {
        const key = `${def.planner_type}-${def.material_type || 'default'}-${def.material_category}`;
        if (def.inventory_item_id) {
          defaultsMap[key] = def.inventory_item_id;
          itemIdsToFetch.push(def.inventory_item_id);
        }
      });
      
      console.log('[ProjectWizardSettings] 📊 Defaults map size:', Object.keys(defaultsMap).length);
      setDefaults(defaultsMap);

      // Now load only the inventory items that are currently set as defaults (fast!)
      console.log('[ProjectWizardSettings] 📦 Step 2: Loading', itemIdsToFetch.length, 'inventory items that are set as defaults...');
      let items: InventoryItem[] = [];
      
      if (itemIdsToFetch.length > 0) {
        items = await getInventoryItemsForDropdown(organizationId, itemIdsToFetch);
        console.log('[ProjectWizardSettings] ✅ Loaded', items.length, 'inventory items');
      }

      setInventoryItems(items);
      
      // Load the full inventory list in the background (lazy load)
      console.log('[ProjectWizardSettings] 🔄 Step 3: Loading full inventory list in background...');
      setTimeout(async () => {
        const allItems = await getInventoryItemsForDropdown(organizationId);
        console.log('[ProjectWizardSettings] ✅ Background load complete:', allItems.length, 'total items');
        setInventoryItems(allItems);
      }, 100); // Small delay to let UI render first
      
    } catch (error) {
      console.error('[ProjectWizardSettings] ❌ Error loading project wizard settings:', error);
      // Only show error if it's not an authentication issue
      if (error && typeof error === 'object' && 'message' in error && !String(error.message).includes('auth')) {
        onSave('error', 'Failed to load project wizard settings');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDefaultChange = (plannerType: string, materialType: string | null, category: string, itemId: string) => {
    const key = `${plannerType}-${materialType || 'default'}-${category}`;
    // If "none" is selected, remove the entry; otherwise set it
    if (itemId === 'none') {
      setDefaults((prev) => {
        const { [key]: _, ...rest } = prev;
        return rest;
      });
    } else {
      setDefaults((prev) => ({
        ...prev,
        [key]: itemId,
      }));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const savePromises: Promise<any>[] = [];

      // Convert defaults back to array format and save
      Object.entries(defaults).forEach(([key, inventoryItemId]) => {
        const [plannerType, materialType, ...categoryParts] = key.split('-');
        const category = categoryParts.join('-');

        const defaultConfig: ProjectWizardDefault = {
          organization_id: organizationId,
          planner_type: plannerType as 'deck' | 'garage' | 'shed' | 'roof',
          material_type: materialType === 'default' ? undefined : materialType,
          material_category: category,
          inventory_item_id: inventoryItemId || undefined,
        };

        console.log('📝 Saving default config:', defaultConfig);
        savePromises.push(upsertProjectWizardDefault(defaultConfig));
      });

      console.log(`💾 Saving ${savePromises.length} defaults to database...`);
      const results = await Promise.all(savePromises);
      
      // Check if any saves failed (returned null)
      const failedSaves = results.filter(r => r === null);
      if (failedSaves.length > 0) {
        console.error(`❌ ${failedSaves.length} saves failed out of ${results.length}`);
        onSave('error', `Failed to save ${failedSaves.length} default(s). Check console for details.`);
      } else {
        console.log('✅ All defaults saved successfully!');
        onSave('success', 'Project Wizard defaults saved successfully!');
      }
    } catch (error) {
      console.error('❌ Error saving project wizard settings:', error);
      onSave('error', 'Failed to save project wizard settings');
    } finally {
      setSaving(false);
    }
  };

  const getDefaultValue = (plannerType: string, materialType: string | null, category: string): string => {
    const key = `${plannerType}-${materialType || 'default'}-${category}`;
    return defaults[key] || 'none';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Hammer className="h-5 w-5" />
                Project Wizard Material Defaults
              </CardTitle>
              <p className="text-sm text-gray-600 mt-2">
                Set default inventory items for each material category in the project wizards. These defaults will be pre-selected when creating new projects.
              </p>
            </div>
            <Button
              onClick={loadData}
              variant="outline"
              size="sm"
              disabled={loading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {inventoryItems.length === 0 && !loading && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
              ⚠️ No inventory items found. Please add inventory items first before setting defaults.
            </div>
          )}

          {inventoryItems.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
              ℹ️ Loaded {inventoryItems.length.toLocaleString()} inventory items
            </div>
          )}

          {/* Quick Navigation Dropdown */}
          <div className="bg-gradient-to-r from-slate-50 to-slate-100 border border-slate-300 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <Label htmlFor="planner-nav" className="text-sm font-medium text-slate-700 whitespace-nowrap">
                Jump to Planner:
              </Label>
              <Select onValueChange={scrollToPlanner}>
                <SelectTrigger id="planner-nav" className="w-[200px] bg-white">
                  <SelectValue placeholder="Select a planner..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="deck">
                    <div className="flex items-center gap-2">
                      <Home className="h-4 w-4 text-purple-600" />
                      <span>Deck Planner</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="garage">
                    <div className="flex items-center gap-2">
                      <Warehouse className="h-4 w-4 text-blue-600" />
                      <span>Garage Planner</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="shed">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-green-600" />
                      <span>Shed Planner</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="roof">
                    <div className="flex items-center gap-2">
                      <Hammer className="h-4 w-4 text-red-600" />
                      <span>Roof Planner</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Deck Planner Settings */}
          <div className="space-y-4 border-2 border-purple-200 rounded-lg p-6 bg-purple-50" ref={deckRef}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-purple-900 flex items-center gap-2">
                <Home className="h-5 w-5 text-purple-600" />
                Deck Planner
              </h3>
              <Select value={selectedDeckType} onValueChange={(value: any) => setSelectedDeckType(value)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="spruce">Spruce</SelectItem>
                  <SelectItem value="treated">Treated</SelectItem>
                  <SelectItem value="composite">Composite</SelectItem>
                  <SelectItem value="cedar">Cedar</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-6 p-4 bg-white rounded-lg border border-purple-100">
              {Object.entries(PLANNER_CATEGORIES.deck[selectedDeckType]).map(([sectionName, categories]) => (
                <div key={sectionName} className="space-y-3">
                  <h4 className="font-medium text-gray-700 border-b border-purple-200 pb-1">{sectionName}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {categories.map((category) => (
                      <div key={category} className="space-y-2">
                        <Label htmlFor={`deck-${selectedDeckType}-${category}`}>{category}</Label>
                        <InventoryCombobox
                          id={`deck-${selectedDeckType}-${category}`}
                          items={inventoryItems}
                          value={getDefaultValue('deck', selectedDeckType, category)}
                          onChange={(value) => handleDefaultChange('deck', selectedDeckType, category, value)}
                          placeholder="Select inventory item..."
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Garage Planner Settings */}
          <div className="space-y-4 border-2 border-blue-200 rounded-lg p-6 bg-blue-50" ref={garageRef}>
            <h3 className="text-lg font-semibold text-blue-900 flex items-center gap-2">
              <Warehouse className="h-5 w-5 text-blue-600" />
              Garage Planner
            </h3>
            <div className="space-y-6 p-4 bg-white rounded-lg border border-blue-100">
              {Object.entries(PLANNER_CATEGORIES.garage.default).map(([sectionName, categories]) => (
                <div key={sectionName} className="space-y-3">
                  <h4 className="font-medium text-gray-700 border-b border-blue-200 pb-1">{sectionName}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {categories.map((category) => (
                      <div key={category} className="space-y-2">
                        <Label htmlFor={`garage-${category}`}>{category}</Label>
                        <InventoryCombobox
                          id={`garage-${category}`}
                          items={inventoryItems}
                          value={getDefaultValue('garage', null, category)}
                          onChange={(value) => handleDefaultChange('garage', null, category, value)}
                          placeholder="Select inventory item..."
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Shed Planner Settings */}
          <div className="space-y-4 border-2 border-green-200 rounded-lg p-6 bg-green-50" ref={shedRef}>
            <h3 className="text-lg font-semibold text-green-900 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-green-600" />
              Shed Planner
            </h3>
            <div className="space-y-6 p-4 bg-white rounded-lg border border-green-100">
              {Object.entries(PLANNER_CATEGORIES.shed.default).map(([sectionName, categories]) => (
                <div key={sectionName} className="space-y-3">
                  <h4 className="font-medium text-gray-700 border-b border-green-200 pb-1">{sectionName}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {categories.map((category) => (
                      <div key={category} className="space-y-2">
                        <Label htmlFor={`shed-${category}`}>{category}</Label>
                        <InventoryCombobox
                          id={`shed-${category}`}
                          items={inventoryItems}
                          value={getDefaultValue('shed', null, category)}
                          onChange={(value) => handleDefaultChange('shed', null, category, value)}
                          placeholder="Select inventory item..."
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Roof Planner Settings */}
          <div className="space-y-4 border-2 border-red-200 rounded-lg p-6 bg-red-50" ref={roofRef}>
            <h3 className="text-lg font-semibold text-red-900 flex items-center gap-2">
              <Hammer className="h-5 w-5 text-red-600" />
              Roof Planner
            </h3>
            <div className="space-y-6 p-4 bg-white rounded-lg border border-red-100">
              {Object.entries(PLANNER_CATEGORIES.roof.default).map(([sectionName, categories]) => (
                <div key={sectionName} className="space-y-3">
                  <h4 className="font-medium text-gray-700 border-b border-red-200 pb-1">{sectionName}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {categories.map((category) => (
                      <div key={category} className="space-y-2">
                        <Label htmlFor={`roof-${category}`}>{category}</Label>
                        <InventoryCombobox
                          id={`roof-${category}`}
                          items={inventoryItems}
                          value={getDefaultValue('roof', null, category)}
                          onChange={(value) => handleDefaultChange('roof', null, category, value)}
                          placeholder="Select inventory item..."
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Project Wizard Defaults
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}