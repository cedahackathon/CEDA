/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { UserProfile, UserRole } from '../types/auth';
import { authService } from '../services/authService';
import { getLandingRouteForRole } from '../config/roles';

export type SupportedLanguage = 'EN' | 'Setswana';

interface AuthContextType {
  currentUser: UserProfile | null;
  isAuthenticated: boolean;
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  currentRoute: string;
  setCurrentRoute: (route: string) => void;
  loginAs: (user: UserProfile) => void;
  logout: () => void;
  switchRole: (role: UserRole) => void;
  sessionExpired: boolean;
  setSessionExpired: (expired: boolean) => void;
  // Idle warning modal states
  isIdleWarningOpen: boolean;
  idleCountdownSeconds: number;
  extendSession: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 15 minutes = 900 seconds. Warning triggers at 14 minutes (60s remaining).
const IDLE_TIMEOUT_SECONDS = 15 * 60;
const WARNING_THRESHOLD_SECONDS = 60;

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    const sessionUser = authService.getCurrentSessionUser();
    if (sessionUser) {
      return sessionUser;
    }
    const curId = authService.getCurrentSessionId();
    if (curId) {
      const seeds = authService.getSeedAccounts();
      return seeds[0]?.user ?? null;
    }
    return null;
  });

  const [language, setLanguage] = useState<SupportedLanguage>('EN');
  const [currentRoute, setCurrentRoute] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return window.location.pathname + window.location.search || '/';
    }
    return '/';
  });
  const [sessionExpired, setSessionExpired] = useState<boolean>(false);

  // Idle timeout tracking
  const [idleSeconds, setIdleSeconds] = useState<number>(0);
  const [isIdleWarningOpen, setIsIdleWarningOpen] = useState<boolean>(false);
  const [idleCountdownSeconds, setIdleCountdownSeconds] = useState<number>(WARNING_THRESHOLD_SECONDS);

  const logout = useCallback(() => {
    authService.logout();
    setCurrentUser(null);
    setIsIdleWarningOpen(false);
    setIdleSeconds(0);
    setCurrentRoute('/login');
  }, []);

  const extendSession = useCallback(() => {
    authService.touchSession();
    setIdleSeconds(0);
    setIsIdleWarningOpen(false);
    setIdleCountdownSeconds(WARNING_THRESHOLD_SECONDS);
  }, []);

  const loginAs = useCallback((user: UserProfile) => {
    setCurrentUser(user);
    setSessionExpired(false);
    setIdleSeconds(0);
    setIsIdleWarningOpen(false);
    const destination = getLandingRouteForRole(user.role);
    setCurrentRoute(destination);
  }, []);

  const switchRole = useCallback((role: UserRole) => {
    const res = authService.demoSwitchRole(role);
    setCurrentUser(res.user);
    setSessionExpired(false);
    setIdleSeconds(0);
    setIsIdleWarningOpen(false);
    setCurrentRoute(res.landingRoute);
  }, []);

  // Activity listeners to reset idle timer when NOT in warning mode
  useEffect(() => {
    if (!currentUser) return;

    const handleActivity = () => {
      if (!isIdleWarningOpen) {
        setIdleSeconds(0);
        authService.touchSession();
      }
    };

    window.addEventListener('mousemove', handleActivity, { passive: true });
    window.addEventListener('keydown', handleActivity, { passive: true });
    window.addEventListener('click', handleActivity, { passive: true });
    window.addEventListener('scroll', handleActivity, { passive: true });

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('scroll', handleActivity);
    };
  }, [currentUser, isIdleWarningOpen]);

  // Idle tick every second
  useEffect(() => {
    if (!currentUser) return;

    const timer = setInterval(() => {
      setIdleSeconds((prev) => {
        const next = prev + 1;
        const remaining = IDLE_TIMEOUT_SECONDS - next;

        if (remaining <= WARNING_THRESHOLD_SECONDS && remaining > 0) {
          setIsIdleWarningOpen(true);
          setIdleCountdownSeconds(remaining);
        } else if (remaining <= 0) {
          // Time expired! Log out user
          clearInterval(timer);
          authService.logout();
          setCurrentUser(null);
          setIsIdleWarningOpen(false);
          setSessionExpired(true);
          setCurrentRoute('/login?reason=idle_timeout');
          return 0;
        }

        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [currentUser]);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated: Boolean(currentUser && currentUser.status === 'ACTIVE'),
        language,
        setLanguage,
        currentRoute,
        setCurrentRoute,
        loginAs,
        logout,
        switchRole,
        sessionExpired,
        setSessionExpired,
        isIdleWarningOpen,
        idleCountdownSeconds,
        extendSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
