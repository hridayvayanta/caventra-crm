/**
 * ============================================================================
 * CAVENTRA CRM — ALL-IN-ONE GOOGLE DRIVE LEAD INGESTION SCRIPT (₹0 BUDGET)
 * ============================================================================
 * 
 * Automatically monitors your Google Drive folder, parses Excel (.xlsx, .xls), 
 * CSV (.csv), and Google Sheets, normalizes domains/emails, prevents duplicates,
 * and syncs leads to CAVENTRA CRM.
 * 
 * Folder ID: 1VcNqOmAIhhDIE2FHDY1Aimzn_HCCcFv_
 */

// ==========================================
// 1. CONFIGURATION
// ==========================================
var CONFIG = {
  // Connected Google Drive Folder with your Excels
  INBOX_FOLDER_ID: '1VcNqOmAIhhDIE2FHDY1Aimzn_HCCcFv_',

  // Optional: Your Firebase Project ID (if using Cloud Firestore)
  FIRESTORE_PROJECT_ID: 'caventra-crm'
};

// ==========================================
// 2. MAIN EXECUTION FUNCTION
// ==========================================
function runScheduledIngestion() {
  Logger.log('=== CAVENTRA LEAD INGESTION RUN STARTED ===');
  
  var folderId = CONFIG.INBOX_FOLDER_ID;
  if (!folderId) {
    Logger.log('❌ Error: INBOX_FOLDER_ID is missing.');
    return { success: false, error: 'Missing folder ID' };
  }

  var folder;
  try {
    folder = DriveApp.getFolderById(folderId);
  } catch (err) {
    Logger.log('❌ Error: Cannot access Google Drive folder: ' + err.message);
    return { success: false, error: err.message };
  }

  var files = folder.getFiles();
  var filesFound = 0;
  var allExtractedLeads = [];

  while (files.hasNext()) {
    var file = files.next();
    var fileName = file.getName();
    
    // Skip temporary conversion artifacts
    if (fileName.indexOf('[Converted]') === 0) continue;

    filesFound++;
    Logger.log('Found file #' + filesFound + ': ' + fileName);

    var leads = parseSpreadsheetFile(file);
    if (leads && leads.length > 0) {
      allExtractedLeads = allExtractedLeads.concat(leads);
      Logger.log('✓ Successfully extracted ' + leads.length + ' leads from: ' + fileName);
    }
  }

  Logger.log('=== TOTAL LEADS EXTRACTED: ' + allExtractedLeads.length + ' ===');
  
  // If Firestore is configured, save directly to Firestore
  if (CONFIG.FIRESTORE_PROJECT_ID && CONFIG.FIRESTORE_PROJECT_ID !== 'YOUR_FIREBASE_PROJECT_ID') {
    syncLeadsToFirestore(allExtractedLeads);
  }

  return {
    success: true,
    filesFound: filesFound,
    totalLeads: allExtractedLeads.length,
    leads: allExtractedLeads
  };
}

// ==========================================
// 3. EXCEL & SPREADSHEET PARSER
// ==========================================
function parseSpreadsheetFile(file) {
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
  var isCsv = (
    mimeType === 'text/csv' ||
    mimeType === 'application/csv' ||
    lowerName.endsWith('.csv')
  );

  if (!isSheet && !isExcel && !isCsv) {
    Logger.log('Skipping unsupported file format: ' + fileName + ' (' + mimeType + ')');
    return [];
  }

  var spreadsheet = null;
  var tempConvertedId = null;

  try {
    if (isSheet) {
      spreadsheet = SpreadsheetApp.open(file);
    } else {
      // Auto-convert Excel (.xlsx) / CSV to temporary Google Sheet using Drive API
      Logger.log('Converting "' + fileName + '" to Google Sheet for parsing...');
      var blob = file.getBlob();
      var tempSheet = Drive.Files.insert(
        {
          title: '[Converted] ' + fileName,
          mimeType: MimeType.GOOGLE_SHEETS
        },
        blob,
        { convert: true }
      );
      tempConvertedId = tempSheet.id;
      spreadsheet = SpreadsheetApp.openById(tempConvertedId);
    }

    var sheets = spreadsheet.getSheets();
    if (!sheets || sheets.length === 0) return [];

    var sheet = sheets[0];
    var data = sheet.getDataRange().getValues();

    if (!data || data.length < 2) {
      Logger.log('File "' + fileName + '" has no data rows.');
      return [];
    }

    var headers = data[0];
    var colMap = mapHeaders(headers);
    var extractedLeads = [];

    for (var r = 1; r < data.length; r++) {
      var row = data[r];
      var company = colMap.company !== -1 ? String(row[colMap.company] || '').trim() : '';
      if (!company) continue; // Mandatory: Company Name

      var rawEmail = colMap.email !== -1 ? String(row[colMap.email] || '').trim().toLowerCase() : '';
      var rawPhone = colMap.phone !== -1 ? String(row[colMap.phone] || '').trim() : '';
      var cleanPhone = rawPhone.replace(/[^\d+]/g, '');

      // Strict Validation: Must have at least one contact channel (email, phone, or both)
      var hasEmail = Boolean(rawEmail.length > 0 && rawEmail.indexOf('@') !== -1 && rawEmail.indexOf('.') !== -1);
      var hasPhone = Boolean(cleanPhone.replace(/[^\d]/g, '').length >= 7);

      if (!hasEmail && !hasPhone) {
        // Skip leads that have no email and no phone number
        continue;
      }

      var lead = {
        company: company,
        website: colMap.website !== -1 ? String(row[colMap.website] || '').trim() : '',
        contactName: colMap.contact !== -1 ? String(row[colMap.contact] || '').trim() : '',
        email: hasEmail ? rawEmail : '',
        phone: hasPhone ? rawPhone : '',
        city: colMap.city !== -1 ? String(row[colMap.city] || '').trim() : '',
        country: colMap.country !== -1 ? String(row[colMap.country] || '').trim() : '',
        industry: colMap.industry !== -1 ? String(row[colMap.industry] || '').trim() : '',
        notes: colMap.notes !== -1 ? String(row[colMap.notes] || '').trim() : '',
        source: 'Google Drive (' + fileName + ')',
        status: 'new'
      };

      extractedLeads.push(lead);
    }

    return extractedLeads;

  } catch (err) {
    Logger.log('❌ Error parsing "' + fileName + '": ' + err.message);
    return [];
  } finally {
    // Always clean up temporary converted files
    if (tempConvertedId) {
      try {
        DriveApp.getFileById(tempConvertedId).setTrashed(true);
      } catch (e) {}
    }
  }
}

// ==========================================
// 4. SMART HEADER MAPPING
// ==========================================
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
    // Phone
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

// ==========================================
// 5. WEB APP ENDPOINT (API)
// ==========================================
function doGet(e) {
  var result = runScheduledIngestion();
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// ==========================================
// 6. 5-MINUTE AUTOMATION TRIGGER
// ==========================================
function install5MinuteTrigger() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'runScheduledIngestion') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }

  ScriptApp.newTrigger('runScheduledIngestion')
    .timeBased()
    .everyMinutes(5)
    .create();

  Logger.log('✓ CAVENTRA CRM 5-minute ingestion trigger installed successfully.');
}

// ==========================================
// 7. DIAGNOSTIC TEST (Run this first!)
// ==========================================
function testDriveFolderAccess() {
  Logger.log('Testing access to folder: ' + CONFIG.INBOX_FOLDER_ID);
  try {
    var folder = DriveApp.getFolderById(CONFIG.INBOX_FOLDER_ID);
    Logger.log('✓ SUCCESS: Connected to folder "' + folder.getName() + '"');
    var files = folder.getFiles();
    var count = 0;
    while (files.hasNext()) {
      var f = files.next();
      count++;
      Logger.log('File ' + count + ': ' + f.getName() + ' (' + f.getMimeType() + ')');
    }
    Logger.log('Total files found in folder: ' + count);
  } catch (e) {
    Logger.log('❌ FAILED: ' + e.message);
  }
}

// ==========================================
// 8. FIRESTORE SYNC HELPER
// ==========================================
function syncLeadsToFirestore(leads) {
  if (!leads || leads.length === 0) return;
  var token = ScriptApp.getOAuthToken();
  var baseUrl = 'https://firestore.googleapis.com/v1/projects/' + encodeURIComponent(CONFIG.FIRESTORE_PROJECT_ID) + '/databases/(default)/documents/leads';

  var added = 0;
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
      added++;
    } catch (e) {
      Logger.log('Firestore write notice: ' + e.message);
    }
  }
  Logger.log('✓ Synced ' + added + ' leads to Cloud Firestore.');
}
