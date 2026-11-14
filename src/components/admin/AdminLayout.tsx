/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  ADMIN_NAV_ITEMS,
  AdminNavItem,
  AttentionItem,
} from '../../data/adminConfig';

interface AdminLayoutProps {
  children: React.ReactNode;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  attentionItems?: AttentionItem[];
}

function getInitials(fullName?: string): string {
  if (!fullName) return 'AD';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return fullName.slice(0, 2).toUpperCase();
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  children,
  searchQuery: externalSearchQuery,
  onSearchChange,
  attentionItems = [],
}) => {
  const { currentUser, currentRoute, setCurrentRoute, language, setLanguage, logout } = useAuth();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [internalSearch, setInternalSearch] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const notificationsRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  const searchValue = externalSearchQuery !== undefined ? externalSearchQuery : internalSearch;
  const handleSearchInput = (val: string) => {
    if (onSearchChange) {
      onSearchChange(val);
    } else {
      setInternalSearch(val);
    }
  };

  const cleanPath = currentRoute.split('?')[0];
  const displayName = currentUser?.fullName || 'Administrator';
  const displayEmail = currentUser?.email || '';
  const roleLabel = 'Administrator';
  const initials = getInitials(displayName);

  // Close popovers and drawer on Escape key or outside click
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMobileDrawerOpen(false);
        setIsNotificationsOpen(false);
        setIsUserMenuOpen(false);
        setIsSearchFocused(false);
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (notificationsRef.current && !notificationsRef.current.contains(target)) {
        setIsNotificationsOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(target)) {
        setIsUserMenuOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(target)) {
        setIsSearchFocused(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const navigateTo = (path: string) => {
    setCurrentRoute(path);
    setIsMobileDrawerOpen(false);
    setIsNotificationsOpen(false);
    setIsUserMenuOpen(false);
    setIsSearchFocused(false);
  };

  const isNavItemActive = (item: AdminNavItem) => {
    if (item.path === '/admin') {
      return cleanPath === '/admin' || cleanPath === '/dashboard/admin';
    }
    return cleanPath === item.path;
  };

  const filteredQuickJump = searchValue.trim()
    ? ADMIN_NAV_ITEMS.filter(
        (item) =>
          item.label.toLowerCase().includes(searchValue.toLowerCase()) ||
          item.labelSetswana.toLowerCase().includes(searchValue.toLowerCase())
      )
    : [];

  return (
    <div className="min-h-screen bg-[#fdf9f4] text-[#1c1c19] flex flex-col font-sans">
      {/* Desktop Fixed Full-Height Collapsible Sidebar (264px expanded / 72px collapsed, 200ms transition) */}
      <aside
        aria-label="Administrator navigation"
        className={`hidden lg:flex lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 h-screen flex-col bg-[#3b251f] text-[#f4f0eb] border-r border-[#4f352e] transition-[width] duration-200 ease-in-out select-none ${
          isCollapsed ? 'lg:w-[72px]' : 'lg:w-[264px]'
        }`}
      >
        {/* Sidebar Header */}
        <div
          className={`h-16 flex items-center border-b border-white/10 shrink-0 ${
            isCollapsed ? 'justify-between px-2.5' : 'justify-between px-4'
          }`}
        >
          <button
            type="button"
            onClick={() => navigateTo('/admin')}
            className="flex items-center gap-2.5 text-left rounded-lg p-1 hover:bg-white/10 transition-colors focus-visible:outline-2 focus-visible:outline-[#f8a018]"
            aria-label="CEDA Innovation Portal Admin Home"
            title="CEDA Innovation Portal"
          >
            <img
              src="/assets/ceda-logo.png"
              alt="CEDA"
              width={160}
              height={98}
              className="w-7 h-7 object-contain rounded bg-white p-0.5 shrink-0"
            />
            {!isCollapsed && (
              <div className="flex flex-col leading-tight">
                <span className="font-headline text-sm font-bold tracking-wide text-white">
                  CEDA
                </span>
                <span className="text-[11px] text-[#d8c8c3] font-medium">
                  Innovation Portal
                </span>
              </div>
            )}
          </button>

          <button
            type="button"
            onClick={() => setIsCollapsed((prev) => !prev)}
            aria-expanded={!isCollapsed}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="w-7 h-7 rounded-md flex items-center justify-center text-[#d8c8c3] hover:text-white hover:bg-white/10 transition-colors shrink-0"
          >
            <span className="material-symbols-outlined text-[18px]">
              {isCollapsed ? 'chevron_right' : 'chevron_left'}
            </span>
          </button>
        </div>

        {/* Sidebar Menu Items */}
        <nav
          aria-label="Admin sections"
          className={`flex-1 py-3 overflow-y-auto flex flex-col gap-1 ${
            isCollapsed ? 'px-2 overflow-visible' : 'px-2.5'
          }`}
        >
          {ADMIN_NAV_ITEMS.map((item) => {
            const active = isNavItemActive(item);
            const label = language === 'Setswana' ? item.labelSetswana : item.label;

            return (
              <div key={item.id} className="relative group">
                <button
                  type="button"
                  onClick={() => navigateTo(item.path)}
                  aria-current={active ? 'page' : undefined}
                  aria-label={label}
                  title={isCollapsed ? label : undefined}
                  className={`w-full flex items-center rounded-lg text-[13px] transition-colors ${
                    isCollapsed
                      ? 'justify-center h-11 px-0'
                      : 'justify-start gap-3 px-3 py-2.5 text-left'
                  } ${
                    active
                      ? 'bg-[#a02010] text-white font-semibold shadow-sm'
                      : 'text-[#e8dcd7] hover:bg-white/10 hover:text-white font-medium'
                  }`}
                >
                  <span className="material-symbols-outlined text-[20px] shrink-0">
                    {item.icon}
                  </span>
                  {!isCollapsed && <span className="truncate">{label}</span>}
                </button>

                {/* Tooltip for collapsed icon-only state (never truncated) */}
                {isCollapsed && (
                  <div
                    role="tooltip"
                    className="pointer-events-none opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-150 absolute left-full top-1/2 -translate-y-1/2 ml-2.5 z-50 px-2.5 py-1.5 rounded-md bg-[#1c1c19] text-white text-xs font-medium whitespace-nowrap shadow-xl border border-white/15"
                  >
                    {label}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Sidebar Footer: Help Center & TK User Card */}
        <div
          className={`border-t border-white/10 py-3 flex flex-col gap-2 shrink-0 ${
            isCollapsed ? 'px-2' : 'px-2.5'
          }`}
        >
          <div className="relative group">
            <button
              type="button"
              onClick={() => navigateTo('/help-center')}
              aria-label={language === 'Setswana' ? 'Thuso' : 'Help Center'}
              title={isCollapsed ? 'Help Center' : undefined}
              className={`w-full flex items-center rounded-lg text-[13px] text-[#e8dcd7] hover:bg-white/10 hover:text-white transition-colors ${
                isCollapsed ? 'justify-center h-10 px-0' : 'gap-3 px-3 py-2 text-left'
              }`}
            >
              <span className="material-symbols-outlined text-[20px] shrink-0">help_outline</span>
              {!isCollapsed && (
                <span>{language === 'Setswana' ? 'Thuso' : 'Help Center'}</span>
              )}
            </button>

            {isCollapsed && (
              <div
                role="tooltip"
                className="pointer-events-none opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-150 absolute left-full top-1/2 -translate-y-1/2 ml-2.5 z-50 px-2.5 py-1.5 rounded-md bg-[#1c1c19] text-white text-xs font-medium whitespace-nowrap shadow-xl border border-white/15"
              >
                Help Center
              </div>
            )}
          </div>

          {/* Administrator Profile Card (Deep Red initials, not an image) */}
          <div className="relative group">
            <button
              type="button"
              onClick={() => navigateTo('/sessions')}
              aria-label={`${displayName} — ${roleLabel}`}
              title={isCollapsed ? `${displayName} — ${roleLabel}` : undefined}
              className={`w-full flex items-center rounded-xl bg-black/25 hover:bg-black/35 border border-white/10 transition-colors ${
                isCollapsed ? 'justify-center p-1.5' : 'gap-2.5 p-2.5 text-left'
              }`}
            >
              <span
                aria-hidden="true"
                className="w-8 h-8 rounded-full bg-[#a02010] text-white font-bold text-xs flex items-center justify-center shrink-0 tracking-wide shadow-xs"
              >
                {initials}
              </span>
              {!isCollapsed && (
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold text-white truncate">
                    {displayName}
                  </span>
                  <span className="text-[11px] text-[#d8c8c3] truncate">
                    {roleLabel}
                  </span>
                </div>
              )}
            </button>

            {isCollapsed && (
              <div
                role="tooltip"
                className="pointer-events-none opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-150 absolute left-full top-1/2 -translate-y-1/2 ml-2.5 z-50 px-2.5 py-1.5 rounded-md bg-[#1c1c19] text-white text-xs font-medium whitespace-nowrap shadow-xl border border-white/15"
              >
                {displayName} ({roleLabel})
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile Slide-Over Sidebar Drawer (< lg) */}
      {isMobileDrawerOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 flex"
          role="dialog"
          aria-modal="true"
          aria-label="Administrator navigation menu"
        >
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            onClick={() => setIsMobileDrawerOpen(false)}
          />
          <aside className="relative w-[264px] max-w-[85vw] h-full bg-[#3b251f] text-[#f4f0eb] flex flex-col shadow-2xl z-10">
            <div className="h-16 px-4 flex items-center justify-between border-b border-white/10 shrink-0">
              <div className="flex items-center gap-2.5">
                <img
                  src="/assets/ceda-logo.png"
                  alt="CEDA"
                  width={160}
                  height={98}
                  className="w-7 h-7 object-contain rounded bg-white p-0.5"
                />
                <div className="flex flex-col leading-tight">
                  <span className="font-headline text-sm font-bold text-white">CEDA</span>
                  <span className="text-[11px] text-[#d8c8c3]">Innovation Portal</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileDrawerOpen(false)}
                aria-label="Close navigation menu"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[#d8c8c3] hover:text-white hover:bg-white/10"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto px-2.5 py-3 flex flex-col gap-1">
              {ADMIN_NAV_ITEMS.map((item) => {
                const active = isNavItemActive(item);
                const label = language === 'Setswana' ? item.labelSetswana : item.label;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => navigateTo(item.path)}
                    aria-current={active ? 'page' : undefined}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] text-left transition-colors ${
                      active
                        ? 'bg-[#a02010] text-white font-semibold'
                        : 'text-[#e8dcd7] hover:bg-white/10 hover:text-white font-medium'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[20px] shrink-0">
                      {item.icon}
                    </span>
                    <span>{label}</span>
                  </button>
                );
              })}
            </nav>

            <div className="border-t border-white/10 p-3 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => navigateTo('/help-center')}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] text-[#e8dcd7] hover:bg-white/10 hover:text-white text-left"
              >
                <span className="material-symbols-outlined text-[20px]">help_outline</span>
                <span>{language === 'Setswana' ? 'Thuso' : 'Help Center'}</span>
              </button>

              <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-black/25 border border-white/10">
                <span
                  aria-hidden="true"
                  className="w-8 h-8 rounded-full bg-[#a02010] text-white font-bold text-xs flex items-center justify-center shrink-0"
                >
                  {initials}
                </span>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold text-white truncate">{displayName}</span>
                  <span className="text-[11px] text-[#d8c8c3] truncate">
                    {roleLabel}
                  </span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Main Column (shifts right by 264px or 72px on desktop) */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-[padding] duration-200 ease-in-out ${
          isCollapsed ? 'lg:pl-[72px]' : 'lg:pl-[264px]'
        }`}
      >
        {/* Top Utility Header Bar */}
        <header className="sticky top-0 z-30 h-14 sm:h-16 bg-white/95 backdrop-blur-md border-b border-[#e2bfb8]/60 px-3 sm:px-4 lg:px-6 flex items-center justify-between gap-2 sm:gap-3">
          {/* Left: Mobile Hamburger + Logo OR Desktop Search */}
          <div className="flex items-center gap-2 sm:gap-2.5 flex-1 min-w-0">
            <button
              type="button"
              onClick={() => setIsMobileDrawerOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden inline-flex items-center justify-center w-9 h-9 rounded-lg text-[#5a413c] hover:bg-[#f1ede8] transition-colors shrink-0"
            >
              <span className="material-symbols-outlined text-[22px]">menu</span>
            </button>

            {/* Mobile brand mark */}
            <button
              type="button"
              onClick={() => navigateTo('/admin')}
              className="lg:hidden flex items-center gap-1.5 sm:gap-2 min-w-0"
            >
              <img
                src="/assets/ceda-logo.png"
                alt="CEDA"
                width={160}
                height={98}
                className="h-6 sm:h-7 w-auto object-contain shrink-0"
              />
              <span className="font-headline text-sm font-bold text-[#1c1c19] truncate">
                CEDA
              </span>
            </button>

            {/* Desktop Search Input */}
            <div ref={searchRef} className="hidden lg:block relative w-full max-w-[440px]">
              <label htmlFor="admin-global-search" className="sr-only">
                Search submissions, users, audit logs
              </label>
              <span className="material-symbols-outlined text-[18px] text-[#77574e] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                search
              </span>
              <input
                id="admin-global-search"
                type="search"
                value={searchValue}
                onFocus={() => setIsSearchFocused(true)}
                onChange={(e) => handleSearchInput(e.target.value)}
                placeholder="Search submissions, users, audit logs"
                className="w-full h-10 pl-10 pr-4 rounded-lg bg-[#fdf9f4] focus:bg-white border border-[#e2bfb8]/70 focus:border-[#a02010] text-xs font-medium text-[#1c1c19] placeholder:text-[#77574e] transition-colors"
              />

              {/* Quick Jump Search Results */}
              {isSearchFocused && filteredQuickJump.length > 0 && (
                <div className="absolute left-0 right-0 mt-1.5 bg-white rounded-xl shadow-xl border border-[#e2bfb8] py-1.5 z-50">
                  <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#77574e]">
                    Admin Sections
                  </div>
                  {filteredQuickJump.slice(0, 5).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => navigateTo(item.path)}
                      className="w-full px-3 py-2 text-left text-xs text-[#1c1c19] hover:bg-[#fdf9f4] flex items-center gap-2.5"
                    >
                      <span className="material-symbols-outlined text-[16px] text-[#a02010]">
                        {item.icon}
                      </span>
                      <span className="font-medium">{item.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: Language Switcher, Notification Bell, TK Avatar */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {/* EN | Setswana Toggle */}
            <div
              role="group"
              aria-label="Language switcher"
              className="flex items-center h-8 sm:h-9 rounded-lg bg-[#f7f3ee] p-0.5 text-[11px] sm:text-xs border border-[#e2bfb8]/60 shrink-0"
            >
              <button
                type="button"
                onClick={() => setLanguage('EN')}
                aria-pressed={language === 'EN'}
                className={`h-full px-2 sm:px-2.5 font-semibold rounded-md transition-all whitespace-nowrap ${
                  language === 'EN'
                    ? 'bg-white text-[#7c0700] shadow-xs'
                    : 'text-[#5a413c] hover:text-[#1c1c19]'
                }`}
              >
                EN
              </button>
              <span className="text-[#8d706b]/40 px-0.5 select-none" aria-hidden="true">
                |
              </span>
              <button
                type="button"
                onClick={() => setLanguage('Setswana')}
                aria-pressed={language === 'Setswana'}
                className={`h-full px-2 sm:px-2.5 font-semibold rounded-md transition-all whitespace-nowrap ${
                  language === 'Setswana'
                    ? 'bg-white text-[#7c0700] shadow-xs'
                    : 'text-[#5a413c] hover:text-[#1c1c19]'
                }`}
              >
                <span className="sm:hidden">TN</span>
                <span className="hidden sm:inline">Setswana</span>
              </button>
            </div>

            {/* Notification Bell */}
            <div ref={notificationsRef} className="relative shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsUserMenuOpen(false);
                  setIsNotificationsOpen((prev) => !prev);
                }}
                aria-label="Notifications"
                aria-expanded={isNotificationsOpen}
                className="relative w-9 h-9 rounded-lg flex items-center justify-center text-[#5a413c] hover:text-[#1c1c19] hover:bg-[#f1ede8] active:bg-[#e8e1d9] transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">notifications</span>
                {attentionItems.length > 0 && (
                  <span
                    aria-hidden="true"
                    className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#a02010] ring-2 ring-white"
                  />
                )}
              </button>

              {isNotificationsOpen && (
                <div
                  role="region"
                  aria-label="Administrative alerts"
                  className="fixed inset-x-3 top-16 sm:inset-x-auto sm:top-auto sm:absolute sm:right-0 sm:mt-2 sm:w-80 bg-white rounded-xl shadow-xl border border-[#e2bfb8] py-2 z-50 max-h-[70vh] overflow-y-auto"
                >
                  <div className="px-4 py-2 border-b border-[#f1ede8] flex items-center justify-between">
                    <span className="text-xs font-bold text-[#1c1c19]">Needs Attention</span>
                    <span className="text-[11px] font-semibold text-[#a02010]">
                      {attentionItems.length} {attentionItems.length === 1 ? 'item' : 'items'}
                    </span>
                  </div>
                  {attentionItems.length === 0 ? (
                    <div className="px-4 py-4 text-xs text-[#6b4f47]">
                      All clear — no pending administrative alerts.
                    </div>
                  ) : (
                    <div className="divide-y divide-[#f1ede8]">
                      {attentionItems.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => navigateTo(item.route)}
                          className="w-full px-4 py-2.5 text-left hover:bg-[#fdf9f4] flex items-start gap-2.5 transition-colors"
                        >
                          <span className="material-symbols-outlined text-[16px] text-[#a02010] mt-0.5 shrink-0">
                            {item.icon}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-[#1c1c19] leading-snug">{item.text}</p>
                            <span className="text-[11px] font-semibold text-[#a02010] mt-0.5 inline-block">
                              {item.actionLabel} →
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Top Bar Avatar with initials in Deep Red (not an image) */}
            <div ref={userMenuRef} className="relative shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsNotificationsOpen(false);
                  setIsUserMenuOpen((prev) => !prev);
                }}
                aria-expanded={isUserMenuOpen}
                aria-label={`${displayName} account menu`}
                className="flex items-center gap-1 p-0.5 rounded-full hover:bg-[#f1ede8] active:bg-[#e8e1d9] transition-colors"
              >
                <span className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#7c0700] text-white font-bold text-xs flex items-center justify-center shadow-xs tracking-wide">
                  {initials}
                </span>
                <span className="hidden sm:inline-block material-symbols-outlined text-[18px] text-[#5a413c]">
                  {isUserMenuOpen ? 'expand_less' : 'expand_more'}
                </span>
              </button>

              {isUserMenuOpen && (
                <div className="fixed inset-x-3 top-16 sm:inset-x-auto sm:top-auto sm:absolute sm:right-0 sm:mt-2 sm:w-64 bg-white rounded-xl shadow-xl border border-[#e2bfb8] py-2 z-50 max-h-[75vh] overflow-y-auto">
                  <div className="px-4 py-2.5 border-b border-[#f1ede8]">
                    <p className="text-xs font-bold text-[#1c1c19] truncate">{displayName}</p>
                    {displayEmail && (
                      <p className="text-[11px] text-[#5a413c] truncate">{displayEmail}</p>
                    )}
                    <span className="inline-block mt-1.5 px-2 py-0.5 text-[10px] font-bold rounded bg-[#ffdad4] text-[#7c0700] uppercase tracking-wider">
                      {roleLabel}
                    </span>
                  </div>

                  <div className="py-1">
                    <button
                      type="button"
                      onClick={() => navigateTo('/admin')}
                      className="w-full px-4 py-2.5 sm:py-2 text-left text-xs font-medium text-[#1c1c19] hover:bg-[#fdf9f4] flex items-center gap-2.5"
                    >
                      <span className="material-symbols-outlined text-[17px] text-[#a02010]">
                        grid_view
                      </span>
                      <span>Admin Dashboard</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => navigateTo('/sessions')}
                      className="w-full px-4 py-2.5 sm:py-2 text-left text-xs font-medium text-[#1c1c19] hover:bg-[#fdf9f4] flex items-center gap-2.5"
                    >
                      <span className="material-symbols-outlined text-[17px] text-[#5a413c]">
                        devices
                      </span>
                      <span>Manage Active Sessions</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => navigateTo('/')}
                      className="w-full px-4 py-2.5 sm:py-2 text-left text-xs font-medium text-[#1c1c19] hover:bg-[#fdf9f4] flex items-center gap-2.5"
                    >
                      <span className="material-symbols-outlined text-[17px] text-[#5a413c]">
                        home
                      </span>
                      <span>Public Portal Home</span>
                    </button>
                  </div>

                  <div className="border-t border-[#f1ede8] pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        logout();
                      }}
                      className="w-full px-4 py-2.5 sm:py-2 text-left text-xs font-semibold text-[#ba1a1a] hover:bg-[#ffdad6]/30 flex items-center gap-2.5"
                    >
                      <span className="material-symbols-outlined text-[17px]">logout</span>
                      <span>{language === 'Setswana' ? 'Tswa mo Thulaganyong' : 'Sign Out'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Mobile Search Bar (< lg) */}
        <div className="lg:hidden px-4 pt-3 bg-[#fdf9f4]">
          <div className="relative">
            <label htmlFor="admin-mobile-search" className="sr-only">
              Search submissions, users, audit logs
            </label>
            <span className="material-symbols-outlined text-[18px] text-[#77574e] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
              search
            </span>
            <input
              id="admin-mobile-search"
              type="search"
              value={searchValue}
              onChange={(e) => handleSearchInput(e.target.value)}
              placeholder="Search submissions, users, audit logs"
              className="w-full h-10 pl-9 pr-3 rounded-lg bg-white border border-[#e2bfb8]/70 focus:border-[#a02010] text-xs font-medium text-[#1c1c19] placeholder:text-[#77574e]"
            />
          </div>
        </div>

        {/* Page Body */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-5 pb-24 lg:pb-10 max-w-[1440px] w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (< lg) */}
      <nav
        aria-label="Mobile admin quick navigation"
        className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-[#e2bfb8]/80 px-2 py-1.5 grid grid-cols-5 gap-1 shadow-[0_-2px_10px_rgba(62,42,37,0.06)]"
      >
        <button
          type="button"
          onClick={() => navigateTo('/admin')}
          aria-current={cleanPath === '/admin' ? 'page' : undefined}
          className={`flex flex-col items-center justify-center py-1 rounded-lg text-[10px] font-semibold transition-colors ${
            cleanPath === '/admin' ? 'text-[#a02010]' : 'text-[#5a413c] hover:text-[#1c1c19]'
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">grid_view</span>
          <span>Dashboard</span>
        </button>

        <button
          type="button"
          onClick={() => navigateTo('/admin/users')}
          aria-current={cleanPath === '/admin/users' ? 'page' : undefined}
          className={`flex flex-col items-center justify-center py-1 rounded-lg text-[10px] font-semibold transition-colors ${
            cleanPath === '/admin/users' ? 'text-[#a02010]' : 'text-[#5a413c] hover:text-[#1c1c19]'
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">group</span>
          <span>Users</span>
        </button>

        <button
          type="button"
          onClick={() => navigateTo('/admin/evaluator-assignment')}
          aria-current={cleanPath === '/admin/evaluator-assignment' ? 'page' : undefined}
          className={`flex flex-col items-center justify-center py-1 rounded-lg text-[10px] font-semibold transition-colors ${
            cleanPath === '/admin/evaluator-assignment'
              ? 'text-[#a02010]'
              : 'text-[#5a413c] hover:text-[#1c1c19]'
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">assignment_ind</span>
          <span>Queue</span>
        </button>

        <button
          type="button"
          onClick={() => navigateTo('/admin/reports')}
          aria-current={cleanPath === '/admin/reports' ? 'page' : undefined}
          className={`flex flex-col items-center justify-center py-1 rounded-lg text-[10px] font-semibold transition-colors ${
            cleanPath === '/admin/reports' ? 'text-[#a02010]' : 'text-[#5a413c] hover:text-[#1c1c19]'
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">bar_chart</span>
          <span>Reports</span>
        </button>

        <button
          type="button"
          onClick={() => setIsMobileDrawerOpen(true)}
          aria-label="Open full navigation menu"
          className="flex flex-col items-center justify-center py-1 rounded-lg text-[10px] font-semibold text-[#5a413c] hover:text-[#1c1c19] transition-colors"
        >
          <span className="material-symbols-outlined text-[20px]">menu_open</span>
          <span>More</span>
        </button>
      </nav>
    </div>
  );
};
