import React from 'react';
import { Lead, LeadStatus, User } from '../types/crm';
import { ExternalLink, Phone, Mail, ChevronRight, CheckCircle2, Calendar, Clock } from 'lucide-react';

interface LeadListViewProps {
  leads: Lead[];
  users: User[];
  onSelectLead: (lead: Lead) => void;
  onUpdateStatus: (leadId: string, status: LeadStatus) => void;
  onOpenContactModal: (lead: Lead) => void;
  selectedLeadIds?: string[];
  onToggleSelectLead?: (leadId: string) => void;
  onSelectAllLeads?: (selected: boolean) => void;
  onDispatchSingleLead?: (lead: Lead) => void;
  isDispatchingSingleId?: string | null;
}

export const LeadListView: React.FC<LeadListViewProps> = ({
  leads,
  users,
  onSelectLead,
  onUpdateStatus,
  onOpenContactModal,
  selectedLeadIds = [],
  onToggleSelectLead,
  onSelectAllLeads,
  onDispatchSingleLead,
  isDispatchingSingleId,
}) => {
  const getStatusBadge = (status: LeadStatus) => {
    switch (status) {
      case 'new': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'to_contact': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'contacted': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'in_discussion': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'won': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
      
      {/* Mobile Card View (< md): Touch-Friendly & Thumb-Optimized */}
      <div className="md:hidden divide-y divide-slate-100">
        {leads.map((lead) => {
          const isOverdue = lead.nextFollowUpDate && new Date(lead.nextFollowUpDate) < new Date();
          const cleanPhone = (lead.businessPhone || '').replace(/[^\d]/g, '');

          return (
            <div
              key={lead.id}
              onClick={() => onSelectLead(lead)}
              className={`p-3.5 bg-white transition-colors cursor-pointer ${
                selectedLeadIds.includes(lead.id) ? 'bg-blue-50/50' : 'hover:bg-slate-50 active:bg-slate-100'
              }`}
            >
              {/* Row 1: Company Name & Stage */}
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {onToggleSelectLead && (
                    <input
                      type="checkbox"
                      checked={selectedLeadIds.includes(lead.id)}
                      onChange={() => onToggleSelectLead(lead.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer h-4 w-4 shrink-0"
                    />
                  )}
                  <div className="min-w-0">
                    <h4 className="font-bold text-slate-900 text-sm leading-tight truncate">
                      {lead.businessName}
                    </h4>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono mt-0.5">
                      <span>{lead.city}, {lead.country}</span>
                      {lead.normalizedDomain && !lead.normalizedDomain.includes('unknown') && !lead.normalizedDomain.endsWith('.local') && (
                        <span>• {lead.normalizedDomain}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 1-Tap Status Dropdown */}
                <select
                  value={lead.status}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => onUpdateStatus(lead.id, e.target.value as LeadStatus)}
                  className={`text-[11px] font-bold rounded-lg px-2 py-1 border cursor-pointer shrink-0 ${getStatusBadge(lead.status)}`}
                >
                  <option value="new">New</option>
                  <option value="to_contact">To Contact</option>
                  <option value="contacted">Contacted</option>
                  <option value="in_discussion">Discussion</option>
                  <option value="won">Won Deal</option>
                  <option value="lost">Lost</option>
                </select>
              </div>

              {/* Row 2: Need & Condition */}
              <div className="bg-slate-50 border border-slate-100 rounded-lg p-2 text-xs text-slate-600 mb-2.5">
                <span className="font-bold text-slate-800 text-[11px] block">{lead.serviceOpportunity}</span>
                <p className="line-clamp-1 text-[11px] text-slate-500">{lead.websiteCondition}</p>
              </div>

              {/* Row 3: Action Buttons (Call, WhatsApp, Email, Contacted) */}
              <div className="flex items-center justify-between gap-1.5 pt-0.5" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {lead.businessPhone && (
                    <a
                      href={`tel:${lead.businessPhone}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold shadow-sm"
                      title={`Call ${lead.businessPhone}`}
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>Call</span>
                    </a>
                  )}
                  {cleanPhone && (
                    <a
                      href={`https://wa.me/${cleanPhone}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-300"
                      title="Chat on WhatsApp"
                    >
                      <span>WhatsApp</span>
                    </a>
                  )}
                  {lead.businessEmail && (
                    <a
                      href={`mailto:${lead.businessEmail}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
                      title={`Email ${lead.businessEmail}`}
                    >
                      <Mail className="w-3 h-3 text-slate-500" />
                      <span>Email</span>
                    </a>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => onOpenContactModal(lead)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-lg border border-blue-200 shrink-0"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                  <span>Contacted</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop Table View (>= md) */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
              {onToggleSelectLead && (
                <th className="py-3 px-3 w-8 text-center" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={leads.length > 0 && selectedLeadIds.length === leads.length}
                    onChange={(e) => onSelectAllLeads?.(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </th>
              )}
              <th className="py-3 px-4">Company Name</th>
              <th className="py-3 px-4">Location</th>
              <th className="py-3 px-4">Identified Need</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Contact Action</th>
              <th className="py-3 px-4">Schedule / Follow-up</th>
              <th className="py-3 px-4 text-right">Value (₹)</th>
              <th className="py-3 px-4 text-center">Open</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {leads.map((lead) => {
              const isOverdue = lead.nextFollowUpDate && new Date(lead.nextFollowUpDate) < new Date();

              return (
                <tr 
                  key={lead.id} 
                  onClick={() => onSelectLead(lead)}
                  className={`hover:bg-slate-50 transition-colors cursor-pointer group ${selectedLeadIds.includes(lead.id) ? 'bg-blue-50/40' : ''}`}
                >
                  {onToggleSelectLead && (
                    <td className="py-3.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedLeadIds.includes(lead.id)}
                        onChange={() => onToggleSelectLead(lead.id)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                    </td>
                  )}
                  {/* Company & Domain */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                        {lead.businessName}
                      </span>
                      {lead.outreachStatus && (
                        <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold font-mono uppercase ${
                          lead.outreachStatus === 'sent' ? 'bg-emerald-100 text-emerald-800' :
                          lead.outreachStatus === 'replied' ? 'bg-indigo-100 text-indigo-800' :
                          lead.outreachStatus === 'bounced' ? 'bg-rose-100 text-rose-800' :
                          lead.outreachStatus === 'queued' ? 'bg-blue-100 text-blue-800' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          <Mail className="w-2.5 h-2.5" />
                          <span>{lead.outreachStatus}</span>
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5 font-mono">
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

                  {/* Location & Direct Contact Info */}
                  <td className="py-3.5 px-4 text-slate-600">
                    <div className="font-medium text-slate-800">{lead.city}, {lead.country}</div>
                    <div className="flex flex-col gap-0.5 mt-0.5">
                      {lead.contactName && (
                        <div className="text-[11px] text-slate-400">{lead.contactName}</div>
                      )}
                      {lead.businessPhone && (
                        <a
                          href={`tel:${lead.businessPhone}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-[11px] font-mono font-semibold text-emerald-700 hover:text-emerald-900 flex items-center gap-1"
                          title={`Call ${lead.businessPhone}`}
                        >
                          <Phone className="w-2.5 h-2.5" />
                          <span>{lead.businessPhone}</span>
                        </a>
                      )}
                      {lead.businessEmail && (
                        <a
                          href={`mailto:${lead.businessEmail}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-[10px] font-mono text-slate-500 hover:text-slate-800 flex items-center gap-1 truncate max-w-[160px]"
                          title={`Email ${lead.businessEmail}`}
                        >
                          <Mail className="w-2.5 h-2.5" />
                          <span>{lead.businessEmail}</span>
                        </a>
                      )}
                    </div>
                  </td>

                  {/* Need */}
                  <td className="py-3.5 px-4 max-w-xs">
                    <div className="font-semibold text-slate-800">{lead.serviceOpportunity}</div>
                    <div className="text-[11px] text-slate-500 line-clamp-1">{lead.websiteCondition}</div>
                  </td>

                  {/* Stage Dropdown */}
                  <td className="py-3.5 px-4">
                    <select
                      value={lead.status}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => onUpdateStatus(lead.id, e.target.value as LeadStatus)}
                      className={`text-xs font-semibold rounded-md px-2 py-1 border cursor-pointer ${getStatusBadge(lead.status)}`}
                    >
                      <option value="new">New</option>
                      <option value="to_contact">To Contact</option>
                      <option value="contacted">Contacted</option>
                      <option value="in_discussion">In Discussion</option>
                      <option value="won">Won Deal</option>
                      <option value="lost">Lost</option>
                    </select>
                  </td>

                  {/* Direct Contact & Mark Completed Action */}
                  <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {lead.businessPhone && (
                        <a
                          href={`tel:${lead.businessPhone}`}
                          title={`Direct call ${lead.businessPhone}`}
                          className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[11px] font-bold rounded border border-emerald-300 transition-colors flex items-center gap-1"
                        >
                          <Phone className="w-3 h-3 text-emerald-600" />
                          <span>Call</span>
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => onOpenContactModal(lead)}
                        className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-bold rounded border border-blue-200 transition-colors flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3 h-3 text-blue-600" />
                        <span>Contacted</span>
                      </button>
                      {(lead.businessEmail || lead.email) && lead.outreachStatus !== 'sent' && onDispatchSingleLead && (
                        <button
                          type="button"
                          title="Send 1-by-1 Outreach email now"
                          disabled={isDispatchingSingleId === lead.id}
                          onClick={() => onDispatchSingleLead(lead)}
                          className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-bold rounded border border-indigo-200 transition-colors flex items-center gap-1 disabled:opacity-50"
                        >
                          <Mail className="w-3 h-3 text-indigo-600" />
                          <span>{isDispatchingSingleId === lead.id ? '...' : '1-by-1'}</span>
                        </button>
                      )}
                    </div>
                  </td>

                  {/* Follow-up / Last contact date */}
                  <td className="py-3.5 px-4 font-mono text-[11px]">
                    {lead.nextFollowUpDate ? (
                      <span className={`inline-flex items-center gap-1 font-semibold ${isOverdue ? 'text-rose-600' : 'text-slate-700'}`}>
                        <Calendar className="w-3 h-3" />
                        <span>{lead.nextFollowUpDate} {isOverdue && '(OVERDUE)'}</span>
                      </span>
                    ) : lead.lastContactDate ? (
                      <span className="text-slate-400">Contacted {new Date(lead.lastContactDate).toLocaleDateString()}</span>
                    ) : (
                      <span className="text-slate-400 italic">None set</span>
                    )}
                  </td>

                  {/* Estimated Value */}
                  <td className="py-3.5 px-4 text-right font-bold text-slate-900 font-mono">
                    ₹{(lead.estimatedValue || 0).toLocaleString('en-IN')}
                  </td>

                  {/* Open Icon */}
                  <td className="py-3.5 px-4 text-center">
                    <button className="p-1 rounded text-slate-400 group-hover:text-blue-600">
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
