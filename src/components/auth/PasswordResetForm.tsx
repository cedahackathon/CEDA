/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { evaluatePassword } from '../../services/passwordPolicy';

interface PasswordResetFormProps {
  onSubmitPassword: (newPassword: string, confirmPassword: string) => Promise<void>;
  onCancelToLogin: () => void;
  userEmail?: string;
  isSubmitting?: boolean;
  isDisabled?: boolean;
  errorMessage?: string | null;
  topSlot?: React.ReactNode;
  bottomSlot?: React.ReactNode;
}

export const PasswordResetForm: React.FC<PasswordResetFormProps> = ({
  onSubmitPassword,
  onCancelToLogin,
  userEmail,
  isSubmitting = false,
  isDisabled = false,
  errorMessage = null,
  topSlot,
  bottomSlot,
}) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const evaluation = evaluatePassword(newPassword, userEmail ? { email: userEmail } : undefined);
  const isMatching = Boolean(newPassword && confirmPassword && newPassword === confirmPassword);
  const canSubmit = evaluation.isValid && isMatching && !isSubmitting && !isDisabled;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    await onSubmitPassword(newPassword, confirmPassword);
  };

  return (
    <div>
      {/* Top Card Icon & Title */}
      <div className="text-center mb-6">
        <div className="w-12 h-12 rounded-full bg-[#ffd3c8]/40 border border-[#ffd3c8] text-[#a02010] mx-auto flex items-center justify-center mb-3">
          <span className="material-symbols-outlined text-2xl" aria-hidden="true">
            lock_reset
          </span>
        </div>
        <h1 className="font-headline text-2xl font-bold text-[#5e4038] tracking-tight">
          Create a new password
        </h1>
        <p className="text-xs sm:text-sm text-[#5a413c] mt-1 max-w-sm mx-auto leading-relaxed">
          {userEmail
            ? `Choose a strong, unique password for ${userEmail}.`
            : 'Choose a strong, unique password to secure your Botswana Innovation Portal workspace.'}
        </p>
      </div>

      {/* Error banner */}
      {errorMessage && (
        <div
          role="alert"
          aria-live="assertive"
          className="mb-5 p-3.5 bg-red-50 border border-red-200 text-red-900 rounded-xl text-xs flex items-start gap-2"
        >
          <span className="material-symbols-outlined text-base text-[#ba1a1a] shrink-0 mt-0.5" aria-hidden="true">
            error
          </span>
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {topSlot}

        {/* New Password Input */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <label htmlFor="newPassword" className="block text-xs font-bold text-[#1c1c19]">
              New password <span className="text-[#ba1a1a]">*</span>
            </label>
            <span className="text-[11px] text-[#5a413c] font-medium">Min. 10 characters</span>
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#5a413c]">
              <span className="material-symbols-outlined text-base" aria-hidden="true">
                lock
              </span>
            </div>
            <input
              id="newPassword"
              type={showNewPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              autoComplete="new-password"
              placeholder="Create strong password"
              className="w-full h-11 pl-10 pr-11 bg-[#f7f3ee] focus:bg-white border border-[#e2bfb8]/70 focus:border-[#a02010] rounded-xl text-xs font-medium text-[#1c1c19] transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowNewPassword((prev) => !prev)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#5a413c] hover:text-[#1c1c19] cursor-pointer"
              aria-label={showNewPassword ? 'Hide password' : 'Show password'}
            >
              <span className="material-symbols-outlined text-base" aria-hidden="true">
                {showNewPassword ? 'visibility_off' : 'visibility'}
              </span>
            </button>
          </div>

          {/* Password Strength Meter */}
          {newPassword && (
            <div className="mt-2.5 space-y-1.5" aria-live="polite">
              <div className="flex justify-between items-center text-xs">
                <span className="text-[11px] text-[#5a413c] font-medium">Password strength</span>
                <span
                  className={`font-semibold capitalize text-[11px] px-2 py-0.5 rounded-full ${
                    evaluation.strength === 'strong'
                      ? 'bg-emerald-100 text-emerald-800'
                      : evaluation.strength === 'fair'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-red-100 text-[#ba1a1a]'
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
                        ? 'bg-[#ba1a1a]'
                        : evaluation.score <= 3
                        ? 'bg-amber-500'
                        : 'bg-[#2e7d32]'
                      : 'bg-[#e6e2dd]'
                  }`}
                />
                <div
                  className={`rounded-full transition-all ${
                    evaluation.score >= 2
                      ? evaluation.score <= 3
                        ? 'bg-amber-500'
                        : 'bg-[#2e7d32]'
                      : 'bg-[#e6e2dd]'
                  }`}
                />
                <div
                  className={`rounded-full transition-all ${
                    evaluation.score >= 3
                      ? evaluation.score === 3
                        ? 'bg-amber-500'
                        : 'bg-[#2e7d32]'
                      : 'bg-[#e6e2dd]'
                  }`}
                />
                <div
                  className={`rounded-full transition-all ${
                    evaluation.score >= 4 ? 'bg-[#2e7d32]' : 'bg-[#e6e2dd]'
                  }`}
                />
              </div>
            </div>
          )}

          {/* Rules Checklist */}
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-[#5a413c]">
            <div className="flex items-center gap-1.5">
              <span
                className={`material-symbols-outlined text-sm ${
                  evaluation.rules.hasMinLength ? 'text-emerald-700 font-bold' : 'text-[#8d706b]'
                }`}
                aria-hidden="true"
              >
                {evaluation.rules.hasMinLength ? 'check_circle' : 'radio_button_unchecked'}
              </span>
              <span>At least 10 characters</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span
                className={`material-symbols-outlined text-sm ${
                  evaluation.rules.hasUpper ? 'text-emerald-700 font-bold' : 'text-[#8d706b]'
                }`}
                aria-hidden="true"
              >
                {evaluation.rules.hasUpper ? 'check_circle' : 'radio_button_unchecked'}
              </span>
              <span>An uppercase letter</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span
                className={`material-symbols-outlined text-sm ${
                  evaluation.rules.hasLower ? 'text-emerald-700 font-bold' : 'text-[#8d706b]'
                }`}
                aria-hidden="true"
              >
                {evaluation.rules.hasLower ? 'check_circle' : 'radio_button_unchecked'}
              </span>
              <span>A lowercase letter</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span
                className={`material-symbols-outlined text-sm ${
                  evaluation.rules.hasNumber ? 'text-emerald-700 font-bold' : 'text-[#8d706b]'
                }`}
                aria-hidden="true"
              >
                {evaluation.rules.hasNumber ? 'check_circle' : 'radio_button_unchecked'}
              </span>
              <span>A number</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span
                className={`material-symbols-outlined text-sm ${
                  evaluation.rules.hasSymbol ? 'text-emerald-700 font-bold' : 'text-[#8d706b]'
                }`}
                aria-hidden="true"
              >
                {evaluation.rules.hasSymbol ? 'check_circle' : 'radio_button_unchecked'}
              </span>
              <span>A symbol (@, #, $, etc.)</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span
                className={`material-symbols-outlined text-sm ${
                  newPassword && evaluation.rules.notCommon && evaluation.rules.doesNotContainUserInfo
                    ? 'text-emerald-700 font-bold'
                    : 'text-[#8d706b]'
                }`}
                aria-hidden="true"
              >
                {newPassword && evaluation.rules.notCommon && evaluation.rules.doesNotContainUserInfo
                  ? 'check_circle'
                  : 'radio_button_unchecked'}
              </span>
              <span>Not common or email name</span>
            </div>
          </div>
        </div>

        {/* Confirm New Password Input */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <label htmlFor="confirmPassword" className="block text-xs font-bold text-[#1c1c19]">
              Confirm new password <span className="text-[#ba1a1a]">*</span>
            </label>
            {isMatching && (
              <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-0.5">
                <span className="material-symbols-outlined text-sm" aria-hidden="true">
                  check
                </span>
                Passwords match
              </span>
            )}
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#5a413c]">
              <span className="material-symbols-outlined text-base" aria-hidden="true">
                verified
              </span>
            </div>
            <input
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
              placeholder="Re-enter password"
              aria-invalid={Boolean(confirmPassword && !isMatching)}
              className={`w-full h-11 pl-10 pr-11 rounded-xl text-xs font-medium text-[#1c1c19] border transition-colors ${
                confirmPassword && !isMatching
                  ? 'border-2 border-[#ba1a1a] bg-red-50/30'
                  : 'border-[#e2bfb8]/70 bg-[#f7f3ee] focus:bg-white focus:border-[#a02010]'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((prev) => !prev)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#5a413c] hover:text-[#1c1c19] cursor-pointer"
              aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
            >
              <span className="material-symbols-outlined text-base" aria-hidden="true">
                {showConfirmPassword ? 'visibility_off' : 'visibility'}
              </span>
            </button>
          </div>
          {confirmPassword && !isMatching && (
            <p role="alert" className="text-[11px] text-[#ba1a1a] mt-1 font-medium">
              Passwords do not match.
            </p>
          )}
        </div>

        {bottomSlot}

        {/* Submit Button */}
        <div className="pt-1">
          <button
            type="submit"
            disabled={!canSubmit}
            className={`w-full h-12 px-6 rounded-xl font-headline font-bold text-sm tracking-wide transition-all shadow-sm flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-3 focus-visible:ring-[#f8a018] ${
              canSubmit
                ? 'bg-[#a02010] hover:bg-[#861a0d] active:bg-[#6e1409] text-white cursor-pointer'
                : 'bg-[#e6e2dd] text-[#8d706b] cursor-not-allowed shadow-none'
            }`}
          >
            {isSubmitting ? (
              <>
                <span className="material-symbols-outlined animate-spin text-lg" aria-hidden="true">
                  progress_activity
                </span>
                <span>Updating password...</span>
              </>
            ) : (
              <>
                <span>Update password</span>
                <span className="material-symbols-outlined text-lg" aria-hidden="true">
                  arrow_forward
                </span>
              </>
            )}
          </button>
        </div>

        {/* Cancel link */}
        <div className="text-center pt-1">
          <button
            type="button"
            onClick={onCancelToLogin}
            className="inline-flex items-center gap-1.5 text-xs text-[#5e4038] hover:text-[#a02010] font-semibold hover:underline transition-colors cursor-pointer rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f8a018]"
          >
            <span className="material-symbols-outlined text-sm" aria-hidden="true">
              arrow_back
            </span>
            <span>Back to login</span>
          </button>
        </div>
      </form>
    </div>
  );
};
