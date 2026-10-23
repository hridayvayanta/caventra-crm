/**
 * ============================================================================
 * CAVENTRA CRM — ALL-IN-ONE GOOGLE DRIVE LEAD INGESTION SCRIPT (₹0 BUDGET)
 * ============================================================================
 * Folder ID: 1VcNqOmAIhhDIE2FHDY1Aimzn_HCCcFv_
 */

var CONFIG = {
  // Your connected Google Drive Folder with the Excel files
  INBOX_FOLDER_ID: '1VcNqOmAIhhDIE2FHDY1Aimzn_HCCcFv_',

  // Optional: Your Firebase Project ID
  FIRESTORE_PROJECT_ID: 'caventra-crm'
};

// --- TEST FUNCTION: Run this in Apps Script Editor to see EVERY file in your Drive folder ---
function testDriveFolderAccess() {
  Logger.log('=== AUDITING GOOGLE DRIVE INBOX FOLDER ===');
  Logger.log('Folder ID: ' + CONFIG.INBOX_FOLDER_ID);
  try {
    var folder = DriveApp.getFolderById(CONFIG.INBOX_FOLDER_ID);
    Logger.log('✓ SUCCESS: Connected to folder "' + folder.getName() + '"');
    var files = folder.getFiles();
    var count = 0;
    while (files.hasNext()) {
      var f = files.next();
      count++;
      Logger.log('File ' + count + ': "' + f.getName() + '" | Type: ' + f.getMimeType() + ' | Size: ' + (f.getSize() / 1024).toFixed(1) + ' KB');
    }
    Logger.log('=== TOTAL FILES FOUND IN DRIVE: ' + count + ' ===');
  } catch (e) {
    Logger.log('❌ FAILED TO ACCESS FOLDER: ' + e.message);
  }
}

// --- MAIN INGESTION FUNCTION ---
function runScheduledIngestion(isWebInvocation) {
  Logger.log('=== CAVENTRA LEAD INGESTION RUN STARTED ===');
  var folder = DriveApp.getFolderById(CONFIG.INBOX_FOLDER_ID);
  var files = folder.getFiles();
  var allExtractedLeads = [];
  var fileCount = 0;

  // 1. Collect all valid spreadsheet workbooks
  var fileList = [];
  while (files.hasNext()) {
    var file = files.next();
    var fileName = file.getName();
    // Skip cached converted sheets
    if (fileName.indexOf('[Converted]') === 0) continue;

    var lowerName = fileName.toLowerCase();
    var isSheet = (file.getMimeType() === MimeType.GOOGLE_SHEETS);
    var isExcel = (
      lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls') || lowerName.endsWith('.csv') ||
      file.getMimeType() === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.getMimeType() === 'application/vnd.ms-excel'
    );

    if (isSheet || isExcel) {
      fileList.push(file);
    }
  }

  // 2. Sort files DESCENDING by last updated date (NEWEST files processed first!)
  fileList.sort(function(a, b) {
    return b.getLastUpdated().getTime() - a.getLastUpdated().getTime();
  });

  Logger.log('Total spreadsheet workbooks found: ' + fileList.length);

  // 3. To guarantee instant web response without timeout, process the most recent files
  // (e.g. up to 15 newest workbooks per sync; repeat sync grabs any additional)
  var maxToProcess = isWebInvocation ? Math.min(fileList.length, 15) : fileList.length;

  for (var i = 0; i < maxToProcess; i++) {
    var f = fileList[i];
    var leads = parseSpreadsheetFile(f, folder);
    if (leads && leads.length > 0) {
      allExtractedLeads = allExtractedLeads.concat(leads);
      fileCount++;
      Logger.log('✓ (' + (i + 1) + '/' + maxToProcess + ') Extracted ' + leads.length + ' leads from: ' + f.getName());
    }
  }

  Logger.log('=== TOTAL VALIDATED LEADS EXTRACTED: ' + allExtractedLeads.length + ' FROM ' + fileCount + ' WORKBOOKS ===');

  return { 
    success: true, 
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
        if (folder) {
          insertConfig.parents = [{ id: folder.getId() }];
        }
        var tempSheet = Drive.Files.insert(insertConfig, blob, { convert: true });
        spreadsheet = SpreadsheetApp.openById(tempSheet.id);
      }
    }

    var sheets = spreadsheet.getSheets();
    if (!sheets || sheets.length === 0) return [];

    var extractedLeads = [];

    // Parse EVERY sheet / tab in the workbook (never skip tab 2, 3, etc.)
    for (var s = 0; s < sheets.length; s++) {
      var currentSheet = sheets[s];
      var sheetName = currentSheet.getName();
      var data = currentSheet.getDataRange().getValues();
      if (!data || data.length < 2) continue;

      var headerRowIdx = findHeaderRowIndex(data);
      var headers = data[headerRowIdx];
      var colMap = mapHeaders(headers);

      var sourceLabel = fileName + (sheets.length > 1 ? ' (' + sheetName + ')' : '');

      for (var r = headerRowIdx + 1; r < data.length; r++) {
        var row = data[r];
        var lead = smartExtractLeadFromRow(row, colMap, sourceLabel);
        if (lead) {
          extractedLeads.push(lead);
        }
      }
    }

    Logger.log('File "' + fileName + '": Found ' + extractedLeads.length + ' leads across ' + sheets.length + ' sheet(s)');
    return extractedLeads;
  } catch (err) {
    Logger.log('❌ Error parsing ' + fileName + ': ' + err.message);
    return [];
  }
}

// --- DETECT WHICH ROW ACTUALLY CONTAINS THE HEADERS ---
function findHeaderRowIndex(data) {
  var keywords = [
    'company', 'business', 'name', 'client', 'firm',
    'website', 'domain', 'url', 'web', 'site',
    'email', 'mail', 'phone', 'mobile', 'tel', 'contact',
    'city', 'country', 'industry', 'condition', 'notes'
  ];
  var bestIdx = 0;
  var maxMatches = 0;

  for (var r = 0; r < Math.min(data.length, 10); r++) {
    var row = data[r];
    var matches = 0;
    for (var c = 0; c < row.length; c++) {
      var cell = String(row[c] || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      if (!cell) continue;
      for (var k = 0; k < keywords.length; k++) {
        if (cell === keywords[k] || cell.indexOf(keywords[k]) !== -1) {
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
  return bestIdx;
}

// --- SMART ROW EXTRACTOR & VALIDATOR ---
function smartExtractLeadFromRow(row, colMap, fileName) {
  var rowText = row.join(' ').trim();
  if (!rowText || rowText.length < 4) return null;

  // Filter out sheet titles, banners, or header repeats
  var lowerJoined = rowText.toLowerCase();
  if (lowerJoined.indexOf('caventra') !== -1 && (lowerJoined.indexOf('lead') !== -1 || lowerJoined.indexOf('pipeline') !== -1 || lowerJoined.indexOf('workbook') !== -1)) {
    return null;
  }
  if (lowerJoined.indexOf('company name') !== -1 && lowerJoined.indexOf('email') !== -1) {
    return null;
  }
  if (lowerJoined.indexOf('total leads') !== -1 || lowerJoined.indexOf('summary report') !== -1) {
    return null;
  }

  var company = colMap.company !== -1 ? String(row[colMap.company] || '').trim() : '';
  var email = colMap.email !== -1 ? String(row[colMap.email] || '').trim().toLowerCase() : '';
  var phone = colMap.phone !== -1 ? String(row[colMap.phone] || '').trim() : '';
  var website = colMap.website !== -1 ? String(row[colMap.website] || '').trim() : '';
  var contact = colMap.contact !== -1 ? String(row[colMap.contact] || '').trim() : '';
  var city = colMap.city !== -1 ? String(row[colMap.city] || '').trim() : '';
  var country = colMap.country !== -1 ? String(row[colMap.country] || '').trim() : '';
  var industry = colMap.industry !== -1 ? String(row[colMap.industry] || '').trim() : '';
  var notes = colMap.notes !== -1 ? String(row[colMap.notes] || '').trim() : '';

  // 1. Cell-level Email detection (if mapped column missed it)
  if (!email || email.indexOf('@') === -1) {
    for (var c = 0; c < row.length; c++) {
      var cellVal = String(row[c] || '').trim();
      if (cellVal.indexOf('@') !== -1 && cellVal.indexOf('.') !== -1 && !cellVal.startsWith('http')) {
        email = cellVal.toLowerCase();
        break;
      }
    }
  }

  // 2. Cell-level Phone detection (if mapped column missed it)
  var cleanPhone = phone.replace(/[^\d+]/g, '');
  if (cleanPhone.replace(/[^\d]/g, '').length < 7) {
    for (var c = 0; c < row.length; c++) {
      var cellVal = String(row[c] || '').trim();
      var digits = cellVal.replace(/[^\d]/g, '');
      if (digits.length >= 7 && digits.length <= 15 && cellVal.indexOf('@') === -1 && cellVal.indexOf('.com') === -1) {
        phone = cellVal;
        cleanPhone = phone.replace(/[^\d+]/g, '');
        break;
      }
    }
  }

  // 3. Cell-level Website detection (if mapped column missed it)
  if (!website) {
    for (var c = 0; c < row.length; c++) {
      var cellVal = String(row[c] || '').trim().toLowerCase();
      if ((cellVal.indexOf('http') === 0 || cellVal.indexOf('www.') === 0 || cellVal.indexOf('.com') !== -1 || cellVal.indexOf('.in') !== -1 || cellVal.indexOf('.co') !== -1 || cellVal.indexOf('.org') !== -1) && cellVal.indexOf('@') === -1) {
        website = cellVal;
        break;
      }
    }
  }

  // 4. Company Name recovery (if mapped column was just a serial number or empty)
  if (!company || /^[\d\s\-_.]+$/.test(company)) {
    for (var c = 0; c < row.length; c++) {
      var cellVal = String(row[c] || '').trim();
      if (cellVal && cellVal !== email && cellVal !== phone && cellVal !== website && !/^[\d\s\-_.]+$/.test(cellVal)) {
        if (cellVal.toLowerCase().indexOf('caventra') === -1 && cellVal.length >= 2) {
          company = cellVal;
          break;
        }
      }
    }
  }

  // Reject titles masquerading as companies
  var compLower = company.toLowerCase();
  if (!company || compLower.indexOf('caventra') !== -1 || compLower.indexOf('leads sheet') !== -1 || compLower.indexOf('master pipeline') !== -1) {
    return null;
  }
  if (compLower === 'company' || compLower === 'company name' || compLower === 'business' || compLower === 'business name' || compLower === '#') {
    return null;
  }

  // Validation: Must have at least one identifier (email, phone, website, or contact name)
  var hasEmail = Boolean(email && email.indexOf('@') !== -1 && email.indexOf('.') !== -1);
  var hasPhone = Boolean(cleanPhone.replace(/[^\d]/g, '').length >= 7);
  var hasWebsite = Boolean(website && website.length >= 3);
  var hasContact = Boolean(contact && contact.length >= 2);

  if (!hasEmail && !hasPhone && !hasWebsite && !hasContact) {
    return null; // Skip truly blank or useless rows
  }

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

// --- BROAD COLUMN HEADER MAPPING ---
function mapHeaders(headers) {
  var map = { company: -1, website: -1, contact: -1, email: -1, phone: -1, city: -1, country: -1, industry: -1, notes: -1 };

  for (var i = 0; i < headers.length; i++) {
    var rawH = String(headers[i] || '').trim().toLowerCase();
    var h = rawH.replace(/[^a-z0-9]/g, '');

    // Company Name
    if (map.company === -1 && (
      ['company', 'companyname', 'business', 'businessname', 'name', 'client', 'firm', 'organization', 'agency'].indexOf(h) !== -1 ||
      rawH.indexOf('company') !== -1 || rawH.indexOf('business') !== -1
    )) {
      map.company = i;
    }
    // Website
    else if (map.website === -1 && (
      ['website', 'domain', 'url', 'web', 'site', 'websiteurl', 'link'].indexOf(h) !== -1 ||
      rawH.indexOf('website') !== -1 || rawH.indexOf('domain') !== -1
    )) {
      map.website = i;
    }
    // Contact Person
    else if (map.contact === -1 && (
      ['contact', 'contactname', 'person', 'owner', 'fullname', 'decisionmaker', 'founder', 'ceo'].indexOf(h) !== -1 ||
      rawH.indexOf('contact person') !== -1 || rawH.indexOf('contact name') !== -1
    )) {
      map.contact = i;
    }
    // Email
    else if (map.email === -1 && (
      ['email', 'businessemail', 'mail', 'emailaddress', 'contactemail', 'primaryemail', 'workemail', 'companyemail'].indexOf(h) !== -1 ||
      rawH.indexOf('email') !== -1 || rawH.indexOf('mail') !== -1
    )) {
      map.email = i;
    }
    // Phone Number
    else if (map.phone === -1 && (
      ['phone', 'mobile', 'tel', 'businessphone', 'telephone', 'phonenumber', 'contactnumber', 'telephonenumber', 'mobilenumber', 'phoneno', 'mobileno', 'cell', 'whatsapp'].indexOf(h) !== -1 ||
      rawH.indexOf('phone') !== -1 || rawH.indexOf('mobile') !== -1 || rawH.indexOf('tel') !== -1
    )) {
      map.phone = i;
    }
    // City
    else if (map.city === -1 && ['city', 'location', 'town'].indexOf(h) !== -1) {
      map.city = i;
    }
    // Country
    else if (map.country === -1 && ['country', 'nation', 'region'].indexOf(h) !== -1) {
      map.country = i;
    }
    // Industry
    else if (map.industry === -1 && ['industry', 'sector', 'category'].indexOf(h) !== -1) {
      map.industry = i;
    }
    // Notes
    else if (map.notes === -1 && ['notes', 'comments', 'description', 'need', 'condition'].indexOf(h) !== -1) {
      map.notes = i;
    }
  }

  // Fallback: If company wasn't matched by name, assume column 0
  if (map.company === -1 && headers.length > 0) map.company = 0;
  return map;
}

// --- OPTIONAL WEB API (Visit URL in browser to view extracted leads JSON) ---
function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || '';
  if (action === 'send_email' || action === 'send_outreach') {
    return ContentService.createTextOutput(JSON.stringify({ 
      success: false, 
      error: 'Method Not Allowed: Email dispatch requires authenticated POST request' 
    })).setMimeType(ContentService.MimeType.JSON);
  }

  // Fast Lead Ingestion endpoint (isWebInvocation = true skips slow sequential Firestore HTTP calls)
  var result = runScheduledIngestion(true);
  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}

// --- AUTOMATIC 5-MINUTE TRIGGER ---
function install5MinuteTrigger() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'runScheduledIngestion') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  ScriptApp.newTrigger('runScheduledIngestion').timeBased().everyMinutes(5).create();
  Logger.log('✓ CAVENTRA CRM 5-minute ingestion trigger installed successfully.');
}

// --- FIRESTORE WRITER ---
function syncLeadsToFirestore(leads) {
  if (!leads || leads.length === 0) return;
  var token = ScriptApp.getOAuthToken();
  var baseUrl = 'https://firestore.googleapis.com/v1/projects/' + encodeURIComponent(CONFIG.FIRESTORE_PROJECT_ID) + '/databases/(default)/documents/leads';
  for (var i = 0; i < leads.length; i++) {
    var lead = leads[i];
    var docId = 'lead_' + Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, (lead.website || lead.email || lead.company).toLowerCase())
      .map(function(b) { return ('0' + (b & 0xFF).toString(16)).slice(-2); }).join('').substring(0, 20);

    var payload = {
      fields: {
        company: { stringValue: lead.company },
        website: { stringValue: lead.website || '' },
        contactName: { stringValue: lead.contactName || '' },
        email: { stringValue: lead.email || '' },
        phone: { stringValue: lead.phone || '' },
        city: { stringValue: lead.city || '' },
        country: { stringValue: lead.country || '' },
        industry: { stringValue: lead.industry || '' },
        notes: { stringValue: lead.notes || '' },
        status: { stringValue: 'new' },
        createdAt: { timestampValue: new Date().toISOString() },
        source: { stringValue: lead.source }
      }
    };

    try {
      UrlFetchApp.fetch(baseUrl + '/' + docId, {
        method: 'patch',
        contentType: 'application/json',
        headers: { Authorization: 'Bearer ' + token },
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      });
    } catch (e) {}
  }
}
