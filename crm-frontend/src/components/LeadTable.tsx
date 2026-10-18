import React, { useState } from 'react';
import { Lead, LeadStatus, User } from '../types/crm';
import { 
  ExternalLink, 
  Search, 
  Filter, 
  ArrowUpDown, 
  Phone, 
  Mail, 
  AlertCircle, 
  ChevronRight, 
  CheckCircle2, 
  Clock 
} from 'lucide-react';

interface LeadTableProps {
  leads: Lead[];
  users: User[];
  onSelectLead: (lead: Lead) => void;
  onUpdateLeadStatus: (leadId: string, newStatus: LeadStatus) => void;
}

export const LeadTable: React.FC<LeadTableProps> = ({
  leads,
  users,
  onSelectLead,
  onUpdateLeadStatus,
}) => {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [industryFilter, setIndustryFilter] = useState<string>('all');

  const industries = Array.from(new Set(leads.map(l => l.industry)));

  const filteredLeads = leads.filter(lead => {
    if (statusFilter !== 'all' && lead.status !== statusFilter) return false;
    if (industryFilter !== 'all' && lead.industry !== industryFilter) return false;
    return true;
  });

  const getStatusBadge = (status: LeadStatus) => {
    switch (status) {
      case 'new': return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
      case 'contacted': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'qualified': return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
      case 'proposal': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'won': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      default: return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
      
      {/* Table Filters Bar */}
      <div className="p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Filters:</span>
          
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-xs rounded-lg px-2.5 py-1.5 text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Statuses ({leads.length})</option>
            <option value="new">New</option>
            <option value="contacted">Contacted</option>
            <option value="qualified">Qualified</option>
            <option value="proposal">Proposal</option>
            <option value="won">Won</option>
            <option value="lost">Lost</option>
          </select>

          {/* Industry Filter */}
          <select
            value={industryFilter}
            onChange={(e) => setIndustryFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-xs rounded-lg px-2.5 py-1.5 text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Industries</option>
            {industries.map(ind => (
              <option key={ind} value={ind}>{ind}</option>
            ))}
          </select>
        </div>

        <div className="text-xs text-slate-400 font-mono">
          Showing <span className="font-bold text-white">{filteredLeads.length}</span> leads
        </div>
      </div>

      {/* Directory Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950/50 text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
              <th className="py-3 px-4">Business & Domain</th>
              <th className="py-3 px-4">Contact & Location</th>
              <th className="py-3 px-4">Website Flaw / Opportunity</th>
              <th className="py-3 px-4">Status & Stage</th>
              <th className="py-3 px-4">Assigned Rep</th>
              <th className="py-3 px-4 text-right">Value (₹)</th>
              <th className="py-3 px-4 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {filteredLeads.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-500">
                  No leads match the selected criteria.
                </td>
              </tr>
            ) : (
              filteredLeads.map((lead) => {
                const assigned = users.find(u => u.id === lead.assignedTo);

                return (
                  <tr
                    key={lead.id}
                    onClick={() => onSelectLead(lead)}
                    className="hover:bg-slate-800/40 transition-colors cursor-pointer group"
                  >
                    {/* Business & Domain */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-white group-hover:text-indigo-300 transition-colors">
                        {lead.businessName}
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono mt-0.5">
                        <span className="truncate max-w-[180px]">{lead.normalizedDomain}</span>
                        <a
                          href={lead.website}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-slate-500 hover:text-slate-300"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </td>

                    {/* Contact & Location */}
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-200">
                        {lead.contactName || <span className="text-slate-500 italic">Not found</span>}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {lead.city}, {lead.country}
                      </div>
                    </td>

                    {/* Website Diagnosis */}
                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-indigo-500/10 text-indigo-400 mb-1">
                        {lead.serviceOpportunity}
                      </div>
                      <p className="text-[11px] text-slate-300 line-clamp-1">
                        {lead.websiteCondition}
                      </p>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${getStatusBadge(lead.status)}`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                        <span className="capitalize">{lead.status}</span>
                      </span>
                    </td>

                    {/* Assigned Rep */}
                    <td className="py-3.5 px-4">
                      {assigned ? (
                        <div className="flex items-center gap-2">
                          <img
                            src={assigned.avatar}
                            alt={assigned.name}
                            className="w-5 h-5 rounded-full object-cover ring-1 ring-slate-700"
                          />
                          <span className="text-slate-300 font-medium text-[11px]">{assigned.name}</span>
                        </div>
                      ) : (
                        <span className="text-slate-500 italic text-[11px]">Unassigned</span>
                      )}
                    </td>

                    {/* Deal Value */}
                    <td className="py-3.5 px-4 text-right font-bold text-white font-mono">
                      ₹{(lead.estimatedValue || 0).toLocaleString('en-IN')}
                    </td>

                    {/* Action Icon */}
                    <td className="py-3.5 px-4 text-center">
                      <button 
                        onClick={() => onSelectLead(lead)}
                        className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
};
