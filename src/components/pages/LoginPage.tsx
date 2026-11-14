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

  // Active tab: 'password' | 'otp' | 'biometric'
  const [authMethod, setAuthMethod] = useState<'password' | 'otp' | 'biometric'>('password');

  // Fields
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [rememberDevice, setRememberDevice] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  // Status
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setServerError] = useState<string | null>(null);
  const [otpSentMessage, setOtpSentMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    setIsSubmitting(true);

    try {
      const res = await authService.login({
        method: authMethod,
        identifier,
        password: authMethod === 'password' ? password : undefined,
        otpCode: authMethod === 'otp' ? otpCode : undefined,
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

  const handleSendOtp = async () => {
    setServerError(null);
    setOtpSentMessage(null);
    try {
      const channel = identifier.includes('@') ? 'email' : 'sms';
      const res = await authService.resendOtp(identifier, channel);
      setOtpSentMessage(`Authentication code sent! Use demo code: ${res.demoCode || '582491'}`);
      setOtpCode(res.demoCode || '582491');
    } catch (err: unknown) {
      setServerError(err instanceof Error ? err.message : 'Could not dispatch OTP.');
    }
  };

  const handleBiometricAuth = async () => {
    setServerError(null);
    setIsSubmitting(true);
    try {
      const res = await authService.login({
        method: 'biometric',
        identifier,
        rememberDevice: true,
      });
      if (res.success && res.user) {
        loginAs(res.user);
      } else {
        setServerError(res.message);
      }
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

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* LEFT 40% BRANDING & VALUE PANEL (5 Cols) */}
            <section className="lg:col-span-5 bg-[#31302d] text-[#f4f0eb] rounded-2xl p-6 lg:p-10 flex flex-col justify-between relative overflow-hidden shadow-xl min-h-[640px]">
              {/* Subtle Ambient Decorative Glow */}
              <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-[#a02010]/30 blur-3xl pointer-events-none"></div>
              <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-[#943100]/30 blur-3xl pointer-events-none"></div>

              {/* Content Container */}
              <div className="relative z-10 flex flex-col justify-between h-full">
                <div className="flex flex-col gap-6">
                  {/* Top Emblem Cluster */}
                  <div className="flex items-center justify-between gap-4">
                    <div className="bg-white rounded-xl p-2 px-3.5 shadow-sm inline-flex items-center gap-2.5">
                      <img
                        src="/assets/ceda-logo.png"
                        alt="CEDA Logo"
                        className="h-8 w-auto object-contain"
                      />
                      <div className="flex flex-col border-l border-[#8d706b]/40 pl-2">
                        <span className="font-headline text-[11px] leading-tight font-bold tracking-wider text-[#a02010] uppercase">
                          Innovation
                        </span>
                        <span className="text-[9px] leading-tight tracking-widest text-[#77574e] font-semibold uppercase">
                          Portal Access
                        </span>
                      </div>
                    </div>

                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#943100]/40 text-[#ffdbcf] text-xs font-bold tracking-wider uppercase border border-white/10">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#ffdbcf] animate-pulse"></span>
                      Secure Access
                    </span>
                  </div>

                  <div className="flex flex-col gap-2 mt-4">
                    <h1 className="font-headline text-2xl lg:text-3xl text-white font-bold tracking-tight">
                      Empowering Botswana's Pioneers
                    </h1>
                    <p className="text-xs sm:text-sm text-[#f4f0eb]/80 leading-relaxed">
                      Access your national innovation workspace, manage grant applications, track evaluation
                      milestones, and connect with technical advisory panels across all 10 administrative districts.
                    </p>
                  </div>

                  {/* 3 Value Pillars */}
                  <div className="flex flex-col gap-3 mt-4">
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

                {/* Left Panel Footer */}
                <div className="pt-8 mt-6 flex items-center justify-between text-xs text-[#f4f0eb]/75 border-t border-white/10">
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-amber-300">
                      Finance. Develop. Sustain.
                    </span>
                    <span className="text-[11px] text-[#f4f0eb]/60">
                      Citizen Entrepreneurial Development Agency
                    </span>
                  </div>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-white/10 text-white font-bold text-[10px]">
                    #KaeKapaKae
                  </span>
                </div>
              </div>
            </section>

            {/* RIGHT 60% LOGIN CARD CONTAINER (7 Cols) */}
            <section className="lg:col-span-7 flex flex-col gap-6">
              <div className="bg-white rounded-2xl p-6 sm:p-8 lg:p-10 shadow-sm border border-[#e2bfb8] flex flex-col gap-6">
                {/* Header */}
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-[#77574e] uppercase tracking-wider">
                    Innovator &amp; Stakeholder Access
                  </span>
                  <h2 className="font-headline text-2xl font-bold text-[#1c1c19] tracking-tight">
                    {language === 'Setswana' ? 'Re a go Amogela' : 'Welcome back'}
                  </h2>
                  <p className="text-xs text-[#5a413c]">
                    Sign in to access your Botswana Innovation workspace. Select your preferred authentication method.
                  </p>
                </div>

                {/* Segmented Control for Sign-In Method */}
                <div className="w-full bg-[#f1ede8] p-1 rounded-xl flex items-center gap-1 border border-[#e2bfb8]/50">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMethod('password');
                      setServerError(null);
                    }}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                      authMethod === 'password'
                        ? 'bg-white text-[#7c0700] shadow-sm'
                        : 'text-[#5a413c] hover:text-[#1c1c19]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">key</span>
                    <span>Password</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAuthMethod('otp');
                      setServerError(null);
                    }}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                      authMethod === 'otp'
                        ? 'bg-white text-[#7c0700] shadow-sm'
                        : 'text-[#5a413c] hover:text-[#1c1c19]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">sms</span>
                    <span>One-time code</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAuthMethod('biometric');
                      setServerError(null);
                    }}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                      authMethod === 'biometric'
                        ? 'bg-white text-[#7c0700] shadow-sm'
                        : 'text-[#5a413c] hover:text-[#1c1c19]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">fingerprint</span>
                    <span>Face or fingerprint</span>
                  </button>
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

                {/* TAB 1: PASSWORD FORM */}
                {authMethod === 'password' && (
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
                )}

                {/* TAB 2: ONE-TIME PASSCODE FORM */}
                {authMethod === 'otp' && (
                  <div className="flex flex-col gap-4 animate-in fade-in duration-150">
                    <div className="p-4 rounded-xl bg-[#f7f3ee] border border-[#e2bfb8]/60 flex items-start gap-3 text-xs">
                      <span className="material-symbols-outlined text-[#a02010] text-[22px] shrink-0 mt-0.5">
                        mark_chat_unread
                      </span>
                      <div className="flex flex-col gap-0.5">
                        <span className="font-bold text-[#1c1c19]">
                          Passwordless Mobile Authentication
                        </span>
                        <p className="text-[#5a413c]">
                          Dispatches a single-use numeric code to your verified Botswana SIM (+267) or email.
                        </p>
                      </div>
                    </div>

                    {otpSentMessage && (
                      <div className="p-3 bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 rounded-lg flex items-center gap-2">
                        <span className="material-symbols-outlined text-[16px]">check_circle</span>
                        <span>{otpSentMessage}</span>
                      </div>
                    )}

                    <div className="flex flex-col gap-1">
                      <label htmlFor="login-otp-ident" className="text-xs font-bold text-[#1c1c19]">
                        Registered Mobile Number or Email <span className="text-[#ba1a1a]">*</span>
                      </label>
                      <div className="flex gap-2">
                        <input
                          id="login-otp-ident"
                          type="text"
                          value={identifier}
                          onChange={(e) => setIdentifier(e.target.value)}
                          placeholder="e.g. 71 234 567 or email"
                          className="flex-1 h-11 px-3.5 bg-[#f7f3ee] focus:bg-white rounded-lg text-xs font-medium text-[#1c1c19] border border-[#e2bfb8]/60 focus:border-[#a02010]"
                        />
                        <button
                          type="button"
                          onClick={handleSendOtp}
                          className="px-4 h-11 bg-white hover:bg-[#f1ede8] text-[#a02010] border border-[#a02010] text-xs font-bold rounded-lg transition-colors shrink-0"
                        >
                          Send Code
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label htmlFor="login-otp-code" className="text-xs font-bold text-[#1c1c19]">
                        Enter 6-Digit Code <span className="text-[#ba1a1a]">*</span>
                      </label>
                      <input
                        id="login-otp-code"
                        type="text"
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value)}
                        placeholder="e.g. 582491"
                        maxLength={6}
                        className="w-full h-11 px-3.5 bg-[#f7f3ee] focus:bg-white rounded-lg text-sm font-mono font-bold tracking-widest text-[#1c1c19] border border-[#e2bfb8]/60 focus:border-[#a02010]"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={isSubmitting || otpCode.length < 6}
                      className="w-full h-12 bg-[#a02010] hover:bg-[#861a0d] text-white font-headline text-sm font-bold rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:bg-[#e6e2dd] disabled:text-[#8d706b]"
                    >
                      <span>Verify &amp; Sign In</span>
                      <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                    </button>
                  </div>
                )}

                {/* TAB 3: BIOMETRIC AUTH */}
                {authMethod === 'biometric' && (
                  <div className="flex flex-col items-center text-center p-6 bg-[#f7f3ee] rounded-xl border border-[#e2bfb8]/60 gap-4 animate-in fade-in duration-150">
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-full bg-white shadow-sm flex items-center justify-center text-[#a02010]">
                        <span className="material-symbols-outlined text-3xl">fingerprint</span>
                      </div>
                      <div className="w-14 h-14 rounded-full bg-white shadow-sm flex items-center justify-center text-[#a02010]">
                        <span className="material-symbols-outlined text-3xl">face</span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <h3 className="font-headline text-base font-bold text-[#1c1c19]">
                        Biometric Instant Access
                      </h3>
                      <p className="text-xs text-[#5a413c] max-w-sm">
                        Use your device's TouchID, Face recognition, or hardware FIDO2 passkey registered with your CEDA profile.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleBiometricAuth}
                      disabled={isSubmitting}
                      className="px-8 h-11 bg-[#a02010] hover:bg-[#861a0d] text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px]">contactless</span>
                      <span>Authenticate with Biometrics</span>
                    </button>
                  </div>
                )}

                {/* Alternative Sign-In Options Cards */}
                <div className="pt-2 border-t border-[#e2bfb8]/50 flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-px bg-[#e2bfb8]/60 flex-1"></div>
                    <span className="text-[11px] font-bold text-[#77574e] uppercase tracking-wider">
                      Alternative Sign-In Options
                    </span>
                    <div className="h-px bg-[#e2bfb8]/60 flex-1"></div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
                    <div className="bg-[#f7f3ee] p-3.5 rounded-xl border border-[#e2bfb8]/60 flex flex-col justify-between gap-2">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[#1c1c19]">One-Time Code (OTP)</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#ffdbcf] text-[#6d2200]">
                            Instant SMS
                          </span>
                        </div>
                        <p className="text-[11px] text-[#5a413c] mt-1">
                          Fast login without a password. Enter your registered Mascom, Orange, or BTC phone.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAuthMethod('otp')}
                        className="w-full py-1.5 bg-white hover:bg-[#ebe8e3] rounded-lg text-xs font-bold text-[#77574e] transition-colors border border-[#e2bfb8]/60 flex items-center justify-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[14px]">sms</span>
                        <span>Use One-Time Code</span>
                      </button>
                    </div>

                    <div className="bg-[#f7f3ee] p-3.5 rounded-xl border border-[#e2bfb8]/60 flex flex-col justify-between gap-2">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[#1c1c19]">Biometric Sign-In</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#e6e2dd] text-[#5a413c]">
                            Passkey
                          </span>
                        </div>
                        <p className="text-[11px] text-[#5a413c] mt-1">
                          Use device fingerprint or face recognition for passwordless instant access.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAuthMethod('biometric')}
                        className="w-full py-1.5 bg-white hover:bg-[#ebe8e3] rounded-lg text-xs font-bold text-[#77574e] transition-colors border border-[#e2bfb8]/60 flex items-center justify-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[14px]">fingerprint</span>
                        <span>Use Biometrics</span>
                      </button>
                    </div>
                  </div>
                </div>

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

              {/* Sub-Card Institutional Help Guidance */}
              <div className="px-2 flex flex-col gap-2 text-xs text-[#77574e]">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-[#a02010]">info</span>
                  <span>
                    Evaluators, adjudicators and CEDA administrators sign in with their authorized CEDA official email (
                    <strong className="text-[#1c1c19]">@ceda.co.bw</strong>).
                  </span>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <span>
                    Need login assistance? <strong className="text-[#1c1c19]">Toll Free: 1800 2332</strong>
                  </span>
                  <span>
                    CEDA Support Desk:{' '}
                    <a href="mailto:enquiries@ceda.co.bw" className="font-bold text-[#a02010] underline">
                      enquiries@ceda.co.bw
                    </a>
                  </span>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>

      {/* Universal Nationwide Access Ribbon Banner */}
      <section className="w-full bg-[#f1ede8] py-4 mt-8 border-t border-[#e2bfb8]/50">
        <div className="max-w-[1200px] mx-auto px-4 md:px-8 flex flex-col md:flex-row items-center justify-between gap-3 text-center md:text-left text-xs text-[#5a413c]">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#a02010] text-[18px]">public</span>
            <span className="font-bold text-[#1c1c19]">Universal Nationwide Access</span>
          </div>
          <p>
            Applications processed equally across all administrative districts:{' '}
            <span className="font-medium text-[#1c1c19]">
              Gaborone, Francistown, Maun, Kasane, Palapye, Ghanzi, Tsabong.
            </span>
          </p>
          <span className="font-bold text-[#7c0700] uppercase tracking-wider">#KaeKapaKae</span>
        </div>
      </section>
    </div>
  );
};
