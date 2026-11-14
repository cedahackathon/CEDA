/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { useAuth } from '../../context/AuthContext';
import { auth } from '../../config/firebase';
import { authService } from '../../services/authService';
import { VerificationChannel } from '../../types/auth';

export const OtpVerificationPage: React.FC = () => {
  const { currentRoute, setCurrentRoute, loginAs, language } = useAuth();

  // Search parameters from currentRoute (e.g. /otp-verification?target=...) or window.location
  const routeSearch = currentRoute.includes('?') ? currentRoute.substring(currentRoute.indexOf('?')) : window.location.search || '';
  const urlParams = new URLSearchParams(routeSearch);

  // Look up latest registered user if available
  const latestUser = authService.getLatestPendingUser();

  const paramTarget = urlParams.get('target');
  const paramChannel = urlParams.get('channel') as VerificationChannel | null;
  const autofillCode = urlParams.get('autofill') || urlParams.get('code') || '';
  const initialVid = urlParams.get('vid') || '';
  const initialWarning = urlParams.get('warning') || '';
  const simulateParam = urlParams.get('simulate') || '';

  const smsEnabled = import.meta.env.VITE_ENABLE_SMS_VERIFICATION === 'true';
  // Determine initial channel & destination
  const initialChannel: VerificationChannel =
    smsEnabled
      ? paramChannel || latestUser?.verificationChannel || 'email'
      : 'email';
  const initialTarget: string = paramTarget || (initialChannel === 'email' ? latestUser?.email || 'innovator@ceda.co.bw' : (latestUser?.phone ? `+267 ${latestUser.phone}` : '+267 71 234 567'));

  // 6 discrete digits state
  const [digits, setDigits] = useState<string[]>(() => {
    if (autofillCode.length === 6) {
      return autofillCode.split('');
    }
    return ['', '', '', '', '', ''];
  });

  const [channel, setChannel] = useState<VerificationChannel>(initialChannel);
  const [destination, setDestination] = useState<string>(initialTarget);
  const [verificationId, setVerificationId] = useState<string>(initialVid);
  const [warningMessage, setWarningMessage] = useState<string>(initialWarning);
  const [needsSignInPrompt, setNeedsSignInPrompt] = useState<boolean>(false);

  // Sync state if currentRoute changes with new query params
  useEffect(() => {
    const freshSearch = currentRoute.includes('?') ? currentRoute.substring(currentRoute.indexOf('?')) : window.location.search || '';
    const freshParams = new URLSearchParams(freshSearch);
    const freshTarget = freshParams.get('target');
    const freshChannel = freshParams.get('channel') as VerificationChannel | null;
    const freshVid = freshParams.get('vid');
    const freshCode = freshParams.get('autofill') || freshParams.get('code');
    const freshWarning = freshParams.get('warning');

    if (freshChannel && (freshChannel === 'email' || smsEnabled)) {
      setChannel(freshChannel);
    }
    if (freshTarget) {
      setDestination(freshTarget);
    } else if (freshChannel === 'email' && latestUser?.email) {
      setDestination(latestUser.email);
    } else if (freshChannel === 'sms' && latestUser?.phone) {
      setDestination(`+267 ${latestUser.phone}`);
    }
    if (freshVid) {
      setVerificationId(freshVid);
    }
    if (freshWarning !== null) {
      setWarningMessage(freshWarning);
    }
    if (freshCode && freshCode.length === 6) {
      setDigits(freshCode.split(''));
    }
  }, [currentRoute, latestUser]);

  // Expiry countdown: 5 minutes (300 seconds)
  const [expirySeconds, setExpirySeconds] = useState(268);

  // Resend cooldown timer: 30 seconds
  const [resendCooldown, setResendCooldown] = useState(30);
  const [isResending, setIsResending] = useState(false);

  // Verification states
  const [status, setStatus] = useState<'idle' | 'verifying' | 'success' | 'error' | 'locked'>('idle');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [attemptsRemaining, setAttemptsRemaining] = useState<number>(3);
  const [lockoutCooldown, setLockoutCooldown] = useState<number>(900); // 15 mins

  // Input refs for keyboard navigation
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const hasCheckedAuthOnLoad = useRef<boolean>(false);

  // Handle URL simulate parameters if triggered from demo switcher
  useEffect(() => {
    if (simulateParam === 'wrong') {
      setDigits(['9', '0', '3', '7', '1', '2']);
      setStatus('error');
      setStatusMessage('Incorrect code. 2 attempts remaining before 15-minute security lockout.');
      setAttemptsRemaining(2);
    } else if (simulateParam === 'locked') {
      setStatus('locked');
      setStatusMessage('Account is locked due to 3 failed attempts. 15-minute cooldown active.');
      setAttemptsRemaining(0);
      setLockoutCooldown(900);
    }
  }, [simulateParam]);

  // Expiry timer tick
  useEffect(() => {
    const timer = setInterval(() => {
      setExpirySeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Resend cooldown timer tick
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Lockout countdown tick
  useEffect(() => {
    if (status !== 'locked' || lockoutCooldown <= 0) return;
    const timer = setInterval(() => {
      setLockoutCooldown((prev) => {
        if (prev <= 1) {
          setStatus('idle');
          setAttemptsRemaining(3);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [status, lockoutCooldown]);

  // Focus first empty box on mount (SMS only)
  useEffect(() => {
    if (channel === 'sms' && inputRefs.current[0] && digits[0] === '') {
      inputRefs.current[0].focus();
    }
  }, [channel]);

  // Wait for Firebase Auth restoration on load and auto-activate if email is already verified
  useEffect(() => {
    if (hasCheckedAuthOnLoad.current) return;
    hasCheckedAuthOnLoad.current = true;

    let cancelled = false;
    const checkAuthAndAutoActivate = async () => {
      try {
        if (auth && typeof auth.authStateReady === 'function') {
          await auth.authStateReady();
        }
        if (cancelled) return;

        const currentUser = auth?.currentUser;
        if (!currentUser) {
          setNeedsSignInPrompt(true);
          return;
        }

        setNeedsSignInPrompt(false);
        await currentUser.reload();
        if (cancelled) return;

        if (currentUser.emailVerified) {
          const emailTarget = currentUser.email || destination;
          setChannel('email');
          if (currentUser.email) {
            setDestination(currentUser.email);
          }
          await verifyCode('', 'email', emailTarget);
        }
      } catch (err) {
        console.error('Failed to check Firebase email verification state on load:', err);
      }
    };

    void checkAuthAndAutoActivate();
    return () => {
      cancelled = true;
    };
  }, []);

  // Channel toggle
  const handleToggleChannel = () => {
    if (channel === 'sms') {
      setChannel('email');
      const emailDest = latestUser?.email || (destination.includes('@') ? destination : 'k****e@innovate.co.bw');
      setDestination(emailDest);
    } else {
      setChannel('sms');
      const phoneDest = latestUser?.phone ? `+267 ${latestUser.phone}` : (!destination.includes('@') ? destination : '+267 71 234 567');
      setDestination(phoneDest);
    }
  };

  // Input change handler (Numeric only + auto-advance)
  const handleDigitChange = (index: number, value: string) => {
    const clean = value.replace(/[^0-9]/g, '');
    const char = clean ? clean[clean.length - 1] : '';

    const next = [...digits];
    next[index] = char;
    setDigits(next);
    setStatus('idle');
    setStatusMessage('');

    if (char && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto submit if all 6 digits entered
    if (char && index === 5 && next.every((d) => d !== '')) {
      verifyCode(next.join(''));
    }
  };

  // Keyboard navigation (Arrow keys & Backspace)
  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Paste handler
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 6);
    if (!pasted) return;

    const next = [...digits];
    for (let i = 0; i < 6; i++) {
      next[i] = pasted[i] || '';
    }
    setDigits(next);

    const targetIdx = Math.min(pasted.length, 5);
    inputRefs.current[targetIdx]?.focus();

    if (pasted.length === 6) {
      verifyCode(pasted);
    }
  };

  // Verification logic
  const verifyCode = async (
    codeToVerify: string,
    channelOverride?: VerificationChannel,
    identifierOverride?: string
  ) => {
    if (status === 'locked') return;

    const effectiveChannel = channelOverride ?? channel;
    const effectiveIdentifier = identifierOverride ?? destination;

    setStatus('verifying');
    setStatusMessage('');

    try {
      const res = await authService.verifyOtp({
        identifier: effectiveIdentifier,
        otpCode: codeToVerify,
        channel: effectiveChannel,
        verificationId,
      });

      if (res.success && res.accountActivated) {
        setStatus('success');
        setStatusMessage(
          effectiveChannel === 'email'
            ? 'Email verified successfully! Activating your CEDA profile...'
            : 'Code verified successfully! Activating your CEDA profile...'
        );

        try {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 },
          });
        } catch {
          // ignore
        }

        setTimeout(() => {
          if (res.user) {
            loginAs(res.user);
          } else {
            setCurrentRoute('/dashboard');
          }
        }, 1500);
      } else {
        if (res.isLocked) {
          setStatus('locked');
          setStatusMessage(res.message);
          setAttemptsRemaining(0);
          setLockoutCooldown(res.cooldownSeconds || 900);
        } else {
          setStatus('error');
          setStatusMessage(res.message);
          if (res.attemptsRemaining !== undefined) {
            setAttemptsRemaining(res.attemptsRemaining);
          }
        }
      }
    } catch (err: unknown) {
      setStatus('error');
      setStatusMessage(err instanceof Error ? err.message : 'Verification failed.');
    }
  };

  // Resend code / verification email handler
  const handleResend = async () => {
    if (resendCooldown > 0 || isResending) return;

    setIsResending(true);
    setStatusMessage('');

    try {
      const res = await authService.resendOtp(destination, channel);
      if (!res.success) {
        setStatus('error');
        setStatusMessage(res.message);
        return;
      }

      setResendCooldown(res.cooldownSeconds || 30);
      setExpirySeconds(300);
      setDigits(['', '', '', '', '', '']);
      setWarningMessage(res.warning || '');
      setStatus('idle');
      setStatusMessage(
        res.demoCode
          ? `New code sent via ${channel.toUpperCase()}! (Demo code: ${res.demoCode})`
          : res.message
      );
      inputRefs.current[0]?.focus();
    } catch (err: unknown) {
      setStatus('error');
      setStatusMessage(err instanceof Error ? err.message : 'Failed to resend verification.');
    } finally {
      setIsResending(false);
    }
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="w-full min-h-[calc(100vh-5rem)] bg-[#fdf9f4] py-12 px-4 flex flex-col items-center justify-center">
      {/* Invisible container for Firebase Phone Auth reCAPTCHA */}
      <div id="recaptcha-container" aria-hidden="true" className="invisible fixed top-0 left-0"></div>
      {/* Container capped at 560px */}
      <div className="w-full max-w-[560px] flex flex-col items-center">
        {/* Institutional Emblem Lockup */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <img
            src="/assets/ceda-logo.png"
            alt="CEDA Logo"
            className="h-11 w-auto object-contain"
          />
          <div className="text-left border-l-2 border-[#8d706b]/40 pl-3">
            <span className="block font-headline text-sm font-bold tracking-tight text-[#1c1c19] uppercase leading-none">
              Innovation
            </span>
            <span className="block text-[11px] text-[#77574e] font-semibold tracking-widest uppercase mt-1 leading-none">
              Management Portal
            </span>
          </div>
        </div>

        {/* Main Central Authentication Card */}
        <div className="w-full bg-white rounded-2xl shadow-xl p-6 sm:p-10 relative overflow-hidden border border-[#e2bfb8] transition-all">
          {/* Accent Mineral Top Bar */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#a02010] via-[#943100] to-[#77574e]"></div>

          {/* Card Header with Security Lock Crest */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-14 h-14 rounded-full bg-[#ffd3c8]/50 text-[#a02010] flex items-center justify-center mb-3 shadow-inner">
              <span className="material-symbols-outlined text-[32px]">encrypted</span>
            </div>
            <h1 className="font-headline text-2xl font-bold text-[#1c1c19] tracking-tight">
              {language === 'Setswana' ? 'Tlhomamisa Akhaonto ya Gago' : 'Verify your account'}
            </h1>

            {/* Destination Description & Channel Switcher */}
            <div className="mt-2 flex flex-col items-center gap-1">
              <p className="text-sm text-[#5a413c]">
                {channel === 'email'
                  ? language === 'Setswana'
                    ? 'Re rometse kgolagano ya tlhomamiso kwa ho'
                    : 'We sent a verification link to'
                  : language === 'Setswana'
                  ? 'Re rometse khoutu ya dinomoro tse 6 kwa ho'
                  : 'We sent a 6-digit authentication code to'}{' '}
                <span className="font-bold text-[#1c1c19] tabular-nums tracking-wide">
                  {destination}
                </span>
              </p>

              {smsEnabled && (
                <button
                  type="button"
                  onClick={handleToggleChannel}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#a02010] hover:underline cursor-pointer focus:outline-none"
                >
                  <span className="material-symbols-outlined text-[16px]">swap_horiz</span>
                  <span>
                    {channel === 'sms'
                      ? 'Use registered email instead'
                      : 'Use SMS phone number (+267) instead'}
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* Status Message Banners */}
          <div aria-live="polite">
            {needsSignInPrompt && (
              <div
                role="status"
                className="mb-5 p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-xs text-amber-900 flex items-start justify-between gap-3 animate-in fade-in"
              >
                <div className="flex items-start gap-2.5">
                  <span className="material-symbols-outlined text-[18px] text-amber-700 shrink-0 mt-0.5">
                    login
                  </span>
                  <div className="flex flex-col">
                    <span className="font-bold">Sign in to finish verifying your email</span>
                    <span>
                      Sign in with your email and password, then open your verification link or continue below.
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentRoute('/login')}
                  className="shrink-0 px-3 py-1.5 rounded-lg bg-[#a02010] hover:bg-[#861a0d] text-white font-bold transition-colors cursor-pointer"
                >
                  Sign In
                </button>
              </div>
            )}

            {warningMessage && (
              <div
                role="status"
                className="mb-5 p-3 rounded-xl bg-amber-50 border border-amber-300 text-xs text-amber-900 flex items-start gap-2.5 animate-in fade-in"
              >
                <span className="material-symbols-outlined text-[18px] text-amber-700 shrink-0 mt-0.5">
                  warning
                </span>
                <div className="flex flex-col">
                  <span className="font-bold">Verification Link Notice</span>
                  <span>{warningMessage}</span>
                </div>
              </div>
            )}

            {status === 'idle' && statusMessage && (
              <div
                role="status"
                className="mb-5 p-3 rounded-xl bg-[#f7f3ee] border border-[#e2bfb8] text-xs text-[#1c1c19] flex items-start gap-2.5 animate-in fade-in"
              >
                <span className="material-symbols-outlined text-[18px] text-[#a02010] shrink-0 mt-0.5">
                  mark_email_read
                </span>
                <span>{statusMessage}</span>
              </div>
            )}

            {status === 'error' && (
              <div
                role="alert"
                className="mb-5 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-[#ba1a1a] flex items-start gap-2.5 animate-in fade-in"
              >
                <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">error</span>
                <div className="flex flex-col">
                  <span className="font-bold">Verification Failed</span>
                  <span>{statusMessage}</span>
                </div>
              </div>
            )}

            {status === 'locked' && (
              <div
                role="alert"
                className="mb-5 p-3 rounded-xl bg-amber-50 border border-amber-300 text-xs text-amber-900 flex items-start gap-2.5 animate-in fade-in"
              >
                <span className="material-symbols-outlined text-[18px] text-amber-700 shrink-0 mt-0.5">
                  lock_clock
                </span>
                <div className="flex flex-col">
                  <span className="font-bold">Security Lockout Active</span>
                  <span>{statusMessage}</span>
                  <span className="font-mono text-amber-800 font-bold mt-1">
                    Cooldown remaining: {formatSeconds(lockoutCooldown)}
                  </span>
                </div>
              </div>
            )}

            {status === 'success' && (
              <div
                role="status"
                className="mb-5 p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-xs text-emerald-800 flex items-start gap-2.5 animate-in fade-in"
              >
                <span className="material-symbols-outlined text-[18px] text-emerald-700 shrink-0 mt-0.5">
                  check_circle
                </span>
                <div className="flex flex-col">
                  <span className="font-bold">Verified!</span>
                  <span>{statusMessage}</span>
                </div>
              </div>
            )}
          </div>

          {/* OTP / Email Link Verification Group */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              verifyCode(channel === 'email' ? '' : digits.join(''));
            }}
            className="flex flex-col gap-6"
          >
            {channel === 'email' ? (
              <div className="rounded-xl bg-[#f7f3ee] border border-[#e2bfb8] p-5 text-center">
                <span className="material-symbols-outlined text-[32px] text-[#a02010] mb-2">
                  mark_email_unread
                </span>
                <p className="text-sm font-semibold text-[#1c1c19]">
                  Click the verification link in your email inbox
                </p>
                <p className="text-xs text-[#5a413c] mt-1.5 leading-relaxed">
                  Once you click the link, this page will activate your account automatically. If you opened the link in another tab, click &ldquo;I&apos;ve verified my email &mdash; Continue&rdquo; below.
                </p>
              </div>
            ) : (
              <div>
                <label
                  htmlFor="digit-0"
                  className="block text-xs font-bold text-[#77574e] uppercase tracking-wider text-center mb-3"
                >
                  Enter 6-Digit One-Time Password
                </label>

                {/* 6 Discrete Digit Boxes */}
                <div className="flex justify-between items-center gap-2 sm:gap-2.5 max-w-md mx-auto">
                  {digits.map((digit, idx) => (
                    <input
                      key={idx}
                      id={`digit-${idx}`}
                      ref={(el) => {
                        inputRefs.current[idx] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      pattern="[0-9]*"
                      value={digit}
                      disabled={status === 'locked' || status === 'verifying'}
                      onChange={(e) => handleDigitChange(idx, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(idx, e)}
                      onPaste={handlePaste}
                      aria-label={`Digit ${idx + 1}`}
                      className={`w-12 h-14 sm:w-14 sm:h-16 text-center font-headline text-2xl font-bold rounded-xl shadow-xs transition-all duration-200 outline-none tabular-nums ${
                        status === 'error'
                          ? 'bg-red-50/50 border-2 border-[#ba1a1a] text-[#ba1a1a]'
                          : status === 'success'
                          ? 'bg-emerald-50/50 border-2 border-emerald-600 text-emerald-800'
                          : status === 'locked'
                          ? 'bg-[#ddd9d5] border border-[#8d706b] text-[#5a413c] cursor-not-allowed'
                          : digit
                          ? 'bg-white border-2 border-[#a02010] text-[#1c1c19] shadow-sm'
                          : 'bg-[#f7f3ee] border border-[#e2bfb8] text-[#1c1c19] focus:bg-white focus:border-2 focus:border-[#a02010]'
                      }`}
                    />
                  ))}
                </div>

                {/* Paste & Accessibility Hint */}
                <div className="flex items-center justify-center gap-1.5 mt-3 text-xs text-[#5a413c]">
                  <span className="material-symbols-outlined text-[15px] text-[#77574e]">
                    content_paste
                  </span>
                  <span>Tip: You can paste the complete 6-digit code directly</span>
                </div>
              </div>
            )}

            {/* Countdown and Resend Controls Matrix */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 bg-[#f7f3ee] p-3.5 rounded-xl border border-[#e2bfb8]/60 text-xs">
              <div className="flex items-center gap-2 text-[#1c1c19]">
                <span className="material-symbols-outlined text-[#77574e] text-[18px]">
                  hourglass_top
                </span>
                <span className="text-[#5a413c]">
                  {channel === 'email' ? 'Resend available in:' : 'Code expires in:'}
                </span>
                <span className="font-mono font-bold text-[#a02010] tabular-nums">
                  {formatSeconds(channel === 'email' ? resendCooldown : expirySeconds)}
                </span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendCooldown > 0 || isResending || status === 'locked'}
                  className={`font-semibold transition-all focus:outline-none ${
                    resendCooldown > 0 || isResending || status === 'locked'
                      ? 'text-[#8d706b]/50 cursor-not-allowed'
                      : 'text-[#a02010] hover:underline cursor-pointer'
                  }`}
                >
                  {isResending
                    ? 'Sending...'
                    : channel === 'email'
                    ? 'Resend verification email'
                    : 'Resend code'}
                </button>
                {resendCooldown > 0 && (
                  <span className="text-[#77574e] tabular-nums">
                    (in {formatSeconds(resendCooldown)})
                  </span>
                )}
              </div>
            </div>

            {/* Submit Action */}
            <div className="flex flex-col gap-2">
              <button
                type="submit"
                disabled={
                  (channel === 'sms' && digits.some((d) => d === '')) ||
                  status === 'locked' ||
                  status === 'verifying' ||
                  status === 'success'
                }
                className={`w-full h-12 font-headline text-sm font-bold tracking-wide rounded-xl shadow-md transition-all flex items-center justify-center gap-2 ${
                  (channel === 'email' || digits.every((d) => d !== '')) &&
                  status !== 'locked' &&
                  status !== 'verifying' &&
                  status !== 'success'
                    ? 'bg-[#a02010] hover:bg-[#861a0d] active:bg-[#6e1409] text-white cursor-pointer hover:shadow-lg'
                    : 'bg-[#e6e2dd] text-[#8d706b] cursor-not-allowed'
                }`}
              >
                {status === 'verifying' ? (
                  <>
                    <span className="material-symbols-outlined text-[20px] animate-spin">
                      progress_activity
                    </span>
                    <span>
                      {channel === 'email' ? 'Checking email verification...' : 'Verifying code...'}
                    </span>
                  </>
                ) : status === 'success' ? (
                  <>
                    <span className="material-symbols-outlined text-[20px]">check_circle</span>
                    <span>Verified! Redirecting...</span>
                  </>
                ) : (
                  <>
                    <span>
                      {channel === 'email'
                        ? "I've verified my email — Continue"
                        : 'Verify & Continue'}
                    </span>
                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                  </>
                )}
              </button>

              <div className="flex justify-center pt-1">
                <button
                  type="button"
                  onClick={() => setCurrentRoute('/register')}
                  className="inline-flex items-center gap-1 text-xs text-[#77574e] hover:text-[#a02010] transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">edit_note</span>
                  <span>Change phone number or email address</span>
                </button>
              </div>
            </div>
          </form>

          {/* Security Notice Box */}
          <div className="mt-6 pt-4 bg-[#f7f3ee] -mx-6 sm:-mx-10 px-6 sm:px-10 pb-4 border-t border-[#e2bfb8]/60">
            <div className="flex items-start gap-2.5 text-left text-xs text-[#5a413c]">
              <span className="material-symbols-outlined text-[#a02010] text-[18px] shrink-0 mt-0.5">
                shield
              </span>
              <p className="leading-relaxed">
                <strong className="text-[#1c1c19]">Security Notice:</strong> Never share your one-time
                verification code with anyone, including CEDA loan officers or support staff. CEDA will
                never request this token over voice call.
              </p>
            </div>
          </div>
        </div>

        {/* Prototype Quick Diagnostic Controls */}
        {import.meta.env.VITE_ENABLE_DEMO_OTP === 'true' && channel === 'sms' && (
          <div className="w-full max-w-[560px] mt-4 p-3 bg-white rounded-xl border border-[#e2bfb8] flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-[#77574e] font-bold">Prototype Quick Fill:</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setDigits(['5', '8', '2', '4', '9', '1']);
                  verifyCode('582491');
                }}
                className="px-2.5 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 rounded-md font-bold transition-colors cursor-pointer"
              >
                Fill 582491 (Valid)
              </button>
              <button
                onClick={() => {
                  setDigits(['9', '0', '3', '7', '1', '2']);
                  verifyCode('903712');
                }}
                className="px-2.5 py-1 bg-red-100 hover:bg-red-200 text-red-900 rounded-md font-bold transition-colors cursor-pointer"
              >
                Simulate Wrong Code
              </button>
            </div>
          </div>
        )}

        {/* Regulatory Footnote */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-xs text-[#77574e] text-center">
          <span className="inline-flex items-center gap-1">
            <span className="material-symbols-outlined text-[16px] text-emerald-700">verified_user</span>
            <span>BDPA Compliant Data Handling</span>
          </span>
          <span>•</span>
          <span>Assistance: +267 358 7000 / enquiries@ceda.co.bw</span>
          <span>•</span>
          <span>Gaborone, Botswana</span>
        </div>
      </div>
    </div>
  );
};
