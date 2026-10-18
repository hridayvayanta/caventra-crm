import React from 'react';
import { User } from '../types/crm';
import { 
  Building2, 
  Search, 
  LayoutGrid, 
  List, 
  Plus, 
  Sparkles,
  ChevronDown
} from 'lucide-react';

interface NavbarProps {
  viewMode: 'board' | 'list';
  setViewMode: (mode: 'board' | 'list') => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  users: User[];
  currentUser: User;
  setCurrentUser: (user: User) => void;
  onOpenAddModal: () => void;
  onTriggerHarvest: () => void;
  isHarvesting: boolean;
  onOpenPrivacy: () => void;
  onOpenTerms: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  viewMode,
  setViewMode,
  searchQuery,
  setSearchQuery,
  users,
  currentUser,
  setCurrentUser,
  onOpenAddModal,
  onTriggerHarvest,
  isHarvesting,
}) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-base shadow-sm">
              C
            </div>
            <div>
              <span className="font-bold text-slate-900 text-base tracking-tight">CAVENTRA</span>
              <span className="ml-1.5 px-2 py-0.5 text-xs font-semibold rounded bg-slate-100 text-slate-600">
                CRM
              </span>
            </div>
          </div>

          {/* Search Box - Large, clear and friendly */}
          <div className="relative flex-1 max-w-md hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search companies, phone, city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>

          {/* Controls & Actions */}
          <div className="flex items-center gap-2.5">
            
            {/* View Mode Toggle (Board vs List) */}
            <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
              <button
                onClick={() => setViewMode('board')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  viewMode === 'board'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Board View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Board</span>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  viewMode === 'list'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="List View"
              >
                <List className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">List</span>
              </button>
            </div>

            {/* Run Auto Ingestion */}
            <button
              onClick={onTriggerHarvest}
              disabled={isHarvesting}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-300 transition-all disabled:opacity-50"
              title="Search for new prospective clients"
            >
              <Sparkles className={`w-3.5 h-3.5 text-blue-600 ${isHarvesting ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">
                {isHarvesting ? 'Finding Leads...' : 'Find New Leads'}
              </span>
            </button>

            {/* Add Lead Primary Button */}
            <button
              onClick={onOpenAddModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Add Lead</span>
            </button>

            {/* Current User Switcher */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center">
                {currentUser.initials}
              </div>
              <select
                value={currentUser.id}
                onChange={(e) => {
                  const u = users.find(x => x.id === e.target.value);
                  if (u) setCurrentUser(u);
                }}
                className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
              >
                {users.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>

          </div>

        </div>
      </div>
    </header>
  );
};
