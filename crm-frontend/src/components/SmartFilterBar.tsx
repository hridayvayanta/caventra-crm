import React from 'react';
import { 
  ContactMethodFilter, 
  LeadStatus, 
  LeadSection 
} from '../types/crm';
import { 
  Filter, 
  Phone, 
  Mail, 
  Globe, 
  AlertTriangle, 
  RotateCcw, 
  Check, 
  ChevronDown,
  Layers,
  Sparkles
} from 'lucide-react';

interface CountryItem {
  code: string;
  name: string;
  flag: string;
  count: number;
}

interface SmartFilterBarProps {
  currentSection: LeadSection;
  contactMethodFilter: ContactMethodFilter;
  setContactMethodFilter: (method: ContactMethodFilter) => void;
  countryFilter: string;
  setCountryFilter: (country: string) => void;
  statusFilter: 'all' | LeadStatus;
  setStatusFilter: (status: 'all' | LeadStatus) => void;
  availableCountries: CountryItem[];
  filteredCount: number;
  totalCount: number;
  onResetFilters: () => void;
}

export const SmartFilterBar: React.FC<SmartFilterBarProps> = ({
  currentSection,
  contactMethodFilter,
  setContactMethodFilter,
  countryFilter,
  setCountryFilter,
  statusFilter,
  setStatusFilter,
  availableCountries,
  filteredCount,
  totalCount,
  onResetFilters,
}) => {
  const isIndianSection = currentSection === 'indian_leads';
  const isInternationalSection = currentSection === 'international_leads';

  // Has non-default filters applied
  const hasActiveFilters = 
    contactMethodFilter !== 'all' || 
    (countryFilter !== 'all' && !isIndianSection) || 
    statusFilter !== 'all';

  // Filter country list for international section (exclude India)
  const displayCountries = isInternationalSection 
    ? availableCountries.filter(c => c.name.toLowerCase() !== 'india' && c.code !== 'IN')
    : availableCountries;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4 mb-4 shadow-sm">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        
        {/* Left: Contact Method Filters */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mr-1 shrink-0">
            <Filter className="w-3.5 h-3.5 text-blue-600" />
            <span className="hidden sm:inline">Contact Method:</span>
          </div>

          {/* All */}
          <button
            type="button"
            onClick={() => setContactMethodFilter('all')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              contactMethodFilter === 'all'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All
          </button>

          {/* Phone Leads (Any lead with phone) */}
          <button
            type="button"
            onClick={() => setContactMethodFilter('phone')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer ${
              contactMethodFilter === 'phone'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
            title="All prospects with a valid phone number"
          >
            <Phone className="w-3 h-3" />
            <span>Phone Leads</span>
          </button>

          {/* Email Leads (Any lead with email) */}
          <button
            type="button"
            onClick={() => setContactMethodFilter('email')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer ${
              contactMethodFilter === 'email'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
            title="All prospects with a valid email address"
          >
            <Mail className="w-3 h-3" />
            <span>Email Leads</span>
          </button>

          {/* Phone Only */}
          <button
            type="button"
            onClick={() => setContactMethodFilter('phone_only')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              contactMethodFilter === 'phone_only'
                ? 'bg-emerald-700 text-white shadow-sm'
                : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
            }`}
            title="Valid phone number, NO email address"
          >
            Phone-Only
          </button>

          {/* Email Only */}
          <button
            type="button"
            onClick={() => setContactMethodFilter('email_only')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              contactMethodFilter === 'email_only'
                ? 'bg-indigo-700 text-white shadow-sm'
                : 'bg-indigo-50 text-indigo-800 border border-indigo-200 hover:bg-indigo-100'
            }`}
            title="Valid email address, NO phone number"
          >
            Email-Only
          </button>

          {/* Both Phone & Email */}
          <button
            type="button"
            onClick={() => setContactMethodFilter('both')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              contactMethodFilter === 'both'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100'
            }`}
            title="Both valid phone number AND email address available"
          >
            Both Phone & Email
          </button>

          {/* Missing Contact Details */}
          <button
            type="button"
            onClick={() => setContactMethodFilter('missing')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer ${
              contactMethodFilter === 'missing'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100'
            }`}
            title="Flagged for review: Missing both valid phone and email"
          >
            <AlertTriangle className="w-3 h-3 text-rose-500" />
            <span>Missing Details</span>
          </button>
        </div>

        {/* Right: Country Dropdown, Status Filter, Reset, and Count */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
          
          {/* Country Selector (Visible for International Leads or All Leads) */}
          {!isIndianSection && displayCountries.length > 0 && (
            <div className="relative">
              <select
                value={countryFilter}
                onChange={(e) => setCountryFilter(e.target.value)}
                className="bg-slate-50 border border-slate-300 text-slate-800 text-xs font-medium rounded-lg px-2.5 py-1.5 pr-7 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="all">
                  {isInternationalSection ? 'All International Countries' : 'All Countries'}
                </option>
                {displayCountries.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.flag} {c.name} ({c.count})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Lead Status Filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-slate-50 border border-slate-300 text-slate-800 text-xs font-medium rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="all">All Stages</option>
              <option value="new">New</option>
              <option value="to_contact">To Contact</option>
              <option value="contacted">Contacted</option>
              <option value="in_discussion">In Discussion</option>
              <option value="won">Won</option>
              <option value="lost">Lost</option>
            </select>
          </div>

          {/* Reset Filters Button */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={onResetFilters}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
              title="Reset all filters"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}

          {/* Showing Count Indicator */}
          <div className="text-[11px] font-mono font-semibold text-slate-500 bg-slate-100/80 px-2 py-1 rounded-md border border-slate-200 whitespace-nowrap">
            {filteredCount} / {totalCount} leads
          </div>

        </div>

      </div>

      {/* Country Chips Shortcut for International Leads Section */}
      {isInternationalSection && displayCountries.length > 0 && (
        <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0">
            Phone Country:
          </span>
          <button
            type="button"
            onClick={() => setCountryFilter('all')}
            className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition-all shrink-0 cursor-pointer ${
              countryFilter === 'all'
                ? 'bg-slate-800 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All ({displayCountries.reduce((sum, c) => sum + c.count, 0)})
          </button>
          {displayCountries.map((c) => (
            <button
              key={c.name}
              type="button"
              onClick={() => setCountryFilter(c.name)}
              className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition-all shrink-0 flex items-center gap-1 cursor-pointer ${
                countryFilter.toLowerCase() === c.name.toLowerCase()
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <span>{c.flag}</span>
              <span>{c.name}</span>
              <span className={`text-[10px] font-mono px-1 rounded ${
                countryFilter.toLowerCase() === c.name.toLowerCase()
                  ? 'bg-blue-700 text-white'
                  : 'bg-slate-200 text-slate-600'
              }`}>
                {c.count}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Active Filter Description Banner */}
      {hasActiveFilters && (
        <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-slate-700">Applied Filter:</span>
            {isIndianSection && (
              <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-medium">
                🇮🇳 Indian Leads
              </span>
            )}
            {isInternationalSection && (
              <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 font-medium">
                🌐 International Leads
              </span>
            )}
            {countryFilter !== 'all' && (
              <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200 font-medium">
                Country: {countryFilter}
              </span>
            )}
            {contactMethodFilter !== 'all' && (
              <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200 font-medium capitalize">
                Method: {contactMethodFilter.replace('_', ' ')}
              </span>
            )}
            {statusFilter !== 'all' && (
              <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200 font-medium capitalize">
                Stage: {statusFilter.replace('_', ' ')}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onResetFilters}
            className="text-blue-600 hover:underline text-[11px] font-semibold shrink-0 cursor-pointer"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
};
