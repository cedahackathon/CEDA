/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/authService';

export const LoginPage: React.FC = () => {
  const { setCurrentRoute, loginAs, sessionExpired, setSessionExpired, language } = useAuth();

  // URL search params
  const urlParams = new URLSearchParams(window.location.search || '');
  const isIdleExpired = urlParams.get('reason') === 'idle_timeout' || sessionExpired;

  // Fields
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [rememberDevice, setRememberDevice] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  // Status
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setServerError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    setIsSubmitting(true);

    try {
      const res = await authService.login({
        method: 'password',
        identifier,
        password,
        rememberDevice,
      });

      if (res.success && res.user) {
        setSessionExpired(false);
        loginAs(res.user);
      } else {
        setServerError(res.message);
      }
    } catch (err: unknown) {
      setServerError(err instanceof Error ? err.message : 'Sign in failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full flex flex-col bg-[#fdf9f4]">
      {/* Top Utility & Security Bar */}
      <section className="w-full bg-[#f7f3ee] border-b border-[#e2bfb8]/50">
        <div className="max-w-[1200px] mx-auto px-4 md:px-8 py-3 flex flex-wrap items-center justify-between gap-3 text-xs text-[#5a413c]">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentRoute('/')}
              className="hover:text-[#a02010] transition-colors font-medium flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[15px]">home</span>
              <span>Home</span>
            </button>
            <span className="text-[#8d706b]/40">›</span>
            <span className="text-[#1c1c19] font-bold">Innovator Sign In</span>
          </div>

          <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-full shadow-xs border border-[#e2bfb8]/60">
            <span className="material-symbols-outlined text-[#a02010] text-[16px]">verified_user</span>
            <span className="font-medium text-[#77574e]">256-Bit SSL Encrypted • BDPA Compliant</span>
          </div>
        </div>
      </section>

      {/* Main Split Screen Container */}
      <main className="w-full py-8 lg:py-12">
        <div className="max-w-[1200px] mx-auto px-4 md:px-8">
          {/* Inactivity Session Expiration Banner */}
          {isIdleExpired && (
            <div
              role="alert"
              className="mb-6 p-4 rounded-xl bg-amber-50 border-2 border-amber-300 text-amber-950 flex items-start justify-between gap-3 shadow-sm animate-in fade-in"
            >
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-amber-700 text-[24px] mt-0.5 shrink-0">
                  timer_off
                </span>
                <div className="flex flex-col text-xs leading-relaxed">
                  <span className="font-bold text-sm text-amber-900">
                    Session Inactivity Expiry Notice
                  </span>
                  <span>
                    Your session was safely terminated after 15 minutes of inactivity in compliance with
                    the Botswana Data Protection Act (BDPA). Please sign in to resume your workspace.
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSessionExpired(false)}
                className="text-amber-800 hover:text-amber-950 p-1"
                aria-label="Dismiss banner"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 items-stretch shadow-md rounded-2xl overflow-hidden bg-white border border-[#e2bfb8]">
            {/* LEFT 40% BRANDING & VALUE PANEL (5 Cols) */}
            <section className="lg:col-span-5 bg-[#31302d] text-[#f4f0eb] p-6 lg:p-10 flex flex-col justify-center relative overflow-hidden">
              {/* Subtle Ambient Decorative Glow */}
              <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-[#a02010]/30 blur-3xl pointer-events-none"></div>
              <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-[#943100]/30 blur-3xl pointer-events-none"></div>

              {/* Content Container */}
              <div className="relative z-10 flex flex-col justify-center">
                <div className="flex flex-col gap-6">
                  <div>
                    <h1 className="font-headline text-2xl lg:text-[28px] text-white font-bold tracking-tight whitespace-nowrap">
                      Fueling Bold Ideas
                    </h1>
                  </div>

                  {/* 3 Value Pillars */}
                  <div className="flex flex-col gap-3">
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
                      <div className="w-9 h-9 rounded-lg bg-[#a02010] text-white flex items-center justify-center shrink-0 shadow-sm">
                        <span className="material-symbols-outlined text-[18px]">enhanced_encryption</span>
                      </div>
                      <div className="flex flex-col">
                        <h2 className="text-xs font-bold text-white">Bank-Grade Encryption</h2>
                        <p className="text-[11px] text-[#f4f0eb]/75 mt-0.5">
                          Strict BDPA compliant sessions with 256-bit cryptographic session tokens.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
                      <div className="w-9 h-9 rounded-lg bg-[#943100] text-[#ffdbcf] flex items-center justify-center shrink-0 shadow-sm">
                        <span className="material-symbols-outlined text-[18px]">timeline</span>
                      </div>
                      <div className="flex flex-col">
                        <h2 className="text-xs font-bold text-white">Real-Time Pipeline Tracking</h2>
                        <p className="text-[11px] text-[#f4f0eb]/75 mt-0.5">
                          Track proposal lifecycle from initial CIPA screening to Board adjudication.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
                      <div className="w-9 h-9 rounded-lg bg-[#77574e] text-white flex items-center justify-center shrink-0 shadow-sm">
                        <span className="material-symbols-outlined text-[18px]">badge</span>
                      </div>
                      <div className="flex flex-col">
                        <h2 className="text-xs font-bold text-white">Multi-Role Gateway</h2>
                        <p className="text-[11px] text-[#f4f0eb]/75 mt-0.5">
                          Innovators, accredited mentors, and sector adjudicators access tailored dashboards.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* RIGHT 60% LOGIN CARD CONTAINER (7 Cols) */}
            <section className="lg:col-span-7 bg-white flex flex-col">
              <div className="p-6 sm:p-8 lg:p-10 flex flex-col justify-between gap-6 h-full">
                {/* Header */}
                <div className="flex flex-col gap-1">
                  <h2 className="font-headline text-2xl font-bold text-[#1c1c19] tracking-tight">
                    {language === 'Setswana' ? 'Re a go Amogela' : 'Welcome back'}
                  </h2>
                  <p className="text-xs text-[#5a413c]">
                    Sign in with your email and password to access your Botswana Innovation workspace.
                  </p>
                </div>

                {/* Error Banner */}
                {errorMessage && (
                  <div
                    role="alert"
                    className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-[#ba1a1a] flex items-start gap-2.5 animate-in fade-in"
                  >
                    <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">error</span>
                    <div className="flex flex-col">
                      <span className="font-bold">Authentication Failed</span>
                      <span>{errorMessage}</span>
                    </div>
                  </div>
                )}

                {/* PASSWORD FORM */}
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1">
                      <label htmlFor="login-ident" className="text-xs font-bold text-[#1c1c19] flex items-center justify-between">
                        <span>Email address or phone number <span className="text-[#ba1a1a]">*</span></span>
                        <span className="text-[11px] text-[#77574e] font-normal">Omang / Mobile linked</span>
                      </label>
                      <div className="relative flex items-center">
                        <input
                          id="login-ident"
                          type="text"
                          value={identifier}
                          onChange={(e) => setIdentifier(e.target.value)}
                          placeholder="e.g. name@domain.co.bw or 71 234 567"
                          required
                          className="w-full h-11 px-4 bg-[#f7f3ee] focus:bg-white rounded-lg text-xs font-medium text-[#1c1c19] border border-[#e2bfb8]/60 focus:border-[#a02010]"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <label htmlFor="login-pwd" className="text-xs font-bold text-[#1c1c19]">
                          Password <span className="text-[#ba1a1a]">*</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => setCurrentRoute('/forgot-password')}
                          className="text-xs font-bold text-[#a02010] hover:underline"
                        >
                          Forgot password?
                        </button>
                      </div>
                      <div className="relative flex items-center">
                        <input
                          id="login-pwd"
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Enter your password"
                          required
                          className="w-full h-11 pl-4 pr-11 bg-[#f7f3ee] focus:bg-white rounded-lg text-xs font-medium text-[#1c1c19] border border-[#e2bfb8]/60 focus:border-[#a02010]"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 text-[#77574e] hover:text-[#1c1c19]"
                          aria-label="Toggle password visibility"
                        >
                          <span className="material-symbols-outlined text-[20px]">
                            {showPassword ? 'visibility_off' : 'visibility'}
                          </span>
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={rememberDevice}
                          onChange={(e) => setRememberDevice(e.target.checked)}
                          className="w-4 h-4 accent-[#a02010] rounded cursor-pointer"
                        />
                        <span className="text-xs text-[#1c1c19] font-medium">Remember this device</span>
                      </label>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full h-12 bg-[#a02010] hover:bg-[#861a0d] active:bg-[#6e1409] text-white font-headline text-sm font-bold tracking-wide rounded-lg shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {isSubmitting ? (
                        <>
                          <span className="material-symbols-outlined text-[18px] animate-spin">
                            progress_activity
                          </span>
                          <span>Signing in...</span>
                        </>
                      ) : (
                        <>
                          <span>Sign in to Portal</span>
                          <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                        </>
                      )}
                    </button>
                  </form>

                {/* Create Account Link */}
                <div className="flex items-center justify-center gap-2 text-center text-xs text-[#5a413c] pt-2">
                  <span>New to the Botswana Innovation Portal?</span>
                  <button
                    type="button"
                    onClick={() => setCurrentRoute('/register')}
                    className="font-bold text-[#a02010] hover:underline inline-flex items-center gap-0.5"
                  >
                    <span>Create an account</span>
                    <span className="material-symbols-outlined text-[14px]">arrow_outward</span>
                  </button>
                </div>

                {/* Security Session Advisory */}
                <div className="p-3.5 rounded-xl bg-[#f7f3ee] border border-[#e2bfb8]/60 flex items-start gap-3 text-xs text-[#5a413c]">
                  <span className="material-symbols-outlined text-[#a02010] text-[18px] shrink-0 mt-0.5">
                    security
                  </span>
                  <div>
                    <span className="font-bold text-[#1c1c19]">Data Protection &amp; Session Guard</span>
                    <p className="text-[11px] mt-0.5 leading-relaxed">
                      Protected by multi-factor authentication. Sessions end after 15 minutes of inactivity for your data security in compliance with the Botswana Data Protection Act (BDPA).
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>

      {/* Universal Nationwide Access Ribbon Banner */}
      <section className="w-full bg-[#f1ede8] py-4 mt-8 border-t border-[#e2bfb8]/50">
        <div className="max-w-[1200px] mx-auto px-4 md:px-8 flex flex-col md:flex-row items-center justify-between gap-3 text-center md:text-left text-xs text-[#5a413c]">
          <p>Applications processed equally across all administrative districts.</p>
          <span className="font-bold text-[#7c0700] uppercase tracking-wider">#KaeKapaKae</span>
        </div>
      </section>
    </div>
  );
};
