import { parsePhoneNumberFromString, CountryCode } from 'libphonenumber-js';
import { 
  Lead, 
  ContactType, 
  CountryClassificationStatus, 
  ContactMethodFilter, 
  LeadStatus,
  LeadSection 
} from '../types/crm';

export interface ClassifiedLeadFields {
  normalizedPhone?: string;
  normalizedEmail?: string;
  hasValidPhone: boolean;
  hasValidEmail: boolean;
  contactType: ContactType;
  phoneCountryCode?: string; // 2-letter ISO, e.g. 'IN', 'US', 'AE', 'GB'
  phoneCountry: string; // Proper readable country name e.g. 'India', 'United States', or 'Unknown'
  callingCode?: string; // e.g. '+91', '+1', '+971'
  countryClassificationStatus: CountryClassificationStatus;
}

export interface LeadFilterOptions {
  section?: LeadSection;
  contactMethod?: ContactMethodFilter;
  country?: string; // 'all' or specific country name, e.g. 'India', 'United States'
  status?: 'all' | LeadStatus;
  searchQuery?: string;
}

export interface LeadMetrics {
  totalLeads: number;
  indianLeads: number;
  internationalLeads: number;
  phoneLeads: number;
  emailLeads: number;
  phoneOnlyLeads: number;
  emailOnlyLeads: number;
  bothPhoneAndEmailLeads: number;
  missingContactLeads: number;
}

// Fallback lookup table for common country names
const COMMON_COUNTRY_NAMES: Record<string, string> = {
  IN: 'India',
  US: 'United States',
  CA: 'Canada',
  GB: 'United Kingdom',
  AE: 'United Arab Emirates',
  AU: 'Australia',
  DE: 'Germany',
  SG: 'Singapore',
  FR: 'France',
  SA: 'Saudi Arabia',
  QA: 'Qatar',
  OM: 'Oman',
  KW: 'Kuwait',
  BH: 'Bahrain',
  NZ: 'New Zealand',
  IE: 'Ireland',
  ZA: 'South Africa',
  MY: 'Malaysia',
  PH: 'Philippines',
  JP: 'Japan',
  KR: 'South Korea',
  IT: 'Italy',
  ES: 'Spain',
  NL: 'Netherlands',
  SE: 'Sweden',
  CH: 'Switzerland',
  BR: 'Brazil',
  MX: 'Mexico',
};

// Reverse lookup for string country matching
const COUNTRY_NAME_TO_ISO: Record<string, CountryCode> = {
  india: 'IN',
  in: 'IN',
  'united states': 'US',
  usa: 'US',
  us: 'US',
  'united kingdom': 'GB',
  uk: 'GB',
  'great britain': 'GB',
  canada: 'CA',
  ca: 'CA',
  australia: 'AU',
  au: 'AU',
  'united arab emirates': 'AE',
  uae: 'AE',
  dubai: 'AE',
  ae: 'AE',
  germany: 'DE',
  de: 'DE',
  singapore: 'SG',
  sg: 'SG',
  france: 'FR',
  fr: 'FR',
  'new zealand': 'NZ',
  nz: 'NZ',
  ireland: 'IE',
  ie: 'IE',
  'south africa': 'ZA',
  za: 'ZA',
};

/**
 * Filter out non-lead summary calculations, outreach template titles, and spreadsheet notes
 */
export const isJunkLeadName = (name?: string | null): boolean => {
  if (!name) return true;
  const lower = name.trim().toLowerCase();
  if (lower.length < 2) return true;

  // Reject spreadsheet calculations and summaries
  if (
    lower === 'total / average' || 
    lower.startsWith('total /') || 
    lower === 'total' || 
    lower === 'average' || 
    lower === 'subtotal' || 
    lower === 'summary' ||
    lower.startsWith('summary ')
  ) {
    return true;
  }

  // Reject spreadsheet notes, pitch drafts, template names, and placeholders
  const junkPhrases = [
    'placeholder text', 
    'lorem ipsum', 
    '[business name]', 
    '[owner/team]', 
    'gmail header', 
    'quick upgrade for', 
    'outreach (email', 
    'email + sms', 
    'legacy php',
    'sample template',
    'outreach pitch'
  ];

  for (const phrase of junkPhrases) {
    if (lower.includes(phrase)) return true;
  }

  const genericHeaders = [
    'company', 'company name', 'business name', 'firm name', 'client name', 
    'serial no', 's.no', 'sr no', '#', 'website url', 'title', 'none', 'n/a', 'null'
  ];
  if (genericHeaders.includes(lower)) return true;

  return false;
};

// RFC-compliant email regex
const RFC_EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

let displayNames: Intl.DisplayNames | null = null;
try {
  if (typeof Intl !== 'undefined' && Intl.DisplayNames) {
    displayNames = new Intl.DisplayNames(['en'], { type: 'region' });
  }
} catch {
  displayNames = null;
}

/**
 * Convert 2-letter ISO country code to proper country name
 */
export const getCountryName = (code?: string): string => {
  if (!code) return 'Unknown';
  const upper = code.trim().toUpperCase();
  if (displayNames) {
    try {
      const name = displayNames.of(upper);
      if (name) return name;
    } catch {}
  }
  return COMMON_COUNTRY_NAMES[upper] || upper;
};

/**
 * Generate flag emoji from ISO-3166-1 alpha-2 code
 */
export const getCountryFlag = (countryCode?: string): string => {
  if (!countryCode || countryCode.trim().length !== 2) return '🌐';
  const upper = countryCode.trim().toUpperCase();
  // Ensure exactly 2 A-Z letters
  if (!/^[A-Z]{2}$/.test(upper)) return '🌐';
  const codePoints = upper.split('').map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
};

/**
 * Core Lead Classification Logic (Requirement 1, 2, 3, 5)
 * Analyzes phone, email, and explicit metadata without destructive alterations.
 */
export const classifyLead = (lead: Partial<Lead>): ClassifiedLeadFields => {
  // 1. Email Normalization & Validation
  const rawEmail = (lead.businessEmail || (lead as any).email || '').trim().toLowerCase();
  let hasValidEmail = false;
  let normalizedEmail: string | undefined = undefined;

  const invalidEmailTokens = ['none', 'n/a', 'null', 'undefined', 'no email', 'test@test.com', 'none@none.com'];
  if (rawEmail && !invalidEmailTokens.includes(rawEmail) && rawEmail.includes('@') && rawEmail.includes('.')) {
    if (RFC_EMAIL_REGEX.test(rawEmail)) {
      hasValidEmail = true;
      normalizedEmail = rawEmail;
    }
  }

  // 2. Phone Normalization & Country Determination
  const rawPhone = (lead.businessPhone || (lead as any).phone || '').trim();
  const digitsOnly = rawPhone.replace(/\D/g, '');
  
  let hasValidPhone = false;
  let normalizedPhone: string | undefined = undefined;
  let phoneCountryCode: string | undefined = undefined;
  let phoneCountry = 'Unknown';
  let callingCode: string | undefined = undefined;
  let countryClassificationStatus: CountryClassificationStatus = 'unknown';

  const invalidPhoneTokens = ['none', 'n/a', '0', 'null', 'unknown', 'not available'];
  const isInvalidToken = invalidPhoneTokens.includes(rawPhone.toLowerCase());

  if (rawPhone && !isInvalidToken && digitsOnly.length >= 7) {
    let parsed = null;

    // A. Explicit International format starting with '+'
    if (rawPhone.startsWith('+')) {
      parsed = parsePhoneNumberFromString(rawPhone);
      if (parsed && parsed.isValid()) {
        hasValidPhone = true;
        phoneCountryCode = parsed.country;
        phoneCountry = getCountryName(parsed.country);
        callingCode = `+${parsed.countryCallingCode}`;
        normalizedPhone = parsed.formatInternational();
        countryClassificationStatus = 'verified';
      }
    } 
    // B. Leading '00' International Dialing Prefix
    else if (rawPhone.startsWith('00') && digitsOnly.length > 9) {
      parsed = parsePhoneNumberFromString('+' + rawPhone.slice(2));
      if (parsed && parsed.isValid()) {
        hasValidPhone = true;
        phoneCountryCode = parsed.country;
        phoneCountry = getCountryName(parsed.country);
        callingCode = `+${parsed.countryCallingCode}`;
        normalizedPhone = parsed.formatInternational();
        countryClassificationStatus = 'verified';
      }
    }
    // C. Phone starts with '91' and has 12 digits (Indian international number without '+')
    else if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) {
      parsed = parsePhoneNumberFromString('+' + digitsOnly);
      if (parsed && parsed.isValid()) {
        hasValidPhone = true;
        phoneCountryCode = 'IN';
        phoneCountry = 'India';
        callingCode = '+91';
        normalizedPhone = parsed.formatInternational();
        countryClassificationStatus = 'verified';
      }
    }
    // D. 10-digit standard Indian mobile number series (starts with 6, 7, 8, 9)
    else if (digitsOnly.length === 10 && /^[6-9]/.test(digitsOnly)) {
      // Check explicit country metadata or source context
      const explicitCountry = (lead.country || '').trim().toLowerCase();
      const isExplicitIndia = explicitCountry === 'india' || explicitCountry === 'in';

      if (isExplicitIndia) {
        parsed = parsePhoneNumberFromString(digitsOnly, 'IN');
        if (parsed && parsed.isValid()) {
          hasValidPhone = true;
          phoneCountryCode = 'IN';
          phoneCountry = 'India';
          callingCode = '+91';
          normalizedPhone = parsed.formatInternational();
          countryClassificationStatus = 'inferred';
        }
      } else {
        // Without explicit country context, do NOT assume India. Mark as Needs Review.
        hasValidPhone = true;
        normalizedPhone = rawPhone;
        phoneCountryCode = undefined;
        phoneCountry = 'Unknown';
        callingCode = undefined;
        countryClassificationStatus = 'needs_review';
      }
    }
    // E. Number with other length, check if explicit country can parse it
    else {
      const explicitCountry = (lead.country || '').trim().toLowerCase();
      const countryIso = COUNTRY_NAME_TO_ISO[explicitCountry];

      if (countryIso) {
        parsed = parsePhoneNumberFromString(rawPhone, countryIso);
        if (parsed && parsed.isValid()) {
          hasValidPhone = true;
          phoneCountryCode = parsed.country;
          phoneCountry = getCountryName(parsed.country);
          callingCode = `+${parsed.countryCallingCode}`;
          normalizedPhone = parsed.formatInternational();
          countryClassificationStatus = 'inferred';
        }
      }

      if (!hasValidPhone) {
        // Valid digits exist but country cannot be reliably established
        hasValidPhone = true;
        normalizedPhone = rawPhone;
        phoneCountryCode = undefined;
        phoneCountry = 'Unknown';
        callingCode = undefined;
        countryClassificationStatus = 'needs_review';
      }
    }
  }

  // 3. Contact Type Determination
  let contactType: ContactType = 'missing';
  if (hasValidPhone && hasValidEmail) {
    contactType = 'both';
  } else if (hasValidPhone) {
    contactType = 'phone_only';
  } else if (hasValidEmail) {
    contactType = 'email_only';
  }

  return {
    hasValidPhone,
    hasValidEmail,
    normalizedPhone,
    normalizedEmail,
    phoneCountryCode,
    phoneCountry,
    callingCode,
    countryClassificationStatus,
    contactType,
  };
};

/**
 * Apply Classification onto a Lead object safely
 */
export const ensureLeadClassified = (lead: Lead): Lead => {
  const classified = classifyLead(lead);
  return {
    ...lead,
    ...classified,
  };
};

/**
 * Filter Leads across Section, Contact Method, Country, Status, and Search (Requirement 4)
 */
export const filterLeads = (leads: Lead[], options: LeadFilterOptions): Lead[] => {
  const {
    section = 'all',
    contactMethod = 'all',
    country = 'all',
    status = 'all',
    searchQuery = '',
  } = options;

  return leads.filter((lead) => {
    // Make sure classification properties exist
    const hasPhone = lead.hasValidPhone !== undefined ? lead.hasValidPhone : Boolean(lead.businessPhone && lead.businessPhone.trim());
    const hasEmail = lead.hasValidEmail !== undefined ? lead.hasValidEmail : Boolean(lead.businessEmail && lead.businessEmail.trim());
    const cType = lead.contactType || (hasPhone && hasEmail ? 'both' : hasPhone ? 'phone_only' : hasEmail ? 'email_only' : 'missing');
    const pCountry = lead.phoneCountry || 'Unknown';
    const pCountryCode = lead.phoneCountryCode;

    // 1. Primary Section Filter
    if (section === 'indian_leads') {
      if (pCountryCode !== 'IN' && pCountry !== 'India') return false;
    } else if (section === 'international_leads') {
      // Must have valid phone AND identified as non-Indian country
      if (!hasPhone || !pCountryCode || pCountryCode === 'IN' || pCountry === 'India') return false;
    } else if (section === 'only_phone_numbers') {
      if (cType !== 'phone_only') return false;
    } else if (section === 'new') {
      if (lead.status !== 'new') return false;
    } else if (section === 'to_contact') {
      if (lead.status !== 'to_contact' && lead.status !== 'new') return false;
    } else if (section === 'contacted') {
      if (lead.status !== 'contacted') return false;
    } else if (section === 'in_discussion') {
      if (lead.status !== 'in_discussion') return false;
    } else if (section === 'won') {
      if (lead.status !== 'won') return false;
    } else if (section === 'lost') {
      if (lead.status !== 'lost') return false;
    }

    // 2. Contact Method Filter
    if (contactMethod === 'phone') {
      if (!hasPhone) return false;
    } else if (contactMethod === 'email') {
      if (!hasEmail) return false;
    } else if (contactMethod === 'phone_only') {
      if (cType !== 'phone_only') return false;
    } else if (contactMethod === 'email_only') {
      if (cType !== 'email_only') return false;
    } else if (contactMethod === 'both') {
      if (cType !== 'both') return false;
    } else if (contactMethod === 'missing') {
      if (cType !== 'missing') return false;
    }

    // 3. Country Filter (e.g. for International Leads or All Leads)
    if (country && country !== 'all') {
      if (pCountry.toLowerCase() !== country.toLowerCase()) return false;
    }

    // 4. Lead Status Filter (when combined with Indian / International / All sections)
    if (status && status !== 'all') {
      if (lead.status !== status) return false;
    }

    // 5. Search Query Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchCompany = lead.businessName.toLowerCase().includes(q);
      const matchCity = lead.city.toLowerCase().includes(q);
      const matchCountry = (lead.country || '').toLowerCase().includes(q);
      const matchPhoneCountry = pCountry.toLowerCase().includes(q);
      const matchDomain = (lead.normalizedDomain || '').toLowerCase().includes(q);
      const matchContact = Boolean(lead.contactName && lead.contactName.toLowerCase().includes(q));
      const matchPhone = Boolean(lead.businessPhone && lead.businessPhone.includes(q)) || 
        Boolean(lead.normalizedPhone && lead.normalizedPhone.includes(q));
      const matchEmail = Boolean(lead.businessEmail && lead.businessEmail.toLowerCase().includes(q)) ||
        Boolean(lead.normalizedEmail && lead.normalizedEmail.toLowerCase().includes(q));
      const matchService = (lead.serviceOpportunity || '').toLowerCase().includes(q);

      if (!matchCompany && !matchCity && !matchCountry && !matchPhoneCountry && 
          !matchDomain && !matchContact && !matchPhone && !matchEmail && !matchService) {
        return false;
      }
    }

    return true;
  });
};

/**
 * Dynamically extract all detected countries with non-zero lead counts (Requirement 3)
 */
export const getAvailableCountries = (leads: Lead[]): { code: string; name: string; flag: string; count: number }[] => {
  const counts = new Map<string, { code: string; name: string; count: number }>();

  for (const lead of leads) {
    if (!lead.hasValidPhone) continue;
    const code = lead.phoneCountryCode;
    const name = lead.phoneCountry;
    if (!name || name === 'Unknown') continue;

    const key = name;
    const existing = counts.get(key);
    if (existing) {
      existing.count++;
    } else {
      counts.set(key, { code: code || '', name, count: 1 });
    }
  }

  const result: { code: string; name: string; flag: string; count: number }[] = [];
  counts.forEach((val) => {
    result.push({
      code: val.code,
      name: val.name,
      flag: getCountryFlag(val.code),
      count: val.count,
    });
  });

  // Sort descending by count, then alphabetically
  return result.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
};

/**
 * Calculate accurate summary metrics across leads (Requirement 7)
 */
export const calculateLeadMetrics = (leads: Lead[]): LeadMetrics => {
  let indianLeads = 0;
  let internationalLeads = 0;
  let phoneLeads = 0;
  let emailLeads = 0;
  let phoneOnlyLeads = 0;
  let emailOnlyLeads = 0;
  let bothPhoneAndEmailLeads = 0;
  let missingContactLeads = 0;

  for (const lead of leads) {
    const hasPhone = lead.hasValidPhone !== undefined ? lead.hasValidPhone : Boolean(lead.businessPhone && lead.businessPhone.trim());
    const hasEmail = lead.hasValidEmail !== undefined ? lead.hasValidEmail : Boolean(lead.businessEmail && lead.businessEmail.trim());
    const cType = lead.contactType || (hasPhone && hasEmail ? 'both' : hasPhone ? 'phone_only' : hasEmail ? 'email_only' : 'missing');
    const pCountryCode = lead.phoneCountryCode;
    const pCountry = lead.phoneCountry;

    if (pCountryCode === 'IN' || pCountry === 'India') {
      indianLeads++;
    } else if (hasPhone && pCountryCode && pCountryCode !== 'IN' && pCountry !== 'India') {
      internationalLeads++;
    }

    if (hasPhone) phoneLeads++;
    if (hasEmail) emailLeads++;

    if (cType === 'phone_only') phoneOnlyLeads++;
    else if (cType === 'email_only') emailOnlyLeads++;
    else if (cType === 'both') bothPhoneAndEmailLeads++;
    else if (cType === 'missing') missingContactLeads++;
  }

  return {
    totalLeads: leads.length,
    indianLeads,
    internationalLeads,
    phoneLeads,
    emailLeads,
    phoneOnlyLeads,
    emailOnlyLeads,
    bothPhoneAndEmailLeads,
    missingContactLeads,
  };
};
