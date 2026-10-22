export interface BackendCampaign {
  id: string;
  name: string;
  status: 'PAUSED' | 'ACTIVE' | 'ERROR';
  senderEmail: string;
  senderName: string;
  authorizedConnectionStatus: 'CONNECTED' | 'DISCONNECTED' | 'REVOKED' | 'EXPIRED' | 'NOT_CONFIGURED';
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
  stats: {
    queuedCount: number;
    sentCount: number;
    failedCount: number;
    suppressedCount: number;
    repliedCount: number;
    bouncedCount: number;
  };
}

export interface BackendEmailJob {
  id: string;
  campaignId: string;
  leadId: string;
  recipientEmail: string;
  recipientName?: string | null;
  businessName: string;
  status: 'QUEUED' | 'SENDING' | 'SENT' | 'FAILED' | 'SUPPRESSED' | 'CANCELLED' | 'UNKNOWN';
  leaseOwner?: string | null;
  leaseExpiresAt?: number | null; // epoch ms
  attempts: number;
  maxAttempts: number;
  lastAttemptAt?: string | null;
  nextRetryAt?: number | null;
  providerMessageId?: string | null;
  providerThreadId?: string | null;
  errorDetails?: string | null;
  createdAt: string;
  sentAt?: string | null;
  optOutToken: string;
  resolvedSubject?: string;
}

export interface BackendEmailEvent {
  id: string;
  jobId: string;
  leadId: string;
  campaignId: string;
  recipientEmail: string;
  eventType: 'QUEUED' | 'SEND_ATTEMPT' | 'SENT' | 'BOUNCED' | 'REPLIED' | 'OPTED_OUT' | 'SUPPRESSED' | 'FAILED' | 'RECONCILED';
  bounceType?: 'PERMANENT' | 'TEMPORARY' | 'MAILBOX_FULL' | 'INVALID_RECIPIENT' | 'UNCLASSIFIED';
  timestamp: string;
  details?: string;
  attemptNumber?: number;
  providerMessageId?: string;
}

export interface BackendSuppression {
  id: string;
  email: string;
  reason: 'OPT_OUT' | 'BOUNCE_PERMANENT' | 'INVALID_SYNTAX' | 'MANUAL';
  suppressedAt: string;
  sourceLeadId?: string;
  notes?: string;
}

export interface SendMailOptions {
  to: string;
  from: string;
  fromName: string;
  subject: string;
  textBody: string;
  optOutUrl?: string;
  headers?: Record<string, string>;
}

export interface SendMailResult {
  messageId: string;
  threadId: string;
}

export interface MailboxMessage {
  id: string;
  threadId: string;
  from: string;
  to: string;
  subject: string;
  body: string;
  headers: Record<string, string>;
  isBounce?: boolean;
  bounceType?: 'PERMANENT' | 'TEMPORARY';
  inReplyTo?: string;
  references?: string;
}
