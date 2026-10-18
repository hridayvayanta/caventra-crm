import React, { useState } from 'react';
import { IngestionJob, User } from '../types/crm';
import { 
  FolderSync, 
  ExternalLink, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Clock, 
  RefreshCw, 
  ShieldAlert, 
  FileSpreadsheet,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Database
} from 'lucide-react';

interface DriveImportStatusViewProps {
  jobs: IngestionJob[];
  currentUser: User;
  onRefresh?: () => void;
}

export const DriveImportStatusView: React.FC<DriveImportStatusViewProps> = ({
  jobs,
  currentUser,
  onRefresh,
}) => {
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const [showSetupGuide, setShowSetupGuide] = useState(false);

  const isAdmin = currentUser.role === 'admin';

  // Compute live aggregates from database records
  const totalLeadsAdded = jobs.reduce((sum, j) => sum + (j.leadsAdded || 0), 0);
  const totalDuplicatesSkipped = jobs.reduce((sum, j) => sum + (j.duplicatesSkipped || 0), 0);
  const totalFilesProcessed = jobs.filter(j => j.status === 'completed' || j.status === 'partial').length;
  
  const latestJob = jobs.length > 0 ? jobs[0] : null;
  const lastCheckTime = latestJob ? (latestJob.lastCheckedAt || latestJob.startedAt) : null;
  const lastSuccessfulJob = jobs.find(j => j.status === 'completed' || j.status === 'partial');

  const toggleExpand = (jobId: string) => {
    setExpandedJobId(prev => (prev === jobId ? null : jobId));
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center shrink-0">
              <FolderSync className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">Google Drive Automated Ingestion</h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                  ₹0 Architecture Active
                </span>
                {!isAdmin && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase bg-amber-50 text-amber-700 border border-amber-200">
                    Read-Only (Employee)
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Automated 5-minute Apps Script polling of <span className="font-semibold text-slate-700">CAVENTRA CRM Inbox</span> folder with Firestore REST synchronization.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowSetupGuide(!showSetupGuide)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
              <span>{showSetupGuide ? 'Hide Guide' : 'Integration Setup Guide'}</span>
            </button>
            {onRefresh && (
              <button
                onClick={onRefresh}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                title="Refresh jobs feed"
              >
                <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                <span>Refresh</span>
              </button>
            )}
          </div>
        </div>

        {/* Admin vs Employee Notification Banner */}
        {!isAdmin && (
          <div className="mt-4 p-3 bg-amber-50/60 border border-amber-200 rounded-xl flex items-center gap-2.5 text-xs text-amber-800">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              You are currently viewing this status console as an Employee. Script configuration and Apps Script trigger management require Administrator privileges.
            </span>
          </div>
        )}
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        
        {/* Metric 1: Last Folder Polling */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider">Last Drive Check</span>
            <Clock className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-sm font-bold font-mono text-slate-900 truncate">
            {lastCheckTime ? new Date(lastCheckTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Pending First Run'}
          </p>
          <p className="text-[11px] text-slate-400 font-mono mt-0.5 truncate">
            {lastCheckTime ? new Date(lastCheckTime).toLocaleDateString() : 'Awaiting 5-min cron'}
          </p>
        </div>

        {/* Metric 2: Total Files Processed */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider">Sheets Ingested</span>
            <FileSpreadsheet className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-xl font-bold font-mono text-slate-900">{totalFilesProcessed}</p>
          <p className="text-[11px] text-slate-500 font-medium mt-0.5">Moved to Processed folder</p>
        </div>

        {/* Metric 3: Leads Added */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider">Leads Added</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-xl font-bold font-mono text-emerald-700">+{totalLeadsAdded}</p>
          <p className="text-[11px] text-slate-500 font-medium mt-0.5">Populated into Firestore</p>
        </div>

        {/* Metric 4: Duplicates Skipped */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider">Duplicates Skipped</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-xl font-bold font-mono text-amber-700">{totalDuplicatesSkipped}</p>
          <p className="text-[11px] text-slate-500 font-medium mt-0.5">Existing leads preserved</p>
        </div>

      </div>

      {/* Setup Guide Collapsible Panel */}
      {showSetupGuide && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4 text-xs text-slate-700 animate-in fade-in duration-150">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-900 text-sm">Automated ₹0 Lead Ingestion Workflow Reference</h3>
            <span className="text-[11px] font-mono text-slate-400">Zero Third-Party Subscriptions Required</span>
          </div>

          <div className="grid md:grid-cols-3 gap-4 pt-1">
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center gap-2 font-bold text-slate-900">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-mono">1</span>
                <span>Spark Lead Research</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Run prospect queries in Spark by Gemini. Click <strong>Export to Sheets</strong>. The generated spreadsheet appears in your Google Drive root or Gemini folder.
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center gap-2 font-bold text-slate-900">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-mono">2</span>
                <span>Move to Inbox Folder</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Drag or add a shortcut for the sheet into <code className="bg-slate-200/70 px-1 py-0.5 rounded font-mono text-[10px]">CAVENTRA CRM Inbox</code>. (Gemini exports to default location, so this 1-second step routes it to the monitored folder).
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center gap-2 font-bold text-slate-900">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-mono">3</span>
                <span>Apps Script & Firestore Sync</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Every 5 minutes, Google Apps Script parses headers, normalizes domains, verifies Firestore duplicates, creates audit logs, and moves the file to <code className="bg-slate-200/70 px-1 py-0.5 rounded font-mono text-[10px]">CAVENTRA CRM Processed</code>.
              </p>
            </div>
          </div>

          <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-blue-900 text-[11px] leading-relaxed">
            <strong>Security & Quota Guarantee:</strong> Apps Script authenticates using your Google Account's native IAM credentials via <code className="font-mono font-semibold">ScriptApp.getOAuthToken()</code> to Cloud Firestore REST API v1. It uses 0 paid third-party connectors (no Zapier, Make, or webhooks) and operates comfortably within Google's free quotas (6 hr/day script runtime, 50,000 Firestore reads/day).
          </div>
        </div>
      )}

      {/* Ingestion Jobs Audit Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Automated Ingestion Job History</h3>
            <p className="text-xs text-slate-500">Live records from the Firestore <code className="font-mono text-[11px]">ingestionJobs</code> collection</p>
          </div>
          {lastSuccessfulJob && (
            <div className="text-right hidden sm:block">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Latest Import</span>
              <p className="text-xs font-semibold text-slate-700 font-mono truncate max-w-xs">{lastSuccessfulJob.fileName}</p>
            </div>
          )}
        </div>

        {jobs.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <FolderSync className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">No Automated Ingestion Jobs Logged Yet</p>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                When you place a Google Sheet exported from Spark by Gemini into the <code className="font-semibold text-slate-700">CAVENTRA CRM Inbox</code> folder, the Google Apps Script trigger will automatically process it and write the audit record here.
              </p>
            </div>
            <div className="pt-2">
              <button
                onClick={() => setShowSetupGuide(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors"
              >
                View Setup Instructions
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">Spreadsheet File</th>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Rows</th>
                  <th className="py-3 px-4 text-center">Leads Added</th>
                  <th className="py-3 px-4 text-center">Duplicates</th>
                  <th className="py-3 px-4 text-center">Rejected</th>
                  <th className="py-3 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {jobs.map((job) => {
                  const isExpanded = expandedJobId === job.id;
                  const hasErrors = job.errors && job.errors.length > 0;

                  return (
                    <React.Fragment key={job.id}>
                      <tr className="hover:bg-slate-50 transition-colors">
                        
                        {/* File Name & Link */}
                        <td className="py-3.5 px-4 font-semibold text-slate-900">
                          <div className="flex items-center gap-2">
                            <FileSpreadsheet className="w-4 h-4 text-blue-600 shrink-0" />
                            <span className="truncate max-w-xs">{job.fileName}</span>
                            {job.fileUrl && (
                              <a
                                href={job.fileUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-slate-400 hover:text-blue-600 transition-colors"
                                title="Open in Google Drive"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        </td>

                        {/* Timestamp */}
                        <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                          {new Date(job.startedAt || job.lastCheckedAt).toLocaleString()}
                        </td>

                        {/* Status Badge */}
                        <td className="py-3.5 px-4 text-center">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold font-mono uppercase ${
                            job.status === 'completed'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : job.status === 'partial'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : job.status === 'processing'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200 animate-pulse'
                              : job.status === 'failed'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-slate-50 text-slate-700 border border-slate-200'
                          }`}>
                            {job.status === 'completed' && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                            {job.status === 'partial' && <AlertTriangle className="w-3 h-3 text-amber-600" />}
                            {job.status === 'failed' && <XCircle className="w-3 h-3 text-rose-600" />}
                            {job.status === 'processing' && <RefreshCw className="w-3 h-3 animate-spin text-blue-600" />}
                            <span>{job.status}</span>
                          </span>
                        </td>

                        {/* Total / Processed Rows */}
                        <td className="py-3.5 px-4 text-center font-mono text-slate-700 font-bold">
                          {job.processedRows} / {job.totalRows}
                        </td>

                        {/* Leads Added */}
                        <td className="py-3.5 px-4 text-center font-mono font-bold text-emerald-700">
                          +{job.leadsAdded}
                        </td>

                        {/* Duplicates Skipped */}
                        <td className="py-3.5 px-4 text-center font-mono text-amber-700">
                          {job.duplicatesSkipped}
                        </td>

                        {/* Rows Rejected */}
                        <td className="py-3.5 px-4 text-center font-mono text-rose-700">
                          {job.rowsRejected}
                        </td>

                        {/* Expand / Details Toggle */}
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => toggleExpand(job.id)}
                            className="inline-flex items-center gap-1 px-2 py-1 text-slate-600 hover:text-slate-900 rounded hover:bg-slate-100 transition-colors text-[11px] font-semibold"
                          >
                            <span>{isExpanded ? 'Hide' : 'Log'}</span>
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                        </td>

                      </tr>

                      {/* Expanded Details Row */}
                      {isExpanded && (
                        <tr className="bg-slate-50/70 border-b border-slate-200">
                          <td colSpan={8} className="p-4">
                            <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
                              <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 font-mono gap-2 border-b border-slate-100 pb-2">
                                <span>Job ID: {job.id}</span>
                                <span>File ID: {job.fileId}</span>
                                <span>Source: {job.source || 'Apps Script Trigger'}</span>
                                {job.completedAt && (
                                  <span>Finished: {new Date(job.completedAt).toLocaleTimeString()}</span>
                                )}
                              </div>

                              {hasErrors ? (
                                <div className="space-y-1.5">
                                  <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700">
                                    Row Validation & Processing Warnings ({job.errors.length}):
                                  </span>
                                  <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 max-h-40 overflow-y-auto space-y-1">
                                    {job.errors.map((err, i) => (
                                      <p key={i} className="text-[11px] text-rose-800 font-mono">
                                        • {err}
                                      </p>
                                    ))}
                                  </div>
                                </div>
                              ) : (
                                <div className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1.5">
                                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                  <span>All valid rows imported cleanly without schema violations.</span>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      </div>

    </div>
  );
};
