import React from 'react';
import { GarageConfig } from '../../types/garage';
import { GarageCanvas } from '../garage/GarageCanvas';
import { GarageMaterialsList } from '../garage/GarageMaterialsList';
import { GarageMaterials } from '../../types/garage';

interface PrintableGarageDesignProps {
  config: GarageConfig;
  materials: GarageMaterials;
  totalCost: number;
  customerName?: string;
  customerCompany?: string;
  description?: string;
  designName?: string;
}

export function PrintableGarageDesign({
  config,
  materials,
  totalCost,
  customerName,
  customerCompany,
  description,
  designName,
}: PrintableGarageDesignProps) {
  // Debug: Log materials to help troubleshoot printing issues
  console.log('[PrintableGarageDesign] Materials for print:', {
    foundation: materials.foundation?.length || 0,
    framing: materials.framing?.length || 0,
    roofing: materials.roofing?.length || 0,
    siding: materials.siding?.length || 0,
    doors: materials.doors?.length || 0,
    windows: materials.windows?.length || 0,
    hardware: materials.hardware?.length || 0,
    electrical: materials.electrical?.length || 0,
    insulation: materials.insulation?.length || 0,
    totalCost,
  });

  return (
    <div className="hidden print:block print:overflow-visible">
      {/* Header */}
      <div className="mb-6 border-b-2 border-black pb-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-black mb-2">
              {designName || 'Garage Design Plan'}
            </h1>
            <div className="text-sm text-gray-800">
              <p>Date: {new Date().toLocaleDateString()}</p>
              <p>Project Type: Garage Construction</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-black">ProSpaces CRM</div>
            <div className="text-sm text-gray-600">Professional Garage Construction</div>
          </div>
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
            <p className="font-semibold text-gray-700">Dimensions:</p>
            <p className="text-black">{config.width}' × {config.length}'</p>
          </div>
          <div>
            <p className="font-semibold text-gray-700">Style:</p>
            <p className="text-black capitalize">{config.style}</p>
          </div>
          <div>
            <p className="font-semibold text-gray-700">Wall Height:</p>
            <p className="text-black">{config.wallHeight} feet</p>
          </div>
          <div>
            <p className="font-semibold text-gray-700">Roof Pitch:</p>
            <p className="text-black">{config.roofPitch}/12</p>
          </div>
          <div>
            <p className="font-semibold text-gray-700">Foundation:</p>
            <p className="text-black capitalize">{config.foundationType.replace('-', ' ')}</p>
          </div>
          <div>
            <p className="font-semibold text-gray-700">Bays:</p>
            <p className="text-black">{config.bays}</p>
          </div>
          <div>
            <p className="font-semibold text-gray-700">Siding:</p>
            <p className="text-black capitalize">{config.sidingType}</p>
          </div>
          <div>
            <p className="font-semibold text-gray-700">Roofing:</p>
            <p className="text-black capitalize">{config.roofingMaterial.replace('-', ' ')}</p>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-gray-300">
          <p className="font-semibold text-gray-700 mb-2">Additional Features:</p>
          <div className="grid grid-cols-3 gap-2 text-sm">
            {config.hasWindows && <p className="text-black">✓ Windows</p>}
            {config.hasServiceDoor && <p className="text-black">✓ Service Door</p>}
            {config.hasElectrical && <p className="text-black">✓ Electrical Package</p>}
            {config.hasInsulation && <p className="text-black">✓ Insulation</p>}
            {config.hasCeilingFinish && <p className="text-black">✓ Ceiling Finish</p>}
            {config.hasAtticStorage && <p className="text-black">✓ Attic Storage</p>}
          </div>
        </div>
      </div>

      {/* Plan View & Elevation */}
      <div className="mb-6">
        <h2 className="text-lg font-bold text-black mb-3 border-b-2 border-black pb-2">
          Garage Plan & Elevation
        </h2>
        <div className="border-2 border-black p-4 bg-white flex items-center justify-center">
          <GarageCanvas config={config} />
        </div>
      </div>

      {/* Materials List */}
      <div className="break-before-page">
        <h2 className="text-lg font-bold text-black mb-3 border-b-2 border-black pb-2">
          Bill of Materials
        </h2>
        {totalCost > 0 && (
          <div className="mb-4 p-3 bg-gray-100 border border-gray-400">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-800">Total Estimated Cost:</p>
                <p className="text-xs text-gray-600 mt-1">Based on Tier 1 Pricing</p>
              </div>
              <p className="text-2xl font-bold text-black">${totalCost.toLocaleString()}</p>
            </div>
          </div>
        )}
        <div className="border border-black">
          <GarageMaterialsList materials={materials} compact={false} />
        </div>
      </div>

      {/* Footer */}
      <div className="mt-6 pt-3 border-t border-gray-400 text-xs text-gray-600">
        <p className="mb-1">This plan is an estimate and should be verified by a professional before construction.</p>
        <p>All dimensions and materials are subject to local building codes and regulations.</p>
      </div>
    </div>
  );
}