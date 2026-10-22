import React, { useState } from 'react';
import { usePOs } from '../../context/POContext';
import StatusBadge from '../StatusBadge';
import { exportPOsToCSV, printPurchaseOrder } from '../../services/exportService';
import {
  Download,
  Filter,
  Search,
  Eye,
  CheckCircle2,
  XCircle,
  Printer,
  DollarSign,
  Clock,
  CheckCheck,
  TrendingUp,
  Building2,
  AlertCircle
} from 'lucide-react';

export default function AccountantDashboard({ onSelectPO, onOpenActionModal }) {
  const { purchaseOrders, expenseAccounts, expenseAccountsMap } = usePOs();

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Calculations for KPI Cards
  const pendingPOs = purchaseOrders.filter(p => p.status === 'pending_approval');
  const approvedPOs = purchaseOrders.filter(p => p.status === 'approved');
  const paidPOs = purchaseOrders.filter(p => p.status === 'paid');

  const pendingTotal = pendingPOs.reduce((sum, p) => sum + (parseFloat(p.total_amount) || 0), 0);
  const approvedTotal = approvedPOs.reduce((sum, p) => sum + (parseFloat(p.total_amount) || 0), 0);
  const paidTotal = paidPOs.reduce((sum, p) => sum + (parseFloat(p.total_amount) || 0), 0);
  const grandTotal = purchaseOrders.reduce((sum, p) => sum + (parseFloat(p.total_amount) || 0), 0);

  // Apply filters to data set
  const filteredPOs = purchaseOrders.filter(po => {
    // Dept filter
    if (selectedDept !== 'ALL' && po.department_account_id !== selectedDept) {
      return false;
    }

    // Status filter
    if (selectedStatus !== 'ALL' && po.status !== selectedStatus) {
      return false;
    }

    // Date range filter
    if (dateFrom && po.purchase_date < dateFrom) return false;
    if (dateTo && po.purchase_date > dateTo) return false;

    // Search query
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchNumber = po.po_number?.toLowerCase().includes(q);
      const matchVendor = po.vendor_name?.toLowerCase().includes(q);
      const matchEmployee = po.employee_name?.toLowerCase().includes(q) || po.employee_email?.toLowerCase().includes(q);
      const matchPurpose = po.school_purpose?.toLowerCase().includes(q);
      if (!matchNumber && !matchVendor && !matchEmployee && !matchPurpose) {
        return false;
      }
    }

    return true;
  });

  const filteredTotalValue = filteredPOs.reduce(
    (sum, p) => sum + (parseFloat(p.total_amount) || 0),
    0
  );

  const handleExportCSV = () => {
    exportPOsToCSV(filteredPOs, expenseAccountsMap);
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedDept('ALL');
    setSelectedStatus('ALL');
    setDateFrom('');
    setDateTo('');
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#0C2340] to-slate-900 rounded-2xl p-6 text-white shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-400/20 text-amber-300 border border-amber-400/30 mb-2">
            Business Office / Accounting Console
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            Purchase Order Approvals & Expenditure Reporting
          </h1>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl">
            Live approval queue, departmental accounting codes, itemized audits, and 1-click export for Wesleyan Christian Academy finance compliance.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md transition"
        >
          <Download className="w-4 h-4" />
          <span>Export Filtered CSV</span>
        </button>
      </div>

      {/* KPI Financial Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Pending Approvals */}
        <div className="bg-white p-4 rounded-xl border border-amber-200/70 shadow-sm bg-gradient-to-br from-amber-50/30 to-transparent">
          <div className="flex items-center justify-between text-amber-700 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Pending Approvals</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
              {pendingPOs.length}
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900">
            ${pendingTotal.toFixed(2)}
          </div>
          <div className="text-[11px] text-amber-700 font-medium mt-1">
            Awaiting accountant review
          </div>
        </div>

        {/* Approved Pending Payment */}
        <div className="bg-white p-4 rounded-xl border border-blue-200/70 shadow-sm bg-gradient-to-br from-blue-50/30 to-transparent">
          <div className="flex items-center justify-between text-blue-700 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Approved for Order</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
              {approvedPOs.length}
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900">
            ${approvedTotal.toFixed(2)}
          </div>
          <div className="text-[11px] text-blue-700 font-medium mt-1">
            Ready for disbursement
          </div>
        </div>

        {/* Paid / Disbursed */}
        <div className="bg-white p-4 rounded-xl border border-emerald-200/70 shadow-sm bg-gradient-to-br from-emerald-50/30 to-transparent">
          <div className="flex items-center justify-between text-emerald-700 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Paid / Reimbursed</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
              {paidPOs.length}
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900">
            ${paidTotal.toFixed(2)}
          </div>
          <div className="text-[11px] text-emerald-700 font-medium mt-1">
            Disbursements finalized
          </div>
        </div>

        {/* Total Organization Spend */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Total Active POs</span>
            <TrendingUp className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900">
            ${grandTotal.toFixed(2)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {purchaseOrders.length} total historical requisitions
          </div>
        </div>

      </div>

      {/* Urgent Approval Queue (Shows high priority pending items) */}
      {pendingPOs.length > 0 && (
        <div className="bg-white rounded-xl border border-amber-200 shadow-sm p-5 bg-amber-50/10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-700 flex items-center justify-center font-bold">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-[#0C2340]">Immediate Approval Queue</h3>
                <p className="text-xs text-slate-500">
                  {pendingPOs.length} purchase order{pendingPOs.length > 1 ? 's' : ''} awaiting your review
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {pendingPOs.map((po) => {
              const dept = expenseAccountsMap[po.department_account_id];

              return (
                <div
                  key={po.id}
                  className="bg-white border border-amber-200/80 rounded-xl p-4 shadow-sm hover:shadow transition flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <span className="font-mono font-bold text-xs text-slate-900">{po.po_number}</span>
                      <span className="font-mono font-bold text-sm text-slate-900">
                        ${Number(po.total_amount).toFixed(2)}
                      </span>
                    </div>

                    <h4 className="font-semibold text-xs text-slate-900 mt-1 truncate">
                      {po.vendor_name}
                    </h4>

                    <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">
                      {po.school_purpose}
                    </p>

                    <div className="mt-3 pt-2 border-t border-slate-100 text-[10px] text-slate-600 flex items-center justify-between">
                      <span className="truncate max-w-[140px] font-medium">{po.employee_name}</span>
                      <span className="font-mono text-slate-500">{dept?.id || po.department_account_id}</span>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 flex items-center justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => onSelectPO(po)}
                      className="px-2.5 py-1 text-slate-600 hover:text-slate-900 text-xs font-medium rounded hover:bg-slate-100 transition"
                    >
                      Inspect
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenActionModal(po)}
                      className="px-3 py-1 bg-[#0C2340] hover:bg-slate-800 text-white font-semibold text-xs rounded-lg transition"
                    >
                      Review & Approve
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Advanced Filter & Reporting Panel */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#0C2340]" />
            <span className="font-bold text-xs uppercase tracking-wider text-slate-700">Filter & Audit Criteria</span>
          </div>

          {(searchQuery || selectedDept !== 'ALL' || selectedStatus !== 'ALL' || dateFrom || dateTo) && (
            <button
              onClick={handleClearFilters}
              className="text-xs text-amber-700 hover:text-amber-900 font-semibold underline"
            >
              Reset all filters
            </button>
          )}
        </div>

        {/* Filter controls grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          
          {/* Search */}
          <div>
            <label className="block text-slate-600 font-semibold mb-1">Search Keywords</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="PO #, vendor, teacher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-2.5 py-1.5 border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-[#0C2340]"
              />
            </div>
          </div>

          {/* Department Account */}
          <div>
            <label className="block text-slate-600 font-semibold mb-1">Expense Account</label>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="w-full p-1.5 border border-slate-300 rounded-lg outline-none bg-white focus:ring-1 focus:ring-[#0C2340]"
            >
              <option value="ALL">All Expense Accounts</option>
              {expenseAccounts.map((acct) => (
                <option key={acct.id} value={acct.id}>
                  {acct.id} - {acct.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-slate-600 font-semibold mb-1">Requisition Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full p-1.5 border border-slate-300 rounded-lg outline-none bg-white focus:ring-1 focus:ring-[#0C2340]"
            >
              <option value="ALL">All Statuses</option>
              <option value="pending_approval">Pending Approval</option>
              <option value="approved">Approved</option>
              <option value="paid">Paid / Reimbursed</option>
              <option value="rejected">Needs Revision</option>
              <option value="draft">Drafts</option>
            </select>
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-slate-600 font-semibold mb-1">Date Range (From - To)</label>
            <div className="flex items-center space-x-1">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-1/2 p-1 border border-slate-300 rounded-lg text-[11px]"
              />
              <span className="text-slate-400">-</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-1/2 p-1 border border-slate-300 rounded-lg text-[11px]"
              />
            </div>
          </div>

        </div>

        {/* Results summary bar */}
        <div className="bg-slate-50 p-2.5 rounded-lg flex items-center justify-between text-xs text-slate-600">
          <div>
            Showing <strong className="text-slate-900">{filteredPOs.length}</strong> matching records
          </div>
          <div>
            Subtotal: <strong className="text-[#0C2340] font-mono text-sm">${filteredTotalValue.toFixed(2)}</strong>
          </div>
        </div>

      </div>

      {/* PO Master Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {filteredPOs.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-sm">No records match the selected filter criteria</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-xs text-left">
              <thead className="bg-slate-50 font-semibold text-slate-600 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-4 py-3">PO Number</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Faculty / Requisitioner</th>
                  <th className="px-4 py-3">Vendor</th>
                  <th className="px-4 py-3">Account Code</th>
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
                      <td className="px-4 py-3 font-semibold text-slate-900 font-mono">
                        {po.po_number}
                      </td>

                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                        {po.purchase_date}
                      </td>

                      <td className="px-4 py-3 text-slate-900">
                        <div className="font-medium">{po.employee_name}</div>
                        <div className="text-[10px] text-slate-400">{po.employee_email}</div>
                      </td>

                      <td className="px-4 py-3 font-medium text-slate-900">
                        {po.vendor_name}
                      </td>

                      <td className="px-4 py-3 text-slate-600">
                        <span className="font-mono font-semibold text-slate-800">{po.department_account_id}</span>
                        {dept && <div className="text-[10px] text-slate-400 truncate max-w-[150px]">{dept.name}</div>}
                      </td>

                      <td className="px-4 py-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                        ${Number(po.total_amount).toFixed(2)}
                      </td>

                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <StatusBadge status={po.status} />
                      </td>

                      <td className="px-4 py-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            type="button"
                            onClick={() => printPurchaseOrder(po, expenseAccountsMap)}
                            className="p-1.5 text-slate-500 hover:text-[#0C2340] rounded hover:bg-slate-100 transition"
                            title="Print Formal Form"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => onSelectPO(po)}
                            className="p-1.5 text-slate-500 hover:text-[#0C2340] rounded hover:bg-slate-100 transition"
                            title="View Audit Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => onOpenActionModal(po)}
                            className="p-1.5 text-emerald-700 hover:text-emerald-900 rounded hover:bg-emerald-50 transition"
                            title="Change Status / Review"
                          >
                            <CheckCheck className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
