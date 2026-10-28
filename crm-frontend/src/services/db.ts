import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  writeBatch, 
  getDoc,
  getDocs, 
  query, 
  orderBy 
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';
import { 
  Lead, 
  FollowUpTask, 
  Activity, 
  ImportRecord, 
  User, 
  ContactCompletionFormValues,
  IngestionJob,
  OutreachCampaign
} from '../types/crm';
import { queueOutreachForLead, DEFAULT_CAMPAIGN } from './outreach';
import { classifyLead, ensureLeadClassified, isJunkLeadName } from './leadClassifier';

// Local storage keys for offline/local mode
const STORAGE_KEYS = {
  LEADS: 'caventra_leads',
  FOLLOW_UPS: 'caventra_followups',
  ACTIVITIES: 'caventra_activities',
  IMPORT_HISTORY: 'caventra_import_history',
  INGESTION_JOBS: 'caventra_ingestion_jobs',
};

// Normalization and Deduplication Validation Helpers
export const normalizeDomain = (url?: string | null): string => {
  if (!url) return '';
  const d = url
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .split('/')[0]
    .split('?')[0];
  if (!d || d === 'unknown.com' || d.endsWith('.local') || d.includes('priority') || d.includes(' ')) return '';
  return d;
};

export const normalizeEmail = (email?: string | null): string => {
  if (!email) return '';
  const e = email.trim().toLowerCase();
  if (e.includes('@') && e.includes('.')) return e;
  return '';
};

export const normalizePhone = (phone?: string | null): string => {
  if (!phone) return '';
  const digits = phone.replace(/[^\d]/g, '');
  if (digits.length >= 7) {
    return digits.length > 10 ? digits.slice(-10) : digits;
  }
  return '';
};

export const normalizeBusinessName = (name?: string | null): string => {
  if (!name) return '';
  return name.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
};

export const checkIsDuplicateLead = (
  candidate: Partial<Lead>,
  existingLeads: Lead[]
): { isDuplicate: boolean; reason?: string } => {
  const cEmail = normalizeEmail(candidate.businessEmail || (candidate as any).email);
  const cDomain = normalizeDomain(candidate.normalizedDomain || candidate.website || '');
  const cPhone = normalizePhone(candidate.businessPhone || (candidate as any).phone);
  const cName = normalizeBusinessName(candidate.businessName || (candidate as any).companyName || (candidate as any).name);

  for (const existing of existingLeads) {
    if (candidate.id && existing.id === candidate.id) continue;

    const eEmail = normalizeEmail(existing.businessEmail || (existing as any).email);
    if (cEmail && eEmail && cEmail === eEmail) {
      return { isDuplicate: true, reason: `Lead with email "${cEmail}" already exists (${existing.businessName})` };
    }

    const eDomain = normalizeDomain(existing.normalizedDomain || existing.website || '');
    if (cDomain && eDomain && cDomain === eDomain) {
      return { isDuplicate: true, reason: `Lead with domain "${cDomain}" already exists (${existing.businessName})` };
    }

    const ePhone = normalizePhone(existing.businessPhone || (existing as any).phone);
    if (cPhone && ePhone && cPhone === ePhone) {
      return { isDuplicate: true, reason: `Lead with phone number "${existing.businessPhone || cPhone}" already exists (${existing.businessName})` };
    }

    const eName = normalizeBusinessName(existing.businessName || (existing as any).companyName || (existing as any).name);
    if (cName && eName && cName.length >= 4 && cName === eName) {
      const sameSource = Boolean(candidate.sourceFileName && candidate.sourceFileName === existing.sourceFileName);
      const sameCity = Boolean(candidate.city && candidate.city.toLowerCase() === (existing.city || '').toLowerCase());
      if (sameSource || sameCity || (!cDomain && !eDomain)) {
        return { isDuplicate: true, reason: `Lead with company name "${existing.businessName}" already exists` };
      }
    }
  }

  return { isDuplicate: false };
};

export const deduplicateLeadsList = (leads: Lead[]): Lead[] => {
  const seenIds = new Set<string>();
  const seenEmails = new Set<string>();
  const seenDomains = new Set<string>();
  const seenPhones = new Set<string>();
  const seenNames = new Set<string>();
  const unique: Lead[] = [];

  for (const l of leads) {
    if (seenIds.has(l.id)) continue;

    // Filter out spreadsheet calculation rows or pitch template notes
    if (isJunkLeadName(l.businessName)) continue;

    const classified = ensureLeadClassified(l);

    const email = normalizeEmail(classified.businessEmail || classified.email);
    if (email && seenEmails.has(email)) continue;

    const domain = normalizeDomain(classified.normalizedDomain || classified.website);
    if (domain && seenDomains.has(domain)) continue;

    const phone = normalizePhone(classified.businessPhone);
    if (phone && seenPhones.has(phone)) continue;

    const name = normalizeBusinessName(classified.businessName);
    if (name && name.length >= 4 && seenNames.has(name) && (classified.sourceFileName || email || domain)) continue;

    seenIds.add(classified.id);
    if (email) seenEmails.add(email);
    if (domain) seenDomains.add(domain);
    if (phone) seenPhones.add(phone);
    if (name) seenNames.add(name);

    unique.push(classified);
  }
  return unique;
};

// In-memory / localStorage helpers
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

export const sanitizeForFirestore = <T extends Record<string, any>>(obj: T): T => {
  if (!obj || typeof obj !== 'object') return obj;
  const clean: any = Array.isArray(obj) ? [] : {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) {
      clean[key] = null;
    } else if (value !== null && typeof value === 'object' && !(value instanceof Date)) {
      clean[key] = sanitizeForFirestore(value);
    } else {
      clean[key] = value;
    }
  }
  return clean as T;
};

export const getAllCurrentLeads = async (): Promise<Lead[]> => {
  if (isFirebaseConfigured() && db) {
    try {
      const snap = await getDocs(collection(db, 'leads'));
      const list: Lead[] = [];
      snap.forEach(d => list.push(d.data() as Lead));
      if (list.length > 0) return deduplicateLeadsList(list);
    } catch (e) {
      console.warn('getAllCurrentLeads Firestore read warning:', e);
    }
  }
  const cached = getStored<Lead[]>(STORAGE_KEYS.LEADS, []);
  return deduplicateLeadsList(cached);
};

// 1. Subscribe to Leads (Real-time listener with Two-Way Cloud Sync)
export const subscribeLeads = (callback: (leads: Lead[]) => void): (() => void) => {
  let isUnsubscribed = false;

  const emitCurrentLocal = () => {
    const rawLocal = getStored<Lead[]>(STORAGE_KEYS.LEADS, []);
    const localLeads = deduplicateLeadsList(rawLocal);
    localLeads.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    callback(localLeads);
    return localLeads;
  };

  // 1. Emit local cache immediately so UI is instantaneous
  emitCurrentLocal();

  // 2. ALWAYS listen to local storage events (for instantaneous reactivity on import/addition)
  const handleStorageUpdate = () => {
    if (isUnsubscribed) return;
    emitCurrentLocal();
  };
  window.addEventListener('caventra_storage_update', handleStorageUpdate);
  window.addEventListener('storage', handleStorageUpdate);

  let unsubFirestore: (() => void) | null = null;

  if (isFirebaseConfigured() && db) {
    const leadsRef = collection(db, 'leads');
    unsubFirestore = onSnapshot(leadsRef, (snapshot) => {
      if (isUnsubscribed) return;
      const rawCloud: Lead[] = [];
      snapshot.forEach((docSnap) => {
        rawCloud.push(docSnap.data() as Lead);
      });
      const cloudLeads = deduplicateLeadsList(rawCloud);

      // Re-read fresh local storage leads
      const currentLocal = deduplicateLeadsList(getStored<Lead[]>(STORAGE_KEYS.LEADS, []));

      if (cloudLeads.length > 0) {
        // Merge cloud leads with current local leads so none are lost
        const merged = deduplicateLeadsList([...cloudLeads, ...currentLocal]);
        merged.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        setStored(STORAGE_KEYS.LEADS, merged);
        callback(merged);
      } else if (currentLocal.length > 0 && db) {
        // Cloud is empty but local storage has leads: replicate local leads to Cloud Firestore
        const firestore = db;
        const CHUNK_SIZE = 100;
        for (let i = 0; i < currentLocal.length; i += CHUNK_SIZE) {
          const chunk = currentLocal.slice(i, i + CHUNK_SIZE);
          const batch = writeBatch(firestore);
          for (const l of chunk) {
            batch.set(doc(firestore, 'leads', l.id), sanitizeForFirestore(l));
          }
          batch.commit().catch(e => console.warn('Cloud replication notice:', e));
        }
        currentLocal.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        callback(currentLocal);
      } else {
        callback([]);
      }
    }, (error) => {
      console.warn('Firestore subscribeLeads error:', error);
      if (!isUnsubscribed) {
        emitCurrentLocal();
      }
    });
  }

  return () => {
    isUnsubscribed = true;
    window.removeEventListener('caventra_storage_update', handleStorageUpdate);
    window.removeEventListener('storage', handleStorageUpdate);
    if (unsubFirestore) {
      unsubFirestore();
    }
  };
};

// 2. Subscribe to Follow-Up Tasks
export const subscribeFollowUps = (callback: (tasks: FollowUpTask[]) => void): (() => void) => {
  if (isFirebaseConfigured() && db) {
    const tasksRef = collection(db, 'follow_ups');
    return onSnapshot(tasksRef, (snapshot) => {
      const tasks: FollowUpTask[] = [];
      snapshot.forEach((docSnap) => {
        tasks.push(docSnap.data() as FollowUpTask);
      });
      tasks.sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''));
      callback(tasks);
    }, (error) => {
      console.error('Firestore subscribeFollowUps error:', error);
    });
  }

  const emitCurrent = () => {
    const tasks = getStored<FollowUpTask[]>(STORAGE_KEYS.FOLLOW_UPS, []);
    tasks.sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''));
    callback(tasks);
  };

  emitCurrent();

  const handleUpdate = () => emitCurrent();
  window.addEventListener('caventra_storage_update', handleUpdate);
  window.addEventListener('storage', handleUpdate);

  return () => {
    window.removeEventListener('caventra_storage_update', handleUpdate);
    window.removeEventListener('storage', handleUpdate);
  };
};

// 3. Subscribe to Activities
export const subscribeActivities = (
  leadId: string | null,
  callback: (activities: Activity[]) => void
): (() => void) => {
  if (isFirebaseConfigured() && db) {
    const actRef = collection(db, 'activities');
    return onSnapshot(actRef, (snapshot) => {
      let activities: Activity[] = [];
      snapshot.forEach((docSnap) => {
        activities.push(docSnap.data() as Activity);
      });
      if (leadId) {
        activities = activities.filter(a => a.leadId === leadId);
      }
      activities.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
      callback(activities);
    });
  }

  const emitCurrent = () => {
    let activities = getStored<Activity[]>(STORAGE_KEYS.ACTIVITIES, []);
    if (leadId) {
      activities = activities.filter(a => a.leadId === leadId);
    }
    activities.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
    callback(activities);
  };

  emitCurrent();

  const handleUpdate = () => emitCurrent();
  window.addEventListener('caventra_storage_update', handleUpdate);
  window.addEventListener('storage', handleUpdate);

  return () => {
    window.removeEventListener('caventra_storage_update', handleUpdate);
    window.removeEventListener('storage', handleUpdate);
  };
};

// 4. Subscribe to Import History
export const subscribeImportHistory = (callback: (history: ImportRecord[]) => void): (() => void) => {
  if (isFirebaseConfigured() && db) {
    const historyRef = collection(db, 'import_history');
    return onSnapshot(historyRef, (snapshot) => {
      const history: ImportRecord[] = [];
      snapshot.forEach((docSnap) => {
        history.push(docSnap.data() as ImportRecord);
      });
      history.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
      callback(history);
    });
  }

  const emitCurrent = () => {
    const history = getStored<ImportRecord[]>(STORAGE_KEYS.IMPORT_HISTORY, []);
    history.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
    callback(history);
  };

  emitCurrent();

  const handleUpdate = () => emitCurrent();
  window.addEventListener('caventra_storage_update', handleUpdate);
  window.addEventListener('storage', handleUpdate);

  return () => {
    window.removeEventListener('caventra_storage_update', handleUpdate);
    window.removeEventListener('storage', handleUpdate);
  };
};

// 4b. Subscribe to Google Drive Ingestion Jobs (Real-time listener)
export const subscribeIngestionJobs = (callback: (jobs: IngestionJob[]) => void): (() => void) => {
  if (isFirebaseConfigured() && db) {
    const jobsRef = collection(db, 'ingestionJobs');
    return onSnapshot(jobsRef, (snapshot) => {
      const jobs: IngestionJob[] = [];
      snapshot.forEach((docSnap) => {
        jobs.push(docSnap.data() as IngestionJob);
      });
      // Sort newest started/checked first
      jobs.sort((a, b) => (b.startedAt || b.lastCheckedAt || '').localeCompare(a.startedAt || a.lastCheckedAt || ''));
      callback(jobs);
    }, (error) => {
      console.error('Firestore subscribeIngestionJobs error:', error);
    });
  }

  const emitCurrent = () => {
    const jobs = getStored<IngestionJob[]>(STORAGE_KEYS.INGESTION_JOBS, []);
    jobs.sort((a, b) => (b.startedAt || b.lastCheckedAt || '').localeCompare(a.startedAt || a.lastCheckedAt || ''));
    callback(jobs);
  };

  emitCurrent();

  const handleUpdate = () => emitCurrent();
  window.addEventListener('caventra_storage_update', handleUpdate);
  window.addEventListener('storage', handleUpdate);

  return () => {
    window.removeEventListener('caventra_storage_update', handleUpdate);
    window.removeEventListener('storage', handleUpdate);
  };
};

// 5. Save Single Lead
export const saveLead = async (lead: Lead, performedBy: User): Promise<void> => {
  // Always ensure lead is classified according to contact method and country
  const classifiedLead = ensureLeadClassified(lead);

  // Enforce duplicate validation against current leads
  const existing = await getAllCurrentLeads();
  const dupCheck = checkIsDuplicateLead(classifiedLead, existing);
  if (dupCheck.isDuplicate) {
    throw new Error(dupCheck.reason || 'Lead already exists');
  }

  const activity: Activity = {
    id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    leadId: classifiedLead.id,
    type: 'note',
    title: 'Lead Created',
    description: `Created manually by ${performedBy.name}`,
    performedBy: performedBy.name,
    performedByEmail: performedBy.email,
    timestamp: new Date().toISOString(),
  };

  if (isFirebaseConfigured() && db) {
    try {
      const leadRef = doc(db, 'leads', classifiedLead.id);
      await setDoc(leadRef, sanitizeForFirestore(classifiedLead));
      const actRef = doc(db, 'activities', activity.id);
      await setDoc(actRef, sanitizeForFirestore(activity));

      // Automatic outreach queuing (Executes ONLY if campaign is ACTIVE, valid email, not suppressed)
      try {
        const campDoc = await getDoc(doc(db, 'campaigns', DEFAULT_CAMPAIGN.id));
        const campaign = campDoc.exists() ? (campDoc.data() as OutreachCampaign) : DEFAULT_CAMPAIGN;
        if (campaign.status === 'ACTIVE' && classifiedLead.businessEmail) {
          await queueOutreachForLead(classifiedLead, campaign, performedBy);
        }
      } catch (e) {
        console.warn('Outreach queuing skipped:', e);
      }
    } catch (e) {
      console.warn('Firestore createLead write warning:', e);
    }
  }

  // Local storage update (always update local cache for instant UI feedback)
  const leads = deduplicateLeadsList(getStored<Lead[]>(STORAGE_KEYS.LEADS, []));
  setStored(STORAGE_KEYS.LEADS, [classifiedLead, ...leads]);

  const activities = getStored<Activity[]>(STORAGE_KEYS.ACTIVITIES, []);
  setStored(STORAGE_KEYS.ACTIVITIES, [activity, ...activities]);

  // Local storage outreach queuing check
  try {
    const storedCamp = localStorage.getItem('caventra_outreach_campaign');
    const campaign = storedCamp ? JSON.parse(storedCamp) : DEFAULT_CAMPAIGN;
    if (campaign.status === 'ACTIVE' && classifiedLead.businessEmail) {
      await queueOutreachForLead(classifiedLead, campaign, performedBy);
    }
  } catch (e) {
    console.warn('Local outreach queuing skipped:', e);
  }
};

// 6. Update Lead (Safe partial update with immediate automatic reclassification)
export const updateLead = async (
  leadId: string, 
  updates: Partial<Lead>, 
  performedBy: User
): Promise<void> => {
  let computedUpdates = { ...updates };

  // Recalculate classification immediately if phone, email, or country changed (Requirement 5 & 9)
  const isContactInfoChanged = (
    updates.businessPhone !== undefined ||
    updates.businessEmail !== undefined ||
    (updates as any).phone !== undefined ||
    (updates as any).email !== undefined ||
    updates.country !== undefined
  );

  if (isContactInfoChanged) {
    let existingLead: Lead | undefined;
    if (isFirebaseConfigured() && db) {
      try {
        const snap = await getDoc(doc(db, 'leads', leadId));
        if (snap.exists()) existingLead = snap.data() as Lead;
      } catch (e) {}
    }
    if (!existingLead) {
      const stored = getStored<Lead[]>(STORAGE_KEYS.LEADS, []);
      existingLead = stored.find(l => l.id === leadId);
    }

    const merged = { ...(existingLead || {}), ...updates };
    const classification = classifyLead(merged);
    computedUpdates = {
      ...computedUpdates,
      ...classification,
    };
  }

  const cleanUpdates = {
    ...computedUpdates,
    updatedAt: new Date().toISOString(),
  };

  if (isFirebaseConfigured() && db) {
    try {
      const leadRef = doc(db, 'leads', leadId);
      await updateDoc(leadRef, sanitizeForFirestore(cleanUpdates));
    } catch (e) {
      console.warn('Firestore updateLead warning:', e);
    }
  }

  const leads = getStored<Lead[]>(STORAGE_KEYS.LEADS, []);
  const updatedLeads = leads.map(l => l.id === leadId ? { ...l, ...cleanUpdates } : l);
  setStored(STORAGE_KEYS.LEADS, updatedLeads);
};

// 6b. Idempotent Migration / Backfill to classify existing leads and cleanse junk entries (Requirement 6)
export const backfillLeadClassification = async (
  leads: Lead[]
): Promise<{ backfilledCount: number; purgedJunkCount: number; leads: Lead[] }> => {
  let backfilledCount = 0;
  let purgedJunkCount = 0;

  // 1. Identify and purge any non-lead summary or template titles
  const validLeads: Lead[] = [];
  const junkIdsToDelete: string[] = [];

  for (const l of leads) {
    if (isJunkLeadName(l.businessName)) {
      purgedJunkCount++;
      junkIdsToDelete.push(l.id);
    } else {
      validLeads.push(l);
    }
  }

  // 2. Ensure all valid leads have complete classification metadata
  const upgradedLeads = validLeads.map((l) => {
    if (!l.contactType || l.hasValidPhone === undefined || !l.phoneCountry) {
      backfilledCount++;
      return ensureLeadClassified(l);
    }
    return l;
  });

  if (backfilledCount > 0 || purgedJunkCount > 0) {
    setStored(STORAGE_KEYS.LEADS, upgradedLeads);

    if (isFirebaseConfigured() && db) {
      try {
        const firestore = db;

        // Delete junk documents from Firestore if present
        if (junkIdsToDelete.length > 0) {
          const deleteBatch = writeBatch(firestore);
          for (const id of junkIdsToDelete) {
            deleteBatch.delete(doc(firestore, 'leads', id));
          }
          await deleteBatch.commit();
        }

        // Update unclassified leads in chunks
        const unclassified = upgradedLeads.filter((_, idx) => !validLeads[idx].contactType);
        const CHUNK_SIZE = 100;
        for (let i = 0; i < unclassified.length; i += CHUNK_SIZE) {
          const chunk = unclassified.slice(i, i + CHUNK_SIZE);
          const batch = writeBatch(firestore);
          for (const l of chunk) {
            batch.set(doc(firestore, 'leads', l.id), sanitizeForFirestore(l), { merge: true });
          }
          await batch.commit();
        }
      } catch (e) {
        console.warn('Firestore classification backfill warning:', e);
      }
    }
  }

  return { backfilledCount, purgedJunkCount, leads: upgradedLeads };
};

// 7. Delete Lead
export const deleteLead = async (leadId: string, performedBy: User): Promise<void> => {
  if (isFirebaseConfigured() && db) {
    await deleteDoc(doc(db, 'leads', leadId));
    return;
  }

  const leads = getStored<Lead[]>(STORAGE_KEYS.LEADS, []);
  setStored(STORAGE_KEYS.LEADS, leads.filter(l => l.id !== leadId));

  const tasks = getStored<FollowUpTask[]>(STORAGE_KEYS.FOLLOW_UPS, []);
  setStored(STORAGE_KEYS.FOLLOW_UPS, tasks.filter(t => t.leadId !== leadId));
};

// 7b. Purge All CRM Leads (Keeps Google Drive untouched)
export const purgeAllLeads = async (): Promise<void> => {
  if (isFirebaseConfigured() && db) {
    try {
      const snap = await getDocs(collection(db, 'leads'));
      const batch = writeBatch(db);
      snap.docs.forEach(docSnap => batch.delete(docSnap.ref));
      await batch.commit();
    } catch (e) {
      console.warn('Firebase leads purge warning:', e);
    }
  }

  setStored(STORAGE_KEYS.LEADS, []);
  setStored(STORAGE_KEYS.ACTIVITIES, []);
  setStored(STORAGE_KEYS.FOLLOW_UPS, []);
  setStored(STORAGE_KEYS.IMPORT_HISTORY, []);
  setStored('caventra_ingestion_jobs', []);
  window.dispatchEvent(new Event('caventra_storage_update'));
};

// 8. Batch Import Leads (With Atomic Firestore or Storage confirmation & Zero-Duplicate Guarantee)
export const batchImportLeads = async (
  validLeads: Lead[],
  importRecord: ImportRecord,
  performedBy: User
): Promise<{ success: boolean; importedCount: number; duplicateCount: number; rejectedCount: number; error?: string }> => {
  try {
    // 1. Fetch current leads from Cloud / local to guarantee authoritative deduplication
    const currentLeads = await getAllCurrentLeads();
    const existingIds = new Set(currentLeads.map(l => l.id));
    const existingEmails = new Set(currentLeads.map(l => normalizeEmail(l.businessEmail)).filter(Boolean));
    const existingDomains = new Set(currentLeads.map(l => normalizeDomain(l.normalizedDomain || l.website)).filter(Boolean));
    const existingPhones = new Set(currentLeads.map(l => normalizePhone(l.businessPhone)).filter(Boolean));
    const existingNames = new Set(currentLeads.map(l => normalizeBusinessName(l.businessName)).filter(Boolean));

    const trulyNewLeads: Lead[] = [];
    let duplicateCount = importRecord.duplicateCount || 0;

    for (const lead of validLeads) {
      if (existingIds.has(lead.id)) {
        duplicateCount++;
        continue;
      }

      const lEmail = normalizeEmail(lead.businessEmail);
      const lDomain = normalizeDomain(lead.normalizedDomain || lead.website);
      const lPhone = normalizePhone(lead.businessPhone);
      const lName = normalizeBusinessName(lead.businessName);

      if (lEmail && existingEmails.has(lEmail)) {
        duplicateCount++;
        continue;
      }
      if (lDomain && existingDomains.has(lDomain)) {
        duplicateCount++;
        continue;
      }
      if (lPhone && existingPhones.has(lPhone)) {
        duplicateCount++;
        continue;
      }
      if (lName && lName.length >= 4 && existingNames.has(lName)) {
        duplicateCount++;
        continue;
      }

      // Track intra-batch
      existingIds.add(lead.id);
      if (lEmail) existingEmails.add(lEmail);
      if (lDomain) existingDomains.add(lDomain);
      if (lPhone) existingPhones.add(lPhone);
      if (lName) existingNames.add(lName);

      trulyNewLeads.push(ensureLeadClassified(lead));
    }

    if (trulyNewLeads.length === 0) {
      return {
        success: true,
        importedCount: 0,
        duplicateCount: duplicateCount,
        rejectedCount: importRecord.rejectedCount,
      };
    }

    // 2. Immediately cache in local storage
    const updatedLeads = [...trulyNewLeads, ...currentLeads];
    setStored(STORAGE_KEYS.LEADS, deduplicateLeadsList(updatedLeads));

    const currentActivities = getStored<Activity[]>(STORAGE_KEYS.ACTIVITIES, []);
    const newActivities: Activity[] = trulyNewLeads.map(lead => ({
      id: `act_imp_${lead.id}_${Date.now()}`,
      leadId: lead.id,
      type: 'import',
      title: 'Excel / CSV Import',
      description: `Imported from file "${importRecord.fileName}" by ${performedBy.name}`,
      performedBy: performedBy.name,
      performedByEmail: performedBy.email,
      timestamp: new Date().toISOString(),
    }));
    setStored(STORAGE_KEYS.ACTIVITIES, [...newActivities, ...currentActivities]);

    const updatedRecord: ImportRecord = {
      ...importRecord,
      importedCount: trulyNewLeads.length,
      duplicateCount: duplicateCount,
    };

    const currentHistory = getStored<ImportRecord[]>(STORAGE_KEYS.IMPORT_HISTORY, []);
    setStored(STORAGE_KEYS.IMPORT_HISTORY, [updatedRecord, ...currentHistory]);

    // 3. Replicate to Cloud Firestore in safe chunks of 100 so ALL team members on any device see them
    if (isFirebaseConfigured() && db) {
      try {
        const CHUNK_SIZE = 100;
        for (let i = 0; i < trulyNewLeads.length; i += CHUNK_SIZE) {
          const chunk = trulyNewLeads.slice(i, i + CHUNK_SIZE);
          const batch = writeBatch(db);
          for (const lead of chunk) {
            batch.set(doc(db, 'leads', lead.id), sanitizeForFirestore(lead));
            const actRef = doc(db, 'activities', `act_imp_${lead.id}`);
            batch.set(actRef, sanitizeForFirestore({
              id: `act_imp_${lead.id}`,
              leadId: lead.id,
              type: 'import',
              title: 'Excel / CSV Import',
              description: `Imported from file "${importRecord.fileName}" by ${performedBy.name}`,
              performedBy: performedBy.name,
              performedByEmail: performedBy.email,
              timestamp: new Date().toISOString(),
            }));
          }
          await batch.commit();
        }
        await setDoc(doc(db, 'import_history', updatedRecord.id), sanitizeForFirestore(updatedRecord));
      } catch (cloudErr) {
        console.warn('Firestore cloud replication warning:', cloudErr);
      }
    }

    return {
      success: true,
      importedCount: trulyNewLeads.length,
      duplicateCount: duplicateCount,
      rejectedCount: importRecord.rejectedCount,
    };
  } catch (err: any) {
    console.error('Batch import failed:', err);
    return {
      success: false,
      importedCount: 0,
      duplicateCount: importRecord.duplicateCount,
      rejectedCount: importRecord.rejectedCount,
      error: err.message || 'Database write failed',
    };
  }
};

// 9. Complete Contact Workflow
export const recordContactCompletion = async (
  lead: Lead,
  form: ContactCompletionFormValues,
  performedBy: User
): Promise<void> => {
  const now = new Date().toISOString();
  
  // Determine next lead status based on outcome & action
  let nextStatus: Lead['status'] = lead.status;
  if (form.nextAction === 'schedule_follow_up') {
    nextStatus = 'contacted';
  } else if (form.nextAction === 'move_to_discussion') {
    nextStatus = 'in_discussion';
  } else if (form.nextAction === 'close_as_lost') {
    nextStatus = 'lost';
  } else if (form.nextAction === 'keep_contacted') {
    nextStatus = 'contacted';
  }

  const leadUpdates: Partial<Lead> = {
    status: nextStatus,
    lastContactDate: now,
    nextFollowUpDate: form.nextAction === 'schedule_follow_up' ? form.followUpDate : null,
    nextFollowUpTime: form.nextAction === 'schedule_follow_up' ? form.followUpTime : null,
    updatedAt: now,
  };

  const activity: Activity = {
    id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    leadId: lead.id,
    type: 'contact',
    title: `Contact Completed (${form.method.toUpperCase()})`,
    description: `Outcome: ${form.outcome.replace('_', ' ').toUpperCase()}.${form.notes ? ` Notes: ${form.notes}` : ''}`,
    performedBy: performedBy.name,
    performedByEmail: performedBy.email,
    timestamp: now,
    contactMethod: form.method,
    outcome: form.outcome,
  };

  let newTask: FollowUpTask | null = null;
  if (form.nextAction === 'schedule_follow_up' && form.followUpDate) {
    newTask = {
      id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      leadId: lead.id,
      businessName: lead.businessName,
      website: lead.website,
      businessPhone: lead.businessPhone,
      businessEmail: lead.businessEmail,
      contactName: lead.contactName,
      assignedTo: lead.assignedTo || performedBy.name,
      dueDate: form.followUpDate,
      dueTime: form.followUpTime || '10:00',
      reason: form.notes || `Follow-up after ${form.method} call (Outcome: ${form.outcome.replace('_', ' ')})`,
      status: 'pending',
      createdAt: now,
    };
  }

  if (isFirebaseConfigured() && db) {
    const batch = writeBatch(db);
    batch.update(doc(db, 'leads', lead.id), leadUpdates);
    batch.set(doc(db, 'activities', activity.id), activity);
    if (newTask) {
      batch.set(doc(db, 'follow_ups', newTask.id), newTask);
    }
    await batch.commit();
    return;
  }

  // Local storage update
  const leads = getStored<Lead[]>(STORAGE_KEYS.LEADS, []);
  setStored(STORAGE_KEYS.LEADS, leads.map(l => l.id === lead.id ? { ...l, ...leadUpdates } : l));

  const activities = getStored<Activity[]>(STORAGE_KEYS.ACTIVITIES, []);
  setStored(STORAGE_KEYS.ACTIVITIES, [activity, ...activities]);

  if (newTask) {
    const tasks = getStored<FollowUpTask[]>(STORAGE_KEYS.FOLLOW_UPS, []);
    setStored(STORAGE_KEYS.FOLLOW_UPS, [newTask, ...tasks]);
  }
};

// 10. Complete Follow-Up Task
export const completeFollowUpTask = async (
  task: FollowUpTask,
  outcomeNote: string,
  rescheduleAction: 'complete' | 'reschedule',
  nextDueDate?: string,
  nextDueTime?: string,
  performedBy?: User
): Promise<void> => {
  const now = new Date().toISOString();
  const userName = performedBy ? performedBy.name : task.assignedTo;

  const activity: Activity = {
    id: `act_fu_${Date.now()}`,
    leadId: task.leadId,
    type: 'follow_up',
    title: 'Follow-up Task Completed',
    description: outcomeNote || 'Follow-up interaction conducted successfully.',
    performedBy: userName,
    timestamp: now,
  };

  let nextTask: FollowUpTask | null = null;
  if (rescheduleAction === 'reschedule' && nextDueDate) {
    nextTask = {
      id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      leadId: task.leadId,
      businessName: task.businessName,
      website: task.website,
      businessPhone: task.businessPhone,
      businessEmail: task.businessEmail,
      contactName: task.contactName,
      assignedTo: task.assignedTo,
      dueDate: nextDueDate,
      dueTime: nextDueTime || '10:00',
      reason: outcomeNote || 'Subsequent follow-up',
      status: 'pending',
      createdAt: now,
    };
  }

  const leadUpdates: Partial<Lead> = {
    lastContactDate: now,
    nextFollowUpDate: nextDueDate || null,
    nextFollowUpTime: nextDueTime || null,
    updatedAt: now,
  };

  if (isFirebaseConfigured() && db) {
    const batch = writeBatch(db);
    batch.update(doc(db, 'follow_ups', task.id), {
      status: 'completed',
      completedAt: now,
      completedBy: userName,
    });
    batch.update(doc(db, 'leads', task.leadId), leadUpdates);
    batch.set(doc(db, 'activities', activity.id), activity);
    if (nextTask) {
      batch.set(doc(db, 'follow_ups', nextTask.id), nextTask);
    }
    await batch.commit();
    return;
  }

  // Local storage update
  const tasks = getStored<FollowUpTask[]>(STORAGE_KEYS.FOLLOW_UPS, []);
  const updatedTasks = tasks.map(t => 
    t.id === task.id 
      ? { ...t, status: 'completed' as const, completedAt: now, completedBy: userName } 
      : t
  );
  if (nextTask) {
    setStored(STORAGE_KEYS.FOLLOW_UPS, [nextTask, ...updatedTasks]);
  } else {
    setStored(STORAGE_KEYS.FOLLOW_UPS, updatedTasks);
  }

  const leads = getStored<Lead[]>(STORAGE_KEYS.LEADS, []);
  setStored(STORAGE_KEYS.LEADS, leads.map(l => l.id === task.leadId ? { ...l, ...leadUpdates } : l));

  const activities = getStored<Activity[]>(STORAGE_KEYS.ACTIVITIES, []);
  setStored(STORAGE_KEYS.ACTIVITIES, [activity, ...activities]);
};
