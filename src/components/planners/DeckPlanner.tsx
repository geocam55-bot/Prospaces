import React, { useState, useEffect, useRef } from 'react';
import { DeckConfigurator } from '../deck/DeckConfigurator';
import { DeckCanvas } from '../deck/DeckCanvas';
import { Deck3DRenderer, Deck3DRendererRef } from '../deck/Deck3DRenderer';
import { MaterialsList } from '../deck/MaterialsList';
import { DeckTemplates } from '../deck/DeckTemplates';
import { SavedDeckDesigns } from '../deck/SavedDeckDesigns';
import { DiagnosticPanel } from '../DiagnosticPanel';
import { PrintableDeckDesign } from '../project-wizard/PrintableDeckDesign';
import { PlannerDefaults } from '../PlannerDefaults';
import { calculateMaterials } from '../../utils/deckCalculations';
import { enrichMaterialsWithT1Pricing } from '../../utils/enrichMaterialsWithPricing';
import { DeckConfig } from '../../types/deck';
import { Ruler, Package, Printer, FileText, Box, Layers, Hammer, Settings } from 'lucide-react';
import { Button } from '../ui/button';
import { toast } from 'sonner';
import type { User } from '../../App';

interface DeckPlannerProps {
  user: User;
}

export function DeckPlanner({ user }: DeckPlannerProps) {
  const deck3DRendererRef = useRef<Deck3DRendererRef>(null);
  const [snapshotUrl, setSnapshotUrl] = useState<string | null>(null);
  
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

  const [activeTab, setActiveTab] = useState<'design' | 'materials' | 'saved' | 'defaults'>('design');
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d');
  const [enrichedMaterials, setEnrichedMaterials] = useState<any[]>([]);
  const [totalT1Price, setTotalT1Price] = useState<number>(0);
  const [loadedDesignInfo, setLoadedDesignInfo] = useState<{
    name?: string;
    description?: string;
    customerName?: string;
    customerCompany?: string;
  }>({});

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
  }, [
    config.width,
    config.length,
    config.height,
    config.shape,
    config.lShapeWidth,
    config.lShapeLength,
    config.lShapePosition,
    config.hasStairs,
    config.stairSide,
    config.stairWidth,
    config.railingSides,
    config.railingHeight,
    config.joistSpacing,
    config.deckingType,
    user.organizationId,
    flatMaterials.length
  ]);

  // Create enriched materials structure for display
  const getEnrichedMaterialsStructure = () => {
    if (enrichedMaterials.length === 0) {
      return materials;
    }

    // Create a map of enriched materials by description for quick lookup
    const enrichedMap = new Map();
    enrichedMaterials.forEach(item => {
      enrichedMap.set(item.description, item);
    });

    // Merge pricing data into original structure
    return {
      framing: materials.framing.map(item => enrichedMap.get(item.description) || item),
      decking: materials.decking.map(item => enrichedMap.get(item.description) || item),
      railing: materials.railing.map(item => enrichedMap.get(item.description) || item),
      hardware: materials.hardware.map(item => enrichedMap.get(item.description) || item),
    };
  };

  const handleLoadTemplate = (templateConfig: DeckConfig) => {
    setConfig(templateConfig);
    setLoadedDesignInfo({}); // Clear loaded design info when loading a template
    setActiveTab('design');
  };

  const handleLoadDesign = (loadedConfig: DeckConfig, designInfo?: {
    name?: string;
    description?: string;
    customerName?: string;
    customerCompany?: string;
  }) => {
    setConfig(loadedConfig);
    setLoadedDesignInfo(designInfo || {});
    setActiveTab('design');
  };

  const handlePrint = () => {
    // Ensure all pending async operations are complete before printing
    // This prevents the "callback is no longer runnable" error
    setTimeout(() => {
      window.print();
    }, 100);
  };

  // Poll for snapshot URL from 3D renderer
  useEffect(() => {
    const intervalId = setInterval(() => {
      if (deck3DRendererRef.current && viewMode === '3d') {
        const url = deck3DRendererRef.current.getSnapshotUrl();
        if (url && url !== snapshotUrl) {
          setSnapshotUrl(url);
        }
      }
    }, 1000);

    return () => clearInterval(intervalId);
  }, [viewMode, snapshotUrl]);

  return (
    <div>
      {/* Now in Development Banner */}
      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-purple-200 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-purple-100 p-2 rounded-lg">
              <Hammer className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold text-purple-900">Deck Planner - Now in Development</h3>
              <p className="text-sm text-purple-700">We're actively building this feature. Try out the preview and share your feedback!</p>
            </div>
          </div>
          <Button 
            variant="outline" 
            className="border-purple-300 text-purple-700 hover:bg-purple-100 hover:border-purple-400"
            onClick={() => {
              toast.info('Deck Planner is under active development. Your feedback helps us build better tools!');
            }}
          >
            Give Feedback
          </Button>
        </div>
      </div>

      {/* Sub-navigation */}
      <div className="bg-slate-50 border-b border-slate-200 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <nav className="flex flex-wrap gap-4 sm:gap-8">
              <button
                onClick={() => setActiveTab('design')}
                className={`flex items-center gap-2 py-3 sm:py-4 border-b-2 transition-colors text-sm sm:text-base ${
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
                className={`flex items-center gap-2 py-3 sm:py-4 border-b-2 transition-colors text-sm sm:text-base ${
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
                className={`flex items-center gap-2 py-3 sm:py-4 border-b-2 transition-colors text-sm sm:text-base ${
                  activeTab === 'saved'
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileText className="w-4 h-4" />
                Saved Designs
              </button>
              <button
                onClick={() => setActiveTab('defaults')}
                className={`flex items-center gap-2 py-3 sm:py-4 border-b-2 transition-colors text-sm sm:text-base ${
                  activeTab === 'defaults'
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <Settings className="w-4 h-4" />
                Defaults
              </button>
            </nav>
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
            </div>

            <div className="lg:col-span-2 space-y-6 print:hidden">
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 print:shadow-none print:border-2 print:border-black">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-slate-900 print:hidden">Deck Plan & Elevation</h2>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setViewMode('2d')}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors text-sm ${
                        viewMode === '2d'
                          ? 'bg-purple-600 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <Layers className="w-4 h-4" />
                      2D
                    </button>
                    <button
                      onClick={() => setViewMode('3d')}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors text-sm ${
                        viewMode === '3d'
                          ? 'bg-purple-600 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <Box className="w-4 h-4" />
                      3D
                    </button>
                  </div>
                </div>
                <div>
                  {viewMode === '2d' ? (
                    <DeckCanvas config={config} />
                  ) : (
                    <div className="h-[500px]">
                      <Deck3DRenderer 
                        key={`3d-${config.width}-${config.length}-${config.shape}-${config.lShapePosition}-${config.lShapeWidth}-${config.lShapeLength}-${config.hasStairs}-${config.stairSide}`} 
                        config={config} 
                        ref={deck3DRendererRef}
                      />
                    </div>
                  )}
                </div>
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
              {enrichedMaterials.length > 0 && totalT1Price > 0 && (
                <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-purple-700">Total Estimated Cost (Tier 1 Pricing)</p>
                      <p className="text-xs text-purple-600 mt-1">Based on your organization's default pricing</p>
                    </div>
                    <p className="text-2xl font-semibold text-purple-900">${totalT1Price.toLocaleString()}</p>
                  </div>
                </div>
              )}
              <MaterialsList 
                materials={getEnrichedMaterialsStructure()} 
                compact={false} 
              />
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

        {activeTab === 'defaults' && (
          <PlannerDefaults 
            organizationId={user.organizationId}
            userId={user.id}
            plannerType="deck"
            materialTypes={['spruce', 'treated', 'composite', 'cedar']}
          />
        )}
      </div>

      {/* Printable Design View */}
      <PrintableDeckDesign
        config={config}
        materials={getEnrichedMaterialsStructure()}
        totalCost={totalT1Price}
        designName={loadedDesignInfo.name}
        description={loadedDesignInfo.description}
        customerName={loadedDesignInfo.customerName}
        customerCompany={loadedDesignInfo.customerCompany}
        snapshotUrl={snapshotUrl}
      />
    </div>
  );
}