import React, { useState, useEffect } from 'react';
import { KitchenCanvas } from './KitchenCanvas';
import { Kitchen3DRenderer } from './Kitchen3DRenderer';
import { KitchenConfigurator } from './KitchenConfigurator';
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
  Maximize2
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
    image: 'https://images.unsplash.com/photo-1758631130778-42d518bf13aa?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkaXNod2FzaGVyJTIwYXBwbGlhbmNlfGVufDF8fHx8MTc2NzI4Mjc1M3ww&ixlib=rb-4.1.0&q=80&w=1080'
  },
  { 
    id: 'microwave-30', 
    type: 'microwave' as const, 
    name: 'Microwave 30"', 
    width: 30, 
    height: 17, 
    depth: 16, 
    price: 300,
    image: 'https://images.unsplash.com/photo-1690731849383-514935755156?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtaWNyb3dhdmUlMjBvdmVufGVufDF8fHx8MTc2NzI2MjEwNXww&ixlib=rb-4.1.0&q=80&w=1080'
  },
  { 
    id: 'sink-33', 
    type: 'sink' as const, 
    name: 'Sink 33"', 
    width: 33, 
    height: 10, 
    depth: 22, 
    price: 400,
    image: 'https://images.unsplash.com/photo-1609210884848-2d530cfb2a07?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxraXRjaGVuJTIwc2lua3xlbnwxfHx8fDE3NjcxNzMzOTR8MA&ixlib=rb-4.1.0&q=80&w=1080'
  },
];

export function KitchenPlannerV2({ user }: KitchenPlannerV2Props) {
  const [config, setConfig] = useState<KitchenConfig>({
    roomWidth: 12,
    roomLength: 15,
    roomHeight: 9,
    layoutStyle: 'L-shape',
    cabinets: [],
    cabinetFinish: 'White',
    countertops: [],
    countertopMaterial: 'Quartz',
    appliances: [],
    hasIsland: false,
    hasPantry: false,
    hasBacksplash: true,
    gridSize: 3,
    showGrid: true,
    viewMode: '2D',
    unit: 'feet',
  });

  const [activeCategory, setActiveCategory] = useState<ItemCategory>('cabinets');
  const [selectedCabinet, setSelectedCabinet] = useState<PlacedCabinet | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSidebar, setShowSidebar] = useState(true);
  const [viewMode, setViewMode] = useState<'2D' | '3D'>('2D');

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

  const filteredCabinets = CABINET_CATALOG.filter(cab =>
    cab.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredAppliances = APPLIANCE_CATALOG.filter(app =>
    app.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-screen flex flex-col bg-white overflow-hidden">
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

      {/* Top Navigation Bar */}
      <div className="border-b bg-white flex-shrink-0">
        <div className="px-6 py-3">
          <div className="flex items-center gap-6">
            {/* Category Tabs */}
            <button
              onClick={() => setActiveCategory('cabinets')}
              className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
                activeCategory === 'cabinets'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <Box className="w-5 h-5" />
              <span>Cabinets</span>
            </button>

            <button
              onClick={() => setActiveCategory('appliances')}
              className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
                activeCategory === 'appliances'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <Refrigerator className="w-5 h-5" />
              <span>Appliances</span>
            </button>

            <button
              onClick={() => setActiveCategory('openings')}
              className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
                activeCategory === 'openings'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <DoorOpen className="w-5 h-5" />
              <span>Doors & Windows</span>
            </button>

            <button
              onClick={() => setActiveCategory('settings')}
              className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
                activeCategory === 'settings'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <Settings className="w-5 h-5" />
              <span>Room Settings</span>
            </button>

            <div className="flex-1" />

            {/* Price Display */}
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-sm text-gray-600">My kitchen</div>
                <div className="text-lg font-bold">${totalPrice.toFixed(2)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Item Library */}
        {showSidebar && (
          <div className="w-80 border-r bg-white flex flex-col max-h-full">
            {/* Sidebar Header */}
            <div className="p-4 border-b flex-shrink-0">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-lg">
                  {activeCategory === 'cabinets' && 'Add a cabinet'}
                  {activeCategory === 'appliances' && 'Add an appliance'}
                  {activeCategory === 'openings' && 'Add opening'}
                  {activeCategory === 'settings' && 'Room Settings'}
                </h2>
                <button
                  onClick={() => setShowSidebar(false)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <X className="w-5 h-5" />
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

            {/* Sidebar Content - Scrollable */}
            <div 
              className="flex-1 kitchen-planner-scroll" 
              style={{ 
                overflowY: 'scroll',
                overflowX: 'hidden',
              }}
            >
              {activeCategory === 'cabinets' && (
                <div className="p-4 space-y-3">
                  <div className="text-sm text-gray-600 mb-2 sticky top-0 bg-white py-1 z-10">
                    {filteredCabinets.length} products
                  </div>
                  {filteredCabinets.map(cabinet => (
                    <CabinetCard
                      key={cabinet.id}
                      cabinet={cabinet}
                      onAdd={handleAddCabinet}
                      finish={config.cabinetFinish}
                    />
                  ))}
                </div>
              )}

              {activeCategory === 'appliances' && (
                <div className="p-4 space-y-3">
                  <div className="text-sm text-gray-600 mb-2 sticky top-0 bg-white py-1 z-10">
                    {filteredAppliances.length} products
                  </div>
                  {filteredAppliances.map(appliance => (
                    <ApplianceCard
                      key={appliance.id}
                      appliance={appliance}
                      onAdd={handleAddAppliance}
                    />
                  ))}
                </div>
              )}

              {activeCategory === 'openings' && (
                <div className="p-4">
                  <p className="text-gray-600 text-sm">
                    Doors and windows coming soon...
                  </p>
                </div>
              )}

              {activeCategory === 'settings' && (
                <div className="p-4">
                  <KitchenConfigurator config={config} onChange={setConfig} />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Main Canvas Area */}
        <div className="flex-1 flex flex-col bg-gray-50 relative overflow-hidden">
          {!showSidebar && (
            <button
              onClick={() => setShowSidebar(true)}
              className="absolute left-4 top-4 z-10 p-2 bg-white border rounded-lg shadow-sm hover:bg-gray-50"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}

          {/* 3D Toggle Button - ALWAYS VISIBLE IN TOP RIGHT */}
          {viewMode === '2D' && (
            <Button
              onClick={() => setViewMode('3D')}
              size="lg"
              className="absolute top-4 right-4 z-[100] bg-blue-600 hover:bg-blue-700 text-white shadow-2xl"
            >
              <Maximize2 className="w-5 h-5 mr-2" />
              View in 3D
            </Button>
          )}

          <div className="flex-1 overflow-auto kitchen-planner-scroll">
            {viewMode === '3D' ? (
              <div className="h-full w-full p-6">
                <div className="flex items-center justify-between mb-4 bg-white p-3 rounded-lg shadow-sm">
                  <h2 className="text-lg font-semibold">3D View - Kitchen Plan & Elevations</h2>
                  <Button
                    onClick={() => setViewMode('2D')}
                    variant="outline"
                    size="sm"
                  >
                    <Box className="w-4 h-4 mr-2" />
                    2D View
                  </Button>
                </div>
                <div className="h-[calc(100%-4rem)]">
                  <Kitchen3DRenderer config={config} />
                </div>
              </div>
            ) : (
              <div className="h-full w-full p-6" style={{ minWidth: '1200px' }}>
                <KitchenCanvas
                  config={config}
                  selectedCabinet={selectedCabinet}
                  onSelectCabinet={setSelectedCabinet}
                  onUpdateCabinet={handleUpdateCabinet}
                  onUpdateAppliance={handleUpdateAppliance}
                  onDeleteCabinet={handleDeleteCabinet}
                  onAddCabinet={handleAddCabinet}
                  onAddAppliance={handleAddAppliance}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Cabinet Card Component
interface CabinetCardProps {
  cabinet: CabinetItem;
  onAdd: (cabinet: PlacedCabinet) => void;
  finish: string;
}

function CabinetCard({ cabinet, onAdd, finish }: CabinetCardProps) {
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('application/json', JSON.stringify(cabinet));
  };

  const handleClick = () => {
    const newCabinet: PlacedCabinet = {
      ...cabinet,
      id: `cabinet-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      finish,
      x: 50,
      y: 50,
      rotation: 0,
      wall: 'north',
    };
    onAdd(newCabinet);
    toast.success(`${cabinet.name} added to kitchen`);
  };

  // Map cabinet type to icon component
  const getIconComponent = () => {
    switch (cabinet.type) {
      case 'base':
        return <BaseCabinetIcon />;
      case 'wall':
        return <WallCabinetIcon />;
      case 'tall':
        return <TallCabinetIcon />;
      case 'corner-base':
      case 'corner-wall':
        return <CornerBaseCabinetIcon />;
      case 'island':
      case 'peninsula':
        return <IslandCabinetIcon />;
      default:
        return <BaseCabinetIcon />;
    }
  };

  return (
    <div
      className="border rounded-lg p-3 hover:border-blue-500 hover:bg-blue-50 transition-colors cursor-move"
      draggable
      onDragStart={handleDragStart}
    >
      <div className="flex items-start gap-3">
        {/* Product Icon - 3D Isometric */}
        <div className="w-20 h-20 rounded border flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-gray-50 to-gray-100 p-2">
          {getIconComponent()}
        </div>

        {/* Product Details */}
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm">{cabinet.name}</h4>
          <p className="text-xs text-gray-600 mt-1">
            {cabinet.width}×{cabinet.height}×{cabinet.depth}"
          </p>
          {cabinet.price && (
            <p className="text-sm font-semibold mt-1">
              ${cabinet.price.toFixed(2)}
            </p>
          )}
        </div>

        {/* Add Button */}
        <button
          onClick={handleClick}
          className="p-1.5 hover:bg-white rounded border border-gray-300 hover:border-blue-500 transition-colors"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Features */}
      {(cabinet.hasDoors || cabinet.hasDrawers) && (
        <div className="flex gap-2 mt-2">
          {cabinet.hasDoors && (
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
              {cabinet.numberOfDoors} Door{cabinet.numberOfDoors !== 1 ? 's' : ''}
            </span>
          )}
          {cabinet.hasDrawers && (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
              {cabinet.numberOfDrawers} Drawer{cabinet.numberOfDrawers !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// Appliance Card Component
interface ApplianceCardProps {
  appliance: typeof APPLIANCE_CATALOG[0];
  onAdd: (appliance: typeof APPLIANCE_CATALOG[0], x: number, y: number) => void;
}

function ApplianceCard({ appliance, onAdd }: ApplianceCardProps) {
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('application/json', JSON.stringify({
      ...appliance,
      itemType: 'appliance'
    }));
  };

  const handleClick = () => {
    onAdd(appliance, 50, 50);
    toast.success(`${appliance.name} added to kitchen`);
  };

  // Map appliance type to icon component
  const getIconComponent = () => {
    switch (appliance.type) {
      case 'refrigerator':
        return <RefrigeratorIcon />;
      case 'stove':
        return <StoveIcon />;
      case 'dishwasher':
        return <DishwasherIcon />;
      case 'microwave':
        return <MicrowaveIcon />;
      case 'sink':
        return <SinkIcon />;
      default:
        return <RefrigeratorIcon />;
    }
  };

  return (
    <div
      className="border rounded-lg p-3 hover:border-blue-500 hover:bg-blue-50 transition-colors cursor-move"
      draggable
      onDragStart={handleDragStart}
    >
      <div className="flex items-start gap-3">
        {/* Product Icon - 3D Isometric */}
        <div className="w-20 h-20 rounded border flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-gray-50 to-gray-100 p-2">
          {getIconComponent()}
        </div>

        {/* Product Details */}
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm">{appliance.name}</h4>
          <p className="text-xs text-gray-600 mt-1">
            {appliance.width}×{appliance.height}×{appliance.depth}"
          </p>
          <p className="text-sm font-semibold mt-1">
            ${appliance.price.toFixed(2)}
          </p>
        </div>

        {/* Add Button */}
        <button
          onClick={handleClick}
          className="p-1.5 hover:bg-white rounded border border-gray-300 hover:border-blue-500 transition-colors"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}