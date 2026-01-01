export type CabinetType = 'base' | 'wall' | 'tall' | 'corner-base' | 'corner-wall' | 'island' | 'peninsula';
export type CabinetFinish = 'White' | 'Oak' | 'Walnut' | 'Gray' | 'Black' | 'Cherry' | 'Maple';
export type CountertopMaterial = 'Laminate' | 'Granite' | 'Quartz' | 'Marble' | 'Butcher Block' | 'Concrete';
export type ApplianceType = 'refrigerator' | 'stove' | 'oven' | 'dishwasher' | 'microwave' | 'sink';
export type OpeningType = 'window' | 'door' | 'passthrough';

export interface CabinetItem {
  id: string;
  type: CabinetType;
  name: string;
  width: number; // in inches
  height: number; // in inches
  depth: number; // in inches
  finish?: CabinetFinish;
  hasDrawers?: boolean;
  numberOfDrawers?: number;
  hasDoors?: boolean;
  numberOfDoors?: number;
  price?: number;
  image?: string; // Preview image
}

export interface PlacedCabinet extends CabinetItem {
  x: number; // position on canvas
  y: number; // position on canvas
  rotation: number; // 0, 90, 180, 270
  wall: 'north' | 'south' | 'east' | 'west' | 'island'; // which wall it's attached to
}

export interface Appliance {
  id: string;
  type: ApplianceType;
  name: string;
  width: number;
  height: number;
  depth: number;
  x: number;
  y: number;
  rotation: number;
  price?: number;
}

export interface Countertop {
  id: string;
  material: CountertopMaterial;
  segments: {
    x: number;
    y: number;
    width: number;
    depth: number;
  }[];
  thickness: number; // in inches
  price?: number;
}

export interface KitchenConfig {
  name?: string;
  description?: string;
  
  // Room dimensions
  roomWidth: number; // in feet
  roomLength: number; // in feet
  roomHeight: number; // in feet (ceiling height)
  
  // Layout
  layoutStyle: 'L-shape' | 'U-shape' | 'galley' | 'island' | 'one-wall' | 'custom';
  
  // Cabinets
  cabinets: PlacedCabinet[];
  cabinetFinish: CabinetFinish;
  
  // Countertops
  countertops: Countertop[];
  countertopMaterial: CountertopMaterial;
  
  // Appliances
  appliances: Appliance[];
  
  // Features
  hasIsland: boolean;
  hasPantry: boolean;
  hasBacksplash: boolean;
  
  // Grid settings
  gridSize: number; // in inches for snapping
  showGrid: boolean;
  
  // View settings
  viewMode: '2D' | '3D';
  unit: 'feet' | 'inches';
}

export interface KitchenMaterials {
  cabinets: {
    description: string;
    quantity: number;
    unit: string;
    category: 'Base Cabinets' | 'Wall Cabinets' | 'Tall Cabinets' | 'Corner Cabinets';
    unitPrice?: number;
    totalPrice?: number;
  }[];
  countertops: {
    description: string;
    quantity: number;
    unit: string;
    unitPrice?: number;
    totalPrice?: number;
  }[];
  appliances: {
    description: string;
    quantity: number;
    unit: string;
    unitPrice?: number;
    totalPrice?: number;
  }[];
  hardware: {
    description: string;
    quantity: number;
    unit: string;
    unitPrice?: number;
    totalPrice?: number;
  }[];
  installation: {
    description: string;
    quantity: number;
    unit: string;
    unitPrice?: number;
    totalPrice?: number;
  }[];
}

// Predefined cabinet catalog
export const CABINET_CATALOG: CabinetItem[] = [
  // Base Cabinets
  { id: 'base-12', type: 'base', name: 'Base Cabinet 12"', width: 12, height: 34.5, depth: 24, hasDrawers: true, numberOfDrawers: 3 },
  { id: 'base-15', type: 'base', name: 'Base Cabinet 15"', width: 15, height: 34.5, depth: 24, hasDrawers: true, numberOfDrawers: 3 },
  { id: 'base-18', type: 'base', name: 'Base Cabinet 18"', width: 18, height: 34.5, depth: 24, hasDoors: true, numberOfDoors: 1 },
  { id: 'base-21', type: 'base', name: 'Base Cabinet 21"', width: 21, height: 34.5, depth: 24, hasDoors: true, numberOfDoors: 1 },
  { id: 'base-24', type: 'base', name: 'Base Cabinet 24"', width: 24, height: 34.5, depth: 24, hasDoors: true, numberOfDoors: 2 },
  { id: 'base-30', type: 'base', name: 'Base Cabinet 30"', width: 30, height: 34.5, depth: 24, hasDoors: true, numberOfDoors: 2 },
  { id: 'base-36', type: 'base', name: 'Base Cabinet 36"', width: 36, height: 34.5, depth: 24, hasDoors: true, numberOfDoors: 2 },
  
  // Wall Cabinets
  { id: 'wall-12', type: 'wall', name: 'Wall Cabinet 12"', width: 12, height: 30, depth: 12, hasDoors: true, numberOfDoors: 1 },
  { id: 'wall-15', type: 'wall', name: 'Wall Cabinet 15"', width: 15, height: 30, depth: 12, hasDoors: true, numberOfDoors: 1 },
  { id: 'wall-18', type: 'wall', name: 'Wall Cabinet 18"', width: 18, height: 30, depth: 12, hasDoors: true, numberOfDoors: 1 },
  { id: 'wall-21', type: 'wall', name: 'Wall Cabinet 21"', width: 21, height: 30, depth: 12, hasDoors: true, numberOfDoors: 1 },
  { id: 'wall-24', type: 'wall', name: 'Wall Cabinet 24"', width: 24, height: 30, depth: 12, hasDoors: true, numberOfDoors: 2 },
  { id: 'wall-30', type: 'wall', name: 'Wall Cabinet 30"', width: 30, height: 30, depth: 12, hasDoors: true, numberOfDoors: 2 },
  { id: 'wall-36', type: 'wall', name: 'Wall Cabinet 36"', width: 36, height: 30, depth: 12, hasDoors: true, numberOfDoors: 2 },
  
  // Tall Cabinets
  { id: 'tall-18', type: 'tall', name: 'Pantry Cabinet 18"', width: 18, height: 84, depth: 24, hasDoors: true, numberOfDoors: 2 },
  { id: 'tall-24', type: 'tall', name: 'Pantry Cabinet 24"', width: 24, height: 84, depth: 24, hasDoors: true, numberOfDoors: 2 },
  { id: 'tall-30', type: 'tall', name: 'Pantry Cabinet 30"', width: 30, height: 84, depth: 24, hasDoors: true, numberOfDoors: 2 },
  
  // Corner Cabinets
  { id: 'corner-base-36', type: 'corner-base', name: 'Corner Base Cabinet', width: 36, height: 34.5, depth: 36, hasDoors: true, numberOfDoors: 2 },
  { id: 'corner-wall-24', type: 'corner-wall', name: 'Corner Wall Cabinet', width: 24, height: 30, depth: 24, hasDoors: true, numberOfDoors: 2 },
  
  // Island Cabinets
  { id: 'island-36x36', type: 'island', name: 'Island Base 36"x36"', width: 36, height: 34.5, depth: 36, hasDoors: true, numberOfDoors: 4 },
  { id: 'island-48x36', type: 'island', name: 'Island Base 48"x36"', width: 48, height: 34.5, depth: 36, hasDoors: true, numberOfDoors: 6 },
];