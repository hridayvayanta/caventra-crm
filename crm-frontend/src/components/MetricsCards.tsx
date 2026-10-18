import React from 'react';
import { Lead } from '../types/crm';
import { 
  TrendingUp, 
  Sparkles, 
  Users, 
  CheckCircle2, 
  AlertTriangle,
  Clock
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
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3.5 mb-6">
      
      {/* 1. Total Leads */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between hover:border-slate-700 transition-colors">
        <div className="flex items-center justify-between text-slate-400 mb-1.5">
          <span className="text-xs font-semibold">Total Pipeline Leads</span>
          <Users className="w-4 h-4 text-indigo-400" />
        </div>
        <div>
          <div className="text-2xl font-bold tracking-tight text-white">{totalLeads}</div>
          <div className="text-[11px] text-emerald-400 flex items-center gap-1 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            {newLeadsCount} new uncontacted
          </div>
        </div>
      </div>

      {/* 2. Total Pipeline Value */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between hover:border-slate-700 transition-colors">
        <div className="flex items-center justify-between text-slate-400 mb-1.5">
          <span className="text-xs font-semibold">Pipeline Potential</span>
          <TrendingUp className="w-4 h-4 text-cyan-400" />
        </div>
        <div>
          <div className="text-2xl font-bold tracking-tight text-white">
            ₹{pipelineValue.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Across {leads.filter(l => l.status !== 'lost').length} active prospects
          </div>
        </div>
      </div>

      {/* 3. Qualified & Proposals */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between hover:border-slate-700 transition-colors">
        <div className="flex items-center justify-between text-slate-400 mb-1.5">
          <span className="text-xs font-semibold">In Negotiation</span>
          <Clock className="w-4 h-4 text-amber-400" />
        </div>
        <div>
          <div className="text-2xl font-bold tracking-tight text-white">{qualifiedCount}</div>
          <div className="text-[11px] text-amber-400/90 mt-0.5">
            Qualified / Proposal Sent
          </div>
        </div>
      </div>

      {/* 4. Closed Won Value */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between hover:border-slate-700 transition-colors">
        <div className="flex items-center justify-between text-slate-400 mb-1.5">
          <span className="text-xs font-semibold">Closed Won (Revenue)</span>
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
        </div>
        <div>
          <div className="text-2xl font-bold tracking-tight text-white">
            ₹{wonValue.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-emerald-400 mt-0.5 font-medium">
            {wonCount} deals signed
          </div>
        </div>
      </div>

      {/* 5. Autonomous Harvest & Overdue Health */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between col-span-2 lg:col-span-1 hover:border-slate-700 transition-colors">
        <div className="flex items-center justify-between text-slate-400 mb-1.5">
          <span className="text-xs font-semibold">Bot & Action Health</span>
          <Sparkles className="w-4 h-4 text-purple-400" />
        </div>
        <div>
          <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-400">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Bot Active (Daily 08:00 AM)
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
            <span>Overdue follow-ups:</span>
            <span className={`font-bold ${overdueFollowUps > 0 ? 'text-rose-400' : 'text-slate-300'}`}>
              {overdueFollowUps}
            </span>
          </div>
        </div>
      </div>

    </div>
  );
};
