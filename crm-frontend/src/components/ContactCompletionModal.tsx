import React, { useState } from 'react';
import { 
  Lead, 
  ContactMethod, 
  ContactOutcome, 
  NextContactAction, 
  ContactCompletionFormValues,
  User 
} from '../types/crm';
import { X, CheckCircle2, Phone, Mail, MessageSquare, Calendar, Clock, AlertCircle } from 'lucide-react';

interface ContactCompletionModalProps {
  lead: Lead | null;
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onSubmitContact: (lead: Lead, formValues: ContactCompletionFormValues) => Promise<void>;
}

export const ContactCompletionModal: React.FC<ContactCompletionModalProps> = ({
  lead,
  isOpen,
  onClose,
  currentUser,
  onSubmitContact,
}) => {
  if (!isOpen || !lead) return null;

  const [method, setMethod] = useState<ContactMethod>('phone');
  const [outcome, setOutcome] = useState<ContactOutcome>('spoke');
  const [notes, setNotes] = useState('');
  const [nextAction, setNextAction] = useState<NextContactAction>('schedule_follow_up');
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpTime, setFollowUpTime] = useState('11:00');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (nextAction === 'schedule_follow_up' && !followUpDate) {
      setErrorMessage('Please pick a specific follow-up date.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmitContact(lead, {
        method,
        outcome,
        notes: notes.trim(),
        nextAction,
        followUpDate,
        followUpTime,
      });
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to record contact outcome.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl border border-slate-200 flex flex-col">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Mark Contact Completed</h3>
              <p className="text-xs text-slate-500">Log interaction with <span className="font-semibold text-slate-800">{lead.businessName}</span></p>
            </div>
          </div>

          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error alert */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          
          {/* Contact Method */}
          <div>
            <label className="block text-slate-700 font-bold mb-1.5 uppercase text-[11px] tracking-wider">
              Contact Method
            </label>
            <div className="grid grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setMethod('phone')}
                className={`py-2 px-2.5 rounded-lg border font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  method === 'phone'
                    ? 'bg-blue-50 border-blue-400 text-blue-700 shadow-sm'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Phone</span>
              </button>

              <button
                type="button"
                onClick={() => setMethod('email')}
                className={`py-2 px-2.5 rounded-lg border font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  method === 'email'
                    ? 'bg-blue-50 border-blue-400 text-blue-700 shadow-sm'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Email</span>
              </button>

              <button
                type="button"
                onClick={() => setMethod('whatsapp')}
                className={`py-2 px-2.5 rounded-lg border font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  method === 'whatsapp'
                    ? 'bg-emerald-50 border-emerald-400 text-emerald-700 shadow-sm'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={() => setMethod('other')}
                className={`py-2 px-2.5 rounded-lg border font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  method === 'other'
                    ? 'bg-slate-100 border-slate-400 text-slate-800 shadow-sm'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span>Other</span>
              </button>
            </div>
          </div>

          {/* Contact Outcome */}
          <div>
            <label className="block text-slate-700 font-bold mb-1.5 uppercase text-[11px] tracking-wider">
              Outcome of Interaction
            </label>
            <select
              value={outcome}
              onChange={(e) => {
                const val = e.target.value as ContactOutcome;
                setOutcome(val);
                if (val === 'asked_follow_up' || val === 'interested') {
                  setNextAction('schedule_follow_up');
                } else if (val === 'not_interested') {
                  setNextAction('close_as_lost');
                }
              }}
              className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="spoke">Spoke to prospect / Decision maker</option>
              <option value="interested">Interested in web services / quote requested</option>
              <option value="asked_follow_up">Asked to follow up at later date</option>
              <option value="no_answer">No answer / Left voicemail</option>
              <option value="not_interested">Not interested / Declined services</option>
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-slate-700 font-bold mb-1.5 uppercase text-[11px] tracking-wider">
              Interaction Notes
            </label>
            <textarea
              rows={2}
              placeholder="Brief summary of what was discussed (e.g. Owner asked to send redesign pricing)..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Next Action Selection */}
          <div>
            <label className="block text-slate-700 font-bold mb-1.5 uppercase text-[11px] tracking-wider">
              Next Stage & Workflow Action
            </label>
            <select
              value={nextAction}
              onChange={(e) => setNextAction(e.target.value as NextContactAction)}
              className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="schedule_follow_up">Schedule a Follow-Up Task (Adds to Follow-ups)</option>
              <option value="move_to_discussion">Move to "In Discussion" (Active negotiation)</option>
              <option value="keep_contacted">Keep in "Contacted" (No specific follow-up date)</option>
              <option value="close_as_lost">Close as "Lost" (Not interested)</option>
            </select>
          </div>

          {/* Follow-up Date/Time Picker (Only shown when scheduling) */}
          {nextAction === 'schedule_follow_up' && (
            <div className="p-3 bg-blue-50/50 border border-blue-200 rounded-xl space-y-2">
              <span className="font-bold text-blue-900 block text-xs">
                Pick Exact Follow-Up Date & Time
              </span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-slate-600 font-medium mb-1">Due Date *</label>
                  <input
                    type="date"
                    required
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-600 font-medium mb-1">Time</label>
                  <input
                    type="time"
                    value={followUpTime}
                    onChange={(e) => setFollowUpTime(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Modal Footer */}
          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg text-slate-600 hover:text-slate-900 font-medium text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition-all disabled:opacity-50"
            >
              {isSubmitting ? 'Saving Contact...' : 'Save & Update Pipeline'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
