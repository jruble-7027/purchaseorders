import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  auth,
  db,
  googleProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  isFirebaseConfigured,
  isDomainAllowed,
  ALLOWED_DOMAINS
} from '../config/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { DEMO_USERS } from '../config/defaultData';

const AuthContext = createContext(null);

const ACCOUNTANT_EMAILS = (import.meta.env.VITE_ACCOUNTANT_EMAILS || 'businessoffice@wcatrojans.org,robert.accountant@wcatrojans.org')
  .split(',')
  .map(e => e.trim().toLowerCase());

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [isDemoMode, setIsDemoMode] = useState(!isFirebaseConfigured);

  // Initialize Auth state
  useEffect(() => {
    if (isFirebaseConfigured && auth) {
      const unsubscribe = auth.onAuthStateChanged(async (user) => {
        if (user) {
          // Verify institutional email domain
          if (!isDomainAllowed(user.email)) {
            setAuthError(
              `Access Restricted: ${user.email} is not authorized. Please log in with your Wesleyan Christian Academy (@${ALLOWED_DOMAINS.join(' or @')}) account.`
            );
            await firebaseSignOut(auth);
            setCurrentUser(null);
            setLoading(false);
            return;
          }

          // Check role: first from Firestore user doc, then accountant list, then local override, else 'employee'
          let role = 'employee';
          const emailLower = user.email.toLowerCase();

          if (ACCOUNTANT_EMAILS.includes(emailLower)) {
            role = 'accountant';
          }

          if (db) {
            try {
              const userDocRef = doc(db, 'users', user.uid);
              const userSnap = await getDoc(userDocRef);
              if (userSnap.exists() && userSnap.data().role) {
                role = userSnap.data().role;
              } else {
                // First-time sign in: save profile to Firestore
                await setDoc(userDocRef, {
                  uid: user.uid,
                  displayName: user.displayName || user.email.split('@')[0],
                  email: user.email,
                  photoURL: user.photoURL || '',
                  role: role,
                  created_at: serverTimestamp(),
                  last_login: serverTimestamp()
                }, { merge: true });
              }
            } catch (err) {
              console.warn('Could not read user profile from Firestore:', err);
            }
          }

          const localOverride = localStorage.getItem(`wca_role_${user.uid}`);
          if (localOverride) {
            role = localOverride;
          }

          setCurrentUser({
            uid: user.uid,
            displayName: user.displayName || user.email.split('@')[0],
            email: user.email,
            photoURL: user.photoURL,
            role: role
          });
          setAuthError(null);
        } else {
          setCurrentUser(null);
        }
        setLoading(false);
      });
      return () => unsubscribe();
    } else {
      // In Demo Mode: load saved demo user from localStorage or default to employee
      const savedUserKey = localStorage.getItem('wca_demo_user_role') || 'employee';
      setCurrentUser(DEMO_USERS[savedUserKey] || DEMO_USERS.employee);
      setIsDemoMode(true);
      setLoading(false);
    }
  }, []);

  // Login with Google Workspace SSO
  const loginWithGoogle = async () => {
    setAuthError(null);
    if (!isFirebaseConfigured || !auth) {
      alert('Firebase credentials are not set in .env. Switched to Interactive Development Mode.');
      return;
    }

    try {
      setLoading(true);
      const result = await signInWithPopup(auth, googleProvider);
      if (!isDomainAllowed(result.user.email)) {
        throw new Error(
          `Domain restriction: Only @${ALLOWED_DOMAINS.join(' or @')} accounts are permitted.`
        );
      }
    } catch (err) {
      console.error('SSO Login Error:', err);
      setAuthError(err.message || 'Failed to authenticate via Google SSO.');
      if (auth.currentUser) {
        await firebaseSignOut(auth);
      }
      setCurrentUser(null);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    if (isFirebaseConfigured && auth) {
      await firebaseSignOut(auth);
    }
    setCurrentUser(null);
  };

  // Demo / Dev Mode role switch (Employee vs Accountant)
  const switchDemoRole = (roleKey) => {
    if (DEMO_USERS[roleKey]) {
      setCurrentUser(DEMO_USERS[roleKey]);
      localStorage.setItem('wca_demo_user_role', roleKey);
    } else if (currentUser) {
      // If signed in with real account, allow testing role toggle
      const updated = { ...currentUser, role: roleKey };
      setCurrentUser(updated);
      localStorage.setItem(`wca_role_${currentUser.uid}`, roleKey);
    }
  };

  const value = {
    currentUser,
    loading,
    authError,
    setAuthError,
    isDemoMode,
    loginWithGoogle,
    logout,
    switchDemoRole,
    allowedDomains: ALLOWED_DOMAINS
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
