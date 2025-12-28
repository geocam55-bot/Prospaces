export type RoofStyle = 'gable' | 'hip' | 'gambrel' | 'shed' | 'mansard' | 'flat';
export type RoofPitch = '2/12' | '3/12' | '4/12' | '5/12' | '6/12' | '7/12' | '8/12' | '9/12' | '10/12' | '12/12';
export type ShingleType = 'architectural' | '3-tab' | 'designer' | 'metal' | 'cedar-shake';
export type UnderlaymentType = 'felt-15' | 'felt-30' | 'synthetic' | 'ice-and-water';
export type Unit = 'feet' | 'meters';

export interface RoofConfig {
  // Building dimensions
  length: number; // building length in feet or meters
  width: number; // building width
  
  // Roof style and pitch
  style: RoofStyle;
  pitch: RoofPitch;
  
  // Overhangs (eaves and rakes)
  eaveOverhang: number; // in feet, typical 1-2 feet
  rakeOverhang: number; // in feet, typical 1-2 feet
  
  // Ridge details (for certain styles)
  ridgeVentLength?: number; // calculated based on style
  
  // Valleys (for complex roofs)
  hasValleys?: boolean;
  valleyCount?: number;
  
  // Materials
  shingleType: ShingleType;
  underlaymentType: UnderlaymentType;
  
  // Additional features
  hasSkylight?: boolean;
  skylightCount?: number;
  hasChimney?: boolean;
  chimneyCount?: number;
  
  // Waste factor (typically 10-15% for shingles)
  wasteFactor: number; // as decimal (e.g., 0.10 for 10%)
  
  // Unit
  unit: Unit;
  
  // Optional metadata
  name?: string;
  notes?: string;
  customerId?: string;
  projectId?: string;
}

export interface MaterialItem {
  category: string;
  description: string;
  quantity: number;
  unit: string;
  notes?: string;
  sku?: string;
  cost?: number;
  unitPrice?: number;
  totalCost?: number;
}

export interface RoofMaterials {
  roofDeck: MaterialItem[];
  underlayment: MaterialItem[];
  shingles: MaterialItem[];
  ventilation: MaterialItem[];
  flashing: MaterialItem[];
  ridgeAndHip: MaterialItem[];
  hardware: MaterialItem[];
  totalEstimatedCost?: number;
}

export interface SavedRoofDesign {
  id: string;
  name: string;
  config: RoofConfig;
  createdAt: string;
  updatedAt: string;
  thumbnail?: string;
}
