import React from 'react';
import { User } from '../types/crm';
import { 
  Building2, 
  Sparkles, 
  Search, 
  LayoutDashboard, 
  Table, 
  CalendarClock, 
  Radio, 
  Bot, 
  ShieldCheck, 
  Plus
} from 'lucide-react';

interface NavbarProps {
  currentTab: 'pipeline' | 'table' | 'calendar' | 'ingestion';
  setCurrentTab: (tab: 'pipeline' | 'table' | 'calendar' | 'ingestion') => void;
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
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 p-[1px] shadow-lg shadow-indigo-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[11px] flex items-center justify-center">
                <Building2 className="w-5 h-5 text-indigo-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold tracking-tight text-lg text-white">CAVENTRA</span>
                <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  CRM
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono -mt-0.5">Web Services & Security</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800/80">
            <button
              onClick={() => setCurrentTab('pipeline')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                currentTab === 'pipeline'
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              Pipeline
            </button>
            <button
              onClick={() => setCurrentTab('table')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                currentTab === 'table'
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              All Leads
            </button>
            <button
              onClick={() => setCurrentTab('calendar')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                currentTab === 'calendar'
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <CalendarClock className="w-3.5 h-3.5" />
              Follow-ups
            </button>
            <button
              onClick={() => setCurrentTab('ingestion')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                currentTab === 'ingestion'
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Bot className="w-3.5 h-3.5 text-cyan-400" />
              Bot Hub
            </button>
          </nav>

          {/* Search Box */}
          <div className="relative flex-1 max-w-xs hidden lg:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search companies, domains, cities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950/80 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* Actions & User Profile */}
          <div className="flex items-center gap-2.5">
            {/* Quick Bot Trigger */}
            <button
              onClick={onTriggerHarvest}
              disabled={isHarvesting}
              className="relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold transition-all shadow-sm shadow-emerald-500/10"
              title="Trigger autonomous Gemini lead harvest now"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isHarvesting ? 'animate-spin text-emerald-300' : ''}`} />
              <span className="hidden sm:inline">
                {isHarvesting ? 'Harvesting...' : 'Run Bot'}
              </span>
            </button>

            {/* Add Lead Button */}
            <button
              onClick={onOpenAddModal}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all shadow-sm shadow-indigo-600/30"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Add Lead</span>
            </button>

            {/* Active User Switcher (Role Simulator) */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
              <div className="relative group">
                <select
                  value={currentUser.id}
                  onChange={(e) => {
                    const u = users.find(x => x.id === e.target.value);
                    if (u) setCurrentUser(u);
                  }}
                  className="bg-slate-950 border border-slate-800 text-xs rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer font-medium"
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
      </div>
    </header>
  );
};
