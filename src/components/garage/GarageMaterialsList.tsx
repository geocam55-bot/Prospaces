import React from 'react';
import { GarageMaterials } from '../../types/garage';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Box, Hammer, Home, Paintbrush, DoorOpen, SquareStack, Wrench, Zap, Wind } from 'lucide-react';

interface GarageMaterialsListProps {
  materials: GarageMaterials;
  compact?: boolean;
}

export function GarageMaterialsList({ materials, compact = false }: GarageMaterialsListProps) {
  const categories = [
    { key: 'foundation', label: 'Foundation', icon: Box, items: materials.foundation },
    { key: 'framing', label: 'Framing', icon: Hammer, items: materials.framing },
    { key: 'roofing', label: 'Roofing', icon: Home, items: materials.roofing },
    { key: 'siding', label: 'Siding & Trim', icon: Paintbrush, items: materials.siding },
    { key: 'doors', label: 'Doors', icon: DoorOpen, items: materials.doors },
    { key: 'windows', label: 'Windows', icon: SquareStack, items: materials.windows },
    { key: 'hardware', label: 'Hardware & Fasteners', icon: Wrench, items: materials.hardware },
    ...(materials.electrical ? [{ key: 'electrical', label: 'Electrical', icon: Zap, items: materials.electrical }] : []),
    ...(materials.insulation ? [{ key: 'insulation', label: 'Insulation', icon: Wind, items: materials.insulation }] : []),
  ];

  if (compact) {
    return (
      <div className="space-y-6">
        {categories.map((category) => {
          if (category.items.length === 0) return null;
          
          const Icon = category.icon;
          return (
            <div key={category.key}>
              <h3 className="flex items-center gap-2 mb-3 text-slate-900">
                <Icon className="w-4 h-4" />
                {category.label}
              </h3>
              <div className="space-y-2">
                {category.items.map((item, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-start text-sm py-2 border-b border-slate-100 last:border-0"
                  >
                    <div className="flex-1">
                      <div className="text-slate-900">{item.description}</div>
                      {item.notes && (
                        <div className="text-xs text-slate-500 mt-0.5">{item.notes}</div>
                      )}
                    </div>
                    <div className="ml-4 text-right font-medium text-slate-700 whitespace-nowrap">
                      {item.quantity} {item.unit}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-slate-900 mb-2">Complete Materials List</h2>
        <p className="text-slate-600 text-sm">
          Estimated materials needed for your garage build. Quantities include typical waste factors.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {categories.map((category) => {
          if (category.items.length === 0) return null;
          
          const Icon = category.icon;
          return (
            <Card key={category.key}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Icon className="w-4 h-4" />
                  {category.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {category.items.map((item, index) => (
                    <div key={index} className="border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                      <div className="flex justify-between items-start mb-1">
                        <div className="font-medium text-slate-900 text-sm">
                          {item.description}
                        </div>
                        <div className="ml-4 font-semibold text-blue-600 whitespace-nowrap">
                          {item.quantity} {item.unit}
                        </div>
                      </div>
                      {item.notes && (
                        <div className="text-xs text-slate-500">{item.notes}</div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-lg">ℹ</span>
            </div>
            <div className="flex-1">
              <h3 className="text-blue-900 mb-1">Important Notes</h3>
              <ul className="text-blue-800 text-sm space-y-1">
                <li>• All quantities include typical waste factors (5-15% depending on material)</li>
                <li>• Verify all measurements and local building code requirements before ordering</li>
                <li>• Prices and availability may vary by location and supplier</li>
                <li>• Consider hiring licensed contractors for foundation, electrical, and structural work</li>
                <li>• Building permits are typically required - check with your local building department</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
