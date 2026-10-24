import React from 'react';
import { Lead, LeadSection, ContactMethodFilter } from '../types/crm';
import { calculateLeadMetrics } from '../services/leadClassifier';
import { 
  Users, 
  Phone, 
  Mail, 
  Globe, 
  AlertTriangle, 
  CheckCircle, 
  PhoneCall,
  Clock
} from 'lucide-react';

interface StatsRowProps {
  leads: Lead[];
  currentSection?: LeadSection;
  onSelectSection?: (section: LeadSection) => void;
  onSelectContactMethod?: (method: ContactMethodFilter) => void;
}

export const StatsRow: React.FC<StatsRowProps> = ({ 
  leads, 
  currentSection,
  onSelectSection,
  onSelectContactMethod,
}) => {
  const metrics = calculateLeadMetrics(leads);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3 mb-4 sm:mb-6">
      
      {/* 1. Total Master Leads */}
      <div 
        onClick={() => onSelectSection?.('all')}
        className={`bg-white border rounded-xl p-3 shadow-sm transition-all cursor-pointer hover:border-slate-300 ${
          currentSection === 'all' ? 'border-slate-800 ring-2 ring-slate-800/10' : 'border-slate-200'
        }`}
      >
        <div className="flex items-center justify-between text-slate-500 mb-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Total Leads</span>
          <Users className="w-3.5 h-3.5 text-slate-400" />
        </div>
        <div className="text-xl sm:text-2xl font-bold text-slate-900 font-mono">{metrics.totalLeads}</div>
        <div className="text-[10px] text-slate-400 mt-0.5 truncate">Master database</div>
      </div>

      {/* 2. Indian Leads */}
      <div 
        onClick={() => onSelectSection?.('indian_leads')}
        className={`bg-white border rounded-xl p-3 shadow-sm transition-all cursor-pointer hover:border-amber-400 ${
          currentSection === 'indian_leads' ? 'border-amber-500 ring-2 ring-amber-500/10 bg-amber-50/20' : 'border-slate-200'
        }`}
      >
        <div className="flex items-center justify-between text-amber-700 mb-1">
          <span className="text-[10px] font-bold uppercase tracking-wider">🇮🇳 Indian Leads</span>
        </div>
        <div className="text-xl sm:text-2xl font-bold text-amber-900 font-mono">{metrics.indianLeads}</div>
        <div className="text-[10px] text-amber-700/80 mt-0.5 truncate">+91 Verified numbers</div>
      </div>

      {/* 3. International Leads */}
      <div 
        onClick={() => onSelectSection?.('international_leads')}
        className={`bg-white border rounded-xl p-3 shadow-sm transition-all cursor-pointer hover:border-blue-400 ${
          currentSection === 'international_leads' ? 'border-blue-500 ring-2 ring-blue-500/10 bg-blue-50/20' : 'border-slate-200'
        }`}
      >
        <div className="flex items-center justify-between text-blue-700 mb-1">
          <span className="text-[10px] font-bold uppercase tracking-wider">🌐 International</span>
          <Globe className="w-3.5 h-3.5 text-blue-500" />
        </div>
        <div className="text-xl sm:text-2xl font-bold text-blue-900 font-mono">{metrics.internationalLeads}</div>
        <div className="text-[10px] text-blue-600 mt-0.5 truncate">Non-India calling codes</div>
      </div>

      {/* 4. Phone Leads (with Phone-only breakdown) */}
      <div 
        onClick={() => onSelectContactMethod?.('phone')}
        className="bg-white border border-slate-200 hover:border-emerald-300 rounded-xl p-3 shadow-sm transition-all cursor-pointer"
      >
        <div className="flex items-center justify-between text-emerald-700 mb-1">
          <span className="text-[10px] font-bold uppercase tracking-wider">Phone Leads</span>
          <Phone className="w-3.5 h-3.5 text-emerald-600" />
        </div>
        <div className="text-xl sm:text-2xl font-bold text-emerald-900 font-mono">{metrics.phoneLeads}</div>
        <div className="text-[10px] text-emerald-700 mt-0.5 truncate">
          {metrics.phoneOnlyLeads} phone-only • {metrics.bothPhoneAndEmailLeads} both
        </div>
      </div>

      {/* 5. Email Leads (with Email-only breakdown) */}
      <div 
        onClick={() => onSelectContactMethod?.('email')}
        className="bg-white border border-slate-200 hover:border-indigo-300 rounded-xl p-3 shadow-sm transition-all cursor-pointer"
      >
        <div className="flex items-center justify-between text-indigo-700 mb-1">
          <span className="text-[10px] font-bold uppercase tracking-wider">Email Leads</span>
          <Mail className="w-3.5 h-3.5 text-indigo-600" />
        </div>
        <div className="text-xl sm:text-2xl font-bold text-indigo-900 font-mono">{metrics.emailLeads}</div>
        <div className="text-[10px] text-indigo-700 mt-0.5 truncate">
          {metrics.emailOnlyLeads} email-only • {metrics.bothPhoneAndEmailLeads} both
        </div>
      </div>

      {/* 6. Missing Contact Details (Review Queue) */}
      <div 
        onClick={() => onSelectContactMethod?.('missing')}
        className={`bg-white border rounded-xl p-3 shadow-sm transition-all cursor-pointer hover:border-rose-300 ${
          metrics.missingContactLeads > 0 ? 'bg-rose-50/20 border-rose-200' : 'border-slate-200'
        }`}
      >
        <div className="flex items-center justify-between text-rose-700 mb-1">
          <span className="text-[10px] font-bold uppercase tracking-wider">Needs Review</span>
          <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
        </div>
        <div className="text-xl sm:text-2xl font-bold text-rose-900 font-mono">{metrics.missingContactLeads}</div>
        <div className="text-[10px] text-rose-600 mt-0.5 truncate">Missing phone & email</div>
      </div>

    </div>
  );
};
