/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useAuth } from '../../context/AuthContext';

export const NotFoundPage: React.FC = () => {
  const { setCurrentRoute, language } = useAuth();

  return (
    <div className="w-full min-h-[75vh] flex flex-col items-center justify-center py-16 px-4">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-xl border border-[#e2bfb8] p-8 md:p-10 text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#f8a018]"></div>

        <div className="w-16 h-16 rounded-full bg-amber-100 text-[#b26a00] flex items-center justify-center mx-auto mb-4 shadow-sm ring-4 ring-amber-50">
          <span className="material-symbols-outlined text-[36px]">travel_explore</span>
        </div>

        <span className="inline-block px-3 py-1 rounded-full bg-amber-50 text-amber-800 text-xs font-bold uppercase tracking-wider mb-2">
          HTTP Error 404 • Resource Not Found
        </span>

        <h1 className="font-headline text-2xl md:text-3xl font-bold text-[#1c1c19] tracking-tight">
          {language === 'Setswana' ? 'Tsebe ga e yo' : 'Portal Page Not Found'}
        </h1>

        <p className="text-sm text-[#5a413c] mt-3 leading-relaxed">
          {language === 'Setswana'
            ? 'Aterese e o e batlang ga e yo mo tsamaisong ya CEDA. Tsweetswee boela kwa tsebeng e kgolo go tsweledisa tiro.'
            : 'The resource or submission stage you requested does not exist or may have been relocated within the CEDA Innovation Management Pipeline.'}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-6">
          <button
            onClick={() => setCurrentRoute('/')}
            className="w-full sm:w-auto h-11 px-6 rounded-lg bg-[#a02010] text-white font-semibold text-sm hover:bg-[#861a0d] shadow-sm transition-all flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">home</span>
            <span>Return to Portal Overview</span>
          </button>
          <button
            onClick={() => setCurrentRoute('/help-center')}
            className="w-full sm:w-auto h-11 px-6 rounded-lg border border-[#8d706b]/40 text-[#5a413c] hover:bg-[#f1ede8] font-semibold text-sm transition-colors"
          >
            Visit Help Center
          </button>
        </div>

        <p className="text-[11px] text-[#77574e] mt-6">
          Citizen Entrepreneurial Development Agency • Republic of Botswana • #KaeKapaKae
        </p>
      </div>
    </div>
  );
};
