import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  auth,
  db,
  storage,
  isFirebaseConfigured
} from '../config/firebase';
import {
  collection,
  doc,
  onSnapshot,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { INITIAL_PURCHASE_ORDERS, DEFAULT_EXPENSE_ACCOUNTS } from '../config/defaultData';
import { useAuth } from './AuthContext';

const POContext = createContext(null);

export function POProvider({ children }) {
  const { currentUser } = useAuth();
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [expenseAccounts, setExpenseAccounts] = useState(DEFAULT_EXPENSE_ACCOUNTS);
  const [loading, setLoading] = useState(true);

  // Load POs and Expense Accounts once authenticated
  useEffect(() => {
    if (isFirebaseConfigured && db) {
      if (!currentUser?.uid) {
        return;
      }
      // 1. Subscribe to Purchase Orders
      const q = query(collection(db, 'purchase_orders'), orderBy('created_at', 'desc'));
      const unsubscribePOs = onSnapshot(q, (snapshot) => {
        const pos = snapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id
        }));
        setPurchaseOrders(pos);
        setLoading(false);
      }, (error) => {
        console.error('Error fetching purchase orders:', error);
        setLoading(false);
      });

      // 2. Subscribe to Expense Accounts
      const unsubscribeAccounts = onSnapshot(collection(db, 'expense_accounts'), (snapshot) => {
        if (!snapshot.empty) {
          const accounts = snapshot.docs.map(doc => ({
            ...doc.data(),
            id: doc.id
          }));
          setExpenseAccounts(accounts);
        }
      });

      return () => {
        unsubscribePOs();
        unsubscribeAccounts();
      };
    } else {
      // Demo / LocalStorage Mode
      const savedPOs = localStorage.getItem('wca_purchase_orders');
      if (savedPOs) {
        try {
          setPurchaseOrders(JSON.parse(savedPOs));
        } catch {
          setPurchaseOrders(INITIAL_PURCHASE_ORDERS);
        }
      } else {
        setPurchaseOrders(INITIAL_PURCHASE_ORDERS);
        localStorage.setItem('wca_purchase_orders', JSON.stringify(INITIAL_PURCHASE_ORDERS));
      }

      const savedAccounts = localStorage.getItem('wca_expense_accounts');
      if (savedAccounts) {
        try {
          setExpenseAccounts(JSON.parse(savedAccounts));
        } catch {
          setExpenseAccounts(DEFAULT_EXPENSE_ACCOUNTS);
        }
      }
      setLoading(false);
    }
  }, [currentUser?.uid]);

  // Save to localStorage when state changes in demo mode
  const syncDemoState = (updatedList) => {
    setPurchaseOrders(updatedList);
    localStorage.setItem('wca_purchase_orders', JSON.stringify(updatedList));
  };

  // Determine target PO year from explicit po_year, purchase_date, or current calendar year (rolls over Jan 1)
  const resolveTargetPOYear = (poYearOrDate) => {
    if (poYearOrDate) {
      const asNum = parseInt(String(poYearOrDate).slice(0, 4), 10);
      if (!isNaN(asNum) && asNum >= 2020 && asNum <= 2100) {
        return asNum;
      }
    }
    return new Date().getFullYear();
  };

  // Compute next sequential PO number from a list of POs for a given year (starts at 0001 on Jan 1 / new year)
  const computeNextPOFromList = (list, targetYear) => {
    const year = resolveTargetPOYear(targetYear);
    const prefix = `PO-${year}-`;
    const existingSeqs = (list || [])
      .map(p => p.po_number || '')
      .filter(num => num.startsWith(prefix))
      .map(num => parseInt(num.replace(prefix, ''), 10))
      .filter(n => !isNaN(n) && n > 0);

    const nextSeq = existingSeqs.length > 0 ? Math.max(...existingSeqs) + 1 : 1;
    return `PO-${year}-${String(nextSeq).padStart(6, '0')}`;
  };

  // Synchronous preview for UI modals
  const previewNextPONumber = (targetYear) => {
    return computeNextPOFromList(purchaseOrders, targetYear);
  };

  // Authoritative sequential PO generator (queries live Firestore so numbers never collide or skip)
  const generateNextPONumber = async (targetYear) => {
    const year = resolveTargetPOYear(targetYear);
    if (isFirebaseConfigured && db) {
      try {
        const snap = await getDocs(collection(db, 'purchase_orders'));
        const allPOs = snap.docs.map(d => d.data());
        return computeNextPOFromList(allPOs, year);
      } catch (err) {
        console.warn('Fallback to local state for PO sequence:', err);
      }
    }
    return computeNextPOFromList(purchaseOrders, year);
  };

  // Upload a receipt file to Firebase Storage (or data URL in demo mode)
  const uploadReceiptFile = async (file, poNumber) => {
    if (isFirebaseConfigured && storage) {
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storageRef = ref(storage, `receipts/${poNumber}/${Date.now()}_${sanitizedName}`);
      const inferredType =
        file.type ||
        (file.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream');
      const uploadResult = await uploadBytes(storageRef, file, { contentType: inferredType });
      const downloadUrl = await getDownloadURL(uploadResult.ref);
      return {
        name: file.name,
        url: downloadUrl,
        type: inferredType,
        size: file.size,
        uploaded_at: new Date().toISOString()
      };
    } else {
      // In demo mode: create a base64 / blob URL for local testing
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve({
            name: file.name,
            url: reader.result,
            type: file.type,
            size: file.size,
            uploaded_at: new Date().toISOString()
          });
        };
        reader.readAsDataURL(file);
      });
    }
  };

  // Submit a new Purchase Order
  const createPurchaseOrder = async (poData, receiptFiles = []) => {
    const targetYear = resolveTargetPOYear(poData.po_year || poData.purchase_date);
    const poNumber = await generateNextPONumber(targetYear);
    const now = new Date().toISOString();

    // Upload receipt files if any
    const uploadedReceipts = [];
    for (const file of receiptFiles) {
      if (file instanceof File) {
        const receiptMeta = await uploadReceiptFile(file, poNumber);
        uploadedReceipts.push(receiptMeta);
      } else {
        uploadedReceipts.push(file);
      }
    }

    const uid = auth?.currentUser?.uid || currentUser?.uid || 'anonymous';
    const email = auth?.currentUser?.email || currentUser?.email || 'staff@wcatrojans.org';
    const displayName = auth?.currentUser?.displayName || currentUser?.displayName || 'Faculty Member';
    const role = currentUser?.role || 'employee';

    const newPO = {
      ...poData,
      po_year: targetYear,
      po_number: poNumber,
      created_by: uid,
      employee_name: displayName,
      employee_email: email,
      receipt_urls: uploadedReceipts,
      status: poData.isDraft ? 'draft' : 'pending_approval',
      created_at: now,
      updated_at: now,
      audit_logs: [
        {
          id: `log_${Date.now()}`,
          timestamp: now,
          actor_name: displayName,
          actor_email: email,
          actor_role: role,
          action: poData.isDraft ? 'DRAFT_CREATED' : 'SUBMITTED',
          details: poData.isDraft
            ? `Saved as draft purchase order (${poNumber})`
            : `Purchase order ${poNumber} submitted for approval (Total: $${Number(poData.total_amount).toFixed(2)})`
        }
      ]
    };

    if (isFirebaseConfigured && db) {
      const docRef = doc(collection(db, 'purchase_orders'));
      newPO.id = docRef.id;
      await setDoc(docRef, { ...newPO, created_at: serverTimestamp(), updated_at: serverTimestamp() });
      return newPO;
    } else {
      newPO.id = `po_${Date.now()}`;
      const updated = [newPO, ...purchaseOrders];
      syncDemoState(updated);
      return newPO;
    }
  };

  // Edit / Resubmit an existing PO
  const updatePurchaseOrder = async (poId, poData, newReceiptFiles = []) => {
    const now = new Date().toISOString();
    const existing = purchaseOrders.find(p => p.id === poId);
    if (!existing) throw new Error('Purchase order not found');

    const currentPOYear = parseInt((existing.po_number || '').split('-')[1], 10) || existing.po_year || new Date().getFullYear();
    const requestedYear = resolveTargetPOYear(poData.po_year || currentPOYear);
    let nextPONumber = existing.po_number;

    if (requestedYear !== currentPOYear) {
      nextPONumber = await generateNextPONumber(requestedYear);
    }

    const uploadedReceipts = [...(existing.receipt_urls || [])];
    for (const file of newReceiptFiles) {
      if (file instanceof File) {
        const meta = await uploadReceiptFile(file, nextPONumber);
        uploadedReceipts.push(meta);
      }
    }

    const updatedPO = {
      ...existing,
      ...poData,
      po_year: requestedYear,
      po_number: nextPONumber,
      receipt_urls: uploadedReceipts,
      status: poData.isDraft ? 'draft' : 'pending_approval',
      updated_at: now,
      audit_logs: [
        ...(existing.audit_logs || []),
        {
          id: `log_${Date.now()}`,
          timestamp: now,
          actor_name: currentUser?.displayName || 'Faculty Staff',
          actor_email: currentUser?.email || 'staff@wcatrojans.org',
          actor_role: currentUser?.role || 'employee',
          action: poData.isDraft ? 'DRAFT_UPDATED' : 'RESUBMITTED',
          details: poData.isDraft
            ? `Draft updated by user (${nextPONumber})`
            : `Resubmitted ${nextPONumber} for accountant approval (Total: $${Number(poData.total_amount).toFixed(2)})`
        }
      ]
    };

    if (isFirebaseConfigured && db) {
      const docRef = doc(db, 'purchase_orders', poId);
      await updateDoc(docRef, { ...updatedPO, updated_at: serverTimestamp() });
    } else {
      const updatedList = purchaseOrders.map(p => p.id === poId ? updatedPO : p);
      syncDemoState(updatedList);
    }
    return updatedPO;
  };

  // Business Office Action: Reassign PO Year (e.g. for POs turned in after Dec 31)
  const reassignPOYear = async (poId, targetYear) => {
    const existing = purchaseOrders.find(p => p.id === poId);
    if (!existing) return null;

    const currentPOYear = parseInt((existing.po_number || '').split('-')[1], 10);
    const nextYear = resolveTargetPOYear(targetYear);
    if (currentPOYear === nextYear) return existing.po_number;

    const newPONumber = await generateNextPONumber(nextYear);
    const now = new Date().toISOString();

    const updatedData = {
      po_year: nextYear,
      po_number: newPONumber,
      updated_at: now,
      audit_logs: [
        ...(existing.audit_logs || []),
        {
          id: `log_${Date.now()}`,
          timestamp: now,
          actor_name: currentUser?.displayName || 'Business Office',
          actor_email: currentUser?.email || 'acctspay@wcatrojans.org',
          actor_role: currentUser?.role || 'accountant',
          action: 'YEAR_REASSIGNED',
          details: `PO year reassigned from ${existing.po_number} to ${newPONumber} (${nextYear} accounting year)`
        }
      ]
    };

    if (isFirebaseConfigured && db) {
      await updateDoc(doc(db, 'purchase_orders', poId), {
        ...updatedData,
        updated_at: serverTimestamp()
      });
    } else {
      const updatedList = purchaseOrders.map(p => p.id === poId ? { ...p, ...updatedData } : p);
      syncDemoState(updatedList);
    }
    return newPONumber;
  };

  // Accountant Action: Approve
  const approvePurchaseOrder = async (poId, approvalNotes = '') => {
    const now = new Date().toISOString();
    const existing = purchaseOrders.find(p => p.id === poId);
    if (!existing) return;

    const updatedData = {
      status: 'approved',
      approval_notes: approvalNotes || 'Approved by Business Office.',
      approved_by: currentUser?.email || 'Business Office',
      approved_at: now,
      updated_at: now,
      audit_logs: [
        ...(existing.audit_logs || []),
        {
          id: `log_${Date.now()}`,
          timestamp: now,
          actor_name: currentUser?.displayName || 'Accountant',
          actor_email: currentUser?.email || 'acctspay@wcatrojans.org',
          actor_role: 'accountant',
          action: 'APPROVED',
          details: `Approved: ${approvalNotes || 'No additional notes provided.'}`
        }
      ]
    };

    if (isFirebaseConfigured && db) {
      await updateDoc(doc(db, 'purchase_orders', poId), {
        ...updatedData,
        updated_at: serverTimestamp()
      });
    } else {
      const updatedList = purchaseOrders.map(p => p.id === poId ? { ...p, ...updatedData } : p);
      syncDemoState(updatedList);
    }
  };

  // Accountant Action: Reject
  const rejectPurchaseOrder = async (poId, rejectionReason) => {
    if (!rejectionReason) throw new Error('A rejection reason is required.');
    const now = new Date().toISOString();
    const existing = purchaseOrders.find(p => p.id === poId);
    if (!existing) return;

    const updatedData = {
      status: 'rejected',
      rejection_reason: rejectionReason,
      rejected_by: currentUser?.email || 'Business Office',
      rejected_at: now,
      updated_at: now,
      audit_logs: [
        ...(existing.audit_logs || []),
        {
          id: `log_${Date.now()}`,
          timestamp: now,
          actor_name: currentUser?.displayName || 'Accountant',
          actor_email: currentUser?.email || 'acctspay@wcatrojans.org',
          actor_role: 'accountant',
          action: 'REJECTED',
          details: `Rejected: ${rejectionReason}`
        }
      ]
    };

    if (isFirebaseConfigured && db) {
      await updateDoc(doc(db, 'purchase_orders', poId), {
        ...updatedData,
        updated_at: serverTimestamp()
      });
    } else {
      const updatedList = purchaseOrders.map(p => p.id === poId ? { ...p, ...updatedData } : p);
      syncDemoState(updatedList);
    }
  };

  // Accountant Action: Mark as Paid / Reimbursed
  const markPurchaseOrderPaid = async (poId, paymentReference = '') => {
    const now = new Date().toISOString();
    const existing = purchaseOrders.find(p => p.id === poId);
    if (!existing) return;

    const updatedData = {
      status: 'paid',
      payment_reference: paymentReference || 'Direct Disbursement',
      paid_at: now,
      updated_at: now,
      audit_logs: [
        ...(existing.audit_logs || []),
        {
          id: `log_${Date.now()}`,
          timestamp: now,
          actor_name: currentUser?.displayName || 'Accountant',
          actor_email: currentUser?.email || 'acctspay@wcatrojans.org',
          actor_role: 'accountant',
          action: 'PAID',
          details: `Disbursed and marked paid. Reference: ${paymentReference || 'N/A'}`
        }
      ]
    };

    if (isFirebaseConfigured && db) {
      await updateDoc(doc(db, 'purchase_orders', poId), {
        ...updatedData,
        updated_at: serverTimestamp()
      });
    } else {
      const updatedList = purchaseOrders.map(p => p.id === poId ? { ...p, ...updatedData } : p);
      syncDemoState(updatedList);
    }
  };

  // Helper to normalize an account ID (e.g. "566400" -> "ACCT-566400")
  const normalizeAccountId = (rawId) => {
    const trimmed = String(rawId || '').trim().toUpperCase();
    if (!trimmed) return '';
    return trimmed.startsWith('ACCT-') ? trimmed : `ACCT-${trimmed}`;
  };

  // Add or Update a single Expense Account in Cloud Firestore
  const saveExpenseAccount = async (accountData) => {
    const id = normalizeAccountId(accountData.id);
    if (!id) throw new Error('Account code is required.');

    const cleanEmails = Array.from(
      new Set(
        (accountData.allowed_emails || [])
          .map(e => String(e || '').trim().toLowerCase())
          .filter(e => e && e.includes('@'))
      )
    );

    const payload = {
      id,
      name: String(accountData.name || '').trim() || id,
      dept: String(accountData.dept || 'General').trim(),
      budget: Number(accountData.budget) || 0,
      allowed_emails: cleanEmails
    };

    // Optimistic state update
    setExpenseAccounts(prev => {
      const idx = prev.findIndex(a => a.id === id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], ...payload };
        if (!isFirebaseConfigured || !db) {
          localStorage.setItem('wca_expense_accounts', JSON.stringify(next));
        }
        return next;
      } else {
        const next = [...prev, payload].sort((a, b) => a.id.localeCompare(b.id));
        if (!isFirebaseConfigured || !db) {
          localStorage.setItem('wca_expense_accounts', JSON.stringify(next));
        }
        return next;
      }
    });

    if (isFirebaseConfigured && db) {
      await setDoc(doc(db, 'expense_accounts', id), {
        ...payload,
        updated_at: serverTimestamp()
      }, { merge: true });
    }
    return payload;
  };

  // Delete an Expense Account from Cloud Firestore
  const deleteExpenseAccount = async (accountId) => {
    if (!accountId) return;
    setExpenseAccounts(prev => {
      const next = prev.filter(a => a.id !== accountId);
      if (!isFirebaseConfigured || !db) {
        localStorage.setItem('wca_expense_accounts', JSON.stringify(next));
      }
      return next;
    });

    if (isFirebaseConfigured && db) {
      await deleteDoc(doc(db, 'expense_accounts', accountId));
    }
  };

  // Bulk import Expense Accounts from CSV / array into Cloud Firestore
  const importExpenseAccounts = async (accountsList = []) => {
    let importedCount = 0;
    for (const raw of accountsList) {
      const id = normalizeAccountId(raw.id || raw.code || raw.account_code);
      if (!id) continue;
      await saveExpenseAccount({
        id,
        name: raw.name || raw.account_name || raw.description || id,
        dept: raw.dept || raw.department || 'General',
        budget: Number(String(raw.budget || '0').replace(/[^0-9.-]/g, '')) || 0,
        allowed_emails: Array.isArray(raw.allowed_emails)
          ? raw.allowed_emails
          : String(raw.allowed_emails || raw.assigned_emails || '')
              .split(/[;,]/)
              .map(s => s.trim().toLowerCase())
              .filter(Boolean)
      });
      importedCount++;
    }
    return importedCount;
  };

  // Seed default department accounts into Firestore
  const seedDefaultAccounts = async () => {
    if (isFirebaseConfigured && db) {
      for (const acct of DEFAULT_EXPENSE_ACCOUNTS) {
        await setDoc(doc(db, 'expense_accounts', acct.id), acct, { merge: true });
      }
    } else {
      localStorage.setItem('wca_expense_accounts', JSON.stringify(DEFAULT_EXPENSE_ACCOUNTS));
      setExpenseAccounts(DEFAULT_EXPENSE_ACCOUNTS);
    }
  };

  // Compute the Expense Accounts a given user is allowed to see
  const getVisibleAccountsForUser = (targetUser = currentUser) => {
    if (!targetUser) return [];
    // Business Office Approvers and System Administrators can see all accounts
    if (targetUser.role === 'admin' || targetUser.role === 'accountant') {
      return expenseAccounts;
    }

    const emailLower = (targetUser.email || '').trim().toLowerCase();
    const userAssignedIds = new Set(
      (targetUser.allowed_accounts || []).map(code => normalizeAccountId(code))
    );
    const matchDept = Boolean(targetUser.match_department_accounts);
    const userDeptLower = (targetUser.department || '').trim().toLowerCase();

    return expenseAccounts.filter(acct => {
      const acctId = normalizeAccountId(acct.id);
      if (userAssignedIds.has(acctId) || userAssignedIds.has(acct.id)) {
        return true;
      }
      if (
        emailLower &&
        Array.isArray(acct.allowed_emails) &&
        acct.allowed_emails.some(e => String(e).trim().toLowerCase() === emailLower)
      ) {
        return true;
      }
      if (
        matchDept &&
        userDeptLower &&
        acct.dept &&
        acct.dept.trim().toLowerCase() === userDeptLower
      ) {
        return true;
      }
      return false;
    });
  };

  const userExpenseAccounts = getVisibleAccountsForUser(currentUser);

  // Delete draft PO
  const deletePurchaseOrder = async (poId) => {
    if (isFirebaseConfigured && db) {
      await deleteDoc(doc(db, 'purchase_orders', poId));
    } else {
      const updatedList = purchaseOrders.filter(p => p.id !== poId);
      syncDemoState(updatedList);
    }
  };

  // Lookup map for fast account name resolution
  const expenseAccountsMap = expenseAccounts.reduce((acc, curr) => {
    acc[curr.id] = curr;
    return acc;
  }, {});

  const value = {
    purchaseOrders,
    expenseAccounts,
    userExpenseAccounts,
    getVisibleAccountsForUser,
    expenseAccountsMap,
    loading,
    previewNextPONumber,
    createPurchaseOrder,
    updatePurchaseOrder,
    reassignPOYear,
    approvePurchaseOrder,
    rejectPurchaseOrder,
    markPurchaseOrderPaid,
    deletePurchaseOrder,
    uploadReceiptFile,
    saveExpenseAccount,
    deleteExpenseAccount,
    importExpenseAccounts,
    seedDefaultAccounts
  };

  return <POContext.Provider value={value}>{children}</POContext.Provider>;
}

export function usePOs() {
  const context = useContext(POContext);
  if (!context) {
    throw new Error('usePOs must be used within a POProvider');
  }
  return context;
}
