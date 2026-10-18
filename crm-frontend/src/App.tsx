import React, { useState, useEffect } from 'react';
import { 
  Lead, 
  LeadStatus, 
  LeadSection, 
  User, 
  Activity, 
  FollowUpTask, 
  ImportRecord, 
  ContactCompletionFormValues,
  IngestionJob
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
  batchImportLeads, 
  recordContactCompletion, 
  completeFollowUpTask 
} from './services/db';
import { 
  getCurrentSessionUser, 
  logoutUser, 
  subscribeAllUsers 
} from './services/auth';
import { isFirebaseConfigured } from './services/firebase';
import { Navbar } from './components/Navbar';
import { StatsRow } from './components/StatsRow';
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

  // Search & Modals
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [contactingLead, setContactingLead] = useState<Lead | null>(null);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

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

    return () => {
      unsubLeads();
      unsubFollowUps();
      unsubActivities();
      unsubHistory();
      unsubJobs();
    };
  }, [isAuthorized]);

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
            setActivationPrefillEmail(registeredUser.email);
            setAuthScreen('activation');
            showNotification('Registration submitted! Ask your founder for the login code.');
          }}
        />
      );
    }

    if (authScreen === 'activation') {
      return (
        <ActivationView
          initialEmail={activationPrefillEmail}
          onSwitchToLogin={(msg) => {
            setLoginNotice(msg || 'Account activated. Please sign in with your password.');
            setAuthScreen('login');
          }}
        />
      );
    }

    return (
      <LoginView
        initialMessage={loginNotice}
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          showNotification(`Welcome, ${user.name}`);
        }}
        onSwitchToRegister={() => {
          setLoginNotice(null);
          setAuthScreen('register');
        }}
        onSwitchToActivation={(email) => {
          if (email) setActivationPrefillEmail(email);
          setAuthScreen('activation');
        }}
      />
    );
  }

  // ==========================================
  // Session Access Controls
  // ==========================================

  // Pending Activation Guard
  if (currentUser.status === 'pending_activation') {
    return (
      <ActivationView
        initialEmail={currentUser.email}
        onSwitchToLogin={async (msg) => {
          await logoutUser();
          setCurrentUser(null);
          setLoginNotice(msg || null);
          setAuthScreen('login');
        }}
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

  // Add lead manually
  const handleAddLead = async (leadData: Omit<Lead, 'id' | 'createdAt' | 'updatedAt' | 'normalizedDomain'>) => {
    const cleanDomain = leadData.website.replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0].toLowerCase();
    
    // Check duplicates
    if (leads.some(l => l.normalizedDomain === cleanDomain)) {
      alert(`A lead with website domain "${cleanDomain}" already exists in the system!`);
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

  const pendingFollowUpsCount = followUps.filter(t => t.status === 'pending').length;
  const newLeadsCount = leads.filter(l => l.status === 'new').length;
  const pendingRegistrationsCount = allUsers.filter(u => u.status === 'pending_activation').length;

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
             currentSection !== 'pending_registrations' && (
              <StatsRow leads={leads} />
            )}

            {/* Follow-ups Dedicated Task List (Section D) */}
            {currentSection === 'follow_ups' ? (
              <FollowUpTasksView
                tasks={followUps}
                currentUser={currentUser}
                onCompleteTask={handleCompleteFollowUp}
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
              />
            ) : filteredLeads.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-500 text-xs">
                No prospects match the filter "{currentSection}" or search query "{searchQuery}".
              </div>
            ) : viewMode === 'board' ? (
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
              />
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
            <div className="bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-800 flex items-center shadow-sm">
              <img src="./caventra-logo.png" alt="CAVENTRA" className="h-6 w-auto object-contain" />
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
