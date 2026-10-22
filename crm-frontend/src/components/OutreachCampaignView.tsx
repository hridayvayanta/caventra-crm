import React, { useState } from 'react';
import { 
  OutreachCampaign, 
  EmailJob, 
  EmailEvent, 
  EmailSuppression, 
  User, 
  Lead 
} from '../types/crm';
import { 
  updateCampaign, 
  toggleCampaignStatus, 
  sendTestEmail, 
  renderTemplate, 
  normalizeEmail, 
  validateEmailSyntax 
} from '../services/outreach';
import { 
  Mail, 
  Play, 
  Pause, 
  Send, 
  Eye, 
  Edit3, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  Clock, 
  XCircle, 
  MessageSquare, 
  Ban, 
  Sparkles,
  RefreshCw,
  ExternalLink,
  Info
} from 'lucide-react';

interface OutreachCampaignViewProps {
  campaign: OutreachCampaign;
  jobs: EmailJob[];
  events: EmailEvent[];
  suppressions: EmailSuppression[];
  currentUser: User;
  onShowNotification: (msg: string) => void;
}

export const OutreachCampaignView: React.FC<OutreachCampaignViewProps> = ({
  campaign,
  jobs,
  events,
  suppressions,
  currentUser,
  onShowNotification,
}) => {
  const isFounder = currentUser.role === 'founder' || currentUser.role === 'admin';

  // Template Editing State
  const [subject, setSubject] = useState(campaign.subject || 'A quick idea for {{businessName}}');
  const [body, setBody] = useState(campaign.body || '');
  const [isEditingTemplate, setIsEditingTemplate] = useState(false);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);

  // Activation Confirmation Modal
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [pendingStatusToggle, setPendingStatusToggle] = useState<'ACTIVE' | 'PAUSED' | null>(null);

  // Test Email State
  const [testRecipient, setTestRecipient] = useState(currentUser.email || '');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; msg: string; gmailWebUrl?: string } | null>(null);

  // Apps Script Webhook URL
  const [appsScriptUrl, setAppsScriptUrl] = useState(campaign.appsScriptUrl || '');
  const [isSavingUrl, setIsSavingUrl] = useState(false);

  // Filter for Queue Table
  const [jobFilter, setJobFilter] = useState<'all' | 'QUEUED' | 'SENT' | 'FAILED' | 'SUPPRESSED'>('all');

  // Active sub-tab
  const [activeTab, setActiveTab] = useState<'overview' | 'queue' | 'suppressions'>('overview');

  // Sample lead for live preview
  const sampleLead: Partial<Lead> = {
    businessName: 'Apex Horizon Tech',
    contactName: 'Alex Mercer',
    website: 'https://apexhorizon.io',
    city: 'San Francisco, CA',
    serviceOpportunity: 'Web Platform Modernization & Conversion Systems',
  };

  const sampleOptOutUrl = 'https://caventraofficial.in/#optout?token=sample_token&email=alex%40apexhorizon.io';
  const previewSubject = renderTemplate(subject, sampleLead, sampleOptOutUrl);
  const previewBody = renderTemplate(body, sampleLead, sampleOptOutUrl);

  // Handle template save
  const handleSaveTemplate = async () => {
    if (!isFounder) return;
    try {
      setIsSavingTemplate(true);
      await updateCampaign({ subject, body }, currentUser);
      setIsEditingTemplate(false);
      onShowNotification('Campaign template updated successfully.');
    } catch (err: any) {
      alert(`Failed to save template: ${err.message}`);
    } finally {
      setIsSavingTemplate(false);
    }
  };

  // Insert variable tag into template
  const handleInsertTag = (tag: string) => {
    setBody(prev => prev + ` {{${tag}}}`);
  };

  // Trigger Kill Switch (Pause / Activate)
  const handleConfirmToggleStatus = async () => {
    if (!pendingStatusToggle || !isFounder) return;
    try {
      await toggleCampaignStatus(pendingStatusToggle, currentUser);
      onShowNotification(`Outreach Campaign is now ${pendingStatusToggle}.`);
      setIsConfirmModalOpen(false);
      setPendingStatusToggle(null);
    } catch (err: any) {
      alert(`Error toggling campaign status: ${err.message}`);
    }
  };

  // Send Test Email
  const handleSendTestEmail = async () => {
    if (!isFounder) return;
    if (!validateEmailSyntax(testRecipient)) {
      setTestResult({ success: false, msg: 'Please enter a valid email address for testing.' });
      return;
    }

    try {
      setIsSendingTest(true);
      setTestResult(null);
      const res = await sendTestEmail(campaign, testRecipient, currentUser);
      setTestResult({ success: true, msg: res.message, gmailWebUrl: res.gmailWebUrl });
      onShowNotification(res.message);
    } catch (err: any) {
      setTestResult({ success: false, msg: err.message });
    } finally {
      setIsSendingTest(false);
    }
  };

  // Filtered jobs
  const filteredJobs = jobs.filter(j => {
    if (jobFilter === 'all') return true;
    return j.status === jobFilter;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      
      {/* Top Banner: Campaign Status & Kill Switch */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
                <Mail className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-slate-900">{campaign.name}</h1>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold font-mono uppercase ${
                    campaign.status === 'ACTIVE' 
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                      : 'bg-amber-100 text-amber-800 border border-amber-200'
                  }`}>
                    {campaign.status === 'ACTIVE' ? <Play className="w-3 h-3 fill-current" /> : <Pause className="w-3 h-3 fill-current" />}
                    {campaign.status}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Automated cold outreach for newly discovered, eligible leads via connected Google Workspace account.
                </p>
              </div>
            </div>
          </div>

          {/* Kill Switch Controls (Founder Only) */}
          <div className="flex items-center gap-3 shrink-0">
            {isFounder ? (
              campaign.status === 'ACTIVE' ? (
                <button
                  onClick={() => {
                    setPendingStatusToggle('PAUSED');
                    setIsConfirmModalOpen(true);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-sm transition-all"
                >
                  <Pause className="w-4 h-4" />
                  <span>Pause Outreach (Kill Switch)</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    setPendingStatusToggle('ACTIVE');
                    setIsConfirmModalOpen(true);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all"
                >
                  <Play className="w-4 h-4" />
                  <span>Activate Outreach Campaign</span>
                </button>
              )
            ) : (
              <span className="text-xs text-slate-400 font-mono italic">
                Only founders can activate or pause campaigns.
              </span>
            )}
          </div>
        </div>

        {/* Sender Connection Status Row */}
        <div className="mt-6 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-500">Connected Sender:</span>
            <span className="font-semibold text-slate-800 font-mono">{campaign.senderEmail}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-500">Authorization Status:</span>
            <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              <ShieldCheck className="w-3.5 h-3.5" />
              {campaign.authorizedConnectionStatus}
            </span>
          </div>
          <div className="flex items-center gap-2 text-slate-500">
            <span>Last Send:</span>
            <span className="font-medium text-slate-700">
              {campaign.lastSendAt ? new Date(campaign.lastSendAt).toLocaleString() : 'No outreach dispatched yet'}
            </span>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold text-slate-600">Queued</span>
            <Clock className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-black text-slate-900 font-mono">
            {jobs.filter(j => j.status === 'QUEUED').length}
          </p>
          <span className="text-[10px] text-slate-400">Awaiting safe worker lease</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold text-slate-600">Sent</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-slate-900 font-mono">
            {jobs.filter(j => j.status === 'SENT').length}
          </p>
          <span className="text-[10px] text-slate-400">Verified Gmail provider ID</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold text-slate-600">Replied</span>
            <MessageSquare className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-2xl font-black text-slate-900 font-mono">
            {campaign.stats?.repliedCount || 0}
          </p>
          <span className="text-[10px] text-slate-400">Thread replies detected</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold text-slate-600">Bounced</span>
            <XCircle className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-2xl font-black text-slate-900 font-mono">
            {campaign.stats?.bouncedCount || 0}
          </p>
          <span className="text-[10px] text-slate-400">Auto-suppressed from list</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold text-slate-600">Suppressed</span>
            <Ban className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-slate-900 font-mono">
            {suppressions.length}
          </p>
          <span className="text-[10px] text-slate-400">Opt-outs & permanent bounces</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold text-slate-600">Failed</span>
            <AlertTriangle className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-black text-slate-900 font-mono">
            {jobs.filter(j => j.status === 'FAILED').length}
          </p>
          <span className="text-[10px] text-slate-400">Max retries exceeded</span>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'overview'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          Template & Live Preview
        </button>
        <button
          onClick={() => setActiveTab('queue')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'queue'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <span>Send Logs & Queue</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-800 font-mono">
            {jobs.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('suppressions')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'suppressions'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <span>Suppression & Opt-Out List</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-800 font-mono">
            {suppressions.length}
          </span>
        </button>
      </div>

      {/* TAB 1: Template Editor & Live Preview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Template Configuration */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Email Template Settings</h3>
                <p className="text-xs text-slate-500">Plain-text outreach template with automatic personalized tokens.</p>
              </div>
              {isFounder && !isEditingTemplate && (
                <button
                  onClick={() => setIsEditingTemplate(true)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-all"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Template</span>
                </button>
              )}
            </div>

            {/* Subject Input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Subject Line</label>
              <input
                type="text"
                value={subject}
                disabled={!isEditingTemplate}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:opacity-75 disabled:bg-slate-100"
              />
            </div>

            {/* Variable Pills */}
            {isEditingTemplate && (
              <div>
                <span className="block text-[11px] font-bold text-slate-500 mb-1.5">Insert Personalization Tags:</span>
                <div className="flex flex-wrap gap-1.5">
                  {['contactName', 'businessName', 'website', 'city', 'serviceOpportunity', 'optOutUrl'].map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleInsertTag(tag)}
                      className="px-2 py-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-[11px] font-mono font-semibold transition-colors"
                    >
                      + {`{{${tag}}}`}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Body Textarea */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Email Body (Plain Text)</label>
              <textarea
                rows={12}
                value={body}
                disabled={!isEditingTemplate}
                onChange={(e) => setBody(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:opacity-75 disabled:bg-slate-100 leading-relaxed"
              />
            </div>

            {/* Save Buttons */}
            {isEditingTemplate && (
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setSubject(campaign.subject);
                    setBody(campaign.body);
                    setIsEditingTemplate(false);
                  }}
                  className="px-3 py-1.5 rounded-lg text-slate-600 hover:text-slate-800 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSavingTemplate}
                  onClick={handleSaveTemplate}
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-sm disabled:opacity-50"
                >
                  {isSavingTemplate ? 'Saving...' : 'Save Template'}
                </button>
              </div>
            )}
          </div>

          {/* Live Preview & Founder Test Send */}
          <div className="space-y-6">
            
            {/* Live Preview Box */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                  <Eye className="w-4 h-4 text-blue-600" />
                  <span>Real-time Preview (Sample Lead Data)</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">Rendered output</span>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 font-sans text-xs space-y-2">
                <div>
                  <span className="text-slate-400 font-semibold">From: </span>
                  <span className="text-slate-800 font-medium">{campaign.senderName} &lt;{campaign.senderEmail}&gt;</span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold">To: </span>
                  <span className="text-slate-800 font-medium">Alex Mercer &lt;alex@apexhorizon.io&gt;</span>
                </div>
                <div className="pb-2 border-b border-slate-200">
                  <span className="text-slate-400 font-semibold">Subject: </span>
                  <span className="text-slate-900 font-bold">{previewSubject}</span>
                </div>
                <div className="pt-2 whitespace-pre-wrap font-mono text-slate-800 leading-relaxed">
                  {previewBody}
                </div>
              </div>
            </div>

            {/* Test Email Dispatch Card (Founder Only) */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <Send className="w-4 h-4 text-emerald-600" />
                <span>Send Test Email (Founder Verification)</span>
              </div>
              <p className="text-xs text-slate-500">
                Send a live test dispatch with sample data to your authorized email address to inspect inbox formatting and deliverability.
              </p>

              <div className="flex items-center gap-2">
                <input
                  type="email"
                  value={testRecipient}
                  onChange={(e) => setTestRecipient(e.target.value)}
                  placeholder="Enter authorized test recipient..."
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
                <button
                  type="button"
                  disabled={isSendingTest || !isFounder}
                  onClick={handleSendTestEmail}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm disabled:opacity-50 shrink-0"
                >
                  {isSendingTest ? 'Sending...' : 'Send Test'}
                </button>
              </div>

              {testResult && (
                <div className={`p-3.5 rounded-lg text-xs font-medium space-y-2.5 ${
                  testResult.success 
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}>
                  <div className="flex items-center gap-1.5">
                    {testResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <XCircle className="w-4 h-4 text-rose-600 shrink-0" />}
                    <span>{testResult.msg}</span>
                  </div>

                  {testResult.gmailWebUrl && (
                    <div className="pt-2 border-t border-emerald-200/60 flex items-center justify-between gap-2">
                      <span className="text-[11px] text-emerald-700 font-medium">Send immediately from your logged-in Gmail account:</span>
                      <a
                        href={testResult.gmailWebUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-sm shrink-0"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Open in Gmail Composer</span>
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>

        </div>
      )}

      {/* TAB 2: Queue & Send Logs */}
      {activeTab === 'queue' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Email Outreach Job Queue</h3>
              <p className="text-xs text-slate-500">All scheduled, sent, and audited delivery events.</p>
            </div>

            {/* Filter buttons */}
            <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200">
              {(['all', 'QUEUED', 'SENT', 'FAILED', 'SUPPRESSED'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setJobFilter(f)}
                  className={`px-2.5 py-1 rounded text-xs font-semibold capitalize transition-all ${
                    jobFilter === f ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {f === 'all' ? 'All Jobs' : f.toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100/75 border-b border-slate-200 font-bold text-slate-600">
                  <th className="py-2.5 px-4">Recipient</th>
                  <th className="py-2.5 px-4">Business</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4">Attempts</th>
                  <th className="py-2.5 px-4">Message ID</th>
                  <th className="py-2.5 px-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredJobs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-400 font-medium">
                      No outreach jobs matching the filter.
                    </td>
                  </tr>
                ) : (
                  filteredJobs.map(job => (
                    <tr key={job.id} className="hover:bg-slate-50/75 transition-colors">
                      <td className="py-2.5 px-4 font-mono font-medium text-slate-900">
                        {job.recipientEmail}
                      </td>
                      <td className="py-2.5 px-4 text-slate-700 font-semibold">
                        {job.businessName}
                      </td>
                      <td className="py-2.5 px-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${
                          job.status === 'SENT' ? 'bg-emerald-100 text-emerald-800' :
                          job.status === 'QUEUED' ? 'bg-blue-100 text-blue-800' :
                          job.status === 'SUPPRESSED' ? 'bg-amber-100 text-amber-800' :
                          job.status === 'CANCELLED' ? 'bg-slate-100 text-slate-600' :
                          'bg-rose-100 text-rose-800'
                        }`}>
                          {job.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 font-mono text-slate-600">
                        {job.attempts} / {job.maxAttempts}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-[11px] text-slate-500 truncate max-w-[140px]">
                        {job.providerMessageId || '—'}
                      </td>
                      <td className="py-2.5 px-4 text-slate-500 whitespace-nowrap">
                        {job.sentAt ? new Date(job.sentAt).toLocaleString() : new Date(job.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Suppressions */}
      {activeTab === 'suppressions' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50">
            <h3 className="text-sm font-bold text-slate-900">Email Suppression List</h3>
            <p className="text-xs text-slate-500">
              Addresses permanently blocked from outreach due to explicit opt-outs or delivery failures.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100/75 border-b border-slate-200 font-bold text-slate-600">
                  <th className="py-2.5 px-4">Suppressed Email</th>
                  <th className="py-2.5 px-4">Reason</th>
                  <th className="py-2.5 px-4">Suppressed At</th>
                  <th className="py-2.5 px-4">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {suppressions.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-slate-400 font-medium">
                      No emails on the suppression list.
                    </td>
                  </tr>
                ) : (
                  suppressions.map(sup => (
                    <tr key={sup.id} className="hover:bg-slate-50/75">
                      <td className="py-2.5 px-4 font-mono font-medium text-slate-900">
                        {sup.email}
                      </td>
                      <td className="py-2.5 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase bg-amber-100 text-amber-800">
                          {sup.reason}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-slate-500 whitespace-nowrap">
                        {new Date(sup.suppressedAt).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-4 text-slate-600 truncate max-w-xs">
                        {sup.notes || '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Kill Switch / Status Toggle */}
      {isConfirmModalOpen && pendingStatusToggle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center gap-3 text-amber-600 mb-3">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-bold text-slate-900">
                {pendingStatusToggle === 'ACTIVE' ? 'Activate Automatic Outreach?' : 'Pause Outreach (Kill Switch)?'}
              </h3>
            </div>
            
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              {pendingStatusToggle === 'ACTIVE' ? (
                <>
                  By activating this campaign, all newly imported or added leads with valid email addresses will 
                  <strong> automatically receive an initial outreach email</strong> via your authorized Gmail account.
                  <br /><br />
                  <em>Note: Historical existing leads will NOT be bulk-emailed.</em>
                </>
              ) : (
                <>
                  Pausing this campaign halts all automatic sending immediately. No new emails will be queued or 
                  delivered until an authorized founder re-activates the campaign.
                </>
              )}
            </p>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setIsConfirmModalOpen(false);
                  setPendingStatusToggle(null);
                }}
                className="px-3.5 py-1.5 rounded-lg text-slate-600 hover:text-slate-800 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmToggleStatus}
                className={`px-4 py-1.5 rounded-lg text-white text-xs font-bold transition-all shadow-sm ${
                  pendingStatusToggle === 'ACTIVE' 
                    ? 'bg-emerald-600 hover:bg-emerald-700' 
                    : 'bg-amber-600 hover:bg-amber-700'
                }`}
              >
                Confirm {pendingStatusToggle}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
