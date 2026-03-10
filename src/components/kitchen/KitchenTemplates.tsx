import React from 'react';
import { KitchenConfig, CABINET_CATALOG, PlacedCabinet, Appliance } from '../../types/kitchen';
import { LayoutTemplate } from 'lucide-react';

interface KitchenTemplatesProps {
  onLoadTemplate: (config: KitchenConfig) => void;
  currentConfig?: KitchenConfig;
}

// Helper to reliably create a PlacedCabinet from the catalog
function createCab(
  catalogId: string, 
  x: number, 
  y: number, 
  rotation: number
): PlacedCabinet {
  const catItem = CABINET_CATALOG.find(c => c.id === catalogId);
  if (!catItem) throw new Error(`Cabinet not found: ${catalogId}`);
  
  return {
    ...catItem,
    id: `template-cab-${Math.random().toString(36).substr(2, 9)}`,
    catalogId,
    x,
    y,
    rotation,
    wall: 'north' as any, // Add the required wall property with a cast
  } as PlacedCabinet;
}

// Helper to create an Appliance
function createApp(
  type: any,
  name: string,
  width: number,
  height: number,
  depth: number,
  x: number,
  y: number,
  rotation: number,
  price: number
): Appliance {
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
        // Top Wall (rot=0, Y=0)
        createCab('corner-base-36', 0, 0, 0),
        createCab('base-18', 36, 0, 0),
        createCab('base-18', 84, 0, 0),
        createCab('base-36', 102, 0, 0),
        createCab('base-filler-6', 138, 0, 0),
        
        // Top Wall Wall Cabinets (Y=0, rot=0)
        createCab('corner-wall-24', 0, 0, 0),
        createCab('wall-12', 24, 0, 0),
        createCab('wall-18', 36, 0, 0),
        createCab('wall-18', 84, 0, 0),
        createCab('wall-36', 102, 0, 0),
        createCab('wall-filler-6', 138, 0, 0),

        // Left Wall (rot=-90)
        createCab('base-36', -6, 66, -90),
        createCab('base-18', 3, 93, -90),
        
        // Left Wall Wall Cabinets (rot=-90)
        createCab('wall-12', 0, 24, -90),
        createCab('wall-24', -6, 42, -90),
        createCab('wall-18', -3, 99, -90),
        createCab('wall-36', -12, 126, -90),
      ],
      appliances: [
        createApp('stove', 'Gas Range 30"', 30, 36, 28, 54, 0, 0, 800),
        createApp('microwave', 'Over-Range Microwave 30"', 30, 17, 16, 54, 0, 0, 300),
        createApp('dishwasher', 'Dishwasher 24"', 24, 34, 24, 0, 36, -90, 600),
        createApp('sink', 'Undermount Sink 33"', 33, 9, 22, -4.5, 67, -90, 250),
        createApp('refrigerator', 'Refrigerator 36"', 36, 70, 30, -3, 117, -90, 1200),
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
        // Left Wall (rot=-90)
        createCab('base-24', 0, 48, -90),
        createCab('base-24', 0, 102, -90),
        createCab('wall-36', -12, 24, -90),
        createCab('wall-24', -6, 54, -90),
        createCab('wall-24', -6, 108, -90),
        
        // Right Wall (rot=90)
        createCab('tall-18', 75, 9, 90),
        createCab('base-24', 72, 30, 90),
        createCab('base-36', 66, 84, 90),
        createCab('base-18', 75, 111, 90),
        createCab('wall-24', 78, 36, 90),
        createCab('wall-24', 78, 60, 90),
        createCab('wall-18', 81, 117, 90),
      ],
      appliances: [
        // Left Wall
        createApp('refrigerator', 'Refrigerator 36"', 36, 70, 30, -3, 15, -90, 1200),
        createApp('stove', 'Gas Range 30"', 30, 36, 28, -1, 73, -90, 800),
        createApp('microwave', 'Over-Range Microwave 30"', 30, 17, 16, -7, 79, -90, 300),
        // Right Wall
        createApp('dishwasher', 'Dishwasher 24"', 24, 34, 24, 72, 54, 90, 600),
        createApp('sink', 'Undermount Sink 33"', 33, 9, 22, 68.5, 85, 90, 250),
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
        // Top Wall (rot=0)
        createCab('tall-24', 21, 0, 0),
        createCab('base-18', 81, 0, 0),
        createCab('base-18', 129, 0, 0),
        createCab('tall-24', 147, 0, 0),
        createCab('wall-36', 45, 0, 0),
        createCab('wall-18', 81, 0, 0),
        createCab('wall-18', 129, 0, 0),
        
        // Island Working Side (rot=180, Y=72)
        createCab('base-36', 78, 72, 180),
        createCab('base-24', 114, 72, 180),
        
        // Island Seating Side (rot=0, Y=96)
        createCab('base-36', 54, 96, 0),
        createCab('base-12', 90, 96, 0),
        createCab('base-36', 102, 96, 0),
      ],
      appliances: [
        // Top Wall
        createApp('refrigerator', 'Refrigerator 36"', 36, 70, 30, 45, 0, 0, 1200),
        createApp('stove', 'Gas Range 30"', 30, 36, 28, 99, 0, 0, 800),
        createApp('microwave', 'Over-Range Microwave 30"', 30, 17, 16, 99, 0, 0, 300),
        
        // Island (rot=180)
        createApp('dishwasher', 'Dishwasher 24"', 24, 34, 24, 54, 72, 180, 600),
        createApp('sink', 'Undermount Sink 33"', 33, 9, 22, 79.5, 73, 180, 250),
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