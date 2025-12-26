import React, { useState, useEffect } from 'react';
import { GarageConfigurator } from '../garage/GarageConfigurator';
import { GarageCanvas } from '../garage/GarageCanvas';
import { GarageMaterialsList } from '../garage/GarageMaterialsList';
import { GarageTemplates } from '../garage/GarageTemplates';
import { SavedGarageDesigns } from '../garage/SavedGarageDesigns';
import { ProjectQuoteGenerator } from '../ProjectQuoteGenerator';
import { calculateMaterials } from '../../utils/garageCalculations';
import { enrichMaterialsWithT1Pricing } from '../../utils/enrichMaterialsWithPricing';
import { GarageConfig } from '../../types/garage';
import { Ruler, Package, Printer, FileText } from 'lucide-react';
import type { User } from '../../App';

interface GaragePlannerProps {
  user: User;
}

export function GaragePlanner({ user }: GaragePlannerProps) {
  const [config, setConfig] = useState<GarageConfig>({
    width: 20,
    length: 20,
    height: 9,
    bays: 2,
    roofStyle: 'gable',
    roofPitch: 6,
    wallFraming: '2x4',
    doors: [
      {
        id: '1',
        type: 'overhead',
        width: 9,
        height: 7,
        position: 'front',
        offsetFromLeft: 1,
      },
      {
        id: '2',
        type: 'overhead',
        width: 9,
        height: 7,
        position: 'front',
        offsetFromLeft: 10,
      },
    ],
    windows: [
      {
        id: '1',
        width: 3,
        height: 2,
        position: 'left',
        offsetFromLeft: 8,
        offsetFromFloor: 5,
      },
      {
        id: '2',
        width: 3,
        height: 2,
        position: 'right',
        offsetFromLeft: 8,
        offsetFromFloor: 5,
      },
    ],
    hasWalkDoor: true,
    walkDoorPosition: 'side',
    sidingType: 'vinyl',
    roofingMaterial: 'asphalt-shingle',
    hasAtticTrusses: false,
    isInsulated: true,
    hasElectrical: true,
    unit: 'feet',
  });

  const [activeTab, setActiveTab] = useState<'design' | 'materials' | 'saved'>('design');
  const [enrichedMaterials, setEnrichedMaterials] = useState<any[]>([]);
  const [totalT1Price, setTotalT1Price] = useState<number>(0);

  const materials = calculateMaterials(config);

  // Flatten materials for quote generator
  const flatMaterials = [
    ...materials.framing,
    ...materials.roofing,
    ...materials.siding,
    ...materials.doors,
    ...materials.windows,
    ...materials.insulation,
    ...materials.electrical,
  ];

  // Enrich materials with T1 pricing whenever config changes
  useEffect(() => {
    const enrichMaterials = async () => {
      if (user.organizationId && flatMaterials.length > 0) {
        const { materials: enriched, totalT1Price: total } = await enrichMaterialsWithT1Pricing(
          flatMaterials,
          user.organizationId,
          'garage'
        );
        setEnrichedMaterials(enriched);
        setTotalT1Price(total);
      }
    };
    enrichMaterials();
  }, [config, user.organizationId]);

  const handleLoadTemplate = (templateConfig: GarageConfig) => {
    setConfig(templateConfig);
    setActiveTab('design');
  };

  const handleLoadDesign = (loadedConfig: GarageConfig) => {
    setConfig(loadedConfig);
    setActiveTab('design');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div>
      {/* Sub-navigation */}
      <div className="bg-slate-50 border-b border-slate-200 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex gap-8">
            <button
              onClick={() => setActiveTab('design')}
              className={`flex items-center gap-2 py-4 border-b-2 transition-colors ${
                activeTab === 'design'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <Ruler className="w-4 h-4" />
              Design
            </button>
            <button
              onClick={() => setActiveTab('materials')}
              className={`flex items-center gap-2 py-4 border-b-2 transition-colors ${
                activeTab === 'materials'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <Package className="w-4 h-4" />
              Materials
            </button>
            <button
              onClick={() => setActiveTab('saved')}
              className={`flex items-center gap-2 py-4 border-b-2 transition-colors ${
                activeTab === 'saved'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-4 h-4" />
              Saved Designs
            </button>
          </nav>
        </div>
      </div>

      {/* Action Bar */}
      <div className="bg-white border-b border-slate-200 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex justify-end">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Printer className="w-4 h-4" />
              Print Plan
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'design' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-6 print:hidden">
              <GarageTemplates onLoadTemplate={handleLoadTemplate} currentConfig={config} />
              <GarageConfigurator config={config} onChange={setConfig} />
              
              {/* Quote Generator */}
              <ProjectQuoteGenerator
                user={user}
                projectType="garage"
                materials={enrichedMaterials.length > 0 ? enrichedMaterials : flatMaterials}
                totalCost={totalT1Price > 0 ? totalT1Price : 0}
                projectData={config}
              />
            </div>

            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 print:shadow-none print:border-2 print:border-black">
                <h2 className="text-slate-900 mb-4">Garage Plan & Elevation</h2>
                <GarageCanvas config={config} />
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 print:shadow-none print:border-2 print:border-black print:break-before-page">
                <h2 className="text-slate-900 mb-4">Materials Summary</h2>
                <GarageMaterialsList materials={materials} compact />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'materials' && (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <GarageMaterialsList materials={materials} compact={false} />
          </div>
        )}

        {activeTab === 'saved' && (
          <SavedGarageDesigns currentConfig={config} onLoadDesign={handleLoadDesign} />
        )}
      </div>
    </div>
  );
}