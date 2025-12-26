import { DeckConfig, DeckMaterials, MaterialItem, DeckingMaterialType } from '../types/deck';

// Mapping of decking material types to search keywords for inventory lookup
const DECKING_TYPE_KEYWORDS: Record<DeckingMaterialType, string[]> = {
  'Spruce': ['spruce', 'deck board', 'decking'],
  'Treated': ['treated', 'pressure treated', 'deck board', 'decking'],
  'Cedar': ['cedar', 'deck board', 'decking'],
  'Composite': ['composite', 'deck board', 'decking', 'trex'],
};

/**
 * Calculate total deck area in square feet
 */
export function calculateDeckArea(config: DeckConfig): number {
  if (config.shape === 'rectangle') {
    return config.width * config.length;
  } else {
    // L-shape: main rectangle + extension
    const mainArea = config.width * config.length;
    const extensionArea = (config.lShapeWidth || 4) * (config.lShapeLength || 4);
    return mainArea + extensionArea;
  }
}

/**
 * Calculate railing linear footage
 */
export function calculateRailingLength(config: DeckConfig): number {
  let totalLength = 0;
  
  if (config.shape === 'rectangle') {
    if (config.railingSides.includes('front')) {
      totalLength += config.width;
      // Subtract stair width if on front
      if (config.hasStairs && config.stairSide === 'front') {
        totalLength -= (config.stairWidth || 4);
      }
    }
    if (config.railingSides.includes('back')) {
      totalLength += config.width;
      if (config.hasStairs && config.stairSide === 'back') {
        totalLength -= (config.stairWidth || 4);
      }
    }
    if (config.railingSides.includes('left')) {
      totalLength += config.length;
      if (config.hasStairs && config.stairSide === 'left') {
        totalLength -= (config.stairWidth || 4);
      }
    }
    if (config.railingSides.includes('right')) {
      totalLength += config.length;
      if (config.hasStairs && config.stairSide === 'right') {
        totalLength -= (config.stairWidth || 4);
      }
    }
  }
  
  return totalLength;
}

/**
 * Main materials calculation function
 */
export function calculateMaterials(config: DeckConfig): DeckMaterials {
  const deckArea = calculateDeckArea(config);
  const railingLength = calculateRailingLength(config);
  
  // FRAMING
  const framing: MaterialItem[] = [];
  
  // Joists - calculate based on spacing and length
  const joistSpacingFeet = config.joistSpacing / 12;
  const numberOfJoists = Math.ceil(config.width / joistSpacingFeet) + 1;
  const joistLength = config.length;
  
  framing.push({
    category: 'Framing',
    description: `2x8 Pressure Treated Joists (${joistLength}')`,
    quantity: numberOfJoists,
    unit: 'pcs',
    notes: `Spaced ${config.joistSpacing}" on center`,
  });
  
  // Rim joists / band boards (perimeter)
  const perimeterLength = (config.width * 2) + (config.length * 2);
  const rimJoistCount = Math.ceil(perimeterLength / 12); // Assuming 12' boards
  
  framing.push({
    category: 'Framing',
    description: '2x8 Pressure Treated Rim Joists (12\')',
    quantity: rimJoistCount,
    unit: 'pcs',
    notes: 'Perimeter band boards',
  });
  
  // Beams - estimate based on deck width
  const beamCount = Math.ceil(config.length / 8); // Beam every 8 feet
  
  framing.push({
    category: 'Framing',
    description: `2x10 Pressure Treated Beams (${config.width}')`,
    quantity: beamCount,
    unit: 'pcs',
    notes: 'Main support beams',
  });
  
  // Posts - estimate based on beam locations
  const postCount = beamCount * Math.ceil(config.width / 8);
  
  framing.push({
    category: 'Framing',
    description: `6x6 Pressure Treated Posts (${Math.ceil(config.height + 1)}')`,
    quantity: postCount,
    unit: 'pcs',
    notes: 'Support posts with concrete footings',
  });
  
  // DECKING
  const decking: MaterialItem[] = [];
  
  // Add 10% waste factor
  const deckingAreaWithWaste = deckArea * 1.1;
  const deckingBoardsNeeded = Math.ceil((deckingAreaWithWaste * 12) / (5.5 * config.length)); // 5.5" wide boards
  
  const deckingMaterialType = config.deckingType || 'Treated';
  
  decking.push({
    category: 'Decking',
    description: `5/4 x 6 ${deckingMaterialType} Deck Boards (${config.length}')`,
    quantity: deckingBoardsNeeded,
    unit: 'pcs',
    notes: `Covers ${deckArea.toFixed(0)} sq ft (${deckingAreaWithWaste.toFixed(0)} sq ft with waste)`,
  });
  
  // RAILING
  const railing: MaterialItem[] = [];
  
  if (railingLength > 0) {
    // Top and bottom rails
    const railSections = Math.ceil(railingLength / 8); // 8' sections
    
    railing.push({
      category: 'Railing',
      description: '2x4 Top Rail (8\')',
      quantity: railSections,
      unit: 'pcs',
      notes: `${railingLength.toFixed(0)} linear feet total`,
    });
    
    railing.push({
      category: 'Railing',
      description: '2x4 Bottom Rail (8\')',
      quantity: railSections,
      unit: 'pcs',
    });
    
    // Balusters - 4" spacing typically
    const balusterCount = Math.ceil(railingLength * 3); // Approx 3 per foot
    
    railing.push({
      category: 'Railing',
      description: '2x2 Balusters (42")',
      quantity: balusterCount,
      unit: 'pcs',
      notes: 'Spaced approximately 4" apart',
    });
    
    // Railing posts
    const railingPostCount = Math.ceil(railingLength / 6); // Post every 6 feet
    
    railing.push({
      category: 'Railing',
      description: '4x4 Railing Posts (42")',
      quantity: railingPostCount,
      unit: 'pcs',
      notes: 'Spaced 6\' on center maximum',
    });
  }
  
  // STAIRS
  if (config.hasStairs) {
    const stairHeight = config.height;
    const numberOfSteps = Math.ceil(stairHeight / 0.58); // 7" risers
    
    framing.push({
      category: 'Stairs',
      description: `2x12 Stair Stringers (${Math.ceil(stairHeight + 4)}')`,
      quantity: 3,
      unit: 'pcs',
      notes: `${numberOfSteps} steps with 7" rise, 11" run`,
    });
    
    decking.push({
      category: 'Stairs',
      description: '2x6 Stair Treads',
      quantity: numberOfSteps * 2,
      unit: 'pcs',
      notes: 'Two boards per tread',
    });
  }
  
  // HARDWARE
  const hardware: MaterialItem[] = [];
  
  hardware.push({
    category: 'Hardware',
    description: 'Joist Hangers',
    quantity: numberOfJoists * 2,
    unit: 'pcs',
    notes: 'For joist-to-rim connection',
  });
  
  // Composite decking requires special hardware
  if (deckingMaterialType === 'Composite') {
    // Deck clips - 1 per square foot
    hardware.push({
      category: 'Hardware',
      description: 'Composite Deck Clips',
      quantity: Math.ceil(deckArea),
      unit: 'pcs',
      notes: 'Hidden fastening system - 1 per sq ft',
    });
    
    // Composite screws - 1 per square foot
    hardware.push({
      category: 'Hardware',
      description: 'Composite Deck Screws',
      quantity: Math.ceil(deckArea),
      unit: 'pcs',
      notes: 'Color-matched screws - 1 per sq ft',
    });
    
    // Composite plugs - 1 per square foot
    hardware.push({
      category: 'Hardware',
      description: 'Composite Deck Plugs',
      quantity: Math.ceil(deckArea),
      unit: 'pcs',
      notes: 'Color-matched plugs - 1 per sq ft',
    });
  } else {
    // Standard deck screws for non-composite decking
    hardware.push({
      category: 'Hardware',
      description: 'Deck Screws (3")',
      quantity: Math.ceil(deckArea / 10),
      unit: 'lbs',
      notes: 'For decking installation',
    });
  }
  
  hardware.push({
    category: 'Hardware',
    description: 'Structural Screws (5")',
    quantity: 5,
    unit: 'lbs',
    notes: 'For framing connections',
  });
  
  hardware.push({
    category: 'Hardware',
    description: 'Post Anchors',
    quantity: postCount,
    unit: 'pcs',
    notes: 'Concrete footing anchors',
  });
  
  hardware.push({
    category: 'Hardware',
    description: 'Railing Brackets',
    quantity: railingLength > 0 ? Math.ceil(railingLength / 6) * 4 : 0,
    unit: 'pcs',
    notes: 'Post mounting hardware',
  });
  
  return {
    framing,
    decking,
    railing,
    hardware,
  };
}

/**
 * Calculate total material count for quick summary
 */
export function getMaterialsSummary(materials: DeckMaterials): {
  totalItems: number;
  categories: string[];
} {
  const allItems = [
    ...materials.framing,
    ...materials.decking,
    ...materials.railing,
    ...materials.hardware,
  ];
  
  const categories = Array.from(new Set(allItems.map(item => item.category)));
  
  return {
    totalItems: allItems.length,
    categories,
  };
}