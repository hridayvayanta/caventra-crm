import React, { useState } from 'react';
import { Lead, LeadStatus, User, Activity } from '../types/crm';
import { 
  X, 
  ExternalLink, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  AlertTriangle, 
  Send, 
  Clock,
  Shield,
  FileText
} from 'lucide-react';

interface LeadDetailModalProps {
  lead: Lead | null;
  onClose: () => void;
  users: User[];
  currentUser: User;
  onUpdateLead: (updated: Lead) => void;
  activities: Activity[];
  onAddActivity: (leadId: string, title: string, description: string, type: Activity['type']) => void;
}

export const LeadDetailModal: React.FC<LeadDetailModalProps> = ({
  lead,
  onClose,
  users,
  currentUser,
  onUpdateLead,
  activities,
  onAddActivity,
}) => {
  if (!lead) return null;

  const [newNote, setNewNote] = useState('');
  const [noteType, setNoteType] = useState<Activity['type']>('note');

  const leadActivities = activities.filter(a => a.leadId === lead.id);

  const handleStatusChange = (newStatus: LeadStatus) => {
    const updated: Lead = {
      ...lead,
      status: newStatus,
      updatedAt: new Date().toISOString(),
    };
    onUpdateLead(updated);
    onAddActivity(
      lead.id,
      `Stage Updated: ${newStatus.toUpperCase()}`,
      `Lead transitioned from ${lead.status} to ${newStatus} by ${currentUser.name}`,
      'status_change'
    );
  };

  const handleAssigneeChange = (newUserId: string) => {
    const assignedUser = users.find(u => u.id === newUserId);
    const updated: Lead = {
      ...lead,
      assignedTo: newUserId || null,
      updatedAt: new Date().toISOString(),
    };
    onUpdateLead(updated);
    onAddActivity(
      lead.id,
      `Account Reassigned`,
      `Assigned to ${assignedUser ? assignedUser.name : 'Unassigned'} by ${currentUser.name}`,
      'note'
    );
  };

  const handleFollowUpChange = (date: string) => {
    const updated: Lead = {
      ...lead,
      nextFollowUpDate: date || null,
      updatedAt: new Date().toISOString(),
    };
    onUpdateLead(updated);
    onAddActivity(
      lead.id,
      `Follow-up Scheduled`,
      `Scheduled outreach date set for ${date}`,
      'note'
    );
  };

  const handleCreateNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    onAddActivity(lead.id, `Outreach Logged`, newNote, noteType);
    setNewNote('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-neutral-900 border border-neutral-800 rounded w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        
        {/* Modal Header */}
        <div className="p-4 border-b border-neutral-800 flex items-start justify-between bg-neutral-950">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg font-bold text-white">{lead.businessName}</h2>
              <a
                href={lead.website}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 font-mono bg-neutral-900 px-2 py-0.5 rounded border border-neutral-800"
              >
                <span>{lead.normalizedDomain}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="flex items-center gap-2 mt-1 text-xs text-neutral-400">
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-neutral-500" />
                {lead.city}, {lead.country}
              </span>
              <span>•</span>
              <span>{lead.industry}</span>
              <span>•</span>
              <span className="text-neutral-500">Source: {lead.leadSource}</span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded text-neutral-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 md:grid-cols-3 gap-5">
          
          {/* Left Columns: Technical Flaws & Contact Data */}
          <div className="md:col-span-2 space-y-5">
            
            {/* Technical Deficiency Details */}
            <div className="bg-neutral-950 border border-neutral-800 rounded p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-300 uppercase tracking-wider">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  Website Technical Diagnostic
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-900 text-neutral-300 border border-neutral-800">
                  Target Service: {lead.serviceOpportunity}
                </span>
              </div>
              <p className="text-xs text-neutral-200 leading-relaxed bg-neutral-900 p-3 rounded border border-neutral-800 font-mono">
                {lead.websiteCondition}
              </p>
              <div className="mt-2.5 flex items-center gap-2 text-[11px] text-neutral-400">
                <Shield className="w-3.5 h-3.5 text-neutral-500" />
                <span>Verification State:</span>
                <span className="font-medium text-neutral-300 capitalize">
                  {lead.verificationLevel.replace('_', ' ')}
                </span>
              </div>
            </div>

            {/* Contact Record */}
            <div className="bg-neutral-950 border border-neutral-800 rounded p-4">
              <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2.5">
                Corporate Contact Credentials
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                <div className="p-2.5 rounded bg-neutral-900 border border-neutral-800">
                  <div className="text-neutral-500 text-[10px] uppercase">Decision Maker</div>
                  <div className="text-white font-medium mt-0.5">
                    {lead.contactName || <span className="text-neutral-500 italic">Unpublished</span>}
                  </div>
                </div>

                <div className="p-2.5 rounded bg-neutral-900 border border-neutral-800">
                  <div className="text-neutral-500 text-[10px] uppercase">Business Email</div>
                  <div className="text-neutral-200 font-mono mt-0.5 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-neutral-500" />
                    <span>{lead.businessEmail || <span className="text-neutral-500 italic">Unpublished</span>}</span>
                  </div>
                </div>

                <div className="p-2.5 rounded bg-neutral-900 border border-neutral-800">
                  <div className="text-neutral-500 text-[10px] uppercase">Business Telephone</div>
                  <div className="text-neutral-200 font-mono mt-0.5 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-neutral-500" />
                    <span>{lead.businessPhone || <span className="text-neutral-500 italic">Unpublished</span>}</span>
                  </div>
                </div>

                <div className="p-2.5 rounded bg-neutral-900 border border-neutral-800">
                  <div className="text-neutral-500 text-[10px] uppercase">Estimated Opportunity Valuation</div>
                  <div className="text-white font-bold font-mono mt-0.5">
                    ₹{(lead.estimatedValue || 0).toLocaleString('en-IN')}
                  </div>
                </div>
              </div>
            </div>

            {/* Activity History */}
            <div className="bg-neutral-950 border border-neutral-800 rounded p-4">
              <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-neutral-400" />
                Audit & Activity Timeline
              </h3>

              {/* Log new activity */}
              <form onSubmit={handleCreateNote} className="mb-3">
                <div className="flex gap-1.5 mb-2">
                  <select
                    value={noteType}
                    onChange={(e) => setNoteType(e.target.value as any)}
                    className="bg-neutral-900 border border-neutral-800 text-[11px] rounded px-2 py-1 text-neutral-300 focus:outline-none focus:border-neutral-700"
                  >
                    <option value="call">Call Log</option>
                    <option value="email">Email Outreach</option>
                    <option value="note">Internal Note</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Log a client interaction, phone summary, or note..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    className="flex-1 bg-neutral-900 border border-neutral-800 rounded px-2.5 py-1 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-700"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-medium rounded flex items-center gap-1 border border-neutral-700"
                  >
                    <Send className="w-3 h-3" />
                    <span>Log</span>
                  </button>
                </div>
              </form>

              {/* Timeline Items */}
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {leadActivities.length === 0 ? (
                  <div className="text-xs text-neutral-500 py-3 text-center">No activity records logged.</div>
                ) : (
                  leadActivities.map((act) => (
                    <div key={act.id} className="text-xs border-l-2 border-neutral-700 pl-3 py-1">
                      <div className="flex items-center justify-between text-neutral-400 text-[10px]">
                        <span className="font-semibold text-neutral-200">{act.title}</span>
                        <span className="font-mono">{new Date(act.timestamp).toLocaleDateString()}</span>
                      </div>
                      <p className="text-neutral-300 text-[11px] mt-0.5">{act.description}</p>
                      <div className="text-[10px] text-neutral-500 mt-0.5">By {act.performedBy}</div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

          {/* Right Column: Stage Controls, Assignment */}
          <div className="space-y-4">
            
            {/* Stage Selector */}
            <div className="bg-neutral-950 border border-neutral-800 rounded p-4">
              <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">
                Pipeline Stage
              </label>
              <select
                value={lead.status}
                onChange={(e) => handleStatusChange(e.target.value as LeadStatus)}
                className="w-full bg-neutral-900 border border-neutral-800 text-xs font-semibold rounded p-2 text-white focus:outline-none focus:border-neutral-700 cursor-pointer capitalize"
              >
                <option value="new">New Ingested</option>
                <option value="contacted">Contacted</option>
                <option value="qualified">Qualified</option>
                <option value="proposal">Proposal Sent</option>
                <option value="won">Closed Won</option>
                <option value="lost">Lost / Disqualified</option>
              </select>
            </div>

            {/* Assignee Selector */}
            <div className="bg-neutral-950 border border-neutral-800 rounded p-4">
              <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">
                Assigned Team Member
              </label>
              <select
                value={lead.assignedTo || ''}
                onChange={(e) => handleAssigneeChange(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-800 text-xs rounded p-2 text-neutral-200 focus:outline-none focus:border-neutral-700 cursor-pointer"
              >
                <option value="">Unassigned</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                ))}
              </select>
            </div>

            {/* Follow-up Date */}
            <div className="bg-neutral-950 border border-neutral-800 rounded p-4">
              <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-neutral-500" />
                Scheduled Follow-Up
              </label>
              <input
                type="date"
                value={lead.nextFollowUpDate || ''}
                onChange={(e) => handleFollowUpChange(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-800 text-xs rounded p-2 text-neutral-200 focus:outline-none focus:border-neutral-700"
              />
            </div>

            {/* Direct Outreach Shortcuts */}
            <div className="space-y-2">
              {lead.businessEmail && (
                <a
                  href={`mailto:${lead.businessEmail}?subject=Website%20Technical%20Audit%20for%20${encodeURIComponent(lead.businessName)}`}
                  className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-medium border border-neutral-700 transition-colors"
                >
                  <Mail className="w-3.5 h-3.5 text-neutral-400" />
                  Dispatch Direct Email
                </a>
              )}
              {lead.businessPhone && (
                <a
                  href={`tel:${lead.businessPhone}`}
                  className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 text-neutral-300 text-xs font-medium transition-colors"
                >
                  <Phone className="w-3.5 h-3.5 text-neutral-500" />
                  Call Telephone Switchboard
                </a>
              )}
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
