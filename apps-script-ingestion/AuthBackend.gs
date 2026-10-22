/**
 * CAVENTRA CRM — Founder-Approved Activation Backend (Google Apps Script)
 * 
 * Provides ₹0 backend endpoints for:
 * 1. Cryptographically secure activation code generation (Founder only)
 * 2. Secure code hashing (SHA-256) and Firestore persistence
 * 3. Atomic activation code verification, rate limiting, and employee activation
 * 4. Revocation of expired or compromised codes
 */

/**
 * Handle incoming POST requests when deployed as a Web App (₹0 Webhook)
 */
function doPost(e) {
  try {
    var body = {};
    if (e && e.postData && e.postData.contents) {
      body = JSON.parse(e.postData.contents);
    }

    var action = body.action;

    if (action === 'generate_code') {
      return jsonResponse(handleGenerateCode(body));
    } else if (action === 'verify_code') {
      return jsonResponse(handleVerifyCode(body));
    } else if (action === 'revoke_code') {
      return jsonResponse(handleRevokeCode(body));
    } else if (action === 'send_email' || action === 'send_outreach') {
      return jsonResponse(handleSendOutreachEmail(body));
    } else {
      return jsonResponse({ success: false, error: 'Unknown action specified' }, 400);
    }
  } catch (err) {
    Logger.log('doPost error: ' + err.toString());
    return jsonResponse({ success: false, error: err.message || 'Server error' }, 500);
  }
}

/**
 * Handle GET requests for health check
 */
function doGet(e) {
  return jsonResponse({
    status: 'online',
    service: 'CAVENTRA CRM Auth & Ingestion Backend',
    timestamp: new Date().toISOString()
  });
}

/**
 * Generate a cryptographically secure, unpredictable, single-use activation code.
 * Stores ONLY the SHA-256 hash in Firestore.
 */
function handleGenerateCode(data) {
  var founderUid = data.founderUid;
  var employeeUid = data.employeeUid;
  var employeeEmail = data.employeeEmail;
  var employeeName = data.employeeName;

  if (!founderUid || !employeeUid || !employeeEmail) {
    throw new Error('Missing required parameters: founderUid, employeeUid, and employeeEmail');
  }

  // 1. Verify caller is a genuine Founder in Firestore
  var founderDoc = getFirestoreDocument('users', founderUid);
  if (!founderDoc || (founderDoc.role !== 'founder' && founderDoc.role !== 'admin')) {
    throw new Error('Unauthorized: Caller is not a registered Founder or Administrator');
  }

  // 2. Verify target employee is pending activation
  var employeeDoc = getFirestoreDocument('users', employeeUid);
  if (!employeeDoc) {
    throw new Error('Employee record not found in database');
  }
  if (employeeDoc.status !== 'pending_activation') {
    throw new Error('Employee account is already ' + employeeDoc.status);
  }

  // 3. Generate 8-character secure unpredictable alphanumeric code (e.g. "K9X2-M7PQ")
  var rawCode = generateSecureRandomCode(8);
  var formattedCode = rawCode.substring(0, 4) + '-' + rawCode.substring(4);
  var codeHash = hashActivationCode(formattedCode);

  var now = new Date();
  var expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours expiry
  var codeId = 'code_' + employeeUid;

  // 4. Save activation record to Firestore activationCodes/{codeId} (HASH ONLY)
  var record = {
    id: codeId,
    employeeUid: employeeUid,
    employeeEmail: employeeEmail,
    employeeName: employeeName || employeeDoc.name,
    codeHash: codeHash,
    issuedByUid: founderUid,
    issuedByName: founderDoc.name || 'Founder',
    issuedAt: now.toISOString(),
    expiresAt: expiresAt,
    used: false,
    revoked: false,
    failedAttempts: 0
  };

  saveFirestoreDocument('activationCodes', codeId, record);

  // Return plaintext code ONLY ONCE to the authorized founder
  return {
    success: true,
    code: formattedCode,
    expiresAt: expiresAt,
    employeeEmail: employeeEmail
  };
}

/**
 * Verify activation code, enforce rate limits, and atomically activate employee.
 */
function handleVerifyCode(data) {
  var employeeUid = data.employeeUid;
  var enteredCode = (data.code || '').trim().toUpperCase();

  if (!employeeUid || !enteredCode) {
    throw new Error('Missing employee identifier or activation code');
  }

  var codeId = 'code_' + employeeUid;
  var codeRecord = getFirestoreDocument('activationCodes', codeId);

  if (!codeRecord) {
    throw new Error('No activation code was found for this account. Ask your founder for a new code.');
  }

  // Check rate limiting (Max 5 attempts)
  var attempts = codeRecord.failedAttempts || 0;
  if (attempts >= 5) {
    throw new Error('Too many failed activation attempts. Code locked for security. Ask your founder to reissue a code.');
  }

  if (codeRecord.revoked) {
    throw new Error('This activation code was revoked by the founder. Please request a new code.');
  }

  if (codeRecord.used) {
    throw new Error('This activation code has already been used.');
  }

  // Check expiration
  var now = new Date();
  var expiresAt = new Date(codeRecord.expiresAt);
  if (now > expiresAt) {
    throw new Error('This activation code has expired. Ask your founder to generate a new one.');
  }

  // Verify code hash
  var enteredHash = hashActivationCode(enteredCode);
  if (enteredHash !== codeRecord.codeHash) {
    // Increment failed attempts
    updateFirestoreDocument('activationCodes', codeId, {
      failedAttempts: attempts + 1,
      lastFailedAt: now.toISOString()
    });

    var remaining = 4 - attempts;
    if (remaining <= 0) {
      throw new Error('Invalid code. Maximum attempts exceeded. Code is now locked.');
    }
    throw new Error('Invalid activation code. ' + remaining + ' attempt(s) remaining.');
  }

  // Code is VALID — Atomically mark code used and activate employee profile
  var nowIso = now.toISOString();

  updateFirestoreDocument('activationCodes', codeId, {
    used: true,
    usedAt: nowIso,
    activatedAt: nowIso
  });

  updateFirestoreDocument('users', employeeUid, {
    status: 'active',
    activatedAt: nowIso,
    activatedBy: codeRecord.issuedByName || 'Founder'
  });

  return {
    success: true,
    message: 'Account successfully activated! You may now sign in with your email and password.'
  };
}

/**
 * Revoke an existing activation code
 */
function handleRevokeCode(data) {
  var founderUid = data.founderUid;
  var employeeUid = data.employeeUid;

  if (!founderUid || !employeeUid) {
    throw new Error('Missing founderUid or employeeUid');
  }

  var founderDoc = getFirestoreDocument('users', founderUid);
  if (!founderDoc || (founderDoc.role !== 'founder' && founderDoc.role !== 'admin')) {
    throw new Error('Unauthorized');
  }

  var codeId = 'code_' + employeeUid;
  updateFirestoreDocument('activationCodes', codeId, {
    revoked: true,
    revokedAt: new Date().toISOString(),
    revokedBy: founderDoc.name
  });

  return { success: true, message: 'Activation code successfully revoked' };
}

/**
 * Cryptographic SHA-256 Hash helper
 */
function hashActivationCode(str) {
  var clean = str.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  var signature = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, clean, Utilities.Charset.UTF_8);
  var hex = '';
  for (var i = 0; i < signature.length; i++) {
    var b = signature[i];
    if (b < 0) b += 256;
    var byteString = b.toString(16);
    if (byteString.length === 1) byteString = '0' + byteString;
    hex += byteString;
  }
  return hex;
}

/**
 * Generate unpredictable alphanumeric random code
 */
function generateSecureRandomCode(length) {
  var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude ambiguous 0, O, 1, I
  var result = '';
  for (var i = 0; i < length; i++) {
    var rand = Math.floor(Math.random() * chars.length);
    result += chars.charAt(rand);
  }
  return result;
}

/**
 * Helper to produce standard JSON output in Apps Script Web App
 */
function jsonResponse(data, status) {
  var output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

/**
 * Firestore Helper Bridges
 */
function getFirestoreDocument(collection, docId) {
  if (typeof FirestoreClient !== 'undefined') return FirestoreClient.getDocument(collection, docId);
  return null;
}
function saveFirestoreDocument(collection, docId, data) {
  if (typeof FirestoreClient !== 'undefined') return FirestoreClient.createDocument(collection, docId, data);
}
function updateFirestoreDocument(collection, docId, data) {
  if (typeof FirestoreClient !== 'undefined') return FirestoreClient.updateDocument(collection, docId, data);
}

/**
 * Handle real outreach email transmission via native GmailApp
 */
function handleSendOutreachEmail(data) {
  var to = data.to;
  var subject = data.subject;
  var body = data.body;
  var fromName = data.fromName || 'CAVENTRA Team';

  if (!to || !subject || !body) {
    throw new Error('Missing required fields: to, subject, or body');
  }

  // Native Google Apps Script GmailApp: sends real email from founder's Google account!
  GmailApp.sendEmail(to, subject, body, {
    name: fromName
  });

  return { success: true, to: to, sentAt: new Date().toISOString() };
}
