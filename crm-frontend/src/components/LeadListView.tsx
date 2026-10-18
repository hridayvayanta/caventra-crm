import React from 'react';
import { Lead, LeadStatus, User } from '../types/crm';
import { ExternalLink, Phone, Mail, ChevronRight } from 'lucide-react';

interface LeadListViewProps {
  leads: Lead[];
  users: User[];
  onSelectLead: (lead: Lead) => void;
  onUpdateStatus: (leadId: string, status: LeadStatus) => void;
}

export const LeadListView: React.FC<LeadListViewProps> = ({
  leads,
  users,
  onSelectLead,
  onUpdateStatus,
}) => {
  const getStatusBadge = (status: LeadStatus) => {
    switch (status) {
      case 'new': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'contacted': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'in_progress': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'won': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-bold uppercase text-[11px] tracking-wider">
              <th className="py-3 px-4">Company Name</th>
              <th className="py-3 px-4">Location</th>
              <th className="py-3 px-4">What They Need</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Direct Contact</th>
              <th className="py-3 px-4 text-right">Value (₹)</th>
              <th className="py-3 px-4 text-center">View</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {leads.map((lead) => (
              <tr 
                key={lead.id} 
                onClick={() => onSelectLead(lead)}
                className="hover:bg-slate-50 transition-colors cursor-pointer group"
              >
                <td className="py-3.5 px-4">
                  <div className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                    {lead.businessName}
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5">
                    <span>{lead.normalizedDomain}</span>
                    <a
                      href={lead.website}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-slate-400 hover:text-blue-600"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </td>

                <td className="py-3.5 px-4 text-slate-600">
                  {lead.city}, {lead.country}
                </td>

                <td className="py-3.5 px-4 max-w-xs">
                  <div className="font-semibold text-slate-800">{lead.serviceOpportunity}</div>
                  <div className="text-[11px] text-slate-500 line-clamp-1">{lead.websiteCondition}</div>
                </td>

                <td className="py-3.5 px-4">
                  <select
                    value={lead.status}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => onUpdateStatus(lead.id, e.target.value as LeadStatus)}
                    className={`text-xs font-semibold rounded-md px-2 py-1 border cursor-pointer ${getStatusBadge(lead.status)}`}
                  >
                    <option value="new">New</option>
                    <option value="contacted">Contacted</option>
                    <option value="in_progress">In Progress</option>
                    <option value="won">Won Deal</option>
                    <option value="lost">Lost</option>
                  </select>
                </td>

                <td className="py-3.5 px-4">
                  <div className="flex items-center gap-1.5">
                    {lead.businessPhone && (
                      <a
                        href={`tel:${lead.businessPhone}`}
                        onClick={(e) => e.stopPropagation()}
                        className="p-1.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700"
                        title={`Call ${lead.businessPhone}`}
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </a>
                    )}
                    {lead.businessEmail && (
                      <a
                        href={`mailto:${lead.businessEmail}`}
                        onClick={(e) => e.stopPropagation()}
                        className="p-1.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700"
                        title={`Email ${lead.businessEmail}`}
                      >
                        <Mail className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </td>

                <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                  ₹{(lead.estimatedValue || 0).toLocaleString('en-IN')}
                </td>

                <td className="py-3.5 px-4 text-center">
                  <button className="p-1 rounded text-slate-400 group-hover:text-blue-600">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
