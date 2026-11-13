/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { auth } from '../../../config/firebase';
import { SubmitterLayout } from '../../submitter/SubmitterLayout';
import {
  DEFAULT_OPEN_CALL,
  isLiveChatAvailableNow,
  OpenCallData,
  SUBMITTER_ONBOARDING_STEPS,
  SUBMITTER_STAGES,
  SUBMITTER_STRONG_TIPS,
  SUBMITTER_SUPPORT_CONFIG,
} from '../../../data/submitterMock';
import {
  computeSubmitterStats,
  fetchOpenCall,
  fetchSubmitterIdeas,
  fetchSubmitterNotifications,
  formatDateDDMonYYYY,
  formatDateTimeCAT,
  formatPulaAmount,
  getDaysRemaining,
  IdeaStatus,
  SubmitterIdea,
  SubmitterNotification,
} from '../../../services/submitterService';

function getFirstName(fullName?: string, firstName?: string, email?: string): string {
  if (firstName && firstName.trim()) return firstName.trim();
  if (fullName && fullName.trim()) {
    return fullName.trim().split(/\s+/)[0];
  }
  if (email && email.includes('@')) {
    return email.split('@')[0];
  }
  return 'Innovator';
}

function getStatusBadgeMeta(status: IdeaStatus): {
  label: string;
  icon: string;
  classes: string;
} {
  switch (status) {
    case 'feedback_requested':
      return {
        label: 'Feedback requested',
        icon: 'rate_review',
        classes: 'bg-[#fff3e0] text-[#9a4d00] border-[#f8a018]/50',
      };
    case 'under_review':
      return {
        label: 'Under review',
        icon: 'hourglass_top',
        classes: 'bg-[#f7f3ee] text-[#38231d] border-[#e2bfb8]',
      };
    case 'approved':
      return {
        label: 'Approved',
        icon: 'check_circle',
        classes: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      };
    case 'awarded':
      return {
        label: 'Awarded',
        icon: 'workspace_premium',
        classes: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      };
    case 'declined':
      return {
        label: 'Declined',
        icon: 'cancel',
        classes: 'bg-red-50 text-[#ba1a1a] border-red-200',
      };
    case 'draft':
      return {
        label: 'Draft',
        icon: 'edit_note',
        classes: 'bg-[#f7f3ee] text-[#5a413c] border-[#e2bfb8]',
      };
    case 'submitted':
    default:
      return {
        label: 'Submitted',
        icon: 'task_alt',
        classes: 'bg-[#f7f3ee] text-[#38231d] border-[#e2bfb8]',
      };
  }
}

export const SubmitterDashboard: React.FC = () => {
  const { currentUser, setCurrentRoute } = useAuth();

  const [ideas, setIdeas] = useState<SubmitterIdea[]>([]);
  const [notifications, setNotifications] = useState<SubmitterNotification[]>([]);
  const [openCall, setOpenCall] = useState<OpenCallData>(DEFAULT_OPEN_CALL);
  const [isLoading, setIsLoading] = useState(true);
  const [ideasError, setIdeasError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [tipsExpanded, setTipsExpanded] = useState(false);
  const [liveChatAvailable, setLiveChatAvailable] = useState<boolean>(() =>
    isLiveChatAvailableNow()
  );

  const activeUid = currentUser?.id || auth?.currentUser?.uid || '';

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    setIdeasError(null);

    const [ideasResult, notificationsResult, openCallResult] = await Promise.allSettled([
      fetchSubmitterIdeas(activeUid),
      fetchSubmitterNotifications(activeUid),
      fetchOpenCall(),
    ]);

    if (ideasResult.status === 'fulfilled') {
      setIdeas(ideasResult.value);
    } else {
      const rawReason =
        ideasResult.reason instanceof Error
          ? ideasResult.reason.message
          : 'Unable to load your submissions from Firestore.';
      let friendlyReason = rawReason;
      try {
        const parsed = JSON.parse(rawReason) as { error?: string; path?: string };
        if (parsed && parsed.error) {
          friendlyReason = parsed.path
            ? `Firestore permissions prevented loading "${parsed.path}" (${parsed.error}).`
            : parsed.error;
        }
      } catch {
        // plain string message
      }
      setIdeasError(friendlyReason);
    }

    if (notificationsResult.status === 'fulfilled') {
      setNotifications(notificationsResult.value);
    }

    if (openCallResult.status === 'fulfilled') {
      setOpenCall(openCallResult.value);
    }

    setIsLoading(false);
  }, [activeUid]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // Re-evaluate Africa/Gaborone live chat hours every minute
  useEffect(() => {
    const updateAvailability = () => setLiveChatAvailable(isLiveChatAvailableNow());
    updateAvailability();
    const timer = window.setInterval(updateAvailability, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const firstName = getFirstName(currentUser?.fullName, currentUser?.firstName, currentUser?.email);
  const stats = useMemo(() => computeSubmitterStats(ideas), [ideas]);
  const unreadNotificationsCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  // Filter ideas/updates gently if user enters top-bar search text
  const normalizedSearch = searchQuery.trim().toLowerCase();
  const visibleIdeas = useMemo(() => {
    if (!normalizedSearch) return ideas;
    return ideas.filter(
      (idea) =>
        idea.title.toLowerCase().includes(normalizedSearch) ||
        idea.reference.toLowerCase().includes(normalizedSearch) ||
        idea.status.toLowerCase().includes(normalizedSearch) ||
        idea.sector.toLowerCase().includes(normalizedSearch)
    );
  }, [ideas, normalizedSearch]);

  const feedbackIdea = useMemo(
    () => ideas.find((idea) => idea.status === 'feedback_requested') || null,
    [ideas]
  );

  const activeProposal = useMemo(() => {
    const source = visibleIdeas.length > 0 ? visibleIdeas : ideas;
    if (source.length === 0) return null;
    return source.find((idea) => idea.status !== 'declined') || source[0];
  }, [visibleIdeas, ideas]);

  const recentUpdates = useMemo(() => {
    const source = normalizedSearch
      ? notifications.filter(
          (n) =>
            n.title.toLowerCase().includes(normalizedSearch) ||
            n.message.toLowerCase().includes(normalizedSearch)
        )
      : notifications;
    return source.slice(0, 4);
  }, [notifications, normalizedSearch]);

  const closingDays = getDaysRemaining(openCall.closingDateIso);
  const closingDateFormatted = formatDateDDMonYYYY(openCall.closingDateIso);
  const hasIdeas = ideas.length > 0;

  return (
    <SubmitterLayout
      ideasCount={ideas.length}
      unreadNotificationsCount={unreadNotificationsCount}
      notifications={notifications}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
    >
      <div className="flex flex-col gap-6">
        {/* Greeting + Single Primary Submit CTA Row */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-headline text-2xl sm:text-[28px] font-bold text-[#38231d] tracking-tight">
              Dumela, {firstName}
            </h1>
            <p className="text-xs sm:text-sm text-[#5a413c] mt-1">
              Welcome to the CEDA Innovation Portal. Let&apos;s turn your visionary idea into
              reality.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setCurrentRoute('/submit')}
            className="inline-flex items-center justify-center gap-2 h-10 sm:h-11 px-5 rounded-xl bg-[#a02010] hover:bg-[#7c0700] text-white text-xs sm:text-sm font-semibold shadow-xs transition-colors shrink-0 self-start sm:self-auto"
          >
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            <span>{hasIdeas ? 'Submit a new idea' : 'Submit your first idea'}</span>
          </button>
        </div>

        {/* Loading State: Skeleton Cards */}
        {isLoading ? (
          <div aria-busy="true" aria-label="Loading dashboard" className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {[0, 1, 2, 3].map((idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-xl border border-[#e2bfb8]/60 p-5 animate-pulse flex items-center justify-between"
                >
                  <div className="space-y-2.5">
                    <div className="h-3 w-24 rounded bg-[#f1ede8]" />
                    <div className="h-7 w-12 rounded bg-[#e8dfd8]" />
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-[#f1ede8]" />
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              <div className="lg:col-span-8 bg-white rounded-xl border border-[#e2bfb8]/60 p-8 animate-pulse space-y-4">
                <div className="h-5 w-48 rounded bg-[#e8dfd8]" />
                <div className="h-4 w-full max-w-md rounded bg-[#f1ede8]" />
                <div className="h-24 w-full rounded-xl bg-[#f7f3ee]" />
              </div>
              <div className="lg:col-span-4 space-y-5">
                <div className="bg-white rounded-xl border border-[#e2bfb8]/60 p-6 animate-pulse space-y-3">
                  <div className="h-4 w-20 rounded bg-[#f1ede8]" />
                  <div className="h-5 w-full rounded bg-[#e8dfd8]" />
                  <div className="h-20 w-full rounded-xl bg-[#f7f3ee]" />
                </div>
                <div className="bg-white rounded-xl border border-[#e2bfb8]/60 p-6 animate-pulse space-y-3">
                  <div className="h-4 w-28 rounded bg-[#e8dfd8]" />
                  <div className="h-10 w-full rounded-xl bg-[#f1ede8]" />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            {ideasError && (
              <section
                role="alert"
                className="bg-white rounded-xl border border-[#ba1a1a]/30 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-50 text-[#ba1a1a] flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[22px]">error_outline</span>
                  </div>
                  <div>
                    <h2 className="font-headline text-sm sm:text-base font-bold text-[#1c1c19]">
                      Unable to load live submissions
                    </h2>
                    <p className="text-xs text-[#5a413c] mt-0.5">{ideasError}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={loadDashboard}
                  className="inline-flex items-center justify-center gap-2 h-9 px-4 rounded-xl bg-[#a02010] hover:bg-[#7c0700] text-white text-xs font-semibold transition-colors shrink-0 self-start sm:self-auto"
                >
                  <span className="material-symbols-outlined text-[16px]">refresh</span>
                  <span>Retry</span>
                </button>
              </section>
            )}
            {/* 4 Stat Cards */}
            <section
              aria-label="Submission statistics"
              className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4"
            >
              <button
                type="button"
                onClick={() => setCurrentRoute('/submissions')}
                className="bg-white rounded-xl border border-[#e2bfb8]/70 hover:border-[#a02010]/40 p-5 shadow-2xs transition-colors flex items-center justify-between text-left"
              >
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#6b4f47]">
                    Total ideas
                  </span>
                  <p className="font-headline text-2xl sm:text-[28px] font-bold text-[#1c1c19] tabular-nums mt-1">
                    {stats.totalIdeas}
                  </p>
                </div>
                <span
                  aria-hidden="true"
                  className="w-10 h-10 rounded-xl bg-[#f7f3ee] text-[#6b4f47] flex items-center justify-center shrink-0"
                >
                  <span className="material-symbols-outlined text-[20px]">folder</span>
                </span>
              </button>

              <button
                type="button"
                onClick={() => setCurrentRoute('/submissions')}
                className="bg-white rounded-xl border border-[#e2bfb8]/70 hover:border-[#a02010]/40 p-5 shadow-2xs transition-colors flex items-center justify-between text-left"
              >
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#6b4f47]">
                    Under review
                  </span>
                  <p className="font-headline text-2xl sm:text-[28px] font-bold text-[#1c1c19] tabular-nums mt-1">
                    {stats.underReview}
                  </p>
                </div>
                <span
                  aria-hidden="true"
                  className="w-10 h-10 rounded-xl bg-[#f7f3ee] text-[#6b4f47] flex items-center justify-center shrink-0"
                >
                  <span className="material-symbols-outlined text-[20px]">hourglass_empty</span>
                </span>
              </button>

              <button
                type="button"
                onClick={() => setCurrentRoute('/submissions')}
                className="bg-white rounded-xl border border-[#e2bfb8]/70 hover:border-[#a02010]/40 p-5 shadow-2xs transition-colors flex items-center justify-between text-left"
              >
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#6b4f47]">
                    Feedback requested
                  </span>
                  <p className="font-headline text-2xl sm:text-[28px] font-bold text-[#1c1c19] tabular-nums mt-1">
                    {stats.feedbackRequested}
                  </p>
                </div>
                <span
                  aria-hidden="true"
                  className="w-10 h-10 rounded-xl bg-[#f7f3ee] text-[#6b4f47] flex items-center justify-center shrink-0"
                >
                  <span className="material-symbols-outlined text-[20px]">chat_bubble_outline</span>
                </span>
              </button>

              <button
                type="button"
                onClick={() => setCurrentRoute('/submissions')}
                className="bg-white rounded-xl border border-[#e2bfb8]/70 hover:border-[#a02010]/40 p-5 shadow-2xs transition-colors flex items-center justify-between text-left"
              >
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#6b4f47]">
                    Approved
                  </span>
                  <p className="font-headline text-2xl sm:text-[28px] font-bold text-[#1c1c19] tabular-nums mt-1">
                    {stats.approved}
                  </p>
                </div>
                <span
                  aria-hidden="true"
                  className="w-10 h-10 rounded-xl bg-[#f7f3ee] text-[#6b4f47] flex items-center justify-center shrink-0"
                >
                  <span className="material-symbols-outlined text-[20px]">workspace_premium</span>
                </span>
              </button>
            </section>

            {/* Feedback Requested Banner (only in populated state when any idea has status "feedback_requested") */}
            {hasIdeas && feedbackIdea && (
              <section
                aria-label="Action required feedback banner"
                className="bg-[#fff7ed] border border-[#f8a018]/60 rounded-xl px-4 sm:px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
              >
                <div className="flex items-start sm:items-center gap-3 min-w-0">
                  <span className="w-9 h-9 rounded-lg bg-[#a02010]/10 text-[#a02010] flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[20px]">rate_review</span>
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-bold text-[#1c1c19] truncate">
                      {feedbackIdea.title}
                    </p>
                    <p className="text-xs text-[#6b4f47] mt-0.5">
                      Evaluator clarification required ·{' '}
                      <span className="font-semibold text-[#7c0700]">
                        Respond by{' '}
                        {feedbackIdea.feedbackDeadlineIso
                          ? formatDateDDMonYYYY(feedbackIdea.feedbackDeadlineIso)
                          : 'within 7 working days'}
                      </span>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentRoute(`/submissions/${feedbackIdea.id}`)}
                  className="inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-lg bg-[#a02010] hover:bg-[#7c0700] text-white text-xs font-semibold transition-colors shrink-0 self-start sm:self-auto"
                >
                  <span>Respond now</span>
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </button>
              </section>
            )}

            {/* Main 2-Column Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Left Column (8 cols) */}
              <div className="lg:col-span-8 space-y-5">
                {!hasIdeas ? (
                  /* EMPTY STATE CARD */
                  <section
                    aria-labelledby="empty-ideas-heading"
                    className="bg-white rounded-2xl border border-[#e2bfb8]/70 shadow-2xs p-6 sm:p-10 lg:p-12 flex flex-col items-center text-center"
                  >
                    <div className="w-20 h-20 rounded-full bg-[#fbf3ef] border border-[#e2bfb8]/60 text-[#a02010] flex items-center justify-center mb-6">
                      <span className="material-symbols-outlined text-[34px]">description</span>
                    </div>

                    <h2
                      id="empty-ideas-heading"
                      className="font-headline text-xl sm:text-2xl font-bold text-[#38231d]"
                    >
                      You have not submitted an idea yet
                    </h2>

                    <p className="text-xs sm:text-sm text-[#5a413c] max-w-lg mt-3 leading-relaxed">
                      Transform your innovative concept into commercial reality. Citizen
                      entrepreneurs, researchers, and registered youth enterprises in Botswana can
                      access grants, technical mentorship, and advisory support.
                    </p>

                    <button
                      type="button"
                      onClick={() => setCurrentRoute('/submit')}
                      className="mt-7 inline-flex items-center justify-center gap-2 h-11 px-6 rounded-xl bg-[#a02010] hover:bg-[#7c0700] text-white text-xs sm:text-sm font-semibold shadow-xs transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px]">add</span>
                      <span>Start your first submission</span>
                    </button>

                    <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-5 text-xs text-[#6b4f47]">
                      <span className="max-w-xs sm:text-right">
                        Or browse active sectoral open calls and funding guidelines before applying.
                      </span>
                      <button
                        type="button"
                        onClick={() => setCurrentRoute('/guidelines')}
                        className="font-semibold text-[#a02010] hover:text-[#7c0700] inline-flex items-center gap-1 whitespace-nowrap"
                      >
                        <span>View open calls & eligibility</span>
                        <span aria-hidden="true">→</span>
                      </button>
                    </div>

                    {/* 3-Step Strip */}
                    <div className="mt-8 w-full rounded-xl bg-[#f9f5ef] border border-[#e2bfb8]/50 px-4 py-4">
                      <ol className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-2 text-xs text-[#38231d]">
                        {SUBMITTER_ONBOARDING_STEPS.map((item, idx) => (
                          <React.Fragment key={item.step}>
                            <li>
                              <button
                                type="button"
                                onClick={() => setCurrentRoute(item.route)}
                                className="flex items-center gap-2.5 text-left hover:text-[#a02010] transition-colors group"
                              >
                                <span className="w-6 h-6 rounded-full bg-white border border-[#e2bfb8] text-[#38231d] group-hover:border-[#a02010] group-hover:text-[#a02010] font-bold text-[11px] flex items-center justify-center shrink-0 tabular-nums">
                                  {item.step}
                                </span>
                                <span className="font-medium leading-snug">{item.label}</span>
                              </button>
                            </li>
                            {idx < SUBMITTER_ONBOARDING_STEPS.length - 1 && (
                              <li
                                aria-hidden="true"
                                className="hidden sm:flex items-center text-[#8d706b]"
                              >
                                <span className="material-symbols-outlined text-[16px]">
                                  arrow_forward
                                </span>
                              </li>
                            )}
                          </React.Fragment>
                        ))}
                      </ol>
                    </div>
                  </section>
                ) : (
                  /* POPULATED STATE: Active Proposal + Recent Updates */
                  <>
                    {activeProposal && (
                      <section
                        aria-labelledby="active-proposal-heading"
                        className="bg-white rounded-2xl border border-[#e2bfb8]/70 shadow-2xs p-5 sm:p-6 space-y-5"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                          <div className="min-w-0">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-[#6b4f47]">
                              Active proposal
                            </span>
                            <h2 id="active-proposal-heading" className="mt-1">
                              <button
                                type="button"
                                onClick={() => setCurrentRoute(`/submissions/${activeProposal.id}`)}
                                className="font-headline text-lg sm:text-xl font-bold text-[#38231d] hover:text-[#a02010] transition-colors text-left"
                              >
                                {activeProposal.title}
                              </button>
                            </h2>
                          </div>

                          {(() => {
                            const badge = getStatusBadgeMeta(activeProposal.status);
                            return (
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold shrink-0 self-start ${badge.classes}`}
                              >
                                <span className="material-symbols-outlined text-[15px]">
                                  {badge.icon}
                                </span>
                                <span>{badge.label}</span>
                              </span>
                            );
                          })()}
                        </div>

                        {/* Metadata strip */}
                        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-[#5a413c] bg-[#fdf9f4] rounded-xl border border-[#e2bfb8]/50 px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[16px] text-[#77574e]">
                              tag
                            </span>
                            <span>
                              Reference:{' '}
                              <strong className="text-[#1c1c19] font-semibold">
                                {activeProposal.reference}
                              </strong>
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[16px] text-[#77574e]">
                              category
                            </span>
                            <span>
                              Sector:{' '}
                              <strong className="text-[#1c1c19] font-semibold">
                                {activeProposal.sector}
                              </strong>
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[16px] text-[#77574e]">
                              location_on
                            </span>
                            <span>
                              Location:{' '}
                              <strong className="text-[#1c1c19] font-semibold">
                                {activeProposal.location}
                              </strong>
                            </span>
                          </div>
                          {activeProposal.requestedAmountBwp !== null && (
                            <div className="flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-[16px] text-[#77574e]">
                                payments
                              </span>
                              <span className="tabular-nums">
                                Requested:{' '}
                                <strong className="text-[#1c1c19] font-semibold">
                                  {formatPulaAmount(activeProposal.requestedAmountBwp)}
                                </strong>
                              </span>
                            </div>
                          )}
                        </div>

                        {/* 5-Stage Tracker */}
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-[#38231d]">
                              Evaluation lifecycle
                            </span>
                            <span className="text-[#6b4f47] font-medium tabular-nums">
                              Stage {activeProposal.stageStep} of 5
                            </span>
                          </div>

                          <ol className="grid grid-cols-5 gap-1.5 sm:gap-2">
                            {SUBMITTER_STAGES.map((stage) => {
                              const isCompleted = stage.step < activeProposal.stageStep;
                              const isCurrent = stage.step === activeProposal.stageStep;

                              return (
                                <li key={stage.key} className="flex flex-col items-center text-center gap-1.5">
                                  <div className="w-full flex items-center">
                                    <div
                                      className={`h-1.5 flex-1 rounded-l-full ${
                                        stage.step === 1
                                          ? 'opacity-0'
                                          : stage.step <= activeProposal.stageStep
                                          ? 'bg-[#a02010]'
                                          : 'bg-[#e8dfd8]'
                                      }`}
                                    />
                                    <span
                                      aria-current={isCurrent ? 'step' : undefined}
                                      className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 transition-colors tabular-nums ${
                                        isCompleted
                                          ? 'bg-[#a02010] text-white'
                                          : isCurrent
                                          ? 'bg-[#a02010] text-white ring-4 ring-[#a02010]/15'
                                          : 'bg-[#f1ede8] text-[#6b4f47] border border-[#e2bfb8]'
                                      }`}
                                    >
                                      {isCompleted ? (
                                        <span className="material-symbols-outlined text-[15px]">
                                          check
                                        </span>
                                      ) : (
                                        stage.step
                                      )}
                                    </span>
                                    <div
                                      className={`h-1.5 flex-1 rounded-r-full ${
                                        stage.step === 5
                                          ? 'opacity-0'
                                          : stage.step < activeProposal.stageStep
                                          ? 'bg-[#a02010]'
                                          : 'bg-[#e8dfd8]'
                                      }`}
                                    />
                                  </div>
                                  <span
                                    className={`text-[11px] leading-tight ${
                                      isCurrent
                                        ? 'font-bold text-[#a02010]'
                                        : isCompleted
                                        ? 'font-semibold text-[#1c1c19]'
                                        : 'font-medium text-[#6b4f47]'
                                    }`}
                                  >
                                    {stage.label}
                                  </span>
                                </li>
                              );
                            })}
                          </ol>
                        </div>

                        {/* Day X of 14 SLA Progress Bar */}
                        <div className="pt-2 border-t border-[#f1ede8] space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-medium text-[#5a413c]">
                              Stage SLA turnaround
                            </span>
                            <span className="font-bold text-[#38231d] tabular-nums">
                              Day {activeProposal.dayInStage} of 14
                            </span>
                          </div>
                          <div
                            role="progressbar"
                            aria-label="Stage SLA progress"
                            aria-valuenow={activeProposal.dayInStage}
                            aria-valuemin={1}
                            aria-valuemax={14}
                            className="h-2.5 w-full rounded-full bg-[#f1ede8] overflow-hidden"
                          >
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                activeProposal.dayInStage >= 12 ? 'bg-[#a02010]' : 'bg-[#7c0700]'
                              }`}
                              style={{
                                width: `${Math.min(
                                  100,
                                  Math.round((activeProposal.dayInStage / 14) * 100)
                                )}%`,
                              }}
                            />
                          </div>
                        </div>
                      </section>
                    )}

                    {/* Recent Updates Card (4 items from notifications) */}
                    <section
                      aria-labelledby="recent-updates-heading"
                      className="bg-white rounded-2xl border border-[#e2bfb8]/70 shadow-2xs overflow-hidden"
                    >
                      <div className="px-5 sm:px-6 py-4 border-b border-[#f1ede8] flex items-center justify-between">
                        <h2
                          id="recent-updates-heading"
                          className="font-headline text-base font-bold text-[#38231d]"
                        >
                          Recent updates
                        </h2>
                        <button
                          type="button"
                          onClick={() => setCurrentRoute('/notifications')}
                          className="text-xs font-semibold text-[#a02010] hover:text-[#7c0700] inline-flex items-center gap-1"
                        >
                          <span>View all</span>
                          <span aria-hidden="true">→</span>
                        </button>
                      </div>

                      {recentUpdates.length === 0 ? (
                        <div className="px-6 py-8 text-center text-xs text-[#6b4f47]">
                          {normalizedSearch
                            ? 'No updates match your search filter.'
                            : 'No portal notifications yet. Stage transitions and evaluator notes will appear here.'}
                        </div>
                      ) : (
                        <ul className="divide-y divide-[#f1ede8]">
                          {recentUpdates.map((item) => (
                            <li key={item.id}>
                              <button
                                type="button"
                                onClick={() => setCurrentRoute(item.route || '/notifications')}
                                className="w-full px-5 sm:px-6 py-3.5 text-left hover:bg-[#fdf9f4] transition-colors flex items-start gap-3"
                              >
                                <span
                                  aria-label={item.read ? 'Read' : 'Unread'}
                                  className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${
                                    item.read ? 'bg-[#e2bfb8]' : 'bg-[#a02010]'
                                  }`}
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5">
                                    <span className="text-xs sm:text-sm font-semibold text-[#1c1c19] truncate">
                                      {item.title}
                                    </span>
                                    <span className="text-[11px] text-[#77574e] shrink-0">
                                      {formatDateTimeCAT(item.createdAt)}
                                    </span>
                                  </div>
                                  <p className="text-xs text-[#5a413c] mt-0.5 line-clamp-2">
                                    {item.message}
                                  </p>
                                </div>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </section>
                  </>
                )}
              </div>

              {/* Right Column (4 cols — unchanged across empty & populated states) */}
              <aside aria-label="Calls and support resources" className="lg:col-span-4 space-y-5">
                {/* Open Call Card */}
                <section
                  aria-labelledby="open-call-heading"
                  className="bg-white rounded-2xl border border-[#e2bfb8]/70 shadow-2xs p-5 sm:p-6 space-y-4"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-[#ffdad4]/70 text-[#7c0700] text-[10px] font-extrabold uppercase tracking-wider">
                      {openCall.badgeLabel}
                    </span>
                    <span
                      aria-hidden="true"
                      className="material-symbols-outlined text-[18px] text-[#77574e]"
                    >
                      campaign
                    </span>
                  </div>

                  <div>
                    <h2
                      id="open-call-heading"
                      className="font-headline text-base font-bold text-[#1c1c19] leading-snug"
                    >
                      {openCall.title}
                    </h2>
                    <p className="text-xs text-[#6b4f47] mt-1">{openCall.sponsor}</p>
                  </div>

                  <div className="rounded-xl bg-[#f9f5ef] border border-[#e2bfb8]/60 p-4 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#6b4f47]">
                      Available funding pool
                    </span>
                    <p className="font-headline text-lg sm:text-xl font-bold text-[#a02010] tabular-nums">
                      Up to {formatPulaAmount(openCall.fundingMaxBwp)}
                    </p>
                    <p className="text-xs text-[#5a413c]">{openCall.fundingSplitLabel}</p>
                  </div>

                  <div className="flex items-start gap-2 text-xs text-[#5a413c]">
                    <span className="material-symbols-outlined text-[16px] text-[#77574e] mt-0.5 shrink-0">
                      calendar_today
                    </span>
                    <span>
                      Closes in <strong className="text-[#1c1c19]">{closingDays} days</strong> (
                      {closingDateFormatted})
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setCurrentRoute(openCall.guidelinesRoute || '/guidelines')}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#a02010] hover:text-[#7c0700] transition-colors"
                  >
                    <span>Read guidelines and criteria</span>
                    <span aria-hidden="true">→</span>
                  </button>
                </section>

                {/* Need Help Card */}
                <section
                  aria-labelledby="need-help-heading"
                  className="bg-white rounded-2xl border border-[#e2bfb8]/70 shadow-2xs p-5 sm:p-6 space-y-4"
                >
                  <div className="flex items-center justify-between gap-2">
                    <h2
                      id="need-help-heading"
                      className="font-headline text-base font-bold text-[#1c1c19]"
                    >
                      Need help?
                    </h2>
                    <span
                      aria-hidden="true"
                      className="material-symbols-outlined text-[20px] text-[#77574e]"
                    >
                      headset_mic
                    </span>
                  </div>

                  <p className="text-xs text-[#5a413c] leading-relaxed">
                    {SUBMITTER_SUPPORT_CONFIG.advisoryCopy}
                  </p>

                  <div className="space-y-1.5">
                    <button
                      type="button"
                      disabled={!liveChatAvailable}
                      onClick={() => setCurrentRoute('/help-center')}
                      aria-describedby={!liveChatAvailable ? 'chat-unavailable-note' : undefined}
                      className={`w-full h-10 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors ${
                        liveChatAvailable
                          ? 'bg-[#a02010] hover:bg-[#7c0700] text-white shadow-xs cursor-pointer'
                          : 'bg-[#f7f3ee] text-[#6b4f47] border border-[#e2bfb8]/60 cursor-not-allowed opacity-85'
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className={`w-2 h-2 rounded-full ${
                          liveChatAvailable ? 'bg-emerald-300' : 'bg-[#8d706b]'
                        }`}
                      />
                      <span>Start live chat</span>
                    </button>
                    {!liveChatAvailable && (
                      <p
                        id="chat-unavailable-note"
                        className="text-[11px] font-medium text-[#7c0700] text-center"
                      >
                        {SUBMITTER_SUPPORT_CONFIG.chatUnavailableLabel}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2 pt-1 text-xs text-[#5a413c]">
                    <div className="flex items-start gap-2">
                      <span className="material-symbols-outlined text-[16px] text-[#77574e] mt-0.5 shrink-0">
                        schedule
                      </span>
                      <span>{SUBMITTER_SUPPORT_CONFIG.chatHoursLabel}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px] text-[#77574e] shrink-0">
                        call
                      </span>
                      <span>
                        Toll-free:{' '}
                        <strong className="text-[#1c1c19] font-semibold">
                          {SUBMITTER_SUPPORT_CONFIG.hotline}
                        </strong>
                      </span>
                    </div>
                  </div>
                </section>

                {/* Tips for a strong submission (collapsed by default) */}
                <section
                  aria-labelledby="tips-heading"
                  className="bg-white rounded-2xl border border-[#e2bfb8]/70 shadow-2xs overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => setTipsExpanded((prev) => !prev)}
                    aria-expanded={tipsExpanded}
                    aria-controls="strong-submission-tips-panel"
                    className="w-full p-5 flex items-center justify-between gap-3 text-left hover:bg-[#fdf9f4] transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        aria-hidden="true"
                        className="w-8 h-8 rounded-lg bg-[#ffdad4]/60 text-[#a02010] flex items-center justify-center shrink-0"
                      >
                        <span className="material-symbols-outlined text-[18px]">lightbulb</span>
                      </span>
                      <h2
                        id="tips-heading"
                        className="font-headline text-sm font-bold text-[#1c1c19] leading-snug"
                      >
                        Tips for a strong submission
                      </h2>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="px-2 py-0.5 rounded-md bg-[#f7f3ee] border border-[#e2bfb8]/60 text-[11px] font-semibold text-[#5a413c] tabular-nums">
                        {SUBMITTER_STRONG_TIPS.length} tips
                      </span>
                      <span className="material-symbols-outlined text-[20px] text-[#5a413c]">
                        {tipsExpanded ? 'expand_less' : 'expand_more'}
                      </span>
                    </div>
                  </button>

                  {tipsExpanded && (
                    <div
                      id="strong-submission-tips-panel"
                      className="px-5 pb-5 pt-1 border-t border-[#f1ede8] space-y-3"
                    >
                      {SUBMITTER_STRONG_TIPS.map((tip, index) => (
                        <div key={tip.id} className="pt-2">
                          <p className="text-xs font-bold text-[#38231d]">
                            {index + 1}. {tip.title}
                          </p>
                          <p className="text-xs text-[#5a413c] mt-0.5 leading-relaxed">
                            {tip.detail}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </aside>
            </div>
          </>
        )}
      </div>
    </SubmitterLayout>
  );
};
