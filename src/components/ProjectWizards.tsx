import React, { useState } from 'react';
import { DeckPlanner } from './planners/DeckPlanner';
import { GaragePlanner } from './planners/GaragePlanner';
import { ShedPlanner } from './planners/ShedPlanner';
import { Home, Warehouse, Building2 } from 'lucide-react';
import type { User } from '../App';

type PlannerModule = 'deck' | 'garage' | 'shed';

interface ProjectWizardsProps {
  user: User;
}

export function ProjectWizards({ user }: ProjectWizardsProps) {
  const [activeModule, setActiveModule] = useState<PlannerModule>('deck');

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 print:border-b-2 print:border-black">
        <div className="px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-slate-900">Project Wizards</h1>
              <p className="text-slate-600 text-sm mt-1">Design & estimate materials for decks, garages, and sheds</p>
            </div>
          </div>
        </div>
      </div>

      {/* Module Navigation */}
      <div className="bg-white border-b border-slate-200 print:hidden">
        <div className="px-4 sm:px-6 lg:px-8">
          <nav className="flex gap-2">
            <button
              onClick={() => setActiveModule('deck')}
              className={`flex items-center gap-2 px-6 py-4 border-b-2 transition-colors ${
                activeModule === 'deck'
                  ? 'border-purple-600 text-purple-600 bg-purple-50'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Home className="w-5 h-5" />
              <span>Deck Planner</span>
            </button>
            <button
              onClick={() => setActiveModule('garage')}
              className={`flex items-center gap-2 px-6 py-4 border-b-2 transition-colors ${
                activeModule === 'garage'
                  ? 'border-blue-600 text-blue-600 bg-blue-50'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Warehouse className="w-5 h-5" />
              <span>Garage Planner</span>
            </button>
            <button
              onClick={() => setActiveModule('shed')}
              className={`flex items-center gap-2 px-6 py-4 border-b-2 transition-colors ${
                activeModule === 'shed'
                  ? 'border-green-600 text-green-600 bg-green-50'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Building2 className="w-5 h-5" />
              <span>Shed Planner</span>
            </button>
          </nav>
        </div>
      </div>

      {/* Active Module */}
      <main className="print:p-0">
        {activeModule === 'deck' && <DeckPlanner user={user} />}
        {activeModule === 'garage' && <GaragePlanner user={user} />}
        {activeModule === 'shed' && <ShedPlanner user={user} />}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-12 print:hidden">
        <div className="px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-slate-600 text-sm text-center">
            ProSpaces CRM - Project Wizards • For estimation purposes only • Verify with local building codes
          </p>
        </div>
      </footer>
    </div>
  );
}