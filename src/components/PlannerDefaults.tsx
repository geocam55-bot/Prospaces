import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Loader2, Save, RefreshCw, Settings, Info } from 'lucide-react';
import {
  getProjectWizardDefaults,
  getUserDefaults,
  saveUserDefaults,
  deleteUserDefaults,
  migrateUserDefaultsFromLocalStorage,
  getInventoryItemsForDropdown,
  getOrgConversionFactors,
  ProjectWizardDefault,
  InventoryItem,
} from '../utils/project-wizard-defaults-client';
import { InventoryCombobox } from './InventoryCombobox';
import { PlannerDefaultsQuickHelp } from './PlannerDefaultsQuickHelp';
import { STANDARD_LUMBER_LENGTHS } from '../utils/lumberLengths';
import { toast } from 'sonner@2.0.3';

interface PlannerDefaultsProps {
  organizationId: string;
  userId: string;
  plannerType: 'deck' | 'garage' | 'shed' | 'roof' | 'kitchen';
  materialTypes?: string[]; // Optional for planners like deck that have multiple material types
}

// Category groups that contain lumber items (no conversion factor needed)
const LUMBER_CATEGORY_GROUPS = new Set([
  'Framing',
  'Decking',
  'Railing',
  'Trim',
  'Flooring',
]);

/** Returns true if a category group contains lumber items (no CF needed) */
const isLumberGroup = (groupName: string): boolean => {
  // Check for exact match or "by Length" suffix (e.g., "Framing - Joists by Length")
  if (LUMBER_CATEGORY_GROUPS.has(groupName)) return true;
  if (groupName.includes('by Length')) return true;
  // Decking Boards by Length, etc.
  for (const lumber of LUMBER_CATEGORY_GROUPS) {
    if (groupName.startsWith(lumber)) return true;
  }
  return false;
};

// Helper: generate length-specific entries for a lumber category
const lumberLengthEntries = (baseName: string): string[] =>
  STANDARD_LUMBER_LENGTHS.map((len) => `${baseName} (${len}')`);

// Define material categories for each planner type
const PLANNER_CATEGORIES: Record<string, Record<string, Record<string, string[]>>> = {
  deck: {
    spruce: {
      'Framing': ['Ledger Board', 'Joists', 'Rim Joists', 'Beams', 'Posts', 'Stair Stringers'],
      'Framing - Ledger Board by Length': lumberLengthEntries('Ledger Board'),
      'Framing - Joists by Length': lumberLengthEntries('Joists'),
      'Framing - Rim Joists by Length': lumberLengthEntries('Rim Joists'),
      'Framing - Beams by Length': lumberLengthEntries('Beams'),
      'Framing - Posts by Length': lumberLengthEntries('Posts'),
      'Decking': ['Decking Boards', 'Stair Treads'],
      'Decking Boards by Length': lumberLengthEntries('Decking Boards'),
      'Railing': ['Railing Posts', 'Railing Top Rail', 'Railing Bottom Rail', 'Railing Balusters'],
      'Hardware': ['Lag Screws', 'Ledger Flashing', 'Joist Hangers', 'Railing Brackets', 'Post Anchors', 'Concrete Mix', 'Structural Screws', 'Deck Screws'],
    },
    treated: {
      'Framing': ['Ledger Board', 'Joists', 'Rim Joists', 'Beams', 'Posts', 'Stair Stringers'],
      'Framing - Ledger Board by Length': lumberLengthEntries('Ledger Board'),
      'Framing - Joists by Length': lumberLengthEntries('Joists'),
      'Framing - Rim Joists by Length': lumberLengthEntries('Rim Joists'),
      'Framing - Beams by Length': lumberLengthEntries('Beams'),
      'Framing - Posts by Length': lumberLengthEntries('Posts'),
      'Decking': ['Decking Boards', 'Stair Treads'],
      'Decking Boards by Length': lumberLengthEntries('Decking Boards'),
      'Railing': ['Railing Posts', 'Railing Top Rail', 'Railing Bottom Rail', 'Railing Balusters'],
      'Hardware': ['Lag Screws', 'Ledger Flashing', 'Joist Hangers', 'Railing Brackets', 'Post Anchors', 'Concrete Mix', 'Structural Screws', 'Deck Screws'],
    },
    composite: {
      'Framing': ['Ledger Board', 'Joists', 'Rim Joists', 'Beams', 'Posts', 'Stair Stringers'],
      'Framing - Ledger Board by Length': lumberLengthEntries('Ledger Board'),
      'Framing - Joists by Length': lumberLengthEntries('Joists'),
      'Framing - Rim Joists by Length': lumberLengthEntries('Rim Joists'),
      'Framing - Beams by Length': lumberLengthEntries('Beams'),
      'Framing - Posts by Length': lumberLengthEntries('Posts'),
      'Decking': ['Decking Boards', 'Stair Treads'],
      'Decking Boards by Length': lumberLengthEntries('Decking Boards'),
      'Railing': ['Railing Posts', 'Railing Top Rail', 'Railing Bottom Rail', 'Railing Balusters'],
      'Hardware': ['Lag Screws', 'Ledger Flashing', 'Deck Clips', 'Composite Screws', 'Composite Plugs', 'Joist Hangers', 'Railing Brackets', 'Post Anchors', 'Concrete Mix', 'Structural Screws'],
    },
    cedar: {
      'Framing': ['Ledger Board', 'Joists', 'Rim Joists', 'Beams', 'Posts', 'Stair Stringers'],
      'Framing - Ledger Board by Length': lumberLengthEntries('Ledger Board'),
      'Framing - Joists by Length': lumberLengthEntries('Joists'),
      'Framing - Rim Joists by Length': lumberLengthEntries('Rim Joists'),
      'Framing - Beams by Length': lumberLengthEntries('Beams'),
      'Framing - Posts by Length': lumberLengthEntries('Posts'),
      'Decking': ['Decking Boards', 'Stair Treads'],
      'Decking Boards by Length': lumberLengthEntries('Decking Boards'),
      'Railing': ['Railing Posts', 'Railing Top Rail', 'Railing Bottom Rail', 'Railing Balusters'],
      'Hardware': ['Lag Screws', 'Ledger Flashing', 'Joist Hangers', 'Railing Brackets', 'Post Anchors', 'Concrete Mix', 'Structural Screws', 'Deck Screws'],
    },
  },
  garage: {
    default: {
      'Foundation': ['Concrete Slab', 'Vapor Barrier', 'Gravel Base', 'Rebar', 'Wire Mesh'],
      'Framing': ['Wall Studs', 'Plates', 'Headers', 'Blocking/Bracing', 'Roof Trusses', 'Wall Sheathing', 'Roof Sheathing'],
      'Framing - Wall Studs by Length': lumberLengthEntries('Wall Studs'),
      'Framing - Plates by Length': lumberLengthEntries('Plates'),
      'Framing - Headers by Length': lumberLengthEntries('Headers'),
      'Roofing': ['Felt Underlayment', 'Roof Shingles', 'Ridge Cap', 'Drip Edge', 'Roofing Nails'],
      'Siding': ['House Wrap', 'Siding', 'Trim Boards', 'Fascia Boards'],
      'Siding - Fascia Boards by Length': lumberLengthEntries('Fascia Boards'),
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
      'Framing': ['Floor Joists', 'Rim Joists', 'Wall Studs', 'Plates', 'Headers', 'Rafters', 'Roof Trusses', 'Collar Ties', 'Ridge Board', 'Loft Joists', 'Wall Sheathing', 'Roof Sheathing'],
      'Framing - Floor Joists by Length': lumberLengthEntries('Floor Joists'),
      'Framing - Rim Joists by Length': lumberLengthEntries('Rim Joists'),
      'Framing - Wall Studs by Length': lumberLengthEntries('Wall Studs'),
      'Framing - Plates by Length': lumberLengthEntries('Plates'),
      'Framing - Rafters by Length': lumberLengthEntries('Rafters'),
      'Framing - Ridge Board by Length': lumberLengthEntries('Ridge Board'),
      'Framing - Loft Joists by Length': lumberLengthEntries('Loft Joists'),
      'Flooring': ['Floor Decking'],
      'Roofing': ['Felt Underlayment', 'Roof Shingles', 'Ridge Cap', 'Drip Edge', 'Roofing Nails'],
      'Siding': ['House Wrap', 'Siding'],
      'Doors': ['Door', 'Door Hardware', 'Hinges', 'Handle/Latch'],
      'Windows': ['Windows', 'Shutters'],
      'Trim': ['Corner Trim', 'Fascia Boards', 'Door/Window Trim', 'Flower Box Kit'],
      'Trim - Fascia Boards by Length': lumberLengthEntries('Fascia Boards'),
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
  finishing: {
    mdf: {
      'Mouldings': ['Baseboard', 'Casing', 'Crown', 'Shoe', 'Quarter Round'],
      'Doors': ['Interior Door', 'Bifold Door', 'Pocket Door'],
      'Hardware': ['Door Knobs', 'Hinges', 'Door Stops'],
      'Miscellaneous': ['Wood Filler', 'Caulk', 'Construction Adhesive']
    },
    finger_joint: {
      'Mouldings': ['Baseboard', 'Casing', 'Crown', 'Shoe', 'Quarter Round'],
      'Doors': ['Interior Door', 'Bifold Door', 'Pocket Door'],
      'Hardware': ['Door Knobs', 'Hinges', 'Door Stops'],
      'Miscellaneous': ['Wood Filler', 'Caulk', 'Construction Adhesive']
    },
    pine: {
      'Mouldings': ['Baseboard', 'Casing', 'Crown', 'Shoe', 'Quarter Round'],
      'Doors': ['Interior Door', 'Bifold Door', 'Pocket Door'],
      'Hardware': ['Door Knobs', 'Hinges', 'Door Stops'],
      'Miscellaneous': ['Wood Filler', 'Caulk', 'Construction Adhesive']
    }
  }
};

export function PlannerDefaults({ organizationId, userId, plannerType, materialTypes }: PlannerDefaultsProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [userDefaults, setUserDefaults] = useState<Record<string, string>>({});
  const [orgDefaults, setOrgDefaults] = useState<Record<string, string>>({});
  const [orgCFs, setOrgCFs] = useState<Record<string, string>>({});
  const [selectedMaterialType, setSelectedMaterialType] = useState<string>(
    materialTypes && materialTypes.length > 0 ? materialTypes[0] : 'default'
  );
  // Local string state for CF inputs so users can clear & type freely (e.g. "0.04")
  const [cfEditValues, setCfEditValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (organizationId) {
      loadData();
    }
  }, [organizationId, userId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // First, attempt migration from localStorage to database
      // Attempting migration from localStorage
      await migrateUserDefaultsFromLocalStorage(userId, organizationId);

      // Load organization defaults from database
      const orgDefaultsData = await getProjectWizardDefaults(organizationId);
      const orgDefaultsMap: Record<string, string> = {};
      const itemIdsToFetch: string[] = [];

      // Organization defaults loaded
      orgDefaultsData.forEach((def) => {
        const key = `${def.planner_type}-${def.material_type || 'default'}-${def.material_category}`;
        if (def.inventory_item_id) {
          orgDefaultsMap[key] = def.inventory_item_id;
          itemIdsToFetch.push(def.inventory_item_id);
        }
      });
      setOrgDefaults(orgDefaultsMap);
      // Org defaults map set

      // Load user-specific defaults from database
      const userDefaultsMap = await getUserDefaults(userId, organizationId);
      setUserDefaults(userDefaultsMap);
      // User defaults map set

      // Add user default item IDs to fetch list
      Object.values(userDefaultsMap).forEach((itemId) => {
        if (itemId && !itemIdsToFetch.includes(itemId)) {
          itemIdsToFetch.push(itemId);
        }
      });

      // Load inventory items
      if (itemIdsToFetch.length > 0) {
        // Loading inventory items
        const items = await getInventoryItemsForDropdown(organizationId, itemIdsToFetch);
        // Inventory items loaded
        setInventoryItems(items);
      }

      // Load full inventory list in background
      setTimeout(async () => {
        const allItems = await getInventoryItemsForDropdown(organizationId);
        // Background: loaded all inventory items
        setInventoryItems(allItems);
      }, 100);

      // Load org-level conversion factors from KV
      try {
        const orgCFData = await getOrgConversionFactors(organizationId);
        setOrgCFs(orgCFData);
        // Org CFs loaded
      } catch (cfErr) {
        // Could not load org CFs
      }

    } catch (error) {
      // Error loading defaults
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
      // Error saving defaults
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
      // Error restoring defaults
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

  // Conversion Factor helpers — stored in userDefaults with `-cf` suffix
  const getCFKey = (materialType: string | null, category: string): string => {
    return `${plannerType}-${materialType || 'default'}-${category}-cf`;
  };

  // Org CF key format (no `-cf` suffix, matches ProjectWizardSettings format)
  const getOrgCFKey = (materialType: string | null, category: string): string => {
    return `${plannerType}-${materialType || 'default'}-${category}`;
  };

  /** Get the effective CF: user override > org default > 1 */
  const getConversionFactor = (materialType: string | null, category: string): number => {
    // 1. Check user-level CF
    const userKey = getCFKey(materialType, category);
    const userVal = userDefaults[userKey];
    if (userVal) {
      const parsed = parseFloat(userVal);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    // 2. Fall back to org-level CF
    const orgKey = getOrgCFKey(materialType, category);
    const orgVal = orgCFs[orgKey];
    if (orgVal) {
      const parsed = parseFloat(orgVal);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    return 1;
  };

  /** Check if user has their own CF set (vs inheriting from org) */
  const hasUserCF = (materialType: string | null, category: string): boolean => {
    const userKey = getCFKey(materialType, category);
    const userVal = userDefaults[userKey];
    if (!userVal) return false;
    const parsed = parseFloat(userVal);
    return !isNaN(parsed) && parsed > 0 && parsed !== 1;
  };

  /** Get the org-level CF value (for display) */
  const getOrgCF = (materialType: string | null, category: string): number => {
    const orgKey = getOrgCFKey(materialType, category);
    const orgVal = orgCFs[orgKey];
    if (orgVal) {
      const parsed = parseFloat(orgVal);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    return 1;
  };

  const handleCFInputChange = (materialType: string | null, category: string, value: string) => {
    const key = getCFKey(materialType, category);
    // Store raw string so user can type freely (e.g. "", "0.", "0.04")
    setCfEditValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleCFInputBlur = (materialType: string | null, category: string) => {
    const key = getCFKey(materialType, category);
    const raw = cfEditValues[key];
    // Clear the edit buffer
    setCfEditValues((prev) => {
      const { [key]: _, ...rest } = prev;
      return rest;
    });
    if (raw === undefined) return;
    const num = parseFloat(raw);
    if (isNaN(num) || num <= 0 || num === 1) {
      // Remove CF entry (effectively reset to 1)
      setUserDefaults((prev) => {
        const { [key]: _, ...rest } = prev;
        return rest;
      });
    } else {
      setUserDefaults((prev) => ({
        ...prev,
        [key]: String(num),
      }));
    }
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
              <p className="text-sm text-muted-foreground mt-1">
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
            {Object.entries(categories).map(([categoryGroup, items]) => {
              const showCF = !isLumberGroup(categoryGroup);

              return (
                <div key={categoryGroup} className="space-y-4">
                  <div className="flex items-center gap-2 border-b pb-2">
                    <h3 className="font-semibold text-foreground">{categoryGroup}</h3>
                    {showCF && (
                      <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded flex items-center gap-1">
                        <Info className="h-3 w-3" />
                        Conversion Factor available
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {items.map((category) => {
                      const matType = selectedMaterialType === 'default' ? null : selectedMaterialType;
                      const currentValue = getDefaultValue(matType, category);
                      const orgValue = getOrgDefaultValue(matType, category);
                      const isCustomized = currentValue !== orgValue;
                      const cfValue = showCF ? getConversionFactor(matType, category) : 1;

                      return (
                        <div key={category} className="space-y-2">
                          <Label htmlFor={`${plannerType}-${selectedMaterialType}-${category}`} className="flex items-center gap-2 text-foreground">
                            {category}
                            {isCustomized && (
                              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Custom</span>
                            )}
                          </Label>
                          <InventoryCombobox
                            id={`${plannerType}-${selectedMaterialType}-${category}`}
                            items={inventoryItems}
                            value={currentValue}
                            onChange={(value) => handleDefaultChange(matType, category, value)}
                            placeholder="Select inventory item..."
                          />
                          {showCF && (
                            <div className="flex items-center gap-2 flex-wrap">
                              <Label className="text-xs text-muted-foreground whitespace-nowrap" htmlFor={`cf-${plannerType}-${selectedMaterialType}-${category}`}>
                                CF:
                              </Label>
                              {(() => {
                                const cfKey = getCFKey(matType, category);
                                const editVal = cfEditValues[cfKey];
                                const userHasCF = hasUserCF(matType, category);
                                const orgCFVal = getOrgCF(matType, category);
                                const isInherited = !userHasCF && orgCFVal !== 1;
                                const displayVal = editVal !== undefined ? editVal : (cfValue === 1 ? '' : String(cfValue));
                                return (
                                  <>
                                    <Input
                                      id={`cf-${plannerType}-${selectedMaterialType}-${category}`}
                                      type="text"
                                      inputMode="decimal"
                                      value={displayVal}
                                      onChange={(e) => handleCFInputChange(matType, category, e.target.value)}
                                      onBlur={() => handleCFInputBlur(matType, category)}
                                      placeholder={orgCFVal !== 1 ? String(orgCFVal) : '1'}
                                      className={`h-7 w-24 text-xs ${isInherited ? 'border-amber-300 bg-amber-50/50' : ''}`}
                                      title="Conversion Factor: raw qty × CF = purchase qty. E.g., 25 screws/box → CF=0.04 (1÷25). Enter any decimal."
                                    />
                                    {cfValue !== 1 && editVal === undefined && (
                                      <span className="text-xs text-amber-600 font-medium">
                                        ×{cfValue}
                                      </span>
                                    )}
                                    {isInherited && (
                                      <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded" title="Inherited from organization settings">
                                        Org
                                      </span>
                                    )}
                                    {userHasCF && orgCFVal !== 1 && (
                                      <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded" title={`Overrides org CF of ${orgCFVal}`}>
                                        Override (org: {orgCFVal})
                                      </span>
                                    )}
                                  </>
                                );
                              })()}
                            </div>
                          )}
                          {isCustomized && orgValue !== 'none' && (
                            <p className="text-xs text-muted-foreground">
                              Org default: {inventoryItems.find(i => i.id === orgValue)?.name || 'Not set'}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}