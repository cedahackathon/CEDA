/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ChatProvider } from './context/ChatContext';
import { Header } from './components/common/Header';
import { Footer } from './components/common/Footer';
import { IdleTimeoutModal } from './components/common/IdleTimeoutModal';
import { RouteGuard } from './components/common/RouteGuard';
import { seedFirestoreCollections } from './services/seedFirestore';
import { ChatWidget } from './components/ChatWidget';

// Pages
import { LandingPage } from './components/pages/LandingPage';
import { RegisterPage } from './components/pages/RegisterPage';
import { OtpVerificationPage } from './components/pages/OtpVerificationPage';
import { LoginPage } from './components/pages/LoginPage';
import { ForgotPasswordPage } from './components/pages/ForgotPasswordPage';
import { ResetPasswordPage } from './components/pages/ResetPasswordPage';
import { AuthActionPage } from './components/pages/AuthActionPage';
import { SessionsPage } from './components/pages/SessionsPage';
import { ForbiddenPage } from './components/pages/ForbiddenPage';
import { NotFoundPage } from './components/pages/NotFoundPage';
import { GuidelinesPage, FaqsPage, HelpCenterPage } from './components/pages/InfoPages';
import { LegalPage } from './components/pages/LegalPage';

// Role Dashboards
import { SubmitterDashboard } from './components/pages/dashboards/SubmitterDashboard';
import { MySubmissionsPage } from './components/pages/dashboards/MySubmissionsPage';
import { SubmitterComingSoonPage } from './components/pages/dashboards/SubmitterComingSoonPage';
import { SubmitConfirmationPage } from './components/pages/submit/SubmitConfirmationPage';
import { SubmitIdeaWizard } from './components/pages/submit/SubmitIdeaWizard';
import { SubmitterLayout } from './components/submitter/SubmitterLayout';
import { EvaluatorDashboard } from './components/pages/dashboards/EvaluatorDashboard';
import { AdjudicatorDashboard } from './components/pages/dashboards/AdjudicatorDashboard';
import { AdminDashboard } from './components/pages/dashboards/AdminDashboard';
import { AdminUsersPage } from './components/pages/dashboards/AdminUsersPage';
import { AdminComingSoonPage } from './components/pages/dashboards/AdminComingSoonPage';
import { StakeholderView } from './components/pages/dashboards/StakeholderView';
import { AdminChatSettingsPage } from './components/pages/dashboards/AdminChatSettingsPage';
import { ADMIN_NAV_ITEMS, AdminRoutePath } from './data/adminConfig';

const ADMIN_COMING_SOON_PATHS = new Set<string>(
  ADMIN_NAV_ITEMS.filter(
    (item) =>
      item.path !== '/admin' &&
      item.path !== '/admin/users' &&
      item.path !== '/admin/settings/chat'
  ).map((item) => item.path)
);

const WIZARD_PATHS = new Set<string>([
  '/submit',
  '/submit/applicant',
  '/submit/idea',
  '/submit/documents',
  '/submit/review',
]);

const SUBMITTER_COMING_SOON_PATHS = new Set<string>([
  '/notifications',
  '/profile',
]);

const AppContent: React.FC = () => {
  const { currentRoute, setCurrentRoute, currentUser, isAuthenticated } = useAuth();

  // Handle browser back/forward buttons & seed Firestore on mount
  useEffect(() => {
    seedFirestoreCollections().catch(() => {
      // ignore offline errors
    });

    const handlePopState = () => {
      const path = window.location.pathname + window.location.search;
      setCurrentRoute(path);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [setCurrentRoute]);

  const cleanPath = currentRoute.split('?')[0];
  const resetRedirectTarget = (() => {
    if (cleanPath !== '/reset-password') return null;
    const queryString = currentRoute.includes('?') ? currentRoute.split('?')[1] : '';
    const params = new URLSearchParams(queryString);
    const oobCode = params.get('oobCode');
    if (!oobCode) return null;
    const nextParams = new URLSearchParams();
    nextParams.set('mode', params.get('mode') || 'resetPassword');
    nextParams.set('oobCode', oobCode);
    const lang = params.get('lang');
    if (lang) nextParams.set('lang', lang);
    return `/auth/action?${nextParams.toString()}`;
  })();

  // Sync window.location when currentRoute changes (and redirect /reset-password?oobCode=...)
  useEffect(() => {
    if (resetRedirectTarget) {
      window.history.replaceState(null, '', resetRedirectTarget);
      setCurrentRoute(resetRedirectTarget);
      return;
    }
    if (window.location.pathname + window.location.search !== currentRoute) {
      window.history.pushState(null, '', currentRoute);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentRoute, resetRedirectTarget, setCurrentRoute]);
  const isAdminRoute =
    cleanPath === '/admin' ||
    cleanPath.startsWith('/admin/') ||
    cleanPath === '/dashboard/admin';
  const showAdminShell = Boolean(isAdminRoute && isAuthenticated && currentUser?.role === 'ADMIN');

  const isWizardRoute = WIZARD_PATHS.has(cleanPath);
  const isWizardConfirmationRoute =
    cleanPath.startsWith('/submit/confirmation/') &&
    cleanPath.length > '/submit/confirmation/'.length;
  const isSubmitterRoute =
    cleanPath === '/dashboard' ||
    cleanPath === '/dashboard/submitter' ||
    cleanPath === '/submissions' ||
    SUBMITTER_COMING_SOON_PATHS.has(cleanPath) ||
    cleanPath.startsWith('/submissions/') ||
    (cleanPath === '/help-center' && currentUser?.role === 'SUBMITTER');
  const showSubmitterShell = Boolean(
    isAuthenticated &&
      (((isWizardRoute || isWizardConfirmationRoute) && currentUser?.role === 'SUBMITTER') ||
        (isSubmitterRoute &&
          (currentUser?.role === 'SUBMITTER' || currentUser?.role === 'ADMIN')))
  );
  const hidePublicChrome = showAdminShell || showSubmitterShell;

  const renderCurrentPage = () => {
    if (cleanPath === '/admin/settings/chat') {
      return (
        <RouteGuard allowedRoles={['ADMIN']}>
          <AdminChatSettingsPage />
        </RouteGuard>
      );
    }

    if (ADMIN_COMING_SOON_PATHS.has(cleanPath)) {
      return (
        <RouteGuard allowedRoles={['ADMIN']}>
          <AdminComingSoonPage routePath={cleanPath as AdminRoutePath} />
        </RouteGuard>
      );
    }

    if (isWizardConfirmationRoute) {
      return (
        <RouteGuard allowedRoles={['SUBMITTER']}>
          <SubmitConfirmationPage routePath={cleanPath} />
        </RouteGuard>
      );
    }

    if (WIZARD_PATHS.has(cleanPath)) {
      return (
        <RouteGuard allowedRoles={['SUBMITTER']}>
          <SubmitIdeaWizard routePath={currentRoute} />
        </RouteGuard>
      );
    }

    if (
      SUBMITTER_COMING_SOON_PATHS.has(cleanPath) ||
      cleanPath.startsWith('/submissions/')
    ) {
      return (
        <RouteGuard allowedRoles={['SUBMITTER', 'ADMIN']}>
          <SubmitterComingSoonPage routePath={cleanPath} />
        </RouteGuard>
      );
    }

    switch (cleanPath) {
      case '/':
      case '':
        return <LandingPage />;

      case '/register':
        return <RegisterPage />;

      case '/otp-verification':
      case '/verify-otp':
        return <OtpVerificationPage />;

      case '/login':
        return <LoginPage />;

      case '/forgot-password':
        return <ForgotPasswordPage />;

      case '/reset-password':
        if (resetRedirectTarget) {
          return null;
        }
        return <ResetPasswordPage />;

      case '/auth/action':
        return <AuthActionPage />;

      case '/sessions':
        return (
          <RouteGuard>
            <SessionsPage />
          </RouteGuard>
        );

      case '/guidelines':
        return <GuidelinesPage />;

      case '/faqs':
        return <FaqsPage />;

      case '/terms':
      case '/terms-of-service':
        return <LegalPage doc="terms" />;

      case '/privacy':
      case '/privacy-notice':
        return <LegalPage doc="privacy" />;

      case '/help-center':
        if (isAuthenticated && currentUser?.role === 'SUBMITTER') {
          return (
            <SubmitterLayout>
              <HelpCenterPage />
            </SubmitterLayout>
          );
        }
        return <HelpCenterPage />;

      case '/submissions':
        return (
          <RouteGuard allowedRoles={['SUBMITTER', 'ADMIN']}>
            <MySubmissionsPage />
          </RouteGuard>
        );

      case '/dashboard':
      case '/dashboard/submitter':
        return (
          <RouteGuard allowedRoles={['SUBMITTER', 'ADMIN']}>
            <SubmitterDashboard />
          </RouteGuard>
        );

      case '/dashboard/evaluator':
        return (
          <RouteGuard allowedRoles={['EVALUATOR', 'ADMIN']}>
            <EvaluatorDashboard />
          </RouteGuard>
        );

      case '/dashboard/adjudicator':
        return (
          <RouteGuard allowedRoles={['ADJUDICATOR', 'ADMIN']}>
            <AdjudicatorDashboard />
          </RouteGuard>
        );

      case '/admin':
      case '/dashboard/admin':
        return (
          <RouteGuard allowedRoles={['ADMIN']}>
            <AdminDashboard />
          </RouteGuard>
        );

      case '/admin/users':
        return (
          <RouteGuard allowedRoles={['ADMIN']}>
            <AdminUsersPage />
          </RouteGuard>
        );

      case '/dashboard/stakeholder':
        return (
          <RouteGuard allowedRoles={['STAKEHOLDER', 'ADMIN']}>
            <StakeholderView />
          </RouteGuard>
        );

      case '/403':
        return <ForbiddenPage />;

      case '/404':
        return <NotFoundPage />;

      default:
        if (cleanPath.startsWith('/admin/')) {
          return (
            <RouteGuard allowedRoles={['ADMIN']}>
              <NotFoundPage />
            </RouteGuard>
          );
        }
        return <NotFoundPage />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-sans bg-[#fdf9f4] text-[#31302d]">
      {!hidePublicChrome && <Header />}
      {hidePublicChrome ? (
        <div className="flex-1">{renderCurrentPage()}</div>
      ) : (
        <main className="flex-1 pt-20 print:pt-0">{renderCurrentPage()}</main>
      )}
      {!hidePublicChrome && <Footer />}
      <IdleTimeoutModal />
      <ChatWidget />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <ChatProvider>
        <AppContent />
      </ChatProvider>
    </AuthProvider>
  );
}
