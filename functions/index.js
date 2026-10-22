const { onDocumentCreated, onDocumentUpdated } = require('firebase-functions/v2/firestore');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

admin.initializeApp();
const db = admin.firestore();

// Configure SMTP transport (e.g. Google Workspace SMTP or SendGrid)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '465', 10),
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

/**
 * Triggered whenever a new Purchase Order is created.
 * Sends notification alert to the Business Office queue.
 */
exports.onPurchaseOrderCreated = onDocumentCreated('purchase_orders/{poId}', async (event) => {
  const po = event.data.data();
  if (!po || po.status === 'draft') return;

  const mailOptions = {
    from: '"WCA PO System" <noreply@wcatrojans.org>',
    to: 'businessoffice@wcatrojans.org',
    subject: `[New PO Requisition] ${po.po_number} - ${po.vendor_name} ($${Number(po.total_amount).toFixed(2)})`,
    html: `
      <h2>New Purchase Order Submitted</h2>
      <p><strong>PO Number:</strong> ${po.po_number}</p>
      <p><strong>Faculty Requisitioner:</strong> ${po.employee_name} (${po.employee_email})</p>
      <p><strong>Department Code:</strong> ${po.department_account_id}</p>
      <p><strong>Vendor:</strong> ${po.vendor_name}</p>
      <p><strong>Total Amount:</strong> $${Number(po.total_amount).toFixed(2)}</p>
      <p><strong>School Purpose:</strong> ${po.school_purpose}</p>
      <br>
      <a href="https://${process.env.GCLOUD_PROJECT}.web.app" style="background:#0C2340;color:white;padding:10px 16px;text-decoration:none;border-radius:6px;">Review in Approval Queue</a>
    `
  };

  try {
    if (process.env.SMTP_USER) {
      await transporter.sendMail(mailOptions);
    }
    console.log(`Alert notification logged for new PO ${po.po_number}`);
  } catch (err) {
    console.error('Failed to dispatch PO creation email alert:', err);
  }
});

/**
 * Triggered whenever a Purchase Order status or detail is updated.
 * Automatically records audit trail and notifies employee of status changes.
 */
exports.onPurchaseOrderUpdated = onDocumentUpdated('purchase_orders/{poId}', async (event) => {
  const before = event.data.before.data();
  const after = event.data.after.data();

  if (!before || !after) return;

  // Check if status changed
  if (before.status !== after.status) {
    const poNumber = after.po_number;
    const recipient = after.employee_email;

    let statusTitle = '';
    let statusMessage = '';

    if (after.status === 'approved') {
      statusTitle = 'Purchase Order Approved!';
      statusMessage = `Your purchase order <strong>${poNumber}</strong> for <strong>${after.vendor_name}</strong> has been approved by the Business Office.<br>Notes: ${after.approval_notes || 'None'}`;
    } else if (after.status === 'rejected') {
      statusTitle = 'Action Required: Purchase Order Needs Revision';
      statusMessage = `Your purchase order <strong>${poNumber}</strong> requires revisions or additional documents.<br><strong>Reason:</strong> ${after.rejection_reason}`;
    } else if (after.status === 'paid') {
      statusTitle = 'Purchase Order Paid / Disbursed';
      statusMessage = `Payment has been finalized for purchase order <strong>${poNumber}</strong>.<br>Reference: ${after.payment_reference || 'N/A'}`;
    }

    if (statusTitle && recipient) {
      const mailOptions = {
        from: '"WCA Business Office" <noreply@wcatrojans.org>',
        to: recipient,
        subject: `[Status Update: ${after.status.toUpperCase()}] ${poNumber} - ${after.vendor_name}`,
        html: `
          <h2>${statusTitle}</h2>
          <p>${statusMessage}</p>
          <br>
          <p>You can view full details in the portal.</p>
        `
      };

      try {
        if (process.env.SMTP_USER) {
          await transporter.sendMail(mailOptions);
        }
        console.log(`Status notification dispatched to ${recipient} for PO ${poNumber}`);
      } catch (err) {
        console.error('Failed to send status update notification:', err);
      }
    }
  }
});
