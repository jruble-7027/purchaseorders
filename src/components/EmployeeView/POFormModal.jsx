import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { usePOs } from '../../context/POContext';
import {
  X,
  Plus,
  Trash2,
  UploadCloud,
  FileText,
  AlertTriangle,
  Building,
  CreditCard,
  Calendar,
  Search,
  ChevronDown,
  Save,
  Send
} from 'lucide-react';

/**
 * Searchable Account # selector.
 * When user types digits (e.g. "566"), only accounts whose account number starts with "566" appear.
 */
function SearchableAccountSelect({
  accounts = [],
  value,
  onChange,
  placeholder = 'Type account # (e.g. 566)...',
  compact = false
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef(null);

  const selectedAccount = accounts.find((a) => a.id === value);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredAccounts = accounts.filter((acct) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    const rawNum = acct.id.replace(/^acct-/i, '').toLowerCase();
    const fullId = acct.id.toLowerCase();
    // If user enters numbers (or "acct-566"), strictly match accounts starting with those digits
    if (/^(acct-)?\d+$/.test(q)) {
      const digits = q.replace(/^acct-/, '');
      return rawNum.startsWith(digits);
    }
    return (
      rawNum.startsWith(q) ||
      fullId.startsWith(q) ||
      (acct.name || '').toLowerCase().includes(q)
    );
  });

  const displayValue = isOpen
    ? query
    : selectedAccount
    ? `${selectedAccount.id} — ${selectedAccount.name}`
    : value || '';

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={displayValue}
          placeholder={placeholder}
          onFocus={() => {
            setIsOpen(true);
            setQuery('');
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && isOpen && filteredAccounts.length > 0) {
              e.preventDefault();
              onChange(filteredAccounts[0].id);
              setIsOpen(false);
              setQuery('');
            } else if (e.key === 'Escape') {
              setIsOpen(false);
              setQuery('');
            }
          }}
          className={`w-full pl-8 pr-7 ${
            compact ? 'py-1.5 text-xs' : 'py-2 text-sm'
          } border border-slate-300 rounded-lg bg-white font-semibold text-slate-800 focus:ring-2 focus:ring-[#0C2340] focus:border-transparent outline-none`}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => {
            setIsOpen((prev) => !prev);
            setQuery('');
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
        >
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>

      {isOpen && (
        <div className="absolute z-40 mt-1 w-full max-h-52 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-xl divide-y divide-slate-100 text-xs">
          {filteredAccounts.length === 0 ? (
            <div className="px-3 py-2.5 text-slate-400 italic">
              No accounts starting with "{query}"
            </div>
          ) : (
            filteredAccounts.map((acct) => {
              const isSelected = acct.id === value;
              return (
                <button
                  key={acct.id}
                  type="button"
                  onClick={() => {
                    onChange(acct.id);
                    setIsOpen(false);
                    setQuery('');
                  }}
                  className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-amber-50 transition ${
                    isSelected ? 'bg-amber-50/80 font-bold text-[#0C2340]' : 'text-slate-700'
                  }`}
                >
                  <div>
                    <span className="font-mono font-bold text-[#0C2340]">{acct.id}</span>
                    <span className="mx-1.5 text-slate-300">—</span>
                    <span className="font-medium">{acct.name}</span>
                  </div>
                  {acct.dept && (
                    <span className="text-[10px] text-slate-400 ml-2 truncate">{acct.dept}</span>
                  )}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

export default function POFormModal({ isOpen, onClose, initialData = null }) {
  const { currentUser } = useAuth();
  const { expenseAccounts, expenseAccountsMap, previewNextPONumber, createPurchaseOrder, updatePurchaseOrder } = usePOs();

  const isEditing = Boolean(initialData && initialData.id);
  const currentCalendarYear = new Date().getFullYear();
  const defaultAccountId = initialData?.department_account_id || expenseAccounts[0]?.id || 'ACCT-566400';

  // Detect if initial PO is a credit card PO (e.g., Visa-4826)
  const initialIsCreditCard =
    initialData?.po_type === 'credit_card' ||
    /^(visa|mastercard|amex|discover|card)/i.test(initialData?.vendor_name || '');

  const [poType, setPoType] = useState(initialIsCreditCard ? 'credit_card' : 'standard');
  const [vendorName, setVendorName] = useState(initialData?.vendor_name || '');
  const [purchaseDate, setPurchaseDate] = useState(
    initialData?.purchase_date || new Date().toISOString().slice(0, 10)
  );

  const initialPOYear =
    initialData?.po_year ||
    parseInt((initialData?.po_number || '').split('-')[1], 10) ||
    parseInt((initialData?.purchase_date || '').slice(0, 4), 10) ||
    currentCalendarYear;
  const [poYear, setPoYear] = useState(initialPOYear);
  const [manualYearOverride, setManualYearOverride] = useState(false);

  const [departmentAccountId, setDepartmentAccountId] = useState(
    initialData?.department_account_id || ''
  );

  // Normalize existing items or initialize first blank row
  const normalizeInitialItems = () => {
    if (initialData?.items && initialData.items.length > 0) {
      return initialData.items.map((it, idx) => {
        const legacyUnitOrAmount =
          it.unit_price !== undefined && it.unit_price !== ''
            ? it.unit_price
            : it.amount !== undefined && it.amount !== ''
            ? it.amount
            : 0;
        return {
          id: it.id || `item_${idx + 1}`,
          qty: it.qty !== undefined && it.qty !== '' ? String(it.qty) : '1',
          account_id: it.account_id || initialData.department_account_id || defaultAccountId,
          vendor: it.vendor || '',
          description: it.description || '',
          amount: Number(legacyUnitOrAmount) !== 0 ? String(legacyUnitOrAmount) : '',
          shipping_handling:
            it.shipping_handling !== undefined && Number(it.shipping_handling) !== 0
              ? String(it.shipping_handling)
              : '',
          tax: it.tax !== undefined && Number(it.tax) !== 0 ? String(it.tax) : ''
        };
      });
    }
    return [
      {
        id: 'item_1',
        qty: '1',
        account_id: defaultAccountId,
        vendor: '',
        description: '',
        amount: '',
        shipping_handling: '',
        tax: ''
      }
    ];
  };

  const [items, setItems] = useState(normalizeInitialItems);

  // File uploads
  const [receiptFiles, setReceiptFiles] = useState([]);
  const [existingReceipts, setExistingReceipts] = useState(initialData?.receipt_urls || []);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  // Row calculations helper
  const computeRowNumbers = (item) => {
    const qty = poType === 'standard' ? Math.max(1, parseFloat(item.qty) || 1) : 1;
    const unitAmount = parseFloat(item.amount) || 0;
    const baseAmount = qty * unitAmount;
    const sh = parseFloat(item.shipping_handling) || 0;
    const tax = parseFloat(item.tax) || 0;
    const total = baseAmount + sh + tax;
    return { qty, unitAmount, amount: baseAmount, sh, tax, total };
  };

  // Handle Item row updates
  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const handleAddItem = () => {
    const lastAccount = items[items.length - 1]?.account_id || departmentAccountId || defaultAccountId;
    setItems([
      ...items,
      {
        id: `item_${Date.now()}`,
        qty: '1',
        account_id: lastAccount,
        vendor: '',
        description: '',
        amount: '',
        shipping_handling: '',
        tax: ''
      }
    ]);
  };

  const handleRemoveItem = (index) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  // Summary totals across all rows
  const summaryTotals = items.reduce(
    (acc, item) => {
      const { amount, sh, tax, total } = computeRowNumbers(item);
      const acctId =
        poType === 'standard'
          ? departmentAccountId || defaultAccountId
          : item.account_id || departmentAccountId || defaultAccountId;
      acc.subtotalAmount += amount;
      acc.totalSH += sh;
      acc.totalTax += tax;
      acc.grandTotal += total;
      if ((total > 0 || amount > 0) && acctId) {
        acc.byAccount[acctId] = (acc.byAccount[acctId] || 0) + total;
      }
      return acc;
    },
    { subtotalAmount: 0, totalSH: 0, totalTax: 0, grandTotal: 0, byAccount: {} }
  );

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

    if (!isDraft) {
      if (!vendorName.trim()) {
        setErrorMsg('Please enter a Vendor / Supplier or Credit Card Name (e.g. Visa-4826).');
        return;
      }
      if (poType === 'standard' && !departmentAccountId) {
        setErrorMsg('Please select a required ACCOUNT # for this Purchase Order.');
        return;
      }

      const validItems = items.filter((i) => {
        const { total } = computeRowNumbers(i);
        const hasAcct = poType === 'standard' ? Boolean(departmentAccountId) : Boolean(i.account_id);
        return hasAcct && i.description.trim() && total > 0;
      });
      if (validItems.length === 0) {
        setErrorMsg('Please provide at least one line item with a Description and Amount.');
        return;
      }
    }

    try {
      setSubmitting(true);

      const fallbackAcct = departmentAccountId || defaultAccountId;
      const computedItems = items.map((i, idx) => {
        const { qty, unitAmount, amount, sh, tax, total } = computeRowNumbers(i);
        const rowAcct = poType === 'standard' ? fallbackAcct : i.account_id || fallbackAcct;
        return {
          id: i.id || `item_${idx + 1}`,
          account_id: rowAcct,
          vendor: (i.vendor || '').trim() || vendorName.trim(),
          description: i.description.trim() || 'Item',
          qty: qty,
          unit_price: unitAmount,
          amount: amount,
          shipping_handling: sh,
          tax: tax,
          total: total
        };
      });

      const primaryAccountId =
        poType === 'standard'
          ? fallbackAcct
          : computedItems[0]?.account_id || fallbackAcct;
      const distinctAccounts = Array.from(new Set(computedItems.map((i) => i.account_id)));
      const autoPurpose = computedItems
        .map((i) => i.description)
        .filter(Boolean)
        .join('; ');

      const poPayload = {
        po_type: poType,
        vendor_name: vendorName.trim() || 'Draft Vendor',
        purchase_date: purchaseDate,
        po_year: Number(poYear),
        department_account_id: primaryAccountId,
        account_ids: distinctAccounts,
        school_purpose: initialData?.school_purpose || autoPurpose,
        items: computedItems,
        subtotal_amount: summaryTotals.subtotalAmount,
        shipping_handling_amount: summaryTotals.totalSH,
        tax_amount: summaryTotals.totalTax,
        total_amount: summaryTotals.grandTotal,
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

  const existingPOYear = parseInt((initialData?.po_number || '').split('-')[1], 10);
  const displayedPONumber =
    isEditing && existingPOYear === Number(poYear)
      ? initialData.po_number
      : previewNextPONumber
      ? previewNextPONumber(poYear)
      : `PO-${poYear}-000001`;
  const yearOptions = Array.from(
    new Set([currentCalendarYear - 1, currentCalendarYear, currentCalendarYear + 1, Number(poYear)])
  ).sort((a, b) => a - b);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full my-4 overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="bg-[#0C2340] text-white px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="text-lg font-bold">
                {isEditing ? `Edit Purchase Order (${initialData.po_number})` : 'New Purchase Order Requisition'}
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-400/20 text-amber-300 border border-amber-400/40">
                {isEditing && existingPOYear === Number(poYear) ? initialData.po_number : `Next #: ${displayedPONumber}`}
              </span>
            </div>
            <p className="text-xs text-amber-300 mt-0.5">
              Supports single-account Standard POs and multi-account Split Acct. POs (e.g., Visa-4826)
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Mode Switcher: Standard vs Split Acct. */}
            <div className="bg-slate-800/90 p-1 rounded-lg border border-slate-700 flex items-center text-xs">
              <button
                type="button"
                onClick={() => setPoType('standard')}
                className={`px-3 py-1.5 rounded-md font-semibold transition flex items-center gap-1.5 ${
                  poType === 'standard'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Building className="w-3.5 h-3.5" />
                <span>Standard PO</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setPoType('credit_card');
                  if (!vendorName.trim()) {
                    setVendorName('Visa-4826');
                  }
                }}
                className={`px-3 py-1.5 rounded-md font-semibold transition flex items-center gap-1.5 ${
                  poType === 'credit_card'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Split Acct. PO</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center space-x-2 text-rose-800 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Section 1: Header Metadata */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-slate-50/80 p-4 rounded-xl border border-slate-200/80">
            
            {/* Vendor / Supplier / Card Name */}
            <div className="md:col-span-5">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  {poType === 'credit_card' ? 'Credit Card / Statement Name *' : 'Vendor / Supplier Name *'}
                </label>
                {poType === 'credit_card' && vendorName !== 'Visa-4826' && (
                  <button
                    type="button"
                    onClick={() => setVendorName('Visa-4826')}
                    className="text-[11px] font-semibold text-amber-700 hover:text-amber-900 underline"
                  >
                    Use Visa-4826
                  </button>
                )}
              </div>
              <div className="relative">
                {poType === 'credit_card' ? (
                  <CreditCard className="w-4 h-4 absolute left-3 top-2.5 text-amber-600" />
                ) : (
                  <Building className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                )}
                <input
                  type="text"
                  required
                  placeholder={
                    poType === 'credit_card'
                      ? 'e.g. Visa-4826'
                      : 'e.g. Amazon Business, Lab Tech Supply Co., Staples'
                  }
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0C2340] focus:border-transparent outline-none bg-white"
                />
              </div>
            </div>

            {/* Purchase Date */}
            <div className="md:col-span-3">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Purchase / Statement Date *
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="date"
                  required
                  value={purchaseDate}
                  onChange={(e) => {
                    const val = e.target.value;
                    setPurchaseDate(val);
                    const dateYear = parseInt((val || '').slice(0, 4), 10);
                    if (!manualYearOverride && !isNaN(dateYear) && dateYear >= 2020 && dateYear <= 2100) {
                      setPoYear(dateYear);
                    }
                  }}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0C2340] focus:border-transparent outline-none bg-white"
                />
              </div>
            </div>

            {/* PO Accounting Year */}
            <div className="md:col-span-4">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                PO Accounting Year (PO-YYYY) *
              </label>
              <select
                value={poYear}
                onChange={(e) => {
                  setPoYear(Number(e.target.value));
                  setManualYearOverride(true);
                }}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0C2340] focus:border-transparent outline-none bg-white font-semibold text-slate-800"
              >
                {yearOptions.map((yr) => (
                  <option key={yr} value={yr}>
                    PO-{yr}{' '}
                    {yr === currentCalendarYear - 1
                      ? '(Prior Year / Post-Dec 31)'
                      : yr === currentCalendarYear
                      ? '(Current Year)'
                      : '(Next Year)'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Section 2: ACCOUNT # (Left Side, Searchable & Required) + Line Items */}
          <div>
            {/* Left-aligned Searchable ACCOUNT # Field */}
            <div className="mb-3 max-w-md">
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                ACCOUNT # {poType === 'standard' ? '*' : '(Default for New Rows)'}
              </label>
              <SearchableAccountSelect
                accounts={expenseAccounts}
                value={departmentAccountId}
                onChange={(acctId) => setDepartmentAccountId(acctId)}
                placeholder="Start typing account # (e.g. 566)..."
              />
            </div>

            <div className="border border-slate-200 rounded-xl overflow-visible bg-slate-50/70">
              {/* Desktop Column Header Row */}
              <div className="hidden lg:grid lg:grid-cols-12 gap-2 px-3 py-2.5 bg-[#0C2340] text-white text-[11px] font-semibold uppercase tracking-wider items-center rounded-t-xl">
                {poType === 'standard' ? (
                  <>
                    <div className="col-span-1 text-center">1. QTY</div>
                    <div className="col-span-3">2. Vendor / Merchant</div>
                    <div className="col-span-4">3. Description</div>
                  </>
                ) : (
                  <>
                    <div className="col-span-3">1. Account (ACCT)</div>
                    <div className="col-span-2">2. Vendor / Merchant</div>
                    <div className="col-span-3">3. Description</div>
                  </>
                )}
                <div className="col-span-1 text-right">Amount ($)</div>
                <div className="col-span-1 text-right">S/H ($)</div>
                <div className="col-span-1 text-right">Tax ($)</div>
                <div className="col-span-1 text-right pr-6">Total</div>
              </div>

              {/* Line Item Rows */}
              <div className="divide-y divide-slate-200 p-2 sm:p-3 space-y-2 lg:space-y-0">
                {items.map((item, idx) => {
                  const { total } = computeRowNumbers(item);

                  return (
                    <div
                      key={item.id || idx}
                      className="grid grid-cols-1 lg:grid-cols-12 gap-2 items-center bg-white p-2.5 rounded-lg lg:rounded-none border lg:border-0 border-slate-200 shadow-sm lg:shadow-none"
                    >
                      {poType === 'standard' ? (
                        /* 1. QTY (Standard PO Mode) */
                        <div className="lg:col-span-1">
                          <label className="block lg:hidden text-[10px] font-bold uppercase text-slate-500 mb-0.5">
                            1. QTY
                          </label>
                          <input
                            type="number"
                            min="1"
                            step="1"
                            placeholder="1"
                            value={item.qty}
                            onChange={(e) => handleItemChange(idx, 'qty', e.target.value)}
                            className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-md text-center font-semibold text-slate-800 focus:ring-1 focus:ring-[#0C2340] outline-none"
                          />
                        </div>
                      ) : (
                        /* 1. ACCT (Credit Card PO Mode - Searchable!) */
                        <div className="lg:col-span-3">
                          <label className="block lg:hidden text-[10px] font-bold uppercase text-slate-500 mb-0.5">
                            1. Account (ACCT)
                          </label>
                          <SearchableAccountSelect
                            accounts={expenseAccounts}
                            value={item.account_id || departmentAccountId || defaultAccountId}
                            onChange={(acctId) => handleItemChange(idx, 'account_id', acctId)}
                            placeholder="Type account # (e.g. 566)..."
                            compact
                          />
                        </div>
                      )}

                      {/* 2. Vendor / Merchant */}
                      <div className={poType === 'standard' ? 'lg:col-span-3' : 'lg:col-span-2'}>
                        <label className="block lg:hidden text-[10px] font-bold uppercase text-slate-500 mb-0.5">
                          2. Vendor / Merchant
                        </label>
                        <input
                          type="text"
                          placeholder={
                            poType === 'credit_card'
                              ? 'e.g. Amazon, Staples'
                              : vendorName || 'Vendor / Store'
                          }
                          value={item.vendor}
                          onChange={(e) => handleItemChange(idx, 'vendor', e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md focus:ring-1 focus:ring-[#0C2340] outline-none"
                        />
                      </div>

                      {/* 3. Description */}
                      <div className={poType === 'standard' ? 'lg:col-span-4' : 'lg:col-span-3'}>
                        <label className="block lg:hidden text-[10px] font-bold uppercase text-slate-500 mb-0.5">
                          3. Description
                        </label>
                        <input
                          type="text"
                          placeholder="Itemized description / part # / purpose"
                          value={item.description}
                          onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md focus:ring-1 focus:ring-[#0C2340] outline-none"
                        />
                      </div>

                      {/* 4. Amount ($) */}
                      <div className="lg:col-span-1">
                        <label className="block lg:hidden text-[10px] font-bold uppercase text-slate-500 mb-0.5">
                          Amount ($)
                        </label>
                        <div className="relative">
                          <span className="absolute left-2 top-1.5 text-slate-400 text-xs">$</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            value={item.amount}
                            onChange={(e) => handleItemChange(idx, 'amount', e.target.value)}
                            className="w-full pl-5 pr-2 py-1.5 text-xs border border-slate-300 rounded-md text-right font-mono focus:ring-1 focus:ring-[#0C2340] outline-none"
                          />
                        </div>
                      </div>

                      {/* 5. Shipping / Handling (S/H) ($) */}
                      <div className="lg:col-span-1">
                        <label className="block lg:hidden text-[10px] font-bold uppercase text-slate-500 mb-0.5">
                          S/H ($)
                        </label>
                        <div className="relative">
                          <span className="absolute left-2 top-1.5 text-slate-400 text-xs">$</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            value={item.shipping_handling}
                            onChange={(e) => handleItemChange(idx, 'shipping_handling', e.target.value)}
                            className="w-full pl-5 pr-2 py-1.5 text-xs border border-slate-300 rounded-md text-right font-mono focus:ring-1 focus:ring-[#0C2340] outline-none"
                          />
                        </div>
                      </div>

                      {/* 6. Tax ($) */}
                      <div className="lg:col-span-1">
                        <label className="block lg:hidden text-[10px] font-bold uppercase text-slate-500 mb-0.5">
                          Tax ($)
                        </label>
                        <div className="relative">
                          <span className="absolute left-2 top-1.5 text-slate-400 text-xs">$</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            value={item.tax}
                            onChange={(e) => handleItemChange(idx, 'tax', e.target.value)}
                            className="w-full pl-5 pr-2 py-1.5 text-xs border border-slate-300 rounded-md text-right font-mono focus:ring-1 focus:ring-[#0C2340] outline-none"
                          />
                        </div>
                      </div>

                      {/* 7. Line Total + Delete */}
                      <div className="lg:col-span-1 flex items-center justify-between lg:justify-end gap-1 pt-1 lg:pt-0">
                        <span className="lg:hidden text-xs font-semibold text-slate-500">Line Total:</span>
                        <span className="font-mono font-bold text-slate-900 text-xs">
                          ${total.toFixed(2)}
                        </span>
                        <button
                          type="button"
                          disabled={items.length <= 1}
                          onClick={() => handleRemoveItem(idx)}
                          className="p-1 text-slate-400 hover:text-rose-600 disabled:opacity-30 rounded hover:bg-slate-100 transition ml-1"
                          title="Remove entry"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add Item & Totals Footer */}
              <div className="p-3 bg-slate-100/80 border-t border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 rounded-b-xl">
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-800 bg-white hover:bg-slate-50 shadow-sm transition"
                >
                  <Plus className="w-4 h-4 text-amber-600" />
                  <span>Add Itemized Entry</span>
                </button>

                <div className="flex flex-wrap items-center gap-4 sm:gap-6 ml-auto text-xs">
                  <div className="text-slate-600">
                    <span>Amount Subtotal: </span>
                    <strong className="font-mono text-slate-900">
                      ${summaryTotals.subtotalAmount.toFixed(2)}
                    </strong>
                  </div>
                  <div className="text-slate-600">
                    <span>Total S/H: </span>
                    <strong className="font-mono text-slate-900">
                      ${summaryTotals.totalSH.toFixed(2)}
                    </strong>
                  </div>
                  <div className="text-slate-600">
                    <span>Total Tax: </span>
                    <strong className="font-mono text-slate-900">
                      ${summaryTotals.totalTax.toFixed(2)}
                    </strong>
                  </div>
                  <div className="pl-3 border-l border-slate-300">
                    <span className="uppercase tracking-wider font-bold text-slate-700 mr-2">
                      Grand Total:
                    </span>
                    <span className="text-lg font-bold font-mono text-[#0C2340]">
                      ${summaryTotals.grandTotal.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Live Account Allocation Breakdown */}
            {Object.keys(summaryTotals.byAccount).length > 0 && (
              <div className="mt-3 p-3.5 rounded-xl bg-amber-50/60 border border-amber-200/80">
                <div className="text-[11px] font-bold uppercase tracking-wider text-amber-900 mb-2">
                  Account Allocation Summary (Subtotal by ACCT)
                </div>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(summaryTotals.byAccount).map(([acctId, acctSum]) => {
                    const acctObj = expenseAccountsMap[acctId];
                    return (
                      <div
                        key={acctId}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-amber-300/80 text-xs shadow-sm"
                      >
                        <span className="font-mono font-bold text-[#0C2340]">{acctId}</span>
                        {acctObj?.name && (
                          <span className="text-slate-500 text-[11px]">({acctObj.name})</span>
                        )}
                        <span className="font-mono font-bold text-emerald-700">
                          ${acctSum.toFixed(2)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Receipt & Document Uploads */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Receipts, Credit Card Statements, or Itemized Invoices
            </label>
            <p className="text-xs text-slate-500 mb-2">
              Attach vendor order confirmation, formal quote, or itemized credit card receipts (PDF, JPG, PNG up to 10MB)
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

            {(receiptFiles.length > 0 || existingReceipts.length > 0) && (
              <div className="mt-3 space-y-1.5">
                {existingReceipts.map((rec, i) => (
                  <div
                    key={`existing_${i}`}
                    className="flex items-center justify-between p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                      <span className="truncate text-slate-800">{rec.name || 'Uploaded Document'}</span>
                      <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded">
                        Saved
                      </span>
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

                {receiptFiles.map((file, i) => (
                  <div
                    key={`new_${i}`}
                    className="flex items-center justify-between p-2 bg-amber-50/70 border border-amber-200 rounded-lg text-xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FileText className="w-4 h-4 text-amber-600 shrink-0" />
                      <span className="truncate text-slate-800">{file.name}</span>
                      <span className="text-[10px] text-slate-500">
                        ({(file.size / 1024).toFixed(0)} KB)
                      </span>
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
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between">
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
