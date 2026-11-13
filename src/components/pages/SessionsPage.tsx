/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/authService';
import { UserSession } from '../../types/auth';

export const SessionsPage: React.FC = () => {
  const { currentUser, setCurrentRoute, logout } = useAuth();
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadSessions = () => {
    if (currentUser) {
      const all = authService.getActiveSessions(currentUser.id);
      // Ensure at least the current active session is present
      if (all.length === 0) {
        const curSess = authService.createSession(currentUser.id);
        setSessions([curSess]);
      } else {
        setSessions(all);
      }
      setCurrentSessionId(authService.getCurrentSessionId());
    }
  };

  useEffect(() => {
    loadSessions();
  }, [currentUser]);

  const handleTerminateSession = (sessionId: string) => {
    if (currentUser) {
      setIsLoading(true);
      setTimeout(() => {
        authService.terminateSession(sessionId, currentUser.id);
        setNotification('Session has been successfully terminated and signed out.');
        loadSessions();
        setIsLoading(false);
        setTimeout(() => setNotification(null), 4000);

        // If current session was terminated, log out
        if (sessionId === currentSessionId) {
          logout();
        }
      }, 300);
    }
  };

  const handleTerminateAllOther = () => {
    if (currentUser) {
      setIsLoading(true);
      setTimeout(() => {
        const curId = currentSessionId || authService.getCurrentSessionId() || '';
        authService.terminateAllOtherSessions(currentUser.id, curId);
        setNotification('All other active web and mobile sessions have been successfully terminated.');
        loadSessions();
        setIsLoading(false);
        setTimeout(() => setNotification(null), 4000);
      }, 350);
    }
  };

  return (
    <div className="min-h-screen bg-[#fdf9f4] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Breadcrumb & Navigation */}
        <div className="flex items-center justify-between text-xs text-[#5e4038]">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentRoute('/')}
              className="hover:text-[#a02010] font-medium transition-colors cursor-pointer"
            >
              Home
            </button>
            <span>/</span>
            <span className="text-[#a02010] font-semibold">Active Sessions &amp; Security</span>
          </div>
          <div className="text-[#7c0700] bg-[#ffd3c8]/40 px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5">
            <span className="material-symbols-outlined text-sm">security</span>
            <span>BDPA Certified Session Hardening</span>
          </div>
        </div>

        {/* Page Header */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-[#eedfd6] shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[11px] font-bold tracking-wider text-[#a02010] uppercase">
                Device Management &amp; Security
              </span>
              <h1 className="text-2xl font-extrabold text-[#31302d] font-heading mt-1">
                Active Signed-In Sessions
              </h1>
              <p className="text-sm text-[#5e4038] mt-1 max-w-xl leading-relaxed">
                Review all browsers and devices currently connected to your CEDA portal account. Inactive
                connections are automatically logged out after 15 minutes of inactivity in compliance with the Botswana Data Protection Act (BDPA 2024).
              </p>
            </div>
            {sessions.length > 1 && (
              <button
                onClick={handleTerminateAllOther}
                disabled={isLoading}
                className="self-start sm:self-center px-4 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-[#a02010] border border-red-200 font-semibold text-xs transition-colors flex items-center gap-2 focus:outline-none focus:ring-3 focus:ring-[#f8a018] cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">logout</span>
                <span>Sign Out All Other Devices</span>
              </button>
            )}
          </div>

          {notification && (
            <div className="mt-4 p-3.5 bg-green-50 border border-green-200 text-green-900 rounded-xl text-xs flex items-center gap-2 animate-in fade-in">
              <span className="material-symbols-outlined text-green-700">check_circle</span>
              <span>{notification}</span>
            </div>
          )}
        </div>

        {/* Sessions List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-bold text-[#31302d] uppercase tracking-wider">
              Connected Devices ({sessions.length})
            </h2>
            <button
              onClick={loadSessions}
              className="text-xs text-[#a02010] hover:underline flex items-center gap-1 font-semibold cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">refresh</span>
              <span>Refresh status</span>
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {sessions.map((sess) => {
              const isCurrent = sess.id === currentSessionId;
              const isMobile = sess.device.toLowerCase().includes('mobile');

              return (
                <div
                  key={sess.id}
                  className={`bg-white rounded-xl border p-5 transition-all shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    isCurrent ? 'border-[#a02010] ring-1 ring-[#a02010]/20' : 'border-[#e8dfd8]'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                        isCurrent
                          ? 'bg-[#ffd3c8]/40 text-[#a02010]'
                          : 'bg-[#fdf9f4] text-[#5e4038] border border-[#e8dfd8]'
                      }`}
                    >
                      <span className="material-symbols-outlined text-2xl">
                        {isMobile ? 'smartphone' : 'laptop_mac'}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-[#31302d]">{sess.device}</span>
                        {isCurrent && (
                          <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-800 font-semibold text-[10px] tracking-wide uppercase">
                            This Device
                          </span>
                        )}
                        <span className="text-xs text-[#5e4038] font-medium">{sess.browser}</span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#5e4038]">
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs text-[#a02010]">
                            location_on
                          </span>
                          {sess.location}
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs">wifi</span>
                          {sess.ipAddress}
                        </span>
                      </div>

                      <div className="text-[11px] text-[#5e4038]/80">
                        Last active: {new Date(sess.lastActive).toLocaleTimeString()} ({new Date(sess.lastActive).toLocaleDateString()})
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    {isCurrent ? (
                      <span className="text-xs text-green-700 font-semibold flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-50 border border-green-200">
                        <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                        Current Active Session
                      </span>
                    ) : (
                      <button
                        onClick={() => handleTerminateSession(sess.id)}
                        disabled={isLoading}
                        className="px-3.5 py-1.5 rounded-lg border border-[#cfc4bc] hover:border-red-300 hover:bg-red-50 text-[#5e4038] hover:text-[#a02010] text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[#f8a018] cursor-pointer"
                      >
                        Terminate Session
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Security Policy Information */}
        <div className="bg-[#fdf9f4] border border-[#e8dfd8] rounded-xl p-5 text-xs text-[#5e4038] space-y-2">
          <div className="flex items-center gap-2 font-bold text-[#31302d]">
            <span className="material-symbols-outlined text-[#a02010] text-base">timer</span>
            <span>Automated Inactivity SLA &amp; Security Standards</span>
          </div>
          <p className="leading-relaxed">
            In compliance with the Botswana Data Protection Act (BDPA 2024 / Act No. 32 of 2018), all active
            CEDA Innovation Portal sessions undergo cryptographic token verification. If no user interaction
            (mouse, keystroke, or scroll) is registered within 14 minutes, a 60-second warning countdown is
            initiated before automatic session termination.
          </p>
        </div>
      </div>
    </div>
  );
};
