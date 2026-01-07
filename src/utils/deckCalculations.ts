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
 * Covers complete perimeter excluding house side (back) and stair opening
 */
export function calculateRailingLength(config: DeckConfig): number {
  let totalLength = 0;
  
  if (config.shape === 'rectangle') {
    // Calculate perimeter excluding back (house side)
    totalLength += config.width;  // front
    totalLength += config.length; // right
    totalLength += config.length; // left
    
    // Subtract stairs if present (not on back/house side)
    if (config.hasStairs && config.stairSide !== 'back') {
      totalLength -= (config.stairWidth || 4);
    }
  } else if (config.shape === 'l-shape') {
    // L-shape: calculate complete outer perimeter excluding house side (back)
    const mainWidth = config.width;
    const mainLength = config.length;
    const lWidth = config.lShapeWidth || 4;
    const lLength = config.lShapeLength || 4;
    const lPos = config.lShapePosition || 'top-left';
    
    // Calculate outer perimeter segments based on L-shape position
    // The "back" edge (house side, z = -mainLength/2 in 3D) is always excluded
    // Interior edges where L meets main rectangle are also excluded
    
    switch (lPos) {
      case 'top-right':
        // L extends RIGHT from the back-right corner
        // Outer perimeter: main right (partial), L right outer, L front connecting, main front, main left
        totalLength = (mainLength - lLength) + lLength + lWidth + mainWidth + mainLength;
        // Simplifies to: mainLength + lWidth + mainWidth + mainLength
        totalLength = 2 * mainLength + mainWidth + lWidth;
        break;
        
      case 'bottom-right':
        // L extends RIGHT from the front-right corner
        // Outer perimeter: main right (partial), L right outer, L bottom, main front, main left
        totalLength = (mainLength - lLength) + lLength + lWidth + mainWidth + mainLength;
        // Simplifies to: mainLength + lWidth + mainWidth + mainLength
        totalLength = 2 * mainLength + mainWidth + lWidth;
        break;
        
      case 'bottom-left':
        // L extends LEFT from the front-left corner
        // Outer perimeter: main right, main front, L bottom, L left outer, main left (partial)
        totalLength = mainLength + mainWidth + lWidth + lLength + (mainLength - lLength);
        // Simplifies to: mainLength + mainWidth + lWidth + mainLength
        totalLength = 2 * mainLength + mainWidth + lWidth;
        break;
        
      case 'top-left':
      default:
        // L extends LEFT from the back-left corner
        // Outer perimeter: main right, main front, main left (partial), L left outer, L front edge
        totalLength = mainLength + mainWidth + (mainLength - lLength) + lLength + lWidth;
        // Simplifies to: mainLength + mainWidth + mainLength + lWidth
        totalLength = 2 * mainLength + mainWidth + lWidth;
        break;
    }
    
    // Subtract stairs if present (stairs can be on any outer edge)
    if (config.hasStairs) {
      totalLength -= (config.stairWidth || 4);
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
  
  // Ledger Board - attaches deck to house
  // Uses same depth as joists (2x8), length equals deck width
  framing.push({
    category: 'Framing',
    description: `2x8 Pressure Treated Ledger Board (${config.width}')`,
    quantity: 1,
    unit: 'pcs',
    notes: 'Attaches deck to house structure',
  });
  
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
  
  // Calculate stair railing length if enabled
  let stairRailingLength = 0;
  if (config.hasStairs && config.stairRailing !== false) {
    const stairHeight = config.height;
    const numberOfSteps = Math.ceil(stairHeight / 0.58);
    const totalRun = numberOfSteps * (11/12); // 11 inches run
    const slopeLength = Math.sqrt(Math.pow(stairHeight, 2) + Math.pow(totalRun, 2));
    stairRailingLength = slopeLength * 2; // Both sides
  }
  
  if (config.railingStyle === 'Aluminum') {
    // ALUMINUM RAILING SYSTEM
    
    // Deck Railing
    if (railingLength > 0) {
      const railSections = Math.ceil(railingLength / 6); // 6' standard sections for aluminum often
      
      railing.push({
        category: 'Railing',
        description: 'Aluminum Top Rail (6\')',
        quantity: railSections,
        unit: 'pcs',
        notes: `${railingLength.toFixed(0)} linear feet total`,
      });
      
      railing.push({
        category: 'Railing',
        description: 'Aluminum Bottom Rail (6\')',
        quantity: railSections,
        unit: 'pcs',
      });
      
      // Balusters - typically come in packs or pre-assembled panels, but calculating individual for now
      // 15 balusters per 6' section is typical (4" spacing)
      const balusterCount = railSections * 15;
      
      railing.push({
        category: 'Railing',
        description: 'Aluminum Balusters',
        quantity: balusterCount,
        unit: 'pcs',
        notes: 'Round or square aluminum balusters',
      });
      
      // Railing posts
      const railingPostCount = Math.ceil(railingLength / 6) + 1; // +1 for the end post
      
      railing.push({
        category: 'Railing',
        description: 'Aluminum Railing Posts (3")',
        quantity: railingPostCount,
        unit: 'pcs',
        notes: 'Surface mount aluminum posts',
      });
    }
    
    // Stair Railing
    if (stairRailingLength > 0) {
      const oneSideLength = stairRailingLength / 2;
      const sectionsPerSide = Math.ceil(oneSideLength / 6);
      const totalStairSections = sectionsPerSide * 2;
      
      railing.push({
        category: 'Railing',
        description: 'Aluminum Stair Rail Kit (6\')',
        quantity: totalStairSections,
        unit: 'pcs',
        notes: 'Includes rails and balusters for stairs',
      });
      
      // 2 posts for bottom of stairs (top connects to deck post)
      railing.push({
        category: 'Railing',
        description: 'Aluminum Railing Posts (Stair/Bottom)',
        quantity: 2,
        unit: 'pcs',
        notes: 'Bottom stair posts',
      });
    }

  } else {
    // TREATED WOOD RAILING (Default)
    const totalRailLength = railingLength + stairRailingLength;
    
    if (totalRailLength > 0) {
      // Top and bottom rails
      const railSections = Math.ceil(totalRailLength / 8); // 8' sections
      
      railing.push({
        category: 'Railing',
        description: '2x4 Top Rail (8\')',
        quantity: railSections,
        unit: 'pcs',
        notes: `${totalRailLength.toFixed(0)} linear feet total`,
      });
      
      railing.push({
        category: 'Railing',
        description: '2x4 Bottom Rail (8\')',
        quantity: railSections,
        unit: 'pcs',
      });
      
      // Balusters - 4" spacing typically
      const balusterCount = Math.ceil(totalRailLength * 3); // Approx 3 per foot
      
      railing.push({
        category: 'Railing',
        description: '2x2 Balusters (42")',
        quantity: balusterCount,
        unit: 'pcs',
        notes: 'Spaced approximately 4" apart',
      });
      
      // Railing posts
      const deckPostCount = railingLength > 0 ? Math.ceil(railingLength / 6) : 0;
      const stairPostCount = stairRailingLength > 0 ? 2 : 0;
      
      railing.push({
        category: 'Railing',
        description: '4x4 Railing Posts (42")',
        quantity: deckPostCount + stairPostCount,
        unit: 'pcs',
        notes: 'Spaced 6\' on center maximum',
      });
    }
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
  
  // Ledger Board Hardware
  // Lag screws every 16" on center for ledger board attachment
  const lagScrewCount = Math.ceil((config.width * 12) / 16); // Convert width to inches, divide by 16" spacing
  
  hardware.push({
    category: 'Hardware',
    description: '1/2" x 4" Lag Screws with Washers',
    quantity: lagScrewCount,
    unit: 'pcs',
    notes: 'For ledger board attachment to house framing (16" O.C.)',
  });
  
  // Ledger flashing - matches ledger board width
  hardware.push({
    category: 'Hardware',
    description: `Ledger Flashing Tape (${config.width}')`,
    quantity: 1,
    unit: 'roll',
    notes: 'Self-adhesive waterproof membrane for ledger board',
  });
  
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
    description: 'Concrete Mix (80lb)',
    quantity: postCount,
    unit: 'bags',
    notes: 'For post footings',
  });
  
  if (config.railingStyle === 'Aluminum') {
    // Deck Railing Hardware
    if (railingLength > 0) {
      const railingPostCount = Math.ceil(railingLength / 6) + 1;
      const railSections = Math.ceil(railingLength / 6);

      hardware.push({
        category: 'Hardware',
        description: 'Aluminum Post Base',
        quantity: railingPostCount,
        unit: 'pcs',
        notes: 'For surface mounting posts',
      });

      hardware.push({
        category: 'Hardware',
        description: 'Aluminum Post Cap',
        quantity: railingPostCount,
        unit: 'pcs',
        notes: 'Decorative post finish',
      });
      
      hardware.push({
        category: 'Hardware',
        description: 'Aluminum Rail Connectors',
        quantity: railSections * 4,
        unit: 'pcs',
        notes: 'Connects rails to posts',
      });

      hardware.push({
        category: 'Hardware',
        description: 'Structural Screws (Railing)',
        quantity: railingPostCount * 4,
        unit: 'pcs',
        notes: 'For mounting post bases',
      });
    }

    // Stair Railing Hardware
    if (stairRailingLength > 0) {
      // 2 posts at bottom
      hardware.push({
        category: 'Hardware',
        description: 'Aluminum Post Base',
        quantity: 2,
        unit: 'pcs',
        notes: 'For stair bottom posts',
      });

      hardware.push({
        category: 'Hardware',
        description: 'Aluminum Post Cap',
        quantity: 2,
        unit: 'pcs',
        notes: 'For stair bottom posts',
      });

      hardware.push({
        category: 'Hardware',
        description: 'Structural Screws (Railing)',
        quantity: 2 * 4,
        unit: 'pcs',
        notes: 'For mounting stair post bases',
      });

      // Stair connectors
      const oneSideLength = stairRailingLength / 2;
      const sectionsPerSide = Math.ceil(oneSideLength / 6);
      const totalStairSections = sectionsPerSide * 2;

      hardware.push({
        category: 'Hardware',
        description: 'Aluminum Stair Rail Connectors',
        quantity: totalStairSections * 4,
        unit: 'pcs',
        notes: 'Angled connectors for stairs',
      });
    }
  } else {
    // Wood Railing Hardware
    const totalRailLength = railingLength + stairRailingLength;
    if (totalRailLength > 0) {
      hardware.push({
        category: 'Hardware',
        description: 'Railing Brackets',
        quantity: Math.ceil(totalRailLength / 6) * 4,
        unit: 'pcs',
        notes: 'Post mounting hardware',
      });
    }
  }
  
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