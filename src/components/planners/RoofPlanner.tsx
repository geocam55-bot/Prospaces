import React, { useState, useEffect } from 'react';
import { RoofConfigurator } from '../roof/RoofConfigurator';
import { RoofCanvas } from '../roof/RoofCanvas';
import { Roof3DRenderer } from '../roof/Roof3DRenderer';
import { RoofMaterialsList } from '../roof/RoofMaterialsList';
import { RoofTemplates } from '../roof/RoofTemplates';
import { SavedRoofDesigns } from '../roof/SavedRoofDesigns';
import { ProjectQuoteGenerator } from '../ProjectQuoteGenerator';
import { DiagnosticPanel } from '../DiagnosticPanel';
import { PrintableRoofDesign } from '../project-wizard/PrintableRoofDesign';
import { calculateMaterials } from '../../utils/roofCalculations';
import { enrichMaterialsWithT1Pricing } from '../../utils/enrichMaterialsWithPricing';
import { RoofConfig } from '../../types/roof';
import { Ruler, Package, Printer, FileText, Box, Layers, Triangle } from 'lucide-react';
import { Button } from '../ui/button';
import { toast } from 'sonner';
import type { User } from '../../App';

interface RoofPlannerProps {
  user: User;
}

export function RoofPlanner({ user }: RoofPlannerProps) {
  const [config, setConfig] = useState<RoofConfig>({
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
    hasChimney: false,
    chimneyCount: 0,
    wasteFactor: 0.10,
    unit: 'feet',
  });

  const [activeTab, setActiveTab] = useState<'design' | 'materials' | 'saved'>('design');
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
    ...materials.roofDeck,
    ...materials.underlayment,
    ...materials.shingles,
    ...materials.ridgeAndHip,
    ...materials.flashing,
    ...materials.ventilation,
    ...materials.hardware,
  ];

  // Enrich materials with T1 pricing whenever config changes
  useEffect(() => {
    const enrichMaterials = async () => {
      if (user.organizationId && flatMaterials.length > 0) {
        const { materials: enriched, totalT1Price: total } = await enrichMaterialsWithT1Pricing(
          flatMaterials,
          user.organizationId,
          'roof',
          config.shingleType
        );
        setEnrichedMaterials(enriched);
        setTotalT1Price(total);
      }
    };
    enrichMaterials();
  }, [config, user.organizationId]);

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
      roofDeck: materials.roofDeck.map(item => enrichedMap.get(item.description) || item),
      underlayment: materials.underlayment.map(item => enrichedMap.get(item.description) || item),
      shingles: materials.shingles.map(item => enrichedMap.get(item.description) || item),
      ridgeAndHip: materials.ridgeAndHip.map(item => enrichedMap.get(item.description) || item),
      flashing: materials.flashing.map(item => enrichedMap.get(item.description) || item),
      ventilation: materials.ventilation.map(item => enrichedMap.get(item.description) || item),
      hardware: materials.hardware.map(item => enrichedMap.get(item.description) || item),
    };
  };

  const handleLoadTemplate = (templateConfig: RoofConfig) => {
    setConfig(templateConfig);
    setLoadedDesignInfo({}); // Clear loaded design info when loading a template
    setActiveTab('design');
  };

  const handleLoadDesign = (loadedConfig: RoofConfig, designInfo?: {
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
    window.print();
  };

  return (
    <div>
      {/* Now in Development Banner */}
      <div className="bg-gradient-to-r from-red-50 to-orange-50 border-b border-red-200 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-red-100 p-2 rounded-lg">
              <Triangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h3 className="font-semibold text-red-900">Roof Planner - Now in Development</h3>
              <p className="text-sm text-red-700">We're actively building this feature. Try out the preview and share your feedback!</p>
            </div>
          </div>
          <Button 
            variant="outline" 
            className="border-red-300 text-red-700 hover:bg-red-100 hover:border-red-400"
            onClick={() => {
              toast.info('Roof Planner is under active development. Your feedback helps us build better tools!');
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
                    ? 'border-red-600 text-red-600'
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
                    ? 'border-red-600 text-red-600'
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
                    ? 'border-red-600 text-red-600'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileText className="w-4 h-4" />
                Saved Designs
              </button>
            </nav>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
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
              <RoofTemplates onLoadTemplate={handleLoadTemplate} currentConfig={config} />
              <RoofConfigurator config={config} onChange={setConfig} />
              
              {/* Quote Generator */}
              <ProjectQuoteGenerator
                user={user}
                projectType="roof"
                materials={enrichedMaterials.length > 0 ? enrichedMaterials : flatMaterials}
                totalCost={totalT1Price > 0 ? totalT1Price : 0}
                projectData={config}
              />
            </div>

            <div className="lg:col-span-2 space-y-6 print:hidden">
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 print:shadow-none print:border-2 print:border-black">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-slate-900 print:hidden">Roof Plan & Elevation</h2>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setViewMode('2d')}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors text-sm ${
                        viewMode === '2d'
                          ? 'bg-red-600 text-white'
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
                          ? 'bg-red-600 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <Box className="w-4 h-4" />
                      3D
                    </button>
                  </div>
                </div>
                <div className="h-[500px]">
                  {viewMode === '2d' ? (
                    <RoofCanvas config={config} />
                  ) : (
                    <Roof3DRenderer config={config} />
                  )}
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 print:shadow-none print:border-2 print:border-black print:break-before-page">
                <h2 className="text-slate-900 mb-4">Materials Summary</h2>
                <RoofMaterialsList materials={materials} compact />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'materials' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
              {enrichedMaterials.length > 0 && totalT1Price > 0 && (
                <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-orange-700">Total Estimated Cost (Tier 1 Pricing)</p>
                      <p className="text-xs text-orange-600 mt-1">Based on your organization's default pricing</p>
                    </div>
                    <p className="text-2xl font-semibold text-orange-900">${totalT1Price.toLocaleString()}</p>
                  </div>
                </div>
              )}
              <RoofMaterialsList 
                materials={getEnrichedMaterialsStructure()} 
                compact={false} 
              />
            </div>
            
            <DiagnosticPanel 
              organizationId={user.organizationId}
              plannerType="roof"
              materialType={config.shingleType}
            />
          </div>
        )}

        {activeTab === 'saved' && (
          <SavedRoofDesigns 
            user={user}
            currentConfig={config}
            materials={enrichedMaterials.length > 0 ? enrichedMaterials : flatMaterials}
            totalCost={totalT1Price > 0 ? totalT1Price : 0}
            onLoadDesign={handleLoadDesign} 
          />
        )}
      </div>

      {/* Printable Design View */}
      <PrintableRoofDesign
        config={config}
        materials={getEnrichedMaterialsStructure()}
        totalCost={totalT1Price}
        designName={loadedDesignInfo.name}
        description={loadedDesignInfo.description}
        customerName={loadedDesignInfo.customerName}
        customerCompany={loadedDesignInfo.customerCompany}
      />
    </div>
  );
}