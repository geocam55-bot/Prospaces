import React from 'react';
import { ShedMaterials } from '../../types/shed';
import { Box, Hammer, Home, Paintbrush, DoorOpen, SquareStack, Wrench, Zap, Package, Layers } from 'lucide-react';

interface ShedMaterialsListProps {
  materials: ShedMaterials;
  compact?: boolean;
}

/** Render quantity with conversion context when applicable */
function QtyCell({ item }: { item: any }) {
  if (item.conversionFactor && item.conversionFactor !== 1 && item.convertedQuantity != null) {
    const displayQty = item.convertedQuantity < 1
      ? item.convertedQuantity.toFixed(4).replace(/0+$/, '').replace(/\.$/, '')
      : item.convertedQuantity.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
    return (
      <div className="text-right">
        <span className="text-amber-700 font-semibold">{displayQty}</span>
        {item.orderQuantity != null && item.orderQuantity !== item.convertedQuantity && (
          <span className="block text-xs text-muted-foreground">
            Order: {item.orderQuantity} {item.convertedUnit || 'units'}
          </span>
        )}
        <span className="block text-xs text-amber-600">
          ({item.quantity} {item.unit} × {item.conversionFactor})
        </span>
      </div>
    );
  }
  return <span>{item.quantity}</span>;
}

/** Render unit cell with converted unit when conversion is applied */
function UnitCell({ item }: { item: any }) {
  if (item.conversionFactor && item.conversionFactor !== 1 && item.convertedUnit) {
    return <span className="text-amber-700 font-medium">{item.convertedUnit}</span>;
  }
  return <span>{item.unit}</span>;
}

export function ShedMaterialsList({ materials, compact = false }: ShedMaterialsListProps) {
  const categories = [
    { key: 'foundation', label: 'Foundation', icon: Box, accent: 'text-blue-600', card: 'bg-blue-50 border-blue-200', items: materials.foundation || [] },
    { key: 'framing', label: 'Framing & Sheathing', icon: Hammer, accent: 'text-green-600', card: 'bg-green-50 border-green-200', items: materials.framing || [] },
    ...(materials.flooring ? [{ key: 'flooring', label: 'Flooring', icon: Layers, accent: 'text-emerald-600', card: 'bg-emerald-50 border-emerald-200', items: materials.flooring || [] }] : []),
    { key: 'roofing', label: 'Roofing', icon: Home, accent: 'text-purple-600', card: 'bg-purple-50 border-purple-200', items: materials.roofing || [] },
    { key: 'siding', label: 'Siding', icon: Paintbrush, accent: 'text-orange-600', card: 'bg-orange-50 border-orange-200', items: materials.siding || [] },
    { key: 'doors', label: 'Doors', icon: DoorOpen, accent: 'text-red-600', card: 'bg-red-50 border-red-200', items: materials.doors || [] },
    { key: 'windows', label: 'Windows', icon: SquareStack, accent: 'text-cyan-600', card: 'bg-cyan-50 border-cyan-200', items: materials.windows || [] },
    { key: 'trim', label: 'Trim & Fascia', icon: Package, accent: 'text-violet-600', card: 'bg-violet-50 border-violet-200', items: materials.trim || [] },
    { key: 'hardware', label: 'Hardware & Fasteners', icon: Wrench, accent: 'text-amber-600', card: 'bg-amber-50 border-amber-200', items: materials.hardware || [] },
    ...(materials.electrical ? [{ key: 'electrical', label: 'Electrical', icon: Zap, accent: 'text-indigo-600', card: 'bg-indigo-50 border-indigo-200', items: materials.electrical || [] }] : []),
    ...(materials.accessories ? [{ key: 'accessories', label: 'Accessories', icon: Package, accent: 'text-teal-600', card: 'bg-teal-50 border-teal-200', items: materials.accessories || [] }] : []),
  ];

  const allItems = categories.flatMap(category => category.items || []);

  if (compact) {
    return (
      <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {categories.map((category) => {
            const nonZeroItems = category.items.filter(item => item.quantity > 0);
            if (nonZeroItems.length === 0) return null;

            const Icon = category.icon;
            return (
              <div key={category.key} className={`${category.card} border rounded-lg p-3`}>
                <div className="flex items-center gap-2 text-foreground mb-1">
                  <Icon className="w-4 h-4" />
                  <span className="text-xs">{category.label}</span>
                </div>
                <div className="text-foreground">{nonZeroItems.length} items</div>
              </div>
            );
          })}
        </div>

        <div className="bg-muted border border-border rounded-lg p-3">
          <div className="flex justify-between items-center">
            <span className="text-foreground text-sm">Total Material Items:</span>
            <span className="text-foreground">{allItems.length}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 print:space-y-4">
      <div className="flex items-center justify-between print:hidden">
        <h2 className="text-foreground">Bill of Materials</h2>
        <span className="text-sm text-muted-foreground">{allItems.length} total items</span>
      </div>

      {categories.map((category) => {
          const nonZeroItems = category.items.filter(item => item.quantity > 0);
          if (nonZeroItems.length === 0) return null;

          const Icon = category.icon;
          return (
            <div key={category.key}>
              <div className="flex items-center gap-2 mb-3">
                <Icon className={`w-5 h-5 ${category.accent}`} />
                <h3 className="text-foreground">{category.label}</h3>
              </div>
              <div className="overflow-x-auto print:overflow-visible">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-3 text-sm text-muted-foreground">SKU</th>
                      <th className="text-left py-2 px-3 text-sm text-muted-foreground">Description</th>
                      <th className="text-right py-2 px-3 text-sm text-muted-foreground">Qty</th>
                      <th className="text-left py-2 px-3 text-sm text-muted-foreground">Unit</th>
                      <th className="text-right py-2 px-3 text-sm text-muted-foreground">Unit Price</th>
                      <th className="text-right py-2 px-3 text-sm text-muted-foreground">Total</th>
                      <th className="text-left py-2 px-3 text-sm text-muted-foreground">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {nonZeroItems.map((item, index) => (
                      <tr key={index} className="border-b border-border hover:bg-muted">
                        <td className="py-2 px-3 text-muted-foreground text-sm">{item.sku || '—'}</td>
                        <td className="py-2 px-3 text-foreground">{item.description}</td>
                        <td className="py-2 px-3 text-foreground text-right"><QtyCell item={item} /></td>
                        <td className="py-2 px-3 text-muted-foreground"><UnitCell item={item} /></td>
                        <td className="py-2 px-3 text-foreground text-right">{item.unitPrice != null ? `$${item.unitPrice.toFixed(2)}` : '—'}</td>
                        <td className="py-2 px-3 text-foreground text-right">{item.totalCost != null ? `$${item.totalCost.toFixed(2)}` : '—'}</td>
                        <td className="py-2 px-3 text-muted-foreground text-sm">{item.notes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 print:border-2 print:border-amber-600">
        <h4 className="text-amber-900 mb-2">Important Notes</h4>
        <ul className="text-amber-800 text-sm space-y-1 list-disc list-inside">
          <li>All quantities include typical waste factors (5-15% depending on material)</li>
          <li>Verify all measurements before ordering materials</li>
          <li>Check local building codes - some areas require permits for sheds over certain sizes</li>
          <li>Consider pressure-treated lumber for all ground-contact applications</li>
          <li>Prices vary by region and supplier - get quotes from multiple sources</li>
          <li>This is a DIY-friendly project with basic carpentry skills</li>
        </ul>
      </div>
    </div>
  );
}