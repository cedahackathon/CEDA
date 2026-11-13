/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useAuth } from '../../context/AuthContext';

export const IdleTimeoutModal: React.FC = () => {
  const { isIdleWarningOpen, idleCountdownSeconds, extendSession, logout, language } = useAuth();

  if (!isIdleWarningOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="idle-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border-2 border-[#a02010] p-6 flex flex-col gap-5 text-center relative overflow-hidden">
        {/* Accent Bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#a02010] via-amber-500 to-[#77574e]"></div>

        <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto shadow-inner ring-4 ring-amber-50">
          <span className="material-symbols-outlined text-[36px] animate-pulse">timer</span>
        </div>

        <div className="flex flex-col gap-1.5">
          <h2 id="idle-title" className="font-headline text-xl font-bold text-[#1c1c19]">
            {language === 'Setswana'
              ? 'Tlhokomelo ya Tshireletso ya Thulaganyo'
              : 'Session Inactivity Warning'}
          </h2>
          <p className="text-sm text-[#5a413c] leading-relaxed">
            {language === 'Setswana'
              ? 'Thulaganyo ya gago e tla tswalwa ka ntlha ya go sa dire sepe mo metsotsong e le 15, go ya ka molao wa Botswana Data Protection Act.'
              : 'You have been inactive for nearly 15 minutes. For your security under the Botswana Data Protection Act (BDPA), you will be signed out in:'}
          </p>
        </div>

        {/* Big Countdown Clock */}
        <div className="bg-[#fdf9f4] border border-[#e2bfb8] rounded-xl py-3 px-6 flex items-center justify-center gap-2">
          <span className="font-mono text-3xl font-extrabold text-[#7c0700] tabular-nums">
            00:{idleCountdownSeconds.toString().padStart(2, '0')}
          </span>
          <span className="text-xs font-semibold text-[#77574e] uppercase tracking-wider">
            seconds remaining
          </span>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <button
            type="button"
            onClick={logout}
            className="w-full sm:flex-1 h-11 rounded-lg border border-[#8d706b]/40 text-sm font-semibold text-[#5a413c] hover:bg-[#f1ede8] transition-colors"
          >
            {language === 'Setswana' ? 'Tswa jaanong' : 'Sign Out Now'}
          </button>
          <button
            type="button"
            onClick={extendSession}
            className="w-full sm:flex-1 h-11 rounded-lg bg-[#a02010] hover:bg-[#861a0d] text-white text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[18px]">refresh</span>
            <span>{language === 'Setswana' ? 'Tsweledisa Thulaganyo' : 'Extend Session'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
