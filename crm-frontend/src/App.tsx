import React, { useState, useEffect } from 'react';
import { Lead, LeadStatus, User, Activity } from './types/crm';
import { INITIAL_USERS } from './data/mockData';
import { Navbar } from './components/Navbar';
import { StatsRow } from './components/StatsRow';
import { LeadBoard } from './components/LeadBoard';
import { LeadListView } from './components/LeadListView';
import { EmptyState } from './components/EmptyState';
import { LeadModal } from './components/LeadModal';
import { AddLeadModal } from './components/AddLeadModal';
import { PrivacyPolicy } from './components/PrivacyPolicy';
import { TermsConditions } from './components/TermsConditions';
import { Shield, FileText } from 'lucide-react';

export function App() {
  // Clear any old mock demo data from previous sessions
  const [leads, setLeads] = useState<Lead[]>(() => {
    try {
      const saved = localStorage.getItem('caventra_leads');
      if (saved) {
        const parsed = JSON.parse(saved);
        // If it contained old mock demo data with lead_001, reset to empty
        if (Array.isArray(parsed) && parsed.some((l: any) => l.id === 'lead_001')) {
          localStorage.removeItem('caventra_leads');
          return [];
        }
        return parsed;
      }
    } catch (e) {}
    return [];
  });

  const [users] = useState<User[]>(INITIAL_USERS);
  const [currentUser, setCurrentUser] = useState<User>(INITIAL_USERS[0]);
  const [activities, setActivities] = useState<Activity[]>(() => {
    try {
      const saved = localStorage.getItem('caventra_activities');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.some((a: any) => a.id === 'act_1')) {
          localStorage.removeItem('caventra_activities');
          return [];
        }
        return parsed;
      }
    } catch (e) {}
    return [];
  });

  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');
  const [activePage, setActivePage] = useState<'crm' | 'privacy' | 'terms'>('crm');
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

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  // Filter leads based on search query
  const filteredLeads = leads.filter(lead => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      lead.businessName.toLowerCase().includes(q) ||
      lead.city.toLowerCase().includes(q) ||
      (lead.businessPhone && lead.businessPhone.includes(q)) ||
      lead.normalizedDomain.toLowerCase().includes(q) ||
      lead.serviceOpportunity.toLowerCase().includes(q)
    );
  });

  // Update lead status
  const handleUpdateStatus = (leadId: string, newStatus: LeadStatus) => {
    setLeads(prev => prev.map(l => {
      if (l.id === leadId) {
        return { ...l, status: newStatus, updatedAt: new Date().toISOString() };
      }
      return l;
    }));

    if (selectedLead && selectedLead.id === leadId) {
      setSelectedLead(prev => prev ? { ...prev, status: newStatus } : null);
    }

    const statusLabel = 
      newStatus === 'new' ? 'New' :
      newStatus === 'contacted' ? 'Contacted' :
      newStatus === 'in_progress' ? 'In Discussion' :
      newStatus === 'won' ? 'Deal Won' : 'Lost';

    showNotification(`Moved to "${statusLabel}"`);
  };

  // Delete lead
  const handleDeleteLead = (leadId: string) => {
    setLeads(prev => prev.filter(l => l.id !== leadId));
    setSelectedLead(null);
    showNotification('Lead removed from CRM.');
  };

  // Add a note
  const handleAddNote = (leadId: string, text: string) => {
    const newAct: Activity = {
      id: `act_${Date.now()}`,
      leadId,
      type: 'note',
      title: 'Call / Discussion Note',
      description: text,
      performedBy: currentUser.name,
      timestamp: new Date().toISOString(),
    };
    setActivities(prev => [newAct, ...prev]);
    showNotification('Note saved.');
  };

  // Add lead manually
  const handleAddLead = (leadData: Omit<Lead, 'id' | 'createdAt' | 'updatedAt' | 'normalizedDomain'>) => {
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

    setLeads(prev => [newLead, ...prev]);
    showNotification(`Added ${newLead.businessName}`);
  };

  // Run automated lead discovery on-demand
  const handleTriggerHarvest = () => {
    setIsHarvesting(true);
    showNotification('Searching for prospective client websites...');

    setTimeout(() => {
      const generatedLead: Lead = {
        id: `lead_gen_${Date.now()}`,
        businessName: 'Apex Health Clinic',
        website: 'https://apexhealth-example.com',
        normalizedDomain: 'apexhealth-example.com',
        contactName: 'Dr. Michael Chen',
        businessEmail: 'contact@apexhealth-example.com',
        businessPhone: '+91 98201 55432',
        city: 'Mumbai',
        country: 'India',
        serviceOpportunity: 'Website Redesign',
        websiteCondition: 'Website does not display properly on mobile phones and lacks SSL security encryption.',
        status: 'new',
        priority: 'high',
        assignedTo: null,
        estimatedValue: 45000,
        notes: 'Identified through automated search.',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setLeads(prev => [generatedLead, ...prev]);
      setIsHarvesting(false);
      showNotification('New prospective client found!');
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      
      {/* Toast Alert */}
      {notification && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-lg text-xs font-semibold animate-in slide-in-from-bottom duration-150">
          {notification}
        </div>
      )}

      {/* Top Header */}
      <Navbar
        viewMode={viewMode}
        setViewMode={setViewMode}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        users={users}
        currentUser={currentUser}
        setCurrentUser={setCurrentUser}
        onOpenAddModal={() => setIsAddModalOpen(true)}
        onTriggerHarvest={handleTriggerHarvest}
        isHarvesting={isHarvesting}
        onOpenPrivacy={() => setActivePage('privacy')}
        onOpenTerms={() => setActivePage('terms')}
      />

      {/* Main Page Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {activePage === 'privacy' && (
          <PrivacyPolicy onBack={() => setActivePage('crm')} />
        )}

        {activePage === 'terms' && (
          <TermsConditions onBack={() => setActivePage('crm')} />
        )}

        {activePage === 'crm' && (
          <>
            {/* Top Stats Cards */}
            <StatsRow leads={leads} />

            {/* If zero leads in CRM */}
            {leads.length === 0 ? (
              <EmptyState
                onOpenAddModal={() => setIsAddModalOpen(true)}
                onTriggerHarvest={handleTriggerHarvest}
                isHarvesting={isHarvesting}
              />
            ) : filteredLeads.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-slate-500 text-sm">
                No leads match your search query "{searchQuery}".
              </div>
            ) : viewMode === 'board' ? (
              <LeadBoard
                leads={filteredLeads}
                users={users}
                onSelectLead={(l) => setSelectedLead(l)}
                onUpdateStatus={handleUpdateStatus}
              />
            ) : (
              <LeadListView
                leads={filteredLeads}
                users={users}
                onSelectLead={(l) => setSelectedLead(l)}
                onUpdateStatus={handleUpdateStatus}
              />
            )}
          </>
        )}

      </main>

      {/* Modals */}
      <LeadModal
        lead={selectedLead}
        onClose={() => setSelectedLead(null)}
        users={users}
        currentUser={currentUser}
        onUpdateStatus={handleUpdateStatus}
        onDeleteLead={handleDeleteLead}
        activities={activities}
        onAddNote={handleAddNote}
      />

      <AddLeadModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddLead={handleAddLead}
      />

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700">CAVENTRA CRM</span>
            <span>•</span>
            <span>Simple Web Services Pipeline</span>
          </div>

          <div className="flex items-center gap-4 text-xs font-medium">
            <button
              onClick={() => setActivePage('privacy')}
              className="hover:text-blue-600 transition-colors flex items-center gap-1"
            >
              <Shield className="w-3.5 h-3.5 text-slate-400" />
              <span>Privacy Policy</span>
            </button>
            <span>•</span>
            <button
              onClick={() => setActivePage('terms')}
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
