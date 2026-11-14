/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

interface FundedStory {
  id: string;
  firstName: string;
  district: string;
  sector: string;
  capitalAwarded: string;
  imageSrc: string;
  imageAlt: string;
  summary: string;
}

const FUNDED_STORIES: FundedStory[] = [
  {
    id: 'maun-agritech',
    firstName: 'Kabo',
    district: 'Ngamiland (Maun)',
    sector: 'Agri-Tech',
    capitalAwarded: 'P 320,000',
    imageSrc: '/images/story-maun.jpg',
    imageAlt: 'Founder inspecting solar panels beside an agricultural cold storage unit in Maun',
    summary: 'Off-grid solar cold rooms cutting horticulture spoilage for smallholder cooperatives.',
  },
  {
    id: 'francistown-manufacturing',
    firstName: 'Lesedi',
    district: 'North-East (Francistown)',
    sector: 'Green Manufacturing',
    capitalAwarded: 'P 450,000',
    imageSrc: '/images/story-francistown.jpg',
    imageAlt: 'Founder examining eco-composite building material samples in a Francistown workshop',
    summary: 'Recycled polymer and quarry-dust paving blocks manufactured for regional councils.',
  },
  {
    id: 'palapye-cleantech',
    firstName: 'Tshepo',
    district: 'Central (Palapye)',
    sector: 'Water & Clean Tech',
    capitalAwarded: 'P 280,000',
    imageSrc: '/images/story-palapye.jpg',
    imageAlt: 'Engineer testing water quality monitoring electronics in a Palapye workshop',
    summary: 'Low-power borehole salinity sensors built for communal grazing syndicates.',
  },
];

const TIMELINE_STAGES = [
  {
    step: '01',
    title: 'Submit',
    timing: '∼ 20 Mins',
    description:
      'Register your Omang and submit your concept, market thesis, and pitch deck in under 20 minutes.',
  },
  {
    step: '02',
    title: 'Review',
    timing: '7-10 Days',
    description:
      'Independent sector specialists assess viability, commercial scalability, and local job impact.',
  },
  {
    step: '03',
    title: 'Feedback',
    timing: 'Interactive',
    description:
      'Receive detailed, actionable written critiques and guidance directly from committee members.',
  },
  {
    step: '04',
    title: 'Approval',
    timing: 'Adjudication',
    description:
      'Formal adjudication by CEDA executive boards with clear funding recommendation.',
  },
  {
    step: '05',
    title: 'Award',
    timing: 'Disbursement',
    description:
      'Grant disbursement in Pula, tailored incubation, and entry into CEDA mentorship networks.',
  },
];

const TRACKER_STEPS = ['Submit', 'Review', 'Feedback', 'Approval', 'Award'];

export const LandingPage: React.FC = () => {
  const { currentUser, setCurrentRoute } = useAuth();

  // Reference lookup state
  const [trackingInput, setTrackingInput] = useState('');
  const [trackingResult, setTrackingResult] = useState<string | null>(null);
  const [trackedStageIndex, setTrackedStageIndex] = useState<number>(1);

  // Image fallback state (CSS/SVG fallback if /images/*.jpg is missing)
  const [heroImageFailed, setHeroImageFailed] = useState(false);
  const [failedStoryIds, setFailedStoryIds] = useState<Record<string, boolean>>({});

  // Hide mobile sticky CTA bar when footer enters viewport
  const [isNearFooter, setIsNearFooter] = useState(false);

  // Countdown timer for next intake cycle deadline
  const [countdown, setCountdown] = useState({
    days: 14,
    hours: 8,
    minutes: 42,
    seconds: 18,
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        } else if (prev.hours > 0) {
          return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 };
        } else if (prev.days > 0) {
          return { ...prev, days: prev.days - 1, hours: 23, minutes: 59, seconds: 59 };
        }
        return prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') {
      return;
    }
    const footerEl = document.querySelector('footer');
    if (!footerEl) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const isVisible = entries.some((entry) => entry.isIntersecting);
        setIsNearFooter(isVisible);
      },
      { rootMargin: '80px 0px 0px 0px', threshold: 0.01 }
    );

    observer.observe(footerEl);
    return () => observer.disconnect();
  }, []);

  const handleTrack = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = trackingInput.trim().toUpperCase();
    if (!clean) {
      setTrackingResult(
        'Please enter a submission tracking reference code (e.g. CEDA-INN-2026-0842).'
      );
      return;
    }
    if (clean.includes('0842') || clean.includes('CEDA-INN')) {
      setTrackedStageIndex(1);
      setTrackingResult(
        'Reference Found: "Solar-Powered Smart Grain Silos" (Stage 2: Under Review). Sign in with your registered account to view your full blinded evaluation dossier.'
      );
    } else {
      setTrackedStageIndex(0);
      setTrackingResult(
        `Reference "${clean}" entered. Sign in to your verified CEDA account to access submission records.`
      );
    }
  };

  const handleDashboardRedirect = () => {
    if (!currentUser) {
      setCurrentRoute('/register');
      return;
    }
    if (currentUser.role === 'SUBMITTER') setCurrentRoute('/dashboard');
    else if (currentUser.role === 'EVALUATOR') setCurrentRoute('/dashboard/evaluator');
    else if (currentUser.role === 'ADJUDICATOR') setCurrentRoute('/dashboard/adjudicator');
    else if (currentUser.role === 'ADMIN') setCurrentRoute('/admin');
    else setCurrentRoute('/dashboard/stakeholder');
  };

  const activeMarkerPercent = Math.round(((trackedStageIndex + 0.5) / TRACKER_STEPS.length) * 100);

  return (
    <div className="landing-page w-full flex flex-col bg-[#fdf9f4] text-[#1c1c19] overflow-x-clip">
      {/* SECTION 1: HERO (Full-bleed documentary background with warm contrast scrim) */}
      <section className="relative w-full overflow-hidden bg-[#241814] pt-14 pb-24 sm:pt-20 sm:pb-28 lg:pt-24 lg:pb-32 border-b border-[#e2bfb8]/40">
        {/* Full-bleed Hero Background Image + Pattern Fallback */}
        <div className="absolute inset-0 z-0">
          {!heroImageFailed ? (
            <img
              src="/images/hero.jpg"
              alt="Batswana entrepreneurs reviewing blueprints and solar hardware prototypes in a sunlit workshop"
              width={1376}
              height={768}
              fetchPriority="high"
              referrerPolicy="no-referrer"
              onError={() => setHeroImageFailed(true)}
              className="w-full h-full object-cover object-center lg:object-[72%_center]"
            />
          ) : (
            <div
              aria-hidden="true"
              className="w-full h-full bg-[#3a120b] landing-weave-pattern"
            />
          )}

          {/* Directional warm dark scrim: high contrast for text on the left/mobile, preserves photo warmth on the right */}
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-b from-[#1a110f]/82 via-[#1a110f]/75 to-[#1a110f]/85 lg:bg-gradient-to-r lg:from-[#1a110f]/92 lg:via-[#24130f]/76 lg:to-[#24130f]/35"
          />
          <div
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#1a110f]/70 to-transparent"
          />
        </div>

        <div className="relative z-10 max-w-[1200px] mx-auto px-4 md:px-8 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-end">
          {/* Left Column: Focal Headline + One Supporting Sentence + Single Primary CTA */}
          <div className="lg:col-span-7 flex flex-col items-start gap-6">
            <p className="text-sm font-semibold text-[#f8c808] tracking-normal">
              Citizen Entrepreneurial Development Agency · Botswana
            </p>

            <h1 className="landing-display text-[clamp(2.75rem,5vw,4.5rem)] font-bold text-white leading-[1.06] tracking-tight [text-wrap:balance]">
              Your idea. Evaluated fairly. Rewarded.
            </h1>

            <p className="text-base sm:text-lg text-[#fdf9f4]/92 leading-relaxed max-w-[54ch]">
              Submit your innovative idea to CEDA, track every stage in real time and get feedback
              from expert evaluators.
            </p>

            <div className="flex flex-wrap items-center gap-6 pt-1">
              {currentUser ? (
                <button
                  type="button"
                  onClick={handleDashboardRedirect}
                  className="min-h-[48px] px-7 py-3 rounded-lg bg-[#a02010] hover:bg-[#7c0700] active:bg-[#5e0500] text-white text-base font-semibold shadow-md transition-colors cursor-pointer"
                >
                  Open {currentUser.role.toLowerCase()} dashboard
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setCurrentRoute('/register')}
                  className="min-h-[48px] px-7 py-3 rounded-lg bg-[#a02010] hover:bg-[#7c0700] active:bg-[#5e0500] text-white text-base font-semibold shadow-md transition-colors cursor-pointer"
                >
                  Submit an idea
                </button>
              )}

              <a
                href="#how-it-works"
                className="min-h-[44px] inline-flex items-center text-base font-semibold text-[#f8c808] hover:text-white transition-colors"
              >
                How it works
              </a>
            </div>

            {currentUser && (
              <p className="text-sm text-[#fdf9f4]/90 pt-1">
                Signed in as <strong className="text-white">{currentUser.firstName} {currentUser.surname}</strong> · Role: {currentUser.role}
              </p>
            )}
          </div>

          {/* Right Column: Quiet caption anchored over open background image */}
          <div className="lg:col-span-5 flex flex-col lg:items-end lg:text-right justify-end gap-1.5 text-[#fdf9f4] pt-2 lg:pb-1">
            <p className="text-sm sm:text-base font-semibold text-white leading-snug">
              Double-blind merit scoring across all districts
            </p>
            <p className="text-sm text-[#fdf9f4]/85">
              14-Day SLA Guarantee · Up to BWP 500,000 seed-stage support
            </p>
            <span className="text-xs font-semibold text-[#f8c808] tracking-wide mt-0.5">
              #KaeKapaKae
            </span>
          </div>
        </div>
      </section>

      {/* SIGNATURE ELEMENT: Overlapping Application-Tracker Card */}
      <section
        aria-labelledby="tracker-heading"
        className="relative z-20 -mt-12 sm:-mt-14 w-full max-w-[1140px] mx-auto px-4 md:px-8"
      >
        <div className="bg-white rounded-2xl border border-[#e2bfb8] shadow-[0_20px_50px_rgba(62,42,37,0.10)] overflow-hidden">
          <div className="h-1.5 w-full landing-sunrise-line" aria-hidden="true" />

          <div className="p-6 sm:p-8 flex flex-col gap-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <h2
                  id="tracker-heading"
                  className="landing-display text-xl sm:text-2xl font-bold text-[#1c1c19]"
                >
                  Track an existing application
                </h2>
                <p className="text-base text-[#4a3530] mt-1 max-w-[60ch]">
                  Check where your submission sits in CEDA’s five-stage review pipeline.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[#4a3530]">
                <span>100% Citizen Owned</span>
                <span aria-hidden="true">·</span>
                <span className="font-semibold text-[#7c0700]">BDPA Compliant</span>
              </div>
            </div>

            {/* Single orchestrated progress animation on initial page load */}
            <div className="pt-1 pb-2" aria-label="Five-stage CEDA application progress rail">
              <div className="relative">
                {/* Base Rail */}
                <div className="h-2 w-full rounded-full bg-[#efe7de] overflow-hidden">
                  <div
                    className="h-full rounded-full landing-sunrise-line landing-tracker-fill"
                    style={{ width: `${activeMarkerPercent}%` }}
                  />
                </div>

                {/* Animated Progress Marker */}
                <div
                  className="hidden sm:flex absolute top-1/2 -translate-y-1/2 -translate-x-1/2 items-center justify-center w-6 h-6 rounded-full bg-[#7c0700] ring-4 ring-[#fdf9f4] border-2 border-[#f8a018] landing-tracker-marker"
                  style={{ left: `${activeMarkerPercent}%` }}
                  aria-hidden="true"
                >
                  <span className="w-2 h-2 rounded-full bg-[#f8c808]" />
                </div>
              </div>

              <ol className="grid grid-cols-5 gap-1 sm:gap-2 mt-3 text-[11px] sm:text-sm">
                {TRACKER_STEPS.map((stageName, idx) => {
                  const isCompleted = idx < trackedStageIndex;
                  const isCurrent = idx === trackedStageIndex;
                  return (
                    <li
                      key={stageName}
                      className={`flex flex-col sm:flex-row sm:items-center gap-1 ${
                        isCurrent
                          ? 'text-[#7c0700] font-bold'
                          : isCompleted
                          ? 'text-[#1c1c19] font-semibold'
                          : 'text-[#6c554f]'
                      }`}
                    >
                      <span className="tabular-nums text-xs opacity-80">0{idx + 1}</span>
                      <span className="truncate">{stageName}</span>
                    </li>
                  );
                })}
              </ol>
            </div>

            {/* Working Reference Lookup Form */}
            <form
              onSubmit={handleTrack}
              className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
            >
              <label htmlFor="landing-tracker-input" className="sr-only">
                Application reference code
              </label>
              <input
                id="landing-tracker-input"
                type="text"
                value={trackingInput}
                onChange={(e) => {
                  setTrackingInput(e.target.value);
                  setTrackingResult(null);
                }}
                placeholder="Enter reference code, e.g. CEDA-INN-2026-0842"
                className="flex-1 min-h-[46px] px-4 py-2.5 bg-[#fdf9f4] border border-[#c9b9b0] rounded-lg text-base font-mono text-[#1c1c19] placeholder:text-[#6c554f] focus:outline-none focus:ring-2 focus:ring-[#f8a018]"
              />
              <button
                type="submit"
                className="min-h-[46px] px-6 py-2.5 bg-[#1c1c19] hover:bg-[#3a3532] text-white text-base font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap"
              >
                Track reference
              </button>
            </form>

            {trackingResult && (
              <div
                role="status"
                aria-live="polite"
                className="p-4 rounded-xl bg-[#f4ede4] border border-[#d9c7bc] text-sm sm:text-base text-[#1c1c19] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <p className="max-w-[65ch]">{trackingResult}</p>
                <button
                  type="button"
                  onClick={() => setCurrentRoute('/login')}
                  className="min-h-[44px] px-4 py-2 rounded-lg bg-white border border-[#c9b9b0] text-[#7c0700] font-semibold text-sm hover:bg-[#fdf9f4] transition-colors shrink-0 cursor-pointer"
                >
                  Sign in to view dossier
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* SLIM CYCLE COUNTDOWN BAR */}
      <section aria-label="Current intake cycle schedule" className="w-full pt-8 pb-10">
        <div className="max-w-[1140px] mx-auto px-4 md:px-8">
          <div className="bg-[#f4ede4] border border-[#e2bfb8]/80 rounded-xl px-5 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm sm:text-base text-[#1c1c19]">
              <span className="font-bold text-[#7c0700]">Cycle 2026/2027 Open</span>
              <span aria-hidden="true" className="text-[#8d706b]">·</span>
              <span className="text-[#4a3530]">Closes 28 Feb 2027 • 23:59 CAT</span>
              <span aria-hidden="true" className="hidden sm:inline text-[#8d706b]">·</span>
              <span className="hidden sm:inline text-sm text-[#4a3530]">Finance. Develop. Sustain.</span>
            </div>

            <div
              className="flex flex-wrap items-center gap-1.5 sm:gap-2 font-mono text-sm sm:text-base font-bold text-[#1c1c19] tabular-nums"
              aria-label="Time remaining in current cycle"
            >
              <span className="px-2.5 py-1 rounded bg-white border border-[#e2bfb8]">{countdown.days}d</span>
              <span className="text-[#7c0700]">:</span>
              <span className="px-2.5 py-1 rounded bg-white border border-[#e2bfb8]">
                {countdown.hours.toString().padStart(2, '0')}h
              </span>
              <span className="text-[#7c0700]">:</span>
              <span className="px-2.5 py-1 rounded bg-white border border-[#e2bfb8]">
                {countdown.minutes.toString().padStart(2, '0')}m
              </span>
              <span className="text-[#7c0700]">:</span>
              <span className="px-2.5 py-1 rounded bg-[#7c0700] text-white">
                {countdown.seconds.toString().padStart(2, '0')}s
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: STATS FULL-WIDTH COLOUR BAND (CEDA Maroon + oversized numerals) */}
      <section className="relative w-full bg-[#7c0700] text-[#fdf9f4] py-14 sm:py-16 landing-weave-pattern">
        <div className="max-w-[1200px] mx-auto px-4 md:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-white/20">
            <div className="py-5 sm:py-2 sm:pr-6 flex flex-col gap-2">
              <span className="text-sm font-medium text-[#ffdad4]">Ideas submitted</span>
              <span className="landing-display text-4xl sm:text-5xl font-bold text-white tabular-nums tracking-tight">
                248
              </span>
              <p className="text-sm text-[#fdf9f4]/85 leading-snug">
                +18 this month across all 10 districts
              </p>
            </div>

            <div className="py-5 sm:py-2 sm:px-6 flex flex-col gap-2">
              <span className="text-sm font-medium text-[#ffdad4]">Under review</span>
              <span className="landing-display text-4xl sm:text-5xl font-bold text-white tabular-nums tracking-tight">
                36
              </span>
              <p className="text-sm text-[#fdf9f4]/85 leading-snug">
                Multi-tier expert committees actively scoring
              </p>
            </div>

            <div className="py-5 sm:py-2 sm:px-6 flex flex-col gap-2">
              <span className="text-sm font-medium text-[#ffdad4]">Approved</span>
              <span className="landing-display text-4xl sm:text-5xl font-bold text-white tabular-nums tracking-tight">
                41
              </span>
              <p className="text-sm text-[#fdf9f4]/85 leading-snug">
                Advanced to commercialization &amp; mentoring
              </p>
            </div>

            <div className="py-5 sm:py-2 sm:pl-6 flex flex-col gap-2">
              <span className="text-sm font-medium text-[#f8c808]">Awarded capital</span>
              <span className="landing-display text-4xl sm:text-5xl font-bold text-[#f8c808] tabular-nums tracking-tight">
                P 1,250,000
              </span>
              <p className="text-sm text-[#fdf9f4]/85 leading-snug">
                Direct seed grants &amp; incubation capital disbursed
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: FUNDED IDEAS PROOF STRIP + ECOSYSTEM PARTNERS */}
      <section className="w-full bg-[#fdf9f4] py-16 sm:py-20 border-b border-[#e2bfb8]/60">
        <div className="max-w-[1200px] mx-auto px-4 md:px-8 flex flex-col gap-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="max-w-[65ch]">
              <h2 className="landing-display text-3xl sm:text-4xl font-bold text-[#1c1c19] tracking-tight">
                Funded ideas across Botswana
              </h2>
              <p className="text-base text-[#4a3530] mt-2 leading-relaxed">
                From solar agricultural storage to local green manufacturing, viable concepts move
                from pitch to Pula disbursement.
              </p>
            </div>
            <p className="text-sm font-semibold text-[#7c0700] shrink-0">
              Sample content · Illustrative beneficiary stories
            </p>
          </div>

          {/* 3 Story Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-7">
            {FUNDED_STORIES.map((story) => {
              const isFallback = Boolean(failedStoryIds[story.id]);
              return (
                <article
                  key={story.id}
                  className="flex flex-col bg-white rounded-xl overflow-hidden border border-[#e2bfb8]"
                >
                  <div className="relative aspect-[4/3] w-full bg-[#31231f] overflow-hidden">
                    {!isFallback ? (
                      <img
                        src={story.imageSrc}
                        alt={story.imageAlt}
                        width={1200}
                        height={896}
                        referrerPolicy="no-referrer"
                        onError={() =>
                          setFailedStoryIds((prev) => ({ ...prev, [story.id]: true }))
                        }
                        className="w-full h-full object-cover object-center"
                      />
                    ) : (
                      <div className="w-full h-full bg-[#4a1810] landing-weave-pattern flex items-end p-5">
                        <span className="text-sm font-semibold text-[#f8c808]">
                          {story.sector} · {story.district}
                        </span>
                      </div>
                    )}
                    <div
                      aria-hidden="true"
                      className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/15 to-transparent pointer-events-none"
                    />
                    <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-white">
                      <span className="text-sm font-semibold">{story.firstName}</span>
                      <span className="text-xs text-white/90">Sample story</span>
                    </div>
                  </div>

                  <div className="p-6 flex flex-col gap-3 flex-1 justify-between">
                    <div className="flex flex-col gap-2">
                      <p className="text-sm text-[#4a3530]">
                        {story.district} · {story.sector}
                      </p>
                      <p className="text-base text-[#1c1c19] leading-relaxed">{story.summary}</p>
                    </div>

                    <div className="pt-4 mt-2 border-t border-[#efe7de] flex items-baseline justify-between">
                      <span className="text-sm text-[#4a3530]">Capital awarded</span>
                      <span className="landing-display text-xl font-bold text-[#7c0700] tabular-nums">
                        {story.capitalAwarded}
                      </span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {/* Ecosystem Partners Placeholder Row */}
          <div className="pt-8 border-t border-[#e2bfb8]/80 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              <h3 className="text-base font-bold text-[#1c1c19]">
                National ecosystem verification partners
              </h3>
              <p className="text-sm text-[#4a3530] mt-0.5">
                Partner marks shown as text placeholders until official vector logos are supplied.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
              <div className="px-5 py-3.5 rounded-lg bg-[#f4ede4] border border-[#e2bfb8]">
                <span className="landing-display text-lg font-bold text-[#1c1c19] block">CIPA</span>
                <span className="text-xs text-[#4a3530] block mt-0.5">
                  Companies &amp; Intellectual Property Authority
                </span>
              </div>
              <div className="px-5 py-3.5 rounded-lg bg-[#f4ede4] border border-[#e2bfb8]">
                <span className="landing-display text-lg font-bold text-[#1c1c19] block">BURS</span>
                <span className="text-xs text-[#4a3530] block mt-0.5">
                  Botswana Unified Revenue Service
                </span>
              </div>
              <div className="px-5 py-3.5 rounded-lg bg-[#f4ede4] border border-[#e2bfb8]">
                <span className="landing-display text-lg font-bold text-[#1c1c19] block">BDIH</span>
                <span className="text-xs text-[#4a3530] block mt-0.5">
                  Botswana Digital &amp; Innovation Hub
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4: HOW IT WORKS (Connected horizontal timeline on desktop, vertical on mobile) */}
      <section
        id="how-it-works"
        className="w-full bg-[#f4ede4] py-16 sm:py-20 border-b border-[#e2bfb8]/70"
      >
        <div className="max-w-[1200px] mx-auto px-4 md:px-8">
          <div className="max-w-[65ch] mb-12">
            <h2 className="landing-display text-3xl sm:text-4xl font-bold text-[#1c1c19] tracking-tight">
              How it works
            </h2>
            <p className="text-base sm:text-lg text-[#4a3530] mt-2 leading-relaxed">
              A transparent, merit-based five-stage journey from concept to enterprise funding.
            </p>
          </div>

          {/* Connected Progress Timeline */}
          <div className="relative">
            {/* Horizontal connecting line on desktop */}
            <div
              aria-hidden="true"
              className="hidden lg:block absolute top-6 left-6 right-6 h-0.5 landing-sunrise-line"
            />
            {/* Vertical connecting line on mobile/tablet */}
            <div
              aria-hidden="true"
              className="lg:hidden absolute top-6 bottom-6 left-6 w-0.5 bg-gradient-to-b from-[#7c0700] via-[#a02010] to-[#f8a018]"
            />

            <ol className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-6">
              {TIMELINE_STAGES.map((stage, index) => (
                <li
                  key={stage.step}
                  className="relative pl-16 lg:pl-0 flex flex-col gap-3"
                >
                  <div
                    className={`absolute left-0 top-0 lg:relative w-12 h-12 rounded-full flex items-center justify-center font-mono text-sm font-bold tabular-nums border-2 ${
                      index === 4
                        ? 'bg-[#7c0700] text-[#f8c808] border-[#f8a018]'
                        : 'bg-[#fdf9f4] text-[#7c0700] border-[#a02010]'
                    }`}
                  >
                    {stage.step}
                  </div>

                  <div className="flex items-baseline justify-between lg:flex-col lg:items-start gap-1">
                    <h3 className="landing-display text-xl font-bold text-[#1c1c19]">
                      {stage.title}
                    </h3>
                    <span className="text-sm font-semibold text-[#7c0700]">{stage.timing}</span>
                  </div>

                  <p className="text-base text-[#4a3530] leading-relaxed max-w-[60ch]">
                    {stage.description}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* SECTION 5: WHO CAN TAKE PART (1 Large Feature Panel + 2 Complementary Panels) */}
      <section className="w-full bg-[#fdf9f4] py-16 sm:py-20">
        <div className="max-w-[1200px] mx-auto px-4 md:px-8">
          <div className="max-w-[65ch] mb-10">
            <h2 className="landing-display text-3xl sm:text-4xl font-bold text-[#1c1c19] tracking-tight">
              Who can take part
            </h2>
            <p className="text-base sm:text-lg text-[#4a3530] mt-2 leading-relaxed">
              Empowering every tier of Batswana innovators across urban and rural districts.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Large Feature Panel */}
            <div className="lg:col-span-7 bg-[#2d1814] text-[#fdf9f4] rounded-2xl p-7 sm:p-10 flex flex-col justify-between gap-8 landing-weave-pattern">
              <div className="flex flex-col gap-4">
                <p className="text-sm font-semibold text-[#f8c808]">Individual &amp; Co-founders</p>
                <h3 className="landing-display text-2xl sm:text-3xl font-bold text-white">
                  Citizen entrepreneurs
                </h3>
                <p className="text-base text-[#fdf9f4]/90 leading-relaxed max-w-[58ch]">
                  Batswana citizens aged 18+ with novel solutions in agriculture, manufacturing,
                  tourism, and services looking to transform ideas into viable ventures.
                </p>
              </div>

              <div className="flex flex-col gap-6">
                <ul className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-5 border-t border-white/15 text-sm text-[#fdf9f4]">
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-[#f8c808]" aria-hidden="true">
                      check_circle
                    </span>
                    <span>Valid Omang required</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-[#f8c808]" aria-hidden="true">
                      check_circle
                    </span>
                    <span>100% citizen-owned</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-[#f8c808]" aria-hidden="true">
                      check_circle
                    </span>
                    <span>Grant &amp; debt options</span>
                  </li>
                </ul>

                <div>
                  <button
                    type="button"
                    onClick={() => setCurrentRoute('/register')}
                    className="min-h-[44px] px-6 py-2.5 rounded-lg bg-[#f8a018] hover:bg-[#f8c808] text-[#1c1c19] text-base font-bold transition-colors cursor-pointer"
                  >
                    Apply as a citizen founder
                  </button>
                </div>
              </div>
            </div>

            {/* Two Smaller Complementary Panels */}
            <div className="lg:col-span-5 flex flex-col gap-6">
              <div className="flex-1 bg-white rounded-xl p-6 sm:p-7 border border-[#e2bfb8] flex flex-col justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-[#7c0700]">Registered Enterprises</p>
                  <h3 className="landing-display text-xl font-bold text-[#1c1c19] mt-1">
                    Startups and SMEs
                  </h3>
                  <p className="text-base text-[#4a3530] mt-2 leading-relaxed">
                    Early-stage Botswana ventures aiming to test prototypes, scale domestic value
                    addition, or expand export capacity in SADC.
                  </p>
                </div>
                <ul className="pt-4 border-t border-[#efe7de] flex flex-col gap-1.5 text-sm text-[#1c1c19]">
                  <li>· CIPA &amp; BURS registered</li>
                  <li>· Technology or operational innovation</li>
                  <li>· Up to P 500,000 grant tranche</li>
                </ul>
              </div>

              <div className="flex-1 bg-[#f4ede4] rounded-xl p-6 sm:p-7 border border-[#e2bfb8] flex flex-col justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-[#7c0700]">Youth &amp; Tertiary</p>
                  <h3 className="landing-display text-xl font-bold text-[#1c1c19] mt-1">
                    Students and youth
                  </h3>
                  <p className="text-base text-[#4a3530] mt-2 leading-relaxed">
                    Graduates, vocational trainees, and student researchers from UB, BIUST, BUAN,
                    and BAC with commercially viable innovations.
                  </p>
                </div>
                <ul className="pt-4 border-t border-[#dfd1c6] flex flex-col gap-1.5 text-sm text-[#1c1c19]">
                  <li>· Ages 18–35</li>
                  <li>· Fast-track youth adjudication</li>
                  <li>· Dedicated CEDA incubation mentor</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 6: PRIVACY AND IP REASSURANCE BAND (Full-width high-trust band) */}
      <section className="w-full bg-[#241c19] text-[#fdf9f4] py-14 sm:py-16">
        <div className="max-w-[1200px] mx-auto px-4 md:px-8 flex flex-col gap-10">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-8 border-b border-white/15">
            <div className="max-w-[65ch]">
              <h2 className="landing-display text-2xl sm:text-3xl font-bold text-white leading-snug">
                Your intellectual property is protected. Only assigned reviewers see your submission.
              </h2>
              <p className="text-base text-[#fdf9f4]/85 mt-3 leading-relaxed">
                Compliant with the Botswana Data Protection Act. Full confidentiality non-disclosure
                agreements bind all committee evaluators.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 text-sm font-semibold text-[#f8c808] shrink-0">
              <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                verified_user
              </span>
              <span>BDPA Certified Compliance</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex flex-col gap-2">
              <h3 className="text-base font-bold text-white">Role-based access</h3>
              <p className="text-base text-[#fdf9f4]/80 leading-relaxed">
                Only appointed evaluators and adjudicators can access your files; reviewers recuse
                themselves if conflicts exist.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <h3 className="text-base font-bold text-white">Immutable audit trail</h3>
              <p className="text-base text-[#fdf9f4]/80 leading-relaxed">
                Every score, comment, and timestamp is logged cryptographically on government-secured
                servers.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <h3 className="text-base font-bold text-white">Data privacy guaranteed</h3>
              <p className="text-base text-[#fdf9f4]/80 leading-relaxed">
                Personal identification (Omang, TIN, phone) is masked during blind technical
                assessments.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 7: LATEST ANNOUNCEMENTS (Editorial list with dates) */}
      <section className="w-full bg-[#fdf9f4] py-16 sm:py-20">
        <div className="max-w-[1200px] mx-auto px-4 md:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-[#e2bfb8]">
            <div>
              <h2 className="landing-display text-3xl font-bold text-[#1c1c19] tracking-tight">
                Latest announcements
              </h2>
              <p className="text-base text-[#4a3530] mt-1">
                Official intake notices and regional outreach workshops.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setCurrentRoute('/guidelines')}
              className="min-h-[44px] self-start sm:self-auto text-base font-semibold text-[#7c0700] hover:text-[#a02010] cursor-pointer"
            >
              All notices
            </button>
          </div>

          <div className="divide-y divide-[#e2bfb8]">
            {/* Notice 1 */}
            <article className="py-7 grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-8 items-start">
              <div className="lg:col-span-3 flex flex-col gap-1">
                <time dateTime="2026-11-10" className="text-base font-semibold text-[#1c1c19]">
                  10 November 2026
                </time>
                <span className="text-sm font-medium text-[#7c0700]">Special Call</span>
              </div>

              <div className="lg:col-span-6">
                <h3 className="landing-display text-xl font-bold text-[#1c1c19]">
                  2026/2027 Agri-Tech &amp; Food Security Challenge Opened
                </h3>
                <p className="text-base text-[#4a3530] mt-2 leading-relaxed max-w-[65ch]">
                  Special funding pool of P 5,000,000 designated for smart water conservation and
                  drought-resistant livestock solutions across the Kgalagadi, Chobe, and Ngamiland
                  districts.
                </p>
              </div>

              <div className="lg:col-span-3 lg:text-right">
                <button
                  type="button"
                  onClick={() => setCurrentRoute('/guidelines')}
                  className="min-h-[44px] inline-flex items-center text-base font-semibold text-[#7c0700] hover:text-[#a02010] cursor-pointer"
                >
                  Read eligibility criteria
                </button>
              </div>
            </article>

            {/* Notice 2 */}
            <article className="py-7 grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-8 items-start">
              <div className="lg:col-span-3 flex flex-col gap-1">
                <time dateTime="2026-11-04" className="text-base font-semibold text-[#1c1c19]">
                  04 November 2026
                </time>
                <span className="text-sm font-medium text-[#4a3530]">Outreach</span>
              </div>

              <div className="lg:col-span-6">
                <h3 className="landing-display text-xl font-bold text-[#1c1c19]">
                  CEDA Nationwide Innovation Workshops in Francistown &amp; Maun
                </h3>
                <p className="text-base text-[#4a3530] mt-2 leading-relaxed max-w-[65ch]">
                  Join regional CEDA officers for hands-on application coaching and pitch deck
                  preparation sessions across the northern districts.
                </p>
              </div>

              <div className="lg:col-span-3 lg:text-right">
                <button
                  type="button"
                  onClick={() => setCurrentRoute('/register')}
                  className="min-h-[44px] inline-flex items-center text-base font-semibold text-[#7c0700] hover:text-[#a02010] cursor-pointer"
                >
                  Register for clinic
                </button>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* SECTION 8: FINAL CONVERSION CTA BAND */}
      <section className="w-full bg-[#f4ede4] border-t border-[#e2bfb8] py-16 sm:py-20">
        <div className="h-1 w-24 landing-sunrise-line mx-auto mb-8 rounded-full" aria-hidden="true" />
        <div className="max-w-3xl mx-auto px-4 md:px-8 text-center flex flex-col items-center gap-5">
          <h2 className="landing-display text-3xl sm:text-4xl font-bold text-[#1c1c19] tracking-tight [text-wrap:balance]">
            Ready to submit your innovation?
          </h2>
          <p className="text-base sm:text-lg text-[#4a3530] max-w-[55ch] leading-relaxed">
            Turn your visionary idea into a thriving Botswana enterprise. Create your free account
            in less than two minutes.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-5 pt-2">
            <button
              type="button"
              onClick={handleDashboardRedirect}
              className="min-h-[48px] px-8 py-3 rounded-lg bg-[#a02010] hover:bg-[#7c0700] text-white text-base font-semibold transition-colors cursor-pointer"
            >
              {currentUser ? `Open ${currentUser.role.toLowerCase()} dashboard` : 'Register and start submission'}
            </button>
            <button
              type="button"
              onClick={() => {
                const link = document.createElement('a');
                link.href = '/documents/CEDA_Guidelines_and_Evaluation_Criteria.pdf';
                link.download = 'CEDA_Guidelines_and_Evaluation_Criteria.pdf';
                document.body.appendChild(link);
                link.click();
                link.remove();
              }}
              className="min-h-[44px] inline-flex items-center gap-2 text-base font-semibold text-[#7c0700] hover:text-[#1c1c19] cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                download
              </span>
              <span>Download guidelines &amp; criteria (PDF, 162 KB)</span>
            </button>
          </div>
        </div>
      </section>

      {/* DESKTOP HELP ACTION */}
      <div className="fixed bottom-6 right-6 z-40 hidden md:flex">
        <button
          onClick={() => setCurrentRoute('/help-center')}
          className="min-h-[48px] flex items-center gap-3 px-4 py-2 rounded-full bg-white text-[#1c1c19] shadow-lg hover:shadow-xl transition-shadow cursor-pointer border border-[#e2bfb8]"
          type="button"
        >
          <span className="w-8 h-8 rounded-full bg-[#a02010] text-white flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
              support_agent
            </span>
          </span>
          <span className="flex flex-col text-left">
            <span className="text-sm font-bold text-[#1c1c19]">Chat with CEDA</span>
            <span className="text-xs text-[#4a3530]">Working days 09:00 – 16:00 CAT</span>
          </span>
        </button>
      </div>

      {/* MOBILE STICKY BOTTOM BAR (Hides cleanly near footer) */}
      <div
        className={`md:hidden fixed bottom-0 inset-x-0 z-40 bg-[#fdf9f4]/95 backdrop-blur-sm border-t border-[#e2bfb8] px-4 py-2.5 transition-transform duration-200 motion-reduce:transition-none ${
          isNearFooter ? 'translate-y-full pointer-events-none' : 'translate-y-0'
        }`}
      >
        <div className="flex items-center justify-between gap-3 max-w-md mx-auto">
          <button
            type="button"
            onClick={() => setCurrentRoute('/help-center')}
            className="min-h-[44px] px-3 text-sm font-semibold text-[#4a3530] hover:text-[#7c0700] shrink-0 cursor-pointer"
          >
            Help
          </button>
          <button
            type="button"
            onClick={handleDashboardRedirect}
            className="flex-1 min-h-[44px] px-5 py-2.5 rounded-lg bg-[#a02010] hover:bg-[#7c0700] text-white text-base font-semibold transition-colors cursor-pointer"
          >
            {currentUser ? 'Open dashboard' : 'Submit an idea'}
          </button>
        </div>
      </div>
    </div>
  );
};
