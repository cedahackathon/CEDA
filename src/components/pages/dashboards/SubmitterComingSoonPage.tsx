/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useAuth } from '../../../context/AuthContext';
import { SubmitterLayout } from '../../submitter/SubmitterLayout';
import { SUBMITTER_NAV_ITEMS } from '../../../data/submitterMock';

interface SubmitterComingSoonPageProps {
  routePath: string;
}

export const SubmitterComingSoonPage: React.FC<SubmitterComingSoonPageProps> = ({ routePath }) => {
  const { setCurrentRoute, language } = useAuth();

  const cleanPath = routePath.split('?')[0];
  const isSubmissionDetail = cleanPath.startsWith('/submissions/') && cleanPath.length > '/submissions/'.length;
  const submissionId = isSubmissionDetail ? cleanPath.slice('/submissions/'.length) : '';

  const matchedItem = isSubmissionDetail
    ? SUBMITTER_NAV_ITEMS.find((item) => item.path === '/submissions')
    : SUBMITTER_NAV_ITEMS.find((item) => item.path === cleanPath);

  const title = isSubmissionDetail
    ? 'Submission Details'
    : matchedItem
    ? language === 'Setswana'
      ? matchedItem.labelSetswana
      : matchedItem.label
    : 'Submitter Workspace';

  const description = isSubmissionDetail
    ? `Viewing proposal docket ${submissionId}`
    : matchedItem?.description || 'This submitter workspace module is in preparation.';

  return (
    <SubmitterLayout>
      <div className="flex flex-col gap-5">
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-[#6b4f47]">
          <button
            type="button"
            onClick={() => setCurrentRoute('/dashboard')}
            className="hover:text-[#a02010] transition-colors"
          >
            Dashboard
          </button>
          <span aria-hidden="true">/</span>
          {isSubmissionDetail && (
            <>
              <button
                type="button"
                onClick={() => setCurrentRoute('/submissions')}
                className="hover:text-[#a02010] transition-colors"
              >
                My submissions
              </button>
              <span aria-hidden="true">/</span>
            </>
          )}
          <span className="font-semibold text-[#1c1c19] truncate">{title}</span>
        </nav>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="font-headline text-2xl font-bold text-[#38231d] tracking-tight">
              {title}
            </h1>
            <p className="text-xs sm:text-sm text-[#6b4f47] mt-1">{description}</p>
          </div>
          <button
            type="button"
            onClick={() => setCurrentRoute('/dashboard')}
            className="inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-lg border border-[#e2bfb8] bg-white hover:bg-[#f7f3ee] text-xs font-semibold text-[#38231d] transition-colors shrink-0 self-start sm:self-auto"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            <span>Back to Dashboard</span>
          </button>
        </div>

        <section
          aria-labelledby="submitter-coming-soon-heading"
          className="bg-white rounded-xl border border-[#e2bfb8]/80 shadow-xs p-8 sm:p-12 flex flex-col items-center text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-[#fdf9f4] border border-[#e2bfb8]/70 text-[#a02010] flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-[32px]">
              {matchedItem?.icon || 'description'}
            </span>
          </div>
          <span className="text-[11px] font-bold uppercase tracking-widest text-[#a02010] mb-1.5">
            Submitter Workspace
          </span>
          <h2
            id="submitter-coming-soon-heading"
            className="font-headline text-xl font-bold text-[#1c1c19] mb-2"
          >
            Coming soon
          </h2>
          <p className="text-sm text-[#5a413c] max-w-md mb-6 leading-relaxed">
            The <strong>{title}</strong> module is scheduled for the next CEDA Innovation Portal
            release. Your live submission overview and notifications remain accessible from the main
            dashboard.
          </p>
          <button
            type="button"
            onClick={() => setCurrentRoute('/dashboard')}
            className="inline-flex items-center justify-center gap-2 h-10 px-5 rounded-lg bg-[#a02010] hover:bg-[#7c0700] text-white text-xs font-semibold transition-colors shadow-xs"
          >
            <span className="material-symbols-outlined text-[16px]">grid_view</span>
            <span>Return to Submitter Dashboard</span>
          </button>
        </section>
      </div>
    </SubmitterLayout>
  );
};
