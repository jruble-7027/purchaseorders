/**
 * Service to generate CSV exports and print-friendly / PDF-ready PO audit documents
 * for Wesleyan Christian Academy
 */

export function exportPOsToCSV(purchaseOrders, expenseAccountsMap = {}) {
  if (!purchaseOrders || purchaseOrders.length === 0) {
    alert('No purchase orders to export.');
    return;
  }

  const headers = [
    'PO Number',
    'Date',
    'Employee Name',
    'Employee Email',
    'Primary / Split Accounts',
    'Vendor / Credit Card',
    'Itemized Entries (ACCT + Vendor + Description : Amount + S/H + Tax = Total)',
    'Account Subtotals Breakdown',
    'Subtotal Amount ($)',
    'Shipping & Handling ($)',
    'Tax ($)',
    'Total Amount ($)',
    'Status',
    'Received Status',
    'Received By',
    'Received At',
    'Receiving Notes',
    'School Purpose / Justification',
    'Approval Notes',
    'Payment Reference',
    'Created At',
    'Approved At'
  ];

  const escapeCSV = (value) => {
    if (value === null || value === undefined) return '""';
    const stringVal = String(value).replace(/"/g, '""');
    return `"${stringVal}"`;
  };

  const rows = purchaseOrders.map((po) => {
    const accountTotals = {};
    let sumAmt = 0;
    let sumSH = 0;
    let sumTax = 0;

    const itemsSummary = (po.items || [])
      .map((i) => {
        const acctId = i.account_id || po.department_account_id || '';
        const vdr = i.vendor || po.vendor_name || '';
        const baseAmt =
          i.amount !== undefined
            ? Number(i.amount) || 0
            : (Number(i.qty) || 1) * (Number(i.unit_price) || 0);
        const sh = Number(i.shipping_handling) || 0;
        const tax = Number(i.tax) || 0;
        const rowTotal = i.total !== undefined ? Number(i.total) || 0 : baseAmt + sh + tax;

        sumAmt += baseAmt;
        sumSH += sh;
        sumTax += tax;
        if (acctId) {
          accountTotals[acctId] = (accountTotals[acctId] || 0) + rowTotal;
        }

        return `[${acctId}] ${vdr} - ${i.description}: Amt $${baseAmt.toFixed(2)} + S/H $${sh.toFixed(2)} + Tax $${tax.toFixed(2)} = $${rowTotal.toFixed(2)}`;
      })
      .join(' | ');

    const distinctAccts = Object.keys(accountTotals);
    const deptInfo =
      distinctAccts.length > 1
        ? distinctAccts.join(', ')
        : expenseAccountsMap[po.department_account_id]
        ? `${po.department_account_id} - ${expenseAccountsMap[po.department_account_id].name}`
        : po.department_account_id || '';

    const accountBreakdownStr = Object.entries(accountTotals)
      .map(([acctId, val]) => `${acctId}: $${val.toFixed(2)}`)
      .join('; ');

    return [
      escapeCSV(po.po_number),
      escapeCSV(po.purchase_date),
      escapeCSV(po.employee_name || 'Staff'),
      escapeCSV(po.employee_email),
      escapeCSV(deptInfo),
      escapeCSV(po.vendor_name),
      escapeCSV(itemsSummary),
      escapeCSV(accountBreakdownStr),
      escapeCSV(sumAmt.toFixed(2)),
      escapeCSV(sumSH.toFixed(2)),
      escapeCSV(sumTax.toFixed(2)),
      escapeCSV(Number(po.total_amount).toFixed(2)),
      escapeCSV(po.status),
      escapeCSV(po.is_received || po.status === 'received' ? 'YES' : 'NO'),
      escapeCSV(po.received_by || ''),
      escapeCSV(po.received_at ? new Date(po.received_at).toLocaleString() : ''),
      escapeCSV(po.receiving_notes || ''),
      escapeCSV(po.school_purpose),
      escapeCSV(po.approval_notes || po.rejection_reason || ''),
      escapeCSV(po.payment_reference || ''),
      escapeCSV(po.created_at ? new Date(po.created_at).toLocaleString() : ''),
      escapeCSV(po.approved_at ? new Date(po.approved_at).toLocaleString() : '')
    ].join(',');
  });

  const csvContent = [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  const timestamp = new Date().toISOString().slice(0, 10);
  link.setAttribute('href', url);
  link.setAttribute('download', `WCA_Purchase_Orders_Export_${timestamp}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generates an official, high-resolution Wesleyan Christian Academy
 * Purchase Order voucher formatted for Letter print and PDF download.
 *
 * Uses direct in-window printing with @page margin suppression to eliminate
 * browser default headers/footers (such as "about:blank") and replaces it with
 * the required WCA AP notice: "Send all invoices referencing PO# ... to acctspay@wcatrojans.org"
 */
export function printPurchaseOrder(po, expenseAccountsMap = {}) {
  const deptInfo = expenseAccountsMap[po.department_account_id]
    ? `${po.department_account_id} - ${expenseAccountsMap[po.department_account_id].name}`
    : po.department_account_id || 'N/A';

  const accountSubtotals = {};
  let sumAmt = 0;
  let sumSH = 0;
  let sumTax = 0;

  const itemsHtml = (po.items || [])
    .map((item, idx) => {
      const acctId = item.account_id || po.department_account_id || '';
      const vdr = item.vendor || po.vendor_name || '';
      const qty = item.qty !== undefined && item.qty !== '' ? Number(item.qty) || 1 : 1;
      const baseAmt =
        item.amount !== undefined
          ? Number(item.amount) || 0
          : qty * (Number(item.unit_price) || 0);
      const sh = Number(item.shipping_handling) || 0;
      const tax = Number(item.tax) || 0;
      const rowTotal = item.total !== undefined ? Number(item.total) || 0 : baseAmt + sh + tax;

      sumAmt += baseAmt;
      sumSH += sh;
      sumTax += tax;
      if (acctId) {
        accountSubtotals[acctId] = (accountSubtotals[acctId] || 0) + rowTotal;
      }

      return `
        <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
          <td style="padding: 6px 8px; border: 1px solid #cbd5e1; font-family: monospace; font-weight: 700; color: #ce1226; font-size: 10.5px;">${acctId}</td>
          <td style="padding: 6px 8px; border: 1px solid #cbd5e1; font-size: 10.5px;">${vdr}</td>
          <td style="padding: 6px 8px; border: 1px solid #cbd5e1; font-size: 10.5px; font-weight: 500;">${item.description || 'N/A'}</td>
          <td style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: center; font-size: 10.5px;">${qty}</td>
          <td style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: right; font-size: 10.5px;">$${baseAmt.toFixed(2)}</td>
          <td style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: right; font-size: 10.5px;">$${sh.toFixed(2)}</td>
          <td style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: right; font-size: 10.5px;">$${tax.toFixed(2)}</td>
          <td style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: right; font-weight: 700; color: #0f172a; font-size: 10.5px;">$${rowTotal.toFixed(2)}</td>
        </tr>
      `;
    })
    .join('');

  const accountSummaryHtml = Object.entries(accountSubtotals)
    .map(([acctId, sumVal]) => {
      const acctName = expenseAccountsMap[acctId]?.name ? ` (${expenseAccountsMap[acctId].name})` : '';
      return `<div style="display:inline-block; margin-right: 10px; margin-bottom: 4px; padding: 3px 8px; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 10.5px;">
        <span style="font-family:monospace; font-weight:700; color:#ce1226;">${acctId}</span>${acctName}: <strong>$${sumVal.toFixed(2)}</strong>
      </div>`;
    })
    .join('');

  const statusLabel = (po.status || 'pending_approval').replace(/_/g, ' ').toUpperCase();
  const statusColor =
    po.status === 'approved'
      ? '#059669'
      : po.status === 'paid'
      ? '#2563eb'
      : po.status === 'received'
      ? '#7c3aed'
      : po.status === 'rejected'
      ? '#dc2626'
      : '#d97706';

  const logsHtml = (po.audit_logs || [])
    .map(
      (log) => `
    <div style="font-size: 9.5px; margin-bottom: 2px; color: #475569; border-bottom: 1px dotted #e2e8f0; padding-bottom: 2px;">
      <span style="font-family:monospace; color:#64748b;">${new Date(log.timestamp).toLocaleString()}</span> — 
      <strong style="color: #ce1226;">[${log.action}]</strong> 
      <strong>${log.actor_name || log.actor_email}</strong> (${log.actor_role}): ${log.details}
    </div>
  `
    )
    .join('');

  // Clean up any previously injected print containers
  const existingArea = document.getElementById('wca-po-print-area');
  if (existingArea) existingArea.remove();
  const existingStyles = document.getElementById('wca-po-print-styles');
  if (existingStyles) existingStyles.remove();

  // Inject Print Styles
  const styleEl = document.createElement('style');
  styleEl.id = 'wca-po-print-styles';
  styleEl.innerHTML = `
    @media screen {
      #wca-po-print-area {
        display: none !important;
      }
    }
    @media print {
      @page {
        size: letter portrait;
        margin: 0mm !important;
      }
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        background: #ffffff !important;
        color: #0f172a !important;
        width: 100% !important;
        height: auto !important;
      }
      #root {
        display: none !important;
      }
      #wca-po-print-area {
        display: flex !important;
        flex-direction: column !important;
        justify-content: space-between !important;
        min-height: 100vh !important;
        box-sizing: border-box !important;
        padding: 12mm 14mm 12mm 14mm !important;
        font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif !important;
        font-size: 11px !important;
        line-height: 1.35 !important;
        background: #ffffff !important;
        color: #0f172a !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      #wca-po-print-area * {
        box-sizing: border-box !important;
      }
      .po-print-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        border-bottom: 3px solid #ce1226;
        padding-bottom: 10px;
        margin-bottom: 12px;
      }
      .po-print-brand {
        font-size: 18px;
        font-weight: 800;
        color: #0f172a;
        letter-spacing: -0.02em;
        text-transform: uppercase;
      }
      .po-print-sub {
        font-size: 10px;
        color: #475569;
        margin-top: 2px;
      }
      .po-print-docname {
        margin-top: 4px;
        font-size: 10px;
        font-weight: 700;
        color: #ce1226;
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }
      .po-print-badge-wrap {
        text-align: right;
      }
      .po-print-num {
        font-size: 22px;
        font-weight: 900;
        color: #ce1226;
        font-family: monospace;
        letter-spacing: 0.05em;
      }
      .po-print-status {
        display: inline-block;
        margin-top: 3px;
        padding: 3px 10px;
        border-radius: 9999px;
        font-size: 9px;
        font-weight: 800;
        text-transform: uppercase;
        color: white;
        background: ${statusColor};
      }
      .po-info-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
        margin-bottom: 10px;
      }
      .po-card {
        background: #f8fafc;
        border: 1px solid #cbd5e1;
        border-radius: 6px;
        padding: 8px 10px;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .po-card-label {
        font-size: 8.5px;
        text-transform: uppercase;
        font-weight: 800;
        color: #64748b;
        letter-spacing: 0.04em;
        margin-bottom: 2px;
      }
      .po-card-value {
        font-size: 11px;
        font-weight: 600;
        color: #0f172a;
      }
      .po-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 10px;
      }
      .po-table th {
        background: #0f172a !important;
        color: #ffffff !important;
        font-size: 9px;
        text-transform: uppercase;
        font-weight: 700;
        padding: 6px 8px;
        border: 1px solid #0f172a;
        text-align: left;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .po-totals-wrap {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 10px;
      }
      .po-grand-total {
        text-align: right;
        background: #f8fafc;
        border: 2px solid #ce1226;
        border-radius: 6px;
        padding: 8px 12px;
        min-width: 220px;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .po-sig-section {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        gap: 10px;
        margin-top: 10px;
        padding-top: 10px;
        border-top: 1px solid #cbd5e1;
        page-break-inside: avoid;
        break-inside: avoid;
      }
      .po-sig-box {
        background: #ffffff;
        border: 1px solid #cbd5e1;
        border-radius: 6px;
        padding: 8px;
        font-size: 9.5px;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .po-sig-line {
        margin-top: 24px;
        border-top: 1px solid #0f172a;
        padding-top: 3px;
        font-weight: 600;
      }
      .po-audit-box {
        margin-top: 8px;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        padding: 6px 8px;
        page-break-inside: avoid;
        break-inside: avoid;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .po-bottom-footer {
        margin-top: 12px;
        padding-top: 8px;
        border-top: 1.5px solid #0f172a;
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 10px;
        page-break-inside: avoid;
        break-inside: avoid;
      }
      .po-bottom-footer .invoice-notice {
        font-weight: 800;
        color: #ce1226;
        letter-spacing: 0.02em;
      }
    }
  `;
  document.head.appendChild(styleEl);

  // Build the print element
  const printContainer = document.createElement('div');
  printContainer.id = 'wca-po-print-area';
  printContainer.innerHTML = `
    <div>
      <!-- Header -->
      <div class="po-print-header">
        <div>
          <div class="po-print-brand">Wesleyan Christian Academy</div>
          <div class="po-print-sub">
            1917 N. Centennial St. • High Point, NC 27262 • (336) 884-3333 • Business & Procurement
          </div>
          <div class="po-print-docname">
            Official Purchase Order & Disbursement Requisition
          </div>
        </div>
        <div class="po-print-badge-wrap">
          <div class="po-print-num">${po.po_number || 'PO-DRAFT'}</div>
          <div><span class="po-print-status">${statusLabel}</span></div>
        </div>
      </div>

      <!-- Metadata Cards -->
      <div class="po-info-grid">
        <div class="po-card">
          <div class="po-card-label">Requisitioner / Faculty Staff</div>
          <div class="po-card-value">${po.employee_name || 'Staff Faculty'}</div>
          <div style="font-size: 10px; color: #64748b;">${po.employee_email || ''}</div>
          
          <div class="po-card-label" style="margin-top: 6px;">Primary Department / Account</div>
          <div class="po-card-value" style="font-size: 10px;">${deptInfo}</div>
        </div>

        <div class="po-card">
          <div class="po-card-label">Vendor / Merchant / Supplier</div>
          <div class="po-card-value" style="font-size: 12.5px; font-weight: 700; color: #ce1226;">${po.vendor_name || 'Vendor'}</div>
          
          <div style="display: flex; justify-content: space-between; margin-top: 6px;">
            <div>
              <div class="po-card-label">Purchase Date</div>
              <div class="po-card-value">${po.purchase_date || 'N/A'}</div>
            </div>
            <div>
              <div class="po-card-label">PO Type</div>
              <div class="po-card-value">${po.po_type === 'credit_card' ? 'Split Acct. / Card' : 'Standard PO'}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Educational Justification -->
      <div class="po-card" style="margin-bottom: 10px;">
        <div class="po-card-label">School Purpose / Educational Justification</div>
        <div style="font-size: 10.5px; color: #1e293b; font-weight: 500;">${po.school_purpose || 'Standard classroom / departmental supplies and educational operations.'}</div>
      </div>

      <!-- Itemized Table -->
      <table class="po-table">
        <thead>
          <tr>
            <th style="width: 95px;">ACCT #</th>
            <th style="width: 120px;">Vendor</th>
            <th>Description / Item Details</th>
            <th style="width: 35px; text-align: center;">QTY</th>
            <th style="width: 70px; text-align: right;">Amount</th>
            <th style="width: 60px; text-align: right;">S/H</th>
            <th style="width: 60px; text-align: right;">Tax</th>
            <th style="width: 75px; text-align: right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>

      <!-- Totals & Subtotals Breakdown -->
      <div class="po-totals-wrap">
        <div style="flex: 1; margin-right: 12px;">
          <div class="po-card-label" style="margin-bottom: 3px;">GL Account Distribution Breakdown</div>
          <div>${accountSummaryHtml}</div>
        </div>

        <div class="po-grand-total">
          <div style="font-size: 10px; color: #64748b; margin-bottom: 2px;">
            Subtotal: <strong>$${sumAmt.toFixed(2)}</strong> | S/H: <strong>$${sumSH.toFixed(2)}</strong> | Tax: <strong>$${sumTax.toFixed(2)}</strong>
          </div>
          <div style="font-size: 16px; font-weight: 900; color: #ce1226;">
            Grand Total: $${Number(po.total_amount || (sumAmt + sumSH + sumTax)).toFixed(2)}
          </div>
        </div>
      </div>

      <!-- Receiving Details if received -->
      ${(po.is_received || po.status === 'received') ? `
        <div class="po-card" style="border-left: 4px solid #7c3aed; margin-bottom: 8px; background: #faf5ff;">
          <div class="po-card-label" style="color: #6b21a8;">Receiving & Physical Delivery Verification</div>
          <div style="font-size: 10.5px; color: #581c87;">
            <strong>Received By:</strong> ${po.received_by || 'Staff'} on ${po.received_at ? new Date(po.received_at).toLocaleDateString() : 'N/A'}<br/>
            <strong>Verification Notes:</strong> ${po.receiving_notes || 'All items delivered and verified in good condition.'}
            ${(po.packing_slip_receipts && po.packing_slip_receipts.length > 0) ? `<br/><strong>Packing Slips:</strong> ${po.packing_slip_receipts.length} attachment(s) verified on file.` : ''}
          </div>
        </div>
      ` : ''}

      <!-- Approval / Payment Notes -->
      ${po.approval_notes ? `
        <div class="po-card" style="border-left: 4px solid #059669; margin-bottom: 8px; background: #f0fdf4;">
          <div class="po-card-label" style="color: #047857;">Business Office Approval Verification</div>
          <div style="font-size: 10.5px; color: #065f46;">
            ${po.approval_notes} (Approved by: ${po.approved_by || 'Business Office'})
          </div>
        </div>
      ` : ''}

      ${po.payment_reference ? `
        <div class="po-card" style="border-left: 4px solid #2563eb; margin-bottom: 8px; background: #eff6ff;">
          <div class="po-card-label" style="color: #1d4ed8;">Disbursement & Check / ACH Reference</div>
          <div style="font-size: 10.5px; color: #1e40af;">
            ${po.payment_reference}
          </div>
        </div>
      ` : ''}

      <!-- Formal 3-Part Signature Blocks -->
      <div class="po-sig-section">
        <div class="po-sig-box">
          <div class="po-card-label">1. Faculty Requisitioner</div>
          <div style="color:#64748b;">${po.employee_name || 'Staff Faculty'}</div>
          <div class="po-sig-line">Signature & Date</div>
        </div>
        <div class="po-sig-box">
          <div class="po-card-label">2. Department / Admin Approver</div>
          <div style="color:#64748b;">${po.approved_by || 'Supervisor / Principal'}</div>
          <div class="po-sig-line">Signature & Date</div>
        </div>
        <div class="po-sig-box">
          <div class="po-card-label">3. Business Office / AP</div>
          <div style="color:#64748b;">Wesleyan Business Office</div>
          <div class="po-sig-line">Signature & Date</div>
        </div>
      </div>

      <!-- Compliance & Audit Log -->
      <div class="po-audit-box">
        <div class="po-card-label" style="margin-bottom: 2px;">System Compliance Audit Trail (PO ID: ${po.id || 'N/A'})</div>
        ${logsHtml}
      </div>
    </div>

    <!-- Bottom Left/Right Formal Footer Notice -->
    <div class="po-bottom-footer">
      <div class="invoice-notice">
        Send all invoices referencing PO# ${po.po_number || ''} to acctspay@wcatrojans.org
      </div>
      <div style="font-size: 9.5px; color: #64748b; font-family: monospace;">
        PO #: ${po.po_number || ''} • WCA Business Office
      </div>
    </div>
  `;

  document.body.appendChild(printContainer);

  const cleanup = () => {
    if (printContainer && printContainer.parentNode) {
      printContainer.remove();
    }
    if (styleEl && styleEl.parentNode) {
      styleEl.remove();
    }
    window.removeEventListener('afterprint', cleanup);
  };

  window.addEventListener('afterprint', cleanup);

  // Trigger print
  setTimeout(() => {
    window.print();
    // Safety fallback cleanup in case afterprint doesn't fire
    setTimeout(cleanup, 2000);
  }, 100);
}

/**
 * Exports a filtered list of GL Expense Accounts with live Fiscal Year budget,
 * YTD spent (since June 1), Pending, and Available ($ & %) to CSV, including a Totals row.
 */
export function exportAccountBalancesToCSV(
  accounts = [],
  getAccountBudgetStats,
  fiscalYearInfo,
  currentUser = null,
  filterSummary = ''
) {
  if (!accounts || accounts.length === 0) {
    alert('No expense accounts match the current filter to export.');
    return;
  }

  const fyLabel = fiscalYearInfo?.label || 'Current FY';
  const headers = [
    'Account #',
    'Description / Account Name',
    'Department',
    'Fiscal Year',
    'FY Budget ($)',
    'YTD Spent Since Jun 1 ($)',
    'Pending Approval ($)',
    'Available Balance ($)',
    'Available (%)'
  ];

  const escapeCSV = (value) => {
    if (value === null || value === undefined) return '""';
    const stringVal = String(value).replace(/"/g, '""');
    return `"${stringVal}"`;
  };

  let totalBudget = 0;
  let totalSpent = 0;
  let totalPending = 0;
  let totalAvailable = 0;

  const rows = accounts.map((acct) => {
    const shortCode = (acct.id || '').replace(/^ACCT-/i, '');
    const bStats = getAccountBudgetStats ? getAccountBudgetStats(acct.id) : null;
    const budget = bStats ? bStats.budget : Number(acct.budget) || 0;
    const ytdSpent = bStats ? bStats.ytdSpent : 0;
    const pendingAmt = bStats ? bStats.pendingAmount : 0;
    const available = budget - ytdSpent;
    const pctAvail = budget > 0 ? ((budget - ytdSpent) / budget) * 100 : null;

    totalBudget += budget;
    totalSpent += ytdSpent;
    totalPending += pendingAmt;
    totalAvailable += available;

    return [
      escapeCSV(shortCode),
      escapeCSV(acct.name || ''),
      escapeCSV(acct.dept || 'General'),
      escapeCSV(fyLabel),
      escapeCSV(budget.toFixed(2)),
      escapeCSV(ytdSpent.toFixed(2)),
      escapeCSV(pendingAmt.toFixed(2)),
      escapeCSV(available.toFixed(2)),
      escapeCSV(pctAvail !== null ? `${pctAvail.toFixed(1)}%` : 'N/A')
    ].join(',');
  });

  const totalPctAvail =
    totalBudget > 0 ? `${(((totalBudget - totalSpent) / totalBudget) * 100).toFixed(1)}%` : 'N/A';

  const totalsRow = [
    escapeCSV('TOTALS'),
    escapeCSV(
      `${accounts.length} Account(s)${filterSummary ? ` (${filterSummary})` : ''}`
    ),
    escapeCSV(currentUser?.email || ''),
    escapeCSV(fyLabel),
    escapeCSV(totalBudget.toFixed(2)),
    escapeCSV(totalSpent.toFixed(2)),
    escapeCSV(totalPending.toFixed(2)),
    escapeCSV(totalAvailable.toFixed(2)),
    escapeCSV(totalPctAvail)
  ].join(',');

  const csvContent = [headers.join(','), ...rows, totalsRow].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  const timestamp = new Date().toISOString().slice(0, 10);
  link.setAttribute('href', url);
  link.setAttribute('download', `WCA_Account_Balances_${timestamp}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generates an official, print-ready / Save-as-PDF Wesleyan Christian Academy
 * Expense Account Budget & Balance Report for the currently filtered account list.
 */
export function printAccountBalancesReport(
  accounts = [],
  getAccountBudgetStats,
  fiscalYearInfo,
  currentUser = null,
  filterSummary = ''
) {
  if (!accounts || accounts.length === 0) {
    alert('No expense accounts match the current filter to print.');
    return;
  }

  const fyLabel = fiscalYearInfo?.label || 'Current Fiscal Year';
  const fyPeriod = fiscalYearInfo?.periodLabel || 'June 1 – May 31';

  let totalBudget = 0;
  let totalSpent = 0;
  let totalPending = 0;
  let totalAvailable = 0;

  const rowsHtml = accounts
    .map((acct, idx) => {
      const shortCode = (acct.id || '').replace(/^ACCT-/i, '');
      const bStats = getAccountBudgetStats ? getAccountBudgetStats(acct.id) : null;
      const budget = bStats ? bStats.budget : Number(acct.budget) || 0;
      const ytdSpent = bStats ? bStats.ytdSpent : 0;
      const pendingAmt = bStats ? bStats.pendingAmount : 0;
      const available = budget - ytdSpent;
      const pctAvail = budget > 0 ? ((budget - ytdSpent) / budget) * 100 : null;

      totalBudget += budget;
      totalSpent += ytdSpent;
      totalPending += pendingAmt;
      totalAvailable += available;

      const statusColor =
        pctAvail === null
          ? '#64748b'
          : pctAvail < 0
          ? '#dc2626'
          : pctAvail <= 20
          ? '#d97706'
          : '#059669';

      const statusBg =
        pctAvail === null
          ? '#f1f5f9'
          : pctAvail < 0
          ? '#fef2f2'
          : pctAvail <= 20
          ? '#fffbeb'
          : '#ecfdf5';

      return `
        <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
          <td style="padding: 7px 8px; border: 1px solid #cbd5e1; font-family: monospace; font-weight: 800; color: #0C2340; font-size: 11px;">
            ${shortCode}
          </td>
          <td style="padding: 7px 8px; border: 1px solid #cbd5e1; font-size: 10.5px;">
            <div style="font-weight: 700; color: #0f172a;">${acct.name || ''}</div>
            <div style="font-size: 9.5px; color: #64748b;">${acct.dept || 'General'}</div>
          </td>
          <td style="padding: 7px 8px; border: 1px solid #cbd5e1; text-align: right; font-family: monospace; font-weight: 600; font-size: 10.5px;">
            ${budget > 0 ? `$${budget.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
          </td>
          <td style="padding: 7px 8px; border: 1px solid #cbd5e1; text-align: right; font-family: monospace; font-size: 10.5px;">
            <div style="font-weight: 700; color: #0f172a;">
              $${ytdSpent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            ${
              pendingAmt > 0
                ? `<div style="font-size: 9px; color: #b45309; font-weight: 600;">+$${pendingAmt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Pending</div>`
                : ''
            }
          </td>
          <td style="padding: 7px 8px; border: 1px solid #cbd5e1; text-align: right; font-family: monospace; font-size: 10.5px;">
            ${
              budget > 0
                ? `<span style="font-weight: 800; color: ${available < 0 ? '#dc2626' : '#0f172a'};">
                    $${available.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span style="display: inline-block; margin-left: 6px; padding: 2px 6px; border-radius: 9999px; font-size: 9px; font-weight: 800; color: ${statusColor}; background: ${statusBg}; border: 1px solid ${statusColor}40;">
                    ${pctAvail.toFixed(1)}% Avail
                  </span>`
                : `<span style="color: #94a3b8; font-style: italic; font-size: 9.5px;">No budget set</span>`
            }
          </td>
        </tr>
      `;
    })
    .join('');

  const totalPctAvail =
    totalBudget > 0 ? (((totalBudget - totalSpent) / totalBudget) * 100).toFixed(1) : null;

  // Clean up any previously injected print containers
  const existingArea = document.getElementById('wca-po-print-area');
  if (existingArea) existingArea.remove();
  const existingStyles = document.getElementById('wca-po-print-styles');
  if (existingStyles) existingStyles.remove();

  const styleEl = document.createElement('style');
  styleEl.id = 'wca-po-print-styles';
  styleEl.innerHTML = `
    @media screen {
      #wca-po-print-area {
        display: none !important;
      }
    }
    @media print {
      @page {
        size: letter portrait;
        margin: 0mm !important;
      }
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        background: #ffffff !important;
        color: #0f172a !important;
        width: 100% !important;
        height: auto !important;
      }
      #root {
        display: none !important;
      }
      #wca-po-print-area {
        display: flex !important;
        flex-direction: column !important;
        justify-content: space-between !important;
        min-height: 100vh !important;
        box-sizing: border-box !important;
        padding: 12mm 14mm 12mm 14mm !important;
        font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif !important;
        font-size: 11px !important;
        line-height: 1.35 !important;
        background: #ffffff !important;
        color: #0f172a !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      #wca-po-print-area * {
        box-sizing: border-box !important;
      }
      .acct-print-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        border-bottom: 3px solid #ce1226;
        padding-bottom: 10px;
        margin-bottom: 12px;
      }
      .acct-kpi-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 8px;
        margin-bottom: 12px;
      }
      .acct-kpi-card {
        background: #f8fafc;
        border: 1px solid #cbd5e1;
        border-radius: 6px;
        padding: 8px 10px;
      }
      .acct-kpi-label {
        font-size: 8.5px;
        text-transform: uppercase;
        font-weight: 800;
        color: #64748b;
        letter-spacing: 0.04em;
      }
      .acct-kpi-val {
        font-size: 14px;
        font-weight: 800;
        font-family: monospace;
        color: #0f172a;
        margin-top: 2px;
      }
      .acct-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 12px;
      }
      .acct-table th {
        background: #0f172a !important;
        color: #ffffff !important;
        font-size: 9px;
        text-transform: uppercase;
        font-weight: 700;
        padding: 6px 8px;
        border: 1px solid #0f172a;
        text-align: left;
      }
      .acct-bottom-footer {
        margin-top: 14px;
        padding-top: 8px;
        border-top: 1.5px solid #0f172a;
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 9.5px;
        color: #475569;
      }
    }
  `;
  document.head.appendChild(styleEl);

  const printContainer = document.createElement('div');
  printContainer.id = 'wca-po-print-area';
  printContainer.innerHTML = `
    <div>
      <div class="acct-print-header">
        <div>
          <div style="font-size: 18px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: -0.02em;">
            Wesleyan Christian Academy
          </div>
          <div style="font-size: 10px; color: #475569; margin-top: 2px;">
            1917 N. Centennial St. • High Point, NC 27262 • Business & Procurement Department
          </div>
          <div style="margin-top: 4px; font-size: 10.5px; font-weight: 700; color: #ce1226; text-transform: uppercase; letter-spacing: 0.04em;">
            Department Expense Account Budget & Balance Report
          </div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 13px; font-weight: 800; color: #0C2340; font-family: monospace;">
            ${fyLabel}
          </div>
          <div style="font-size: 9.5px; color: #475569; margin-top: 1px;">
            ${fyPeriod} (Resets June 1)
          </div>
          <div style="font-size: 9px; color: #64748b; margin-top: 3px;">
            Generated: ${new Date().toLocaleString()}
          </div>
        </div>
      </div>

      <div style="display: flex; justify-content: space-between; align-items: center; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 7px 10px; margin-bottom: 10px; font-size: 10px;">
        <div>
          <strong>Prepared For:</strong> ${currentUser?.displayName || 'Faculty / Staff'} ${currentUser?.email ? `(${currentUser.email})` : ''}
        </div>
        <div>
          <strong>Filter View:</strong> ${filterSummary || `All Assigned Accounts (${accounts.length})`}
        </div>
      </div>

      <div class="acct-kpi-grid">
        <div class="acct-kpi-card">
          <div class="acct-kpi-label">Total FY Budget (${accounts.length} Accts)</div>
          <div class="acct-kpi-val">$${totalBudget.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        </div>
        <div class="acct-kpi-card">
          <div class="acct-kpi-label">YTD Spent (Since Jun 1)</div>
          <div class="acct-kpi-val">$${totalSpent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        </div>
        <div class="acct-kpi-card">
          <div class="acct-kpi-label">Pending Approval</div>
          <div class="acct-kpi-val" style="color: #b45309;">$${totalPending.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        </div>
        <div class="acct-kpi-card" style="border-color: #ce1226;">
          <div class="acct-kpi-label">Remaining Available</div>
          <div class="acct-kpi-val" style="color: ${totalAvailable < 0 ? '#dc2626' : '#059669'};">
            $${totalAvailable.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            ${totalPctAvail !== null ? `<span style="font-size: 10px;">(${totalPctAvail}%)</span>` : ''}
          </div>
        </div>
      </div>

      <table class="acct-table">
        <thead>
          <tr>
            <th style="width: 90px;">Account #</th>
            <th>Description / Department</th>
            <th style="width: 115px; text-align: right;">FY Budget</th>
            <th style="width: 135px; text-align: right;">YTD Spent (Since Jun 1)</th>
            <th style="width: 165px; text-align: right;">Available ($ & %)</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
          <tr style="background-color: #f1f5f9; font-weight: 800;">
            <td style="padding: 8px; border: 1px solid #cbd5e1; font-family: monospace; color: #0C2340;">TOTALS</td>
            <td style="padding: 8px; border: 1px solid #cbd5e1;">Combined Total (${accounts.length} Account${accounts.length === 1 ? '' : 's'})</td>
            <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: right; font-family: monospace;">
              $${totalBudget.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </td>
            <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: right; font-family: monospace;">
              $${totalSpent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </td>
            <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: right; font-family: monospace; color: ${totalAvailable < 0 ? '#dc2626' : '#059669'};">
              $${totalAvailable.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              ${totalPctAvail !== null ? ` (${totalPctAvail}%)` : ''}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="acct-bottom-footer">
      <div style="font-weight: 700; color: #ce1226;">
        Wesleyan Christian Academy • Official General Ledger Account Balance Summary
      </div>
      <div style="font-family: monospace;">
        ${fyLabel} • Printed ${new Date().toLocaleDateString()}
      </div>
    </div>
  `;

  document.body.appendChild(printContainer);

  const cleanup = () => {
    if (printContainer && printContainer.parentNode) {
      printContainer.remove();
    }
    if (styleEl && styleEl.parentNode) {
      styleEl.remove();
    }
    window.removeEventListener('afterprint', cleanup);
  };

  window.addEventListener('afterprint', cleanup);

  setTimeout(() => {
    window.print();
    setTimeout(cleanup, 2000);
  }, 100);
}
