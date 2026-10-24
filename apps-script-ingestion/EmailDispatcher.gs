/**
 * ============================================================================
 * SCRIPT 2: CAVENTRA GMAIL OUTREACH DISPATCHER (Run in CAVENTRA's Google Account)
 * Project Name: CAVENTRA Outreach Dispatcher
 * Google Account: caventraofficial@gmail.com
 * ============================================================================
 */

// --- WEBHOOK POST API (Receives outreach email jobs from CAVENTRA CRM) ---
function doPost(e) {
  try {
    var body = {};
    if (e && e.postData && e.postData.contents) {
      body = JSON.parse(e.postData.contents);
    }

    var action = body.action || '';

    if (action === 'send_email' || action === 'send_outreach') {
      return jsonResponse(handleSendOutreachEmail(body));
    } else {
      return jsonResponse({ success: false, error: 'Unknown action specified: ' + action }, 400);
    }
  } catch (err) {
    Logger.log('doPost error: ' + err.toString());
    return jsonResponse({ success: false, error: err.message || 'Server error' }, 500);
  }
}

// --- DISPATCH EMAIL VIA OFFICIAL CAVENTRA GMAIL ---
function handleSendOutreachEmail(data) {
  // Check remaining Google daily quota
  var remainingQuota = MailApp.getRemainingDailyQuota();
  if (remainingQuota <= 0) {
    throw new Error('Google Daily Email Quota Reached (100 emails/day limit on free Gmail). Quota resets in 24 hours.');
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
  if (htmlBody) {
    options.htmlBody = htmlBody;
  }

  GmailApp.sendEmail(to, subject, body || subject, options);
  Logger.log('[OK] Outreach email sent to: ' + to + ' (Remaining quota today: ' + (remainingQuota - 1) + ')');

  return { 
    success: true, 
    to: to, 
    sender: Session.getActiveUser().getEmail(),
    remainingQuota: remainingQuota - 1, 
    sentAt: new Date().toISOString() 
  };
}

// --- HEALTH CHECK GET ENDPOINT ---
function doGet(e) {
  var remainingQuota = MailApp.getRemainingDailyQuota();
  return jsonResponse({
    status: 'online',
    service: 'CAVENTRA Official Gmail Dispatcher',
    activeSender: Session.getActiveUser().getEmail(),
    remainingDailyEmailQuota: remainingQuota,
    timestamp: new Date().toISOString()
  });
}

// --- 1-CLICK TEST & AUTHORIZATION FUNCTION ---
function testSendEmail() {
  var myEmail = Session.getActiveUser().getEmail() || 'caventraofficial@gmail.com';
  var quota = MailApp.getRemainingDailyQuota();
  Logger.log('Current remaining daily email quota: ' + quota);

  if (quota <= 0) {
    Logger.log('[WARN] Notice: Daily email quota is currently 0. Google will reset it within 24 hours.');
    return;
  }

  GmailApp.sendEmail(myEmail, 'CAVENTRA Outreach System Connected', 'Your official CAVENTRA Gmail sending integration is authorized and working perfectly! (Remaining quota: ' + quota + ')');
  Logger.log('[OK] Success: Test email sent to ' + myEmail);
}

function jsonResponse(data, status) {
  var output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}
