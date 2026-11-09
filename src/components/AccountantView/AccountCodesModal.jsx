import React, { useState, useRef } from 'react';
import { usePOs } from '../../context/POContext';
import { useAuth } from '../../context/AuthContext';
import {
  X,
  Plus,
  Search,
  Upload,
  Download,
  Edit3,
  Trash2,
  CheckCircle2,
  Database,
  Users,
  Building2,
  Hash
} from 'lucide-react';

export default function AccountCodesModal({ isOpen, onClose }) {
  const {
    expenseAccounts,
    fiscalYearInfo,
    getAccountBudgetStats,
    saveExpenseAccount,
    deleteExpenseAccount,
    importExpenseAccounts,
    seedDefaultAccounts
  } = usePOs();
  const { usersList, updateUserAllowedAccounts } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusMessage, setStatusMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  // Add / Edit Form State
  const [isEditingFormOpen, setIsEditingFormOpen] = useState(false);
  const [editingCodeId, setEditingCodeId] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formDept, setFormDept] = useState('IT Technology');
  const [formBudget, setFormBudget] = useState('');
  const [selectedEmails, setSelectedEmails] = useState([]);
  const [customEmailInput, setCustomEmailInput] = useState('');
  const [saving, setSaving] = useState(false);

  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const showToast = (msg) => {
    setErrorMessage(null);
    setStatusMessage(msg);
    setTimeout(() => {
      setStatusMessage((prev) => (prev === msg ? null : prev));
    }, 4000);
  };

  const formatShortCode = (id = '') => id.replace(/^ACCT-/i, '');

  // Also collect users who have this account in their user.allowed_accounts array
  const getAssignedUsersForAccount = (acct) => {
    const set = new Set(
      (acct.allowed_emails || []).map((e) => String(e).trim().toLowerCase()).filter(Boolean)
    );
    usersList.forEach((u) => {
      if (
        u.email &&
        Array.isArray(u.allowed_accounts) &&
        (u.allowed_accounts.includes(acct.id) ||
          u.allowed_accounts.includes(formatShortCode(acct.id)))
      ) {
        set.add(u.email.toLowerCase());
      }
    });
    return Array.from(set);
  };

  const openAddForm = () => {
    setEditingCodeId('');
    setFormCode('');
    setFormName('');
    setFormDept('IT Technology');
    setFormBudget('');
    setSelectedEmails([]);
    setCustomEmailInput('');
    setErrorMessage(null);
    setIsEditingFormOpen(true);
  };

  const openEditForm = (acct) => {
    setEditingCodeId(acct.id);
    setFormCode(formatShortCode(acct.id));
    setFormName(acct.name || '');
    setFormDept(acct.dept || 'General');
    setFormBudget(String(acct.budget ?? 0));
    setSelectedEmails(getAssignedUsersForAccount(acct));
    setCustomEmailInput('');
    setErrorMessage(null);
    setIsEditingFormOpen(true);
  };

  const toggleStaffEmail = (email) => {
    const clean = (email || '').trim().toLowerCase();
    if (!clean) return;
    setSelectedEmails((prev) =>
      prev.includes(clean) ? prev.filter((e) => e !== clean) : [...prev, clean]
    );
  };

  const handleAddCustomEmail = () => {
    const parts = customEmailInput
      .split(/[;,]/)
      .map((s) => s.trim().toLowerCase())
      .filter((s) => s && s.includes('@'));
    if (!parts.length) return;
    setSelectedEmails((prev) => Array.from(new Set([...prev, ...parts])));
    setCustomEmailInput('');
  };

  const handleSaveAccount = async (e) => {
    e.preventDefault();
    setErrorMessage(null);

    const rawCode = formCode.trim().toUpperCase();
    if (!rawCode) {
      setErrorMessage('Please enter an Account Number (e.g., 566400).');
      return;
    }

    const normalizedId = rawCode.startsWith('ACCT-') ? rawCode : `ACCT-${rawCode}`;

    // Combine selectedEmails + any un-added customEmailInput
    const extraEmails = customEmailInput
      .split(/[;,]/)
      .map((s) => s.trim().toLowerCase())
      .filter((s) => s && s.includes('@'));
    const finalEmails = Array.from(new Set([...selectedEmails, ...extraEmails]));

    try {
      setSaving(true);
      await saveExpenseAccount({
        id: normalizedId,
        name: formName.trim() || normalizedId,
        dept: formDept.trim() || 'General',
        budget: parseFloat(formBudget) || 0,
        allowed_emails: finalEmails
      });

      // Sync user.allowed_accounts for existing directory users so User Management & Manage Account Codes stay 100% in sync
      for (const usr of usersList) {
        if (!usr.email) continue;
        const uEmail = usr.email.toLowerCase();
        const currentList = Array.isArray(usr.allowed_accounts) ? usr.allowed_accounts : [];
        const hasCode = currentList.includes(normalizedId);
        const shouldHave = finalEmails.includes(uEmail);

        if (shouldHave && !hasCode) {
          await updateUserAllowedAccounts(
            usr.id || usr.uid,
            [...currentList, normalizedId],
            usr.match_department_accounts
          );
        } else if (!shouldHave && hasCode) {
          await updateUserAllowedAccounts(
            usr.id || usr.uid,
            currentList.filter((c) => c !== normalizedId),
            usr.match_department_accounts
          );
        }
      }

      setIsEditingFormOpen(false);
      showToast(
        `${editingCodeId ? 'Updated' : 'Added'} Account ${formatShortCode(normalizedId)} (${formName.trim()}) in Cloud Firestore.`
      );
    } catch (err) {
      console.error('Failed to save account code:', err);
      setErrorMessage(err.message || 'Failed to save account code.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (acct) => {
    try {
      setConfirmDeleteId(null);
      await deleteExpenseAccount(acct.id);
      showToast(`Deleted Account ${formatShortCode(acct.id)} from Cloud Firestore.`);
    } catch (err) {
      setErrorMessage(`Error deleting account: ${err.message}`);
    }
  };

  // Export current accounts / template to CSV
  const handleExportAccountsCSV = () => {
    const headers = ['account_code', 'account_name', 'department', 'budget', 'assigned_emails'];
    const rows = expenseAccounts.map((acct) => {
      const emails = getAssignedUsersForAccount(acct).join(';');
      return [
        `"${formatShortCode(acct.id)}"`,
        `"${(acct.name || '').replace(/"/g, '""')}"`,
        `"${(acct.dept || '').replace(/"/g, '""')}"`,
        acct.budget || 0,
        `"${emails}"`
      ].join(',');
    });
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `WCA_GL_Account_Codes_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Parse CSV line respecting quotes
  const parseCSVLine = (line) => {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  };

  const handleImportCSVFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMessage(null);

    try {
      const text = await file.text();
      const lines = text
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);

      if (lines.length < 2) {
        setErrorMessage('CSV file must contain a header row and at least one account row.');
        return;
      }

      const headers = parseCSVLine(lines[0]).map((h) =>
        h.toLowerCase().replace(/[^a-z0-9_]/g, '_')
      );

      const findCol = (candidates) =>
        headers.findIndex((h) => candidates.some((c) => h.includes(c)));

      const codeIdx = findCol(['code', 'acct', 'account_id', 'id', 'number']);
      const nameIdx = findCol(['name', 'desc', 'title']);
      const deptIdx = findCol(['dept', 'department', 'division']);
      const budgetIdx = findCol(['budget', 'amount', 'allocation']);
      const emailIdx = findCol(['email', 'user', 'staff', 'assigned']);

      const parsedAccounts = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = parseCSVLine(lines[i]);
        const code = codeIdx >= 0 ? cols[codeIdx] : cols[0];
        const name = nameIdx >= 0 ? cols[nameIdx] : cols[1] || code;
        const dept = deptIdx >= 0 ? cols[deptIdx] : cols[2] || 'General';
        const budget = budgetIdx >= 0 ? cols[budgetIdx] : cols[3] || '0';
        const emailsRaw = emailIdx >= 0 ? cols[emailIdx] : cols[4] || '';

        if (!code) continue;
        parsedAccounts.push({
          id: code,
          name: name || code,
          dept: dept || 'General',
          budget,
          allowed_emails: emailsRaw
            .split(/[;,]/)
            .map((s) => s.trim().toLowerCase())
            .filter((s) => s && s.includes('@'))
        });
      }

      if (!parsedAccounts.length) {
        setErrorMessage('No valid account codes found in CSV.');
        return;
      }

      const count = await importExpenseAccounts(parsedAccounts);
      showToast(`Successfully imported ${count} General Ledger account code(s) into Cloud Firestore!`);
    } catch (err) {
      console.error('CSV Import Error:', err);
      setErrorMessage(`CSV Import failed: ${err.message}`);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRestoreDefaults = async () => {
    try {
      await seedDefaultAccounts();
      showToast('Restored default starter WCA expense account codes in Cloud Firestore.');
    } catch (err) {
      setErrorMessage(`Error seeding starter codes: ${err.message}`);
    }
  };

  const filteredAccounts = expenseAccounts
    .filter((acct) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      const shortCode = formatShortCode(acct.id).toLowerCase();
      const fullId = (acct.id || '').toLowerCase();
      const name = (acct.name || '').toLowerCase();
      const dept = (acct.dept || '').toLowerCase();
      const emails = getAssignedUsersForAccount(acct).join(' ');
      return (
        shortCode.includes(q) ||
        fullId.includes(q) ||
        name.includes(q) ||
        dept.includes(q) ||
        emails.includes(q)
      );
    })
    .sort((a, b) => formatShortCode(a.id).localeCompare(formatShortCode(b.id)));

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[92vh] flex flex-col border border-slate-200 overflow-hidden">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-[#0C2340] to-slate-900 px-6 py-4 text-white flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                General Ledger & User Account Access
              </span>
              {fiscalYearInfo && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
                  {fiscalYearInfo.label}: {fiscalYearInfo.periodLabel} (Resets June 1)
                </span>
              )}
            </div>
            <h2 className="text-lg font-bold tracking-tight">
              Manage WCA Expense Account Codes ({expenseAccounts.length})
            </h2>
            <p className="text-xs text-slate-300">
              Add, edit, delete, or import GL account codes, track June 1 fiscal year budgets, and assign staff access.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Toolbar */}
        <div className="px-6 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by account # (e.g. 566), name, department, or staff email..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#0C2340]"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleImportCSVFile}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-semibold text-xs transition shadow-sm"
            >
              <Upload className="w-3.5 h-3.5 text-blue-600" />
              <span>Import CSV</span>
            </button>

            <button
              type="button"
              onClick={handleExportAccountsCSV}
              title="Download CSV of current GL accounts (also serves as your CSV import template)"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-semibold text-xs transition shadow-sm"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>Export / CSV Template</span>
            </button>

            <button
              type="button"
              onClick={openAddForm}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              <span>Add Account Code</span>
            </button>
          </div>
        </div>

        {/* Status / Error Alerts */}
        {statusMessage && (
          <div className="mx-6 mt-3 px-4 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-medium flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{statusMessage}</span>
            </div>
            <button onClick={() => setStatusMessage(null)} className="font-bold">
              ✕
            </button>
          </div>
        )}

        {errorMessage && (
          <div className="mx-6 mt-3 px-4 py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center justify-between">
            <span>{errorMessage}</span>
            <button onClick={() => setErrorMessage(null)} className="font-bold">
              ✕
            </button>
          </div>
        )}

        {/* Add / Edit Inline Drawer */}
        {isEditingFormOpen && (
          <form
            onSubmit={handleSaveAccount}
            className="mx-6 mt-4 p-4 rounded-xl bg-slate-50 border-2 border-[#0C2340]/20 space-y-4 text-xs"
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
              <h3 className="font-bold text-sm text-[#0C2340]">
                {editingCodeId
                  ? `Edit Account Code: ${formatShortCode(editingCodeId)}`
                  : 'Add New General Ledger Account Code'}
              </h3>
              <button
                type="button"
                onClick={() => setIsEditingFormOpen(false)}
                className="text-slate-400 hover:text-slate-700 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Account # *
                </label>
                <div className="relative">
                  <Hash className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    disabled={Boolean(editingCodeId)}
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    placeholder="e.g. 566400"
                    className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-300 font-mono font-bold text-slate-900 disabled:bg-slate-200"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">
                  Account Description / Name *
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. IT Supplies & Hardware"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Department
                </label>
                <input
                  type="text"
                  value={formDept}
                  onChange={(e) => setFormDept(e.target.value)}
                  placeholder="e.g. IT Technology"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Annual Budget ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formBudget}
                  onChange={(e) => setFormBudget(e.target.value)}
                  placeholder="e.g. 15000"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono text-slate-900"
                />
              </div>
            </div>

            {/* Staff Assignment Section */}
            <div className="bg-white p-3.5 rounded-lg border border-slate-200 space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <label className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-[#0C2340]" />
                    <span>Assigned Staff Members Allowed to Use This Account</span>
                  </label>
                  <p className="text-[11px] text-slate-500">
                    System Administrators & Business Office Approvers automatically see all accounts. Check the faculty/staff members who should see this account.
                  </p>
                </div>

                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={customEmailInput}
                    onChange={(e) => setCustomEmailInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomEmail();
                      }
                    }}
                    placeholder="Add email@wcatrojans.org..."
                    className="px-2.5 py-1.5 rounded-lg border border-slate-300 font-mono text-xs w-52"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomEmail}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs"
                  >
                    + Add Email
                  </button>
                </div>
              </div>

              {/* Staff Checkboxes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-36 overflow-y-auto pt-1">
                {usersList.map((u) => {
                  const email = (u.email || '').toLowerCase();
                  if (!email) return null;
                  const checked = selectedEmails.includes(email);
                  const isApproverOrAdmin = u.role === 'admin' || u.role === 'accountant';
                  return (
                    <label
                      key={u.id || email}
                      className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition ${
                        checked
                          ? 'bg-blue-50/80 border-blue-300 text-slate-900'
                          : 'bg-slate-50/60 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleStaffEmail(email)}
                        className="rounded border-slate-300 text-[#0C2340]"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-[11px] truncate">
                          {u.displayName || email.split('@')[0]}
                          {isApproverOrAdmin && (
                            <span className="ml-1 text-[10px] text-emerald-700 font-normal">
                              (All Accts)
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono truncate">
                          {email}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>

              {/* Extra Selected Emails Badges */}
              {selectedEmails.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-slate-100">
                  <span className="text-[11px] font-semibold text-slate-500">
                    Assigned ({selectedEmails.length}):
                  </span>
                  {selectedEmails.map((em) => (
                    <span
                      key={em}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono bg-blue-100 text-blue-900 border border-blue-200"
                    >
                      <span>{em}</span>
                      <button
                        type="button"
                        onClick={() => toggleStaffEmail(em)}
                        className="text-blue-700 hover:text-rose-600 font-bold"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsEditingFormOpen(false)}
                className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 font-medium hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 rounded-lg bg-[#0C2340] hover:bg-slate-800 text-white font-semibold shadow-sm"
              >
                {saving ? 'Saving to Firestore...' : 'Save Account Code'}
              </button>
            </div>
          </form>
        )}

        {/* Accounts Table */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <th className="py-3 px-4">Account #</th>
                  <th className="py-3 px-4">Description / Dept</th>
                  <th className="py-3 px-4 text-right">FY Budget</th>
                  <th className="py-3 px-4 text-right">YTD Spent (Since Jun 1)</th>
                  <th className="py-3 px-4">Available ($ & %)</th>
                  <th className="py-3 px-4">Assigned Staff</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredAccounts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No expense accounts match your search.
                    </td>
                  </tr>
                ) : (
                  filteredAccounts.map((acct) => {
                    const assignedEmails = getAssignedUsersForAccount(acct);
                    const shortCode = formatShortCode(acct.id);
                    const bStats = getAccountBudgetStats ? getAccountBudgetStats(acct.id) : null;
                    const budget = bStats ? bStats.budget : Number(acct.budget) || 0;
                    const ytdSpent = bStats ? bStats.ytdSpent : 0;
                    const pendingAmt = bStats ? bStats.pendingAmount : 0;
                    const available = budget - ytdSpent;
                    const pctAvail = budget > 0 ? ((budget - ytdSpent) / budget) * 100 : null;

                    const barColor =
                      pctAvail === null
                        ? 'bg-slate-300'
                        : pctAvail <= 10
                        ? 'bg-rose-500'
                        : pctAvail <= 25
                        ? 'bg-amber-500'
                        : 'bg-emerald-500';

                    const badgeColor =
                      pctAvail === null
                        ? 'bg-slate-100 text-slate-600 border-slate-200'
                        : pctAvail < 0
                        ? 'bg-rose-100 text-rose-800 border-rose-300'
                        : pctAvail <= 20
                        ? 'bg-amber-100 text-amber-900 border-amber-300'
                        : 'bg-emerald-50 text-emerald-800 border-emerald-200';

                    return (
                      <tr key={acct.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-4 font-mono font-bold text-[#0C2340]">
                          <span className="px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200">
                            {shortCode}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">{acct.name}</div>
                          <div className="text-[11px] text-slate-500 inline-flex items-center gap-1 mt-0.5">
                            <Building2 className="w-3 h-3 text-slate-400" />
                            <span>{acct.dept || 'General'}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-semibold text-slate-800">
                          {budget > 0 ? `$${budget.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono">
                          <div className="font-semibold text-slate-800">
                            ${ytdSpent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                          {pendingAmt > 0 && (
                            <div className="text-[10px] text-amber-700 font-medium">
                              +${pendingAmt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Pending
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 min-w-[185px]">
                          {budget > 0 ? (
                            <div className="space-y-1">
                              <div className="flex items-center justify-between gap-2">
                                <span
                                  className={`font-mono font-bold ${
                                    available < 0 ? 'text-rose-600' : 'text-slate-900'
                                  }`}
                                >
                                  ${available.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${badgeColor}`}
                                >
                                  {pctAvail.toFixed(1)}% Avail
                                </span>
                              </div>
                              <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                <div
                                  className={`h-full ${barColor} transition-all`}
                                  style={{
                                    width: `${Math.max(0, Math.min(100, pctAvail))}%`
                                  }}
                                />
                              </div>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">
                              No budget set
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {assignedEmails.length === 0 ? (
                            <span className="text-[11px] text-slate-400 italic">
                              Admins & Business Office Only (Click Edit to assign staff)
                            </span>
                          ) : (
                            <div className="flex items-center gap-1 flex-wrap">
                              {assignedEmails.map((em) => (
                                <span
                                  key={em}
                                  className="px-2 py-0.5 rounded-full text-[11px] font-mono bg-blue-50 text-blue-800 border border-blue-200"
                                >
                                  {em}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {confirmDeleteId === acct.id ? (
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleDelete(acct)}
                                className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-700 text-white font-semibold text-[11px]"
                              >
                                Remove
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                                className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 text-[11px]"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => openEditForm(acct)}
                                title="Edit account code or assign staff"
                                className="p-1.5 rounded-lg text-slate-500 hover:text-[#0C2340] hover:bg-slate-100 transition"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(acct.id)}
                                title="Delete account code"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
          <button
            type="button"
            onClick={handleRestoreDefaults}
            className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-800 font-medium transition"
          >
            <Database className="w-3.5 h-3.5 text-amber-600" />
            <span>Restore Starter Account Codes</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-[#0C2340] hover:bg-slate-800 text-white font-semibold"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
