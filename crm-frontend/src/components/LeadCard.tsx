import React from 'react';
import { Lead, LeadStatus, User } from '../types/crm';
import { getCountryFlag } from '../services/leadClassifier';
import { 
  ExternalLink, 
  Phone, 
  Mail, 
  MapPin, 
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  Globe
} from 'lucide-react';

interface LeadCardProps {
  lead: Lead;
  users: User[];
  onSelectLead: (lead: Lead) => void;
  onUpdateStatus: (leadId: string, status: LeadStatus) => void;
  onOpenContactModal: (lead: Lead) => void;
}

export const LeadCard: React.FC<LeadCardProps> = ({
  lead,
  users,
  onSelectLead,
  onUpdateStatus,
  onOpenContactModal,
}) => {
  const isOverdue = lead.nextFollowUpDate && new Date(lead.nextFollowUpDate) < new Date();

  return (
    <div 
      onClick={() => onSelectLead(lead)}
      className="bg-white border border-slate-200 hover:border-slate-300 rounded-xl p-4 shadow-sm hover:shadow transition-all cursor-pointer group"
    >
      {/* Top: Business Name & Website */}
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h4 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors text-sm line-clamp-1">
              {lead.businessName}
            </h4>
            
            {/* Phone Country Badge */}
            {lead.phoneCountry && lead.phoneCountry !== 'Unknown' && (
              <span className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-bold font-mono border ${
                lead.phoneCountryCode === 'IN' || lead.phoneCountry === 'India'
                  ? 'bg-amber-50 text-amber-900 border-amber-200'
                  : 'bg-blue-50 text-blue-900 border-blue-200'
              }`} title={`Phone Country: ${lead.phoneCountry} (${lead.countryClassificationStatus || 'verified'})`}>
                <span>{getCountryFlag(lead.phoneCountryCode)}</span>
                <span>{lead.phoneCountry}</span>
              </span>
            )}

            {lead.countryClassificationStatus === 'needs_review' && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold font-mono bg-amber-100 text-amber-800 border border-amber-300">
                <AlertCircle className="w-2.5 h-2.5" />
                <span>Needs Review</span>
              </span>
            )}

            {/* Contact Type Badge */}
            {lead.contactType === 'both' ? (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold font-mono bg-blue-100 text-blue-800 border border-blue-200">
                <span>Phone & Email</span>
              </span>
            ) : lead.contactType === 'phone_only' ? (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold font-mono bg-emerald-100 text-emerald-800 border border-emerald-200">
                <Phone className="w-2.5 h-2.5" />
                <span>Phone Only</span>
              </span>
            ) : lead.contactType === 'email_only' ? (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold font-mono bg-indigo-100 text-indigo-800 border border-indigo-200">
                <Mail className="w-2.5 h-2.5" />
                <span>Email Only</span>
              </span>
            ) : lead.contactType === 'missing' ? (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold font-mono bg-rose-100 text-rose-800 border border-rose-300">
                <AlertCircle className="w-2.5 h-2.5" />
                <span>Missing Contact</span>
              </span>
            ) : null}

            {lead.outreachStatus && (
              <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold font-mono uppercase ${
                lead.outreachStatus === 'sent' ? 'bg-emerald-100 text-emerald-800' :
                lead.outreachStatus === 'replied' ? 'bg-indigo-100 text-indigo-800' :
                lead.outreachStatus === 'bounced' ? 'bg-rose-100 text-rose-800' :
                lead.outreachStatus === 'queued' ? 'bg-blue-100 text-blue-800' :
                'bg-slate-100 text-slate-600'
              }`}>
                <Mail className="w-2.5 h-2.5" />
                <span>{lead.outreachStatus}</span>
              </span>
            )}
          </div>
        </div>
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

      {/* Location & Quick Phone */}
      <div className="flex items-center justify-between text-xs text-slate-500 mb-2.5">
        <div className="flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-slate-400" />
          <span>{lead.city}, {lead.country}</span>
        </div>
        {lead.businessPhone && (
          <div className="flex items-center gap-1">
            <a
              href={`tel:${lead.businessPhone}`}
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded transition-colors"
              title={`Call ${lead.businessPhone}`}
            >
              <Phone className="w-2.5 h-2.5 text-emerald-600" />
              <span>Call</span>
            </a>
            {lead.businessPhone.replace(/[^\d]/g, '').length >= 7 && (
              <a
                href={`https://wa.me/${lead.businessPhone.replace(/[^\d]/g, '')}`}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-0.5 text-[11px] font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 px-1.5 py-0.5 rounded transition-colors"
                title="WhatsApp"
              >
                <span>WA</span>
              </a>
            )}
          </div>
        )}
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

      {/* Contact Completion Action - Clearly Labeled */}
      <div className="mb-3">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenContactModal(lead);
          }}
          className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold border border-blue-200 transition-colors"
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
          <span>Mark Contact Completed</span>
        </button>
      </div>

      {/* Follow-up & Contact Date Badges */}
      {(lead.nextFollowUpDate || lead.lastContactDate) && (
        <div className="mb-3 space-y-1 text-[11px] font-mono">
          {lead.nextFollowUpDate && (
            <div className={`flex items-center justify-between p-1.5 rounded ${
              isOverdue ? 'bg-rose-50 text-rose-700 border border-rose-200 font-bold' : 'bg-slate-50 text-slate-700 border border-slate-200'
            }`}>
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>Next Follow-up:</span>
              </span>
              <span>{lead.nextFollowUpDate} {lead.nextFollowUpTime || ''}</span>
            </div>
          )}
          {lead.lastContactDate && (
            <div className="text-[10px] text-slate-400 flex items-center gap-1">
              <Clock className="w-2.5 h-2.5" />
              <span>Last contact: {new Date(lead.lastContactDate).toLocaleDateString()}</span>
            </div>
          )}
        </div>
      )}

      {/* Footer: Value & Easy Status Changer */}
      <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
        <div className="text-xs font-bold text-slate-900">
          ₹{(lead.estimatedValue || 0).toLocaleString('en-IN')}
        </div>

        {/* 1-click status dropdown */}
        <select
          value={lead.status}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => onUpdateStatus(lead.id, e.target.value as LeadStatus)}
          className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
        >
          <option value="new">New</option>
          <option value="to_contact">To Contact</option>
          <option value="contacted">Contacted</option>
          <option value="in_discussion">In Discussion</option>
          <option value="won">Won Deal</option>
          <option value="lost">Lost</option>
        </select>
      </div>
    </div>
  );
};
