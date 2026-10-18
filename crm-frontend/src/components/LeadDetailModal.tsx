import React, { useState } from 'react';
import { Lead, LeadStatus, User, Activity } from '../types/crm';
import { 
  X, 
  ExternalLink, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  UserCheck, 
  AlertTriangle, 
  Sparkles, 
  Send, 
  CheckCircle2, 
  FileText,
  Clock,
  ShieldCheck
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
      `Status changed to ${newStatus.toUpperCase()}`,
      `Moved from ${lead.status} to ${newStatus} by ${currentUser.name}`,
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
      `Lead Reassigned`,
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
      `Next Follow-up Scheduled`,
      `Follow-up date set to ${date}`,
      'note'
    );
  };

  const handleCreateNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    onAddActivity(lead.id, `Outreach / Activity Logged`, newNote, noteType);
    setNewNote('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 flex items-start justify-between bg-slate-950/60">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-white">{lead.businessName}</h2>
              <a
                href={lead.website}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 font-mono bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20"
              >
                <span>{lead.normalizedDomain}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-500" />
                {lead.city}, {lead.country}
              </span>
              <span>•</span>
              <span>{lead.industry}</span>
              <span>•</span>
              <span className="text-slate-500">Source: {lead.leadSource}</span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Left 2 Columns: Details & Outreach Audit */}
          <div className="md:col-span-2 space-y-6">
            
            {/* Technical Diagnosis Card */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
                  <AlertTriangle className="w-4 h-4" />
                  Website Health & Need Assessment
                </div>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Target: {lead.serviceOpportunity}
                </span>
              </div>
              <p className="text-xs text-slate-200 leading-relaxed bg-slate-900/50 p-3 rounded-lg border border-slate-800/80">
                {lead.websiteCondition}
              </p>
              <div className="mt-2.5 flex items-center gap-2 text-[11px] text-slate-400">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span>Verification State:</span>
                <span className="font-semibold text-purple-300 capitalize">
                  {lead.verifiedStatus.replace('_', ' ')}
                </span>
              </div>
            </div>

            {/* Contact Information */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                Contact Credentials
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-2.5 rounded-lg bg-slate-900/50 border border-slate-800/60">
                  <div className="text-slate-400 text-[10px] uppercase">Decision Maker</div>
                  <div className="text-white font-medium mt-0.5">
                    {lead.contactName || <span className="text-slate-500 italic">Not available</span>}
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-900/50 border border-slate-800/60">
                  <div className="text-slate-400 text-[10px] uppercase">Business Email</div>
                  <div className="text-indigo-400 font-mono mt-0.5 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5" />
                    <span>{lead.businessEmail || <span className="text-slate-500 italic">Not found</span>}</span>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-900/50 border border-slate-800/60">
                  <div className="text-slate-400 text-[10px] uppercase">Business Phone</div>
                  <div className="text-slate-200 font-mono mt-0.5 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5" />
                    <span>{lead.businessPhone || <span className="text-slate-500 italic">Not found</span>}</span>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-900/50 border border-slate-800/60">
                  <div className="text-slate-400 text-[10px] uppercase">Estimated Opportunity Value</div>
                  <div className="text-emerald-400 font-bold font-mono mt-0.5">
                    ₹{(lead.estimatedValue || 0).toLocaleString('en-IN')}
                  </div>
                </div>
              </div>
            </div>

            {/* Activity History & Timeline */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-400" />
                Activity & Outreach History
              </h3>

              {/* Log new activity form */}
              <form onSubmit={handleCreateNote} className="mb-4">
                <div className="flex gap-2 mb-2">
                  <select
                    value={noteType}
                    onChange={(e) => setNoteType(e.target.value as any)}
                    className="bg-slate-900 border border-slate-800 text-[11px] rounded-lg px-2 py-1 text-slate-300 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="call">Call Log</option>
                    <option value="email">Email Outreach</option>
                    <option value="note">Internal Note</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Log a call, email, or discussion note..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1"
                  >
                    <Send className="w-3 h-3" />
                    <span>Log</span>
                  </button>
                </div>
              </form>

              {/* Timeline Items */}
              <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                {leadActivities.length === 0 ? (
                  <div className="text-xs text-slate-500 py-3 text-center">No activities recorded yet.</div>
                ) : (
                  leadActivities.map((act) => (
                    <div key={act.id} className="text-xs border-l-2 border-indigo-500/50 pl-3 py-1">
                      <div className="flex items-center justify-between text-slate-400 text-[10px]">
                        <span className="font-bold text-slate-200">{act.title}</span>
                        <span>{new Date(act.timestamp).toLocaleDateString()}</span>
                      </div>
                      <p className="text-slate-300 text-[11px] mt-0.5">{act.description}</p>
                      <div className="text-[10px] text-slate-500 mt-0.5">By {act.performedBy}</div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

          {/* Right Column: Actions, Assignee, Pipeline Control */}
          <div className="space-y-5">
            
            {/* Status Selector */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Pipeline Stage
              </label>
              <select
                value={lead.status}
                onChange={(e) => handleStatusChange(e.target.value as LeadStatus)}
                className="w-full bg-slate-900 border border-slate-700 text-xs font-bold rounded-lg p-2.5 text-white focus:outline-none focus:border-indigo-500 cursor-pointer capitalize"
              >
                <option value="new">New (Needs Outreach)</option>
                <option value="contacted">Contacted</option>
                <option value="qualified">Qualified</option>
                <option value="proposal">Proposal Sent</option>
                <option value="won">Closed Won 🎉</option>
                <option value="lost">Lost</option>
              </select>
            </div>

            {/* Assignee Selector */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Assigned Team Member
              </label>
              <select
                value={lead.assignedTo || ''}
                onChange={(e) => handleAssigneeChange(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-xs font-medium rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="">Unassigned</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                ))}
              </select>
            </div>

            {/* Next Follow-up Picker */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                Next Follow-Up Date
              </label>
              <input
                type="date"
                value={lead.nextFollowUpDate || ''}
                onChange={(e) => handleFollowUpChange(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-xs font-medium rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Quick Actions */}
            <div className="space-y-2">
              {lead.businessEmail && (
                <a
                  href={`mailto:${lead.businessEmail}?subject=Website%20Technical%20Audit%20for%20${encodeURIComponent(lead.businessName)}`}
                  className="w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors"
                >
                  <Mail className="w-3.5 h-3.5" />
                  Email Business Lead
                </a>
              )}
              {lead.businessPhone && (
                <a
                  href={`tel:${lead.businessPhone}`}
                  className="w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 text-xs font-semibold transition-colors"
                >
                  <Phone className="w-3.5 h-3.5" />
                  Call Contact
                </a>
              )}
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
