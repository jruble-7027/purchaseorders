import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { POProvider, usePOs } from './context/POContext';
import Navbar from './components/Navbar';
import EmployeeDashboard from './components/EmployeeView/EmployeeDashboard';
import POFormModal from './components/EmployeeView/POFormModal';
import AccountantDashboard from './components/AccountantView/AccountantDashboard';
import ApprovalModal from './components/AccountantView/ApprovalModal';
import PODetailModal from './components/Common/PODetailModal';
import { AlertTriangle, Lock } from 'lucide-react';

function MainPortal() {
  const { currentUser, authError, setAuthError } = useAuth();
  const [activeTab, setActiveTab] = useState('employee'); // 'employee' | 'accountant'

  // Modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPO, setEditingPO] = useState(null);
  const [selectedPO, setSelectedPO] = useState(null);
  const [actionPO, setActionPO] = useState(null);

  // Sync activeTab when user switches roles
  const currentRole = currentUser?.role || 'employee';

  const handleOpenNewPO = () => {
    setEditingPO(null);
    setIsFormOpen(true);
  };

  const handleEditPO = (po) => {
    setEditingPO(po);
    setIsFormOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      
      {/* Navigation Header */}
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Domain Auth Error Alert */}
      {authError && (
        <div className="bg-rose-50 border-b border-rose-200 px-4 py-3 text-xs text-rose-800">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Lock className="w-4 h-4 text-rose-600 shrink-0" />
              <span className="font-semibold">{authError}</span>
            </div>
            <button
              onClick={() => setAuthError(null)}
              className="text-rose-600 hover:text-rose-900 font-bold ml-4"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Main App Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'employee' ? (
          <EmployeeDashboard
            onOpenNewPO={handleOpenNewPO}
            onSelectPO={(po) => setSelectedPO(po)}
            onEditPO={handleEditPO}
          />
        ) : (
          <AccountantDashboard
            onSelectPO={(po) => setSelectedPO(po)}
            onOpenActionModal={(po) => setActionPO(po)}
          />
        )}
      </main>

      {/* New / Edit PO Form Modal */}
      {isFormOpen && (
        <POFormModal
          isOpen={isFormOpen}
          onClose={() => {
            setIsFormOpen(false);
            setEditingPO(null);
          }}
          initialData={editingPO}
        />
      )}

      {/* PO Full Detail & Audit Modal */}
      {selectedPO && (
        <PODetailModal
          po={selectedPO}
          onClose={() => setSelectedPO(null)}
          onOpenActionModal={(po) => {
            setSelectedPO(null);
            setActionPO(po);
          }}
          onEditDraft={(po) => {
            setSelectedPO(null);
            handleEditPO(po);
          }}
        />
      )}

      {/* Accountant Action / Approval Modal */}
      {actionPO && (
        <ApprovalModal
          po={actionPO}
          isOpen={Boolean(actionPO)}
          onClose={() => setActionPO(null)}
        />
      )}

      {/* Institutional Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-slate-800">Wesleyan Christian Academy</span>
            <span>•</span>
            <span>Business & Procurement Department</span>
          </div>
          <div>
            Authorized for <span className="font-mono text-slate-700 font-semibold">@wcatrojans.org</span> single sign-on
          </div>
        </div>
      </footer>

    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <POProvider>
        <MainPortal />
      </POProvider>
    </AuthProvider>
  );
}
