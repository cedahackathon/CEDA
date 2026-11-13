/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/authService';
import { evaluatePassword } from '../../services/passwordPolicy';

interface ResetPasswordPageProps {
  initialToken?: string;
}

export const ResetPasswordPage: React.FC<ResetPasswordPageProps> = ({ initialToken }) => {
  const { setCurrentRoute } = useAuth();

  // Read Firebase oobCode or token from URL param or props
  const [token, setToken] = useState<string>(() => {
    if (initialToken) return initialToken;
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('oobCode') || urlParams.get('token') || 'demo-valid-token';
  });

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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

  // Live password assessment
  const evaluation = evaluatePassword(newPassword);

  const isMatching = Boolean(
    newPassword && confirmPassword && newPassword === confirmPassword
  );

  const canSubmit =
    evaluation.isValid &&
    isMatching &&
    !isLoading &&
    !isTokenExpired;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

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

  return (
    <div className="min-h-screen bg-[#fdf9f4] text-[#31302d] flex flex-col justify-between">
      {/* Top Utility Bar */}
      <div className="border-b border-[#e8dfd8] bg-white/70 px-4 py-2.5 sm:px-8">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between text-xs text-[#5e4038]">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentRoute('/')}
              className="hover:text-[#a02010] font-medium transition-colors"
            >
              Home
            </button>
            <span>/</span>
            <span>Security</span>
            <span>/</span>
            <span className="text-[#a02010] font-semibold">Reset Password</span>
          </div>
          <div className="flex items-center space-x-2 text-[#7c0700] bg-[#ffd3c8]/30 px-2.5 py-0.5 rounded-full font-medium">
            <span className="material-symbols-outlined text-sm">lock</span>
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
            <div className="p-8 text-center space-y-6">
              <div className="mx-auto w-16 h-16 rounded-full bg-red-100 text-[#a02010] flex items-center justify-center">
                <span className="material-symbols-outlined text-3xl">history_toggle_off</span>
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
                  className="flex-1 py-3 px-5 rounded-xl bg-[#a02010] hover:bg-[#86190c] text-white font-semibold text-sm transition-all shadow-md focus:outline-none focus:ring-3 focus:ring-[#f8a018] flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-lg">outgoing_mail</span>
                  <span>Request New Link</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentRoute('/login')}
                  className="py-3 px-5 rounded-xl border border-[#cfc4bc] text-[#5e4038] hover:bg-[#fdf9f4] font-medium text-sm transition-all focus:outline-none focus:ring-3 focus:ring-[#f8a018]"
                >
                  Return to Login
                </button>
              </div>
            </div>
          ) : isSuccess ? (
            /* Success State */
            <div className="p-8 text-center space-y-6">
              <div className="mx-auto w-16 h-16 rounded-full bg-green-100 text-green-700 flex items-center justify-center">
                <span className="material-symbols-outlined text-4xl">verified_user</span>
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
                <span className="material-symbols-outlined text-[#a02010] text-lg mt-0.5">shield</span>
                <div>
                  <p className="font-semibold text-[#31302d]">Security Confirmation</p>
                  <p>Encrypted using bcrypt cost factor 12. You may now sign in using your new credentials.</p>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setCurrentRoute('/login')}
                  className="w-full py-3.5 px-6 rounded-xl bg-[#a02010] hover:bg-[#86190c] text-white font-bold text-sm tracking-wide transition-all shadow-md focus:outline-none focus:ring-3 focus:ring-[#f8a018] flex items-center justify-center gap-2"
                >
                  <span>Proceed to Login</span>
                  <span className="material-symbols-outlined text-lg">arrow_forward</span>
                </button>
              </div>
            </div>
          ) : (
            /* Form State */
            <div className="p-6 sm:p-8">
              {/* Top Card Icon & Title */}
              <div className="text-center mb-6">
                <div className="w-14 h-14 rounded-full bg-[#ffd3c8]/40 border border-[#ffd3c8] text-[#a02010] mx-auto flex items-center justify-center mb-3">
                  <span className="material-symbols-outlined text-2xl">lock_reset</span>
                </div>
                <span className="text-[11px] font-bold tracking-wider text-[#a02010] uppercase">
                  Account Security & Credentials
                </span>
                <h1 className="text-2xl font-extrabold text-[#31302d] font-heading mt-1">
                  Create a new password
                </h1>
                <p className="text-xs sm:text-sm text-[#5e4038] mt-1 max-w-sm mx-auto leading-relaxed">
                  Choose a strong, unique password to secure your Botswana Innovation Portal workspace.
                </p>
              </div>

              {/* Error banner */}
              {errorMessage && (
                <div className="mb-6 p-3.5 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs flex items-center gap-2">
                  <span className="material-symbols-outlined text-base text-[#a02010]">error</span>
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Simulation Token Input (collapsible / readable for testing) */}
                <div className="bg-[#fdf9f4] p-3 rounded-lg border border-[#e8dfd8] text-xs">
                  <div className="flex justify-between items-center text-[#5e4038] mb-1">
                    <span className="font-medium">Reset Token / Authorization Code:</span>
                    <span className="text-[10px] bg-white px-2 py-0.5 rounded border border-[#cfc4bc]">
                      Proto
                    </span>
                  </div>
                  <input
                    type="text"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="Enter reset token or code (e.g. demo-valid-token)"
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
                      className="text-[#a02010] hover:underline font-semibold"
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
                      className="text-red-700 hover:underline font-semibold"
                    >
                      Expired Token
                    </button>
                  </div>
                </div>

                {/* New Password Input */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label
                      htmlFor="newPassword"
                      className="block text-xs font-semibold text-[#31302d]"
                    >
                      New password <span className="text-red-600 font-normal">Required</span>
                    </label>
                    <span className="text-[11px] text-[#5e4038] font-medium">
                      Min. 10 characters
                    </span>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#5e4038]">
                      <span className="material-symbols-outlined text-base">lock</span>
                    </div>
                    <input
                      id="newPassword"
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      placeholder="••••••••••••"
                      className="w-full pl-9 pr-10 py-2.5 bg-white border border-[#cfc4bc] rounded-xl text-sm focus:outline-none focus:ring-3 focus:ring-[#f8a018] focus:border-transparent transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#5e4038] hover:text-[#31302d]"
                      aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                    >
                      <span className="material-symbols-outlined text-base">
                        {showNewPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>

                  {/* Password Strength Meter */}
                  {newPassword && (
                    <div className="mt-2.5 space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-[11px] text-[#5e4038] font-medium">Password strength</span>
                        <span
                          className={`font-semibold capitalize text-[11px] px-2 py-0.5 rounded-full ${
                            evaluation.strength === 'strong'
                              ? 'bg-green-100 text-green-800'
                              : evaluation.strength === 'fair'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {evaluation.strength}
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-1.5 h-1.5">
                        <div
                          className={`rounded-full transition-all ${
                            evaluation.score >= 1
                              ? evaluation.score === 1
                                ? 'bg-red-500'
                                : evaluation.score <= 3
                                ? 'bg-amber-500'
                                : 'bg-green-600'
                              : 'bg-gray-200'
                          }`}
                        />
                        <div
                          className={`rounded-full transition-all ${
                            evaluation.score >= 2
                              ? evaluation.score <= 3
                                ? 'bg-amber-500'
                                : 'bg-green-600'
                              : 'bg-gray-200'
                          }`}
                        />
                        <div
                          className={`rounded-full transition-all ${
                            evaluation.score >= 3
                              ? evaluation.score === 3
                                ? 'bg-amber-500'
                                : 'bg-green-600'
                              : 'bg-gray-200'
                          }`}
                        />
                        <div
                          className={`rounded-full transition-all ${
                            evaluation.score >= 4 ? 'bg-green-600' : 'bg-gray-200'
                          }`}
                        />
                      </div>
                    </div>
                  )}

                  {/* Rules Checklist */}
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-[#5e4038]">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`material-symbols-outlined text-sm ${
                          evaluation.rules.hasMinLength ? 'text-green-600 font-bold' : 'text-gray-300'
                        }`}
                      >
                        {evaluation.rules.hasMinLength ? 'check_circle' : 'radio_button_unchecked'}
                      </span>
                      <span>At least 10 characters</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span
                        className={`material-symbols-outlined text-sm ${
                          evaluation.rules.hasUpper ? 'text-green-600 font-bold' : 'text-gray-300'
                        }`}
                      >
                        {evaluation.rules.hasUpper ? 'check_circle' : 'radio_button_unchecked'}
                      </span>
                      <span>An uppercase letter</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span
                        className={`material-symbols-outlined text-sm ${
                          evaluation.rules.hasNumber ? 'text-green-600 font-bold' : 'text-gray-300'
                        }`}
                      >
                        {evaluation.rules.hasNumber ? 'check_circle' : 'radio_button_unchecked'}
                      </span>
                      <span>A number</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span
                        className={`material-symbols-outlined text-sm ${
                          evaluation.rules.hasSymbol ? 'text-green-600 font-bold' : 'text-gray-300'
                        }`}
                      >
                        {evaluation.rules.hasSymbol ? 'check_circle' : 'radio_button_unchecked'}
                      </span>
                      <span>A symbol (@, #, $, etc.)</span>
                    </div>

                    <div className="flex items-center gap-1.5 sm:col-span-2">
                      <span
                        className={`material-symbols-outlined text-sm ${
                          newPassword && evaluation.rules.notCommon && evaluation.rules.notIdenticalToPrevious && evaluation.isValid
                            ? 'text-green-600 font-bold'
                            : 'text-gray-300'
                        }`}
                      >
                        {newPassword && evaluation.rules.notCommon && evaluation.rules.notIdenticalToPrevious && evaluation.isValid
                          ? 'check_circle'
                          : 'radio_button_unchecked'}
                      </span>
                      <span>Not identical to previous 3 passwords</span>
                    </div>
                  </div>
                </div>

                {/* Confirm New Password Input */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label
                      htmlFor="confirmPassword"
                      className="block text-xs font-semibold text-[#31302d]"
                    >
                      Confirm new password <span className="text-red-600 font-normal">Required</span>
                    </label>
                    {isMatching && (
                      <span className="text-[11px] text-green-700 font-semibold flex items-center gap-0.5">
                        <span className="material-symbols-outlined text-sm">check</span>
                        Passwords match
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#5e4038]">
                      <span className="material-symbols-outlined text-base">verified</span>
                    </div>
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      placeholder="••••••••••••"
                      className={`w-full pl-9 pr-10 py-2.5 bg-white border rounded-xl text-sm focus:outline-none focus:ring-3 focus:ring-[#f8a018] focus:border-transparent transition-all ${
                        confirmPassword && !isMatching
                          ? 'border-red-300 bg-red-50/20'
                          : 'border-[#cfc4bc]'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#5e4038] hover:text-[#31302d]"
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      <span className="material-symbols-outlined text-base">
                        {showConfirmPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                  {confirmPassword && !isMatching && (
                    <p className="text-[11px] text-red-600 mt-1">Passwords do not match.</p>
                  )}
                </div>

                {/* Active Session Invalidation Notice */}
                <div className="p-3.5 rounded-xl bg-[#fdf9f4] border border-[#e8dfd8] flex items-start gap-3">
                  <span className="material-symbols-outlined text-[#5e4038] text-lg mt-0.5">
                    phonelink_lock
                  </span>
                  <div className="text-xs text-[#5e4038] leading-relaxed">
                    <span className="font-semibold text-[#31302d] block">
                      Active Session Invalidation:
                    </span>
                    For your security, confirming this change will safely log you out of all active web and mobile sessions.
                  </div>
                </div>

                {/* Submit Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={!canSubmit}
                    className={`w-full py-3.5 px-6 rounded-xl font-bold text-sm tracking-wide transition-all shadow-md focus:outline-none focus:ring-3 focus:ring-[#f8a018] flex items-center justify-center gap-2 ${
                      canSubmit
                        ? 'bg-[#a02010] hover:bg-[#86190c] text-white cursor-pointer active:scale-[0.99]'
                        : 'bg-gray-200 text-gray-500 cursor-not-allowed shadow-none'
                    }`}
                  >
                    {isLoading ? (
                      <>
                        <span className="material-symbols-outlined animate-spin text-lg">
                          progress_activity
                        </span>
                        <span>Updating credentials...</span>
                      </>
                    ) : (
                      <>
                        <span>Update password</span>
                        <span className="material-symbols-outlined text-lg">arrow_forward</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Cancel link */}
                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => setCurrentRoute('/login')}
                    className="inline-flex items-center gap-1.5 text-xs text-[#5e4038] hover:text-[#a02010] font-medium transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm">arrow_back</span>
                    <span>Cancel and return to login</span>
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Bottom Help Banner */}
        <div className="mt-8 w-full max-w-xl bg-white/70 border border-[#e8dfd8] rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-[#5e4038]">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#a02010] text-base">support_agent</span>
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
