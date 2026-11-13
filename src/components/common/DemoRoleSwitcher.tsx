/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types/auth';
import { authService } from '../../services/authService';

export const DemoRoleSwitcher: React.FC = () => {
  const { currentUser, switchRole, currentRoute, setCurrentRoute, setSessionExpired } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'roles' | 'routes' | 'simulations'>('roles');

  const seedAccounts = authService.getSeedAccounts();

  return (
    <div className="fixed bottom-5 left-5 z-50 font-sans">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-3.5 py-2.5 rounded-full bg-[#31302d] text-white shadow-2xl hover:bg-[#1c1c19] border border-amber-500/50 hover:border-amber-400 transition-all hover:scale-105 cursor-pointer text-xs font-semibold group"
          title="Open Prototype Role Switcher & Diagnostics"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
          <span className="material-symbols-outlined text-[18px] text-amber-400 group-hover:rotate-45 transition-transform">
            tune
          </span>
          <span>Prototype Roles &amp; Flows</span>
          {currentUser && (
            <span className="ml-1 px-2 py-0.5 rounded-full bg-[#a02010] text-[10px] text-white font-bold">
              {currentUser.role}
            </span>
          )}
        </button>
      ) : (
        <div className="w-[360px] sm:w-[400px] bg-white rounded-2xl shadow-2xl border-2 border-[#a02010] overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in slide-in-from-bottom-4 duration-200">
          {/* Header */}
          <div className="bg-[#31302d] text-white px-4 py-3 flex items-center justify-between border-b border-[#5a413c]">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-400 text-[20px]">
                verified
              </span>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider block">
                  CEDA Prototype Switcher
                </span>
                <span className="text-[10px] text-gray-300">
                  Password: <code className="text-amber-300 font-mono">Ceda#2026Demo</code>
                </span>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="w-7 h-7 rounded-lg hover:bg-white/20 flex items-center justify-center text-gray-300 hover:text-white transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>

          {/* Segmented Subtabs */}
          <div className="flex border-b border-[#e2bfb8]/60 bg-[#f7f3ee] text-xs font-semibold">
            <button
              onClick={() => setActiveTab('roles')}
              className={`flex-1 py-2 text-center transition-colors ${
                activeTab === 'roles'
                  ? 'bg-white text-[#7c0700] border-b-2 border-[#a02010] font-bold'
                  : 'text-[#77574e] hover:text-[#1c1c19]'
              }`}
            >
              Seed Roles (5)
            </button>
            <button
              onClick={() => setActiveTab('routes')}
              className={`flex-1 py-2 text-center transition-colors ${
                activeTab === 'routes'
                  ? 'bg-white text-[#7c0700] border-b-2 border-[#a02010] font-bold'
                  : 'text-[#77574e] hover:text-[#1c1c19]'
              }`}
            >
              Screens ({' '}
              <span className="text-[#a02010]">All 5 + Guards</span> )
            </button>
            <button
              onClick={() => setActiveTab('simulations')}
              className={`flex-1 py-2 text-center transition-colors ${
                activeTab === 'simulations'
                  ? 'bg-white text-[#7c0700] border-b-2 border-[#a02010] font-bold'
                  : 'text-[#77574e] hover:text-[#1c1c19]'
              }`}
            >
              Simulate States
            </button>
          </div>

          {/* Body Content */}
          <div className="p-3 overflow-y-auto flex-1 flex flex-col gap-2 max-h-[360px]">
            {activeTab === 'roles' && (
              <div className="flex flex-col gap-2">
                <p className="text-[11px] text-[#5a413c]">
                  Click any role below to instantly log in as that verified seed user:
                </p>
                {seedAccounts.map(({ role, user }) => {
                  const isCurrent = currentUser?.role === role;
                  return (
                    <button
                      key={role}
                      onClick={() => {
                        switchRole(role);
                        setIsOpen(false);
                      }}
                      className={`p-2.5 rounded-xl border text-left flex items-start justify-between transition-all ${
                        isCurrent
                          ? 'bg-[#ffdad4]/40 border-[#a02010] ring-1 ring-[#a02010]'
                          : 'bg-[#fdf9f4] hover:bg-white border-[#e2bfb8] hover:shadow-sm'
                      }`}
                    >
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                              role === 'SUBMITTER'
                                ? 'bg-emerald-100 text-emerald-800'
                                : role === 'EVALUATOR'
                                ? 'bg-amber-100 text-amber-800'
                                : role === 'ADJUDICATOR'
                                ? 'bg-purple-100 text-purple-800'
                                : role === 'ADMIN'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {role}
                          </span>
                          <span className="text-xs font-bold text-[#1c1c19]">{user.fullName}</span>
                        </div>
                        <span className="text-[11px] text-[#77574e] mt-0.5 truncate max-w-[240px]">
                          {user.email} • {user.town}
                        </span>
                      </div>
                      <span className="text-[11px] font-semibold text-[#a02010] mt-1 shrink-0">
                        {isCurrent ? 'Active ✓' : 'Switch →'}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {activeTab === 'routes' && (
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-bold uppercase text-[#77574e] tracking-wider px-1">
                  Core Auth Flows (Matched Screens)
                </span>
                <button
                  onClick={() => {
                    setCurrentRoute('/');
                    setIsOpen(false);
                  }}
                  className={`text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between ${
                    currentRoute === '/' ? 'bg-[#a02010] text-white font-bold' : 'hover:bg-[#f1ede8] text-[#1c1c19]'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px]">home</span>
                    1. Landing Page Overview
                  </span>
                  <span className="text-[10px] opacity-75">Public</span>
                </button>

                <button
                  onClick={() => {
                    setCurrentRoute('/register');
                    setIsOpen(false);
                  }}
                  className={`text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between ${
                    currentRoute === '/register' ? 'bg-[#a02010] text-white font-bold' : 'hover:bg-[#f1ede8] text-[#1c1c19]'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px]">app_registration</span>
                    2. Registration (Individual / Business)
                  </span>
                  <span className="text-[10px] opacity-75">Submitter</span>
                </button>

                <button
                  onClick={() => {
                    setCurrentRoute('/otp-verification');
                    setIsOpen(false);
                  }}
                  className={`text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between ${
                    currentRoute === '/otp-verification' ? 'bg-[#a02010] text-white font-bold' : 'hover:bg-[#f1ede8] text-[#1c1c19]'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px]">pin</span>
                    3. OTP Verification (6-digit boxes)
                  </span>
                  <span className="text-[10px] opacity-75">Verification</span>
                </button>

                <button
                  onClick={() => {
                    setCurrentRoute('/login');
                    setIsOpen(false);
                  }}
                  className={`text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between ${
                    currentRoute === '/login' ? 'bg-[#a02010] text-white font-bold' : 'hover:bg-[#f1ede8] text-[#1c1c19]'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px]">login</span>
                    4. Login (Password, OTP, Biometrics)
                  </span>
                  <span className="text-[10px] opacity-75">All Roles</span>
                </button>

                <button
                  onClick={() => {
                    setCurrentRoute('/forgot-password');
                    setIsOpen(false);
                  }}
                  className={`text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between ${
                    currentRoute === '/forgot-password' ? 'bg-[#a02010] text-white font-bold' : 'hover:bg-[#f1ede8] text-[#1c1c19]'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px]">vpn_key</span>
                    5. Forgot Password
                  </span>
                  <span className="text-[10px] opacity-75">Recovery</span>
                </button>

                <button
                  onClick={() => {
                    setCurrentRoute('/reset-password?token=demo-valid-token');
                    setIsOpen(false);
                  }}
                  className={`text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between ${
                    currentRoute.startsWith('/reset-password') ? 'bg-[#a02010] text-white font-bold' : 'hover:bg-[#f1ede8] text-[#1c1c19]'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px]">lock_reset</span>
                    6. Reset Password (Token link)
                  </span>
                  <span className="text-[10px] opacity-75">Token Form</span>
                </button>

                <span className="text-[10px] font-bold uppercase text-[#77574e] tracking-wider px-1 pt-2">
                  Session &amp; Security Error Pages
                </span>

                <button
                  onClick={() => {
                    setCurrentRoute('/sessions');
                    setIsOpen(false);
                  }}
                  className={`text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between ${
                    currentRoute === '/sessions' ? 'bg-[#a02010] text-white font-bold' : 'hover:bg-[#f1ede8] text-[#1c1c19]'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px]">devices</span>
                    8. Session Management (Multi-Device)
                  </span>
                  <span className="text-[10px] opacity-75">Active</span>
                </button>

                <button
                  onClick={() => {
                    setCurrentRoute('/403');
                    setIsOpen(false);
                  }}
                  className={`text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between ${
                    currentRoute === '/403' ? 'bg-[#a02010] text-white font-bold' : 'hover:bg-[#f1ede8] text-[#1c1c19]'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px] text-red-500">gavel</span>
                    9. 403 Forbidden Page (Brand Style)
                  </span>
                  <span className="text-[10px] opacity-75">Guard</span>
                </button>

                <button
                  onClick={() => {
                    setCurrentRoute('/404');
                    setIsOpen(false);
                  }}
                  className={`text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between ${
                    currentRoute === '/404' ? 'bg-[#a02010] text-white font-bold' : 'hover:bg-[#f1ede8] text-[#1c1c19]'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px] text-amber-600">help</span>
                    10. 404 Not Found Page
                  </span>
                  <span className="text-[10px] opacity-75">Fallback</span>
                </button>
              </div>
            )}

            {activeTab === 'simulations' && (
              <div className="flex flex-col gap-2">
                <p className="text-[11px] text-[#5a413c]">
                  Test edge-case state machines and failure security policies required by specs:
                </p>

                {/* Simulate OTP States */}
                <div className="bg-[#f7f3ee] p-2.5 rounded-xl border border-[#e2bfb8] flex flex-col gap-1.5">
                  <span className="text-[11px] font-bold text-[#7c0700] uppercase">
                    OTP Verification States
                  </span>
                  <button
                    onClick={() => {
                      setCurrentRoute('/otp-verification?autofill=582491');
                      setIsOpen(false);
                    }}
                    className="text-left text-xs px-2 py-1.5 bg-white hover:bg-emerald-50 text-emerald-800 rounded border border-emerald-200 flex items-center justify-between"
                  >
                    <span>✓ Simulate Valid OTP (582491)</span>
                    <span className="text-[10px] font-bold">Success</span>
                  </button>

                  <button
                    onClick={() => {
                      setCurrentRoute('/otp-verification?simulate=wrong');
                      setIsOpen(false);
                    }}
                    className="text-left text-xs px-2 py-1.5 bg-white hover:bg-red-50 text-red-800 rounded border border-red-200 flex items-center justify-between"
                  >
                    <span>✕ Simulate Wrong Code (Attempts remaining)</span>
                    <span className="text-[10px] font-bold">2 left</span>
                  </button>

                  <button
                    onClick={() => {
                      setCurrentRoute('/otp-verification?simulate=locked');
                      setIsOpen(false);
                    }}
                    className="text-left text-xs px-2 py-1.5 bg-white hover:bg-amber-50 text-amber-800 rounded border border-amber-200 flex items-center justify-between"
                  >
                    <span>🔒 Simulate 3 Fails &amp; 15m Lockout</span>
                    <span className="text-[10px] font-bold">Lockout</span>
                  </button>
                </div>

                {/* Simulate Password Reset States */}
                <div className="bg-[#f7f3ee] p-2.5 rounded-xl border border-[#e2bfb8] flex flex-col gap-1.5">
                  <span className="text-[11px] font-bold text-[#7c0700] uppercase">
                    Reset Password States
                  </span>
                  <button
                    onClick={() => {
                      setCurrentRoute('/reset-password?token=expired-token');
                      setIsOpen(false);
                    }}
                    className="text-left text-xs px-2 py-1.5 bg-white hover:bg-amber-50 text-amber-800 rounded border border-amber-200 flex items-center justify-between"
                  >
                    <span>⏰ Simulate Expired Token (Request New Link)</span>
                    <span className="text-[10px] font-bold">Expired</span>
                  </button>
                </div>

                {/* Simulate Idle Timeout Warning */}
                <div className="bg-[#f7f3ee] p-2.5 rounded-xl border border-[#e2bfb8] flex flex-col gap-1.5">
                  <span className="text-[11px] font-bold text-[#7c0700] uppercase">
                    Session Inactivity Banner
                  </span>
                  <button
                    onClick={() => {
                      setSessionExpired(true);
                      setCurrentRoute('/login?reason=idle_timeout');
                      setIsOpen(false);
                    }}
                    className="text-left text-xs px-2 py-1.5 bg-white hover:bg-red-50 text-red-800 rounded border border-red-200 flex items-center justify-between"
                  >
                    <span>⚠️ Trigger 15-Minute Idle Session Banner</span>
                    <span className="text-[10px] font-bold">Banner</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer note */}
          <div className="bg-[#f1ede8] px-4 py-2 border-t border-[#e2bfb8] text-[10px] text-[#77574e] flex items-center justify-between">
            <span>Prototype Engine: Active</span>
            <span className="font-bold text-[#7c0700]">#KaeKapaKae</span>
          </div>
        </div>
      )}
    </div>
  );
};
