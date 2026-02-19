import React, { useState, useEffect } from 'react';
import { ShedConfigurator } from '../shed/ShedConfigurator';
import { ShedCanvas } from '../shed/ShedCanvas';
import { Shed3DRenderer } from '../shed/Shed3DRenderer';
import { ShedMaterialsList } from '../shed/ShedMaterialsList';
import { ShedTemplates } from '../shed/ShedTemplates';
import { SavedShedDesigns } from '../shed/SavedShedDesigns';
import { PrintableShedDesign } from '../project-wizard/PrintableShedDesign';
import { PlannerDefaults } from '../PlannerDefaults';
import { ProjectQuoteGenerator } from '../ProjectQuoteGenerator';
import { calculateMaterials } from '../../utils/shedCalculations';
import { enrichMaterialsWithT1Pricing } from '../../utils/enrichMaterialsWithPricing';
import { ShedConfig } from '../../types/shed';
import { Ruler, Package, Printer, FileText, Box, Layers, Home, Settings } from 'lucide-react';
import { Button } from '../ui/button';
import { toast } from 'sonner';
import type { User } from '../../App';
import { PermissionGate } from '../PermissionGate';

interface ShedPlannerProps {
  user: User;
}

export function ShedPlanner({ user }: ShedPlannerProps) {
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
    ...materials.foundation,
    ...materials.framing,
    ...(materials.flooring || []),
    ...materials.roofing,
    ...materials.siding,
    ...materials.doors,
    ...materials.windows,
    ...materials.trim,
    ...materials.hardware,
    ...(materials.electrical || []),
    ...(materials.accessories || []),
  ];

  // Enrich materials with T1 pricing whenever config changes
  useEffect(() => {
    const enrichMaterials = async () => {
      if (user.organizationId && flatMaterials.length > 0) {
        const { materials: enriched, totalT1Price: total } = await enrichMaterialsWithT1Pricing(
          flatMaterials,
          user.organizationId,
          'shed'
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
      foundation: materials.foundation.map(item => enrichedMap.get(item.description) || item),
      framing: materials.framing.map(item => enrichedMap.get(item.description) || item),
      flooring: (materials.flooring || []).map(item => enrichedMap.get(item.description) || item),
      roofing: materials.roofing.map(item => enrichedMap.get(item.description) || item),
      siding: materials.siding.map(item => enrichedMap.get(item.description) || item),
      doors: materials.doors.map(item => enrichedMap.get(item.description) || item),
      windows: materials.windows.map(item => enrichedMap.get(item.description) || item),
      trim: materials.trim.map(item => enrichedMap.get(item.description) || item),
      hardware: materials.hardware.map(item => enrichedMap.get(item.description) || item),
      electrical: (materials.electrical || []).map(item => enrichedMap.get(item.description) || item),
      accessories: (materials.accessories || []).map(item => enrichedMap.get(item.description) || item),
    };
  };

  const handleLoadTemplate = (templateConfig: ShedConfig) => {
    setConfig(templateConfig);
    setLoadedDesignInfo({}); // Clear loaded design info when loading a template
    setActiveTab('design');
  };

  const handleLoadDesign = (loadedConfig: ShedConfig, designInfo?: {
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
    <PermissionGate user={user} module="project-wizards" action="view">
    <div>
      {/* Now in Development Banner */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-200 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-green-100 p-2 rounded-lg">
              <Home className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-green-900">Shed Planner - Now in Development</h3>
              <p className="text-sm text-green-700">We're actively building this feature. Try out the preview and share your feedback!</p>
            </div>
          </div>
          <Button 
            variant="outline" 
            className="border-green-300 text-green-700 hover:bg-green-100 hover:border-green-400"
            onClick={() => {
              toast.info('Shed Planner is under active development. Your feedback helps us build better tools!');
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
                    ? 'border-green-600 text-green-600'
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
                    ? 'border-green-600 text-green-600'
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
                    ? 'border-green-600 text-green-600'
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
                    ? 'border-green-600 text-green-600'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <Settings className="w-4 h-4" />
                Defaults
              </button>
            </nav>
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
              <ShedTemplates onLoadTemplate={handleLoadTemplate} currentConfig={config} />
              <ShedConfigurator config={config} onChange={setConfig} />
            </div>

            <div className="lg:col-span-2 space-y-6 print:hidden">
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 print:shadow-none print:border-2 print:border-black">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-slate-900 print:hidden">Shed Plan & Elevation</h2>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setViewMode('2d')}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors text-sm ${
                        viewMode === '2d'
                          ? 'bg-green-600 text-white'
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
                          ? 'bg-green-600 text-white'
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
                    <ShedCanvas config={config} />
                  ) : (
                    <div className="h-[500px]">
                      <Shed3DRenderer config={config} />
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 print:shadow-none print:border-2 print:border-black print:break-before-page">
                <h2 className="text-slate-900 mb-4">Materials Summary</h2>
                <ShedMaterialsList materials={materials} compact />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'materials' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                {enrichedMaterials.length > 0 && totalT1Price > 0 ? (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex-1 w-full sm:w-auto">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-green-700">Total Estimated Cost (Tier 1 Pricing)</p>
                        <p className="text-xs text-green-600 mt-1">Based on your organization's default pricing</p>
                      </div>
                      <p className="text-2xl font-semibold text-green-900">${totalT1Price.toLocaleString()}</p>
                    </div>
                  </div>
                ) : <div className="flex-1"></div>}
                
                <ProjectQuoteGenerator 
                  user={user}
                  projectType="shed"
                  materials={enrichedMaterials.length > 0 ? enrichedMaterials : flatMaterials}
                  totalCost={totalT1Price}
                  projectData={config}
                />
              </div>

              <ShedMaterialsList 
                materials={getEnrichedMaterialsStructure()} 
                compact={false} 
              />
            </div>
          </div>
        )}

        {activeTab === 'saved' && (
          <SavedShedDesigns 
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
            plannerType="shed"
          />
        )}
      </div>

      {/* Printable Design View */}
      <PrintableShedDesign
        config={config}
        materials={getEnrichedMaterialsStructure()}
        totalCost={totalT1Price}
        designName={loadedDesignInfo.name}
        description={loadedDesignInfo.description}
        customerName={loadedDesignInfo.customerName}
        customerCompany={loadedDesignInfo.customerCompany}
      />
    </div>
    </PermissionGate>
  );
}