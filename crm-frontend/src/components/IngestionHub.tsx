import React from 'react';
import { IngestionBatch } from '../types/crm';
import { 
  Bot, 
  Sparkles, 
  CheckCircle2, 
  ShieldCheck, 
  Database, 
  Cpu, 
  Clock, 
  Terminal,
  Activity,
  Layers
} from 'lucide-react';

interface IngestionHubProps {
  batches: IngestionBatch[];
  onTriggerHarvest: () => void;
  isHarvesting: boolean;
}

export const IngestionHub: React.FC<IngestionHubProps> = ({
  batches,
  onTriggerHarvest,
  isHarvesting,
}) => {
  return (
    <div className="space-y-6">
      
      {/* Bot Status Banner */}
      <div className="bg-gradient-to-r from-indigo-950/60 via-slate-900 to-slate-900 border border-indigo-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Autopilot Active: Scheduled Daily at 08:00 AM UTC
              </span>
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                ₹0 Cost Guaranteed
              </span>
            </div>
            <h2 className="text-xl font-extrabold text-white">
              Autonomous Gemini Lead Harvester
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Every morning, your GitHub Actions runner contacts the Google AI Studio Gemini API, searches for business websites with security vulnerabilities and speed issues, sanitizes and deduplicates domains, and delivers them directly into this CRM.
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-3">
            <button
              onClick={onTriggerHarvest}
              disabled={isHarvesting}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
            >
              <Sparkles className={`w-4 h-4 ${isHarvesting ? 'animate-spin' : ''}`} />
              <span>{isHarvesting ? 'Harvesting Leads...' : 'Trigger Harvest Now'}</span>
            </button>
          </div>
        </div>

        {/* System Health Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-800/80 text-xs">
          <div>
            <div className="text-slate-400 text-[11px]">Gemini Free API Quota</div>
            <div className="text-emerald-400 font-bold font-mono mt-0.5">3 / 1,500 daily calls</div>
            <div className="text-[10px] text-slate-500">0.2% quota used</div>
          </div>

          <div>
            <div className="text-slate-400 text-[11px]">Cloud Database (D1/Firestore)</div>
            <div className="text-emerald-400 font-bold font-mono mt-0.5">Healthy (Active)</div>
            <div className="text-[10px] text-slate-500">5 GB free storage</div>
          </div>

          <div>
            <div className="text-slate-400 text-[11px]">Edge Ingestion Proxy</div>
            <div className="text-emerald-400 font-bold font-mono mt-0.5">Cloudflare Workers</div>
            <div className="text-[10px] text-slate-500">100k requests/day allowance</div>
          </div>

          <div>
            <div className="text-slate-400 text-[11px]">Domain Deduplication</div>
            <div className="text-cyan-400 font-bold font-mono mt-0.5">Strict (Normalized)</div>
            <div className="text-[10px] text-slate-500">Duplicate websites merged</div>
          </div>
        </div>

      </div>

      {/* Batch Ingestion Log Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-400" />
            <h3 className="font-bold text-white text-sm">Automated Ingestion Run History</h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {batches.length} Recorded Runs
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 uppercase text-[10px] font-semibold tracking-wider">
                <th className="py-3 px-4">Run Source</th>
                <th className="py-3 px-4">Execution Time</th>
                <th className="py-3 px-4 text-center">Harvested</th>
                <th className="py-3 px-4 text-center">New Leads Added</th>
                <th className="py-3 px-4 text-center">Duplicates Filtered</th>
                <th className="py-3 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {batches.map((b) => (
                <tr key={b.id} className="hover:bg-slate-800/30">
                  <td className="py-3.5 px-4 font-medium text-white flex items-center gap-2">
                    <Bot className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{b.source}</span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-400 font-mono">{b.timestamp}</td>
                  <td className="py-3.5 px-4 text-center font-bold text-white font-mono">
                    {b.leadsHarvested}
                  </td>
                  <td className="py-3.5 px-4 text-center font-bold text-emerald-400 font-mono">
                    +{b.newLeads}
                  </td>
                  <td className="py-3.5 px-4 text-center text-slate-400 font-mono">
                    {b.duplicatesSkipped} skipped
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <CheckCircle2 className="w-3 h-3" />
                      Success
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
