/**
 * CAVENTRA CRM — Apps Script Automation Triggers & Test Utilities
 */

/**
 * Main scheduled trigger execution point
 */
function runScheduledIngestion() {
  return Ingestor.executeScheduledIngestion();
}

/**
 * Install the 5-minute time-driven trigger
 * Run this function once from the Apps Script editor to activate automation.
 */
function install5MinuteTrigger() {
  uninstallTriggers();

  ScriptApp.newTrigger('runScheduledIngestion')
    .timeBased()
    .everyMinutes(5)
    .create();

  Logger.log('✓ CAVENTRA CRM 5-minute ingestion trigger installed successfully.');
}

/**
 * Remove existing triggers to prevent duplicate runs
 */
function uninstallTriggers() {
  var triggers = ScriptApp.getProjectTriggers();
  var count = 0;
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'runScheduledIngestion') {
      ScriptApp.deleteTrigger(triggers[i]);
      count++;
    }
  }
  Logger.log('✓ Uninstalled ' + count + ' existing trigger(s).');
}

/**
 * TEST UTILITY: Create a sample test spreadsheet in your 'CAVENTRA CRM Inbox' folder
 * 
 * Allows immediate verification of the end-to-end pipeline:
 * 1. Creates a real Google Sheet with 3 test prospects (1 complete, 1 security flaw, 1 invalid row).
 * 2. Saves it in the configured CAVENTRA CRM Inbox folder.
 * 3. Immediately runs the ingestion to verify detection and database commit.
 */
function generateTestLeadSheetAndIngest() {
  var folderId = Config.getInboxFolderId();
  if (!folderId) {
    Logger.log('❌ Error: Set INBOX_FOLDER_ID before generating test data.');
    return;
  }

  var folder = DriveApp.getFolderById(folderId);
  var fileName = 'Test_Spark_Leads_' + Utilities.formatDate(new Date(), 'GMT', 'yyyyMMdd_HHmmss');

  var sheet = SpreadsheetApp.create(fileName);
  var ws = sheet.getActiveSheet();

  // Populate headers
  var headers = [
    'Company Name', 
    'Website', 
    'Contact Name', 
    'Email', 
    'Phone', 
    'City', 
    'Country', 
    'Industry', 
    'Condition / Need', 
    'Service',
    'Research Notes'
  ];

  var rows = [
    [
      'Dr. Sharma Wellness & Dental Clinic',
      'https://sharma-dental-test.in',
      'Dr. Arvind Sharma',
      'contact@sharma-dental-test.in',
      '+91 98201 11223',
      'Mumbai',
      'India',
      'Healthcare',
      'Mobile layout breaks on iOS/Android; SSL certificate expired 12 days ago.',
      'Website Redesign',
      'High conversion potential. Dental clinic booking portal currently loses mobile traffic.'
    ],
    [
      'Vance & Sterling Logistics Partners',
      'https://vance-logistics-example.co.uk',
      'Arthur Vance',
      'enquiries@vance-logistics-example.co.uk',
      '+44 20 7946 0999',
      'London',
      'United Kingdom',
      'Freight & Logistics',
      'Frequent 504 Gateway Timeout errors during business hours. Outdated server.',
      'Cloud Hosting',
      'Needs migration to high-availability managed edge hosting.'
    ],
    [
      '', // Blank company name (testing invalid row handling)
      'https://empty-company-test.com',
      'Jane Doe',
      'jane@empty-company-test.com',
      '+1 512 555 0100',
      'Austin',
      'United States',
      'Technology',
      'Non-responsive layout.',
      'Website Redesign',
      'Row will be rejected by validator.'
    ]
  ];

  ws.appendRow(headers);
  for (var i = 0; i < rows.length; i++) {
    ws.appendRow(rows[i]);
  }

  SpreadsheetApp.flush();

  // Move created sheet into Inbox folder
  var file = DriveApp.getFileById(sheet.getId());
  file.moveTo(folder);

  Logger.log('✓ Created test spreadsheet: "' + fileName + '" in folder: "' + folder.getName() + '"');
  Logger.log('>>> Triggering immediate ingestion test...');

  var result = Ingestor.processFile(file);
  Logger.log('=== TEST RESULT: ' + JSON.stringify(result) + ' ===');
}
