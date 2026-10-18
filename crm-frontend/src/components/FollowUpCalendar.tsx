import React from 'react';
import { Lead, User } from '../types/crm';
import { 
  CalendarClock, 
  AlertTriangle, 
  Calendar,
  ArrowRight
} from 'lucide-react';

interface FollowUpCalendarProps {
  leads: Lead[];
  users: User[];
  onSelectLead: (lead: Lead) => void;
}

export const FollowUpCalendar: React.FC<FollowUpCalendarProps> = ({
  leads,
  users,
  onSelectLead,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];

  const leadsWithFollowUps = leads
    .filter(l => l.nextFollowUpDate && l.status !== 'won' && l.status !== 'lost')
    .sort((a, b) => (a.nextFollowUpDate! > b.nextFollowUpDate! ? 1 : -1));

  const overdueLeads = leadsWithFollowUps.filter(l => l.nextFollowUpDate! < todayStr);

  return (
    <div className="space-y-5">
      
      {/* Overdue Section */}
      {overdueLeads.length > 0 && (
        <div className="bg-neutral-900 border border-rose-900/60 rounded p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            <h3 className="font-semibold text-white text-xs uppercase tracking-wider">
              Overdue Outreach Tasks ({overdueLeads.length})
            </h3>
          </div>
          <p className="text-xs text-neutral-400 mb-3">
            The scheduled follow-up dates for these organizations have elapsed without an updated activity log.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {overdueLeads.map(lead => {
              const assigned = users.find(u => u.id === lead.assignedTo);
              return (
                <div
                  key={lead.id}
                  onClick={() => onSelectLead(lead)}
                  className="bg-neutral-950 border border-neutral-800 hover:border-neutral-700 rounded p-3 cursor-pointer transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <h4 className="font-semibold text-white text-xs">{lead.businessName}</h4>
                    <span className="text-[10px] font-mono text-rose-400 bg-rose-950/60 px-1.5 py-0.2 rounded border border-rose-900">
                      Due: {lead.nextFollowUpDate}
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-400 line-clamp-1 mt-1 font-mono">
                    {lead.websiteCondition}
                  </p>
                  <div className="mt-2.5 pt-2 border-t border-neutral-800 flex items-center justify-between text-xs">
                    <span className="text-neutral-500 text-[11px]">
                      Assignee: {assigned ? assigned.name : 'Unassigned'}
                    </span>
                    <button className="text-sky-400 font-medium text-xs flex items-center gap-1 hover:text-sky-300">
                      Manage <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Scheduled Tasks List */}
      <div className="bg-neutral-900 border border-neutral-800 rounded p-4">
        <div className="flex items-center gap-2 mb-4">
          <CalendarClock className="w-4 h-4 text-neutral-400" />
          <h3 className="font-semibold text-white text-xs uppercase tracking-wider">Prospect Outreach Schedule</h3>
        </div>

        {leadsWithFollowUps.length === 0 ? (
          <div className="py-10 text-center text-neutral-500 text-xs">
            No follow-ups currently scheduled. Open any lead record to configure an outreach target date.
          </div>
        ) : (
          <div className="space-y-2">
            {leadsWithFollowUps.map(lead => {
              const assigned = users.find(u => u.id === lead.assignedTo);
              const isOverdue = lead.nextFollowUpDate! < todayStr;
              const isToday = lead.nextFollowUpDate! === todayStr;

              return (
                <div
                  key={lead.id}
                  onClick={() => onSelectLead(lead)}
                  className="bg-neutral-950 hover:bg-neutral-850 border border-neutral-800 rounded p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer transition-colors"
                >
                  <div>
                    <div className="font-semibold text-white text-xs">{lead.businessName}</div>
                    <div className="text-[11px] text-neutral-400 flex items-center gap-2 mt-0.5">
                      <span>{lead.city}</span>
                      <span>•</span>
                      <span className="text-neutral-300">{lead.serviceOpportunity}</span>
                      <span>•</span>
                      <span>Assignee: {assigned ? assigned.name : 'Unassigned'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center">
                    <div className="text-right">
                      <div className="text-xs font-mono font-semibold text-white">
                        {lead.nextFollowUpDate}
                      </div>
                      <div className={`text-[10px] font-mono uppercase tracking-wider ${isOverdue ? 'text-rose-400 font-semibold' : isToday ? 'text-amber-400' : 'text-neutral-400'}`}>
                        {isOverdue ? 'Overdue' : isToday ? 'Due Today' : 'Scheduled'}
                      </div>
                    </div>
                    <button className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs rounded border border-neutral-700 font-medium">
                      Open
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};
