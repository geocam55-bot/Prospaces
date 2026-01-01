import React, { useState } from 'react';
import { DeckPlanner } from './planners/DeckPlanner';
import { GaragePlanner } from './planners/GaragePlanner';
import { ShedPlanner } from './planners/ShedPlanner';
import { RoofPlanner } from './planners/RoofPlanner';
import { KitchenPlanner } from './planners/KitchenPlanner';
import { Home, Warehouse, Building2, Hammer, ChefHat } from 'lucide-react';
import type { User } from '../App';

type PlannerModule = 'deck' | 'garage' | 'shed' | 'roof' | 'kitchen';

interface ProjectWizardsProps {
  user: User;
}

export function ProjectWizards({ user }: ProjectWizardsProps) {
  const [activeModule, setActiveModule] = useState<PlannerModule>('deck');

  return (
    <div className="flex flex-col h-screen">
      {/* Module Navigation */}
      <div className="bg-white border-b border-slate-200 print:hidden flex-shrink-0">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="relative">
            {/* Gradient fade indicators */}
            <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white to-transparent pointer-events-none z-10" />
            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent pointer-events-none z-10" />
            
            <nav className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent hover:scrollbar-thumb-slate-400">
              <button
                onClick={() => setActiveModule('deck')}
                className={`flex items-center gap-2 px-4 sm:px-6 py-3 sm:py-4 border-b-2 transition-colors text-sm sm:text-base whitespace-nowrap flex-shrink-0 ${
                  activeModule === 'deck'
                    ? 'border-purple-600 text-purple-600 bg-purple-50'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Home className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">Deck Planner</span>
                <span className="sm:hidden">Deck</span>
              </button>
              <button
                onClick={() => setActiveModule('garage')}
                className={`flex items-center gap-2 px-4 sm:px-6 py-3 sm:py-4 border-b-2 transition-colors text-sm sm:text-base whitespace-nowrap flex-shrink-0 ${
                  activeModule === 'garage'
                    ? 'border-blue-600 text-blue-600 bg-blue-50'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Warehouse className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">Garage Planner</span>
                <span className="sm:hidden">Garage</span>
              </button>
              <button
                onClick={() => setActiveModule('shed')}
                className={`flex items-center gap-2 px-4 sm:px-6 py-3 sm:py-4 border-b-2 transition-colors text-sm sm:text-base whitespace-nowrap flex-shrink-0 ${
                  activeModule === 'shed'
                    ? 'border-green-600 text-green-600 bg-green-50'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Building2 className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">Shed Planner</span>
                <span className="sm:hidden">Shed</span>
              </button>
              <button
                onClick={() => setActiveModule('roof')}
                className={`flex items-center gap-2 px-4 sm:px-6 py-3 sm:py-4 border-b-2 transition-colors text-sm sm:text-base whitespace-nowrap flex-shrink-0 ${
                  activeModule === 'roof'
                    ? 'border-red-600 text-red-600 bg-red-50'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Hammer className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">Roof Planner</span>
                <span className="sm:hidden">Roof</span>
              </button>
              <button
                onClick={() => setActiveModule('kitchen')}
                className={`flex items-center gap-2 px-4 sm:px-6 py-3 sm:py-4 border-b-2 transition-colors text-sm sm:text-base whitespace-nowrap flex-shrink-0 ${
                  activeModule === 'kitchen'
                    ? 'border-orange-600 text-orange-600 bg-orange-50'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <ChefHat className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">Kitchen Planner</span>
                <span className="sm:hidden">Kitchen</span>
              </button>
            </nav>
          </div>
        </div>
      </div>

      {/* Active Module */}
      <main className="print:p-0 flex-1 overflow-auto">
        {activeModule === 'deck' && <DeckPlanner user={user} />}
        {activeModule === 'garage' && <GaragePlanner user={user} />}
        {activeModule === 'shed' && <ShedPlanner user={user} />}
        {activeModule === 'roof' && <RoofPlanner user={user} />}
        {activeModule === 'kitchen' && <KitchenPlanner user={user} />}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 print:hidden flex-shrink-0">
        <div className="px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-slate-600 text-sm text-center">
            ProSpaces CRM - Project Wizards • For estimation purposes only • Verify with local building codes
          </p>
        </div>
      </footer>
    </div>
  );
}