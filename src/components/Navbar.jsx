import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  FileText,
  ShieldCheck,
  UserCheck,
  Users,
  LogOut,
  LogIn,
  Sliders,
  Sparkles,
  Info,
  LayoutGrid,
  Home,
  Bus,
  FileSpreadsheet,
  Headphones,
  ExternalLink
} from 'lucide-react';

const DEFAULT_SWITCHER_APPS = [
  {
    name: 'WCA Home',
    subtitle: 'Faculty & Staff Hub',
    url: 'https://wca-home-131845667297.us-east1.run.app',
    color: 'crimson'
  },
  {
    name: 'Bus Trips',
    subtitle: 'Trip Reservations',
    url: 'https://trips-131845667297.us-east1.run.app',
    color: 'gold'
  },
  {
    name: 'Purchase Orders',
    subtitle: 'Requisitions & POs',
    url: 'https://purchaseorders-903ee.web.app',
    color: 'emerald'
  },
  {
    name: 'WCA Helpdesk',
    subtitle: 'IT Support Tickets',
    url: 'https://wca-tickets-58f6c.web.app',
    color: 'blue'
  }
];

function getSwitcherIcon(app) {
  const n = (app.name || '').toLowerCase();
  if (n.includes('home') || n.includes('hub')) return Home;
  if (n.includes('trip') || n.includes('bus')) return Bus;
  if (n.includes('purchase') || n.includes('po')) return FileSpreadsheet;
  if (n.includes('help') || n.includes('ticket')) return Headphones;
  return LayoutGrid;
}

function getSwitcherColorClasses(color) {
  switch (color) {
    case 'crimson': return 'bg-red-100 text-[#CE1226]';
    case 'gold': return 'bg-amber-100 text-amber-800';
    case 'emerald': return 'bg-emerald-100 text-emerald-700';
    case 'blue': return 'bg-blue-100 text-blue-700';
    case 'purple': return 'bg-purple-100 text-purple-700';
    default: return 'bg-slate-200 text-slate-800';
  }
}

export default function Navbar({ activeTab, setActiveTab }) {
  const { currentUser, isDemoMode, loginWithGoogle, logout, switchDemoRole } = useAuth();
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [switcherApps, setSwitcherApps] = useState(DEFAULT_SWITCHER_APPS);
  const closeTimerRef = useRef(null);
  const switcherRef = useRef(null);

  useEffect(() => {
    fetch('https://wca-home-131845667297.us-east1.run.app/api/switcher-apps')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && Array.isArray(data.apps) && data.apps.length > 0) {
          setSwitcherApps(data.apps);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (switcherRef.current && !switcherRef.current.contains(e.target)) {
        setSwitcherOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMouseEnter = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setSwitcherOpen(true);
  };

  const handleMouseLeave = () => {
    closeTimerRef.current = setTimeout(() => {
      setSwitcherOpen(false);
    }, 220);
  };

  const canAccessBusinessOffice =
    isDemoMode || currentUser?.role === 'accountant' || currentUser?.role === 'admin';
  const canAccessUserAdmin =
    isDemoMode || currentUser?.role === 'admin' || currentUser?.role === 'accountant';

  return (
    <>
      <header className="bg-[#111111] text-white shadow-lg border-b-2 border-[#ce1226] sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`flex items-center ${currentUser ? 'justify-between' : 'justify-center'} h-20`}>
            
            {/* Official WCA Logo and Portal Title */}
            <div className="flex items-center space-x-3.5">
              <a
                href="https://www.wcatrojans.org"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center shrink-0 group"
                title="Wesleyan Christian Academy (www.wcatrojans.org)"
              >
                <img
                  src="/images/wca-logo-white.svg"
                  alt="Wesleyan Christian Academy"
                  className="h-11 sm:h-12 w-auto object-contain transition-transform group-hover:scale-[1.02]"
                />
              </a>
              <div className="hidden sm:block h-8 w-px bg-zinc-700/80" />
              <div className="hidden sm:block">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-sm tracking-wide uppercase text-white">
                    Purchase Order Portal
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-[#ce1226] text-white tracking-wider uppercase shadow-sm">
                    TROJANS
                  </span>
                </div>
                <div className="text-[11px] text-zinc-400 flex items-center gap-1.5 mt-0.5">
                  <span>Business & Procurement Department</span>
                </div>
              </div>
            </div>

            {/* Navigation & Role Controls (Only shown when signed in) */}
            {currentUser && (
              <div className="flex items-center space-x-3 sm:space-x-4">
                
                {/* View & Role Switcher Pill */}
                <div className="bg-zinc-900 p-1 rounded-lg border border-zinc-700/80 flex items-center text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      if (isDemoMode) switchDemoRole('employee');
                      setActiveTab('employee');
                    }}
                    className={`px-3 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1.5 ${
                      activeTab === 'employee'
                        ? 'bg-[#ce1226] text-white shadow-sm'
                        : 'text-zinc-300 hover:text-white'
                    }`}
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span className="hidden md:inline">Staff Faculty</span>
                    <span className="md:hidden">Faculty</span>
                  </button>

                  {canAccessBusinessOffice && (
                    <button
                      type="button"
                      onClick={() => {
                        if (isDemoMode) switchDemoRole('accountant');
                        setActiveTab('accountant');
                      }}
                      className={`px-3 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1.5 ${
                        activeTab === 'accountant'
                          ? 'bg-[#ce1226] text-white shadow-sm'
                          : 'text-zinc-300 hover:text-white'
                      }`}
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span className="hidden md:inline">Business Office</span>
                      <span className="md:hidden">Approver</span>
                    </button>
                  )}

                  {canAccessUserAdmin && (
                    <button
                      type="button"
                      onClick={() => {
                        if (isDemoMode) switchDemoRole('admin');
                        setActiveTab('users');
                      }}
                      className={`px-3 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1.5 ${
                        activeTab === 'users'
                          ? 'bg-[#ce1226] text-white shadow-sm'
                          : 'text-zinc-300 hover:text-white'
                      }`}
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span className="hidden md:inline">User Management</span>
                      <span className="md:hidden">Users</span>
                    </button>
                  )}
                </div>

                {/* User Profile / Google SSO + WCA Quick-Launch App Switcher */}
                <div
                  ref={switcherRef}
                  onMouseEnter={handleMouseEnter}
                  onMouseLeave={handleMouseLeave}
                  className="relative flex items-center pl-2 border-l border-zinc-700"
                >
                  <button
                    type="button"
                    onClick={() => setSwitcherOpen((prev) => !prev)}
                    className="flex items-center space-x-2.5 pl-1.5 pr-3 py-1 rounded-full bg-white/5 hover:bg-white/10 border border-zinc-700 hover:border-[#ffde6a]/70 transition-all focus:outline-none"
                  >
                    <img
                      src={currentUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.displayName || 'Staff')}&background=ce1226&color=ffffff`}
                      alt={currentUser.displayName}
                      referrerPolicy="no-referrer"
                      className="w-8 h-8 rounded-full border-2 border-[#ce1226] object-cover flex-shrink-0"
                    />
                    <div className="hidden lg:block text-left leading-tight">
                      <div className="text-xs font-semibold text-zinc-100 truncate max-w-[130px]">
                        {currentUser.displayName}
                      </div>
                      <div className="text-[10px] text-[#ffde6a] font-medium capitalize">
                        {currentUser.role === 'admin' ? 'System Administrator' : currentUser.role === 'accountant' ? 'Business Office' : 'Faculty / Staff'}
                      </div>
                    </div>
                    <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[#ffde6a]">
                      <LayoutGrid className="w-3.5 h-3.5" />
                    </div>
                  </button>

                  {isDemoMode && (
                    <button
                      onClick={() => setShowConfigModal(true)}
                      title="Firebase Integration Status"
                      className="ml-1.5 p-1.5 rounded-md text-[#ffde6a] hover:text-white hover:bg-zinc-800 transition"
                    >
                      <Sparkles className="w-4 h-4" />
                    </button>
                  )}

                  {/* Hover / Click WCA App Switcher Dropdown */}
                  {switcherOpen && (
                    <div className="absolute right-0 top-full mt-2.5 w-80 sm:w-96 rounded-2xl bg-white text-slate-800 shadow-2xl border border-slate-200/90 overflow-hidden z-50 origin-top-right">
                      {/* Header */}
                      <div className="bg-gradient-to-br from-[#0b1c2d] via-[#132c47] to-[#52070F] px-5 py-3.5 text-white flex items-center justify-between border-b border-white/10">
                        <div className="flex items-center space-x-2">
                          <LayoutGrid className="w-4 h-4 text-[#ffde6a]" />
                          <span className="font-extrabold text-xs uppercase tracking-wider text-white">
                            WCA Quick-Launch Switcher
                          </span>
                        </div>
                        {currentUser.role === 'admin' ? (
                          <a
                            href="https://wca-home-131845667297.us-east1.run.app/admin#switcher-section"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] font-bold text-[#ffde6a] hover:underline flex items-center gap-1"
                          >
                            <Sliders className="w-3 h-3" />
                            <span>Manage</span>
                          </a>
                        ) : (
                          <span className="text-[10px] font-bold uppercase tracking-widest text-[#ffde6a]/90">
                            SSO Connected
                          </span>
                        )}
                      </div>

                      {/* 2x2 App Grid */}
                      <div className="p-3.5 bg-slate-50/70 grid grid-cols-2 gap-2.5">
                        {switcherApps.map((app, idx) => {
                          const IconComp = getSwitcherIcon(app);
                          const isHere =
                            (app.url || '').includes(window.location.host) ||
                            (app.name || '').toLowerCase().includes('purchase');
                          const colorCls = getSwitcherColorClasses(app.color);

                          return (
                            <a
                              key={idx}
                              href={app.url}
                              target={isHere ? undefined : '_blank'}
                              rel={isHere ? undefined : 'noopener noreferrer'}
                              className={`group relative flex items-start space-x-3 p-3 rounded-xl border transition-all ${
                                isHere
                                  ? 'bg-amber-50/90 border-amber-400 ring-1 ring-amber-400/50 shadow-sm'
                                  : 'bg-white border-slate-200/80 hover:border-[#0b1c2d] hover:shadow-md'
                              }`}
                            >
                              <div
                                className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm transition-transform group-hover:scale-105 ${colorCls}`}
                              >
                                <IconComp className="w-5 h-5" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-1">
                                  <span className="font-extrabold text-xs text-slate-900 group-hover:text-[#CE1226] truncate">
                                    {app.name}
                                  </span>
                                  {isHere ? (
                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-amber-400 text-slate-950">
                                      Here
                                    </span>
                                  ) : (
                                    <ExternalLink className="w-3 h-3 text-slate-300 group-hover:text-[#CE1226] transition-colors flex-shrink-0" />
                                  )}
                                </div>
                                <p className="text-[11px] text-slate-500 truncate mt-0.5">
                                  {app.subtitle}
                                </p>
                              </div>
                            </a>
                          );
                        })}
                      </div>

                      {/* Bottom User Profile & Sign Out */}
                      <div className="px-4 py-3.5 bg-white border-t border-slate-200/80">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center space-x-2.5 min-w-0">
                            <img
                              src={currentUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.displayName || 'Staff')}&background=ce1226&color=ffffff`}
                              alt=""
                              referrerPolicy="no-referrer"
                              className="w-9 h-9 rounded-full object-cover border border-[#ce1226] flex-shrink-0"
                            />
                            <div className="min-w-0">
                              <div className="text-xs font-extrabold text-slate-900 truncate flex items-center gap-1.5">
                                <span className="truncate">{currentUser.displayName}</span>
                                <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 text-[9px] font-black uppercase">
                                  {currentUser.role === 'admin' ? 'Admin' : currentUser.role === 'accountant' ? 'Approver' : 'Staff'}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-500 truncate">{currentUser.email}</div>
                            </div>
                          </div>
                          {!isDemoMode && (
                            <button
                              type="button"
                              onClick={logout}
                              className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-red-600 hover:bg-red-50 transition-colors flex items-center gap-1 flex-shrink-0"
                            >
                              <LogOut className="w-3.5 h-3.5" />
                              <span>Sign Out</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            )}
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
