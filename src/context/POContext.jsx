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

  // Load POs and Expense Accounts
  useEffect(() => {
    if (isFirebaseConfigured && db) {
      // 1. Subscribe to Purchase Orders
      const q = query(collection(db, 'purchase_orders'), orderBy('created_at', 'desc'));
      const unsubscribePOs = onSnapshot(q, (snapshot) => {
        const pos = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
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
            id: doc.id,
            ...doc.data()
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
  }, []);

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

  // Seed default department accounts into Firestore if empty
  const seedDefaultAccounts = async () => {
    if (isFirebaseConfigured && db) {
      for (const acct of DEFAULT_EXPENSE_ACCOUNTS) {
        await setDoc(doc(db, 'expense_accounts', acct.id), acct);
      }
      alert('Department expense codes successfully seeded to Cloud Firestore!');
    } else {
      localStorage.setItem('wca_expense_accounts', JSON.stringify(DEFAULT_EXPENSE_ACCOUNTS));
      setExpenseAccounts(DEFAULT_EXPENSE_ACCOUNTS);
      alert('Reset default accounts in local preview mode.');
    }
  };

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
