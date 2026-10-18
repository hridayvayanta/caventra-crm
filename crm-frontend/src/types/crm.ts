export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'proposal' | 'won' | 'lost';
export type LeadPriority = 'low' | 'medium' | 'high' | 'urgent';
export type VerificationLevel = 'verified' | 'automated_scan' | 'unverified';
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
  type: 'status_change' | 'note' | 'call' | 'email' | 'ingestion';
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
  country: string;
  city: string;
  industry: string;
  leadSource: string;
  sourceUrl?: string;
  websiteCondition: string; // Factual technical assessment
  serviceOpportunity: 'Redesign' | 'Maintenance' | 'Hosting' | 'Security Audit' | 'Speed Optimization';
  verificationLevel: VerificationLevel;
  status: LeadStatus;
  priority: LeadPriority;
  assignedTo?: string | null; // User ID
  lastContactDate?: string | null;
  nextFollowUpDate?: string | null;
  estimatedValue?: number; // In INR (₹)
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
