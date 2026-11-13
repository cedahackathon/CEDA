/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useAuth } from '../../context/AuthContext';

export const Footer: React.FC = () => {
  const { setCurrentRoute } = useAuth();

  return (
    <footer className="w-full bg-[#31302d] text-[#f4f0eb] pt-12 pb-8 border-t border-[#8d706b]/30">
      <div className="max-w-[1200px] mx-auto px-4 md:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 pb-12 border-b border-[#5a413c]/60">
          {/* Col 1: National Mandate & Motto */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <img
                src="/assets/ceda-logo.png"
                alt="CEDA Logo"
                className="h-9 w-auto object-contain bg-white/90 p-1 rounded"
              />
            </div>
            <p className="font-headline italic text-sm text-[#f4f0eb]/90 font-medium">
              Finance. Develop. Sustain.
            </p>
            <span className="inline-flex items-center w-fit text-xs px-3 py-1 rounded-full bg-[#943100]/60 text-[#ffdbcf] font-bold tracking-wider">
              #KaeKapaKae
            </span>
            <p className="text-xs text-[#f4f0eb]/75 leading-relaxed">
              Empowering citizen entrepreneurs across every district of Botswana through impactful catalytic funding, advisory, and ecosystem innovation support.
            </p>
          </div>

          {/* Col 2: Portal Links */}
          <div className="flex flex-col gap-3">
            <h3 className="font-headline text-sm text-white font-bold tracking-wide uppercase">
              Portal Links
            </h3>
            <ul className="flex flex-col gap-2 text-xs text-[#f4f0eb]/80">
              <li>
                <button
                  onClick={() => setCurrentRoute('/')}
                  className="hover:text-amber-300 transition-colors text-left"
                >
                  Home Overview
                </button>
              </li>
              <li>
                <button
                  onClick={() => setCurrentRoute('/guidelines')}
                  className="hover:text-amber-300 transition-colors text-left"
                >
                  Application Guidelines
                </button>
              </li>
              <li>
                <button
                  onClick={() => setCurrentRoute('/faqs')}
                  className="hover:text-amber-300 transition-colors text-left"
                >
                  Frequently Asked Questions
                </button>
              </li>
              <li>
                <button
                  onClick={() => setCurrentRoute('/help-center')}
                  className="hover:text-amber-300 transition-colors text-left"
                >
                  Help &amp; Contact Center
                </button>
              </li>
              <li>
                <button
                  onClick={() => setCurrentRoute('/sessions')}
                  className="hover:text-amber-300 transition-colors text-left"
                >
                  Active Security Sessions
                </button>
              </li>
            </ul>
          </div>

          {/* Col 3: Botswana Innovation Ecosystem */}
          <div className="flex flex-col gap-3">
            <h3 className="font-headline text-sm text-white font-bold tracking-wide uppercase">
              Botswana Innovation Ecosystem
            </h3>
            <ul className="flex flex-col gap-2 text-xs text-[#f4f0eb]/80">
              <li className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[14px] text-amber-400">check_circle</span>
                <span>CIPA Business Registration</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[14px] text-amber-400">check_circle</span>
                <span>BURS Tax Compliance</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[14px] text-amber-400">check_circle</span>
                <span>Botswana Digital &amp; Innovation Hub (BDIH)</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[14px] text-amber-400">check_circle</span>
                <span>District Entrepreneurship Advisory</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[14px] text-amber-400">check_circle</span>
                <span>Youth &amp; Agri-Business Grants</span>
              </li>
            </ul>
          </div>

          {/* Col 4: Contact & Help */}
          <div className="flex flex-col gap-3">
            <h3 className="font-headline text-sm text-white font-bold tracking-wide uppercase">
              Contact &amp; Help
            </h3>
            <div className="flex flex-col gap-2 text-xs text-[#f4f0eb]/85">
              <p className="font-semibold text-white">Gaborone Head Office</p>
              <p className="text-[#f4f0eb]/75">Plot 54350 PG Matante Road, CBD</p>
              <p className="text-[#f4f0eb]/75">Gaborone, Botswana</p>
              <p className="mt-1 font-medium text-amber-300">
                Tel: +267 358 7000 / +267 364 7777
              </p>
              <p>
                Email:{' '}
                <a
                  href="mailto:enquiries@ceda.co.bw"
                  className="underline hover:text-amber-200 transition-colors"
                >
                  enquiries@ceda.co.bw
                </a>
              </p>
              <p className="text-[11px] text-[#f4f0eb]/70 mt-1">
                Operating Hours: 07:30 - 16:30 CAT (Mon - Fri)
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Bar: Legal & BDPA Compliance */}
        <div className="pt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-[#f4f0eb]/75">
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setCurrentRoute('/privacy-notice')}
              className="hover:text-white transition-colors"
            >
              Privacy Notice
            </button>
            <span>•</span>
            <button
              onClick={() => setCurrentRoute('/terms-of-service')}
              className="hover:text-white transition-colors"
            >
              Terms of Service
            </button>
            <span>•</span>
            <button
              onClick={() => setCurrentRoute('/disclaimer')}
              className="hover:text-white transition-colors"
            >
              Disclaimer
            </button>
            <span>•</span>
            <span className="text-amber-300 font-medium inline-flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">verified_user</span>
              Botswana Data Protection Act (BDPA) Compliant
            </span>
          </div>
          <div className="text-[#f4f0eb]/70">
            © 2026 CEDA (Citizen Entrepreneurial Development Agency). All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
};
