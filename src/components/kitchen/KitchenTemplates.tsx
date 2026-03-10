import React from 'react';
import { KitchenConfig } from '../../types/kitchen';
import { LayoutTemplate } from 'lucide-react';

interface KitchenTemplatesProps {
  onLoadTemplate: (config: KitchenConfig) => void;
  currentConfig?: KitchenConfig;
}

const templates: Array<{ name: string; description: string; config: Partial<KitchenConfig> }> = [
  {
    name: 'Standard L-Shape',
    description: '10\' × 12\' with corner prep area',
    config: {
      roomWidth: 10,
      roomLength: 12,
      cabinets: [
        { id: '1', name: 'Corner Base', type: 'corner-base', x: 0, y: 0, width: 36, height: 34.5, depth: 36, rotation: 0 },
        { id: '2', name: 'Base 30"', type: 'base', x: 36, y: 0, width: 30, height: 34.5, depth: 24, rotation: 0 },
        { id: '3', name: 'Base 24"', type: 'base', x: 0, y: 36, width: 24, height: 34.5, depth: 24, rotation: -90 },
      ],
      appliances: [
        { id: 'app1', name: 'Refrigerator 36"', type: 'refrigerator', x: 66, y: 0, width: 36, height: 70, depth: 30, rotation: 0, price: 1200 },
        { id: 'app2', name: 'Stove 30"', type: 'stove', x: 0, y: 60, width: 30, height: 36, depth: 28, rotation: -90, price: 800 },
      ],
    },
  },
  {
    name: 'Galley Kitchen',
    description: '8\' × 10\' compact layout',
    config: {
      roomWidth: 8,
      roomLength: 10,
      cabinets: [
        { id: '1', name: 'Base 24"', type: 'base', x: 0, y: 0, width: 24, height: 34.5, depth: 24, rotation: 0 },
        { id: '2', name: 'Base 36"', type: 'base', x: 24, y: 0, width: 36, height: 34.5, depth: 24, rotation: 0 },
        { id: '3', name: 'Base 24"', type: 'base', x: 60, y: 0, width: 24, height: 34.5, depth: 24, rotation: 0 },
      ],
      appliances: [
        { id: 'app1', name: 'Refrigerator 33"', type: 'refrigerator', x: 84, y: 0, width: 33, height: 70, depth: 30, rotation: 0, price: 1000 },
      ],
    },
  },
  {
    name: 'Island Layout',
    description: '14\' × 16\' spacious with center island',
    config: {
      roomWidth: 14,
      roomLength: 16,
      cabinets: [
        { id: '1', name: 'Base 36"', type: 'base', x: 0, y: 0, width: 36, height: 34.5, depth: 24, rotation: 0 },
        { id: '2', name: 'Base 36"', type: 'base', x: 36, y: 0, width: 36, height: 34.5, depth: 24, rotation: 0 },
        { id: '3', name: 'Island 48"', type: 'island', x: 48, y: 60, width: 48, height: 34.5, depth: 36, rotation: 0 },
      ],
      appliances: [
        { id: 'app1', name: 'Refrigerator 36"', type: 'refrigerator', x: 72, y: 0, width: 36, height: 70, depth: 30, rotation: 0, price: 1200 },
        { id: 'app2', name: 'Stove 30"', type: 'stove', x: 0, y: 60, width: 30, height: 36, depth: 28, rotation: -90, price: 800 },
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
    
    // Merge the current config with the template config
    const mergedConfig: KitchenConfig = {
      ...currentConfig,
      roomWidth: template.config.roomWidth || currentConfig.roomWidth,
      roomLength: template.config.roomLength || currentConfig.roomLength,
      cabinets: template.config.cabinets as any || [],
      appliances: template.config.appliances as any || [],
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