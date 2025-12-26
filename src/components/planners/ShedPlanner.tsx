import React, { useState } from 'react';
import { ShedConfigurator } from '../shed/ShedConfigurator';
import { ShedCanvas } from '../shed/ShedCanvas';
import { ShedMaterialsList } from '../shed/ShedMaterialsList';
import { ShedTemplates } from '../shed/ShedTemplates';
import { SavedShedDesigns } from '../shed/SavedShedDesigns';
import { calculateMaterials } from '../../utils/shedCalculations';
import { ShedConfig } from '../../types/shed';
import { Ruler, Package, Printer, FileText } from 'lucide-react';

export function ShedPlanner() {
  const [config, setConfig] = useState<ShedConfig>({
    width: 10,
    length: 12,
    wallHeight: 7,
    style: 'barn',
    roofPitch: 8,
    foundationType: 'concrete-blocks',
    doorType: 'double',
    doorWidth: 5,
    doorHeight: 6.5,
    doorPosition: 'front',
    windows: [
      {
        id: '1',
        width: 2,
        height: 2,
        position: 'left',
        offsetFromLeft: 5,
        offsetFromFloor: 3,
      },
      {
        id: '2',
        width: 2,
        height: 2,
        position: 'right',
        offsetFromLeft: 5,
        offsetFromFloor: 3,
      },
    ],
    hasLoft: true,
    hasFloor: true,
    hasShutters: true,
    hasFlowerBox: false,
    sidingType: 'vinyl',
    roofingMaterial: 'architectural-shingle',
    hasElectrical: true,
    hasShelvingPackage: true,
    unit: 'feet',
  });

  const [activeTab, setActiveTab] = useState<'design' | 'materials' | 'saved'>('design');

  const materials = calculateMaterials(config);

  const handleLoadTemplate = (templateConfig: ShedConfig) => {
    setConfig(templateConfig);
    setActiveTab('design');
  };

  const handleLoadDesign = (loadedConfig: ShedConfig) => {
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
                  ? 'border-green-600 text-green-600'
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
                  ? 'border-green-600 text-green-600'
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
                  ? 'border-green-600 text-green-600'
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
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
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
              <ShedTemplates onLoadTemplate={handleLoadTemplate} />
              <ShedConfigurator config={config} onChange={setConfig} />
            </div>

            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 print:shadow-none print:border-2 print:border-black">
                <h2 className="text-slate-900 mb-4">Shed Plan & Elevation</h2>
                <ShedCanvas config={config} />
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 print:shadow-none print:border-2 print:border-black print:break-before-page">
                <h2 className="text-slate-900 mb-4">Materials Summary</h2>
                <ShedMaterialsList materials={materials} compact />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'materials' && (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <ShedMaterialsList materials={materials} compact={false} />
          </div>
        )}

        {activeTab === 'saved' && (
          <SavedShedDesigns currentConfig={config} onLoadDesign={handleLoadDesign} />
        )}
      </div>
    </div>
  );
}
