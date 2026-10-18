import React from 'react';
import { Lead } from '../types/crm';
import { 
  BarChart3, 
  DollarSign, 
  Users, 
  CheckCircle2, 
  Clock,
  AlertCircle
} from 'lucide-react';

interface MetricsCardsProps {
  leads: Lead[];
}

export const MetricsCards: React.FC<MetricsCardsProps> = ({ leads }) => {
  const totalLeads = leads.length;
  const newLeadsCount = leads.filter(l => l.status === 'new').length;
  const qualifiedCount = leads.filter(l => l.status === 'qualified' || l.status === 'proposal').length;
  const wonCount = leads.filter(l => l.status === 'won').length;
  
  const pipelineValue = leads
    .filter(l => l.status !== 'lost')
    .reduce((acc, curr) => acc + (curr.estimatedValue || 0), 0);

  const wonValue = leads
    .filter(l => l.status === 'won')
    .reduce((acc, curr) => acc + (curr.estimatedValue || 0), 0);

  const overdueFollowUps = leads.filter(l => {
    if (!l.nextFollowUpDate || l.status === 'won' || l.status === 'lost') return false;
    return new Date(l.nextFollowUpDate) < new Date();
  }).length;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 mb-6">
      
      {/* 1. Total Leads */}
      <div className="bg-neutral-900 border border-neutral-800 rounded p-3.5">
        <div className="flex items-center justify-between text-neutral-400 text-xs mb-1">
          <span>Active Prospects</span>
          <Users className="w-3.5 h-3.5 text-neutral-500" />
        </div>
        <div className="text-xl font-bold tracking-tight text-white font-mono">{totalLeads}</div>
        <div className="text-[11px] text-neutral-400 mt-1">
          {newLeadsCount} awaiting initial outreach
        </div>
      </div>

      {/* 2. Total Pipeline Value */}
      <div className="bg-neutral-900 border border-neutral-800 rounded p-3.5">
        <div className="flex items-center justify-between text-neutral-400 text-xs mb-1">
          <span>Pipeline Valuation</span>
          <BarChart3 className="w-3.5 h-3.5 text-neutral-500" />
        </div>
        <div className="text-xl font-bold tracking-tight text-white font-mono">
          ₹{pipelineValue.toLocaleString('en-IN')}
        </div>
        <div className="text-[11px] text-neutral-400 mt-1">
          Across {leads.filter(l => l.status !== 'lost').length} active records
        </div>
      </div>

      {/* 3. In Negotiation */}
      <div className="bg-neutral-900 border border-neutral-800 rounded p-3.5">
        <div className="flex items-center justify-between text-neutral-400 text-xs mb-1">
          <span>In Negotiation</span>
          <Clock className="w-3.5 h-3.5 text-neutral-500" />
        </div>
        <div className="text-xl font-bold tracking-tight text-white font-mono">{qualifiedCount}</div>
        <div className="text-[11px] text-neutral-400 mt-1">
          Qualified & proposals sent
        </div>
      </div>

      {/* 4. Closed Won Value */}
      <div className="bg-neutral-900 border border-neutral-800 rounded p-3.5">
        <div className="flex items-center justify-between text-neutral-400 text-xs mb-1">
          <span>Contracted Revenue</span>
          <CheckCircle2 className="w-3.5 h-3.5 text-neutral-500" />
        </div>
        <div className="text-xl font-bold tracking-tight text-white font-mono">
          ₹{wonValue.toLocaleString('en-IN')}
        </div>
        <div className="text-[11px] text-neutral-400 mt-1">
          {wonCount} executed agreements
        </div>
      </div>

      {/* 5. Overdue Outreach */}
      <div className="bg-neutral-900 border border-neutral-800 rounded p-3.5 col-span-2 lg:col-span-1">
        <div className="flex items-center justify-between text-neutral-400 text-xs mb-1">
          <span>Overdue Tasks</span>
          <AlertCircle className={`w-3.5 h-3.5 ${overdueFollowUps > 0 ? 'text-rose-400' : 'text-neutral-500'}`} />
        </div>
        <div className={`text-xl font-bold tracking-tight font-mono ${overdueFollowUps > 0 ? 'text-rose-400' : 'text-white'}`}>
          {overdueFollowUps}
        </div>
        <div className="text-[11px] text-neutral-400 mt-1">
          {overdueFollowUps === 0 ? 'All scheduled tasks current' : 'Requires immediate follow-up'}
        </div>
      </div>

    </div>
  );
};
