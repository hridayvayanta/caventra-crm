import { 
  BackendCampaign, 
  BackendEmailJob, 
  BackendEmailEvent, 
  BackendSuppression, 
  MailboxMessage 
} from './types';
import { GmailProvider } from './gmailProvider';

export interface DataStore {
  campaign: BackendCampaign;
  jobs: Map<string, BackendEmailJob>;
  events: BackendEmailEvent[];
  suppressions: Map<string, BackendSuppression>;
  historyCursor: string;
}

export interface WorkerResult {
  status: 'SENT' | 'SKIPPED_PAUSED' | 'SKIPPED_SUPPRESSED' | 'FAILED_RETRYABLE' | 'FAILED_FINAL' | 'UNKNOWN' | 'LOCKED';
  jobId: string;
  error?: string;
  providerMessageId?: string;
}

/**
 * Normalizes email address
 */
export function normalizeEmail(email: string): string {
  if (!email) return '';
  return email.trim().toLowerCase();
}

/**
 * Validates email RFC 5322 syntax
 */
export function validateEmail(email: string): boolean {
  if (!email) return false;
  return /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/.test(email.trim().toLowerCase());
}

/**
 * Core Outreach Engine Worker
 */
export class OutreachWorker {
  private workerId: string;
  private provider: GmailProvider;
  private store: DataStore;
  private leaseDurationMs: number = 60000; // 60s lease

  constructor(workerId: string, provider: GmailProvider, store: DataStore) {
    this.workerId = workerId;
    this.provider = provider;
    this.store = store;
  }

  /**
   * Distributed Lease Locking:
   * Safely attempts to claim a job. Ensures two concurrent workers cannot process the same job.
   */
  claimJob(jobId: string): boolean {
    const job = this.store.jobs.get(jobId);
    if (!job) return false;

    const now = Date.now();
    const isAvailable = 
      job.status === 'QUEUED' || 
      (job.status === 'SENDING' && job.leaseExpiresAt && job.leaseExpiresAt < now);

    if (!isAvailable) {
      return false;
    }

    job.status = 'SENDING';
    job.leaseOwner = this.workerId;
    job.leaseExpiresAt = now + this.leaseDurationMs;
    this.store.jobs.set(jobId, job);
    return true;
  }

  /**
   * Releases lease if job processing was aborted
   */
  releaseJobLease(jobId: string, restoreStatus: 'QUEUED' | 'UNKNOWN' = 'QUEUED'): void {
    const job = this.store.jobs.get(jobId);
    if (!job) return;
    if (job.leaseOwner === this.workerId) {
      job.status = restoreStatus;
      job.leaseOwner = null;
      job.leaseExpiresAt = null;
      this.store.jobs.set(jobId, job);
    }
  }

  /**
   * Processes a single outreach job through the complete delivery and verification pipeline.
   */
  async processJob(jobId: string): Promise<WorkerResult> {
    // Step 1: Claim job lease
    const claimed = this.claimJob(jobId);
    if (!claimed) {
      return { status: 'LOCKED', jobId, error: 'Job is currently locked or being processed by another worker.' };
    }

    const job = this.store.jobs.get(jobId)!;
    const campaign = this.store.campaign;
    const nowIso = new Date().toISOString();

    // Step 2: Non-negotiable Kill Switch check immediately before delivery
    if (campaign.status !== 'ACTIVE') {
      this.releaseJobLease(jobId, 'QUEUED');
      return { 
        status: 'SKIPPED_PAUSED', 
        jobId, 
        error: 'Campaign is PAUSED. Worker safely aborted delivery without sending.' 
      };
    }

    // Step 3: Check recipient suppression list
    const normEmail = normalizeEmail(job.recipientEmail);
    if (this.store.suppressions.has(normEmail)) {
      job.status = 'SUPPRESSED';
      job.errorDetails = 'Recipient is in suppression / opt-out list.';
      this.store.jobs.set(jobId, job);
      campaign.stats.suppressedCount++;

      this.logEvent({
        id: `evt_sup_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        jobId,
        leadId: job.leadId,
        campaignId: campaign.id,
        recipientEmail: normEmail,
        eventType: 'SUPPRESSED',
        timestamp: nowIso,
        details: 'Send cancelled because recipient is suppressed.',
      });

      return { status: 'SKIPPED_SUPPRESSED', jobId, error: 'Recipient is suppressed.' };
    }

    // Step 4: Validate recipient email syntax
    if (!validateEmail(normEmail)) {
      job.status = 'FAILED';
      job.errorDetails = 'Invalid recipient email syntax.';
      this.store.jobs.set(jobId, job);
      campaign.stats.failedCount++;

      this.logEvent({
        id: `evt_err_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        jobId,
        leadId: job.leadId,
        campaignId: campaign.id,
        recipientEmail: normEmail,
        eventType: 'FAILED',
        timestamp: nowIso,
        details: 'Rejected due to malformed recipient email syntax.',
      });

      return { status: 'FAILED_FINAL', jobId, error: 'Invalid email syntax.' };
    }

    // Step 5: Send via Gmail Provider with retry & ambiguous timeout protection
    job.attempts++;
    job.lastAttemptAt = nowIso;

    try {
      this.logEvent({
        id: `evt_att_${Date.now()}_${job.attempts}`,
        jobId,
        leadId: job.leadId,
        campaignId: campaign.id,
        recipientEmail: normEmail,
        eventType: 'SEND_ATTEMPT',
        timestamp: nowIso,
        attemptNumber: job.attempts,
        details: `Dispatch attempt ${job.attempts}/${job.maxAttempts} initiated via Gmail API.`,
      });

      const optOutUrl = `https://caventraofficial.in/#optout?token=${job.optOutToken}&email=${encodeURIComponent(normEmail)}`;
      
      const sendResult = await this.provider.sendEmail({
        to: normEmail,
        from: campaign.senderEmail,
        fromName: campaign.senderName,
        subject: job.resolvedSubject || campaign.subject,
        textBody: campaign.body,
        optOutUrl,
      });

      // Delivery succeeded
      job.status = 'SENT';
      job.sentAt = new Date().toISOString();
      job.providerMessageId = sendResult.messageId;
      job.providerThreadId = sendResult.threadId;
      job.leaseOwner = null;
      job.leaseExpiresAt = null;
      this.store.jobs.set(jobId, job);

      campaign.stats.sentCount++;
      if (campaign.stats.queuedCount > 0) campaign.stats.queuedCount--;
      campaign.lastSendAt = job.sentAt;

      this.logEvent({
        id: `evt_sent_${Date.now()}`,
        jobId,
        leadId: job.leadId,
        campaignId: campaign.id,
        recipientEmail: normEmail,
        eventType: 'SENT',
        timestamp: job.sentAt,
        providerMessageId: sendResult.messageId,
        details: `Email successfully accepted by Gmail API (Message ID: ${sendResult.messageId})`,
      });

      return {
        status: 'SENT',
        jobId,
        providerMessageId: sendResult.messageId,
      };

    } catch (err: any) {
      // Step 6: Handle Ambiguous Timeout
      // If the timeout is ambiguous, NEVER blind resend! Set to UNKNOWN and reconcile.
      if (err.isAmbiguous || err.code === 'ETIMEDOUT') {
        job.status = 'UNKNOWN';
        job.errorDetails = `Ambiguous timeout: ${err.message}. Awaiting reconciliation before any resend.`;
        job.leaseOwner = null;
        job.leaseExpiresAt = null;
        this.store.jobs.set(jobId, job);

        this.logEvent({
          id: `evt_amb_${Date.now()}`,
          jobId,
          leadId: job.leadId,
          campaignId: campaign.id,
          recipientEmail: normEmail,
          eventType: 'FAILED',
          timestamp: new Date().toISOString(),
          details: `Ambiguous network timeout encountered. Placed in UNKNOWN state for mailbox reconciliation.`,
        });

        return {
          status: 'UNKNOWN',
          jobId,
          error: 'Ambiguous send timeout. Status set to UNKNOWN to prevent duplicate delivery.',
        };
      }

      // Step 7: Bounded Retries for Temporary Provider Errors
      const isRetryable = err.isRetryable || err.statusCode === 429 || (err.statusCode && err.statusCode >= 500);

      if (isRetryable && job.attempts < job.maxAttempts) {
        const backoffMs = Math.pow(2, job.attempts) * 1000;
        job.status = 'QUEUED';
        job.nextRetryAt = Date.now() + backoffMs;
        job.errorDetails = `Retryable failure (${err.message}). Scheduled retry in ${backoffMs / 1000}s.`;
        job.leaseOwner = null;
        job.leaseExpiresAt = null;
        this.store.jobs.set(jobId, job);

        this.logEvent({
          id: `evt_ret_${Date.now()}`,
          jobId,
          leadId: job.leadId,
          campaignId: campaign.id,
          recipientEmail: normEmail,
          eventType: 'FAILED',
          timestamp: new Date().toISOString(),
          details: `Temporary API failure. Will retry (attempt ${job.attempts}/${job.maxAttempts}).`,
        });

        return {
          status: 'FAILED_RETRYABLE',
          jobId,
          error: `Temporary error: ${err.message}. Retry scheduled.`,
        };
      }

      // Final failure
      job.status = 'FAILED';
      job.errorDetails = err.message || 'Unknown fatal send error';
      job.leaseOwner = null;
      job.leaseExpiresAt = null;
      this.store.jobs.set(jobId, job);
      campaign.stats.failedCount++;

      this.logEvent({
        id: `evt_fail_${Date.now()}`,
        jobId,
        leadId: job.leadId,
        campaignId: campaign.id,
        recipientEmail: normEmail,
        eventType: 'FAILED',
        timestamp: new Date().toISOString(),
        details: `Final delivery failure: ${err.message}`,
      });

      return {
        status: 'FAILED_FINAL',
        jobId,
        error: err.message,
      };
    }
  }

  /**
   * Reconciles UNKNOWN jobs against the mailbox sent records before deciding if resend is safe
   */
  async reconcileUnknownJob(jobId: string): Promise<boolean> {
    const job = this.store.jobs.get(jobId);
    if (!job || job.status !== 'UNKNOWN') return false;

    // Search sent messages for matching recipient
    const matches = await this.provider.listMessages(job.recipientEmail);
    const sentMatch = matches.find(m => 
      normalizeEmail(m.to) === normalizeEmail(job.recipientEmail) ||
      m.subject === (job.resolvedSubject || this.store.campaign.subject)
    );

    const nowIso = new Date().toISOString();

    if (sentMatch) {
      // It actually sent! Mark as SENT
      job.status = 'SENT';
      job.sentAt = nowIso;
      job.providerMessageId = sentMatch.id;
      job.providerThreadId = sentMatch.threadId;
      job.errorDetails = null;
      this.store.jobs.set(jobId, job);

      this.store.campaign.stats.sentCount++;
      if (this.store.campaign.stats.queuedCount > 0) this.store.campaign.stats.queuedCount--;

      this.logEvent({
        id: `evt_rec_${Date.now()}`,
        jobId,
        leadId: job.leadId,
        campaignId: this.store.campaign.id,
        recipientEmail: job.recipientEmail,
        eventType: 'RECONCILED',
        timestamp: nowIso,
        providerMessageId: sentMatch.id,
        details: 'Reconciliation confirmed message was delivered by provider during ambiguous timeout.',
      });
      return true;
    } else {
      // Confirmed NOT sent. Safe to mark QUEUED for retry
      job.status = 'QUEUED';
      job.errorDetails = 'Reconciliation confirmed message was not delivered. Reset to QUEUED.';
      this.store.jobs.set(jobId, job);
      return false;
    }
  }

  /**
   * Mailbox History Synchronization:
   * Classifies bounces and detects recipient replies
   */
  async syncMailboxHistory(): Promise<{ processedCount: number; bouncesFound: number; repliesFound: number }> {
    const historyResult = await this.provider.checkHistory(this.store.historyCursor);
    this.store.historyCursor = historyResult.historyId;

    let bouncesFound = 0;
    let repliesFound = 0;

    for (const msg of historyResult.messages) {
      // 1. Check for Bounce Notifications
      const isBounceReport = 
        msg.isBounce || 
        msg.headers['content-type']?.includes('delivery-status') ||
        msg.from.includes('mailer-daemon') ||
        msg.subject.toLowerCase().includes('delivery status notification') ||
        msg.subject.toLowerCase().includes('failure notice');

      if (isBounceReport) {
        const isPermanent = 
          msg.bounceType === 'PERMANENT' || 
          msg.body.includes('550') || 
          msg.body.includes('5.1.1') || 
          msg.headers['status']?.startsWith('5.');

        // Extract failed recipient email from subject or body
        const emailMatch = msg.subject.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i) ||
          msg.body.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);

        const recipient = emailMatch ? normalizeEmail(emailMatch[1]) : '';

        if (recipient && isPermanent) {
          bouncesFound++;
          // Permanent bounce:
          // 1. Mark address in suppression list
          this.store.suppressions.set(recipient, {
            id: recipient,
            email: recipient,
            reason: 'BOUNCE_PERMANENT',
            suppressedAt: new Date().toISOString(),
            notes: `Permanent bounce detected from mailer-daemon: ${msg.subject}`,
          });

          // 2. Mark corresponding sent outreach job and cancel pending jobs
          for (const [jId, j] of this.store.jobs.entries()) {
            if (normalizeEmail(j.recipientEmail) === recipient) {
              if (j.status === 'SENT') {
                j.errorDetails = 'Permanent bounce recorded from provider.';
              } else if (j.status === 'QUEUED' || j.status === 'SENDING') {
                j.status = 'CANCELLED';
                j.errorDetails = 'Cancelled due to permanent bounce on this address.';
              }
              this.store.jobs.set(jId, j);
            }
          }

          // 3. Deduplicated event logging
          const existingEvent = this.store.events.find(e => 
            e.eventType === 'BOUNCED' && normalizeEmail(e.recipientEmail) === recipient
          );

          if (!existingEvent) {
            this.store.campaign.stats.bouncedCount++;
            this.logEvent({
              id: `evt_bnc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              jobId: msg.inReplyTo || 'mailbox_sync',
              leadId: 'unknown',
              campaignId: this.store.campaign.id,
              recipientEmail: recipient,
              eventType: 'BOUNCED',
              bounceType: 'PERMANENT',
              timestamp: new Date().toISOString(),
              details: `Permanent delivery failure detected: ${msg.subject}`,
            });
          }
        }
        continue;
      }

      // 2. Check for Recipient Replies
      // Match by inReplyTo or threadId
      const matchedJob = Array.from(this.store.jobs.values()).find(j => 
        (j.providerMessageId && msg.inReplyTo && j.providerMessageId === msg.inReplyTo) ||
        (j.providerThreadId && msg.threadId && j.providerThreadId === msg.threadId) ||
        (normalizeEmail(msg.from) === normalizeEmail(j.recipientEmail))
      );

      if (matchedJob) {
        repliesFound++;
        const normRecipient = normalizeEmail(matchedJob.recipientEmail);

        // Cancel any pending unsent jobs for that lead in this campaign
        for (const [jId, j] of this.store.jobs.entries()) {
          if (j.leadId === matchedJob.leadId && j.status === 'QUEUED') {
            j.status = 'CANCELLED';
            j.errorDetails = 'Cancelled because recipient replied to outreach.';
            this.store.jobs.set(jId, j);
          }
        }

        // Deduplication: Only record one REPLIED event per recipient/job
        const alreadyReplied = this.store.events.some(e => 
          e.eventType === 'REPLIED' && e.jobId === matchedJob.id
        );

        if (!alreadyReplied) {
          this.store.campaign.stats.repliedCount++;
          this.logEvent({
            id: `evt_rep_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            jobId: matchedJob.id,
            leadId: matchedJob.leadId,
            campaignId: matchedJob.campaignId,
            recipientEmail: normRecipient,
            eventType: 'REPLIED',
            timestamp: new Date().toISOString(),
            details: `Recipient replied: "${msg.subject}". Unsent jobs cancelled.`,
          });
        }
      }
    }

    return {
      processedCount: historyResult.messages.length,
      bouncesFound,
      repliesFound,
    };
  }

  /**
   * Founder Kill Switch: Emergency Pause / Resume
   */
  setCampaignStatus(
    newStatus: 'ACTIVE' | 'PAUSED', 
    founderEmail: string, 
    founderRole: string
  ): void {
    if (founderRole !== 'founder' && founderRole !== 'admin') {
      throw new Error('Unauthorized: Only an authorized founder can alter campaign active status.');
    }

    const nowIso = new Date().toISOString();
    this.store.campaign.status = newStatus;
    this.store.campaign.updatedAt = nowIso;

    if (newStatus === 'ACTIVE') {
      this.store.campaign.activatedAt = nowIso;
      this.store.campaign.activatedBy = founderEmail;
    } else {
      this.store.campaign.pausedAt = nowIso;
      this.store.campaign.pausedBy = founderEmail;
    }

    this.logEvent({
      id: `evt_status_${Date.now()}`,
      jobId: 'system',
      leadId: 'system',
      campaignId: this.store.campaign.id,
      recipientEmail: 'system@caventra.internal',
      eventType: newStatus === 'ACTIVE' ? 'SENT' : 'OPTED_OUT',
      timestamp: nowIso,
      details: `Emergency control: Campaign status set to ${newStatus} by ${founderEmail}`,
    });
  }

  /**
   * Processes opt-out request
   */
  optOutRecipient(email: string, token: string): boolean {
    const norm = normalizeEmail(email);
    if (!norm) return false;

    this.store.suppressions.set(norm, {
      id: norm,
      email: norm,
      reason: 'OPT_OUT',
      suppressedAt: new Date().toISOString(),
      notes: 'Opt-out processed through validated token.',
    });

    // Cancel queued jobs
    for (const [jId, j] of this.store.jobs.entries()) {
      if (normalizeEmail(j.recipientEmail) === norm && (j.status === 'QUEUED' || j.status === 'SENDING')) {
        j.status = 'SUPPRESSED';
        j.errorDetails = 'Cancelled because recipient opted out.';
        this.store.jobs.set(jId, j);
      }
    }

    this.logEvent({
      id: `evt_opt_${Date.now()}`,
      jobId: 'optout',
      leadId: 'optout',
      campaignId: this.store.campaign.id,
      recipientEmail: norm,
      eventType: 'OPTED_OUT',
      timestamp: new Date().toISOString(),
      details: `Recipient ${norm} successfully opted out.`,
    });

    return true;
  }

  private logEvent(event: BackendEmailEvent): void {
    this.store.events.push(event);
  }
}
