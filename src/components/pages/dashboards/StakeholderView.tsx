/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useAuth } from '../../../context/AuthContext';
import { BOTSWANA_DISTRICTS } from '../../../config/districts';

export const StakeholderView: React.FC = () => {
  const { currentUser } = useAuth();

  const districtData = [
    { name: 'South-East District (Gaborone)', count: 82, capital: 'P 420,000', leadSector: 'FinTech & Digital' },
    { name: 'North-West (Ngamiland & Chobe)', count: 44, capital: 'P 280,000', leadSector: 'Agri-Tech & Tourism' },
    { name: 'North-East District (Francistown)', count: 38, capital: 'P 210,000', leadSector: 'Manufacturing' },
    { name: 'Central District (Serowe, Palapye)', count: 32, capital: 'P 160,000', leadSector: 'Clean Energy & Mining' },
    { name: 'Southern District (Kanye, Lobatse)', count: 20, capital: 'P 90,000', leadSector: 'Beef & Leather' },
    { name: 'Kgalagadi District (Tsabong)', count: 14, capital: 'P 50,000', leadSector: 'Cold-Chain Logistics' },
    { name: 'Ghanzi District', count: 10, capital: 'P 40,000', leadSector: 'Livestock Tech' },
  ];

  return (
    <div className="min-h-screen bg-[#fdf9f4] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-2xl border border-[#eedfd6] p-6 sm:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs font-bold uppercase tracking-wider">
                Public Stakeholder & Oversight
              </span>
              <span className="text-xs text-[#5e4038] font-medium">Read-Only National Monitor</span>
            </div>
            <h1 className="text-2xl font-extrabold text-[#31302d] font-heading mt-1">
              National Innovation Macro Monitor
            </h1>
            <p className="text-sm text-[#5e4038] mt-1">
              Aggregated ecosystem analytics for Ministry of Entrepreneurship, BURS, and National Development Oversight.
            </p>
          </div>

          <div className="text-right">
            <span className="text-xs text-[#5e4038] font-medium">Observer:</span>
            <div className="font-bold text-sm text-[#31302d]">{currentUser?.fullName || 'Boikanyo Sechele'}</div>
            <div className="text-[11px] text-[#5e4038]">BURS Tax & Parastatal Compliance</div>
          </div>
        </div>

        {/* National Macro Counters */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-[#eedfd6] shadow-sm">
            <div className="text-xs font-semibold text-[#5e4038] uppercase">Total Pula Disbursed</div>
            <div className="text-2xl font-black text-[#a02010] mt-1">P 1,250,000</div>
            <div className="text-xs text-green-700 mt-1">100% Citizen-owned ventures</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[#eedfd6] shadow-sm">
            <div className="text-xs font-semibold text-[#5e4038] uppercase">Youth Innovator Share</div>
            <div className="text-2xl font-black text-blue-700 mt-1">54.2%</div>
            <div className="text-xs text-[#5e4038] mt-1">Entrepreneurs aged 18 - 35</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[#eedfd6] shadow-sm">
            <div className="text-xs font-semibold text-[#5e4038] uppercase">Female Founder Ratio</div>
            <div className="text-2xl font-black text-purple-700 mt-1">42.8%</div>
            <div className="text-xs text-green-700 mt-1">Exceeds national parity benchmark</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[#eedfd6] shadow-sm">
            <div className="text-xs font-semibold text-[#5e4038] uppercase">Jobs Projected (3 Yrs)</div>
            <div className="text-2xl font-black text-green-700 mt-1">1,420</div>
            <div className="text-xs text-[#5e4038] mt-1">Across all 10 districts</div>
          </div>
        </div>

        {/* District Breakdown Table */}
        <div className="bg-white rounded-2xl border border-[#eedfd6] p-6 sm:p-8 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#e8dfd8] pb-4">
            <div>
              <h2 className="text-lg font-bold text-[#31302d] font-heading">
                Decentralized District Distribution (#KaeKapaKae)
              </h2>
              <p className="text-xs text-[#5e4038] mt-0.5">
                Monitoring equitable parastatal capital allocation outside the capital corridor.
              </p>
            </div>
            <span className="text-xs font-semibold text-[#7c0700] bg-[#ffd3c8]/30 px-3 py-1 rounded-full">
              10 Districts Monitored
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#e8dfd8] text-[#5e4038] uppercase font-bold tracking-wider">
                  <th className="py-3 px-3">District Region</th>
                  <th className="py-3 px-3 text-center">Submissions</th>
                  <th className="py-3 px-3">Awarded Capital</th>
                  <th className="py-3 px-3">Leading Innovation Sector</th>
                  <th className="py-3 px-3 text-right">Inclusion Index</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e8dfd8]">
                {districtData.map((d, i) => (
                  <tr key={i} className="hover:bg-[#fdf9f4]/50">
                    <td className="py-3 px-3 font-semibold text-[#31302d]">{d.name}</td>
                    <td className="py-3 px-3 text-center font-bold text-[#a02010]">{d.count}</td>
                    <td className="py-3 px-3 font-mono font-semibold text-[#31302d]">{d.capital}</td>
                    <td className="py-3 px-3 text-[#5e4038]">{d.leadSector}</td>
                    <td className="py-3 px-3 text-right">
                      <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded-full font-bold text-[10px]">
                        Optimal
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
