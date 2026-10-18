/**
 * CAVENTRA CRM — Google Drive Automated Ingestion Configuration
 * 
 * Stores and manages environment parameters in ScriptProperties.
 * Sensitive IDs and project settings are NEVER hardcoded in source code.
 */

var Config = (function () {
  var props = PropertiesService.getScriptProperties();

  return {
    /**
     * Get Firebase / Google Cloud Project ID
     */
    getProjectId: function () {
      return props.getProperty('FIRESTORE_PROJECT_ID') || '';
    },

    /**
     * Get the dedicated Google Drive Inbox folder ID
     */
    getInboxFolderId: function () {
      return props.getProperty('INBOX_FOLDER_ID') || '';
    },

    /**
     * Optional: Get processed archive folder ID (if empty, files are tagged with property)
     */
    getProcessedFolderId: function () {
      return props.getProperty('PROCESSED_FOLDER_ID') || '';
    },

    /**
     * Validation check
     */
    isValid: function () {
      var pId = this.getProjectId();
      var fId = this.getInboxFolderId();
      return pId.length > 0 && fId.length > 0;
    },

    /**
     * Admin setup helper: run this once from Script Editor to set parameters securely
     */
    saveSettings: function (projectId, inboxFolderId, processedFolderId) {
      if (!projectId || !inboxFolderId) {
        throw new Error('Project ID and Inbox Folder ID are required.');
      }
      props.setProperty('FIRESTORE_PROJECT_ID', projectId.trim());
      props.setProperty('INBOX_FOLDER_ID', inboxFolderId.trim());
      if (processedFolderId) {
        props.setProperty('PROCESSED_FOLDER_ID', processedFolderId.trim());
      }
      Logger.log('✓ Configuration saved securely to ScriptProperties.');
    }
  };
})();

/**
 * Convenience function to configure settings from Script Editor:
 * Run this function after setting your values below.
 */
function configureIngestionSettings() {
  // Replace these with your actual IDs:
  var FIRESTORE_PROJECT_ID = 'YOUR_FIREBASE_PROJECT_ID';
  var INBOX_FOLDER_ID = 'YOUR_GOOGLE_DRIVE_FOLDER_ID';
  var PROCESSED_FOLDER_ID = ''; // Optional

  Config.saveSettings(FIRESTORE_PROJECT_ID, INBOX_FOLDER_ID, PROCESSED_FOLDER_ID);
}

/**
 * Diagnostic check: Run this to verify folder access and project configuration
 */
function verifyConfiguration() {
  Logger.log('=== CAVENTRA INGESTION CONFIGURATION AUDIT ===');
  var projectId = Config.getProjectId();
  var folderId = Config.getInboxFolderId();

  Logger.log('1. Firestore Project ID: ' + (projectId ? projectId : 'NOT CONFIGURED'));
  Logger.log('2. Inbox Folder ID: ' + (folderId ? folderId : 'NOT CONFIGURED'));

  if (!Config.isValid()) {
    Logger.log('❌ Error: Configuration incomplete. Run configureIngestionSettings() first.');
    return false;
  }

  try {
    var folder = DriveApp.getFolderById(folderId);
    Logger.log('✓ Successfully accessed Inbox folder: "' + folder.getName() + '"');
  } catch (err) {
    Logger.log('❌ Failed to access Inbox folder: ' + err.message);
    return false;
  }

  Logger.log('✓ Configuration validated successfully.');
  return true;
}
