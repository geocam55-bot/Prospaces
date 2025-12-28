import React from 'react';
import { RoofConfig } from '../../types/roof';

interface RoofConfiguratorProps {
  config: RoofConfig;
  onChange: (config: RoofConfig) => void;
}

export function RoofConfigurator({ config, onChange }: RoofConfiguratorProps) {
  const updateConfig = (updates: Partial<RoofConfig>) => {
    onChange({ ...config, ...updates });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
      <h2 className="text-slate-900 mb-4">Roof Configuration</h2>
      
      <div className="space-y-4">
        {/* Building Dimensions */}
        <div>
          <h3 className="text-slate-900 text-sm mb-3">Building Dimensions</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 text-sm mb-1">
                Length (ft)
              </label>
              <input
                type="number"
                min="10"
                max="200"
                step="1"
                value={config.length}
                onChange={(e) => updateConfig({ length: parseFloat(e.target.value) || 40 })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-slate-700 text-sm mb-1">
                Width (ft)
              </label>
              <input
                type="number"
                min="10"
                max="200"
                step="1"
                value={config.width}
                onChange={(e) => updateConfig({ width: parseFloat(e.target.value) || 30 })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Roof Style */}
        <div>
          <label className="block text-slate-700 text-sm mb-2">
            Roof Style
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => updateConfig({ style: 'gable' })}
              className={`px-4 py-2 rounded-lg border-2 transition-colors text-sm ${
                config.style === 'gable'
                  ? 'border-orange-600 bg-orange-50 text-orange-700'
                  : 'border-slate-300 text-slate-700 hover:border-slate-400'
              }`}
            >
              Gable
            </button>
            <button
              onClick={() => updateConfig({ style: 'hip' })}
              className={`px-4 py-2 rounded-lg border-2 transition-colors text-sm ${
                config.style === 'hip'
                  ? 'border-orange-600 bg-orange-50 text-orange-700'
                  : 'border-slate-300 text-slate-700 hover:border-slate-400'
              }`}
            >
              Hip
            </button>
            <button
              onClick={() => updateConfig({ style: 'gambrel' })}
              className={`px-4 py-2 rounded-lg border-2 transition-colors text-sm ${
                config.style === 'gambrel'
                  ? 'border-orange-600 bg-orange-50 text-orange-700'
                  : 'border-slate-300 text-slate-700 hover:border-slate-400'
              }`}
            >
              Gambrel
            </button>
            <button
              onClick={() => updateConfig({ style: 'shed' })}
              className={`px-4 py-2 rounded-lg border-2 transition-colors text-sm ${
                config.style === 'shed'
                  ? 'border-orange-600 bg-orange-50 text-orange-700'
                  : 'border-slate-300 text-slate-700 hover:border-slate-400'
              }`}
            >
              Shed
            </button>
            <button
              onClick={() => updateConfig({ style: 'mansard' })}
              className={`px-4 py-2 rounded-lg border-2 transition-colors text-sm ${
                config.style === 'mansard'
                  ? 'border-orange-600 bg-orange-50 text-orange-700'
                  : 'border-slate-300 text-slate-700 hover:border-slate-400'
              }`}
            >
              Mansard
            </button>
            <button
              onClick={() => updateConfig({ style: 'flat' })}
              className={`px-4 py-2 rounded-lg border-2 transition-colors text-sm ${
                config.style === 'flat'
                  ? 'border-orange-600 bg-orange-50 text-orange-700'
                  : 'border-slate-300 text-slate-700 hover:border-slate-400'
              }`}
            >
              Flat
            </button>
          </div>
        </div>

        {/* Roof Pitch */}
        <div>
          <label className="block text-slate-700 text-sm mb-1">
            Roof Pitch
          </label>
          <select
            value={config.pitch}
            onChange={(e) => updateConfig({ pitch: e.target.value as any })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          >
            <option value="2/12">2/12 (9.5°) - Shallow</option>
            <option value="3/12">3/12 (14°) - Low</option>
            <option value="4/12">4/12 (18.5°) - Standard</option>
            <option value="5/12">5/12 (22.5°) - Standard</option>
            <option value="6/12">6/12 (26.5°) - Common</option>
            <option value="7/12">7/12 (30°) - Steep</option>
            <option value="8/12">8/12 (33.5°) - Steep</option>
            <option value="9/12">9/12 (37°) - Very Steep</option>
            <option value="10/12">10/12 (40°) - Very Steep</option>
            <option value="12/12">12/12 (45°) - Extreme</option>
          </select>
          <p className="text-xs text-slate-500 mt-1">
            Higher pitch = steeper roof, more materials needed
          </p>
        </div>

        {/* Overhangs */}
        <div>
          <h3 className="text-slate-900 text-sm mb-3">Overhangs</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 text-sm mb-1">
                Eave Overhang (ft)
              </label>
              <input
                type="number"
                min="0"
                max="4"
                step="0.5"
                value={config.eaveOverhang}
                onChange={(e) => updateConfig({ eaveOverhang: parseFloat(e.target.value) || 1.5 })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-slate-700 text-sm mb-1">
                Rake Overhang (ft)
              </label>
              <input
                type="number"
                min="0"
                max="4"
                step="0.5"
                value={config.rakeOverhang}
                onChange={(e) => updateConfig({ rakeOverhang: parseFloat(e.target.value) || 1.5 })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Typical overhang is 1-2 feet
          </p>
        </div>

        {/* Shingle Type */}
        <div>
          <label className="block text-slate-700 text-sm mb-1">
            Shingle Type
          </label>
          <select
            value={config.shingleType}
            onChange={(e) => updateConfig({ shingleType: e.target.value as any })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          >
            <option value="architectural">Architectural (Dimensional)</option>
            <option value="3-tab">3-Tab Asphalt</option>
            <option value="designer">Designer/Premium</option>
            <option value="metal">Metal Roofing</option>
            <option value="cedar-shake">Cedar Shake</option>
          </select>
        </div>

        {/* Underlayment Type */}
        <div>
          <label className="block text-slate-700 text-sm mb-1">
            Underlayment Type
          </label>
          <select
            value={config.underlaymentType}
            onChange={(e) => updateConfig({ underlaymentType: e.target.value as any })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          >
            <option value="synthetic">Synthetic (Recommended)</option>
            <option value="felt-15">#15 Felt Paper</option>
            <option value="felt-30">#30 Felt Paper</option>
            <option value="ice-and-water">Ice & Water Shield (Full Coverage)</option>
          </select>
        </div>

        {/* Valleys */}
        <div className="space-y-2">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={config.hasValleys || false}
              onChange={(e) => updateConfig({ 
                hasValleys: e.target.checked,
                valleyCount: e.target.checked ? (config.valleyCount || 2) : 0
              })}
              className="rounded border-slate-300 text-orange-600 focus:ring-orange-500"
            />
            <span className="text-slate-700 text-sm">Has Valleys</span>
          </label>
          
          {config.hasValleys && (
            <div>
              <label className="block text-slate-700 text-sm mb-1">
                Number of Valleys
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={config.valleyCount || 2}
                onChange={(e) => updateConfig({ valleyCount: parseInt(e.target.value) || 2 })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
          )}
        </div>

        {/* Skylights */}
        <div className="space-y-2">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={config.hasSkylight || false}
              onChange={(e) => updateConfig({ 
                hasSkylight: e.target.checked,
                skylightCount: e.target.checked ? (config.skylightCount || 1) : 0
              })}
              className="rounded border-slate-300 text-orange-600 focus:ring-orange-500"
            />
            <span className="text-slate-700 text-sm">Has Skylights</span>
          </label>
          
          {config.hasSkylight && (
            <div>
              <label className="block text-slate-700 text-sm mb-1">
                Number of Skylights
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={config.skylightCount || 1}
                onChange={(e) => updateConfig({ skylightCount: parseInt(e.target.value) || 1 })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
          )}
        </div>

        {/* Chimneys */}
        <div className="space-y-2">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={config.hasChimney || false}
              onChange={(e) => updateConfig({ 
                hasChimney: e.target.checked,
                chimneyCount: e.target.checked ? (config.chimneyCount || 1) : 0
              })}
              className="rounded border-slate-300 text-orange-600 focus:ring-orange-500"
            />
            <span className="text-slate-700 text-sm">Has Chimneys</span>
          </label>
          
          {config.hasChimney && (
            <div>
              <label className="block text-slate-700 text-sm mb-1">
                Number of Chimneys
              </label>
              <input
                type="number"
                min="1"
                max="5"
                value={config.chimneyCount || 1}
                onChange={(e) => updateConfig({ chimneyCount: parseInt(e.target.value) || 1 })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
          )}
        </div>

        {/* Waste Factor */}
        <div>
          <label className="block text-slate-700 text-sm mb-1">
            Waste Factor: {(config.wasteFactor * 100).toFixed(0)}%
          </label>
          <input
            type="range"
            min="5"
            max="20"
            step="1"
            value={config.wasteFactor * 100}
            onChange={(e) => updateConfig({ wasteFactor: parseInt(e.target.value) / 100 })}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-slate-500">
            <span>5%</span>
            <span>10% (Standard)</span>
            <span>15%</span>
            <span>20%</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Add extra materials for cuts, waste, and mistakes
          </p>
        </div>
      </div>
    </div>
  );
}
