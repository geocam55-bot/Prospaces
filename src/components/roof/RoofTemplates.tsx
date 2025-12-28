import React, { useState } from 'react';
import { RoofConfig } from '../../types/roof';
import { Home, Warehouse, Building2, Church, Factory } from 'lucide-react';

interface RoofTemplatesProps {
  onLoadTemplate: (config: RoofConfig) => void;
  currentConfig: RoofConfig;
}

export function RoofTemplates({ onLoadTemplate, currentConfig }: RoofTemplatesProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const templates: Array<{
    name: string;
    description: string;
    icon: React.ComponentType<any>;
    config: RoofConfig;
  }> = [
    {
      name: 'Small Residential',
      description: '1,200 sq ft home - Gable roof',
      icon: Home,
      config: {
        length: 40,
        width: 30,
        style: 'gable',
        pitch: '6/12',
        eaveOverhang: 1.5,
        rakeOverhang: 1.5,
        shingleType: 'architectural',
        underlaymentType: 'synthetic',
        hasValleys: false,
        valleyCount: 0,
        hasSkylight: false,
        skylightCount: 0,
        hasChimney: true,
        chimneyCount: 1,
        wasteFactor: 0.10,
        unit: 'feet',
      }
    },
    {
      name: 'Large Residential',
      description: '2,400 sq ft home - Hip roof',
      icon: Home,
      config: {
        length: 60,
        width: 40,
        style: 'hip',
        pitch: '6/12',
        eaveOverhang: 2,
        rakeOverhang: 2,
        shingleType: 'designer',
        underlaymentType: 'synthetic',
        hasValleys: false,
        valleyCount: 0,
        hasSkylight: true,
        skylightCount: 2,
        hasChimney: true,
        chimneyCount: 1,
        wasteFactor: 0.12,
        unit: 'feet',
      }
    },
    {
      name: 'Ranch Style',
      description: '1,800 sq ft ranch - Low pitch gable',
      icon: Home,
      config: {
        length: 50,
        width: 36,
        style: 'gable',
        pitch: '4/12',
        eaveOverhang: 2,
        rakeOverhang: 1,
        shingleType: 'architectural',
        underlaymentType: 'felt-30',
        hasValleys: true,
        valleyCount: 2,
        hasSkylight: false,
        skylightCount: 0,
        hasChimney: true,
        chimneyCount: 1,
        wasteFactor: 0.10,
        unit: 'feet',
      }
    },
    {
      name: 'Barn/Storage',
      description: 'Gambrel barn roof - 40x30',
      icon: Warehouse,
      config: {
        length: 40,
        width: 30,
        style: 'gambrel',
        pitch: '8/12',
        eaveOverhang: 1,
        rakeOverhang: 1,
        shingleType: 'metal',
        underlaymentType: 'synthetic',
        hasValleys: false,
        valleyCount: 0,
        hasSkylight: false,
        skylightCount: 0,
        hasChimney: false,
        chimneyCount: 0,
        wasteFactor: 0.15,
        unit: 'feet',
      }
    },
    {
      name: 'Garage',
      description: 'Detached garage - Gable roof',
      icon: Warehouse,
      config: {
        length: 24,
        width: 24,
        style: 'gable',
        pitch: '5/12',
        eaveOverhang: 1,
        rakeOverhang: 1,
        shingleType: '3-tab',
        underlaymentType: 'felt-15',
        hasValleys: false,
        valleyCount: 0,
        hasSkylight: false,
        skylightCount: 0,
        hasChimney: false,
        chimneyCount: 0,
        wasteFactor: 0.10,
        unit: 'feet',
      }
    },
    {
      name: 'Shed',
      description: 'Storage shed - Simple shed roof',
      icon: Building2,
      config: {
        length: 12,
        width: 10,
        style: 'shed',
        pitch: '3/12',
        eaveOverhang: 0.5,
        rakeOverhang: 0.5,
        shingleType: '3-tab',
        underlaymentType: 'felt-15',
        hasValleys: false,
        valleyCount: 0,
        hasSkylight: false,
        skylightCount: 0,
        hasChimney: false,
        chimneyCount: 0,
        wasteFactor: 0.10,
        unit: 'feet',
      }
    },
    {
      name: 'Cape Cod',
      description: 'Classic Cape Cod - Steep gable',
      icon: Church,
      config: {
        length: 44,
        width: 28,
        style: 'gable',
        pitch: '12/12',
        eaveOverhang: 1,
        rakeOverhang: 1,
        shingleType: 'architectural',
        underlaymentType: 'synthetic',
        hasValleys: true,
        valleyCount: 2,
        hasSkylight: true,
        skylightCount: 3,
        hasChimney: true,
        chimneyCount: 2,
        wasteFactor: 0.15,
        unit: 'feet',
      }
    },
    {
      name: 'Commercial Flat',
      description: 'Commercial building - Flat roof',
      icon: Factory,
      config: {
        length: 80,
        width: 60,
        style: 'flat',
        pitch: '2/12',
        eaveOverhang: 0,
        rakeOverhang: 0,
        shingleType: 'metal',
        underlaymentType: 'synthetic',
        hasValleys: false,
        valleyCount: 0,
        hasSkylight: true,
        skylightCount: 4,
        hasChimney: false,
        chimneyCount: 0,
        wasteFactor: 0.08,
        unit: 'feet',
      }
    }
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-slate-900">Quick Start Templates</h2>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-sm text-orange-600 hover:text-orange-700"
        >
          {isExpanded ? 'Show Less' : 'Show All'}
        </button>
      </div>

      <div className={`grid grid-cols-1 gap-3 ${isExpanded ? '' : 'max-h-96 overflow-y-auto'}`}>
        {templates.map((template, index) => {
          const Icon = template.icon;
          return (
            <button
              key={index}
              onClick={() => onLoadTemplate(template.config)}
              className="flex items-start gap-3 p-3 text-left border-2 border-slate-200 rounded-lg hover:border-orange-400 hover:bg-orange-50 transition-colors group"
            >
              <div className="mt-0.5">
                <Icon className="w-5 h-5 text-orange-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-slate-900 group-hover:text-orange-900">
                  {template.name}
                </div>
                <div className="text-xs text-slate-600 mt-0.5">
                  {template.description}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {template.config.length}' × {template.config.width}' • {template.config.pitch} pitch • {template.config.style}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
        <p className="text-xs text-slate-600">
          💡 <strong>Tip:</strong> Select a template as a starting point, then customize dimensions and materials to match your project.
        </p>
      </div>
    </div>
  );
}
