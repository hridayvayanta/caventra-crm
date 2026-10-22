import React, { useState, useEffect, useRef } from 'react';
import { 
  Lead, 
  LeadStatus, 
  LeadSection, 
  User, 
  Activity, 
  FollowUpTask, 
  ImportRecord, 
  ContactCompletionFormValues,
  IngestionJob,
  OutreachCampaign,
  EmailJob,
  EmailEvent,
  EmailSuppression
} from './types/crm';
import { INITIAL_USERS } from './data/mockData';
import { 
  subscribeLeads, 
  subscribeFollowUps, 
  subscribeActivities, 
  subscribeImportHistory,
  subscribeIngestionJobs,
  saveLead, 
  updateLead, 
  deleteLead, 
  purgeAllLeads,
  batchImportLeads, 
  recordContactCompletion, 
  completeFollowUpTask,
  checkIsDuplicateLead,
  normalizeDomain
} from './services/db';
import { 
  getCurrentSessionUser, 
  logoutUser, 
  subscribeAllUsers 
} from './services/auth';
import { 
  DEFAULT_CAMPAIGN, 
  subscribeCampaign, 
  subscribeEmailJobs, 
  subscribeEmailEvents, 
  subscribeSuppressions, 
  handleOptOut,
  dispatchLeadOutreach,
  toggleCampaignStatus,
  validateEmailSyntax
} from './services/outreach';
import { isFirebaseConfigured } from './services/firebase';
import { syncLeadsFromGoogleDrive } from './services/driveSync';
import { Navbar } from './components/Navbar';
import { StatsRow } from './components/StatsRow';
import { PacedOutreachBar } from './components/PacedOutreachBar';
import { LeadBoard } from './components/LeadBoard';
import { LeadListView } from './components/LeadListView';
import { EmptyState } from './components/EmptyState';
import { LeadModal } from './components/LeadModal';
import { AddLeadModal } from './components/AddLeadModal';
import { ExcelImportModal } from './components/ExcelImportModal';
import { ContactCompletionModal } from './components/ContactCompletionModal';
import { FollowUpTasksView } from './components/FollowUpTasksView';
import { ImportHistoryView } from './components/ImportHistoryView';
import { DriveImportStatusView } from './components/DriveImportStatusView';
import { PendingRegistrationsView } from './components/PendingRegistrationsView';
import { OutreachCampaignView } from './components/OutreachCampaignView';
import { LoginView } from './components/auth/LoginView';
import { RegisterView } from './components/auth/RegisterView';
import { ActivationView } from './components/auth/ActivationView';
import { PrivacyPolicy } from './components/PrivacyPolicy';
import { TermsConditions } from './components/TermsConditions';
import { Shield, FileText, CheckCircle2, ShieldAlert, LogOut } from 'lucide-react';

export function App() {
  // Authentication & Session State
  const [currentUser, setCurrentUser] = useState<User | null>(() => getCurrentSessionUser());
  const [authScreen, setAuthScreen] = useState<'login' | 'register' | 'activation'>('login');
  const [activationPrefillEmail, setActivationPrefillEmail] = useState<string>('');
  const [loginNotice, setLoginNotice] = useState<string | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>(INITIAL_USERS);

  // CRM Data State
  const [leads, setLeads] = useState<Lead[]>([]);
  const [followUps, setFollowUps] = useState<FollowUpTask[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [importHistory, setImportHistory] = useState<ImportRecord[]>([]);
  const [ingestionJobs, setIngestionJobs] = useState<IngestionJob[]>([]);

  // Navigation & View Mode
  const [currentSection, setCurrentSection] = useState<LeadSection>('all');
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');
  const [activeLegalPage, setActiveLegalPage] = useState<'privacy' | 'terms' | null>(null);

  // Outreach Campaign State
  const [campaign, setCampaign] = useState<OutreachCampaign>(DEFAULT_CAMPAIGN);
  const [emailJobs, setEmailJobs] = useState<EmailJob[]>([]);
  const [emailEvents, setEmailEvents] = useState<EmailEvent[]>([]);
  const [emailSuppressions, setEmailSuppressions] = useState<EmailSuppression[]>([]);
  const [optOutMessage, setOptOutMessage] = useState<string | null>(null);

  // Search & Modals
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [contactingLead, setContactingLead] = useState<Lead | null>(null);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // 1-by-1 Paced Outreach Queue State (1 Email / Minute)
  const [isPacedRunning, setIsPacedRunning] = useState(false);
  const [isPacedPaused, setIsPacedPaused] = useState(false);
  const [pacedQueue, setPacedQueue] = useState<Lead[]>([]);
  const [pacedIndex, setPacedIndex] = useState(0);
  const [pacedTotal, setPacedTotal] = useState(0);
  const [pacedSentCount, setPacedSentCount] = useState(0);
  const [secondsRemaining, setSecondsRemaining] = useState(60);
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [isDispatchingSingleId, setIsDispatchingSingleId] = useState<string | null>(null);

  // Clean legacy dummy founder user entries if needed
  useEffect(() => {
    if (!localStorage.getItem('caventra_users_cleaned_v1')) {
      const stored = localStorage.getItem('caventra_users');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          const founderEmails = ['hridayvayanta7@gmail.com', 'hridayvayanta@gmail.com', 'vednimbark08@gmail.com', 'sauranahmed12345678@gmail.com'];
          const currentEmail = currentUser?.email?.toLowerCase();
          const filtered = parsed.filter((u: any) => {
            if (founderEmails.includes(u.email?.toLowerCase()) && u.email?.toLowerCase() !== currentEmail) {
              return false;
            }
            return true;
          });
          localStorage.setItem('caventra_users', JSON.stringify(filtered));
        } catch {}
      }
      localStorage.setItem('caventra_users_cleaned_v1', 'true');
    }
  }, [currentUser?.email]);

  // Real-time synchronization for users
  useEffect(() => {
    const unsubUsers = subscribeAllUsers((usersList) => {
      setAllUsers(usersList);
      if (currentUser) {
        const fresh = usersList.find(u => u.id === currentUser.id || u.email === currentUser.email);
        if (fresh) {
          setCurrentUser(fresh);
        }
      }
    });

    return () => unsubUsers();
  }, [currentUser?.id]);

  // Opt-out URL listener (e.g. #optout?token=...&email=...)
  useEffect(() => {
    const handleHashCheck = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#optout')) {
        const query = hash.replace(/^#optout\??/, '');
        const params = new URLSearchParams(query);
        const email = params.get('email');
        const token = params.get('token');
        if (email && token) {
          handleOptOut(email, token).then((res) => {
            setOptOutMessage(res.message);
          });
        }
      }
    };

    handleHashCheck();
    window.addEventListener('hashchange', handleHashCheck);
    return () => window.removeEventListener('hashchange', handleHashCheck);
  }, []);

  // Subscribe to real-time CRM database collections ONLY when user is authorized
  const isAuthorized = currentUser && (
    currentUser.role === 'founder' || 
    currentUser.role === 'admin' || 
    currentUser.status === 'active'
  );

  useEffect(() => {
    if (!isAuthorized) return;

    const unsubLeads = subscribeLeads(setLeads);
    const unsubFollowUps = subscribeFollowUps(setFollowUps);
    const unsubActivities = subscribeActivities(null, setActivities);
    const unsubHistory = subscribeImportHistory(setImportHistory);
    const unsubJobs = subscribeIngestionJobs(setIngestionJobs);

    // Outreach subscriptions
    const unsubCampaign = subscribeCampaign(setCampaign);
    const unsubEmailJobs = subscribeEmailJobs(setEmailJobs);
    const unsubEvents = subscribeEmailEvents(setEmailEvents);
    const unsubSuppressions = subscribeSuppressions(setEmailSuppressions);

    return () => {
      unsubLeads();
      unsubFollowUps();
      unsubActivities();
      unsubHistory();
      unsubJobs();
      unsubCampaign();
      unsubEmailJobs();
      unsubEvents();
      unsubSuppressions();
    };
  }, [isAuthorized]);

  // Auto-sync Google Drive on Login / App Open (Silent Background Sync)
  const hasAutoSyncedRef = useRef(false);

  useEffect(() => {
    if (!isAuthorized || !currentUser || hasAutoSyncedRef.current) return;
    hasAutoSyncedRef.current = true;

    // Run silent background sync to import any new Drive leads automatically
    syncLeadsFromGoogleDrive(currentUser, leads)
      .then((res) => {
        if (res.success && res.importedCount > 0) {
          showNotification(`✓ Automatically synced ${res.importedCount} new lead(s) from Google Drive!`);
        }
      })
      .catch((err) => {
        console.warn('Auto Drive sync notice:', err);
      });
  }, [isAuthorized, currentUser]);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  const handleLogout = async () => {
    await logoutUser();
    setCurrentUser(null);
    setAuthScreen('login');
    showNotification('Signed out of CRM workspace.');
  };

  // ==========================================
  // Unauthenticated / Auth Screens Handling
  // ==========================================
  if (!currentUser) {
    if (authScreen === 'register') {
      return (
        <RegisterView
          onSwitchToLogin={() => setAuthScreen('login')}
          onRegistered={(registeredUser) => {
            if (registeredUser.status === 'active') {
              setCurrentUser(registeredUser);
              showNotification(`Welcome to CAVENTRA CRM, ${registeredUser.name}!`);
            } else {
              setActivationPrefillEmail(registeredUser.email);
              setAuthScreen('login');
              showNotification('Registration submitted! Enter your founder confirmation code.');
            }
          }}
        />
      );
    }

    return (
      <LoginView
        initialMessage={loginNotice}
        initialPendingEmail={activationPrefillEmail}
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          showNotification(`Welcome, ${user.name}`);
        }}
        onSwitchToRegister={() => {
          setLoginNotice(null);
          setActivationPrefillEmail('');
          setAuthScreen('register');
        }}
      />
    );
  }

  // ==========================================
  // Session Access Controls
  // ==========================================

  // Pending Activation Guard — In-line code popup
  if (currentUser.status === 'pending_activation') {
    return (
      <LoginView
        initialPendingEmail={currentUser.email}
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          showNotification(`Welcome, ${user.name}`);
        }}
        onSwitchToRegister={() => setAuthScreen('register')}
      />
    );
  }

  // Suspended / Disabled Account Guard
  if (currentUser.status === 'suspended' || currentUser.status === 'disabled') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-['Plus_Jakarta_Sans',sans-serif]">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 max-w-md w-full shadow-sm text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Access Denied</h2>
            <p className="text-xs text-slate-500 mt-1">
              Your employee account has been suspended or disabled by the company founder.
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            <span>Return to Login Screen</span>
          </button>
        </div>
      </div>
    );
  }

  // ==========================================
  // Authorized CRM Workspace
  // ==========================================

  // Section Filtering Logic (Requirement B)
  const getSectionLeads = () => {
    switch (currentSection) {
      case 'new':
        return leads.filter(l => l.status === 'new');
      case 'to_contact':
        return leads.filter(l => l.status === 'to_contact' || l.status === 'new');
      case 'contacted':
        return leads.filter(l => l.status === 'contacted');
      case 'in_discussion':
        return leads.filter(l => l.status === 'in_discussion');
      case 'won':
        return leads.filter(l => l.status === 'won');
      case 'lost':
        return leads.filter(l => l.status === 'lost');
      case 'all':
      default:
        return leads;
    }
  };

  const sectionLeads = getSectionLeads();

  // Search filter applied on top of current section
  const filteredLeads = sectionLeads.filter(lead => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      lead.businessName.toLowerCase().includes(q) ||
      lead.city.toLowerCase().includes(q) ||
      lead.normalizedDomain.toLowerCase().includes(q) ||
      (lead.contactName && lead.contactName.toLowerCase().includes(q)) ||
      (lead.businessPhone && lead.businessPhone.includes(q)) ||
      (lead.businessEmail && lead.businessEmail.toLowerCase().includes(q)) ||
      lead.serviceOpportunity.toLowerCase().includes(q)
    );
  });

  // Status update
  const handleUpdateStatus = async (leadId: string, newStatus: LeadStatus) => {
    try {
      await updateLead(leadId, { status: newStatus }, currentUser);
      showNotification(`Lead moved to ${newStatus.toUpperCase()}`);
    } catch (e: any) {
      alert(`Update failed: ${e.message}`);
    }
  };

  // Assignee update
  const handleUpdateAssignee = async (leadId: string, assignedTo: string | null) => {
    try {
      await updateLead(leadId, { assignedTo }, currentUser);
      showNotification(`Assigned to ${assignedTo || 'Unassigned'}`);
    } catch (e: any) {
      alert(`Assignment failed: ${e.message}`);
    }
  };

  // Delete lead
  const handleDeleteLead = async (leadId: string) => {
    try {
      await deleteLead(leadId, currentUser);
      showNotification('Lead removed from CRM.');
    } catch (e: any) {
      alert(`Deletion failed: ${e.message}`);
    }
  };

  // Add note
  const handleAddNote = async (leadId: string, text: string) => {
    try {
      await updateLead(leadId, { notes: text }, currentUser);
      showNotification('Note saved.');
    } catch (e: any) {
      alert(`Failed to save note: ${e.message}`);
    }
  };

  // Add lead manually with strict duplicate validation
  const handleAddLead = async (leadData: Omit<Lead, 'id' | 'createdAt' | 'updatedAt' | 'normalizedDomain'>) => {
    const cleanDomain = normalizeDomain(leadData.website);
    
    // Check duplicates against all current leads
    const dupCheck = checkIsDuplicateLead({
      ...leadData,
      normalizedDomain: cleanDomain,
    }, leads);

    if (dupCheck.isDuplicate) {
      alert(`Cannot add lead: ${dupCheck.reason}`);
      return;
    }

    const newLead: Lead = {
      ...leadData,
      id: `lead_${Date.now()}`,
      normalizedDomain: cleanDomain,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      await saveLead(newLead, currentUser);
      showNotification(`Registered ${newLead.businessName}`);
    } catch (e: any) {
      alert(`Failed to save lead: ${e.message}`);
    }
  };

  // Submit Contact Completion Workflow (Requirement C)
  const handleRecordContactCompletion = async (lead: Lead, formValues: ContactCompletionFormValues) => {
    await recordContactCompletion(lead, formValues, currentUser);
    showNotification(`Contact completed with ${lead.businessName}.`);
  };

  // Complete Follow-up Task (Requirement D)
  const handleCompleteFollowUp = async (
    task: FollowUpTask, 
    note: string, 
    rescheduleAction: 'complete' | 'reschedule',
    nextDate?: string,
    nextTime?: string
  ) => {
    await completeFollowUpTask(task, note, rescheduleAction, nextDate, nextTime, currentUser);
    showNotification('Follow-up task updated successfully.');
  };

  const [isSyncingDrive, setIsSyncingDrive] = useState(false);

  const handleSyncDrive = async () => {
    setIsSyncingDrive(true);
    try {
      const res = await syncLeadsFromGoogleDrive(currentUser, leads);
      if (res.success) {
        showNotification(`✓ Synced ${res.importedCount} leads from Google Drive! (${res.duplicateCount} duplicates skipped, ${res.rejectedCount} rejected)`);
      } else {
        alert(res.error || 'Failed to sync from Google Drive.');
      }
    } catch (err: any) {
      alert(`Error connecting to Google Drive: ${err.message}`);
    } finally {
      setIsSyncingDrive(false);
    }
  };

  const handlePurgeAllLeads = async () => {
    if (window.confirm('Remove all current leads from the CRM? (Your Google Drive Excel files will NOT be touched)')) {
      await purgeAllLeads();
      showNotification('All leads removed from CRM. Google Drive files were not touched.');
    }
  };

  // Eligible Unsent Leads for Paced Dispatch (1 Email / Minute)
  const eligibleUnsentLeads = leads.filter(l => {
    const email = l.businessEmail || l.email;
    return (
      email && 
      validateEmailSyntax(email) && 
      l.outreachStatus !== 'sent' && 
      l.outreachStatus !== 'replied' && 
      l.outreachStatus !== 'suppressed'
    );
  });

  const selectedLeads = leads.filter(l => {
    const email = l.businessEmail || l.email;
    return (
      selectedLeadIds.includes(l.id) && 
      email && 
      validateEmailSyntax(email) && 
      l.outreachStatus !== 'sent'
    );
  });

  const currentSendingLead = pacedQueue[pacedIndex] || null;

  // Activate Campaign helper from Paced Bar
  const handleActivateCampaignFromBar = async () => {
    if (!currentUser) return;
    try {
      await toggleCampaignStatus('ACTIVE', currentUser);
      showNotification('Outreach campaign is now ACTIVE.');
    } catch (e: any) {
      alert(`Could not activate campaign: ${e.message}`);
    }
  };

  // Start Paced Queue (1 Email / Minute)
  const handleStartPacedQueue = async (targetLeads: Lead[]) => {
    if (!currentUser) return;
    if (campaign.status !== 'ACTIVE') {
      alert('Outreach Campaign is currently PAUSED. Please activate it first.');
      return;
    }
    const valid = targetLeads.filter(l => {
      const email = l.businessEmail || l.email;
      return email && validateEmailSyntax(email) && l.outreachStatus !== 'sent';
    });
    if (valid.length === 0) {
      alert('No eligible unsent leads found with valid email addresses.');
      return;
    }

    setPacedQueue(valid);
    setPacedTotal(valid.length);
    setPacedIndex(0);
    setPacedSentCount(0);
    setSecondsRemaining(60);
    setIsPacedRunning(true);
    setIsPacedPaused(false);

    showNotification(`⚡ Starting 1-by-1 outreach for ${valid.length} leads. First email sending now...`);

    // Dispatch the first email immediately
    const firstLead = valid[0];
    try {
      const res = await dispatchLeadOutreach(firstLead, campaign, currentUser);
      if (res.success) {
        setPacedSentCount(1);
        setPacedIndex(1);
        showNotification(`✓ Dispatched 1st email to ${firstLead.businessName}! Next in 60s.`);
      } else {
        showNotification(`Note on ${firstLead.businessName}: ${res.error}`);
        setPacedIndex(1);
      }
    } catch (e: any) {
      console.warn('Paced dispatch err:', e);
      setPacedIndex(1);
    }
  };

  // Timer Effect for 1-minute interval between subsequent emails
  useEffect(() => {
    if (!isPacedRunning || isPacedPaused || !currentUser) return;

    if (pacedIndex >= pacedTotal) {
      setIsPacedRunning(false);
      showNotification(`✓ All ${pacedSentCount} outreach email(s) sent successfully 1 by 1!`);
      return;
    }

    const interval = setInterval(() => {
      setSecondsRemaining(prev => {
        if (prev <= 1) {
          const nextLead = pacedQueue[pacedIndex];
          if (nextLead && campaign.status === 'ACTIVE') {
            dispatchLeadOutreach(nextLead, campaign, currentUser).then(res => {
              if (res.success) {
                setPacedSentCount(c => c + 1);
                showNotification(`✓ 1-by-1 dispatched to ${nextLead.businessName}! Next in 60s.`);
              } else {
                showNotification(`Dispatch notice (${nextLead.businessName}): ${res.error}`);
              }
            }).catch(err => console.warn('Paced dispatch error:', err));
          }
          setPacedIndex(i => i + 1);
          return 60; // Reset countdown for the next lead
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isPacedRunning, isPacedPaused, pacedIndex, pacedTotal, pacedQueue, campaign, currentUser]);

  const handlePausePacedQueue = () => {
    setIsPacedPaused(true);
    showNotification('Paced outreach queue paused.');
  };

  const handleResumePacedQueue = () => {
    setIsPacedPaused(false);
    showNotification('Paced outreach queue resumed.');
  };

  const handleStopPacedQueue = () => {
    setIsPacedRunning(false);
    setIsPacedPaused(false);
    setPacedQueue([]);
    showNotification('Paced outreach queue stopped.');
  };

  const handleDispatchSingleLead = async (lead: Lead) => {
    if (!currentUser) return;
    if (campaign.status !== 'ACTIVE') {
      alert('Outreach Campaign is currently PAUSED. Please activate it first in the Email Outreach tab.');
      return;
    }
    setIsDispatchingSingleId(lead.id);
    try {
      const res = await dispatchLeadOutreach(lead, campaign, currentUser);
      if (res.success) {
        showNotification(`✓ Outreach email dispatched to ${lead.businessName}!`);
      } else {
        showNotification(`Notice: ${res.error}`);
      }
    } catch (e: any) {
      showNotification(`Error: ${e.message}`);
    } finally {
      setIsDispatchingSingleId(null);
    }
  };

  const handleToggleSelectLead = (leadId: string) => {
    setSelectedLeadIds(prev => 
      prev.includes(leadId) ? prev.filter(id => id !== leadId) : [...prev, leadId]
    );
  };

  const handleSelectAllLeads = (selected: boolean) => {
    if (selected) {
      setSelectedLeadIds(filteredLeads.map(l => l.id));
    } else {
      setSelectedLeadIds([]);
    }
  };

  const pendingFollowUpsCount = followUps.filter(t => t.status === 'pending').length;
  const newLeadsCount = leads.filter(l => l.status === 'new').length;
  const pendingRegistrationsCount = allUsers.filter(u => u.status === 'pending_activation').length;

  if (optOutMessage) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4">
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">
          <div className="w-12 h-12 bg-blue-500/10 text-blue-400 rounded-xl flex items-center justify-center mx-auto mb-4 border border-blue-500/20">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold mb-2 text-white">Unsubscribed Successfully</h2>
          <p className="text-xs text-slate-400 mb-6 leading-relaxed">{optOutMessage}</p>
          <button
            onClick={() => {
              window.location.hash = '';
              setOptOutMessage(null);
            }}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs font-semibold text-slate-200"
          >
            Return to Portal
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      
      {/* Toast Alert */}
      {notification && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl text-xs font-semibold animate-in slide-in-from-bottom duration-150 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Top Navigation & Distinct Lead Sections */}
      <Navbar
        currentSection={currentSection}
        setCurrentSection={(s) => {
          setActiveLegalPage(null);
          setCurrentSection(s);
        }}
        viewMode={viewMode}
        setViewMode={setViewMode}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        users={allUsers}
        currentUser={currentUser}
        setCurrentUser={setCurrentUser}
        onOpenAddModal={() => setIsAddModalOpen(true)}
        onOpenImportModal={() => setIsImportModalOpen(true)}
        onSyncDrive={handleSyncDrive}
        isSyncingDrive={isSyncingDrive}
        onPurgeLeads={handlePurgeAllLeads}
        onLogout={handleLogout}
        followUpsCount={pendingFollowUpsCount}
        newLeadsCount={newLeadsCount}
        pendingCount={pendingRegistrationsCount}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Legal Pages */}
        {activeLegalPage === 'privacy' && (
          <PrivacyPolicy onBack={() => setActiveLegalPage(null)} />
        )}

        {activeLegalPage === 'terms' && (
          <TermsConditions onBack={() => setActiveLegalPage(null)} />
        )}

        {/* Regular CRM Views */}
        {!activeLegalPage && (
          <>
            {/* Top Metrics Row (Visible across lead views) */}
            {currentSection !== 'follow_ups' && 
             currentSection !== 'import_history' && 
             currentSection !== 'drive_import_status' && 
             currentSection !== 'pending_registrations' && 
             currentSection !== 'email_outreach' && (
              <StatsRow leads={leads} />
            )}

            {/* Follow-ups Dedicated Task List (Section D) */}
            {currentSection === 'follow_ups' ? (
              <FollowUpTasksView
                tasks={followUps}
                currentUser={currentUser}
                onCompleteTask={handleCompleteFollowUp}
              />
            ) : currentSection === 'email_outreach' ? (
              /* Automatic Gmail Outreach Management (Founder Console) */
              <OutreachCampaignView
                campaign={campaign}
                jobs={emailJobs}
                events={emailEvents}
                suppressions={emailSuppressions}
                currentUser={currentUser}
                onShowNotification={showNotification}
              />
            ) : currentSection === 'import_history' ? (
              /* Ingestion Audit History (Section A.14) */
              <ImportHistoryView
                history={importHistory}
                onOpenImportModal={() => setIsImportModalOpen(true)}
              />
            ) : currentSection === 'drive_import_status' ? (
              /* Google Drive Automated Ingestion Status (Admin Console) */
              <DriveImportStatusView
                jobs={ingestionJobs}
                currentUser={currentUser}
                existingLeads={leads}
                onSyncDrive={handleSyncDrive}
                isSyncingDrive={isSyncingDrive}
              />
            ) : currentSection === 'pending_registrations' ? (
              /* Founder-only: Pending Employee Registrations */
              <PendingRegistrationsView
                allUsers={allUsers}
                currentUser={currentUser}
              />
            ) : leads.length === 0 ? (
              /* Empty Dashboard with prominent Excel Import & Add Lead actions */
              <EmptyState
                onOpenAddModal={() => setIsAddModalOpen(true)}
                onOpenImportModal={() => setIsImportModalOpen(true)}
                onSyncDrive={handleSyncDrive}
                isSyncingDrive={isSyncingDrive}
              />
            ) : filteredLeads.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-500 text-xs">
                No prospects match the filter "{currentSection}" or search query "{searchQuery}".
              </div>
            ) : (
              <>
                {/* 1-by-1 Paced Outreach Bar */}
                {currentUser && (currentUser.role === 'founder' || currentUser.role === 'admin') && (
                  <PacedOutreachBar
                    campaign={campaign}
                    currentUser={currentUser}
                    eligibleUnsentLeads={eligibleUnsentLeads}
                    selectedLeads={selectedLeads}
                    isPacedRunning={isPacedRunning}
                    isPacedPaused={isPacedPaused}
                    currentSendingLead={currentSendingLead}
                    secondsRemaining={secondsRemaining}
                    pacedSentCount={pacedSentCount}
                    pacedTotal={pacedTotal}
                    onStartPacedQueue={handleStartPacedQueue}
                    onPausePacedQueue={handlePausePacedQueue}
                    onResumePacedQueue={handleResumePacedQueue}
                    onStopPacedQueue={handleStopPacedQueue}
                    onActivateCampaign={handleActivateCampaignFromBar}
                  />
                )}

                {viewMode === 'board' ? (
                  <LeadBoard
                    leads={filteredLeads}
                    users={allUsers}
                    onSelectLead={(l) => setSelectedLead(l)}
                    onUpdateStatus={handleUpdateStatus}
                    onOpenContactModal={(l) => setContactingLead(l)}
                  />
                ) : (
                  <LeadListView
                    leads={filteredLeads}
                    users={allUsers}
                    onSelectLead={(l) => setSelectedLead(l)}
                    onUpdateStatus={handleUpdateStatus}
                    onOpenContactModal={(l) => setContactingLead(l)}
                    selectedLeadIds={selectedLeadIds}
                    onToggleSelectLead={handleToggleSelectLead}
                    onSelectAllLeads={handleSelectAllLeads}
                    onDispatchSingleLead={handleDispatchSingleLead}
                    isDispatchingSingleId={isDispatchingSingleId}
                  />
                )}
              </>
            )}
          </>
        )}

      </main>

      {/* Modals */}
      
      {/* 1. Lead Details Modal */}
      <LeadModal
        lead={selectedLead}
        onClose={() => setSelectedLead(null)}
        users={allUsers}
        currentUser={currentUser}
        onUpdateStatus={handleUpdateStatus}
        onUpdateAssignee={handleUpdateAssignee}
        onDeleteLead={handleDeleteLead}
        onOpenContactModal={(lead) => {
          setSelectedLead(null);
          setContactingLead(lead);
        }}
        activities={activities}
        onAddNote={handleAddNote}
      />

      {/* 2. Contact Completion Workflow Modal (Requirement C) */}
      <ContactCompletionModal
        lead={contactingLead}
        isOpen={Boolean(contactingLead)}
        onClose={() => setContactingLead(null)}
        currentUser={currentUser}
        onSubmitContact={handleRecordContactCompletion}
      />

      {/* 3. Real In-Browser Excel/CSV Import Modal (Requirement A) */}
      <ExcelImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        existingLeads={leads}
        currentUser={currentUser}
        onImportComplete={(res) => {
          showNotification(`Successfully imported ${res.imported} leads (${res.duplicates} duplicates skipped).`);
        }}
        onBatchImport={(validLeads, record) => batchImportLeads(validLeads, record, currentUser)}
      />

      {/* 4. Manual Lead Addition Modal */}
      <AddLeadModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddLead={handleAddLead}
      />

      {/* Footer with Logo & Legal Links */}
      <footer className="border-t border-slate-200 bg-white py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="bg-white p-1 rounded-lg border border-slate-200 flex items-center shadow-sm">
              <img src="./caventra-logo.png" alt="CAVENTRA" className="h-7 w-auto object-contain" />
            </div>
            <span className="font-extrabold text-slate-900 text-sm tracking-tight">CAVENTRA CRM</span>
            <span>•</span>
            <span className="font-mono text-[11px] text-slate-400">
              {isFirebaseConfigured() ? 'Cloud Firestore & Auth Active' : 'Offline Secure Mode'}
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold">
            <button
              onClick={() => setActiveLegalPage('privacy')}
              className="hover:text-blue-600 transition-colors flex items-center gap-1"
            >
              <Shield className="w-3.5 h-3.5 text-slate-400" />
              <span>Privacy Policy</span>
            </button>
            <span>•</span>
            <button
              onClick={() => setActiveLegalPage('terms')}
              className="hover:text-blue-600 transition-colors flex items-center gap-1"
            >
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span>Terms & Conditions</span>
            </button>
          </div>
        </div>
      </footer>

    </div>
  );
}

export default App;
