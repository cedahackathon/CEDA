/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ROLE_CONFIGS } from '../../config/roles';

export const Header: React.FC = () => {
  const { currentUser, isAuthenticated, language, setLanguage, currentRoute, setCurrentRoute, logout } = useAuth();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  const roleConfig = currentUser ? ROLE_CONFIGS[currentUser.role] : null;

  return (
    <header className="print:hidden fixed top-0 w-full z-50 bg-[#fdf9f4]/95 backdrop-blur-md shadow-[0_1px_8px_rgba(62,42,37,0.06)] border-b border-[#e2bfb8]/40">
      <div className="h-20 max-w-[1200px] mx-auto px-4 md:px-8 flex items-center justify-between gap-4">
        {/* Left: Brand Identity Lockup */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setCurrentRoute('/')}
            className="flex items-center gap-3 text-left focus:outline-none group"
            title="CEDA Innovation Management Portal"
          >
            {/* Exact Official CEDA Logo & Branding Lockup */}
            <div className="flex items-center gap-3">
              <img
                src="/assets/ceda-logo.png"
                alt="CEDA - Citizen Entrepreneurial Development Agency"
                width={160}
                height={98}
                className="h-10 w-auto object-contain"
              />
              <div className="h-6 w-px bg-[#8d706b]/40"></div>
              <div className="flex flex-col justify-center text-left">
                <span className="font-headline text-[14px] leading-tight font-bold tracking-wider uppercase text-[#1c1c19]">
                  Innovation
                </span>
                <span className="text-[10px] text-[#77574e] font-semibold tracking-widest uppercase leading-none mt-0.5">
                  Management Portal
                </span>
              </div>
            </div>
          </button>

          {/* Center: Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1 ml-6">
            <button
              onClick={() => setCurrentRoute('/')}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                currentRoute === '/'
                  ? 'text-[#7c0700] font-bold border-b-2 border-[#a02010] bg-[#f1ede8]/50'
                  : 'text-[#5a413c] hover:text-[#1c1c19] hover:bg-[#f1ede8]'
              }`}
            >
              {language === 'Setswana' ? 'Legae' : 'Home'}
            </button>
            <button
              onClick={() => setCurrentRoute('/guidelines')}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                currentRoute === '/guidelines'
                  ? 'text-[#7c0700] font-bold border-b-2 border-[#a02010] bg-[#f1ede8]/50'
                  : 'text-[#5a413c] hover:text-[#1c1c19] hover:bg-[#f1ede8]'
              }`}
            >
              {language === 'Setswana' ? 'Dikaelo' : 'Guidelines'}
            </button>
            <button
              onClick={() => setCurrentRoute('/faqs')}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                currentRoute === '/faqs'
                  ? 'text-[#7c0700] font-bold border-b-2 border-[#a02010] bg-[#f1ede8]/50'
                  : 'text-[#5a413c] hover:text-[#1c1c19] hover:bg-[#f1ede8]'
              }`}
            >
              {language === 'Setswana' ? 'Dipotso' : 'FAQs'}
            </button>
            <button
              onClick={() => setCurrentRoute('/help-center')}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                currentRoute === '/help-center'
                  ? 'text-[#7c0700] font-bold border-b-2 border-[#a02010] bg-[#f1ede8]/50'
                  : 'text-[#5a413c] hover:text-[#1c1c19] hover:bg-[#f1ede8]'
              }`}
            >
              {language === 'Setswana' ? 'Thuso' : 'Help Center'}
            </button>

            {/* Authenticated Role Portal Shortcut */}
            {isAuthenticated && roleConfig && (
              <button
                onClick={() => setCurrentRoute(roleConfig.landingRoute)}
                className={`ml-2 px-3 py-1 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all border ${
                  currentRoute.startsWith(roleConfig.landingRoute)
                    ? 'bg-[#a02010] text-white border-[#a02010] shadow-sm'
                    : 'bg-white text-[#7c0700] border-[#a02010]/30 hover:bg-[#fdf9f4]'
                }`}
              >
                {language === 'Setswana' ? roleConfig.labelSetswana : roleConfig.label} Workspace
              </button>
            )}
          </nav>
        </div>

        {/* Right: Language Switcher & Auth Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 md:gap-3 shrink-0">
          {/* Setswana / English Toggle */}
          <div className="hidden sm:flex items-center rounded-lg bg-[#f1ede8] p-1 text-xs border border-[#e2bfb8]/40">
            <button
              onClick={() => setLanguage('EN')}
              className={`px-2 py-1 font-semibold rounded transition-all ${
                language === 'EN'
                  ? 'bg-white text-[#7c0700] shadow-xs'
                  : 'text-[#5a413c] hover:text-[#1c1c19]'
              }`}
            >
              EN
            </button>
            <span className="text-[#8d706b]/40 px-1">|</span>
            <button
              onClick={() => setLanguage('Setswana')}
              className={`px-2 py-1 font-semibold rounded transition-all ${
                language === 'Setswana'
                  ? 'bg-white text-[#7c0700] shadow-xs'
                  : 'text-[#5a413c] hover:text-[#1c1c19]'
              }`}
            >
              Setswana
            </button>
          </div>

          {!isAuthenticated ? (
            <div className="flex items-center gap-1.5 sm:gap-2.5">
              <button
                onClick={() => setCurrentRoute('/login')}
                className="inline-flex items-center justify-center min-h-[36px] sm:min-h-[40px] md:min-h-[42px] px-3 sm:px-4 md:px-5 rounded-lg border border-[#a02010] text-[#a02010] font-semibold text-xs sm:text-sm hover:bg-[#f7f3ee] transition-colors whitespace-nowrap"
              >
                {language === 'Setswana' ? 'Tsena' : 'Login'}
              </button>
              <button
                onClick={() => setCurrentRoute('/register')}
                className="hidden sm:inline-flex items-center justify-center min-h-[40px] md:min-h-[42px] px-4 md:px-6 rounded-lg bg-[#a02010] hover:bg-[#7c0700] text-white font-semibold text-sm transition-colors shadow-sm whitespace-nowrap"
              >
                {language === 'Setswana' ? 'Ikwadise' : 'Register'}
              </button>
              <div className="hidden lg:flex w-8 h-8 rounded-full bg-[#7c0700] text-white items-center justify-center shrink-0 ml-1">
                <span className="material-symbols-outlined text-[18px]">person</span>
              </div>
            </div>
          ) : (
            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-1.5 sm:gap-2 p-1 sm:p-1.5 rounded-lg hover:bg-[#f1ede8] transition-colors border border-transparent hover:border-[#e2bfb8]"
                aria-expanded={isUserMenuOpen}
              >
                <div className="w-8 h-8 rounded-full bg-[#a02010] text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
                  {(currentUser?.firstName?.[0] || 'C').toUpperCase()}
                  {(currentUser?.surname?.[0] || 'U').toUpperCase()}
                </div>
                <div className="hidden sm:flex flex-col text-left">
                  <span className="text-xs font-bold text-[#1c1c19] leading-tight line-clamp-1">
                    {currentUser?.fullName}
                  </span>
                  <span className="text-[10px] text-[#77574e] font-semibold uppercase tracking-wider">
                    {currentUser?.role}
                  </span>
                </div>
                <span className="material-symbols-outlined text-[18px] text-[#77574e]">
                  {isUserMenuOpen ? 'expand_less' : 'expand_more'}
                </span>
              </button>

              {/* User Dropdown Menu */}
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 max-w-[calc(100vw-2rem)] bg-white rounded-xl shadow-xl border border-[#e2bfb8] py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-4 py-2 border-b border-[#f1ede8]">
                    <p className="text-xs text-[#77574e] font-medium">Signed in as</p>
                    <p className="text-sm font-bold text-[#1c1c19] truncate">{currentUser?.fullName}</p>
                    <p className="text-xs text-[#5a413c] truncate">{currentUser?.email}</p>
                    <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-[#ffdad4] text-[#7c0700]">
                      {roleConfig?.label}
                    </span>
                  </div>

                  <div className="py-1">
                    <button
                      onClick={() => {
                        if (roleConfig) setCurrentRoute(roleConfig.landingRoute);
                        setIsUserMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-[#1c1c19] hover:bg-[#fdf9f4] flex items-center gap-2.5"
                    >
                      <span className="material-symbols-outlined text-[18px] text-[#a02010]">space_dashboard</span>
                      <span>Dashboard Workspace</span>
                    </button>

                    <button
                      onClick={() => {
                        setCurrentRoute('/sessions');
                        setIsUserMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-[#1c1c19] hover:bg-[#fdf9f4] flex items-center gap-2.5"
                    >
                      <span className="material-symbols-outlined text-[18px] text-[#77574e]">devices</span>
                      <span>Manage Active Sessions</span>
                    </button>
                  </div>

                  <div className="border-t border-[#f1ede8] pt-1">
                    <button
                      onClick={() => {
                        logout();
                        setIsUserMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-[#ba1a1a] hover:bg-[#ffdad6]/30 flex items-center gap-2.5 font-medium"
                    >
                      <span className="material-symbols-outlined text-[18px]">logout</span>
                      <span>{language === 'Setswana' ? 'Tswa mo Thulaganyong' : 'Sign Out'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Mobile hamburger */}
          <button
            onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}
            className="lg:hidden inline-flex items-center justify-center min-w-[40px] min-h-[40px] p-1.5 text-[#5a413c] hover:text-[#1c1c19] hover:bg-[#f1ede8] rounded-lg focus:outline-none transition-colors"
            aria-label="Toggle Navigation Menu"
            aria-expanded={isMobileNavOpen}
          >
            <span className="material-symbols-outlined text-[24px]">
              {isMobileNavOpen ? 'close' : 'menu'}
            </span>
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {isMobileNavOpen && (
        <div className="lg:hidden bg-white border-b border-[#e2bfb8] px-4 py-4 flex flex-col gap-2 shadow-lg max-h-[calc(100vh-5rem)] overflow-y-auto">
          <button
            onClick={() => {
              setCurrentRoute('/');
              setIsMobileNavOpen(false);
            }}
            className={`text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              currentRoute === '/' ? 'bg-[#fdf9f4] text-[#7c0700] font-bold' : 'text-[#1c1c19] hover:bg-[#fdf9f4]'
            }`}
          >
            {language === 'Setswana' ? 'Legae' : 'Home Overview'}
          </button>
          <button
            onClick={() => {
              setCurrentRoute('/guidelines');
              setIsMobileNavOpen(false);
            }}
            className={`text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              currentRoute === '/guidelines' ? 'bg-[#fdf9f4] text-[#7c0700] font-bold' : 'text-[#1c1c19] hover:bg-[#fdf9f4]'
            }`}
          >
            {language === 'Setswana' ? 'Dikaelo' : 'Application Guidelines'}
          </button>
          <button
            onClick={() => {
              setCurrentRoute('/faqs');
              setIsMobileNavOpen(false);
            }}
            className={`text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              currentRoute === '/faqs' ? 'bg-[#fdf9f4] text-[#7c0700] font-bold' : 'text-[#1c1c19] hover:bg-[#fdf9f4]'
            }`}
          >
            FAQs
          </button>
          <button
            onClick={() => {
              setCurrentRoute('/help-center');
              setIsMobileNavOpen(false);
            }}
            className={`text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              currentRoute === '/help-center' ? 'bg-[#fdf9f4] text-[#7c0700] font-bold' : 'text-[#1c1c19] hover:bg-[#fdf9f4]'
            }`}
          >
            {language === 'Setswana' ? 'Thuso' : 'Help Center'}
          </button>

          {isAuthenticated && roleConfig && (
            <button
              onClick={() => {
                setCurrentRoute(roleConfig.landingRoute);
                setIsMobileNavOpen(false);
              }}
              className="text-left px-3 py-2.5 rounded-lg text-sm font-bold text-[#a02010] bg-[#ffdad4]/40"
            >
              My Role Workspace ({roleConfig.label})
            </button>
          )}

          {/* Mobile Language Toggle & Auth Actions */}
          <div className="sm:hidden border-t border-[#f1ede8] pt-3 mt-1 flex flex-col gap-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-semibold text-[#77574e] uppercase tracking-wider">
                Language
              </span>
              <div className="flex items-center rounded-lg bg-[#f1ede8] p-1 text-xs border border-[#e2bfb8]/40">
                <button
                  onClick={() => setLanguage('EN')}
                  className={`px-2.5 py-1 font-semibold rounded transition-all ${
                    language === 'EN'
                      ? 'bg-white text-[#7c0700] shadow-xs'
                      : 'text-[#5a413c] hover:text-[#1c1c19]'
                  }`}
                >
                  EN
                </button>
                <span className="text-[#8d706b]/40 px-1">|</span>
                <button
                  onClick={() => setLanguage('Setswana')}
                  className={`px-2.5 py-1 font-semibold rounded transition-all ${
                    language === 'Setswana'
                      ? 'bg-white text-[#7c0700] shadow-xs'
                      : 'text-[#5a413c] hover:text-[#1c1c19]'
                  }`}
                >
                  Setswana
                </button>
              </div>
            </div>

            {!isAuthenticated && (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    setCurrentRoute('/login');
                    setIsMobileNavOpen(false);
                  }}
                  className="inline-flex items-center justify-center min-h-[42px] px-4 rounded-lg border border-[#a02010] text-[#a02010] font-semibold text-sm hover:bg-[#f7f3ee] transition-colors"
                >
                  {language === 'Setswana' ? 'Tsena' : 'Login'}
                </button>
                <button
                  onClick={() => {
                    setCurrentRoute('/register');
                    setIsMobileNavOpen(false);
                  }}
                  className="inline-flex items-center justify-center min-h-[42px] px-4 rounded-lg bg-[#a02010] hover:bg-[#7c0700] text-white font-semibold text-sm transition-colors shadow-sm"
                >
                  {language === 'Setswana' ? 'Ikwadise' : 'Register'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
