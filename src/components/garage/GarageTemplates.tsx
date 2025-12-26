import React from 'react';
import { GarageConfig } from '../../types/garage';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Car, TrendingUp, Warehouse, Building2 } from 'lucide-react';

interface GarageTemplatesProps {
  onLoadTemplate: (config: GarageConfig) => void;
}

export function GarageTemplates({ onLoadTemplate }: GarageTemplatesProps) {
  const templates: Array<{ name: string; description: string; icon: any; config: GarageConfig }> = [
    {
      name: 'Basic Single',
      description: '12×20 single bay',
      icon: Car,
      config: {
        width: 12,
        length: 20,
        height: 8,
        bays: 1,
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
            offsetFromLeft: 1.5,
          },
        ],
        windows: [],
        hasWalkDoor: true,
        walkDoorPosition: 'front',
        sidingType: 'vinyl',
        roofingMaterial: 'asphalt-shingle',
        hasAtticTrusses: false,
        isInsulated: false,
        hasElectrical: false,
        unit: 'feet',
      },
    },
    {
      name: 'Standard Double',
      description: '20×20 two car garage',
      icon: TrendingUp,
      config: {
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
      },
    },
    {
      name: 'Deluxe Double',
      description: '24×24 with storage',
      icon: Warehouse,
      config: {
        width: 24,
        length: 24,
        height: 10,
        bays: 2,
        roofStyle: 'gable',
        roofPitch: 8,
        wallFraming: '2x6',
        doors: [
          {
            id: '1',
            type: 'overhead',
            width: 10,
            height: 8,
            position: 'front',
            offsetFromLeft: 1,
          },
          {
            id: '2',
            type: 'overhead',
            width: 10,
            height: 8,
            position: 'front',
            offsetFromLeft: 12,
          },
        ],
        windows: [
          {
            id: '1',
            width: 3,
            height: 3,
            position: 'left',
            offsetFromLeft: 10,
            offsetFromFloor: 5,
          },
          {
            id: '2',
            width: 3,
            height: 3,
            position: 'right',
            offsetFromLeft: 10,
            offsetFromFloor: 5,
          },
          {
            id: '3',
            width: 4,
            height: 3,
            position: 'back',
            offsetFromLeft: 10,
            offsetFromFloor: 5,
          },
        ],
        hasWalkDoor: true,
        walkDoorPosition: 'side',
        sidingType: 'fiber-cement',
        roofingMaterial: 'asphalt-shingle',
        hasAtticTrusses: true,
        isInsulated: true,
        hasElectrical: true,
        unit: 'feet',
      },
    },
    {
      name: 'Triple Bay',
      description: '30×24 three car garage',
      icon: Building2,
      config: {
        width: 30,
        length: 24,
        height: 10,
        bays: 3,
        roofStyle: 'hip',
        roofPitch: 6,
        wallFraming: '2x6',
        doors: [
          {
            id: '1',
            type: 'overhead',
            width: 9,
            height: 8,
            position: 'front',
            offsetFromLeft: 1,
          },
          {
            id: '2',
            type: 'overhead',
            width: 9,
            height: 8,
            position: 'front',
            offsetFromLeft: 10.5,
          },
          {
            id: '3',
            type: 'overhead',
            width: 9,
            height: 8,
            position: 'front',
            offsetFromLeft: 20,
          },
        ],
        windows: [
          {
            id: '1',
            width: 3,
            height: 2,
            position: 'left',
            offsetFromLeft: 10,
            offsetFromFloor: 6,
          },
          {
            id: '2',
            width: 3,
            height: 2,
            position: 'right',
            offsetFromLeft: 10,
            offsetFromFloor: 6,
          },
        ],
        hasWalkDoor: true,
        walkDoorPosition: 'side',
        sidingType: 'vinyl',
        roofingMaterial: 'metal',
        hasAtticTrusses: false,
        isInsulated: true,
        hasElectrical: true,
        unit: 'feet',
      },
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Quick Start Templates</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {templates.map((template) => {
          const Icon = template.icon;
          return (
            <Button
              key={template.name}
              variant="outline"
              className="w-full justify-start h-auto py-3"
              onClick={() => onLoadTemplate(template.config)}
            >
              <div className="flex items-start gap-3 text-left">
                <Icon className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium text-slate-900">{template.name}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{template.description}</div>
                </div>
              </div>
            </Button>
          );
        })}
      </CardContent>
    </Card>
  );
}
