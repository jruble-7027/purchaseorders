import React, { useState } from 'react';
import { usePOs } from '../../context/POContext';
import {
  CheckCircle2,
  XCircle,
  DollarSign,
  X,
  AlertTriangle
} from 'lucide-react';

export default function ApprovalModal({ po, isOpen, onClose }) {
  const { approvePurchaseOrder, rejectPurchaseOrder, markPurchaseOrderPaid } = usePOs();

  const [actionType, setActionType] = useState('APPROVE'); // 'APPROVE' | 'REJECT' | 'PAY'
  const [notes, setNotes] = useState('');
  const [paymentRef, setPaymentRef] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen || !po) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    try {
      setSubmitting(true);

      if (actionType === 'APPROVE') {
        await approvePurchaseOrder(po.id, notes);
      } else if (actionType === 'REJECT') {
        if (!notes.trim()) {
          setErrorMsg('A specific reason or note to the faculty member is required for revision.');
          setSubmitting(false);
          return;
        }
        await rejectPurchaseOrder(po.id, notes.trim());
      } else if (actionType === 'PAY') {
        await markPurchaseOrderPaid(po.id, paymentRef.trim() || 'Disbursed via Business Office');
      }

      onClose();
    } catch (err) {
      console.error('Action error:', err);
      setErrorMsg(err.message || 'Failed to process purchase order action.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="bg-[#0C2340] text-white p-4 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base">Business Office Review & Action</h3>
            <p className="text-xs text-amber-300">
              {po.po_number} • {po.vendor_name} (${Number(po.total_amount).toFixed(2)})
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Type Selector */}
        <div className="p-5 border-b border-slate-200 bg-slate-50">
          <div className="grid grid-cols-3 gap-2">
            
            <button
              type="button"
              onClick={() => { setActionType('APPROVE'); setErrorMsg(''); }}
              className={`p-2.5 rounded-lg border text-center transition flex flex-col items-center justify-center gap-1 ${
                actionType === 'APPROVE'
                  ? 'border-emerald-600 bg-emerald-50 text-emerald-800 font-bold shadow-sm'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span className="text-xs">Approve</span>
            </button>

            <button
              type="button"
              onClick={() => { setActionType('REJECT'); setErrorMsg(''); }}
              className={`p-2.5 rounded-lg border text-center transition flex flex-col items-center justify-center gap-1 ${
                actionType === 'REJECT'
                  ? 'border-rose-600 bg-rose-50 text-rose-800 font-bold shadow-sm'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
              }`}
            >
              <XCircle className="w-4 h-4 text-rose-600" />
              <span className="text-xs">Needs Revision</span>
            </button>

            <button
              type="button"
              onClick={() => { setActionType('PAY'); setErrorMsg(''); }}
              className={`p-2.5 rounded-lg border text-center transition flex flex-col items-center justify-center gap-1 ${
                actionType === 'PAY'
                  ? 'border-blue-600 bg-blue-50 text-blue-800 font-bold shadow-sm'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
              }`}
            >
              <DollarSign className="w-4 h-4 text-blue-600" />
              <span className="text-xs">Mark as Paid</span>
            </button>

          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center space-x-2 text-rose-800 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {actionType === 'APPROVE' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Accountant Approval Notes (Optional)
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Approved against 2026 Academic STEM budget allocation."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full p-2.5 text-xs sm:text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 outline-none"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                This note will be recorded in the audit trail and visible to the requisitioner.
              </p>
            </div>
          )}

          {actionType === 'REJECT' && (
            <div>
              <label className="block text-xs font-semibold text-rose-700 uppercase tracking-wider mb-1">
                Reason for Revision / Rejection *
              </label>
              <textarea
                rows={3}
                required
                placeholder="Explain what needs to be changed (e.g. Please attach the itemized sales quote from the vendor with sales tax excluded)..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full p-2.5 text-xs sm:text-sm border border-rose-300 rounded-lg focus:ring-2 focus:ring-rose-600 outline-none"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                The requisitioner will be notified and can edit & resubmit the purchase order.
              </p>
            </div>
          )}

          {actionType === 'PAY' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Payment Reference / Check # / ACH ID
                </label>
                <input
                  type="text"
                  placeholder="e.g. Check #94821 or ACH-2026-1022"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  className="w-full p-2.5 text-xs sm:text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none"
                />
              </div>
              <p className="text-[11px] text-slate-500">
                Marks this purchase order as disbursed and finalized in financial records.
              </p>
            </div>
          )}

          {/* Buttons */}
          <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              disabled={submitting}
              onClick={onClose}
              className="px-3.5 py-2 text-slate-600 hover:text-slate-800 text-xs font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={`px-5 py-2 text-white font-semibold text-xs rounded-lg transition shadow-sm ${
                actionType === 'APPROVE'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : actionType === 'REJECT'
                  ? 'bg-rose-600 hover:bg-rose-700'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {submitting ? 'Updating...' : `Confirm ${actionType === 'APPROVE' ? 'Approval' : actionType === 'REJECT' ? 'Revision Request' : 'Payment'}`}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
