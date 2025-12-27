import React, { useState, useEffect } from 'react';
import { DeckConfigurator } from '../deck/DeckConfigurator';
import { DeckCanvas } from '../deck/DeckCanvas';
import { MaterialsList } from '../deck/MaterialsList';
import { DeckTemplates } from '../deck/DeckTemplates';
import { SavedDeckDesigns } from '../deck/SavedDeckDesigns';
import { ProjectQuoteGenerator } from '../ProjectQuoteGenerator';
import { DiagnosticPanel } from '../DiagnosticPanel';
import { calculateMaterials } from '../../utils/deckCalculations';
import { enrichMaterialsWithT1Pricing } from '../../utils/enrichMaterialsWithPricing';
import { DeckConfig } from '../../types/deck';
import { Ruler, Package, Printer, FileText } from 'lucide-react';
import type { User } from '../../App';

interface DeckPlannerProps {
  user: User;
}

export function DeckPlanner({ user }: DeckPlannerProps) {
  const [config, setConfig] = useState<DeckConfig>({
    width: 12,
    length: 16,
    shape: 'rectangle',
    height: 2,
    hasStairs: true,
    stairSide: 'front',
    railingSides: ['front', 'left', 'right'],
    deckingPattern: 'perpendicular',
    joistSpacing: 16,
    deckingType: 'Treated',
    unit: 'feet',
  });

  const [activeTab, setActiveTab] = useState<'design' | 'materials' | 'saved'>('design');
  const [enrichedMaterials, setEnrichedMaterials] = useState<any[]>([]);
  const [totalT1Price, setTotalT1Price] = useState<number>(0);

  const materials = calculateMaterials(config);

  // Flatten materials for quote generator
  const flatMaterials = [
    ...materials.framing,
    ...materials.decking,
    ...materials.railing,
    ...materials.hardware,
  ];

  // Enrich materials with T1 pricing whenever config changes
  useEffect(() => {
    const enrichMaterials = async () => {
      if (user.organizationId && flatMaterials.length > 0) {
        const { materials: enriched, totalT1Price: total } = await enrichMaterialsWithT1Pricing(
          flatMaterials,
          user.organizationId,
          'deck',
          config.deckingType
        );
        setEnrichedMaterials(enriched);
        setTotalT1Price(total);
      }
    };
    enrichMaterials();
  }, [config, user.organizationId]);

  const handleLoadTemplate = (templateConfig: DeckConfig) => {
    setConfig(templateConfig);
    setActiveTab('design');
  };

  const handleLoadDesign = (loadedConfig: DeckConfig) => {
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
                  ? 'border-purple-600 text-purple-600'
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
                  ? 'border-purple-600 text-purple-600'
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
                  ? 'border-purple-600 text-purple-600'
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
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
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
              <DeckTemplates onLoadTemplate={handleLoadTemplate} currentConfig={config} />
              <DeckConfigurator config={config} onChange={setConfig} />
              
              {/* Quote Generator */}
              <ProjectQuoteGenerator
                user={user}
                projectType="deck"
                materials={enrichedMaterials.length > 0 ? enrichedMaterials : flatMaterials}
                totalCost={totalT1Price > 0 ? totalT1Price : 0}
                projectData={config}
              />
            </div>

            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 print:shadow-none print:border-2 print:border-black">
                <h2 className="text-slate-900 mb-4">Deck Plan & Elevation</h2>
                <DeckCanvas config={config} />
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 print:shadow-none print:border-2 print:border-black print:break-before-page">
                <h2 className="text-slate-900 mb-4">Materials Summary</h2>
                <MaterialsList materials={materials} compact />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'materials' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
              <MaterialsList materials={materials} compact={false} />
            </div>
            
            <DiagnosticPanel 
              organizationId={user.organizationId}
              plannerType="deck"
              materialType={config.deckingType}
            />
          </div>
        )}

        {activeTab === 'saved' && (
          <SavedDeckDesigns 
            user={user}
            currentConfig={config}
            materials={enrichedMaterials.length > 0 ? enrichedMaterials : flatMaterials}
            totalCost={totalT1Price > 0 ? totalT1Price : 0}
            onLoadDesign={handleLoadDesign} 
          />
        )}
      </div>
    </div>
  );
}