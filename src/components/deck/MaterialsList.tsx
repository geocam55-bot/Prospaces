import React from 'react';
import { DeckMaterials } from '../../types/deck';
import { Package, Wrench, Fence, Hammer } from 'lucide-react';

interface MaterialsListProps {
  materials: DeckMaterials;
  compact?: boolean;
}

export function MaterialsList({ materials, compact = false }: MaterialsListProps) {
  const allItems = [
    ...(materials.framing || []),
    ...(materials.decking || []),
    ...(materials.railing || []),
    ...(materials.hardware || []),
  ];

  const categoryIcons: Record<string, React.ReactNode> = {
    'Framing': <Hammer className="w-4 h-4" />,
    'Decking': <Package className="w-4 h-4" />,
    'Stairs': <Package className="w-4 h-4" />,
    'Railing': <Fence className="w-4 h-4" />,
    'Hardware': <Wrench className="w-4 h-4" />,
  };

  if (compact) {
    return (
      <div className="space-y-3">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center gap-2 text-blue-700 mb-1">
              <Hammer className="w-4 h-4" />
              <span className="text-xs">Framing</span>
            </div>
            <div className="text-blue-900">{materials.framing.length} items</div>
          </div>
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center gap-2 text-green-700 mb-1">
              <Package className="w-4 h-4" />
              <span className="text-xs">Decking</span>
            </div>
            <div className="text-green-900">{materials.decking.length} items</div>
          </div>
          
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
            <div className="flex items-center gap-2 text-purple-700 mb-1">
              <Fence className="w-4 h-4" />
              <span className="text-xs">Railing</span>
            </div>
            <div className="text-purple-900">{materials.railing.length} items</div>
          </div>
          
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
            <div className="flex items-center gap-2 text-orange-700 mb-1">
              <Wrench className="w-4 h-4" />
              <span className="text-xs">Hardware</span>
            </div>
            <div className="text-orange-900">{materials.hardware.length} items</div>
          </div>
        </div>

        {/* Total Items */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
          <div className="flex justify-between items-center">
            <span className="text-slate-700 text-sm">Total Material Items:</span>
            <span className="text-slate-900">{allItems.length}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 print:space-y-4">
      <div className="flex items-center justify-between print:hidden">
        <h2 className="text-slate-900">Bill of Materials</h2>
        <span className="text-sm text-slate-600">{allItems.length} total items</span>
      </div>

      {/* Framing */}
      {materials.framing.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Hammer className="w-5 h-5 text-blue-600" />
            <h3 className="text-slate-900">Framing</h3>
          </div>
          <div className="overflow-x-auto print:overflow-visible">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-2 px-3 text-sm text-slate-600">SKU</th>
                  <th className="text-left py-2 px-3 text-sm text-slate-600">Description</th>
                  <th className="text-right py-2 px-3 text-sm text-slate-600">Qty</th>
                  <th className="text-left py-2 px-3 text-sm text-slate-600">Unit</th>
                  <th className="text-right py-2 px-3 text-sm text-slate-600">Unit Price</th>
                  <th className="text-right py-2 px-3 text-sm text-slate-600">Total</th>
                  <th className="text-left py-2 px-3 text-sm text-slate-600">Notes</th>
                </tr>
              </thead>
              <tbody>
                {materials.framing.filter(item => item.quantity > 0).map((item, idx) => (
                  <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-2 px-3 text-slate-600 text-sm">{item.sku || '—'}</td>
                    <td className="py-2 px-3 text-slate-900">{item.description}</td>
                    <td className="py-2 px-3 text-slate-900 text-right">{item.quantity}</td>
                    <td className="py-2 px-3 text-slate-600">{item.unit}</td>
                    <td className="py-2 px-3 text-slate-900 text-right">{item.unitPrice ? `$${item.unitPrice.toFixed(2)}` : '—'}</td>
                    <td className="py-2 px-3 text-slate-900 text-right">{item.totalCost ? `$${item.totalCost.toFixed(2)}` : '—'}</td>
                    <td className="py-2 px-3 text-slate-600 text-sm">{item.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Decking */}
      {materials.decking.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Package className="w-5 h-5 text-green-600" />
            <h3 className="text-slate-900">Decking</h3>
          </div>
          <div className="overflow-x-auto print:overflow-visible">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-2 px-3 text-sm text-slate-600">SKU</th>
                  <th className="text-left py-2 px-3 text-sm text-slate-600">Description</th>
                  <th className="text-right py-2 px-3 text-sm text-slate-600">Qty</th>
                  <th className="text-left py-2 px-3 text-sm text-slate-600">Unit</th>
                  <th className="text-right py-2 px-3 text-sm text-slate-600">Unit Price</th>
                  <th className="text-right py-2 px-3 text-sm text-slate-600">Total</th>
                  <th className="text-left py-2 px-3 text-sm text-slate-600">Notes</th>
                </tr>
              </thead>
              <tbody>
                {materials.decking.filter(item => item.quantity > 0).map((item, idx) => (
                  <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-2 px-3 text-slate-600 text-sm">{item.sku || '—'}</td>
                    <td className="py-2 px-3 text-slate-900">{item.description}</td>
                    <td className="py-2 px-3 text-slate-900 text-right">{item.quantity}</td>
                    <td className="py-2 px-3 text-slate-600">{item.unit}</td>
                    <td className="py-2 px-3 text-slate-900 text-right">{item.unitPrice ? `$${item.unitPrice.toFixed(2)}` : '—'}</td>
                    <td className="py-2 px-3 text-slate-900 text-right">{item.totalCost ? `$${item.totalCost.toFixed(2)}` : '—'}</td>
                    <td className="py-2 px-3 text-slate-600 text-sm">{item.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Railing */}
      {materials.railing.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Fence className="w-5 h-5 text-purple-600" />
            <h3 className="text-slate-900">Railing</h3>
          </div>
          <div className="overflow-x-auto print:overflow-visible">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-2 px-3 text-sm text-slate-600">SKU</th>
                  <th className="text-left py-2 px-3 text-sm text-slate-600">Description</th>
                  <th className="text-right py-2 px-3 text-sm text-slate-600">Qty</th>
                  <th className="text-left py-2 px-3 text-sm text-slate-600">Unit</th>
                  <th className="text-right py-2 px-3 text-sm text-slate-600">Unit Price</th>
                  <th className="text-right py-2 px-3 text-sm text-slate-600">Total</th>
                  <th className="text-left py-2 px-3 text-sm text-slate-600">Notes</th>
                </tr>
              </thead>
              <tbody>
                {materials.railing.filter(item => item.quantity > 0).map((item, idx) => (
                  <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-2 px-3 text-slate-600 text-sm">{item.sku || '—'}</td>
                    <td className="py-2 px-3 text-slate-900">{item.description}</td>
                    <td className="py-2 px-3 text-slate-900 text-right">{item.quantity}</td>
                    <td className="py-2 px-3 text-slate-600">{item.unit}</td>
                    <td className="py-2 px-3 text-slate-900 text-right">{item.unitPrice ? `$${item.unitPrice.toFixed(2)}` : '—'}</td>
                    <td className="py-2 px-3 text-slate-900 text-right">{item.totalCost ? `$${item.totalCost.toFixed(2)}` : '—'}</td>
                    <td className="py-2 px-3 text-slate-600 text-sm">{item.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Hardware */}
      {materials.hardware.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Wrench className="w-5 h-5 text-orange-600" />
            <h3 className="text-slate-900">Hardware & Fasteners</h3>
          </div>
          <div className="overflow-x-auto print:overflow-visible">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-2 px-3 text-sm text-slate-600">SKU</th>
                  <th className="text-left py-2 px-3 text-sm text-slate-600">Description</th>
                  <th className="text-right py-2 px-3 text-sm text-slate-600">Qty</th>
                  <th className="text-left py-2 px-3 text-sm text-slate-600">Unit</th>
                  <th className="text-right py-2 px-3 text-sm text-slate-600">Unit Price</th>
                  <th className="text-right py-2 px-3 text-sm text-slate-600">Total</th>
                  <th className="text-left py-2 px-3 text-sm text-slate-600">Notes</th>
                </tr>
              </thead>
              <tbody>
                {materials.hardware.filter(item => item.quantity > 0).map((item, idx) => (
                  <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-2 px-3 text-slate-600 text-sm">{item.sku || '—'}</td>
                    <td className="py-2 px-3 text-slate-900">{item.description}</td>
                    <td className="py-2 px-3 text-slate-900 text-right">{item.quantity}</td>
                    <td className="py-2 px-3 text-slate-600">{item.unit}</td>
                    <td className="py-2 px-3 text-slate-900 text-right">{item.unitPrice ? `$${item.unitPrice.toFixed(2)}` : '—'}</td>
                    <td className="py-2 px-3 text-slate-900 text-right">{item.totalCost ? `$${item.totalCost.toFixed(2)}` : '—'}</td>
                    <td className="py-2 px-3 text-slate-600 text-sm">{item.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Important Notes */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 print:border-2 print:border-amber-600">
        <h4 className="text-amber-900 mb-2">Important Notes</h4>
        <ul className="text-amber-800 text-sm space-y-1 list-disc list-inside">
          <li>All quantities are estimates and should be verified before ordering</li>
          <li>Material calculations include typical waste factors</li>
          <li>Consult local building codes for specific requirements</li>
          <li>Professional installation recommended for safety and compliance</li>
          <li>Concrete footings required for all posts (not included in list)</li>
        </ul>
      </div>
    </div>
  );
}