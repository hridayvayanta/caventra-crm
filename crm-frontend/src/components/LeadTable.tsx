import React, { useState } from 'react';
import { Lead, LeadStatus, User } from '../types/crm';
import { 
  ExternalLink, 
  Filter, 
  ChevronRight,
  FileWarning
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
      case 'new': return 'bg-neutral-800 text-sky-400 border-neutral-700';
      case 'contacted': return 'bg-neutral-800 text-blue-300 border-neutral-700';
      case 'qualified': return 'bg-neutral-800 text-cyan-300 border-neutral-700';
      case 'proposal': return 'bg-neutral-800 text-amber-300 border-neutral-700';
      case 'won': return 'bg-neutral-800 text-emerald-400 border-neutral-700';
      default: return 'bg-neutral-900 text-neutral-500 border-neutral-800';
    }
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded overflow-hidden">
      
      {/* Table Filters Bar */}
      <div className="p-3.5 border-b border-neutral-800 flex flex-wrap items-center justify-between gap-3 bg-neutral-950">
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-neutral-400" />
          <span className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">Filter:</span>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-neutral-900 border border-neutral-800 text-xs rounded px-2.5 py-1 text-neutral-300 focus:outline-none focus:border-neutral-700"
          >
            <option value="all">All Stages ({leads.length})</option>
            <option value="new">New Ingested</option>
            <option value="contacted">Contacted</option>
            <option value="qualified">Qualified</option>
            <option value="proposal">Proposal Sent</option>
            <option value="won">Closed Won</option>
            <option value="lost">Lost</option>
          </select>

          <select
            value={industryFilter}
            onChange={(e) => setIndustryFilter(e.target.value)}
            className="bg-neutral-900 border border-neutral-800 text-xs rounded px-2.5 py-1 text-neutral-300 focus:outline-none focus:border-neutral-700"
          >
            <option value="all">All Industries</option>
            {industries.map(ind => (
              <option key={ind} value={ind}>{ind}</option>
            ))}
          </select>
        </div>

        <div className="text-xs text-neutral-400 font-mono">
          Showing <span className="font-semibold text-white">{filteredLeads.length}</span> records
        </div>
      </div>

      {/* Directory Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-neutral-800 bg-neutral-900/80 text-neutral-400 font-medium uppercase text-[10px] tracking-wider">
              <th className="py-2.5 px-3.5">Company & Domain</th>
              <th className="py-2.5 px-3.5">Contact & Location</th>
              <th className="py-2.5 px-3.5">Identified Need</th>
              <th className="py-2.5 px-3.5">Pipeline Stage</th>
              <th className="py-2.5 px-3.5">Assignee</th>
              <th className="py-2.5 px-3.5 text-right">Estimated Value</th>
              <th className="py-2.5 px-3.5 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800">
            {filteredLeads.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-neutral-500">
                  No records match the active criteria.
                </td>
              </tr>
            ) : (
              filteredLeads.map((lead) => {
                const assigned = users.find(u => u.id === lead.assignedTo);

                return (
                  <tr
                    key={lead.id}
                    onClick={() => onSelectLead(lead)}
                    className="hover:bg-neutral-850 transition-colors cursor-pointer group"
                  >
                    {/* Business & Domain */}
                    <td className="py-3 px-3.5">
                      <div className="font-semibold text-white group-hover:text-sky-300 transition-colors">
                        {lead.businessName}
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-neutral-400 font-mono mt-0.5">
                        <span className="truncate max-w-[180px]">{lead.normalizedDomain}</span>
                        <a
                          href={lead.website}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-neutral-500 hover:text-neutral-300"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </td>

                    {/* Contact & Location */}
                    <td className="py-3 px-3.5">
                      <div className="text-neutral-200">
                        {lead.contactName || <span className="text-neutral-500 italic">Unpublished</span>}
                      </div>
                      <div className="text-[11px] text-neutral-400">
                        {lead.city}, {lead.country}
                      </div>
                    </td>

                    {/* Identified Need */}
                    <td className="py-3 px-3.5 max-w-xs">
                      <span className="inline-block px-1.5 py-0.2 rounded text-[10px] font-medium bg-neutral-800 text-neutral-300 border border-neutral-700 mb-0.5">
                        {lead.serviceOpportunity}
                      </span>
                      <p className="text-[11px] text-neutral-400 line-clamp-1">
                        {lead.websiteCondition}
                      </p>
                    </td>

                    {/* Stage Badge */}
                    <td className="py-3 px-3.5">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider border ${getStatusBadge(lead.status)}`}>
                        {lead.status}
                      </span>
                    </td>

                    {/* Assignee initials */}
                    <td className="py-3 px-3.5">
                      {assigned ? (
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded bg-neutral-800 border border-neutral-700 flex items-center justify-center text-[9px] font-bold text-neutral-300 font-mono">
                            {assigned.initials}
                          </div>
                          <span className="text-neutral-300 text-[11px]">{assigned.name}</span>
                        </div>
                      ) : (
                        <span className="text-neutral-500 italic text-[11px]">Unassigned</span>
                      )}
                    </td>

                    {/* Value */}
                    <td className="py-3 px-3.5 text-right font-semibold text-white font-mono">
                      ₹{(lead.estimatedValue || 0).toLocaleString('en-IN')}
                    </td>

                    {/* Action */}
                    <td className="py-3 px-3.5 text-center">
                      <button 
                        onClick={() => onSelectLead(lead)}
                        className="p-1 rounded text-neutral-400 hover:text-white transition-colors"
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
