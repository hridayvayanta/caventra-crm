export type LeadStatus = 'new' | 'contacted' | 'in_progress' | 'won' | 'lost';
export type LeadPriority = 'normal' | 'high' | 'urgent';
export type UserRole = 'admin' | 'employee';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  initials: string;
}

export interface Activity {
  id: string;
  leadId: string;
  type: 'note' | 'call' | 'email' | 'status_change';
  title: string;
  description: string;
  performedBy: string;
  timestamp: string;
}

export interface Lead {
  id: string;
  businessName: string;
  website: string;
  normalizedDomain: string;
  contactName?: string | null;
  businessEmail?: string | null;
  businessPhone?: string | null;
  city: string;
  country: string;
  websiteCondition: string; // Plain English: e.g. "Website is not mobile-friendly"
  serviceOpportunity: string; // e.g. "Website Redesign", "Maintenance", "Security"
  status: LeadStatus;
  priority: LeadPriority;
  assignedTo?: string | null;
  estimatedValue?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IngestionBatch {
  id: string;
  source: string;
  timestamp: string;
  leadsHarvested: number;
  newLeads: number;
  duplicatesSkipped: number;
  status: 'completed' | 'running' | 'failed';
}
