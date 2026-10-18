import React from 'react';
import { IngestionBatch } from '../types/crm';
import { 
  CheckCircle2, 
  Database, 
  Cpu, 
  Clock, 
  Terminal,
  Activity,
  Layers,
  ShieldCheck
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
    <div className="space-y-5">
      
      {/* Service Status Panel */}
      <div className="bg-neutral-900 border border-neutral-800 rounded p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-neutral-800 text-sky-400 border border-neutral-700">
                Service Active
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono text-neutral-400 border border-neutral-800">
                Schedule: 08:00 AM UTC Daily
              </span>
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              Automated Lead Ingestion Engine
            </h2>
            <p className="text-xs text-neutral-400 mt-1 max-w-2xl leading-relaxed">
              Autonomous background pipeline triggered via GitHub Actions. Queries the Google AI Studio Gemini API to identify organizations with deficient web infrastructure, normalizes hostnames, eliminates duplicates against the database, and commits records directly into the CRM pipeline.
            </p>
          </div>

          <div className="shrink-0">
            <button
              onClick={onTriggerHarvest}
              disabled={isHarvesting}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded bg-neutral-800 hover:bg-neutral-750 text-white font-medium text-xs border border-neutral-700 transition-colors disabled:opacity-50"
            >
              <Cpu className={`w-3.5 h-3.5 ${isHarvesting ? 'animate-spin text-sky-400' : 'text-neutral-400'}`} />
              <span>{isHarvesting ? 'Executing Ingestion Pipeline...' : 'Execute Ingestion Now'}</span>
            </button>
          </div>
        </div>

        {/* Technical Infrastructure Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-neutral-800 text-xs">
          <div>
            <div className="text-neutral-500 text-[10px] uppercase font-mono">API Rate Allocation</div>
            <div className="text-white font-mono font-semibold mt-0.5">3 / 1,500 daily requests</div>
            <div className="text-[10px] text-neutral-500">Google AI Studio Free Tier</div>
          </div>

          <div>
            <div className="text-neutral-500 text-[10px] uppercase font-mono">Database Partition</div>
            <div className="text-white font-mono font-semibold mt-0.5">Cloudflare D1 SQL</div>
            <div className="text-[10px] text-neutral-500">Zero-cost serverless storage</div>
          </div>

          <div>
            <div className="text-neutral-500 text-[10px] uppercase font-mono">Edge Ingestion Proxy</div>
            <div className="text-white font-mono font-semibold mt-0.5">Cloudflare Workers</div>
            <div className="text-[10px] text-neutral-500">100k requests/day allowance</div>
          </div>

          <div>
            <div className="text-neutral-500 text-[10px] uppercase font-mono">Deduplication Gate</div>
            <div className="text-white font-mono font-semibold mt-0.5">Strict Domain Normalization</div>
            <div className="text-[10px] text-neutral-500">Duplicate hostnames merged</div>
          </div>
        </div>

      </div>

      {/* Batch Ingestion Log Table */}
      <div className="bg-neutral-900 border border-neutral-800 rounded overflow-hidden">
        <div className="p-3.5 border-b border-neutral-800 flex items-center justify-between bg-neutral-950">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-neutral-400" />
            <h3 className="font-semibold text-white text-xs uppercase tracking-wider">Execution Audit History</h3>
          </div>
          <span className="text-xs text-neutral-400 font-mono">
            {batches.length} Execution Batches Logged
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-neutral-800 bg-neutral-900/80 text-neutral-400 uppercase text-[10px] font-medium tracking-wider">
                <th className="py-2.5 px-3.5">Trigger Origin</th>
                <th className="py-2.5 px-3.5">Timestamp</th>
                <th className="py-2.5 px-3.5 text-center">Prospects Parsed</th>
                <th className="py-2.5 px-3.5 text-center">New Leads Committed</th>
                <th className="py-2.5 px-3.5 text-center">Duplicates Skipped</th>
                <th className="py-2.5 px-3.5 text-right">Pipeline Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {batches.map((b) => (
                <tr key={b.id} className="hover:bg-neutral-850">
                  <td className="py-3 px-3.5 font-medium text-white flex items-center gap-2">
                    <Terminal className="w-3.5 h-3.5 text-neutral-500" />
                    <span>{b.source}</span>
                  </td>
                  <td className="py-3 px-3.5 text-neutral-400 font-mono text-[11px]">{b.timestamp}</td>
                  <td className="py-3 px-3.5 text-center font-mono text-white">
                    {b.leadsHarvested}
                  </td>
                  <td className="py-3 px-3.5 text-center font-mono text-sky-400 font-semibold">
                    +{b.newLeads}
                  </td>
                  <td className="py-3 px-3.5 text-center text-neutral-400 font-mono">
                    {b.duplicatesSkipped}
                  </td>
                  <td className="py-3 px-3.5 text-right">
                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-neutral-800 text-neutral-300 border border-neutral-700">
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
