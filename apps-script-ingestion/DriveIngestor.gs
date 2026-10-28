/**
 * ============================================================================
 * SCRIPT 1: GOOGLE DRIVE LEAD INGESTION (Run in your OTHER Google Account)
 * Project Name: CAVENTRA CRM Ingestor
 * Folder ID: 1VcNqOmAIhhDIE2FHDY1Aimzn_HCCcFv_
 * ============================================================================
 */

var CONFIG = {
  INBOX_FOLDER_ID: '1VcNqOmAIhhDIE2FHDY1Aimzn_HCCcFv_',
  FIRESTORE_PROJECT_ID: 'caventra-crm'
};

// --- TEST FUNCTION: Check how many files Google Drive sees ---
function testDriveFolderAccess() {
  Logger.log('=== AUDITING GOOGLE DRIVE INBOX FOLDER ===');
  try {
    var folder = DriveApp.getFolderById(CONFIG.INBOX_FOLDER_ID);
    var files = folder.getFiles();
    var count = 0;
    while (files.hasNext()) {
      var f = files.next();
      count++;
    }
    Logger.log('[OK] Success: Connected to folder "' + folder.getName() + '"');
    Logger.log('Total files found in Drive: ' + count);
  } catch (e) {
    Logger.log('[ERROR] Error: ' + e.message);
  }
}

// --- WEB API (Called by CAVENTRA CRM "Sync Drive" button or Outreach) ---
function doGet(e) {
  // If called for health check or quota test
  if (e && e.parameter && (e.parameter.check === 'health' || e.parameter.action === 'health')) {
    return jsonResponse({
      status: 'online',
      service: 'CAVENTRA Official Ingestor & Dispatcher',
      activeSender: Session.getActiveUser().getEmail(),
      remainingDailyEmailQuota: MailApp.getRemainingDailyQuota(),
      timestamp: new Date().toISOString()
    });
  }
  var result = runScheduledIngestion(true);
  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}

// --- WEBHOOK POST API (Handles outreach email dispatch) ---
function doPost(e) {
  try {
    var body = {};
    if (e && e.postData && e.postData.contents) {
      body = JSON.parse(e.postData.contents);
    }
    var action = body.action || '';
    if (action === 'send_email' || action === 'send_outreach') {
      return jsonResponse(handleSendOutreachEmail(body));
    }
    return jsonResponse({ success: false, error: 'Unknown action: ' + action }, 400);
  } catch (err) {
    Logger.log('doPost error: ' + err.toString());
    return jsonResponse({ success: false, error: err.message || 'Server error' }, 500);
  }
}

// --- DISPATCH EMAIL VIA GMAIL ---
function handleSendOutreachEmail(data) {
  var remainingQuota = MailApp.getRemainingDailyQuota();
  if (remainingQuota <= 0) {
    throw new Error('Google Daily Email Quota Reached. Quota resets in 24 hours.');
  }

  var to = (data.to || data.recipientEmail || '').trim().toLowerCase();
  var subject = (data.subject || '').trim();
  var body = data.body || data.text || '';
  var htmlBody = data.html || data.htmlBody || '';
  var fromName = data.fromName || 'CAVENTRA Team';

  if (!to || !subject || (!body && !htmlBody)) {
    throw new Error('Missing required fields: to, subject, or body');
  }

  var options = { name: fromName };
  if (htmlBody) options.htmlBody = htmlBody;

  GmailApp.sendEmail(to, subject, body || subject, options);
  Logger.log('[OK] Outreach email sent to: ' + to);

  return { 
    success: true, 
    to: to, 
    sender: Session.getActiveUser().getEmail(),
    remainingQuota: remainingQuota - 1, 
    sentAt: new Date().toISOString() 
  };
}

function jsonResponse(data, status) {
  var output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

// --- MAIN INGESTION FUNCTION (Newest-First Processing) ---
function runScheduledIngestion(isWebInvocation) {
  Logger.log('=== CAVENTRA LEAD INGESTION RUN STARTED ===');
  var folder = DriveApp.getFolderById(CONFIG.INBOX_FOLDER_ID);
  var files = folder.getFiles();
  var allExtractedLeads = [];
  var fileCount = 0;

  var fileList = [];
  while (files.hasNext()) {
    var file = files.next();
    var fileName = file.getName();
    if (fileName.indexOf('[Converted]') === 0) continue;

    var lowerName = fileName.toLowerCase();
    var isSheet = (file.getMimeType() === MimeType.GOOGLE_SHEETS);
    var isExcel = (
      lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls') || lowerName.endsWith('.csv') ||
      file.getMimeType() === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.getMimeType() === 'application/vnd.ms-excel'
    );

    if (isSheet || isExcel) fileList.push(file);
  }

  fileList.sort(function(a, b) {
    return b.getLastUpdated().getTime() - a.getLastUpdated().getTime();
  });

  Logger.log('Total spreadsheet workbooks found: ' + fileList.length);

  var maxToProcess = isWebInvocation ? Math.min(fileList.length, 15) : fileList.length;

  for (var i = 0; i < maxToProcess; i++) {
    var f = fileList[i];
    var leads = parseSpreadsheetFile(f, folder);
    if (leads && leads.length > 0) {
      allExtractedLeads = allExtractedLeads.concat(leads);
      fileCount++;
      Logger.log('[OK] (' + (i + 1) + '/' + maxToProcess + ') Extracted ' + leads.length + ' leads from: ' + f.getName());
    }
  }

  Logger.log('=== TOTAL EXTRACTED: ' + allExtractedLeads.length + ' LEADS FROM ' + fileCount + ' WORKBOOKS ===');

  return { 
    success: true, 
    status: 'success',
    filesFound: fileCount, 
    totalFiles: fileList.length, 
    totalLeads: allExtractedLeads.length, 
    leads: allExtractedLeads 
  };
}

// --- EXCEL & SPREADSHEET PARSER (Reads ALL Tabs / Sheets in Every Workbook) ---
function parseSpreadsheetFile(file, folder) {
  var fileName = file.getName();
  var mimeType = file.getMimeType();
  var lowerName = fileName.toLowerCase();

  var isSheet = (mimeType === MimeType.GOOGLE_SHEETS);
  var isExcel = (
    mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    mimeType === 'application/vnd.ms-excel' ||
    lowerName.endsWith('.xlsx') ||
    lowerName.endsWith('.xls')
  );
  var isCsv = (mimeType === 'text/csv' || lowerName.endsWith('.csv'));

  if (!isSheet && !isExcel && !isCsv) return [];
  var spreadsheet = null;

  try {
    if (isSheet) {
      spreadsheet = SpreadsheetApp.open(file);
    } else {
      var convertedTitle = '[Converted] ' + fileName;
      var convertedFile = null;
      if (folder) {
        var matches = folder.getFilesByName(convertedTitle);
        if (matches.hasNext()) {
          var existingSheet = matches.next();
          if (existingSheet.getLastUpdated() >= file.getLastUpdated()) {
            convertedFile = existingSheet;
          } else {
            try { existingSheet.setTrashed(true); } catch (e) {}
          }
        }
      }

      if (convertedFile) {
        spreadsheet = SpreadsheetApp.openById(convertedFile.getId());
      } else {
        var blob = file.getBlob();
        var insertConfig = { title: convertedTitle, mimeType: MimeType.GOOGLE_SHEETS };
        if (folder) insertConfig.parents = [{ id: folder.getId() }];
        var tempSheet = Drive.Files.insert(insertConfig, blob, { convert: true });
        spreadsheet = SpreadsheetApp.openById(tempSheet.id);
      }
    }

    var sheets = spreadsheet.getSheets();
    if (!sheets || sheets.length === 0) return [];
    var extractedLeads = [];

    for (var s = 0; s < sheets.length; s++) {
      var currentSheet = sheets[s];
      var data = currentSheet.getDataRange().getValues();
      if (!data || data.length < 2) continue;

      var headerRowIdx = findHeaderRowIndex(data);
      var headers = data[headerRowIdx];
      var colMap = mapHeaders(headers);
      var sourceLabel = fileName + (sheets.length > 1 ? ' (' + currentSheet.getName() + ')' : '');

      for (var r = headerRowIdx + 1; r < data.length; r++) {
        var row = data[r];
        var lead = smartExtractLeadFromRow(row, colMap, sourceLabel);
        if (lead) {
          extractedLeads.push(lead);
        }
      }
    }
    return extractedLeads;
  } catch (err) {
    Logger.log('Error parsing ' + fileName + ': ' + err.message);
    return [];
  }
}

// --- INTELLIGENT HEADER ROW DETECTOR ---
function findHeaderRowIndex(data) {
  var keywords = [
    'company', 'business', 'name', 'client', 'firm', 'website', 'domain', 'url', 'web', 'site',
    'email', 'mail', 'phone', 'mobile', 'tel', 'contact', 'city', 'country', 'industry', 'condition', 'notes'
  ];
  var bestIdx = -1;
  var maxMatches = 0;

  for (var r = 0; r < Math.min(data.length, 10); r++) {
    var row = data[r];
    var matches = 0;
    for (var c = 0; c < row.length; c++) {
      var cell = String(row[c] || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      if (!cell) continue;
      for (var k = 0; k < keywords.length; k++) {
        var kw = keywords[k].replace(/[^a-z0-9]/g, '');
        if (cell === kw || cell.indexOf(kw) !== -1) {
          matches++;
          break;
        }
      }
    }
    if (matches > maxMatches) {
      maxMatches = matches;
      bestIdx = r;
    }
  }
  return bestIdx >= 0 ? bestIdx : 0;
}

// --- PRECISION COLUMN HEADER MAPPING (Prevents Swapping or Random Guessing) ---
function mapHeaders(headers) {
  var map = { company: -1, website: -1, contact: -1, email: -1, phone: -1, city: -1, country: -1, industry: -1, notes: -1 };

  var contactList = [
    'contactname', 'contactperson', 'personname', 'ownername', 'foundername', 
    'fullname', 'decisionmaker', 'contact', 'person', 'owner', 'founder', 
    'ceo', 'firstname', 'lastname'
  ];

  var companyList = [
    'companyname', 'businessname', 'firmname', 'agencyname', 'orgname', 
    'organizationname', 'brandname', 'storename', 'shopname', 'clientname'
  ];

  // Pass 1: Identify Contact Person columns FIRST (so "Contact Name" is NEVER matched as "Company Name")
  for (var i = 0; i < headers.length; i++) {
    var raw = String(headers[i] || '').trim().toLowerCase();
    var h = raw.replace(/[^a-z0-9]/g, '');
    if (!h) continue;

    if (map.contact === -1) {
      if (contactList.indexOf(h) !== -1 ||
          raw.indexOf('contact person') !== -1 || 
          raw.indexOf('contact name') !== -1 || 
          raw.indexOf('decision maker') !== -1 || 
          raw.indexOf('owner name') !== -1) {
        map.contact = i;
      }
    }
  }

  // Pass 2: High-confidence Company / Business Name
  for (var i = 0; i < headers.length; i++) {
    if (i === map.contact) continue;
    var raw = String(headers[i] || '').trim().toLowerCase();
    var h = raw.replace(/[^a-z0-9]/g, '');
    if (!h) continue;

    // Never match serial number or ID columns as Company
    if (h === 'id' || h === 'sno' || h === 'srno' || h === 'no' || h === 'serial' || h === 'clientid' || h === 'accountid' || h === 'leadid' || h === 'code') {
      continue;
    }

    if (companyList.indexOf(h) !== -1 ||
        raw.indexOf('company name') !== -1 || 
        raw.indexOf('business name') !== -1 || 
        raw.indexOf('firm name') !== -1) {
      map.company = i;
      break;
    }
  }

  // Pass 3: Standalone "Company", "Business", "Firm", "Agency"
  if (map.company === -1) {
    for (var i = 0; i < headers.length; i++) {
      if (i === map.contact) continue;
      var raw = String(headers[i] || '').trim().toLowerCase();
      var h = raw.replace(/[^a-z0-9]/g, '');
      if (h === 'id' || h === 'sno' || h === 'srno' || h === 'no' || h === 'clientid') continue;

      if (['company', 'business', 'firm', 'agency', 'client', 'organization', 'brand'].indexOf(h) !== -1 ||
          (raw.indexOf('company') !== -1 && raw.indexOf('email') === -1 && raw.indexOf('id') === -1) ||
          (raw.indexOf('business') !== -1 && raw.indexOf('email') === -1 && raw.indexOf('id') === -1)) {
        map.company = i;
        break;
      }
    }
  }

  // Pass 4: Standalone "Name" or "Title" (ONLY if no explicit company column exists and not contact)
  if (map.company === -1) {
    for (var i = 0; i < headers.length; i++) {
      if (i === map.contact) continue;
      var raw = String(headers[i] || '').trim().toLowerCase();
      var h = raw.replace(/[^a-z0-9]/g, '');
      if (h === 'name' || h === 'title') {
        map.company = i;
        break;
      }
    }
  }

  // Pass 5: Match remaining columns
  for (var i = 0; i < headers.length; i++) {
    if (i === map.company || i === map.contact) continue;
    var raw = String(headers[i] || '').trim().toLowerCase();
    var h = raw.replace(/[^a-z0-9]/g, '');
    if (!h) continue;

    // Website / Domain
    if (map.website === -1 && (
      ['website', 'domain', 'url', 'web', 'site', 'websiteurl', 'weburl', 'domainname', 'link'].indexOf(h) !== -1 ||
      raw.indexOf('website') !== -1 || raw.indexOf('domain') !== -1 || raw.indexOf('url') !== -1
    )) {
      map.website = i;
    }
    // Email
    else if (map.email === -1 && (
      ['email', 'businessemail', 'mail', 'emailaddress', 'contactemail', 'primaryemail', 'workemail', 'companyemail'].indexOf(h) !== -1 ||
      raw.indexOf('email') !== -1 || raw.indexOf('mail') !== -1
    )) {
      map.email = i;
    }
    // Phone
    else if (map.phone === -1 && (
      ['phone', 'mobile', 'tel', 'businessphone', 'telephone', 'phonenumber', 'contactnumber', 'telephonenumber', 'mobilenumber', 'phoneno', 'mobileno', 'cell', 'whatsapp'].indexOf(h) !== -1 ||
      raw.indexOf('phone') !== -1 || raw.indexOf('mobile') !== -1 || raw.indexOf('tel') !== -1
    )) {
      map.phone = i;
    }
    // City
    else if (map.city === -1 && ['city', 'location', 'town', 'district'].indexOf(h) !== -1) {
      map.city = i;
    }
    // Country / State
    else if (map.country === -1 && ['country', 'nation', 'region', 'state'].indexOf(h) !== -1) {
      map.country = i;
    }
    // Industry
    else if (map.industry === -1 && ['industry', 'sector', 'category', 'niche', 'type'].indexOf(h) !== -1) {
      map.industry = i;
    }
    // Notes
    else if (map.notes === -1 && ['notes', 'comments', 'description', 'need', 'condition', 'audit'].indexOf(h) !== -1) {
      map.notes = i;
    }
  }

  return map;
}

// --- EXACT LEAD EXTRACTOR (No Random Guessing) ---
function smartExtractLeadFromRow(row, colMap, fileName) {
  var rowText = row.join(' ').trim();
  if (!rowText || rowText.length < 4) return null;

  var lowerJoined = rowText.toLowerCase();
  if (lowerJoined.indexOf('caventra') !== -1 && (lowerJoined.indexOf('lead') !== -1 || lowerJoined.indexOf('pipeline') !== -1 || lowerJoined.indexOf('workbook') !== -1)) return null;
  if (lowerJoined.indexOf('company name') !== -1 && lowerJoined.indexOf('email') !== -1) return null;
  if (lowerJoined.indexOf('total leads') !== -1 || lowerJoined.indexOf('summary report') !== -1) return null;

  // 1. Strict extraction from mapped columns ONLY
  var company = colMap.company !== -1 && colMap.company < row.length ? String(row[colMap.company] || '').trim() : '';
  var contact = colMap.contact !== -1 && colMap.contact < row.length ? String(row[colMap.contact] || '').trim() : '';
  var website = colMap.website !== -1 && colMap.website < row.length ? String(row[colMap.website] || '').trim() : '';
  var email = colMap.email !== -1 && colMap.email < row.length ? String(row[colMap.email] || '').trim().toLowerCase() : '';
  var phone = colMap.phone !== -1 && colMap.phone < row.length ? String(row[colMap.phone] || '').trim() : '';
  var city = colMap.city !== -1 && colMap.city < row.length ? String(row[colMap.city] || '').trim() : '';
  var country = colMap.country !== -1 && colMap.country < row.length ? String(row[colMap.country] || '').trim() : '';
  var industry = colMap.industry !== -1 && colMap.industry < row.length ? String(row[colMap.industry] || '').trim() : '';
  var notes = colMap.notes !== -1 && colMap.notes < row.length ? String(row[colMap.notes] || '').trim() : '';

  // Clean company name: remove leading numbers like "1. ", "01 ", "#1 "
  company = company.replace(/^[\d#\-_.]+\s*[-:.)]\s*/, '').trim();

  // If website was not in mapped column, detect URL cell
  if (!website) {
    for (var c = 0; c < row.length; c++) {
      if (c === colMap.company || c === colMap.contact) continue;
      var cellVal = String(row[c] || '').trim().toLowerCase();
      if ((cellVal.indexOf('http') === 0 || cellVal.indexOf('www.') === 0 || cellVal.indexOf('.com') !== -1 || cellVal.indexOf('.in') !== -1 || cellVal.indexOf('.co') !== -1 || cellVal.indexOf('.org') !== -1) && cellVal.indexOf('@') === -1) {
        website = cellVal;
        break;
      }
    }
  }

  // If email was not in mapped column, detect email cell
  if (!email || email.indexOf('@') === -1) {
    for (var c = 0; c < row.length; c++) {
      if (c === colMap.company || c === colMap.contact) continue;
      var cellVal = String(row[c] || '').trim();
      if (cellVal.indexOf('@') !== -1 && cellVal.indexOf('.') !== -1 && !cellVal.startsWith('http')) {
        email = cellVal.toLowerCase();
        break;
      }
    }
  }

  // If phone was not in mapped column, detect phone cell
  var cleanPhone = phone.replace(/[^\d+]/g, '');
  if (cleanPhone.replace(/[^\d]/g, '').length < 7) {
    for (var c = 0; c < row.length; c++) {
      if (c === colMap.company || c === colMap.contact) continue;
      var cellVal = String(row[c] || '').trim();
      var digits = cellVal.replace(/[^\d]/g, '');
      if (digits.length >= 7 && digits.length <= 15 && cellVal.indexOf('@') === -1 && cellVal.indexOf('.com') === -1) {
        phone = cellVal;
        cleanPhone = phone.replace(/[^\d+]/g, '');
        break;
      }
    }
  }

  // If company name was empty or just a number, derive clean business name from website domain
  // (NEVER randomly pick other cells like city, notes, or status!)
  if (!company || /^[\d\s\-_.,#]+$/.test(company)) {
    if (website) {
      var cleanDom = website.replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0].split('.')[0];
      if (cleanDom && cleanDom.length >= 3 && cleanDom !== 'unknown') {
        company = cleanDom.replace(/[-_]/g, ' ').replace(/\b\w/g, function(l) { return l.toUpperCase(); });
      }
    }
  }

  // Reject invalid / generic placeholder names & spreadsheet calculation summaries
  var compLower = company.toLowerCase();
  if (!company || compLower.indexOf('caventra') !== -1 || compLower.indexOf('leads sheet') !== -1) return null;
  if (compLower === 'total / average' || compLower.indexOf('total /') === 0 || compLower === 'total' || compLower === 'average' || compLower === 'subtotal' || compLower === 'summary' || compLower.indexOf('summary ') === 0) {
    return null;
  }
  var junkPhrases = [
    'placeholder text', 'lorem ipsum', '[business name]', '[owner/team]', 'gmail header',
    'quick upgrade for', 'outreach (email', 'email + sms', 'legacy php', 'sample template', 'outreach pitch'
  ];
  for (var jp = 0; jp < junkPhrases.length; jp++) {
    if (compLower.indexOf(junkPhrases[jp]) !== -1) return null;
  }
  if (['company', 'company name', 'business', 'business name', '#', 's.no', 'sr no', 'id', 'name', 'title', 'none', 'n/a', 'null'].indexOf(compLower) !== -1) {
    return null;
  }

  // Validation: Must have business name AND at least one identifier (email, phone, website, or contact)
  var hasEmail = Boolean(email && email.indexOf('@') !== -1 && email.indexOf('.') !== -1);
  var hasPhone = Boolean(cleanPhone.replace(/[^\d]/g, '').length >= 7);
  var hasWebsite = Boolean(website && website.length >= 3);
  var hasContact = Boolean(contact && contact.length >= 2);

  if (!hasEmail && !hasPhone && !hasWebsite && !hasContact) return null;

  return {
    company: company,
    website: website,
    contactName: contact,
    email: hasEmail ? email : '',
    phone: hasPhone ? phone : '',
    city: city || '',
    country: country || '',
    industry: industry || '',
    notes: notes || '',
    source: 'Google Drive (' + fileName + ')',
    status: 'new'
  };
}
