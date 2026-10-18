/**
 * CAVENTRA CRM — Automated Google Drive Lead Ingestor
 * 
 * Orchestrates the polling of 'CAVENTRA CRM Inbox', parsing of exported
 * prospect spreadsheets, domain normalization, duplicate detection,
 * and atomic delivery into Cloud Firestore.
 */

var Ingestor = (function () {

  /**
   * Helper: Normalize website domain
   */
  function normalizeDomain(url) {
    if (!url) return '';
    return String(url)
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//i, '')
      .replace(/^www\./i, '')
      .split('/')[0]
      .split('?')[0];
  }

  /**
   * Helper: Normalize phone number
   */
  function normalizePhone(phone) {
    if (!phone) return '';
    return String(phone).replace(/[^\d+]/g, '');
  }

  /**
   * Helper: Map header row to standardized CRM field keys
   */
  function buildHeaderMapping(headers) {
    var mapping = {
      businessName: -1,
      website: -1,
      contactName: -1,
      businessEmail: -1,
      businessPhone: -1,
      city: -1,
      country: -1,
      industry: -1,
      websiteCondition: -1,
      serviceOpportunity: -1,
      sourceUrl: -1,
      notes: -1
    };

    for (var i = 0; i < headers.length; i++) {
      var h = String(headers[i] || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      
      if (mapping.businessName === -1 && ['company', 'companyname', 'business', 'businessname', 'name', 'client', 'organization'].indexOf(h) !== -1) {
        mapping.businessName = i;
      } else if (mapping.website === -1 && ['website', 'domain', 'url', 'web', 'site', 'websiteurl'].indexOf(h) !== -1) {
        mapping.website = i;
      } else if (mapping.contactName === -1 && ['contact', 'contactname', 'person', 'owner', 'fullname', 'decisionmaker'].indexOf(h) !== -1) {
        mapping.contactName = i;
      } else if (mapping.businessEmail === -1 && ['email', 'businessemail', 'mail', 'emailaddress'].indexOf(h) !== -1) {
        mapping.businessEmail = i;
      } else if (mapping.businessPhone === -1 && ['phone', 'businessphone', 'telephone', 'mobile', 'tel', 'cell'].indexOf(h) !== -1) {
        mapping.businessPhone = i;
      } else if (mapping.city === -1 && ['city', 'location', 'town'].indexOf(h) !== -1) {
        mapping.city = i;
      } else if (mapping.country === -1 && ['country', 'nation', 'region'].indexOf(h) !== -1) {
        mapping.country = i;
      } else if (mapping.industry === -1 && ['industry', 'sector', 'category', 'vertical'].indexOf(h) !== -1) {
        mapping.industry = i;
      } else if (mapping.websiteCondition === -1 && ['condition', 'websitecondition', 'issue', 'problem', 'flaw', 'deficiency', 'audit'].indexOf(h) !== -1) {
        mapping.websiteCondition = i;
      } else if (mapping.serviceOpportunity === -1 && ['service', 'opportunity', 'targetservice', 'serviceneeded'].indexOf(h) !== -1) {
        mapping.serviceOpportunity = i;
      } else if (mapping.sourceUrl === -1 && ['source', 'sourceurl', 'link'].indexOf(h) !== -1) {
        mapping.sourceUrl = i;
      } else if (mapping.notes === -1 && ['notes', 'comments', 'researchnotes', 'description'].indexOf(h) !== -1) {
        mapping.notes = i;
      }
    }

    return mapping;
  }

  /**
   * Check if a file has already been processed using Drive File Properties
   */
  function isFileProcessed(file) {
    try {
      // Check Drive file properties (persisted metadata)
      var props = PropertiesService.getScriptProperties();
      var processedKey = 'PROCESSED_FILE_' + file.getId();
      if (props.getProperty(processedKey)) {
        return true;
      }

      // Check Firestore ingestionJobs collection
      var existingJob = FirestoreClient.getDocument('ingestionJobs', file.getId());
      if (existingJob && existingJob.status === 'completed') {
        props.setProperty(processedKey, 'true');
        return true;
      }
    } catch (e) {
      Logger.log('Notice: Could not check prior processed state: ' + e.message);
    }
    return false;
  }

  /**
   * Mark a file as processed safely
   */
  function markFileProcessed(file) {
    try {
      var props = PropertiesService.getScriptProperties();
      props.setProperty('PROCESSED_FILE_' + file.getId(), 'true');

      // If a processed archive folder is configured, move the file there
      var processedFolderId = Config.getProcessedFolderId();
      if (processedFolderId) {
        var targetFolder = DriveApp.getFolderById(processedFolderId);
        file.moveTo(targetFolder);
        Logger.log('✓ Moved file "' + file.getName() + '" to processed folder.');
      }
    } catch (e) {
      Logger.log('Notice: Failed to move file to processed folder: ' + e.message);
    }
  }

  return {
    /**
     * Main entry point: Inspect inbox folder and process any new files
     */
    executeScheduledIngestion: function () {
      Logger.log('=== CAVENTRA AUTOMATED INGESTION RUN STARTED ===');
      
      if (!Config.isValid()) {
        Logger.log('❌ Configuration missing. Set FIRESTORE_PROJECT_ID and INBOX_FOLDER_ID.');
        return { success: false, reason: 'Configuration incomplete' };
      }

      var inboxFolderId = Config.getInboxFolderId();
      var folder;
      try {
        folder = DriveApp.getFolderById(inboxFolderId);
      } catch (err) {
        Logger.log('❌ Error: Cannot access inbox folder: ' + err.message);
        return { success: false, error: err.message };
      }

      var files = folder.getFiles();
      var filesFound = 0;
      var filesProcessed = 0;

      while (files.hasNext()) {
        var file = files.next();
        filesFound++;

        // Skip internal temporary converted sheets
        if (file.getName().indexOf('[Converted]') === 0) {
          continue;
        }

        if (isFileProcessed(file)) {
          Logger.log('Skipping previously processed file: ' + file.getName());
          continue;
        }

        Logger.log('>>> Processing candidate file: ' + file.getName() + ' (' + file.getMimeType() + ')');
        var result = this.processFile(file);
        if (result.success) {
          filesProcessed++;
        }
      }

      Logger.log('=== INGESTION RUN FINISHED: ' + filesProcessed + ' of ' + filesFound + ' files ingested ===');
      return { success: true, filesFound: filesFound, filesProcessed: filesProcessed };
    },

    /**
     * Process an individual file
     */
    processFile: function (file) {
      var fileId = file.getId();
      var fileName = file.getName();
      var mimeType = file.getMimeType();
      var now = new Date().toISOString();

      var job = {
        id: fileId,
        fileId: fileId,
        fileName: fileName,
        fileUrl: file.getUrl(),
        status: 'processing',
        totalRows: 0,
        processedRows: 0,
        leadsAdded: 0,
        duplicatesSkipped: 0,
        rowsRejected: 0,
        errors: [],
        startedAt: now,
        lastCheckedAt: now,
        source: 'Google Drive Scheduled Ingestion'
      };

      // Record initial job in Firestore so CRM displays live status
      try {
        FirestoreClient.upsertDocument('ingestionJobs', fileId, job);
      } catch (e) {
        Logger.log('Warning: Could not write initial ingestion job: ' + e.message);
      }

      var lowerName = fileName.toLowerCase();
      var isGoogleSheet = (mimeType === MimeType.GOOGLE_SHEETS);
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

      // Check format
      if (!isGoogleSheet && !isExcel && !isCsv) {
        var errMsg = 'Unsupported format: "' + mimeType + '" (' + fileName + '). Supported formats are Excel (.xlsx, .xls), CSV (.csv), and Google Sheets.';
        job.status = 'failed';
        job.errors.push(errMsg);
        job.completedAt = new Date().toISOString();
        FirestoreClient.upsertDocument('ingestionJobs', fileId, job);
        Logger.log('❌ ' + errMsg);
        return { success: false, error: errMsg };
      }

      // Open Spreadsheet (directly for Google Sheets, or via Drive API conversion for Excel/CSV)
      var spreadsheet = null;
      var tempConvertedId = null;

      try {
        if (isGoogleSheet) {
          spreadsheet = SpreadsheetApp.open(file);
        } else {
          Logger.log('Converting Excel/CSV "' + fileName + '" to Google Sheet for parsing...');
          if (typeof Drive !== 'undefined' && Drive.Files && Drive.Files.insert) {
            var blob = file.getBlob();
            var parents = [];
            var parentIter = file.getParents();
            if (parentIter.hasNext()) {
              parents.push({ id: parentIter.next().getId() });
            }
            var tempSheet = Drive.Files.insert(
              {
                title: '[Converted] ' + fileName,
                mimeType: MimeType.GOOGLE_SHEETS,
                parents: parents
              },
              blob,
              { convert: true }
            );
            tempConvertedId = tempSheet.id;
            spreadsheet = SpreadsheetApp.openById(tempConvertedId);
          } else {
            throw new Error('Drive Advanced Service is not enabled. Open Services in Apps Script and enable Drive.');
          }
        }
      } catch (err) {
        if (tempConvertedId) {
          try { DriveApp.getFileById(tempConvertedId).setTrashed(true); } catch (e) {}
        }
        var errMsg = 'Cannot parse "' + fileName + '": ' + err.message + '. Tip: You can also right-click the Excel file in Google Drive and select "Open with > Google Sheets".';
        job.status = 'failed';
        job.errors.push(errMsg);
        job.completedAt = new Date().toISOString();
        FirestoreClient.upsertDocument('ingestionJobs', fileId, job);
        Logger.log('❌ ' + errMsg);
        return { success: false, error: errMsg };
      }

      var sheets = spreadsheet.getSheets();
      if (!sheets || sheets.length === 0) {
        if (tempConvertedId) {
          try { DriveApp.getFileById(tempConvertedId).setTrashed(true); } catch (e) {}
        }
        job.status = 'failed';
        job.errors.push('Spreadsheet has no sheets.');
        job.completedAt = new Date().toISOString();
        FirestoreClient.upsertDocument('ingestionJobs', fileId, job);
        return { success: false, error: 'Empty workbook' };
      }

      var sheet = sheets[0];
      var data = sheet.getDataRange().getValues();

      // Clean up temporary converted Google Sheet if one was created
      if (tempConvertedId) {
        try {
          DriveApp.getFileById(tempConvertedId).setTrashed(true);
        } catch (cleanupErr) {
          Logger.log('Notice: Could not trash temporary sheet: ' + cleanupErr.message);
        }
      }

      if (!data || data.length < 2) {
        job.status = 'failed';
        job.errors.push('Sheet contains no data rows (only header or empty).');
        job.completedAt = new Date().toISOString();
        FirestoreClient.upsertDocument('ingestionJobs', fileId, job);
        return { success: false, error: 'No data rows' };
      }

      var headers = data[0];
      var mapping = buildHeaderMapping(headers);

      if (mapping.businessName === -1) {
        var errMsg = 'Missing required column: Company or Business Name heading not recognized.';
        job.status = 'failed';
        job.errors.push(errMsg);
        job.completedAt = new Date().toISOString();
        FirestoreClient.upsertDocument('ingestionJobs', fileId, job);
        return { success: false, error: errMsg };
      }

      var rows = data.slice(1);
      job.totalRows = rows.length;

      var leadsAdded = 0;
      var duplicatesSkipped = 0;
      var rowsRejected = 0;

      var seenDomainsInFile = {};

      for (var r = 0; r < rows.length; r++) {
        var row = rows[r];
        var rowNum = r + 2;

        var rawName = String(row[mapping.businessName] || '').trim();
        if (!rawName) {
          rowsRejected++;
          job.errors.push('Row ' + rowNum + ': Missing company name');
          continue;
        }

        var rawWeb = mapping.website !== -1 ? String(row[mapping.website] || '').trim() : '';
        var rawEmail = mapping.businessEmail !== -1 ? String(row[mapping.businessEmail] || '').trim().toLowerCase() : '';
        var rawPhone = mapping.businessPhone !== -1 ? String(row[mapping.businessPhone] || '').trim() : '';
        var cleanPhone = rawPhone.replace(/[^\d+]/g, '');

        // Mandatory Contact Validation: Must have either valid email, phone, or both
        var hasEmail = Boolean(rawEmail.length > 0 && rawEmail.indexOf('@') !== -1 && rawEmail.indexOf('.') !== -1);
        var hasPhone = Boolean(cleanPhone.replace(/[^\d]/g, '').length >= 7);

        if (!hasEmail && !hasPhone) {
          rowsRejected++;
          job.errors.push('Row ' + rowNum + ' (' + rawName + '): Missing contact details — must provide company email, phone number, or both');
          continue;
        }

        var rawContact = mapping.contactName !== -1 ? String(row[mapping.contactName] || '').trim() : '';
        var rawCity = mapping.city !== -1 ? String(row[mapping.city] || '').trim() : '';
        var rawCountry = mapping.country !== -1 ? String(row[mapping.country] || '').trim() : '';
        var rawIndustry = mapping.industry !== -1 ? String(row[mapping.industry] || '').trim() : '';
        var rawCondition = mapping.websiteCondition !== -1 ? String(row[mapping.websiteCondition] || '').trim() : '';
        var rawService = mapping.serviceOpportunity !== -1 ? String(row[mapping.serviceOpportunity] || '').trim() : '';
        var rawSourceUrl = mapping.sourceUrl !== -1 ? String(row[mapping.sourceUrl] || '').trim() : '';
        var rawNotes = mapping.notes !== -1 ? String(row[mapping.notes] || '').trim() : '';

        var normDomain = normalizeDomain(rawWeb);

        // Duplicate Check 1: Intra-file check
        if (normDomain && seenDomainsInFile[normDomain]) {
          duplicatesSkipped++;
          continue;
        }
        if (normDomain) {
          seenDomainsInFile[normDomain] = true;
        }

        // Duplicate Check 2: Database check by normalized domain
        var isDuplicate = false;
        var existingLeadId = null;

        if (normDomain) {
          try {
            var matched = FirestoreClient.queryByField('leads', 'normalizedDomain', normDomain);
            if (matched && matched.length > 0) {
              isDuplicate = true;
              existingLeadId = matched[0]._id;
            }
          } catch (e) {
            Logger.log('Domain query notice: ' + e.message);
          }
        }

        // Duplicate Check 3: Check by business email if not matched by domain
        if (!isDuplicate && rawEmail) {
          try {
            var matchedEmail = FirestoreClient.queryByField('leads', 'businessEmail', rawEmail);
            if (matchedEmail && matchedEmail.length > 0) {
              isDuplicate = true;
              existingLeadId = matchedEmail[0]._id;
            }
          } catch (e) {
            Logger.log('Email query notice: ' + e.message);
          }
        }

        if (isDuplicate) {
          duplicatesSkipped++;
          // Preserve existing lead! Never overwrite existing sales notes, assignments, or statuses.
          // Append audit activity log only:
          if (existingLeadId) {
            try {
              var auditAct = {
                id: 'act_reingest_' + fileId + '_' + rowNum,
                leadId: existingLeadId,
                type: 'import',
                title: 'Re-evaluated in Lead Spreadsheet',
                description: 'Record appeared again in Google Drive sheet "' + fileName + '". Existing progress preserved.',
                performedBy: 'Google Drive Automated Ingestion',
                timestamp: new Date().toISOString()
              };
              FirestoreClient.upsertDocument('activities', auditAct.id, auditAct);
            } catch (err) {}
          }
          continue;
        }

        // New Lead Creation
        var leadId = 'lead_' + Utilities.getUuid();
        var fullWeb = rawWeb ? (rawWeb.indexOf('http') === 0 ? rawWeb : 'https://' + rawWeb) : (normDomain ? 'https://' + normDomain : 'https://unknown.com');

        var newLead = {
          id: leadId,
          businessName: rawName,
          website: fullWeb,
          normalizedDomain: normDomain || rawName.toLowerCase().replace(/[^a-z0-9]/g, '') + '.local',
          contactName: rawContact || null,
          businessEmail: rawEmail || null,
          businessPhone: rawPhone || null,
          city: rawCity || 'Unknown',
          country: rawCountry || 'India',
          industry: rawIndustry || 'General Business',
          serviceOpportunity: rawService || 'Website Redesign',
          websiteCondition: rawCondition || 'Imported prospect from Spark by Gemini. Requires preliminary technical audit.',
          status: 'new',
          priority: 'normal',
          assignedTo: null,
          estimatedValue: 35000,
          notes: rawNotes ? 'Research Notes: ' + rawNotes : 'Imported from Drive file: ' + fileName,
          leadSource: 'Spark by Gemini',
          sourceFileId: fileId,
          sourceFileName: fileName,
          sourceUrl: rawSourceUrl || null,
          createdAt: now,
          updatedAt: now
        };

        var initialActivity = {
          id: 'act_init_' + leadId,
          leadId: leadId,
          type: 'import',
          title: 'Automated Lead Ingestion',
          description: 'Ingested automatically from Google Drive sheet "' + fileName + '".',
          performedBy: 'Google Drive Automated Ingestion',
          timestamp: now
        };

        try {
          FirestoreClient.upsertDocument('leads', leadId, newLead);
          FirestoreClient.upsertDocument('activities', initialActivity.id, initialActivity);
          leadsAdded++;
        } catch (writeErr) {
          rowsRejected++;
          job.errors.push('Row ' + rowNum + ' write failed: ' + writeErr.message);
        }
      }

      // Record final job status
      job.processedRows = rows.length;
      job.leadsAdded = leadsAdded;
      job.duplicatesSkipped = duplicatesSkipped;
      job.rowsRejected = rowsRejected;
      job.status = rowsRejected > 0 ? 'partial' : 'completed';
      job.completedAt = new Date().toISOString();

      FirestoreClient.upsertDocument('ingestionJobs', fileId, job);
      markFileProcessed(file);

      Logger.log('✓ File "' + fileName + '" finished: ' + leadsAdded + ' added, ' + duplicatesSkipped + ' duplicates skipped, ' + rowsRejected + ' rejected.');
      return { success: true, leadsAdded: leadsAdded, duplicatesSkipped: duplicatesSkipped, rowsRejected: rowsRejected };
    }
  };
})();
