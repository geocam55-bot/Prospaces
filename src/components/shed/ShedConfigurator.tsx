import React from 'react';
import { ShedConfig, ShedStyle, SidingType, FoundationType, DoorType } from '../../types/shed';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Checkbox } from '../ui/checkbox';
import { Ruler, Home, Hammer, Paintbrush, Zap, Package } from 'lucide-react';

interface ShedConfiguratorProps {
  config: ShedConfig;
  onChange: (config: ShedConfig) => void;
}

export function ShedConfigurator({ config, onChange }: ShedConfiguratorProps) {
  const updateConfig = (updates: Partial<ShedConfig>) => {
    onChange({ ...config, ...updates });
  };

  return (
    <div className="space-y-4">
      {/* Dimensions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Ruler className="w-4 h-4" />
            Dimensions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="width">Width (ft)</Label>
            <Input
              id="width"
              type="number"
              min="6"
              max="16"
              value={config.width}
              onChange={(e) => updateConfig({ width: Number(e.target.value) })}
            />
            <p className="text-xs text-slate-500 mt-1">Typical: 8-12 ft</p>
          </div>

          <div>
            <Label htmlFor="length">Length/Depth (ft)</Label>
            <Input
              id="length"
              type="number"
              min="6"
              max="20"
              value={config.length}
              onChange={(e) => updateConfig({ length: Number(e.target.value) })}
            />
            <p className="text-xs text-slate-500 mt-1">Typical: 10-16 ft</p>
          </div>

          <div>
            <Label htmlFor="wallHeight">Wall Height (ft)</Label>
            <Select
              value={config.wallHeight.toString()}
              onValueChange={(value) => updateConfig({ wallHeight: Number(value) })}
            >
              <SelectTrigger id="wallHeight">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="6">6 ft</SelectItem>
                <SelectItem value="6.5">6.5 ft</SelectItem>
                <SelectItem value="7">7 ft (Standard)</SelectItem>
                <SelectItem value="8">8 ft (Tall)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Style */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Home className="w-4 h-4" />
            Style & Structure
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="style">Shed Style</Label>
            <Select
              value={config.style}
              onValueChange={(value) => updateConfig({ style: value as ShedStyle })}
            >
              <SelectTrigger id="style">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gable">Gable (Classic A-frame)</SelectItem>
                <SelectItem value="barn">Barn (Gambrel)</SelectItem>
                <SelectItem value="quaker">Quaker (Overhang)</SelectItem>
                <SelectItem value="lean-to">Lean-To (Single Slope)</SelectItem>
                <SelectItem value="saltbox">Saltbox (Asymmetric)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="roofPitch">Roof Pitch</Label>
            <Select
              value={config.roofPitch.toString()}
              onValueChange={(value) => updateConfig({ roofPitch: Number(value) })}
            >
              <SelectTrigger id="roofPitch">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="4">4/12 (Low)</SelectItem>
                <SelectItem value="6">6/12 (Standard)</SelectItem>
                <SelectItem value="8">8/12 (Steep)</SelectItem>
                <SelectItem value="10">10/12 (Very Steep)</SelectItem>
                <SelectItem value="12">12/12 (45°)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="foundationType">Foundation</Label>
            <Select
              value={config.foundationType}
              onValueChange={(value) => updateConfig({ foundationType: value as FoundationType })}
            >
              <SelectTrigger id="foundationType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="skids">Skids (Most Common)</SelectItem>
                <SelectItem value="concrete-blocks">Concrete Blocks</SelectItem>
                <SelectItem value="gravel-pad">Gravel Pad</SelectItem>
                <SelectItem value="concrete-slab">Concrete Slab</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className={`flex items-center space-x-2 px-3 py-2 border-2 rounded-lg cursor-pointer transition-colors ${
            config.hasFloor
              ? 'border-green-600 bg-green-50'
              : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50'
          }`}>
            <Checkbox
              id="hasFloor"
              checked={config.hasFloor}
              onCheckedChange={(checked) => updateConfig({ hasFloor: checked as boolean })}
            />
            <Label htmlFor="hasFloor" className="text-sm font-normal cursor-pointer flex-1">
              Wooden floor (plywood decking)
            </Label>
          </div>

          <div className={`flex items-center space-x-2 px-3 py-2 border-2 rounded-lg cursor-pointer transition-colors ${
            config.hasLoft
              ? 'border-green-600 bg-green-50'
              : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50'
          }`}>
            <Checkbox
              id="hasLoft"
              checked={config.hasLoft}
              onCheckedChange={(checked) => updateConfig({ hasLoft: checked as boolean })}
            />
            <Label htmlFor="hasLoft" className="text-sm font-normal cursor-pointer flex-1">
              Storage loft (overhead storage)
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* Door */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Hammer className="w-4 h-4" />
            Door Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="doorType">Door Type</Label>
            <Select
              value={config.doorType}
              onValueChange={(value) => updateConfig({ doorType: value as DoorType })}
            >
              <SelectTrigger id="doorType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="single">Single Door</SelectItem>
                <SelectItem value="double">Double Doors</SelectItem>
                <SelectItem value="sliding-barn">Sliding Barn Door</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="doorWidth">Door Width (ft)</Label>
            <Select
              value={config.doorWidth.toString()}
              onValueChange={(value) => updateConfig({ doorWidth: Number(value) })}
            >
              <SelectTrigger id="doorWidth">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">3 ft (Single)</SelectItem>
                <SelectItem value="4">4 ft (Wide Single)</SelectItem>
                <SelectItem value="5">5 ft (Double)</SelectItem>
                <SelectItem value="6">6 ft (Wide Double)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="doorHeight">Door Height (ft)</Label>
            <Select
              value={config.doorHeight.toString()}
              onValueChange={(value) => updateConfig({ doorHeight: Number(value) })}
            >
              <SelectTrigger id="doorHeight">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="6">6 ft</SelectItem>
                <SelectItem value="6.5">6.5 ft</SelectItem>
                <SelectItem value="7">7 ft</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Materials */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Paintbrush className="w-4 h-4" />
            Materials
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="sidingType">Siding Type</Label>
            <Select
              value={config.sidingType}
              onValueChange={(value) => updateConfig({ sidingType: value as SidingType })}
            >
              <SelectTrigger id="sidingType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="vinyl">Vinyl Siding</SelectItem>
                <SelectItem value="wood">Wood Lap Siding</SelectItem>
                <SelectItem value="t1-11">T1-11 Plywood</SelectItem>
                <SelectItem value="metal">Metal Panels</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="roofingMaterial">Roofing Material</Label>
            <Select
              value={config.roofingMaterial}
              onValueChange={(value) => updateConfig({ roofingMaterial: value as any })}
            >
              <SelectTrigger id="roofingMaterial">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="asphalt-shingle">3-Tab Shingles</SelectItem>
                <SelectItem value="architectural-shingle">Architectural Shingles</SelectItem>
                <SelectItem value="metal">Metal Roofing</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Options */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Package className="w-4 h-4" />
            Additional Options
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className={`flex items-center space-x-2 px-3 py-2 border-2 rounded-lg cursor-pointer transition-colors ${
            config.hasShutters
              ? 'border-green-600 bg-green-50'
              : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50'
          }`}>
            <Checkbox
              id="hasShutters"
              checked={config.hasShutters}
              onCheckedChange={(checked) => updateConfig({ hasShutters: checked as boolean })}
            />
            <Label htmlFor="hasShutters" className="text-sm font-normal cursor-pointer flex-1">
              Decorative shutters
            </Label>
          </div>

          <div className={`flex items-center space-x-2 px-3 py-2 border-2 rounded-lg cursor-pointer transition-colors ${
            config.hasFlowerBox
              ? 'border-green-600 bg-green-50'
              : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50'
          }`}>
            <Checkbox
              id="hasFlowerBox"
              checked={config.hasFlowerBox}
              onCheckedChange={(checked) => updateConfig({ hasFlowerBox: checked as boolean })}
            />
            <Label htmlFor="hasFlowerBox" className="text-sm font-normal cursor-pointer flex-1">
              Window flower box
            </Label>
          </div>

          <div className={`flex items-center space-x-2 px-3 py-2 border-2 rounded-lg cursor-pointer transition-colors ${
            config.hasShelvingPackage
              ? 'border-green-600 bg-green-50'
              : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50'
          }`}>
            <Checkbox
              id="hasShelvingPackage"
              checked={config.hasShelvingPackage}
              onCheckedChange={(checked) => updateConfig({ hasShelvingPackage: checked as boolean })}
            />
            <Label htmlFor="hasShelvingPackage" className="text-sm font-normal cursor-pointer flex-1">
              Interior shelving package
            </Label>
          </div>

          <div className={`flex items-center space-x-2 px-3 py-2 border-2 rounded-lg cursor-pointer transition-colors ${
            config.hasElectrical
              ? 'border-green-600 bg-green-50'
              : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50'
          }`}>
            <Checkbox
              id="hasElectrical"
              checked={config.hasElectrical}
              onCheckedChange={(checked) => updateConfig({ hasElectrical: checked as boolean })}
            />
            <Label htmlFor="hasElectrical" className="text-sm font-normal cursor-pointer flex-1 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" />
              Electrical (light & outlet)
            </Label>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}