import React, { useState } from 'react';
import { Lead, LeadStatus, User, Activity } from '../types/crm';
import { X, ExternalLink, Phone, Mail, MapPin, Send, Trash2 } from 'lucide-react';

interface LeadModalProps {
  lead: Lead | null;
  onClose: () => void;
  users: User[];
  currentUser: User;
  onUpdateStatus: (leadId: string, status: LeadStatus) => void;
  onDeleteLead: (leadId: string) => void;
  activities: Activity[];
  onAddNote: (leadId: string, text: string) => void;
}

export const LeadModal: React.FC<LeadModalProps> = ({
  lead,
  onClose,
  users,
  currentUser,
  onUpdateStatus,
  onDeleteLead,
  activities,
  onAddNote,
}) => {
  if (!lead) return null;

  const [noteText, setNoteText] = useState('');
  const leadActivities = activities.filter(a => a.leadId === lead.id);

  const handleAddNoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim()) return;
    onAddNote(lead.id, noteText);
    setNoteText('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-start justify-between bg-slate-50">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-slate-900">{lead.businessName}</h3>
              <a
                href={lead.website}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
              >
                <span>Visit Site</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              {lead.city}, {lead.country} • Opportunity: <span className="font-semibold text-slate-800">{lead.serviceOpportunity}</span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          
          {/* Status and Value Row */}
          <div className="flex items-center justify-between gap-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Current Pipeline Stage
              </label>
              <select
                value={lead.status}
                onChange={(e) => onUpdateStatus(lead.id, e.target.value as LeadStatus)}
                className="text-xs font-bold rounded-lg px-3 py-1.5 bg-white border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="new">1. New Lead (To Contact)</option>
                <option value="contacted">2. Contacted</option>
                <option value="in_progress">3. In Discussion</option>
                <option value="won">4. Deal Won</option>
                <option value="lost">5. Not Interested</option>
              </select>
            </div>

            <div className="text-right">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Estimated Deal Value
              </div>
              <div className="text-lg font-bold text-slate-900">
                ₹{(lead.estimatedValue || 0).toLocaleString('en-IN')}
              </div>
            </div>
          </div>

          {/* Contact Details */}
          <div>
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Contact Information
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-slate-400 block text-[11px]">Phone</span>
                <div className="flex items-center justify-between mt-1">
                  <span className="font-semibold text-slate-800">{lead.businessPhone || 'Not available'}</span>
                  {lead.businessPhone && (
                    <a
                      href={`tel:${lead.businessPhone}`}
                      className="px-2 py-1 rounded bg-blue-50 text-blue-700 font-semibold text-xs hover:bg-blue-100"
                    >
                      Call Now
                    </a>
                  )}
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-slate-400 block text-[11px]">Email</span>
                <div className="flex items-center justify-between mt-1">
                  <span className="font-semibold text-slate-800 truncate">{lead.businessEmail || 'Not available'}</span>
                  {lead.businessEmail && (
                    <a
                      href={`mailto:${lead.businessEmail}`}
                      className="px-2 py-1 rounded bg-blue-50 text-blue-700 font-semibold text-xs hover:bg-blue-100 shrink-0"
                    >
                      Email Now
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Identified Need / Website condition */}
          <div>
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              What Is Wrong With Their Website
            </h4>
            <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-700 leading-relaxed">
              {lead.websiteCondition}
            </div>
          </div>

          {/* Notes / Activities */}
          <div>
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Call & Meeting Notes
            </h4>
            
            {/* Form to add note */}
            <form onSubmit={handleAddNoteSubmit} className="flex gap-2 mb-4">
              <input
                type="text"
                placeholder="Write a note (e.g. Called client, they want quotation)..."
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Save</span>
              </button>
            </form>

            {/* List of notes */}
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {leadActivities.length === 0 ? (
                <div className="text-xs text-slate-400 py-3 text-center">No notes written yet.</div>
              ) : (
                leadActivities.map((act) => (
                  <div key={act.id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                    <div className="flex items-center justify-between text-[11px] text-slate-500 mb-0.5">
                      <span className="font-bold text-slate-700">{act.performedBy}</span>
                      <span>{new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="text-slate-800">{act.description}</p>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* Footer: Delete Option */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50">
          <button
            onClick={() => {
              if (confirm(`Are you sure you want to delete ${lead.businessName}?`)) {
                onDeleteLead(lead.id);
                onClose();
              }
            }}
            className="inline-flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700 font-medium"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Lead</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-semibold"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
