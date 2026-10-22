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
  | 'drive_import_status'
  | 'pending_registrations'
  | 'email_outreach';

export type LeadPriority = 'normal' | 'high' | 'urgent';
export type UserRole = 'founder' | 'admin' | 'employee';
export type UserStatus = 'pending_activation' | 'active' | 'suspended' | 'disabled';

export interface User {
  id: string;
  name: string;
  email: string;
  phoneNumber?: string;
  role: UserRole;
  status: UserStatus;
  initials: string;
  createdAt: string;
  activatedAt?: string;
  activatedBy?: string;
  registeredAt?: string;
}

export interface ActivationCodeRecord {
  id: string;
  employeeUid: string;
  employeeEmail: string;
  employeeName: string;
  codeHash: string;
  issuedByUid: string;
  issuedByName: string;
  issuedAt: string;
  expiresAt: string;
  used: boolean;
  usedAt?: string;
  revoked: boolean;
  failedAttempts: number;
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
  email?: string | null;
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
  outreachStatus?: OutreachStatus;
  outreachJobId?: string;
  outreachSentAt?: string;
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

// ==========================================
// OUTREACH CAMPAIGN & EMAIL TYPES
// ==========================================

export type CampaignStatus = 'PAUSED' | 'ACTIVE' | 'ERROR';

export type SenderConnectionStatus = 
  | 'CONNECTED' 
  | 'DISCONNECTED' 
  | 'REVOKED' 
  | 'EXPIRED' 
  | 'NOT_CONFIGURED';

export type OutreachStatus = 
  | 'not_queued' 
  | 'queued' 
  | 'sending' 
  | 'sent' 
  | 'failed' 
  | 'suppressed' 
  | 'replied' 
  | 'bounced' 
  | 'unknown';

export type EmailJobStatus = 
  | 'QUEUED' 
  | 'SENDING' 
  | 'SENT' 
  | 'FAILED' 
  | 'SUPPRESSED' 
  | 'CANCELLED' 
  | 'UNKNOWN';

export type EmailEventType = 
  | 'QUEUED' 
  | 'SEND_ATTEMPT' 
  | 'SENT' 
  | 'BOUNCED' 
  | 'REPLIED' 
  | 'OPTED_OUT' 
  | 'SUPPRESSED' 
  | 'FAILED' 
  | 'RECONCILED';

export type BounceClassification = 
  | 'PERMANENT' 
  | 'TEMPORARY' 
  | 'MAILBOX_FULL' 
  | 'INVALID_RECIPIENT' 
  | 'UNCLASSIFIED';

export interface CampaignStats {
  queuedCount: number;
  sentCount: number;
  failedCount: number;
  suppressedCount: number;
  repliedCount: number;
  bouncedCount: number;
}

export interface OutreachCampaign {
  id: string;
  name: string;
  status: CampaignStatus;
  senderEmail: string;
  senderName: string;
  authorizedConnectionStatus: SenderConnectionStatus;
  subject: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  activatedAt?: string | null;
  activatedBy?: string | null;
  pausedAt?: string | null;
  pausedBy?: string | null;
  lastSendAt?: string | null;
  lastError?: string | null;
  appsScriptUrl?: string;
  stats: CampaignStats;
}

export interface EmailJob {
  id: string;
  campaignId: string;
  leadId: string;
  recipientEmail: string;
  recipientName?: string | null;
  businessName: string;
  status: EmailJobStatus;
  leaseOwner?: string | null;
  leaseExpiresAt?: string | null;
  attempts: number;
  maxAttempts: number;
  lastAttemptAt?: string | null;
  nextRetryAt?: string | null;
  providerMessageId?: string | null;
  providerThreadId?: string | null;
  errorDetails?: string | null;
  createdAt: string;
  sentAt?: string | null;
  optOutToken: string;
  resolvedSubject?: string;
  templateVersion?: string;
}

export interface EmailEvent {
  id: string;
  jobId: string;
  leadId: string;
  campaignId: string;
  recipientEmail: string;
  eventType: EmailEventType;
  bounceType?: BounceClassification;
  timestamp: string;
  details?: string;
  attemptNumber?: number;
  providerMessageId?: string;
}

export interface EmailSuppression {
  id: string; // normalized email
  email: string;
  reason: 'OPT_OUT' | 'BOUNCE_PERMANENT' | 'INVALID_SYNTAX' | 'MANUAL';
  suppressedAt: string;
  sourceLeadId?: string;
  sourceJobId?: string;
  notes?: string;
}

