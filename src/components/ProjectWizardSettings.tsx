import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Loader2, Save, RefreshCw, Hammer, Home, Warehouse, Building2, Info, Brush } from 'lucide-react';
import {
  getProjectWizardDefaults,
  upsertProjectWizardDefault,
  batchUpsertProjectWizardDefaults,
  deleteProjectWizardDefault,
  getInventoryItemsForDropdown,
  getOrgConversionFactors,
  saveOrgConversionFactors,
  ProjectWizardDefault,
  InventoryItem,
} from '../utils/project-wizard-defaults-client';
import { InventoryCombobox } from './InventoryCombobox';
import { STANDARD_LUMBER_LENGTHS } from '../utils/lumberLengths';

interface ProjectWizardSettingsProps {
  organizationId: string;
  onSave: (type: 'success' | 'error', message: string) => void;
}

const normalizePart = (value: string | null | undefined): string =>
  (value || '').trim().toLowerCase();

const makeDefaultsKey = (
  plannerType: string,
  materialType: string | null | undefined,
  category: string | null | undefined
): string => `${normalizePart(plannerType)}-${normalizePart(materialType || 'default')}-${normalizePart(category)}`;

const normalizeStoredKey = (key: string): string => {
  const [plannerType, materialType, ...categoryParts] = key.split('-');
  if (!plannerType || !materialType || categoryParts.length === 0) return key;
  return makeDefaultsKey(plannerType, materialType, categoryParts.join('-'));
};

const PLANNER_MATERIAL_TYPE_VARIANTS: Record<string, string[]> = {
  deck: ['default', 'spruce', 'treated', 'composite', 'cedar', 'aluminum', 'aluminum-white', 'aluminum-black'],
  garage: ['default', 'vinyl', 'wood', 'fiber-cement', 'aluminum'],
  shed: ['default'],
  roof: ['default'],
  finishing: ['default', 'mdf', 'finger_joint', 'pine'],
};

export const getMaterialTypesForPlanner = (plannerType: string): string[] => {
  const plannerConfig = (PLANNER_CATEGORIES as Record<string, Record<string, Record<string, string[]>>>)[plannerType] || {};
  const fromConfig = Object.keys(plannerConfig);
  const fromVariants = PLANNER_MATERIAL_TYPE_VARIANTS[plannerType] || [];
  const materialTypes = Array.from(new Set([...fromConfig, ...fromVariants]));
  if (!materialTypes.includes('default')) materialTypes.push('default');
  return materialTypes.sort((a, b) => b.length - a.length);
};

export const parseDefaultsKey = (key: string): { plannerType: string; materialType: string; category: string } | null => {
  const firstDash = key.indexOf('-');
  if (firstDash === -1) return null;

  const plannerType = key.slice(0, firstDash);
  const remainder = key.slice(firstDash + 1);
  if (!plannerType || !remainder) return null;

  const candidates = getMaterialTypesForPlanner(plannerType);
  const matchedMaterialType = candidates.find((candidate) => {
    return remainder === candidate || remainder.startsWith(`${candidate}-`);
  });

  if (!matchedMaterialType) {
    const secondDash = remainder.indexOf('-');
    if (secondDash === -1) return null;
    const fallbackMaterialType = remainder.slice(0, secondDash);
    const fallbackCategory = remainder.slice(secondDash + 1);
    if (!fallbackMaterialType || !fallbackCategory) return null;
    return { plannerType, materialType: fallbackMaterialType, category: fallbackCategory };
  }

  const category = remainder.slice(matchedMaterialType.length + 1);
  if (!category) return null;

  return {
    plannerType,
    materialType: matchedMaterialType,
    category,
  };
};

export const buildRowsToDelete = (
  loadedDefaults: ProjectWizardDefault[],
  defaultConfigs: ProjectWizardDefault[]
): ProjectWizardDefault[] => {
  const managedPlanners = new Set(['deck', 'garage', 'shed', 'roof', 'finishing']);
  const nextKeys = new Set(
    defaultConfigs.map((config) =>
      makeDefaultsKey(
        config.planner_type,
        config.material_type || 'default',
        config.material_category
      )
    )
  );

  return loadedDefaults.filter((row) => {
    if (!managedPlanners.has(row.planner_type)) return false;
    const rowKey = makeDefaultsKey(row.planner_type, row.material_type || 'default', row.material_category);
    return !nextKeys.has(rowKey) && !!row.id;
  });
};

// Helper: generate length-specific entries for a lumber category
const lumberLengthEntries = (baseName: string): string[] =>
  STANDARD_LUMBER_LENGTHS.map((len) => `${baseName} (${len}')`);

const aluminumGlassPanelEntries = (): string[] => [
  'Tempered Glass Panel (6")',
  'Tempered Glass Panel (9")',
  'Tempered Glass Panel (12")',
  'Tempered Glass Panel (15")',
  'Tempered Glass Panel (18")',
  'Tempered Glass Panel (21")',
  'Tempered Glass Panel (24")',
  'Tempered Glass Panel (27")',
  'Tempered Glass Panel (30")',
  'Tempered Glass Panel (33")',
  'Tempered Glass Panel (36")',
  'Tempered Glass Panel (39")',
  'Tempered Glass Panel (42")',
  'Tempered Glass Panel (45")',
  'Tempered Glass Panel (48")',
  'Tempered Glass Panel (51")',
  'Tempered Glass Panel (54")',
  'Tempered Glass Panel (57")',
  'Tempered Glass Panel (60")',
  'Tempered Glass Panel (63")',
  'Tempered Glass Panel (66")',
];

const aluminumDeckCategories = {
  'Framing': ['Ledger Board', 'Joists', 'Rim Joists', 'Beams', 'Posts', 'Stair Stringers'],
  'Framing - Ledger Board by Length': lumberLengthEntries('Ledger Board'),
  'Framing - Joists by Length': lumberLengthEntries('Joists'),
  'Framing - Rim Joists by Length': lumberLengthEntries('Rim Joists'),
  'Framing - Beams by Length': lumberLengthEntries('Beams'),
  'Framing - Posts by Length': lumberLengthEntries('Posts'),
  'Decking': ['Decking Boards', 'Stair Treads'],
  'Decking Boards by Length': lumberLengthEntries('Decking Boards'),
  'Railing': ['Aluminum Top & Bottom Rail', 'Picket Packages', 'Clear Glass Pickets (CDG-6)', 'Angled Stair Glass Pickets (CAG-6)', 'Aluminum Posts', 'Aluminum Stair Posts'],
  'Railing - Tempered Glass Panels by Size': aluminumGlassPanelEntries(),
  'Hardware': ['Lag Screws', 'Ledger Flashing', 'Joist Hangers', 'Post Anchors', 'Concrete Mix', 'Structural Screws', 'Deck Screws', 'Post Base Plate Cover', 'Decorative Post Cap', 'Universal Angle Bracket (UAB)', 'Vinyl Insert for Glass (GVI)', 'Rubber Blocks for Glass (GRB-10)', 'Rail Support Legs (SRSL)', 'Lag Bolts (post mounting)', 'Self Drilling Screws'],
};

const ALUMINUM_ONLY_HARDWARE_CATEGORIES = new Set([
  'Post Base Plate Cover',
  'Decorative Post Cap',
  'Universal Angle Bracket (UAB)',
  'Vinyl Insert for Glass (GVI)',
  'Rubber Blocks for Glass (GRB-10)',
  'Rail Support Legs (SRSL)',
  'Lag Bolts (post mounting)',
  'Self Drilling Screws',
]);

/** Industry-standard suggested conversion factors for vinyl siding accessories. */
const SYSTEM_CF_SUGGESTIONS: Record<string, number> = {
  'Starter Strip': 1 / 12.5,
  'Finish Trim': 1 / 12,
  'Finish Trim (Soffit)': 1 / 12,
  'J-Channel': 1 / 12,
  'J-Channel (Soffit)': 1 / 12,
  'Outside Corner': 1 / 10,
  'Inside Corner': 1 / 10,
  'Trim Coil': 1 / 50,
  'Aluminum Trim Coil': 1 / 50,
  'F-Channel': 1 / 12,
  'Vinyl or Aluminum Fascia': 1 / 12,
  'Flashing': 1 / 10,
  'Furring Strip': 1 / 8,
};

// Define material categories for each planner type - organized by category sections
const PLANNER_CATEGORIES = {
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
    aluminum: aluminumDeckCategories,
    'aluminum-white': aluminumDeckCategories,
    'aluminum-black': aluminumDeckCategories,
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
    vinyl: {
      'Foundation': ['Concrete Slab', 'Vapor Barrier', 'Gravel Base', 'Rebar', 'Wire Mesh'],
      'Framing': ['Wall Studs', 'Plates', 'Headers', 'Blocking/Bracing', 'Roof Trusses', 'Wall Sheathing', 'Roof Sheathing'],
      'Framing - Wall Studs by Length': lumberLengthEntries('Wall Studs'),
      'Framing - Plates by Length': lumberLengthEntries('Plates'),
      'Framing - Headers by Length': lumberLengthEntries('Headers'),
      'Roofing': ['Felt Underlayment', 'Roof Shingles', 'Ridge Cap', 'Drip Edge', 'Roofing Nails'],
      'Siding - Fascia Boards by Length': lumberLengthEntries('Fascia Boards'),
      'Siding Accessories': ['Starter Strip', 'Finish Trim', 'J-Channel', 'Outside Corner', 'Inside Corner', 'Trim Coil', 'Trim Nails'],
      'Soffit Accessories': ['F-Channel', 'J-Channel (Soffit)', 'Vinyl or Aluminum Fascia', 'Aluminum Trim Coil', 'Finish Trim (Soffit)'],
      'Miscellaneous': ['Backer Board / House Wrap', 'Flashing', 'Caulk', 'Sealing Tape (Windows/Doors)', 'Siding Nails', 'Furring Strip'],
      'Finishing Touches': ['Mounting Blocks', 'Surface Mounts', 'Dryerhood', 'Exhaust Vents', 'Gable Vents', 'Gutters'],
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
  if (LUMBER_CATEGORY_GROUPS.has(groupName)) return true;
  if (groupName.includes('by Length')) return true;
  for (const lumber of LUMBER_CATEGORY_GROUPS) {
    if (groupName.startsWith(lumber)) return true;
  }
  return false;
};

export function ProjectWizardSettings({ organizationId, onSave }: ProjectWizardSettingsProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [defaults, setDefaults] = useState<Record<string, string>>({});
  const [loadedDefaults, setLoadedDefaults] = useState<ProjectWizardDefault[]>([]);
  const [orgCFs, setOrgCFs] = useState<Record<string, string>>({});
  const [selectedDeckType, setSelectedDeckType] = useState<'spruce' | 'treated' | 'composite' | 'cedar' | 'aluminum'>('treated');
  const [selectedDeckRailingType, setSelectedDeckRailingType] = useState<'treated' | 'aluminum'>('treated');
  const [selectedGarageType, setSelectedGarageType] = useState<'vinyl' | 'wood' | 'fiber-cement' | 'aluminum'>('vinyl');
  const [selectedAluminumColorProfile, setSelectedAluminumColorProfile] = useState<'white' | 'black'>('white');
  const [selectedFinishingType, setSelectedFinishingType] = useState<'mdf' | 'finger_joint' | 'pine'>('mdf');
  // Local string state for CF inputs so users can clear & type decimals freely
  const [cfEditValues, setCfEditValues] = useState<Record<string, string>>({});

  // Refs for scrolling to each planner section
  const deckRef = React.useRef<HTMLDivElement>(null);
  const garageRef = React.useRef<HTMLDivElement>(null);
  const shedRef = React.useRef<HTMLDivElement>(null);
  const roofRef = React.useRef<HTMLDivElement>(null);
  const finishingRef = React.useRef<HTMLDivElement>(null);

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
      case 'finishing':
        ref = finishingRef;
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
      // Skipping load - organizationId is undefined
    }
  }, [organizationId]);

  const loadData = async () => {
    // Guard against undefined organizationId
    if (!organizationId) {
      // Cannot load data - organizationId is undefined
      onSave('error', 'Unable to load settings. Please refresh the page.');
      setLoading(false);
      return;
    }

    setLoading(true);
    // Safety net: always clear the spinner after 12s even if a fetch hangs
    const safetyTimer = setTimeout(() => setLoading(false), 12000);
    
    try {
      // Step 1: Load wizard defaults
      const wizardDefaults = await getProjectWizardDefaults(organizationId);

      // Convert defaults array to lookup object
      const defaultsMap: Record<string, string> = {};
      const itemIdsToFetch: string[] = [];
      
      wizardDefaults.forEach((def) => {
        const key = makeDefaultsKey(def.planner_type, def.material_type || 'default', def.material_category);
        if (def.inventory_item_id) {
          defaultsMap[key] = def.inventory_item_id;
          itemIdsToFetch.push(def.inventory_item_id);
        }
      });
      
      setDefaults(defaultsMap);
      setLoadedDefaults(wizardDefaults);

      // Step 2: Load only the inventory items that are currently set as defaults
      let items: InventoryItem[] = [];
      
      if (itemIdsToFetch.length > 0) {
        items = await getInventoryItemsForDropdown(organizationId, itemIdsToFetch);
      }

      setInventoryItems(items);
      
      // Step 3: Load the full inventory list in the background (lazy load)
      setTimeout(async () => {
        const allItems = await getInventoryItemsForDropdown(organizationId);
        setInventoryItems(allItems);
      }, 100); // Small delay to let UI render first
      
      // Step 4: Load organization conversion factors from KV
      const cfData = await getOrgConversionFactors(organizationId);
      const normalizedCFData: Record<string, string> = {};
      Object.entries(cfData || {}).forEach(([key, value]) => {
        normalizedCFData[normalizeStoredKey(key)] = value;
      });
      setOrgCFs(normalizedCFData);
      
    } catch (error) {
      // Error loading project wizard settings
      // Only show error if it's not an authentication issue
      if (error && typeof error === 'object' && 'message' in error && !String(error.message).includes('auth')) {
        onSave('error', 'Failed to load project wizard settings');
      }
    } finally {
      clearTimeout(safetyTimer);
      setLoading(false);
    }
  };

  const handleDefaultChange = (plannerType: string, materialType: string | null, category: string, itemId: string) => {
    const key = makeDefaultsKey(plannerType, materialType || 'default', category);
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

  const isAluminumColorSensitiveCategory = (sectionName: string, category: string): boolean => {
    return selectedDeckRailingType === 'aluminum' && (
      sectionName === 'Railing'
      || sectionName === 'Railing - Tempered Glass Panels by Size'
      || (sectionName === 'Hardware' && ALUMINUM_ONLY_HARDWARE_CATEGORIES.has(category))
    );
  };

  const getDeckEffectiveMaterialType = (sectionName: string, category: string): string => {
    if (isAluminumColorSensitiveCategory(sectionName, category)) {
      return `aluminum-${selectedAluminumColorProfile}`;
    }
    return selectedDeckType;
  };

  const getDeckDisplayCategories = (): Record<string, string[]> => {
    const baseCategories = PLANNER_CATEGORIES.deck[selectedDeckType] || {};
    if (selectedDeckRailingType !== 'aluminum') {
      return baseCategories;
    }

    const merged = { ...baseCategories };
    merged['Railing'] = aluminumDeckCategories['Railing'];
    merged['Railing - Tempered Glass Panels by Size'] = aluminumDeckCategories['Railing - Tempered Glass Panels by Size'];

    const baseHardware = baseCategories['Hardware'] || [];
    const mergedHardware = [
      ...baseHardware.filter((item) => item !== 'Railing Brackets'),
      ...aluminumDeckCategories['Hardware'].filter((item) => !baseHardware.includes(item)),
    ];
    merged['Hardware'] = mergedHardware;

    return merged;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const validInventoryIds = new Set(inventoryItems.map((item) => item.id));

      // Convert defaults to array format for batch upsert
      const defaultConfigs: ProjectWizardDefault[] = Object.entries(defaults)
        .filter(([, inventoryItemId]) => !!inventoryItemId && validInventoryIds.has(inventoryItemId))
        .map(([key, inventoryItemId]) => {
        const parsed = parseDefaultsKey(key);
        if (!parsed) {
          return null;
        }

        return {
          organization_id: organizationId,
          planner_type: parsed.plannerType as 'deck' | 'garage' | 'shed' | 'roof' | 'finishing',
          material_type: parsed.materialType === 'default' ? undefined : parsed.materialType,
          material_category: parsed.category,
          inventory_item_id: inventoryItemId || undefined,
        };
      })
        .filter((config): config is ProjectWizardDefault => config !== null);

      const rowsToDelete = buildRowsToDelete(loadedDefaults, defaultConfigs);

      if (rowsToDelete.length > 0) {
        const deleteResults = await Promise.all(rowsToDelete.map((row) => deleteProjectWizardDefault(row.id!)));
        if (deleteResults.some((ok) => !ok)) {
          onSave('error', 'Failed to remove some cleared defaults. Please retry save.');
          return;
        }
      }

      const result = await batchUpsertProjectWizardDefaults(defaultConfigs);
      
      // Also save org conversion factors to KV
      const cfResult = await saveOrgConversionFactors(organizationId, orgCFs);
      
      if (!result.success) {
        // Batch save failed
        onSave('error', 'Failed to save project wizard defaults.');
      } else if (!cfResult) {
        // CF save failed
        onSave('error', 'Defaults saved but conversion factors failed to save.');
        await loadData();
      } else {
        onSave('success', 'Project Wizard defaults and conversion factors saved successfully!');
        await loadData();
      }
    } catch (error) {
      // Error saving project wizard settings
      onSave('error', 'Failed to save project wizard settings');
    } finally {
      setSaving(false);
    }
  };

  const getDefaultValue = (plannerType: string, materialType: string | null, category: string): string => {
    const key = makeDefaultsKey(plannerType, materialType || 'default', category);
    const aluminumFallbackKey = materialType?.startsWith('aluminum-')
      ? makeDefaultsKey(plannerType, 'aluminum', category)
      : null;
    const fallbackKey = makeDefaultsKey(plannerType, 'default', category);
    return defaults[key] || (aluminumFallbackKey ? defaults[aluminumFallbackKey] : undefined) || defaults[fallbackKey] || 'none';
  };

  // Conversion Factor helpers for org-level CFs
  const getCFKey = (plannerType: string, materialType: string | null, category: string): string => {
    return makeDefaultsKey(plannerType, materialType || 'default', category);
  };

  const getOrgCF = (plannerType: string, materialType: string | null, category: string): number => {
    const key = getCFKey(plannerType, materialType, category);
    const aluminumFallbackKey = materialType?.startsWith('aluminum-')
      ? getCFKey(plannerType, 'aluminum', category)
      : null;
    const fallbackKey = getCFKey(plannerType, 'default', category);
    const val = orgCFs[key] ?? (aluminumFallbackKey ? orgCFs[aluminumFallbackKey] : undefined) ?? orgCFs[fallbackKey];
    return val ? parseFloat(val) || 1 : 1;
  };

  const handleCFInputChange = (plannerType: string, materialType: string | null, category: string, value: string) => {
    const key = getCFKey(plannerType, materialType, category);
    setCfEditValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleCFInputBlur = (plannerType: string, materialType: string | null, category: string) => {
    const key = getCFKey(plannerType, materialType, category);
    const raw = cfEditValues[key];
    setCfEditValues((prev) => {
      const { [key]: _, ...rest } = prev;
      return rest;
    });
    if (raw === undefined) return;
    const num = parseFloat(raw);
    if (isNaN(num) || num <= 0 || num === 1) {
      setOrgCFs((prev) => {
        const { [key]: _, ...rest } = prev;
        return rest;
      });
    } else {
      setOrgCFs((prev) => ({
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
              <p className="text-sm text-muted-foreground mt-2">
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
          <div className="bg-gradient-to-r from-slate-50 to-slate-100 border border-border rounded-lg p-4">
            <div className="flex items-center gap-3">
              <Label htmlFor="planner-nav" className="text-sm font-medium text-foreground whitespace-nowrap">
                Jump to Planner:
              </Label>
              <Select onValueChange={scrollToPlanner}>
                <SelectTrigger id="planner-nav" className="w-[200px] bg-background">
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
                  <SelectItem value="finishing">
                    <div className="flex items-center gap-2">
                      <Brush className="h-4 w-4 text-teal-600" />
                      <span>Finishing Planner</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Deck Planner Settings */}
          <div className="space-y-4 border-2 border-purple-200 rounded-lg p-6 bg-purple-50" ref={deckRef}>
            <h3 className="text-lg font-semibold text-purple-900 flex items-center gap-2">
              <Home className="h-5 w-5 text-purple-600" />
              Deck Planner
            </h3>

            <div className="mb-6">
              <Label>Deck Material Type</Label>
              <Select value={selectedDeckType} onValueChange={(value: any) => setSelectedDeckType(value)}>
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="spruce">Spruce</SelectItem>
                  <SelectItem value="treated">Treated</SelectItem>
                  <SelectItem value="composite">Composite</SelectItem>
                  <SelectItem value="cedar">Cedar</SelectItem>
                  <SelectItem value="aluminum">Aluminum</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="mb-6">
              <Label>Railing Type</Label>
              <Select value={selectedDeckRailingType} onValueChange={(value: 'treated' | 'aluminum') => setSelectedDeckRailingType(value)}>
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="treated">Treated</SelectItem>
                  <SelectItem value="aluminum">Aluminum</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {selectedDeckRailingType === 'aluminum' && (
              <div className="mb-6">
                <Label>Aluminum Color</Label>
                <Select value={selectedAluminumColorProfile} onValueChange={(value: 'white' | 'black') => setSelectedAluminumColorProfile(value)}>
                  <SelectTrigger className="bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="white">White</SelectItem>
                    <SelectItem value="black">Black</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">Applies only to railing-related aluminum defaults, not framing or decking defaults.</p>
              </div>
            )}

            <div className="space-y-6 p-4 bg-background rounded-lg border border-purple-100">
              {Object.entries(getDeckDisplayCategories()).map(([sectionName, categories]) => {
                const showCF = !isLumberGroup(sectionName);
                return (
                  <div key={sectionName} className="space-y-3">
                    <div className="flex items-center gap-2 border-b border-purple-200 pb-1">
                      <h4 className="font-medium text-foreground">{sectionName}</h4>
                      {showCF && (
                        <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded flex items-center gap-1">
                          <Info className="h-3 w-3" />
                          CF
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {categories.map((category) => {
                        const effectiveMaterialType = getDeckEffectiveMaterialType(sectionName, category);
                        const cfValue = showCF ? getOrgCF('deck', effectiveMaterialType, category) : 1;
                        return (
                          <div key={category} className="space-y-2">
                            <Label htmlFor={`deck-${selectedDeckType}-${category}`} className="text-foreground">{category}</Label>
                            <InventoryCombobox
                              id={`deck-${selectedDeckType}-${category}`}
                              items={inventoryItems}
                              value={getDefaultValue('deck', effectiveMaterialType, category)}
                              onChange={(value) => handleDefaultChange('deck', effectiveMaterialType, category, value)}
                              placeholder="Select inventory item..."
                            />
                            {showCF && (
                              <div className="flex items-center gap-2">
                                <Label className="text-xs text-muted-foreground whitespace-nowrap">CF:</Label>
                                {(() => {
                                  const cfKey = getCFKey('deck', effectiveMaterialType, category);
                                  const editVal = cfEditValues[cfKey];
                                  const displayVal = editVal !== undefined ? editVal : (cfValue === 1 ? '' : String(cfValue));
                                  return (
                                    <>
                                      <Input
                                        type="text"
                                        inputMode="decimal"
                                        value={displayVal}
                                        onChange={(e) => handleCFInputChange('deck', effectiveMaterialType, category, e.target.value)}
                                        onBlur={() => handleCFInputBlur('deck', effectiveMaterialType, category)}
                                        placeholder="1"
                                        className="h-7 w-24 text-xs text-foreground"
                                        title="Conversion Factor: raw qty × CF = purchase qty. E.g., 25/box → CF=0.04. Enter any decimal."
                                      />
                                      {cfValue !== 1 && editVal === undefined && (
                                        <span className="text-xs text-amber-600 font-medium">×{cfValue}</span>
                                      )}
                                    </>
                                  );
                                })()}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Garage Planner Settings */}
          <div className="space-y-4 border-2 border-blue-200 rounded-lg p-6 bg-blue-50" ref={garageRef}>
            <h3 className="text-lg font-semibold text-blue-900 flex items-center gap-2">
              <Warehouse className="h-5 w-5 text-blue-600" />
              Garage Planner
            </h3>

            <div className="mb-6">
              <Label>Siding Type</Label>
              <Select value={selectedGarageType} onValueChange={(value: 'vinyl' | 'wood' | 'fiber-cement' | 'aluminum') => setSelectedGarageType(value)}>
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vinyl">Vinyl</SelectItem>
                  <SelectItem value="wood">Wood / LP SmartSide</SelectItem>
                  <SelectItem value="fiber-cement">Fiber Cement</SelectItem>
                  <SelectItem value="aluminum">Metal Panels</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-6 p-4 bg-background rounded-lg border border-blue-100">
              {Object.entries(PLANNER_CATEGORIES.garage[selectedGarageType] ?? PLANNER_CATEGORIES.garage.default).map(([sectionName, categories]) => {
                const showCF = !isLumberGroup(sectionName);
                const garageMaterialType = selectedGarageType;
                return (
                  <div key={sectionName} className="space-y-3">
                    <div className="flex items-center gap-2 border-b border-blue-200 pb-1">
                      <h4 className="font-medium text-foreground">{sectionName}</h4>
                      {showCF && (
                        <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded flex items-center gap-1">
                          <Info className="h-3 w-3" />
                          CF
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {categories.map((category) => {
                        const cfValue = showCF ? (getOrgCF('garage', garageMaterialType, category) || SYSTEM_CF_SUGGESTIONS[category] || 1) : 1;
                        return (
                          <div key={category} className="space-y-2">
                            <Label htmlFor={`garage-${selectedGarageType}-${category}`} className="text-foreground">{category}</Label>
                            <InventoryCombobox
                              id={`garage-${selectedGarageType}-${category}`}
                              items={inventoryItems}
                              value={getDefaultValue('garage', garageMaterialType, category)}
                              onChange={(value) => handleDefaultChange('garage', garageMaterialType, category, value)}
                              placeholder="Select inventory item..."
                            />
                            {showCF && (
                              <div className="flex items-center gap-2">
                                <Label className="text-xs text-muted-foreground whitespace-nowrap">CF:</Label>
                                {(() => {
                                  const cfKey = getCFKey('garage', garageMaterialType, category);
                                  const editVal = cfEditValues[cfKey];
                                  const displayVal = editVal !== undefined ? editVal : (cfValue === 1 ? '' : String(parseFloat(cfValue.toFixed(4))));
                                  const suggestedCF = SYSTEM_CF_SUGGESTIONS[category];
                                  const placeholderVal = suggestedCF ? String(parseFloat(suggestedCF.toFixed(4))) : '1';
                                  return (
                                    <>
                                      <Input
                                        type="text"
                                        inputMode="decimal"
                                        value={displayVal}
                                        onChange={(e) => handleCFInputChange('garage', garageMaterialType, category, e.target.value)}
                                        onBlur={() => handleCFInputBlur('garage', garageMaterialType, category)}
                                        placeholder={placeholderVal}
                                        className="h-7 w-24 text-xs text-foreground"
                                        title="Conversion Factor: raw qty × CF = purchase qty. E.g., 12ft piece → CF=0.0833. Enter any decimal."
                                      />
                                      {cfValue !== 1 && editVal === undefined && (
                                        <span className="text-xs text-amber-600 font-medium">×{parseFloat(cfValue.toFixed(4))}</span>
                                      )}
                                    </>
                                  );
                                })()}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Shed Planner Settings */}
          <div className="space-y-4 border-2 border-green-200 rounded-lg p-6 bg-green-50" ref={shedRef}>
            <h3 className="text-lg font-semibold text-green-900 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-green-600" />
              Shed Planner
            </h3>
            <div className="space-y-6 p-4 bg-background rounded-lg border border-green-100">
              {Object.entries(PLANNER_CATEGORIES.shed.default).map(([sectionName, categories]) => {
                const showCF = !isLumberGroup(sectionName);
                return (
                  <div key={sectionName} className="space-y-3">
                    <div className="flex items-center gap-2 border-b border-green-200 pb-1">
                      <h4 className="font-medium text-foreground">{sectionName}</h4>
                      {showCF && (
                        <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded flex items-center gap-1">
                          <Info className="h-3 w-3" />
                          CF
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {categories.map((category) => {
                        const cfValue = showCF ? getOrgCF('shed', null, category) : 1;
                        return (
                          <div key={category} className="space-y-2">
                            <Label htmlFor={`shed-${category}`} className="text-foreground">{category}</Label>
                            <InventoryCombobox
                              id={`shed-${category}`}
                              items={inventoryItems}
                              value={getDefaultValue('shed', null, category)}
                              onChange={(value) => handleDefaultChange('shed', null, category, value)}
                              placeholder="Select inventory item..."
                            />
                            {showCF && (
                              <div className="flex items-center gap-2">
                                <Label className="text-xs text-muted-foreground whitespace-nowrap">CF:</Label>
                                {(() => {
                                  const cfKey = getCFKey('shed', null, category);
                                  const editVal = cfEditValues[cfKey];
                                  const displayVal = editVal !== undefined ? editVal : (cfValue === 1 ? '' : String(cfValue));
                                  return (
                                    <>
                                      <Input
                                        type="text"
                                        inputMode="decimal"
                                        value={displayVal}
                                        onChange={(e) => handleCFInputChange('shed', null, category, e.target.value)}
                                        onBlur={() => handleCFInputBlur('shed', null, category)}
                                        placeholder="1"
                                        className="h-7 w-24 text-xs text-foreground"
                                        title="Conversion Factor: raw qty × CF = purchase qty. E.g., 25/box → CF=0.04. Enter any decimal."
                                      />
                                      {cfValue !== 1 && editVal === undefined && (
                                        <span className="text-xs text-amber-600 font-medium">×{cfValue}</span>
                                      )}
                                    </>
                                  );
                                })()}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Roof Planner Settings */}
          <div className="space-y-4 border-2 border-red-200 rounded-lg p-6 bg-red-50" ref={roofRef}>
            <h3 className="text-lg font-semibold text-red-900 flex items-center gap-2">
              <Hammer className="h-5 w-5 text-red-600" />
              Roof Planner
            </h3>
            <div className="space-y-6 p-4 bg-background rounded-lg border border-red-100">
              {Object.entries(PLANNER_CATEGORIES.roof.default).map(([sectionName, categories]) => {
                const showCF = !isLumberGroup(sectionName);
                return (
                  <div key={sectionName} className="space-y-3">
                    <div className="flex items-center gap-2 border-b border-red-200 pb-1">
                      <h4 className="font-medium text-foreground">{sectionName}</h4>
                      {showCF && (
                        <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded flex items-center gap-1">
                          <Info className="h-3 w-3" />
                          CF
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {categories.map((category) => {
                        const cfValue = showCF ? getOrgCF('roof', null, category) : 1;
                        return (
                          <div key={category} className="space-y-2">
                            <Label htmlFor={`roof-${category}`} className="text-foreground">{category}</Label>
                            <InventoryCombobox
                              id={`roof-${category}`}
                              items={inventoryItems}
                              value={getDefaultValue('roof', null, category)}
                              onChange={(value) => handleDefaultChange('roof', null, category, value)}
                              placeholder="Select inventory item..."
                            />
                            {showCF && (
                              <div className="flex items-center gap-2">
                                <Label className="text-xs text-muted-foreground whitespace-nowrap">CF:</Label>
                                {(() => {
                                  const cfKey = getCFKey('roof', null, category);
                                  const editVal = cfEditValues[cfKey];
                                  const displayVal = editVal !== undefined ? editVal : (cfValue === 1 ? '' : String(cfValue));
                                  return (
                                    <>
                                      <Input
                                        type="text"
                                        inputMode="decimal"
                                        value={displayVal}
                                        onChange={(e) => handleCFInputChange('roof', null, category, e.target.value)}
                                        onBlur={() => handleCFInputBlur('roof', null, category)}
                                        placeholder="1"
                                        className="h-7 w-24 text-xs text-foreground"
                                        title="Conversion Factor: raw qty × CF = purchase qty. E.g., 25/box → CF=0.04. Enter any decimal."
                                      />
                                      {cfValue !== 1 && editVal === undefined && (
                                        <span className="text-xs text-amber-600 font-medium">×{cfValue}</span>
                                      )}
                                    </>
                                  );
                                })()}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Finishing Planner Settings */}
          <div className="space-y-4 border-2 border-teal-200 rounded-lg p-6 bg-teal-50" ref={finishingRef}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-teal-900 flex items-center gap-2">
                <Brush className="h-5 w-5 text-teal-600" />
                Finishing Planner
              </h3>
              <Select value={selectedFinishingType} onValueChange={(value: any) => setSelectedFinishingType(value)}>
                <SelectTrigger className="w-[180px] bg-background">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mdf">MDF</SelectItem>
                  <SelectItem value="finger_joint">Finger Joint</SelectItem>
                  <SelectItem value="pine">Pine</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-6 p-4 bg-background rounded-lg border border-teal-100">
              {Object.entries(PLANNER_CATEGORIES.finishing[selectedFinishingType]).map(([sectionName, categories]) => {
                const showCF = !isLumberGroup(sectionName);
                return (
                  <div key={sectionName} className="space-y-3">
                    <div className="flex items-center gap-2 border-b border-teal-200 pb-1">
                      <h4 className="font-medium text-foreground">{sectionName}</h4>
                      {showCF && (
                        <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded flex items-center gap-1">
                          <Info className="h-3 w-3" />
                          CF
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {categories.map((category) => {
                        const cfValue = showCF ? getOrgCF('finishing', selectedFinishingType, category) : 1;
                        return (
                          <div key={category} className="space-y-2">
                            <Label htmlFor={`finishing-${selectedFinishingType}-${category}`} className="text-foreground">{category}</Label>
                            <InventoryCombobox
                              id={`finishing-${selectedFinishingType}-${category}`}
                              items={inventoryItems}
                              value={getDefaultValue('finishing', selectedFinishingType, category)}
                              onChange={(value) => handleDefaultChange('finishing', selectedFinishingType, category, value)}
                              placeholder="Select inventory item..."
                            />
                            {showCF && (
                              <div className="flex items-center gap-2">
                                <Label className="text-xs text-muted-foreground whitespace-nowrap">CF:</Label>
                                {(() => {
                                  const cfKey = getCFKey('finishing', selectedFinishingType, category);
                                  const editVal = cfEditValues[cfKey];
                                  const displayVal = editVal !== undefined ? editVal : (cfValue === 1 ? '' : String(cfValue));
                                  return (
                                    <>
                                      <Input
                                        type="text"
                                        inputMode="decimal"
                                        value={displayVal}
                                        onChange={(e) => handleCFInputChange('finishing', selectedFinishingType, category, e.target.value)}
                                        onBlur={() => handleCFInputBlur('finishing', selectedFinishingType, category)}
                                        placeholder="1"
                                        className="h-7 w-24 text-xs text-foreground"
                                        title="Conversion Factor: raw qty × CF = purchase qty. E.g., 25/box → CF=0.04. Enter any decimal."
                                      />
                                      {cfValue !== 1 && editVal === undefined && (
                                        <span className="text-xs text-amber-600 font-medium">×{cfValue}</span>
                                      )}
                                    </>
                                  );
                                })()}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
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