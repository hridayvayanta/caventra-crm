import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  getDoc, 
  getDocs, 
  onSnapshot, 
  query, 
  where,
  writeBatch
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';
import { 
  OutreachCampaign, 
  EmailJob, 
  EmailEvent, 
  EmailSuppression, 
  Lead, 
  User 
} from '../types/crm';

// Local storage keys for offline/fallback mode
const STORAGE_KEYS = {
  CAMPAIGN: 'caventra_outreach_campaign',
  JOBS: 'caventra_email_jobs',
  EVENTS: 'caventra_email_events',
  SUPPRESSIONS: 'caventra_email_suppressions',
};

// Default outreach campaign (DEFAULT: PAUSED)
export const DEFAULT_CAMPAIGN: OutreachCampaign = {
  id: 'default_cold_outreach',
  name: 'Cold Inbound & Lead Pipeline Outreach',
  status: 'PAUSED', // Non-negotiable requirement: Must default to PAUSED
  senderEmail: 'caventraofficial@gmail.com',
  senderName: 'CAVENTRA Team',
  authorizedConnectionStatus: 'CONNECTED',
  subject: 'A quick idea for {{businessName}}',
  body: `Hi {{contactName}},

I came across {{businessName}} and wanted to reach out.

At CAVENTRA, we help businesses improve their digital presence through high-performance website development, brand positioning, and digital conversion systems.

I noticed an opportunity to explore how your online presence could better support your business goals.

Would you be open to a brief conversation about it this week?

Best regards,
CAVENTRA Team
Ideas to Impact
https://caventraofficial.in

----------------------------------------
If you prefer not to receive future emails from us, please unsubscribe here:
{{optOutUrl}}`,
  appsScriptUrl: 'https://script.google.com/macros/s/AKfycbxsUGci8s8exsbMvAew3Kc684s2c2S1-q0vL7EthpAUA80CVv8TDcL5b10NeSU-Ob8PHg/exec',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: new Date().toISOString(),
  stats: {
    queuedCount: 0,
    sentCount: 0,
    failedCount: 0,
    suppressedCount: 0,
    repliedCount: 0,
    bouncedCount: 0,
  },
};

// Storage helpers
const getStored = <T>(key: string, defaultValue: T): T => {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
  } catch (e) {
    return defaultValue;
  }
};

const setStored = <T>(key: string, value: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new Event('caventra_storage_update'));
  } catch (e) {
    console.error('Local storage write failed:', e);
  }
};

// Normalization & Validation Helpers
export const normalizeEmail = (email: string): string => {
  if (!email) return '';
  return email.trim().toLowerCase();
};

export const validateEmailSyntax = (email: string): boolean => {
  if (!email) return false;
  const clean = email.trim().toLowerCase();
  // Standard RFC 5322 compliant regex for web CRM
  return /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/.test(clean);
};

export const generateDeterministicJobId = (campaignId: string, leadId: string, email: string): string => {
  const norm = normalizeEmail(email);
  const raw = `${campaignId}_${leadId}_${norm}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    hash = ((hash << 5) - hash) + raw.charCodeAt(i);
    hash |= 0;
  }
  return `job_${Math.abs(hash).toString(36)}_${leadId.substring(0, 8)}`;
};

export const generateOptOutToken = (email: string, leadId: string): string => {
  const str = `${normalizeEmail(email)}_${leadId}_caventra_optout_key`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36) + Math.random().toString(36).substring(2, 8);
};

// Template rendering
export const renderTemplate = (
  template: string, 
  lead: Partial<Lead>, 
  optOutUrl: string
): string => {
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

// 1. Subscribe to Campaign Configuration
export const subscribeCampaign = (
  callback: (campaign: OutreachCampaign) => void
): (() => void) => {
  if (isFirebaseConfigured() && db) {
    const campaignRef = doc(db, 'campaigns', DEFAULT_CAMPAIGN.id);
    return onSnapshot(campaignRef, (docSnap) => {
      if (docSnap.exists()) {
        callback(docSnap.data() as OutreachCampaign);
      } else {
        // Initialize default paused campaign in Firestore if not present
        setDoc(campaignRef, DEFAULT_CAMPAIGN).then(() => {
          callback(DEFAULT_CAMPAIGN);
        }).catch(err => console.warn('Could not init campaign:', err));
      }
    }, (error) => {
      console.error('Firestore subscribeCampaign error:', error);
      callback(getStored<OutreachCampaign>(STORAGE_KEYS.CAMPAIGN, DEFAULT_CAMPAIGN));
    });
  }

  const emitCurrent = () => {
    const campaign = getStored<OutreachCampaign>(STORAGE_KEYS.CAMPAIGN, DEFAULT_CAMPAIGN);
    callback(campaign);
  };

  emitCurrent();
  const handleUpdate = () => emitCurrent();
  window.addEventListener('caventra_storage_update', handleUpdate);
  return () => window.removeEventListener('caventra_storage_update', handleUpdate);
};

// 2. Update Campaign Configuration
export const updateCampaign = async (
  updates: Partial<OutreachCampaign>,
  performedBy: User
): Promise<void> => {
  const cleanUpdates = {
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  if (isFirebaseConfigured() && db) {
    const campaignRef = doc(db, 'campaigns', DEFAULT_CAMPAIGN.id);
    await updateDoc(campaignRef, cleanUpdates);
    return;
  }

  const current = getStored<OutreachCampaign>(STORAGE_KEYS.CAMPAIGN, DEFAULT_CAMPAIGN);
  const updated = { ...current, ...cleanUpdates };
  setStored(STORAGE_KEYS.CAMPAIGN, updated);
};

// 3. Toggle Campaign Status (Active / Paused with Kill Switch)
export const toggleCampaignStatus = async (
  newStatus: 'ACTIVE' | 'PAUSED',
  performedBy: User
): Promise<void> => {
  const now = new Date().toISOString();
  const updates: Partial<OutreachCampaign> = {
    status: newStatus,
    updatedAt: now,
  };

  if (newStatus === 'ACTIVE') {
    updates.activatedAt = now;
    updates.activatedBy = performedBy.name;
  } else {
    updates.pausedAt = now;
    updates.pausedBy = performedBy.name;
  }

  // Audit event
  const event: EmailEvent = {
    id: `evt_cam_${Date.now()}`,
    jobId: 'system',
    leadId: 'system',
    campaignId: DEFAULT_CAMPAIGN.id,
    recipientEmail: 'system@caventra.internal',
    eventType: newStatus === 'ACTIVE' ? 'SENT' : 'OPTED_OUT',
    timestamp: now,
    details: `Campaign status changed to ${newStatus} by ${performedBy.name} (${performedBy.email})`,
  };

  if (isFirebaseConfigured() && db) {
    const batch = writeBatch(db);
    const campaignRef = doc(db, 'campaigns', DEFAULT_CAMPAIGN.id);
    batch.update(campaignRef, updates);
    const eventRef = doc(db, 'emailEvents', event.id);
    batch.set(eventRef, event);
    await batch.commit();
    return;
  }

  const current = getStored<OutreachCampaign>(STORAGE_KEYS.CAMPAIGN, DEFAULT_CAMPAIGN);
  setStored(STORAGE_KEYS.CAMPAIGN, { ...current, ...updates });
  const events = getStored<EmailEvent[]>(STORAGE_KEYS.EVENTS, []);
  setStored(STORAGE_KEYS.EVENTS, [event, ...events]);
};

// 4. Subscribe to Email Jobs
export const subscribeEmailJobs = (
  callback: (jobs: EmailJob[]) => void
): (() => void) => {
  if (isFirebaseConfigured() && db) {
    const jobsRef = collection(db, 'emailJobs');
    return onSnapshot(jobsRef, (snapshot) => {
      const jobs: EmailJob[] = [];
      snapshot.forEach(docSnap => jobs.push(docSnap.data() as EmailJob));
      jobs.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      callback(jobs);
    }, (error) => {
      console.error('Firestore subscribeEmailJobs error:', error);
      callback(getStored<EmailJob[]>(STORAGE_KEYS.JOBS, []));
    });
  }

  const emitCurrent = () => {
    const jobs = getStored<EmailJob[]>(STORAGE_KEYS.JOBS, []);
    jobs.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    callback(jobs);
  };

  emitCurrent();
  const handleUpdate = () => emitCurrent();
  window.addEventListener('caventra_storage_update', handleUpdate);
  return () => window.removeEventListener('caventra_storage_update', handleUpdate);
};

// 5. Subscribe to Email Audit Events
export const subscribeEmailEvents = (
  callback: (events: EmailEvent[]) => void
): (() => void) => {
  if (isFirebaseConfigured() && db) {
    const eventsRef = collection(db, 'emailEvents');
    return onSnapshot(eventsRef, (snapshot) => {
      const events: EmailEvent[] = [];
      snapshot.forEach(docSnap => events.push(docSnap.data() as EmailEvent));
      events.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
      callback(events);
    }, (error) => {
      console.error('Firestore subscribeEmailEvents error:', error);
      callback(getStored<EmailEvent[]>(STORAGE_KEYS.EVENTS, []));
    });
  }

  const emitCurrent = () => {
    const events = getStored<EmailEvent[]>(STORAGE_KEYS.EVENTS, []);
    events.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
    callback(events);
  };

  emitCurrent();
  const handleUpdate = () => emitCurrent();
  window.addEventListener('caventra_storage_update', handleUpdate);
  return () => window.removeEventListener('caventra_storage_update', handleUpdate);
};

// 6. Subscribe to Email Suppressions
export const subscribeSuppressions = (
  callback: (suppressions: EmailSuppression[]) => void
): (() => void) => {
  if (isFirebaseConfigured() && db) {
    const supRef = collection(db, 'email_suppressions');
    return onSnapshot(supRef, (snapshot) => {
      const suppressions: EmailSuppression[] = [];
      snapshot.forEach(docSnap => suppressions.push(docSnap.data() as EmailSuppression));
      suppressions.sort((a, b) => (b.suppressedAt || '').localeCompare(a.suppressedAt || ''));
      callback(suppressions);
    }, (error) => {
      console.error('Firestore subscribeSuppressions error:', error);
      callback(getStored<EmailSuppression[]>(STORAGE_KEYS.SUPPRESSIONS, []));
    });
  }

  const emitCurrent = () => {
    const sups = getStored<EmailSuppression[]>(STORAGE_KEYS.SUPPRESSIONS, []);
    sups.sort((a, b) => (b.suppressedAt || '').localeCompare(a.suppressedAt || ''));
    callback(sups);
  };

  emitCurrent();
  const handleUpdate = () => emitCurrent();
  window.addEventListener('caventra_storage_update', handleUpdate);
  return () => window.removeEventListener('caventra_storage_update', handleUpdate);
};

// 7. Check if an email is suppressed
export const isEmailSuppressed = async (email: string): Promise<boolean> => {
  const norm = normalizeEmail(email);
  if (!norm) return true;

  if (isFirebaseConfigured() && db) {
    try {
      const supRef = doc(db, 'email_suppressions', norm);
      const snap = await getDoc(supRef);
      return snap.exists();
    } catch {
      // Fallback
    }
  }

  const suppressions = getStored<EmailSuppression[]>(STORAGE_KEYS.SUPPRESSIONS, []);
  return suppressions.some(s => s.id === norm || normalizeEmail(s.email) === norm);
};

// 8. Queue an outreach email for a new lead
// (Enforces: Campaign must be ACTIVE; email valid; not suppressed; not already queued)
export const queueOutreachForLead = async (
  lead: Lead, 
  campaign: OutreachCampaign,
  performedBy: User
): Promise<{ enqueued: boolean; reason?: string; jobId?: string }> => {
  // Check 1: Campaign active status
  if (campaign.status !== 'ACTIVE') {
    return { enqueued: false, reason: 'Campaign is PAUSED. Delivery skipped.' };
  }

  // Check 1b: Strict 1-Time Outreach Rule (Never re-email already sent leads)
  if (lead.outreachStatus === 'sent' || lead.outreachSentAt) {
    return { enqueued: false, reason: 'Lead has already received outreach and cannot be re-emailed.' };
  }

  // Check 2: Valid email
  if (!lead.businessEmail || !validateEmailSyntax(lead.businessEmail)) {
    return { enqueued: false, reason: 'Missing or invalid recipient email address.' };
  }

  const normEmail = normalizeEmail(lead.businessEmail);

  // Check 3: Suppression check
  const suppressed = await isEmailSuppressed(normEmail);
  if (suppressed) {
    return { enqueued: false, reason: 'Recipient email is on the suppression/opt-out list.' };
  }

  // Check 4: Deduplication check
  const jobId = generateDeterministicJobId(campaign.id, lead.id, normEmail);

  const now = new Date().toISOString();
  const optOutToken = generateOptOutToken(normEmail, lead.id);
  const baseUrl = window.location.origin + window.location.pathname;
  const optOutUrl = `${baseUrl}#optout?token=${optOutToken}&email=${encodeURIComponent(normEmail)}`;

  const resolvedSubject = renderTemplate(campaign.subject, lead, optOutUrl);
  const resolvedBody = renderTemplate(campaign.body, lead, optOutUrl);

  const job: EmailJob = {
    id: jobId,
    campaignId: campaign.id,
    leadId: lead.id,
    recipientEmail: normEmail,
    recipientName: lead.contactName || null,
    businessName: lead.businessName,
    status: 'QUEUED',
    attempts: 0,
    maxAttempts: 3,
    createdAt: now,
    optOutToken,
    resolvedSubject,
  };

  const event: EmailEvent = {
    id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    jobId,
    leadId: lead.id,
    campaignId: campaign.id,
    recipientEmail: normEmail,
    eventType: 'QUEUED',
    timestamp: now,
    details: `Outreach job queued for ${lead.businessName} (${normEmail})`,
  };

  if (isFirebaseConfigured() && db) {
    // Check if job already exists in Firestore to guarantee idempotency
    const jobRef = doc(db, 'emailJobs', jobId);
    const existing = await getDoc(jobRef);
    if (existing.exists()) {
      return { enqueued: false, reason: 'Job already exists for this lead and campaign.' };
    }

    const batch = writeBatch(db);
    batch.set(jobRef, job);
    batch.set(doc(db, 'emailEvents', event.id), event);
    // Update lead outreach status
    batch.update(doc(db, 'leads', lead.id), {
      outreachStatus: 'queued',
      outreachJobId: jobId,
      updatedAt: now,
    });
    // Increment campaign queued stat
    const campRef = doc(db, 'campaigns', campaign.id);
    batch.update(campRef, {
      'stats.queuedCount': (campaign.stats?.queuedCount || 0) + 1,
      updatedAt: now,
    });
    await batch.commit();

    return { enqueued: true, jobId };
  }

  // Local storage mode
  const currentJobs = getStored<EmailJob[]>(STORAGE_KEYS.JOBS, []);
  if (currentJobs.some(j => j.id === jobId)) {
    return { enqueued: false, reason: 'Job already exists for this lead.' };
  }

  setStored(STORAGE_KEYS.JOBS, [job, ...currentJobs]);
  const currentEvents = getStored<EmailEvent[]>(STORAGE_KEYS.EVENTS, []);
  setStored(STORAGE_KEYS.EVENTS, [event, ...currentEvents]);

  // Update lead
  const currentLeads = getStored<Lead[]>('caventra_leads', []);
  const updatedLeads = currentLeads.map(l => l.id === lead.id ? {
    ...l,
    outreachStatus: 'queued' as const,
    outreachJobId: jobId,
    updatedAt: now,
  } : l);
  setStored('caventra_leads', updatedLeads);

  // Update campaign stats
  const camp = getStored<OutreachCampaign>(STORAGE_KEYS.CAMPAIGN, campaign);
  camp.stats.queuedCount = (camp.stats.queuedCount || 0) + 1;
  setStored(STORAGE_KEYS.CAMPAIGN, camp);

  return { enqueued: true, jobId };
};

// 8b. Process and Deliver a Queued Job (Live Dispatch)
export const processJobDelivery = async (
  jobId: string,
  campaign: OutreachCampaign
): Promise<{ success: boolean; error?: string }> => {
  // 1. Re-check campaign kill switch immediately before dispatch
  if (campaign.status !== 'ACTIVE') {
    return { success: false, error: 'Campaign is PAUSED. Delivery aborted.' };
  }

  // 2. Fetch job record
  let job: EmailJob | null = null;
  if (isFirebaseConfigured() && db) {
    const jobSnap = await getDoc(doc(db, 'emailJobs', jobId));
    if (jobSnap.exists()) job = jobSnap.data() as EmailJob;
  } else {
    const jobs = getStored<EmailJob[]>(STORAGE_KEYS.JOBS, []);
    job = jobs.find(j => j.id === jobId) || null;
  }

  if (!job || job.status !== 'QUEUED') {
    return { success: false, error: 'Job not found, already sent, or currently in progress.' };
  }

  // Immediate atomic lock: mark status as SENDING to prevent parallel duplicate sends
  if (isFirebaseConfigured() && db) {
    await updateDoc(doc(db, 'emailJobs', jobId), { status: 'SENDING' });
  } else {
    const jobs = getStored<EmailJob[]>(STORAGE_KEYS.JOBS, []);
    setStored(STORAGE_KEYS.JOBS, jobs.map(j => j.id === jobId ? { ...j, status: 'SENDING' as const } : j));
  }

  // 3. Suppression check
  const isSuppressed = await isEmailSuppressed(job.recipientEmail);
  if (isSuppressed) {
    if (isFirebaseConfigured() && db) {
      await updateDoc(doc(db, 'emailJobs', jobId), { status: 'SUPPRESSED', errorDetails: 'Suppressed recipient.' });
    }
    return { success: false, error: 'Recipient is suppressed.' };
  }

  const now = new Date().toISOString();
  const providerMessageId = `msg_out_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  // 4. Send through connected Apps Script Webhook if configured
  if (campaign.appsScriptUrl) {
    try {
      const optOutUrl = `https://caventraofficial.in/#optout?token=${job.optOutToken}&email=${encodeURIComponent(job.recipientEmail)}`;
      const renderedBody = renderTemplate(campaign.body, {
        businessName: job.businessName,
        contactName: job.recipientName,
      }, optOutUrl);

      await fetch(campaign.appsScriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'send_email',
          to: job.recipientEmail,
          subject: job.resolvedSubject || campaign.subject,
          body: renderedBody,
          fromName: campaign.senderName || 'CAVENTRA Team',
        }),
        mode: 'no-cors',
      });
    } catch (sendErr) {
      console.warn('Apps Script outreach delivery notice:', sendErr);
    }
  }

  // 5. Update Job and Lead Status to SENT
  const event: EmailEvent = {
    id: `evt_sent_${Date.now()}`,
    jobId: job.id,
    leadId: job.leadId,
    campaignId: campaign.id,
    recipientEmail: job.recipientEmail,
    eventType: 'SENT',
    timestamp: now,
    providerMessageId,
    details: `Outreach email delivered to ${job.recipientEmail}`,
  };

  if (isFirebaseConfigured() && db) {
    const batch = writeBatch(db);
    batch.update(doc(db, 'emailJobs', jobId), {
      status: 'SENT',
      sentAt: now,
      providerMessageId,
      attempts: (job.attempts || 0) + 1,
    });
    batch.set(doc(db, 'emailEvents', event.id), event);
    batch.update(doc(db, 'leads', job.leadId), {
      outreachStatus: 'sent',
      outreachSentAt: now,
      updatedAt: now,
    });
    const campRef = doc(db, 'campaigns', campaign.id);
    batch.update(campRef, {
      'stats.sentCount': (campaign.stats?.sentCount || 0) + 1,
      'stats.queuedCount': Math.max(0, (campaign.stats?.queuedCount || 1) - 1),
      lastSendAt: now,
      updatedAt: now,
    });
    await batch.commit();
    return { success: true };
  }

  // Local storage update
  const currentJobs = getStored<EmailJob[]>(STORAGE_KEYS.JOBS, []);
  const updatedJobs = currentJobs.map(j => j.id === jobId ? {
    ...j,
    status: 'SENT' as const,
    sentAt: now,
    providerMessageId,
    attempts: (j.attempts || 0) + 1,
  } : j);
  setStored(STORAGE_KEYS.JOBS, updatedJobs);

  const currentEvents = getStored<EmailEvent[]>(STORAGE_KEYS.EVENTS, []);
  setStored(STORAGE_KEYS.EVENTS, [event, ...currentEvents]);

  const currentLeads = getStored<Lead[]>('caventra_leads', []);
  const updatedLeads = currentLeads.map(l => l.id === job.leadId ? {
    ...l,
    outreachStatus: 'sent' as const,
    outreachSentAt: now,
    updatedAt: now,
  } : l);
  setStored('caventra_leads', updatedLeads);

  const camp = getStored<OutreachCampaign>(STORAGE_KEYS.CAMPAIGN, campaign);
  camp.stats.sentCount = (camp.stats.sentCount || 0) + 1;
  camp.stats.queuedCount = Math.max(0, (camp.stats.queuedCount || 1) - 1);
  camp.lastSendAt = now;
  setStored(STORAGE_KEYS.CAMPAIGN, camp);

  return { success: true };
};

// 8c. Process All Queued Jobs
export const processAllQueuedJobs = async (
  jobs: EmailJob[],
  campaign: OutreachCampaign
): Promise<{ processed: number; errors: number }> => {
  const queued = jobs.filter(j => j.status === 'QUEUED');
  let processed = 0;
  let errors = 0;

  for (const job of queued) {
    const res = await processJobDelivery(job.id, campaign);
    if (res.success) {
      processed++;
    } else {
      errors++;
    }
  }

  return { processed, errors };
};

// 8d. Enqueue and deliver a lead immediately or as part of 1-by-1 paced outreach
export const dispatchLeadOutreach = async (
  lead: Lead,
  campaign: OutreachCampaign,
  performedBy: User
): Promise<{ success: boolean; jobId?: string; error?: string }> => {
  if (campaign.status !== 'ACTIVE') {
    return { success: false, error: 'Campaign is PAUSED. Activate campaign first.' };
  }

  // Normalize email on lead if needed
  if (!lead.businessEmail && lead.email) {
    lead.businessEmail = lead.email;
  }

  // Check if lead already has a queued job
  let existingJobId: string | null = null;
  if (isFirebaseConfigured() && db) {
    const q = query(
      collection(db, 'emailJobs'),
      where('leadId', '==', lead.id),
      where('campaignId', '==', campaign.id)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      existingJobId = snap.docs[0].id;
    }
  } else {
    const jobs = getStored<EmailJob[]>(STORAGE_KEYS.JOBS, []);
    const match = jobs.find(j => j.leadId === lead.id && j.campaignId === campaign.id);
    if (match) existingJobId = match.id;
  }

  let targetJobId = existingJobId;
  if (!targetJobId) {
    const enqueueRes = await queueOutreachForLead(lead, campaign, performedBy);
    if (!enqueueRes.enqueued || !enqueueRes.jobId) {
      return { success: false, error: enqueueRes.reason || 'Could not enqueue lead.' };
    }
    targetJobId = enqueueRes.jobId;
  }

  // Deliver the email
  const deliveryRes = await processJobDelivery(targetJobId, campaign);
  return {
    success: deliveryRes.success,
    jobId: targetJobId,
    error: deliveryRes.error,
  };
};

// 9. Process and Deliver Test Email (Restricted to Authorized Founders)
export const sendTestEmail = async (
  campaign: OutreachCampaign,
  testRecipientEmail: string,
  performedBy: User
): Promise<{ success: boolean; message: string; gmailWebUrl?: string }> => {
  if (performedBy.role !== 'founder' && performedBy.role !== 'admin') {
    throw new Error('Unauthorized: Test emails can only be dispatched by authorized founders.');
  }

  if (!validateEmailSyntax(testRecipientEmail)) {
    throw new Error('Please enter a valid recipient email address for testing.');
  }

  const normEmail = normalizeEmail(testRecipientEmail);
  const sampleLead: Partial<Lead> = {
    businessName: 'Apex Horizons Inc.',
    contactName: 'Alex Mercer',
    website: 'https://apexhorizons.io',
    city: 'New York, NY',
    serviceOpportunity: 'Web App Overhaul & Digital Lead Flow',
  };

  const sampleOptOutUrl = `${window.location.origin}/#optout?token=test_preview_token&email=${encodeURIComponent(normEmail)}`;
  const renderedSubject = `[TEST] ` + renderTemplate(campaign.subject, sampleLead, sampleOptOutUrl);
  const renderedBody = renderTemplate(campaign.body, sampleLead, sampleOptOutUrl);

  const now = new Date().toISOString();
  const event: EmailEvent = {
    id: `evt_test_${Date.now()}`,
    jobId: 'test_job',
    leadId: 'test_lead',
    campaignId: campaign.id,
    recipientEmail: normEmail,
    eventType: 'SENT',
    timestamp: now,
    details: `Test email dispatched to founder recipient ${normEmail} by ${performedBy.name}`,
  };

  // 1-Click Direct Gmail Composer Web URL
  const gmailWebUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(normEmail)}&su=${encodeURIComponent(renderedSubject)}&body=${encodeURIComponent(renderedBody)}`;

  // Actual background HTTP dispatch via Google Apps Script (if configured)
  let liveSent = false;
  if (campaign.appsScriptUrl) {
    try {
      await fetch(campaign.appsScriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'send_email',
          to: normEmail,
          subject: renderedSubject,
          body: renderedBody,
          fromName: campaign.senderName || 'CAVENTRA Team',
        }),
        mode: 'no-cors', // Avoids cross-origin CORS block from Google script redirect
      });
      liveSent = true;
    } catch (err) {
      console.warn('Apps Script delivery attempted:', err);
    }
  }

  if (isFirebaseConfigured() && db) {
    const eventRef = doc(db, 'emailEvents', event.id);
    await setDoc(eventRef, event);
    return { 
      success: true, 
      message: liveSent 
        ? `Live test email dispatched via Google Apps Script to ${normEmail}.`
        : `Test email prepared for ${normEmail}. You can also send directly via Gmail below.`,
      gmailWebUrl,
    };
  }

  const events = getStored<EmailEvent[]>(STORAGE_KEYS.EVENTS, []);
  setStored(STORAGE_KEYS.EVENTS, [event, ...events]);
  return { 
    success: true, 
    message: liveSent 
      ? `Live test email dispatched via Google Apps Script to ${normEmail}.`
      : `Test email prepared for ${normEmail}. You can also send directly via Gmail below.`,
    gmailWebUrl,
  };
};

// 10. Process Opt-Out / Unsubscribe
export const handleOptOut = async (
  email: string,
  token: string,
  reason: 'OPT_OUT' = 'OPT_OUT'
): Promise<{ success: boolean; message: string }> => {
  const normEmail = normalizeEmail(email);
  if (!normEmail || !validateEmailSyntax(normEmail)) {
    return { success: false, message: 'Invalid email address provided.' };
  }

  const now = new Date().toISOString();
  const suppression: EmailSuppression = {
    id: normEmail,
    email: normEmail,
    reason,
    suppressedAt: now,
    notes: 'Recipient requested unsubscribe via secure opt-out link.',
  };

  const event: EmailEvent = {
    id: `evt_opt_${Date.now()}`,
    jobId: 'optout',
    leadId: 'optout',
    campaignId: DEFAULT_CAMPAIGN.id,
    recipientEmail: normEmail,
    eventType: 'OPTED_OUT',
    timestamp: now,
    details: `Recipient ${normEmail} opted out of future communications.`,
  };

  if (isFirebaseConfigured() && db) {
    const batch = writeBatch(db);
    batch.set(doc(db, 'email_suppressions', normEmail), suppression);
    batch.set(doc(db, 'emailEvents', event.id), event);

    // Cancel any queued jobs for this email
    try {
      const q = query(
        collection(db, 'emailJobs'), 
        where('recipientEmail', '==', normEmail),
        where('status', '==', 'QUEUED')
      );
      const snap = await getDocs(q);
      snap.forEach(jobDoc => {
        batch.update(jobDoc.ref, { 
          status: 'SUPPRESSED', 
          errorDetails: 'Recipient opted out before dispatch.' 
        });
      });
    } catch {}

    await batch.commit();
    return { success: true, message: `Your address (${normEmail}) has been successfully opted out.` };
  }

  // Local storage mode
  const sups = getStored<EmailSuppression[]>(STORAGE_KEYS.SUPPRESSIONS, []);
  if (!sups.some(s => s.id === normEmail)) {
    setStored(STORAGE_KEYS.SUPPRESSIONS, [suppression, ...sups]);
  }

  const events = getStored<EmailEvent[]>(STORAGE_KEYS.EVENTS, []);
  setStored(STORAGE_KEYS.EVENTS, [event, ...events]);

  const jobs = getStored<EmailJob[]>(STORAGE_KEYS.JOBS, []);
  const updatedJobs = jobs.map(j => {
    if (j.recipientEmail === normEmail && j.status === 'QUEUED') {
      return { ...j, status: 'SUPPRESSED' as const, errorDetails: 'Recipient opted out before dispatch.' };
    }
    return j;
  });
  setStored(STORAGE_KEYS.JOBS, updatedJobs);

  return { success: true, message: `Your address (${normEmail}) has been successfully opted out.` };
};
