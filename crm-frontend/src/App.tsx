import React, { useState, useEffect } from 'react';
import { Lead, LeadStatus, User, Activity, IngestionBatch } from './types/crm';
import { 
  INITIAL_LEADS, 
  INITIAL_USERS, 
  INITIAL_ACTIVITIES, 
  INITIAL_BATCHES 
} from './data/mockData';
import { Navbar } from './components/Navbar';
import { MetricsCards } from './components/MetricsCards';
import { PipelineBoard } from './components/PipelineBoard';
import { LeadTable } from './components/LeadTable';
import { LeadDetailModal } from './components/LeadDetailModal';
import { AddLeadModal } from './components/AddLeadModal';
import { IngestionHub } from './components/IngestionHub';
import { FollowUpCalendar } from './components/FollowUpCalendar';
import { PrivacyPolicy } from './components/PrivacyPolicy';
import { TermsConditions } from './components/TermsConditions';
import { Shield, FileText, CheckCircle2 } from 'lucide-react';

export function App() {
  const [leads, setLeads] = useState<Lead[]>(() => {
    const saved = localStorage.getItem('caventra_leads');
    return saved ? JSON.parse(saved) : INITIAL_LEADS;
  });

  const [users] = useState<User[]>(INITIAL_USERS);
  const [currentUser, setCurrentUser] = useState<User>(INITIAL_USERS[0]);
  const [activities, setActivities] = useState<Activity[]>(() => {
    const saved = localStorage.getItem('caventra_activities');
    return saved ? JSON.parse(saved) : INITIAL_ACTIVITIES;
  });
  const [batches, setBatches] = useState<IngestionBatch[]>(() => {
    const saved = localStorage.getItem('caventra_batches');
    return saved ? JSON.parse(saved) : INITIAL_BATCHES;
  });

  const [currentTab, setCurrentTab] = useState<'pipeline' | 'table' | 'calendar' | 'ingestion' | 'privacy' | 'terms'>('pipeline');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isHarvesting, setIsHarvesting] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('caventra_leads', JSON.stringify(leads));
  }, [leads]);

  useEffect(() => {
    localStorage.setItem('caventra_activities', JSON.stringify(activities));
  }, [activities]);

  useEffect(() => {
    localStorage.setItem('caventra_batches', JSON.stringify(batches));
  }, [batches]);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  const filteredLeads = leads.filter(lead => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      lead.businessName.toLowerCase().includes(q) ||
      lead.normalizedDomain.toLowerCase().includes(q) ||
      lead.city.toLowerCase().includes(q) ||
      lead.industry.toLowerCase().includes(q) ||
      lead.websiteCondition.toLowerCase().includes(q)
    );
  });

  const handleUpdateLeadStatus = (leadId: string, newStatus: LeadStatus) => {
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;

    setLeads(prev => prev.map(l => {
      if (l.id === leadId) {
        return { ...l, status: newStatus, updatedAt: new Date().toISOString() };
      }
      return l;
    }));

    handleAddActivity(
      leadId,
      `Stage Transition: ${newStatus.toUpperCase()}`,
      `Moved from ${lead.status} to ${newStatus} by ${currentUser.name}`,
      'status_change'
    );

    showNotification(`Lead moved to ${newStatus.toUpperCase()}`);
  };

  const handleUpdateLead = (updated: Lead) => {
    setLeads(prev => prev.map(l => (l.id === updated.id ? updated : l)));
    setSelectedLead(updated);
    showNotification(`Record updated: ${updated.businessName}`);
  };

  const handleAddActivity = (
    leadId: string,
    title: string,
    description: string,
    type: Activity['type']
  ) => {
    const newAct: Activity = {
      id: `act_${Date.now()}`,
      leadId,
      title,
      description,
      type,
      performedBy: currentUser.name,
      timestamp: new Date().toISOString(),
    };
    setActivities(prev => [newAct, ...prev]);
  };

  const handleAddLead = (leadData: Omit<Lead, 'id' | 'createdAt' | 'updatedAt' | 'normalizedDomain'>) => {
    const cleanDomain = leadData.website.replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0].toLowerCase();
    
    const existing = leads.find(l => l.normalizedDomain === cleanDomain);
    if (existing) {
      alert(`A record for domain "${cleanDomain}" already exists in the database.`);
      return;
    }

    const newLead: Lead = {
      ...leadData,
      id: `lead_${Date.now()}`,
      normalizedDomain: cleanDomain,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setLeads(prev => [newLead, ...prev]);
    handleAddActivity(
      newLead.id,
      'Record Created Manually',
      `Registered by ${currentUser.name}`,
      'ingestion'
    );
    showNotification(`Registered ${newLead.businessName}`);
  };

  const handleTriggerHarvest = () => {
    setIsHarvesting(true);
    showNotification('Executing scheduled ingestion pipeline...');

    setTimeout(() => {
      const generatedLead: Lead = {
        id: `lead_gen_${Date.now()}`,
        businessName: 'Starlight Medical Group',
        website: 'https://starlight-medical-dallas.com',
        normalizedDomain: 'starlight-medical-dallas.com',
        contactName: 'Dr. Rebecca Stone',
        businessEmail: 'contact@starlight-medical-dallas.com',
        businessPhone: '+1 (214) 555-0819',
        city: 'Dallas, TX',
        country: 'United States',
        industry: 'Healthcare',
        leadSource: 'Scheduled Ingestion Pipeline',
        sourceUrl: 'https://aistudio.google.com',
        websiteCondition: 'TLS certificate expired 14 days ago triggering browser security warnings. Server TTFB latency measured at 4.1s.',
        serviceOpportunity: 'Security Audit',
        verificationLevel: 'automated_scan',
        status: 'new',
        priority: 'urgent',
        assignedTo: null,
        estimatedValue: 52000,
        nextFollowUpDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
        lastContactDate: null,
        notes: 'Discovered via scheduled scan. Insecure checkout endpoints detected on patient booking portal.',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setLeads(prev => [generatedLead, ...prev]);
      
      const newBatch: IngestionBatch = {
        id: `batch_${Date.now()}`,
        source: 'Automated Ingestion Service (On-Demand Execution)',
        timestamp: 'Just now',
        leadsHarvested: 5,
        newLeads: 1,
        duplicatesSkipped: 4,
        status: 'completed',
      };

      setBatches(prev => [newBatch, ...prev]);

      handleAddActivity(
        generatedLead.id,
        'Lead Ingested on Autopilot',
        'Criteria logged: Expired TLS certificate & 4.1s TTFB latency.',
        'ingestion'
      );

      setIsHarvesting(false);
      showNotification('1 new organization ingested. Duplicate records skipped.');
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-['Inter',sans-serif]">
      
      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-4 right-4 z-50 bg-neutral-900 border border-neutral-700 text-neutral-200 px-3.5 py-2 rounded shadow-2xl flex items-center gap-2 text-xs font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span>
          <span>{notification}</span>
        </div>
      )}

      {/* Navigation Header */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        users={users}
        currentUser={currentUser}
        setCurrentUser={setCurrentUser}
        onOpenAddModal={() => setIsAddModalOpen(true)}
        onTriggerHarvest={handleTriggerHarvest}
        isHarvesting={isHarvesting}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5">
        
        {/* Metrics Overview (Visible on Pipeline and Directory) */}
        {(currentTab === 'pipeline' || currentTab === 'table') && (
          <MetricsCards leads={leads} />
        )}

        {/* View Routing */}
        {currentTab === 'pipeline' && (
          <PipelineBoard
            leads={filteredLeads}
            users={users}
            onSelectLead={(l) => setSelectedLead(l)}
            onUpdateLeadStatus={handleUpdateLeadStatus}
          />
        )}

        {currentTab === 'table' && (
          <LeadTable
            leads={filteredLeads}
            users={users}
            onSelectLead={(l) => setSelectedLead(l)}
            onUpdateLeadStatus={handleUpdateLeadStatus}
          />
        )}

        {currentTab === 'calendar' && (
          <FollowUpCalendar
            leads={leads}
            users={users}
            onSelectLead={(l) => setSelectedLead(l)}
          />
        )}

        {currentTab === 'ingestion' && (
          <IngestionHub
            batches={batches}
            onTriggerHarvest={handleTriggerHarvest}
            isHarvesting={isHarvesting}
          />
        )}

        {currentTab === 'privacy' && (
          <PrivacyPolicy onBack={() => setCurrentTab('pipeline')} />
        )}

        {currentTab === 'terms' && (
          <TermsConditions onBack={() => setCurrentTab('pipeline')} />
        )}

      </main>

      {/* Modals */}
      <LeadDetailModal
        lead={selectedLead}
        onClose={() => setSelectedLead(null)}
        users={users}
        currentUser={currentUser}
        onUpdateLead={handleUpdateLead}
        activities={activities}
        onAddActivity={handleAddActivity}
      />

      <AddLeadModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddLead={handleAddLead}
        users={users}
      />

      {/* Clean Enterprise Footer */}
      <footer className="border-t border-neutral-800 bg-neutral-950 py-3 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-xs text-neutral-400 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-neutral-300">CAVENTRA Technologies</span>
            <span>•</span>
            <span className="font-mono text-[11px]">Serverless Infrastructure (₹0 Runtime Budget)</span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <button
              onClick={() => setCurrentTab('privacy')}
              className="hover:text-neutral-200 transition-colors flex items-center gap-1"
            >
              <Shield className="w-3 h-3 text-neutral-500" />
              Privacy Policy
            </button>
            <span>•</span>
            <button
              onClick={() => setCurrentTab('terms')}
              className="hover:text-neutral-200 transition-colors flex items-center gap-1"
            >
              <FileText className="w-3 h-3 text-neutral-500" />
              Terms & Conditions
            </button>
          </div>
        </div>
      </footer>

    </div>
  );
}

export default App;
