import React from 'react';
import { KitchenConfig } from '../../types/kitchen';

interface PrintableKitchenDesignProps {
  config: KitchenConfig;
  materials: any; // We'll just pass in the calculated materials
  totalCost: number;
  customerName?: string;
  customerCompany?: string;
  description?: string;
  designName?: string;
  snapshotUrl?: string; // Add this prop for the 3D snapshot
}

export function PrintableKitchenDesign({
  config,
  materials,
  totalCost,
  customerName,
  customerCompany,
  description,
  designName,
  snapshotUrl,
}: PrintableKitchenDesignProps) {
  
  // Create a flattened list of materials for printing
  const getFlatMaterials = () => {
    if (Array.isArray(materials)) return materials;
    const all = [];
    if (materials?.cabinets) all.push(...materials.cabinets);
    if (materials?.appliances) all.push(...materials.appliances);
    if (materials?.hardware) all.push(...materials.hardware);
    if (materials?.countertops) all.push(...materials.countertops);
    return all;
  };

  const flatMaterials = getFlatMaterials();

  return (
    <div className="hidden print:block print:pt-8">
      {/* Header */}
      <div className="border-b-2 border-black pb-4 mb-6 print:mt-8">
        <h1 className="text-3xl font-bold mb-2">Kitchen Plan & Materials List</h1>
        <div className="text-sm text-gray-800">
          <p>Date: {new Date().toLocaleDateString()}</p>
          <p>Project Type: Kitchen Remodel</p>
        </div>
      </div>

      {/* Customer Information (if saved design) */}
      {customerName && (
        <div className="mb-6 p-4 border border-gray-300 bg-gray-50">
          <h2 className="text-lg font-bold text-black mb-3">Customer Information</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-semibold text-gray-700">Customer Name:</p>
              <p className="text-black">{customerName}</p>
            </div>
            {customerCompany && (
              <div>
                <p className="font-semibold text-gray-700">Company:</p>
                <p className="text-black">{customerCompany}</p>
              </div>
            )}
          </div>
          {description && (
            <div className="mt-3">
              <p className="font-semibold text-gray-700">Description:</p>
              <p className="text-black mt-1">{description}</p>
            </div>
          )}
        </div>
      )}

      {/* Project Specifications */}
      <div className="mb-6 p-4 border border-gray-300">
        <h2 className="text-lg font-bold text-black mb-3">Project Specifications</h2>
        <div className="grid grid-cols-3 gap-x-6 gap-y-3 text-sm">
          <div>
            <p className="font-semibold text-gray-700">Room Dimensions:</p>
            <p className="text-black">{config.roomWidth}' × {config.roomLength}'</p>
          </div>
          <div>
            <p className="font-semibold text-gray-700">Ceiling Height:</p>
            <p className="text-black">{config.roomHeight}'</p>
          </div>
          <div>
            <p className="font-semibold text-gray-700">Cabinet Count:</p>
            <p className="text-black">{config.cabinets?.length || 0}</p>
          </div>
          <div>
            <p className="font-semibold text-gray-700">Appliance Count:</p>
            <p className="text-black">{config.appliances?.length || 0}</p>
          </div>
        </div>
      </div>

      {/* 3D Snapshot */}
      {snapshotUrl && (
        <div className="mb-8 print:break-inside-avoid">
          <h2 className="text-xl font-bold mb-4 border-b border-gray-300 pb-2">3D Render</h2>
          <div className="border-2 border-gray-200 rounded-lg p-2 bg-gray-50">
            <img src={snapshotUrl} alt="3D Deck Render" className="w-full h-auto object-contain max-h-[600px]" />
          </div>
        </div>
      )}

      {/* Materials List */}
      <div className="print:break-before-auto">
        <h2 className="text-xl font-bold mb-4 border-b border-gray-300 pb-2">Materials & Components</h2>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-100 border-b-2 border-gray-400">
              <th className="text-left py-2 px-3 font-bold">Item</th>
              <th className="text-right py-2 px-3 font-bold">Qty</th>
              <th className="text-right py-2 px-3 font-bold">Unit Price</th>
              <th className="text-right py-2 px-3 font-bold">Total</th>
            </tr>
          </thead>
          <tbody>
            {flatMaterials.map((item, index) => (
              <tr key={index} className="border-b border-gray-200">
                <td className="py-2 px-3">
                  <div className="font-medium text-black">{item.description || item.name}</div>
                  {item.sku && <div className="text-xs text-gray-500">SKU: {item.sku}</div>}
                </td>
                <td className="text-right py-2 px-3">{item.quantity}</td>
                <td className="text-right py-2 px-3">${(item.price || 0).toFixed(2)}</td>
                <td className="text-right py-2 px-3">${((item.price || 0) * (item.quantity || 1)).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-100 font-bold border-t-2 border-black">
              <td colSpan={3} className="text-right py-3 px-3">Estimated Total:</td>
              <td className="text-right py-3 px-3">${totalCost.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
        <p className="text-xs text-gray-500 mt-4 text-center">
          Prices are estimates based on standard Tier 1 pricing. Actual costs may vary based on market conditions, labor, and specific material selections.
        </p>
      </div>
    </div>
  );
}