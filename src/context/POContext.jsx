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

  // Action: Mark as Received / Delivered (with optional packing slip attachments)
  const markPurchaseOrderReceived = async (poId, receivingNotes = '', packingSlipFiles = []) => {
    const now = new Date().toISOString();
    const existing = purchaseOrders.find(p => p.id === poId);
    if (!existing) return;

    const uploadedPackingSlips = [...(existing.packing_slip_receipts || [])];
    for (const file of packingSlipFiles) {
      if (file instanceof File) {
        const meta = await uploadReceiptFile(file, `${existing.po_number}-PACKING-SLIP`);
        uploadedPackingSlips.push(meta);
      }
    }

    const updatedData = {
      status: 'received',
      is_received: true,
      received_at: now,
      received_by: currentUser?.displayName || currentUser?.email || 'Faculty Staff',
      receiving_notes: receivingNotes || 'All items delivered and verified in good condition.',
      packing_slip_receipts: uploadedPackingSlips,
      updated_at: now,
      audit_logs: [
        ...(existing.audit_logs || []),
        {
          id: `log_${Date.now()}`,
          timestamp: now,
          actor_name: currentUser?.displayName || 'Faculty Staff',
          actor_email: currentUser?.email || 'staff@wcatrojans.org',
          actor_role: currentUser?.role || 'employee',
          action: 'RECEIVED',
          details: `Marked as Received/Delivered. ${receivingNotes ? `Notes: ${receivingNotes}. ` : ''}${uploadedPackingSlips.length > (existing.packing_slip_receipts || []).length ? `(${uploadedPackingSlips.length - (existing.packing_slip_receipts || []).length} packing slip attachment(s) uploaded)` : ''}`
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
    return updatedData;
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

  // Delete a PO (Staff can delete unapproved POs; Business Office/Admins can delete any PO)
  const deletePurchaseOrder = async (poId) => {
    if (!poId) return;
    setPurchaseOrders(prev => prev.filter(p => p.id !== poId));
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

  // Fiscal Year Window (June 1 – May 31, automatically resets every June 1)
  const getFiscalYearInfo = (referenceDate = new Date()) => {
    const year = referenceDate.getFullYear();
    const monthZeroIndexed = referenceDate.getMonth(); // 0=Jan ... 5=June ... 11=Dec
    const startYear = monthZeroIndexed >= 5 ? year : year - 1;
    const endYear = startYear + 1;
    return {
      startYear,
      endYear,
      startDate: `${startYear}-06-01`,
      endDate: `${endYear}-05-31`,
      label: `FY ${startYear}–${endYear}`,
      periodLabel: `June 1, ${startYear} – May 31, ${endYear}`
    };
  };

  const fiscalYearInfo = getFiscalYearInfo();

  // Compute Year-to-Date (since June 1) Spent, Pending/Encumbered, Available $, and % Available per Account
  const accountBudgetStatsMap = (() => {
    const stats = {};

    // Initialize entries for all configured expense accounts
    expenseAccounts.forEach((acct) => {
      const id = normalizeAccountId(acct.id);
      stats[id] = {
        id,
        budget: Number(acct.budget) || 0,
        ytdSpent: 0,      // Approved + Paid POs in current FY (since June 1)
        pendingAmount: 0, // Pending Approval POs in current FY
        poCount: 0
      };
    });

    // Helper to extract YYYY-MM-DD from purchase_date or created_at
    const getPODateStr = (po) => {
      if (po.purchase_date && /^\d{4}-\d{2}-\d{2}/.test(po.purchase_date)) {
        return po.purchase_date.slice(0, 10);
      }
      if (typeof po.created_at === 'string' && /^\d{4}-\d{2}-\d{2}/.test(po.created_at)) {
        return po.created_at.slice(0, 10);
      }
      if (po.created_at && typeof po.created_at.seconds === 'number') {
        return new Date(po.created_at.seconds * 1000).toISOString().slice(0, 10);
      }
      return '';
    };

    purchaseOrders.forEach((po) => {
      if (!po || po.status === 'draft' || po.status === 'rejected') return;

      const poDate = getPODateStr(po);
      // Only include POs within the active Fiscal Year (June 1 – May 31)
      if (poDate && (poDate < fiscalYearInfo.startDate || poDate > fiscalYearInfo.endDate)) {
        return;
      }

      const isSpent = po.status === 'approved' || po.status === 'paid';
      const isPending = po.status === 'pending_approval';
      if (!isSpent && !isPending) return;

      const primaryAcctId = normalizeAccountId(po.department_account_id);
      const poItems = Array.isArray(po.items) ? po.items : [];

      if (poItems.length > 0) {
        const touchedAccounts = new Set();
        poItems.forEach((item) => {
          const itemAcctId = normalizeAccountId(item.account_id || primaryAcctId);
          if (!itemAcctId) return;
          const lineTotal =
            parseFloat(item.total) ||
            (parseFloat(item.qty || 1) * parseFloat(item.unit_price || item.amount || 0) +
              parseFloat(item.shipping_handling || 0) +
              parseFloat(item.tax || 0)) ||
            0;

          if (!stats[itemAcctId]) {
            stats[itemAcctId] = {
              id: itemAcctId,
              budget: Number(expenseAccountsMap[itemAcctId]?.budget) || 0,
              ytdSpent: 0,
              pendingAmount: 0,
              poCount: 0
            };
          }

          if (isSpent) {
            stats[itemAcctId].ytdSpent += lineTotal;
          } else if (isPending) {
            stats[itemAcctId].pendingAmount += lineTotal;
          }
          touchedAccounts.add(itemAcctId);
        });
        touchedAccounts.forEach((aId) => {
          if (stats[aId]) stats[aId].poCount += 1;
        });
      } else if (primaryAcctId) {
        const poTotal = parseFloat(po.total_amount) || 0;
        if (!stats[primaryAcctId]) {
          stats[primaryAcctId] = {
            id: primaryAcctId,
            budget: Number(expenseAccountsMap[primaryAcctId]?.budget) || 0,
            ytdSpent: 0,
            pendingAmount: 0,
            poCount: 0
          };
        }
        if (isSpent) {
          stats[primaryAcctId].ytdSpent += poTotal;
        } else if (isPending) {
          stats[primaryAcctId].pendingAmount += poTotal;
        }
        stats[primaryAcctId].poCount += 1;
      }
    });

    // Compute available balances and percentages
    Object.keys(stats).forEach((id) => {
      const s = stats[id];
      s.available = s.budget - s.ytdSpent;
      s.availableAfterPending = s.budget - s.ytdSpent - s.pendingAmount;
      s.percentAvailable =
        s.budget > 0 ? ((s.budget - s.ytdSpent) / s.budget) * 100 : null;
      s.percentSpent =
        s.budget > 0 ? (s.ytdSpent / s.budget) * 100 : 0;
    });

    return stats;
  })();

  const getAccountBudgetStats = (accountId) => {
    const id = normalizeAccountId(accountId);
    if (!id) return null;
    if (accountBudgetStatsMap[id]) return accountBudgetStatsMap[id];
    const acct = expenseAccountsMap[id];
    const budget = Number(acct?.budget) || 0;
    return {
      id,
      budget,
      ytdSpent: 0,
      pendingAmount: 0,
      available: budget,
      availableAfterPending: budget,
      percentAvailable: budget > 0 ? 100 : null,
      percentSpent: 0,
      poCount: 0
    };
  };

  const value = {
    purchaseOrders,
    expenseAccounts,
    userExpenseAccounts,
    getVisibleAccountsForUser,
    expenseAccountsMap,
    fiscalYearInfo,
    accountBudgetStatsMap,
    getAccountBudgetStats,
    loading,
    previewNextPONumber,
    createPurchaseOrder,
    updatePurchaseOrder,
    reassignPOYear,
    approvePurchaseOrder,
    rejectPurchaseOrder,
    markPurchaseOrderPaid,
    markPurchaseOrderReceived,
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
