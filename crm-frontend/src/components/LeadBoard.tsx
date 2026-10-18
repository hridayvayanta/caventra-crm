import React from 'react';
import { Lead, LeadStatus, User } from '../types/crm';
import { LeadCard } from './LeadCard';

interface LeadBoardProps {
  leads: Lead[];
  users: User[];
  onSelectLead: (lead: Lead) => void;
  onUpdateStatus: (leadId: string, status: LeadStatus) => void;
  onOpenContactModal: (lead: Lead) => void;
}

const COLUMNS: { id: LeadStatus; label: string; headerColor: string; dotColor: string }[] = [
  { id: 'new', label: '1. New Leads', headerColor: 'text-blue-700', dotColor: 'bg-blue-600' },
  { id: 'to_contact', label: '2. To Contact', headerColor: 'text-indigo-700', dotColor: 'bg-indigo-600' },
  { id: 'contacted', label: '3. Contacted', headerColor: 'text-amber-700', dotColor: 'bg-amber-600' },
  { id: 'in_discussion', label: '4. In Discussion', headerColor: 'text-purple-700', dotColor: 'bg-purple-600' },
  { id: 'won', label: '5. Deals Won', headerColor: 'text-emerald-700', dotColor: 'bg-emerald-600' },
  { id: 'lost', label: '6. Lost / Inactive', headerColor: 'text-slate-600', dotColor: 'bg-slate-400' },
];

export const LeadBoard: React.FC<LeadBoardProps> = ({
  leads,
  users,
  onSelectLead,
  onUpdateStatus,
  onOpenContactModal,
}) => {
  return (
    <div className="flex gap-4 overflow-x-auto pb-6 select-none items-start">
      {COLUMNS.map((col) => {
        const columnLeads = leads.filter(l => l.status === col.id);

        return (
          <div key={col.id} className="w-80 shrink-0 bg-slate-100/70 border border-slate-200/80 rounded-2xl p-3.5 flex flex-col min-h-[500px]">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${col.dotColor}`}></span>
                <span className={`text-xs font-bold uppercase tracking-wider ${col.headerColor}`}>
                  {col.label}
                </span>
              </div>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white text-slate-700 border border-slate-200 font-mono">
                {columnLeads.length}
              </span>
            </div>

            {/* Cards List */}
            <div className="space-y-3 flex-1">
              {columnLeads.length === 0 ? (
                <div className="h-32 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-400 text-xs font-medium text-center p-4">
                  No leads in {col.label}
                </div>
              ) : (
                columnLeads.map((lead) => (
                  <LeadCard
                    key={lead.id}
                    lead={lead}
                    users={users}
                    onSelectLead={onSelectLead}
                    onUpdateStatus={onUpdateStatus}
                    onOpenContactModal={onOpenContactModal}
                  />
                ))
              )}
            </div>

          </div>
        );
      })}
    </div>
  );
};
