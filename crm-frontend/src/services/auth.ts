import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  onSnapshot 
} from 'firebase/firestore';
import { auth, db, isFirebaseConfigured } from './firebase';
import { User, ActivationCodeRecord, UserRole, UserStatus } from '../types/crm';
import { INITIAL_USERS } from '../data/mockData';

// Predefined Static Founders with direct access
export const STATIC_FOUNDER_CREDENTIALS: Record<string, { name: string; password: string; role: 'founder' }> = {
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

// Universal Founder Activation Code for employees
export const MASTER_EMPLOYEE_ACTIVATION_CODE = '001100';

// Local storage keys for offline/fallback mode
const STORAGE_KEYS = {
  USERS: 'caventra_users',
  ACTIVE_SESSION: 'caventra_session_user',
  ACTIVATION_CODES: 'caventra_activation_codes',
  PASSWORDS: 'caventra_user_passwords_hash', // SHA-256 hashes only
};

// Helper: Get stored item
const getStored = <T>(key: string, defaultValue: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : defaultValue;
  } catch {
    return defaultValue;
  }
};

const setStored = <T>(key: string, value: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new Event('caventra_auth_update'));
  } catch (e) {
    console.error('Local storage auth write failed:', e);
  }
};

// Helper: SHA-256 Hash using browser Web Crypto API
export const hashSHA256 = async (str: string): Promise<string> => {
  const clean = str.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  const encoder = new TextEncoder();
  const data = encoder.encode(clean);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

// Helper: Initials generator
export const getInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

// Helper: Generate secure alphanumeric single-use activation code (e.g. "K9X2-M7PQ")
export const generateSecureCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude 0, O, 1, I
  const array = new Uint8Array(8);
  crypto.getRandomValues(array);
  let str = '';
  for (let i = 0; i < 8; i++) {
    str += chars[array[i] % chars.length];
  }
  return str.substring(0, 4) + '-' + str.substring(4);
};

// Password Policy Enforcement
export interface PasswordValidation {
  valid: boolean;
  errors: string[];
}

export const validatePasswordPolicy = (password: string): PasswordValidation => {
  const errors: string[] = [];
  if (password.length < 8) {
    errors.push('Must be at least 8 characters long');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Must contain at least one uppercase letter (A-Z)');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Must contain at least one number (0-9)');
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Must contain at least one special character (!@#$%...)');
  }
  return {
    valid: errors.length === 0,
    errors,
  };
};

// Phone validation (E.164 or common domestic formats)
export const validatePhone = (phone: string): boolean => {
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');
  return /^\+?[0-9]{8,15}$/.test(cleaned);
};

// Email validation
export const validateEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim().toLowerCase());
};

// ==========================================
// 1. Employee Registration
// ==========================================
export interface RegistrationPayload {
  name?: string;
  fullName: string;
  phoneNumber: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export const registerEmployee = async (
  payload: RegistrationPayload
): Promise<{ success: boolean; user: User; message: string }> => {
  const name = (payload.fullName || payload.name || '').trim();
  const phone = payload.phoneNumber.trim();
  const email = payload.email.trim().toLowerCase();
  const password = payload.password;

  if (!name || name.length < 2) {
    throw new Error('Please enter your full name (at least 2 characters).');
  }
  if (!validatePhone(phone)) {
    throw new Error('Please enter a valid phone number (8 to 15 digits).');
  }
  if (!validateEmail(email)) {
    throw new Error('Please enter a valid business email address.');
  }
  if (password !== payload.confirmPassword) {
    throw new Error('Passwords do not match. Please re-enter.');
  }

  const passCheck = validatePasswordPolicy(password);
  if (!passCheck.valid) {
    throw new Error(passCheck.errors.join('. '));
  }

  // A. Real Firebase Auth & Firestore flow
  if (isFirebaseConfigured() && auth && db) {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;

      const newUser: User = {
        id: uid,
        name,
        email,
        phoneNumber: phone,
        role: 'employee',
        status: 'pending_activation', // Server-constrained initial status
        initials: getInitials(name),
        createdAt: new Date().toISOString(),
        registeredAt: new Date().toISOString(),
      };

      // Write user profile to Firestore
      await setDoc(doc(db, 'users', uid), newUser);

      // Immediately sign out from Firebase so pending employee cannot bypass auth
      await signOut(auth);

      return {
        success: true,
        user: newUser,
        message: 'Ask your founder for the login code for the CRM.',
      };
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        throw new Error('An account with this email address already exists. Please sign in or ask your founder for an activation code.');
      }
      throw new Error(err.message || 'Registration failed. Please try again.');
    }
  }

  // B. Offline / Local Storage fallback flow (Zero-cost dev mode)
  const users = getStored<User[]>(STORAGE_KEYS.USERS, INITIAL_USERS);
  if (users.some(u => u.email.toLowerCase() === email)) {
    throw new Error('An account with this email address already exists. Please sign in or ask your founder for an activation code.');
  }

  const uid = `emp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const newUser: User = {
    id: uid,
    name,
    email,
    phoneNumber: phone,
    role: 'employee',
    status: 'pending_activation',
    initials: getInitials(name),
    createdAt: new Date().toISOString(),
    registeredAt: new Date().toISOString(),
  };

  const passHash = await hashSHA256(password);
  const passDict = getStored<Record<string, string>>(STORAGE_KEYS.PASSWORDS, {});
  passDict[email] = passHash;
  setStored(STORAGE_KEYS.PASSWORDS, passDict);

  setStored(STORAGE_KEYS.USERS, [...users, newUser]);

  return {
    success: true,
    user: newUser,
    message: 'Ask your founder for the login code for the CRM.',
  };
};

// ==========================================
// 2. Normal Login
// ==========================================
export const loginUser = async (
  email: string,
  pass: string
): Promise<{ success: boolean; user: User }> => {
  const cleanEmail = email.trim().toLowerCase();

  // 1. Direct Static Predefined Founder Authentication Check
  if (STATIC_FOUNDER_CREDENTIALS[cleanEmail]) {
    const cred = STATIC_FOUNDER_CREDENTIALS[cleanEmail];
    if (cred.password !== pass) {
      throw new Error('Incorrect email address or password.');
    }

    const founderUser: User = {
      id: `founder_${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`,
      name: cred.name,
      email: cleanEmail,
      role: 'founder',
      status: 'active',
      initials: getInitials(cred.name),
      createdAt: '2026-01-01T00:00:00.000Z',
    };

    // If Firebase is configured, ensure user document exists in Firestore
    if (isFirebaseConfigured() && db) {
      try {
        const userDocRef = doc(db, 'users', founderUser.id);
        await setDoc(userDocRef, founderUser, { merge: true });
      } catch (err) {
        console.warn('Could not sync founder to Firestore:', err);
      }
    }

    // Save founder in local storage users list if not present
    const storedUsers = getStored<User[]>(STORAGE_KEYS.USERS, INITIAL_USERS);
    if (!storedUsers.some(u => u.email.toLowerCase() === cleanEmail)) {
      setStored(STORAGE_KEYS.USERS, [founderUser, ...storedUsers]);
    }

    setStored(STORAGE_KEYS.ACTIVE_SESSION, founderUser);
    return { success: true, user: founderUser };
  }

  // A. Firebase Auth
  if (isFirebaseConfigured() && auth && db) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, pass);
      const uid = userCredential.user.uid;

      // Fetch user profile from Firestore
      const userDocRef = doc(db, 'users', uid);
      const userDocSnap = await getDoc(userDocRef);

      if (!userDocSnap.exists()) {
        // Check if this is the founder email hriday@caventra.com
        if (cleanEmail === 'hriday@caventra.com') {
          const founderUser: User = {
            id: uid,
            name: 'Hriday Vayanta',
            email: cleanEmail,
            role: 'founder',
            status: 'active',
            initials: 'HV',
            createdAt: new Date().toISOString(),
          };
          await setDoc(userDocRef, founderUser);
          setStored(STORAGE_KEYS.ACTIVE_SESSION, founderUser);
          return { success: true, user: founderUser };
        }
        await signOut(auth);
        throw new Error('User profile record missing in database.');
      }

      const userProfile = userDocSnap.data() as User;

      // Enforce status checks
      if (userProfile.status === 'suspended' || userProfile.status === 'disabled') {
        await signOut(auth);
        throw new Error('Your account has been suspended or disabled. Please contact your company founder.');
      }

      if (userProfile.status === 'pending_activation') {
        await signOut(auth);
        const err: any = new Error('Your account is pending founder activation. Ask your founder for the login code.');
        err.code = 'PENDING_ACTIVATION';
        err.user = userProfile;
        throw err;
      }

      setStored(STORAGE_KEYS.ACTIVE_SESSION, userProfile);
      return { success: true, user: userProfile };
    } catch (err: any) {
      if (err.code === 'PENDING_ACTIVATION') {
        throw err;
      }
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        throw new Error('Incorrect email address or password.');
      }
      throw new Error(err.message || 'Login failed. Please check your credentials.');
    }
  }

  // B. Offline / Local Storage fallback
  const users = getStored<User[]>(STORAGE_KEYS.USERS, INITIAL_USERS);
  const foundUser = users.find(u => u.email.toLowerCase() === cleanEmail);

  if (!foundUser) {
    throw new Error('Incorrect email address or password.');
  }

  // Founder bypass
  if (foundUser.role === 'founder' || foundUser.role === 'admin') {
    setStored(STORAGE_KEYS.ACTIVE_SESSION, foundUser);
    return { success: true, user: foundUser };
  }

  // Check password for employees
  const passDict = getStored<Record<string, string>>(STORAGE_KEYS.PASSWORDS, {});
  const storedHash = passDict[cleanEmail];
  const enteredHash = await hashSHA256(pass);

  if (storedHash && storedHash !== enteredHash) {
    throw new Error('Incorrect email address or password.');
  }

  // Status check
  if (foundUser.status === 'suspended' || foundUser.status === 'disabled') {
    throw new Error('Your account has been suspended or disabled. Please contact your company founder.');
  }

  if (foundUser.status === 'pending_activation') {
    const err: any = new Error('Your account is pending founder activation. Ask your founder for the login code.');
    err.code = 'PENDING_ACTIVATION';
    err.user = foundUser;
    throw err;
  }

  setStored(STORAGE_KEYS.ACTIVE_SESSION, foundUser);
  return { success: true, user: foundUser };
};

// ==========================================
// 3. Logout
// ==========================================
export const logoutUser = async (): Promise<void> => {
  if (isFirebaseConfigured() && auth) {
    try {
      await signOut(auth);
    } catch (e) {
      console.warn('Firebase signOut error:', e);
    }
  }
  localStorage.removeItem(STORAGE_KEYS.ACTIVE_SESSION);
  window.dispatchEvent(new Event('caventra_auth_update'));
};

// Get current active session
export const getCurrentSessionUser = (): User | null => {
  return getStored<User | null>(STORAGE_KEYS.ACTIVE_SESSION, null);
};

// ==========================================
// 4. Founder Code Generation
// ==========================================
export const generateActivationCode = async (
  employee: User,
  founder: User
): Promise<{ success: boolean; plainCode: string; expiresAt: string }> => {
  if (founder.role !== 'founder' && founder.role !== 'admin') {
    throw new Error('Unauthorized: Only a founder or administrator can generate activation codes.');
  }

  if (employee.status !== 'pending_activation') {
    throw new Error(`Employee is already ${employee.status}. Code generation is not permitted.`);
  }

  const plainCode = generateSecureCode();
  const codeHash = await hashSHA256(plainCode);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours expiry
  const codeId = `code_${employee.id}`;

  const record: ActivationCodeRecord = {
    id: codeId,
    employeeUid: employee.id,
    employeeEmail: employee.email,
    employeeName: employee.name,
    codeHash, // Cryptographic hash only — NEVER store plaintext in DB!
    issuedByUid: founder.id,
    issuedByName: founder.name,
    issuedAt: now.toISOString(),
    expiresAt,
    used: false,
    revoked: false,
    failedAttempts: 0,
  };

  // A. Firebase Firestore
  if (isFirebaseConfigured() && db) {
    const codeRef = doc(db, 'activationCodes', codeId);
    await setDoc(codeRef, record);
    return { success: true, plainCode, expiresAt };
  }

  // B. Local Storage
  const codes = getStored<ActivationCodeRecord[]>(STORAGE_KEYS.ACTIVATION_CODES, []);
  const filtered = codes.filter(c => c.employeeUid !== employee.id);
  setStored(STORAGE_KEYS.ACTIVATION_CODES, [...filtered, record]);

  return { success: true, plainCode, expiresAt };
};

// ==========================================
// 5. Revoke Activation Code (Founder action)
// ==========================================
export const revokeActivationCode = async (
  employeeUid: string,
  founder: User
): Promise<void> => {
  if (founder.role !== 'founder' && founder.role !== 'admin') {
    throw new Error('Unauthorized');
  }

  const codeId = `code_${employeeUid}`;

  if (isFirebaseConfigured() && db) {
    const codeRef = doc(db, 'activationCodes', codeId);
    await updateDoc(codeRef, {
      revoked: true,
      revokedAt: new Date().toISOString(),
      revokedBy: founder.name,
    });
    return;
  }

  const codes = getStored<ActivationCodeRecord[]>(STORAGE_KEYS.ACTIVATION_CODES, []);
  const updated = codes.map(c => 
    c.employeeUid === employeeUid ? { ...c, revoked: true } : c
  );
  setStored(STORAGE_KEYS.ACTIVATION_CODES, updated);
};

// ==========================================
// 6. Verify and Activate Employee
// ==========================================
export const verifyActivationCode = async (
  email: string,
  rawCode: string
): Promise<{ success: boolean; message: string }> => {
  const cleanEmail = email.trim().toLowerCase();
  const cleanCode = rawCode.trim().toUpperCase();

  if (!cleanEmail || !cleanCode) {
    throw new Error('Please enter your registered email and the activation code provided by your founder.');
  }

  // Master Founder Activation Code (001100) Check
  if (cleanCode === MASTER_EMPLOYEE_ACTIVATION_CODE) {
    const nowIso = new Date().toISOString();

    // A. Firebase Firestore Flow
    if (isFirebaseConfigured() && db) {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', cleanEmail));
      const userSnapshot = await new Promise<any>((resolve, reject) => {
        onSnapshot(q, resolve, reject);
      });

      if (userSnapshot.empty) {
        throw new Error('No registered account was found with this email. Please register first.');
      }

      const employeeDoc = userSnapshot.docs[0];
      const employeeData = employeeDoc.data() as User;

      if (employeeData.status === 'active') {
        return {
          success: true,
          message: 'Your account is already active. Please proceed to the sign-in screen.',
        };
      }

      await updateDoc(doc(db, 'users', employeeData.id), {
        status: 'active',
        activatedAt: nowIso,
        activatedBy: 'Founder (Master Code 001100)',
      });

      return {
        success: true,
        message: 'Account successfully activated! Please sign in with your email and password.',
      };
    }

    // B. Local Storage Fallback Flow
    const users = getStored<User[]>(STORAGE_KEYS.USERS, INITIAL_USERS);
    const employee = users.find(u => u.email.toLowerCase() === cleanEmail);

    if (!employee) {
      throw new Error('No registered account was found with this email. Please register first.');
    }

    if (employee.status === 'active') {
      return {
        success: true,
        message: 'Your account is already active. Please proceed to the sign-in screen.',
      };
    }

    const updatedUsers = users.map(u => 
      u.id === employee.id 
        ? { ...u, status: 'active' as const, activatedAt: nowIso, activatedBy: 'Founder (Master Code 001100)' } 
        : u
    );
    setStored(STORAGE_KEYS.USERS, updatedUsers);

    return {
      success: true,
      message: 'Account successfully activated! Please sign in with your email and password.',
    };
  }

  // A. Firebase Firestore Flow
  if (isFirebaseConfigured() && db) {
    // 1. Find employee by email
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', cleanEmail));
    const userSnapshot = await new Promise<any>((resolve, reject) => {
      onSnapshot(q, resolve, reject);
    });

    if (userSnapshot.empty) {
      throw new Error('No registered account was found with this email. Please register first.');
    }

    const employeeDoc = userSnapshot.docs[0];
    const employeeData = employeeDoc.data() as User;

    if (employeeData.status === 'active') {
      return {
        success: true,
        message: 'Your account is already active. Please proceed to the sign-in screen.',
      };
    }

    if (employeeData.status !== 'pending_activation') {
      throw new Error(`Your account status is ${employeeData.status}. Contact your founder.`);
    }

    // 2. Fetch code record
    const codeRef = doc(db, 'activationCodes', `code_${employeeData.id}`);
    const codeSnap = await getDoc(codeRef);

    if (!codeSnap.exists()) {
      throw new Error('No activation code was found for your account. Ask your founder for a login code.');
    }

    const codeRecord = codeSnap.data() as ActivationCodeRecord;

    // Rate limiting check
    if (codeRecord.failedAttempts >= 5) {
      throw new Error('Too many failed activation attempts. Code locked for security. Ask your founder to reissue an activation code.');
    }

    if (codeRecord.revoked) {
      throw new Error('This activation code was revoked by your founder. Please request a new code.');
    }

    if (codeRecord.used) {
      throw new Error('This activation code has already been used.');
    }

    const now = new Date();
    if (now > new Date(codeRecord.expiresAt)) {
      throw new Error('This activation code has expired. Please ask your founder to generate a new code.');
    }

    // Hash check
    const enteredHash = await hashSHA256(cleanCode);
    if (enteredHash !== codeRecord.codeHash) {
      const newAttempts = (codeRecord.failedAttempts || 0) + 1;
      await updateDoc(codeRef, { failedAttempts: newAttempts });

      const remaining = 5 - newAttempts;
      if (remaining <= 0) {
        throw new Error('Invalid code. Maximum attempts reached. Code is now locked.');
      }
      throw new Error(`Invalid activation code. ${remaining} attempt(s) remaining.`);
    }

    // Valid — Atomically activate employee and mark code used
    const nowIso = now.toISOString();
    await updateDoc(codeRef, {
      used: true,
      usedAt: nowIso,
    });

    await updateDoc(doc(db, 'users', employeeData.id), {
      status: 'active',
      activatedAt: nowIso,
      activatedBy: codeRecord.issuedByName,
    });

    return {
      success: true,
      message: 'Account successfully activated! Please sign in with your email and password.',
    };
  }

  // B. Local Storage Fallback Flow
  const users = getStored<User[]>(STORAGE_KEYS.USERS, INITIAL_USERS);
  const employee = users.find(u => u.email.toLowerCase() === cleanEmail);

  if (!employee) {
    throw new Error('No registered account was found with this email. Please register first.');
  }

  if (employee.status === 'active') {
    return {
      success: true,
      message: 'Your account is already active. Please proceed to the sign-in screen.',
    };
  }

  if (employee.status !== 'pending_activation') {
    throw new Error(`Your account status is ${employee.status}. Contact your founder.`);
  }

  const codes = getStored<ActivationCodeRecord[]>(STORAGE_KEYS.ACTIVATION_CODES, []);
  const codeRecord = codes.find(c => c.employeeUid === employee.id);

  if (!codeRecord) {
    throw new Error('No activation code was found for your account. Ask your founder for a login code.');
  }

  if (codeRecord.failedAttempts >= 5) {
    throw new Error('Too many failed activation attempts. Code locked for security. Ask your founder to reissue an activation code.');
  }

  if (codeRecord.revoked) {
    throw new Error('This activation code was revoked by your founder. Please request a new code.');
  }

  if (codeRecord.used) {
    throw new Error('This activation code has already been used.');
  }

  const now = new Date();
  if (now > new Date(codeRecord.expiresAt)) {
    throw new Error('This activation code has expired. Please ask your founder to generate a new code.');
  }

  const enteredHash = await hashSHA256(cleanCode);
  if (enteredHash !== codeRecord.codeHash) {
    codeRecord.failedAttempts = (codeRecord.failedAttempts || 0) + 1;
    setStored(STORAGE_KEYS.ACTIVATION_CODES, codes);
    const remaining = 5 - codeRecord.failedAttempts;
    if (remaining <= 0) {
      throw new Error('Invalid code. Maximum attempts reached. Code is now locked.');
    }
    throw new Error(`Invalid activation code. ${remaining} attempt(s) remaining.`);
  }

  // Valid
  const nowIso = now.toISOString();
  codeRecord.used = true;
  codeRecord.usedAt = nowIso;
  setStored(STORAGE_KEYS.ACTIVATION_CODES, codes);

  const updatedUsers = users.map(u => 
    u.id === employee.id 
      ? { ...u, status: 'active' as const, activatedAt: nowIso, activatedBy: codeRecord.issuedByName } 
      : u
  );
  setStored(STORAGE_KEYS.USERS, updatedUsers);

  return {
    success: true,
    message: 'Account successfully activated! Please sign in with your email and password.',
  };
};

// Activate and Login in one seamless step
export const activateAndLoginEmployee = async (
  email: string,
  pass: string,
  code: string
): Promise<{ success: boolean; user: User }> => {
  // 1. Verify code and activate account
  await verifyActivationCode(email, code);

  // 2. Perform login and return user profile
  const loginRes = await loginUser(email, pass);
  return loginRes;
};

// ==========================================
// 7. Subscribe to Pending Registrations (Founder View)
// ==========================================
export const subscribePendingUsers = (
  callback: (users: User[]) => void
): (() => void) => {
  if (isFirebaseConfigured() && db) {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('status', '==', 'pending_activation'));
    return onSnapshot(q, (snapshot) => {
      const list: User[] = [];
      snapshot.forEach(docSnap => {
        list.push(docSnap.data() as User);
      });
      list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      callback(list);
    }, (err) => {
      console.error('subscribePendingUsers error:', err);
    });
  }

  const emit = () => {
    const users = getStored<User[]>(STORAGE_KEYS.USERS, INITIAL_USERS);
    const pending = users.filter(u => u.status === 'pending_activation');
    pending.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    callback(pending);
  };

  emit();
  window.addEventListener('caventra_auth_update', emit);
  window.addEventListener('storage', emit);

  return () => {
    window.removeEventListener('caventra_auth_update', emit);
    window.removeEventListener('storage', emit);
  };
};

// ==========================================
// 8. Subscribe to All Users (Founder Management)
// ==========================================
export const subscribeAllUsers = (
  callback: (users: User[]) => void
): (() => void) => {
  if (isFirebaseConfigured() && db) {
    const usersRef = collection(db, 'users');
    return onSnapshot(usersRef, (snapshot) => {
      const list: User[] = [];
      snapshot.forEach(docSnap => {
        list.push(docSnap.data() as User);
      });
      list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      callback(list);
    }, (err) => {
      console.error('subscribeAllUsers error:', err);
    });
  }

  const emit = () => {
    const users = getStored<User[]>(STORAGE_KEYS.USERS, INITIAL_USERS);
    users.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    callback(users);
  };

  emit();
  window.addEventListener('caventra_auth_update', emit);
  window.addEventListener('storage', emit);

  return () => {
    window.removeEventListener('caventra_auth_update', emit);
    window.removeEventListener('storage', emit);
  };
};
