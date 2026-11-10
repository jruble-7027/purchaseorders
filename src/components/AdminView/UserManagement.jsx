import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { usePOs } from '../../context/POContext';
import {
  Users,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  UserPlus,
  Search,
  Trash2,
  Database,
  CheckCircle2,
  Building2,
  Mail,
  Clock,
  Hash
} from 'lucide-react';

const ROLE_META = {
  admin: {
    label: 'System Administrator',
    badgeClass: 'bg-amber-100 text-amber-900 border-amber-300',
    description: 'Full access to POs, approvals, accounting & user management'
  },
  accountant: {
    label: 'Business Office Approver',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    description: 'Can review, approve, reject, and mark POs as paid'
  },
  employee: {
    label: 'Faculty / Staff',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-300',
    description: 'Can create, submit, and track their own purchase orders'
  }
};

const DEPARTMENT_SUGGESTIONS = [
  'IT & Administration',
  'Accounting & Business Office',
  'High School Science',
  'Athletics Department',
  'Fine Arts & Music Department',
  'Middle School Humanities & Library',
  'Elementary Academic',
  'Facilities & Campus Maintenance',
  'Administrative & General Operations'
];

export default function UserManagement() {
  const {
    currentUser,
    usersList,
    updateUserRole,
    updateUserDepartment,
    updateUserAllowedAccounts,
    addOrPreauthorizeUser,
    deleteDirectoryUser,
    seedDefaultUsers
  } = useAuth();
  const {
    expenseAccounts,
    getVisibleAccountsForUser,
    saveExpenseAccount
  } = usePOs();

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusMessage, setStatusMessage] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingDeptId, setEditingDeptId] = useState(null);
  const [editingDeptValue, setEditingDeptValue] = useState('');
  const [confirmDeleteKey, setConfirmDeleteKey] = useState(null);

  // Assign Accounts Modal state
  const [assigningUser, setAssigningUser] = useState(null);
  const [assignedAcctIds, setAssignedAcctIds] = useState([]);
  const [matchDeptToggle, setMatchDeptToggle] = useState(false);
  const [acctSearchFilter, setAcctSearchFilter] = useState('');
  const [savingAccounts, setSavingAccounts] = useState(false);

  // New user form state
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserDept, setNewUserDept] = useState('High School Science');
  const [newUserRole, setNewUserRole] = useState('employee');
  const [newUserAccts, setNewUserAccts] = useState([]);
  const [newUserMatchDept, setNewUserMatchDept] = useState(false);
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const formatShortCode = (id = '') => id.replace(/^ACCT-/i, '');

  const showToast = (msg) => {
    setStatusMessage(msg);
    setTimeout(() => {
      setStatusMessage((prev) => (prev === msg ? null : prev));
    }, 3500);
  };

  // KPI counts
  const adminCount = usersList.filter((u) => u.role === 'admin').length;
  const accountantCount = usersList.filter((u) => u.role === 'accountant').length;
  const employeeCount = usersList.filter((u) => !u.role || u.role === 'employee').length;

  // Filtered directory list
  const filteredUsers = usersList
    .filter((u) => {
      const uRole = u.role || 'employee';
      if (roleFilter !== 'ALL' && uRole !== roleFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchName = u.displayName?.toLowerCase().includes(q);
        const matchEmail = u.email?.toLowerCase().includes(q);
        const matchDept = u.department?.toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchDept) return false;
      }
      return true;
    })
    .sort((a, b) => {
      const order = { admin: 0, accountant: 1, employee: 2 };
      const rA = order[a.role || 'employee'] ?? 2;
      const rB = order[b.role || 'employee'] ?? 2;
      if (rA !== rB) return rA - rB;
      return (a.displayName || '').localeCompare(b.displayName || '');
    });

  const handleRoleChange = async (user, nextRole) => {
    try {
      await updateUserRole(user.id || user.uid, nextRole);
      showToast(
        `Updated ${user.displayName || user.email} to ${ROLE_META[nextRole]?.label || nextRole}.`
      );
    } catch (err) {
      console.error('Failed to update role:', err);
      showToast(`Error updating role: ${err.message}`);
    }
  };

  const handleSaveDepartment = async (user) => {
    const targetId = user.id || user.uid;
    setEditingDeptId(null);
    if (!editingDeptValue.trim() || editingDeptValue.trim() === user.department) return;
    try {
      await updateUserDepartment(targetId, editingDeptValue.trim());
      showToast(`Updated department for ${user.displayName || user.email}.`);
    } catch (err) {
      console.error('Failed to update department:', err);
    }
  };

  const openAssignAccountsModal = (user) => {
    const emailLower = (user.email || '').trim().toLowerCase();
    const initialSet = new Set(Array.isArray(user.allowed_accounts) ? user.allowed_accounts : []);
    // Also include accounts where acct.allowed_emails includes this user
    expenseAccounts.forEach((acct) => {
      if (
        emailLower &&
        Array.isArray(acct.allowed_emails) &&
        acct.allowed_emails.some((e) => String(e).trim().toLowerCase() === emailLower)
      ) {
        initialSet.add(acct.id);
      }
    });
    setAssigningUser(user);
    setAssignedAcctIds(Array.from(initialSet));
    setMatchDeptToggle(Boolean(user.match_department_accounts));
    setAcctSearchFilter('');
  };

  const toggleAccountForUser = (acctId) => {
    setAssignedAcctIds((prev) =>
      prev.includes(acctId) ? prev.filter((id) => id !== acctId) : [...prev, acctId]
    );
  };

  const handleSaveAssignedAccounts = async (e) => {
    e.preventDefault();
    if (!assigningUser) return;
    const targetId = assigningUser.id || assigningUser.uid;
    const emailLower = (assigningUser.email || '').trim().toLowerCase();

    try {
      setSavingAccounts(true);
      await updateUserAllowedAccounts(targetId, assignedAcctIds, matchDeptToggle);

      // Also keep expense_accounts.allowed_emails in sync in Cloud Firestore
      if (emailLower) {
        for (const acct of expenseAccounts) {
          const currentEmails = Array.isArray(acct.allowed_emails)
            ? acct.allowed_emails.map((em) => String(em).trim().toLowerCase())
            : [];
          const hasEmail = currentEmails.includes(emailLower);
          const shouldHave = assignedAcctIds.includes(acct.id);

          if (shouldHave && !hasEmail) {
            await saveExpenseAccount({
              ...acct,
              allowed_emails: [...currentEmails, emailLower]
            });
          } else if (!shouldHave && hasEmail) {
            await saveExpenseAccount({
              ...acct,
              allowed_emails: currentEmails.filter((em) => em !== emailLower)
            });
          }
        }
      }

      showToast(
        `Saved assigned account numbers for ${assigningUser.displayName || assigningUser.email}.`
      );
      setAssigningUser(null);
    } catch (err) {
      console.error('Failed to save assigned accounts:', err);
      showToast(`Error saving assigned accounts: ${err.message}`);
    } finally {
      setSavingAccounts(false);
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    setFormError(null);
    const cleanEmail = newUserEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setFormError('Please enter a valid email address (e.g., name@wcatrojans.org).');
      return;
    }

    try {
      setSubmitting(true);
      await addOrPreauthorizeUser({
        displayName: newUserName.trim() || cleanEmail.split('@')[0],
        email: cleanEmail,
        role: newUserRole,
        department: newUserDept.trim() || 'Faculty / Staff',
        allowed_accounts: newUserAccts,
        match_department_accounts: newUserMatchDept
      });

      // Also sync onto selected expense_accounts in Firestore
      for (const acctId of newUserAccts) {
        const acct = expenseAccounts.find((a) => a.id === acctId);
        if (acct) {
          const currentEmails = Array.isArray(acct.allowed_emails) ? acct.allowed_emails : [];
          if (!currentEmails.map((em) => em.toLowerCase()).includes(cleanEmail)) {
            await saveExpenseAccount({
              ...acct,
              allowed_emails: [...currentEmails, cleanEmail]
            });
          }
        }
      }

      setIsAddModalOpen(false);
      setNewUserName('');
      setNewUserEmail('');
      setNewUserRole('employee');
      setNewUserAccts([]);
      setNewUserMatchDept(false);
      showToast(`Authorized ${cleanEmail} as ${ROLE_META[newUserRole]?.label}.`);
    } catch (err) {
      setFormError(err.message || 'Could not save user.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async (user) => {
    const isSelf =
      currentUser &&
      (user.email?.toLowerCase() === currentUser.email?.toLowerCase() ||
        user.id === currentUser.uid);
    if (isSelf) return;

    try {
      setConfirmDeleteKey(null);
      await deleteDirectoryUser(user.id || user.uid, user.email);
      showToast(`Removed ${user.displayName || user.email} from directory.`);
    } catch (err) {
      console.error('Failed to delete user:', err);
      showToast(`Error removing user: ${err.message || 'Permission denied'}`);
    }
  };

  const handleSeedUsers = async () => {
    try {
      await seedDefaultUsers();
      showToast('Synced default Wesleyan Christian Academy staff & approvers.');
    } catch (err) {
      console.error('Failed to seed users:', err);
    }
  };

  const formatLastLogin = (val) => {
    if (!val) return 'Pre-Authorized (Pending Sign-In)';
    try {
      if (typeof val === 'object' && val.seconds) {
        return new Date(val.seconds * 1000).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        });
      }
      const d = new Date(val);
      if (isNaN(d.getTime())) return 'Active SSO User';
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return 'Active SSO User';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#111111] via-[#1c1013] to-[#4a070e] border-b-2 border-[#ce1226] rounded-2xl p-6 text-white shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#ce1226]/30 text-[#ffde6a] border border-[#ce1226]/60 mb-2">
            System Administration Console
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            User Directory & Role Management
          </h1>
          <p className="text-xs text-zinc-300 mt-1 max-w-2xl">
            Assign System Administrators, Business Office Approvers, and Faculty/Staff permissions for Wesleyan Christian Academy (@wcatrojans.org & @wesed.org) accounts.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleSeedUsers}
            title="Sync default WCA administrators, Business Office approvers, and staff into Firestore"
            className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-zinc-800/90 hover:bg-zinc-700 text-zinc-200 hover:text-white font-medium text-xs transition border border-zinc-600"
          >
            <Database className="w-3.5 h-3.5 text-[#ffde6a]" />
            <span>Sync Default WCA Staff</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setFormError(null);
              setIsAddModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#ce1226] hover:bg-[#a50e1e] text-white font-semibold text-xs shadow-md transition"
          >
            <UserPlus className="w-4 h-4 text-[#ffde6a]" />
            <span>Add / Pre-Authorize User</span>
          </button>
        </div>
      </div>

      {/* Status Confirmation Toast */}
      {statusMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 px-4 py-3 rounded-xl text-xs font-medium flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{statusMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="text-emerald-700 hover:text-emerald-950 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">Total Authorized Users</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{usersList.length}</p>
            <p className="text-[11px] text-slate-500 mt-1">@wcatrojans.org directory</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-slate-100 text-[#0C2340] flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-amber-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">System Administrators</p>
            <p className="text-2xl font-bold text-amber-700 mt-1">{adminCount}</p>
            <p className="text-[11px] text-amber-600 font-medium mt-1">Full Portal & Role Control</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-emerald-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">Business Office Approvers</p>
            <p className="text-2xl font-bold text-emerald-700 mt-1">{accountantCount}</p>
            <p className="text-[11px] text-emerald-600 font-medium mt-1">PO Approval & Disbursement</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">Faculty & Staff</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{employeeCount}</p>
            <p className="text-[11px] text-slate-500 mt-1">PO Requisition & Tracking</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <UserCheck className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, @wcatrojans.org email, or department..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0C2340]"
          />
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {[
            { key: 'ALL', label: 'All Users' },
            { key: 'admin', label: 'Administrators' },
            { key: 'accountant', label: 'Business Office' },
            { key: 'employee', label: 'Faculty / Staff' }
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setRoleFilter(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                roleFilter === tab.key
                  ? 'bg-[#0C2340] text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* User Directory Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-800">
              Authorized Staff & Role Assignments ({filteredUsers.length})
            </h2>
            <p className="text-[11px] text-slate-500">
              Changes made to user roles take effect immediately in Cloud Firestore.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <th className="py-3 px-4">Staff Member</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Assigned Account #s</th>
                <th className="py-3 px-4">Current Access Level</th>
                <th className="py-3 px-4">Change Role</th>
                <th className="py-3 px-4">SSO Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    No users match your current search filter.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const userRole = user.role || 'employee';
                  const meta = ROLE_META[userRole] || ROLE_META.employee;
                  const targetId = user.id || user.uid;
                  const isSelf =
                    currentUser &&
                    (user.email?.toLowerCase() === currentUser.email?.toLowerCase() ||
                      targetId === currentUser.uid);
                  const visibleAccts = getVisibleAccountsForUser(user);

                  return (
                    <tr key={targetId} className="hover:bg-slate-50/80 transition">
                      {/* Staff Member */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={
                              user.photoURL ||
                              `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                user.displayName || user.email || 'WCA'
                              )}&background=0C2340&color=F59E0B`
                            }
                            alt={user.displayName || user.email}
                            className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0"
                          />
                          <div>
                            <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                              <span>{user.displayName || user.email?.split('@')[0]}</span>
                              {isSelf && (
                                <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-amber-100 text-amber-800 border border-amber-300">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                              <Mail className="w-3 h-3 text-slate-400" />
                              <span>{user.email}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Department (Click to edit inline) */}
                      <td className="py-3.5 px-4">
                        {editingDeptId === targetId ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              list="wca-dept-list"
                              value={editingDeptValue}
                              onChange={(e) => setEditingDeptValue(e.target.value)}
                              onBlur={() => handleSaveDepartment(user)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveDepartment(user);
                                if (e.key === 'Escape') setEditingDeptId(null);
                              }}
                              autoFocus
                              className="px-2 py-1 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0C2340]"
                            />
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingDeptId(targetId);
                              setEditingDeptValue(user.department || 'Faculty / Staff');
                            }}
                            title="Click to edit department"
                            className="inline-flex items-center gap-1.5 text-slate-700 hover:text-[#0C2340] group"
                          >
                            <Building2 className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-600" />
                            <span className="underline decoration-dotted underline-offset-2">
                              {user.department || 'Faculty / Staff'}
                            </span>
                          </button>
                        )}
                      </td>

                      {/* Assigned Account #s */}
                      <td className="py-3.5 px-4">
                        {userRole === 'admin' || userRole === 'accountant' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <Hash className="w-3 h-3" />
                            <span>All Accounts ({expenseAccounts.length})</span>
                          </span>
                        ) : (
                          <div className="space-y-1.5">
                            {visibleAccts.length === 0 ? (
                              <div className="text-[11px] text-rose-600 font-medium">
                                No accounts assigned
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 flex-wrap max-w-[230px]">
                                {visibleAccts.map((acct) => (
                                  <span
                                    key={acct.id}
                                    title={`${acct.name} (${acct.dept})`}
                                    className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-blue-50 text-blue-900 border border-blue-200"
                                  >
                                    {formatShortCode(acct.id)}
                                  </span>
                                ))}
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={() => openAssignAccountsModal(user)}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0C2340] hover:text-amber-600 underline decoration-dotted underline-offset-2"
                            >
                              <Hash className="w-3 h-3" />
                              <span>Assign Accounts</span>
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Current Access Level Badge */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border ${meta.badgeClass}`}
                        >
                          {meta.label}
                        </span>
                        <div className="text-[10px] text-slate-400 mt-1 max-w-[210px]">
                          {meta.description}
                        </div>
                      </td>

                      {/* Role Selector Dropdown */}
                      <td className="py-3.5 px-4">
                        <select
                          value={userRole}
                          onChange={(e) => handleRoleChange(user, e.target.value)}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 font-medium text-xs focus:outline-none focus:ring-2 focus:ring-[#0C2340] cursor-pointer"
                        >
                          <option value="employee">Faculty / Staff</option>
                          <option value="accountant">Business Office Approver</option>
                          <option value="admin">System Administrator</option>
                        </select>
                      </td>

                      {/* SSO Status */}
                      <td className="py-3.5 px-4 text-slate-500">
                        <div className="inline-flex items-center gap-1.5 text-[11px]">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{formatLastLogin(user.last_login)}</span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        {confirmDeleteKey === targetId ? (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleDeleteUser(user)}
                              className="px-2.5 py-1 rounded-md bg-rose-600 hover:bg-rose-700 text-white font-semibold text-[11px] shadow-sm transition"
                            >
                              Remove
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteKey(null)}
                              className="px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium text-[11px] transition"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            disabled={isSelf}
                            onClick={() => setConfirmDeleteKey(targetId)}
                            title={
                              isSelf
                                ? 'Cannot remove your own active administrator account'
                                : 'Remove user from directory'
                            }
                            className={`p-1.5 rounded-lg transition ${
                              isSelf
                                ? 'text-slate-300 cursor-not-allowed'
                                : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                            }`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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

      {/* Datalist for Department Autocomplete */}
      <datalist id="wca-dept-list">
        {DEPARTMENT_SUGGESTIONS.map((dept) => (
          <option key={dept} value={dept} />
        ))}
      </datalist>

      {/* Add / Pre-Authorize User Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 text-slate-900 border border-slate-200">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-[#0C2340]">
                  Add / Pre-Authorize WCA Staff Member
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Pre-assign a role before or after a user signs in with Google SSO.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                {formError}
              </div>
            )}

            <form onSubmit={handleAddUser} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="e.g., Jowayne Twiddy"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0C2340]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  School Google Email (@wcatrojans.org)
                </label>
                <input
                  type="email"
                  required
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="e.g., username@wcatrojans.org"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono focus:outline-none focus:ring-2 focus:ring-[#0C2340]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Department
                </label>
                <input
                  type="text"
                  list="wca-dept-list"
                  value={newUserDept}
                  onChange={(e) => setNewUserDept(e.target.value)}
                  placeholder="Select or type a department..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0C2340]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Portal Role & Permissions
                </label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-medium focus:outline-none focus:ring-2 focus:ring-[#0C2340]"
                >
                  <option value="employee">Faculty / Staff (Submit & Track Own POs)</option>
                  <option value="accountant">Business Office Approver (Approve, Reject & Pay POs)</option>
                  <option value="admin">System Administrator (Full Portal + User Management)</option>
                </select>
              </div>

              {newUserRole === 'employee' && (
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                  <div className="font-semibold text-slate-800 flex items-center justify-between">
                    <span>Assigned GL Account #s ({newUserAccts.length} selected)</span>
                  </div>
                  <div className="max-h-32 overflow-y-auto space-y-1 pr-1">
                    {expenseAccounts.map((acct) => {
                      const checked = newUserAccts.includes(acct.id);
                      return (
                        <label
                          key={acct.id}
                          className="flex items-center gap-2 p-1.5 rounded hover:bg-white cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              setNewUserAccts((prev) =>
                                prev.includes(acct.id)
                                  ? prev.filter((id) => id !== acct.id)
                                  : [...prev, acct.id]
                              )
                            }
                            className="rounded border-slate-300 text-[#0C2340]"
                          />
                          <span className="font-mono font-bold text-[#0C2340]">
                            {formatShortCode(acct.id)}
                          </span>
                          <span className="text-slate-600 truncate">
                            — {acct.name}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                  <label className="flex items-center gap-2 pt-1.5 border-t border-slate-200 text-[11px] text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newUserMatchDept}
                      onChange={(e) => setNewUserMatchDept(e.target.checked)}
                      className="rounded border-slate-300 text-[#0C2340]"
                    />
                    <span>Also allow all accounts matching their Department</span>
                  </label>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-[#0C2340] hover:bg-slate-800 text-white font-semibold shadow-sm transition"
                >
                  {submitting ? 'Saving...' : 'Authorize User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Account Numbers Modal */}
      {assigningUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 text-slate-900 border border-slate-200">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-[#0C2340]">
                  Assign Account #s — {assigningUser.displayName || assigningUser.email}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Select which Expense Account numbers this staff member can see on PO forms. If only 1 account is assigned, it will auto-fill for them automatically.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAssigningUser(null)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAssignedAccounts} className="space-y-4 text-xs">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={acctSearchFilter}
                  onChange={(e) => setAcctSearchFilter(e.target.value)}
                  placeholder="Filter accounts by # (e.g. 566), name, or department..."
                  className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0C2340]"
                />
              </div>

              <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
                {expenseAccounts
                  .filter((acct) => {
                    if (!acctSearchFilter) return true;
                    const q = acctSearchFilter.toLowerCase();
                    return (
                      formatShortCode(acct.id).toLowerCase().includes(q) ||
                      (acct.name || '').toLowerCase().includes(q) ||
                      (acct.dept || '').toLowerCase().includes(q)
                    );
                  })
                  .map((acct) => {
                    const checked = assignedAcctIds.includes(acct.id);
                    return (
                      <label
                        key={acct.id}
                        className={`flex items-center justify-between p-2.5 cursor-pointer transition ${
                          checked ? 'bg-blue-50/70' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleAccountForUser(acct.id)}
                            className="rounded border-slate-300 text-[#0C2340]"
                          />
                          <div>
                            <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                              <span className="font-mono font-bold text-[#0C2340] px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200">
                                {formatShortCode(acct.id)}
                              </span>
                              <span>{acct.name}</span>
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              Department: {acct.dept || 'General'}
                            </div>
                          </div>
                        </div>
                      </label>
                    );
                  })}
              </div>

              <label className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={matchDeptToggle}
                  onChange={(e) => setMatchDeptToggle(e.target.checked)}
                  className="rounded border-slate-300 text-[#0C2340]"
                />
                <div>
                  <div className="font-semibold text-slate-800">
                    Also include all accounts matching user&apos;s Department ({assigningUser.department || 'Faculty / Staff'})
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Automatically grants access to any account whose Department matches {assigningUser.department || 'their department'}.
                  </div>
                </div>
              </label>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <span className="text-slate-500 font-medium">
                  {assignedAcctIds.length} direct account(s) selected
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setAssigningUser(null)}
                    className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingAccounts}
                    className="px-4 py-2 rounded-lg bg-[#0C2340] hover:bg-slate-800 text-white font-semibold shadow-sm transition"
                  >
                    {savingAccounts ? 'Saving...' : 'Save Assigned Accounts'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
