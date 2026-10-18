import React from 'react';
import { Lead, LeadStatus, User } from '../types/crm';
import { 
  ExternalLink, 
  Phone, 
  Mail, 
  MapPin, 
  AlertCircle,
  Clock
} from 'lucide-react';

interface LeadCardProps {
  lead: Lead;
  users: User[];
  onSelectLead: (lead: Lead) => void;
  onUpdateStatus: (leadId: string, status: LeadStatus) => void;
}

export const LeadCard: React.FC<LeadCardProps> = ({
  lead,
  users,
  onSelectLead,
  onUpdateStatus,
}) => {
  const assigned = users.find(u => u.id === lead.assignedTo);

  return (
    <div 
      onClick={() => onSelectLead(lead)}
      className="bg-white border border-slate-200 hover:border-slate-300 rounded-xl p-4 shadow-sm hover:shadow transition-all cursor-pointer group"
    >
      {/* Top: Business Name & Website */}
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <h4 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors text-sm line-clamp-1">
          {lead.businessName}
        </h4>
        <a
          href={lead.website}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-slate-400 hover:text-blue-600 p-0.5 shrink-0"
          title="Open website"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* Location */}
      <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-3">
        <MapPin className="w-3.5 h-3.5 text-slate-400" />
        <span>{lead.city}, {lead.country}</span>
      </div>

      {/* Plain English Problem / Need */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-2.5 mb-3 text-xs">
        <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
          <span>Opportunity: {lead.serviceOpportunity}</span>
        </div>
        <p className="text-slate-600 line-clamp-2 leading-relaxed">
          {lead.websiteCondition}
        </p>
      </div>

      {/* Quick Action Contact Buttons */}
      <div className="flex items-center gap-2 mb-3">
        {lead.businessPhone && (
          <a
            href={`tel:${lead.businessPhone}`}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-md border border-slate-200 transition-colors"
          >
            <Phone className="w-3 h-3 text-slate-600" />
            <span>Call</span>
          </a>
        )}
        {lead.businessEmail && (
          <a
            href={`mailto:${lead.businessEmail}`}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-md border border-slate-200 transition-colors"
          >
            <Mail className="w-3 h-3 text-slate-600" />
            <span>Email</span>
          </a>
        )}
      </div>

      {/* Footer: Value & Easy Status Changer */}
      <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
        <div className="text-xs font-bold text-slate-900">
          ₹{(lead.estimatedValue || 0).toLocaleString('en-IN')}
        </div>

        {/* 1-click status dropdown right on the card! */}
        <select
          value={lead.status}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => onUpdateStatus(lead.id, e.target.value as LeadStatus)}
          className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
        >
          <option value="new">New</option>
          <option value="contacted">Contacted</option>
          <option value="in_progress">In Progress</option>
          <option value="won">Won Deal</option>
          <option value="lost">Lost</option>
        </select>
      </div>
    </div>
  );
};
