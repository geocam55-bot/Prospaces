import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Loader2, Save, Hammer, RefreshCw } from 'lucide-react';
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
};

export function ProjectWizardSettings({ organizationId, onSave }: ProjectWizardSettingsProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [defaults, setDefaults] = useState<Record<string, string>>({});
  const [selectedDeckType, setSelectedDeckType] = useState<'spruce' | 'treated' | 'composite' | 'cedar'>('treated');

  useEffect(() => {
    loadData();
  }, [organizationId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [items, wizardDefaults] = await Promise.all([
        getInventoryItemsForDropdown(organizationId),
        getProjectWizardDefaults(organizationId),
      ]);

      setInventoryItems(items);

      // Convert defaults array to lookup object
      const defaultsMap: Record<string, string> = {};
      wizardDefaults.forEach((def) => {
        const key = `${def.planner_type}-${def.material_type || 'default'}-${def.material_category}`;
        if (def.inventory_item_id) {
          defaultsMap[key] = def.inventory_item_id;
        }
      });
      setDefaults(defaultsMap);
    } catch (error) {
      console.error('Error loading project wizard settings:', error);
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
          planner_type: plannerType as 'deck' | 'garage' | 'shed',
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

          {/* Deck Planner Settings */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Deck Planner</h3>
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

            <div className="space-y-6 p-4 bg-gray-50 rounded-lg">
              {Object.entries(PLANNER_CATEGORIES.deck[selectedDeckType]).map(([sectionName, categories]) => (
                <div key={sectionName} className="space-y-3">
                  <h4 className="font-medium text-gray-700 border-b pb-1">{sectionName}</h4>
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
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Garage Planner</h3>
            <div className="space-y-6 p-4 bg-gray-50 rounded-lg">
              {Object.entries(PLANNER_CATEGORIES.garage.default).map(([sectionName, categories]) => (
                <div key={sectionName} className="space-y-3">
                  <h4 className="font-medium text-gray-700 border-b pb-1">{sectionName}</h4>
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
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Shed Planner</h3>
            <div className="space-y-6 p-4 bg-gray-50 rounded-lg">
              {Object.entries(PLANNER_CATEGORIES.shed.default).map(([sectionName, categories]) => (
                <div key={sectionName} className="space-y-3">
                  <h4 className="font-medium text-gray-700 border-b pb-1">{sectionName}</h4>
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