export type LeadStatus = 
  | 'new' 
  | 'to_contact' 
  | 'contacted' 
  | 'in_discussion' 
  | 'won' 
  | 'lost';

export type LeadSection = 
  | 'all' 
  | 'new' 
  | 'to_contact' 
  | 'contacted' 
  | 'follow_ups' 
  | 'in_discussion' 
  | 'won' 
  | 'lost'
  | 'import_history'
  | 'drive_import_status';

export type LeadPriority = 'normal' | 'high' | 'urgent';
export type UserRole = 'admin' | 'employee';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  initials: string;
}

export type ContactMethod = 'phone' | 'email' | 'whatsapp' | 'other';

export type ContactOutcome = 
  | 'no_answer' 
  | 'spoke' 
  | 'interested' 
  | 'not_interested' 
  | 'asked_follow_up';

export type NextContactAction = 
  | 'schedule_follow_up' 
  | 'move_to_discussion' 
  | 'keep_contacted' 
  | 'close_as_lost';

export interface Activity {
  id: string;
  leadId: string;
  type: 'contact' | 'follow_up' | 'note' | 'status_change' | 'import';
  title: string;
  description: string;
  performedBy: string;
  performedByEmail?: string;
  timestamp: string;
  contactMethod?: ContactMethod;
  outcome?: ContactOutcome;
}

export interface FollowUpTask {
  id: string;
  leadId: string;
  businessName: string;
  website: string;
  businessPhone?: string | null;
  businessEmail?: string | null;
  contactName?: string | null;
  assignedTo: string;
  dueDate: string; // YYYY-MM-DD
  dueTime?: string; // HH:mm
  reason: string;
  status: 'pending' | 'completed' | 'cancelled';
  createdAt: string;
  completedAt?: string;
  completedBy?: string;
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
  industry?: string;
  websiteCondition: string;
  serviceOpportunity: string;
  status: LeadStatus;
  priority: LeadPriority;
  assignedTo?: string | null;
  lastContactDate?: string | null;
  nextFollowUpDate?: string | null;
  nextFollowUpTime?: string | null;
  estimatedValue?: number;
  notes?: string;
  leadSource?: string;
  sourceFileId?: string;
  sourceFileName?: string;
  sourceUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ImportRecord {
  id: string;
  fileName: string;
  timestamp: string;
  totalRows: number;
  importedCount: number;
  duplicateCount: number;
  rejectedCount: number;
  status: 'success' | 'partial' | 'failed';
  errorMessage?: string;
}

export interface IngestionJob {
  id: string;
  fileId: string;
  fileName: string;
  fileUrl?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'partial';
  totalRows: number;
  processedRows: number;
  leadsAdded: number;
  duplicatesSkipped: number;
  rowsRejected: number;
  errors: string[];
  startedAt: string;
  completedAt?: string;
  lastCheckedAt: string;
  source: string;
}

export interface ContactCompletionFormValues {
  method: ContactMethod;
  outcome: ContactOutcome;
  notes: string;
  nextAction: NextContactAction;
  followUpDate: string;
  followUpTime: string;
}
