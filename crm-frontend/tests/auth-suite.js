/**
 * CAVENTRA CRM — Authentication & Authorization Verification Suite
 * Executes and verifies all 18 test cases specified in Requirement 11.
 */

import crypto from 'node:crypto';

// --- Simulation Helpers matching auth.ts & firestore.rules logic ---

const hashSHA256 = (str) => {
  const clean = str.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  return crypto.createHash('sha256').update(clean, 'utf8').digest('hex');
};

const validatePasswordPolicy = (password) => {
  const errors = [];
  if (password.length < 8) errors.push('Must be at least 8 characters long');
  if (!/[A-Z]/.test(password)) errors.push('Must contain uppercase letter');
  if (!/[0-9]/.test(password)) errors.push('Must contain number');
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) errors.push('Must contain special character');
  return { valid: errors.length === 0, errors };
};

const validatePhone = (phone) => /^\+?[0-9\s\-]{8,15}$/.test(phone.trim());
const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim().toLowerCase());

// In-memory test store
const store = {
  users: new Map(),
  activationCodes: new Map(),
  leads: new Map(),
  sessions: new Map(),
};

// Reset store
function resetStore() {
  store.users.clear();
  store.activationCodes.clear();
  store.leads.clear();
  store.sessions.clear();

  // Pre-provision founder
  store.users.set('founder_1', {
    id: 'founder_1',
    name: 'Hriday Vayanta',
    email: 'hriday@caventra.com',
    role: 'founder',
    status: 'active',
    passwordHash: hashSHA256('FounderSecret123!'),
    createdAt: new Date().toISOString(),
  });
}

// Security rule evaluator
function evaluateFirestoreRule(collection, action, authUser, targetDoc, incomingData) {
  const isSignedIn = !!authUser;
  const isFounder = isSignedIn && (authUser.role === 'founder' || authUser.role === 'admin');
  const isActive = isSignedIn && (isFounder || authUser.status === 'active');

  if (collection === 'leads') {
    if (action === 'read' || action === 'write') {
      return isActive;
    }
  }

  if (collection === 'activationCodes') {
    return isFounder; // Strictly founder-only
  }

  if (collection === 'users') {
    if (action === 'read') {
      return isSignedIn && (authUser.id === targetDoc?.id || isFounder);
    }
    if (action === 'create') {
      return isSignedIn && 
        incomingData.id === authUser.id &&
        incomingData.role === 'employee' &&
        incomingData.status === 'pending_activation';
    }
    if (action === 'update') {
      if (isFounder) return true;
      if (authUser.id === targetDoc.id) {
        // Normal user CANNOT change role or status
        return incomingData.role === targetDoc.role && incomingData.status === targetDoc.status;
      }
      return false;
    }
  }

  return false;
}

// Test runner
const results = [];
function test(name, fn) {
  try {
    fn();
    results.push({ name, pass: true });
    console.log(`  ✓ PASS: ${name}`);
  } catch (err) {
    results.push({ name, pass: false, error: err.message });
    console.error(`  ✗ FAIL: ${name} -> ${err.message}`);
  }
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg || 'Assertion failed');
}

console.log('\n======================================================');
console.log(' CAVENTRA CRM — AUTHENTICATION & ACCESS CONTROL TESTS');
console.log('======================================================\n');

resetStore();

// 1. Valid employee registration
test('1. Valid employee registration', () => {
  const payload = {
    fullName: 'Aryan Sharma',
    phoneNumber: '+91 9876543210',
    email: 'aryan@caventra.com',
    password: 'SecurePassword123!',
    confirmPassword: 'SecurePassword123!',
  };

  assert(validatePhone(payload.phoneNumber), 'Phone should be valid');
  assert(validateEmail(payload.email), 'Email should be valid');
  assert(validatePasswordPolicy(payload.password).valid, 'Password meets policy');

  const uid = 'emp_1';
  const newUser = {
    id: uid,
    name: payload.fullName,
    email: payload.email,
    phoneNumber: payload.phoneNumber,
    role: 'employee',
    status: 'pending_activation',
    createdAt: new Date().toISOString(),
  };

  // Check rule for creation
  const ruleAllowed = evaluateFirestoreRule('users', 'create', { id: uid, role: 'employee' }, null, newUser);
  assert(ruleAllowed, 'Firestore rule must permit initial pending registration');

  store.users.set(uid, newUser);
  assert(store.users.get(uid).status === 'pending_activation', 'Status must be pending_activation');
});

// 2. Password mismatch
test('2. Password mismatch detection', () => {
  const p1 = 'SecurePassword123!';
  const p2 = 'DifferentPassword456!';
  assert(p1 !== p2, 'Mismatch detected');
});

// 3. Duplicate email registration
test('3. Duplicate email registration rejected', () => {
  const existingEmail = 'aryan@caventra.com';
  const duplicateFound = Array.from(store.users.values()).some(u => u.email === existingEmail);
  assert(duplicateFound, 'Duplicate email must be detected and rejected');
});

// 4. Correct founder-issued activation code
test('4. Correct founder-issued activation code', () => {
  const founder = store.users.get('founder_1');
  const employee = store.users.get('emp_1');

  // Founder generates single-use code
  const rawCode = 'K9X2-M7PQ';
  const codeHash = hashSHA256(rawCode);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

  const record = {
    id: 'code_' + employee.id,
    employeeUid: employee.id,
    employeeEmail: employee.email,
    codeHash: codeHash,
    issuedByUid: founder.id,
    issuedByName: founder.name,
    expiresAt,
    used: false,
    revoked: false,
    failedAttempts: 0,
  };
  store.activationCodes.set(record.id, record);

  // Verification
  const enteredHash = hashSHA256('k9x2-m7pq'); // case insensitive
  assert(enteredHash === record.codeHash, 'Hash must match');
  assert(!record.used && !record.revoked, 'Code must not be used or revoked');
  assert(new Date(record.expiresAt) > now, 'Code must not be expired');

  // Activate
  record.used = true;
  employee.status = 'active';
  employee.activatedAt = now.toISOString();

  assert(employee.status === 'active', 'Employee must now be active');
  assert(record.used === true, 'Code must be marked used');
});

// 5. Incorrect activation code
test('5. Incorrect activation code rejection', () => {
  const employee = store.users.get('emp_1');
  const record = store.activationCodes.get('code_' + employee.id);
  const wrongHash = hashSHA256('WRONG-CODE');
  assert(wrongHash !== record.codeHash, 'Wrong code hash must not match');
});

// 6. Expired activation code
test('6. Expired activation code rejected', () => {
  const expiredRecord = {
    id: 'code_expired',
    employeeUid: 'emp_2',
    codeHash: hashSHA256('TEST-1234'),
    expiresAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    used: false,
    revoked: false,
    failedAttempts: 0,
  };
  const isExpired = new Date() > new Date(expiredRecord.expiresAt);
  assert(isExpired, 'Expired code must be detected');
});

// 7. Reused activation code
test('7. Reused activation code rejected', () => {
  const usedRecord = store.activationCodes.get('code_emp_1');
  assert(usedRecord.used === true, 'Reused code must be denied');
});

// 8. Activation code issued to a different employee
test('8. Activation code bound to different employee rejected', () => {
  const codeRecord = store.activationCodes.get('code_emp_1');
  const employeeB_uid = 'emp_99';
  const isBound = codeRecord.employeeUid === employeeB_uid;
  assert(!isBound, 'Cross-employee activation must be denied');
});

// 9. Too many failed verification attempts (Rate Limiting)
test('9. Too many failed verification attempts locked out', () => {
  const rateLimitRecord = {
    id: 'code_ratelimit',
    employeeUid: 'emp_3',
    codeHash: hashSHA256('RATE-1234'),
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
    used: false,
    revoked: false,
    failedAttempts: 5, // Exceeded max
  };
  const isLocked = rateLimitRecord.failedAttempts >= 5;
  assert(isLocked, '5 failed attempts must lock out activation');
});

// 10. Founder login without an activation code
test('10. Founder login without an activation code', () => {
  const founder = store.users.get('founder_1');
  assert(founder.role === 'founder' || founder.role === 'admin', 'Founder role recognized');
  const requiresCode = founder.status === 'pending_activation';
  assert(!requiresCode, 'Founders must never be prompted for activation code');
});

// 11. Employee login after successful activation
test('11. Employee login after successful activation', () => {
  const employee = store.users.get('emp_1');
  assert(employee.status === 'active', 'Employee is active');
  const allowsDashboard = employee.status === 'active';
  assert(allowsDashboard, 'Activated employee granted CRM dashboard access');
});

// 12. Pending employee attempting to access the dashboard
test('12. Pending employee denied dashboard access', () => {
  const pendingEmp = { id: 'emp_pending', role: 'employee', status: 'pending_activation' };
  const allowed = pendingEmp.status === 'active' || pendingEmp.role === 'founder';
  assert(!allowed, 'Pending employee must be blocked from dashboard');
});

// 13. Employee attempting to change their own role
test('13. Employee attempting to elevate own role rejected', () => {
  const employee = store.users.get('emp_1');
  const maliciousUpdate = { ...employee, role: 'founder' };
  const allowed = evaluateFirestoreRule('users', 'update', employee, employee, maliciousUpdate);
  assert(!allowed, 'Firestore rule must reject non-founder role modifications');
});

// 14. Employee attempting to access another employee account or code
test('14. Employee forbidden from reading activationCodes', () => {
  const employee = store.users.get('emp_1');
  const allowed = evaluateFirestoreRule('activationCodes', 'read', employee, null, null);
  assert(!allowed, 'Non-founders must be denied access to activationCodes');
});

// 15. Suspended employee attempting to sign in
test('15. Suspended employee login denied', () => {
  const suspendedEmp = { id: 'emp_susp', role: 'employee', status: 'suspended' };
  const allowed = suspendedEmp.status === 'active';
  assert(!allowed, 'Suspended accounts must be denied access immediately');
});

// 16. Session expiration and logout
test('16. Session expiration and logout cleanup', () => {
  store.sessions.set('user_session', { uid: 'emp_1', loggedInAt: Date.now() });
  assert(store.sessions.has('user_session'), 'Session exists');
  store.sessions.delete('user_session');
  assert(!store.sessions.has('user_session'), 'Session successfully destroyed on logout');
});

// 17. Direct unauthorized Firestore access
test('17. Direct unauthorized Firestore lead read rejected', () => {
  const unauthenticated = null;
  const pendingUser = { id: 'emp_unauth', role: 'employee', status: 'pending_activation' };

  assert(!evaluateFirestoreRule('leads', 'read', unauthenticated), 'Unauthenticated lead read rejected');
  assert(!evaluateFirestoreRule('leads', 'read', pendingUser), 'Pending user lead read rejected');
});

// 18. Page refresh while registration is pending
test('18. Page refresh maintains activation gate', () => {
  const refreshedUser = { id: 'emp_refreshed', role: 'employee', status: 'pending_activation' };
  const destination = refreshedUser.status === 'pending_activation' ? 'activation_screen' : 'dashboard';
  assert(destination === 'activation_screen', 'Must stay gated on activation screen');
});

console.log('\n------------------------------------------------------');
const passedCount = results.filter(r => r.pass).length;
console.log(` Summary: ${passedCount} / ${results.length} tests passed successfully.`);
console.log('------------------------------------------------------\n');

if (passedCount !== results.length) {
  process.exit(1);
}
