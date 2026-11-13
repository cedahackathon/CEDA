/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useAuth } from '../../../context/AuthContext';

interface ScoringRubric {
  technicalViability: number; // 0-30
  commercialScalability: number; // 0-35
  jobCreation: number; // 0-20
  citizenInclusion: number; // 0-15
  comments: string;
}

export const EvaluatorDashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const [selectedCase, setSelectedCase] = useState<string>('CASE-0842');
  const [hasDeclaredNoConflict, setHasDeclaredNoConflict] = useState(false);
  const [isRecused, setIsRecused] = useState(false);
  const [scores, setScores] = useState<ScoringRubric>({
    technicalViability: 24,
    commercialScalability: 28,
    jobCreation: 16,
    citizenInclusion: 12,
    comments: 'Strong localized value addition. Silo solar design significantly cuts post-harvest spoilage in Chobe.',
  });
  const [isSubmitted, setIsSubmitted] = useState(false);

  const totalScore =
    scores.technicalViability +
    scores.commercialScalability +
    scores.jobCreation +
    scores.citizenInclusion;

  const handleScoreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasDeclaredNoConflict) {
      alert('You must sign the Conflict-of-Interest Declaration prior to submitting scores.');
      return;
    }
    setIsSubmitted(true);
  };

  const handleRecusal = () => {
    if (window.confirm('Confirm conflict of interest recusal? This dossier will be immediately reassigned to another committee evaluator.')) {
      setIsRecused(true);
    }
  };

  return (
    <div className="min-h-screen bg-[#fdf9f4] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-2xl border border-[#eedfd6] p-6 sm:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-[#ffd3c8]/40 text-[#7c0700] text-xs font-bold uppercase tracking-wider">
                Expert Evaluation Panel
              </span>
              <span className="text-xs text-[#5e4038] font-medium">
                Dual-Blind Scoring Active
              </span>
            </div>
            <h1 className="text-2xl font-extrabold text-[#31302d] font-heading mt-1">
              Evaluator Workspace: {currentUser?.fullName || 'Dr. Tshepiso Setlhako'}
            </h1>
            <p className="text-sm text-[#5e4038] mt-1">
              Independent merit-based assessment. Submitter identities are cryptographically masked.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-right">
              <div className="text-[10px] font-bold text-red-800 uppercase tracking-wider">
                Active Review SLA Clock
              </div>
              <div className="text-lg font-bold text-[#a02010] flex items-center gap-1.5 justify-end">
                <span className="material-symbols-outlined text-base">timer</span>
                <span>48 Hours Remaining</span>
              </div>
            </div>
          </div>
        </div>

        {/* Assigned Review Cases */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Case Queue */}
          <div className="space-y-4">
            <h2 className="text-xs font-bold text-[#31302d] uppercase tracking-wider px-1">
              Pending Docket (2)
            </h2>

            <div
              onClick={() => {
                setSelectedCase('CASE-0842');
                setIsRecused(false);
                setIsSubmitted(false);
              }}
              className={`p-4 rounded-xl border bg-white cursor-pointer transition-all ${
                selectedCase === 'CASE-0842'
                  ? 'border-[#a02010] ring-2 ring-[#a02010]/20 shadow-sm'
                  : 'border-[#e8dfd8] hover:border-[#cfc4bc]'
              }`}
            >
              <div className="flex justify-between items-start">
                <span className="font-mono text-xs font-bold text-[#a02010]">
                  CEDA-INN-2026-0842
                </span>
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-semibold">
                  Due in 2 days
                </span>
              </div>
              <h3 className="font-bold text-sm text-[#31302d] mt-1">
                Solar-Powered Smart Grain Silos
              </h3>
              <p className="text-xs text-[#5e4038] mt-1">
                District: North-West • Sector: Agri-Tech
              </p>
              <div className="mt-3 flex items-center justify-between text-[11px] text-[#5e4038] pt-2 border-t border-[#e8dfd8]">
                <span>Submitter: <i>[Identity Blinded #842]</i></span>
                <span className="font-semibold text-[#a02010]">Stage 2</span>
              </div>
            </div>

            <div
              onClick={() => {
                setSelectedCase('CASE-0911');
                setIsRecused(false);
                setIsSubmitted(false);
              }}
              className={`p-4 rounded-xl border bg-white cursor-pointer transition-all ${
                selectedCase === 'CASE-0911'
                  ? 'border-[#a02010] ring-2 ring-[#a02010]/20 shadow-sm'
                  : 'border-[#e8dfd8] hover:border-[#cfc4bc]'
              }`}
            >
              <div className="flex justify-between items-start">
                <span className="font-mono text-xs font-bold text-[#a02010]">
                  CEDA-INN-2026-0911
                </span>
                <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-800 text-[10px] font-semibold">
                  Due in 5 days
                </span>
              </div>
              <h3 className="font-bold text-sm text-[#31302d] mt-1">
                Mobile Cold Chain for Kgalagadi Beef
              </h3>
              <p className="text-xs text-[#5e4038] mt-1">
                District: Kgalagadi • Sector: Logistics & Cattle
              </p>
              <div className="mt-3 flex items-center justify-between text-[11px] text-[#5e4038] pt-2 border-t border-[#e8dfd8]">
                <span>Submitter: <i>[Identity Blinded #911]</i></span>
                <span className="font-semibold text-green-700">Stage 2</span>
              </div>
            </div>
          </div>

          {/* Right Column: Scoring Dossier & Rubric */}
          <div className="lg:col-span-2 space-y-6">
            {isRecused ? (
              <div className="bg-white rounded-2xl border border-[#eedfd6] p-8 text-center space-y-4">
                <div className="w-14 h-14 rounded-full bg-amber-100 text-amber-800 mx-auto flex items-center justify-center">
                  <span className="material-symbols-outlined text-3xl">handshake</span>
                </div>
                <h3 className="text-xl font-bold text-[#31302d]">Conflict Recusal Registered</h3>
                <p className="text-xs text-[#5e4038] max-w-md mx-auto">
                  You have recused yourself from evaluating this submission. The automated assignment engine
                  has transferred this docket to an alternate certified evaluator.
                </p>
              </div>
            ) : isSubmitted ? (
              <div className="bg-white rounded-2xl border border-[#eedfd6] p-8 text-center space-y-4">
                <div className="w-14 h-14 rounded-full bg-green-100 text-green-800 mx-auto flex items-center justify-center">
                  <span className="material-symbols-outlined text-3xl">done_all</span>
                </div>
                <h3 className="text-xl font-bold text-[#31302d]">Score Successfully Locked</h3>
                <p className="text-xs text-[#5e4038] max-w-md mx-auto">
                  Your assessment score of <strong>{totalScore} / 100</strong> has been cryptographically
                  hashed into the CEDA parastatal audit ledger.
                </p>
                <button
                  onClick={() => setIsSubmitted(false)}
                  className="px-4 py-2 bg-[#fdf9f4] border border-[#cfc4bc] rounded-xl text-xs font-semibold text-[#5e4038]"
                >
                  Edit Evaluation (Within 2-Hour Window)
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-[#eedfd6] p-6 sm:p-8 shadow-sm space-y-6">
                {/* Dossier Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#e8dfd8] pb-4">
                  <div>
                    <span className="text-xs font-mono font-bold text-[#a02010]">
                      {selectedCase === 'CASE-0842' ? 'CEDA-INN-2026-0842' : 'CEDA-INN-2026-0911'}
                    </span>
                    <h2 className="text-xl font-bold text-[#31302d] font-heading">
                      {selectedCase === 'CASE-0842'
                        ? 'Solar-Powered Smart Grain Silos for Chobe Farmers'
                        : 'Mobile Cold Chain for Kgalagadi Beef'}
                    </h2>
                  </div>

                  <button
                    onClick={handleRecusal}
                    className="self-start sm:self-center px-3 py-1.5 rounded-lg border border-red-200 text-[#a02010] hover:bg-red-50 text-xs font-semibold flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-[#f8a018]"
                  >
                    <span className="material-symbols-outlined text-sm">front_hand</span>
                    <span>Declare Conflict & Recuse</span>
                  </button>
                </div>

                {/* Submitter Privacy Strip */}
                <div className="bg-[#ffd3c8]/30 border border-[#ffd3c8] rounded-xl p-3.5 text-xs text-[#7c0700] flex items-center gap-3">
                  <span className="material-symbols-outlined text-lg shrink-0">verified_user</span>
                  <div>
                    <span className="font-bold">BDPA Masked View:</span> Submitter’s personal identifiers
                    (Omang national ID, phone, and CIPA registration numbers) are masked during this stage
                    to guarantee strict fairness and impartiality.
                  </div>
                </div>

                {/* Scoring Rubric Form */}
                <form onSubmit={handleScoreSubmit} className="space-y-6">
                  {/* Criterion 1 */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs font-semibold text-[#31302d]">
                      <label>1. Technical Viability & Novelty (0 - 30 Pts)</label>
                      <span className="text-[#a02010] font-bold">{scores.technicalViability} / 30</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={30}
                      value={scores.technicalViability}
                      onChange={(e) =>
                        setScores({ ...scores, technicalViability: Number(e.target.value) })
                      }
                      className="w-full accent-[#a02010]"
                    />
                    <p className="text-[11px] text-[#5e4038]">
                      Assesses prototype readiness, intellectual property originality, and feasibility in Botswana's climate.
                    </p>
                  </div>

                  {/* Criterion 2 */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs font-semibold text-[#31302d]">
                      <label>2. Commercial Scalability & Market Need (0 - 35 Pts)</label>
                      <span className="text-[#a02010] font-bold">{scores.commercialScalability} / 35</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={35}
                      value={scores.commercialScalability}
                      onChange={(e) =>
                        setScores({ ...scores, commercialScalability: Number(e.target.value) })
                      }
                      className="w-full accent-[#a02010]"
                    />
                    <p className="text-[11px] text-[#5e4038]">
                      Revenue model robustness, export potential within SADC, and payback timeline.
                    </p>
                  </div>

                  {/* Criterion 3 */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs font-semibold text-[#31302d]">
                      <label>3. Botswana Local Job Impact (0 - 20 Pts)</label>
                      <span className="text-[#a02010] font-bold">{scores.jobCreation} / 20</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={20}
                      value={scores.jobCreation}
                      onChange={(e) =>
                        setScores({ ...scores, jobCreation: Number(e.target.value) })
                      }
                      className="w-full accent-[#a02010]"
                    />
                    <p className="text-[11px] text-[#5e4038]">
                      Direct Batswana employment generated across urban, semi-urban, or rural locations.
                    </p>
                  </div>

                  {/* Criterion 4 */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs font-semibold text-[#31302d]">
                      <label>4. Citizen Inclusion & Youth Focus (0 - 15 Pts)</label>
                      <span className="text-[#a02010] font-bold">{scores.citizenInclusion} / 15</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={15}
                      value={scores.citizenInclusion}
                      onChange={(e) =>
                        setScores({ ...scores, citizenInclusion: Number(e.target.value) })
                      }
                      className="w-full accent-[#a02010]"
                    />
                    <p className="text-[11px] text-[#5e4038]">
                      Participation of youth (18-35), women innovators, and marginalized geographical zones.
                    </p>
                  </div>

                  {/* Written Critique */}
                  <div>
                    <label className="block text-xs font-semibold text-[#31302d] mb-1">
                      Actionable Technical Critique & Recommendations <span className="text-red-600">Required</span>
                    </label>
                    <textarea
                      rows={3}
                      value={scores.comments}
                      onChange={(e) => setScores({ ...scores, comments: e.target.value })}
                      className="w-full p-3 border border-[#cfc4bc] rounded-xl text-xs focus:outline-none focus:ring-3 focus:ring-[#f8a018]"
                      placeholder="Provide specific, evidence-backed feedback for the applicant and adjudication board..."
                    />
                  </div>

                  {/* Conflict Checkbox */}
                  <div className="p-3.5 rounded-xl bg-[#fdf9f4] border border-[#e8dfd8] flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="noConflict"
                      checked={hasDeclaredNoConflict}
                      onChange={(e) => setHasDeclaredNoConflict(e.target.checked)}
                      className="mt-1 h-4 w-4 rounded accent-[#a02010] focus:ring-[#f8a018]"
                    />
                    <label htmlFor="noConflict" className="text-xs text-[#5e4038] cursor-pointer">
                      <strong>Conflict of Interest Attestation:</strong> I hereby declare under penalty of
                      law that I have no familial, financial, or institutional ties to this applicant or venture.
                    </label>
                  </div>

                  {/* Total & Submit */}
                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-[#e8dfd8]">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#5e4038] uppercase">Composite Score:</span>
                      <span className="text-2xl font-black text-[#a02010]">{totalScore} / 100</span>
                    </div>

                    <button
                      type="submit"
                      disabled={!hasDeclaredNoConflict}
                      className={`px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-wide transition-all shadow-md focus:outline-none focus:ring-3 focus:ring-[#f8a018] flex items-center gap-2 ${
                        hasDeclaredNoConflict
                          ? 'bg-[#a02010] hover:bg-[#86190c] text-white cursor-pointer'
                          : 'bg-gray-200 text-gray-500 cursor-not-allowed shadow-none'
                      }`}
                    >
                      <span className="material-symbols-outlined text-base">lock</span>
                      <span>Sign & Lock Blind Score</span>
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
