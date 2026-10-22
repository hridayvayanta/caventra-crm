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

// Local storage keys for offline/local mode
const STORAGE_KEYS = {
  LEADS: 'caventra_leads',
  FOLLOW_UPS: 'caventra_followups',
  ACTIVITIES: 'caventra_activities',
  IMPORT_HISTORY: 'caventra_import_history',
  INGESTION_JOBS: 'caventra_ingestion_jobs',
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

// 1. Subscribe to Leads (Real-time listener with Two-Way Cloud Sync)
export const subscribeLeads = (callback: (leads: Lead[]) => void): (() => void) => {
  // Emit local cache immediately so UI is instantaneous
  const localLeads = getStored<Lead[]>(STORAGE_KEYS.LEADS, []);
  if (localLeads.length > 0) {
    localLeads.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    callback(localLeads);
  }

  if (isFirebaseConfigured() && db) {
    const leadsRef = collection(db, 'leads');
    return onSnapshot(leadsRef, (snapshot) => {
      const cloudLeads: Lead[] = [];
      snapshot.forEach((docSnap) => {
        cloudLeads.push(docSnap.data() as Lead);
      });
      cloudLeads.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

      if (cloudLeads.length > 0) {
        // Cloud has leads: cache them locally and render to all users across devices
        setStored(STORAGE_KEYS.LEADS, cloudLeads);
        callback(cloudLeads);
      } else if (localLeads.length > 0 && db) {
        // Cloud is empty but local browser has leads: replicate local leads to Cloud Firestore
        const firestore = db;
        const CHUNK_SIZE = 100;
        for (let i = 0; i < localLeads.length; i += CHUNK_SIZE) {
          const chunk = localLeads.slice(i, i + CHUNK_SIZE);
          const batch = writeBatch(firestore);
          for (const l of chunk) {
            batch.set(doc(firestore, 'leads', l.id), l);
          }
          batch.commit().catch(e => console.warn('Cloud replication notice:', e));
        }
        callback(localLeads);
      } else {
        callback([]);
      }
    }, (error) => {
      console.warn('Firestore subscribeLeads error:', error);
      const leads = getStored<Lead[]>(STORAGE_KEYS.LEADS, []);
      callback(leads);
    });
  }

  // Local storage real-time listener across tabs and events
  const emitCurrent = () => {
    const leads = getStored<Lead[]>(STORAGE_KEYS.LEADS, []);
    leads.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    callback(leads);
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
  const activity: Activity = {
    id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    leadId: lead.id,
    type: 'note',
    title: 'Lead Created',
    description: `Created manually by ${performedBy.name}`,
    performedBy: performedBy.name,
    performedByEmail: performedBy.email,
    timestamp: new Date().toISOString(),
  };

  if (isFirebaseConfigured() && db) {
    const leadRef = doc(db, 'leads', lead.id);
    await setDoc(leadRef, lead);
    const actRef = doc(db, 'activities', activity.id);
    await setDoc(actRef, activity);

    // Automatic outreach queuing (Executes ONLY if campaign is ACTIVE, valid email, not suppressed)
    try {
      const campDoc = await getDoc(doc(db, 'campaigns', DEFAULT_CAMPAIGN.id));
      const campaign = campDoc.exists() ? (campDoc.data() as OutreachCampaign) : DEFAULT_CAMPAIGN;
      if (campaign.status === 'ACTIVE' && lead.businessEmail) {
        await queueOutreachForLead(lead, campaign, performedBy);
      }
    } catch (e) {
      console.warn('Outreach queuing skipped:', e);
    }

    return;
  }

  // Local storage update
  const leads = getStored<Lead[]>(STORAGE_KEYS.LEADS, []);
  setStored(STORAGE_KEYS.LEADS, [lead, ...leads]);

  const activities = getStored<Activity[]>(STORAGE_KEYS.ACTIVITIES, []);
  setStored(STORAGE_KEYS.ACTIVITIES, [activity, ...activities]);

  // Local storage outreach queuing check
  try {
    const storedCamp = localStorage.getItem('caventra_outreach_campaign');
    const campaign = storedCamp ? JSON.parse(storedCamp) : DEFAULT_CAMPAIGN;
    if (campaign.status === 'ACTIVE' && lead.businessEmail) {
      await queueOutreachForLead(lead, campaign, performedBy);
    }
  } catch (e) {
    console.warn('Local outreach queuing skipped:', e);
  }
};

// 6. Update Lead (Safe partial update)
export const updateLead = async (
  leadId: string, 
  updates: Partial<Lead>, 
  performedBy: User
): Promise<void> => {
  const cleanUpdates = {
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  if (isFirebaseConfigured() && db) {
    const leadRef = doc(db, 'leads', leadId);
    await updateDoc(leadRef, cleanUpdates);
    return;
  }

  const leads = getStored<Lead[]>(STORAGE_KEYS.LEADS, []);
  const updatedLeads = leads.map(l => l.id === leadId ? { ...l, ...cleanUpdates } : l);
  setStored(STORAGE_KEYS.LEADS, updatedLeads);
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

// 8. Batch Import Leads (With Atomic Firestore or Storage confirmation)
export const batchImportLeads = async (
  validLeads: Lead[],
  importRecord: ImportRecord,
  performedBy: User
): Promise<{ success: boolean; importedCount: number; duplicateCount: number; rejectedCount: number; error?: string }> => {
  try {
    // 1. Immediately cache in local storage so this browser sees them instantaneously
    const currentLeads = getStored<Lead[]>(STORAGE_KEYS.LEADS, []);
    const existingIds = new Set(currentLeads.map(l => l.id));
    const toAdd = validLeads.filter(l => !existingIds.has(l.id));
    const updatedLeads = [...toAdd, ...currentLeads];
    setStored(STORAGE_KEYS.LEADS, updatedLeads);

    const currentActivities = getStored<Activity[]>(STORAGE_KEYS.ACTIVITIES, []);
    const newActivities: Activity[] = validLeads.map(lead => ({
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

    const currentHistory = getStored<ImportRecord[]>(STORAGE_KEYS.IMPORT_HISTORY, []);
    setStored(STORAGE_KEYS.IMPORT_HISTORY, [importRecord, ...currentHistory]);

    // 2. Replicate to Cloud Firestore in safe chunks of 100 so ALL team members on any device see them
    if (isFirebaseConfigured() && db) {
      try {
        const CHUNK_SIZE = 100;
        for (let i = 0; i < validLeads.length; i += CHUNK_SIZE) {
          const chunk = validLeads.slice(i, i + CHUNK_SIZE);
          const batch = writeBatch(db);
          for (const lead of chunk) {
            batch.set(doc(db, 'leads', lead.id), lead);
            const actRef = doc(db, 'activities', `act_imp_${lead.id}`);
            batch.set(actRef, {
              id: `act_imp_${lead.id}`,
              leadId: lead.id,
              type: 'import',
              title: 'Excel / CSV Import',
              description: `Imported from file "${importRecord.fileName}" by ${performedBy.name}`,
              performedBy: performedBy.name,
              performedByEmail: performedBy.email,
              timestamp: new Date().toISOString(),
            });
          }
          await batch.commit();
        }
        await setDoc(doc(db, 'import_history', importRecord.id), importRecord);
      } catch (cloudErr) {
        console.warn('Firestore cloud replication warning:', cloudErr);
      }
    }

    return {
      success: true,
      importedCount: validLeads.length,
      duplicateCount: importRecord.duplicateCount,
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
