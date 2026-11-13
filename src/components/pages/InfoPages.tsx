/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useAuth } from '../../context/AuthContext';

export const GuidelinesPage: React.FC = () => {
  const { setCurrentRoute } = useAuth();

  return (
    <div className="min-h-screen bg-[#fdf9f4] py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-white rounded-2xl border border-[#eedfd6] p-8 shadow-sm space-y-6">
          <div className="border-b border-[#e8dfd8] pb-4">
            <span className="text-[11px] font-bold tracking-wider text-[#a02010] uppercase">
              CEDA Innovation Charter
            </span>
            <h1 className="text-3xl font-extrabold text-[#31302d] font-heading mt-1">
              Application Guidelines & Eligibility
            </h1>
            <p className="text-sm text-[#5e4038] mt-2">
              Requirements for citizen entrepreneurs, startups, and youth innovators applying for innovation grant funding.
            </p>
          </div>

          <div className="space-y-6 text-sm text-[#5e4038] leading-relaxed">
            <section className="space-y-2">
              <h2 className="text-base font-bold text-[#31302d] flex items-center gap-2">
                <span className="material-symbols-outlined text-[#a02010]">verified</span>
                1. Citizen Eligibility (Omang Requirement)
              </h2>
              <p>
                All primary applicants must be citizens of the Republic of Botswana holding a valid National Identity Card (Omang).
                For registered businesses, companies must have a minimum of 100% citizen shareholding or joint venture compliance under CEDA guidelines.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-bold text-[#31302d] flex items-center gap-2">
                <span className="material-symbols-outlined text-[#a02010]">timer</span>
                2. 14-Day SLA Guarantee
              </h2>
              <p>
                Every submission enters our 5-stage tracked lifecycle. No idea dies in an administrative queue. If an evaluator fails to score within 7 days, the system auto-escalates the docket to an alternate panel member.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-bold text-[#31302d] flex items-center gap-2">
                <span className="material-symbols-outlined text-[#a02010]">visibility_off</span>
                3. Double-Blind Merit Scoring
              </h2>
              <p>
                During Stage 2 review, your personal identifiers (Omang, phone number, physical address, and tax numbers) are masked from evaluators to ensure evaluations are based 100% on innovation merit and economic viability.
              </p>
            </section>
          </div>

          <div className="pt-4 border-t border-[#e8dfd8] flex justify-between items-center">
            <button
              onClick={() => setCurrentRoute('/')}
              className="text-xs font-semibold text-[#5e4038] hover:text-[#a02010]"
            >
              ← Back to Portal Home
            </button>
            <button
              onClick={() => setCurrentRoute('/register')}
              className="px-5 py-2.5 rounded-xl bg-[#a02010] text-white text-xs font-bold hover:bg-[#86190c]"
            >
              Start Submission
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const FaqsPage: React.FC = () => {
  const { setCurrentRoute } = useAuth();

  const faqs = [
    {
      q: 'What is the maximum grant amount for seed innovations?',
      a: 'The CEDA Innovation Management Portal awards up to BWP 500,000 for seed-stage prototypes and up to BWP 2,000,000 in blended debt/grant instruments for commercially viable commercialization.'
    },
    {
      q: 'How does CEDA safeguard my intellectual property?',
      a: 'All expert evaluators sign legally binding non-disclosure agreements governed by Botswana intellectual property laws. Evaluation is conducted under double-blind conditions.'
    },
    {
      q: 'What if I forget my password or get locked out?',
      a: 'After 3 failed OTP attempts or 5 failed password attempts, your account is temporarily locked for 15 minutes. You can request a password reset anytime via SMS or verified email.'
    },
    {
      q: 'Does CEDA support applicants across rural districts?',
      a: 'Yes! Under #KaeKapaKae, we have dedicated advisory officers across all 10 administrative districts of Botswana including Kgalagadi, Ghanzi, Chobe, and Ngamiland.'
    }
  ];

  return (
    <div className="min-h-screen bg-[#fdf9f4] py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-white rounded-2xl border border-[#eedfd6] p-8 shadow-sm space-y-6">
          <div className="border-b border-[#e8dfd8] pb-4">
            <span className="text-[11px] font-bold tracking-wider text-[#a02010] uppercase">
              Assistance & Knowledge Base
            </span>
            <h1 className="text-3xl font-extrabold text-[#31302d] font-heading mt-1">
              Frequently Asked Questions (FAQs)
            </h1>
          </div>

          <div className="space-y-4">
            {faqs.map((f, i) => (
              <div key={i} className="p-4 rounded-xl bg-[#fdf9f4] border border-[#e8dfd8] space-y-2">
                <h3 className="font-bold text-sm text-[#31302d] flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#a02010] text-base">help</span>
                  {f.q}
                </h3>
                <p className="text-xs text-[#5e4038] leading-relaxed pl-6">{f.a}</p>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-[#e8dfd8]">
            <button
              onClick={() => setCurrentRoute('/')}
              className="text-xs font-semibold text-[#5e4038] hover:text-[#a02010]"
            >
              ← Back to Portal Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const HelpCenterPage: React.FC = () => {
  const { setCurrentRoute } = useAuth();

  return (
    <div className="min-h-screen bg-[#fdf9f4] py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-white rounded-2xl border border-[#eedfd6] p-8 shadow-sm space-y-6">
          <div className="border-b border-[#e8dfd8] pb-4">
            <span className="text-[11px] font-bold tracking-wider text-[#a02010] uppercase">
              Citizen Support & Inquiries
            </span>
            <h1 className="text-3xl font-extrabold text-[#31302d] font-heading mt-1">
              CEDA Help & Contact Center
            </h1>
            <p className="text-sm text-[#5e4038] mt-2">
              Reach our advisory staff across Gaborone, Francistown, Maun, and all regional branches.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-5 rounded-xl border border-[#e8dfd8] bg-[#fdf9f4] space-y-3">
              <div className="flex items-center gap-2 font-bold text-[#31302d]">
                <span className="material-symbols-outlined text-[#a02010]">call</span>
                <span>Toll-Free & Phone Numbers</span>
              </div>
              <ul className="text-xs text-[#5e4038] space-y-1">
                <li>Toll-Free (Botswana): <strong>1800 2332</strong></li>
                <li>Head Office: <strong>+267 358 7000 / +267 364 7777</strong></li>
                <li>WhatsApp Intake Support: <strong>+267 71 234 567</strong></li>
              </ul>
            </div>

            <div className="p-5 rounded-xl border border-[#e8dfd8] bg-[#fdf9f4] space-y-3">
              <div className="flex items-center gap-2 font-bold text-[#31302d]">
                <span className="material-symbols-outlined text-[#a02010]">location_on</span>
                <span>Head Office Coordinates</span>
              </div>
              <p className="text-xs text-[#5e4038] leading-relaxed">
                Plot 54350 PG Matante Road, Central Business District (CBD),<br />
                Gaborone, Botswana.<br />
                Operating Hours: 07:30 – 16:30 CAT (Monday – Friday)
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-[#e8dfd8]">
            <button
              onClick={() => setCurrentRoute('/')}
              className="text-xs font-semibold text-[#5e4038] hover:text-[#a02010]"
            >
              ← Back to Portal Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
