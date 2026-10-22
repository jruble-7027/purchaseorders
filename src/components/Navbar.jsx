import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  FileText,
  ShieldCheck,
  UserCheck,
  LogOut,
  LogIn,
  Sliders,
  Sparkles,
  Info
} from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab }) {
  const { currentUser, isDemoMode, loginWithGoogle, logout, switchDemoRole } = useAuth();
  const [showConfigModal, setShowConfigModal] = useState(false);

  const isAccountant = currentUser?.role === 'accountant' || currentUser?.role === 'admin';

  return (
    <>
      <header className="bg-[#0C2340] text-white shadow-md border-b border-amber-500/30 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Logo and Title */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/20 border border-amber-400 flex items-center justify-center text-amber-400 font-bold shadow-inner">
                <FileText className="w-5 h-5 text-amber-300" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-lg tracking-tight text-white">Wesleyan Christian Academy</span>
                  <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                    TROJANS
                  </span>
                </div>
                <div className="text-xs text-slate-300 flex items-center gap-1.5">
                  <span>PO Intake & Reporting Portal</span>
                  <span className="text-slate-500">•</span>
                  <span className="text-emerald-400 font-mono text-[11px]">@wcatrojans.org</span>
                </div>
              </div>
            </div>

            {/* Navigation & Role Controls */}
            <div className="flex items-center space-x-3 sm:space-x-4">
              
              {/* Role Switcher Pill (Great for pairing/testing and demo) */}
              <div className="bg-slate-800/80 p-1 rounded-lg border border-slate-700 flex items-center text-xs">
                <button
                  type="button"
                  onClick={() => {
                    switchDemoRole('employee');
                    setActiveTab('employee');
                  }}
                  className={`px-3 py-1.5 rounded-md font-medium transition-all flex items-center gap-1.5 ${
                    !isAccountant
                      ? 'bg-amber-500 text-slate-950 font-semibold shadow-sm'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Staff Faculty</span>
                  <span className="md:hidden">Faculty</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    switchDemoRole('accountant');
                    setActiveTab('accountant');
                  }}
                  className={`px-3 py-1.5 rounded-md font-medium transition-all flex items-center gap-1.5 ${
                    isAccountant
                      ? 'bg-amber-500 text-slate-950 font-semibold shadow-sm'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Business Office</span>
                  <span className="md:hidden">Accountant</span>
                </button>
              </div>

              {/* User Profile / Auth */}
              {currentUser ? (
                <div className="flex items-center space-x-2 pl-2 border-l border-slate-700">
                  <img
                    src={currentUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.displayName || 'Staff')}&background=0C2340&color=F59E0B`}
                    alt={currentUser.displayName}
                    className="w-8 h-8 rounded-full border border-amber-400/50 object-cover"
                  />
                  <div className="hidden lg:block text-left">
                    <div className="text-xs font-semibold text-slate-100 truncate max-w-[140px]">
                      {currentUser.displayName}
                    </div>
                    <div className="text-[10px] text-amber-400 capitalize">
                      {currentUser.role === 'accountant' ? 'Business Office' : 'Faculty / Staff'}
                    </div>
                  </div>
                  {isDemoMode ? (
                    <button
                      onClick={() => setShowConfigModal(true)}
                      title="Firebase Integration Status"
                      className="p-1.5 rounded-md text-amber-300 hover:text-white hover:bg-slate-800 transition"
                    >
                      <Sparkles className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      onClick={logout}
                      title="Log Out"
                      className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ) : (
                <button
                  onClick={loginWithGoogle}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white text-slate-900 rounded-md hover:bg-slate-100 transition shadow-sm"
                >
                  <LogIn className="w-3.5 h-3.5 text-blue-600" />
                  <span>Google SSO</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Demo Mode / Environment Status Helper Banner */}
      {isDemoMode && (
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-transparent border-b border-amber-500/20 px-4 py-1.5 text-xs text-amber-900">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
              <span className="font-medium text-slate-800">
                Interactive Preview Mode Active:
              </span>
              <span className="text-slate-600 hidden sm:inline">
                All PO creations, receipt uploads, approval workflows, and CSV exports are fully functional.
              </span>
            </div>
            <button
              onClick={() => setShowConfigModal(true)}
              className="text-amber-800 hover:text-amber-950 font-semibold underline text-[11px] flex items-center gap-1"
            >
              <Info className="w-3 h-3" />
              <span>Firebase Backend Setup</span>
            </button>
          </div>
        </div>
      )}

      {/* Firebase Setup Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full p-6 text-slate-900">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                  WCA
                </div>
                <div>
                  <h3 className="font-bold text-lg text-[#0C2340]">Firebase Integration Guide</h3>
                  <p className="text-xs text-slate-500">Connecting this portal to your live Firebase project</p>
                </div>
              </div>
              <button
                onClick={() => setShowConfigModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600 mb-6">
              <p>
                The frontend is pre-architected with direct Firebase SDK hooks. To connect your live Wesleyan Firebase project:
              </p>
              <ol className="list-decimal list-inside space-y-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <li>
                  Go to the <strong>Firebase Console</strong> and enable <strong>Authentication</strong> (Google Provider restricted to <code className="bg-white px-1 py-0.5 rounded border text-slate-800">wcatrojans.org</code>).
                </li>
                <li>
                  Create a <strong>Firestore Database</strong> and a <strong>Storage Bucket</strong>.
                </li>
                <li>
                  Copy your project credentials into <code className="bg-white px-1 py-0.5 rounded border text-slate-800">.env</code> using the template in <code className="bg-white px-1 py-0.5 rounded border text-slate-800">.env.example</code>.
                </li>
                <li>
                  Deploy the generated <code className="bg-white px-1 py-0.5 rounded border text-slate-800">firestore.rules</code> and <code className="bg-white px-1 py-0.5 rounded border text-slate-800">storage.rules</code>.
                </li>
              </ol>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setShowConfigModal(false)}
                className="px-4 py-2 bg-[#0C2340] text-white font-medium text-xs rounded-lg hover:bg-slate-800 transition"
              >
                Got It, Return to Portal
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
