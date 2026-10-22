import React from 'react';
import { User, LeadSection } from '../types/crm';
import { 
  FileSpreadsheet, 
  Search, 
  Plus, 
  Users, 
  PhoneCall, 
  Phone,
  CalendarClock, 
  Clock, 
  CheckCircle, 
  XCircle, 
  LayoutGrid, 
  List,
  Sparkles,
  History,
  FolderSync,
  LogOut,
  UserCheck,
  Trash2,
  Mail
} from 'lucide-react';

interface NavbarProps {
  currentSection: LeadSection;
  setCurrentSection: (section: LeadSection) => void;
  viewMode: 'board' | 'list';
  setViewMode: (mode: 'board' | 'list') => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  users: User[];
  currentUser: User;
  setCurrentUser: (user: User) => void;
  onOpenAddModal: () => void;
  onOpenImportModal: () => void;
  onSyncDrive?: () => void;
  isSyncingDrive?: boolean;
  onPurgeLeads?: () => void;
  onLogout: () => void;
  followUpsCount: number;
  newLeadsCount: number;
  pendingCount?: number;
  onlyPhoneCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentSection,
  setCurrentSection,
  viewMode,
  setViewMode,
  searchQuery,
  setSearchQuery,
  users,
  currentUser,
  setCurrentUser,
  onOpenAddModal,
  onOpenImportModal,
  onSyncDrive,
  isSyncingDrive = false,
  onPurgeLeads,
  onLogout,
  followUpsCount,
  newLeadsCount,
  pendingCount = 0,
  onlyPhoneCount = 0,
}) => {
  const isFounder = currentUser.role === 'founder' || currentUser.role === 'admin';

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
      
      {/* Top Primary Navigation Bar */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-2 sm:gap-4">
          
          {/* Official CAVENTRA Logo & Brand */}
          <div 
            onClick={() => setCurrentSection('all')}
            className="flex items-center gap-2 sm:gap-3.5 shrink-0 cursor-pointer group"
          >
            <div className="bg-white p-0.5 sm:p-1 rounded-xl flex items-center justify-center">
              <img
                src="./caventra-logo.png"
                alt="CAVENTRA"
                className="h-8 sm:h-12 w-auto object-contain"
              />
            </div>
            <div className="hidden sm:block">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-slate-900 text-lg tracking-tight">CAVENTRA</span>
                <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase rounded bg-slate-100 text-slate-700 border border-slate-200 font-mono">
                  CRM
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono -mt-0.5">Web Infrastructure & Lead Pipeline</p>
            </div>
          </div>

          {/* Large Search Box (Desktop) */}
          <div className="relative flex-1 max-w-md hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by company, website, contact, phone, or city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
            />
          </div>

          {/* Action Controls & Primary Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            
            {/* View Mode Toggle (Board vs List) - Visible on mobile too */}
            {currentSection !== 'follow_ups' && currentSection !== 'import_history' && currentSection !== 'drive_import_status' && currentSection !== 'pending_registrations' && (
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                <button
                  onClick={() => setViewMode('board')}
                  className={`flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                    viewMode === 'board'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Board View"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Board</span>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                    viewMode === 'list'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="List View"
                >
                  <List className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">List</span>
                </button>
              </div>
            )}

            {/* Clearly Visible "Import Excel" Button */}
            <button
              onClick={onOpenImportModal}
              className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-300 transition-all shadow-sm shrink-0"
              title="Import leads from .xlsx, .xls, or .csv"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span className="hidden sm:inline">Import Excel</span>
              <span className="sm:hidden">Import</span>
            </button>

            {/* Add Lead Button */}
            <button
              onClick={onOpenAddModal}
              className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-all shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Lead</span>
              <span className="sm:hidden">Add</span>
            </button>

            {/* User Account / Role Badge & Logout */}
            <div className="flex items-center gap-1.5 sm:gap-2 pl-1.5 sm:pl-2 border-l border-slate-200">
              <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center font-mono shrink-0">
                {currentUser.initials}
              </div>
              <div className="hidden md:block text-left">
                <p className="text-xs font-bold text-slate-800 leading-none truncate max-w-[120px]">
                  {currentUser.name}
                </p>
                <span className={`inline-block text-[9px] font-bold font-mono uppercase px-1 py-0.2 rounded mt-0.5 ${
                  isFounder ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-600'
                }`}>
                  {isFounder ? 'Founder' : 'Employee'}
                </span>
              </div>

              {/* Founder Purge Leads Button */}
              {isFounder && onPurgeLeads && (
                <button
                  onClick={onPurgeLeads}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  title="Remove all leads from CRM (Zero impact on Google Drive)"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}

              {/* Sign Out Button */}
              <button
                onClick={onLogout}
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                title="Sign out of CRM session"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>

          </div>

        </div>

        {/* Mobile Search Input */}
        <div className="pb-2.5 pt-0.5 md:hidden">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by company, phone, email, city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
            />
          </div>
        </div>

      </div>

      {/* Sub-Navigation: Distinct Lead Sections */}
      <div className="bg-slate-50 border-t border-slate-200 px-3 sm:px-6 lg:px-8 overflow-x-auto scrollbar-none" style={{ WebkitOverflowScrolling: 'touch' }}>
        <div className="max-w-7xl mx-auto flex items-center gap-1.5 py-1.5 text-xs font-semibold whitespace-nowrap min-w-max">
          
          <button
            onClick={() => setCurrentSection('all')}
            className={`px-3 py-1.5 rounded-md transition-all ${
              currentSection === 'all'
                ? 'bg-white text-blue-700 shadow-sm border border-slate-200 font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            All Leads
          </button>

          <button
            onClick={() => setCurrentSection('new')}
            className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
              currentSection === 'new'
                ? 'bg-white text-blue-700 shadow-sm border border-slate-200 font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <span>New Leads</span>
            {newLeadsCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-blue-100 text-blue-800 font-bold font-mono">
                {newLeadsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setCurrentSection('to_contact')}
            className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
              currentSection === 'to_contact'
                ? 'bg-white text-blue-700 shadow-sm border border-slate-200 font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span>To Contact</span>
          </button>

          {/* Dedicated "Only Phone Numbers" Section */}
          <button
            onClick={() => setCurrentSection('only_phone_numbers')}
            className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
              currentSection === 'only_phone_numbers'
                ? 'bg-emerald-600 text-white shadow-sm font-bold border border-emerald-700'
                : 'text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 font-semibold'
            }`}
            title="Businesses with phone numbers only (no email address on record)"
          >
            <Phone className={`w-3.5 h-3.5 ${currentSection === 'only_phone_numbers' ? 'text-white' : 'text-emerald-600'}`} />
            <span>Only Phone Numbers</span>
            {onlyPhoneCount > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold font-mono ${
                currentSection === 'only_phone_numbers'
                  ? 'bg-emerald-800 text-white'
                  : 'bg-emerald-200 text-emerald-900'
              }`}>
                {onlyPhoneCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setCurrentSection('contacted')}
            className={`px-3 py-1.5 rounded-md transition-all ${
              currentSection === 'contacted'
                ? 'bg-white text-blue-700 shadow-sm border border-slate-200 font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            Contacted
          </button>

          <button
            onClick={() => setCurrentSection('follow_ups')}
            className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
              currentSection === 'follow_ups'
                ? 'bg-white text-blue-700 shadow-sm border border-slate-200 font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <CalendarClock className="w-3.5 h-3.5 text-amber-600" />
            <span>Follow-ups</span>
            {followUpsCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-100 text-amber-800 font-bold font-mono">
                {followUpsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setCurrentSection('in_discussion')}
            className={`px-3 py-1.5 rounded-md transition-all ${
              currentSection === 'in_discussion'
                ? 'bg-white text-blue-700 shadow-sm border border-slate-200 font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            In Discussion
          </button>

          <button
            onClick={() => setCurrentSection('won')}
            className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1 ${
              currentSection === 'won'
                ? 'bg-white text-emerald-700 shadow-sm border border-slate-200 font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
            <span>Won</span>
          </button>

          <button
            onClick={() => setCurrentSection('lost')}
            className={`px-3 py-1.5 rounded-md transition-all ${
              currentSection === 'lost'
                ? 'bg-white text-slate-800 shadow-sm border border-slate-200 font-bold'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            Lost
          </button>

          <div className="h-4 w-px bg-slate-300 mx-1"></div>

          <button
            onClick={() => setCurrentSection('import_history')}
            className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1 ${
              currentSection === 'import_history'
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200 font-bold'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
            }`}
          >
            <History className="w-3.5 h-3.5 text-slate-500" />
            <span>Import History</span>
          </button>

          <button
            onClick={() => setCurrentSection('drive_import_status')}
            className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
              currentSection === 'drive_import_status'
                ? 'bg-white text-blue-700 shadow-sm border border-slate-200 font-bold'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
            }`}
          >
            <FolderSync className="w-3.5 h-3.5 text-blue-600" />
            <span>Drive Import Status</span>
            <span className="px-1 py-0.2 rounded text-[9px] font-bold uppercase bg-blue-100 text-blue-800 font-mono">
              Admin
            </span>
          </button>

          <button
            onClick={() => setCurrentSection('email_outreach')}
            className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
              currentSection === 'email_outreach'
                ? 'bg-white text-blue-700 shadow-sm border border-slate-200 font-bold'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
            }`}
          >
            <Mail className="w-3.5 h-3.5 text-blue-600" />
            <span>Email Outreach</span>
            <span className="px-1 py-0.2 rounded text-[9px] font-bold uppercase bg-slate-200 text-slate-700 font-mono">
              Automation
            </span>
          </button>

          {isFounder && (
            <button
              onClick={() => setCurrentSection('pending_registrations')}
              className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
                currentSection === 'pending_registrations'
                  ? 'bg-white text-blue-700 shadow-sm border border-slate-200 font-bold'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5 text-amber-600" />
              <span>Pending Registrations</span>
              {pendingCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-100 text-amber-800 font-bold font-mono">
                  {pendingCount}
                </span>
              )}
            </button>
          )}

        </div>
      </div>

    </header>
  );
};
