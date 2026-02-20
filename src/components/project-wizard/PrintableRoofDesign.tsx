import React from 'react';
import { RoofConfig, RoofMaterials } from '../../types/roof';
import { RoofCanvas } from '../roof/RoofCanvas';
import { formatRoofArea, getPitchDescription } from '../../utils/roofCalculations';

interface PrintableRoofDesignProps {
  config: RoofConfig;
  materials: RoofMaterials;
  totalCost?: number;
  designName?: string;
  description?: string;
  customerName?: string;
  customerCompany?: string;
}

export function PrintableRoofDesign({
  config,
  materials,
  totalCost,
  designName,
  description,
  customerName,
  customerCompany,
}: PrintableRoofDesignProps) {
  return (
    <div className="hidden print:block print:pt-8">
      {/* Header */}
      <div className="border-b-2 border-black pb-4 mb-6 print:mt-8">
        <h1 className="text-3xl font-bold mb-2">Roof Plan & Materials List</h1>
        {designName && <h2 className="text-xl mb-2">{designName}</h2>}
        {customerName && (
          <div className="text-sm">
            <p><strong>Customer:</strong> {customerName}</p>
            {customerCompany && <p><strong>Company:</strong> {customerCompany}</p>}
          </div>
        )}
        {description && (
          <p className="text-sm mt-2 text-gray-700">{description}</p>
        )}
        <p className="text-sm mt-2">
          <strong>Date:</strong> {new Date().toLocaleDateString()}
        </p>
      </div>

      {/* Roof Specifications */}
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-3 border-b border-black">Roof Specifications</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p><strong>Building Length:</strong> {config.length} ft</p>
            <p><strong>Building Width:</strong> {config.width} ft</p>
            <p><strong>Roof Style:</strong> {config.style.charAt(0).toUpperCase() + config.style.slice(1).replace('-', ' ')}</p>
            <p><strong>Roof Pitch:</strong> {getPitchDescription(config.pitch)}</p>
          </div>
          <div>
            <p><strong>Total Roof Area:</strong> {formatRoofArea(config)}</p>
            <p><strong>Eave Overhang:</strong> {config.eaveOverhang} ft</p>
            <p><strong>Rake Overhang:</strong> {config.rakeOverhang} ft</p>
            <p><strong>Waste Factor:</strong> {(config.wasteFactor * 100).toFixed(0)}%</p>
          </div>
        </div>
        <div className="mt-3 text-sm">
          <p><strong>Shingle Type:</strong> {config.shingleType.replace('-', ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</p>
          <p><strong>Underlayment:</strong> {config.underlaymentType.replace('-', ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</p>
          {config.hasValleys && <p><strong>Valleys:</strong> {config.valleyCount}</p>}
          {config.hasSkylight && <p><strong>Skylights:</strong> {config.skylightCount}</p>}
          {config.hasChimney && <p><strong>Chimneys:</strong> {config.chimneyCount}</p>}
        </div>
      </div>

      {/* Roof Plan */}
      <div className="mb-6">
        <div className="w-full">
          <RoofCanvas config={config} />
        </div>
      </div>

      {/* Materials List */}
      <div className="mb-6 print:break-before-page">
        <h2 className="text-xl font-bold mb-3 border-b border-black">Materials List</h2>
        
        {/* Roof Deck */}
        {materials.roofDeck.length > 0 && (
          <div className="mb-4">
            <h3 className="font-bold text-sm mb-2">1. ROOF DECK</h3>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 p-1 text-left">Description</th>
                  <th className="border border-gray-300 p-1 text-right">Qty</th>
                  <th className="border border-gray-300 p-1 text-left">Unit</th>
                  {totalCost ? <th className="border border-gray-300 p-1 text-right">Cost</th> : null}
                </tr>
              </thead>
              <tbody>
                {materials.roofDeck.map((item, idx) => (
                  <tr key={idx}>
                    <td className="border border-gray-300 p-1">{item.description}</td>
                    <td className="border border-gray-300 p-1 text-right">{item.quantity}</td>
                    <td className="border border-gray-300 p-1">{item.unit}</td>
                    {totalCost ? <td className="border border-gray-300 p-1 text-right">{item.totalCost ? `$${item.totalCost.toFixed(2)}` : '-'}</td> : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Underlayment */}
        {materials.underlayment.length > 0 && (
          <div className="mb-4">
            <h3 className="font-bold text-sm mb-2">2. UNDERLAYMENT</h3>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 p-1 text-left">Description</th>
                  <th className="border border-gray-300 p-1 text-right">Qty</th>
                  <th className="border border-gray-300 p-1 text-left">Unit</th>
                  {totalCost ? <th className="border border-gray-300 p-1 text-right">Cost</th> : null}
                </tr>
              </thead>
              <tbody>
                {materials.underlayment.map((item, idx) => (
                  <tr key={idx}>
                    <td className="border border-gray-300 p-1">{item.description}</td>
                    <td className="border border-gray-300 p-1 text-right">{item.quantity}</td>
                    <td className="border border-gray-300 p-1">{item.unit}</td>
                    {totalCost ? <td className="border border-gray-300 p-1 text-right">{item.totalCost ? `$${item.totalCost.toFixed(2)}` : '-'}</td> : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Shingles */}
        {materials.shingles.length > 0 && (
          <div className="mb-4 print:break-inside-avoid">
            <h3 className="font-bold text-sm mb-2">3. SHINGLES</h3>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 p-1 text-left">Description</th>
                  <th className="border border-gray-300 p-1 text-right">Qty</th>
                  <th className="border border-gray-300 p-1 text-left">Unit</th>
                  {totalCost ? <th className="border border-gray-300 p-1 text-right">Cost</th> : null}
                </tr>
              </thead>
              <tbody>
                {materials.shingles.map((item, idx) => (
                  <tr key={idx}>
                    <td className="border border-gray-300 p-1">{item.description}</td>
                    <td className="border border-gray-300 p-1 text-right">{item.quantity}</td>
                    <td className="border border-gray-300 p-1">{item.unit}</td>
                    {totalCost ? <td className="border border-gray-300 p-1 text-right">{item.totalCost ? `$${item.totalCost.toFixed(2)}` : '-'}</td> : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Ridge & Hip */}
        {materials.ridgeAndHip.length > 0 && (
          <div className="mb-4">
            <h3 className="font-bold text-sm mb-2">4. RIDGE & HIP</h3>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 p-1 text-left">Description</th>
                  <th className="border border-gray-300 p-1 text-right">Qty</th>
                  <th className="border border-gray-300 p-1 text-left">Unit</th>
                  {totalCost ? <th className="border border-gray-300 p-1 text-right">Cost</th> : null}
                </tr>
              </thead>
              <tbody>
                {materials.ridgeAndHip.map((item, idx) => (
                  <tr key={idx}>
                    <td className="border border-gray-300 p-1">{item.description}</td>
                    <td className="border border-gray-300 p-1 text-right">{item.quantity}</td>
                    <td className="border border-gray-300 p-1">{item.unit}</td>
                    {totalCost ? <td className="border border-gray-300 p-1 text-right">{item.totalCost ? `$${item.totalCost.toFixed(2)}` : '-'}</td> : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Flashing */}
        {materials.flashing.length > 0 && (
          <div className="mb-4">
            <h3 className="font-bold text-sm mb-2">5. FLASHING</h3>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 p-1 text-left">Description</th>
                  <th className="border border-gray-300 p-1 text-right">Qty</th>
                  <th className="border border-gray-300 p-1 text-left">Unit</th>
                  {totalCost ? <th className="border border-gray-300 p-1 text-right">Cost</th> : null}
                </tr>
              </thead>
              <tbody>
                {materials.flashing.map((item, idx) => (
                  <tr key={idx}>
                    <td className="border border-gray-300 p-1">{item.description}</td>
                    <td className="border border-gray-300 p-1 text-right">{item.quantity}</td>
                    <td className="border border-gray-300 p-1">{item.unit}</td>
                    {totalCost ? <td className="border border-gray-300 p-1 text-right">{item.totalCost ? `$${item.totalCost.toFixed(2)}` : '-'}</td> : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Ventilation */}
        {materials.ventilation.length > 0 && (
          <div className="mb-4">
            <h3 className="font-bold text-sm mb-2">6. VENTILATION</h3>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 p-1 text-left">Description</th>
                  <th className="border border-gray-300 p-1 text-right">Qty</th>
                  <th className="border border-gray-300 p-1 text-left">Unit</th>
                  {totalCost ? <th className="border border-gray-300 p-1 text-right">Cost</th> : null}
                </tr>
              </thead>
              <tbody>
                {materials.ventilation.map((item, idx) => (
                  <tr key={idx}>
                    <td className="border border-gray-300 p-1">{item.description}</td>
                    <td className="border border-gray-300 p-1 text-right">{item.quantity}</td>
                    <td className="border border-gray-300 p-1">{item.unit}</td>
                    {totalCost ? <td className="border border-gray-300 p-1 text-right">{item.totalCost ? `$${item.totalCost.toFixed(2)}` : '-'}</td> : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Hardware */}
        {materials.hardware.length > 0 && (
          <div className="mb-4">
            <h3 className="font-bold text-sm mb-2">7. HARDWARE & ACCESSORIES</h3>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 p-1 text-left">Description</th>
                  <th className="border border-gray-300 p-1 text-right">Qty</th>
                  <th className="border border-gray-300 p-1 text-left">Unit</th>
                  {totalCost ? <th className="border border-gray-300 p-1 text-right">Cost</th> : null}
                </tr>
              </thead>
              <tbody>
                {materials.hardware.map((item, idx) => (
                  <tr key={idx}>
                    <td className="border border-gray-300 p-1">{item.description}</td>
                    <td className="border border-gray-300 p-1 text-right">{item.quantity}</td>
                    <td className="border border-gray-300 p-1">{item.unit}</td>
                    {totalCost ? <td className="border border-gray-300 p-1 text-right">{item.totalCost ? `$${item.totalCost.toFixed(2)}` : '-'}</td> : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Total Cost */}
      {totalCost && totalCost > 0 && (
        <div className="border-t-2 border-black pt-4 mt-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">ESTIMATED TOTAL COST</h2>
            <p className="text-2xl font-bold">${totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
        </div>
      )}

      {/* Footer Notes */}
      <div className="mt-6 border-t border-gray-300 pt-4 text-xs">
        <p className="font-bold mb-2">IMPORTANT NOTES:</p>
        <ul className="list-disc list-inside space-y-1 text-gray-700">
          <li>This is an estimate only. Verify all measurements before ordering materials.</li>
          <li>Additional materials may be needed for complex roof designs or repairs.</li>
          <li>Check local building codes for specific requirements and permits.</li>
          <li>Professional installation is strongly recommended for safety.</li>
          <li>Prices subject to change. Confirm costs with supplier before ordering.</li>
          <li>Waste factor of {(config.wasteFactor * 100).toFixed(0)}% has been included in calculations.</li>
        </ul>
        <p className="mt-4 text-center text-gray-600">
          Generated by ProSpaces CRM - Roof Planner • For estimation purposes only
        </p>
      </div>
    </div>
  );
}