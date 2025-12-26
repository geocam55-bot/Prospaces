import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Loader2, Save, Hammer } from 'lucide-react';
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

// Define material categories for each planner type
const PLANNER_CATEGORIES = {
  deck: {
    spruce: ['Decking Boards', 'Joists', 'Beams', 'Posts', 'Railing Posts', 'Railing Top Rail', 'Railing Bottom Rail', 'Railing Balusters', 'Stair Stringers', 'Stair Treads'],
    treated: ['Decking Boards', 'Joists', 'Beams', 'Posts', 'Railing Posts', 'Railing Top Rail', 'Railing Bottom Rail', 'Railing Balusters', 'Stair Stringers', 'Stair Treads'],
    composite: ['Decking Boards', 'Railing Posts', 'Railing Top Rail', 'Railing Bottom Rail', 'Railing Balusters'],
    cedar: ['Decking Boards', 'Joists', 'Beams', 'Posts', 'Railing Posts', 'Railing Top Rail', 'Railing Bottom Rail', 'Railing Balusters', 'Stair Stringers', 'Stair Treads'],
  },
  garage: {
    default: ['Wall Framing (2x4)', 'Wall Framing (2x6)', 'Roof Trusses', 'Roof Sheathing', 'Roof Shingles', 'Wall Sheathing', 'Siding', 'Garage Door', 'Entry Door', 'Windows', 'Foundation Blocks'],
  },
  shed: {
    default: ['Floor Joists', 'Floor Decking', 'Wall Framing', 'Roof Rafters', 'Roof Sheathing', 'Roof Shingles', 'Wall Sheathing', 'Siding', 'Door', 'Windows', 'Foundation Skids'],
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
      onSave('error', 'Failed to load project wizard settings');
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
          <CardTitle className="flex items-center gap-2">
            <Hammer className="h-5 w-5" />
            Project Wizard Material Defaults
          </CardTitle>
          <p className="text-sm text-gray-600 mt-2">
            Set default inventory items for each material category in the project wizards. These defaults will be pre-selected when creating new projects.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
              {PLANNER_CATEGORIES.deck[selectedDeckType].map((category) => (
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

          {/* Garage Planner Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Garage Planner</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
              {PLANNER_CATEGORIES.garage.default.map((category) => (
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

          {/* Shed Planner Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Shed Planner</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
              {PLANNER_CATEGORIES.shed.default.map((category) => (
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