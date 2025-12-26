export type DeckShape = 'rectangle' | 'l-shape';
export type DeckingSide = 'front' | 'back' | 'left' | 'right';
export type DeckingPattern = 'perpendicular' | 'parallel' | 'diagonal';
export type Unit = 'feet' | 'meters';
export type DeckingMaterialType = 'Spruce' | 'Treated' | 'Cedar' | 'Composite';

export interface DeckConfig {
  // Basic dimensions
  width: number; // in feet or meters
  length: number;
  shape: DeckShape;
  height: number; // deck height above ground
  
  // L-shape specific (if shape is 'l-shape')
  lShapeWidth?: number;
  lShapeLength?: number;
  lShapePosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  
  // Stairs
  hasStairs: boolean;
  stairSide?: DeckingSide;
  stairWidth?: number; // defaults to 4 feet
  
  // Railings
  railingSides: DeckingSide[];
  railingHeight?: number; // defaults to 42 inches
  
  // Construction details
  deckingPattern: DeckingPattern;
  joistSpacing: 12 | 16 | 24; // inches on center
  deckingType: DeckingMaterialType; // Material type for decking
  
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

export interface DeckMaterials {
  framing: MaterialItem[];
  decking: MaterialItem[];
  railing: MaterialItem[];
  hardware: MaterialItem[];
  totalEstimatedCost?: number;
}

export interface SavedDesign {
  id: string;
  name: string;
  config: DeckConfig;
  createdAt: string;
  updatedAt: string;
  thumbnail?: string;
}