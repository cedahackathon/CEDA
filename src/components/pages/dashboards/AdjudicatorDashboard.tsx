/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { LegalUpdateBanner } from '../../common/LegalUpdateBanner';

export const AdjudicatorDashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const [quorumSigned, setQuorumSigned] = useState(false);
  const [decisionNotes, setDecisionNotes] = useState('');
  const [selectedAction, setSelectedAction] = useState<'grant' | 'blend' | 'revise' | 'reject'>('grant');
  const [decisionSuccess, setDecisionSuccess] = useState(false);

  const handleSignOff = (e: React.FormEvent) => {
    e.preventDefault();
    setDecisionSuccess(true);
  };

  return (
    <div className="min-h-screen bg-[#fdf9f4] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <LegalUpdateBanner />
        {/* Top Header */}
        <div className="bg-white rounded-2xl border border-[#eedfd6] p-6 sm:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-[#ffd3c8]/40 text-[#7c0700] text-xs font-bold uppercase tracking-wider">
                CEDA Adjudication Board
              </span>
              <span className="text-xs text-[#5e4038] font-medium">Stage 4 Quorum Chamber</span>
            </div>
            <h1 className="text-2xl font-extrabold text-[#31302d] font-heading mt-1">
              Board Quorum: {currentUser?.fullName || 'Kealeboga Masire'}
            </h1>
            <p className="text-sm text-[#5e4038] mt-1">
              Final sign-off on capital awards and grant disbursements under public parastatal governance.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-right">
              <div className="text-[10px] font-bold text-green-800 uppercase tracking-wider">
                Board Quorum Status
              </div>
              <div className="text-base font-bold text-green-700 flex items-center gap-1.5 justify-end">
                <span className="material-symbols-outlined text-base">how_to_reg</span>
                <span>4 of 5 Present (80% Met)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Board Docket Card */}
        <div className="bg-white rounded-2xl border border-[#eedfd6] p-6 sm:p-8 shadow-sm space-y-6">
          <div className="border-b border-[#e8dfd8] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-xs font-mono font-bold text-[#a02010]">DOCKET #2026-Q1-04</span>
              <h2 className="text-xl font-bold text-[#31302d] font-heading">
                Solar-Powered Smart Grain Silos for Chobe Farmers
              </h2>
              <div className="flex items-center gap-3 text-xs text-[#5e4038] mt-1">
                <span>Applicant: Kagiso Molefe</span>
                <span>•</span>
                <span>Location: Maun / Kasane</span>
                <span>•</span>
                <span>Dual-Blind Evaluator Score: <strong>80 / 100 (Merit Approved)</strong></span>
              </div>
            </div>

            <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full border border-green-200 self-start sm:self-center">
              Ready for Board Sign-Off
            </span>
          </div>

          {/* Evaluator Score Summaries */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-[#fdf9f4] border border-[#e8dfd8]">
              <div className="text-[11px] font-semibold text-[#5e4038] uppercase">Evaluator 1 Score</div>
              <div className="text-lg font-bold text-[#31302d] mt-1">82 / 100</div>
              <div className="text-[11px] text-green-700 mt-0.5">Recommended full Pula grant</div>
            </div>

            <div className="p-4 rounded-xl bg-[#fdf9f4] border border-[#e8dfd8]">
              <div className="text-[11px] font-semibold text-[#5e4038] uppercase">Evaluator 2 Score</div>
              <div className="text-lg font-bold text-[#31302d] mt-1">78 / 100</div>
              <div className="text-[11px] text-green-700 mt-0.5">High regional employment rating</div>
            </div>

            <div className="p-4 rounded-xl bg-[#fdf9f4] border border-[#e8dfd8]">
              <div className="text-[11px] font-semibold text-[#5e4038] uppercase">Evaluator 3 Score</div>
              <div className="text-lg font-bold text-[#31302d] mt-1">80 / 100</div>
              <div className="text-[11px] text-green-700 mt-0.5">Approved technical viability</div>
            </div>
          </div>

          {/* Sign-Off Form */}
          {decisionSuccess ? (
            <div className="p-8 text-center bg-green-50 rounded-xl border border-green-200 space-y-4">
              <span className="material-symbols-outlined text-4xl text-green-700">task_alt</span>
              <h3 className="text-xl font-bold text-green-900">Quorum Sign-Off Executed</h3>
              <p className="text-xs text-green-800 max-w-md mx-auto">
                P 450,000 grant tranche sign-off has been signed by Kealeboga Masire (Adjudicator). The
                grant award notification has been queued for Stage 5 disbursement.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSignOff} className="space-y-6 pt-4 border-t border-[#e8dfd8]">
              <div>
                <label className="block text-xs font-bold text-[#31302d] uppercase tracking-wider mb-2">
                  Adjudication Ruling & Award Mechanism
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <label
                    className={`p-3.5 rounded-xl border cursor-pointer text-xs flex flex-col justify-between ${
                      selectedAction === 'grant'
                        ? 'border-[#a02010] bg-[#ffd3c8]/30 font-bold text-[#7c0700]'
                        : 'border-[#cfc4bc] bg-white text-[#5e4038]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>Approve Grant Tranche</span>
                      <input
                        type="radio"
                        name="ruling"
                        checked={selectedAction === 'grant'}
                        onChange={() => setSelectedAction('grant')}
                        className="accent-[#a02010]"
                      />
                    </div>
                    <span className="text-[10px] text-[#5e4038] mt-2">Up to P 500,000</span>
                  </label>

                  <label
                    className={`p-3.5 rounded-xl border cursor-pointer text-xs flex flex-col justify-between ${
                      selectedAction === 'blend'
                        ? 'border-[#a02010] bg-[#ffd3c8]/30 font-bold text-[#7c0700]'
                        : 'border-[#cfc4bc] bg-white text-[#5e4038]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>Blended Loan/Grant</span>
                      <input
                        type="radio"
                        name="ruling"
                        checked={selectedAction === 'blend'}
                        onChange={() => setSelectedAction('blend')}
                        className="accent-[#a02010]"
                      />
                    </div>
                    <span className="text-[10px] text-[#5e4038] mt-2">Debt + Grant Hybrid</span>
                  </label>

                  <label
                    className={`p-3.5 rounded-xl border cursor-pointer text-xs flex flex-col justify-between ${
                      selectedAction === 'revise'
                        ? 'border-[#a02010] bg-[#ffd3c8]/30 font-bold text-[#7c0700]'
                        : 'border-[#cfc4bc] bg-white text-[#5e4038]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>Request Revision</span>
                      <input
                        type="radio"
                        name="ruling"
                        checked={selectedAction === 'revise'}
                        onChange={() => setSelectedAction('revise')}
                        className="accent-[#a02010]"
                      />
                    </div>
                    <span className="text-[10px] text-[#5e4038] mt-2">Return to Submitter</span>
                  </label>

                  <label
                    className={`p-3.5 rounded-xl border cursor-pointer text-xs flex flex-col justify-between ${
                      selectedAction === 'reject'
                        ? 'border-red-400 bg-red-50 font-bold text-red-800'
                        : 'border-[#cfc4bc] bg-white text-[#5e4038]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>Decline Award</span>
                      <input
                        type="radio"
                        name="ruling"
                        checked={selectedAction === 'reject'}
                        onChange={() => setSelectedAction('reject')}
                        className="accent-red-600"
                      />
                    </div>
                    <span className="text-[10px] text-[#5e4038] mt-2">Formal Parastatal Decline</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#31302d] mb-1">
                  Board Resolution Justification (Defensible Public Audit Evidence) <span className="text-[#ba1a1a]">*</span>
                </label>
                <textarea
                  rows={3}
                  value={decisionNotes}
                  onChange={(e) => setDecisionNotes(e.target.value)}
                  placeholder="Enter board resolution justification and grant tranche audit notes..."
                  className="w-full p-3 border border-[#cfc4bc] rounded-xl text-xs focus:outline-none focus:ring-3 focus:ring-[#f8a018]"
                />
              </div>

              <div className="p-3.5 rounded-xl bg-[#fdf9f4] border border-[#e8dfd8] flex items-start gap-3">
                <input
                  type="checkbox"
                  id="quorumConfirm"
                  checked={quorumSigned}
                  onChange={(e) => setQuorumSigned(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded accent-[#a02010] focus:ring-[#f8a018]"
                />
                <label htmlFor="quorumConfirm" className="text-xs text-[#5e4038] cursor-pointer">
                  <strong>Affirm Quorum Authority:</strong> I confirm that the CEDA Adjudication Board has
                  reached a legal 80% quorum and that all conflict checks have cleared without objection.
                </label>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={!quorumSigned}
                  className={`px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-wide transition-all shadow-md focus:outline-none focus:ring-3 focus:ring-[#f8a018] flex items-center gap-2 ${
                    quorumSigned
                      ? 'bg-[#a02010] hover:bg-[#86190c] text-white cursor-pointer'
                      : 'bg-gray-200 text-gray-500 cursor-not-allowed shadow-none'
                  }`}
                >
                  <span className="material-symbols-outlined text-base">verified</span>
                  <span>Commit Official Board Sign-Off</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
