/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { AdminLayout } from '../../admin/AdminLayout';
import { LegalUpdateBanner } from '../../common/LegalUpdateBanner';
import {
  ADMIN_QUICK_ACTIONS,
  AdminDashboardData,
  EMPTY_ADMIN_DATA,
  deriveAdminMetrics,
} from '../../../data/adminConfig';
import { fetchAdminDashboardData } from '../../../services/adminDashboardService';

export const AdminDashboard: React.FC = () => {
  const { setCurrentRoute } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [data, setData] = useState<AdminDashboardData>(EMPTY_ADMIN_DATA);
  const [isLoading, setIsLoading] = useState(true);

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    try {
      const liveData = await fetchAdminDashboardData();
      setData(liveData);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const metrics = deriveAdminMetrics(data);

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredActivity = normalizedQuery
    ? data.recentActivity.filter(
        (item) =>
          item.text.toLowerCase().includes(normalizedQuery) ||
          item.timestamp.toLowerCase().includes(normalizedQuery)
      )
    : data.recentActivity;

  const filteredAttention = normalizedQuery
    ? data.attentionItems.filter((item) => item.text.toLowerCase().includes(normalizedQuery))
    : data.attentionItems;

  return (
    <AdminLayout
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      attentionItems={data.attentionItems}
    >
      <div className="flex flex-col gap-5">
        <LegalUpdateBanner />
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
          <span className="font-semibold text-[#1c1c19]">Dashboard</span>
        </nav>

        {/* Page Title & Primary CTA */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="font-headline text-2xl sm:text-[28px] font-bold text-[#38231d] tracking-tight leading-tight">
              Administration overview
            </h1>
            <p className="text-xs sm:text-[13px] text-[#6b4f47] mt-1">
              {isLoading
                ? 'Loading live Firestore programme metrics...'
                : data.systemStatus.lastSyncedAt
                ? `Programme health at a glance. Synced at ${data.systemStatus.lastSyncedAt}.`
                : 'Programme health at a glance.'}
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={loadDashboard}
              disabled={isLoading}
              aria-label="Refresh live metrics"
              title="Refresh live metrics"
              className="inline-flex items-center justify-center w-10 h-10 rounded-lg border border-[#e2bfb8] bg-white hover:bg-[#f7f3ee] text-[#5a413c] transition-colors shrink-0 disabled:opacity-50 cursor-pointer"
            >
              <span
                className={`material-symbols-outlined text-[18px] ${
                  isLoading ? 'animate-spin' : ''
                }`}
              >
                refresh
              </span>
            </button>

            <button
              type="button"
              onClick={() => setCurrentRoute('/admin/content')}
              className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-lg bg-[#a02010] hover:bg-[#7c0700] text-white text-xs sm:text-[13px] font-semibold shadow-xs transition-colors flex-1 sm:flex-initial shrink-0 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              <span>Create announcement</span>
            </button>
          </div>
        </div>

        {/* 4 Stat Cards */}
        <section
          aria-label="Key programme metrics"
          className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4"
        >
          {/* Stat 1: Total submissions */}
          <button
            type="button"
            onClick={() => setCurrentRoute('/admin/workflow')}
            className="text-left bg-white rounded-xl border border-[#e2bfb8]/80 p-4 sm:p-5 shadow-xs hover:border-[#a02010]/50 hover:shadow-sm transition-all flex items-start justify-between gap-2 cursor-pointer group"
          >
            <div className="min-w-0">
              <div className="font-headline text-2xl sm:text-[28px] font-bold text-[#38231d] tabular-nums leading-none">
                {isLoading ? '—' : metrics.totalSubmissions.toLocaleString('en-US')}
              </div>
              <div className="text-xs text-[#6b4f47] font-medium mt-2 group-hover:text-[#1c1c19]">
                Total submissions
              </div>
            </div>
            <div
              aria-hidden="true"
              className="w-9 h-9 rounded-lg bg-[#f1ede8] text-[#5a413c] flex items-center justify-center shrink-0"
            >
              <span className="material-symbols-outlined text-[19px]">folder_open</span>
            </div>
          </button>

          {/* Stat 2: In evaluation */}
          <button
            type="button"
            onClick={() => setCurrentRoute('/admin/evaluator-assignment')}
            className="text-left bg-white rounded-xl border border-[#e2bfb8]/80 p-4 sm:p-5 shadow-xs hover:border-[#a02010]/50 hover:shadow-sm transition-all flex items-start justify-between gap-2 cursor-pointer group"
          >
            <div className="min-w-0">
              <div className="font-headline text-2xl sm:text-[28px] font-bold text-[#38231d] tabular-nums leading-none">
                {isLoading ? '—' : metrics.inEvaluation.toLocaleString('en-US')}
              </div>
              <div className="text-xs text-[#6b4f47] font-medium mt-2 group-hover:text-[#1c1c19]">
                In evaluation
              </div>
            </div>
            <div
              aria-hidden="true"
              className="w-9 h-9 rounded-lg bg-[#f1ede8] text-[#5a413c] flex items-center justify-center shrink-0"
            >
              <span className="material-symbols-outlined text-[19px]">fact_check</span>
            </div>
          </button>

          {/* Stat 3: Overdue reviews */}
          <button
            type="button"
            onClick={() => setCurrentRoute('/admin/workflow')}
            className="text-left bg-white rounded-xl border border-[#e2bfb8]/80 p-4 sm:p-5 shadow-xs hover:border-[#a02010]/50 hover:shadow-sm transition-all flex items-start justify-between gap-2 cursor-pointer group"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span
                  className={`font-headline text-2xl sm:text-[28px] font-bold tabular-nums leading-none ${
                    metrics.overdueReviews > 0 ? 'text-[#a02010]' : 'text-[#1b5e20]'
                  }`}
                >
                  {isLoading ? '—' : metrics.overdueReviews.toLocaleString('en-US')}
                </span>
                {!isLoading && metrics.overdueReviews > 0 && (
                  <span
                    aria-hidden="true"
                    className="w-2 h-2 rounded-full bg-[#a02010] inline-block"
                  />
                )}
              </div>
              <div className="text-xs text-[#6b4f47] font-medium mt-2 group-hover:text-[#1c1c19]">
                Overdue reviews
              </div>
            </div>
            <div
              aria-hidden="true"
              className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                metrics.overdueReviews > 0
                  ? 'bg-[#ffdad6]/60 text-[#a02010]'
                  : 'bg-emerald-50 text-[#1b5e20]'
              }`}
            >
              <span className="material-symbols-outlined text-[19px]">
                {metrics.overdueReviews > 0 ? 'notifications_active' : 'check_circle'}
              </span>
            </div>
          </button>

          {/* Stat 4: Registered users */}
          <button
            type="button"
            onClick={() => setCurrentRoute('/admin/users')}
            aria-label="Registered users — open Users and roles"
            className="text-left bg-white rounded-xl border border-[#e2bfb8]/80 p-4 sm:p-5 shadow-xs hover:border-[#a02010]/50 hover:shadow-sm transition-all flex items-start justify-between gap-2 cursor-pointer group"
          >
            <div className="min-w-0">
              <div className="font-headline text-2xl sm:text-[28px] font-bold text-[#38231d] tabular-nums leading-none">
                {isLoading ? '—' : metrics.registeredUsers.toLocaleString('en-US')}
              </div>
              <div className="text-xs text-[#6b4f47] font-medium mt-2 group-hover:text-[#a02010] transition-colors flex items-center gap-1">
                <span>Registered users</span>
                <span aria-hidden="true" className="opacity-0 group-hover:opacity-100 transition-opacity">
                  →
                </span>
              </div>
            </div>
            <div
              aria-hidden="true"
              className="w-9 h-9 rounded-lg bg-[#f1ede8] group-hover:bg-[#ffdad6]/50 text-[#5a413c] group-hover:text-[#a02010] flex items-center justify-center shrink-0 transition-colors"
            >
              <span className="material-symbols-outlined text-[19px]">group</span>
            </div>
          </button>
        </section>

        {/* Main 2-Column Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Column (8 cols on lg) */}
          <div className="lg:col-span-8 flex flex-col gap-5">
            {/* Submissions by stage */}
            <section
              aria-labelledby="stages-heading"
              className="bg-white rounded-xl border border-[#e2bfb8]/80 p-5 sm:p-6 shadow-xs"
            >
              <div className="flex items-start justify-between gap-3 mb-5">
                <div>
                  <h2
                    id="stages-heading"
                    className="font-headline text-[15px] sm:text-base font-bold text-[#38231d]"
                  >
                    Submissions by stage
                  </h2>
                  <p className="text-xs text-[#6b4f47] mt-0.5 tabular-nums">
                    {metrics.activeSubmissions} active of {metrics.totalSubmissions} total
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setCurrentRoute('/admin/reports')}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#a02010] hover:underline shrink-0 cursor-pointer"
                >
                  <span>View report</span>
                  <span aria-hidden="true">→</span>
                </button>
              </div>

              {metrics.isEmpty ? (
                /* Empty State */
                <div className="flex flex-col items-center text-center pt-2 pb-4">
                  <div className="w-full bg-[#fdf9f4] border border-[#e2bfb8]/60 rounded-xl px-4 py-4 mb-6">
                    <div className="grid grid-cols-5 gap-2">
                      {data.stages.map((stage) => (
                        <div key={stage.id} className="flex flex-col items-center gap-1.5">
                          <span className="w-7 h-7 rounded-full bg-white border border-[#e2bfb8] text-xs font-bold text-[#5a413c] flex items-center justify-center">
                            {stage.stepNumber}
                          </span>
                          <span className="text-[11px] text-[#6b4f47] font-medium truncate max-w-full">
                            {stage.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="w-16 h-16 rounded-full bg-[#ffdad6]/50 text-[#a02010] flex items-center justify-center mb-4">
                    <span className="material-symbols-outlined text-[30px]">lightbulb</span>
                  </div>
                  <h3 className="font-headline text-base font-bold text-[#1c1c19] mb-1.5">
                    No submissions yet
                  </h3>
                  <p className="text-xs text-[#5a413c] max-w-sm leading-relaxed mb-5">
                    Ideas will appear here once applicants submit. You can configure workflow rules
                    or publish evaluation criteria to get started.
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => setCurrentRoute('/admin/workflow')}
                      className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-[#f7f3ee] hover:bg-[#ebe8e3] border border-[#e2bfb8]/80 text-xs font-semibold text-[#38231d] transition-colors"
                    >
                      <span className="material-symbols-outlined text-[16px]">account_tree</span>
                      <span>Configure workflow</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentRoute('/admin/criteria')}
                      className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-[#f7f3ee] hover:bg-[#ebe8e3] border border-[#e2bfb8]/80 text-xs font-semibold text-[#38231d] transition-colors"
                    >
                      <span className="material-symbols-outlined text-[16px]">tune</span>
                      <span>Review evaluation criteria</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Plain CSS Horizontal Bar Chart */
                <div className="flex flex-col gap-3.5">
                  {data.stages.map((stage) => {
                    const widthPct =
                      stage.count > 0
                        ? Math.max(Math.round((stage.count / metrics.maxStageCount) * 68), 12)
                        : 0;

                    return (
                      <button
                        key={stage.id}
                        type="button"
                        onClick={() => setCurrentRoute(stage.route)}
                        className="w-full flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-4 text-left group cursor-pointer rounded-lg p-1 -m-1 hover:bg-[#fdf9f4] transition-colors"
                      >
                        <div className="flex items-center justify-between sm:w-24 shrink-0">
                          <span className="text-xs sm:text-[13px] font-medium text-[#38231d] group-hover:text-[#a02010] transition-colors">
                            {stage.label}
                          </span>
                          <span className="sm:hidden text-xs font-bold text-[#38231d] tabular-nums">
                            {stage.count}
                          </span>
                        </div>

                        <div
                          role="progressbar"
                          aria-label={`${stage.label} stage submissions`}
                          aria-valuenow={stage.count}
                          aria-valuemin={0}
                          aria-valuemax={Math.max(metrics.totalSubmissions, 1)}
                          className="flex-1 h-6 rounded-md bg-[#f1ede8] flex items-center gap-2.5 overflow-hidden"
                        >
                          {stage.count > 0 && (
                            <div
                              style={{ width: `${widthPct}%` }}
                              className="h-full rounded-md bg-[#a02010] group-hover:bg-[#7c0700] transition-all duration-300 flex items-center justify-end pr-2.5 shrink-0"
                            >
                              <span className="text-[11px] font-bold text-white tabular-nums">
                                {stage.count}
                              </span>
                            </div>
                          )}

                          {stage.overdueCount > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#ffebc2] text-[#7a4b00] text-[11px] font-semibold whitespace-nowrap shrink-0">
                              <span
                                aria-hidden="true"
                                className="w-1.5 h-1.5 rounded-full bg-[#d97706]"
                              />
                              <span>{stage.overdueCount} overdue</span>
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Needs attention */}
            <section
              aria-labelledby="attention-heading"
              className="bg-white rounded-xl border border-[#e2bfb8]/80 p-5 sm:p-6 shadow-xs"
            >
              <div className="mb-4">
                <h2
                  id="attention-heading"
                  className="font-headline text-[15px] sm:text-base font-bold text-[#38231d]"
                >
                  Needs attention
                </h2>
                <p className="text-xs text-[#6b4f47] mt-0.5">
                  Items requiring administrative action today
                </p>
              </div>

              {filteredAttention.length === 0 ? (
                <div className="p-4 rounded-xl bg-[#f7f3ee] border border-[#e2bfb8]/60 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 text-[#1b5e20] flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[18px]">check_circle</span>
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-bold text-[#1c1c19]">
                      {normalizedQuery
                        ? 'No matching attention items.'
                        : 'Nothing needs your attention.'}
                    </p>
                    <p className="text-xs text-[#5a413c] mt-0.5">
                      {normalizedQuery
                        ? 'Try clearing your search filter to see all action items.'
                        : 'All review deadlines are met and no pending approvals require action.'}
                    </p>
                  </div>
                </div>
              ) : (
                <ul className="divide-y divide-[#f1ede8]">
                  {filteredAttention.map((item) => (
                    <li
                      key={item.id}
                      className="py-3 first:pt-1 last:pb-1 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          aria-hidden="true"
                          className={`relative w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                            item.tone === 'danger'
                              ? 'text-[#a02010]'
                              : item.tone === 'warning'
                              ? 'text-[#945400]'
                              : 'text-[#6b4f47]'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[19px]">{item.icon}</span>
                          {item.tone === 'danger' && (
                            <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[#a02010]" />
                          )}
                          {item.tone === 'warning' && (
                            <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[#d97706]" />
                          )}
                        </span>
                        <span className="text-xs sm:text-[13px] font-medium text-[#1c1c19] leading-snug">
                          {item.text}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => setCurrentRoute(item.route)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-colors cursor-pointer ${
                          item.tone === 'danger'
                            ? 'bg-[#ffdad6]/60 hover:bg-[#ffdad6] text-[#a02010]'
                            : 'bg-[#f1ede8] hover:bg-[#e6e2dd] text-[#38231d]'
                        }`}
                      >
                        {item.actionLabel}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          {/* Right Column (4 cols on lg) */}
          <div className="lg:col-span-4 flex flex-col gap-5">
            {/* System status */}
            <section
              aria-labelledby="system-status-heading"
              className="bg-white rounded-xl border border-[#e2bfb8]/80 p-5 shadow-xs"
            >
              <div className="flex items-center gap-2 mb-3">
                <span
                  aria-hidden="true"
                  className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                    data.systemStatus.operational
                      ? 'bg-emerald-50 text-[#1b5e20]'
                      : 'bg-amber-50 text-[#945400]'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {data.systemStatus.operational ? 'check_circle' : 'info'}
                  </span>
                </span>
                <h2
                  id="system-status-heading"
                  className={`font-headline text-[15px] font-bold ${
                    data.systemStatus.operational ? 'text-[#1b5e20]' : 'text-[#945400]'
                  }`}
                >
                  {data.systemStatus.label}
                </h2>
              </div>

              <dl className="flex flex-col gap-1.5 text-xs text-[#5a413c] mb-3.5">
                <div className="flex items-center gap-1.5">
                  <dt className="text-[#6b4f47]">Firebase project:</dt>
                  <dd className="font-bold text-[#1c1c19]">{data.systemStatus.projectId}</dd>
                </div>
                <div className="flex items-center gap-1.5">
                  <dt className="text-[#6b4f47]">Last synced:</dt>
                  <dd className="font-bold text-[#1c1c19] tabular-nums">
                    {data.systemStatus.lastSyncedAt || 'Pending'}
                  </dd>
                </div>
              </dl>

              {data.systemStatus.error && (
                <p className="text-[11px] text-[#6b4f47] bg-[#fdf9f4] border border-[#e2bfb8]/60 rounded-lg p-2.5 mb-3">
                  {data.systemStatus.error}
                </p>
              )}

              <button
                type="button"
                onClick={() => setCurrentRoute('/admin/system')}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#a02010] hover:underline cursor-pointer"
              >
                <span>View system and hosting</span>
                <span aria-hidden="true">→</span>
              </button>
            </section>

            {/* Quick actions */}
            <section
              aria-labelledby="quick-actions-heading"
              className="bg-white rounded-xl border border-[#e2bfb8]/80 p-5 shadow-xs"
            >
              <h2
                id="quick-actions-heading"
                className="font-headline text-[15px] font-bold text-[#38231d] mb-3.5"
              >
                Quick actions
              </h2>

              <div className="grid grid-cols-2 gap-2.5">
                {ADMIN_QUICK_ACTIONS.map((action) => (
                  <button
                    key={action.id}
                    type="button"
                    onClick={() => setCurrentRoute(action.route)}
                    className="flex items-center gap-2.5 p-3 rounded-xl bg-[#f7f3ee] hover:bg-[#ebe8e3] border border-[#e2bfb8]/40 text-left transition-colors cursor-pointer group"
                  >
                    <span
                      aria-hidden="true"
                      className="material-symbols-outlined text-[18px] text-[#5a413c] group-hover:text-[#a02010] shrink-0 transition-colors"
                    >
                      {action.icon}
                    </span>
                    <span className="text-xs font-semibold text-[#38231d] leading-tight">
                      {action.label}
                    </span>
                  </button>
                ))}
              </div>
            </section>

            {/* Recent activity */}
            <section
              aria-labelledby="recent-activity-heading"
              className="bg-white rounded-xl border border-[#e2bfb8]/80 p-5 shadow-xs"
            >
              <h2
                id="recent-activity-heading"
                className="font-headline text-[15px] font-bold text-[#38231d] mb-3.5"
              >
                Recent activity
              </h2>

              {filteredActivity.length === 0 ? (
                <p className="text-xs text-[#6b4f47] py-2 mb-3">
                  {normalizedQuery
                    ? 'No recent activity matches your search.'
                    : 'No audit activity recorded yet.'}
                </p>
              ) : (
                <ul className="flex flex-col gap-3.5 mb-4">
                  {filteredActivity.map((item) => (
                    <li key={item.id} className="flex items-start gap-2.5">
                      <span
                        aria-hidden="true"
                        className={`material-symbols-outlined text-[17px] mt-0.5 shrink-0 ${
                          item.tone === 'success'
                            ? 'text-[#1b5e20]'
                            : item.tone === 'warning'
                            ? 'text-[#b45309]'
                            : 'text-[#6b4f47]'
                        }`}
                      >
                        {item.icon}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-[#1c1c19] leading-snug">{item.text}</p>
                        <p className="text-[11px] text-[#6b4f47] mt-0.5">{item.timestamp}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              <button
                type="button"
                onClick={() => setCurrentRoute('/admin/audit-trail')}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#a02010] hover:underline cursor-pointer"
              >
                <span>View audit trail</span>
                <span aria-hidden="true">→</span>
              </button>
            </section>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};
