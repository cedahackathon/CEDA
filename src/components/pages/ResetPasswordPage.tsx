/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/authService';
import { PasswordResetForm } from '../auth/PasswordResetForm';

interface ResetPasswordPageProps {
  initialToken?: string;
}

export const ResetPasswordPage: React.FC<ResetPasswordPageProps> = ({ initialToken }) => {
  const { currentRoute, setCurrentRoute } = useAuth();

  // Redirect to /auth/action only if an oobCode query parameter is present
  useEffect(() => {
    const queryString = currentRoute.includes('?')
      ? currentRoute.split('?')[1]
      : window.location.search;
    const params = new URLSearchParams(queryString);
    const oobCode = params.get('oobCode');
    if (oobCode) {
      const nextParams = new URLSearchParams();
      nextParams.set('mode', params.get('mode') || 'resetPassword');
      nextParams.set('oobCode', oobCode);
      const lang = params.get('lang');
      if (lang) nextParams.set('lang', lang);
      const target = `/auth/action?${nextParams.toString()}`;
      window.history.replaceState(null, '', target);
      setCurrentRoute(target);
    }
  }, [currentRoute, setCurrentRoute]);

  // Read token from URL param or props
  const [token, setToken] = useState<string>(() => {
    if (initialToken) return initialToken;
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('token') || '';
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isTokenExpired, setIsTokenExpired] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Check if initial token is already set to simulated expired state
  useEffect(() => {
    if (token === 'expired-token') {
      setIsTokenExpired(true);
    }
  }, [token]);

  const handlePasswordSubmit = async (newPassword: string, confirmPassword: string) => {
    if (isLoading || isTokenExpired) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await authService.resetPassword({
        tokenOrCode: token,
        newPassword,
        confirmPassword,
      });

      if (response.success) {
        setIsSuccess(true);
        try {
          confetti({
            particleCount: 80,
            spread: 60,
            origin: { y: 0.6 },
            colors: ['#a02010', '#ffd3c8', '#f8a018', '#2e7d32'],
          });
        } catch {
          // ignore canvas error in headless environments
        }
      } else {
        if (response.isTokenExpired) {
          setIsTokenExpired(true);
        }
        setErrorMessage(response.message);
      }
    } catch {
      setErrorMessage('A network or server error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const tokenTopSlot = (
    <>
      {(token === 'demo-valid-token' ||
        token === 'expired-token' ||
        import.meta.env.VITE_ENABLE_DEMO_OTP === 'true') && (
        <div className="bg-[#fdf9f4] p-3 rounded-lg border border-[#e8dfd8] text-xs">
          <div className="flex justify-between items-center text-[#5e4038] mb-1">
            <span className="font-medium">Reset Token / Authorization Code:</span>
            <span className="text-[10px] bg-white px-2 py-0.5 rounded border border-[#cfc4bc]">
              Seed / Demo
            </span>
          </div>
          <input
            type="text"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Enter reset token or code"
            className="w-full text-xs font-mono px-2.5 py-1.5 bg-white border border-[#cfc4bc] rounded focus:outline-none focus:ring-2 focus:ring-[#f8a018]"
          />
          <div className="flex gap-2 mt-1.5 text-[10px] text-[#5e4038]">
            <span>Quick presets:</span>
            <button
              type="button"
              onClick={() => {
                setToken('demo-valid-token');
                setIsTokenExpired(false);
              }}
              className="text-[#a02010] hover:underline font-semibold cursor-pointer"
            >
              Valid Token
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => {
                setToken('expired-token');
                setIsTokenExpired(true);
              }}
              className="text-red-700 hover:underline font-semibold cursor-pointer"
            >
              Expired Token
            </button>
          </div>
        </div>
      )}

      {!token && (
        <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900">
          Open the password reset link from your email inbox or{' '}
          <button
            type="button"
            onClick={() => setCurrentRoute('/forgot-password')}
            className="font-bold text-[#a02010] hover:underline cursor-pointer"
          >
            request a new reset email
          </button>
          .
        </div>
      )}
    </>
  );

  const sessionInvalidationSlot = (
    <div className="p-3.5 rounded-xl bg-[#fdf9f4] border border-[#e8dfd8] flex items-start gap-3">
      <span className="material-symbols-outlined text-[#5e4038] text-lg mt-0.5" aria-hidden="true">
        phonelink_lock
      </span>
      <div className="text-xs text-[#5e4038] leading-relaxed">
        <span className="font-semibold text-[#31302d] block">
          Active Session Invalidation:
        </span>
        For your security, confirming this change will safely log you out of all active web and mobile sessions.
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#fdf9f4] text-[#31302d] flex flex-col justify-between">
      {/* Top Utility Bar */}
      <div className="border-b border-[#e8dfd8] bg-white/70 px-4 py-2.5 sm:px-8">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between text-xs text-[#5e4038]">
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setCurrentRoute('/')}
              className="hover:text-[#a02010] font-medium transition-colors cursor-pointer"
            >
              Home
            </button>
            <span>/</span>
            <span>Security</span>
            <span>/</span>
            <span className="text-[#a02010] font-semibold">Reset Password</span>
          </div>
          <div className="flex items-center space-x-2 text-[#7c0700] bg-[#ffd3c8]/30 px-2.5 py-0.5 rounded-full font-medium">
            <span className="material-symbols-outlined text-sm" aria-hidden="true">lock</span>
            <span>256-Bit SSL • BDPA Compliant</span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-xl w-full mx-auto px-4 py-8 sm:py-12 flex flex-col items-center">
        {/* Brand Lockup */}
        <div className="text-center mb-8">
          <div className="flex flex-col items-center gap-1.5">
            <img
              src="/assets/ceda-logo.png"
              alt="CEDA - Citizen Entrepreneurial Development Agency"
              className="h-12 w-auto object-contain mx-auto"
            />
            <div className="text-center mt-1">
              <span className="block text-xs tracking-widest font-bold text-[#1c1c19] uppercase">
                INNOVATION MANAGEMENT PORTAL
              </span>
              <p className="text-[10px] font-semibold text-[#5e4038] tracking-widest mt-0.5">
                REPUBLIC OF BOTSWANA • #KAEKAPAKAE
              </p>
            </div>
          </div>
        </div>

        {/* Card */}
        <div className="w-full bg-white rounded-2xl shadow-xl border border-[#eedfd6] overflow-hidden transition-all">
          {/* Header Top Accent */}
          <div className="h-2 bg-gradient-to-r from-[#7c0700] via-[#a02010] to-[#f8a018]" />

          {/* Expired Token State */}
          {isTokenExpired ? (
            <div className="p-8 text-center space-y-6" role="alert">
              <div className="mx-auto w-16 h-16 rounded-full bg-red-100 text-[#a02010] flex items-center justify-center">
                <span className="material-symbols-outlined text-3xl" aria-hidden="true">history_toggle_off</span>
              </div>

              <div>
                <span className="text-[11px] font-bold tracking-wider text-[#a02010] uppercase">
                  Security Notification
                </span>
                <h1 className="text-2xl font-extrabold text-[#31302d] mt-1 font-heading">
                  Reset Link Expired
                </h1>
                <p className="text-sm text-[#5e4038] mt-2 max-w-sm mx-auto leading-relaxed">
                  This password reset link or verification code has expired or has already been used.
                  For your protection, reset links remain valid for 60 minutes.
                </p>
              </div>

              <div className="bg-[#fdf9f4] border border-[#e8dfd8] rounded-xl p-4 text-xs text-[#5e4038] text-left space-y-1">
                <p className="font-semibold text-[#31302d]">Botswana Data Protection Act (BDPA) Safeguard:</p>
                <p>Expired security tokens are automatically purged to prevent unauthorized account takeover.</p>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => setCurrentRoute('/forgot-password')}
                  className="flex-1 py-3 px-5 rounded-xl bg-[#a02010] hover:bg-[#86190c] text-white font-semibold text-sm transition-all shadow-md focus:outline-none focus:ring-3 focus:ring-[#f8a018] flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-lg" aria-hidden="true">outgoing_mail</span>
                  <span>Request New Link</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentRoute('/login')}
                  className="py-3 px-5 rounded-xl border border-[#cfc4bc] text-[#5e4038] hover:bg-[#fdf9f4] font-medium text-sm transition-all focus:outline-none focus:ring-3 focus:ring-[#f8a018] cursor-pointer"
                >
                  Return to Login
                </button>
              </div>
            </div>
          ) : isSuccess ? (
            /* Success State */
            <div className="p-8 text-center space-y-6" role="status" aria-live="polite">
              <div className="mx-auto w-16 h-16 rounded-full bg-green-100 text-green-700 flex items-center justify-center">
                <span className="material-symbols-outlined text-4xl" aria-hidden="true">verified_user</span>
              </div>

              <div>
                <span className="text-[11px] font-bold tracking-wider text-green-800 uppercase">
                  Credentials Updated
                </span>
                <h1 className="text-2xl font-extrabold text-[#31302d] mt-1 font-heading">
                  Password successfully updated
                </h1>
                <p className="text-sm text-[#5e4038] mt-2 max-w-md mx-auto leading-relaxed">
                  Your CEDA portal credentials have been changed. In accordance with security protocols,
                  all other active web and mobile sessions have been safely terminated.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#fdf9f4] border border-[#e8dfd8] text-xs text-[#5e4038] text-left flex items-start gap-3">
                <span className="material-symbols-outlined text-[#a02010] text-lg mt-0.5" aria-hidden="true">shield</span>
                <div>
                  <p className="font-semibold text-[#31302d]">Security Confirmation</p>
                  <p>Encrypted using bcrypt cost factor 12. You may now sign in using your new credentials.</p>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setCurrentRoute('/login')}
                  className="w-full py-3.5 px-6 rounded-xl bg-[#a02010] hover:bg-[#86190c] text-white font-bold text-sm tracking-wide transition-all shadow-md focus:outline-none focus:ring-3 focus:ring-[#f8a018] flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Proceed to Login</span>
                  <span className="material-symbols-outlined text-lg" aria-hidden="true">arrow_forward</span>
                </button>
              </div>
            </div>
          ) : (
            /* Form State (reuses shared PasswordResetForm) */
            <div className="p-6 sm:p-8" aria-live="polite">
              <PasswordResetForm
                onSubmitPassword={handlePasswordSubmit}
                onCancelToLogin={() => setCurrentRoute('/login')}
                isSubmitting={isLoading}
                isDisabled={isTokenExpired}
                errorMessage={errorMessage}
                topSlot={tokenTopSlot}
                bottomSlot={sessionInvalidationSlot}
              />
            </div>
          )}
        </div>

        {/* Bottom Help Banner */}
        <div className="mt-8 w-full max-w-xl bg-white/70 border border-[#e8dfd8] rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-[#5e4038]">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#a02010] text-base" aria-hidden="true">support_agent</span>
            <span>
              Need help? Contact CEDA: <strong>1800 2332</strong> / <strong>+267 358 7000</strong>
            </span>
          </div>
          <div className="flex items-center gap-1 text-[#7c0700] font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-[#f8a018]" />
            <span>#KaeKapaKae Regional Advisory</span>
          </div>
        </div>
      </main>
    </div>
  );
};
