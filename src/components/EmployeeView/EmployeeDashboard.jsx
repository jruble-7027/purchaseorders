import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { usePOs } from '../../context/POContext';
import StatusBadge from '../StatusBadge';
import AccountCodesModal from '../AccountantView/AccountCodesModal';
import { printPurchaseOrder } from '../../services/exportService';
import {
  Plus,
  Search,
  Filter,
  Eye,
  FileEdit,
  Trash2,
  Clock,
  CheckCircle,
  AlertCircle,
  FileText,
  DollarSign,
  PackageCheck,
  Printer,
  Database,
  Building2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export default function EmployeeDashboard({ onOpenNewPO, onSelectPO, onEditPO }) {
  const { currentUser } = useAuth();
  const {
    purchaseOrders,
    userExpenseAccounts,
    expenseAccountsMap,
    fiscalYearInfo,
    getAccountBudgetStats,
    deletePurchaseOrder
  } = usePOs();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [confirmDeletePOId, setConfirmDeletePOId] = useState(null);
  const [isAccountCodesModalOpen, setIsAccountCodesModalOpen] = useState(false);
  const [showAccountsTable, setShowAccountsTable] = useState(true);
  const isAccountantOrAdmin = currentUser?.role === 'admin' || currentUser?.role === 'accountant';
  const assignedAccounts = [...(userExpenseAccounts || [])].sort((a, b) =>
    (a.id || '').replace(/^ACCT-/i, '').localeCompare((b.id || '').replace(/^ACCT-/i, ''))
  );

  // Filter to show user's purchase orders (or all if demo testing)
  const myPOs = purchaseOrders.filter(po => {
    // In production, match current user UID or email
    if (currentUser?.email) {
      return po.created_by === currentUser.uid || po.employee_email === currentUser.email;
    }
    return true;
  });

  // Calculate metrics
  const totalCount = myPOs.length;
  const pendingCount = myPOs.filter(p => p.status === 'pending_approval').length;
  const approvedCount = myPOs.filter(p => p.status === 'approved' || p.status === 'paid').length;
  const receivedCount = myPOs.filter(p => p.status === 'received' || p.is_received).length;
  const rejectedCount = myPOs.filter(p => p.status === 'rejected').length;

  const totalValue = myPOs.reduce((sum, p) => sum + (parseFloat(p.total_amount) || 0), 0);

  // Apply search & status filters
  const filteredPOs = myPOs.filter(po => {
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'PENDING' && po.status === 'pending_approval') ||
      (statusFilter === 'APPROVED' && (po.status === 'approved' || po.status === 'paid')) ||
      (statusFilter === 'RECEIVED' && (po.status === 'received' || po.is_received)) ||
      (statusFilter === 'REJECTED' && po.status === 'rejected') ||
      (statusFilter === 'DRAFT' && po.status === 'draft');

    const searchLower = searchQuery.toLowerCase();
    const matchesSearch =
      !searchQuery ||
      po.po_number?.toLowerCase().includes(searchLower) ||
      po.vendor_name?.toLowerCase().includes(searchLower) ||
      po.school_purpose?.toLowerCase().includes(searchLower);

    return matchesStatus && matchesSearch;
  });

  const handleDeletePO = async (e, poId) => {
    e.stopPropagation();
    setConfirmDeletePOId(null);
    await deletePurchaseOrder(poId);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Quick Action */}
      <div className="bg-gradient-to-r from-[#111111] via-[#1f1013] to-[#4a070e] border-b-2 border-[#ce1226] rounded-2xl p-6 text-white shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#ce1226]/30 text-[#ffde6a] border border-[#ce1226]/60 mb-2">
            Faculty & Staff Portal
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            Welcome, {currentUser?.displayName || 'Faculty Member'}
          </h1>
          <p className="text-xs text-zinc-300 mt-1 max-w-xl">
            Submit new vendor requisitions, attach receipts/quotes, and monitor approval status by the Wesleyan Christian Academy Business Office in real time.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => setIsAccountCodesModalOpen(true)}
            title="View your assigned GL expense account codes, annual budgets, YTD spending, and remaining available funds"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-zinc-800/90 hover:bg-zinc-700 text-zinc-100 hover:text-white font-semibold text-xs transition border border-zinc-600 shadow-sm"
          >
            <Database className="w-4 h-4 text-[#ffde6a]" />
            <span>My Account Codes ({assignedAccounts.length})</span>
          </button>

          <button
            onClick={onOpenNewPO}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#ce1226] hover:bg-[#a50e1e] text-white font-bold text-sm shadow-md transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-5 h-5 text-[#ffde6a] stroke-[2.5]" />
            <span>New Purchase Order</span>
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">My Total POs</span>
            <FileText className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{totalCount}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">${totalValue.toFixed(2)} combined requisitions</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-amber-200/60 shadow-sm bg-amber-50/20">
          <div className="flex items-center justify-between text-amber-700 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Pending Review</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-900">{pendingCount}</div>
          <div className="text-[11px] text-amber-600 mt-0.5">Awaiting Business Office</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-emerald-200/60 shadow-sm bg-emerald-50/20">
          <div className="flex items-center justify-between text-emerald-700 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Approved / Paid</span>
            <CheckCircle className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-900">{approvedCount}</div>
          <div className="text-[11px] text-emerald-600 mt-0.5">Ready for procurement</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-rose-200/60 shadow-sm bg-rose-50/20">
          <div className="flex items-center justify-between text-rose-700 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Needs Revision</span>
            <AlertCircle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-bold text-rose-900">{rejectedCount}</div>
          <div className="text-[11px] text-rose-600 mt-0.5">Requires receipt or edit</div>
        </div>

      </div>

      {/* Assigned Expense Account Codes & Live Budget Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div
          onClick={() => setShowAccountsTable((prev) => !prev)}
          className="px-5 py-3.5 bg-slate-50/90 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 cursor-pointer select-none hover:bg-slate-100/70 transition"
        >
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="w-7 h-7 rounded-lg bg-[#0C2340] text-[#ffde6a] flex items-center justify-center shrink-0">
              <Database className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#0C2340]">
                  My Assigned Expense Account Codes ({assignedAccounts.length})
                </h2>
                {fiscalYearInfo && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    {fiscalYearInfo.label}: {fiscalYearInfo.periodLabel} (Resets Jun 1)
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500">
                Real-time fiscal year budget, year-to-date spending since June 1, and remaining available balance for your assigned accounts.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setIsAccountCodesModalOpen(true)}
              className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 transition shadow-sm"
            >
              Open Full View
            </button>
            <button
              type="button"
              onClick={() => setShowAccountsTable((prev) => !prev)}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 transition"
              title={showAccountsTable ? 'Collapse Account Codes' : 'Expand Account Codes'}
            >
              {showAccountsTable ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {showAccountsTable && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 text-[11px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <th className="py-2.5 px-4">Account #</th>
                  <th className="py-2.5 px-4">Description / Dept</th>
                  <th className="py-2.5 px-4 text-right">FY Budget</th>
                  <th className="py-2.5 px-4 text-right">YTD Spent (Since Jun 1)</th>
                  <th className="py-2.5 px-4">Available ($ & %)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {assignedAccounts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 px-4 text-center text-slate-400">
                      No expense accounts are currently assigned to your profile. Please contact the Business Office to have your GL account code(s) assigned.
                    </td>
                  </tr>
                ) : (
                  assignedAccounts.map((acct) => {
                    const shortCode = (acct.id || '').replace(/^ACCT-/i, '');
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
                        <td className="py-2.5 px-4 font-mono font-bold text-[#0C2340] whitespace-nowrap">
                          <span className="px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200">
                            {shortCode}
                          </span>
                        </td>
                        <td className="py-2.5 px-4">
                          <div className="font-semibold text-slate-900">{acct.name}</div>
                          <div className="text-[11px] text-slate-500 inline-flex items-center gap-1 mt-0.5">
                            <Building2 className="w-3 h-3 text-slate-400" />
                            <span>{acct.dept || 'General'}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-semibold text-slate-800 whitespace-nowrap">
                          {budget > 0
                            ? `$${budget.toLocaleString('en-US', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                              })}`
                            : '—'}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono whitespace-nowrap">
                          <div className="font-semibold text-slate-800">
                            ${ytdSpent.toLocaleString('en-US', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2
                            })}
                          </div>
                          {pendingAmt > 0 && (
                            <div className="text-[10px] text-amber-700 font-medium">
                              +${pendingAmt.toLocaleString('en-US', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                              })}{' '}
                              Pending
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-4 min-w-[200px]">
                          {budget > 0 ? (
                            <div className="space-y-1">
                              <div className="flex items-center justify-between gap-2">
                                <span
                                  className={`font-mono font-bold ${
                                    available < 0 ? 'text-rose-600' : 'text-slate-900'
                                  }`}
                                >
                                  ${available.toLocaleString('en-US', {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2
                                  })}
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
                            <span className="text-[11px] text-slate-400 italic">No budget set</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Controls & Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        
        {/* Status Filter Tabs */}
        <div className="flex items-center space-x-1 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {[
            { id: 'ALL', label: 'All My POs' },
            { id: 'PENDING', label: 'Pending' },
            { id: 'APPROVED', label: 'Approved & Paid' },
            { id: 'RECEIVED', label: 'Received' },
            { id: 'REJECTED', label: 'Needs Revision' },
            { id: 'DRAFT', label: 'Drafts' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                statusFilter === tab.id
                  ? 'bg-[#ce1226] text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search PO #, vendor, purpose..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#ce1226] focus:border-transparent outline-none"
          />
        </div>
      </div>

      {/* PO Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {filteredPOs.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-slate-700">No purchase orders found</h3>
            <p className="text-xs text-slate-400 mt-1">
              {searchQuery ? 'Try clearing your search query.' : 'Click "New Purchase Order" above to get started.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-xs text-left">
              <thead className="bg-slate-50 font-semibold text-slate-600 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-4 py-3">PO Number</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Vendor</th>
                  <th className="px-4 py-3">Department Account</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {filteredPOs.map((po) => {
                  const dept = expenseAccountsMap[po.department_account_id];

                  return (
                    <tr
                      key={po.id}
                      onClick={() => onSelectPO(po)}
                      className="hover:bg-slate-50/80 cursor-pointer transition"
                    >
                      {/* PO Number */}
                      <td className="px-4 py-3 font-semibold text-slate-900 font-mono">
                        {po.po_number}
                      </td>

                      {/* Date */}
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                        {po.purchase_date}
                      </td>

                      {/* Vendor */}
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {po.vendor_name}
                      </td>

                      {/* Department Account */}
                      <td className="px-4 py-3 text-slate-600">
                        <span className="font-mono text-slate-800 font-semibold">{po.department_account_id}</span>
                        {dept && <span className="text-slate-400 ml-1">({dept.dept})</span>}
                      </td>

                      {/* Amount */}
                      <td className="px-4 py-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                        ${Number(po.total_amount).toFixed(2)}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <StatusBadge status={po.status} />
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        {confirmDeletePOId === po.id ? (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => handleDeletePO(e, po.id)}
                              className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-700 text-white font-semibold text-[11px] shadow-sm transition"
                            >
                              Delete
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeletePOId(null)}
                              className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium text-[11px] transition"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end space-x-1.5">
                            <button
                              type="button"
                              onClick={() => printPurchaseOrder(po, expenseAccountsMap)}
                              className="p-1.5 text-slate-500 hover:text-[#0C2340] rounded hover:bg-slate-100 transition"
                              title="Print Official PO Requisition"
                            >
                              <Printer className="w-4 h-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => onSelectPO(po)}
                              className="p-1.5 text-slate-500 hover:text-[#0C2340] rounded hover:bg-slate-100 transition"
                              title="View Full Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {(po.status !== 'approved' && po.status !== 'paid') || isAccountantOrAdmin ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => onEditPO(po)}
                                  className="p-1.5 text-amber-600 hover:text-amber-800 rounded hover:bg-amber-50 transition"
                                  title="Edit Purchase Order"
                                >
                                  <FileEdit className="w-4 h-4" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => setConfirmDeletePOId(po.id)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition"
                                  title="Delete Purchase Order"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            ) : null}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AccountCodesModal
        isOpen={isAccountCodesModalOpen}
        onClose={() => setIsAccountCodesModalOpen(false)}
        readOnly={true}
      />
    </div>
  );
}
