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
