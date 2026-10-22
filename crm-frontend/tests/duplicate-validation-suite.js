let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

// Logic mirror from db.ts
const normalizeDomain = (url) => {
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

const normalizeEmail = (email) => {
  if (!email) return '';
  const e = email.trim().toLowerCase();
  if (e.includes('@') && e.includes('.')) return e;
  return '';
};

const normalizePhone = (phone) => {
  if (!phone) return '';
  const digits = phone.replace(/[^\d]/g, '');
  if (digits.length >= 7) {
    return digits.length > 10 ? digits.slice(-10) : digits;
  }
  return '';
};

const normalizeBusinessName = (name) => {
  if (!name) return '';
  return name.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
};

const checkIsDuplicateLead = (candidate, existingLeads) => {
  const cEmail = normalizeEmail(candidate.businessEmail || candidate.email);
  const cDomain = normalizeDomain(candidate.normalizedDomain || candidate.website || '');
  const cPhone = normalizePhone(candidate.businessPhone || candidate.phone);
  const cName = normalizeBusinessName(candidate.businessName || candidate.companyName || candidate.name);

  for (const existing of existingLeads) {
    if (candidate.id && existing.id === candidate.id) continue;

    const eEmail = normalizeEmail(existing.businessEmail || existing.email);
    if (cEmail && eEmail && cEmail === eEmail) {
      return { isDuplicate: true, reason: `Lead with email "${cEmail}" already exists (${existing.businessName})` };
    }

    const eDomain = normalizeDomain(existing.normalizedDomain || existing.website || '');
    if (cDomain && eDomain && cDomain === eDomain) {
      return { isDuplicate: true, reason: `Lead with domain "${cDomain}" already exists (${existing.businessName})` };
    }

    const ePhone = normalizePhone(existing.businessPhone || existing.phone);
    if (cPhone && ePhone && cPhone === ePhone) {
      return { isDuplicate: true, reason: `Lead with phone number "${existing.businessPhone || cPhone}" already exists (${existing.businessName})` };
    }

    const eName = normalizeBusinessName(existing.businessName || existing.companyName || existing.name);
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

const deduplicateLeadsList = (leads) => {
  const seenIds = new Set();
  const seenEmails = new Set();
  const seenDomains = new Set();
  const seenPhones = new Set();
  const seenNames = new Set();
  const unique = [];

  for (const l of leads) {
    if (seenIds.has(l.id)) continue;

    const email = normalizeEmail(l.businessEmail);
    if (email && seenEmails.has(email)) continue;

    const domain = normalizeDomain(l.normalizedDomain || l.website);
    if (domain && seenDomains.has(domain)) continue;

    const phone = normalizePhone(l.businessPhone);
    if (phone && seenPhones.has(phone)) continue;

    const name = normalizeBusinessName(l.businessName);
    if (name && name.length >= 4 && seenNames.has(name) && (l.sourceFileName || email || domain)) continue;

    seenIds.add(l.id);
    if (email) seenEmails.add(email);
    if (domain) seenDomains.add(domain);
    if (phone) seenPhones.add(phone);
    if (name) seenNames.add(name);

    unique.push(l);
  }
  return unique;
};

console.log('\n================================================================');
console.log(' CAVENTRA CRM — DUPLICATE PREVENTION & VALIDATION TEST SUITE');
console.log('================================================================\n');

// Sample existing database
const existingLeads = [
  {
    id: 'lead_1',
    businessName: 'Apex Dental Care',
    normalizedDomain: 'apexdental.com',
    website: 'https://apexdental.com',
    businessEmail: 'contact@apexdental.com',
    businessPhone: '+91 98765 43210',
    city: 'Mumbai',
    country: 'India',
    status: 'new',
  },
  {
    id: 'lead_2',
    businessName: 'Metro Auto Works',
    normalizedDomain: 'metroautoworks.in',
    website: 'https://www.metroautoworks.in',
    businessEmail: 'info@metroauto.in',
    businessPhone: '9822334455',
    city: 'Pune',
    country: 'India',
    status: 'contacted',
  }
];

// Test 1: Normalize helpers
assert(normalizeDomain('https://WWW.SubDomain.com/page?query=1') === 'subdomain.com', '1. Domain normalizer handles protocol, www, subpaths, queries');
assert(normalizeDomain('unknown.com') === '', '2. Domain normalizer discards placeholder unknown.com');
assert(normalizeDomain('something.local') === '', '3. Domain normalizer discards local fake domains');
assert(normalizeEmail('  Contact@ApexDental.COM ') === 'contact@apexdental.com', '4. Email normalizer lowercases and trims');
assert(normalizePhone('+91 98765-43210') === '9876543210', '5. Phone normalizer extracts 10 digits cleanly');
assert(normalizeBusinessName('Apex Dental Care!') === 'apexdentalcare', '6. Business name normalizer strips non-alphanumeric chars');

// Test 2: Reject identical email
const dupEmail = checkIsDuplicateLead({
  businessName: 'Apex Clinic Branch 2',
  businessEmail: 'CONTACT@apexdental.com',
}, existingLeads);
assert(dupEmail.isDuplicate === true, '7. Rejects candidate with matching email');

// Test 3: Reject identical domain
const dupDomain = checkIsDuplicateLead({
  businessName: 'Apex New Facility',
  website: 'http://apexdental.com/contact',
}, existingLeads);
assert(dupDomain.isDuplicate === true, '8. Rejects candidate with matching web domain');

// Test 4: Reject identical phone
const dupPhone = checkIsDuplicateLead({
  businessName: 'Another Doctor',
  businessPhone: '9876543210',
}, existingLeads);
assert(dupPhone.isDuplicate === true, '9. Rejects candidate with matching phone number');

// Test 5: Reject identical company name
const dupName = checkIsDuplicateLead({
  businessName: 'Apex Dental Care',
  city: 'Mumbai',
}, existingLeads);
assert(dupName.isDuplicate === true, '10. Rejects candidate with matching company name in same city');

// Test 6: Allow genuinely unique lead
const uniqueLead = checkIsDuplicateLead({
  businessName: 'Zenith Legal Advisors',
  website: 'https://zenithlegal.org',
  businessEmail: 'hello@zenithlegal.org',
  businessPhone: '9123456789',
}, existingLeads);
assert(uniqueLead.isDuplicate === false, '11. Allows genuinely unique lead');

// Test 7: Allow updating existing lead without self-collision
const selfUpdate = checkIsDuplicateLead({
  id: 'lead_1',
  businessName: 'Apex Dental Care',
  businessEmail: 'contact@apexdental.com',
  website: 'https://apexdental.com',
}, existingLeads);
assert(selfUpdate.isDuplicate === false, '12. Allows updating existing lead without false-positive self collision');

// Test 8: Deduplicate list in-memory helper
const rawList = [
  existingLeads[0],
  { ...existingLeads[0], id: 'duplicate_copy_1' },
  existingLeads[1],
  { ...existingLeads[1], id: 'duplicate_copy_2' },
  {
    id: 'lead_3',
    businessName: 'Zenith Legal',
    businessEmail: 'zenith@law.com',
    normalizedDomain: 'zenithlaw.com',
  }
];
const cleanList = deduplicateLeadsList(rawList);
assert(cleanList.length === 3, '13. deduplicateLeadsList cleans multi-copy arrays to exact unique entities');
assert(cleanList.map(l => l.businessName).join(', ') === 'Apex Dental Care, Metro Auto Works, Zenith Legal', '14. Preserves correct canonical leads in order');

console.log('\n----------------------------------------------------------------');
console.log(` Summary: ${passed} / ${passed + failed} tests passed successfully.`);
console.log('----------------------------------------------------------------\n');

if (failed > 0) process.exit(1);
process.exit(0);
