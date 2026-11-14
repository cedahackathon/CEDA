/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  applyActionCode,
  checkActionCode,
  confirmPasswordReset,
  sendEmailVerification,
  sendPasswordResetEmail,
  verifyPasswordResetCode,
} from 'firebase/auth';
import confetti from 'canvas-confetti';
import { auth } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { PasswordResetForm } from '../auth/PasswordResetForm';

type ActionMode = 'resetPassword' | 'verifyEmail' | 'recoverEmail';

type ActionViewState =
  | { status: 'invalid' }
  | { status: 'loading'; label: string }
  | { status: 'reset_form'; email: string; formError: string | null }
  | { status: 'reset_success' }
  | { status: 'verify_success' }
  | { status: 'recover_success'; restoredEmail: string }
  | {
      status: 'error';
      code: string;
      title: string;
      message: string;
      canRetry: boolean;
      allowResendVerification: boolean;
    };

const VALID_MODES = new Set<ActionMode>(['resetPassword', 'verifyEmail', 'recoverEmail']);

// Prevents React StrictMode double-invocation from consuming single-use action codes twice
const actionExecutionCache = new Map<string, Promise<unknown>>();

function runActionOnce<T>(cacheKey: string, executor: () => Promise<T>): Promise<T> {
  const existing = actionExecutionCache.get(cacheKey);
  if (existing) {
    return existing as Promise<T>;
  }
  const promise = executor().catch((err) => {
    actionExecutionCache.delete(cacheKey);
    throw err;
  });
  actionExecutionCache.set(cacheKey, promise);
  return promise;
}

function getFirebaseErrorCode(err: unknown): string {
  if (err && typeof err === 'object' && 'code' in err) {
    return String((err as { code?: unknown }).code || '');
  }
  return '';
}

function mapActionError(
  code: string,
  mode: ActionMode
): { title: string; message: string; canRetry: boolean } {
  if (code === 'auth/expired-action-code' || code === 'auth/invalid-action-code') {
    if (mode === 'verifyEmail') {
      return {
        title: 'Verification link unavailable',
        message: 'This link has expired or was already used',
        canRetry: false,
      };
    }
    return {
      title: 'Link expired or already used',
      message: 'This link has expired or was already used',
      canRetry: false,
    };
  }

  if (code === 'auth/user-disabled') {
    return {
      title: 'Account disabled',
      message: 'This account has been disabled. Please contact CEDA support for assistance.',
      canRetry: false,
    };
  }

  if (code === 'auth/weak-password') {
    return {
      title: 'Weak password',
      message: 'The password does not meet security strength requirements.',
      canRetry: false,
    };
  }

  return {
    title: 'Unable to complete action',
    message: 'Something went wrong while verifying this link. Please try again.',
    canRetry: true,
  };
}

export const AuthActionPage: React.FC = () => {
  const { currentRoute, setCurrentRoute } = useAuth();

  const { mode, oobCode, lang } = useMemo(() => {
    const queryString = currentRoute.startsWith('/auth/action')
      ? currentRoute.includes('?')
        ? currentRoute.split('?')[1]
        : ''
      : typeof window !== 'undefined'
      ? window.location.search
      : '';
    const params = new URLSearchParams(queryString);
    const rawMode = (params.get('mode') || '').trim();
    const rawCode = (params.get('oobCode') || '').trim();
    const rawLang = (params.get('lang') || '').trim();
    return {
      mode: VALID_MODES.has(rawMode as ActionMode) ? (rawMode as ActionMode) : null,
      oobCode: rawCode,
      lang: rawLang,
    };
  }, [currentRoute]);

  const [viewState, setViewState] = useState<ActionViewState>(() => {
    if (!mode || !oobCode) {
      return { status: 'invalid' };
    }
    return {
      status: 'loading',
      label:
        mode === 'resetPassword'
          ? 'Checking your password reset link...'
          : mode === 'verifyEmail'
          ? 'Verifying your email address...'
          : 'Restoring your email address...',
    };
  });

  const [isResetSubmitting, setIsResetSubmitting] = useState(false);
  const [hasSignedInUser, setHasSignedInUser] = useState(false);
  const [resendStatus, setResendStatus] = useState<{
    loading: boolean;
    message: string | null;
    isError: boolean;
  }>({ loading: false, message: null, isError: false });
  const [recoverResetStatus, setRecoverResetStatus] = useState<{
    loading: boolean;
    message: string | null;
    isError: boolean;
  }>({ loading: false, message: null, isError: false });

  const executeInitialAction = useCallback(
    async (bypassCache = false) => {
      setResendStatus({ loading: false, message: null, isError: false });
      setRecoverResetStatus({ loading: false, message: null, isError: false });

      if (!mode || !oobCode) {
        setViewState({ status: 'invalid' });
        return;
      }

      if (!auth) {
        setViewState({
          status: 'error',
          code: 'auth/unavailable',
          title: 'Service unavailable',
          message: 'Authentication service is not configured. Please try again shortly.',
          canRetry: true,
          allowResendVerification: false,
        });
        return;
      }

      if (lang) {
        auth.languageCode = lang;
      }

      const loadingLabel =
        mode === 'resetPassword'
          ? 'Checking your password reset link...'
          : mode === 'verifyEmail'
          ? 'Verifying your email address...'
          : 'Restoring your email address...';

      setViewState({ status: 'loading', label: loadingLabel });

      if (typeof auth.authStateReady === 'function') {
        try {
          await auth.authStateReady();
        } catch {
          // non-blocking
        }
      }
      setHasSignedInUser(Boolean(auth.currentUser));

      const cacheKey = `${mode}:${oobCode}`;
      if (bypassCache) {
        actionExecutionCache.delete(cacheKey);
      }

      try {
        if (mode === 'resetPassword') {
          const email = await runActionOnce(cacheKey, () =>
            verifyPasswordResetCode(auth, oobCode)
          );
          setViewState({ status: 'reset_form', email, formError: null });
          return;
        }

        if (mode === 'verifyEmail') {
          await runActionOnce(cacheKey, () => applyActionCode(auth, oobCode));
          setViewState({ status: 'verify_success' });
          return;
        }

        if (mode === 'recoverEmail') {
          const restoredEmail = await runActionOnce(cacheKey, async () => {
            const info = await checkActionCode(auth, oobCode);
            const email = info?.data?.email || '';
            await applyActionCode(auth, oobCode);
            return email;
          });
          setViewState({ status: 'recover_success', restoredEmail });
          return;
        }
      } catch (err: unknown) {
        const code = getFirebaseErrorCode(err);
        const mapped = mapActionError(code, mode);
        const isExpiredOrInvalid =
          code === 'auth/expired-action-code' || code === 'auth/invalid-action-code';
        setViewState({
          status: 'error',
          code,
          title: mapped.title,
          message: mapped.message,
          canRetry: mapped.canRetry,
          allowResendVerification: mode === 'verifyEmail' && isExpiredOrInvalid,
        });
      }
    },
    [mode, oobCode, lang]
  );

  useEffect(() => {
    void executeInitialAction(false);
  }, [executeInitialAction]);

  const handlePasswordSubmit = async (newPassword: string) => {
    if (!auth || !oobCode || viewState.status !== 'reset_form') return;
    setIsResetSubmitting(true);
    setViewState((prev) =>
      prev.status === 'reset_form' ? { ...prev, formError: null } : prev
    );

    try {
      await confirmPasswordReset(auth, oobCode, newPassword);
      setViewState({ status: 'reset_success' });
      try {
        confetti({
          particleCount: 70,
          spread: 55,
          origin: { y: 0.6 },
          colors: ['#a02010', '#ffd3c8', '#f8a018', '#2e7d32'],
        });
      } catch {
        // ignore in headless mode
      }
    } catch (err: unknown) {
      const code = getFirebaseErrorCode(err);
      if (code === 'auth/weak-password') {
        setViewState((prev) =>
          prev.status === 'reset_form'
            ? {
                ...prev,
                formError:
                  'Please choose a stronger password (at least 10 characters with uppercase, lowercase, number, and symbol).',
              }
            : prev
        );
      } else if (
        code === 'auth/expired-action-code' ||
        code === 'auth/invalid-action-code' ||
        code === 'auth/user-disabled'
      ) {
        const mapped = mapActionError(code, 'resetPassword');
        setViewState({
          status: 'error',
          code,
          title: mapped.title,
          message: mapped.message,
          canRetry: false,
          allowResendVerification: false,
        });
      } else {
        setViewState((prev) =>
          prev.status === 'reset_form'
            ? {
                ...prev,
                formError: 'Could not update your password. Please try again.',
              }
            : prev
        );
      }
    } finally {
      setIsResetSubmitting(false);
    }
  };

  const handleResendVerificationEmail = async () => {
    if (!auth?.currentUser) return;
    setResendStatus({ loading: true, message: null, isError: false });

    const actionCodeSettings = {
      url: `${window.location.origin}/login`,
    };

    try {
      await sendEmailVerification(auth.currentUser, actionCodeSettings);
      setResendStatus({
        loading: false,
        message: 'A new verification email has been sent. Check your inbox.',
        isError: false,
      });
    } catch (err: unknown) {
      const code = getFirebaseErrorCode(err);
      if (code === 'auth/too-many-requests') {
        setResendStatus({
          loading: false,
          message: 'Too many requests. Please wait a few minutes before requesting another email.',
          isError: true,
        });
        return;
      }
      try {
        await sendEmailVerification(auth.currentUser);
        setResendStatus({
          loading: false,
          message: 'A new verification email has been sent. Check your inbox.',
          isError: false,
        });
      } catch {
        setResendStatus({
          loading: false,
          message: 'Unable to resend verification email right now. Please try again.',
          isError: true,
        });
      }
    }
  };

  const handleSendRecoveryResetEmail = async (email: string) => {
    if (!auth || !email) return;
    setRecoverResetStatus({ loading: true, message: null, isError: false });
    try {
      if (lang) {
        auth.languageCode = lang;
      }
      await sendPasswordResetEmail(auth, email);
      setRecoverResetStatus({
        loading: false,
        message: `Password reset instructions sent to ${email}.`,
        isError: false,
      });
    } catch (err: unknown) {
      const code = getFirebaseErrorCode(err);
      const message =
        code === 'auth/too-many-requests'
          ? 'Too many requests. Please wait a few minutes and try again.'
          : code === 'auth/user-disabled'
          ? 'This account has been disabled. Please contact CEDA support.'
          : 'Could not send the password reset email. Please try again.';
      setRecoverResetStatus({
        loading: false,
        message,
        isError: true,
      });
    }
  };

  const breadcrumbLabel =
    mode === 'resetPassword'
      ? 'Reset Password'
      : mode === 'verifyEmail'
      ? 'Verify Email'
      : mode === 'recoverEmail'
      ? 'Recover Email'
      : 'Account Action';

  return (
    <div className="w-full min-h-[calc(100vh-5rem)] bg-[#fdf9f4] py-10 px-4 flex flex-col items-center">
      {/* Breadcrumb */}
      <div className="w-full max-w-xl flex items-center gap-2 mb-6 text-xs text-[#5a413c]">
        <button
          type="button"
          onClick={() => setCurrentRoute('/')}
          className="hover:text-[#a02010] transition-colors cursor-pointer"
        >
          Home
        </button>
        <span className="text-[#8d706b]/40" aria-hidden="true">
          /
        </span>
        <span className="text-[#1c1c19] font-bold">{breadcrumbLabel}</span>
      </div>

      {/* Centered Card (matches login & forgot-password card styling) */}
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-md border border-[#e2bfb8] overflow-hidden relative">
        <div className="h-1.5 w-full bg-[#a02010]" />

        <div className="p-6 sm:p-8 flex flex-col gap-6" aria-live="polite">
          {/* Invalid / Missing Mode or Code */}
          {viewState.status === 'invalid' && (
            <div className="text-center space-y-5 py-2">
              <div className="w-14 h-14 rounded-full bg-red-50 border border-red-200 text-[#ba1a1a] mx-auto flex items-center justify-center">
                <span className="material-symbols-outlined text-[28px]" aria-hidden="true">
                  link_off
                </span>
              </div>
              <div className="space-y-1.5">
                <h1 className="font-headline text-2xl font-bold text-[#1c1c19] tracking-tight">
                  This link is not valid
                </h1>
                <p className="text-xs sm:text-sm text-[#5a413c] max-w-md mx-auto leading-relaxed">
                  The email action link is incomplete or unrecognized. Please open the full link
                  from your email or sign in to continue.
                </p>
              </div>
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setCurrentRoute('/login')}
                  className="w-full h-12 rounded-xl bg-[#a02010] hover:bg-[#861a0d] text-white font-headline text-sm font-bold shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer focus:outline-none focus-visible:ring-3 focus-visible:ring-[#f8a018]"
                >
                  <span>Back to login</span>
                </button>
              </div>
            </div>
          )}

          {/* Loading State */}
          {viewState.status === 'loading' && (
            <div className="text-center space-y-4 py-8" role="status">
              <div className="w-12 h-12 rounded-full bg-[#ffd3c8]/40 text-[#a02010] mx-auto flex items-center justify-center">
                <span
                  className="material-symbols-outlined text-[26px] animate-spin"
                  aria-hidden="true"
                >
                  progress_activity
                </span>
              </div>
              <div className="space-y-1">
                <h1 className="font-headline text-xl font-bold text-[#5e4038]">
                  {viewState.label}
                </h1>
                <p className="text-xs text-[#5a413c]">Please wait a moment.</p>
              </div>
            </div>
          )}

          {/* Mode 1: resetPassword Form */}
          {viewState.status === 'reset_form' && (
            <PasswordResetForm
              userEmail={viewState.email}
              onSubmitPassword={(newPwd) => handlePasswordSubmit(newPwd)}
              onCancelToLogin={() => setCurrentRoute('/login')}
              isSubmitting={isResetSubmitting}
              errorMessage={viewState.formError}
            />
          )}

          {/* Mode 1: resetPassword Success */}
          {viewState.status === 'reset_success' && (
            <div className="text-center space-y-5 py-2">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-[#2e7d32] mx-auto flex items-center justify-center">
                <span className="material-symbols-outlined text-[30px]" aria-hidden="true">
                  check_circle
                </span>
              </div>
              <div className="space-y-1.5">
                <h1 className="font-headline text-2xl font-bold text-[#1c1c19] tracking-tight">
                  Password updated
                </h1>
                <p className="text-xs sm:text-sm text-[#5a413c] max-w-md mx-auto leading-relaxed">
                  Your password has been changed. You can now sign in with your new password.
                </p>
              </div>
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setCurrentRoute('/login')}
                  className="w-full h-12 rounded-xl bg-[#a02010] hover:bg-[#861a0d] text-white font-headline text-sm font-bold shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer focus:outline-none focus-visible:ring-3 focus-visible:ring-[#f8a018]"
                >
                  <span>Go to login</span>
                  <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                    arrow_forward
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* Mode 2: verifyEmail Success */}
          {viewState.status === 'verify_success' && (
            <div className="text-center space-y-5 py-2">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-[#2e7d32] mx-auto flex items-center justify-center">
                <span className="material-symbols-outlined text-[30px]" aria-hidden="true">
                  mark_email_read
                </span>
              </div>
              <div className="space-y-1.5">
                <h1 className="font-headline text-2xl font-bold text-[#1c1c19] tracking-tight">
                  Email verified
                </h1>
                <p className="text-xs sm:text-sm text-[#5a413c] max-w-md mx-auto leading-relaxed">
                  Your email address has been verified. Continue to sign in to your CEDA Innovation
                  Portal account.
                </p>
              </div>
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setCurrentRoute('/login')}
                  className="w-full h-12 rounded-xl bg-[#a02010] hover:bg-[#861a0d] text-white font-headline text-sm font-bold shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer focus:outline-none focus-visible:ring-3 focus-visible:ring-[#f8a018]"
                >
                  <span>Continue to login</span>
                  <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                    arrow_forward
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* Mode 3: recoverEmail Success */}
          {viewState.status === 'recover_success' && (
            <div className="text-center space-y-5 py-2">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-[#2e7d32] mx-auto flex items-center justify-center">
                <span className="material-symbols-outlined text-[30px]" aria-hidden="true">
                  verified_user
                </span>
              </div>
              <div className="space-y-1.5">
                <h1 className="font-headline text-2xl font-bold text-[#1c1c19] tracking-tight">
                  Your email address was restored
                </h1>
                <p className="text-xs sm:text-sm text-[#5a413c] max-w-md mx-auto leading-relaxed">
                  {viewState.restoredEmail
                    ? `Your account email has been restored to ${viewState.restoredEmail}. If you did not request the previous change, we recommend resetting your password right away.`
                    : 'Your account email has been restored. We recommend resetting your password right away.'}
                </p>
              </div>

              {recoverResetStatus.message && (
                <div
                  role={recoverResetStatus.isError ? 'alert' : 'status'}
                  aria-live="polite"
                  className={`p-3.5 rounded-xl text-xs border text-left ${
                    recoverResetStatus.isError
                      ? 'bg-red-50 border-red-200 text-[#ba1a1a]'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  }`}
                >
                  {recoverResetStatus.message}
                </div>
              )}

              <div className="flex flex-col gap-3 pt-1">
                {viewState.restoredEmail && (
                  <button
                    type="button"
                    disabled={recoverResetStatus.loading}
                    onClick={() => handleSendRecoveryResetEmail(viewState.restoredEmail)}
                    className="w-full h-12 rounded-xl bg-[#a02010] hover:bg-[#861a0d] text-white font-headline text-sm font-bold shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:bg-[#e6e2dd] disabled:text-[#8d706b] focus:outline-none focus-visible:ring-3 focus-visible:ring-[#f8a018]"
                  >
                    {recoverResetStatus.loading ? (
                      <>
                        <span
                          className="material-symbols-outlined text-[18px] animate-spin"
                          aria-hidden="true"
                        >
                          progress_activity
                        </span>
                        <span>Sending reset email...</span>
                      </>
                    ) : (
                      <span>Reset my password</span>
                    )}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setCurrentRoute('/login')}
                  className="w-full h-11 rounded-xl border border-[#e2bfb8] text-[#5e4038] hover:bg-[#f7f3ee] text-xs font-bold transition-colors cursor-pointer focus:outline-none focus-visible:ring-3 focus-visible:ring-[#f8a018]"
                >
                  Go to login
                </button>
              </div>
            </div>
          )}

          {/* Error State */}
          {viewState.status === 'error' && (
            <div className="text-center space-y-5 py-2" role="alert">
              <div className="w-14 h-14 rounded-full bg-red-50 border border-red-200 text-[#ba1a1a] mx-auto flex items-center justify-center">
                <span className="material-symbols-outlined text-[28px]" aria-hidden="true">
                  error_outline
                </span>
              </div>
              <div className="space-y-1.5">
                <h1 className="font-headline text-2xl font-bold text-[#1c1c19] tracking-tight">
                  {viewState.title}
                </h1>
                <p className="text-xs sm:text-sm text-[#5a413c] max-w-md mx-auto leading-relaxed">
                  {viewState.message}
                </p>
              </div>

              {resendStatus.message && (
                <div
                  role={resendStatus.isError ? 'alert' : 'status'}
                  aria-live="polite"
                  className={`p-3.5 rounded-xl text-xs border text-left ${
                    resendStatus.isError
                      ? 'bg-red-50 border-red-200 text-[#ba1a1a]'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  }`}
                >
                  {resendStatus.message}
                </div>
              )}

              <div className="flex flex-col gap-3 pt-1">
                {viewState.allowResendVerification && hasSignedInUser && (
                  <button
                    type="button"
                    disabled={resendStatus.loading}
                    onClick={handleResendVerificationEmail}
                    className="w-full h-12 rounded-xl bg-[#a02010] hover:bg-[#861a0d] text-white font-headline text-sm font-bold shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:bg-[#e6e2dd] disabled:text-[#8d706b] focus:outline-none focus-visible:ring-3 focus-visible:ring-[#f8a018]"
                  >
                    {resendStatus.loading ? (
                      <>
                        <span
                          className="material-symbols-outlined text-[18px] animate-spin"
                          aria-hidden="true"
                        >
                          progress_activity
                        </span>
                        <span>Sending verification email...</span>
                      </>
                    ) : (
                      <span>Resend verification email</span>
                    )}
                  </button>
                )}

                {viewState.canRetry && (
                  <button
                    type="button"
                    onClick={() => void executeInitialAction(true)}
                    className="w-full h-12 rounded-xl bg-[#a02010] hover:bg-[#861a0d] text-white font-headline text-sm font-bold shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer focus:outline-none focus-visible:ring-3 focus-visible:ring-[#f8a018]"
                  >
                    <span>Retry</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setCurrentRoute('/login')}
                  className={`w-full h-11 rounded-xl font-bold transition-colors cursor-pointer flex items-center justify-center focus:outline-none focus-visible:ring-3 focus-visible:ring-[#f8a018] ${
                    (viewState.allowResendVerification && hasSignedInUser) || viewState.canRetry
                      ? 'border border-[#e2bfb8] text-[#5e4038] hover:bg-[#f7f3ee] text-xs'
                      : 'bg-[#a02010] hover:bg-[#861a0d] text-white font-headline text-sm shadow-sm h-12'
                  }`}
                >
                  Go to login
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Support Box */}
      <div className="w-full max-w-xl mt-6 p-4 bg-white rounded-xl border border-[#e2bfb8] flex flex-wrap items-center justify-between gap-3 text-xs text-[#5a413c]">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px] text-[#943100]" aria-hidden="true">
            support_agent
          </span>
          <span className="font-semibold text-[#1c1c19]">Need help? Contact the CEDA Help Center</span>
        </div>
        <div className="flex items-center gap-3">
          <span>Toll Free: 1800 2332</span>
          <span aria-hidden="true">•</span>
          <a href="mailto:enquiries@ceda.co.bw" className="text-[#a02010] hover:underline font-medium">
            enquiries@ceda.co.bw
          </a>
        </div>
      </div>
    </div>
  );
};
