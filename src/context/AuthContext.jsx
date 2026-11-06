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
import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp
} from 'firebase/firestore';
import { DEMO_USERS, INITIAL_DIRECTORY_USERS } from '../config/defaultData';

const AuthContext = createContext(null);

const ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAILS || 'jruble@wcatrojans.org')
  .split(',')
  .map(e => e.trim().toLowerCase());

const ACCOUNTANT_EMAILS = (import.meta.env.VITE_ACCOUNTANT_EMAILS || 'jruble@wcatrojans.org,acctspay@wcatrojans.org,acctpay@wcatrojans.org,businessoffice@wcatrojans.org')
  .split(',')
  .map(e => e.trim().toLowerCase());

const DEMO_USERS_STORAGE_KEY = 'wca_directory_users_v1';

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [isDemoMode, setIsDemoMode] = useState(!isFirebaseConfigured);

  // Sync Users Directory from Firestore (or localStorage in Demo Mode)
  useEffect(() => {
    if (isFirebaseConfigured && db) {
      const usersRef = collection(db, 'users');
      const unsubUsers = onSnapshot(
        usersRef,
        (snapshot) => {
          const loaded = snapshot.docs.map(d => ({
            id: d.id,
            ...d.data()
          }));
          setUsersList(loaded);
        },
        (err) => {
          console.warn('Could not subscribe to users collection:', err);
          setUsersList(INITIAL_DIRECTORY_USERS);
        }
      );
      return () => unsubUsers();
    } else {
      const saved = localStorage.getItem(DEMO_USERS_STORAGE_KEY);
      if (saved) {
        try {
          setUsersList(JSON.parse(saved));
        } catch {
          setUsersList(INITIAL_DIRECTORY_USERS);
        }
      } else {
        setUsersList(INITIAL_DIRECTORY_USERS);
        localStorage.setItem(DEMO_USERS_STORAGE_KEY, JSON.stringify(INITIAL_DIRECTORY_USERS));
      }
    }
  }, []);

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

          // Determine role from .env lists and Firestore user profile
          let role = 'employee';
          let department = 'Faculty / Staff';
          const emailLower = user.email.toLowerCase();

          if (ADMIN_EMAILS.includes(emailLower)) {
            role = 'admin';
            department = 'IT & Administration';
          } else if (ACCOUNTANT_EMAILS.includes(emailLower)) {
            role = 'accountant';
            department = 'Accounting & Business Office';
          }

          if (db) {
            try {
              const userDocRef = doc(db, 'users', user.uid);
              const userSnap = await getDoc(userDocRef);

              // Also check if an admin pre-authorized this email prior to first login
              const preAuthExactId = `pre_${emailLower}`;
              const preAuthLegacyId = `pre_${emailLower.replace(/[^a-z0-9]/g, '_')}`;
              const preAuthExactRef = doc(db, 'users', preAuthExactId);
              const preAuthLegacyRef = doc(db, 'users', preAuthLegacyId);
              const [preExactSnap, preLegacySnap] = await Promise.all([
                getDoc(preAuthExactRef),
                getDoc(preAuthLegacyRef)
              ]);

              const activePreSnap = preExactSnap.exists() ? preExactSnap : (preLegacySnap.exists() ? preLegacySnap : null);
              if (activePreSnap) {
                const preData = activePreSnap.data();
                if (preData.role) role = preData.role;
                if (preData.department) department = preData.department;
              }

              if (userSnap.exists()) {
                const existingData = userSnap.data();
                if (existingData.department) {
                  department = existingData.department;
                }
                // Respect Firestore role unless .env explicitly grants higher role
                if (ADMIN_EMAILS.includes(emailLower)) {
                  role = 'admin';
                } else if (ACCOUNTANT_EMAILS.includes(emailLower) && (!existingData.role || existingData.role === 'employee')) {
                  role = 'accountant';
                } else if (existingData.role) {
                  role = existingData.role;
                }

                await setDoc(userDocRef, {
                  uid: user.uid,
                  displayName: user.displayName || existingData.displayName || user.email.split('@')[0],
                  email: emailLower,
                  photoURL: user.photoURL || existingData.photoURL || '',
                  role: role,
                  department: department,
                  last_login: serverTimestamp()
                }, { merge: true });
              } else {
                // First-time sign in: save profile to Firestore
                await setDoc(userDocRef, {
                  uid: user.uid,
                  displayName: user.displayName || user.email.split('@')[0],
                  email: emailLower,
                  photoURL: user.photoURL || '',
                  role: role,
                  department: department,
                  created_at: serverTimestamp(),
                  last_login: serverTimestamp()
                }, { merge: true });
              }

              // Clean up consumed pre-authorization doc(s) after user profile is saved
              if (preExactSnap.exists()) {
                await deleteDoc(preAuthExactRef).catch(() => {});
              }
              if (preLegacySnap.exists()) {
                await deleteDoc(preAuthLegacyRef).catch(() => {});
              }
            } catch (err) {
              console.warn('Could not read/write user profile in Firestore:', err);
            }
          }

          setCurrentUser({
            uid: user.uid,
            displayName: user.displayName || user.email.split('@')[0],
            email: user.email,
            photoURL: user.photoURL,
            role: role,
            department: department
          });
          setAuthError(null);
        } else {
          setCurrentUser(null);
        }
        setLoading(false);
      });
      return () => unsubscribe();
    } else {
      // In Demo Mode: load saved demo user from localStorage or default to admin
      const savedUserKey = localStorage.getItem('wca_demo_user_role') || 'admin';
      setCurrentUser(DEMO_USERS[savedUserKey] || DEMO_USERS.admin);
      setIsDemoMode(true);
      setLoading(false);
    }
  }, []);

  // Keep currentUser's role & department live-synced if an Admin updates it in Firestore
  useEffect(() => {
    if (!currentUser || isDemoMode || !usersList.length) return;
    const match = usersList.find(
      (u) =>
        u.id === currentUser.uid ||
        u.uid === currentUser.uid ||
        (u.email && currentUser.email && u.email.toLowerCase() === currentUser.email.toLowerCase())
    );
    if (match && match.role && (match.role !== currentUser.role || match.department !== currentUser.department)) {
      setCurrentUser((prev) =>
        prev
          ? {
              ...prev,
              role: match.role,
              department: match.department || prev.department
            }
          : prev
      );
    }
  }, [usersList, currentUser, isDemoMode]);

  // Automatic 60-Minute Idle Session Timeout for Signed-In Users
  useEffect(() => {
    if (!currentUser || isDemoMode || !isFirebaseConfigured || !auth) return;

    const IDLE_TIMEOUT_MS = 60 * 60 * 1000; // 60 minutes
    let idleTimer = null;

    const resetIdleTimer = () => {
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(async () => {
        try {
          await firebaseSignOut(auth);
          setCurrentUser(null);
          setAuthError('Your session automatically signed out after 60 minutes of inactivity. Please sign in again.');
        } catch (err) {
          console.warn('Idle timeout sign-out failed:', err);
        }
      }, IDLE_TIMEOUT_MS);
    };

    const activityEvents = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    activityEvents.forEach((evt) => window.addEventListener(evt, resetIdleTimer, { passive: true }));
    resetIdleTimer();

    return () => {
      if (idleTimer) clearTimeout(idleTimer);
      activityEvents.forEach((evt) => window.removeEventListener(evt, resetIdleTimer));
    };
  }, [currentUser, isDemoMode]);

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

  // Demo / Dev Mode role switch (Employee vs Accountant vs Admin)
  const switchDemoRole = (roleKey) => {
    if (isDemoMode && DEMO_USERS[roleKey]) {
      setCurrentUser(DEMO_USERS[roleKey]);
      localStorage.setItem('wca_demo_user_role', roleKey);
    }
  };

  // Helper to sync demo user directory
  const syncDemoUsers = (nextList) => {
    setUsersList(nextList);
    localStorage.setItem(DEMO_USERS_STORAGE_KEY, JSON.stringify(nextList));
  };

  // Update a user's role ('employee' | 'accountant' | 'admin')
  const updateUserRole = async (userId, newRole) => {
    if (!userId || !newRole) return;
    if (isFirebaseConfigured && db) {
      await updateDoc(doc(db, 'users', userId), {
        role: newRole,
        updated_at: serverTimestamp()
      });
    } else {
      const updated = usersList.map(u =>
        (u.id === userId || u.uid === userId) ? { ...u, role: newRole } : u
      );
      syncDemoUsers(updated);
    }

    if (currentUser && (currentUser.uid === userId || currentUser.id === userId)) {
      setCurrentUser(prev => prev ? { ...prev, role: newRole } : prev);
    }
  };

  // Update a user's department
  const updateUserDepartment = async (userId, newDepartment) => {
    if (!userId) return;
    if (isFirebaseConfigured && db) {
      await updateDoc(doc(db, 'users', userId), {
        department: newDepartment,
        updated_at: serverTimestamp()
      });
    } else {
      const updated = usersList.map(u =>
        (u.id === userId || u.uid === userId) ? { ...u, department: newDepartment } : u
      );
      syncDemoUsers(updated);
    }

    if (currentUser && (currentUser.uid === userId || currentUser.id === userId)) {
      setCurrentUser(prev => prev ? { ...prev, department: newDepartment } : prev);
    }
  };

  // Pre-authorize or add a user by email
  const addOrPreauthorizeUser = async ({ displayName, email, role = 'employee', department = 'Faculty / Staff' }) => {
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw new Error('Please enter a valid @wcatrojans.org email address.');
    }

    const existing = usersList.find(u => u.email?.toLowerCase() === cleanEmail);
    const docId = existing?.id || `pre_${cleanEmail}`;
    const payload = {
      uid: existing?.uid || docId,
      displayName: (displayName || cleanEmail.split('@')[0]).trim(),
      email: cleanEmail,
      role,
      department: (department || 'Faculty / Staff').trim(),
      photoURL: existing?.photoURL || '',
      last_login: existing?.last_login || null
    };

    if (isFirebaseConfigured && db) {
      await setDoc(doc(db, 'users', docId), {
        ...payload,
        updated_at: serverTimestamp()
      }, { merge: true });
    } else {
      const existsIdx = usersList.findIndex(u => u.id === docId || u.email?.toLowerCase() === cleanEmail);
      if (existsIdx >= 0) {
        const next = [...usersList];
        next[existsIdx] = { ...next[existsIdx], ...payload, id: docId };
        syncDemoUsers(next);
      } else {
        syncDemoUsers([{ ...payload, id: docId }, ...usersList]);
      }
    }
  };

  // Remove a user from directory
  const deleteDirectoryUser = async (userId) => {
    if (!userId) return;
    if (isFirebaseConfigured && db) {
      await deleteDoc(doc(db, 'users', userId));
    } else {
      syncDemoUsers(usersList.filter(u => u.id !== userId && u.uid !== userId));
    }
  };

  // Seed default WCA staff & approvers into Firestore
  const seedDefaultUsers = async () => {
    if (isFirebaseConfigured && db) {
      for (const usr of INITIAL_DIRECTORY_USERS) {
        // Avoid overwriting an already-linked real Google UID with the same email
        const alreadyByEmail = usersList.find(
          u => u.email?.toLowerCase() === usr.email.toLowerCase() && u.id !== usr.id
        );
        const targetId = alreadyByEmail ? alreadyByEmail.id : usr.id;
        await setDoc(doc(db, 'users', targetId), {
          ...usr,
          uid: alreadyByEmail?.uid || usr.uid,
          updated_at: serverTimestamp()
        }, { merge: true });
      }
    } else {
      syncDemoUsers(INITIAL_DIRECTORY_USERS);
    }
  };

  const value = {
    currentUser,
    usersList,
    loading,
    authError,
    setAuthError,
    isDemoMode,
    loginWithGoogle,
    logout,
    switchDemoRole,
    updateUserRole,
    updateUserDepartment,
    addOrPreauthorizeUser,
    deleteDirectoryUser,
    seedDefaultUsers,
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
