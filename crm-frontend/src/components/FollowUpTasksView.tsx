import React, { useState } from 'react';
import { FollowUpTask, User } from '../types/crm';
import { 
  CalendarClock, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Phone, 
  Mail, 
  ExternalLink, 
  Calendar,
  X,
  Send
} from 'lucide-react';

interface FollowUpTasksViewProps {
  tasks: FollowUpTask[];
  currentUser: User;
  onCompleteTask: (
    task: FollowUpTask, 
    note: string, 
    rescheduleAction: 'complete' | 'reschedule',
    nextDate?: string,
    nextTime?: string
  ) => Promise<void>;
}

export const FollowUpTasksView: React.FC<FollowUpTasksViewProps> = ({
  tasks,
  currentUser,
  onCompleteTask,
}) => {
  const [completingTask, setCompletingTask] = useState<FollowUpTask | null>(null);
  const [completionNote, setCompletionNote] = useState('');
  const [rescheduleAction, setRescheduleAction] = useState<'complete' | 'reschedule'>('complete');
  const [nextDate, setNextDate] = useState('');
  const [nextTime, setNextTime] = useState('11:00');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];

  // Filter pending tasks
  const pendingTasks = tasks.filter(t => t.status === 'pending');
  const overdueTasks = pendingTasks.filter(t => (t.dueDate || '') < todayStr);
  const todayTasks = pendingTasks.filter(t => (t.dueDate || '') === todayStr);
  const upcomingTasks = pendingTasks.filter(t => (t.dueDate || '') > todayStr);

  const handleFinishCompletion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completingTask) return;

    if (rescheduleAction === 'reschedule' && !nextDate) {
      alert('Please select a subsequent follow-up date.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onCompleteTask(completingTask, completionNote, rescheduleAction, nextDate, nextTime);
      setCompletingTask(null);
      setCompletionNote('');
      setRescheduleAction('complete');
      setNextDate('');
    } catch (err) {
      console.error('Error completing follow-up:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderTaskCard = (task: FollowUpTask, isOverdue: boolean, isToday: boolean) => (
    <div 
      key={task.id}
      className={`bg-white rounded-xl p-4 border transition-all ${
        isOverdue 
          ? 'border-rose-300 bg-rose-50/10' 
          : isToday 
          ? 'border-amber-300 bg-amber-50/10' 
          : 'border-slate-200'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="font-bold text-slate-900 text-sm">{task.businessName}</h4>
            <a
              href={task.website}
              target="_blank"
              rel="noreferrer"
              className="text-slate-400 hover:text-blue-600"
              title="Visit client website"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
          {task.contactName && (
            <div className="text-xs text-slate-500 mt-0.5">Contact: <span className="font-medium text-slate-800">{task.contactName}</span></div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="text-right">
            <div className="text-xs font-bold text-slate-900 font-mono">
              {task.dueDate} {task.dueTime ? `@ ${task.dueTime}` : ''}
            </div>
            <div className={`text-[10px] font-bold uppercase tracking-wider ${
              isOverdue ? 'text-rose-600' : isToday ? 'text-amber-600' : 'text-slate-500'
            }`}>
              {isOverdue ? 'Overdue' : isToday ? 'Due Today' : 'Scheduled'}
            </div>
          </div>

          <button
            onClick={() => setCompletingTask(task)}
            className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all shrink-0"
          >
            Complete Follow-up
          </button>
        </div>
      </div>

      {/* Follow-up Reason & Notes */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 mb-3 text-xs text-slate-700">
        <span className="font-bold text-slate-800 block mb-0.5">Task Reason / Interaction Notes:</span>
        <p className="leading-relaxed">{task.reason}</p>
      </div>

      {/* Footer: Contacts & Assignee */}
      <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
        <div className="flex items-center gap-3">
          {task.businessPhone && (
            <a href={`tel:${task.businessPhone}`} className="inline-flex items-center gap-1 text-slate-700 hover:text-blue-600 font-medium">
              <Phone className="w-3 h-3 text-slate-400" />
              <span>{task.businessPhone}</span>
            </a>
          )}
          {task.businessEmail && (
            <a href={`mailto:${task.businessEmail}`} className="inline-flex items-center gap-1 text-slate-700 hover:text-blue-600 font-medium">
              <Mail className="w-3 h-3 text-slate-400" />
              <span>{task.businessEmail}</span>
            </a>
          )}
        </div>

        <div className="text-[11px]">
          Assigned: <span className="font-semibold text-slate-800">{task.assignedTo}</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      
      {/* Overview Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex items-center justify-between shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Follow-up Task Queue</h2>
          <p className="text-xs text-slate-500 mt-0.5">Manage scheduled calls, check-ins, and ongoing client discussions</p>
        </div>
        <div className="flex items-center gap-3 text-xs font-bold font-mono">
          <span className="px-3 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg">
            {overdueTasks.length} Overdue
          </span>
          <span className="px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg">
            {todayTasks.length} Due Today
          </span>
          <span className="px-3 py-1 bg-slate-100 text-slate-700 border border-slate-200 rounded-lg">
            {upcomingTasks.length} Upcoming
          </span>
        </div>
      </div>

      {pendingTasks.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-500 text-sm">
          <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
          <h4 className="font-bold text-slate-800 text-base mb-1">All follow-ups completed</h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            There are no pending follow-up tasks. When you mark a contact as needing follow-up, it will appear here automatically.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* 1. Overdue Tasks */}
          {overdueTasks.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-rose-700 font-bold text-xs uppercase tracking-wider">
                <AlertTriangle className="w-4 h-4" />
                <span>Overdue Follow-ups ({overdueTasks.length})</span>
              </div>
              <div className="space-y-3">
                {overdueTasks.map(t => renderTaskCard(t, true, false))}
              </div>
            </div>
          )}

          {/* 2. Due Today */}
          {todayTasks.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-amber-700 font-bold text-xs uppercase tracking-wider">
                <Clock className="w-4 h-4" />
                <span>Due Today ({todayTasks.length})</span>
              </div>
              <div className="space-y-3">
                {todayTasks.map(t => renderTaskCard(t, false, true))}
              </div>
            </div>
          )}

          {/* 3. Upcoming */}
          {upcomingTasks.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-slate-700 font-bold text-xs uppercase tracking-wider">
                <Calendar className="w-4 h-4" />
                <span>Upcoming Follow-ups ({upcomingTasks.length})</span>
              </div>
              <div className="space-y-3">
                {upcomingTasks.map(t => renderTaskCard(t, false, false))}
              </div>
            </div>
          )}

        </div>
      )}

      {/* Complete Task Modal */}
      {completingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-200">
            
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Complete Follow-up Task</h3>
                <p className="text-xs text-slate-500">{completingTask.businessName}</p>
              </div>
              <button onClick={() => setCompletingTask(null)} className="p-1 rounded text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleFinishCompletion} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Follow-up Interaction Summary
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="What was discussed during this follow-up? (e.g. Reviewed quotation, requested revisions)..."
                  value={completionNote}
                  onChange={(e) => setCompletionNote(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Next Step for this Lead
                </label>
                <select
                  value={rescheduleAction}
                  onChange={(e) => setRescheduleAction(e.target.value as any)}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="complete">Task Completed (No further follow-up scheduled)</option>
                  <option value="reschedule">Schedule Another Follow-up</option>
                </select>
              </div>

              {rescheduleAction === 'reschedule' && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl space-y-2">
                  <span className="font-bold text-blue-900 block text-xs">Pick Next Follow-up Date</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-slate-600 font-medium mb-1">Date *</label>
                      <input
                        type="date"
                        required
                        value={nextDate}
                        onChange={(e) => setNextDate(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-600 font-medium mb-1">Time</label>
                      <input
                        type="time"
                        value={nextTime}
                        onChange={(e) => setNextTime(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCompletingTask(null)}
                  className="px-3.5 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 font-medium text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Mark Completed'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};
