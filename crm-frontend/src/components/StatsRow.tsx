import React from 'react';
import { Lead } from '../types/crm';
import { Users, PhoneCall, Clock, CheckCircle } from 'lucide-react';

interface StatsRowProps {
  leads: Lead[];
}

export const StatsRow: React.FC<StatsRowProps> = ({ leads }) => {
  const total = leads.length;
  const newCount = leads.filter(l => l.status === 'new').length;
  const inProgressCount = leads.filter(l => l.status === 'contacted' || l.status === 'in_progress').length;
  const wonCount = leads.filter(l => l.status === 'won').length;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      
      {/* 1. All Leads */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between text-slate-500 mb-1">
          <span className="text-xs font-semibold uppercase tracking-wider">All Leads</span>
          <Users className="w-4 h-4 text-slate-400" />
        </div>
        <div className="text-2xl font-bold text-slate-900">{total}</div>
        <div className="text-xs text-slate-500 mt-1">Total businesses recorded</div>
      </div>

      {/* 2. New / Need to Contact */}
      <div className="bg-white border border-blue-200 rounded-xl p-4 shadow-sm bg-blue-50/20">
        <div className="flex items-center justify-between text-blue-700 mb-1">
          <span className="text-xs font-semibold uppercase tracking-wider">To Contact</span>
          <PhoneCall className="w-4 h-4 text-blue-500" />
        </div>
        <div className="text-2xl font-bold text-blue-900">{newCount}</div>
        <div className="text-xs text-blue-600 mt-1">Waiting for initial phone/email</div>
      </div>

      {/* 3. In Progress */}
      <div className="bg-white border border-amber-200 rounded-xl p-4 shadow-sm bg-amber-50/20">
        <div className="flex items-center justify-between text-amber-700 mb-1">
          <span className="text-xs font-semibold uppercase tracking-wider">In Discussion</span>
          <Clock className="w-4 h-4 text-amber-500" />
        </div>
        <div className="text-2xl font-bold text-amber-900">{inProgressCount}</div>
        <div className="text-xs text-amber-600 mt-1">Active calls or proposals</div>
      </div>

      {/* 4. Deals Won */}
      <div className="bg-white border border-emerald-200 rounded-xl p-4 shadow-sm bg-emerald-50/20">
        <div className="flex items-center justify-between text-emerald-700 mb-1">
          <span className="text-xs font-semibold uppercase tracking-wider">Deals Won</span>
          <CheckCircle className="w-4 h-4 text-emerald-500" />
        </div>
        <div className="text-2xl font-bold text-emerald-900">{wonCount}</div>
        <div className="text-xs text-emerald-600 mt-1">Closed client contracts</div>
      </div>

    </div>
  );
};
