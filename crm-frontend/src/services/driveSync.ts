import { Lead, User, IngestionJob, ImportRecord } from '../types/crm';
import { batchImportLeads } from './db';

export const DEFAULT_DRIVE_WEB_APP_URL = 
  'https://script.google.com/macros/s/AKfycbxsUGci8s8exsbMvAew3Kc684s2c2S1-q0vL7EthpAUA80CVv8TDcL5b10NeSU-Ob8PHg/exec';

const STORAGE_KEYS = {
  WEB_APP_URL: 'caventra_drive_webapp_url',
  INGESTION_JOBS: 'caventra_ingestion_jobs',
};

export const getDriveWebAppUrl = (): string => {
  return localStorage.getItem(STORAGE_KEYS.WEB_APP_URL) || DEFAULT_DRIVE_WEB_APP_URL;
};

export const setDriveWebAppUrl = (url: string): void => {
  localStorage.setItem(STORAGE_KEYS.WEB_APP_URL, url.trim());
};

const normalizeDomain = (url: string): string => {
  if (!url) return '';
  return url
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .split('/')[0]
    .split('?')[0];
};

export interface DriveSyncResult {
  success: boolean;
  filesFound: number;
  totalExtracted: number;
  importedCount: number;
  duplicateCount: number;
  rejectedCount: number;
  error?: string;
}

export const syncLeadsFromGoogleDrive = async (
  currentUser: User,
  existingLeads: Lead[],
  customUrl?: string
): Promise<DriveSyncResult> => {
  const url = customUrl || getDriveWebAppUrl();

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Google Apps Script responded with HTTP status ${response.status}`);
    }

    const data = await response.json();

    if (!data || !data.success) {
      throw new Error(data?.error || 'Failed to fetch leads from Google Drive Web App');
    }

    const rawLeads: any[] = data.leads || [];
    const filesFound = data.filesFound || 0;
    const now = new Date().toISOString();

    // Fall back to local storage if existingLeads is not yet populated
    const baseLeads: Lead[] = (existingLeads && existingLeads.length > 0)
      ? existingLeads
      : (() => {
          try {
            const raw = localStorage.getItem('caventra_leads');
            return raw ? JSON.parse(raw) : [];
          } catch {
            return [];
          }
        })();

    // Deduplication sets (by domain and by email)
    const existingDomains = new Set(
      baseLeads.map(l => l.normalizedDomain).filter(Boolean)
    );
    const existingEmails = new Set(
      baseLeads.map(l => (l.businessEmail || l.email || '').toLowerCase()).filter(Boolean)
    );

    const validLeads: Lead[] = [];
    let duplicateCount = 0;
    let rejectedCount = 0;

    for (const raw of rawLeads) {
      const company = String(raw.company || raw.businessName || '').trim();
      if (!company) {
        rejectedCount++;
        continue;
      }

      const email = String(raw.email || raw.businessEmail || '').trim().toLowerCase();
      const rawPhone = String(raw.phone || raw.businessPhone || '').trim();
      const cleanPhone = rawPhone.replace(/[^\d+]/g, '');

      // Strict Validation: Company name is mandatory AND must have at least one contact channel (email, phone, or both)
      const hasEmail = Boolean(email && email.includes('@') && email.includes('.'));
      const hasPhone = Boolean(cleanPhone && cleanPhone.replace(/[^\d]/g, '').length >= 7);

      if (!hasEmail && !hasPhone) {
        rejectedCount++;
        continue;
      }

      const website = String(raw.website || '').trim();
      const normDomain = normalizeDomain(website);

      // Check duplicates
      const isDomainDup = normDomain && existingDomains.has(normDomain);
      const isEmailDup = hasEmail && existingEmails.has(email);

      if (isDomainDup || isEmailDup) {
        duplicateCount++;
        continue;
      }

      // Add to seen sets to avoid duplicates within the incoming batch
      if (normDomain) existingDomains.add(normDomain);
      if (hasEmail) existingEmails.add(email);

      const lead: Lead = {
        id: `lead_drive_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        businessName: company,
        website: website,
        normalizedDomain: normDomain,
        contactName: raw.contactName || null,
        businessEmail: email || null,
        businessPhone: raw.phone || raw.businessPhone || null,
        city: raw.city || 'Unspecified',
        country: raw.country || 'India',
        industry: raw.industry || 'General',
        websiteCondition: raw.notes || 'Imported via Automated Google Drive Sync',
        serviceOpportunity: 'Website Redesign / Development',
        status: 'new',
        priority: 'normal',
        assignedTo: null,
        lastContactDate: null,
        nextFollowUpDate: null,
        nextFollowUpTime: null,
        leadSource: raw.source || 'Google Drive Sync',
        sourceFileName: raw.source || 'Google Drive',
        createdAt: now,
        updatedAt: now,
      };

      validLeads.push(lead);
    }

    const importRecord: ImportRecord = {
      id: `imp_drive_${Date.now()}`,
      fileName: `Google Drive Folder (${filesFound} Workbooks)`,
      totalRows: rawLeads.length,
      importedCount: validLeads.length,
      duplicateCount: duplicateCount,
      rejectedCount: rejectedCount,
      timestamp: now,
      status: 'success',
    };

    // Commit through database service
    const importResult = await batchImportLeads(validLeads, importRecord, currentUser);

    // Record Ingestion Job for live dashboard feed
    const jobRecord: IngestionJob = {
      id: `job_${Date.now()}`,
      fileId: 'gdrive_folder_1VcNqOmAIhhDIE2FHDY1Aimzn_HCCcFv_',
      fileName: `Google Drive (${filesFound} Excels Sync)`,
      fileUrl: 'https://drive.google.com/drive/u/0/folders/1VcNqOmAIhhDIE2FHDY1Aimzn_HCCcFv_',
      status: 'completed',
      totalRows: rawLeads.length,
      processedRows: rawLeads.length,
      leadsAdded: validLeads.length,
      duplicatesSkipped: duplicateCount,
      rowsRejected: rejectedCount,
      errors: [],
      startedAt: now,
      completedAt: new Date().toISOString(),
      lastCheckedAt: new Date().toISOString(),
      source: 'Google Drive Scheduled Ingestion',
    };

    try {
      const existingJobs = JSON.parse(localStorage.getItem(STORAGE_KEYS.INGESTION_JOBS) || '[]');
      localStorage.setItem(STORAGE_KEYS.INGESTION_JOBS, JSON.stringify([jobRecord, ...existingJobs]));
      window.dispatchEvent(new Event('caventra_storage_update'));
    } catch (e) {
      console.warn('Could not persist ingestion job record:', e);
    }

    return {
      success: true,
      filesFound,
      totalExtracted: rawLeads.length,
      importedCount: importResult.importedCount,
      duplicateCount,
      rejectedCount,
    };
  } catch (err: any) {
    console.error('Google Drive Sync error:', err);
    return {
      success: false,
      filesFound: 0,
      totalExtracted: 0,
      importedCount: 0,
      duplicateCount: 0,
      rejectedCount: 0,
      error: err.message || 'Network error communicating with Google Drive Web App',
    };
  }
};
