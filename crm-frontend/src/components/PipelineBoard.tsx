import React from 'react';
import { Lead, LeadStatus, User } from '../types/crm';
import { 
  ExternalLink, 
  AlertCircle, 
  Clock, 
  ArrowRight, 
  Calendar,
  CheckCircle,
  FileWarning
} from 'lucide-react';

interface PipelineBoardProps {
  leads: Lead[];
  users: User[];
  onSelectLead: (lead: Lead) => void;
  onUpdateLeadStatus: (leadId: string, newStatus: LeadStatus) => void;
}

const COLUMNS: { id: LeadStatus; label: string }[] = [
  { id: 'new', label: 'New Ingested' },
  { id: 'contacted', label: 'Contacted' },
  { id: 'qualified', label: 'Qualified' },
  { id: 'proposal', label: 'Proposal Sent' },
  { id: 'won', label: 'Closed Won' },
  { id: 'lost', label: 'Lost / Disqualified' },
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
      case 'urgent': return 'bg-rose-950/60 text-rose-300 border-rose-800';
      case 'high': return 'bg-amber-950/60 text-amber-300 border-amber-800';
      case 'medium': return 'bg-neutral-800 text-neutral-300 border-neutral-700';
      default: return 'bg-neutral-900 text-neutral-400 border-neutral-800';
    }
  };

  return (
    <div className="flex gap-3 overflow-x-auto pb-6 pt-1 select-none">
      {COLUMNS.map((col) => {
        const columnLeads = leads.filter(l => l.status === col.id);
        const columnValue = columnLeads.reduce((acc, curr) => acc + (curr.estimatedValue || 0), 0);

        return (
          <div
            key={col.id}
            className="shrink-0 w-80 rounded bg-neutral-900/60 border border-neutral-800 flex flex-col max-h-[calc(100vh-210px)]"
          >
            {/* Column Header */}
            <div className="p-3 border-b border-neutral-800 flex items-center justify-between bg-neutral-900">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-neutral-200 uppercase tracking-wider">
                  {col.label}
                </span>
                <span className="text-[11px] font-mono px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-400 border border-neutral-700">
                  {columnLeads.length}
                </span>
              </div>
              <div className="text-[11px] text-neutral-400 font-mono">
                ₹{columnValue.toLocaleString('en-IN')}
              </div>
            </div>

            {/* Leads Card Container */}
            <div className="p-2 overflow-y-auto space-y-2 flex-1">
              {columnLeads.length === 0 ? (
                <div className="h-28 rounded border border-dashed border-neutral-800 flex items-center justify-center text-neutral-500 text-xs">
                  No prospects in {col.label}
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
                      className="bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 hover:border-neutral-700 rounded p-3 transition-colors cursor-pointer"
                    >
                      {/* Business Name & External Link */}
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className="font-semibold text-xs text-white hover:text-sky-300 transition-colors line-clamp-1">
                          {lead.businessName}
                        </h4>
                        <a
                          href={lead.website}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-neutral-500 hover:text-neutral-300 shrink-0"
                          title="Open client website"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>

                      {/* City & Industry */}
                      <div className="text-[11px] text-neutral-400 mb-2 flex items-center gap-1.5">
                        <span>{lead.city}</span>
                        <span>•</span>
                        <span className="truncate">{lead.industry}</span>
                      </div>

                      {/* Technical Diagnosis Note */}
                      <div className="mb-2.5 bg-neutral-950 p-2 rounded border border-neutral-800 text-[11px] text-neutral-300 leading-snug">
                        <div className="text-[10px] font-semibold text-neutral-400 mb-0.5 flex items-center gap-1">
                          <FileWarning className="w-3 h-3 text-amber-400" />
                          <span>Technical Deficiency:</span>
                        </div>
                        <p className="line-clamp-2">{lead.websiteCondition}</p>
                      </div>

                      {/* Badges */}
                      <div className="flex items-center gap-1 flex-wrap mb-2.5 text-[10px]">
                        <span className="px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700 font-medium">
                          {lead.serviceOpportunity}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded border uppercase tracking-wider font-semibold ${getPriorityBadge(lead.priority)}`}>
                          {lead.priority}
                        </span>
                        {lead.verificationLevel === 'automated_scan' && (
                          <span className="px-1.5 py-0.5 rounded bg-neutral-950 text-neutral-400 border border-neutral-800">
                            Automated Discovery
                          </span>
                        )}
                      </div>

                      {/* Card Footer: Assignee & Value & Next Step */}
                      <div className="pt-2 border-t border-neutral-800 flex items-center justify-between text-xs">
                        {/* Assignee initials badge */}
                        <div className="flex items-center gap-1.5">
                          {assignedUser ? (
                            <div 
                              className="w-5 h-5 rounded bg-neutral-800 border border-neutral-700 flex items-center justify-center text-[9px] font-bold text-neutral-300 font-mono"
                              title={`Assigned to ${assignedUser.name}`}
                            >
                              {assignedUser.initials}
                            </div>
                          ) : (
                            <span className="text-[10px] text-neutral-500 italic">Unassigned</span>
                          )}
                          <span className="font-mono font-semibold text-white text-xs">
                            ₹{(lead.estimatedValue || 0).toLocaleString('en-IN')}
                          </span>
                        </div>

                        {/* Advance button */}
                        {nextStatus && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onUpdateLeadStatus(lead.id, nextStatus);
                            }}
                            className="inline-flex items-center gap-1 text-[10px] font-medium text-neutral-400 hover:text-white bg-neutral-800 hover:bg-neutral-750 px-2 py-0.5 rounded border border-neutral-700 transition-colors"
                            title={`Advance stage to ${nextStatus}`}
                          >
                            <span>Advance</span>
                            <ArrowRight className="w-2.5 h-2.5" />
                          </button>
                        )}
                      </div>

                      {/* Follow-up Due */}
                      {lead.nextFollowUpDate && (
                        <div className={`mt-2 text-[10px] flex items-center gap-1 font-mono ${isOverdue ? 'text-rose-400 font-semibold' : 'text-neutral-400'}`}>
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
