import React from 'react';
import { Lead, LeadStatus, User } from '../types/crm';
import { 
  Building2, 
  ExternalLink, 
  AlertCircle, 
  Clock, 
  User as UserIcon, 
  ArrowRight, 
  ShieldAlert, 
  Zap, 
  CheckCircle, 
  Calendar 
} from 'lucide-react';

interface PipelineBoardProps {
  leads: Lead[];
  users: User[];
  onSelectLead: (lead: Lead) => void;
  onUpdateLeadStatus: (leadId: string, newStatus: LeadStatus) => void;
}

const COLUMNS: { id: LeadStatus; label: string; color: string; border: string; bg: string }[] = [
  { id: 'new', label: 'New Ingested', color: 'text-indigo-400', border: 'border-indigo-500/30', bg: 'bg-indigo-500/5' },
  { id: 'contacted', label: 'First Touch / Contacted', color: 'text-blue-400', border: 'border-blue-500/30', bg: 'bg-blue-500/5' },
  { id: 'qualified', label: 'Audit Discussed / Qualified', color: 'text-cyan-400', border: 'border-cyan-500/30', bg: 'bg-cyan-500/5' },
  { id: 'proposal', label: 'Proposal Sent', color: 'text-amber-400', border: 'border-amber-500/30', bg: 'bg-amber-500/5' },
  { id: 'won', label: 'Closed Won 🎉', color: 'text-emerald-400', border: 'border-emerald-500/30', bg: 'bg-emerald-500/5' },
  { id: 'lost', label: 'Lost / Disqualified', color: 'text-slate-400', border: 'border-slate-700/50', bg: 'bg-slate-800/20' },
];

export const PipelineBoard: React.FC<PipelineBoardProps> = ({
  leads,
  users,
  onSelectLead,
  onUpdateLeadStatus,
}) => {
  const getNextStatus = (current: LeadStatus): LeadStatus | null => {
    switch (current) {
      case 'new': return 'contacted';
      case 'contacted': return 'qualified';
      case 'qualified': return 'proposal';
      case 'proposal': return 'won';
      default: return null;
    }
  };

  const getPriorityBadge = (priority: Lead['priority']) => {
    switch (priority) {
      case 'urgent': return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
      case 'high': return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
      case 'medium': return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      default: return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  const getServiceBadge = (service: Lead['serviceOpportunity']) => {
    switch (service) {
      case 'Security Audit': return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
      case 'Speed Optimization': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'Redesign': return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20';
      case 'Hosting': return 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20';
      default: return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    }
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-6 pt-1 select-none">
      {COLUMNS.map((col) => {
        const columnLeads = leads.filter(l => l.status === col.id);
        const columnValue = columnLeads.reduce((acc, curr) => acc + (curr.estimatedValue || 0), 0);

        return (
          <div
            key={col.id}
            className={`flex-shrink-0 w-80 rounded-2xl border ${col.border} ${col.bg} flex flex-col max-h-[calc(100vh-210px)]`}
          >
            {/* Column Header */}
            <div className="p-3.5 border-b border-slate-800/80 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className={`text-xs font-bold uppercase tracking-wider ${col.color}`}>
                    {col.label}
                  </h3>
                  <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-300">
                    {columnLeads.length}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                  ₹{columnValue.toLocaleString('en-IN')}
                </div>
              </div>
            </div>

            {/* Leads Card Container */}
            <div className="p-2.5 overflow-y-auto space-y-2.5 flex-1">
              {columnLeads.length === 0 ? (
                <div className="h-32 rounded-xl border border-dashed border-slate-800/80 flex flex-col items-center justify-center text-slate-500 text-xs">
                  <span>No leads in {col.label}</span>
                </div>
              ) : (
                columnLeads.map((lead) => {
                  const assignedUser = users.find(u => u.id === lead.assignedTo);
                  const nextStatus = getNextStatus(lead.status);
                  const isOverdue = lead.nextFollowUpDate && new Date(lead.nextFollowUpDate) < new Date();

                  return (
                    <div
                      key={lead.id}
                      onClick={() => onSelectLead(lead)}
                      className="group bg-slate-900/90 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 rounded-xl p-3.5 shadow-sm hover:shadow-md transition-all cursor-pointer relative"
                    >
                      {/* Top Row: Business Name & Website */}
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <h4 className="font-bold text-sm text-white group-hover:text-indigo-300 transition-colors line-clamp-1">
                          {lead.businessName}
                        </h4>
                        <a
                          href={lead.website}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-slate-500 hover:text-slate-300 shrink-0 p-0.5"
                          title="Open client website"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>

                      {/* City & Industry */}
                      <div className="text-[11px] text-slate-400 mb-2 flex items-center gap-1.5">
                        <span>{lead.city}</span>
                        <span>•</span>
                        <span className="truncate">{lead.industry}</span>
                      </div>

                      {/* Website Issue Highlight (Diagnostic Tag) */}
                      <div className="mb-3 bg-slate-950/70 rounded-lg p-2 border border-slate-800/80">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-400 mb-0.5">
                          <AlertCircle className="w-3 h-3 shrink-0" />
                          <span>Website Vulnerability / Need:</span>
                        </div>
                        <p className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed">
                          {lead.websiteCondition}
                        </p>
                      </div>

                      {/* Opportunity & Priority Badges */}
                      <div className="flex items-center gap-1.5 flex-wrap mb-3">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${getServiceBadge(lead.serviceOpportunity)}`}>
                          {lead.serviceOpportunity}
                        </span>
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${getPriorityBadge(lead.priority)}`}>
                          {lead.priority}
                        </span>
                        {lead.verifiedStatus === 'ai_inferred' && (
                          <span className="text-[10px] text-purple-300 bg-purple-500/10 border border-purple-500/20 px-1.5 py-0.5 rounded">
                            🤖 AI Inferred
                          </span>
                        )}
                      </div>

                      {/* Card Footer: Assignee & Value & Quick Advance */}
                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2 text-xs">
                        {/* Assignee */}
                        <div className="flex items-center gap-1.5">
                          {assignedUser ? (
                            <img
                              src={assignedUser.avatar}
                              alt={assignedUser.name}
                              className="w-5 h-5 rounded-full object-cover ring-1 ring-slate-700"
                              title={`Assigned to ${assignedUser.name}`}
                            />
                          ) : (
                            <span className="text-[10px] font-medium text-slate-500 flex items-center gap-1">
                              <UserIcon className="w-3 h-3" /> Unassigned
                            </span>
                          )}
                          <span className="font-bold text-white text-xs">
                            ₹{(lead.estimatedValue || 0).toLocaleString('en-IN')}
                          </span>
                        </div>

                        {/* Quick Status Forward Button */}
                        {nextStatus && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onUpdateLeadStatus(lead.id, nextStatus);
                            }}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-indigo-400 bg-slate-800/60 hover:bg-slate-800 px-2 py-1 rounded transition-colors"
                            title={`Move to ${nextStatus}`}
                          >
                            <span>Advance</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      {/* Follow-up Due Warning */}
                      {lead.nextFollowUpDate && (
                        <div className={`mt-2 text-[10px] font-medium flex items-center gap-1 ${isOverdue ? 'text-rose-400 font-bold' : 'text-slate-400'}`}>
                          <Calendar className="w-3 h-3" />
                          <span>Follow-up: {lead.nextFollowUpDate} {isOverdue && '(OVERDUE)'}</span>
                        </div>
                      )}

                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
