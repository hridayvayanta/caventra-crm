import React from 'react';
import { Lead, User } from '../types/crm';
import { 
  CalendarClock, 
  AlertTriangle, 
  CheckCircle2, 
  Building2, 
  Phone, 
  Mail, 
  ArrowRight,
  ExternalLink
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
  const todayLeads = leadsWithFollowUps.filter(l => l.nextFollowUpDate! === todayStr);
  const upcomingLeads = leadsWithFollowUps.filter(l => l.nextFollowUpDate! > todayStr);

  return (
    <div className="space-y-6">
      
      {/* Overdue Section */}
      {overdueLeads.length > 0 && (
        <div className="bg-rose-950/30 border border-rose-500/30 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-rose-400" />
            <h3 className="font-bold text-white text-sm">
              Critical: Overdue Outreach Follow-ups ({overdueLeads.length})
            </h3>
          </div>
          <p className="text-xs text-rose-200/80 mb-4">
            These leads had follow-ups scheduled in the past that have not been logged yet.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {overdueLeads.map(lead => {
              const assigned = users.find(u => u.id === lead.assignedTo);
              return (
                <div
                  key={lead.id}
                  onClick={() => onSelectLead(lead)}
                  className="bg-slate-900/90 border border-rose-500/40 hover:border-rose-400 rounded-xl p-3.5 cursor-pointer transition-all"
                >
                  <div className="flex items-start justify-between">
                    <h4 className="font-bold text-white text-sm">{lead.businessName}</h4>
                    <span className="text-[10px] font-bold text-rose-400 font-mono bg-rose-500/20 px-1.5 py-0.5 rounded">
                      Due: {lead.nextFollowUpDate}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 line-clamp-1 mt-1">
                    {lead.websiteCondition}
                  </p>
                  <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-slate-400 text-[11px]">
                      Assigned: {assigned ? assigned.name : 'Unassigned'}
                    </span>
                    <button className="text-indigo-400 font-semibold flex items-center gap-1 hover:text-indigo-300">
                      Open <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Today & Upcoming */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex items-center gap-2 mb-4">
          <CalendarClock className="w-5 h-5 text-indigo-400" />
          <h3 className="font-bold text-white text-sm">Scheduled Client Pipeline Schedule</h3>
        </div>

        {leadsWithFollowUps.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs">
            No follow-ups currently scheduled. Click any lead card to set a reminder date.
          </div>
        ) : (
          <div className="space-y-3">
            {leadsWithFollowUps.map(lead => {
              const assigned = users.find(u => u.id === lead.assignedTo);
              const isOverdue = lead.nextFollowUpDate! < todayStr;
              const isToday = lead.nextFollowUpDate! === todayStr;

              return (
                <div
                  key={lead.id}
                  onClick={() => onSelectLead(lead)}
                  className="bg-slate-950/60 hover:bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-2.5 h-2.5 rounded-full ${isOverdue ? 'bg-rose-400' : isToday ? 'bg-amber-400' : 'bg-emerald-400'}`}></div>
                    <div>
                      <div className="font-bold text-white text-xs sm:text-sm">{lead.businessName}</div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                        <span>{lead.city}</span>
                        <span>•</span>
                        <span className="text-indigo-400">{lead.serviceOpportunity}</span>
                        <span>•</span>
                        <span>Assigned to: {assigned ? assigned.name : 'Unassigned'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center">
                    <div className="text-right">
                      <div className="text-xs font-mono font-bold text-slate-200">
                        {lead.nextFollowUpDate}
                      </div>
                      <div className={`text-[10px] font-bold uppercase tracking-wider ${isOverdue ? 'text-rose-400' : isToday ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {isOverdue ? 'Overdue' : isToday ? 'Due Today' : 'Upcoming'}
                      </div>
                    </div>
                    <button className="px-2.5 py-1 bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs rounded-lg font-medium">
                      Manage
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
