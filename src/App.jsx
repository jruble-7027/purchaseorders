import React, { useState, useEffect, useRef } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { POProvider, usePOs } from './context/POContext';
import Navbar from './components/Navbar';
import EmployeeDashboard from './components/EmployeeView/EmployeeDashboard';
import POFormModal from './components/EmployeeView/POFormModal';
import AccountantDashboard from './components/AccountantView/AccountantDashboard';
import ApprovalModal from './components/AccountantView/ApprovalModal';
import UserManagement from './components/AdminView/UserManagement';
import PODetailModal from './components/Common/PODetailModal';
import { AlertTriangle, Lock, LogIn, ShieldCheck, FileText } from 'lucide-react';

function MainPortal() {
  const { currentUser, loading, loginWithGoogle, authError, setAuthError } = useAuth();
  const [activeTab, setActiveTab] = useState('employee'); // 'employee' | 'accountant' | 'users'
  const hasInitializedTab = useRef(false);

  // Modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPO, setEditingPO] = useState(null);
  const [selectedPO, setSelectedPO] = useState(null);
  const [actionPO, setActionPO] = useState(null);

  // Automatically land Business Office & System Administrators on Business Office console on login
  useEffect(() => {
    if (currentUser && !hasInitializedTab.current) {
      hasInitializedTab.current = true;
      if (currentUser.role === 'admin' || currentUser.role === 'accountant') {
        setActiveTab('accountant');
      } else {
        setActiveTab('employee');
      }
    } else if (!currentUser) {
      hasInitializedTab.current = false;
      setIsFormOpen(false);
      setEditingPO(null);
      setSelectedPO(null);
      setActionPO(null);
    }
  }, [currentUser]);

  const handleOpenNewPO = () => {
    if (!currentUser) return;
    setEditingPO(null);
    setIsFormOpen(true);
  };

  const handleEditPO = (po) => {
    if (!currentUser) return;
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
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20">
            <div className="w-10 h-10 rounded-full border-3 border-zinc-800 border-t-[#ce1226] animate-spin mb-3" />
            <p className="text-xs font-medium text-slate-500">Verifying Wesleyan Google Workspace session...</p>
          </div>
        ) : !currentUser ? (
          <div className="flex-1 flex items-center justify-center py-12">
            <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden">
              <div className="bg-gradient-to-br from-[#111111] via-[#1a1113] to-[#45060d] px-6 py-8 text-center border-b-2 border-[#ce1226]">
                <img
                  src="/images/wca-logo-white.svg"
                  alt="Wesleyan Christian Academy"
                  className="h-14 w-auto mx-auto mb-4 object-contain"
                />
                <div className="inline-block px-3 py-0.5 rounded bg-[#ce1226] text-white text-[11px] font-bold uppercase tracking-widest shadow-sm">
                  Purchase Order & Procurement Portal
                </div>
              </div>

              <div className="p-6 sm:p-8 text-center space-y-5">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 text-[#ce1226] border border-red-200/70 text-[11px] font-semibold">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#ce1226]" />
                    <span>Google Workspace Authentication Required</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Please sign in with your Wesleyan Christian Academy Google account to submit purchase orders, upload receipts, or review department budgets.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={loginWithGoogle}
                  className="w-full py-3 px-4 rounded-xl bg-[#ce1226] hover:bg-[#a50e1e] text-white font-bold text-sm shadow-md hover:shadow-lg transition flex items-center justify-center gap-2.5 cursor-pointer"
                >
                  <LogIn className="w-4 h-4 text-[#ffde6a]" />
                  <span>Sign In with Google SSO</span>
                </button>

                <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-400">
                  Authorized internal staff only. Sessions are monitored and logged for security.
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === 'users' ? (
          <UserManagement />
        ) : activeTab === 'accountant' ? (
          <AccountantDashboard
            onSelectPO={(po) => setSelectedPO(po)}
            onOpenActionModal={(po) => setActionPO(po)}
            onOpenUserManagement={() => setActiveTab('users')}
          />
        ) : (
          <EmployeeDashboard
            onOpenNewPO={handleOpenNewPO}
            onSelectPO={(po) => setSelectedPO(po)}
            onEditPO={handleEditPO}
          />
        )}
      </main>

      {/* New / Edit PO Form Modal */}
      {currentUser && isFormOpen && (
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
      {currentUser && selectedPO && (
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
      {currentUser && actionPO && (
        <ApprovalModal
          po={actionPO}
          isOpen={Boolean(actionPO)}
          onClose={() => setActionPO(null)}
        />
      )}

      {/* Institutional Footer */}
      <footer className="bg-[#111111] border-t-2 border-[#ce1226] py-5 mt-auto text-zinc-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs gap-3">
          <div className="flex items-center space-x-3">
            <img
              src="/images/wca-logo-white.svg"
              alt="Wesleyan Christian Academy"
              className="h-7 w-auto object-contain opacity-95"
            />
            <span className="text-zinc-600">•</span>
            <span className="text-zinc-300 font-medium">Business & Procurement Department</span>
          </div>
          <div className="text-zinc-400 text-center sm:text-right">
            If you experience authentication issues or need account access, please submit an <span className="text-[#ffde6a] font-medium">IT Support Ticket</span>.
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
