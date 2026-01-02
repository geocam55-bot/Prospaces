import React, { useState, useEffect } from 'react';
import { DeckConfig } from '../../types/deck';
import { Deck3DRenderer } from '../deck/Deck3DRenderer';
import { MaterialsList } from '../deck/MaterialsList';
import { DeckMaterials } from '../../types/deck';

interface PrintableDeckDesignProps {
  config: DeckConfig;
  materials: DeckMaterials;
  totalCost: number;
  customerName?: string;
  customerCompany?: string;
  description?: string;
  designName?: string;
  snapshotUrl?: string; // Add this prop for the 3D snapshot
}

export function PrintableDeckDesign({
  config,
  materials,
  totalCost,
  customerName,
  customerCompany,
  description,
  designName,
  snapshotUrl,
}: PrintableDeckDesignProps) {
  // Debug: Log materials to help troubleshoot printing issues
  console.log('[PrintableDeckDesign] Materials for print:', {
    framing: materials.framing?.length || 0,
    decking: materials.decking?.length || 0,
    railing: materials.railing?.length || 0,
    hardware: materials.hardware?.length || 0,
    totalCost,
  });

  return (
    <div className="hidden print:block print:pt-8">
      {/* Header */}
      <div className="border-b-2 border-black pb-4 mb-6 print:mt-8">
        <h1 className="text-3xl font-bold mb-2">Deck Plan & Materials List</h1>
        <div className="text-sm text-gray-800">
          <p>Date: {new Date().toLocaleDateString()}</p>
          <p>Project Type: Deck Construction</p>
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
            <p className="font-semibold text-gray-700">Shape:</p>
            <p className="text-black capitalize">{config.shape}</p>
          </div>
          <div>
            <p className="font-semibold text-gray-700">Height:</p>
            <p className="text-black">{config.height} feet</p>
          </div>
          <div>
            <p className="font-semibold text-gray-700">Decking Type:</p>
            <p className="text-black">{config.deckingType}</p>
          </div>
          <div>
            <p className="font-semibold text-gray-700">Stairs:</p>
            <p className="text-black">{config.hasStairs ? `Yes (${config.stairSide})` : 'No'}</p>
          </div>
          <div>
            <p className="font-semibold text-gray-700">Decking Pattern:</p>
            <p className="text-black capitalize">{config.deckingPattern}</p>
          </div>
        </div>
      </div>

      {/* Plan View & Elevation */}
      <div className="mb-6">
        <h2 className="text-lg font-bold text-black mb-3">3D Deck Visualization</h2>
        <div className="w-full h-[600px] border border-gray-300 bg-gradient-to-br from-sky-100 to-blue-200">
          {snapshotUrl ? (
            <img src={snapshotUrl} alt="3D Deck Snapshot" className="w-full h-full object-contain" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-500">
              <p>Switch to 3D view before printing to see 3D visualization</p>
            </div>
          )}
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
          <MaterialsList materials={materials} compact={false} />
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