import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { usePOs } from '../../context/POContext';
import {
  X,
  Plus,
  Trash2,
  UploadCloud,
  FileText,
  DollarSign,
  AlertTriangle,
  Building,
  Calendar,
  Layers,
  Save,
  Send
} from 'lucide-react';

export default function POFormModal({ isOpen, onClose, initialData = null }) {
  const { currentUser } = useAuth();
  const { expenseAccounts, createPurchaseOrder, updatePurchaseOrder } = usePOs();

  const isEditing = Boolean(initialData && initialData.id);

  // Form State
  const [vendorName, setVendorName] = useState(initialData?.vendor_name || '');
  const [purchaseDate, setPurchaseDate] = useState(
    initialData?.purchase_date || new Date().toISOString().slice(0, 10)
  );
  const [departmentAccountId, setDepartmentAccountId] = useState(
    initialData?.department_account_id || (expenseAccounts[0]?.id || '')
  );
  const [schoolPurpose, setSchoolPurpose] = useState(initialData?.school_purpose || '');
  
  // Line items state
  const [items, setItems] = useState(
    initialData?.items && initialData.items.length > 0
      ? initialData.items
      : [{ id: 'item_1', description: '', qty: 1, unit_price: '' }]
  );

  // File uploads
  const [receiptFiles, setReceiptFiles] = useState([]);
  const [existingReceipts, setExistingReceipts] = useState(initialData?.receipt_urls || []);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  // Handle Item row updates
  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const handleAddItem = () => {
    setItems([
      ...items,
      { id: `item_${Date.now()}`, description: '', qty: 1, unit_price: '' }
    ]);
  };

  const handleRemoveItem = (index) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  // Grand total calculation
  const calculateTotal = () => {
    return items.reduce((sum, item) => {
      const q = parseFloat(item.qty) || 0;
      const p = parseFloat(item.unit_price) || 0;
      return sum + q * p;
    }, 0);
  };

  // Receipt files handler
  const handleFileSelect = (e) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setReceiptFiles((prev) => [...prev, ...filesArray]);
    }
  };

  const handleRemoveNewFile = (index) => {
    setReceiptFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRemoveExistingReceipt = (index) => {
    setExistingReceipts((prev) => prev.filter((_, i) => i !== index));
  };

  // Submission handler
  const handleSubmit = async (isDraft = false) => {
    setErrorMsg('');

    // Validation
    if (!isDraft) {
      if (!vendorName.trim()) {
        setErrorMsg('Please enter a Vendor Name.');
        return;
      }
      if (!departmentAccountId) {
        setErrorMsg('Please select a Department Expense Account.');
        return;
      }
      if (!schoolPurpose.trim()) {
        setErrorMsg('Please describe the school educational purpose or justification.');
        return;
      }

      // Check item descriptions & prices
      const validItems = items.filter(
        i => i.description.trim() && parseFloat(i.unit_price) > 0 && parseFloat(i.qty) > 0
      );
      if (validItems.length === 0) {
        setErrorMsg('Please provide at least one item with a valid description, quantity, and unit price.');
        return;
      }
    }

    try {
      setSubmitting(true);

      const computedItems = items.map(i => ({
        description: i.description.trim() || 'Item',
        qty: parseInt(i.qty, 10) || 1,
        unit_price: parseFloat(i.unit_price) || 0,
        total: (parseInt(i.qty, 10) || 1) * (parseFloat(i.unit_price) || 0)
      }));

      const grandTotal = computedItems.reduce((acc, curr) => acc + curr.total, 0);

      const poPayload = {
        vendor_name: vendorName.trim() || 'Draft Vendor',
        purchase_date: purchaseDate,
        department_account_id: departmentAccountId,
        school_purpose: schoolPurpose.trim(),
        items: computedItems,
        total_amount: grandTotal,
        isDraft: isDraft
      };

      if (isEditing) {
        poPayload.receipt_urls = existingReceipts;
        await updatePurchaseOrder(initialData.id, poPayload, receiptFiles);
      } else {
        await createPurchaseOrder(poPayload, receiptFiles);
      }

      onClose();
    } catch (err) {
      console.error('Submission error:', err);
      setErrorMsg(err.message || 'Failed to submit purchase order.');
    } finally {
      setSubmitting(false);
    }
  };

  const totalAmount = calculateTotal();

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full my-6 overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="bg-[#0C2340] text-white p-5 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold">
              {isEditing ? `Edit Purchase Order (${initialData.po_number})` : 'New Purchase Order Requisition'}
            </h3>
            <p className="text-xs text-amber-300">
              Submit requisitions and receipts for Business Office review & approval
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center space-x-2 text-rose-800 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Section 1: Basic Vendor & Department Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Vendor Name */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Vendor / Supplier Name *
              </label>
              <div className="relative">
                <Building className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Lab Tech Supply Co., Amazon Business, B&H Photo"
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0C2340] focus:border-transparent outline-none"
                />
              </div>
            </div>

            {/* Purchase Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Purchase / Invoice Date *
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="date"
                  required
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0C2340] focus:border-transparent outline-none"
                />
              </div>
            </div>

            {/* Department Expense Account Dropdown */}
            <div className="md:col-span-3">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Department Expense Account Code *
              </label>
              <div className="relative">
                <Layers className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <select
                  value={departmentAccountId}
                  onChange={(e) => setDepartmentAccountId(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0C2340] focus:border-transparent outline-none bg-white"
                >
                  {expenseAccounts.map((acct) => (
                    <option key={acct.id} value={acct.id}>
                      {acct.id} — {acct.name} ({acct.dept})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Purpose / Justification */}
            <div className="md:col-span-3">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Educational Purpose / Requisition Justification *
              </label>
              <textarea
                rows={2}
                placeholder="Explain what these items are for (e.g. replacement chemistry lab optics, annual curriculum renewal, varsity gear)..."
                value={schoolPurpose}
                onChange={(e) => setSchoolPurpose(e.target.value)}
                className="w-full p-3 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0C2340] focus:border-transparent outline-none"
              />
            </div>
          </div>

          {/* Section 2: Dynamic Line Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Itemized Purchase Items *
              </label>
              <span className="text-xs text-slate-500">
                Unit prices will automatically compute into totals
              </span>
            </div>

            <div className="space-y-2 border border-slate-200 rounded-xl p-3 bg-slate-50/70">
              {items.map((item, idx) => {
                const rowTotal = (parseFloat(item.qty) || 0) * (parseFloat(item.unit_price) || 0);

                return (
                  <div key={item.id || idx} className="flex flex-col sm:flex-row items-center gap-2 bg-white p-2.5 rounded-lg border border-slate-200 shadow-sm">
                    {/* Description */}
                    <div className="flex-1 w-full">
                      <input
                        type="text"
                        placeholder="Item Description / Model # / Part #"
                        value={item.description}
                        onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                        className="w-full px-3 py-1.5 text-xs sm:text-sm border border-slate-300 rounded-md focus:ring-1 focus:ring-[#0C2340] outline-none"
                      />
                    </div>

                    {/* Qty */}
                    <div className="w-full sm:w-20">
                      <input
                        type="number"
                        min="1"
                        placeholder="Qty"
                        value={item.qty}
                        onChange={(e) => handleItemChange(idx, 'qty', e.target.value)}
                        className="w-full px-2 py-1.5 text-xs sm:text-sm border border-slate-300 rounded-md text-center focus:ring-1 focus:ring-[#0C2340] outline-none"
                      />
                    </div>

                    {/* Unit Price */}
                    <div className="w-full sm:w-28 relative">
                      <span className="absolute left-2.5 top-2 text-slate-400 text-xs">$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Price"
                        value={item.unit_price}
                        onChange={(e) => handleItemChange(idx, 'unit_price', e.target.value)}
                        className="w-full pl-6 pr-2 py-1.5 text-xs sm:text-sm border border-slate-300 rounded-md text-right focus:ring-1 focus:ring-[#0C2340] outline-none"
                      />
                    </div>

                    {/* Total */}
                    <div className="w-full sm:w-24 text-right font-mono font-semibold text-slate-800 text-xs sm:text-sm px-2">
                      ${rowTotal.toFixed(2)}
                    </div>

                    {/* Delete button */}
                    <button
                      type="button"
                      disabled={items.length <= 1}
                      onClick={() => handleRemoveItem(idx)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 disabled:opacity-30 rounded hover:bg-slate-100 transition"
                      title="Remove item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 transition"
                >
                  <Plus className="w-3.5 h-3.5 text-amber-600" />
                  <span>Add Line Item</span>
                </button>

                <div className="text-right">
                  <span className="text-xs text-slate-500 uppercase tracking-wider mr-2 font-semibold">Total Amount:</span>
                  <span className="text-lg font-bold font-mono text-[#0C2340]">
                    ${totalAmount.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Receipt & Document Uploads */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Receipts, Quotes, or Itemized Invoices
            </label>
            <p className="text-xs text-slate-500 mb-2">
              Attach vendor order confirmation, formal quote, or itemized receipt (PDF, JPG, PNG up to 10MB)
            </p>

            <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 text-center hover:border-amber-500/50 hover:bg-amber-500/5 transition cursor-pointer relative">
              <input
                type="file"
                multiple
                accept="image/*,application/pdf"
                onChange={handleFileSelect}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              <UploadCloud className="w-8 h-8 mx-auto text-amber-600 mb-1" />
              <p className="text-xs font-semibold text-slate-700">
                Click or drag & drop files here to upload
              </p>
              <p className="text-[11px] text-slate-400">PDF, PNG, JPG accepted</p>
            </div>

            {/* List of uploaded files */}
            {(receiptFiles.length > 0 || existingReceipts.length > 0) && (
              <div className="mt-3 space-y-1.5">
                {/* Existing receipts */}
                {existingReceipts.map((rec, i) => (
                  <div key={`existing_${i}`} className="flex items-center justify-between p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                    <div className="flex items-center gap-2 truncate">
                      <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                      <span className="truncate text-slate-800">{rec.name || 'Uploaded Document'}</span>
                      <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded">Saved</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveExistingReceipt(i)}
                      className="text-slate-400 hover:text-rose-600 p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                {/* New receipts */}
                {receiptFiles.map((file, i) => (
                  <div key={`new_${i}`} className="flex items-center justify-between p-2 bg-amber-50/70 border border-amber-200 rounded-lg text-xs">
                    <div className="flex items-center gap-2 truncate">
                      <FileText className="w-4 h-4 text-amber-600 shrink-0" />
                      <span className="truncate text-slate-800">{file.name}</span>
                      <span className="text-[10px] text-slate-500">({(file.size / 1024).toFixed(0)} KB)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveNewFile(i)}
                      className="text-slate-400 hover:text-rose-600 p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 p-4 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            disabled={submitting}
            onClick={() => handleSubmit(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 font-medium text-xs rounded-lg transition disabled:opacity-50"
          >
            <Save className="w-4 h-4 text-slate-500" />
            <span>Save as Draft</span>
          </button>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              disabled={submitting}
              onClick={onClose}
              className="px-3.5 py-2 text-slate-600 hover:text-slate-800 text-xs font-medium"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => handleSubmit(false)}
              className="inline-flex items-center gap-1.5 px-5 py-2 bg-[#0C2340] hover:bg-slate-800 text-white font-semibold text-xs rounded-lg transition shadow-sm disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5 text-amber-400" />
              <span>{submitting ? 'Submitting...' : 'Submit for Approval'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
