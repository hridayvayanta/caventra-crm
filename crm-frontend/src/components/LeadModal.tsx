import React, { useState } from 'react';
import { Lead, LeadStatus, User, Activity } from '../types/crm';
import { X, ExternalLink, Phone, Mail, MapPin, Send, Trash2, CheckCircle2, Calendar, Clock } from 'lucide-react';

interface LeadModalProps {
  lead: Lead | null;
  onClose: () => void;
  users: User[];
  currentUser: User;
  onUpdateStatus: (leadId: string, status: LeadStatus) => void;
  onUpdateAssignee: (leadId: string, assignedTo: string | null) => void;
  onDeleteLead: (leadId: string) => void;
  onOpenContactModal: (lead: Lead) => void;
  activities: Activity[];
  onAddNote: (leadId: string, text: string) => void;
}

export const LeadModal: React.FC<LeadModalProps> = ({
  lead,
  onClose,
  users,
  currentUser,
  onUpdateStatus,
  onUpdateAssignee,
  onDeleteLead,
  onOpenContactModal,
  activities,
  onAddNote,
}) => {
  if (!lead) return null;

  const [noteText, setNoteText] = useState('');
  const leadActivities = activities.filter(a => a.leadId === lead.id);

  // Dynamic list of assignable employees:
  // 1. Current logged-in user is ALWAYS first and available
  // 2. Any active registered users/employees (excluding unauthenticated dummy founder placeholders)
  // 3. Any name currently assigned to this lead
  const assignableEmployees = React.useMemo(() => {
    const list: string[] = [];

    // 1. Current logged-in user
    if (currentUser?.name && !list.includes(currentUser.name)) {
      list.push(currentUser.name);
    }

    // 2. Registered active team members
    const founderEmails = [
      'hridayvayanta7@gmail.com',
      'hridayvayanta@gmail.com',
      'vednimbark08@gmail.com',
      'sauranahmed12345678@gmail.com'
    ];

    users.forEach(u => {
      if (u.name && u.status === 'active') {
        const isUnauthenticatedFounder = founderEmails.includes(u.email?.toLowerCase()) && 
          u.email?.toLowerCase() !== currentUser?.email?.toLowerCase();
        if (!isUnauthenticatedFounder && !list.includes(u.name)) {
          list.push(u.name);
        }
      }
    });

    // 3. Ensure currently assigned name is kept if not already in list
    if (lead?.assignedTo && !list.includes(lead.assignedTo)) {
      list.push(lead.assignedTo);
    }

    return list;
  }, [currentUser?.name, currentUser?.email, users, lead?.assignedTo]);

  const handleAddNoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim()) return;
    onAddNote(lead.id, noteText);
    setNoteText('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
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
                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline font-medium"
              >
                <span>{lead.normalizedDomain}</span>
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
        <div className="p-6 overflow-y-auto space-y-5">
          
          {/* Main Action Bar: Mark Contact Completed */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-blue-50 border border-blue-200 rounded-xl">
            <div>
              <span className="font-bold text-blue-900 text-xs block">Contact Workflow</span>
              <p className="text-[11px] text-blue-700">Record outreach outcome, schedule follow-ups, or advance pipeline</p>
            </div>
            <button
              onClick={() => onOpenContactModal(lead)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all shrink-0"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Mark Contact Completed</span>
            </button>
          </div>

          {/* Status and Follow-up Info */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Pipeline Stage
              </label>
              <select
                value={lead.status}
                onChange={(e) => onUpdateStatus(lead.id, e.target.value as LeadStatus)}
                className="w-full text-xs font-bold rounded-lg px-2.5 py-1.5 bg-white border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="new">New Lead</option>
                <option value="to_contact">To Contact</option>
                <option value="contacted">Contacted</option>
                <option value="in_discussion">In Discussion</option>
                <option value="won">Deal Won</option>
                <option value="lost">Lost</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Assigned Employee
              </label>
              <select
                value={lead.assignedTo || ''}
                onChange={(e) => onUpdateAssignee(lead.id, e.target.value || null)}
                className="w-full text-xs font-semibold rounded-lg px-2.5 py-1.5 bg-white border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Unassigned</option>
                {assignableEmployees.map(empName => (
                  <option key={empName} value={empName}>
                    {currentUser?.name === empName ? `${empName} (You)` : empName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Next Follow-Up
              </label>
              <div className="text-xs font-mono font-bold text-slate-800 py-1.5">
                {lead.nextFollowUpDate ? `${lead.nextFollowUpDate} ${lead.nextFollowUpTime || ''}` : 'None scheduled'}
              </div>
            </div>
          </div>

          {/* Contact Details */}
          <div>
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Contact Credentials
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Phone Number</span>
                <div className="flex items-center justify-between mt-1">
                  <span className="font-semibold text-slate-800 font-mono">{lead.businessPhone || 'Not available'}</span>
                  {lead.businessPhone && (
                    <a
                      href={`tel:${lead.businessPhone}`}
                      className="px-2.5 py-1 rounded bg-blue-50 text-blue-700 font-semibold text-xs hover:bg-blue-100"
                    >
                      Call
                    </a>
                  )}
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Email Address</span>
                <div className="flex items-center justify-between mt-1">
                  <span className="font-semibold text-slate-800 truncate font-mono">{lead.businessEmail || 'Not available'}</span>
                  {lead.businessEmail && (
                    <a
                      href={`mailto:${lead.businessEmail}`}
                      className="px-2.5 py-1 rounded bg-blue-50 text-blue-700 font-semibold text-xs hover:bg-blue-100 shrink-0"
                    >
                      Email
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Website condition */}
          <div>
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Technical Assessment / Problem
            </h4>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-700 leading-relaxed font-mono">
              {lead.websiteCondition}
            </div>
          </div>

          {/* Notes & Activity History */}
          <div>
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Activity History & Notes
            </h4>
            
            {/* Form to add note */}
            <form onSubmit={handleAddNoteSubmit} className="flex gap-2 mb-3">
              <input
                type="text"
                placeholder="Log an internal discussion note..."
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
            <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
              {leadActivities.length === 0 ? (
                <div className="text-xs text-slate-400 py-3 text-center">No notes or activities recorded yet.</div>
              ) : (
                leadActivities.map((act) => (
                  <div key={act.id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                    <div className="flex items-center justify-between text-[11px] text-slate-500 mb-0.5">
                      <span className="font-bold text-slate-800">{act.title}</span>
                      <span className="font-mono">{new Date(act.timestamp).toLocaleDateString()} {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="text-slate-700 text-xs">{act.description}</p>
                    <div className="text-[10px] text-slate-400 mt-0.5">By {act.performedBy}</div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50">
          <button
            onClick={() => {
              if (confirm(`Are you sure you want to permanently delete ${lead.businessName}?`)) {
                onDeleteLead(lead.id);
                onClose();
              }
            }}
            className="inline-flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700 font-semibold"
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
