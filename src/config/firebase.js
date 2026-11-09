import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyBTm9Q55Yt8kLB-kzE8ac7K20XGAnfmZvM',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'purchaseorders-903ee.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'purchaseorders-903ee',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'purchaseorders-903ee.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '852117235396',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:852117235396:web:dfec4b17e8d527be484b91',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-7HWHWHLVL9',
};

// Check if valid Firebase configuration has been supplied
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.projectId &&
  firebaseConfig.apiKey !== 'your-api-key-here'
);

let app = null;
let auth = null;
let db = null;
let storage = null;
let googleProvider = null;

if (isFirebaseConfigured) {
  try {
    app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
    googleProvider = new GoogleAuthProvider();
    googleProvider.setCustomParameters({
      prompt: 'select_account'
    });
  } catch (err) {
    console.error('Failed to initialize Firebase SDK:', err);
  }
}

// Domain verification helper
export const ALLOWED_DOMAINS = (import.meta.env.VITE_ALLOWED_DOMAINS || 'wcatrojans.org,wesed.org')
  .split(',')
  .map(d => d.trim().toLowerCase());

export function isDomainAllowed(email) {
  if (!email || !email.includes('@')) return false;
  const domain = email.split('@')[1].toLowerCase();
  return ALLOWED_DOMAINS.includes(domain);
}

export { app, auth, db, storage, googleProvider, signInWithPopup, signOut };
