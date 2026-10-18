import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Lead, ImportRecord, User } from '../types/crm';
import { 
  X, 
  Upload, 
  FileSpreadsheet, 
  AlertCircle, 
  CheckCircle2, 
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  FileCheck
} from 'lucide-react';

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingLeads: Lead[];
  currentUser: User;
  onImportComplete: (result: { imported: number; duplicates: number; rejected: number }) => void;
  onBatchImport: (validLeads: Lead[], record: ImportRecord) => Promise<{ success: boolean; importedCount: number; duplicateCount: number; rejectedCount: number; error?: string }>;
}

interface ColumnMapping {
  businessName: string;
  website: string;
  contactName: string;
  businessEmail: string;
  businessPhone: string;
  city: string;
  country: string;
  industry: string;
  serviceOpportunity: string;
  websiteCondition: string;
  estimatedValue: string;
}

interface ParsedRowResult {
  rowNumber: number;
  data: Partial<Lead>;
  isValid: boolean;
  isDuplicate: boolean;
  duplicateReason?: string;
  validationErrors: string[];
}

export const ExcelImportModal: React.FC<ExcelImportModalProps> = ({
  isOpen,
  onClose,
  existingLeads,
  currentUser,
  onImportComplete,
  onBatchImport,
}) => {
  if (!isOpen) return null;

  const [step, setStep] = useState<'upload' | 'mapping' | 'preview'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, any>[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({
    businessName: '',
    website: '',
    contactName: '',
    businessEmail: '',
    businessPhone: '',
    city: '',
    country: '',
    industry: '',
    serviceOpportunity: '',
    websiteCondition: '',
    estimatedValue: '',
  });

  const [parsedResults, setParsedResults] = useState<ParsedRowResult[]>([]);
  const [activePreviewTab, setActivePreviewTab] = useState<'valid' | 'duplicates' | 'invalid'>('valid');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Normalize domain helper
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

  // Normalize phone helper
  const normalizePhone = (phone: string): string => {
    if (!phone) return '';
    return phone.replace(/[^\d+]/g, '');
  };

  // 1. Handle file selection & browser-side parsing
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null);
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const validExtensions = ['.xlsx', '.xls', '.csv'];
    const lowerName = selectedFile.name.toLowerCase();
    const isValidExt = validExtensions.some(ext => lowerName.endsWith(ext));

    if (!isValidExt) {
      setErrorMessage('Please select a valid Excel (.xlsx, .xls) or CSV (.csv) file.');
      return;
    }

    setFile(selectedFile);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: 'binary', cellDates: true });
        
        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          setErrorMessage('The uploaded workbook contains no readable sheets.');
          return;
        }

        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (jsonData.length === 0) {
          setErrorMessage('The selected sheet is empty. Please upload a file containing data rows.');
          return;
        }

        const foundHeaders = Object.keys(jsonData[0]);
        setHeaders(foundHeaders);
        setRawRows(jsonData);

        // Auto-detect header mappings
        autoDetectMapping(foundHeaders);
        setStep('mapping');
      } catch (err: any) {
        console.error('File parsing error:', err);
        setErrorMessage(`Failed to read spreadsheet: ${err.message || 'Corrupted file format'}`);
      }
    };

    reader.onerror = () => {
      setErrorMessage('Failed to read file from disk.');
    };

    reader.readAsBinaryString(selectedFile);
  };

  // Auto-map common column names
  const autoDetectMapping = (colHeaders: string[]) => {
    const findMatch = (candidates: string[]): string => {
      for (const h of colHeaders) {
        const clean = h.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
        if (candidates.includes(clean)) return h;
      }
      return '';
    };

    const newMap: ColumnMapping = {
      businessName: findMatch(['company', 'companyname', 'business', 'businessname', 'name', 'organization', 'client']),
      website: findMatch(['website', 'url', 'web', 'domain', 'websiteurl', 'link', 'site']),
      contactName: findMatch(['contact', 'contactname', 'person', 'owner', 'fullname', 'decisionmaker']),
      businessEmail: findMatch(['email', 'businessemail', 'mail', 'contactemail']),
      businessPhone: findMatch(['phone', 'businessphone', 'telephone', 'mobile', 'cell', 'tel']),
      city: findMatch(['city', 'town', 'location']),
      country: findMatch(['country', 'nation', 'region']),
      industry: findMatch(['industry', 'sector', 'category', 'vertical']),
      serviceOpportunity: findMatch(['service', 'opportunity', 'need', 'targetservice']),
      websiteCondition: findMatch(['condition', 'notes', 'issue', 'problem', 'flaw', 'deficiency', 'audit']),
      estimatedValue: findMatch(['value', 'budget', 'estimatedvalue', 'dealvalue', 'amount', 'price']),
    };

    setMapping(newMap);
  };

  // 2. Validate and build preview
  const handleProceedToPreview = () => {
    if (!mapping.businessName) {
      setErrorMessage('Please map the Company / Business Name column. This field is required.');
      return;
    }

    setErrorMessage(null);

    // Build existing lookup sets for duplicate detection
    const existingDomains = new Set(
      existingLeads.map(l => l.normalizedDomain).filter(Boolean)
    );
    const existingEmails = new Set(
      existingLeads.map(l => (l.businessEmail || '').toLowerCase()).filter(Boolean)
    );
    const existingPhones = new Set(
      existingLeads.map(l => normalizePhone(l.businessPhone || '')).filter(Boolean)
    );

    // Intra-file duplicate trackers
    const seenDomainsInFile = new Set<string>();
    const seenEmailsInFile = new Set<string>();

    const results: ParsedRowResult[] = [];

    rawRows.forEach((row, idx) => {
      const rowNum = idx + 2; // Row 1 is header
      const rawName = String(row[mapping.businessName] || '').trim();
      const rawWeb = mapping.website ? String(row[mapping.website] || '').trim() : '';
      const rawEmail = mapping.businessEmail ? String(row[mapping.businessEmail] || '').trim().toLowerCase() : '';
      const rawPhone = mapping.businessPhone ? String(row[mapping.businessPhone] || '').trim() : '';
      const rawContact = mapping.contactName ? String(row[mapping.contactName] || '').trim() : '';
      const rawCity = mapping.city ? String(row[mapping.city] || '').trim() : '';
      const rawCountry = mapping.country ? String(row[mapping.country] || '').trim() : '';
      const rawIndustry = mapping.industry ? String(row[mapping.industry] || '').trim() : '';
      const rawService = mapping.serviceOpportunity ? String(row[mapping.serviceOpportunity] || '').trim() : '';
      const rawCondition = mapping.websiteCondition ? String(row[mapping.websiteCondition] || '').trim() : '';
      const rawValue = mapping.estimatedValue ? Number(row[mapping.estimatedValue]) : 35000;

      const normDomain = normalizeDomain(rawWeb);
      const normPhone = normalizePhone(rawPhone);

      const validationErrors: string[] = [];

      // Required: Business Name
      if (!rawName) {
        validationErrors.push('Missing company / business name');
      }

      // Check Duplicates against Database & Intra-file
      let isDuplicate = false;
      let duplicateReason = '';

      if (normDomain) {
        if (existingDomains.has(normDomain)) {
          isDuplicate = true;
          duplicateReason = `Domain "${normDomain}" already exists in CRM`;
        } else if (seenDomainsInFile.has(normDomain)) {
          isDuplicate = true;
          duplicateReason = `Duplicate domain "${normDomain}" found multiple times in file`;
        }
        seenDomainsInFile.add(normDomain);
      }

      if (!isDuplicate && rawEmail) {
        if (existingEmails.has(rawEmail)) {
          isDuplicate = true;
          duplicateReason = `Email "${rawEmail}" already exists in CRM`;
        } else if (seenEmailsInFile.has(rawEmail)) {
          isDuplicate = true;
          duplicateReason = `Duplicate email "${rawEmail}" found multiple times in file`;
        }
        seenEmailsInFile.add(rawEmail);
      }

      if (!isDuplicate && normPhone && normPhone.length >= 7) {
        if (existingPhones.has(normPhone)) {
          isDuplicate = true;
          duplicateReason = `Phone number matches existing CRM contact`;
        }
      }

      const isValid = validationErrors.length === 0;

      const leadData: Partial<Lead> = {
        id: `lead_imp_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
        businessName: rawName,
        website: rawWeb ? (rawWeb.startsWith('http') ? rawWeb : `https://${rawWeb}`) : `https://${normDomain || 'unknown.com'}`,
        normalizedDomain: normDomain || rawName.toLowerCase().replace(/[^a-z0-9]/g, '') + '.local',
        contactName: rawContact || null,
        businessEmail: rawEmail || null,
        businessPhone: rawPhone || null,
        city: rawCity || 'Unknown',
        country: rawCountry || 'India',
        industry: rawIndustry || 'General Business',
        serviceOpportunity: rawService || 'Website Redesign',
        websiteCondition: rawCondition || 'Imported prospect. Requires preliminary technical audit.',
        status: 'new',
        priority: 'normal',
        assignedTo: null,
        estimatedValue: isNaN(rawValue) || rawValue <= 0 ? 35000 : rawValue,
        notes: `Imported from ${file?.name || 'spreadsheet'}.`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      results.push({
        rowNumber: rowNum,
        data: leadData,
        isValid,
        isDuplicate,
        duplicateReason,
        validationErrors,
      });
    });

    setParsedResults(results);
    setStep('preview');
  };

  // Filter preview sets
  const validRows = parsedResults.filter(r => r.isValid && !r.isDuplicate);
  const duplicateRows = parsedResults.filter(r => r.isDuplicate);
  const invalidRows = parsedResults.filter(r => !r.isValid);

  // 3. Confirm Import & Commit to Database
  const handleConfirmImport = async () => {
    if (validRows.length === 0) {
      setErrorMessage('There are no valid records ready to import.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const leadsToInsert: Lead[] = validRows.map(r => r.data as Lead);

    const importRecord: ImportRecord = {
      id: `import_${Date.now()}`,
      fileName: file?.name || 'spreadsheet.xlsx',
      timestamp: new Date().toISOString(),
      totalRows: parsedResults.length,
      importedCount: validRows.length,
      duplicateCount: duplicateRows.length,
      rejectedCount: invalidRows.length,
      status: invalidRows.length > 0 ? 'partial' : 'success',
    };

    try {
      const result = await onBatchImport(leadsToInsert, importRecord);

      if (result.success) {
        onImportComplete({
          imported: result.importedCount,
          duplicates: result.duplicateCount,
          rejected: result.rejectedCount,
        });
        onClose();
      } else {
        setErrorMessage(result.error || 'Failed to save imported leads to database.');
      }
    } catch (err: any) {
      setErrorMessage(`Import write failed: ${err.message || 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl border border-slate-200 flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="p-4 px-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Import Business Leads</h3>
              <p className="text-xs text-slate-500">Support for .xlsx, .xls, and .csv with in-browser duplicate detection</p>
            </div>
          </div>

          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="px-6 py-2.5 bg-slate-100/70 border-b border-slate-200 flex items-center gap-6 text-xs font-semibold">
          <div className={`flex items-center gap-1.5 ${step === 'upload' ? 'text-blue-600 font-bold' : 'text-slate-500'}`}>
            <span className="w-5 h-5 rounded-full bg-white border border-slate-300 flex items-center justify-center text-[11px]">1</span>
            <span>Upload File</span>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
          <div className={`flex items-center gap-1.5 ${step === 'mapping' ? 'text-blue-600 font-bold' : 'text-slate-500'}`}>
            <span className="w-5 h-5 rounded-full bg-white border border-slate-300 flex items-center justify-center text-[11px]">2</span>
            <span>Map Columns</span>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
          <div className={`flex items-center gap-1.5 ${step === 'preview' ? 'text-blue-600 font-bold' : 'text-slate-500'}`}>
            <span className="w-5 h-5 rounded-full bg-white border border-slate-300 flex items-center justify-center text-[11px]">3</span>
            <span>Review & Confirm</span>
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1">
          
          {/* STEP 1: Upload */}
          {step === 'upload' && (
            <div className="py-8 text-center max-w-lg mx-auto">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl p-10 cursor-pointer transition-colors bg-slate-50/50 hover:bg-blue-50/20 group"
              >
                <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-3 group-hover:scale-105 transition-transform">
                  <Upload className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-slate-800 text-sm mb-1">
                  Click to select spreadsheet
                </h4>
                <p className="text-xs text-slate-500 mb-4">
                  Accepts .xlsx, .xls, or .csv files up to 10 MB
                </p>
                <button
                  type="button"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors"
                >
                  Browse Computer
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileChange}
                className="hidden"
              />

              <div className="mt-6 text-left p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600">
                <span className="font-bold text-slate-800 block mb-1">Supported Spreadsheet Columns:</span>
                Company / Business Name, Website URL, Contact Name, Email, Phone, City, Country, Industry, Notes.
              </div>
            </div>
          )}

          {/* STEP 2: Column Mapping */}
          {step === 'mapping' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Match Spreadsheet Headings</h4>
                  <p className="text-xs text-slate-500">File: <span className="font-semibold text-slate-800">{file?.name}</span> ({rawRows.length} data rows found)</p>
                </div>
                <button
                  onClick={() => setStep('upload')}
                  className="text-xs text-blue-600 hover:underline font-medium"
                >
                  Choose Different File
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                
                {/* Required: Business Name */}
                <div className="p-3 bg-blue-50/50 border border-blue-200 rounded-xl">
                  <label className="block font-bold text-blue-900 mb-1">
                    Company / Business Name *
                  </label>
                  <select
                    value={mapping.businessName}
                    onChange={(e) => setMapping(prev => ({ ...prev, businessName: e.target.value }))}
                    className="w-full bg-white border border-blue-300 rounded-lg p-2 text-slate-800 font-medium"
                  >
                    <option value="">-- Select Column --</option>
                    {headers.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

                {/* Website */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <label className="block font-bold text-slate-700 mb-1">
                    Website / Domain
                  </label>
                  <select
                    value={mapping.website}
                    onChange={(e) => setMapping(prev => ({ ...prev, website: e.target.value }))}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-800 font-medium"
                  >
                    <option value="">-- None / Skip --</option>
                    {headers.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

                {/* Contact Name */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <label className="block font-bold text-slate-700 mb-1">
                    Contact Person
                  </label>
                  <select
                    value={mapping.contactName}
                    onChange={(e) => setMapping(prev => ({ ...prev, contactName: e.target.value }))}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-800 font-medium"
                  >
                    <option value="">-- None / Skip --</option>
                    {headers.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

                {/* Email */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <label className="block font-bold text-slate-700 mb-1">
                    Business Email
                  </label>
                  <select
                    value={mapping.businessEmail}
                    onChange={(e) => setMapping(prev => ({ ...prev, businessEmail: e.target.value }))}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-800 font-medium"
                  >
                    <option value="">-- None / Skip --</option>
                    {headers.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

                {/* Phone */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <label className="block font-bold text-slate-700 mb-1">
                    Business Phone
                  </label>
                  <select
                    value={mapping.businessPhone}
                    onChange={(e) => setMapping(prev => ({ ...prev, businessPhone: e.target.value }))}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-800 font-medium"
                  >
                    <option value="">-- None / Skip --</option>
                    {headers.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

                {/* City */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <label className="block font-bold text-slate-700 mb-1">
                    City
                  </label>
                  <select
                    value={mapping.city}
                    onChange={(e) => setMapping(prev => ({ ...prev, city: e.target.value }))}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-800 font-medium"
                  >
                    <option value="">-- None / Skip --</option>
                    {headers.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

                {/* Industry */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <label className="block font-bold text-slate-700 mb-1">
                    Industry
                  </label>
                  <select
                    value={mapping.industry}
                    onChange={(e) => setMapping(prev => ({ ...prev, industry: e.target.value }))}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-800 font-medium"
                  >
                    <option value="">-- None / Skip --</option>
                    {headers.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

                {/* Technical Need / Condition */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <label className="block font-bold text-slate-700 mb-1">
                    Website Notes / Condition
                  </label>
                  <select
                    value={mapping.websiteCondition}
                    onChange={(e) => setMapping(prev => ({ ...prev, websiteCondition: e.target.value }))}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-800 font-medium"
                  >
                    <option value="">-- None / Skip --</option>
                    {headers.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

              </div>

              <div className="flex justify-end pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={handleProceedToPreview}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm flex items-center gap-2"
                >
                  <span>Preview Import Data</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Preview & Validation */}
          {step === 'preview' && (
            <div className="space-y-4">
              
              {/* Summary Counter Bar */}
              <div className="grid grid-cols-3 gap-3">
                
                <button
                  onClick={() => setActivePreviewTab('valid')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    activePreviewTab === 'valid'
                      ? 'bg-emerald-50 border-emerald-300 shadow-sm'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between text-emerald-700 text-xs font-bold">
                    <span>Valid Records</span>
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div className="text-xl font-bold text-emerald-900 mt-1">{validRows.length}</div>
                  <div className="text-[11px] text-emerald-600">Will be saved to CRM</div>
                </button>

                <button
                  onClick={() => setActivePreviewTab('duplicates')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    activePreviewTab === 'duplicates'
                      ? 'bg-amber-50 border-amber-300 shadow-sm'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between text-amber-700 text-xs font-bold">
                    <span>Duplicates Skipped</span>
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div className="text-xl font-bold text-amber-900 mt-1">{duplicateRows.length}</div>
                  <div className="text-[11px] text-amber-600">Preserving existing records</div>
                </button>

                <button
                  onClick={() => setActivePreviewTab('invalid')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    activePreviewTab === 'invalid'
                      ? 'bg-rose-50 border-rose-300 shadow-sm'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between text-rose-700 text-xs font-bold">
                    <span>Invalid Rows</span>
                    <AlertCircle className="w-4 h-4" />
                  </div>
                  <div className="text-xl font-bold text-rose-900 mt-1">{invalidRows.length}</div>
                  <div className="text-[11px] text-rose-600">Missing company name</div>
                </button>

              </div>

              {/* Data Table */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="py-2 px-3">Row</th>
                      <th className="py-2 px-3">Company</th>
                      <th className="py-2 px-3">Domain</th>
                      <th className="py-2 px-3">Contact Details</th>
                      <th className="py-2 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activePreviewTab === 'valid' && (
                      validRows.length === 0 ? (
                        <tr><td colSpan={5} className="py-6 text-center text-slate-400">No valid records to display.</td></tr>
                      ) : (
                        validRows.map(r => (
                          <tr key={r.rowNumber} className="hover:bg-slate-50">
                            <td className="py-2 px-3 text-slate-400 font-mono text-[11px]">{r.rowNumber}</td>
                            <td className="py-2 px-3 font-semibold text-slate-900">{r.data.businessName}</td>
                            <td className="py-2 px-3 text-slate-600 font-mono text-[11px]">{r.data.normalizedDomain}</td>
                            <td className="py-2 px-3 text-slate-500">{r.data.businessPhone || r.data.businessEmail || 'None'}</td>
                            <td className="py-2 px-3">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">Ready</span>
                            </td>
                          </tr>
                        ))
                      )
                    )}

                    {activePreviewTab === 'duplicates' && (
                      duplicateRows.length === 0 ? (
                        <tr><td colSpan={5} className="py-6 text-center text-slate-400">No duplicate rows detected.</td></tr>
                      ) : (
                        duplicateRows.map(r => (
                          <tr key={r.rowNumber} className="hover:bg-slate-50 bg-amber-50/20">
                            <td className="py-2 px-3 text-slate-400 font-mono text-[11px]">{r.rowNumber}</td>
                            <td className="py-2 px-3 font-semibold text-slate-900">{r.data.businessName}</td>
                            <td className="py-2 px-3 text-slate-600 font-mono text-[11px]">{r.data.normalizedDomain}</td>
                            <td className="py-2 px-3 text-amber-700 text-[11px] font-medium">{r.duplicateReason}</td>
                            <td className="py-2 px-3">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">Skipping</span>
                            </td>
                          </tr>
                        ))
                      )
                    )}

                    {activePreviewTab === 'invalid' && (
                      invalidRows.length === 0 ? (
                        <tr><td colSpan={5} className="py-6 text-center text-slate-400">No invalid rows detected.</td></tr>
                      ) : (
                        invalidRows.map(r => (
                          <tr key={r.rowNumber} className="hover:bg-slate-50 bg-rose-50/20">
                            <td className="py-2 px-3 text-slate-400 font-mono text-[11px]">{r.rowNumber}</td>
                            <td className="py-2 px-3 font-semibold text-slate-900">{r.data.businessName || '<Empty>'}</td>
                            <td className="py-2 px-3 text-slate-400 font-mono text-[11px]">{r.data.normalizedDomain || '-'}</td>
                            <td className="py-2 px-3 text-rose-600 text-[11px]">{r.validationErrors.join(', ')}</td>
                            <td className="py-2 px-3">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">Rejected</span>
                            </td>
                          </tr>
                        ))
                      )
                    )}
                  </tbody>
                </table>
              </div>

              {/* Action Controls */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setStep('mapping')}
                  className="px-4 py-2 text-slate-600 hover:text-slate-900 text-xs font-semibold"
                >
                  Back to Mapping
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    disabled={validRows.length === 0 || isSubmitting}
                    onClick={handleConfirmImport}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Confirming Writes to Database...</span>
                      </>
                    ) : (
                      <>
                        <FileCheck className="w-4 h-4" />
                        <span>Confirm Import ({validRows.length} Leads)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
};
