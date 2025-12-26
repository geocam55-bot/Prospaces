import React from 'react';
import { DeckConfig } from '../types/deck';

interface DeckConfiguratorProps {
  config: DeckConfig;
  onChange: (config: DeckConfig) => void;
}

export function DeckConfigurator({ config, onChange }: DeckConfiguratorProps) {
  const updateConfig = (updates: Partial<DeckConfig>) => {
    onChange({ ...config, ...updates });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
      <h2 className="text-slate-900 mb-4">Deck Configuration</h2>
      
      <div className="space-y-4">
        {/* Dimensions */}
        <div>
          <h3 className="text-slate-900 text-sm mb-3">Dimensions</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 text-sm mb-1">
                Width (ft)
              </label>
              <input
                type="number"
                min="4"
                max="50"
                step="0.5"
                value={config.width}
                onChange={(e) => updateConfig({ width: parseFloat(e.target.value) || 12 })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-slate-700 text-sm mb-1">
                Length (ft)
              </label>
              <input
                type="number"
                min="4"
                max="50"
                step="0.5"
                value={config.length}
                onChange={(e) => updateConfig({ length: parseFloat(e.target.value) || 16 })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Height */}
        <div>
          <label className="block text-slate-700 text-sm mb-1">
            Deck Height Above Ground (ft)
          </label>
          <input
            type="number"
            min="0.5"
            max="12"
            step="0.5"
            value={config.height}
            onChange={(e) => updateConfig({ height: parseFloat(e.target.value) || 2 })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>

        {/* Shape */}
        <div>
          <label className="block text-slate-700 text-sm mb-2">
            Deck Shape
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => updateConfig({ shape: 'rectangle' })}
              className={`px-4 py-2 rounded-lg border-2 transition-colors ${
                config.shape === 'rectangle'
                  ? 'border-purple-600 bg-purple-50 text-purple-700'
                  : 'border-slate-300 text-slate-700 hover:border-slate-400'
              }`}
            >
              Rectangle
            </button>
            <button
              onClick={() => updateConfig({ shape: 'l-shape' })}
              className={`px-4 py-2 rounded-lg border-2 transition-colors ${
                config.shape === 'l-shape'
                  ? 'border-purple-600 bg-purple-50 text-purple-700'
                  : 'border-slate-300 text-slate-700 hover:border-slate-400'
              }`}
            >
              L-Shape
            </button>
          </div>
        </div>

        {/* L-Shape Configuration */}
        {config.shape === 'l-shape' && (
          <div className="space-y-3 p-4 bg-purple-50 rounded-lg border border-purple-200">
            <div className="text-sm text-purple-900 font-medium mb-2">
              L-Shape Extension Settings
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 text-sm mb-1">
                  Extension Width (ft)
                </label>
                <input
                  type="number"
                  min="4"
                  max="50"
                  step="1"
                  value={config.lShapeWidth || 8}
                  onChange={(e) => updateConfig({ lShapeWidth: parseFloat(e.target.value) || 8 })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-slate-700 text-sm mb-1">
                  Extension Length (ft)
                </label>
                <input
                  type="number"
                  min="4"
                  max="50"
                  step="1"
                  value={config.lShapeLength || 10}
                  onChange={(e) => updateConfig({ lShapeLength: parseFloat(e.target.value) || 10 })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-700 text-sm mb-1">
                Extension Position
              </label>
              <select
                value={config.lShapePosition || 'top-left'}
                onChange={(e) => updateConfig({ lShapePosition: e.target.value as any })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="top-left">Top Left</option>
                <option value="top-right">Top Right</option>
                <option value="bottom-left">Bottom Left</option>
                <option value="bottom-right">Bottom Right</option>
              </select>
            </div>
          </div>
        )}

        {/* Joist Spacing */}
        <div>
          <label className="block text-slate-700 text-sm mb-2">
            Joist Spacing (inches on center)
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[12, 16, 24].map((spacing) => (
              <button
                key={spacing}
                onClick={() => updateConfig({ joistSpacing: spacing as 12 | 16 | 24 })}
                className={`px-4 py-2 rounded-lg border-2 transition-colors ${
                  config.joistSpacing === spacing
                    ? 'border-purple-600 bg-purple-50 text-purple-700'
                    : 'border-slate-300 text-slate-700 hover:border-slate-400'
                }`}
              >
                {spacing}"
              </button>
            ))}
          </div>
        </div>

        {/* Decking Pattern */}
        <div>
          <label className="block text-slate-700 text-sm mb-2">
            Decking Board Pattern
          </label>
          <select
            value={config.deckingPattern}
            onChange={(e) => updateConfig({ deckingPattern: e.target.value as any })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="perpendicular">Perpendicular to House</option>
            <option value="parallel">Parallel to House</option>
            <option value="diagonal">Diagonal (45°)</option>
          </select>
        </div>

        {/* Stairs */}
        <div className="border-t border-slate-200 pt-4">
          <div className="flex items-center justify-between mb-3">
            <label className="text-slate-700 text-sm">
              Include Stairs
            </label>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.hasStairs}
                onChange={(e) => updateConfig({ hasStairs: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-300 peer-focus:ring-2 peer-focus:ring-purple-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>

          {config.hasStairs && (
            <div className="space-y-3">
              <div>
                <label className="block text-slate-700 text-sm mb-1">
                  Stair Location
                </label>
                <select
                  value={config.stairSide}
                  onChange={(e) => updateConfig({ stairSide: e.target.value as any })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="front">Front</option>
                  <option value="back">Back</option>
                  <option value="left">Left Side</option>
                  <option value="right">Right Side</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-700 text-sm mb-1">
                  Stair Width (ft)
                </label>
                <input
                  type="number"
                  min="3"
                  max="8"
                  step="0.5"
                  value={config.stairWidth || 4}
                  onChange={(e) => updateConfig({ stairWidth: parseFloat(e.target.value) || 4 })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>
          )}
        </div>

        {/* Railings */}
        <div className="border-t border-slate-200 pt-4">
          <label className="block text-slate-700 text-sm mb-2">
            Railing Sides
          </label>
          <div className="grid grid-cols-2 gap-2">
            {['front', 'back', 'left', 'right'].map((side) => (
              <label
                key={side}
                className="flex items-center gap-2 px-3 py-2 border border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50"
              >
                <input
                  type="checkbox"
                  checked={config.railingSides.includes(side as any)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      updateConfig({
                        railingSides: [...config.railingSides, side as any],
                      });
                    } else {
                      updateConfig({
                        railingSides: config.railingSides.filter((s) => s !== side),
                      });
                    }
                  }}
                  className="w-4 h-4 text-purple-600 border-slate-300 rounded focus:ring-purple-500"
                />
                <span className="text-slate-700 text-sm capitalize">{side}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Summary Info */}
        <div className="border-t border-slate-200 pt-4 bg-slate-50 -mx-6 -mb-6 px-6 py-4 rounded-b-lg">
          <div className="text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-600">Deck Area:</span>
              <span className="text-slate-900">{(config.width * config.length).toFixed(0)} sq ft</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Perimeter:</span>
              <span className="text-slate-900">{((config.width + config.length) * 2).toFixed(0)} ft</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}