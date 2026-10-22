export const DEFAULT_EXPENSE_ACCOUNTS = [
  { id: 'ACCT-4001', name: 'High School Science & STEM', budget: 15000, dept: 'Science' },
  { id: 'ACCT-4002', name: 'Athletics & Physical Education', budget: 35000, dept: 'Athletics' },
  { id: 'ACCT-4003', name: 'Fine Arts & Music Department', budget: 18000, dept: 'Fine Arts' },
  { id: 'ACCT-4004', name: 'Information Technology & Software', budget: 45000, dept: 'IT' },
  { id: 'ACCT-4005', name: 'Facilities & Campus Maintenance', budget: 60000, dept: 'Facilities' },
  { id: 'ACCT-4006', name: 'Middle School Humanities & Library', budget: 12000, dept: 'Humanities' },
  { id: 'ACCT-4007', name: 'Elementary Academic Supplies', budget: 20000, dept: 'Elementary' },
  { id: 'ACCT-4008', name: 'Administrative & General Operations', budget: 25000, dept: 'Administration' },
];

export const INITIAL_PURCHASE_ORDERS = [
  {
    id: 'po_001',
    po_number: 'PO-2026-0042',
    created_by: 'usr_staff_01',
    employee_name: 'Sarah Miller',
    employee_email: 'sarah.miller@wcatrojans.org',
    vendor_name: 'Lab Tech Supply Co.',
    purchase_date: '2026-10-20',
    department_account_id: 'ACCT-4001',
    school_purpose: 'Replacement optics and slide kits for AP Chemistry and Biology Lab B',
    items: [
      { id: 'item_1', description: 'Compound Microscope Objective Lenses (40x)', qty: 2, unit_price: 250.00, total: 500.00 },
      { id: 'item_2', description: 'Prepared Cell Specimen Slides (Pack of 50)', qty: 3, unit_price: 45.00, total: 135.00 }
    ],
    total_amount: 635.00,
    receipt_urls: [
      {
        name: 'lab_tech_quote_oct2026.pdf',
        url: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&q=80&w=800',
        type: 'application/pdf',
        uploaded_at: '2026-10-20T14:32:00Z'
      }
    ],
    status: 'pending_approval',
    created_at: '2026-10-20T14:35:00Z',
    updated_at: '2026-10-20T14:35:00Z',
    audit_logs: [
      {
        id: 'log_1',
        timestamp: '2026-10-20T14:35:00Z',
        actor_name: 'Sarah Miller',
        actor_email: 'sarah.miller@wcatrojans.org',
        actor_role: 'employee',
        action: 'SUBMITTED',
        details: 'Purchase order submitted for approval (Total: $635.00)'
      }
    ]
  },
  {
    id: 'po_002',
    po_number: 'PO-2026-0041',
    created_by: 'usr_staff_02',
    employee_name: 'Coach Mark Davis',
    employee_email: 'mdavis@wcatrojans.org',
    vendor_name: 'Varsity Sports Direct',
    purchase_date: '2026-10-18',
    department_account_id: 'ACCT-4002',
    school_purpose: 'Replacement basketballs and tactical whiteboards for Varsity Trojans Winter Season',
    items: [
      { id: 'item_1', description: 'Wilson Evolution Official Game Basketball', qty: 10, unit_price: 79.99, total: 799.90 },
      { id: 'item_2', description: 'Dry Erase Magnetic Coaching Clipboard', qty: 4, unit_price: 32.50, total: 130.00 }
    ],
    total_amount: 929.90,
    receipt_urls: [
      {
        name: 'varsity_order_invoice.png',
        url: 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?auto=format&fit=crop&q=80&w=800',
        type: 'image/png',
        uploaded_at: '2026-10-18T10:15:00Z'
      }
    ],
    status: 'approved',
    approval_notes: 'Approved. Charged against 2026 Athletics Equipment Allocation.',
    approved_by: 'robert.accountant@wcatrojans.org',
    approved_at: '2026-10-19T09:20:00Z',
    created_at: '2026-10-18T10:20:00Z',
    updated_at: '2026-10-19T09:20:00Z',
    audit_logs: [
      {
        id: 'log_1',
        timestamp: '2026-10-18T10:20:00Z',
        actor_name: 'Coach Mark Davis',
        actor_email: 'mdavis@wcatrojans.org',
        actor_role: 'employee',
        action: 'SUBMITTED',
        details: 'Purchase order submitted for approval (Total: $929.90)'
      },
      {
        id: 'log_2',
        timestamp: '2026-10-19T09:20:00Z',
        actor_name: 'Robert Vance (Business Office)',
        actor_email: 'robert.accountant@wcatrojans.org',
        actor_role: 'accountant',
        action: 'APPROVED',
        details: 'Approved with notes: Approved. Charged against 2026 Athletics Equipment Allocation.'
      }
    ]
  },
  {
    id: 'po_003',
    po_number: 'PO-2026-0040',
    created_by: 'usr_staff_01',
    employee_name: 'Sarah Miller',
    employee_email: 'sarah.miller@wcatrojans.org',
    vendor_name: 'Carolina Biological',
    purchase_date: '2026-10-15',
    department_account_id: 'ACCT-4001',
    school_purpose: 'Glassware beakers and graduated cylinders for semester labs',
    items: [
      { id: 'item_1', description: 'Borosilicate Glass Beakers 500ml (Set of 6)', qty: 4, unit_price: 48.00, total: 192.00 },
      { id: 'item_2', description: '100ml Graduated Cylinders (Set of 12)', qty: 2, unit_price: 64.00, total: 128.00 }
    ],
    total_amount: 320.00,
    receipt_urls: [
      {
        name: 'carolina_receipt.pdf',
        url: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&q=80&w=800',
        type: 'application/pdf',
        uploaded_at: '2026-10-15T11:00:00Z'
      }
    ],
    status: 'paid',
    approval_notes: 'Standard lab replenishment approved.',
    payment_reference: 'CHK-94821',
    paid_at: '2026-10-17T15:45:00Z',
    created_at: '2026-10-15T11:05:00Z',
    updated_at: '2026-10-17T15:45:00Z',
    audit_logs: [
      {
        id: 'log_1',
        timestamp: '2026-10-15T11:05:00Z',
        actor_name: 'Sarah Miller',
        actor_email: 'sarah.miller@wcatrojans.org',
        actor_role: 'employee',
        action: 'SUBMITTED',
        details: 'Submitted for approval'
      },
      {
        id: 'log_2',
        timestamp: '2026-10-16T10:00:00Z',
        actor_name: 'Robert Vance (Business Office)',
        actor_email: 'robert.accountant@wcatrojans.org',
        actor_role: 'accountant',
        action: 'APPROVED',
        details: 'Approved for disbursement'
      },
      {
        id: 'log_3',
        timestamp: '2026-10-17T15:45:00Z',
        actor_name: 'Robert Vance (Business Office)',
        actor_email: 'robert.accountant@wcatrojans.org',
        actor_role: 'accountant',
        action: 'PAID',
        details: 'Disbursed via check #CHK-94821'
      }
    ]
  },
  {
    id: 'po_004',
    po_number: 'PO-2026-0039',
    created_by: 'usr_staff_03',
    employee_name: 'Jason Scott',
    employee_email: 'jscott@wcatrojans.org',
    vendor_name: 'Sweetwater Sound',
    purchase_date: '2026-10-12',
    department_account_id: 'ACCT-4003',
    school_purpose: 'Audio interface and condenser microphones for Chapel & Theater production',
    items: [
      { id: 'item_1', description: 'Shure SM58 Dynamic Vocal Microphone', qty: 3, unit_price: 99.00, total: 297.00 },
      { id: 'item_2', description: '20ft Heavy Duty XLR Microphone Cables', qty: 6, unit_price: 24.50, total: 147.00 }
    ],
    total_amount: 444.00,
    receipt_urls: [],
    status: 'rejected',
    rejection_reason: 'Missing itemized vendor invoice or formal quote attachment. Please re-attach the quote from Sweetwater and resubmit.',
    rejected_by: 'robert.accountant@wcatrojans.org',
    rejected_at: '2026-10-13T11:15:00Z',
    created_at: '2026-10-12T16:00:00Z',
    updated_at: '2026-10-13T11:15:00Z',
    audit_logs: [
      {
        id: 'log_1',
        timestamp: '2026-10-12T16:00:00Z',
        actor_name: 'Jason Scott',
        actor_email: 'jscott@wcatrojans.org',
        actor_role: 'employee',
        action: 'SUBMITTED',
        details: 'Submitted for approval'
      },
      {
        id: 'log_2',
        timestamp: '2026-10-13T11:15:00Z',
        actor_name: 'Robert Vance (Business Office)',
        actor_email: 'robert.accountant@wcatrojans.org',
        actor_role: 'accountant',
        action: 'REJECTED',
        details: 'Rejected: Missing itemized vendor invoice or formal quote attachment.'
      }
    ]
  }
];

export const DEMO_USERS = {
  employee: {
    uid: 'usr_staff_01',
    displayName: 'Sarah Miller (Faculty)',
    email: 'sarah.miller@wcatrojans.org',
    role: 'employee',
    department: 'High School Science',
    photoURL: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150'
  },
  accountant: {
    uid: 'usr_accountant_01',
    displayName: 'Robert Vance (Business Office)',
    email: 'robert.accountant@wcatrojans.org',
    role: 'accountant',
    department: 'Accounting & Business Office',
    photoURL: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=150'
  }
};
