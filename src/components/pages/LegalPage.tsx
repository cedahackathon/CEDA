/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import termsMarkdown from '../../content/terms.md?raw';
import privacyMarkdown from '../../content/privacy.md?raw';
import {
  MarkdownRenderer,
  parseLegalDocument,
  renderInlineMarkdown,
} from '../common/MarkdownRenderer';

interface LegalPageProps {
  doc: 'terms' | 'privacy';
}

export const LegalPage: React.FC<LegalPageProps> = ({ doc }) => {
  const { currentRoute, setCurrentRoute } = useAuth();

  const fromRegister = useMemo(() => {
    const queryFromRoute = currentRoute.includes('?') ? currentRoute.split('?')[1] : '';
    const queryString = queryFromRoute || (typeof window !== 'undefined' ? window.location.search : '');
    const params = new URLSearchParams(queryString);
    return params.get('from') === 'register';
  }, [currentRoute]);

  const rawContent = doc === 'terms' ? termsMarkdown : privacyMarkdown;
  const parsed = useMemo(() => parseLegalDocument(rawContent), [rawContent]);

  const handleBackToRegistration = () => {
    if (typeof window !== 'undefined' && window.opener && !window.opener.closed) {
      window.opener.focus();
      window.close();
      return;
    }
    setCurrentRoute('/register');
  };

  const handleScrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const target = document.getElementById(id);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      target.focus({ preventScroll: true });
    }
  };

  const handleBackToTop = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePrint = () => {
    window.print();
  };

  const renderBackToRegistrationButton = (position: 'top' | 'bottom') => {
    if (!fromRegister) return null;
    return (
      <button
        type="button"
        onClick={handleBackToRegistration}
        data-position={position}
        className="print:hidden inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#a02010] bg-white text-[#a02010] hover:bg-[#f7f3ee] text-xs font-bold transition-colors cursor-pointer"
      >
        <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
          arrow_back
        </span>
        <span>Back to registration</span>
      </button>
    );
  };

  return (
    <div id="legal-top" className="min-h-[calc(100vh-5rem)] bg-[#fdf9f4] py-8 sm:py-10 px-4">
      <div className="max-w-[760px] mx-auto space-y-4">
        {fromRegister && (
          <div className="flex items-center justify-start print:hidden">
            {renderBackToRegistrationButton('top')}
          </div>
        )}

        <article className="bg-white rounded-2xl border border-[#e2bfb8] shadow-sm p-6 sm:p-8 lg:p-10 space-y-6">
          {/* Document Header */}
          <header className="border-b border-[#e8dfd8] pb-5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="space-y-1.5">
                <h1 className="font-headline text-2xl sm:text-3xl font-bold text-[#1c1c19] tracking-tight">
                  {parsed.title || (doc === 'terms' ? 'Terms of Service' : 'Privacy Notice')}
                </h1>
                {parsed.headerLines.length > 0 && (
                  <div className="text-xs sm:text-sm text-[#5a413c] space-y-0.5">
                    {parsed.headerLines.map((line, idx) => (
                      <p key={`hdr-${idx}`}>{renderInlineMarkdown(line, `hdr-${idx}`)}</p>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={handlePrint}
                className="print:hidden inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#e2bfb8] bg-[#f7f3ee] hover:bg-[#f1ede8] text-[#1c1c19] text-xs font-semibold transition-colors shrink-0 self-start cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                  print
                </span>
                <span>Print</span>
              </button>
            </div>
          </header>

          {/* Table of Contents */}
          {parsed.headings.length > 0 && (
            <nav
              aria-label="Table of contents"
              className="p-4 sm:p-5 rounded-xl bg-[#f7f3ee] border border-[#e2bfb8]/70 space-y-2.5 print:border-[#ccc]"
            >
              <h2 className="font-headline text-xs font-bold uppercase tracking-wider text-[#5a413c]">
                Contents
              </h2>
              <ol className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
                {parsed.headings.map((item) => (
                  <li key={item.id}>
                    <a
                      href={`#${item.id}`}
                      onClick={(e) => handleScrollToSection(e, item.id)}
                      className="text-[#7c0700] hover:text-[#a02010] hover:underline font-medium inline-block py-0.5 rounded-xs"
                    >
                      {item.text}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          )}

          {/* Markdown Body */}
          <MarkdownRenderer markdown={parsed.bodyMarkdown} headings={parsed.headings} />

          {/* Bottom Controls */}
          <footer className="pt-5 border-t border-[#e8dfd8] flex flex-wrap items-center justify-between gap-3 print:hidden">
            <a
              href="#legal-top"
              onClick={handleBackToTop}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#7c0700] hover:text-[#a02010] hover:underline rounded-xs"
            >
              <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                arrow_upward
              </span>
              <span>Back to top</span>
            </a>

            {renderBackToRegistrationButton('bottom')}
          </footer>
        </article>
      </div>
    </div>
  );
};
