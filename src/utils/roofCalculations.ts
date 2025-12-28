import type { RoofConfig, RoofMaterials, MaterialItem } from '../types/roof';

/**
 * Calculate roof pitch multiplier based on pitch ratio
 * This converts flat roof area to sloped roof area
 */
function getPitchMultiplier(pitch: string): number {
  const pitchMap: Record<string, number> = {
    '2/12': 1.014,
    '3/12': 1.031,
    '4/12': 1.054,
    '5/12': 1.083,
    '6/12': 1.118,
    '7/12': 1.158,
    '8/12': 1.202,
    '9/12': 1.250,
    '10/12': 1.302,
    '12/12': 1.414,
  };
  return pitchMap[pitch] || 1.118; // Default to 6/12 if not found
}

/**
 * Calculate the actual roof surface area based on building dimensions and style
 */
function calculateRoofArea(config: RoofConfig): number {
  const { length, width, style, pitch, eaveOverhang, rakeOverhang } = config;
  
  // Add overhangs to dimensions
  const totalLength = length + (2 * rakeOverhang);
  const totalWidth = width + (2 * eaveOverhang);
  
  // Get pitch multiplier
  const multiplier = getPitchMultiplier(pitch);
  
  let roofArea = 0;
  
  switch (style) {
    case 'gable':
      // Two rectangular slopes
      roofArea = totalLength * (totalWidth / 2) * multiplier * 2;
      break;
      
    case 'hip':
      // Four triangular/trapezoidal slopes - slightly more complex
      // Hip roofs have approximately 10% more surface area than gable
      roofArea = totalLength * totalWidth * multiplier * 1.1;
      break;
      
    case 'gambrel':
      // Barn-style roof with two slopes on each side
      // Upper slope is steeper, lower slope is flatter
      // Approximate as 1.15x a standard gable
      roofArea = totalLength * (totalWidth / 2) * multiplier * 2 * 1.15;
      break;
      
    case 'shed':
      // Single slope
      roofArea = totalLength * totalWidth * multiplier;
      break;
      
    case 'mansard':
      // Four-sided gambrel-style roof
      // Complex calculation - approximate as 1.3x gable
      roofArea = totalLength * (totalWidth / 2) * multiplier * 2 * 1.3;
      break;
      
    case 'flat':
      // Minimal slope for drainage
      roofArea = totalLength * totalWidth * 1.02; // 2% slope
      break;
      
    default:
      roofArea = totalLength * totalWidth * multiplier;
  }
  
  return roofArea;
}

/**
 * Calculate materials needed for the roof
 */
export function calculateMaterials(config: RoofConfig): RoofMaterials {
  const roofArea = calculateRoofArea(config);
  const roofSquares = roofArea / 100; // 1 square = 100 sq ft
  const { length, width, style, shingleType, underlaymentType, wasteFactor } = config;
  
  // Add waste factor
  const totalSquares = roofSquares * (1 + wasteFactor);
  
  // Calculate perimeter for drip edge and starter shingles
  const totalLength = length + (2 * config.rakeOverhang);
  const totalWidth = width + (2 * config.eaveOverhang);
  const perimeter = (totalLength + totalWidth) * 2;
  
  // Calculate ridge length based on style
  let ridgeLength = 0;
  let hipLength = 0;
  
  switch (style) {
    case 'gable':
      ridgeLength = totalLength;
      break;
    case 'hip':
      ridgeLength = totalLength;
      hipLength = totalWidth * getPitchMultiplier(config.pitch) * 2; // Approximate hip length
      break;
    case 'gambrel':
      ridgeLength = totalLength * 1.5; // Multiple ridges
      break;
    case 'shed':
      ridgeLength = 0; // No ridge
      break;
    case 'mansard':
      ridgeLength = (totalLength + totalWidth) * 2;
      break;
    case 'flat':
      ridgeLength = 0;
      break;
  }
  
  const totalRidgeAndHipLength = ridgeLength + hipLength;
  
  // 1. ROOF DECK MATERIALS
  const roofDeck: MaterialItem[] = [];
  
  // OSB or plywood sheathing (sheets are 4x8 = 32 sq ft)
  const sheathingSheets = Math.ceil((roofArea * 1.1) / 32); // 10% waste for cuts
  roofDeck.push({
    category: 'Roof Deck',
    description: '7/16" OSB Roof Sheathing (4\'x8\' sheets)',
    quantity: sheathingSheets,
    unit: 'sheets',
    notes: 'Covers entire roof surface with 10% waste factor',
  });
  
  // Nails for sheathing
  const sheathingNailBoxes = Math.ceil(sheathingSheets / 50); // ~50 sheets per box of nails
  roofDeck.push({
    category: 'Roof Deck',
    description: '8d Ring Shank Nails for Sheathing (5 lb box)',
    quantity: sheathingNailBoxes,
    unit: 'boxes',
    notes: 'For fastening OSB to rafters',
  });
  
  // 2. UNDERLAYMENT
  const underlayment: MaterialItem[] = [];
  
  // Felt or synthetic underlayment (rolls cover ~400 sq ft)
  const underlaymentRolls = Math.ceil((roofArea * 1.15) / 400); // 15% overlap
  
  let underlaymentDesc = '';
  switch (underlaymentType) {
    case 'felt-15':
      underlaymentDesc = '#15 Felt Underlayment (400 sq ft roll)';
      break;
    case 'felt-30':
      underlaymentDesc = '#30 Felt Underlayment (400 sq ft roll)';
      break;
    case 'synthetic':
      underlaymentDesc = 'Synthetic Underlayment (1000 sq ft roll)';
      break;
    case 'ice-and-water':
      underlaymentDesc = 'Ice & Water Shield (200 sq ft roll)';
      break;
  }
  
  const rollCoverage = underlaymentType === 'synthetic' ? 1000 : underlaymentType === 'ice-and-water' ? 200 : 400;
  const actualRolls = Math.ceil((roofArea * 1.15) / rollCoverage);
  
  underlayment.push({
    category: 'Underlayment',
    description: underlaymentDesc,
    quantity: actualRolls,
    unit: 'rolls',
    notes: 'Provides waterproof barrier under shingles',
  });
  
  // Ice and water shield for eaves (if not primary underlayment)
  if (underlaymentType !== 'ice-and-water') {
    const eaveLength = totalLength * 2; // Both eaves
    const iceWaterRolls = Math.ceil((eaveLength * 3) / 200); // 3 ft up from eave, 200 sq ft per roll
    underlayment.push({
      category: 'Underlayment',
      description: 'Ice & Water Shield for Eaves (200 sq ft roll)',
      quantity: iceWaterRolls,
      unit: 'rolls',
      notes: '3 ft strip along all eaves for ice dam protection',
    });
  }
  
  // 3. SHINGLES
  const shingles: MaterialItem[] = [];
  
  // Main shingles (sold by the square or bundle)
  // Typically 3 bundles per square
  let shingleDescription = '';
  let bundlesPerSquare = 3;
  
  switch (shingleType) {
    case 'architectural':
      shingleDescription = 'Architectural Shingles (Lifetime Warranty)';
      bundlesPerSquare = 3;
      break;
    case '3-tab':
      shingleDescription = '3-Tab Asphalt Shingles (25-year)';
      bundlesPerSquare = 3;
      break;
    case 'designer':
      shingleDescription = 'Designer Shingles (Premium)';
      bundlesPerSquare = 4;
      break;
    case 'metal':
      shingleDescription = 'Metal Roofing Panels';
      bundlesPerSquare = 1; // Metal sold differently
      break;
    case 'cedar-shake':
      shingleDescription = 'Cedar Shake Shingles';
      bundlesPerSquare = 5;
      break;
  }
  
  if (shingleType === 'metal') {
    // Metal roofing in panels
    const panelLength = 12; // 12 ft panels typical
    const panelWidth = 3; // 3 ft coverage
    const panelsNeeded = Math.ceil((roofArea * 1.1) / (panelLength * panelWidth));
    shingles.push({
      category: 'Roofing',
      description: `${shingleDescription} (12\' x 3\' panels)`,
      quantity: panelsNeeded,
      unit: 'panels',
      notes: `Covers ${totalSquares.toFixed(1)} squares with waste factor`,
    });
  } else {
    // Traditional shingles
    const totalBundles = Math.ceil(totalSquares * bundlesPerSquare);
    shingles.push({
      category: 'Roofing',
      description: `${shingleDescription}`,
      quantity: totalBundles,
      unit: 'bundles',
      notes: `${totalSquares.toFixed(1)} squares total (${bundlesPerSquare} bundles per square)`,
    });
  }
  
  // Starter strips
  const starterStripLinearFeet = perimeter * 1.1;
  const starterStripBundles = Math.ceil(starterStripLinearFeet / 100); // ~100 LF per bundle
  shingles.push({
    category: 'Roofing',
    description: 'Starter Strip Shingles',
    quantity: starterStripBundles,
    unit: 'bundles',
    notes: `${Math.round(starterStripLinearFeet)} linear feet along eaves and rakes`,
  });
  
  // Roofing nails
  const nailBoxes = Math.ceil(totalSquares * 0.5); // ~2 boxes per square
  shingles.push({
    category: 'Roofing',
    description: '1-1/4" Roofing Nails (5 lb box)',
    quantity: nailBoxes,
    unit: 'boxes',
    notes: 'For fastening shingles to deck',
  });
  
  // 4. RIDGE AND HIP CAP
  const ridgeAndHip: MaterialItem[] = [];
  
  if (totalRidgeAndHipLength > 0) {
    // Ridge cap shingles (covers ~35 LF per bundle)
    const ridgeCapBundles = Math.ceil(totalRidgeAndHipLength / 35);
    ridgeAndHip.push({
      category: 'Ridge & Hip',
      description: 'Ridge Cap Shingles',
      quantity: ridgeCapBundles,
      unit: 'bundles',
      notes: `${Math.round(totalRidgeAndHipLength)} linear feet of ridge and hip`,
    });
    
    // Ridge vent (if applicable)
    if (style !== 'flat' && style !== 'shed') {
      const ridgeVentPieces = Math.ceil(ridgeLength / 4); // 4 ft sections
      ridgeAndHip.push({
        category: 'Ridge & Hip',
        description: 'Ridge Vent (4\' sections)',
        quantity: ridgeVentPieces,
        unit: 'pieces',
        notes: `${Math.round(ridgeLength)} linear feet of ridge ventilation`,
      });
    }
  }
  
  // 5. FLASHING
  const flashing: MaterialItem[] = [];
  
  // Drip edge
  const dripEdgeLinearFeet = perimeter;
  const dripEdgePieces = Math.ceil(dripEdgeLinearFeet / 10); // 10 ft pieces
  flashing.push({
    category: 'Flashing',
    description: 'Drip Edge (10\' pieces)',
    quantity: dripEdgePieces,
    unit: 'pieces',
    notes: `${Math.round(dripEdgeLinearFeet)} linear feet around perimeter`,
  });
  
  // Valley flashing (if applicable)
  if (config.hasValleys && config.valleyCount) {
    const valleyLength = width * getPitchMultiplier(config.pitch) * config.valleyCount;
    const valleyFlashingPieces = Math.ceil(valleyLength / 10);
    flashing.push({
      category: 'Flashing',
      description: 'Valley Flashing (10\' pieces)',
      quantity: valleyFlashingPieces,
      unit: 'pieces',
      notes: `${Math.round(valleyLength)} linear feet for ${config.valleyCount} valleys`,
    });
  }
  
  // Chimney flashing (if applicable)
  if (config.hasChimney && config.chimneyCount) {
    flashing.push({
      category: 'Flashing',
      description: 'Chimney Flashing Kit',
      quantity: config.chimneyCount,
      unit: 'kits',
      notes: 'Step flashing and counter flashing for chimney',
    });
  }
  
  // Skylight flashing (if applicable)
  if (config.hasSkylight && config.skylightCount) {
    flashing.push({
      category: 'Flashing',
      description: 'Skylight Flashing Kit',
      quantity: config.skylightCount,
      unit: 'kits',
      notes: 'Pre-formed flashing kit for skylight installation',
    });
  }
  
  // Pipe boot flashing (typical installations have 2-4)
  flashing.push({
    category: 'Flashing',
    description: 'Pipe Boot Flashing (3" diameter)',
    quantity: 3,
    unit: 'pieces',
    notes: 'For plumbing vent pipes',
  });
  
  // 6. VENTILATION
  const ventilation: MaterialItem[] = [];
  
  // Calculate ventilation needs (1 sq ft vent per 150 sq ft attic)
  const atticArea = length * width;
  const ventilationNeeded = atticArea / 150;
  
  // Box vents or gable vents
  if (style !== 'flat') {
    const boxVents = Math.ceil(ventilationNeeded / 1.5); // Each box vent ~50 sq in
    ventilation.push({
      category: 'Ventilation',
      description: 'Box Roof Vent (50 sq in)',
      quantity: boxVents,
      unit: 'pieces',
      notes: `${ventilationNeeded.toFixed(1)} sq ft of ventilation required`,
    });
  }
  
  // Soffit vents for intake (if eaves)
  const soffitVentLinearFeet = (totalLength + totalWidth) * 2;
  const soffitVents = Math.ceil(soffitVentLinearFeet / 8); // 8" wide vents
  ventilation.push({
    category: 'Ventilation',
    description: 'Continuous Soffit Vent (8" wide)',
    quantity: soffitVents,
    unit: 'pieces',
    notes: `${Math.round(soffitVentLinearFeet)} linear feet of soffit intake ventilation`,
  });
  
  // 7. HARDWARE & ACCESSORIES
  const hardware: MaterialItem[] = [];
  
  // Roofing cement/sealant
  hardware.push({
    category: 'Hardware',
    description: 'Roofing Cement (10 oz tubes)',
    quantity: 6,
    unit: 'tubes',
    notes: 'For sealing flashing and penetrations',
  });
  
  // Roof deck protection tape
  hardware.push({
    category: 'Hardware',
    description: 'Roof Deck Protection Tape',
    quantity: 2,
    unit: 'rolls',
    notes: 'For sealing seams in underlayment',
  });
  
  // Caulk for flashing
  hardware.push({
    category: 'Hardware',
    description: 'Exterior Caulk (10 oz tubes)',
    quantity: 4,
    unit: 'tubes',
    notes: 'For sealing around flashing and penetrations',
  });
  
  return {
    roofDeck,
    underlayment,
    shingles,
    ridgeAndHip,
    flashing,
    ventilation,
    hardware,
  };
}

/**
 * Calculate total cost if materials have pricing
 */
export function calculateTotalCost(materials: RoofMaterials): number {
  let total = 0;
  
  Object.values(materials).forEach((category) => {
    if (Array.isArray(category)) {
      category.forEach((item) => {
        if (item.totalCost) {
          total += item.totalCost;
        }
      });
    }
  });
  
  return total;
}

/**
 * Format roof area for display
 */
export function formatRoofArea(config: RoofConfig): string {
  const area = calculateRoofArea(config);
  const squares = area / 100;
  return `${area.toFixed(0)} sq ft (${squares.toFixed(1)} squares)`;
}

/**
 * Get roof pitch description
 */
export function getPitchDescription(pitch: string): string {
  const [rise, run] = pitch.split('/').map(Number);
  const angle = Math.atan(rise / run) * (180 / Math.PI);
  return `${pitch} pitch (${angle.toFixed(1)}° angle)`;
}
