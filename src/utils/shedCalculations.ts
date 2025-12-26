import { ShedConfig, ShedMaterials, MaterialItem } from '../types/shed';

export function calculateMaterials(config: ShedConfig): ShedMaterials {
  const foundation = calculateFoundation(config);
  const framing = calculateFraming(config);
  const flooring = config.hasFloor ? calculateFlooring(config) : undefined;
  const roofing = calculateRoofing(config);
  const siding = calculateSiding(config);
  const doors = calculateDoors(config);
  const windows = calculateWindows(config);
  const trim = calculateTrim(config);
  const hardware = calculateHardware(config);
  const electrical = config.hasElectrical ? calculateElectrical(config) : undefined;
  const accessories = calculateAccessories(config);

  return {
    foundation,
    framing,
    flooring: flooring && flooring.length > 0 ? flooring : undefined,
    roofing,
    siding,
    doors,
    windows,
    trim,
    hardware,
    electrical: electrical && electrical.length > 0 ? electrical : undefined,
    accessories: accessories && accessories.length > 0 ? accessories : undefined,
  };
}

function calculateFoundation(config: ShedConfig): MaterialItem[] {
  const { width, length, foundationType } = config;
  const materials: MaterialItem[] = [];

  switch (foundationType) {
    case 'skids':
      materials.push(
        {
          category: 'Foundation',
          description: '4x6 Pressure Treated Skids',
          quantity: 3,
          unit: 'piece',
          notes: `${length}' lengths`,
        },
        {
          category: 'Foundation',
          description: 'Gravel Base (4" depth)',
          quantity: Math.ceil((width * length * 0.33) / 27),
          unit: 'cu yd',
          notes: 'For leveling',
        }
      );
      break;

    case 'concrete-blocks':
      const numBlocks = Math.ceil((width + length) / 2) * 2;
      materials.push(
        {
          category: 'Foundation',
          description: '8x8x16 Solid Concrete Blocks',
          quantity: numBlocks,
          unit: 'block',
          notes: '2 ft spacing, perimeter support',
        },
        {
          category: 'Foundation',
          description: '4x4 Pressure Treated Runners',
          quantity: 2,
          unit: 'piece',
          notes: `${length}' lengths`,
        },
        {
          category: 'Foundation',
          description: 'Gravel Base',
          quantity: Math.ceil((width * length * 0.33) / 27),
          unit: 'cu yd',
        }
      );
      break;

    case 'gravel-pad':
      materials.push(
        {
          category: 'Foundation',
          description: 'Crushed Gravel (6" compacted)',
          quantity: Math.ceil((width * length * 0.5) / 27),
          unit: 'cu yd',
        },
        {
          category: 'Foundation',
          description: 'Landscape Fabric',
          quantity: Math.ceil((width * length) / 100),
          unit: 'roll',
          notes: '100 sq ft per roll',
        },
        {
          category: 'Foundation',
          description: '4x4 Pressure Treated Border',
          quantity: Math.ceil((width + length) * 2 / 8),
          unit: 'piece',
          notes: '8 ft lengths',
        }
      );
      break;

    case 'concrete-slab':
      materials.push(
        {
          category: 'Foundation',
          description: '4" Concrete Slab',
          quantity: Math.ceil((width * length * 0.33) / 27),
          unit: 'cu yd',
        },
        {
          category: 'Foundation',
          description: 'Gravel Base (4" compacted)',
          quantity: Math.ceil((width * length * 0.33) / 27),
          unit: 'cu yd',
        },
        {
          category: 'Foundation',
          description: 'Wire Mesh Reinforcement',
          quantity: Math.ceil((width * length) / 150),
          unit: 'roll',
        },
        {
          category: 'Foundation',
          description: '6mil Vapor Barrier',
          quantity: Math.ceil((width * length) / 100),
          unit: 'roll',
        }
      );
      break;
  }

  return materials;
}

function calculateFraming(config: ShedConfig): MaterialItem[] {
  const { width, length, wallHeight, style, hasLoft } = config;
  const materials: MaterialItem[] = [];

  // Floor framing (if applicable)
  if (config.hasFloor) {
    const numJoists = Math.ceil(width / 1.33) + 1; // 16" o.c.
    materials.push(
      {
        category: 'Framing',
        description: '2x6 x 8\' Floor Joists',
        quantity: numJoists,
        unit: 'piece',
        notes: '16" on center',
      },
      {
        category: 'Framing',
        description: `2x6 x ${Math.ceil(length)}' Rim Joists`,
        quantity: 2,
        unit: 'piece',
      }
    );
  }

  // Wall framing
  const perimeterFeet = (width + length) * 2;
  const wallStuds = Math.ceil(perimeterFeet * 0.75); // 16" o.c.

  materials.push(
    {
      category: 'Framing',
      description: '2x4 x 8\' Wall Studs',
      quantity: wallStuds,
      unit: 'piece',
      notes: 'Pre-cut studs @ 16" o.c.',
    },
    {
      category: 'Framing',
      description: '2x4 x 8\' Plates',
      quantity: Math.ceil(perimeterFeet / 8) * 2,
      unit: 'piece',
      notes: 'Top and bottom plates',
    },
    {
      category: 'Framing',
      description: '2x6 x 8\' Headers',
      quantity: 3,
      unit: 'piece',
      notes: 'For door and window openings',
    }
  );

  // Roof framing
  const numRafters = Math.ceil(length / 2) + 1;
  
  if (style === 'barn') {
    materials.push({
      category: 'Framing',
      description: `${width}' Gambrel Roof Trusses`,
      quantity: numRafters,
      unit: 'piece',
      notes: 'Pre-built barn-style trusses',
    });
  } else {
    materials.push({
      category: 'Framing',
      description: '2x4 x 10\' Rafters',
      quantity: numRafters * 2,
      unit: 'piece',
      notes: `${config.roofPitch}/12 pitch`,
    });
    materials.push({
      category: 'Framing',
      description: '2x4 x 8\' Collar Ties',
      quantity: Math.ceil(numRafters / 2),
      unit: 'piece',
    });
  }

  materials.push({
    category: 'Framing',
    description: `2x4 x ${Math.ceil(width)}' Ridge Board`,
    quantity: Math.ceil(length / 8),
    unit: 'piece',
  });

  // Loft framing
  if (hasLoft) {
    const loftJoists = Math.ceil(width / 1.33);
    materials.push({
      category: 'Framing',
      description: '2x6 x 8\' Loft Joists',
      quantity: loftJoists,
      unit: 'piece',
      notes: 'Storage loft framing',
    });
  }

  // Sheathing
  const wallArea = perimeterFeet * wallHeight;
  const roofArea = calculateRoofArea(config);

  materials.push(
    {
      category: 'Framing',
      description: '7/16" OSB Wall Sheathing',
      quantity: Math.ceil(wallArea / 32),
      unit: 'sheet',
      notes: '4x8 sheets',
    },
    {
      category: 'Framing',
      description: '1/2" OSB Roof Sheathing',
      quantity: Math.ceil(roofArea / 32),
      unit: 'sheet',
      notes: '4x8 sheets',
    }
  );

  return materials;
}

function calculateFlooring(config: ShedConfig): MaterialItem[] {
  const { width, length } = config;
  const areaSquareFeet = width * length;

  return [
    {
      category: 'Flooring',
      description: '3/4" Tongue & Groove Plywood',
      quantity: Math.ceil(areaSquareFeet / 32),
      unit: 'sheet',
      notes: '4x8 sheets, advantech or similar',
    },
    {
      category: 'Flooring',
      description: 'Construction Adhesive',
      quantity: Math.ceil(areaSquareFeet / 150),
      unit: 'tube',
    },
  ];
}

function calculateRoofing(config: ShedConfig): MaterialItem[] {
  const { roofingMaterial, length, width } = config;
  const roofArea = calculateRoofArea(config);
  const squares = roofArea / 100;
  const materials: MaterialItem[] = [];

  // Underlayment
  materials.push({
    category: 'Roofing',
    description: '15# Felt Underlayment',
    quantity: Math.ceil(roofArea / 400),
    unit: 'roll',
    notes: '400 sq ft per roll',
  });

  // Roofing material
  switch (roofingMaterial) {
    case 'asphalt-shingle':
      materials.push({
        category: 'Roofing',
        description: '3-Tab Asphalt Shingles',
        quantity: Math.ceil(squares),
        unit: 'square',
        notes: `${roofArea.toFixed(0)} sq ft total`,
      });
      break;
    case 'architectural-shingle':
      materials.push({
        category: 'Roofing',
        description: 'Architectural Shingles',
        quantity: Math.ceil(squares),
        unit: 'square',
      });
      break;
    case 'metal':
      materials.push({
        category: 'Roofing',
        description: 'Corrugated Metal Roofing Panels',
        quantity: Math.ceil(roofArea / 25),
        unit: 'panel',
        notes: '3 ft wide x various lengths',
      });
      break;
  }

  // Ridge cap
  materials.push({
    category: 'Roofing',
    description: 'Ridge Cap Shingles',
    quantity: Math.ceil(length / 3),
    unit: 'bundle',
  });

  // Drip edge
  materials.push({
    category: 'Roofing',
    description: 'Drip Edge',
    quantity: Math.ceil((width + length) * 2 / 10),
    unit: 'piece',
    notes: '10 ft lengths',
  });

  // Nails
  materials.push({
    category: 'Roofing',
    description: 'Roofing Nails (1-1/4")',
    quantity: Math.ceil(squares * 2),
    unit: 'lb',
  });

  return materials;
}

function calculateRoofArea(config: ShedConfig): number {
  const { width, length, roofPitch, style } = config;
  const run = width / 2;
  const rise = (roofPitch / 12) * run;
  const slopeLength = Math.sqrt(run * run + rise * rise);
  
  switch (style) {
    case 'barn':
      // Gambrel has more complex calculation
      return slopeLength * length * 2.4; // Approximation with waste
    case 'lean-to':
      return slopeLength * length * 1.1;
    case 'saltbox':
      const shortSlope = slopeLength * 0.6;
      const longSlope = slopeLength * 1.4;
      return (shortSlope + longSlope) * length * 1.1;
    default: // gable, quaker
      return slopeLength * 2 * length * 1.1;
  }
}

function calculateSiding(config: ShedConfig): MaterialItem[] {
  const { width, length, wallHeight, sidingType } = config;
  const perimeterFeet = (width + length) * 2;
  const wallArea = perimeterFeet * wallHeight;
  
  // Subtract door and window areas (approximate)
  let openingArea = config.doorWidth * config.doorHeight;
  config.windows.forEach(window => {
    openingArea += window.width * window.height;
  });
  
  const netWallArea = wallArea - openingArea;
  const materials: MaterialItem[] = [];

  // House wrap
  materials.push({
    category: 'Siding',
    description: 'House Wrap',
    quantity: Math.ceil(wallArea / 200),
    unit: 'roll',
    notes: '200 sq ft per roll',
  });

  // Siding
  switch (sidingType) {
    case 'vinyl':
      materials.push({
        category: 'Siding',
        description: 'Vinyl Siding',
        quantity: Math.ceil(netWallArea / 100),
        unit: 'square',
      });
      break;
    case 'wood':
      materials.push({
        category: 'Siding',
        description: 'Wood Lap Siding',
        quantity: Math.ceil(netWallArea / 100),
        unit: 'square',
      });
      break;
    case 'metal':
      materials.push({
        category: 'Siding',
        description: 'Metal Siding Panels',
        quantity: Math.ceil(netWallArea / 25),
        unit: 'panel',
        notes: '3 ft wide panels',
      });
      break;
    case 't1-11':
      materials.push({
        category: 'Siding',
        description: 'T1-11 Siding Panels',
        quantity: Math.ceil(netWallArea / 32),
        unit: 'sheet',
        notes: '4x8 sheets',
      });
      break;
  }

  return materials;
}

function calculateDoors(config: ShedConfig): MaterialItem[] {
  const materials: MaterialItem[] = [];

  switch (config.doorType) {
    case 'single':
      materials.push({
        category: 'Doors',
        description: `${config.doorWidth}' x ${config.doorHeight}' Single Door`,
        quantity: 1,
        unit: 'each',
        notes: 'Pre-hung or custom built',
      });
      break;
    case 'double':
      materials.push({
        category: 'Doors',
        description: `${config.doorWidth}' x ${config.doorHeight}' Double Doors`,
        quantity: 1,
        unit: 'set',
        notes: 'Two doors, hinged on sides',
      });
      break;
    case 'sliding-barn':
      materials.push({
        category: 'Doors',
        description: `${config.doorWidth}' x ${config.doorHeight}' Sliding Barn Door`,
        quantity: 1,
        unit: 'each',
      });
      materials.push({
        category: 'Doors',
        description: 'Barn Door Hardware Kit',
        quantity: 1,
        unit: 'kit',
        notes: 'Track and rollers',
      });
      break;
  }

  // Door hardware
  materials.push(
    {
      category: 'Doors',
      description: 'Door Hinges (Heavy Duty)',
      quantity: config.doorType === 'double' ? 6 : 3,
      unit: 'piece',
    },
    {
      category: 'Doors',
      description: 'Door Handle/Latch',
      quantity: 1,
      unit: 'set',
    }
  );

  return materials;
}

function calculateWindows(config: ShedConfig): MaterialItem[] {
  const materials: MaterialItem[] = [];

  config.windows.forEach((window, index) => {
    materials.push({
      category: 'Windows',
      description: `${window.width}'x${window.height}' Shed Window`,
      quantity: 1,
      unit: 'each',
      notes: `Window #${index + 1} - ${window.position} wall`,
    });
  });

  if (config.hasShutters && config.windows.length > 0) {
    materials.push({
      category: 'Windows',
      description: 'Decorative Shutters',
      quantity: config.windows.length * 2,
      unit: 'piece',
      notes: 'One pair per window',
    });
  }

  return materials;
}

function calculateTrim(config: ShedConfig): MaterialItem[] {
  const { width, length, wallHeight } = config;
  const perimeterFeet = (width + length) * 2;

  const materials: MaterialItem[] = [
    {
      category: 'Trim',
      description: '1x4 Corner Trim',
      quantity: 4,
      unit: 'piece',
      notes: `${wallHeight + 1}' lengths`,
    },
    {
      category: 'Trim',
      description: '1x6 Fascia Boards',
      quantity: Math.ceil(perimeterFeet / 12),
      unit: 'piece',
      notes: '12 ft lengths',
    },
    {
      category: 'Trim',
      description: '1x4 Door/Window Trim',
      quantity: Math.ceil((config.windows.length + 1) * 4),
      unit: 'piece',
      notes: '8 ft lengths',
    },
  ];

  if (config.hasFlowerBox) {
    materials.push({
      category: 'Trim',
      description: 'Window Flower Box Kit',
      quantity: 1,
      unit: 'each',
      notes: 'Decorative accent',
    });
  }

  return materials;
}

function calculateHardware(config: ShedConfig): MaterialItem[] {
  return [
    {
      category: 'Hardware',
      description: '16d Common Nails',
      quantity: 5,
      unit: 'lb',
      notes: 'Framing',
    },
    {
      category: 'Hardware',
      description: '8d Box Nails',
      quantity: 3,
      unit: 'lb',
      notes: 'Sheathing and siding',
    },
    {
      category: 'Hardware',
      description: '3" Deck Screws',
      quantity: 1,
      unit: 'box',
      notes: '1 lb box',
    },
    {
      category: 'Hardware',
      description: 'Hurricane Ties',
      quantity: Math.ceil(config.length / 2),
      unit: 'piece',
      notes: 'Rafter connections',
    },
    {
      category: 'Hardware',
      description: 'Construction Adhesive',
      quantity: 3,
      unit: 'tube',
    },
  ];
}

function calculateElectrical(config: ShedConfig): MaterialItem[] {
  return [
    {
      category: 'Electrical',
      description: 'Exterior-Rated Wire (12/2)',
      quantity: 1,
      unit: 'roll',
      notes: '50 ft roll from main panel',
    },
    {
      category: 'Electrical',
      description: 'LED Ceiling Light Fixture',
      quantity: 1,
      unit: 'each',
    },
    {
      category: 'Electrical',
      description: 'Outdoor Outlet (GFCI)',
      quantity: 1,
      unit: 'each',
    },
    {
      category: 'Electrical',
      description: 'Light Switch',
      quantity: 1,
      unit: 'each',
    },
    {
      category: 'Electrical',
      description: 'Junction Box',
      quantity: 2,
      unit: 'each',
    },
  ];
}

function calculateAccessories(config: ShedConfig): MaterialItem[] {
  const materials: MaterialItem[] = [];

  if (config.hasShelvingPackage) {
    materials.push(
      {
        category: 'Accessories',
        description: '2x4 Shelf Supports',
        quantity: 8,
        unit: 'piece',
        notes: '8 ft lengths',
      },
      {
        category: 'Accessories',
        description: '3/4" Plywood Shelving',
        quantity: 2,
        unit: 'sheet',
        notes: '4x8 sheets',
      },
      {
        category: 'Accessories',
        description: 'Shelf Brackets',
        quantity: 16,
        unit: 'piece',
      }
    );
  }

  return materials;
}
