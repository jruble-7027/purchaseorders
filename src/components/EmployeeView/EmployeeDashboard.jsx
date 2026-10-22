import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { usePOs } from '../../context/POContext';
import StatusBadge from '../StatusBadge';
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
  DollarSign
} from 'lucide-react';

export default function EmployeeDashboard({ onOpenNewPO, onSelectPO, onEditPO }) {
  const { currentUser } = useAuth();
  const { purchaseOrders, expenseAccountsMap, deletePurchaseOrder } = usePOs();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

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
  const rejectedCount = myPOs.filter(p => p.status === 'rejected').length;

  const totalValue = myPOs.reduce((sum, p) => sum + (parseFloat(p.total_amount) || 0), 0);

  // Apply search & status filters
  const filteredPOs = myPOs.filter(po => {
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'PENDING' && po.status === 'pending_approval') ||
      (statusFilter === 'APPROVED' && (po.status === 'approved' || po.status === 'paid')) ||
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

  const handleDeleteDraft = async (e, poId) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this draft purchase order?')) {
      await deletePurchaseOrder(poId);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Quick Action */}
      <div className="bg-gradient-to-r from-[#0C2340] to-slate-800 rounded-2xl p-6 text-white shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-400/20 text-amber-300 border border-amber-400/30 mb-2">
            Faculty & Staff Portal
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            Welcome, {currentUser?.displayName || 'Faculty Member'}
          </h1>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            Submit new vendor requisitions, attach receipts/quotes, and monitor approval status by the Wesleyan Christian Academy Business Office in real time.
          </p>
        </div>

        <button
          onClick={onOpenNewPO}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm shadow-md transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus className="w-5 h-5 text-slate-950 stroke-[2.5]" />
          <span>New Purchase Order</span>
        </button>
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

      {/* Controls & Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        
        {/* Status Filter Tabs */}
        <div className="flex items-center space-x-1 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {[
            { id: 'ALL', label: 'All My POs' },
            { id: 'PENDING', label: 'Pending' },
            { id: 'APPROVED', label: 'Approved' },
            { id: 'REJECTED', label: 'Needs Revision' },
            { id: 'DRAFT', label: 'Drafts' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                statusFilter === tab.id
                  ? 'bg-[#0C2340] text-white shadow-sm'
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
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0C2340] focus:border-transparent outline-none"
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
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            type="button"
                            onClick={() => onSelectPO(po)}
                            className="p-1.5 text-slate-500 hover:text-[#0C2340] rounded hover:bg-slate-100 transition"
                            title="View Full Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {(po.status === 'draft' || po.status === 'rejected') && (
                            <button
                              type="button"
                              onClick={() => onEditPO(po)}
                              className="p-1.5 text-amber-600 hover:text-amber-800 rounded hover:bg-amber-50 transition"
                              title="Edit / Resubmit"
                            >
                              <FileEdit className="w-4 h-4" />
                            </button>
                          )}

                          {po.status === 'draft' && (
                            <button
                              type="button"
                              onClick={(e) => handleDeleteDraft(e, po.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition"
                              title="Delete Draft"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
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
