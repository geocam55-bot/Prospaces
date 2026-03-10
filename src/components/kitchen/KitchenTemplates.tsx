import React from 'react';
import { KitchenConfig, CABINET_CATALOG, PlacedCabinet, Appliance } from '../../types/kitchen';
import { LayoutTemplate } from 'lucide-react';

interface KitchenTemplatesProps {
  onLoadTemplate: (config: KitchenConfig) => void;
  currentConfig?: KitchenConfig;
}

// Helper to calculate X and Y such that the visually rendered cabinet
// perfectly aligns its bounding box to (visX, visY) given its rotation.
function placeCab(
  catalogId: string, 
  visX: number, 
  visY: number, 
  rotation: number
): PlacedCabinet {
  const catItem = CABINET_CATALOG.find(c => c.id === catalogId);
  if (!catItem) throw new Error(`Cabinet not found: ${catalogId}`);
  
  const w = catItem.width;
  const d = catItem.depth;
  
  let x = visX;
  let y = visY;
  
  // The canvas and 3D renderer rotate the cabinet around its top-left corner (x,y).
  // We want to calculate the correct (x,y) pivot so that the resulting rotated 
  // bounding box has its visual top-left at exactly (visX, visY).
  if (rotation === 90) {
    x = visX + d;
    y = visY;
  } else if (rotation === -90 || rotation === 270) {
    x = visX;
    y = visY + w;
  } else if (rotation === 180 || rotation === -180) {
    x = visX + w;
    y = visY + d;
  }
  
  let wall: 'north'|'south'|'east'|'west'|'island' = 'north';
  if (rotation === 180 || rotation === -180) wall = 'south';
  else if (rotation === 90) wall = 'east';
  else if (rotation === -90 || rotation === 270) wall = 'west';
  
  return {
    ...catItem,
    id: `template-cab-${Math.random().toString(36).substr(2, 9)}`,
    catalogId,
    x,
    y,
    rotation,
    wall,
  } as PlacedCabinet;
}

// Helper to calculate X and Y for appliances using the exact same logic
function placeApp(
  type: any,
  name: string,
  width: number,
  height: number,
  depth: number,
  visX: number,
  visY: number,
  rotation: number,
  price: number
): Appliance {
  let x = visX;
  let y = visY;
  
  if (rotation === 90) {
    x = visX + depth;
    y = visY;
  } else if (rotation === -90 || rotation === 270) {
    x = visX;
    y = visY + width;
  } else if (rotation === 180 || rotation === -180) {
    x = visX + width;
    y = visY + depth;
  }
  
  return {
    id: `template-app-${Math.random().toString(36).substr(2, 9)}`,
    type,
    name,
    width,
    height,
    depth,
    x,
    y,
    rotation,
    price
  };
}

const templates: Array<{ name: string; description: string; config: Partial<KitchenConfig> }> = [
  {
    name: 'Classic L-Shape',
    description: '12\' × 13\' with optimal work triangle',
    config: {
      roomWidth: 12,
      roomLength: 13,
      cabinets: [
        // --- Top Wall (North, Y=0, Rot=0) ---
        placeCab('corner-base-36', 0, 0, 0),
        placeCab('base-18', 36, 0, 0),
        // Stove at 54 (30" wide)
        placeCab('base-18', 84, 0, 0),
        placeCab('base-36', 102, 0, 0),
        placeCab('base-filler-6', 138, 0, 0),
        
        // --- Top Wall Wall Cabinets (Y=0, Rot=0) ---
        placeCab('corner-wall-24', 0, 0, 0),
        placeCab('wall-12', 24, 0, 0),
        placeCab('wall-18', 36, 0, 0),
        // Microwave at 54 (30" wide)
        placeCab('wall-18', 84, 0, 0),
        placeCab('wall-36', 102, 0, 0),
        placeCab('wall-filler-6', 138, 0, 0),

        // --- Left Wall (West, X=0, Rot=-90) ---
        // Dishwasher at Y=36 (24" wide)
        placeCab('base-36', 0, 60, -90), // Sink base
        placeCab('base-24', 0, 96, -90),
        // Refrigerator at Y=120 (36" wide)

        // --- Left Wall Wall Cabinets (X=0, Rot=-90) ---
        placeCab('wall-12', 0, 24, -90),
        placeCab('wall-24', 0, 36, -90),
        // Sink void at 60-96
        placeCab('wall-24', 0, 96, -90),
        placeCab('wall-36', 0, 120, -90),
      ],
      appliances: [
        placeApp('stove', 'Gas Range 30"', 30, 36, 28, 54, 0, 0, 800),
        placeApp('microwave', 'Over-Range Microwave 30"', 30, 17, 16, 54, 0, 0, 300),
        placeApp('dishwasher', 'Dishwasher 24"', 24, 34, 24, 0, 36, -90, 600),
        placeApp('sink', 'Undermount Sink 33"', 33, 9, 22, 0, 61.5, -90, 250),
        placeApp('refrigerator', 'Refrigerator 36"', 36, 70, 30, 0, 120, -90, 1200),
      ],
    },
  },
  {
    name: 'Efficient Galley',
    description: '8\' × 12\' dual-wall layout',
    config: {
      roomWidth: 8,
      roomLength: 12,
      cabinets: [
        // --- Left Wall (West, X=0, Rot=-90) ---
        placeCab('base-24', 0, 18, -90),
        // Stove at Y=42 (30" wide)
        placeCab('base-24', 0, 72, -90),
        // Refrigerator at Y=96 (36" wide)

        // Left Wall Cabinets
        placeCab('wall-24', 0, 18, -90),
        // Microwave at Y=42 (30" wide)
        placeCab('wall-24', 0, 72, -90),
        placeCab('wall-36', 0, 96, -90),
        
        // --- Right Wall (East, Rot=90) ---
        // Room width is 96. Depth 24 -> visX = 72
        placeCab('tall-18', 72, 18, 90),
        placeCab('base-24', 72, 36, 90),
        placeCab('base-36', 72, 60, 90), // Sink base
        // Dishwasher at Y=96 (24" wide)
        placeCab('base-12', 72, 120, 90),

        // Right Wall Cabinets (Depth 12 -> visX = 84)
        placeCab('wall-24', 84, 36, 90),
        // Sink void at 60-96
        placeCab('wall-24', 84, 96, 90),
        placeCab('wall-12', 84, 120, 90),
      ],
      appliances: [
        placeApp('stove', 'Gas Range 30"', 30, 36, 28, 0, 42, -90, 800),
        placeApp('microwave', 'Over-Range Microwave 30"', 30, 17, 16, 0, 42, -90, 300),
        placeApp('refrigerator', 'Refrigerator 36"', 36, 70, 30, 0, 96, -90, 1200),
        placeApp('sink', 'Undermount Sink 33"', 33, 9, 22, 72, 61.5, 90, 250),
        placeApp('dishwasher', 'Dishwasher 24"', 24, 34, 24, 72, 96, 90, 600),
      ],
    },
  },
  {
    name: 'Spacious Island',
    description: '16\' × 16\' entertainer\'s kitchen',
    config: {
      roomWidth: 16,
      roomLength: 16,
      cabinets: [
        // --- Top Wall (North, Y=0, Rot=0) ---
        placeCab('tall-24', 15, 0, 0),
        // Refrigerator at X=39 (36" wide)
        placeCab('base-24', 75, 0, 0),
        // Stove at X=99 (30" wide)
        placeCab('base-24', 129, 0, 0),
        placeCab('base-24', 153, 0, 0),
        
        // Top Wall Cabinets
        placeCab('wall-36', 39, 0, 0),
        placeCab('wall-24', 75, 0, 0),
        // Microwave at X=99 (30" wide)
        placeCab('wall-24', 129, 0, 0),
        placeCab('wall-24', 153, 0, 0),
        
        // --- Island Working Side (Rot=180, Y=72, Depth=24) ---
        // Facing south, so we align bounds to Y=72
        placeCab('base-24', 48, 72, 180),
        // Dishwasher at X=72 (24" wide)
        placeCab('base-36', 96, 72, 180), // Sink base
        placeCab('base-12', 132, 72, 180),
        
        // --- Island Seating Side (Rot=0, Y=96, Depth=24) ---
        placeCab('base-24', 48, 96, 0),
        placeCab('base-24', 72, 96, 0),
        placeCab('base-24', 96, 96, 0),
        placeCab('base-24', 120, 96, 0),
      ],
      appliances: [
        placeApp('refrigerator', 'Refrigerator 36"', 36, 70, 30, 39, 0, 0, 1200),
        placeApp('stove', 'Gas Range 30"', 30, 36, 28, 99, 0, 0, 800),
        placeApp('microwave', 'Over-Range Microwave 30"', 30, 17, 16, 99, 0, 0, 300),
        placeApp('dishwasher', 'Dishwasher 24"', 24, 34, 24, 72, 72, 180, 600),
        placeApp('sink', 'Undermount Sink 33"', 33, 9, 22, 97.5, 72, 180, 250),
      ],
    },
  },
];

export function KitchenTemplates({ onLoadTemplate, currentConfig }: KitchenTemplatesProps) {
  // A simplistic check to see if a template matches the current config
  const isTemplateSelected = (template: typeof templates[0]) => {
    if (!currentConfig) return false;
    const t = template.config;
    const c = currentConfig;
    return (
      t.roomWidth === c.roomWidth &&
      t.roomLength === c.roomLength
    );
  };

  const handleApplyTemplate = (template: typeof templates[0]) => {
    if (!currentConfig) return;
    
    // Create deep copies with fresh IDs so the original templates remain pristine
    // and subsequent applications get fresh instances.
    const newCabinets = (template.config.cabinets || []).map(cab => ({
      ...cab,
      id: `template-cab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    }));
    
    const newAppliances = (template.config.appliances || []).map(app => ({
      ...app,
      id: `template-app-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    }));

    // Merge the current config with the template config
    const mergedConfig: KitchenConfig = {
      ...currentConfig,
      roomWidth: template.config.roomWidth || currentConfig.roomWidth,
      roomLength: template.config.roomLength || currentConfig.roomLength,
      cabinets: newCabinets as any,
      appliances: newAppliances as any,
    };
    
    onLoadTemplate(mergedConfig);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
          <LayoutTemplate className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Sample Designs</h2>
          <p className="text-sm text-slate-500">Start with a pre-configured layout</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((template) => {
          const selected = isTemplateSelected(template);
          
          return (
            <div 
              key={template.name}
              className={`
                relative group rounded-xl border-2 transition-all duration-200 overflow-hidden cursor-pointer
                ${selected 
                  ? 'border-purple-600 bg-purple-50 shadow-md' 
                  : 'border-slate-200 bg-white hover:border-purple-300 hover:bg-slate-50'
                }
              `}
              onClick={() => handleApplyTemplate(template)}
            >
              <div className="p-4 h-full flex flex-col">
                <h3 className={`font-medium mb-1 ${selected ? 'text-purple-900' : 'text-slate-900'}`}>
                  {template.name}
                </h3>
                <p className={`text-sm flex-1 ${selected ? 'text-purple-700' : 'text-slate-500'}`}>
                  {template.description}
                </p>
                
                {selected && (
                  <div className="absolute top-3 right-3">
                    <span className="flex h-3 w-3 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-purple-600"></span>
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}