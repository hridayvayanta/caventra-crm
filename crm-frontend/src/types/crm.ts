export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'proposal' | 'won' | 'lost';
export type LeadPriority = 'low' | 'medium' | 'high' | 'urgent';
export type VerifiedStatus = 'verified' | 'ai_inferred' | 'unverified';
export type UserRole = 'admin' | 'employee';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar: string;
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
  websiteCondition: string; // Key issue identified: e.g. "Slow LCP 5.8s, missing SSL, non-mobile viewport"
  serviceOpportunity: 'Redesign' | 'Maintenance' | 'Hosting' | 'Security Audit' | 'Speed Optimization';
  verifiedStatus: VerifiedStatus;
  status: LeadStatus;
  priority: LeadPriority;
  assignedTo?: string | null; // User ID
  lastContactDate?: string | null;
  nextFollowUpDate?: string | null;
  estimatedValue?: number; // In ₹ or $
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
