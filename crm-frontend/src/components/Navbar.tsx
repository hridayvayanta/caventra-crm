import React from 'react';
import { User } from '../types/crm';
import { 
  Building2, 
  Search, 
  LayoutDashboard, 
  Table, 
  CalendarClock, 
  Cpu, 
  Plus,
  Shield,
  FileText
} from 'lucide-react';

interface NavbarProps {
  currentTab: 'pipeline' | 'table' | 'calendar' | 'ingestion' | 'privacy' | 'terms';
  setCurrentTab: (tab: 'pipeline' | 'table' | 'calendar' | 'ingestion' | 'privacy' | 'terms') => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  users: User[];
  currentUser: User;
  setCurrentUser: (user: User) => void;
  onOpenAddModal: () => void;
  onTriggerHarvest: () => void;
  isHarvesting: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
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
    <header className="sticky top-0 z-40 bg-neutral-950 border-b border-neutral-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 gap-4">
          
          {/* Logo & Corporate Title */}
          <div 
            onClick={() => setCurrentTab('pipeline')}
            className="flex items-center gap-3 shrink-0 cursor-pointer"
          >
            <div className="w-8 h-8 rounded bg-neutral-900 border border-neutral-700 flex items-center justify-center">
              <span className="font-mono font-bold text-sky-400 text-sm">C</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold tracking-tight text-sm text-white">CAVENTRA</span>
                <span className="px-1 py-0.2 text-[10px] font-mono uppercase rounded bg-neutral-900 text-neutral-400 border border-neutral-800">
                  CRM
                </span>
              </div>
              <p className="text-[10px] text-neutral-400 -mt-0.5 font-mono">Web Services & Security</p>
            </div>
          </div>

          {/* Navigation Bar - Crisp Rectangular Buttons */}
          <nav className="hidden md:flex items-center gap-1 bg-neutral-900 p-1 rounded border border-neutral-800">
            <button
              onClick={() => setCurrentTab('pipeline')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors ${
                currentTab === 'pipeline'
                  ? 'bg-neutral-800 text-white'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-neutral-400" />
              Pipeline
            </button>
            <button
              onClick={() => setCurrentTab('table')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors ${
                currentTab === 'table'
                  ? 'bg-neutral-800 text-white'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Table className="w-3.5 h-3.5 text-neutral-400" />
              Directory
            </button>
            <button
              onClick={() => setCurrentTab('calendar')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors ${
                currentTab === 'calendar'
                  ? 'bg-neutral-800 text-white'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <CalendarClock className="w-3.5 h-3.5 text-neutral-400" />
              Follow-ups
            </button>
            <button
              onClick={() => setCurrentTab('ingestion')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors ${
                currentTab === 'ingestion'
                  ? 'bg-neutral-800 text-white'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Cpu className="w-3.5 h-3.5 text-sky-400" />
              Ingestion Service
            </button>
          </nav>

          {/* Search Field */}
          <div className="relative flex-1 max-w-xs hidden lg:block">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-500" />
            <input
              type="text"
              placeholder="Search companies, domains, cities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-800 rounded pl-8 pr-3 py-1 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-600 transition-colors"
            />
          </div>

          {/* Action Controls & User Account Switcher */}
          <div className="flex items-center gap-2">
            
            {/* Run Ingestion Service */}
            <button
              onClick={onTriggerHarvest}
              disabled={isHarvesting}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-700 text-xs font-medium transition-colors"
              title="Execute scheduled lead discovery sequence"
            >
              <Cpu className={`w-3.5 h-3.5 ${isHarvesting ? 'animate-spin text-sky-400' : 'text-neutral-400'}`} />
              <span className="hidden sm:inline">
                {isHarvesting ? 'Ingesting...' : 'Run Ingestion'}
              </span>
            </button>

            {/* Add Lead */}
            <button
              onClick={onOpenAddModal}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New Lead</span>
            </button>

            {/* Account Switcher with Initials */}
            <div className="flex items-center gap-1.5 pl-2 border-l border-neutral-800">
              <div className="w-6 h-6 rounded bg-neutral-800 border border-neutral-700 flex items-center justify-center text-[10px] font-bold text-neutral-300 font-mono">
                {currentUser.initials}
              </div>
              <select
                value={currentUser.id}
                onChange={(e) => {
                  const u = users.find(x => x.id === e.target.value);
                  if (u) setCurrentUser(u);
                }}
                className="bg-neutral-900 border border-neutral-800 text-xs rounded px-2 py-1 text-neutral-200 focus:outline-none focus:border-neutral-700 cursor-pointer font-medium"
              >
                {users.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role})
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
