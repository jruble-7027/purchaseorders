import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { usePOs } from '../../context/POContext';
import {
  PackageCheck,
  UploadCloud,
  FileText,
  X,
  AlertCircle,
  Building,
  Calendar,
  Check
} from 'lucide-react';

export default function MarkReceivedModal({ po, isOpen, onClose, onReceivedSuccess }) {
  const { currentUser } = useAuth();
  const { markPurchaseOrderReceived } = usePOs();

  const [notes, setNotes] = useState('All items delivered and verified in good condition.');
  const [packingSlipFiles, setPackingSlipFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen || !po) return null;

  const handleFileSelect = (e) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setPackingSlipFiles((prev) => [...prev, ...filesArray]);
    }
  };

  const handleRemoveFile = (index) => {
    setPackingSlipFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    try {
      setSubmitting(true);
      await markPurchaseOrderReceived(po.id, notes.trim(), packingSlipFiles);
      if (onReceivedSuccess) {
        onReceivedSuccess();
      }
      onClose();
    } catch (err) {
      console.error('Mark received error:', err);
      setErrorMsg(err.message || 'Failed to update receiving status.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-[#111111] via-[#1c1013] to-[#2e1065] border-b-2 border-purple-600 text-white p-4 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-400/40 flex items-center justify-center text-purple-300">
              <PackageCheck className="w-5 h-5 text-purple-300" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Mark as Received / Delivered</h3>
              <p className="text-xs text-purple-200">
                {po.po_number} • {po.vendor_name} (${Number(po.total_amount).toFixed(2)})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-300 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center space-x-2 text-rose-800 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* PO Brief Overview Box */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1.5">
            <div className="flex justify-between text-slate-600">
              <span>Requisitioner:</span>
              <span className="font-semibold text-slate-900">{po.employee_name || po.employee_email}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Vendor / Supplier:</span>
              <span className="font-semibold text-slate-900">{po.vendor_name}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Approved Amount:</span>
              <span className="font-mono font-bold text-slate-900">${Number(po.total_amount).toFixed(2)}</span>
            </div>
          </div>

          {/* Receiving Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Receiving Notes & Delivery Verification *
            </label>
            <textarea
              rows={3}
              required
              placeholder="e.g. Delivered to Front Office / Room 204. All 8 items inspected and verified in complete, undamaged condition."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-2.5 text-xs sm:text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-600 outline-none"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Recorded by <span className="font-semibold">{currentUser?.displayName || currentUser?.email}</span> on today's date.
            </p>
          </div>

          {/* Packing Slip / Receiving Photo Upload */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Attach Packing Slip or Delivery Photo (Optional)
            </label>
            <p className="text-xs text-slate-500 mb-2">
              Snap a picture or upload the paper packing slip included inside the vendor box.
            </p>

            <div className="border-2 border-dashed border-slate-300 rounded-xl p-3.5 text-center hover:border-purple-500/50 hover:bg-purple-500/5 transition cursor-pointer relative">
              <input
                type="file"
                multiple
                accept="image/*,application/pdf"
                onChange={handleFileSelect}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              <UploadCloud className="w-7 h-7 mx-auto text-purple-600 mb-1" />
              <p className="text-xs font-semibold text-slate-700">
                Click or drag & drop packing slip here
              </p>
              <p className="text-[11px] text-slate-400">PDF, PNG, JPG up to 10MB</p>
            </div>

            {/* Uploaded Files List */}
            {packingSlipFiles.length > 0 && (
              <div className="mt-2.5 space-y-1.5">
                {packingSlipFiles.map((file, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2 bg-purple-50/70 border border-purple-200 rounded-lg text-xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FileText className="w-4 h-4 text-purple-600 shrink-0" />
                      <span className="truncate text-slate-800 font-medium">{file.name}</span>
                      <span className="text-[10px] text-slate-500">
                        ({(file.size / 1024).toFixed(0)} KB)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(i)}
                      className="text-slate-400 hover:text-rose-600 p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
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
              className="inline-flex items-center gap-1.5 px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs rounded-lg transition shadow-sm disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{submitting ? 'Recording...' : 'Confirm Received'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
