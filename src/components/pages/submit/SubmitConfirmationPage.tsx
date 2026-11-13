/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { INNOVATION_SECTORS } from '../../../data/ideaOptions';
import {
  findIdeaDraftOrById,
  formatDateDDMonYYYY,
  IdeaDraft,
  subscribeToIdeaDraft,
} from '../../../services/submitterService';
import { SubmitterLayout } from '../../submitter/SubmitterLayout';

interface SubmitConfirmationPageProps {
  routePath: string;
}

export const SubmitConfirmationPage: React.FC<SubmitConfirmationPageProps> = ({
  routePath,
}) => {
  const { currentUser, setCurrentRoute } = useAuth();
  const cleanPath = routePath.split('?')[0];
  const ideaId = cleanPath.startsWith('/submit/confirmation/')
    ? cleanPath.slice('/submit/confirmation/'.length).split('/')[0]
    : '';

  const activeUid = currentUser?.id || '';

  const [ideaDoc, setIdeaDoc] = useState<IdeaDraft | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeUid || !ideaId) {
      setIsLoading(false);
      setLoadError('Unable to locate this submission confirmation.');
      return;
    }

    let cancelled = false;
    let unsubscribe: (() => void) | null = null;

    (async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const initial = await findIdeaDraftOrById(activeUid, currentUser, ideaId);
        if (cancelled) return;

        if (!initial) {
          setLoadError('Submission record could not be found for your account.');
          setIsLoading(false);
          return;
        }

        if (initial.status === 'draft') {
          setCurrentRoute('/submit/review');
          return;
        }

        setIdeaDoc(initial);
        setIsLoading(false);

        unsubscribe = subscribeToIdeaDraft(
          initial.id,
          initial.storageTarget,
          activeUid,
          currentUser,
          (updated) => {
            if (!cancelled) {
              setIdeaDoc(updated);
            }
          },
          () => {
            // Keep initial snapshot visible if real-time listener encounters transient disconnect
          }
        );
      } catch (err) {
        if (!cancelled) {
          setLoadError(
            err instanceof Error
              ? err.message
              : 'Unable to load submission confirmation.'
          );
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      if (unsubscribe) unsubscribe();
    };
  }, [activeUid, currentUser, ideaId, setCurrentRoute]);

  const applicantName = ideaDoc
    ? [ideaDoc.applicant.firstName, ideaDoc.applicant.surname]
        .filter(Boolean)
        .join(' ')
        .trim() || 'Submitter'
    : '';

  const sectorLabel = ideaDoc?.idea?.sector
    ? INNOVATION_SECTORS.find(
        (s) => s.id === ideaDoc.idea?.sector || s.label === ideaDoc.idea?.sector
      )?.label || ideaDoc.idea.sector
    : 'Not specified';

  return (
    <SubmitterLayout>
      <div className="max-w-3xl mx-auto space-y-5">
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-1.5 text-xs text-[#6b4f47]"
        >
          <button
            type="button"
            onClick={() => setCurrentRoute('/dashboard')}
            className="hover:text-[#a02010] transition-colors"
          >
            Home
          </button>
          <span aria-hidden="true">/</span>
          <button
            type="button"
            onClick={() => setCurrentRoute('/submissions')}
            className="hover:text-[#a02010] transition-colors"
          >
            My submissions
          </button>
          <span aria-hidden="true">/</span>
          <span className="font-semibold text-[#1c1c19]">Confirmation</span>
        </nav>

        {isLoading ? (
          <div
            aria-busy="true"
            aria-label="Loading submission confirmation"
            className="bg-white rounded-2xl border border-[#e2bfb8]/70 p-6 sm:p-8 space-y-4 animate-pulse"
          >
            <div className="h-12 w-12 rounded-2xl bg-[#f1ede8]" />
            <div className="h-6 w-64 rounded bg-[#e8dfd8]" />
            <div className="h-4 w-full max-w-md rounded bg-[#f1ede8]" />
            <div className="h-24 w-full rounded-xl bg-[#f7f3ee]" />
          </div>
        ) : loadError || !ideaDoc ? (
          <section
            role="alert"
            className="bg-white rounded-2xl border border-[#ba1a1a]/30 p-6 sm:p-8 space-y-4"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 text-[#ba1a1a] flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[22px]">
                  error_outline
                </span>
              </div>
              <div>
                <h1 className="font-headline text-lg font-bold text-[#1c1c19]">
                  Confirmation unavailable
                </h1>
                <p className="text-xs sm:text-sm text-[#5a413c] mt-1">
                  {loadError || 'Unable to load this submitted application.'}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={() => setCurrentRoute('/submissions')}
                className="h-10 px-4 rounded-xl bg-[#a02010] hover:bg-[#7c0700] text-white text-xs font-semibold transition-colors"
              >
                View My submissions
              </button>
              <button
                type="button"
                onClick={() => setCurrentRoute('/dashboard')}
                className="h-10 px-4 rounded-xl border border-[#e2bfb8] bg-white hover:bg-[#f7f3ee] text-xs font-semibold text-[#38231d] transition-colors"
              >
                Return to Dashboard
              </button>
            </div>
          </section>
        ) : (
          <section
            aria-labelledby="confirmation-heading"
            className="bg-white rounded-2xl border border-[#e2bfb8]/80 shadow-2xs p-6 sm:p-8 space-y-6"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#f1ede8] pb-5">
              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-[#eef6ee] border border-[#c4dfc9] text-[#1f5c2e] flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[28px]">
                    task_alt
                  </span>
                </div>
                <div>
                  <h1
                    id="confirmation-heading"
                    className="font-headline text-xl sm:text-2xl font-bold text-[#1c1c19]"
                  >
                    Application submitted
                  </h1>
                  <p className="text-xs sm:text-sm text-[#5a413c] mt-1">
                    Your innovation proposal has been submitted to CEDA for review.
                  </p>
                </div>
              </div>

              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f7f3ee] border border-[#e2bfb8] text-xs font-bold text-[#38231d] self-start sm:self-center shrink-0">
                <span className="w-2 h-2 rounded-full bg-[#7c0700]" aria-hidden="true" />
                <span>Submitted</span>
              </span>
            </div>

            {/* Reference Assignment Box */}
            <div className="rounded-xl bg-[#fdf9f4] border border-[#e2bfb8]/70 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#6b4f47]">
                  Application reference
                </p>
                {ideaDoc.reference ? (
                  <p className="font-headline text-lg font-extrabold text-[#7c0700] mt-1 tabular-nums">
                    {ideaDoc.reference}
                  </p>
                ) : (
                  <p
                    role="status"
                    aria-live="polite"
                    className="text-xs font-semibold text-[#5a413c] mt-1.5 flex items-center gap-2"
                  >
                    <span
                      aria-hidden="true"
                      className="w-2 h-2 rounded-full bg-[#f8a018] animate-pulse"
                    />
                    <span>Assigning your official CEDA reference number...</span>
                  </p>
                )}
              </div>

              <div className="text-left sm:text-right">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#6b4f47]">
                  Submitted date
                </p>
                <p className="text-xs font-semibold text-[#1c1c19] mt-1">
                  {formatDateDDMonYYYY(ideaDoc.submittedAt || ideaDoc.updatedAt)}
                </p>
              </div>
            </div>

            {/* Submission Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#6b4f47]">
                  Innovation title
                </p>
                <p className="text-sm font-bold text-[#1c1c19] mt-1">
                  {ideaDoc.idea?.title || 'Untitled proposal'}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#6b4f47]">
                  Applicant
                </p>
                <p className="text-sm font-semibold text-[#1c1c19] mt-1">
                  {applicantName} (
                  {ideaDoc.applicant.type === 'business'
                    ? 'Business or group'
                    : 'Individual citizen'}
                  )
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#6b4f47]">
                  Sector
                </p>
                <p className="text-xs font-semibold text-[#1c1c19] mt-1">
                  {sectorLabel}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#6b4f47]">
                  District &amp; location
                </p>
                <p className="text-xs font-semibold text-[#1c1c19] mt-1">
                  {[ideaDoc.applicant.town, ideaDoc.applicant.district]
                    .filter(Boolean)
                    .join(', ') || 'Botswana'}
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-[#f1ede8] flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setCurrentRoute('/submissions')}
                className="inline-flex items-center justify-center gap-2 h-10 px-5 rounded-xl bg-[#a02010] hover:bg-[#7c0700] text-white text-xs font-semibold transition-colors shadow-xs"
              >
                <span className="material-symbols-outlined text-[16px]">
                  folder_open
                </span>
                <span>View My submissions</span>
              </button>

              <button
                type="button"
                onClick={() => setCurrentRoute('/dashboard')}
                className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl border border-[#e2bfb8] bg-white hover:bg-[#f7f3ee] text-xs font-semibold text-[#38231d] transition-colors"
              >
                <span>Return to Dashboard</span>
              </button>
            </div>
          </section>
        )}
      </div>
    </SubmitterLayout>
  );
};
