/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { ROLE_CONFIGS } from '../../config/roles';

export const ForbiddenPage: React.FC = () => {
  const { currentUser, setCurrentRoute, language } = useAuth();
  const roleConfig = currentUser ? ROLE_CONFIGS[currentUser.role] : null;

  return (
    <div className="w-full min-h-[75vh] flex flex-col items-center justify-center py-16 px-4">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-xl border border-[#e2bfb8] p-8 md:p-10 text-center relative overflow-hidden">
        {/* Top Accent Strip */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#a02010]"></div>

        {/* Security Shield Crest */}
        <div className="w-16 h-16 rounded-full bg-red-100 text-[#ba1a1a] flex items-center justify-center mx-auto mb-4 shadow-sm ring-4 ring-red-50">
          <span className="material-symbols-outlined text-[36px]">shield_lock</span>
        </div>

        <span className="inline-block px-3 py-1 rounded-full bg-[#ffdad4] text-[#7c0700] text-xs font-bold uppercase tracking-wider mb-2">
          HTTP Error 403 • BDPA Restricted
        </span>

        <h1 className="font-headline text-2xl md:text-3xl font-bold text-[#1c1c19] tracking-tight">
          {language === 'Setswana' ? 'Tshireletso: Ga o a dumelelwa' : 'Access Restricted to Authorized Personnel'}
        </h1>

        <p className="text-sm text-[#5a413c] mt-3 leading-relaxed">
          {language === 'Setswana'
            ? 'Maemo a gago a thulaganyo ga a dumelele go tsena mo karolong e. Ditlhopho tsotlhe tsa tsamaiso di kwadilwe mo polokelong ya CEDA ya setshaba.'
            : 'You do not have the required administrative or statutory privileges to view this adjudication workspace. Dual-blind scoring and quorum sign-offs strictly isolate candidate dossiers to appointed reviewers.'}
        </p>

        {currentUser && (
          <div className="my-6 p-4 rounded-xl bg-[#f7f3ee] border border-[#e2bfb8]/60 text-left text-xs flex flex-col gap-1.5">
            <div className="flex items-center justify-between font-semibold">
              <span className="text-[#77574e]">Your Active Role:</span>
              <span className="text-[#a02010] uppercase font-bold">{currentUser.role}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#77574e]">Account Holder:</span>
              <span className="text-[#1c1c19] font-medium">{currentUser.fullName} ({currentUser.email})</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#77574e]">Audit Reference:</span>
              <span className="font-mono text-[11px] text-[#77574e]">BDPA-AUDIT-{Date.now().toString(36).toUpperCase()}</span>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          {currentUser && roleConfig ? (
            <button
              onClick={() => setCurrentRoute(roleConfig.landingRoute)}
              className="w-full sm:w-auto h-11 px-6 rounded-lg bg-[#a02010] text-white font-semibold text-sm hover:bg-[#861a0d] shadow-sm transition-all flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">space_dashboard</span>
              <span>Go to My Authorized Dashboard</span>
            </button>
          ) : (
            <button
              onClick={() => setCurrentRoute('/login')}
              className="w-full sm:w-auto h-11 px-6 rounded-lg bg-[#a02010] text-white font-semibold text-sm hover:bg-[#861a0d] shadow-sm transition-all"
            >
              Sign In with Authorized Account
            </button>
          )}

          <button
            onClick={() => setCurrentRoute('/')}
            className="w-full sm:w-auto h-11 px-6 rounded-lg border border-[#8d706b]/40 text-[#5a413c] hover:bg-[#f1ede8] font-semibold text-sm transition-colors"
          >
            Portal Home
          </button>
        </div>

        <p className="text-[11px] text-[#77574e] mt-6 flex items-center justify-center gap-1">
          <span className="material-symbols-outlined text-[14px]">call</span>
          <span>Contact CEDA IT Security Toll Free: 1800 2332 or email enquiries@ceda.co.bw</span>
        </p>
      </div>
    </div>
  );
};
