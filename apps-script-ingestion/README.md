# CAVENTRA CRM — Automated Google Drive Lead Ingestion (₹0 Budget)

This directory contains the production-ready Google Apps Script backend that continuously monitors your dedicated Google Drive folder, parses prospect spreadsheets exported from Spark by Gemini, deduplicates against Cloud Firestore, and transfers structured leads to the CAVENTRA CRM in real time.

---

## 1. Zero-Cost Architectural Overview

```
Spark by Gemini (Research) 
       │
       ▼ (User clicks 'Export to Sheets' / saves to Drive)
Google Drive Folder: "CAVENTRA CRM Inbox"
       │
       ▼ (Every 5 minutes — Time-driven Trigger)
Google Apps Script (Ingestor.gs)
       │
       ▼ (Cloud Firestore REST API via OAuth token)
Cloud Firestore (leads, activities, ingestionJobs)
       │
       ▼ (Real-time snapshot listener onSnapshot)
CAVENTRA CRM Frontend (React + TypeScript on GitHub Pages)
```

* **Cost:** **₹0.00**
* **External Paid Connectors:** None (No Zapier, Make, or paid proxies).
* **Billing Upgrades:** None required (Runs on Google Apps Script and Firebase Spark free allowances).

---

## 2. One-Time Setup Instructions

### Step 1: Create the Drive Inbox Folder
1. Open [drive.google.com](https://drive.google.com/) using your CAVENTRA administrator Google account.
2. Click **New** $\rightarrow$ **New folder**.
3. Name the folder:
   ```
   CAVENTRA CRM Inbox
   ```
4. Open the created folder. Look at the browser URL:
   `https://drive.google.com/drive/folders/1aBcDeFgHiJkLmNoPqRsTuVwXyZ`
5. Copy the ID string at the end of the URL (e.g. `1aBcDeFgHiJkLmNoPqRsTuVwXyZ`). This is your `INBOX_FOLDER_ID`.

---

### Step 2: Create the Google Apps Script Project
1. Navigate to [script.google.com](https://script.google.com/) and click **New project**.
2. Rename the project to:
   ```
   CAVENTRA CRM Ingestor
   ```
3. Copy the contents of the files in this folder into the Apps Script editor:
   * `appsscript.json`: (In Apps Script, go to Project Settings $\rightarrow$ Check "Show 'appsscript.json' manifest file in editor" $\rightarrow$ Paste contents).
   * `Config.gs`
   * `FirestoreClient.gs`
   * `Ingestor.gs`
   * `Triggers.gs`

---

### Step 3: Configure Parameters in Script Properties
In the Apps Script editor:
1. Open `Config.gs`.
2. Locate the function `configureIngestionSettings()`:
   ```javascript
   function configureIngestionSettings() {
     var FIRESTORE_PROJECT_ID = 'your-firebase-project-id';
     var INBOX_FOLDER_ID = 'your-copied-folder-id-from-step-1';
     var PROCESSED_FOLDER_ID = ''; // Optional
     Config.saveSettings(FIRESTORE_PROJECT_ID, INBOX_FOLDER_ID, PROCESSED_FOLDER_ID);
   }
   ```
3. Select `configureIngestionSettings` from the function dropdown at the top and click **Run**.
4. Grant the requested Google account authorization permissions when prompted.

---

### Step 4: Google Cloud IAM Permissions
1. Open the [Google Cloud Console IAM Page](https://console.cloud.google.com/iam-admin/iam) and select your Firebase Project.
2. Ensure the Google account running the Apps Script has at least:
   * **Cloud Datastore User** (or Editor/Owner).
3. Under [Google Cloud APIs & Services](https://console.cloud.google.com/apis/library), verify that the **Cloud Firestore API** is enabled.

---

### Step 5: Install the 5-Minute Automation Trigger
In the Apps Script editor:
1. Select `install5MinuteTrigger` from the function dropdown.
2. Click **Run**.
3. You will see:
   `✓ CAVENTRA CRM 5-minute ingestion trigger installed successfully.`

The automation is now live. Every 5 minutes, it will silently check `CAVENTRA CRM Inbox` for new prospect sheets.

---

## 3. Spark by Gemini: Export & Routing Workflow

### How Spark by Gemini Exports Work
When you ask Spark by Gemini to research prospective businesses:
1. Gemini displays the structured table of businesses in chat.
2. Click the **Export** icon at the bottom of the table $\rightarrow$ **Export to Sheets**.
3. Gemini creates the Google Sheet in your Google Drive (usually in your root Drive folder or "Gemini" folder).

### Routing to the Ingestion Folder (Simplest Supported Method)
Because the consumer/Workspace Gemini interface cannot be configured with an arbitrary destination folder by default, you have two simple zero-click/one-drag options:
* **Option A (Move):** In Google Drive, drag the exported Sheet into the **`CAVENTRA CRM Inbox`** folder.
* **Option B (Drive Shortcut):** Right-click the Sheet $\rightarrow$ **Organize** $\rightarrow$ **Add shortcut** $\rightarrow$ Select `CAVENTRA CRM Inbox`.
* Within 5 minutes, the Apps Script reads the rows, checks for duplicate domains/emails, inserts new leads with status **New**, and logs the audit summary.

---

## 4. Verification & Self-Testing

To immediately verify that your setup is operational without waiting:
1. In the Apps Script editor, select the function:
   `generateTestLeadSheetAndIngest`
2. Click **Run**.
3. It will automatically generate a test sheet with 3 prospects inside your `CAVENTRA CRM Inbox` folder and run the ingestion logic immediately.
4. Open your CAVENTRA CRM at `http://localhost:5173/` (or your GitHub Pages URL):
   * Fresh leads will appear in **New Leads** and **All Leads**.
   * In the **Drive Import Status** view, you will see the exact job execution record, leads added count, and duplicate counts.
