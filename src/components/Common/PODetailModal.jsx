import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { usePOs } from '../../context/POContext';
import StatusBadge from '../StatusBadge';
import ReceiptViewer from './ReceiptViewer';
import { printPurchaseOrder } from '../../services/exportService';
import {
  Printer,
  X,
  Calendar,
  Building,
  User,
  History,
  FileCheck2,
  DollarSign,
  AlertCircle
} from 'lucide-react';

export default function PODetailModal({ po, onClose, onOpenActionModal, onEditDraft }) {
  const { currentUser } = useAuth();
  const { expenseAccountsMap } = usePOs();

  if (!po) return null;

  const isAccountant = currentUser?.role === 'accountant' || currentUser?.role === 'admin';
  const isOwner = currentUser?.uid === po.created_by || currentUser?.email === po.employee_email;

  const dept = expenseAccountsMap[po.department_account_id] || {
    name: 'Unassigned Account',
    id: po.department_account_id
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full my-8 overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="bg-[#0C2340] text-white p-5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xl font-bold tracking-tight text-white">{po.po_number}</span>
                <StatusBadge status={po.status} />
              </div>
              <p className="text-xs text-amber-400 mt-0.5">
                Wesleyan Christian Academy Requisition
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => printPurchaseOrder(po, expenseAccountsMap)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/20 text-white transition"
              title="Print Official PO Requisition"
            >
              <Printer className="w-4 h-4 text-amber-300" />
              <span>Print Form</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          
          {/* Metadata Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Vendor & Date */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <Building className="w-4 h-4 text-amber-600" />
                <span>Vendor Details</span>
              </div>
              <p className="text-base font-bold text-slate-900">{po.vendor_name}</p>
              <div className="flex items-center gap-2 text-xs text-slate-600 pt-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Purchase Date: <strong>{po.purchase_date}</strong></span>
              </div>
            </div>

            {/* Requisitioner & Dept */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <User className="w-4 h-4 text-blue-600" />
                <span>Requisitioner & Account</span>
              </div>
              <p className="text-sm font-semibold text-slate-900">
                {po.employee_name} <span className="font-normal text-xs text-slate-500">({po.employee_email})</span>
              </p>
              <div className="text-xs text-slate-700 bg-white px-2.5 py-1.5 rounded border border-slate-200">
                <span className="font-mono font-bold text-slate-900">{dept.id}</span>
                <span className="mx-1.5 text-slate-400">•</span>
                <span>{dept.name}</span>
              </div>
            </div>
          </div>

          {/* School Purpose */}
          <div className="bg-amber-500/5 p-4 rounded-xl border border-amber-500/20">
            <h4 className="text-xs font-bold text-[#0C2340] uppercase tracking-wider mb-1">
              School Purpose / Educational Justification
            </h4>
            <p className="text-sm text-slate-700 leading-relaxed">
              {po.school_purpose || 'No purpose description provided.'}
            </p>
          </div>

          {/* Line Items Table */}
          <div>
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Itemized Line Items
            </h4>
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-slate-200 text-xs">
                <thead className="bg-slate-100 font-semibold text-slate-700">
                  <tr>
                    <th className="px-4 py-2.5 text-left">Description</th>
                    <th className="px-3 py-2.5 text-center w-16">Qty</th>
                    <th className="px-3 py-2.5 text-right w-24">Unit Price</th>
                    <th className="px-4 py-2.5 text-right w-28">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {(po.items || []).map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5 text-slate-800 font-medium">{item.description}</td>
                      <td className="px-3 py-2.5 text-slate-600 text-center">{item.qty}</td>
                      <td className="px-3 py-2.5 text-slate-600 text-right font-mono">${Number(item.unit_price).toFixed(2)}</td>
                      <td className="px-4 py-2.5 text-slate-900 text-right font-mono font-semibold">
                        ${Number(item.total).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 font-bold text-slate-900 border-t border-slate-300">
                  <tr>
                    <td colSpan="3" className="px-4 py-3 text-right text-xs uppercase tracking-wider">Grand Total Requisition:</td>
                    <td className="px-4 py-3 text-right font-mono text-sm text-[#0C2340]">
                      ${Number(po.total_amount).toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Receipts / Document Attachments */}
          <div>
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Attached Receipts & Documents
            </h4>
            <ReceiptViewer receipts={po.receipt_urls} />
          </div>

          {/* Status Decision Details */}
          {po.status === 'approved' && po.approval_notes && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start space-x-2 text-xs">
              <FileCheck2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-emerald-900">Approval Notes:</span>
                <span className="text-emerald-800 ml-1.5">{po.approval_notes}</span>
                {po.approved_by && (
                  <span className="text-emerald-700 block text-[11px] mt-0.5">Approved by: {po.approved_by}</span>
                )}
              </div>
            </div>
          )}

          {po.status === 'paid' && (
            <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-lg flex items-start space-x-2 text-xs">
              <DollarSign className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-blue-900">Disbursement Information:</span>
                <span className="text-blue-800 ml-1.5">
                  Payment Reference: <strong>{po.payment_reference || 'Disbursed'}</strong>
                </span>
                {po.paid_at && (
                  <span className="text-blue-700 block text-[11px] mt-0.5">
                    Processed at: {new Date(po.paid_at).toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          )}

          {po.status === 'rejected' && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg flex items-start space-x-2 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-rose-900">Revision Request Reason:</span>
                <p className="text-rose-800 mt-1">{po.rejection_reason}</p>
                {po.rejected_by && (
                  <span className="text-rose-700 block text-[11px] mt-1">Reviewed by: {po.rejected_by}</span>
                )}
              </div>
            </div>
          )}

          {/* Audit Logs Trail */}
          <div className="pt-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              <History className="w-4 h-4 text-slate-400" />
              <span>Audit Trail & Activity Log</span>
            </div>
            <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 space-y-2 text-xs">
              {(po.audit_logs || []).map((log, idx) => (
                <div key={idx} className="flex items-start justify-between border-b border-slate-200/60 pb-1.5 last:border-0 last:pb-0">
                  <div>
                    <span className="font-semibold text-slate-900">
                      {log.actor_name || log.actor_email}
                    </span>
                    <span className="text-slate-400 mx-1.5">({log.actor_role})</span>
                    <span className="text-slate-700">{log.details}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 shrink-0 ml-2">
                    {new Date(log.timestamp).toLocaleDateString()} {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 p-4 border-t border-slate-200 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            System PO ID: <span className="font-mono">{po.id}</span>
          </div>

          <div className="flex items-center space-x-2">
            {/* Edit option for owner on drafts or rejected POs */}
            {isOwner && (po.status === 'draft' || po.status === 'rejected') && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEditDraft(po);
                }}
                className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold text-xs rounded-lg transition"
              >
                Edit & Resubmit
              </button>
            )}

            {/* Accountant Decision triggers */}
            {isAccountant && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenActionModal(po);
                }}
                className="px-4 py-1.5 bg-[#0C2340] hover:bg-slate-800 text-white font-semibold text-xs rounded-lg transition"
              >
                Review & Take Action
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 border border-slate-300 text-slate-700 hover:bg-slate-100 font-medium text-xs rounded-lg transition"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
