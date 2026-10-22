import React from 'react';
import { Lead, OutreachCampaign, User } from '../types/crm';
import { Play, Pause, Square, Send, Clock, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';

interface PacedOutreachBarProps {
  campaign: OutreachCampaign;
  currentUser: User;
  eligibleUnsentLeads: Lead[];
  selectedLeads: Lead[];
  isPacedRunning: boolean;
  isPacedPaused: boolean;
  currentSendingLead: Lead | null;
  secondsRemaining: number;
  pacedSentCount: number;
  pacedTotal: number;
  onStartPacedQueue: (leadsToProcess: Lead[]) => void;
  onPausePacedQueue: () => void;
  onResumePacedQueue: () => void;
  onStopPacedQueue: () => void;
  onActivateCampaign: () => void;
}

export const PacedOutreachBar: React.FC<PacedOutreachBarProps> = ({
  campaign,
  currentUser,
  eligibleUnsentLeads,
  selectedLeads,
  isPacedRunning,
  isPacedPaused,
  currentSendingLead,
  secondsRemaining,
  pacedSentCount,
  pacedTotal,
  onStartPacedQueue,
  onPausePacedQueue,
  onResumePacedQueue,
  onStopPacedQueue,
  onActivateCampaign,
}) => {
  const isFounder = currentUser.role === 'founder' || currentUser.role === 'admin';
  if (!isFounder) return null;

  const isCampaignActive = campaign.status === 'ACTIVE';

  // If Paced Runner is ACTIVE
  if (isPacedRunning) {
    const progressPercent = pacedTotal > 0 ? Math.round((pacedSentCount / pacedTotal) * 100) : 0;

    return (
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-xl p-4 shadow-lg border border-blue-700/50 mb-4 animate-fadeIn">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Status info */}
          <div className="space-y-1.5 flex-1">
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase font-mono ${
                isPacedPaused ? 'bg-amber-400 text-amber-950' : 'bg-emerald-400 text-emerald-950 animate-pulse'
              }`}>
                {isPacedPaused ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 fill-current" />}
                {isPacedPaused ? 'Queue Paused' : 'Paced Outreach Active (1 Email / Min)'}
              </span>
              <span className="text-xs text-blue-200 font-mono">
                {pacedSentCount} of {pacedTotal} Sent ({progressPercent}%)
              </span>
            </div>

            {/* Current lead & countdown */}
            <div className="flex flex-wrap items-center gap-3 text-xs">
              {currentSendingLead ? (
                <div className="flex items-center gap-1.5 text-blue-100">
                  <Send className="w-3.5 h-3.5 text-blue-300" />
                  <span>Next Lead: <strong>{currentSendingLead.businessName}</strong> ({currentSendingLead.businessEmail || currentSendingLead.email})</span>
                </div>
              ) : (
                <span className="text-blue-200">Processing queued leads...</span>
              )}

              {!isPacedPaused && (
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-800/80 border border-blue-600/50 text-[11px] font-mono font-bold text-amber-300">
                  <Clock className="w-3 h-3" />
                  <span>Next send in: {secondsRemaining}s</span>
                </div>
              )}
            </div>

            {/* Progress bar */}
            <div className="w-full bg-blue-950/80 rounded-full h-1.5 overflow-hidden border border-blue-700/40 mt-1">
              <div 
                className="bg-emerald-400 h-1.5 transition-all duration-500 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2 shrink-0">
            {isPacedPaused ? (
              <button
                type="button"
                onClick={onResumePacedQueue}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition-all shadow-sm"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Resume</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onPausePacedQueue}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-all shadow-sm"
              >
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>Pause</span>
              </button>
            )}

            <button
              type="button"
              onClick={onStopPacedQueue}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-sm"
            >
              <Square className="w-3 h-3 fill-current" />
              <span>Stop Queue</span>
            </button>
          </div>

        </div>
      </div>
    );
  }

  // If Inactive (Control Bar Above Leads)
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3.5 mb-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      
      {/* Description */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 shrink-0">
          <Clock className="w-4 h-4" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-bold text-slate-900">
              Paced Outreach Queue (1 Email / Minute)
            </h4>
            <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 font-mono">
              {eligibleUnsentLeads.length} Unsent Ready
            </span>
            {!isCampaignActive && (
              <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 font-mono flex items-center gap-1">
                <AlertCircle className="w-2.5 h-2.5" />
                <span>Campaign Paused</span>
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Safely paces cold outreach 1 by 1 with a 60-second delay between recipients to protect Gmail sender reputation.
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 shrink-0">
        {!isCampaignActive ? (
          <button
            type="button"
            onClick={onActivateCampaign}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-all shadow-sm"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Activate Campaign First</span>
          </button>
        ) : (
          <>
            {selectedLeads.length > 0 ? (
              <button
                type="button"
                onClick={() => onStartPacedQueue(selectedLeads)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-sm"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send Selected ({selectedLeads.length}) 1 by 1</span>
              </button>
            ) : (
              <button
                type="button"
                disabled={eligibleUnsentLeads.length === 0}
                onClick={() => onStartPacedQueue(eligibleUnsentLeads)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-sm disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-200" />
                <span>Send to Queue 1 by 1 ({eligibleUnsentLeads.length})</span>
              </button>
            )}
          </>
        )}
      </div>

    </div>
  );
};
