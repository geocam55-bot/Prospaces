import React from 'react';
import { DeckConfig } from '../../types/deck';
import { LayoutTemplate } from 'lucide-react';

interface DeckTemplatesProps {
  onLoadTemplate: (config: DeckConfig) => void;
  currentConfig?: DeckConfig;
}

const templates: Array<{ name: string; description: string; config: DeckConfig }> = [
  {
    name: 'Small Deck',
    description: '10\' × 12\' with stairs',
    config: {
      width: 10,
      length: 12,
      shape: 'rectangle',
      height: 2,
      hasStairs: true,
      stairSide: 'front',
      stairWidth: 4,
      railingSides: ['front', 'left', 'right'],
      deckingPattern: 'perpendicular',
      joistSpacing: 16,
      unit: 'feet',
    },
  },
  {
    name: 'Medium Deck',
    description: '12\' × 16\' with stairs',
    config: {
      width: 12,
      length: 16,
      shape: 'rectangle',
      height: 2,
      hasStairs: true,
      stairSide: 'front',
      stairWidth: 4,
      railingSides: ['front', 'left', 'right'],
      deckingPattern: 'perpendicular',
      joistSpacing: 16,
      unit: 'feet',
    },
  },
  {
    name: 'Large Deck',
    description: '16\' × 20\' with stairs',
    config: {
      width: 16,
      length: 20,
      shape: 'rectangle',
      height: 2.5,
      hasStairs: true,
      stairSide: 'front',
      stairWidth: 5,
      railingSides: ['front', 'left', 'right'],
      deckingPattern: 'perpendicular',
      joistSpacing: 16,
      unit: 'feet',
    },
  },
  {
    name: 'Ground Level',
    description: '14\' × 14\' no stairs',
    config: {
      width: 14,
      length: 14,
      shape: 'rectangle',
      height: 0.5,
      hasStairs: false,
      railingSides: [],
      deckingPattern: 'diagonal',
      joistSpacing: 16,
      unit: 'feet',
    },
  },
];

export function DeckTemplates({ onLoadTemplate, currentConfig }: DeckTemplatesProps) {
  // Check if a template matches the current config
  const isTemplateSelected = (template: typeof templates[0]) => {
    if (!currentConfig) return false;
    
    const t = template.config;
    const c = currentConfig;
    
    // Check key properties that define a template
    return (
      t.width === c.width &&
      t.length === c.length &&
      t.shape === c.shape &&
      t.height === c.height &&
      t.hasStairs === c.hasStairs &&
      t.deckingPattern === c.deckingPattern &&
      t.joistSpacing === c.joistSpacing
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
      <div className="flex items-center gap-2 mb-4">
        <LayoutTemplate className="w-5 h-5 text-purple-600" />
        <h2 className="text-slate-900">Quick Start Templates</h2>
      </div>

      <div className="grid grid-cols-1 gap-2">
        {templates.map((template, idx) => {
          const isSelected = isTemplateSelected(template);
          return (
            <button
              key={idx}
              onClick={() => onLoadTemplate(template.config)}
              className={`text-left p-3 border-2 rounded-lg transition-colors group ${
                isSelected
                  ? 'border-purple-600 bg-purple-50'
                  : 'border-slate-200 hover:border-purple-300 hover:bg-purple-50'
              }`}
            >
              <div className={`${
                isSelected 
                  ? 'text-purple-900' 
                  : 'text-slate-900 group-hover:text-purple-900'
              }`}>
                {template.name}
              </div>
              <div className="text-slate-600 text-sm mt-1">{template.description}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}