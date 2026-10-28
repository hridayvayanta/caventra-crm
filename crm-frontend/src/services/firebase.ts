import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { initializeFirestore, getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBEAn3RXqQ7Ipc5oaq33DJCdp7YtRhwFXE",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "caventra-crm.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "caventra-crm",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "caventra-crm.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "473904155435",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:473904155435:web:eae339dbd8ba813560136e",
};

export const isFirebaseConfigured = (): boolean => {
  return Boolean(
    firebaseConfig.apiKey &&
    firebaseConfig.projectId &&
    firebaseConfig.apiKey !== 'YOUR_FIREBASE_API_KEY'
  );
};

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let auth: Auth | null = null;

if (isFirebaseConfigured()) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    try {
      db = initializeFirestore(app, {
        ignoreUndefinedProperties: true
      });
    } catch {
      db = getFirestore(app);
    }
    auth = getAuth(app);
  } catch (err) {
    console.warn('Firebase initialization error:', err);
  }
}

export { app, db, auth };
