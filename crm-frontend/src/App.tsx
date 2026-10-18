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
import { CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react';

export function App() {
  // Load persistent state from localStorage or initialize with mock data
  const [leads, setLeads] = useState<Lead[]>(() => {
    const saved = localStorage.getItem('caventra_leads');
    return saved ? JSON.parse(saved) : INITIAL_LEADS;
  });

  const [users] = useState<User[]>(INITIAL_USERS);
  const [currentUser, setCurrentUser] = useState<User>(INITIAL_USERS[0]); // Default Admin
  const [activities, setActivities] = useState<Activity[]>(() => {
    const saved = localStorage.getItem('caventra_activities');
    return saved ? JSON.parse(saved) : INITIAL_ACTIVITIES;
  });
  const [batches, setBatches] = useState<IngestionBatch[]>(() => {
    const saved = localStorage.getItem('caventra_batches');
    return saved ? JSON.parse(saved) : INITIAL_BATCHES;
  });

  const [currentTab, setCurrentTab] = useState<'pipeline' | 'table' | 'calendar' | 'ingestion'>('pipeline');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isHarvesting, setIsHarvesting] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Sync to localStorage
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
    setTimeout(() => setNotification(null), 4000);
  };

  // Filter leads based on global search
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

  // Update lead status (e.g. from Pipeline advance)
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
      `Status changed to ${newStatus.toUpperCase()}`,
      `Moved from ${lead.status} to ${newStatus} by ${currentUser.name}`,
      'status_change'
    );

    showNotification(`Lead moved to ${newStatus.toUpperCase()}`);
  };

  // Update lead details from modal
  const handleUpdateLead = (updated: Lead) => {
    setLeads(prev => prev.map(l => (l.id === updated.id ? updated : l)));
    setSelectedLead(updated);
    showNotification(`Lead "${updated.businessName}" updated successfully.`);
  };

  // Add a new activity
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

  // Add a new lead manually
  const handleAddLead = (leadData: Omit<Lead, 'id' | 'createdAt' | 'updatedAt' | 'normalizedDomain'>) => {
    const cleanDomain = leadData.website.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].toLowerCase();
    
    // Duplicate check
    const existing = leads.find(l => l.normalizedDomain === cleanDomain);
    if (existing) {
      alert(`A lead for domain "${cleanDomain}" already exists in your pipeline!`);
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
      'Lead Added Manually',
      `Created by ${currentUser.name}`,
      'ingestion'
    );
    showNotification(`Added ${newLead.businessName} to pipeline!`);
  };

  // Simulate or trigger the autonomous bot harvest
  const handleTriggerHarvest = () => {
    setIsHarvesting(true);
    showNotification('Contacting Gemini API for web services prospects...');

    setTimeout(() => {
      const generatedLead: Lead = {
        id: `lead_gen_${Date.now()}`,
        businessName: 'Starlight Medical Spa',
        website: 'https://starlight-medspa-dallas.com',
        normalizedDomain: 'starlight-medspa-dallas.com',
        contactName: 'Dr. Rebecca Stone',
        businessEmail: 'contact@starlight-medspa-dallas.com',
        businessPhone: '+1 (214) 555-0819',
        city: 'Dallas, TX',
        country: 'United States',
        industry: 'Wellness & Aesthetic Medicine',
        leadSource: 'Automated Daily Gemini Bot',
        sourceUrl: 'https://aistudio.google.com',
        websiteCondition: 'SSL Certificate expired 14 days ago (insecure checkout), TTFB latency 4.1s.',
        serviceOpportunity: 'Security Audit',
        verifiedStatus: 'ai_inferred',
        status: 'new',
        priority: 'urgent',
        assignedTo: null,
        estimatedValue: 52000,
        nextFollowUpDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
        lastContactDate: null,
        notes: 'Identified via automated AI scan. Insecure cart checkout currently scaring mobile patients.',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setLeads(prev => [generatedLead, ...prev]);
      
      const newBatch: IngestionBatch = {
        id: `batch_${Date.now()}`,
        source: 'Automated Gemini Flash Bot (On-Demand)',
        timestamp: 'Just now',
        leadsHarvested: 5,
        newLeads: 1,
        duplicatesSkipped: 4,
        status: 'completed',
      };

      setBatches(prev => [newBatch, ...prev]);

      handleAddActivity(
        generatedLead.id,
        'Autonomous Lead Ingested',
        'Discovered by Gemini Flash API: Expired SSL & 4.1s TTFB latency.',
        'ingestion'
      );

      setIsHarvesting(false);
      showNotification('🎉 1 Fresh Lead Ingested without downloads or manual entry!');
    }, 1800);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      
      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-5 right-5 z-50 bg-indigo-600 text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 text-xs font-semibold animate-in slide-in-from-bottom duration-200">
          <Sparkles className="w-4 h-4 text-cyan-300" />
          <span>{notification}</span>
        </div>
      )}

      {/* Top Header & Navigation */}
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
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Key Metrics Overview (Shown on Pipeline & Table views) */}
        {(currentTab === 'pipeline' || currentTab === 'table') && (
          <MetricsCards leads={leads} />
        )}

        {/* View Switcher */}
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

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950/80 py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-300">CAVENTRA CRM</span>
            <span>•</span>
            <span>Zero-Cost Serverless Architecture</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-emerald-400/90 font-mono">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Infrastructure Cost: ₹0.00 / month (GitHub Pages + Cloudflare + Google AI)</span>
          </div>
        </div>
      </footer>

    </div>
  );
}

export default App;
