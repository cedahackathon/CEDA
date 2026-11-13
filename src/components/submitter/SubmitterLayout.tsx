/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { auth } from '../../config/firebase';
import {
  SUBMITTER_NAV_ITEMS,
  SubmitterNavItem,
} from '../../data/submitterMock';
import {
  fetchSubmitterIdeas,
  fetchSubmitterNotifications,
  formatDateTimeCAT,
  SubmitterNotification,
} from '../../services/submitterService';

interface SubmitterLayoutProps {
  children: React.ReactNode;
  ideasCount?: number;
  unreadNotificationsCount?: number;
  notifications?: SubmitterNotification[];
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  onBeforeNavigate?: (targetPath: string) => boolean;
}

function getInitials(name?: string): string {
  if (!name) return 'SB';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export const SubmitterLayout: React.FC<SubmitterLayoutProps> = ({
  children,
  ideasCount: propIdeasCount,
  unreadNotificationsCount: propUnreadCount,
  notifications: propNotifications,
  searchQuery: externalSearchQuery,
  onSearchChange,
  onBeforeNavigate,
}) => {
  const { currentUser, currentRoute, setCurrentRoute, language, setLanguage, logout } = useAuth();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [internalSearch, setInternalSearch] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const [fetchedIdeasCount, setFetchedIdeasCount] = useState(0);
  const [fetchedNotifications, setFetchedNotifications] = useState<SubmitterNotification[]>([]);

  const notificationsRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  const activeUid = currentUser?.id || auth?.currentUser?.uid || '';

  useEffect(() => {
    const shouldFetchIdeas = propIdeasCount === undefined;
    const shouldFetchNotifs = propNotifications === undefined && propUnreadCount === undefined;
    if (!activeUid || (!shouldFetchIdeas && !shouldFetchNotifs)) return;

    let cancelled = false;
    (async () => {
      try {
        if (shouldFetchIdeas) {
          const ideas = await fetchSubmitterIdeas(activeUid);
          if (!cancelled) setFetchedIdeasCount(ideas.length);
        }
      } catch {
        // non-blocking for shell badge
      }
      try {
        if (shouldFetchNotifs) {
          const notifs = await fetchSubmitterNotifications(activeUid);
          if (!cancelled) setFetchedNotifications(notifs);
        }
      } catch {
        // non-blocking for shell badge
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeUid, propIdeasCount, propNotifications, propUnreadCount]);

  const effectiveIdeasCount = propIdeasCount !== undefined ? propIdeasCount : fetchedIdeasCount;
  const effectiveNotifications =
    propNotifications !== undefined ? propNotifications : fetchedNotifications;
  const effectiveUnreadCount =
    propUnreadCount !== undefined
      ? propUnreadCount
      : effectiveNotifications.filter((n) => !n.read).length;

  const searchValue = externalSearchQuery !== undefined ? externalSearchQuery : internalSearch;
  const handleSearchInput = (val: string) => {
    if (onSearchChange) {
      onSearchChange(val);
    } else {
      setInternalSearch(val);
    }
  };

  const cleanPath = currentRoute.split('?')[0];
  const displayName = useMemo(() => {
    if (currentUser?.fullName?.trim()) return currentUser.fullName.trim();
    const combined = [currentUser?.firstName, currentUser?.surname].filter(Boolean).join(' ').trim();
    if (combined) return combined;
    if (currentUser?.displayName?.trim()) return currentUser.displayName.trim();
    return 'Submitter';
  }, [currentUser]);

  const displayEmail = currentUser?.email || '';
  const initials = getInitials(displayName);

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
    if (onBeforeNavigate && !onBeforeNavigate(path)) {
      return;
    }
    setCurrentRoute(path);
    setIsMobileDrawerOpen(false);
    setIsNotificationsOpen(false);
    setIsUserMenuOpen(false);
    setIsSearchFocused(false);
  };

  const isNavItemActive = (item: SubmitterNavItem) => {
    if (item.path === '/dashboard') {
      return cleanPath === '/dashboard' || cleanPath === '/dashboard/submitter';
    }
    if (item.path === '/submit') {
      return cleanPath === '/submit' || cleanPath.startsWith('/submit/');
    }
    if (item.path === '/submissions') {
      return cleanPath === '/submissions' || cleanPath.startsWith('/submissions/');
    }
    return cleanPath === item.path;
  };

  const getBadgeCountForItem = (itemId: string): number => {
    if (itemId === 'submissions') return effectiveIdeasCount;
    if (itemId === 'notifications') return effectiveUnreadCount;
    return 0;
  };

  const filteredQuickJump = searchValue.trim()
    ? SUBMITTER_NAV_ITEMS.filter(
        (item) =>
          item.label.toLowerCase().includes(searchValue.toLowerCase()) ||
          item.labelSetswana.toLowerCase().includes(searchValue.toLowerCase())
      )
    : [];

  return (
    <div className="min-h-screen bg-[#fdf9f4] text-[#1c1c19] flex flex-col font-sans">
      {/* Desktop Fixed Full-Height Collapsible Sidebar (264px expanded / 72px collapsed) */}
      <aside
        aria-label="Submitter navigation"
        className={`hidden lg:flex lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 h-screen flex-col bg-[#fbf7f1] text-[#38231d] border-r border-[#e2bfb8]/70 transition-[width] duration-200 ease-in-out select-none ${
          isCollapsed ? 'lg:w-[72px]' : 'lg:w-[264px]'
        }`}
      >
        {/* Sidebar Header */}
        <div
          className={`h-16 flex items-center border-b border-[#e2bfb8]/50 shrink-0 ${
            isCollapsed ? 'justify-between px-2' : 'justify-between px-4'
          }`}
        >
          <button
            type="button"
            onClick={() => navigateTo('/dashboard')}
            className="flex items-center gap-2.5 text-left rounded-lg p-1 hover:bg-[#f1ede8] transition-colors focus-visible:outline-2 focus-visible:outline-[#a02010]"
            aria-label="CEDA Innovation Portal Submitter Home"
            title="CEDA Innovation Portal"
          >
            <img
              src="/assets/ceda-logo.png"
              alt="CEDA"
              className="w-7 h-7 object-contain rounded bg-white p-0.5 border border-[#e2bfb8]/60 shrink-0"
            />
            {!isCollapsed && (
              <div className="flex flex-col leading-tight">
                <span className="font-headline text-sm font-extrabold tracking-wide text-[#7c0700]">
                  CEDA
                </span>
                <span className="text-[10px] tracking-[0.14em] uppercase text-[#5a413c] font-semibold">
                  INNOVATION
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
            className="w-7 h-7 rounded-md flex items-center justify-center text-[#5a413c] hover:text-[#1c1c19] hover:bg-[#f1ede8] transition-colors shrink-0"
          >
            <span className="material-symbols-outlined text-[18px]">
              {isCollapsed ? 'chevron_right' : 'chevron_left'}
            </span>
          </button>
        </div>

        {/* Sidebar User Block (initials avatar, name, role "Submitter" — NO Omang) */}
        <div className={`pt-3 pb-2 shrink-0 ${isCollapsed ? 'px-2' : 'px-3'}`}>
          <div className="relative group">
            <button
              type="button"
              onClick={() => navigateTo('/profile')}
              aria-label={`${displayName} — Submitter`}
              className={`w-full flex items-center rounded-xl bg-white border border-[#e2bfb8]/70 hover:border-[#a02010]/40 shadow-2xs transition-colors ${
                isCollapsed ? 'justify-center p-1.5' : 'gap-2.5 p-2.5 text-left'
              }`}
            >
              <span
                aria-hidden="true"
                className="w-9 h-9 rounded-full bg-[#a02010] text-white font-bold text-xs flex items-center justify-center shrink-0 tracking-wide"
              >
                {initials}
              </span>
              {!isCollapsed && (
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold text-[#1c1c19] truncate">
                    {displayName}
                  </span>
                  <span className="text-[11px] font-medium text-[#6b4f47] truncate">
                    Submitter
                  </span>
                </div>
              )}
            </button>

            {isCollapsed && (
              <div
                role="tooltip"
                className="pointer-events-none opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-150 absolute left-full top-1/2 -translate-y-1/2 ml-2.5 z-50 px-2.5 py-1.5 rounded-md bg-[#1c1c19] text-white text-xs font-medium whitespace-nowrap shadow-xl border border-white/15"
              >
                {displayName} — Submitter
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Navigation Items */}
        <nav
          aria-label="Submitter sections"
          className={`flex-1 py-2 overflow-y-auto flex flex-col gap-1 ${
            isCollapsed ? 'px-2 overflow-visible' : 'px-3'
          }`}
        >
          {SUBMITTER_NAV_ITEMS.map((item) => {
            const active = isNavItemActive(item);
            const label = language === 'Setswana' ? item.labelSetswana : item.label;
            const badgeCount = getBadgeCountForItem(item.id);

            return (
              <div key={item.id} className="relative group">
                <button
                  type="button"
                  onClick={() => navigateTo(item.path)}
                  aria-current={active ? 'page' : undefined}
                  aria-label={label}
                  className={`w-full flex items-center rounded-xl text-[13px] transition-colors ${
                    isCollapsed
                      ? 'justify-center h-11 px-0'
                      : 'justify-between gap-2.5 px-3 py-2.5 text-left'
                  } ${
                    active
                      ? 'bg-[#a02010] text-white font-semibold shadow-xs'
                      : 'text-[#38231d] hover:bg-[#f1ede8] font-medium'
                  }`}
                >
                  <span className="flex items-center gap-3 min-w-0">
                    <span className="material-symbols-outlined text-[20px] shrink-0">
                      {item.icon}
                    </span>
                    {!isCollapsed && <span className="truncate">{label}</span>}
                  </span>

                  {!isCollapsed && badgeCount > 0 && (
                    <span
                      className={`px-1.5 py-0.5 min-w-[20px] text-center rounded-full text-[11px] font-bold tabular-nums shrink-0 ${
                        active
                          ? 'bg-white/20 text-white'
                          : item.id === 'notifications'
                          ? 'bg-[#a02010] text-white'
                          : 'bg-[#f1ede8] text-[#38231d]'
                      }`}
                    >
                      {badgeCount}
                    </span>
                  )}

                  {isCollapsed && badgeCount > 0 && (
                    <span
                      aria-hidden="true"
                      className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#a02010] ring-2 ring-[#fbf7f1]"
                    />
                  )}
                </button>

                {isCollapsed && (
                  <div
                    role="tooltip"
                    className="pointer-events-none opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-150 absolute left-full top-1/2 -translate-y-1/2 ml-2.5 z-50 px-2.5 py-1.5 rounded-md bg-[#1c1c19] text-white text-xs font-medium whitespace-nowrap shadow-xl border border-white/15"
                  >
                    {label}
                    {badgeCount > 0 ? ` (${badgeCount})` : ''}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Sidebar Footer: BDPA Notice Card (NO Submit idea button) */}
        {!isCollapsed && (
          <div className="p-3 shrink-0">
            <div className="rounded-xl bg-white border border-[#e2bfb8]/70 p-3.5 shadow-2xs space-y-1.5">
              <div className="flex items-center justify-between gap-2 text-[11px]">
                <span className="font-bold text-[#a02010]">#KaeKapaKae</span>
                <span className="text-[#6b4f47] font-medium">CEDA Portal</span>
              </div>
              <p className="text-xs font-bold text-[#1c1c19]">Finance. Develop. Sustain.</p>
              <p className="text-[11px] text-[#6b4f47] leading-relaxed">
                Statutory portal protected under the Botswana Data Protection Act (BDPA).
              </p>
            </div>
          </div>
        )}
      </aside>

      {/* Mobile Slide-Over Sidebar Drawer (< lg) */}
      {isMobileDrawerOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 flex"
          role="dialog"
          aria-modal="true"
          aria-label="Submitter navigation menu"
        >
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            onClick={() => setIsMobileDrawerOpen(false)}
          />
          <aside className="relative w-[264px] max-w-[85vw] h-full bg-[#fbf7f1] text-[#38231d] flex flex-col shadow-2xl z-10 border-r border-[#e2bfb8]">
            <div className="h-16 px-4 flex items-center justify-between border-b border-[#e2bfb8]/60 shrink-0">
              <div className="flex items-center gap-2.5">
                <img
                  src="/assets/ceda-logo.png"
                  alt="CEDA"
                  className="w-7 h-7 object-contain rounded bg-white p-0.5 border border-[#e2bfb8]/60"
                />
                <div className="flex flex-col leading-tight">
                  <span className="font-headline text-sm font-extrabold text-[#7c0700]">CEDA</span>
                  <span className="text-[10px] tracking-[0.14em] uppercase text-[#5a413c] font-semibold">
                    INNOVATION
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileDrawerOpen(false)}
                aria-label="Close navigation menu"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[#5a413c] hover:text-[#1c1c19] hover:bg-[#f1ede8]"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Mobile User Card (NO Omang) */}
            <div className="px-3 pt-3 pb-2">
              <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white border border-[#e2bfb8]/70">
                <span
                  aria-hidden="true"
                  className="w-9 h-9 rounded-full bg-[#a02010] text-white font-bold text-xs flex items-center justify-center shrink-0"
                >
                  {initials}
                </span>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold text-[#1c1c19] truncate">{displayName}</span>
                  <span className="text-[11px] font-medium text-[#6b4f47] truncate">
                    Submitter
                  </span>
                </div>
              </div>
            </div>

            <nav className="flex-1 overflow-y-auto px-3 py-2 flex flex-col gap-1">
              {SUBMITTER_NAV_ITEMS.map((item) => {
                const active = isNavItemActive(item);
                const label = language === 'Setswana' ? item.labelSetswana : item.label;
                const badgeCount = getBadgeCountForItem(item.id);

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => navigateTo(item.path)}
                    aria-current={active ? 'page' : undefined}
                    className={`w-full flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-xl text-[13px] text-left transition-colors ${
                      active
                        ? 'bg-[#a02010] text-white font-semibold'
                        : 'text-[#38231d] hover:bg-[#f1ede8] font-medium'
                    }`}
                  >
                    <span className="flex items-center gap-3 min-w-0">
                      <span className="material-symbols-outlined text-[20px] shrink-0">
                        {item.icon}
                      </span>
                      <span className="truncate">{label}</span>
                    </span>
                    {badgeCount > 0 && (
                      <span
                        className={`px-1.5 py-0.5 min-w-[20px] text-center rounded-full text-[11px] font-bold tabular-nums shrink-0 ${
                          active
                            ? 'bg-white/20 text-white'
                            : item.id === 'notifications'
                            ? 'bg-[#a02010] text-white'
                            : 'bg-[#f1ede8] text-[#38231d]'
                        }`}
                      >
                        {badgeCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            <div className="p-3 border-t border-[#e2bfb8]/60">
              <div className="rounded-xl bg-white border border-[#e2bfb8]/70 p-3 space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-[#a02010]">#KaeKapaKae</span>
                  <span className="text-[#6b4f47]">CEDA Portal</span>
                </div>
                <p className="text-xs font-bold text-[#1c1c19]">Finance. Develop. Sustain.</p>
                <p className="text-[11px] text-[#6b4f47] leading-relaxed">
                  Statutory portal protected under the Botswana Data Protection Act (BDPA).
                </p>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Main Column */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-[padding] duration-200 ease-in-out ${
          isCollapsed ? 'lg:pl-[72px]' : 'lg:pl-[264px]'
        }`}
      >
        {/* Top Utility Bar (NO Submit idea button, NO broken logo, NO "Citizen Innovator" label) */}
        <header className="sticky top-0 z-30 h-14 sm:h-16 bg-white/95 backdrop-blur-md border-b border-[#e2bfb8]/60 px-3 sm:px-4 lg:px-6 flex items-center justify-between gap-2 sm:gap-3">
          {/* Left: Mobile Menu + CEDA mark OR Desktop Search */}
          <div className="flex items-center gap-2 sm:gap-2.5 flex-1 min-w-0">
            <button
              type="button"
              onClick={() => setIsMobileDrawerOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden inline-flex items-center justify-center w-9 h-9 rounded-lg text-[#5a413c] hover:bg-[#f1ede8] transition-colors shrink-0"
            >
              <span className="material-symbols-outlined text-[22px]">menu</span>
            </button>

            <button
              type="button"
              onClick={() => navigateTo('/dashboard')}
              className="lg:hidden flex items-center gap-1.5 sm:gap-2 min-w-0"
            >
              <img
                src="/assets/ceda-logo.png"
                alt="CEDA"
                className="h-6 sm:h-7 w-auto object-contain shrink-0"
              />
              <span className="font-headline text-sm font-bold text-[#1c1c19] truncate">
                CEDA
              </span>
            </button>

            {/* Desktop Search */}
            <div ref={searchRef} className="hidden lg:block relative w-full max-w-[440px]">
              <label htmlFor="submitter-global-search" className="sr-only">
                Search submissions, reference ID or status
              </label>
              <span className="material-symbols-outlined text-[18px] text-[#77574e] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                search
              </span>
              <input
                id="submitter-global-search"
                type="search"
                value={searchValue}
                onFocus={() => setIsSearchFocused(true)}
                onChange={(e) => handleSearchInput(e.target.value)}
                placeholder="Search submissions, reference ID or status..."
                className="w-full h-10 pl-10 pr-4 rounded-lg bg-[#fdf9f4] focus:bg-white border border-[#e2bfb8]/70 focus:border-[#a02010] text-xs font-medium text-[#1c1c19] placeholder:text-[#77574e] transition-colors"
              />

              {isSearchFocused && filteredQuickJump.length > 0 && (
                <div className="absolute left-0 right-0 mt-1.5 bg-white rounded-xl shadow-xl border border-[#e2bfb8] py-1.5 z-50">
                  <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#77574e]">
                    Portal Sections
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

          {/* Right: EN | Setswana, Bell with real unread count, Avatar Menu */}
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

            {/* Notification Bell with real unread count (hidden when 0) */}
            <div ref={notificationsRef} className="relative shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsUserMenuOpen(false);
                  setIsNotificationsOpen((prev) => !prev);
                }}
                aria-label={
                  effectiveUnreadCount > 0
                    ? `Notifications (${effectiveUnreadCount} unread)`
                    : 'Notifications'
                }
                aria-expanded={isNotificationsOpen}
                className="relative w-9 h-9 rounded-lg flex items-center justify-center text-[#5a413c] hover:text-[#1c1c19] hover:bg-[#f1ede8] active:bg-[#e8e1d9] transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">notifications</span>
                {effectiveUnreadCount > 0 && (
                  <span
                    aria-hidden="true"
                    className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#a02010] text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white tabular-nums"
                  >
                    {effectiveUnreadCount > 99 ? '99+' : effectiveUnreadCount}
                  </span>
                )}
              </button>

              {isNotificationsOpen && (
                <div
                  role="region"
                  aria-label="Submitter notifications"
                  className="fixed inset-x-3 top-16 sm:inset-x-auto sm:top-auto sm:absolute sm:right-0 sm:mt-2 sm:w-80 bg-white rounded-xl shadow-xl border border-[#e2bfb8] py-2 z-50 max-h-[70vh] overflow-y-auto"
                >
                  <div className="px-4 py-2 border-b border-[#f1ede8] flex items-center justify-between">
                    <span className="text-xs font-bold text-[#1c1c19]">Notifications</span>
                    {effectiveUnreadCount > 0 && (
                      <span className="text-[11px] font-semibold text-[#a02010] tabular-nums">
                        {effectiveUnreadCount} unread
                      </span>
                    )}
                  </div>

                  {effectiveNotifications.length === 0 ? (
                    <div className="px-4 py-5 text-xs text-[#6b4f47] text-center">
                      No notifications yet. Updates on your submissions will appear here.
                    </div>
                  ) : (
                    <>
                      <div className="divide-y divide-[#f1ede8]">
                        {effectiveNotifications.slice(0, 4).map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => navigateTo(item.route || '/notifications')}
                            className="w-full px-4 py-2.5 text-left hover:bg-[#fdf9f4] flex items-start gap-2.5 transition-colors"
                          >
                            <span
                              className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                                item.read ? 'bg-[#e2bfb8]' : 'bg-[#a02010]'
                              }`}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-[#1c1c19] truncate">
                                {item.title}
                              </p>
                              <p className="text-[11px] text-[#5a413c] line-clamp-2 mt-0.5">
                                {item.message}
                              </p>
                              <span className="text-[10px] text-[#77574e] mt-1 inline-block">
                                {formatDateTimeCAT(item.createdAt)}
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                      <div className="border-t border-[#f1ede8] pt-1.5 px-3">
                        <button
                          type="button"
                          onClick={() => navigateTo('/notifications')}
                          className="w-full py-1.5 text-center text-xs font-semibold text-[#a02010] hover:text-[#7c0700]"
                        >
                          View all →
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Avatar Menu (initials avatar + user name, NO broken logo image, NO "Citizen Innovator" label) */}
            <div ref={userMenuRef} className="relative shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsNotificationsOpen(false);
                  setIsUserMenuOpen((prev) => !prev);
                }}
                aria-expanded={isUserMenuOpen}
                aria-label={`${displayName} account menu`}
                className="flex items-center gap-2 p-1 pr-1.5 rounded-full hover:bg-[#f1ede8] active:bg-[#e8e1d9] transition-colors"
              >
                <span className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#a02010] text-white font-bold text-xs flex items-center justify-center shadow-xs tracking-wide">
                  {initials}
                </span>
                <span className="hidden sm:inline text-xs font-bold text-[#1c1c19] max-w-[140px] truncate">
                  {displayName}
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
                    <span className="inline-block mt-1.5 px-2 py-0.5 text-[10px] font-bold rounded bg-[#f7f3ee] text-[#7c0700] uppercase tracking-wider border border-[#e2bfb8]/60">
                      Submitter
                    </span>
                  </div>

                  <div className="py-1">
                    <button
                      type="button"
                      onClick={() => navigateTo('/dashboard')}
                      className="w-full px-4 py-2.5 sm:py-2 text-left text-xs font-medium text-[#1c1c19] hover:bg-[#fdf9f4] flex items-center gap-2.5"
                    >
                      <span className="material-symbols-outlined text-[17px] text-[#a02010]">
                        grid_view
                      </span>
                      <span>Dashboard</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => navigateTo('/submissions')}
                      className="w-full px-4 py-2.5 sm:py-2 text-left text-xs font-medium text-[#1c1c19] hover:bg-[#fdf9f4] flex items-center gap-2.5"
                    >
                      <span className="material-symbols-outlined text-[17px] text-[#5a413c]">
                        folder_open
                      </span>
                      <span>My submissions</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => navigateTo('/profile')}
                      className="w-full px-4 py-2.5 sm:py-2 text-left text-xs font-medium text-[#1c1c19] hover:bg-[#fdf9f4] flex items-center gap-2.5"
                    >
                      <span className="material-symbols-outlined text-[17px] text-[#5a413c]">
                        shield
                      </span>
                      <span>Profile & security</span>
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
            <label htmlFor="submitter-mobile-search" className="sr-only">
              Search submissions, reference ID or status
            </label>
            <span className="material-symbols-outlined text-[18px] text-[#77574e] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
              search
            </span>
            <input
              id="submitter-mobile-search"
              type="search"
              value={searchValue}
              onChange={(e) => handleSearchInput(e.target.value)}
              placeholder="Search submissions, reference ID or status..."
              className="w-full h-10 pl-9 pr-3 rounded-lg bg-white border border-[#e2bfb8]/70 focus:border-[#a02010] text-xs font-medium text-[#1c1c19] placeholder:text-[#77574e]"
            />
          </div>
        </div>

        {/* Page Body */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-5 sm:py-6 pb-24 lg:pb-10 max-w-[1440px] w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (< lg) */}
      <nav
        aria-label="Mobile submitter quick navigation"
        className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-[#e2bfb8]/80 px-2 py-1.5 grid grid-cols-5 gap-1 shadow-[0_-2px_10px_rgba(62,42,37,0.06)]"
      >
        <button
          type="button"
          onClick={() => navigateTo('/dashboard')}
          aria-current={cleanPath === '/dashboard' || cleanPath === '/dashboard/submitter' ? 'page' : undefined}
          className={`flex flex-col items-center justify-center py-1 rounded-lg text-[10px] font-semibold transition-colors ${
            cleanPath === '/dashboard' || cleanPath === '/dashboard/submitter'
              ? 'text-[#a02010]'
              : 'text-[#5a413c] hover:text-[#1c1c19]'
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">grid_view</span>
          <span>Dashboard</span>
        </button>

        <button
          type="button"
          onClick={() => navigateTo('/submit/applicant')}
          aria-current={cleanPath === '/submit' || cleanPath.startsWith('/submit/') ? 'page' : undefined}
          className={`flex flex-col items-center justify-center py-1 rounded-lg text-[10px] font-semibold transition-colors ${
            cleanPath === '/submit' || cleanPath.startsWith('/submit/')
              ? 'text-[#a02010]'
              : 'text-[#5a413c] hover:text-[#1c1c19]'
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">lightbulb</span>
          <span>Submit</span>
        </button>

        <button
          type="button"
          onClick={() => navigateTo('/submissions')}
          aria-current={cleanPath === '/submissions' || cleanPath.startsWith('/submissions/') ? 'page' : undefined}
          className={`relative flex flex-col items-center justify-center py-1 rounded-lg text-[10px] font-semibold transition-colors ${
            cleanPath === '/submissions' || cleanPath.startsWith('/submissions/')
              ? 'text-[#a02010]'
              : 'text-[#5a413c] hover:text-[#1c1c19]'
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">folder_open</span>
          <span>Ideas</span>
          {effectiveIdeasCount > 0 && (
            <span className="absolute top-0.5 right-3 min-w-[15px] h-[15px] px-1 rounded-full bg-[#38231d] text-white text-[9px] font-bold flex items-center justify-center tabular-nums">
              {effectiveIdeasCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => navigateTo('/notifications')}
          aria-current={cleanPath === '/notifications' ? 'page' : undefined}
          className={`relative flex flex-col items-center justify-center py-1 rounded-lg text-[10px] font-semibold transition-colors ${
            cleanPath === '/notifications' ? 'text-[#a02010]' : 'text-[#5a413c] hover:text-[#1c1c19]'
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">notifications</span>
          <span>Alerts</span>
          {effectiveUnreadCount > 0 && (
            <span className="absolute top-0.5 right-3 min-w-[15px] h-[15px] px-1 rounded-full bg-[#a02010] text-white text-[9px] font-bold flex items-center justify-center tabular-nums">
              {effectiveUnreadCount}
            </span>
          )}
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
