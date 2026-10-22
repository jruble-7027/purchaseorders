# Wesleyan Christian Academy - Purchase Order (PO) Intake & Reporting System

A web application designed for Wesleyan Christian Academy (`@wcatrojans.org`) to streamline faculty purchase requisitions, receipt management, Business Office approvals, and financial auditing.

---

## 🌟 Key Features

### 1. Faculty / Staff Portal
- **Intake Form**:
  - Requisitioner information and purchase date.
  - Department expense account selection (e.g., Science, Athletics, Fine Arts, IT, Facilities).
  - Educational purpose & justification statement.
  - Dynamic itemized line items with auto-computed line subtotals and grand totals.
  - Drag-and-drop receipt / quote upload (supporting PDF documents, PNG, and JPG images).
- **Requisition Tracking**:
  - Filter by status (`Pending Approval`, `Approved`, `Paid / Reimbursed`, `Needs Revision`, `Draft`).
  - Search by vendor, PO number, or educational purpose.
  - View full PO details, itemized breakdown, and complete audit trail.
  - Edit and resubmit rejected requisitions.

### 2. Business Office / Accountant Console
- **Immediate Approval Queue**:
  - High-priority cards for pending requisitions.
  - One-click **Approve** (with optional budget allocation notes).
  - One-click **Request Revision / Reject** (with mandatory feedback note to faculty).
  - One-click **Mark as Paid / Reimbursed** (with check # or payment transaction ID).
- **Comprehensive Financial KPI Metrics**:
  - Total pending approvals value & count.
  - Approved awaiting disbursement.
  - Paid / reimbursed year-to-date.
  - Total organization spend.
- **Auditing & Reporting**:
  - Multi-dimensional filters (date range, department account code, status, vendor/staff keywords).
  - **1-Click CSV Export**: Formatted for direct import into accounting software or Excel.
  - **Printable Requisition Form**: Formatted, print-ready document with official header, itemized grid, approval stamps, and compliance history.

### 3. Backend & Security
- **Domain Restricted Auth**: Preconfigured for `@wcatrojans.org` (and `@wesleyan.edu`).
- **Cloud Firestore**:
  - Production-ready `firestore.rules` enforcing role-based permissions (employees read/create their own, accountants review all).
- **Firebase Storage**:
  - Production-ready `storage.rules` organizing receipts under `/receipts/{poNumber}/{fileName}`.
- **Serverless Cloud Functions**:
  - Email notification triggers for new PO submissions and status changes (`functions/index.js`).

---

## 🚀 Quick Start & Development

### 1. Install & Run Locally

```bash
# Start Vite development server
npm run dev

# Or build for production
npm run build
```

By default, the application runs in an **Interactive Preview / Development Mode** with mock data and an instant toggle between **Staff Faculty** and **Business Office** roles in the top navbar.

---

## ⚙️ Connecting Your Live Firebase Project

To connect this application to your school's live Firebase project:

### Step 1: Create Firebase Project & Enable Services
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Create a project (e.g. `wca-purchase-orders`).
3. Enable **Authentication** -> Sign-in method -> **Google**:
   - Authorized domain: add `wcatrojans.org`.
4. Enable **Cloud Firestore** in production mode.
5. Enable **Firebase Storage**.

### Step 2: Configure Environment Variables
Copy `.env.example` to `.env` and fill in your Firebase Web App credentials:

```bash
cp .env.example .env
```

Edit `.env`:
```env
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=wca-purchase-orders.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=wca-purchase-orders
VITE_FIREBASE_STORAGE_BUCKET=wca-purchase-orders.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abcdef123456
VITE_ALLOWED_DOMAINS=wcatrojans.org,wesleyan.edu
```

### Step 3: Deploy Security Rules & Hosting

```bash
# Install Firebase CLI if not already installed
npm install -g firebase-tools

# Login to Firebase
firebase login

# Deploy rules and hosting
firebase deploy --only firestore:rules,storage,hosting
```

---

## 📁 Project Structure

```
├── functions/                     # Cloud Functions (email alerts & audit logs)
│   ├── index.js
│   └── package.json
├── src/
│   ├── components/
│   │   ├── AccountantView/        # Approval queue, reporting, action modal
│   │   ├── Common/                # Receipt viewer, PO detail modal, printable view
│   │   ├── EmployeeView/          # PO intake form, line items editor, faculty list
│   │   ├── Navbar.jsx             # Role switcher, domain badge, header
│   │   └── StatusBadge.jsx        # Status indicators
│   ├── config/
│   │   ├── defaultData.js         # Expense accounts & seed requisitions
│   │   └── firebase.js            # Firebase SDK initialization & domain check
│   ├── context/
│   │   ├── AuthContext.jsx        # Google Workspace SSO & role management
│   │   └── POContext.jsx          # Real-time Firestore sync & CRUD actions
│   ├── services/
│   │   └── exportService.js       # CSV exporter & formatted print engine
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── firebase.json                  # Firebase hosting & rules configuration
├── firestore.rules                # Role-based Firestore security rules
├── storage.rules                  # Firebase Storage receipt security rules
└── vite.config.js
```
