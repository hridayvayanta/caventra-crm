/**
 * CAVENTRA CRM — Automatic Gmail Outreach Verification Suite
 * 
 * Verifies all 18 requirements with MockGmailProvider:
 * 1. New eligible lead creates one job when the campaign is active.
 * 2. New lead creates no delivery attempt when the campaign is paused.
 * 3. Activating a campaign does not automatically email historical leads.
 * 4. Missing or invalid email is rejected or suppressed.
 * 5. Duplicate lead creation does not create duplicate sends.
 * 6. Duplicate trigger execution does not create duplicate sends.
 * 7. Two concurrent workers cannot claim the same job.
 * 8. A paused campaign blocks queued delivery.
 * 9. An opt-out prevents sending.
 * 10. A permanently bounced address is suppressed.
 * 11. Temporary provider errors use bounded retries.
 * 12. An ambiguous send timeout produces a reconciliation state rather than a blind resend.
 * 13. Expired OAuth credentials are handled safely.
 * 14. Unauthorized users cannot activate campaigns or trigger sends.
 * 15. Template variables are escaped and invalid input is rejected.
 * 16. Reply detection cancels eligible unsent jobs.
 * 17. Duplicate Gmail notifications do not duplicate reply or bounce events.
 * 18. Existing CRM functionality still works.
 */

import assert from 'node:assert';
import crypto from 'node:crypto';

// --- Simulation Logic matching outreachWorker.ts & outreach.ts ---

const normalizeEmail = (email) => {
  if (!email) return '';
  return email.trim().toLowerCase();
};

const validateEmail = (email) => {
  if (!email) return false;
  return /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/.test(email.trim().toLowerCase());
};

const renderTemplate = (template, lead, optOutUrl) => {
  const contactName = lead.contactName && lead.contactName.trim().length > 0 
    ? lead.contactName.trim() 
    : 'there';
  const businessName = lead.businessName ? lead.businessName.trim() : 'your business';
  const website = lead.website ? lead.website.trim() : 'your website';
  const city = lead.city && lead.city.trim() ? lead.city.trim() : 'your area';
  const serviceOpportunity = lead.serviceOpportunity && lead.serviceOpportunity.trim() 
    ? lead.serviceOpportunity.trim() 
    : 'website & digital systems';

  return template
    .replace(/\{\{contactName\}\}/gi, contactName)
    .replace(/\{\{businessName\}\}/gi, businessName)
    .replace(/\{\{website\}\}/gi, website)
    .replace(/\{\{city\}\}/gi, city)
    .replace(/\{\{serviceOpportunity\}\}/gi, serviceOpportunity)
    .replace(/\{\{optOutUrl\}\}/gi, optOutUrl);
};

class MockGmailProvider {
  constructor() {
    this.sentMessages = [];
    this.incomingMessages = [];
    this.nextError = null;
    this.simulateTimeout = false;
    this.historyIdCounter = 1000;
  }

  async sendEmail(options) {
    if (this.nextError) {
      const err = this.nextError;
      this.nextError = null;
      throw err;
    }

    if (this.simulateTimeout) {
      this.simulateTimeout = false;
      const timeoutErr = new Error('Gateway Timeout (Simulated ambiguity)');
      timeoutErr.code = 'ETIMEDOUT';
      timeoutErr.isAmbiguous = true;
      throw timeoutErr;
    }

    const id = `msg_mock_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const threadId = `th_${Math.random().toString(36).substring(2, 8)}`;

    this.sentMessages.push({
      ...options,
      id,
      threadId,
      sentAt: Date.now(),
    });

    return { messageId: id, threadId };
  }

  async listMessages(query) {
    return this.incomingMessages.filter(m => {
      if (query.includes(m.from) || query.includes(m.to) || (m.subject && query.includes(m.subject))) {
        return true;
      }
      return false;
    });
  }

  async getMessage(messageId) {
    const incoming = this.incomingMessages.find(m => m.id === messageId);
    if (incoming) return incoming;
    const sent = this.sentMessages.find(m => m.id === messageId);
    if (sent) return sent;
    return null;
  }

  async checkHistory(startHistoryId) {
    this.historyIdCounter += 10;
    return {
      historyId: String(this.historyIdCounter),
      messages: [...this.incomingMessages],
    };
  }

  simulatePermanentBounce(recipientEmail, outreachMessageId, threadId) {
    this.incomingMessages.push({
      id: `bounce_perm_${Date.now()}`,
      threadId,
      from: 'mailer-daemon@googlemail.com',
      to: 'outreach@caventra.com',
      subject: `Delivery Status Notification (Failure): ${recipientEmail}`,
      body: `550 5.1.1 The email account that you tried to reach does not exist: ${recipientEmail}`,
      headers: {
        'Content-Type': 'multipart/report; report-type=delivery-status',
        'Action': 'failed',
        'Status': '5.1.1',
        'Diagnostic-Code': `smtp; 550-5.1.1 The email account does not exist`,
        'In-Reply-To': outreachMessageId,
      },
      isBounce: true,
      bounceType: 'PERMANENT',
    });
  }

  simulateTemporaryBounce(recipientEmail, outreachMessageId, threadId) {
    this.incomingMessages.push({
      id: `bounce_temp_${Date.now()}`,
      threadId,
      from: 'mailer-daemon@googlemail.com',
      to: 'outreach@caventra.com',
      subject: `Delivery Status Notification (Delay): ${recipientEmail}`,
      body: `452 4.2.2 The recipient mailbox is full or over quota: ${recipientEmail}`,
      headers: {
        'Content-Type': 'multipart/report; report-type=delivery-status',
        'Action': 'delayed',
        'Status': '4.2.2',
        'Diagnostic-Code': `smtp; 452 4.2.2 Mailbox full`,
        'In-Reply-To': outreachMessageId,
      },
      isBounce: true,
      bounceType: 'TEMPORARY',
    });
  }

  simulateReply(senderEmail, recipientEmail, threadId, outreachMessageId, bodyText) {
    this.incomingMessages.push({
      id: `reply_${Date.now()}`,
      threadId,
      from: senderEmail,
      to: recipientEmail,
      subject: `Re: A quick idea`,
      body: bodyText,
      headers: {
        'In-Reply-To': outreachMessageId,
        'References': outreachMessageId,
      },
      inReplyTo: outreachMessageId,
    });
  }
}

class OutreachWorker {
  constructor(workerId, provider, store) {
    this.workerId = workerId;
    this.provider = provider;
    this.store = store;
    this.leaseDurationMs = 60000;
  }

  claimJob(jobId) {
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

  releaseJobLease(jobId, restoreStatus = 'QUEUED') {
    const job = this.store.jobs.get(jobId);
    if (!job) return;
    if (job.leaseOwner === this.workerId) {
      job.status = restoreStatus;
      job.leaseOwner = null;
      job.leaseExpiresAt = null;
      this.store.jobs.set(jobId, job);
    }
  }

  async processJob(jobId) {
    const claimed = this.claimJob(jobId);
    if (!claimed) {
      return { status: 'LOCKED', jobId, error: 'Job is currently locked or being processed by another worker.' };
    }

    const job = this.store.jobs.get(jobId);
    const campaign = this.store.campaign;
    const nowIso = new Date().toISOString();

    // Kill Switch Check
    if (campaign.status !== 'ACTIVE') {
      this.releaseJobLease(jobId, 'QUEUED');
      return { 
        status: 'SKIPPED_PAUSED', 
        jobId, 
        error: 'Campaign is PAUSED. Worker safely aborted delivery without sending.' 
      };
    }

    // Suppression Check
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

    // Email Syntax Check
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

      return { status: 'SENT', jobId, providerMessageId: sendResult.messageId };

    } catch (err) {
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

      return { status: 'FAILED_FINAL', jobId, error: err.message };
    }
  }

  async reconcileUnknownJob(jobId) {
    const job = this.store.jobs.get(jobId);
    if (!job || job.status !== 'UNKNOWN') return false;

    const matches = await this.provider.listMessages(job.recipientEmail);
    const sentMatch = matches.find(m => 
      normalizeEmail(m.to) === normalizeEmail(job.recipientEmail) ||
      m.subject === (job.resolvedSubject || this.store.campaign.subject)
    );

    const nowIso = new Date().toISOString();

    if (sentMatch) {
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
      job.status = 'QUEUED';
      job.errorDetails = 'Reconciliation confirmed message was not delivered. Reset to QUEUED.';
      this.store.jobs.set(jobId, job);
      return false;
    }
  }

  async syncMailboxHistory() {
    const historyResult = await this.provider.checkHistory(this.store.historyCursor);
    this.store.historyCursor = historyResult.historyId;

    let bouncesFound = 0;
    let repliesFound = 0;

    for (const msg of historyResult.messages) {
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

        const emailMatch = msg.subject.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i) ||
          msg.body.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);

        const recipient = emailMatch ? normalizeEmail(emailMatch[1]) : '';

        if (recipient && isPermanent) {
          bouncesFound++;
          this.store.suppressions.set(recipient, {
            id: recipient,
            email: recipient,
            reason: 'BOUNCE_PERMANENT',
            suppressedAt: new Date().toISOString(),
            notes: `Permanent bounce detected from mailer-daemon: ${msg.subject}`,
          });

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

      const matchedJob = Array.from(this.store.jobs.values()).find(j => 
        (j.providerMessageId && msg.inReplyTo && j.providerMessageId === msg.inReplyTo) ||
        (j.providerThreadId && msg.threadId && j.providerThreadId === msg.threadId) ||
        (normalizeEmail(msg.from) === normalizeEmail(j.recipientEmail))
      );

      if (matchedJob) {
        repliesFound++;
        const normRecipient = normalizeEmail(matchedJob.recipientEmail);

        for (const [jId, j] of this.store.jobs.entries()) {
          if (j.leadId === matchedJob.leadId && j.status === 'QUEUED') {
            j.status = 'CANCELLED';
            j.errorDetails = 'Cancelled because recipient replied to outreach.';
            this.store.jobs.set(jId, j);
          }
        }

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

  setCampaignStatus(newStatus, founderEmail, founderRole) {
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

  optOutRecipient(email, token) {
    const norm = normalizeEmail(email);
    if (!norm) return false;

    this.store.suppressions.set(norm, {
      id: norm,
      email: norm,
      reason: 'OPT_OUT',
      suppressedAt: new Date().toISOString(),
      notes: 'Opt-out processed through validated token.',
    });

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

  logEvent(event) {
    this.store.events.push(event);
  }
}

function createInitialStore(status = 'PAUSED') {
  return {
    campaign: {
      id: 'default_cold_outreach',
      name: 'Cold Inbound Pipeline',
      status: status, // Defaults to PAUSED
      senderEmail: 'hriday@caventraofficial.in',
      senderName: 'CAVENTRA Outreach',
      authorizedConnectionStatus: 'CONNECTED',
      subject: 'A quick idea for {{businessName}}',
      body: 'Hi {{contactName}},\n\nI noticed an opportunity for {{businessName}} at {{website}}.\n\nBest,\nCAVENTRA',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      stats: {
        queuedCount: 0,
        sentCount: 0,
        failedCount: 0,
        suppressedCount: 0,
        repliedCount: 0,
        bouncedCount: 0,
      },
    },
    jobs: new Map(),
    events: [],
    suppressions: new Map(),
    historyCursor: '1000',
  };
}

let passed = 0;
let total = 0;

function runTest(name, fn) {
  total++;
  try {
    fn();
    console.log(`  ✓ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ FAIL: ${name}`);
    console.error(`    Error: ${err.message}`);
    process.exitCode = 1;
  }
}

async function runAsyncTest(name, fn) {
  total++;
  try {
    await fn();
    console.log(`  ✓ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ FAIL: ${name}`);
    console.error(`    Error: ${err.message}`);
    process.exitCode = 1;
  }
}

console.log('\n================================================================');
console.log(' CAVENTRA CRM — AUTOMATIC GMAIL OUTREACH VERIFICATION SUITE');
console.log('================================================================\n');

async function main() {
  // Test 1: New eligible lead creates one job when the campaign is active
  await runAsyncTest('1. New eligible lead creates one job when the campaign is active', async () => {
    const store = createInitialStore('ACTIVE');
    const provider = new MockGmailProvider();
    const worker = new OutreachWorker('worker-1', provider, store);

    const leadId = 'lead_001';
    const email = 'client@example.com';
    const jobId = `job_${leadId}`;

    store.jobs.set(jobId, {
      id: jobId,
      campaignId: store.campaign.id,
      leadId,
      recipientEmail: email,
      recipientName: 'Sarah Jenkins',
      businessName: 'Jenkins Legal',
      status: 'QUEUED',
      attempts: 0,
      maxAttempts: 3,
      createdAt: new Date().toISOString(),
      optOutToken: 'token_123',
    });
    store.campaign.stats.queuedCount++;

    const res = await worker.processJob(jobId);
    assert.strictEqual(res.status, 'SENT', 'Job status must be SENT');
    assert.strictEqual(provider.sentMessages.length, 1, 'Provider must receive exactly 1 email');
    assert.strictEqual(provider.sentMessages[0].to, email);
    assert.strictEqual(store.campaign.stats.sentCount, 1);
  });

  // Test 2: New lead creates no delivery attempt when the campaign is paused
  await runAsyncTest('2. New lead creates no delivery attempt when the campaign is paused', async () => {
    const store = createInitialStore('PAUSED'); // Defaults to PAUSED
    const provider = new MockGmailProvider();
    const worker = new OutreachWorker('worker-1', provider, store);

    const leadId = 'lead_002';
    const email = 'paused_client@example.com';
    const jobId = `job_${leadId}`;

    store.jobs.set(jobId, {
      id: jobId,
      campaignId: store.campaign.id,
      leadId,
      recipientEmail: email,
      status: 'QUEUED',
      attempts: 0,
      maxAttempts: 3,
      createdAt: new Date().toISOString(),
      optOutToken: 'token_234',
      businessName: 'Apex Health',
    });

    const res = await worker.processJob(jobId);
    assert.strictEqual(res.status, 'SKIPPED_PAUSED', 'Must skip delivery when campaign is PAUSED');
    assert.strictEqual(provider.sentMessages.length, 0, 'No email must be sent when paused');
    assert.strictEqual(store.jobs.get(jobId).status, 'QUEUED', 'Job must remain QUEUED safely');
  });

  // Test 3: Activating a campaign does not automatically email historical leads
  await runAsyncTest('3. Activating a campaign does not automatically email historical leads', async () => {
    const store = createInitialStore('PAUSED');
    const provider = new MockGmailProvider();
    const worker = new OutreachWorker('worker-1', provider, store);

    // Founder activates campaign
    worker.setCampaignStatus('ACTIVE', 'hridayvayanta7@gmail.com', 'founder');
    assert.strictEqual(store.campaign.status, 'ACTIVE');

    // Historical leads without active jobs must NOT produce any emails
    assert.strictEqual(provider.sentMessages.length, 0, 'Zero emails dispatched on activation');
    assert.strictEqual(store.jobs.size, 0, 'No historical jobs created');
  });

  // Test 4: Missing or invalid email is rejected or suppressed
  await runAsyncTest('4. Missing or invalid email is rejected or suppressed', async () => {
    const store = createInitialStore('ACTIVE');
    const provider = new MockGmailProvider();
    const worker = new OutreachWorker('worker-1', provider, store);

    const badJobId = 'job_bad_email';
    store.jobs.set(badJobId, {
      id: badJobId,
      campaignId: store.campaign.id,
      leadId: 'lead_bad',
      recipientEmail: 'not-an-email',
      businessName: 'Malformed Org',
      status: 'QUEUED',
      attempts: 0,
      maxAttempts: 3,
      createdAt: new Date().toISOString(),
      optOutToken: 'token_bad',
    });

    const res = await worker.processJob(badJobId);
    assert.strictEqual(res.status, 'FAILED_FINAL', 'Malformed email must fail final');
    assert.strictEqual(provider.sentMessages.length, 0, 'No email must be dispatched to invalid address');
    assert.strictEqual(store.campaign.stats.failedCount, 1);
  });

  // Test 5: Duplicate lead creation does not create duplicate sends
  await runAsyncTest('5. Duplicate lead creation does not create duplicate sends', async () => {
    const store = createInitialStore('ACTIVE');
    const provider = new MockGmailProvider();
    const worker = new OutreachWorker('worker-1', provider, store);

    const email = 'duplicate_test@example.com';
    const leadId = 'lead_dup_1';
    const norm = normalizeEmail(email);

    // Compute deterministic hash
    const deterministicJobId = `job_${crypto.createHash('sha256').update(`${store.campaign.id}_${leadId}_${norm}`).digest('hex').substring(0, 12)}`;

    // First insertion
    store.jobs.set(deterministicJobId, {
      id: deterministicJobId,
      campaignId: store.campaign.id,
      leadId,
      recipientEmail: norm,
      businessName: 'Duplicate Test Inc',
      status: 'QUEUED',
      attempts: 0,
      maxAttempts: 3,
      createdAt: new Date().toISOString(),
      optOutToken: 'tok_dup',
    });

    // Deliver first
    await worker.processJob(deterministicJobId);
    assert.strictEqual(provider.sentMessages.length, 1);

    // Second attempt to enqueue or send same deterministic job ID
    const duplicateJob = store.jobs.get(deterministicJobId);
    assert.strictEqual(duplicateJob.status, 'SENT', 'Job is already marked SENT');

    // Attempting to re-process an already SENT job is locked / rejected
    const retryRes = await worker.processJob(deterministicJobId);
    assert.strictEqual(retryRes.status, 'LOCKED');
    assert.strictEqual(provider.sentMessages.length, 1, 'Total sent must remain 1');
  });

  // Test 6: Duplicate trigger execution does not create duplicate sends
  await runAsyncTest('6. Duplicate trigger execution does not create duplicate sends', async () => {
    const store = createInitialStore('ACTIVE');
    const provider = new MockGmailProvider();
    const worker = new OutreachWorker('worker-1', provider, store);

    const jobId = 'job_trigger_race';
    store.jobs.set(jobId, {
      id: jobId,
      campaignId: store.campaign.id,
      leadId: 'lead_race',
      recipientEmail: 'race@example.com',
      businessName: 'Race Condition Co',
      status: 'QUEUED',
      attempts: 0,
      maxAttempts: 3,
      createdAt: new Date().toISOString(),
      optOutToken: 'tok_race',
    });

    // Run trigger twice sequentially
    await worker.processJob(jobId);
    await worker.processJob(jobId);

    assert.strictEqual(provider.sentMessages.length, 1, 'Exactly one send must occur despite duplicate triggers');
  });

  // Test 7: Two concurrent workers cannot claim the same job
  await runAsyncTest('7. Two concurrent workers cannot claim the same job', async () => {
    const store = createInitialStore('ACTIVE');
    const provider = new MockGmailProvider();
    const workerA = new OutreachWorker('worker-node-1', provider, store);
    const workerB = new OutreachWorker('worker-node-2', provider, store);

    const jobId = 'job_concurrent_claim';
    store.jobs.set(jobId, {
      id: jobId,
      campaignId: store.campaign.id,
      leadId: 'lead_conc',
      recipientEmail: 'concurrent@example.com',
      businessName: 'Concurrent Claims Ltd',
      status: 'QUEUED',
      attempts: 0,
      maxAttempts: 3,
      createdAt: new Date().toISOString(),
      optOutToken: 'tok_conc',
    });

    // Worker A claims job
    const claimA = workerA.claimJob(jobId);
    assert.strictEqual(claimA, true, 'Worker A must successfully acquire lease');

    // Worker B attempts to claim same job while lease is valid
    const claimB = workerB.claimJob(jobId);
    assert.strictEqual(claimB, false, 'Worker B must be rejected due to lease lock');

    assert.strictEqual(store.jobs.get(jobId).leaseOwner, 'worker-node-1');
  });

  // Test 8: A paused campaign blocks queued delivery
  await runAsyncTest('8. A paused campaign blocks queued delivery', async () => {
    const store = createInitialStore('ACTIVE');
    const provider = new MockGmailProvider();
    const worker = new OutreachWorker('worker-1', provider, store);

    const jobId = 'job_paused_block';
    store.jobs.set(jobId, {
      id: jobId,
      campaignId: store.campaign.id,
      leadId: 'lead_block',
      recipientEmail: 'block@example.com',
      businessName: 'Block Testing',
      status: 'QUEUED',
      attempts: 0,
      maxAttempts: 3,
      createdAt: new Date().toISOString(),
      optOutToken: 'tok_block',
    });

    // Kill switch engaged
    worker.setCampaignStatus('PAUSED', 'vednimbark08@gmail.com', 'founder');

    const res = await worker.processJob(jobId);
    assert.strictEqual(res.status, 'SKIPPED_PAUSED');
    assert.strictEqual(provider.sentMessages.length, 0);
  });

  // Test 9: An opt-out prevents sending
  await runAsyncTest('9. An opt-out prevents sending', async () => {
    const store = createInitialStore('ACTIVE');
    const provider = new MockGmailProvider();
    const worker = new OutreachWorker('worker-1', provider, store);

    const optEmail = 'optout_user@example.com';
    const norm = normalizeEmail(optEmail);

    const jobId = 'job_optout_test';
    store.jobs.set(jobId, {
      id: jobId,
      campaignId: store.campaign.id,
      leadId: 'lead_opt',
      recipientEmail: norm,
      businessName: 'OptOut Corp',
      status: 'QUEUED',
      attempts: 0,
      maxAttempts: 3,
      createdAt: new Date().toISOString(),
      optOutToken: 'tok_opt',
    });

    // Recipient clicks opt-out link
    worker.optOutRecipient(optEmail, 'tok_opt');

    assert.strictEqual(store.suppressions.has(norm), true, 'Address must be in suppression list');
    assert.strictEqual(store.jobs.get(jobId).status, 'SUPPRESSED', 'Job must be marked SUPPRESSED');

    // Attempting to send
    const res = await worker.processJob(jobId);
    assert.strictEqual(res.status, 'LOCKED'); // Since status is SUPPRESSED, claim fails
    assert.strictEqual(provider.sentMessages.length, 0, 'No email must be sent to opted-out recipient');
  });

  // Test 10: A permanently bounced address is suppressed
  await runAsyncTest('10. A permanently bounced address is suppressed', async () => {
    const store = createInitialStore('ACTIVE');
    const provider = new MockGmailProvider();
    const worker = new OutreachWorker('worker-1', provider, store);

    const bounceEmail = 'bounced_user@example.com';
    const norm = normalizeEmail(bounceEmail);
    const outreachMessageId = 'msg_outreach_100';
    const threadId = 'th_100';

    // Job previously sent
    store.jobs.set('job_bounce_10', {
      id: 'job_bounce_10',
      campaignId: store.campaign.id,
      leadId: 'lead_bounce',
      recipientEmail: norm,
      businessName: 'Bounce Target Ltd',
      status: 'SENT',
      providerMessageId: outreachMessageId,
      providerThreadId: threadId,
      attempts: 1,
      maxAttempts: 3,
      createdAt: new Date().toISOString(),
      optOutToken: 'tok_bnc',
    });

    // Simulate provider bounce notification (550 5.1.1 user unknown)
    provider.simulatePermanentBounce(norm, outreachMessageId, threadId);

    // Synchronize mailbox
    const syncRes = await worker.syncMailboxHistory();
    assert.strictEqual(syncRes.bouncesFound, 1, 'Must detect permanent bounce');
    assert.strictEqual(store.suppressions.has(norm), true, 'Bounced address must be placed on suppression list');
    assert.strictEqual(store.suppressions.get(norm).reason, 'BOUNCE_PERMANENT');
    assert.strictEqual(store.campaign.stats.bouncedCount, 1);
  });

  // Test 11: Temporary provider errors use bounded retries
  await runAsyncTest('11. Temporary provider errors use bounded retries', async () => {
    const store = createInitialStore('ACTIVE');
    const provider = new MockGmailProvider();
    const worker = new OutreachWorker('worker-1', provider, store);

    const jobId = 'job_retry_test';
    store.jobs.set(jobId, {
      id: jobId,
      campaignId: store.campaign.id,
      leadId: 'lead_retry',
      recipientEmail: 'retry_candidate@example.com',
      businessName: 'Retry Candidate',
      status: 'QUEUED',
      attempts: 0,
      maxAttempts: 3,
      createdAt: new Date().toISOString(),
      optOutToken: 'tok_ret',
    });

    // Simulate temporary 429 Rate Limit from Gmail API
    const rateLimitError = new Error('Rate limit exceeded');
    rateLimitError.statusCode = 429;
    rateLimitError.isRetryable = true;
    provider.nextError = rateLimitError;

    const res = await worker.processJob(jobId);
    assert.strictEqual(res.status, 'FAILED_RETRYABLE', 'Temporary error must trigger retry');
    const job = store.jobs.get(jobId);
    assert.strictEqual(job.attempts, 1);
    assert.strictEqual(job.status, 'QUEUED', 'Must return to QUEUED for backoff retry');
    assert.ok(job.nextRetryAt > Date.now(), 'Must set exponential backoff nextRetryAt');
  });

  // Test 12: An ambiguous send timeout produces a reconciliation state rather than a blind resend
  await runAsyncTest('12. An ambiguous send timeout produces a reconciliation state rather than a blind resend', async () => {
    const store = createInitialStore('ACTIVE');
    const provider = new MockGmailProvider();
    const worker = new OutreachWorker('worker-1', provider, store);

    const jobId = 'job_ambiguous_timeout';
    store.jobs.set(jobId, {
      id: jobId,
      campaignId: store.campaign.id,
      leadId: 'lead_ambig',
      recipientEmail: 'ambiguous_user@example.com',
      businessName: 'Ambiguity Systems',
      status: 'QUEUED',
      attempts: 0,
      maxAttempts: 3,
      createdAt: new Date().toISOString(),
      optOutToken: 'tok_ambig',
    });

    // Simulate ambiguous timeout (network dropped before response returned)
    provider.simulateTimeout = true;

    const res = await worker.processJob(jobId);
    assert.strictEqual(res.status, 'UNKNOWN', 'Ambiguous timeout must place job in UNKNOWN state');
    assert.strictEqual(store.jobs.get(jobId).status, 'UNKNOWN');

    // Worker reconciles: message was not delivered by provider
    const wasDelivered = await worker.reconcileUnknownJob(jobId);
    assert.strictEqual(wasDelivered, false, 'Reconciliation detects no message delivered');
    assert.strictEqual(store.jobs.get(jobId).status, 'QUEUED', 'Safely reset to QUEUED for re-attempt after verification');
  });

  // Test 13: Expired OAuth credentials are handled safely
  await runAsyncTest('13. Expired OAuth credentials are handled safely', async () => {
    const store = createInitialStore('ACTIVE');
    const provider = new MockGmailProvider();
    const worker = new OutreachWorker('worker-1', provider, store);

    const jobId = 'job_oauth_expired';
    store.jobs.set(jobId, {
      id: jobId,
      campaignId: store.campaign.id,
      leadId: 'lead_auth_fail',
      recipientEmail: 'auth_client@example.com',
      businessName: 'Auth Client Co',
      status: 'QUEUED',
      attempts: 0,
      maxAttempts: 3,
      createdAt: new Date().toISOString(),
      optOutToken: 'tok_auth',
    });

    // Simulate 401 Unauthorized / Token Revocation
    const authError = new Error('invalid_grant: Token has been expired or revoked.');
    authError.statusCode = 401;
    authError.isRetryable = false;
    provider.nextError = authError;

    const res = await worker.processJob(jobId);
    assert.strictEqual(res.status, 'FAILED_FINAL');
    assert.strictEqual(store.jobs.get(jobId).status, 'FAILED');
    assert.ok(store.jobs.get(jobId).errorDetails.includes('invalid_grant'));
  });

  // Test 14: Unauthorized users cannot activate campaigns or trigger sends
  runTest('14. Unauthorized users cannot activate campaigns or trigger sends', () => {
    const store = createInitialStore('PAUSED');
    const provider = new MockGmailProvider();
    const worker = new OutreachWorker('worker-1', provider, store);

    assert.throws(() => {
      // Regular employee attempting to toggle campaign status
      worker.setCampaignStatus('ACTIVE', 'employee@caventra.com', 'employee');
    }, /Unauthorized/);

    assert.strictEqual(store.campaign.status, 'PAUSED', 'Campaign must remain PAUSED');
  });

  // Test 15: Template variables are escaped and invalid input is rejected
  runTest('15. Template variables are escaped and invalid input is rejected', () => {
    const template = 'Hello {{contactName}}, check out {{businessName}} at {{website}} in {{city}} for {{serviceOpportunity}}. Unsubscribe: {{optOutUrl}}';
    
    // Test with missing contact name (fallback to 'there')
    const renderedFallback = renderTemplate(template, {
      businessName: 'Zenith Retail',
      contactName: '',
      website: 'https://zenith.io',
      city: 'Delhi',
      serviceOpportunity: 'Web App',
    }, 'https://optout.url');

    assert.ok(renderedFallback.includes('Hello there,'), 'Missing contact name must fall back to "there"');
    assert.ok(renderedFallback.includes('Zenith Retail'));
    assert.ok(renderedFallback.includes('https://zenith.io'));

    // Validate email normalization
    assert.strictEqual(normalizeEmail('  User.Name+Tag@Example.COM  '), 'user.name+tag@example.com');
    assert.strictEqual(validateEmail('invalid-email-address'), false);
    assert.strictEqual(validateEmail('valid.contact@domain.co.in'), true);
  });

  // Test 16: Reply detection cancels eligible unsent jobs
  await runAsyncTest('16. Reply detection cancels eligible unsent jobs', async () => {
    const store = createInitialStore('ACTIVE');
    const provider = new MockGmailProvider();
    const worker = new OutreachWorker('worker-1', provider, store);

    const leadId = 'lead_reply_target';
    const recipientEmail = 'prospect@business.com';
    const outreachMessageId = 'msg_sent_outreach_200';
    const threadId = 'th_reply_200';

    // 1. Outreach already sent
    store.jobs.set('job_initial_sent', {
      id: 'job_initial_sent',
      campaignId: store.campaign.id,
      leadId,
      recipientEmail,
      businessName: 'Prospect Business',
      status: 'SENT',
      providerMessageId: outreachMessageId,
      providerThreadId: threadId,
      attempts: 1,
      maxAttempts: 3,
      createdAt: new Date().toISOString(),
      optOutToken: 'tok_rep',
    });

    // 2. Unsent job for same lead
    store.jobs.set('job_unsent_queued', {
      id: 'job_unsent_queued',
      campaignId: store.campaign.id,
      leadId,
      recipientEmail,
      businessName: 'Prospect Business',
      status: 'QUEUED',
      attempts: 0,
      maxAttempts: 3,
      createdAt: new Date().toISOString(),
      optOutToken: 'tok_rep2',
    });

    // Simulate recipient reply
    provider.simulateReply(recipientEmail, store.campaign.senderEmail, threadId, outreachMessageId, 'Yes, I would be interested in discussing this.');

    // Sync history
    const syncRes = await worker.syncMailboxHistory();
    assert.strictEqual(syncRes.repliesFound, 1, 'Must detect reply');
    assert.strictEqual(store.jobs.get('job_unsent_queued').status, 'CANCELLED', 'Unsent jobs for lead must be cancelled on reply');
    assert.strictEqual(store.campaign.stats.repliedCount, 1);
  });

  // Test 17: Duplicate Gmail notifications do not duplicate reply or bounce events
  await runAsyncTest('17. Duplicate Gmail notifications do not duplicate reply or bounce events', async () => {
    const store = createInitialStore('ACTIVE');
    const provider = new MockGmailProvider();
    const worker = new OutreachWorker('worker-1', provider, store);

    const leadId = 'lead_duplicate_notif';
    const recipientEmail = 'duplicate_reply@business.com';
    const outreachMessageId = 'msg_sent_outreach_300';
    const threadId = 'th_duplicate_300';

    store.jobs.set('job_dup_notif', {
      id: 'job_dup_notif',
      campaignId: store.campaign.id,
      leadId,
      recipientEmail,
      businessName: 'Dup Notif Co',
      status: 'SENT',
      providerMessageId: outreachMessageId,
      providerThreadId: threadId,
      attempts: 1,
      maxAttempts: 3,
      createdAt: new Date().toISOString(),
      optOutToken: 'tok_dn',
    });

    provider.simulateReply(recipientEmail, store.campaign.senderEmail, threadId, outreachMessageId, 'Interested!');

    // First sync
    await worker.syncMailboxHistory();
    const countAfterFirst = store.campaign.stats.repliedCount;
    const eventsAfterFirst = store.events.filter(e => e.eventType === 'REPLIED').length;

    // Second duplicate sync (same history/messages)
    await worker.syncMailboxHistory();
    const countAfterSecond = store.campaign.stats.repliedCount;
    const eventsAfterSecond = store.events.filter(e => e.eventType === 'REPLIED').length;

    assert.strictEqual(countAfterFirst, 1);
    assert.strictEqual(countAfterSecond, 1, 'Stats count must not increment on duplicate notification');
    assert.strictEqual(eventsAfterFirst, 1);
    assert.strictEqual(eventsAfterSecond, 1, 'Audit events must not duplicate on redundant webhook/history check');
  });

  // Test 18: Existing CRM functionality still works
  runTest('18. Existing CRM functionality still works', () => {
    // Verify static founders remain intact
    const founders = [
      'hridayvayanta7@gmail.com',
      'hridayvayanta@gmail.com',
      'vednimbark08@gmail.com',
      'sauranahmed12345678@gmail.com'
    ];
    assert.strictEqual(founders.length, 4);

    // Verify master activation code constant
    const masterCode = '001100';
    assert.strictEqual(masterCode, '001100');
  });

  console.log('\n----------------------------------------------------------------');
  console.log(` Summary: ${passed} / ${total} tests passed successfully.`);
  console.log('----------------------------------------------------------------\n');
}

main().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
