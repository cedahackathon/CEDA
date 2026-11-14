/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { auth } from '../../../config/firebase';
import { INNOVATION_SECTORS } from '../../../data/ideaOptions';
import {
  getSubmissionStageMeta,
  getSubmissionStatusMeta,
  SUBMITTER_STAGES,
  SUBMITTER_SUPPORT_CONFIG,
} from '../../../data/submitterMock';
import {
  fetchSubmitterIdeas,
  formatDateDDMonYYYY,
  formatPulaAmount,
  SubmitterIdea,
} from '../../../services/submitterService';
import { SubmitterLayout } from '../../submitter/SubmitterLayout';

type ViewMode = 'list' | 'grid';
type StatusFilter = 'all' | string;

const PRIMARY_STATUS_CHIPS: Array<{ key: string; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'draft', label: 'Draft' },
  { key: 'under_review', label: 'Under review' },
  { key: 'feedback_requested', label: 'Feedback requested' },
  { key: 'approved', label: 'Approved' },
  { key: 'declined', label: 'Declined' },
];

const EXTRA_STATUS_KEYS = ['submitted', 'awarded'];

function getWizardPathForStep(currentStep?: number): string {
  switch (currentStep) {
    case 2:
      return '/submit/idea';
    case 3:
      return '/submit/documents';
    case 4:
      return '/submit/review';
    case 1:
    default:
      return '/submit/applicant';
  }
}

function getCreatedYear(idea: SubmitterIdea): number | null {
  const iso = idea.createdAt || idea.submittedAt || idea.updatedAt;
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.getFullYear();
}

function formatKpiPula(amount: number): string {
  return `P ${amount.toLocaleString('en-US', {
    minimumFractionDigits: amount === 0 ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;
}

function formatLocationLine(idea: SubmitterIdea): string {
  const combined = [idea.town, idea.district].filter(Boolean).join(', ');
  return combined || idea.location || 'Botswana';
}

function csvEscape(val: string | number | null | undefined): string {
  const str = String(val ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

const StageProgressDots: React.FC<{ idea: SubmitterIdea }> = ({ idea }) => {
  const stageMeta = getSubmissionStageMeta({
    status: idea.status,
    stageStep: idea.stageStep,
    currentStep: idea.currentStep,
  });

  return (
    <div className="flex flex-col gap-1">
      <div
        className="flex items-center gap-1"
        role="img"
        aria-label={`Pipeline progress: ${stageMeta.label}`}
      >
        {[1, 2, 3, 4, 5].map((dotIdx) => {
          const isHaltedHere = stageMeta.haltedDotIndex === dotIdx;
          const isCompleted = dotIdx <= stageMeta.completedDots;

          if (isHaltedHere) {
            return (
              <span
                key={dotIdx}
                aria-hidden="true"
                className="w-3.5 h-3.5 rounded-full bg-[#ba1a1a] text-white inline-flex items-center justify-center shrink-0"
              >
                <span className="material-symbols-outlined text-[10px] leading-none font-bold">
                  close
                </span>
              </span>
            );
          }

          return (
            <span
              key={dotIdx}
              aria-hidden="true"
              className={`w-2 h-2 rounded-full shrink-0 transition-colors ${
                isCompleted ? stageMeta.activeDotClass : 'bg-[#e6ddd6]'
              }`}
            />
          );
        })}
      </div>
      <span className={`text-xs font-medium leading-tight ${stageMeta.textClass}`}>
        {stageMeta.label}
      </span>
    </div>
  );
};

const StatusPill: React.FC<{ status: string }> = ({ status }) => {
  const meta = getSubmissionStatusMeta(status);
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold whitespace-nowrap ${meta.pillClasses}`}
    >
      <span aria-hidden="true" className="material-symbols-outlined text-[14px]">
        {meta.icon}
      </span>
      <span>{meta.label}</span>
    </span>
  );
};

export const MySubmissionsPage: React.FC = () => {
  const { currentUser, setCurrentRoute } = useAuth();
  const activeUid = currentUser?.id || auth?.currentUser?.uid || '';

  const [ideas, setIdeas] = useState<SubmitterIdea[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Filters & view state
  const [searchQuery, setSearchQuery] = useState('');
  const [sectorFilter, setSectorFilter] = useState('all');
  const [yearRangeFilter, setYearRangeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

  // Dropdowns & expansion (single row open at a time)
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [isMoreStatusOpen, setIsMoreStatusOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Pagination
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const exportMenuRef = useRef<HTMLDivElement>(null);
  const moreStatusRef = useRef<HTMLDivElement>(null);

  const loadSubmissions = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await fetchSubmitterIdeas(activeUid);
      setIdeas(data);
    } catch (err) {
      const rawMessage =
        err instanceof Error ? err.message : 'Unable to load your submissions from Firestore.';
      let friendly = rawMessage;
      try {
        const parsed = JSON.parse(rawMessage) as { error?: string; path?: string };
        if (parsed?.error) {
          friendly = parsed.path
            ? `Firestore permissions prevented loading "${parsed.path}" (${parsed.error}).`
            : parsed.error;
        }
      } catch {
        // plain string message
      }
      setLoadError(friendly);
    } finally {
      setIsLoading(false);
    }
  }, [activeUid]);

  useEffect(() => {
    loadSubmissions();
  }, [loadSubmissions]);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (exportMenuRef.current && !exportMenuRef.current.contains(target)) {
        setIsExportMenuOpen(false);
      }
      if (moreStatusRef.current && !moreStatusRef.current.contains(target)) {
        setIsMoreStatusOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsExportMenuOpen(false);
        setIsMoreStatusOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    window.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      window.removeEventListener('keydown', handleEsc);
    };
  }, []);

  // KPIs computed directly from loaded submissions
  const kpis = useMemo(() => {
    const totalSubmissions = ideas.length;
    const underReview = ideas.filter(
      (i) => i.status === 'under_review' || i.status === 'submitted'
    ).length;
    const actionRequired = ideas.filter((i) => i.status === 'feedback_requested').length;
    const fundingRequested = ideas.reduce(
      (sum, item) => sum + (item.requestedAmountBwp || 0),
      0
    );
    return { totalSubmissions, underReview, actionRequired, fundingRequested };
  }, [ideas]);

  // Dynamic sector options (from data + Botswana option list)
  const sectorOptions = useMemo(() => {
    const set = new Set<string>(INNOVATION_SECTORS.map((s) => s.label));
    ideas.forEach((item) => {
      if (item.sector && item.sector.trim()) set.add(item.sector.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [ideas]);

  // Dynamic year range options from createdAt
  const yearRangeOptions = useMemo(() => {
    const years = Array.from(
      new Set(ideas.map(getCreatedYear).filter((y): y is number => y !== null))
    ).sort((a, b) => b - a);
    const options: Array<{ value: string; label: string }> = [
      { value: 'all', label: 'All years' },
    ];
    if (years.length > 1) {
      const minY = years[years.length - 1];
      const maxY = years[0];
      options.push({ value: `${minY}-${maxY}`, label: `${minY} to ${maxY}` });
    }
    years.forEach((y) => {
      options.push({ value: String(y), label: String(y) });
    });
    return options;
  }, [ideas]);

  // Base filtered list (Search + Sector + Year Range) — used for status chip counts
  const baseFilteredIdeas = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return ideas.filter((item) => {
      if (q) {
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchRef = item.reference.toLowerCase().includes(q);
        if (!matchTitle && !matchRef) return false;
      }
      if (sectorFilter !== 'all' && item.sector !== sectorFilter) {
        return false;
      }
      if (yearRangeFilter !== 'all') {
        const y = getCreatedYear(item);
        if (y === null) return false;
        if (yearRangeFilter.includes('-')) {
          const [startStr, endStr] = yearRangeFilter.split('-');
          const start = Number(startStr);
          const end = Number(endStr);
          if (y < start || y > end) return false;
        } else if (y !== Number(yearRangeFilter)) {
          return false;
        }
      }
      return true;
    });
  }, [ideas, searchQuery, sectorFilter, yearRangeFilter]);

  // Status counts ignore status filter, respect search/sector/year
  const statusCounts = useMemo(() => {
    const map: Record<string, number> = { all: baseFilteredIdeas.length };
    baseFilteredIdeas.forEach((item) => {
      const key = String(item.status || 'submitted').toLowerCase();
      map[key] = (map[key] || 0) + 1;
    });
    return map;
  }, [baseFilteredIdeas]);

  // Extra statuses for the "More" menu
  const moreStatusOptions = useMemo(() => {
    const primaryKeys = new Set(PRIMARY_STATUS_CHIPS.map((c) => c.key));
    const keys = new Set<string>(EXTRA_STATUS_KEYS);
    baseFilteredIdeas.forEach((item) => {
      const key = String(item.status || '').toLowerCase();
      if (key && !primaryKeys.has(key)) {
        keys.add(key);
      }
    });
    return Array.from(keys).map((key) => ({
      key,
      label: getSubmissionStatusMeta(key).label,
      count: statusCounts[key] || 0,
    }));
  }, [baseFilteredIdeas, statusCounts]);

  // Final filtered list
  const filteredIdeas = useMemo(() => {
    if (statusFilter === 'all') return baseFilteredIdeas;
    return baseFilteredIdeas.filter(
      (item) => String(item.status || '').toLowerCase() === statusFilter
    );
  }, [baseFilteredIdeas, statusFilter]);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
    setExpandedId(null);
  }, [searchQuery, sectorFilter, yearRangeFilter, statusFilter, rowsPerPage]);

  const totalPages = Math.max(1, Math.ceil(filteredIdeas.length / rowsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedIdeas = useMemo(() => {
    const start = (safePage - 1) * rowsPerPage;
    return filteredIdeas.slice(start, start + rowsPerPage);
  }, [filteredIdeas, safePage, rowsPerPage]);

  const startRecord = filteredIdeas.length === 0 ? 0 : (safePage - 1) * rowsPerPage + 1;
  const endRecord = Math.min(safePage * rowsPerPage, filteredIdeas.length);

  const hasActiveFilters =
    Boolean(searchQuery.trim()) ||
    sectorFilter !== 'all' ||
    yearRangeFilter !== 'all' ||
    statusFilter !== 'all';

  const activeNonStatusFilterCount =
    (searchQuery.trim() ? 1 : 0) +
    (sectorFilter !== 'all' ? 1 : 0) +
    (yearRangeFilter !== 'all' ? 1 : 0);

  const resetAllFilters = () => {
    setSearchQuery('');
    setSectorFilter('all');
    setYearRangeFilter('all');
    setStatusFilter('all');
  };

  const toggleExpandRow = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handleExportCsv = () => {
    setIsExportMenuOpen(false);
    if (filteredIdeas.length === 0) return;

    const headers = [
      'Title',
      'Reference',
      'Sector',
      'Location',
      'Stage',
      'Status',
      'Funding Requested (BWP)',
      'Submitted',
    ];
    const rows = filteredIdeas.map((item) => {
      const stageLabel = getSubmissionStageMeta({
        status: item.status,
        stageStep: item.stageStep,
        currentStep: item.currentStep,
      }).label;
      const statusLabel = getSubmissionStatusMeta(item.status).label;
      const submittedText =
        item.status === 'draft'
          ? 'Not submitted'
          : formatDateDDMonYYYY(item.submittedAt || item.createdAt);
      return [
        csvEscape(item.title),
        csvEscape(item.reference),
        csvEscape(item.sector),
        csvEscape(formatLocationLine(item)),
        csvEscape(stageLabel),
        csvEscape(statusLabel),
        csvEscape(item.requestedAmountBwp ?? ''),
        csvEscape(submittedText),
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `ceda-submissions-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const activeMoreOption = moreStatusOptions.find((opt) => opt.key === statusFilter) || null;

  const renderExpandedDetails = (item: SubmitterIdea) => {
    const showBusiness = item.applicantType === 'business';
    const hasClarification = item.status === 'feedback_requested' && Boolean(item.feedback);

    return (
      <div className="space-y-4">
        <div
          className={`grid grid-cols-1 gap-4 ${
            showBusiness ? 'sm:grid-cols-3' : 'sm:grid-cols-2'
          }`}
        >
          {showBusiness && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#77574e]">
                Company &amp; legal form
              </p>
              <p className="text-xs font-semibold text-[#1c1c19] mt-1">
                {item.companyName || 'Registered business entity'}
              </p>
              {item.cipaNumber && (
                <p className="text-[11px] text-[#6b4f47] mt-0.5 tabular-nums">
                  CIPA: {item.cipaNumber}
                </p>
              )}
            </div>
          )}

          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#77574e]">
              Funding requested
            </p>
            <p className="text-sm font-bold text-[#7c0700] tabular-nums mt-1">
              {item.requestedAmountBwp !== null
                ? formatPulaAmount(item.requestedAmountBwp)
                : 'Not specified'}
            </p>
            {item.fundingPurpose && (
              <p className="text-[11px] text-[#6b4f47] mt-0.5">{item.fundingPurpose}</p>
            )}
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#77574e]">
              Operational location
            </p>
            <p className="text-xs font-semibold text-[#1c1c19] mt-1">
              {item.address || formatLocationLine(item)}
            </p>
            {item.address && (
              <p className="text-[11px] text-[#6b4f47] mt-0.5">{formatLocationLine(item)}</p>
            )}
          </div>
        </div>

        {hasClarification && item.feedback && (
          <div className="rounded-xl bg-[#fdf3ef] border border-[#ebc2b7] p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0">
              <span
                aria-hidden="true"
                className="w-9 h-9 rounded-lg bg-white border border-[#ebc2b7] text-[#a02010] flex items-center justify-center shrink-0"
              >
                <span className="material-symbols-outlined text-[18px]">assignment_late</span>
              </span>
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-[#7c0700]">{item.feedback.title}</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-[#fde4dd] text-[#8f1c0e] text-[10px] font-bold">
                    Action due
                  </span>
                </div>
                <p className="text-xs text-[#38231d] leading-relaxed">
                  {item.feedback.message}
                  {item.feedback.dueDate ? (
                    <>
                      {' '}
                      <strong className="font-semibold text-[#1c1c19]">
                        Respond by {formatDateDDMonYYYY(item.feedback.dueDate)}.
                      </strong>
                    </>
                  ) : null}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              {item.feedback.fileUrl && (
                <a
                  href={item.feedback.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#7c0700] hover:underline focus-visible:outline-2 focus-visible:outline-[#a02010] rounded"
                >
                  <span aria-hidden="true" className="material-symbols-outlined text-[16px]">
                    download
                  </span>
                  <span>Download officer clarification note (PDF)</span>
                </a>
              )}
              <button
                type="button"
                onClick={() => setCurrentRoute(`/submissions/${item.id}?tab=feedback`)}
                className="inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-xl bg-[#a02010] hover:bg-[#7c0700] text-white text-xs font-semibold transition-colors shadow-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a02010]"
              >
                <span>Respond</span>
                <span aria-hidden="true" className="material-symbols-outlined text-[15px]">
                  arrow_forward
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <SubmitterLayout ideasCount={ideas.length}>
      <div className="flex flex-col gap-5">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-[#6b4f47]">
          <button
            type="button"
            onClick={() => setCurrentRoute('/dashboard')}
            className="hover:text-[#a02010] transition-colors focus-visible:outline-2 focus-visible:outline-[#a02010] rounded"
          >
            Home
          </button>
          <span aria-hidden="true">/</span>
          <span className="font-semibold text-[#1c1c19]">My submissions</span>
        </nav>

        {/* Title Row & Primary Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-headline text-2xl sm:text-[28px] font-bold text-[#38231d] tracking-tight">
              My submissions
            </h1>
            <p className="text-xs sm:text-sm text-[#5a413c] mt-1">
              Track every idea from submission to award.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {/* Export Dropdown */}
            <div ref={exportMenuRef} className="relative">
              <button
                type="button"
                disabled={isLoading || ideas.length === 0}
                aria-expanded={isExportMenuOpen}
                aria-haspopup="menu"
                onClick={() => setIsExportMenuOpen((prev) => !prev)}
                className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl border border-[#e2bfb8] bg-white hover:bg-[#f7f3ee] text-xs font-semibold text-[#38231d] transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-[#a02010]"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[17px]">
                  download
                </span>
                <span>Export</span>
                <span aria-hidden="true" className="material-symbols-outlined text-[16px]">
                  expand_more
                </span>
              </button>

              {isExportMenuOpen && (
                <div
                  role="menu"
                  aria-label="Export submissions"
                  className="absolute right-0 mt-1.5 w-52 bg-white rounded-xl border border-[#e2bfb8] shadow-lg py-1.5 z-30"
                >
                  <button
                    type="button"
                    role="menuitem"
                    disabled={filteredIdeas.length === 0}
                    onClick={handleExportCsv}
                    className="w-full px-3.5 py-2 text-left text-xs font-semibold text-[#1c1c19] hover:bg-[#fdf9f4] disabled:opacity-50 flex items-center justify-between gap-2"
                  >
                    <span className="flex items-center gap-2">
                      <span aria-hidden="true" className="material-symbols-outlined text-[16px] text-[#a02010]">
                        table_view
                      </span>
                      <span>CSV spreadsheet</span>
                    </span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    disabled
                    aria-disabled="true"
                    className="w-full px-3.5 py-2 text-left text-xs font-medium text-[#77574e] cursor-not-allowed flex items-center justify-between gap-2 opacity-75"
                  >
                    <span className="flex items-center gap-2">
                      <span aria-hidden="true" className="material-symbols-outlined text-[16px]">
                        picture_as_pdf
                      </span>
                      <span>PDF summary</span>
                    </span>
                    <span className="text-[10px] font-semibold text-[#8d706b]">Coming soon</span>
                  </button>
                </div>
              )}
            </div>

            {/* Primary CTA */}
            <button
              type="button"
              onClick={() => setCurrentRoute('/submit/applicant')}
              className="inline-flex items-center justify-center gap-2 h-10 px-4 sm:px-5 rounded-xl bg-[#a02010] hover:bg-[#7c0700] text-white text-xs sm:text-sm font-semibold shadow-xs transition-colors whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a02010]"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
                add
              </span>
              <span>Submit a new idea</span>
            </button>
          </div>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div aria-busy="true" aria-label="Loading submissions" className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {[0, 1, 2, 3].map((idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-2xl border border-[#e2bfb8]/60 p-5 animate-pulse flex items-center justify-between"
                >
                  <div className="space-y-2.5">
                    <div className="h-7 w-16 rounded bg-[#e8dfd8]" />
                    <div className="h-3 w-28 rounded bg-[#f1ede8]" />
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-[#f7f3ee]" />
                </div>
              ))}
            </div>
            <div className="bg-white rounded-2xl border border-[#e2bfb8]/60 p-4 h-24 animate-pulse" />
            <div className="bg-white rounded-2xl border border-[#e2bfb8]/60 p-5 space-y-4 animate-pulse">
              {[0, 1, 2, 3].map((row) => (
                <div key={row} className="h-12 w-full rounded-xl bg-[#f7f3ee]" />
              ))}
            </div>
          </div>
        ) : loadError ? (
          /* Error State */
          <section
            role="alert"
            className="bg-white rounded-2xl border border-[#ba1a1a]/30 p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs"
          >
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-red-50 text-[#ba1a1a] flex items-center justify-center shrink-0">
                <span aria-hidden="true" className="material-symbols-outlined text-[24px]">
                  error_outline
                </span>
              </div>
              <div>
                <h2 className="font-headline text-base font-bold text-[#1c1c19]">
                  Unable to load your submissions
                </h2>
                <p className="text-xs sm:text-sm text-[#5a413c] mt-1">{loadError}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={loadSubmissions}
              className="inline-flex items-center justify-center gap-2 h-10 px-5 rounded-xl bg-[#a02010] hover:bg-[#7c0700] text-white text-xs font-semibold transition-colors shrink-0 self-start sm:self-auto"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[16px]">
                refresh
              </span>
              <span>Retry</span>
            </button>
          </section>
        ) : (
          <>
            {/* 4 KPI Cards */}
            <section
              aria-label="Submission metrics"
              className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4"
            >
              {/* Total submissions */}
              <div className="bg-white rounded-2xl border border-[#e2bfb8]/70 p-5 shadow-2xs flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-headline text-2xl sm:text-[26px] font-bold text-[#1c1c19] tabular-nums leading-tight">
                    {kpis.totalSubmissions}
                  </p>
                  <p className="text-xs font-medium text-[#6b4f47] mt-1">Total submissions</p>
                </div>
                <span
                  aria-hidden="true"
                  className="w-10 h-10 rounded-xl bg-[#fbf1ed] text-[#a02010] flex items-center justify-center shrink-0"
                >
                  <span className="material-symbols-outlined text-[20px]">inventory_2</span>
                </span>
              </div>

              {/* Under review */}
              <div className="bg-white rounded-2xl border border-[#e2bfb8]/70 p-5 shadow-2xs flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-headline text-2xl sm:text-[26px] font-bold text-[#1c1c19] tabular-nums leading-tight">
                    {kpis.underReview}
                  </p>
                  <p className="text-xs font-medium text-[#6b4f47] mt-1">Under review</p>
                </div>
                <span
                  aria-hidden="true"
                  className="w-10 h-10 rounded-xl bg-[#fbf1ed] text-[#a02010] flex items-center justify-center shrink-0"
                >
                  <span className="material-symbols-outlined text-[20px]">schedule</span>
                </span>
              </div>

              {/* Action required */}
              <div className="bg-white rounded-2xl border border-[#e2bfb8]/70 p-5 shadow-2xs flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p
                      className={`font-headline text-2xl sm:text-[26px] font-bold tabular-nums leading-tight ${
                        kpis.actionRequired > 0 ? 'text-[#a02010]' : 'text-[#1c1c19]'
                      }`}
                    >
                      {kpis.actionRequired}
                    </p>
                    {kpis.actionRequired > 0 && (
                      <span
                        aria-hidden="true"
                        className="w-2 h-2 rounded-full bg-[#a02010] shrink-0"
                      />
                    )}
                  </div>
                  <p className="text-xs font-medium text-[#6b4f47] mt-1">
                    Action required
                    {kpis.actionRequired > 0 ? (
                      <span className="sr-only"> (attention needed)</span>
                    ) : null}
                  </p>
                </div>
                <span
                  aria-hidden="true"
                  className="w-10 h-10 rounded-xl bg-[#fbf1ed] text-[#a02010] flex items-center justify-center shrink-0"
                >
                  <span className="material-symbols-outlined text-[20px]">error_outline</span>
                </span>
              </div>

              {/* Funding requested */}
              <div className="bg-white rounded-2xl border border-[#e2bfb8]/70 p-5 shadow-2xs flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-headline text-2xl sm:text-[26px] font-bold text-[#1c1c19] tabular-nums leading-tight truncate">
                    {formatKpiPula(kpis.fundingRequested)}
                  </p>
                  <p className="text-xs font-medium text-[#6b4f47] mt-1">Funding requested</p>
                </div>
                <span
                  aria-hidden="true"
                  className="w-10 h-10 rounded-xl bg-[#fbf1ed] text-[#a02010] flex items-center justify-center shrink-0"
                >
                  <span className="material-symbols-outlined text-[20px]">account_balance</span>
                </span>
              </div>
            </section>

            {/* Filter Toolbar + Status Chips */}
            <section
              aria-label="Filter submissions"
              className="bg-white rounded-2xl border border-[#e2bfb8]/70 p-4 shadow-2xs space-y-3.5"
            >
              {/* Mobile Filter Toggle Row (< md) */}
              <div className="flex md:hidden items-center justify-between gap-2">
                <button
                  type="button"
                  aria-expanded={isMobileFiltersOpen}
                  aria-controls="mobile-submissions-filters"
                  onClick={() => setIsMobileFiltersOpen((prev) => !prev)}
                  className="inline-flex items-center gap-2 h-10 px-3.5 rounded-xl bg-[#f7f3ee] border border-[#e2bfb8]/70 text-xs font-semibold text-[#38231d]"
                >
                  <span aria-hidden="true" className="material-symbols-outlined text-[17px]">
                    tune
                  </span>
                  <span>Filters</span>
                  {activeNonStatusFilterCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-[#a02010] text-white text-[10px] font-bold tabular-nums">
                      {activeNonStatusFilterCount}
                    </span>
                  )}
                  <span aria-hidden="true" className="material-symbols-outlined text-[16px]">
                    {isMobileFiltersOpen ? 'expand_less' : 'expand_more'}
                  </span>
                </button>

                {/* View Mode Toggle */}
                <div
                  role="group"
                  aria-label="Display layout"
                  className="inline-flex items-center h-10 p-1 rounded-xl bg-[#f7f3ee] border border-[#e2bfb8]/70"
                >
                  <button
                    type="button"
                    onClick={() => setViewMode('list')}
                    aria-pressed={viewMode === 'list'}
                    aria-label="List view"
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                      viewMode === 'list'
                        ? 'bg-white text-[#a02010] shadow-xs'
                        : 'text-[#6b4f47] hover:text-[#1c1c19]'
                    }`}
                  >
                    <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
                      format_list_bulleted
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    aria-pressed={viewMode === 'grid'}
                    aria-label="Grid view"
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                      viewMode === 'grid'
                        ? 'bg-white text-[#a02010] shadow-xs'
                        : 'text-[#6b4f47] hover:text-[#1c1c19]'
                    }`}
                  >
                    <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
                      grid_view
                    </span>
                  </button>
                </div>
              </div>

              {/* Controls Row (always visible on md+, collapsible on mobile) */}
              <div
                id="mobile-submissions-filters"
                className={`${
                  isMobileFiltersOpen ? 'flex' : 'hidden'
                } md:flex flex-col md:flex-row md:items-center gap-3`}
              >
                {/* Search */}
                <div className="relative flex-1 min-w-0">
                  <label htmlFor="submissions-search-input" className="sr-only">
                    Search by title or reference
                  </label>
                  <span
                    aria-hidden="true"
                    className="material-symbols-outlined text-[18px] text-[#77574e] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  >
                    search
                  </span>
                  <input
                    id="submissions-search-input"
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    disabled={ideas.length === 0}
                    placeholder="Search by title or reference"
                    className="w-full h-10 pl-9 pr-8 rounded-xl bg-[#f7f3ee] focus:bg-white border border-[#e2bfb8]/70 focus:border-[#a02010] text-xs font-medium text-[#1c1c19] placeholder:text-[#77574e] transition-colors disabled:opacity-60"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      aria-label="Clear search"
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full hover:bg-[#e8dfd8] flex items-center justify-center text-[#5a413c]"
                    >
                      <span aria-hidden="true" className="material-symbols-outlined text-[14px]">
                        close
                      </span>
                    </button>
                  )}
                </div>

                {/* Sector Select */}
                <div className="w-full md:w-52 shrink-0">
                  <label htmlFor="submissions-sector-filter" className="sr-only">
                    Filter by sector
                  </label>
                  <select
                    id="submissions-sector-filter"
                    value={sectorFilter}
                    onChange={(e) => setSectorFilter(e.target.value)}
                    disabled={ideas.length === 0}
                    className="w-full h-10 px-3 rounded-xl bg-[#f7f3ee] focus:bg-white border border-[#e2bfb8]/70 focus:border-[#a02010] text-xs font-medium text-[#1c1c19] disabled:opacity-60"
                  >
                    <option value="all">All sectors</option>
                    {sectorOptions.map((sector) => (
                      <option key={sector} value={sector}>
                        {sector}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Year Range Select */}
                <div className="w-full md:w-44 shrink-0">
                  <label htmlFor="submissions-year-filter" className="sr-only">
                    Filter by year range
                  </label>
                  <select
                    id="submissions-year-filter"
                    value={yearRangeFilter}
                    onChange={(e) => setYearRangeFilter(e.target.value)}
                    disabled={ideas.length === 0}
                    className="w-full h-10 px-3 rounded-xl bg-[#f7f3ee] focus:bg-white border border-[#e2bfb8]/70 focus:border-[#a02010] text-xs font-medium text-[#1c1c19] disabled:opacity-60"
                  >
                    {yearRangeOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Desktop View Toggle */}
                <div
                  role="group"
                  aria-label="Display layout"
                  className="hidden md:inline-flex items-center h-10 p-1 rounded-xl bg-[#f7f3ee] border border-[#e2bfb8]/70 shrink-0"
                >
                  <button
                    type="button"
                    onClick={() => setViewMode('list')}
                    aria-pressed={viewMode === 'list'}
                    aria-label="List view"
                    title="List view"
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors focus-visible:outline-2 focus-visible:outline-[#a02010] ${
                      viewMode === 'list'
                        ? 'bg-white text-[#a02010] shadow-xs'
                        : 'text-[#6b4f47] hover:text-[#1c1c19]'
                    }`}
                  >
                    <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
                      format_list_bulleted
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    aria-pressed={viewMode === 'grid'}
                    aria-label="Grid view"
                    title="Grid view"
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors focus-visible:outline-2 focus-visible:outline-[#a02010] ${
                      viewMode === 'grid'
                        ? 'bg-white text-[#a02010] shadow-xs'
                        : 'text-[#6b4f47] hover:text-[#1c1c19]'
                    }`}
                  >
                    <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
                      grid_view
                    </span>
                  </button>
                </div>
              </div>

              {/* Status Chips Row (horizontal scroll on mobile) */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 md:flex-wrap">
                {PRIMARY_STATUS_CHIPS.map((chip) => {
                  const isActive = statusFilter === chip.key;
                  const count = statusCounts[chip.key] || 0;
                  return (
                    <button
                      key={chip.key}
                      type="button"
                      disabled={ideas.length === 0 && chip.key !== 'all'}
                      aria-pressed={isActive}
                      onClick={() => setStatusFilter(chip.key)}
                      className={`inline-flex items-center gap-2 h-8 px-3 rounded-full text-xs font-semibold transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-[#a02010] ${
                        isActive
                          ? 'bg-[#7c0700] text-white shadow-2xs'
                          : 'bg-[#f4eee9] hover:bg-[#ebe2db] text-[#38231d] disabled:opacity-50'
                      }`}
                    >
                      <span>{chip.label}</span>
                      <span
                        className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold tabular-nums leading-none ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-white text-[#5a413c] border border-[#e2bfb8]/60'
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}

                {/* More Statuses Menu */}
                <div ref={moreStatusRef} className="relative shrink-0">
                  <button
                    type="button"
                    disabled={ideas.length === 0}
                    aria-expanded={isMoreStatusOpen}
                    aria-haspopup="menu"
                    onClick={() => setIsMoreStatusOpen((prev) => !prev)}
                    className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-semibold transition-colors whitespace-nowrap focus-visible:outline-2 focus-visible:outline-[#a02010] ${
                      activeMoreOption
                        ? 'bg-[#7c0700] text-white shadow-2xs'
                        : 'bg-[#f4eee9] hover:bg-[#ebe2db] text-[#38231d] disabled:opacity-50'
                    }`}
                  >
                    <span>{activeMoreOption ? activeMoreOption.label : 'More'}</span>
                    {activeMoreOption && (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold tabular-nums leading-none bg-white/20 text-white">
                        {activeMoreOption.count}
                      </span>
                    )}
                    <span aria-hidden="true" className="material-symbols-outlined text-[15px]">
                      expand_more
                    </span>
                  </button>

                  {isMoreStatusOpen && (
                    <div
                      role="menu"
                      aria-label="Additional submission statuses"
                      className="absolute left-0 mt-1.5 w-52 bg-white rounded-xl border border-[#e2bfb8] shadow-lg py-1.5 z-30"
                    >
                      {moreStatusOptions.map((opt) => {
                        const selected = statusFilter === opt.key;
                        return (
                          <button
                            key={opt.key}
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              setStatusFilter(opt.key);
                              setIsMoreStatusOpen(false);
                            }}
                            className={`w-full px-3.5 py-2 text-left text-xs flex items-center justify-between gap-2 transition-colors ${
                              selected
                                ? 'bg-[#fdf3ef] font-bold text-[#7c0700]'
                                : 'font-medium text-[#1c1c19] hover:bg-[#fdf9f4]'
                            }`}
                          >
                            <span>{opt.label}</span>
                            <span className="px-1.5 py-0.5 rounded-full bg-[#f4eee9] text-[#5a413c] text-[10px] font-bold tabular-nums">
                              {opt.count}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* ZERO-SUBMISSIONS EMPTY STATE */}
            {ideas.length === 0 ? (
              <section
                aria-labelledby="submissions-empty-heading"
                className="bg-white rounded-2xl border border-[#e2bfb8]/70 shadow-2xs p-6 sm:p-10 lg:p-12 flex flex-col items-center text-center"
              >
                <div className="w-20 h-20 rounded-full bg-[#fbf3ef] border border-[#e2bfb8]/60 text-[#a02010] flex items-center justify-center mb-5">
                  <span aria-hidden="true" className="material-symbols-outlined text-[36px]">
                    lightbulb
                  </span>
                </div>

                <h2
                  id="submissions-empty-heading"
                  className="font-headline text-xl sm:text-2xl font-bold text-[#38231d]"
                >
                  You have not submitted an idea yet
                </h2>
                <p className="text-xs sm:text-sm text-[#5a413c] max-w-lg mt-2.5 leading-relaxed">
                  Turn your innovative Botswana enterprise concept into reality. Submit an idea in
                  four short steps to qualify for CEDA technical evaluation, mentoring, and funding
                  support.
                </p>

                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setCurrentRoute('/submit/applicant')}
                    className="inline-flex items-center justify-center gap-2 h-11 px-6 rounded-xl bg-[#a02010] hover:bg-[#7c0700] text-white text-xs sm:text-sm font-semibold shadow-xs transition-colors"
                  >
                    <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
                      add_circle
                    </span>
                    <span>Start your first submission</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentRoute('/guidelines')}
                    className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl bg-[#f7f3ee] hover:bg-[#ebe2db] border border-[#e2bfb8]/80 text-[#38231d] text-xs sm:text-sm font-semibold transition-colors"
                  >
                    <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
                      menu_book
                    </span>
                    <span>Eligibility criteria &amp; guidelines</span>
                  </button>
                </div>

                {/* 5-Stage Journey Strip */}
                <div className="mt-8 w-full rounded-2xl bg-[#fbf8f4] border border-[#e2bfb8]/60 p-5 text-left space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#a02010]">
                        How CEDA works
                      </span>
                      <h3 className="font-headline text-sm sm:text-base font-bold text-[#1c1c19] mt-0.5">
                        Your journey from submission to award
                      </h3>
                    </div>
                  </div>

                  <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                    {SUBMITTER_STAGES.map((stage) => (
                      <li
                        key={stage.key}
                        className="rounded-xl bg-white border border-[#e2bfb8]/60 p-3.5 space-y-1.5"
                      >
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="w-5 h-5 rounded-full bg-[#fde9e4] text-[#a02010] font-bold flex items-center justify-center tabular-nums">
                            {stage.step}
                          </span>
                          <span className="text-[#77574e] font-medium tabular-nums">
                            Stage {stage.step}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-[#1c1c19]">{stage.label}</p>
                        <p className="text-[11px] text-[#5a413c] leading-snug">
                          {stage.step === 1
                            ? 'Complete applicant, concept, and supporting details.'
                            : stage.step === 2
                            ? 'Technical reviewers examine feasibility and market fit.'
                            : stage.step === 3
                            ? 'Respond to any officer clarification requests.'
                            : stage.step === 4
                            ? 'Committee appraisal and final funding sign-off.'
                            : 'Funding agreement and post-award support.'}
                        </p>
                      </li>
                    ))}
                  </ol>

                  <div className="pt-2 border-t border-[#e2bfb8]/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-[#6b4f47]">
                    <span>Have drafts in progress? Save as draft anytime and resume later.</span>
                    <span>
                      Support helpline:{' '}
                      <strong className="text-[#1c1c19] font-semibold">
                        {SUBMITTER_SUPPORT_CONFIG.hotline}
                      </strong>
                    </span>
                  </div>
                </div>
              </section>
            ) : filteredIdeas.length === 0 ? (
              /* FILTERED EMPTY STATE */
              <section
                aria-labelledby="submissions-no-match-heading"
                className="bg-white rounded-2xl border border-[#e2bfb8]/70 shadow-2xs p-8 sm:p-12 flex flex-col items-center text-center"
              >
                <div className="w-16 h-16 rounded-2xl bg-[#fbf3ef] border border-[#e2bfb8]/60 text-[#a02010] flex items-center justify-center mb-4">
                  <span aria-hidden="true" className="material-symbols-outlined text-[32px]">
                    find_in_page
                  </span>
                </div>

                <h2
                  id="submissions-no-match-heading"
                  className="font-headline text-lg sm:text-xl font-bold text-[#1c1c19]"
                >
                  No submissions match your filters
                </h2>
                <p className="text-xs sm:text-sm text-[#5a413c] max-w-md mt-2 leading-relaxed">
                  We couldn&apos;t find any submissions matching your search or active filter
                  selections. Try clearing your filters or searching with different keywords.
                </p>

                {hasActiveFilters && (
                  <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
                    <button
                      type="button"
                      onClick={resetAllFilters}
                      className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl border border-[#e2bfb8] bg-white hover:bg-[#f7f3ee] text-xs font-semibold text-[#1c1c19] transition-colors"
                    >
                      <span aria-hidden="true" className="material-symbols-outlined text-[16px]">
                        filter_alt_off
                      </span>
                      <span>Clear filters</span>
                    </button>
                    <button
                      type="button"
                      onClick={resetAllFilters}
                      className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl text-xs font-semibold text-[#6b4f47] hover:text-[#a02010] transition-colors"
                    >
                      <span aria-hidden="true" className="material-symbols-outlined text-[16px]">
                        restart_alt
                      </span>
                      <span>Reset all search criteria</span>
                    </button>
                  </div>
                )}

                <div className="mt-6 w-full max-w-lg rounded-xl bg-[#fbf8f4] border border-[#e2bfb8]/60 p-4 text-left flex items-start gap-2.5">
                  <span
                    aria-hidden="true"
                    className="material-symbols-outlined text-[18px] text-[#a02010] mt-0.5 shrink-0"
                  >
                    lightbulb
                  </span>
                  <div className="text-[11px] text-[#5a413c] leading-relaxed">
                    <p className="font-bold text-[#1c1c19]">Tips for searching submissions:</p>
                    <p className="mt-0.5">
                      Check for typos in your keywords, or search by proposal title or submission
                      reference code (e.g. CEDA-INN-2026-...).
                    </p>
                  </div>
                </div>
              </section>
            ) : (
              /* POPULATED LIST OR GRID VIEW */
              <section
                aria-label="Submissions list"
                className="bg-white rounded-2xl border border-[#e2bfb8]/70 shadow-2xs overflow-hidden"
              >
                {viewMode === 'list' ? (
                  <>
                    {/* Desktop / Tablet Table (md+) */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-[#e2bfb8]/60 bg-[#fbf8f4] text-[11px] font-bold uppercase tracking-wider text-[#6b4f47]">
                            <th scope="col" className="w-12 py-3.5 pl-4 pr-2">
                              <span className="sr-only">Expand row</span>
                            </th>
                            <th scope="col" className="py-3.5 px-3">
                              Idea
                            </th>
                            <th scope="col" className="py-3.5 px-3 w-44">
                              Stage
                            </th>
                            <th scope="col" className="py-3.5 px-3 w-44">
                              Status
                            </th>
                            <th scope="col" className="py-3.5 px-3 w-36">
                              Submitted
                            </th>
                            <th scope="col" className="py-3.5 pl-2 pr-5 w-28 text-right">
                              <span className="sr-only">Actions</span>
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#f1ede8]">
                          {paginatedIdeas.map((item) => {
                            const isDraft = item.status === 'draft';
                            const isExpanded = !isDraft && expandedId === item.id;
                            const panelId = `submission-panel-${item.id}`;

                            return (
                              <React.Fragment key={item.id}>
                                <tr
                                  className={`transition-colors ${
                                    isExpanded ? 'bg-[#fdf7f4]' : 'hover:bg-[#fdf9f4]'
                                  }`}
                                >
                                  {/* Expand Chevron Column */}
                                  <td className="py-4 pl-4 pr-2 align-middle">
                                    {!isDraft ? (
                                      <button
                                        type="button"
                                        aria-expanded={isExpanded}
                                        aria-controls={panelId}
                                        aria-label={
                                          isExpanded
                                            ? `Collapse details for ${item.title}`
                                            : `Expand details for ${item.title}`
                                        }
                                        onClick={() => toggleExpandRow(item.id)}
                                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors focus-visible:outline-2 focus-visible:outline-[#a02010] ${
                                          isExpanded
                                            ? 'bg-[#fde9e4] text-[#a02010]'
                                            : 'text-[#6b4f47] hover:bg-[#f4eee9] hover:text-[#1c1c19]'
                                        }`}
                                      >
                                        <span
                                          aria-hidden="true"
                                          className="material-symbols-outlined text-[18px]"
                                        >
                                          {isExpanded ? 'keyboard_arrow_down' : 'chevron_right'}
                                        </span>
                                      </button>
                                    ) : (
                                      <span
                                        aria-hidden="true"
                                        className="w-8 h-8 rounded-lg flex items-center justify-center text-[#b09d96]"
                                      >
                                        <span className="material-symbols-outlined text-[18px]">
                                          edit_note
                                        </span>
                                      </span>
                                    )}
                                  </td>

                                  {/* Idea Title + Muted Line */}
                                  <td className="py-4 px-3 align-middle">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setCurrentRoute(
                                          isDraft
                                            ? getWizardPathForStep(item.currentStep)
                                            : `/submissions/${item.id}`
                                        )
                                      }
                                      className={`text-left text-sm font-bold leading-snug hover:text-[#a02010] transition-colors focus-visible:outline-2 focus-visible:outline-[#a02010] rounded ${
                                        isExpanded ? 'text-[#8f1c0e]' : 'text-[#1c1c19]'
                                      }`}
                                    >
                                      {item.title}
                                    </button>
                                    <p className="text-xs text-[#6b4f47] mt-0.5 flex flex-wrap items-center gap-x-1.5">
                                      <span className="tabular-nums">{item.reference}</span>
                                      <span aria-hidden="true">•</span>
                                      <span>{item.sector}</span>
                                      <span aria-hidden="true">•</span>
                                      <span>{formatLocationLine(item)}</span>
                                    </p>
                                  </td>

                                  {/* Stage 5-Dot Track */}
                                  <td className="py-4 px-3 align-middle">
                                    <StageProgressDots idea={item} />
                                  </td>

                                  {/* Status Pill */}
                                  <td className="py-4 px-3 align-middle">
                                    <StatusPill status={item.status} />
                                  </td>

                                  {/* Submitted Date */}
                                  <td className="py-4 px-3 align-middle text-xs tabular-nums">
                                    {isDraft ? (
                                      <span className="italic text-[#77574e]">Not submitted</span>
                                    ) : (
                                      <span className="text-[#38231d] font-medium">
                                        {formatDateDDMonYYYY(item.submittedAt || item.createdAt)}
                                      </span>
                                    )}
                                  </td>

                                  {/* Action Cell (Continue for Drafts, Track for Submitted) */}
                                  <td className="py-4 pl-2 pr-5 align-middle text-right">
                                    {isDraft ? (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setCurrentRoute(getWizardPathForStep(item.currentStep))
                                        }
                                        className="inline-flex items-center justify-center gap-1 h-8 px-3 rounded-lg bg-[#a02010] hover:bg-[#7c0700] text-white text-xs font-semibold transition-colors whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a02010]"
                                      >
                                        <span>Continue</span>
                                        <span
                                          aria-hidden="true"
                                          className="material-symbols-outlined text-[14px]"
                                        >
                                          arrow_forward
                                        </span>
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => setCurrentRoute(`/submissions/${item.id}`)}
                                        className="inline-flex items-center justify-center gap-1 h-8 px-3 rounded-lg border border-[#e2bfb8] bg-[#fbf8f4] hover:bg-[#f4eee9] text-[#38231d] text-xs font-semibold transition-colors whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a02010]"
                                      >
                                        <span>Track</span>
                                        <span
                                          aria-hidden="true"
                                          className="material-symbols-outlined text-[14px]"
                                        >
                                          arrow_forward
                                        </span>
                                      </button>
                                    )}
                                  </td>
                                </tr>

                                {isExpanded && (
                                  <tr id={panelId} className="bg-[#fbf8f4]">
                                    <td colSpan={6} className="px-6 py-5 border-t border-[#f1ede8]">
                                      {renderExpandedDetails(item)}
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Stacked Cards (< md) */}
                    <div className="md:hidden divide-y divide-[#f1ede8]">
                      {paginatedIdeas.map((item) => {
                        const isDraft = item.status === 'draft';
                        const isExpanded = !isDraft && expandedId === item.id;
                        const panelId = `mobile-submission-panel-${item.id}`;

                        return (
                          <article key={item.id} className="p-4 space-y-3">
                            <div className="flex items-start justify-between gap-2.5">
                              <div className="min-w-0">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setCurrentRoute(
                                      isDraft
                                        ? getWizardPathForStep(item.currentStep)
                                        : `/submissions/${item.id}`
                                    )
                                  }
                                  className="text-left text-sm font-bold text-[#1c1c19] hover:text-[#a02010] leading-snug transition-colors"
                                >
                                  {item.title}
                                </button>
                                <p className="text-xs text-[#6b4f47] mt-1">
                                  {item.reference} • {item.sector} • {formatLocationLine(item)}
                                </p>
                              </div>
                              <StatusPill status={item.status} />
                            </div>

                            <div className="flex items-center justify-between gap-3 pt-1">
                              <StageProgressDots idea={item} />
                              <div className="text-right text-xs tabular-nums">
                                <span className="block text-[10px] uppercase tracking-wider text-[#77574e]">
                                  Submitted
                                </span>
                                {isDraft ? (
                                  <span className="italic text-[#77574e]">Not submitted</span>
                                ) : (
                                  <span className="font-medium text-[#38231d]">
                                    {formatDateDDMonYYYY(item.submittedAt || item.createdAt)}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-1">
                              {isDraft ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setCurrentRoute(getWizardPathForStep(item.currentStep))
                                  }
                                  className="inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-xl bg-[#a02010] hover:bg-[#7c0700] text-white text-xs font-semibold transition-colors"
                                >
                                  <span>Continue</span>
                                  <span
                                    aria-hidden="true"
                                    className="material-symbols-outlined text-[15px]"
                                  >
                                    arrow_forward
                                  </span>
                                </button>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    aria-expanded={isExpanded}
                                    aria-controls={panelId}
                                    onClick={() => toggleExpandRow(item.id)}
                                    className="inline-flex items-center justify-center gap-1.5 h-10 px-3.5 rounded-xl border border-[#e2bfb8] bg-[#fbf8f4] text-xs font-semibold text-[#38231d]"
                                  >
                                    <span>{isExpanded ? 'Hide details' : 'View details'}</span>
                                    <span
                                      aria-hidden="true"
                                      className="material-symbols-outlined text-[17px]"
                                    >
                                      {isExpanded ? 'expand_less' : 'expand_more'}
                                    </span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setCurrentRoute(`/submissions/${item.id}`)}
                                    className="inline-flex items-center justify-center gap-1.5 h-10 px-3.5 rounded-xl bg-[#a02010] hover:bg-[#7c0700] text-white text-xs font-semibold transition-colors"
                                  >
                                    <span>Track</span>
                                    <span
                                      aria-hidden="true"
                                      className="material-symbols-outlined text-[15px]"
                                    >
                                      arrow_forward
                                    </span>
                                  </button>
                                </>
                              )}
                            </div>

                            {isExpanded && (
                              <div
                                id={panelId}
                                className="rounded-xl bg-[#fbf8f4] border border-[#e2bfb8]/60 p-4"
                              >
                                {renderExpandedDetails(item)}
                              </div>
                            )}
                          </article>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  /* GRID VIEW (3 cols desktop, 2 tablet, 1 mobile) */
                  <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {paginatedIdeas.map((item) => {
                      const isDraft = item.status === 'draft';
                      const isExpanded = !isDraft && expandedId === item.id;
                      const panelId = `grid-submission-panel-${item.id}`;

                      return (
                        <article
                          key={item.id}
                          className={`rounded-2xl border p-5 flex flex-col justify-between gap-4 transition-colors ${
                            isExpanded
                              ? 'bg-[#fdf8f5] border-[#d6a297]'
                              : 'bg-white border-[#e2bfb8]/70 hover:border-[#c99b91]'
                          }`}
                        >
                          <div className="space-y-3">
                            <div className="flex items-start justify-between gap-2">
                              <StatusPill status={item.status} />
                              <span className="text-[11px] text-[#77574e] tabular-nums shrink-0">
                                {isDraft ? (
                                  <span className="italic">Not submitted</span>
                                ) : (
                                  formatDateDDMonYYYY(item.submittedAt || item.createdAt)
                                )}
                              </span>
                            </div>

                            <div>
                              <button
                                type="button"
                                onClick={() =>
                                  setCurrentRoute(
                                    isDraft
                                      ? getWizardPathForStep(item.currentStep)
                                      : `/submissions/${item.id}`
                                  )
                                }
                                className="text-left text-sm font-bold text-[#1c1c19] hover:text-[#a02010] leading-snug transition-colors"
                              >
                                {item.title}
                              </button>
                              <p className="text-xs text-[#6b4f47] mt-1 leading-relaxed">
                                {item.reference} • {item.sector} • {formatLocationLine(item)}
                              </p>
                            </div>

                            <div className="pt-1 flex items-center justify-between gap-3 border-t border-[#f1ede8]">
                              <StageProgressDots idea={item} />
                              <div className="text-right shrink-0">
                                <span className="block text-[10px] uppercase tracking-wider text-[#77574e]">
                                  Funding
                                </span>
                                <span className="text-xs font-bold text-[#1c1c19] tabular-nums">
                                  {item.requestedAmountBwp !== null
                                    ? formatPulaAmount(item.requestedAmountBwp)
                                    : 'Not specified'}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-3">
                            {isExpanded && (
                              <div
                                id={panelId}
                                className="rounded-xl bg-[#fbf8f4] border border-[#e2bfb8]/60 p-3.5"
                              >
                                {renderExpandedDetails(item)}
                              </div>
                            )}

                            <div className="flex items-center justify-end gap-2">
                              {isDraft ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setCurrentRoute(getWizardPathForStep(item.currentStep))
                                  }
                                  className="inline-flex items-center justify-center gap-1.5 h-9 px-3.5 rounded-xl bg-[#a02010] hover:bg-[#7c0700] text-white text-xs font-semibold transition-colors"
                                >
                                  <span>Continue</span>
                                  <span
                                    aria-hidden="true"
                                    className="material-symbols-outlined text-[15px]"
                                  >
                                    arrow_forward
                                  </span>
                                </button>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    aria-expanded={isExpanded}
                                    aria-controls={panelId}
                                    onClick={() => toggleExpandRow(item.id)}
                                    className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border border-[#e2bfb8] bg-[#fbf8f4] hover:bg-[#f4eee9] text-xs font-semibold text-[#38231d] transition-colors"
                                  >
                                    <span>{isExpanded ? 'Hide details' : 'View details'}</span>
                                    <span
                                      aria-hidden="true"
                                      className="material-symbols-outlined text-[16px]"
                                    >
                                      {isExpanded ? 'expand_less' : 'expand_more'}
                                    </span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setCurrentRoute(`/submissions/${item.id}`)}
                                    className="inline-flex items-center justify-center gap-1 h-9 px-3.5 rounded-xl bg-[#a02010] hover:bg-[#7c0700] text-white text-xs font-semibold transition-colors"
                                  >
                                    <span>Track</span>
                                    <span
                                      aria-hidden="true"
                                      className="material-symbols-outlined text-[15px]"
                                    >
                                      arrow_forward
                                    </span>
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}

                {/* Pagination Footer */}
                <div className="px-4 sm:px-5 py-3.5 border-t border-[#f1ede8] bg-[#fdfaf7] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#5a413c]">
                  <p className="tabular-nums">
                    Showing <strong className="font-semibold text-[#1c1c19]">{startRecord}</strong>{' '}
                    to <strong className="font-semibold text-[#1c1c19]">{endRecord}</strong> of{' '}
                    <strong className="font-semibold text-[#1c1c19]">{filteredIdeas.length}</strong>
                  </p>

                  <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
                    <div className="flex items-center gap-2">
                      <label htmlFor="submissions-rows-per-page" className="text-xs text-[#6b4f47]">
                        Rows:
                      </label>
                      <select
                        id="submissions-rows-per-page"
                        value={rowsPerPage}
                        onChange={(e) => setRowsPerPage(Number(e.target.value))}
                        className="h-8 px-2.5 rounded-lg bg-white border border-[#e2bfb8]/80 text-xs font-semibold text-[#1c1c19] tabular-nums focus-visible:outline-2 focus-visible:outline-[#a02010]"
                      >
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                      </select>
                    </div>

                    <nav aria-label="Submissions pagination" className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={safePage <= 1}
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg border border-[#e2bfb8]/80 bg-white hover:bg-[#f7f3ee] text-xs font-medium text-[#38231d] disabled:opacity-45 disabled:cursor-not-allowed transition-colors"
                      >
                        <span aria-hidden="true" className="material-symbols-outlined text-[15px]">
                          chevron_left
                        </span>
                        <span>Previous</span>
                      </button>

                      {Array.from({ length: totalPages }, (_, idx) => idx + 1)
                        .filter((pageNum) => {
                          if (totalPages <= 5) return true;
                          if (pageNum === 1 || pageNum === totalPages) return true;
                          return Math.abs(pageNum - safePage) <= 1;
                        })
                        .map((pageNum, idx, arr) => {
                          const prevPage = idx > 0 ? arr[idx - 1] : null;
                          const showEllipsis = prevPage !== null && pageNum - prevPage > 1;
                          const isCurrent = pageNum === safePage;
                          return (
                            <React.Fragment key={pageNum}>
                              {showEllipsis && (
                                <span aria-hidden="true" className="px-1 text-[#8d706b]">
                                  ...
                                </span>
                              )}
                              <button
                                type="button"
                                aria-current={isCurrent ? 'page' : undefined}
                                aria-label={`Page ${pageNum}`}
                                onClick={() => setCurrentPage(pageNum)}
                                className={`min-w-[32px] h-8 px-2 rounded-lg text-xs font-bold tabular-nums transition-colors ${
                                  isCurrent
                                    ? 'bg-[#a02010] text-white shadow-2xs'
                                    : 'bg-white border border-[#e2bfb8]/80 text-[#38231d] hover:bg-[#f7f3ee]'
                                }`}
                              >
                                {pageNum}
                              </button>
                            </React.Fragment>
                          );
                        })}

                      <button
                        type="button"
                        disabled={safePage >= totalPages}
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg border border-[#e2bfb8]/80 bg-white hover:bg-[#f7f3ee] text-xs font-medium text-[#38231d] disabled:opacity-45 disabled:cursor-not-allowed transition-colors"
                      >
                        <span>Next</span>
                        <span aria-hidden="true" className="material-symbols-outlined text-[15px]">
                          chevron_right
                        </span>
                      </button>
                    </nav>
                  </div>
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </SubmitterLayout>
  );
};
