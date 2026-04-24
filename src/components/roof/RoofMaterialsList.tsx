import React from 'react';
import { RoofMaterials } from '../../types/roof';
import { Square, Layers, Home, Triangle, ShieldAlert, Wind, Wrench } from 'lucide-react';

interface RoofMaterialsListProps {
  materials: RoofMaterials;
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
        <span className="text-amber-700 font-semibold">{displayQty}</span>{' '}
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

export function RoofMaterialsList({ materials, compact = false }: RoofMaterialsListProps) {
  const categories = [
    { key: 'roofDeck', label: 'Roof Deck', icon: Square, accent: 'text-blue-600', card: 'bg-blue-50 border-blue-200', items: materials.roofDeck || [] },
    { key: 'underlayment', label: 'Underlayment', icon: Layers, accent: 'text-purple-600', card: 'bg-purple-50 border-purple-200', items: materials.underlayment || [] },
    { key: 'shingles', label: 'Shingles', icon: Home, accent: 'text-orange-600', card: 'bg-orange-50 border-orange-200', items: materials.shingles || [] },
    { key: 'ridgeAndHip', label: 'Ridge & Hip', icon: Triangle, accent: 'text-red-600', card: 'bg-red-50 border-red-200', items: materials.ridgeAndHip || [] },
    { key: 'flashing', label: 'Flashing', icon: ShieldAlert, accent: 'text-yellow-600', card: 'bg-yellow-50 border-yellow-200', items: materials.flashing || [] },
    { key: 'ventilation', label: 'Ventilation', icon: Wind, accent: 'text-green-600', card: 'bg-green-50 border-green-200', items: materials.ventilation || [] },
    { key: 'hardware', label: 'Hardware & Accessories', icon: Wrench, accent: 'text-amber-600', card: 'bg-amber-50 border-amber-200', items: materials.hardware || [] },
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
          <li>Material calculations include waste factor as configured</li>
          <li>Verify all measurements before ordering materials</li>
          <li>Check local building codes for specific requirements</li>
          <li>Consider weather conditions and roof accessibility</li>
          <li>Professional installation recommended for safety</li>
          <li>Additional materials may be needed for repairs or special conditions</li>
        </ul>
      </div>
    </div>
  );
}