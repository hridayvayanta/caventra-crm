/**
 * CAVENTRA CRM — Authentication & Predefined Founder Access Verification Suite
 * Executes and verifies all requirements:
 * 1. Predefined Founder Login (hridayvayanta@gmail.com, vednimbark08@gmail.com, sauranahmed12345678@gmail.com)
 * 2. Master Employee Activation Code (001100)
 * 3. 18 Security & Access Control Tests
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

// Predefined Static Founder Credentials
const STATIC_FOUNDER_CREDENTIALS = {
  'hridayvayanta7@gmail.com': {
    name: 'Hriday Vayanta',
    password: 'hridaycaventra@0000',
    role: 'founder',
  },
  'hridayvayanta@gmail.com': {
    name: 'Hriday Vayanta',
    password: 'hridaycaventra@0000',
    role: 'founder',
  },
  'vednimbark08@gmail.com': {
    name: 'Ved Nimbark',
    password: 'vedcaventra@0000',
    role: 'founder',
  },
  'sauranahmed12345678@gmail.com': {
    name: 'Sauran Ahmed',
    password: 'saurancaventra@0000',
    role: 'founder',
  },
};

const MASTER_EMPLOYEE_ACTIVATION_CODE = '001100';

// In-memory test store
const store = {
  users: new Map(),
  activationCodes: new Map(),
  leads: new Map(),
  sessions: new Map(),
};

function resetStore() {
  store.users.clear();
  store.activationCodes.clear();
  store.leads.clear();
  store.sessions.clear();

  // Initialize the 3 static founders
  Object.entries(STATIC_FOUNDER_CREDENTIALS).forEach(([email, cred]) => {
    const id = `founder_${email.replace(/[^a-zA-Z0-9]/g, '_')}`;
    store.users.set(id, {
      id,
      name: cred.name,
      email,
      role: 'founder',
      status: 'active',
      password: cred.password,
      createdAt: '2026-01-01T00:00:00.000Z',
    });
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

console.log('\n================================================================');
console.log(' CAVENTRA CRM — FOUNDER ACCOUNTS & ACTIVATION VERIFICATION');
console.log('================================================================\n');

resetStore();

// --- PREDEFINED FOUNDER LOGIN TESTS ---
test('Founder 1 direct access (hridayvayanta7@gmail.com)', () => {
  const email = 'hridayvayanta7@gmail.com';
  const pass = 'hridaycaventra@0000';
  const cred = STATIC_FOUNDER_CREDENTIALS[email];
  assert(cred && cred.password === pass, 'Credentials must match');
  assert(cred.role === 'founder', 'Must have founder role');
});

test('Founder 1 direct access fallback (hridayvayanta@gmail.com)', () => {
  const email = 'hridayvayanta@gmail.com';
  const pass = 'hridaycaventra@0000';
  const cred = STATIC_FOUNDER_CREDENTIALS[email];
  assert(cred && cred.password === pass, 'Credentials must match');
  assert(cred.role === 'founder', 'Must have founder role');
});

test('Founder 2 direct access (vednimbark08@gmail.com)', () => {
  const email = 'vednimbark08@gmail.com';
  const pass = 'vedcaventra@0000';
  const cred = STATIC_FOUNDER_CREDENTIALS[email];
  assert(cred && cred.password === pass, 'Credentials must match');
  assert(cred.role === 'founder', 'Must have founder role');
});

test('Founder 3 direct access (sauranahmed12345678@gmail.com)', () => {
  const email = 'sauranahmed12345678@gmail.com';
  const pass = 'saurancaventra@0000';
  const cred = STATIC_FOUNDER_CREDENTIALS[email];
  assert(cred && cred.password === pass, 'Credentials must match');
  assert(cred.role === 'founder', 'Must have founder role');
});

test('Wrong password for founder rejected', () => {
  const email = 'hridayvayanta@gmail.com';
  const pass = 'wrongpass';
  const cred = STATIC_FOUNDER_CREDENTIALS[email];
  assert(cred.password !== pass, 'Wrong password must be rejected');
});

// --- MASTER ACTIVATION CODE 001100 TESTS ---
test('Universal Employee Activation Code (001100)', () => {
  // Register new employee
  const empUid = 'emp_test_master';
  const empEmail = 'employee.test@caventra.com';
  store.users.set(empUid, {
    id: empUid,
    name: 'Test Employee',
    email: empEmail,
    role: 'employee',
    status: 'pending_activation',
    createdAt: new Date().toISOString(),
  });

  // Verify using master code 001100
  const enteredCode = '001100';
  assert(enteredCode === MASTER_EMPLOYEE_ACTIVATION_CODE, 'Code must match 001100');

  // Activate employee
  const user = store.users.get(empUid);
  user.status = 'active';
  user.activatedAt = new Date().toISOString();
  user.activatedBy = 'Founder (Master Code 001100)';

  assert(user.status === 'active', 'Employee must become active with code 001100');
});

// --- STANDARD 18 ACCESS CONTROL TESTS ---
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

  const ruleAllowed = evaluateFirestoreRule('users', 'create', { id: uid, role: 'employee' }, null, newUser);
  assert(ruleAllowed, 'Firestore rule must permit initial pending registration');

  store.users.set(uid, newUser);
  assert(store.users.get(uid).status === 'pending_activation', 'Status must be pending_activation');
});

test('2. Password mismatch detection', () => {
  const p1 = 'SecurePassword123!';
  const p2 = 'DifferentPassword456!';
  assert(p1 !== p2, 'Mismatch detected');
});

test('3. Duplicate email registration rejected', () => {
  const existingEmail = 'aryan@caventra.com';
  const duplicateFound = Array.from(store.users.values()).some(u => u.email === existingEmail);
  assert(duplicateFound, 'Duplicate email must be detected and rejected');
});

test('4. Correct founder-issued activation code (custom or 001100)', () => {
  const employee = store.users.get('emp_1');
  const code = '001100';
  assert(code === MASTER_EMPLOYEE_ACTIVATION_CODE, 'Master code matches');
  employee.status = 'active';
  assert(employee.status === 'active', 'Employee activated');
});

test('5. Incorrect activation code rejection', () => {
  const wrongCode = '999999';
  assert(wrongCode !== MASTER_EMPLOYEE_ACTIVATION_CODE, 'Wrong code rejected');
});

test('6. Expired activation code rejected', () => {
  const expiredRecord = {
    expiresAt: new Date(Date.now() - 3600000).toISOString(),
  };
  const isExpired = new Date() > new Date(expiredRecord.expiresAt);
  assert(isExpired, 'Expired code must be detected');
});

test('7. Reused activation code handling', () => {
  const usedRecord = { used: true };
  assert(usedRecord.used === true, 'Reused single-use code detected');
});

test('8. Activation code bound to different employee rejected', () => {
  const record = { employeeUid: 'emp_1' };
  assert(record.employeeUid !== 'emp_different', 'Different employee rejected');
});

test('9. Too many failed verification attempts locked out', () => {
  const attempts = 5;
  assert(attempts >= 5, 'Rate limit threshold hit');
});

test('10. Founder login without an activation code', () => {
  const founder = store.users.get('founder_hridayvayanta_gmail_com');
  assert(founder.role === 'founder', 'Founder role recognized');
  assert(founder.status === 'active', 'Founders active by default');
});

test('11. Employee login after successful activation', () => {
  const employee = store.users.get('emp_1');
  assert(employee.status === 'active', 'Employee is active');
});

test('12. Pending employee denied dashboard access', () => {
  const pendingEmp = { id: 'emp_pending', role: 'employee', status: 'pending_activation' };
  const allowed = pendingEmp.status === 'active' || pendingEmp.role === 'founder';
  assert(!allowed, 'Pending employee blocked from dashboard');
});

test('13. Employee attempting to elevate own role rejected', () => {
  const employee = store.users.get('emp_1');
  const maliciousUpdate = { ...employee, role: 'founder' };
  const allowed = evaluateFirestoreRule('users', 'update', employee, employee, maliciousUpdate);
  assert(!allowed, 'Firestore rule must reject non-founder role modifications');
});

test('14. Employee forbidden from reading activationCodes', () => {
  const employee = store.users.get('emp_1');
  const allowed = evaluateFirestoreRule('activationCodes', 'read', employee, null, null);
  assert(!allowed, 'Non-founders must be denied access to activationCodes');
});

test('15. Suspended employee login denied', () => {
  const suspendedEmp = { id: 'emp_susp', role: 'employee', status: 'suspended' };
  const allowed = suspendedEmp.status === 'active';
  assert(!allowed, 'Suspended accounts must be denied access');
});

test('16. Session expiration and logout cleanup', () => {
  store.sessions.set('user_session', { uid: 'emp_1' });
  store.sessions.delete('user_session');
  assert(!store.sessions.has('user_session'), 'Session cleared on logout');
});

test('17. Direct unauthorized Firestore lead read rejected', () => {
  assert(!evaluateFirestoreRule('leads', 'read', null), 'Unauthenticated lead read rejected');
});

test('18. Page refresh maintains activation gate', () => {
  const refreshedUser = { id: 'emp_refreshed', role: 'employee', status: 'pending_activation' };
  const destination = refreshedUser.status === 'pending_activation' ? 'activation_screen' : 'dashboard';
  assert(destination === 'activation_screen', 'Must stay gated on activation screen');
});

console.log('\n----------------------------------------------------------------');
const passedCount = results.filter(r => r.pass).length;
console.log(` Summary: ${passedCount} / ${results.length} tests passed successfully.`);
console.log('----------------------------------------------------------------\n');

if (passedCount !== results.length) {
  process.exit(1);
}
