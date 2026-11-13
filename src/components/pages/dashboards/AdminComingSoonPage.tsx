/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useAuth } from '../../../context/AuthContext';
import { AdminLayout } from '../../admin/AdminLayout';
import { ADMIN_NAV_ITEMS, AdminRoutePath } from '../../../data/adminConfig';

interface AdminComingSoonPageProps {
  routePath: AdminRoutePath;
}

export const AdminComingSoonPage: React.FC<AdminComingSoonPageProps> = ({ routePath }) => {
  const { setCurrentRoute, language } = useAuth();
  const navItem = ADMIN_NAV_ITEMS.find((item) => item.path === routePath) || ADMIN_NAV_ITEMS[1];
  const title = language === 'Setswana' ? navItem.labelSetswana : navItem.label;

  return (
    <AdminLayout>
      <div className="flex flex-col gap-5">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-[#6b4f47]">
          <button
            type="button"
            onClick={() => setCurrentRoute('/')}
            className="hover:text-[#a02010] transition-colors"
          >
            Home
          </button>
          <span aria-hidden="true">/</span>
          <button
            type="button"
            onClick={() => setCurrentRoute('/admin')}
            className="hover:text-[#a02010] transition-colors"
          >
            Administration
          </button>
          <span aria-hidden="true">/</span>
          <span className="font-semibold text-[#1c1c19]">{title}</span>
        </nav>

        {/* Page Title */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="font-headline text-2xl font-bold text-[#38231d] tracking-tight">
              {title}
            </h1>
            <p className="text-xs sm:text-sm text-[#6b4f47] mt-1">{navItem.description}</p>
          </div>
          <button
            type="button"
            onClick={() => setCurrentRoute('/admin')}
            className="inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-lg border border-[#e2bfb8] bg-white hover:bg-[#f7f3ee] text-xs font-semibold text-[#38231d] transition-colors shrink-0 self-start sm:self-auto"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            <span>Back to Dashboard</span>
          </button>
        </div>

        {/* Coming Soon Card */}
        <section
          aria-labelledby="coming-soon-heading"
          className="bg-white rounded-xl border border-[#e2bfb8]/80 shadow-xs p-8 sm:p-12 flex flex-col items-center text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-[#fdf9f4] border border-[#e2bfb8]/70 text-[#a02010] flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-[32px]">{navItem.icon}</span>
          </div>
          <span className="text-[11px] font-bold uppercase tracking-widest text-[#a02010] mb-1.5">
            Administrator Workspace
          </span>
          <h2
            id="coming-soon-heading"
            className="font-headline text-xl font-bold text-[#1c1c19] mb-2"
          >
            Coming soon
          </h2>
          <p className="text-sm text-[#5a413c] max-w-md mb-6 leading-relaxed">
            The <strong>{navItem.label}</strong> module is scheduled for the next CEDA Innovation
            Portal release. Administrative overview metrics remain live on the main dashboard.
          </p>
          <button
            type="button"
            onClick={() => setCurrentRoute('/admin')}
            className="inline-flex items-center justify-center gap-2 h-10 px-5 rounded-lg bg-[#a02010] hover:bg-[#7c0700] text-white text-xs font-semibold transition-colors shadow-xs"
          >
            <span className="material-symbols-outlined text-[16px]">grid_view</span>
            <span>Return to Administration Overview</span>
          </button>
        </section>
      </div>
    </AdminLayout>
  );
};
