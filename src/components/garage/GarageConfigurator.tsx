import React from 'react';
import { GarageConfig, GarageBays, RoofStyle, SidingType, WallFraming } from '../../types/garage';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Checkbox } from '../ui/checkbox';
import { Ruler, Home, Hammer, Paintbrush, Zap } from 'lucide-react';

interface GarageConfiguratorProps {
  config: GarageConfig;
  onChange: (config: GarageConfig) => void;
}

export function GarageConfigurator({ config, onChange }: GarageConfiguratorProps) {
  const updateConfig = (updates: Partial<GarageConfig>) => {
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
              min="10"
              max="40"
              value={config.width}
              onChange={(e) => updateConfig({ width: Number(e.target.value) })}
            />
            <p className="text-xs text-slate-500 mt-1">Typical: 12-24 ft</p>
          </div>

          <div>
            <Label htmlFor="length">Length/Depth (ft)</Label>
            <Input
              id="length"
              type="number"
              min="10"
              max="40"
              value={config.length}
              onChange={(e) => updateConfig({ length: Number(e.target.value) })}
            />
            <p className="text-xs text-slate-500 mt-1">Typical: 20-24 ft</p>
          </div>

          <div>
            <Label htmlFor="height">Wall Height (ft)</Label>
            <Select
              value={config.height.toString()}
              onValueChange={(value) => updateConfig({ height: Number(value) })}
            >
              <SelectTrigger id="height">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="8">8 ft (Standard)</SelectItem>
                <SelectItem value="9">9 ft</SelectItem>
                <SelectItem value="10">10 ft (Tall)</SelectItem>
                <SelectItem value="12">12 ft (Extra Tall)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="bays">Number of Bays</Label>
            <Select
              value={config.bays.toString()}
              onValueChange={(value) => updateConfig({ bays: Number(value) as GarageBays })}
            >
              <SelectTrigger id="bays">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Single Bay (1 car)</SelectItem>
                <SelectItem value="2">Double Bay (2 cars)</SelectItem>
                <SelectItem value="3">Triple Bay (3 cars)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Structure */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Home className="w-4 h-4" />
            Structure
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="roofStyle">Roof Style</Label>
            <Select
              value={config.roofStyle}
              onValueChange={(value) => updateConfig({ roofStyle: value as RoofStyle })}
            >
              <SelectTrigger id="roofStyle">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gable">Gable (Standard)</SelectItem>
                <SelectItem value="hip">Hip</SelectItem>
                <SelectItem value="gambrel">Gambrel (Barn Style)</SelectItem>
                <SelectItem value="flat">Flat</SelectItem>
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
                <SelectItem value="4">4/12 (Low Pitch)</SelectItem>
                <SelectItem value="6">6/12 (Standard)</SelectItem>
                <SelectItem value="8">8/12 (Steep)</SelectItem>
                <SelectItem value="10">10/12 (Very Steep)</SelectItem>
                <SelectItem value="12">12/12 (45°)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="wallFraming">Wall Framing</Label>
            <Select
              value={config.wallFraming}
              onValueChange={(value) => updateConfig({ wallFraming: value as WallFraming })}
            >
              <SelectTrigger id="wallFraming">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2x4">2x4 (Standard)</SelectItem>
                <SelectItem value="2x6">2x6 (Better Insulation)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="hasAtticTrusses"
              checked={config.hasAtticTrusses}
              onCheckedChange={(checked) => updateConfig({ hasAtticTrusses: checked as boolean })}
            />
            <Label htmlFor="hasAtticTrusses" className="text-sm font-normal cursor-pointer">
              Attic trusses (storage space)
            </Label>
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
                <SelectItem value="vinyl">Vinyl (Most Common)</SelectItem>
                <SelectItem value="wood">Wood/LP SmartSide</SelectItem>
                <SelectItem value="metal">Metal Panels</SelectItem>
                <SelectItem value="fiber-cement">Fiber Cement</SelectItem>
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
                <SelectItem value="asphalt-shingle">Asphalt Shingles</SelectItem>
                <SelectItem value="metal">Metal Roofing</SelectItem>
                <SelectItem value="rubber">Rubber Membrane</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Options */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Hammer className="w-4 h-4" />
            Additional Options
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="hasWalkDoor"
              checked={config.hasWalkDoor}
              onCheckedChange={(checked) => updateConfig({ hasWalkDoor: checked as boolean })}
            />
            <Label htmlFor="hasWalkDoor" className="text-sm font-normal cursor-pointer">
              Walk-in door
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="isInsulated"
              checked={config.isInsulated}
              onCheckedChange={(checked) => updateConfig({ isInsulated: checked as boolean })}
            />
            <Label htmlFor="isInsulated" className="text-sm font-normal cursor-pointer">
              Insulated walls & ceiling
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="hasElectrical"
              checked={config.hasElectrical}
              onCheckedChange={(checked) => updateConfig({ hasElectrical: checked as boolean })}
            />
            <Label htmlFor="hasElectrical" className="text-sm font-normal cursor-pointer flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" />
              Electrical (lights & outlets)
            </Label>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
