/**
 * Service to generate CSV exports and print-friendly PO audit documents
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
    'Department Account',
    'Vendor Name',
    'Items Summary',
    'Total Amount ($)',
    'Status',
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

  const rows = purchaseOrders.map(po => {
    const deptInfo = expenseAccountsMap[po.department_account_id]
      ? `${po.department_account_id} - ${expenseAccountsMap[po.department_account_id].name}`
      : po.department_account_id || '';

    const itemsSummary = (po.items || [])
      .map(i => `${i.qty}x ${i.description} ($${Number(i.unit_price).toFixed(2)})`)
      .join('; ');

    return [
      escapeCSV(po.po_number),
      escapeCSV(po.purchase_date),
      escapeCSV(po.employee_name || 'Staff'),
      escapeCSV(po.employee_email),
      escapeCSV(deptInfo),
      escapeCSV(po.vendor_name),
      escapeCSV(itemsSummary),
      escapeCSV(Number(po.total_amount).toFixed(2)),
      escapeCSV(po.status),
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

export function printPurchaseOrder(po, expenseAccountsMap = {}) {
  const deptInfo = expenseAccountsMap[po.department_account_id]
    ? `${po.department_account_id} - ${expenseAccountsMap[po.department_account_id].name}`
    : po.department_account_id || '';

  const printWindow = window.open('', '_blank', 'width=850,height=900');
  if (!printWindow) {
    window.print();
    return;
  }

  const itemsHtml = (po.items || []).map(item => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${item.description}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: center;">${item.qty}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right;">$${Number(item.unit_price).toFixed(2)}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 600;">$${Number(item.total).toFixed(2)}</td>
    </tr>
  `).join('');

  const logsHtml = (po.audit_logs || []).map(log => `
    <div style="font-size: 12px; margin-bottom: 6px; color: #475569;">
      <strong>${new Date(log.timestamp).toLocaleString()}</strong> - 
      <span style="color: #0c2340; font-weight: 600;">[${log.action}]</span> 
      ${log.actor_name || log.actor_email}: ${log.details}
    </div>
  `).join('');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Purchase Order - ${po.po_number}</title>
        <style>
          body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; color: #0f172a; margin: 40px; line-height: 1.5; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #0C2340; padding-bottom: 16px; margin-bottom: 24px; }
          .title { font-size: 24px; font-weight: 700; color: #0C2340; margin: 0; }
          .school { font-size: 14px; color: #64748b; font-weight: 500; }
          .badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 700; text-transform: uppercase; background: #e2e8f0; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; }
          .info-block { background: #f8fafc; padding: 14px; border-radius: 6px; border: 1px solid #e2e8f0; }
          .info-label { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 600; margin-bottom: 4px; }
          .info-value { font-size: 14px; font-weight: 500; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
          th { background: #0C2340; color: white; padding: 10px; font-size: 12px; text-align: left; }
          .total-box { text-align: right; font-size: 18px; font-weight: 700; margin-bottom: 24px; color: #0C2340; }
          .audit-section { margin-top: 30px; padding-top: 20px; border-top: 1px dashed #cbd5e1; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="title">Wesleyan Christian Academy</h1>
            <div class="school">Purchase Order Requisition & Verification Form</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 20px; font-weight: 700; color: #0C2340;">${po.po_number}</div>
            <div class="badge">${po.status.replace('_', ' ')}</div>
          </div>
        </div>

        <div class="info-grid">
          <div class="info-block">
            <div class="info-label">Requisitioner / Employee</div>
            <div class="info-value">${po.employee_name || 'Staff Faculty'} (${po.employee_email})</div>
            <div class="info-label" style="margin-top: 10px;">Department Account</div>
            <div class="info-value">${deptInfo}</div>
          </div>
          <div class="info-block">
            <div class="info-label">Vendor</div>
            <div class="info-value" style="font-size: 16px; font-weight: 600;">${po.vendor_name}</div>
            <div class="info-label" style="margin-top: 10px;">Purchase Date</div>
            <div class="info-value">${po.purchase_date}</div>
          </div>
        </div>

        <div class="info-block" style="margin-bottom: 24px;">
          <div class="info-label">School Purpose / Educational Justification</div>
          <div class="info-value">${po.school_purpose || 'N/A'}</div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Item Description</th>
              <th style="text-align: center; width: 60px;">Qty</th>
              <th style="text-align: right; width: 100px;">Unit Price</th>
              <th style="text-align: right; width: 120px;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div class="total-box">
          Total Requisition Amount: $${Number(po.total_amount).toFixed(2)}
        </div>

        ${po.approval_notes ? `
          <div class="info-block" style="border-left: 4px solid #10b981; margin-bottom: 24px;">
            <div class="info-label" style="color: #047857;">Accountant Approval Verification</div>
            <div class="info-value">${po.approval_notes} (Approved by: ${po.approved_by || 'Business Office'})</div>
          </div>
        ` : ''}

        ${po.payment_reference ? `
          <div class="info-block" style="border-left: 4px solid #3b82f6; margin-bottom: 24px;">
            <div class="info-label" style="color: #1d4ed8;">Disbursement / Payment Reference</div>
            <div class="info-value">${po.payment_reference}</div>
          </div>
        ` : ''}

        <div class="audit-section">
          <h3 style="font-size: 14px; text-transform: uppercase; color: #475569; margin-bottom: 10px;">Audit Trail & System Compliance Log</h3>
          ${logsHtml}
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          }
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}
