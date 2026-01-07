import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Loader2, Save, RefreshCw, Settings } from 'lucide-react';
import {
  getProjectWizardDefaults,
  getUserDefaults,
  saveUserDefaults,
  deleteUserDefaults,
  migrateUserDefaultsFromLocalStorage,
  getInventoryItemsForDropdown,
  ProjectWizardDefault,
  InventoryItem,
} from '../utils/project-wizard-defaults-client';
import { InventoryCombobox } from './InventoryCombobox';
import { PlannerDefaultsQuickHelp } from './PlannerDefaultsQuickHelp';
import { toast } from 'sonner';

interface PlannerDefaultsProps {
  organizationId: string;
  userId: string;
  plannerType: 'deck' | 'garage' | 'shed' | 'roof' | 'kitchen';
  materialTypes?: string[]; // Optional for planners like deck that have multiple material types
}

// Define material categories for each planner type
const PLANNER_CATEGORIES = {
  deck: {
    spruce: {
      'Framing': ['Ledger Board', 'Joists', 'Rim Joists', 'Beams', 'Posts', 'Stair Stringers'],
      'Decking': ['Decking Boards', 'Stair Treads'],
      'Railing': ['Railing Posts', 'Railing Top Rail', 'Railing Bottom Rail', 'Railing Balusters'],
      'Hardware': ['Lag Screws', 'Ledger Flashing', 'Joist Hangers', 'Railing Brackets', 'Post Anchors', 'Concrete Mix', 'Structural Screws', 'Deck Screws'],
    },
    treated: {
      'Framing': ['Ledger Board', 'Joists', 'Rim Joists', 'Beams', 'Posts', 'Stair Stringers'],
      'Decking': ['Decking Boards', 'Stair Treads'],
      'Railing': ['Railing Posts', 'Railing Top Rail', 'Railing Bottom Rail', 'Railing Balusters'],
      'Hardware': ['Lag Screws', 'Ledger Flashing', 'Joist Hangers', 'Railing Brackets', 'Post Anchors', 'Concrete Mix', 'Structural Screws', 'Deck Screws'],
    },
    composite: {
      'Framing': ['Ledger Board', 'Joists', 'Rim Joists', 'Beams', 'Posts', 'Stair Stringers'],
      'Decking': ['Decking Boards', 'Stair Treads'],
      'Railing': ['Railing Posts', 'Railing Top Rail', 'Railing Bottom Rail', 'Railing Balusters'],
      'Hardware': ['Lag Screws', 'Ledger Flashing', 'Deck Clips', 'Composite Screws', 'Composite Plugs', 'Joist Hangers', 'Railing Brackets', 'Post Anchors', 'Concrete Mix', 'Structural Screws'],
    },
    cedar: {
      'Framing': ['Ledger Board', 'Joists', 'Rim Joists', 'Beams', 'Posts', 'Stair Stringers'],
      'Decking': ['Decking Boards', 'Stair Treads'],
      'Railing': ['Railing Posts', 'Railing Top Rail', 'Railing Bottom Rail', 'Railing Balusters'],
      'Hardware': ['Lag Screws', 'Ledger Flashing', 'Joist Hangers', 'Railing Brackets', 'Post Anchors', 'Concrete Mix', 'Structural Screws', 'Deck Screws'],
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
  kitchen: {
    default: {
      'Cabinets': ['Base Cabinets', 'Wall Cabinets', 'Tall Cabinets', 'Corner Cabinets'],
      'Countertops': ['Granite', 'Quartz', 'Laminate', 'Butcher Block'],
      'Appliances': ['Refrigerator', 'Range/Oven', 'Dishwasher', 'Microwave'],
      'Fixtures': ['Sink', 'Faucet', 'Garbage Disposal'],
      'Hardware': ['Cabinet Pulls', 'Cabinet Knobs', 'Hinges'],
    },
  },
};

export function PlannerDefaults({ organizationId, userId, plannerType, materialTypes }: PlannerDefaultsProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [userDefaults, setUserDefaults] = useState<Record<string, string>>({});
  const [orgDefaults, setOrgDefaults] = useState<Record<string, string>>({});
  const [selectedMaterialType, setSelectedMaterialType] = useState<string>(
    materialTypes && materialTypes.length > 0 ? materialTypes[0] : 'default'
  );

  useEffect(() => {
    if (organizationId) {
      loadData();
    }
  }, [organizationId, userId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // First, attempt migration from localStorage to database
      console.log('[PlannerDefaults] 🔄 Attempting migration from localStorage...');
      await migrateUserDefaultsFromLocalStorage(userId, organizationId);

      // Load organization defaults from database
      const orgDefaultsData = await getProjectWizardDefaults(organizationId);
      const orgDefaultsMap: Record<string, string> = {};
      const itemIdsToFetch: string[] = [];

      console.log('[PlannerDefaults] 📊 Organization defaults loaded:', orgDefaultsData.length);
      orgDefaultsData.forEach((def) => {
        const key = `${def.planner_type}-${def.material_type || 'default'}-${def.material_category}`;
        if (def.inventory_item_id) {
          orgDefaultsMap[key] = def.inventory_item_id;
          itemIdsToFetch.push(def.inventory_item_id);
        }
      });
      setOrgDefaults(orgDefaultsMap);
      console.log('[PlannerDefaults] 🏢 Org defaults map:', orgDefaultsMap);

      // Load user-specific defaults from database
      const userDefaultsMap = await getUserDefaults(userId, organizationId);
      setUserDefaults(userDefaultsMap);
      console.log('[PlannerDefaults] 👤 User defaults map:', userDefaultsMap);

      // Add user default item IDs to fetch list
      Object.values(userDefaultsMap).forEach((itemId) => {
        if (itemId && !itemIdsToFetch.includes(itemId)) {
          itemIdsToFetch.push(itemId);
        }
      });

      // Load inventory items
      if (itemIdsToFetch.length > 0) {
        console.log('[PlannerDefaults] 📦 Loading', itemIdsToFetch.length, 'inventory items');
        const items = await getInventoryItemsForDropdown(organizationId, itemIdsToFetch);
        console.log('[PlannerDefaults] ✅ Loaded', items.length, 'inventory items');
        setInventoryItems(items);
      }

      // Load full inventory list in background
      setTimeout(async () => {
        const allItems = await getInventoryItemsForDropdown(organizationId);
        console.log('[PlannerDefaults] 🔄 Background: loaded all', allItems.length, 'inventory items');
        setInventoryItems(allItems);
      }, 100);

    } catch (error) {
      console.error('[PlannerDefaults] Error loading defaults:', error);
      toast.error('Failed to load defaults');
    } finally {
      setLoading(false);
    }
  };

  const handleDefaultChange = (materialType: string | null, category: string, itemId: string) => {
    const key = `${plannerType}-${materialType || 'default'}-${category}`;
    if (itemId === 'none') {
      setUserDefaults((prev) => {
        const { [key]: _, ...rest } = prev;
        return rest;
      });
    } else {
      setUserDefaults((prev) => ({
        ...prev,
        [key]: itemId,
      }));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Save all user defaults to database
      const success = await saveUserDefaults(userId, organizationId, userDefaults);

      if (success) {
        toast.success('Defaults saved successfully');
      } else {
        toast.error('Failed to save defaults');
      }
    } catch (error) {
      console.error('[PlannerDefaults] Error saving defaults:', error);
      toast.error('Failed to save defaults');
    } finally {
      setSaving(false);
    }
  };

  const handleRestoreOrgDefaults = async () => {
    setSaving(true);
    try {
      // Delete user defaults from database (restore to org defaults)
      const success = await deleteUserDefaults(userId, organizationId);
      
      if (success) {
        // Reset local state to match organization defaults for this planner
        const filteredOrgDefaults: Record<string, string> = {};
        Object.entries(orgDefaults).forEach(([key, value]) => {
          if (key.startsWith(`${plannerType}-`)) {
            filteredOrgDefaults[key] = value;
          }
        });
        setUserDefaults(filteredOrgDefaults);
        toast.success('Defaults restored from organization settings');
      } else {
        toast.error('Failed to restore defaults');
      }
    } catch (error) {
      console.error('[PlannerDefaults] Error restoring defaults:', error);
      toast.error('Failed to restore defaults');
    } finally {
      setSaving(false);
    }
  };

  const getDefaultValue = (materialType: string | null, category: string): string => {
    const key = `${plannerType}-${materialType || 'default'}-${category}`;
    // First check user defaults, then fall back to org defaults
    return userDefaults[key] || orgDefaults[key] || 'none';
  };

  const getOrgDefaultValue = (materialType: string | null, category: string): string => {
    const key = `${plannerType}-${materialType || 'default'}-${category}`;
    return orgDefaults[key] || 'none';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const categories = PLANNER_CATEGORIES[plannerType]?.[selectedMaterialType] || PLANNER_CATEGORIES[plannerType]?.default || {};

  return (
    <div className="space-y-6">
      <PlannerDefaultsQuickHelp />
      
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                {plannerType.charAt(0).toUpperCase() + plannerType.slice(1)} Planner Defaults
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Customize your personal defaults for material selections. These will override the organization defaults.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleRestoreOrgDefaults}
                variant="outline"
                disabled={saving}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Restore Organization Defaults
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save My Defaults
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {materialTypes && materialTypes.length > 0 && (
            <div className="mb-6">
              <Label>Material Type</Label>
              <Select value={selectedMaterialType} onValueChange={setSelectedMaterialType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {materialTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-6">
            {Object.entries(categories).map(([categoryGroup, items]) => (
              <div key={categoryGroup} className="space-y-4">
                <h3 className="font-semibold text-gray-900 border-b pb-2">{categoryGroup}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {items.map((category) => {
                    const currentValue = getDefaultValue(selectedMaterialType === 'default' ? null : selectedMaterialType, category);
                    const orgValue = getOrgDefaultValue(selectedMaterialType === 'default' ? null : selectedMaterialType, category);
                    const isCustomized = currentValue !== orgValue;

                    return (
                      <div key={category} className="space-y-2">
                        <Label htmlFor={`${plannerType}-${selectedMaterialType}-${category}`} className="flex items-center gap-2">
                          {category}
                          {isCustomized && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Custom</span>
                          )}
                        </Label>
                        <InventoryCombobox
                          id={`${plannerType}-${selectedMaterialType}-${category}`}
                          items={inventoryItems}
                          value={currentValue}
                          onChange={(value) => handleDefaultChange(
                            selectedMaterialType === 'default' ? null : selectedMaterialType,
                            category,
                            value
                          )}
                          placeholder="Select inventory item..."
                        />
                        {isCustomized && orgValue !== 'none' && (
                          <p className="text-xs text-gray-500">
                            Org default: {inventoryItems.find(i => i.id === orgValue)?.name || 'Not set'}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}