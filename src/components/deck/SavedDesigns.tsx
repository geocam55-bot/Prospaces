import React, { useState } from 'react';
import { DeckConfig } from '../../types/deck';
import { FileText, Trash2, Calendar } from 'lucide-react';

interface SavedDesignsProps {
  onLoadDesign: (config: DeckConfig) => void;
}

export function SavedDesigns({ onLoadDesign }: SavedDesignsProps) {
  // Mock saved designs - in a real app, this would come from Supabase
  const [savedDesigns] = useState([
    {
      id: '1',
      name: 'Johnson Residence',
      createdAt: '2025-01-15',
      config: {
        width: 14,
        length: 18,
        shape: 'rectangle' as const,
        height: 2.5,
        hasStairs: true,
        stairSide: 'front' as const,
        railingSides: ['front', 'left', 'right'] as const,
        deckingPattern: 'perpendicular' as const,
        joistSpacing: 16 as const,
        unit: 'feet' as const,
      },
    },
    {
      id: '2',
      name: 'Smith Backyard Deck',
      createdAt: '2025-01-10',
      config: {
        width: 12,
        length: 16,
        shape: 'rectangle' as const,
        height: 2,
        hasStairs: true,
        stairSide: 'back' as const,
        railingSides: ['front', 'back', 'left', 'right'] as const,
        deckingPattern: 'diagonal' as const,
        joistSpacing: 16 as const,
        unit: 'feet' as const,
      },
    },
  ]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-slate-900">Saved Designs</h2>
        <span className="text-sm text-slate-600">{savedDesigns.length} designs</span>
      </div>

      {savedDesigns.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600">No saved designs yet</p>
          <p className="text-slate-500 text-sm mt-1">
            Create a design and save it to see it here
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {savedDesigns.map((design) => (
            <div
              key={design.id}
              className="border border-slate-200 rounded-lg p-4 hover:border-purple-300 hover:bg-purple-50 transition-colors group"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-slate-900 group-hover:text-purple-900 mb-2">
                    {design.name}
                  </h3>
                  
                  <div className="flex flex-wrap gap-4 text-sm text-slate-600 mb-3">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {formatDate(design.createdAt)}
                    </div>
                    <div>
                      {design.config.width}' × {design.config.length}'
                    </div>
                    <div>
                      {(design.config.width * design.config.length).toFixed(0)} sq ft
                    </div>
                    <div className="capitalize">
                      {design.config.shape}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => onLoadDesign(design.config)}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
                    >
                      Load Design
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Delete this design?')) {
                          // In real app, delete from Supabase
                          console.log('Delete design:', design.id);
                        }
                      }}
                      className="px-3 py-2 border border-slate-300 text-slate-700 rounded-lg hover:border-red-300 hover:bg-red-50 hover:text-red-700 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}\n        </div>
      )}

      <div className="mt-6 pt-6 border-t border-slate-200">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-blue-900 mb-2 text-sm">Save Current Design</h4>
          <p className="text-blue-800 text-sm mb-3">
            Connect to Supabase to save your designs and access them from anywhere.
          </p>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
            Connect Supabase
          </button>
        </div>
      </div>
    </div>
  );
}
