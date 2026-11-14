/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

export const LandingPage: React.FC = () => {
  const { currentUser, setCurrentRoute, language } = useAuth();

  // Reference lookup state
  const [trackingInput, setTrackingInput] = useState('');
  const [trackingResult, setTrackingResult] = useState<string | null>(null);

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

  const handleTrack = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = trackingInput.trim().toUpperCase();
    if (!clean) {
      setTrackingResult('Please enter a submission tracking reference code (e.g. CEDA-INN-2026-0842).');
      return;
    }
    if (clean.includes('0842') || clean.includes('CEDA-INN')) {
      setTrackingResult(
        'Reference Found: "Solar-Powered Smart Grain Silos" (Stage 2: Under Review). Sign in with your registered account to view your full blinded evaluation dossier.'
      );
    } else {
      setTrackingResult(
        `Reference "${clean}" entered. Sign in to your verified CEDA account to access submission records.`
      );
    }
  };

  return (
    <div className="w-full flex flex-col">
      {/* SECTION 1: HERO SECTION */}
      <section
        className="relative w-full overflow-hidden bg-[#31302d] py-14 lg:py-20"
        style={{
          background:
            'radial-gradient(circle at 85% 20%, rgba(148, 49, 0, 0.35) 0%, rgba(49, 48, 45, 0.95) 45%, rgb(49, 48, 45) 100%), linear-gradient(rgba(160, 32, 16, 0.2) 0%, rgba(49, 48, 45, 0) 60%)',
        }}
      >
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none opacity-20">
          <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full blur-3xl bg-[#a02010]"></div>
          <div className="absolute top-1/4 right-10 w-[500px] h-[500px] rounded-full blur-3xl bg-[#943100]"></div>
        </div>

        <div className="relative z-10 max-w-[1200px] mx-auto px-4 md:px-8 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column (7 Cols) */}
          <div className="lg:col-span-7 flex flex-col items-start gap-5">
            {/* Eyebrow Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 shadow-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-[#a02010] ring-2 ring-white/30"></span>
              <span className="text-xs text-[#f4f0eb] font-semibold tracking-wide">
                Citizen Entrepreneurial Development Agency
              </span>
            </div>

            {/* H1 Headline */}
            <h1 className="font-headline text-3xl sm:text-4xl lg:text-5xl text-white font-bold tracking-tight leading-tight">
              Your idea. Evaluated fairly. Rewarded.
            </h1>

            {/* Subtext */}
            <p className="text-base sm:text-lg text-[#f4f0eb]/90 max-w-2xl leading-relaxed">
              Submit your innovative idea to CEDA, track every stage in real time and get feedback
              from expert evaluators.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center gap-4 pt-1 w-full sm:w-auto">
              <button
                onClick={() => setCurrentRoute('/register')}
                className="inline-flex items-center justify-center gap-2 min-h-[46px] px-6 rounded-lg bg-[#a02010] hover:bg-[#861a0d] active:bg-[#6e1409] text-white text-sm font-bold shadow-lg transition-all group cursor-pointer"
              >
                <span>Submit an idea</span>
                <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">
                  arrow_forward
                </span>
              </button>

              <a
                href="#how-it-works"
                className="inline-flex items-center justify-center gap-2 min-h-[46px] px-5 rounded-lg bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white text-sm font-semibold transition-all shadow-sm"
              >
                <span className="material-symbols-outlined text-[20px] text-amber-400">play_circle</span>
                <span>How it works</span>
              </a>
            </div>

            {/* Streamlined Cycle Status Strip */}
            <div className="w-full max-w-lg rounded-xl bg-white/10 backdrop-blur-xl border border-white/20 p-3.5 shadow-xl flex items-center justify-between gap-3 text-xs mt-1">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-amber-400 text-lg">timer</span>
                <div>
                  <span className="text-amber-300 font-bold uppercase tracking-wider block text-[11px]">
                    Cycle 2026/2027 Open
                  </span>
                  <span className="text-white/80 text-[11px]">
                    Closes 28 Feb 2027 • 23:59 CAT
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1 font-mono text-xs font-bold text-white bg-black/30 px-2.5 py-1 rounded-lg border border-white/10">
                <span>{countdown.days}d</span>
                <span className="text-amber-400">:</span>
                <span>{countdown.hours.toString().padStart(2, '0')}h</span>
                <span className="text-amber-400">:</span>
                <span>{countdown.minutes.toString().padStart(2, '0')}m</span>
                <span className="text-amber-400">:</span>
                <span className="text-amber-400">{countdown.seconds.toString().padStart(2, '0')}s</span>
              </div>
            </div>

            {/* Tagline */}
            <div className="flex items-center gap-3 text-xs text-white/80">
              <span className="font-semibold uppercase tracking-wider">Finance. Develop. Sustain.</span>
              <span className="text-amber-400">•</span>
              <span className="text-amber-300 font-bold tracking-wider">#KaeKapaKae</span>
            </div>
          </div>

          {/* Right Column (5 Cols) - Public Innovation Gateway or Logged-in Quick Link */}
          <div className="lg:col-span-5 w-full">
            {currentUser ? (
              /* Logged-In User Quick Workspace Card */
              <div
                className="relative bg-white rounded-2xl shadow-2xl p-6 sm:p-7 flex flex-col gap-4 overflow-hidden border border-[#e2bfb8]"
                style={{
                  background: 'linear-gradient(175deg, #ffffff 0%, #fdf9f4 65%, #f6ede3 100%)',
                }}
              >
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#a02010] via-[#943100] to-[#77574e]"></div>

                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full bg-[#ffd3c8] text-[#6d2200] text-xs font-bold uppercase tracking-wider">
                    Active Session
                  </span>
                  <span className="text-xs font-semibold text-[#a02010] bg-red-50 px-2.5 py-1 rounded-full border border-red-200">
                    Role: {currentUser.role}
                  </span>
                </div>

                <div>
                  <h3 className="font-headline text-lg font-bold text-[#1c1c19]">
                    Dumela, {currentUser.firstName} {currentUser.surname}
                  </h3>
                  <p className="text-xs text-[#5a413c] mt-1.5 leading-relaxed">
                    {currentUser.role === 'SUBMITTER'
                      ? 'You are signed in to your submitter portal. Track your active proposals, review committee feedback, and monitor your 14-day turnaround SLA.'
                      : currentUser.role === 'EVALUATOR'
                      ? 'You are signed in as an expert evaluator. Review assigned blind dockets and submit technical scoring.'
                      : currentUser.role === 'ADJUDICATOR'
                      ? 'You are signed in to the executive board chamber. Review quorum sign-offs and approve grant tranches.'
                      : currentUser.role === 'ADMIN'
                      ? 'You are signed in as portal administrator. Monitor SLA alerts and the immutable audit ledger.'
                      : 'You are signed in as public stakeholder. Monitor national disbursement analytics across all 10 districts.'}
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => {
                      if (currentUser.role === 'SUBMITTER') setCurrentRoute('/dashboard');
                      else if (currentUser.role === 'EVALUATOR') setCurrentRoute('/dashboard/evaluator');
                      else if (currentUser.role === 'ADJUDICATOR') setCurrentRoute('/dashboard/adjudicator');
                      else if (currentUser.role === 'ADMIN') setCurrentRoute('/admin');
                      else setCurrentRoute('/dashboard/stakeholder');
                    }}
                    className="w-full py-3 px-4 rounded-xl bg-[#a02010] hover:bg-[#861a0d] text-white text-xs font-bold uppercase tracking-wider shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Open {currentUser.role.toLowerCase()} dashboard</span>
                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Public / Default State (No private submitter under-review data) */
              <div
                className="relative bg-white rounded-2xl shadow-2xl p-6 sm:p-7 flex flex-col gap-4 overflow-hidden border border-[#e2bfb8]"
                style={{
                  background: 'linear-gradient(175deg, #ffffff 0%, #fdf9f4 65%, #f6ede3 100%)',
                }}
              >
                {/* Top Accent Bar */}
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#a02010] via-[#943100] to-[#77574e]"></div>

                {/* Header */}
                <div className="flex items-start justify-between gap-3 pt-1">
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-1.5 text-[#77574e] text-xs font-bold uppercase tracking-wider">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span>Intake Cycle 2026/2027</span>
                    </div>
                    <h3 className="font-headline text-lg font-bold text-[#1c1c19] leading-snug">
                      Botswana Innovation Gateway
                    </h3>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold shrink-0">
                    <span className="material-symbols-outlined text-[14px]">check_circle</span>
                    <span>Open for Intake</span>
                  </span>
                </div>

                {/* 3 Core Commitments Strip */}
                <div className="space-y-2.5 pt-1">
                  <div className="flex items-start gap-3 p-2.5 rounded-xl bg-white border border-[#e8dfd8] shadow-xs">
                    <div className="w-8 h-8 rounded-lg bg-[#ffd3c8]/50 text-[#7c0700] flex items-center justify-center shrink-0 mt-0.5">
                      <span className="material-symbols-outlined text-base">timer</span>
                    </div>
                    <div className="text-xs">
                      <span className="font-bold text-[#1c1c19] block">14-Day SLA Guarantee</span>
                      <span className="text-[#5a413c] text-[11px] leading-tight block">
                        No idea dies in a queue. Every review stage is tracked with automated escalation.
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-2.5 rounded-xl bg-white border border-[#e8dfd8] shadow-xs">
                    <div className="w-8 h-8 rounded-lg bg-[#ffd3c8]/50 text-[#7c0700] flex items-center justify-center shrink-0 mt-0.5">
                      <span className="material-symbols-outlined text-base">visibility_off</span>
                    </div>
                    <div className="text-xs">
                      <span className="font-bold text-[#1c1c19] block">Double-Blind Merit Scoring</span>
                      <span className="text-[#5a413c] text-[11px] leading-tight block">
                        Personal IDs are masked so evaluations are based purely on innovation merit.
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-2.5 rounded-xl bg-white border border-[#e8dfd8] shadow-xs">
                    <div className="w-8 h-8 rounded-lg bg-[#ffd3c8]/50 text-[#7c0700] flex items-center justify-center shrink-0 mt-0.5">
                      <span className="material-symbols-outlined text-base">payments</span>
                    </div>
                    <div className="text-xs">
                      <span className="font-bold text-[#1c1c19] block">Catalytic Pula Grants</span>
                      <span className="text-[#5a413c] text-[11px] leading-tight block">
                        Up to BWP 500,000 for seed-stage prototypes and structured CEDA mentorship.
                      </span>
                    </div>
                  </div>
                </div>

                {/* Quick Status Lookup Tool */}
                <div className="bg-[#f7f3ee] border border-[#e2bfb8]/60 rounded-xl p-3.5 space-y-2 mt-1">
                  <div className="flex items-center justify-between text-xs text-[#5a413c]">
                    <span className="font-bold text-[#1c1c19]">Track Existing Application</span>
                    <span className="text-[10px] text-[#77574e]">Reference Lookup</span>
                  </div>
                  <form onSubmit={handleTrack} className="flex gap-2">
                    <input
                      type="text"
                      value={trackingInput}
                      onChange={(e) => {
                        setTrackingInput(e.target.value);
                        setTrackingResult(null);
                      }}
                      placeholder="e.g. CEDA-INN-2026-0842"
                      className="flex-1 px-3 py-1.5 bg-white border border-[#cfc4bc] rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#f8a018]"
                    />
                    <button
                      type="submit"
                      className="px-3 py-1.5 bg-[#31302d] hover:bg-[#1c1c19] text-white text-xs font-semibold rounded-lg shrink-0 transition-colors"
                    >
                      Track
                    </button>
                  </form>

                  {trackingResult && (
                    <div className="p-2.5 rounded-lg bg-white border border-amber-200 text-[11px] text-[#5e4038] space-y-1 animate-in fade-in">
                      <p className="font-medium text-[#1c1c19]">{trackingResult}</p>
                      <button
                        type="button"
                        onClick={() => setCurrentRoute('/login')}
                        className="text-[#a02010] font-bold hover:underline inline-flex items-center gap-0.5"
                      >
                        <span>Sign in to view full dossier</span>
                        <span className="material-symbols-outlined text-xs">arrow_forward</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Action Button */}
                <div className="pt-1 flex flex-col gap-2">
                  <button
                    onClick={() => setCurrentRoute('/register')}
                    className="w-full py-3 px-4 rounded-xl bg-[#a02010] hover:bg-[#861a0d] text-white text-xs font-bold uppercase tracking-wider shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Register &amp; Submit Innovation</span>
                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                  </button>
                  <div className="flex items-center justify-between text-[11px] text-[#77574e] px-1">
                    <span>100% Citizen Owned</span>
                    <span className="font-semibold text-[#a02010]">BDPA Compliant</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* SECTION 2: STATS STRIP */}
      <section className="w-full bg-[#f7f3ee] py-12 border-b border-[#e2bfb8]/40">
        <div className="max-w-[1200px] mx-auto px-4 md:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Stat 1 */}
            <div className="bg-white rounded-xl p-5 shadow-sm border border-[#e2bfb8]/60 relative overflow-hidden flex flex-col justify-between">
              <div className="h-1 w-full bg-[#a02010] absolute top-0 left-0"></div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs font-semibold text-[#77574e] uppercase">Ideas submitted</span>
                <div className="w-8 h-8 rounded-full bg-[#ffdad4] flex items-center justify-center text-[#7c0700]">
                  <span className="material-symbols-outlined text-[18px]">lightbulb</span>
                </div>
              </div>
              <div className="my-2">
                <span className="font-headline text-3xl font-extrabold text-[#7c0700] tabular-nums">
                  248
                </span>
              </div>
              <p className="text-xs text-[#5a413c]">+18 this month across all 10 districts</p>
            </div>

            {/* Stat 2 */}
            <div className="bg-white rounded-xl p-5 shadow-sm border border-[#e2bfb8]/60 relative overflow-hidden flex flex-col justify-between">
              <div className="h-1 w-full bg-[#943100] absolute top-0 left-0"></div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs font-semibold text-[#77574e] uppercase">Under review</span>
                <div className="w-8 h-8 rounded-full bg-[#ffd3c8] flex items-center justify-center text-[#943100]">
                  <span className="material-symbols-outlined text-[18px]">rate_review</span>
                </div>
              </div>
              <div className="my-2">
                <span className="font-headline text-3xl font-extrabold text-[#943100] tabular-nums">
                  36
                </span>
              </div>
              <p className="text-xs text-[#5a413c]">Multi-tier expert committees actively scoring</p>
            </div>

            {/* Stat 3 */}
            <div className="bg-white rounded-xl p-5 shadow-sm border border-[#e2bfb8]/60 relative overflow-hidden flex flex-col justify-between">
              <div className="h-1 w-full bg-emerald-700 absolute top-0 left-0"></div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs font-semibold text-[#77574e] uppercase">Approved</span>
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-800">
                  <span className="material-symbols-outlined text-[18px]">verified</span>
                </div>
              </div>
              <div className="my-2">
                <span className="font-headline text-3xl font-extrabold text-emerald-800 tabular-nums">
                  41
                </span>
              </div>
              <p className="text-xs text-[#5a413c]">Advanced to commercialization &amp; mentoring</p>
            </div>

            {/* Stat 4 */}
            <div className="bg-white rounded-xl p-5 shadow-sm border border-[#e2bfb8]/60 relative overflow-hidden flex flex-col justify-between">
              <div className="h-1 w-full bg-[#a02010] absolute top-0 left-0"></div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs font-semibold text-[#77574e] uppercase">Awarded capital</span>
                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-700">
                  <span className="material-symbols-outlined text-[18px]">military_tech</span>
                </div>
              </div>
              <div className="my-2">
                <span className="font-headline text-3xl font-extrabold text-[#7c0700] tabular-nums">
                  P 1,250,000
                </span>
              </div>
              <p className="text-xs text-[#5a413c]">Direct seed grants &amp; incubation capital disbursed</p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: HOW IT WORKS (5-STEP FLOW) */}
      <section className="w-full max-w-[1200px] mx-auto px-4 md:px-8 py-16" id="how-it-works">
        <div className="text-center max-w-2xl mx-auto mb-12 flex flex-col items-center gap-2">
          <span className="text-xs uppercase font-bold tracking-widest text-[#77574e]">
            Structured Lifecycle
          </span>
          <h2 className="font-headline text-3xl font-bold text-[#7c0700]">How it works</h2>
          <p className="text-sm text-[#5a413c]">
            A transparent, merit-based five-stage journey from concept to enterprise funding.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {/* Step 1 */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-[#e2bfb8]/60 flex flex-col gap-3 group hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-lg bg-[#f1ede8] flex items-center justify-center text-[#a02010] group-hover:bg-[#a02010] group-hover:text-white transition-colors">
              <span className="material-symbols-outlined text-[24px]">description</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-[#77574e]">STAGE 01</span>
              <span className="bg-[#f1ede8] px-2 py-0.5 rounded text-[11px] text-[#5a413c]">∼ 20 Mins</span>
            </div>
            <h4 className="font-headline text-base font-bold text-[#1c1c19]">Submit</h4>
            <p className="text-xs text-[#5a413c] leading-relaxed">
              Register your Omang and submit your concept, market thesis, and pitch deck in under 20 minutes.
            </p>
          </div>

          {/* Step 2 */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-[#e2bfb8]/60 flex flex-col gap-3 group hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-lg bg-[#f1ede8] flex items-center justify-center text-[#a02010] group-hover:bg-[#a02010] group-hover:text-white transition-colors">
              <span className="material-symbols-outlined text-[24px]">troubleshoot</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-[#77574e]">STAGE 02</span>
              <span className="bg-[#f1ede8] px-2 py-0.5 rounded text-[11px] text-[#5a413c]">7-10 Days</span>
            </div>
            <h4 className="font-headline text-base font-bold text-[#1c1c19]">Review</h4>
            <p className="text-xs text-[#5a413c] leading-relaxed">
              Independent sector specialists assess viability, commercial scalability, and local job impact.
            </p>
          </div>

          {/* Step 3 */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-[#e2bfb8]/60 flex flex-col gap-3 group hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-lg bg-[#f1ede8] flex items-center justify-center text-[#a02010] group-hover:bg-[#a02010] group-hover:text-white transition-colors">
              <span className="material-symbols-outlined text-[24px]">forum</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-[#77574e]">STAGE 03</span>
              <span className="bg-[#f1ede8] px-2 py-0.5 rounded text-[11px] text-[#5a413c]">Interactive</span>
            </div>
            <h4 className="font-headline text-base font-bold text-[#1c1c19]">Feedback</h4>
            <p className="text-xs text-[#5a413c] leading-relaxed">
              Receive detailed, actionable written critiques and guidance directly from committee members.
            </p>
          </div>

          {/* Step 4 */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-[#e2bfb8]/60 flex flex-col gap-3 group hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-lg bg-[#f1ede8] flex items-center justify-center text-[#a02010] group-hover:bg-[#a02010] group-hover:text-white transition-colors">
              <span className="material-symbols-outlined text-[24px]">approval</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-[#77574e]">STAGE 04</span>
              <span className="bg-[#f1ede8] px-2 py-0.5 rounded text-[11px] text-[#5a413c]">Adjudication</span>
            </div>
            <h4 className="font-headline text-base font-bold text-[#1c1c19]">Approval</h4>
            <p className="text-xs text-[#5a413c] leading-relaxed">
              Formal adjudication by CEDA executive boards with clear funding recommendation.
            </p>
          </div>

          {/* Step 5 */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-[#e2bfb8]/60 flex flex-col gap-3 group hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-lg bg-[#f1ede8] flex items-center justify-center text-[#a02010] group-hover:bg-[#a02010] group-hover:text-white transition-colors">
              <span className="material-symbols-outlined text-[24px]">workspace_premium</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-[#77574e]">STAGE 05</span>
              <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded text-[11px] font-bold">
                Disbursement
              </span>
            </div>
            <h4 className="font-headline text-base font-bold text-[#1c1c19]">Award</h4>
            <p className="text-xs text-[#5a413c] leading-relaxed">
              Grant disbursement in Pula, tailored incubation, and entry into CEDA mentorship networks.
            </p>
          </div>
        </div>
      </section>

      {/* SECTION 4: WHO CAN TAKE PART */}
      <section className="w-full bg-[#f7f3ee] py-16 border-t border-b border-[#e2bfb8]/40">
        <div className="max-w-[1200px] mx-auto px-4 md:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
            <div>
              <span className="text-xs uppercase font-bold tracking-widest text-[#77574e]">
                Target Cohorts
              </span>
              <h2 className="font-headline text-3xl font-bold text-[#7c0700] mt-1">
                Who can take part
              </h2>
            </div>
            <p className="text-sm text-[#5a413c] max-w-lg">
              Empowering every tier of Batswana innovators across urban and rural districts.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1 */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#e2bfb8]/60 flex flex-col justify-between hover:shadow-md transition-all">
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded bg-[#ffd3c8] text-[#77574e] text-xs font-bold">
                    Individual &amp; Co-founders
                  </span>
                  <span className="material-symbols-outlined text-[#a02010] text-[24px]">
                    person_celebrate
                  </span>
                </div>
                <h3 className="font-headline text-lg font-bold text-[#1c1c19]">
                  Citizen entrepreneurs
                </h3>
                <p className="text-xs text-[#5a413c] leading-relaxed">
                  Batswana citizens aged 18+ with novel solutions in agriculture, manufacturing,
                  tourism, and services looking to transform ideas into viable ventures.
                </p>
              </div>
              <div className="pt-4 mt-4 border-t border-[#f1ede8] flex flex-col gap-1.5 text-xs text-[#77574e]">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-[#a02010]">check_circle</span>
                  <span>Valid Omang required</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-[#a02010]">check_circle</span>
                  <span>100% citizen-owned</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-[#a02010]">check_circle</span>
                  <span>Grant &amp; debt options</span>
                </div>
              </div>
            </div>

            {/* Card 2 */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#e2bfb8]/60 flex flex-col justify-between hover:shadow-md transition-all">
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded bg-[#ffdad4] text-[#7c0700] text-xs font-bold">
                    Registered Enterprises
                  </span>
                  <span className="material-symbols-outlined text-[#a02010] text-[24px]">
                    domain
                  </span>
                </div>
                <h3 className="font-headline text-lg font-bold text-[#1c1c19]">
                  Startups and SMEs
                </h3>
                <p className="text-xs text-[#5a413c] leading-relaxed">
                  Early-stage Botswana ventures aiming to test prototypes, scale domestic value addition,
                  or expand export capacity in SADC.
                </p>
              </div>
              <div className="pt-4 mt-4 border-t border-[#f1ede8] flex flex-col gap-1.5 text-xs text-[#77574e]">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-[#a02010]">check_circle</span>
                  <span>CIPA &amp; BURS registered</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-[#a02010]">check_circle</span>
                  <span>Technology or operational innovation</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-[#a02010]">check_circle</span>
                  <span>Up to P 500,000 grant tranche</span>
                </div>
              </div>
            </div>

            {/* Card 3 */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#e2bfb8]/60 flex flex-col justify-between hover:shadow-md transition-all">
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded bg-amber-100 text-amber-800 text-xs font-bold">
                    Youth &amp; Tertiary
                  </span>
                  <span className="material-symbols-outlined text-[#a02010] text-[24px]">
                    school
                  </span>
                </div>
                <h3 className="font-headline text-lg font-bold text-[#1c1c19]">
                  Students and youth
                </h3>
                <p className="text-xs text-[#5a413c] leading-relaxed">
                  Graduates, vocational trainees, and student researchers from UB, BIUST, BUAN, and BAC
                  with commercially viable innovations.
                </p>
              </div>
              <div className="pt-4 mt-4 border-t border-[#f1ede8] flex flex-col gap-1.5 text-xs text-[#77574e]">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-[#a02010]">check_circle</span>
                  <span>Ages 18–35</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-[#a02010]">check_circle</span>
                  <span>Fast-track youth adjudication</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-[#a02010]">check_circle</span>
                  <span>Dedicated CEDA incubation mentor</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 5: SECURITY AND FAIRNESS BAND */}
      <section className="w-full max-w-[1200px] mx-auto px-4 md:px-8 py-14">
        <div className="bg-gradient-to-br from-[#f7f3ee] via-[#faefe4] to-[#f1ede8] border border-[#e2bfb8] rounded-2xl p-6 md:p-8 shadow-sm">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-6 border-b border-[#e2bfb8]/60">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#a02010] text-white flex items-center justify-center shrink-0 shadow-sm">
                <span className="material-symbols-outlined text-[26px]">gavel</span>
              </div>
              <div>
                <h3 className="font-headline text-lg font-bold text-[#1c1c19]">
                  Your intellectual property is protected. Only assigned reviewers see your submission.
                </h3>
                <p className="text-xs text-[#5a413c] mt-1 max-w-2xl leading-relaxed">
                  Compliant with the Botswana Data Protection Act. Full confidentiality non-disclosure
                  agreements bind all committee evaluators.
                </p>
              </div>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white text-[#77574e] text-xs font-bold shadow-xs shrink-0">
              <span className="material-symbols-outlined text-[16px] text-emerald-700">security</span>
              <span>BDPA Certified Compliance</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center text-[#a02010] shrink-0 shadow-xs">
                <span className="material-symbols-outlined text-[20px]">admin_panel_settings</span>
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#1c1c19]">Role-based access</h4>
                <p className="text-xs text-[#5a413c] mt-1 leading-relaxed">
                  Only appointed evaluators and adjudicators can access your files; reviewers recuse themselves if conflicts exist.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center text-[#a02010] shrink-0 shadow-xs">
                <span className="material-symbols-outlined text-[20px]">history_edu</span>
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#1c1c19]">Immutable audit trail</h4>
                <p className="text-xs text-[#5a413c] mt-1 leading-relaxed">
                  Every score, comment, and timestamp is logged cryptographically on government-secured servers.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center text-[#a02010] shrink-0 shadow-xs">
                <span className="material-symbols-outlined text-[20px]">visibility_off</span>
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#1c1c19]">Data privacy guaranteed</h4>
                <p className="text-xs text-[#5a413c] mt-1 leading-relaxed">
                  Personal identification (Omang, TIN, phone) is masked during blind technical assessments.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 6: LATEST ANNOUNCEMENTS */}
      <section className="w-full max-w-[1200px] mx-auto px-4 md:px-8 py-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <span className="text-xs uppercase font-bold tracking-wider text-[#77574e]">
              Ecosystem Briefs
            </span>
            <h2 className="font-headline text-2xl font-bold text-[#7c0700]">Latest announcements</h2>
          </div>
          <button
            onClick={() => setCurrentRoute('/guidelines')}
            className="text-xs font-bold text-[#77574e] hover:text-[#7c0700] transition-colors flex items-center gap-1"
          >
            <span>All notices</span>
            <span className="material-symbols-outlined text-[18px]">arrow_right_alt</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Announcement 1 */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-[#e2bfb8]/60 flex flex-col justify-between hover:shadow-md transition-shadow group">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded bg-[#ffdbcf] text-[#943100] text-[11px] font-bold">
                  Special Call
                </span>
                <span className="text-xs text-[#5a413c]">10 November 2026</span>
              </div>
              <h3 className="font-headline text-base font-bold text-[#1c1c19] mt-1 group-hover:text-[#a02010] transition-colors">
                2026/2027 Agri-Tech &amp; Food Security Challenge Opened
              </h3>
              <p className="text-xs text-[#5a413c] leading-relaxed">
                Special funding pool of P 5,000,000 designated for smart water conservation and
                drought-resistant livestock solutions across the Kgalagadi, Chobe, and Ngamiland districts.
              </p>
            </div>
            <div className="pt-4 flex items-center gap-1.5 text-[#a02010] text-xs font-bold">
              <span>Read eligibility criteria</span>
              <span className="material-symbols-outlined text-[16px] group-hover:translate-x-1 transition-transform">
                arrow_forward
              </span>
            </div>
          </div>

          {/* Announcement 2 */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-[#e2bfb8]/60 flex flex-col justify-between hover:shadow-md transition-shadow group">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded bg-[#e6e2dd] text-[#77574e] text-[11px] font-bold">
                  Outreach
                </span>
                <span className="text-xs text-[#5a413c]">04 November 2026</span>
              </div>
              <h3 className="font-headline text-base font-bold text-[#1c1c19] mt-1 group-hover:text-[#a02010] transition-colors">
                CEDA Nationwide Innovation Workshops in Francistown &amp; Maun
              </h3>
              <p className="text-xs text-[#5a413c] leading-relaxed">
                Join regional CEDA officers for hands-on application coaching and pitch deck
                preparation sessions across the northern districts.
              </p>
            </div>
            <div className="pt-4 flex items-center gap-1.5 text-[#a02010] text-xs font-bold">
              <span>Register for clinic</span>
              <span className="material-symbols-outlined text-[16px] group-hover:translate-x-1 transition-transform">
                arrow_forward
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 7: CTA BAND */}
      <section className="w-full bg-[#f7f3ee] py-16 border-t border-[#e2bfb8]/40">
        <div className="max-w-4xl mx-auto px-4 md:px-8 text-center flex flex-col items-center gap-4">
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#f1ede8] text-[#943100] tracking-wide">
            Take The Next Step
          </span>
          <h2 className="font-headline text-3xl font-bold text-[#7c0700] tracking-tight">
            Ready to submit your innovation?
          </h2>
          <p className="text-sm text-[#5a413c] max-w-xl">
            Turn your visionary idea into a thriving Botswana enterprise. Create your free account
            in less than two minutes.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
            <button
              onClick={() => setCurrentRoute('/register')}
              className="min-h-[46px] px-8 rounded-lg bg-[#a02010] hover:bg-[#861a0d] text-white text-sm font-bold shadow-md hover:shadow-lg transition-all"
            >
              Register and start submission
            </button>
            <button
              onClick={() => setCurrentRoute('/guidelines')}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#77574e] hover:text-[#7c0700] underline"
            >
              <span className="material-symbols-outlined text-[18px]">download</span>
              <span>Download guidelines &amp; criteria (PDF, 2.4 MB)</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
