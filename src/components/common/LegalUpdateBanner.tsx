/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { LEGAL } from '../../config/legal';

const DISMISS_STORAGE_PREFIX = 'ceda_legal_banner_dismissed_v1';

export const LegalUpdateBanner: React.FC = () => {
  const { currentUser, setCurrentRoute } = useAuth();
  const [isDismissed, setIsDismissed] = useState(false);

  const userId = currentUser?.id || '';
  const consent = currentUser?.consent;
  const needsReview = Boolean(
    currentUser &&
      (consent?.termsVersion !== LEGAL.termsVersion ||
        consent?.privacyVersion !== LEGAL.privacyVersion)
  );

  const storageKey = `${DISMISS_STORAGE_PREFIX}:${userId}:${LEGAL.termsVersion}:${LEGAL.privacyVersion}`;

  useEffect(() => {
    if (!userId || !needsReview) {
      setIsDismissed(false);
      return;
    }
    try {
      setIsDismissed(localStorage.getItem(storageKey) === 'true');
    } catch {
      setIsDismissed(false);
    }
  }, [userId, needsReview, storageKey]);

  if (!needsReview || isDismissed) {
    return null;
  }

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      localStorage.setItem(storageKey, 'true');
    } catch {
      // ignore storage failure
    }
  };

  return (
    <div
      role="region"
      aria-label="Legal policy update notice"
      className="p-3.5 sm:p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 flex items-start justify-between gap-3 shadow-2xs"
    >
      <div className="flex items-start gap-2.5 text-xs sm:text-sm leading-relaxed">
        <span
          className="material-symbols-outlined text-[20px] text-[#943100] shrink-0 mt-0.5"
          aria-hidden="true"
        >
          gavel
        </span>
        <div>
          <span>Our Terms or Privacy Notice changed. Please review them: </span>
          <a
            href="/terms"
            onClick={(e) => {
              e.preventDefault();
              setCurrentRoute('/terms');
            }}
            className="font-bold text-[#7c0700] underline hover:text-[#a02010] rounded-xs"
          >
            Terms of Service
          </a>
          <span> and </span>
          <a
            href="/privacy"
            onClick={(e) => {
              e.preventDefault();
              setCurrentRoute('/privacy');
            }}
            className="font-bold text-[#7c0700] underline hover:text-[#a02010] rounded-xs"
          >
            Privacy Notice
          </a>
          <span>.</span>
        </div>
      </div>

      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dismiss legal notice banner"
        className="p-1 rounded-lg text-amber-900 hover:bg-amber-100 transition-colors shrink-0 cursor-pointer"
      >
        <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
          close
        </span>
      </button>
    </div>
  );
};
