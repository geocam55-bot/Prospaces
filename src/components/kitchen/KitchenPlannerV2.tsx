import React, { useState, useEffect } from 'react';
import { KitchenCanvas } from './KitchenCanvas';
import { Kitchen3DRenderer } from './Kitchen3DRenderer';
import { KitchenConfigurator } from './KitchenConfigurator';
import { SavedKitchenDesigns } from './SavedKitchenDesigns';
import { PlannerDefaults } from '../PlannerDefaults';
import { ProjectQuoteGenerator } from '../ProjectQuoteGenerator';
import { calculateKitchenMaterials } from '../../utils/kitchenCalculations';
import { enrichMaterialsWithT1Pricing } from '../../utils/enrichMaterialsWithPricing';
import { KitchenConfig, PlacedCabinet, CABINET_CATALOG, CabinetItem, Appliance } from '../../types/kitchen';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { ScrollArea } from '../ui/scroll-area';
import { 
  Box, 
  Refrigerator, 
  DoorOpen, 
  Search, 
  Plus,
  X,
  ChevronLeft,
  Camera,
  ShoppingCart,
  Settings,
  Maximize2,
  Edit3,
  Save,
  Printer
} from 'lucide-react';
import type { User } from '../../App';
import { toast } from 'sonner@2.0.3';
import { ChefHat } from 'lucide-react';
import { 
  BaseCabinetIcon, 
  WallCabinetIcon, 
  TallCabinetIcon, 
  CornerBaseCabinetIcon, 
  IslandCabinetIcon,
  RefrigeratorIcon,
  StoveIcon,
  DishwasherIcon,
  MicrowaveIcon,
  SinkIcon
} from './CabinetIcons';

interface KitchenPlannerV2Props {
  user: User;
}

type ItemCategory = 'cabinets' | 'appliances' | 'openings' | 'settings';
type MainTab = 'design' | 'materials' | 'saved-designs' | 'defaults';

// Cabinet images by type
const CABINET_IMAGES: Record<string, string> = {
  'base': 'https://images.unsplash.com/photo-1741314671445-a9a1cc1bfa7d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxraXRjaGVuJTIwYmFzZSUyMGNhYmluZXR8ZW58MXx8fHwxNzY3MjgyNzUxfDA&ixlib=rb-4.1.0&q=80&w=1080',
  'wall': 'https://images.unsplash.com/photo-1713514022453-4adc636025a4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxraXRjaGVuJTIwd2FsbCUyMGNhYmluZXR8ZW58MXx8fHwxNzY3MjgyNzUxfDA&ixlib=rb-4.1.0&q=80&w=1080',
  'tall': 'https://images.unsplash.com/photo-1738162599555-c28b00062960?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0YWxsJTIwa2l0Y2hlbiUyMGNhYmluZXR8ZW58MXx8fHwxNzY3MjgyNzUyfDA&ixlib=rb-4.1.0&q=80&w=1080',
  'corner-base': 'https://images.unsplash.com/photo-1741314671445-a9a1cc1bfa7d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxraXRjaGVuJTIwYmFzZSUyMGNhYmluZXR8ZW58MXx8fHwxNzY3MjgyNzUxfDA&ixlib=rb-4.1.0&q=80&w=1080',
  'corner-wall': 'https://images.unsplash.com/photo-1713514022453-4adc636025a4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxraXRjaGVuJTIwd2FsbCUyMGNhYmluZXR8ZW58MXx8fHwxNzY3MjgyNzUxfDA&ixlib=rb-4.1.0&q=80&w=1080',
  'island': 'https://images.unsplash.com/photo-1611818830402-d07de749ed59?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3aGl0ZSUyMGtpdGNoZW4lMjBjYWJpbmV0fGVufDF8fHx8MTc2NzI4Mjc1MXww&ixlib=rb-4.1.0&q=80&w=1080',
  'peninsula': 'https://images.unsplash.com/photo-1611818830402-d07de749ed59?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3aGl0ZSUyMGtpdGNoZW4lMjBjYWJpbmV0fGVufDF8fHx8MTc2NzI4Mjc1MXww&ixlib=rb-4.1.0&q=80&w=1080',
};

// Appliance catalog
const APPLIANCE_CATALOG = [
  { 
    id: 'fridge-36', 
    type: 'refrigerator' as const, 
    name: 'Refrigerator 36"', 
    width: 36, 
    height: 70, 
    depth: 30, 
    price: 1200,
    image: 'https://images.unsplash.com/photo-1610733374054-59454fe657cd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdGFpbmxlc3MlMjBzdGVlbCUyMHJlZnJpZ2VyYXRvcnxlbnwxfHx8fDE3NjcyODI3NTJ8MA&ixlib=rb-4.1.0&q=80&w=1080'
  },
  { 
    id: 'fridge-33', 
    type: 'refrigerator' as const, 
    name: 'Refrigerator 33"', 
    width: 33, 
    height: 70, 
    depth: 30, 
    price: 1000,
    image: 'https://images.unsplash.com/photo-1610733374054-59454fe657cd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdGFpbmxlc3MlMjBzdGVlbCUyMHJlZnJpZ2VyYXRvcnxlbnwxfHx8fDE3NjcyODI3NTJ8MA&ixlib=rb-4.1.0&q=80&w=1080'
  },
  { 
    id: 'stove-30', 
    type: 'stove' as const, 
    name: 'Gas Range 30"', 
    width: 30, 
    height: 36, 
    depth: 28, 
    price: 800,
    image: 'https://images.unsplash.com/photo-1749496600182-a4c4ca08dd8e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxnYXMlMjBzdG92ZSUyMHJhbmdlfGVufDF8fHx8MTc2NzI4Mjc1Mnww&ixlib=rb-4.1.0&q=80&w=1080'
  },
  { 
    id: 'dishwasher-24', 
    type: 'dishwasher' as const, 
    name: 'Dishwasher 24"', 
    width: 24, 
    height: 34, 
    depth: 24, 
    price: 600,
    image: 'https://images.unsplash.com/photo-1610733374054-59454fe657cd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdGFpbmxlc3MlMjBzdGVlbCUyMHJlZnJpZ2VyYXRvcnxlbnwxfHx8fDE3NjcyODI3NTJ8MA&ixlib=rb-4.1.0&q=80&w=1080'
  },
  { 
    id: 'microwave-30', 
    type: 'microwave' as const, 
    name: 'Over-Range Microwave 30"', 
    width: 30, 
    height: 17, 
    depth: 16, 
    price: 300,
    image: 'https://images.unsplash.com/photo-1610733374054-59454fe657cd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdGFpbmxlc3MlMjBzdGVlbCUyMHJlZnJpZ2VyYXRvcnxlbnwxfHx8fDE3NjcyODI3NTJ8MA&ixlib=rb-4.1.0&q=80&w=1080'
  },
  { 
    id: 'sink-33', 
    type: 'sink' as const, 
    name: 'Undermount Sink 33"', 
    width: 33, 
    height: 9, 
    depth: 22, 
    price: 250,
    image: 'https://images.unsplash.com/photo-1610733374054-59454fe657cd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdGFpbmxlc3MlMjBzdGVlbCUyMHJlZnJpZ2VyYXRvcnxlbnwxfHx8fDE3NjcyODI3NTJ8MA&ixlib=rb-4.1.0&q=80&w=1080'
  },
];

// Cabinet Card Component
function CabinetCard({ 
  cabinet, 
  onAdd,
  finish 
}: { 
  cabinet: CabinetItem; 
  onAdd: (cab: PlacedCabinet) => void;
  finish: string;
}) {
  const handleAdd = () => {
    const newCabinet: PlacedCabinet = {
      id: `cabinet-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      catalogId: cabinet.id,
      name: cabinet.name,
      type: cabinet.type,
      width: cabinet.width,
      height: cabinet.height,
      depth: cabinet.depth,
      x: 100,
      y: 100,
      rotation: 0,
      finish: finish,
      price: cabinet.price,
    };
    onAdd(newCabinet);
    toast.success(`Added ${cabinet.name}`);
  };

  const getCabinetIcon = () => {
    switch (cabinet.type) {
      case 'base': return <BaseCabinetIcon className="w-full h-full" />;
      case 'wall': return <WallCabinetIcon className="w-full h-full" />;
      case 'tall': return <TallCabinetIcon className="w-full h-full" />;
      case 'corner-base':
      case 'corner-wall': return <CornerBaseCabinetIcon className="w-full h-full" />;
      case 'island':
      case 'peninsula': return <IslandCabinetIcon className="w-full h-full" />;
      default: return <Box className="w-8 h-8" />;
    }
  };

  return (
    <div 
      className="rounded-lg border border-gray-200 hover:shadow-md transition-shadow cursor-pointer bg-white" 
      onClick={handleAdd}
    >
      <div className="h-32 p-4 border-b border-gray-200">
        {getCabinetIcon()}
      </div>
      <div className="p-3 bg-white">
        <h3 className="font-medium text-sm mb-1">{cabinet.name}</h3>
        <p className="text-xs text-gray-600 mb-2">{cabinet.width}W × {cabinet.height}H × {cabinet.depth}D</p>
        <p className="text-sm font-semibold text-blue-600">${cabinet.price?.toFixed(2) || '0.00'}</p>
      </div>
    </div>
  );
}

// Appliance Card Component
function ApplianceCard({ 
  appliance, 
  onAdd 
}: { 
  appliance: typeof APPLIANCE_CATALOG[0]; 
  onAdd: (app: typeof APPLIANCE_CATALOG[0], x: number, y: number) => void;
}) {
  const handleAdd = () => {
    onAdd(appliance, 200, 200);
    toast.success(`Added ${appliance.name}`);
  };

  const getApplianceIcon = () => {
    switch (appliance.type) {
      case 'refrigerator': return <RefrigeratorIcon className="w-8 h-8" />;
      case 'stove': return <StoveIcon className="w-8 h-8" />;
      case 'dishwasher': return <DishwasherIcon className="w-8 h-8" />;
      case 'microwave': return <MicrowaveIcon className="w-8 h-8" />;
      case 'sink': return <SinkIcon className="w-8 h-8" />;
      default: return <Refrigerator className="w-8 h-8" />;
    }
  };

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer group" onClick={handleAdd}>
      <div className="relative h-32 bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
        {getApplianceIcon()}
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all flex items-center justify-center">
          <Plus className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>
      <div className="p-3">
        <h3 className="font-medium text-sm mb-1">{appliance.name}</h3>
        <p className="text-xs text-gray-600 mb-2">{appliance.width}W × {appliance.height}H</p>
        <p className="text-sm font-semibold text-green-600">${appliance.price.toFixed(2)}</p>
      </div>
    </Card>
  );
}

export function KitchenPlannerV2({ user }: KitchenPlannerV2Props) {
  const [config, setConfig] = useState<KitchenConfig>({
    roomWidth: 12,
    roomLength: 14,
    roomHeight: 8,
    wallThickness: 6,
    layoutStyle: 'L-shaped',
    cabinetFinish: 'White Shaker',
    countertopMaterial: 'Granite',
    cabinets: [],
    countertops: [],
    appliances: [],
    hasIsland: false,
    hasPantry: false,
    hasBacksplash: true,
    gridSize: 6,
    showGrid: false,
    snapToGrid: false,
    viewMode: '2D',
    unit: 'feet',
  });

  const [selectedCabinet, setSelectedCabinet] = useState<PlacedCabinet | null>(null);
  const [activeCategory, setActiveCategory] = useState<ItemCategory>('cabinets');
  const [showSidebar, setShowSidebar] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<MainTab>('design');

  const materials = calculateKitchenMaterials(config);
  const flatMaterials = [
    ...materials.cabinets,
    ...materials.countertops,
    ...materials.appliances,
    ...materials.hardware,
    ...materials.installation,
  ];

  const totalPrice = config.cabinets.reduce((sum, cab) => sum + (cab.price || 0), 0) +
                     config.appliances.reduce((sum, app) => sum + (app.price || 0), 0);

  const handleAddCabinet = (cabinet: PlacedCabinet) => {
    setConfig(prev => ({
      ...prev,
      cabinets: [...prev.cabinets, cabinet],
    }));
  };

  const handleAddAppliance = (applianceData: typeof APPLIANCE_CATALOG[0], x: number, y: number) => {
    const newAppliance: Appliance = {
      id: `appliance-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: applianceData.type,
      name: applianceData.name,
      width: applianceData.width,
      height: applianceData.height,
      depth: applianceData.depth,
      x,
      y,
      rotation: 0,
      price: applianceData.price,
    };
    
    setConfig(prev => ({
      ...prev,
      appliances: [...prev.appliances, newAppliance],
    }));
  };

  const handleUpdateCabinet = (id: string, updates: Partial<PlacedCabinet>) => {
    setConfig(prev => ({
      ...prev,
      cabinets: prev.cabinets.map(cab => 
        cab.id === id ? { ...cab, ...updates } : cab
      ),
    }));
  };

  const handleUpdateAppliance = (id: string, updates: Partial<Appliance>) => {
    setConfig(prev => ({
      ...prev,
      appliances: prev.appliances.map(app => 
        app.id === id ? { ...app, ...updates } : app
      ),
    }));
  };

  const handleDeleteCabinet = (id: string) => {
    setConfig(prev => ({
      ...prev,
      cabinets: prev.cabinets.filter(cab => cab.id !== id),
    }));
    if (selectedCabinet?.id === id) {
      setSelectedCabinet(null);
    }
  };

  const handleUpdateConfig = (updates: Partial<KitchenConfig>) => {
    setConfig(prev => ({
      ...prev,
      ...updates,
    }));
  };

  const filteredCabinets = CABINET_CATALOG.filter(cab =>
    cab.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredAppliances = APPLIANCE_CATALOG.filter(app =>
    app.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-white">
      {/* Main Tab Navigation - Design / Materials / Saved Designs */}
      <div className="border-b bg-white">
        <div className="px-6 py-0 flex items-center justify-between">
          {/* Tab Navigation */}
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab('design')}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                activeTab === 'design'
                  ? 'border-red-600 text-red-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <Edit3 className="w-4 h-4" />
              <span>Design</span>
            </button>

            <button
              onClick={() => setActiveTab('materials')}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                activeTab === 'materials'
                  ? 'border-red-600 text-red-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Materials</span>
            </button>

            <button
              onClick={() => setActiveTab('saved-designs')}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                activeTab === 'saved-designs'
                  ? 'border-red-600 text-red-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <Save className="w-4 h-4" />
              <span>Saved Designs</span>
            </button>

            <button
              onClick={() => setActiveTab('defaults')}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                activeTab === 'defaults'
                  ? 'border-red-600 text-red-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Defaults</span>
            </button>
          </div>

          {/* Print Plan Button */}
          <Button 
            className="bg-red-600 hover:bg-red-700 text-white"
            onClick={() => {
              toast.info('Print functionality coming soon!');
            }}
          >
            <Printer className="w-4 h-4 mr-2" />
            Print Plan
          </Button>
        </div>
      </div>

      {/* Coming Soon Banner */}
      <div className="bg-gradient-to-r from-orange-50 to-amber-50 border-b border-orange-200 flex-shrink-0">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-orange-100 p-2 rounded-lg">
              <ChefHat className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h3 className="font-semibold text-orange-900">Kitchen Planner - Now in Development</h3>
              <p className="text-sm text-orange-700">We're actively building this feature. Try out the preview and share your feedback!</p>
            </div>
          </div>
          <Button 
            variant="outline" 
            className="border-orange-300 text-orange-700 hover:bg-orange-100 hover:border-orange-400"
            onClick={() => {
              toast.info('Kitchen Planner is under active development. Your feedback helps us build better tools!');
            }}
          >
            Give Feedback
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'design' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Left Sidebar - Item Library */}
            <div className="lg:col-span-1 space-y-6">
              {/* Category Selector */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <h2 className="font-semibold text-lg mb-3">Add Items</h2>
                
                {/* Category Tabs */}
                <div className="flex flex-col gap-2 mb-4">
                  <button
                    onClick={() => setActiveCategory('cabinets')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                      activeCategory === 'cabinets'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <Box className="w-5 h-5" />
                    <span>Cabinets</span>
                  </button>

                  <button
                    onClick={() => setActiveCategory('appliances')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                      activeCategory === 'appliances'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <Refrigerator className="w-5 h-5" />
                    <span>Appliances</span>
                  </button>

                  <button
                    onClick={() => setActiveCategory('settings')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                      activeCategory === 'settings'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <Settings className="w-5 h-5" />
                    <span>Room Settings</span>
                  </button>
                </div>

                {/* Search */}
                {activeCategory !== 'settings' && (
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                )}
              </div>

              {/* Category Content */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                {activeCategory === 'cabinets' && (
                  <div className="p-4">
                    <div className="text-sm text-gray-600 mb-2">
                      {filteredCabinets.length} products
                    </div>
                    <div className="space-y-3 max-h-[880px] overflow-y-auto pr-2">
                      {filteredCabinets.map(cabinet => (
                        <CabinetCard
                          key={cabinet.id}
                          cabinet={cabinet}
                          onAdd={handleAddCabinet}
                          finish={config.cabinetFinish}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {activeCategory === 'appliances' && (
                  <div className="p-4">
                    <div className="text-sm text-gray-600 mb-2">
                      {filteredAppliances.length} products
                    </div>
                    <div className="space-y-3 max-h-[880px] overflow-y-auto pr-2">
                      {filteredAppliances.map(appliance => (
                        <ApplianceCard
                          key={appliance.id}
                          appliance={appliance}
                          onAdd={handleAddAppliance}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {activeCategory === 'settings' && (
                  <div className="p-4">
                    <KitchenConfigurator config={config} onChange={handleUpdateConfig} />
                  </div>
                )}
              </div>

              {/* Price Display */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="text-sm text-gray-600 mb-1">Total Cost</div>
                <div className="text-2xl font-bold text-blue-600">${totalPrice.toFixed(2)}</div>
              </div>
            </div>

            {/* Right Side - Canvas and Materials */}
            <div className="lg:col-span-3 space-y-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">Kitchen Plan & Elevation</h2>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setConfig(prev => ({ ...prev, viewMode: '2D' }))}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors text-sm ${
                        config.viewMode === '2D'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      2D
                    </button>
                    <button
                      onClick={() => setConfig(prev => ({ ...prev, viewMode: '3D' }))}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors text-sm ${
                        config.viewMode === '3D'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <Box className="w-4 h-4" />
                      3D
                    </button>
                  </div>
                </div>
                <div>
                  {config.viewMode === '2D' ? (
                    <KitchenCanvas
                      config={config}
                      selectedCabinet={selectedCabinet}
                      onSelectCabinet={setSelectedCabinet}
                      onUpdateCabinet={handleUpdateCabinet}
                      onUpdateAppliance={handleUpdateAppliance}
                      onDeleteCabinet={handleDeleteCabinet}
                      onAddCabinet={handleAddCabinet}
                      onAddAppliance={handleAddAppliance}
                      onUpdateConfig={handleUpdateConfig}
                    />
                  ) : (
                    <div className="h-[500px]">
                      <Kitchen3DRenderer config={config} />
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold mb-4">Materials Summary</h2>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left p-3 text-sm font-semibold">Category</th>
                        <th className="text-left p-3 text-sm font-semibold">Item</th>
                        <th className="text-right p-3 text-sm font-semibold">Qty</th>
                        <th className="text-right p-3 text-sm font-semibold">Unit Price</th>
                        <th className="text-right p-3 text-sm font-semibold">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {flatMaterials.slice(0, 10).map((item, idx) => (
                        <tr key={idx} className="border-t border-gray-100">
                          <td className="p-3 text-sm text-gray-600">{item.category}</td>
                          <td className="p-3 text-sm">{item.description}</td>
                          <td className="p-3 text-sm text-right">{item.quantity} {item.unit}</td>
                          <td className="p-3 text-sm text-right">${item.unitPrice?.toFixed(2) || '—'}</td>
                          <td className="p-3 text-sm text-right font-medium">${item.totalPrice?.toFixed(2) || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'materials' && (
          <div className="flex-1 overflow-auto p-6 bg-gray-50">
            <div className="max-w-6xl mx-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-semibold">Materials & Cost Breakdown</h2>
                <ProjectQuoteGenerator 
                  user={user}
                  projectType="kitchen"
                  materials={flatMaterials}
                  totalCost={totalPrice}
                  projectData={config}
                />
              </div>
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left p-4 font-semibold">Category</th>
                      <th className="text-left p-4 font-semibold">Item</th>
                      <th className="text-right p-4 font-semibold">Quantity</th>
                      <th className="text-right p-4 font-semibold">Unit Price</th>
                      <th className="text-right p-4 font-semibold">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {flatMaterials.map((item, idx) => (
                      <tr key={idx} className="border-t border-gray-100">
                        <td className="p-4 text-sm text-gray-600">{item.category}</td>
                        <td className="p-4">{item.description}</td>
                        <td className="p-4 text-right">{item.quantity} {item.unit}</td>
                        <td className="p-4 text-right">${item.unitPrice?.toFixed(2) || '—'}</td>
                        <td className="p-4 text-right font-medium">${item.totalPrice?.toFixed(2) || '—'}</td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-gray-300 bg-blue-50">
                      <td colSpan={4} className="p-4 font-bold text-right">Grand Total:</td>
                      <td className="p-4 text-right font-bold text-xl text-blue-600">
                        ${totalPrice.toFixed(2)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'saved-designs' && (
          <div className="flex-1 overflow-auto p-6 bg-gray-50">
            <div className="max-w-6xl mx-auto">
              <SavedKitchenDesigns 
                user={user}
                currentConfig={config}
                materials={flatMaterials}
                totalCost={totalPrice}
                onLoadDesign={(loadedConfig, designInfo) => {
                  setConfig(loadedConfig);
                  setActiveTab('design');
                  toast.success('Design loaded successfully!');
                }}
              />
            </div>
          </div>
        )}

        {activeTab === 'defaults' && (
          <div className="flex-1 overflow-auto p-6 bg-gray-50">
            <div className="max-w-6xl mx-auto">
              <PlannerDefaults 
                organizationId={user.organizationId}
                userId={user.id}
                plannerType="kitchen"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}