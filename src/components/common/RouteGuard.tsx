/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types/auth';

interface RouteGuardProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  requiredCapability?: string;
}

export const RouteGuard: React.FC<RouteGuardProps> = ({
  children,
  allowedRoles,
}) => {
  const { currentUser, isAuthenticated, setCurrentRoute } = useAuth();

  if (!isAuthenticated || !currentUser) {
    // Unauthenticated: redirect to login
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center mb-4 shadow-sm">
          <span className="material-symbols-outlined text-[32px]">lock</span>
        </div>
        <h2 className="font-headline text-2xl font-bold text-[#1c1c19] mb-2">
          Authentication Required
        </h2>
        <p className="text-[#5a413c] max-w-md mb-6 text-sm">
          You must be signed in to access this official CEDA Innovation Portal resource.
        </p>
        <button
          onClick={() => setCurrentRoute('/login')}
          className="h-11 px-6 rounded-lg bg-[#a02010] text-white font-semibold text-sm hover:bg-[#861a0d] shadow-sm transition-all"
        >
          Sign in to your account
        </button>
      </div>
    );
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(currentUser.role)) {
    // Wrong role: redirect to 403 Forbidden page
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-red-100 text-[#ba1a1a] flex items-center justify-center mb-4 shadow-sm ring-4 ring-red-50">
          <span className="material-symbols-outlined text-[32px]">gavel</span>
        </div>
        <span className="text-xs font-bold text-[#a02010] uppercase tracking-wider mb-1">
          Access Restricted (403 Forbidden)
        </span>
        <h2 className="font-headline text-2xl font-bold text-[#1c1c19] mb-2">
          Insufficient Role Privileges
        </h2>
        <p className="text-[#5a413c] max-w-md mb-6 text-sm leading-relaxed">
          Your account role (<strong className="text-[#1c1c19]">{currentUser.role}</strong>) does not have authorization to view this internal workspace. This action has been securely recorded on the parastatal audit log.
        </p>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCurrentRoute('/')}
            className="h-10 px-4 rounded-lg border border-[#8d706b]/40 text-xs font-semibold text-[#5a413c] hover:bg-[#f1ede8]"
          >
            Return to Portal Home
          </button>
          <button
            onClick={() => setCurrentRoute('/403')}
            className="h-10 px-4 rounded-lg bg-[#a02010] text-white text-xs font-semibold hover:bg-[#861a0d]"
          >
            View Full 403 Advisory
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
