/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/authService';
import { VerificationChannel } from '../../types/auth';

export const ForgotPasswordPage: React.FC = () => {
  const { setCurrentRoute, language } = useAuth();

  const [identifier, setIdentifier] = useState('kagiso.mogae@innovate.co.bw');
  const [deliveryChannel, setDeliveryChannel] = useState<VerificationChannel>('email');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [demoToken, setDemoToken] = useState<string>('demo-valid-token');
  const [demoCode, setDemoCode] = useState<string>('492815');

  // Resend cooldown timer
  const [resendCooldown, setResendCooldown] = useState(45);

  useEffect(() => {
    if (!isSent || resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [isSent, resendCooldown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await authService.requestReset({
        identifier,
        channel: deliveryChannel,
      });

      setIsSent(true);
      setResendCooldown(res.resendCooldownSeconds || 45);
      if (res.demoToken) setDemoToken(res.demoToken);
      if (res.demoCode) setDemoCode(res.demoCode);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Unable to send password reset instructions.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatSeconds = (sec: number) => {
    const s = sec < 10 ? `0${sec}` : sec;
    return `00:${s}`;
  };

  return (
    <div className="w-full min-h-[calc(100vh-5rem)] bg-[#fdf9f4] py-10 px-4 flex flex-col items-center">
      {/* Breadcrumb & Security Trust Strip */}
      <div className="w-full max-w-xl flex flex-wrap items-center justify-between gap-3 mb-6 text-xs text-[#5a413c]">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentRoute('/')}
            className="hover:text-[#a02010] transition-colors"
          >
            Home
          </button>
          <span className="text-[#8d706b]/40">/</span>
          <span className="text-[#1c1c19] font-bold">Reset Password</span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f1ede8] text-[#77574e] border border-[#e2bfb8]/50">
          <span className="material-symbols-outlined text-[15px] text-[#a02010]">verified_user</span>
          <span>256-Bit SSL • BDPA Compliant</span>
        </div>
      </div>

      {/* Institutional Identity Lockup */}
      <div className="flex flex-col items-center justify-center text-center mb-6">
        <img
          src="/assets/ceda-logo.png"
          alt="CEDA Logo"
          className="h-11 w-auto object-contain mb-2"
        />
        <div className="flex items-center gap-2">
          <span className="inline-block w-5 h-0.5 bg-[#a02010]"></span>
          <span className="font-headline text-xs tracking-wider uppercase text-[#1c1c19] font-bold">
            Innovation Management Portal
          </span>
          <span className="inline-block w-5 h-0.5 bg-[#a02010]"></span>
        </div>
        <p className="text-[10px] text-[#77574e] font-semibold tracking-widest uppercase mt-0.5">
          Republic of Botswana • #KaeKapaKae
        </p>
      </div>

      {/* Main Card: Forgot Password Form */}
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-md border border-[#e2bfb8] overflow-hidden relative">
        <div className="h-1.5 w-full bg-[#a02010]"></div>

        <div className="p-6 sm:p-8 flex flex-col gap-6">
          <div className="flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-full bg-[#ffd3c8]/40 flex items-center justify-center mb-3 text-[#a02010] shadow-sm ring-4 ring-[#f7f3ee]">
              <span className="material-symbols-outlined text-[30px]">vpn_key</span>
            </div>
            <span className="text-[11px] font-bold uppercase tracking-widest text-[#a02010] mb-1">
              Account Security &amp; Recovery
            </span>
            <h1 className="font-headline text-2xl font-bold text-[#5e4038] tracking-tight">
              {language === 'Setswana' ? 'A o Lebetse Khoutu ya Gago?' : 'Forgot your password?'}
            </h1>
            <p className="text-xs sm:text-sm text-[#5a413c] max-w-md mt-1">
              Enter your registered email or phone number and we'll send you a reset code or link.
            </p>
          </div>

          {!isSent ? (
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              {errorMessage && (
                <div
                  role="alert"
                  className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-[#a02010] font-medium flex items-start gap-2"
                >
                  <span className="material-symbols-outlined text-[18px] shrink-0">error</span>
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Single Identifier Input */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <label htmlFor="recovery-ident" className="text-xs font-bold text-[#1c1c19]">
                    Registered Email address or Botswana Mobile number{' '}
                    <span className="text-[#ba1a1a]">* Required</span>
                  </label>
                  <span className="text-[11px] text-[#77574e]">Required</span>
                </div>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-3.5 text-[#77574e] text-[18px] pointer-events-none">
                    alternate_email
                  </span>
                  <input
                    id="recovery-ident"
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="e.g. kagiso.mogae@innovate.co.bw or 72 450 891"
                    required
                    className="w-full h-12 pl-11 pr-4 rounded-xl bg-[#f7f3ee] focus:bg-white text-xs font-medium text-[#1c1c19] border border-[#e2bfb8]/60 focus:border-[#a02010]"
                  />
                </div>
                <div className="flex items-center justify-between text-[#77574e] text-[11px] pt-0.5">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px] text-[#943100]">sim_card</span>
                    <span>+267 Mascom, Orange, BTC supported</span>
                  </span>
                  <span>TIN / Omang linked</span>
                </div>
              </div>

              {/* Delivery Method Radio Cards */}
              <div className="flex flex-col gap-1.5 pt-1">
                <span className="text-xs font-bold text-[#1c1c19]">Select delivery method</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="radiogroup">
                  <label
                    className={`relative flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                      deliveryChannel === 'email'
                        ? 'border-2 border-[#a02010] bg-[#ffd3c8]/25 shadow-xs'
                        : 'border-[#e2bfb8] bg-[#f7f3ee] hover:bg-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name="delivery"
                      checked={deliveryChannel === 'email'}
                      onChange={() => setDeliveryChannel('email')}
                      className="mt-0.5 accent-[#a02010] w-4 h-4 cursor-pointer"
                    />
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-[#1c1c19]">
                        <span className="material-symbols-outlined text-[16px] text-[#a02010]">mail</span>
                        <span>Email reset link</span>
                      </div>
                      <p className="text-[11px] text-[#5a413c] mt-0.5 leading-snug">
                        Receive a secure 1-hour reset link to your inbox.
                      </p>
                    </div>
                  </label>

                  <label
                    className={`relative flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                      deliveryChannel === 'sms'
                        ? 'border-2 border-[#a02010] bg-[#ffd3c8]/25 shadow-xs'
                        : 'border-[#e2bfb8] bg-[#f7f3ee] hover:bg-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name="delivery"
                      checked={deliveryChannel === 'sms'}
                      onChange={() => setDeliveryChannel('sms')}
                      className="mt-0.5 accent-[#a02010] w-4 h-4 cursor-pointer"
                    />
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-[#1c1c19]">
                        <span className="material-symbols-outlined text-[16px] text-[#943100]">sms</span>
                        <span>SMS verification code</span>
                      </div>
                      <p className="text-[11px] text-[#5a413c] mt-0.5 leading-snug">
                        Receive a 6-digit OTP to your +267 mobile number.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={isSubmitting || !identifier.trim()}
                className="w-full h-12 rounded-xl bg-[#a02010] hover:bg-[#861a0d] active:bg-[#6e1409] text-white font-headline text-sm font-bold shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:bg-[#e6e2dd] disabled:text-[#8d706b]"
              >
                {isSubmitting ? (
                  <>
                    <span className="material-symbols-outlined text-[18px] animate-spin">
                      progress_activity
                    </span>
                    <span>Sending instructions...</span>
                  </>
                ) : (
                  <>
                    <span>Send reset instructions</span>
                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                  </>
                )}
              </button>

              <div className="flex justify-center items-center pt-1">
                <button
                  type="button"
                  onClick={() => setCurrentRoute('/login')}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#5e4038] hover:text-[#a02010] hover:underline transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                  <span>Back to login</span>
                </button>
              </div>

              <div className="p-3 bg-[#f7f3ee] rounded-xl flex items-center gap-2.5 text-xs text-[#5a413c] border border-[#e2bfb8]/50">
                <span className="material-symbols-outlined text-[18px] text-[#943100] shrink-0">info</span>
                <span>
                  For your security, password reset links expire after <strong>60 minutes</strong> and
                  single-use SMS codes expire after <strong>10 minutes</strong>.
                </span>
              </div>
            </form>
          ) : (
            /* POST-DISPATCH CONFIRMATION STATE (Explicit Anti-Enumeration Spec) */
            <div className="flex flex-col gap-5 animate-in fade-in duration-200">
              <div className="p-5 rounded-2xl bg-[#f7f4ef] border border-[#e2bfb8] flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-sm relative">
                  <span className="material-symbols-outlined text-[26px] text-[#a02010]">
                    mark_email_read
                  </span>
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-[12px] shadow-xs">
                    ✓
                  </div>
                </div>

                <div className="flex flex-col">
                  <h2 className="font-headline text-base font-bold text-[#1c1c19]">
                    Check your inbox or mobile device
                  </h2>
                  {/* Strict anti-enumeration wording */}
                  <p className="text-xs text-[#5a413c] mt-1 leading-relaxed">
                    If an account exists for this identifier, instructions have been sent. Please inspect
                    your spam or messages folder if you do not see the message within 2 minutes.
                  </p>
                </div>
              </div>

              {/* Timer & Retry Controls */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-[#f7f3ee] rounded-xl border border-[#e2bfb8]/60 text-xs">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white text-[#5a413c] font-medium shadow-xs">
                  <span className="material-symbols-outlined text-[16px] text-[#77574e]">refresh</span>
                  <span>
                    Resend in <strong className="text-[#1c1c19] tabular-nums">{formatSeconds(resendCooldown)}</strong>
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setIsSent(false)}
                  className="text-xs font-semibold text-[#a02010] hover:underline flex items-center gap-1"
                >
                  <span>Wrong details? Try another identifier</span>
                  <span className="material-symbols-outlined text-[14px]">edit</span>
                </button>
              </div>

              {/* Prototype Direct Link to Reset Screen */}
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-950 flex flex-col gap-2">
                <span className="font-bold text-amber-900 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px]">touch_app</span>
                  <span>Prototype Dispatch Simulator:</span>
                </span>
                <p className="text-[11px] text-amber-800">
                  In a live deployment, the user clicks the secure link delivered via email or inputs the SMS code.
                  Click below to open the Reset Password screen with this token:
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    onClick={() => setCurrentRoute(`/reset-password?token=${demoToken}`)}
                    className="px-3 py-1.5 bg-[#a02010] text-white font-bold rounded-lg hover:bg-[#861a0d] transition-colors"
                  >
                    Open Valid Reset Link ({demoToken.slice(0, 10)}...)
                  </button>
                  <button
                    onClick={() => setCurrentRoute('/reset-password?token=expired-token')}
                    className="px-3 py-1.5 bg-white text-amber-900 border border-amber-300 font-bold rounded-lg hover:bg-amber-100 transition-colors"
                  >
                    Test Expired Token State
                  </button>
                </div>
              </div>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setCurrentRoute('/login')}
                  className="text-xs font-semibold text-[#77574e] hover:text-[#1c1c19] underline"
                >
                  Return to Sign In
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Support Box */}
      <div className="w-full max-w-xl mt-6 p-4 bg-white rounded-xl border border-[#e2bfb8] flex flex-wrap items-center justify-between gap-3 text-xs text-[#5a413c]">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px] text-[#943100]">support_agent</span>
          <span className="font-semibold text-[#1c1c19]">Need help? Contact the CEDA Help Center</span>
        </div>
        <div className="flex items-center gap-3">
          <span>Toll Free: 1800 2332</span>
          <span>•</span>
          <a href="mailto:enquiries@ceda.co.bw" className="text-[#a02010] hover:underline font-medium">
            enquiries@ceda.co.bw
          </a>
        </div>
      </div>
    </div>
  );
};
