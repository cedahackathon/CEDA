/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { auth } from '../../../config/firebase';
import { useAuth } from '../../../context/AuthContext';
import {
  DOCUMENT_ACCEPTED_ATTR,
  DOCUMENT_FORMAT_LABEL,
  DOCUMENT_MAX_FILE_SIZE_MB,
  DOCUMENT_SLOTS,
  DocumentSlotKey,
} from '../../../data/documentOptions';
import {
  DEMOGRAPHIC_TARGETS,
  INNOVATION_SECTORS,
  INNOVATION_TYPES,
  TRL_LEVELS,
} from '../../../data/ideaOptions';
import {
  SUBMITTER_NAV_ITEMS,
  SUBMITTER_STAGES,
  SUBMITTER_SUPPORT_CONFIG,
  TYPICAL_TURNAROUND_DAYS,
} from '../../../data/submitterMock';
import {
  getDocumentDownloadUrl,
  uploadDocumentToSupabaseAndFirestore,
  validateDocumentForSupabaseUpload,
} from '../../../services/documentStorageService';
import {
  formatBotswanaPhoneDisplay,
  formatDateCAT,
  formatDateTimeCATStrict,
  formatDocumentFileSize,
  formatPulaAmount,
  IdeaDocumentFile,
  IdeaEventRecord,
  IdeaQueryAttachment,
  IdeaQueryRecord,
  respondToIdeaQuery,
  subscribeToIdeaEvents,
  subscribeToIdeaQueries,
  subscribeToSubmitterIdeasForDetail,
  toDate,
  TrackedSubmissionDetail,
} from '../../../services/submitterService';
import { SubmitterLayout } from '../../submitter/SubmitterLayout';

interface SubmitterComingSoonPageProps {
  routePath: string;
}

type TrackingTabKey = 'overview' | 'documents' | 'timeline' | 'feedback';

const TRACKING_TABS: Array<{ key: TrackingTabKey; label: string; icon: string }> = [
  { key: 'overview', label: 'Overview', icon: 'description' },
  { key: 'documents', label: 'Documents', icon: 'folder_open' },
  { key: 'timeline', label: 'Timeline', icon: 'timeline' },
  { key: 'feedback', label: 'Feedback', icon: 'forum' },
];

const STAGE_STATUS_MAP: Record<
  number,
  { label: string; icon: string; badgeClass: string }
> = {
  1: {
    label: 'Submitted',
    icon: 'task_alt',
    badgeClass: 'bg-[#f7f3ee] text-[#38231d] border-[#e2bfb8]',
  },
  2: {
    label: 'Under review',
    icon: 'schedule',
    badgeClass: 'bg-[#fdf1eb] text-[#7c3515] border-[#edc7b7]',
  },
  3: {
    label: 'Feedback requested',
    icon: 'chat_bubble_outline',
    badgeClass: 'bg-[#fde9e4] text-[#8f1c0e] border-[#f0beb4]',
  },
  4: {
    label: 'Approval',
    icon: 'fact_check',
    badgeClass: 'bg-[#eef6ee] text-[#1f5c2e] border-[#c4dfc9]',
  },
  5: {
    label: 'Award',
    icon: 'workspace_premium',
    badgeClass: 'bg-[#eef6ee] text-[#1f5c2e] border-[#c4dfc9]',
  },
};

function parseTabFromRoute(route: string): TrackingTabKey {
  const queryPart = route.includes('?')
    ? route.split('?')[1]
    : typeof window !== 'undefined'
    ? window.location.search.replace(/^\?/, '')
    : '';
  const raw = new URLSearchParams(queryPart).get('tab')?.trim().toLowerCase();
  if (raw === 'documents' || raw === 'timeline' || raw === 'feedback' || raw === 'overview') {
    return raw;
  }
  return 'overview';
}

function getFileTypeLabel(contentType: string, filename: string): string {
  const mime = (contentType || '').toLowerCase();
  const lower = (filename || '').toLowerCase();
  if (mime.includes('pdf') || lower.endsWith('.pdf')) return 'PDF';
  if (mime.includes('wordprocessingml') || mime.includes('docx') || lower.endsWith('.docx')) {
    return 'DOCX';
  }
  if (mime.includes('jpeg') || mime.includes('jpg') || lower.endsWith('.jpg') || lower.endsWith('.jpeg')) {
    return 'JPG';
  }
  if (mime.includes('png') || lower.endsWith('.png')) return 'PNG';
  return 'FILE';
}

function getReadableFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '—';
  return formatDocumentFileSize(bytes);
}

function truncateSummary(text: string, maxLen: number = 240): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return '';
  if (clean.length <= maxLen) return clean;
  return `${clean.slice(0, maxLen - 1).trimEnd()}…`;
}

interface DocumentTableRow {
  id: string;
  label: string;
  name: string;
  note?: string;
  typeLabel: string;
  sizeLabel: string;
  addedAt: Date | null;
  downloadUrl: string | null;
}

interface TimelineEntry {
  id: string;
  title: string;
  detail: string;
  meta: string;
  timestamp: Date | null;
  sortMs: number;
  icon: string;
  badgeText?: string;
}

interface QueryReplyDraftState {
  message: string;
  files: File[];
  uploadedAttachments: IdeaQueryAttachment[];
  fileError: string | null;
  submitError: string | null;
  isSubmitting: boolean;
}

export const SubmitterComingSoonPage: React.FC<SubmitterComingSoonPageProps> = ({ routePath }) => {
  const { currentUser, currentRoute, setCurrentRoute, language } = useAuth();

  const cleanPath = routePath.split('?')[0];
  const isSubmissionDetail =
    cleanPath.startsWith('/submissions/') && cleanPath.length > '/submissions/'.length;
  const submissionId = isSubmissionDetail ? cleanPath.slice('/submissions/'.length) : '';

  const activeUid = currentUser?.id || auth?.currentUser?.uid || '';
  const isSubmitterRole = currentUser?.role === 'SUBMITTER';

  const activeTab: TrackingTabKey = useMemo(
    () => parseTabFromRoute(currentRoute),
    [currentRoute]
  );

  // Owned ideas real-time state
  const [ownedIdeas, setOwnedIdeas] = useState<TrackedSubmissionDetail[]>([]);
  const [ideasLoaded, setIdeasLoaded] = useState(false);
  const [ideasError, setIdeasError] = useState<string | null>(null);
  const [ideasRetryTick, setIdeasRetryTick] = useState(0);

  // Events & Queries real-time state
  const [events, setEvents] = useState<IdeaEventRecord[]>([]);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [queries, setQueries] = useState<IdeaQueryRecord[]>([]);
  const [queriesError, setQueriesError] = useState<string | null>(null);

  // UI state
  const [isMobileActionsOpen, setIsMobileActionsOpen] = useState(false);
  const [isQueryModalOpen, setIsQueryModalOpen] = useState(false);
  const [copiedRef, setCopiedRef] = useState(false);
  const [isUploadTooltipOpen, setIsUploadTooltipOpen] = useState(false);
  const [isAnsweredOpen, setIsAnsweredOpen] = useState(false);
  const [expandedQueryId, setExpandedQueryId] = useState<string | null>(null);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, QueryReplyDraftState>>({});

  const mobileActionsRef = useRef<HTMLDivElement>(null);
  const tabButtonRefs = useRef<Record<TrackingTabKey, HTMLButtonElement | null>>({
    overview: null,
    documents: null,
    timeline: null,
    feedback: null,
  });
  const queryModalRef = useRef<HTMLDivElement>(null);
  const queryCloseBtnRef = useRef<HTMLButtonElement>(null);

  const tabPanelId = useId();
  const uploadTooltipId = useId();
  const answeredSectionId = useId();

  // Subscribe to submitter's owned ideas (submitterId == signed-in uid)
  useEffect(() => {
    if (!isSubmissionDetail) return;

    if (!activeUid || !isSubmitterRole) {
      setOwnedIdeas([]);
      setIdeasLoaded(true);
      setIdeasError(null);
      return;
    }

    setIdeasLoaded(false);
    setIdeasError(null);

    const unsubscribe = subscribeToSubmitterIdeasForDetail(
      activeUid,
      (list) => {
        setOwnedIdeas(list);
        setIdeasLoaded(true);
        setIdeasError(null);
      },
      (errMessage) => {
        setIdeasError(errMessage);
        setIdeasLoaded(true);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [isSubmissionDetail, activeUid, isSubmitterRole, ideasRetryTick]);

  const idea = useMemo(() => {
    if (!isSubmissionDetail || !isSubmitterRole) return null;
    return ownedIdeas.find((item) => item.id === submissionId) || null;
  }, [isSubmissionDetail, isSubmitterRole, ownedIdeas, submissionId]);

  // Redirect drafts to /submit/applicant
  useEffect(() => {
    if (isSubmissionDetail && ideasLoaded && idea && idea.status === 'draft') {
      setCurrentRoute('/submit/applicant');
    }
  }, [isSubmissionDetail, ideasLoaded, idea, setCurrentRoute]);

  // Subscribe to events and queries once non-draft owned idea exists
  const activeIdeaId = idea && idea.status !== 'draft' ? idea.id : '';

  useEffect(() => {
    if (!activeIdeaId) {
      setEvents([]);
      setEventsError(null);
      setQueries([]);
      setQueriesError(null);
      return;
    }

    const unsubEvents = subscribeToIdeaEvents(
      activeIdeaId,
      (items) => {
        setEvents(items);
        setEventsError(null);
      },
      (msg) => {
        setEventsError(msg);
      }
    );

    const unsubQueries = subscribeToIdeaQueries(
      activeIdeaId,
      (items) => {
        setQueries(items);
        setQueriesError(null);
      },
      (msg) => {
        setQueriesError(msg);
      }
    );

    return () => {
      unsubEvents();
      unsubQueries();
    };
  }, [activeIdeaId]);

  // Close mobile actions dropdown & query modal on Escape / outside click
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (mobileActionsRef.current && !mobileActionsRef.current.contains(e.target as Node)) {
        setIsMobileActionsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMobileActionsOpen(false);
        setIsUploadTooltipOpen(false);
        setIsQueryModalOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    if (isQueryModalOpen) {
      const timer = window.setTimeout(() => {
        queryCloseBtnRef.current?.focus();
      }, 10);
      return () => window.clearTimeout(timer);
    }
  }, [isQueryModalOpen]);

  const handleSelectTab = useCallback(
    (tab: TrackingTabKey) => {
      if (!submissionId) return;
      setCurrentRoute(`/submissions/${submissionId}?tab=${tab}`);
    },
    [setCurrentRoute, submissionId]
  );

  const handleTabKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, currentIdx: number) => {
    const total = TRACKING_TABS.length;
    let nextIdx: number | null = null;
    if (e.key === 'ArrowRight') nextIdx = (currentIdx + 1) % total;
    else if (e.key === 'ArrowLeft') nextIdx = (currentIdx - 1 + total) % total;
    else if (e.key === 'Home') nextIdx = 0;
    else if (e.key === 'End') nextIdx = total - 1;

    if (nextIdx !== null) {
      e.preventDefault();
      const targetTab = TRACKING_TABS[nextIdx].key;
      handleSelectTab(targetTab);
      tabButtonRefs.current[targetTab]?.focus();
    }
  };

  // Derived values for tracking page (computed unconditionally before early return)
  const openQueries = useMemo(
    () => queries.filter((q) => q.status === 'open'),
    [queries]
  );
  const answeredQueries = useMemo(
    () => queries.filter((q) => q.status === 'responded'),
    [queries]
  );

  // Documents rows from idea.documents + feedback response attachments
  const documentRows = useMemo<DocumentTableRow[]>(() => {
    if (!idea) return [];
    const rows: DocumentTableRow[] = [];
    const slotLabelMap = new Map<DocumentSlotKey, string>(
      DOCUMENT_SLOTS.map((s) => [s.key, s.title])
    );

    const pushIdeaFile = (slotKey: DocumentSlotKey, file: IdeaDocumentFile, idx?: number) => {
      const baseLabel = slotLabelMap.get(slotKey) || 'Supporting document';
      const label = idx !== undefined ? `${baseLabel} #${idx + 1}` : baseLabel;
      rows.push({
        id: `${slotKey}-${file.fileId || file.name}-${idx ?? 0}`,
        label,
        name: file.name,
        note: file.note,
        typeLabel: getFileTypeLabel(file.contentType, file.name),
        sizeLabel: getReadableFileSize(file.size),
        addedAt: toDate(file.uploadedAt),
        downloadUrl: getDocumentDownloadUrl({
          publicUrl: file.publicUrl,
          storagePath: file.storagePath,
        }),
      });
    };

    const docs = idea.documents;
    if (docs.omang) pushIdeaFile('omang', docs.omang);
    if (docs.conceptNote) pushIdeaFile('conceptNote', docs.conceptNote);
    if (docs.budget) pushIdeaFile('budget', docs.budget);
    if (docs.proofOfResidence) pushIdeaFile('proofOfResidence', docs.proofOfResidence);
    if (docs.cipa) pushIdeaFile('cipa', docs.cipa);
    if (Array.isArray(docs.letters)) {
      docs.letters.forEach((letter, idx) => pushIdeaFile('letters', letter, idx));
    }

    // Append attachments submitted on feedback responses
    queries.forEach((query) => {
      const attachments = query.response?.attachments || [];
      attachments.forEach((att, idx) => {
        rows.push({
          id: `query-${query.id}-att-${idx}-${att.name}`,
          label: `Response to ${query.queryRef}`,
          name: att.name,
          typeLabel: getFileTypeLabel(att.contentType, att.name),
          sizeLabel: getReadableFileSize(att.size),
          addedAt: query.respondedAt || query.createdAt,
          downloadUrl: getDocumentDownloadUrl({
            publicUrl: att.publicUrl,
            storagePath: att.storagePath,
          }),
        });
      });
    });

    return rows;
  }, [idea, queries]);

  // Merged vertical timeline (newest first) from ONLY the 3 allowed sources
  const timelineEntries = useMemo<TimelineEntry[]>(() => {
    if (!idea) return [];
    const items: TimelineEntry[] = [];

    // 1. Derived "Idea submitted"
    const submittedDate = idea.submittedAt || idea.createdAt;
    items.push({
      id: `submitted-${idea.id}`,
      title: 'Idea submitted',
      detail: `Application recorded with reference ${idea.reference}.`,
      meta: 'Portal intake',
      timestamp: submittedDate,
      sortMs: submittedDate ? submittedDate.getTime() : 0,
      icon: 'task_alt',
    });

    // 2. Applicant-visible events from ideas/{id}/events
    events.forEach((ev) => {
      items.push({
        id: `event-${ev.id}`,
        title: ev.title,
        detail: ev.detail,
        meta: ev.actorLabel,
        timestamp: ev.createdAt,
        sortMs: ev.createdAt ? ev.createdAt.getTime() : 0,
        icon: 'update',
      });
    });

    // 3. Feedback requests & applicant responses from ideas/{id}/queries
    queries.forEach((q) => {
      if (q.createdAt) {
        items.push({
          id: `query-req-${q.id}`,
          title: 'Feedback requested',
          detail: `${q.queryRef} — ${q.title}`,
          meta: q.fromLabel,
          timestamp: q.createdAt,
          sortMs: q.createdAt.getTime(),
          icon: 'chat_bubble_outline',
        });
      }
      if (q.respondedAt) {
        items.push({
          id: `query-resp-${q.id}`,
          title: 'You responded',
          detail: `${q.queryRef} — ${q.title}`,
          meta: 'Submitted by applicant',
          timestamp: q.respondedAt,
          sortMs: q.respondedAt.getTime(),
          icon: 'mark_chat_read',
        });
      }
    });

    items.sort((a, b) => b.sortMs - a.sortMs);
    return items;
  }, [idea, events, queries]);

  // Metadata dictionaries for Summary & Overview
  const sectorLabel = useMemo(() => {
    if (!idea?.sector) return '';
    const match = INNOVATION_SECTORS.find(
      (s) => s.id === idea.sector || s.label === idea.sector
    );
    return match ? match.label : idea.sector;
  }, [idea?.sector]);

  const innovationTypeLabel = useMemo(() => {
    if (!idea?.innovationType) return '';
    const match = INNOVATION_TYPES.find((t) => t.value === idea.innovationType);
    return match ? match.label : idea.innovationType;
  }, [idea?.innovationType]);

  const trlLabel = useMemo(() => {
    if (!idea?.trl) return '';
    const match = TRL_LEVELS.find((t) => t.level === idea.trl);
    return match ? match.label : `TRL ${idea.trl}`;
  }, [idea?.trl]);

  const demographicLabels = useMemo(() => {
    if (!idea?.demographics?.length) return [];
    return idea.demographics.map((id) => {
      const match = DEMOGRAPHIC_TARGETS.find((d) => d.id === id);
      return match ? match.label : id;
    });
  }, [idea?.demographics]);

  // At-a-glance panel items (ONLY fields with data)
  const atAGlanceItems = useMemo(() => {
    if (!idea) return [];
    const list: Array<{ label: string; value: string; numeric?: boolean }> = [];
    if (sectorLabel) list.push({ label: 'Sector', value: sectorLabel });
    if (idea.subSector) list.push({ label: 'Sub-sector', value: idea.subSector });
    if (trlLabel) list.push({ label: 'TRL', value: trlLabel });
    if (idea.jobsEstimate !== null) {
      list.push({
        label: 'Estimated jobs',
        value: `${idea.jobsEstimate}`,
        numeric: true,
      });
    }
    if (innovationTypeLabel) {
      list.push({ label: 'Innovation type', value: innovationTypeLabel });
    }
    if (idea.requestedCapital !== null) {
      list.push({
        label: 'Requested capital',
        value: formatPulaAmount(idea.requestedCapital),
        numeric: true,
      });
    }
    return list;
  }, [idea, sectorLabel, trlLabel, innovationTypeLabel]);

  // Non-submission-detail routes (/notifications, /profile) preserve coming-soon view
  if (!isSubmissionDetail) {
    const matchedItem = SUBMITTER_NAV_ITEMS.find((item) => item.path === cleanPath);
    const title = matchedItem
      ? language === 'Setswana'
        ? matchedItem.labelSetswana
        : matchedItem.label
      : 'Submitter Workspace';
    const description =
      matchedItem?.description || 'This submitter workspace module is in preparation.';

    return (
      <SubmitterLayout>
        <div className="flex flex-col gap-5">
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-[#6b4f47]">
            <button
              type="button"
              onClick={() => setCurrentRoute('/dashboard')}
              className="hover:text-[#a02010] transition-colors"
            >
              Dashboard
            </button>
            <span aria-hidden="true">/</span>
            <span className="font-semibold text-[#1c1c19] truncate">{title}</span>
          </nav>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="font-headline text-2xl font-bold text-[#38231d] tracking-tight">
                {title}
              </h1>
              <p className="text-xs sm:text-sm text-[#6b4f47] mt-1">{description}</p>
            </div>
            <button
              type="button"
              onClick={() => setCurrentRoute('/dashboard')}
              className="inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-lg border border-[#e2bfb8] bg-white hover:bg-[#f7f3ee] text-xs font-semibold text-[#38231d] transition-colors shrink-0 self-start sm:self-auto"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[16px]">
                arrow_back
              </span>
              <span>Back to Dashboard</span>
            </button>
          </div>

          <section
            aria-labelledby="submitter-coming-soon-heading"
            className="bg-white rounded-xl border border-[#e2bfb8]/80 shadow-xs p-8 sm:p-12 flex flex-col items-center text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-[#fdf9f4] border border-[#e2bfb8]/70 text-[#a02010] flex items-center justify-center mb-4">
              <span aria-hidden="true" className="material-symbols-outlined text-[32px]">
                {matchedItem?.icon || 'description'}
              </span>
            </div>
            <span className="text-[11px] font-bold uppercase tracking-widest text-[#a02010] mb-1.5">
              Submitter Workspace
            </span>
            <h2
              id="submitter-coming-soon-heading"
              className="font-headline text-xl font-bold text-[#1c1c19] mb-2"
            >
              Coming soon
            </h2>
            <p className="text-sm text-[#5a413c] max-w-md mb-6 leading-relaxed">
              The <strong>{title}</strong> module is scheduled for the next CEDA Innovation Portal
              release. Your live submission overview and notifications remain accessible from the
              main dashboard.
            </p>
            <button
              type="button"
              onClick={() => setCurrentRoute('/dashboard')}
              className="inline-flex items-center justify-center gap-2 h-10 px-5 rounded-lg bg-[#a02010] hover:bg-[#7c0700] text-white text-xs font-semibold transition-colors shadow-xs"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[16px]">
                grid_view
              </span>
              <span>Return to Submitter Dashboard</span>
            </button>
          </section>
        </div>
      </SubmitterLayout>
    );
  }

  // Reply form helpers
  const getDraftForQuery = (queryId: string): QueryReplyDraftState => {
    return (
      replyDrafts[queryId] || {
        message: '',
        files: [],
        uploadedAttachments: [],
        fileError: null,
        submitError: null,
        isSubmitting: false,
      }
    );
  };

  const updateDraftForQuery = (
    queryId: string,
    updater: (prev: QueryReplyDraftState) => QueryReplyDraftState
  ) => {
    setReplyDrafts((prev) => ({
      ...prev,
      [queryId]: updater(
        prev[queryId] || {
          message: '',
          files: [],
          uploadedAttachments: [],
          fileError: null,
          submitError: null,
          isSubmitting: false,
        }
      ),
    }));
  };

  const handleAddFilesToQuery = (queryId: string, fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const incoming = Array.from(fileList);
    for (const file of incoming) {
      const err = validateDocumentForSupabaseUpload(file);
      if (err) {
        updateDraftForQuery(queryId, (prev) => ({ ...prev, fileError: err }));
        return;
      }
    }
    updateDraftForQuery(queryId, (prev) => {
      const existingNames = new Set(prev.files.map((f) => `${f.name}-${f.size}`));
      const deduped = incoming.filter((f) => !existingNames.has(`${f.name}-${f.size}`));
      return {
        ...prev,
        files: [...prev.files, ...deduped],
        uploadedAttachments: [],
        fileError: null,
        submitError: null,
      };
    });
  };

  const handleRemoveQueryFile = (queryId: string, idx: number) => {
    updateDraftForQuery(queryId, (prev) => ({
      ...prev,
      files: prev.files.filter((_, i) => i !== idx),
      uploadedAttachments: [],
      fileError: null,
      submitError: null,
    }));
  };

  const handleSubmitQueryReply = async (query: IdeaQueryRecord) => {
    if (!idea) return;
    const draft = getDraftForQuery(query.id);
    const trimmed = draft.message.trim();

    if (trimmed.length < 10) {
      updateDraftForQuery(query.id, (prev) => ({
        ...prev,
        submitError: 'Please write a response of at least 10 characters.',
      }));
      return;
    }
    if (trimmed.length > 2000) {
      updateDraftForQuery(query.id, (prev) => ({
        ...prev,
        submitError: 'Your response cannot exceed 2,000 characters.',
      }));
      return;
    }
    if (query.attachmentsRequested > 0 && draft.files.length < query.attachmentsRequested) {
      updateDraftForQuery(query.id, (prev) => ({
        ...prev,
        fileError: `Please attach at least ${query.attachmentsRequested} supporting file${
          query.attachmentsRequested === 1 ? '' : 's'
        }.`,
      }));
      return;
    }

    updateDraftForQuery(query.id, (prev) => ({
      ...prev,
      isSubmitting: true,
      fileError: null,
      submitError: null,
    }));

    try {
      let attachments = draft.uploadedAttachments;
      if (draft.files.length > 0 && attachments.length !== draft.files.length) {
        const uploaded: IdeaQueryAttachment[] = [];
        for (const file of draft.files) {
          const record = await uploadDocumentToSupabaseAndFirestore({
            file,
            userId: activeUid,
            ideaId: idea.id,
            note: `Response to ${query.queryRef}`.slice(0, 200),
          });
          uploaded.push({
            name: record.name,
            size: record.size,
            contentType: record.type,
            publicUrl: record.publicUrl,
            storagePath: record.storagePath,
            documentId: record.id,
          });
        }
        attachments = uploaded;
        updateDraftForQuery(query.id, (prev) => ({
          ...prev,
          uploadedAttachments: uploaded,
        }));
      }

      await respondToIdeaQuery({
        ideaId: idea.id,
        queryId: query.id,
        message: trimmed,
        attachments,
      });

      setExpandedQueryId(null);
      setReplyDrafts((prev) => {
        const next = { ...prev };
        delete next[query.id];
        return next;
      });
    } catch (err) {
      console.error('Failed to submit feedback reply:', err);
      const rawMsg =
        err instanceof Error
          ? err.message
          : 'Unable to send your response right now. Please try again.';
      let friendly = rawMsg;
      try {
        const parsed = JSON.parse(rawMsg) as { error?: string };
        if (parsed.error) friendly = parsed.error;
      } catch {
        // plain string message
      }
      updateDraftForQuery(query.id, (prev) => ({
        ...prev,
        isSubmitting: false,
        submitError: friendly,
      }));
    }
  };

  const handleCopyReference = async (refText: string) => {
    try {
      await navigator.clipboard.writeText(refText);
      setCopiedRef(true);
      window.setTimeout(() => setCopiedRef(false), 2000);
    } catch {
      setCopiedRef(false);
    }
  };

  // Loading state
  if (!ideasLoaded) {
    return (
      <SubmitterLayout ideasCount={ownedIdeas.length}>
        <div aria-busy="true" aria-label="Loading submission details" className="space-y-5">
          <div className="h-5 w-36 rounded bg-[#e8dfd8] animate-pulse" />
          <div className="bg-white rounded-2xl border border-[#e2bfb8]/60 p-6 space-y-4 animate-pulse">
            <div className="h-6 w-2/3 rounded bg-[#e8dfd8]" />
            <div className="h-4 w-full rounded bg-[#f1ede8]" />
            <div className="h-4 w-4/5 rounded bg-[#f1ede8]" />
          </div>
          <div className="bg-white rounded-2xl border border-[#e2bfb8]/60 p-6 h-32 animate-pulse" />
          <div className="bg-white rounded-2xl border border-[#e2bfb8]/60 p-6 h-56 animate-pulse" />
        </div>
      </SubmitterLayout>
    );
  }

  // Error state
  if (ideasError) {
    return (
      <SubmitterLayout ideasCount={ownedIdeas.length}>
        <div className="space-y-5">
          <button
            type="button"
            onClick={() => setCurrentRoute('/submissions')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#6b4f47] hover:text-[#a02010] transition-colors"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[16px]">
              arrow_back
            </span>
            <span>My submissions</span>
          </button>

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
                <h1 className="font-headline text-lg font-bold text-[#1c1c19]">
                  Unable to load submission
                </h1>
                <p className="text-xs sm:text-sm text-[#5a413c] mt-1">{ideasError}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIdeasRetryTick((n) => n + 1)}
              className="inline-flex items-center justify-center gap-2 h-10 px-5 rounded-xl bg-[#a02010] hover:bg-[#7c0700] text-white text-xs font-semibold transition-colors shrink-0 self-start sm:self-auto"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[16px]">
                refresh
              </span>
              <span>Retry</span>
            </button>
          </section>
        </div>
      </SubmitterLayout>
    );
  }

  // Missing / non-owner / non-submitter guard -> "Submission not found" & reveal nothing else
  if (!isSubmitterRole || !idea) {
    return (
      <SubmitterLayout ideasCount={isSubmitterRole ? ownedIdeas.length : 0}>
        <section
          aria-labelledby="submission-not-found-heading"
          className="bg-white rounded-2xl border border-[#e2bfb8]/80 shadow-2xs p-8 sm:p-12 flex flex-col items-center text-center max-w-2xl mx-auto mt-4"
        >
          <div className="w-16 h-16 rounded-2xl bg-[#fdf9f4] border border-[#e2bfb8]/70 text-[#a02010] flex items-center justify-center mb-4">
            <span aria-hidden="true" className="material-symbols-outlined text-[32px]">
              search_off
            </span>
          </div>
          <h1
            id="submission-not-found-heading"
            className="font-headline text-xl font-bold text-[#1c1c19]"
          >
            Submission not found
          </h1>
          <p className="text-xs sm:text-sm text-[#5a413c] mt-2 max-w-md leading-relaxed">
            This submission could not be found or is not accessible from your account.
          </p>
          <button
            type="button"
            onClick={() => setCurrentRoute('/submissions')}
            className="mt-6 inline-flex items-center justify-center gap-2 h-10 px-5 rounded-xl bg-[#a02010] hover:bg-[#7c0700] text-white text-xs font-semibold transition-colors shadow-xs"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[16px]">
              arrow_back
            </span>
            <span>Back to My submissions</span>
          </button>
        </section>
      </SubmitterLayout>
    );
  }

  // Draft redirect guard
  if (idea.status === 'draft') {
    return null;
  }

  // Status badge derived from stage (or declined if halted)
  const stageMeta = STAGE_STATUS_MAP[idea.stageStep] || STAGE_STATUS_MAP[1];
  const headerStatus =
    idea.status === 'declined'
      ? {
          label: 'Declined',
          icon: 'cancel',
          badgeClass: 'bg-[#f9e7e7] text-[#9b1c1c] border-[#ecc2c2]',
        }
      : stageMeta;

  const submittedDate = idea.submittedAt || idea.createdAt;
  const districtLocation =
    [idea.applicant.town, idea.applicant.district].filter(Boolean).join(', ') || 'Botswana';
  const summaryExcerpt = truncateSummary(idea.problem || idea.solution, 240);
  const currentStageObj =
    SUBMITTER_STAGES.find((s) => s.step === idea.stageStep) || SUBMITTER_STAGES[0];
  const emailVerified = Boolean(auth?.currentUser?.emailVerified);

  const getStepStatusWord = (stepNum: number): string => {
    if (stepNum === 1) {
      return submittedDate ? `Received ${formatDateCAT(submittedDate)}` : 'Completed';
    }
    if (idea.status === 'declined') {
      if (stepNum < idea.stageStep) return 'Completed';
      if (stepNum === idea.stageStep) return 'Declined';
      return 'Pending';
    }
    if (idea.stageStep >= 5 || idea.status === 'awarded') {
      return 'Completed';
    }
    if (stepNum < idea.stageStep) return 'Completed';
    if (stepNum === idea.stageStep) return 'In progress';
    return 'Pending';
  };

  return (
    <SubmitterLayout ideasCount={ownedIdeas.length}>
      {/* Interactive Screen Content (hidden on print) */}
      <div className="print:hidden flex flex-col gap-5">
        {/* Top Row: Back link, reference & status chips, Print & Query buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => setCurrentRoute('/submissions')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#6b4f47] hover:text-[#a02010] transition-colors rounded focus-visible:outline-2 focus-visible:outline-[#a02010]"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[16px]">
                arrow_back
              </span>
              <span>My submissions</span>
            </button>

            <span aria-hidden="true" className="text-[#d6c2bc]">
              |
            </span>

            <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-white border border-[#e2bfb8] text-xs font-bold text-[#38231d] tabular-nums">
              {idea.reference}
            </span>

            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold whitespace-nowrap ${headerStatus.badgeClass}`}
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[15px]">
                {headerStatus.icon}
              </span>
              <span>{headerStatus.label}</span>
            </span>
          </div>

          {/* Desktop/Tablet Action Buttons */}
          <div className="hidden sm:flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-xl border border-[#e2bfb8] bg-white hover:bg-[#f7f3ee] text-xs font-semibold text-[#38231d] transition-colors focus-visible:outline-2 focus-visible:outline-[#a02010]"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[17px]">
                print
              </span>
              <span>Print receipt</span>
            </button>
            <button
              type="button"
              onClick={() => setIsQueryModalOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-xl bg-[#a02010] hover:bg-[#7c0700] text-white text-xs font-semibold shadow-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a02010]"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[17px]">
                support_agent
              </span>
              <span>Query submission</span>
            </button>
          </div>

          {/* Mobile Single Dropdown Menu (< sm) */}
          <div ref={mobileActionsRef} className="relative sm:hidden">
            <button
              type="button"
              aria-expanded={isMobileActionsOpen}
              aria-haspopup="menu"
              onClick={() => setIsMobileActionsOpen((prev) => !prev)}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl border border-[#e2bfb8] bg-white text-xs font-semibold text-[#38231d]"
            >
              <span>Actions</span>
              <span aria-hidden="true" className="material-symbols-outlined text-[16px]">
                expand_more
              </span>
            </button>

            {isMobileActionsOpen && (
              <div
                role="menu"
                aria-label="Submission actions"
                className="absolute right-0 mt-1.5 w-48 bg-white rounded-xl border border-[#e2bfb8] shadow-lg py-1.5 z-30"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setIsMobileActionsOpen(false);
                    window.print();
                  }}
                  className="w-full px-3.5 py-2 text-left text-xs font-semibold text-[#38231d] hover:bg-[#fdf9f4] flex items-center gap-2"
                >
                  <span aria-hidden="true" className="material-symbols-outlined text-[16px]">
                    print
                  </span>
                  <span>Print receipt</span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setIsMobileActionsOpen(false);
                    setIsQueryModalOpen(true);
                  }}
                  className="w-full px-3.5 py-2 text-left text-xs font-semibold text-[#a02010] hover:bg-[#fdf9f4] flex items-center gap-2"
                >
                  <span aria-hidden="true" className="material-symbols-outlined text-[16px]">
                    support_agent
                  </span>
                  <span>Query submission</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Summary Card */}
        <section
          aria-labelledby="submission-detail-title"
          className="bg-white rounded-2xl border border-[#e2bfb8]/80 shadow-2xs p-5 sm:p-6"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Side */}
            <div className="lg:col-span-8 space-y-3 min-w-0">
              <div className="flex flex-wrap items-center gap-2.5 text-xs text-[#6b4f47]">
                {sectorLabel && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-[#fbf3ef] border border-[#e2bfb8]/80 text-[#7c0700] font-semibold">
                    {sectorLabel}
                  </span>
                )}
                <span className="inline-flex items-center gap-1">
                  <span aria-hidden="true" className="material-symbols-outlined text-[15px] text-[#77574e]">
                    location_on
                  </span>
                  <span>{idea.applicant.district || districtLocation}</span>
                </span>
                {submittedDate && (
                  <>
                    <span aria-hidden="true" className="text-[#d6c2bc]">
                      •
                    </span>
                    <span className="inline-flex items-center gap-1 tabular-nums">
                      <span aria-hidden="true" className="material-symbols-outlined text-[15px] text-[#77574e]">
                        calendar_today
                      </span>
                      <time dateTime={submittedDate.toISOString()}>
                        {formatDateTimeCATStrict(submittedDate)}
                      </time>
                    </span>
                  </>
                )}
              </div>

              <h1
                id="submission-detail-title"
                className="font-headline text-xl sm:text-2xl font-bold text-[#38231d] tracking-tight leading-snug"
              >
                {idea.title}
              </h1>

              {summaryExcerpt && (
                <p className="text-xs sm:text-sm text-[#5a413c] leading-relaxed max-w-3xl">
                  {summaryExcerpt}
                </p>
              )}

              {(idea.directorate || idea.estimatedCompletionAt) && (
                <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-[#6b4f47]">
                  {idea.directorate && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#fdf9f4] border border-[#e2bfb8]/60">
                      <span aria-hidden="true" className="material-symbols-outlined text-[15px] text-[#7c0700]">
                        account_balance
                      </span>
                      <span>{idea.directorate}</span>
                    </span>
                  )}
                  {idea.estimatedCompletionAt && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#fdf9f4] border border-[#e2bfb8]/60 tabular-nums">
                      <span aria-hidden="true" className="material-symbols-outlined text-[15px] text-[#7c0700]">
                        event
                      </span>
                      <span>
                        Target review:{' '}
                        <time dateTime={idea.estimatedCompletionAt.toISOString()}>
                          {formatDateCAT(idea.estimatedCompletionAt)}
                        </time>
                      </span>
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Right Panel: At a glance */}
            {atAGlanceItems.length > 0 && (
              <aside
                aria-label="At a glance"
                className="lg:col-span-4 rounded-xl bg-[#fdf9f4] border border-[#e2bfb8]/70 p-4 space-y-3"
              >
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#6b4f47]">
                  At a glance
                </h2>
                <dl className="grid grid-cols-2 lg:grid-cols-1 gap-x-4 gap-y-2.5">
                  {atAGlanceItems.map((row) => (
                    <div
                      key={row.label}
                      className="flex flex-col lg:flex-row lg:items-baseline lg:justify-between gap-0.5 lg:gap-3 border-b border-[#e2bfb8]/40 pb-2 last:border-b-0 last:pb-0"
                    >
                      <dt className="text-[11px] font-medium text-[#6b4f47] shrink-0">
                        {row.label}
                      </dt>
                      <dd
                        className={`text-xs font-semibold text-[#1c1c19] lg:text-right break-words ${
                          row.numeric ? 'tabular-nums' : ''
                        }`}
                      >
                        {row.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </aside>
            )}
          </div>
        </section>

        {/* Lifecycle Card */}
        <section
          aria-labelledby="lifecycle-heading"
          className="bg-white rounded-2xl border border-[#e2bfb8]/80 shadow-2xs p-5 sm:p-6 space-y-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2
                id="lifecycle-heading"
                className="font-headline text-sm sm:text-base font-bold text-[#38231d]"
              >
                Application lifecycle
              </h2>
              {/* Mobile step header */}
              <p className="md:hidden text-xs font-semibold text-[#7c0700] mt-0.5 tabular-nums">
                Step {idea.stageStep} of {SUBMITTER_STAGES.length} — {currentStageObj.label}
              </p>
            </div>
            <span className="text-xs font-medium text-[#6b4f47]">
              Typical turnaround: {TYPICAL_TURNAROUND_DAYS} days
            </span>
          </div>

          {/* Mobile compact progress bar */}
          <div className="md:hidden w-full h-1.5 rounded-full bg-[#efe7e0] overflow-hidden">
            <div
              className="h-full bg-[#7c0700] transition-all duration-300"
              style={{ width: `${(idea.stageStep / SUBMITTER_STAGES.length) * 100}%` }}
            />
          </div>

          {/* 5 Steps */}
          <ol className="grid grid-cols-1 md:grid-cols-5 gap-3 md:gap-2">
            {SUBMITTER_STAGES.map((stage) => {
              const isCurrent = stage.step === idea.stageStep;
              const isHalted = idea.status === 'declined' && isCurrent;
              const isCompleted =
                !isHalted &&
                (stage.step < idea.stageStep ||
                  (stage.step === 1 && idea.stageStep >= 1) ||
                  idea.status === 'awarded');
              const subLabel = getStepStatusWord(stage.step);

              return (
                <li
                  key={stage.key}
                  aria-current={isCurrent ? 'step' : undefined}
                  className={`rounded-xl border p-3.5 flex md:flex-col items-center md:items-start gap-3 md:gap-2 transition-colors ${
                    isHalted
                      ? 'bg-[#fdf2f2] border-[#ecc2c2]'
                      : isCurrent
                      ? 'bg-[#fdf9f4] border-[#a02010]'
                      : isCompleted
                      ? 'bg-white border-[#e2bfb8]/80'
                      : 'bg-[#fbfaf8] border-[#e8dfd8]/70'
                  }`}
                >
                  <div className="flex items-center gap-2 w-auto md:w-full justify-between shrink-0">
                    <span
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold tabular-nums shrink-0 ${
                        isHalted
                          ? 'bg-[#ba1a1a] text-white'
                          : isCurrent
                          ? 'bg-[#a02010] text-white ring-4 ring-[#fde9e4]'
                          : isCompleted
                          ? 'bg-[#7c0700] text-white'
                          : 'bg-[#efe7e0] text-[#6b4f47]'
                      }`}
                    >
                      {isHalted ? (
                        <span aria-hidden="true" className="material-symbols-outlined text-[15px]">
                          close
                        </span>
                      ) : isCompleted && !isCurrent ? (
                        <span aria-hidden="true" className="material-symbols-outlined text-[15px]">
                          check
                        </span>
                      ) : (
                        stage.step
                      )}
                    </span>
                    <span className="hidden md:inline-block text-[10px] font-semibold text-[#77574e] tabular-nums">
                      Step {stage.step}
                    </span>
                  </div>

                  <div className="min-w-0">
                    <p
                      className={`text-xs font-bold leading-snug ${
                        isHalted
                          ? 'text-[#9b1c1c]'
                          : isCurrent || isCompleted
                          ? 'text-[#1c1c19]'
                          : 'text-[#6b4f47]'
                      }`}
                    >
                      {stage.label}
                    </p>
                    <p
                      className={`text-[11px] mt-0.5 tabular-nums ${
                        isHalted
                          ? 'text-[#9b1c1c] font-medium'
                          : isCurrent
                          ? 'text-[#a02010] font-semibold'
                          : 'text-[#6b4f47]'
                      }`}
                    >
                      {stage.step === 1 && submittedDate ? (
                        <>
                          Received{' '}
                          <time dateTime={submittedDate.toISOString()}>
                            {formatDateCAT(submittedDate)}
                          </time>
                        </>
                      ) : (
                        subLabel
                      )}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        {/* Tab Navigation Bar */}
        <div className="bg-white rounded-2xl border border-[#e2bfb8]/80 shadow-2xs overflow-hidden">
          <div className="border-b border-[#e2bfb8]/70 px-3 sm:px-5 overflow-x-auto">
            <div
              role="tablist"
              aria-label="Submission sections"
              className="flex items-center gap-1 sm:gap-2 min-w-max"
            >
              {TRACKING_TABS.map((tab, idx) => {
                const isSelected = activeTab === tab.key;
                const badgeCount =
                  tab.key === 'documents'
                    ? documentRows.length
                    : tab.key === 'feedback'
                    ? openQueries.length
                    : null;

                return (
                  <button
                    key={tab.key}
                    ref={(el) => {
                      tabButtonRefs.current[tab.key] = el;
                    }}
                    type="button"
                    role="tab"
                    id={`submission-tab-${tab.key}`}
                    aria-selected={isSelected}
                    aria-controls={`${tabPanelId}-${tab.key}`}
                    tabIndex={isSelected ? 0 : -1}
                    onClick={() => handleSelectTab(tab.key)}
                    onKeyDown={(e) => handleTabKeyDown(e, idx)}
                    className={`relative inline-flex items-center gap-2 py-3.5 px-3 sm:px-4 text-xs sm:text-sm font-semibold whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-[#a02010] ${
                      isSelected
                        ? 'text-[#7c0700]'
                        : 'text-[#6b4f47] hover:text-[#1c1c19]'
                    }`}
                  >
                    <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
                      {tab.icon}
                    </span>
                    <span>{tab.label}</span>
                    {badgeCount !== null && (
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-bold tabular-nums leading-none ${
                          tab.key === 'feedback' && badgeCount > 0
                            ? 'bg-[#7c0700] text-white'
                            : 'bg-[#efe7e0] text-[#5a413c]'
                        }`}
                      >
                        {badgeCount}
                      </span>
                    )}
                    {isSelected && (
                      <span
                        aria-hidden="true"
                        className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-[#7c0700]"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tab Panels */}
          <div className="p-5 sm:p-6">
            {/* TAB 1: OVERVIEW */}
            {activeTab === 'overview' && (
              <div
                role="tabpanel"
                id={`${tabPanelId}-overview`}
                aria-labelledby="submission-tab-overview"
                className="space-y-6"
              >
                {/* Proposal Narrative */}
                <section aria-labelledby="overview-narrative-heading" className="space-y-4">
                  <h2
                    id="overview-narrative-heading"
                    className="font-headline text-base font-bold text-[#38231d]"
                  >
                    Proposal overview
                  </h2>

                  <div className="grid grid-cols-1 gap-4">
                    <div className="rounded-xl bg-[#fdf9f4] border border-[#e2bfb8]/60 p-4 space-y-1.5">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[#6b4f47]">
                        Problem statement
                      </h3>
                      <p className="text-xs sm:text-sm text-[#1c1c19] leading-relaxed whitespace-pre-line">
                        {idea.problem || 'Not provided.'}
                      </p>
                    </div>

                    <div className="rounded-xl bg-[#fdf9f4] border border-[#e2bfb8]/60 p-4 space-y-1.5">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[#6b4f47]">
                        Proposed solution
                      </h3>
                      <p className="text-xs sm:text-sm text-[#1c1c19] leading-relaxed whitespace-pre-line">
                        {idea.solution || 'Not provided.'}
                      </p>
                    </div>

                    <div className="rounded-xl bg-[#fdf9f4] border border-[#e2bfb8]/60 p-4 space-y-1.5">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[#6b4f47]">
                        Target beneficiaries &amp; market
                      </h3>
                      <p className="text-xs sm:text-sm text-[#1c1c19] leading-relaxed whitespace-pre-line">
                        {idea.beneficiaries || 'Not provided.'}
                      </p>
                    </div>
                  </div>
                </section>

                {/* Innovation & Impact Metadata */}
                <section aria-labelledby="overview-innovation-heading" className="space-y-3">
                  <h2
                    id="overview-innovation-heading"
                    className="font-headline text-base font-bold text-[#38231d]"
                  >
                    Innovation &amp; impact
                  </h2>

                  <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div className="rounded-xl border border-[#e2bfb8]/60 bg-white p-3.5">
                      <dt className="text-[11px] font-medium text-[#6b4f47]">Sector</dt>
                      <dd className="text-xs sm:text-sm font-semibold text-[#1c1c19] mt-1">
                        {sectorLabel || 'Not specified'}
                      </dd>
                    </div>
                    {idea.subSector && (
                      <div className="rounded-xl border border-[#e2bfb8]/60 bg-white p-3.5">
                        <dt className="text-[11px] font-medium text-[#6b4f47]">Sub-sector</dt>
                        <dd className="text-xs sm:text-sm font-semibold text-[#1c1c19] mt-1">
                          {idea.subSector}
                        </dd>
                      </div>
                    )}
                    {innovationTypeLabel && (
                      <div className="rounded-xl border border-[#e2bfb8]/60 bg-white p-3.5">
                        <dt className="text-[11px] font-medium text-[#6b4f47]">Innovation type</dt>
                        <dd className="text-xs sm:text-sm font-semibold text-[#1c1c19] mt-1">
                          {innovationTypeLabel}
                        </dd>
                      </div>
                    )}
                    {trlLabel && (
                      <div className="rounded-xl border border-[#e2bfb8]/60 bg-white p-3.5">
                        <dt className="text-[11px] font-medium text-[#6b4f47]">
                          Technology readiness level
                        </dt>
                        <dd className="text-xs sm:text-sm font-semibold text-[#1c1c19] mt-1">
                          {trlLabel}
                        </dd>
                      </div>
                    )}
                    {idea.ipStatus && (
                      <div className="rounded-xl border border-[#e2bfb8]/60 bg-white p-3.5">
                        <dt className="text-[11px] font-medium text-[#6b4f47]">IP status</dt>
                        <dd className="text-xs sm:text-sm font-semibold text-[#1c1c19] mt-1">
                          {idea.ipStatus}
                        </dd>
                      </div>
                    )}
                    {idea.jobsEstimate !== null && (
                      <div className="rounded-xl border border-[#e2bfb8]/60 bg-white p-3.5">
                        <dt className="text-[11px] font-medium text-[#6b4f47]">Estimated jobs</dt>
                        <dd className="text-xs sm:text-sm font-semibold text-[#1c1c19] mt-1 tabular-nums">
                          {idea.jobsEstimate}
                        </dd>
                      </div>
                    )}
                    {idea.impactMetric && (
                      <div className="rounded-xl border border-[#e2bfb8]/60 bg-white p-3.5">
                        <dt className="text-[11px] font-medium text-[#6b4f47]">
                          Primary impact metric
                        </dt>
                        <dd className="text-xs sm:text-sm font-semibold text-[#1c1c19] mt-1">
                          {idea.impactMetric}
                        </dd>
                      </div>
                    )}
                    {demographicLabels.length > 0 && (
                      <div className="rounded-xl border border-[#e2bfb8]/60 bg-white p-3.5 sm:col-span-2 lg:col-span-2">
                        <dt className="text-[11px] font-medium text-[#6b4f47]">
                          Demographic focus
                        </dt>
                        <dd className="mt-1.5 flex flex-wrap gap-1.5">
                          {demographicLabels.map((lbl) => (
                            <span
                              key={lbl}
                              className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-[#fbf3ef] border border-[#e2bfb8]/70 text-xs font-medium text-[#38231d]"
                            >
                              {lbl}
                            </span>
                          ))}
                        </dd>
                      </div>
                    )}
                  </dl>
                </section>

                {/* Applicant & Location (NO Omang anywhere) */}
                <section aria-labelledby="overview-applicant-heading" className="space-y-3">
                  <h2
                    id="overview-applicant-heading"
                    className="font-headline text-base font-bold text-[#38231d]"
                  >
                    Applicant &amp; location
                  </h2>

                  <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div className="rounded-xl border border-[#e2bfb8]/60 bg-white p-3.5">
                      <dt className="text-[11px] font-medium text-[#6b4f47]">Applicant name</dt>
                      <dd className="text-xs sm:text-sm font-semibold text-[#1c1c19] mt-1">
                        {idea.applicant.fullName}
                      </dd>
                    </div>
                    <div className="rounded-xl border border-[#e2bfb8]/60 bg-white p-3.5">
                      <dt className="text-[11px] font-medium text-[#6b4f47]">Applicant type</dt>
                      <dd className="text-xs sm:text-sm font-semibold text-[#1c1c19] mt-1">
                        {idea.applicant.type === 'business'
                          ? 'Registered business'
                          : 'Individual citizen'}
                      </dd>
                    </div>
                    {idea.applicant.email && (
                      <div className="rounded-xl border border-[#e2bfb8]/60 bg-white p-3.5">
                        <dt className="text-[11px] font-medium text-[#6b4f47]">Email</dt>
                        <dd className="text-xs sm:text-sm font-semibold text-[#1c1c19] mt-1 break-all">
                          {idea.applicant.email}
                        </dd>
                      </div>
                    )}
                    {idea.applicant.phone && (
                      <div className="rounded-xl border border-[#e2bfb8]/60 bg-white p-3.5">
                        <dt className="text-[11px] font-medium text-[#6b4f47]">Mobile</dt>
                        <dd className="text-xs sm:text-sm font-semibold text-[#1c1c19] mt-1 tabular-nums">
                          +267 {formatBotswanaPhoneDisplay(idea.applicant.phone)}
                        </dd>
                      </div>
                    )}
                    <div className="rounded-xl border border-[#e2bfb8]/60 bg-white p-3.5">
                      <dt className="text-[11px] font-medium text-[#6b4f47]">
                        District &amp; town
                      </dt>
                      <dd className="text-xs sm:text-sm font-semibold text-[#1c1c19] mt-1">
                        {districtLocation}
                      </dd>
                    </div>
                    {idea.applicant.address && (
                      <div className="rounded-xl border border-[#e2bfb8]/60 bg-white p-3.5">
                        <dt className="text-[11px] font-medium text-[#6b4f47]">
                          Operating address
                        </dt>
                        <dd className="text-xs sm:text-sm font-semibold text-[#1c1c19] mt-1">
                          {idea.applicant.address}
                        </dd>
                      </div>
                    )}
                    {idea.applicant.type === 'business' && idea.applicant.business.tradingName && (
                      <div className="rounded-xl border border-[#e2bfb8]/60 bg-white p-3.5">
                        <dt className="text-[11px] font-medium text-[#6b4f47]">
                          Trading name
                        </dt>
                        <dd className="text-xs sm:text-sm font-semibold text-[#1c1c19] mt-1">
                          {idea.applicant.business.tradingName}
                        </dd>
                      </div>
                    )}
                    {idea.applicant.type === 'business' && idea.applicant.business.cipaNumber && (
                      <div className="rounded-xl border border-[#e2bfb8]/60 bg-white p-3.5">
                        <dt className="text-[11px] font-medium text-[#6b4f47]">
                          CIPA registration
                        </dt>
                        <dd className="text-xs sm:text-sm font-semibold text-[#1c1c19] mt-1 tabular-nums">
                          {idea.applicant.business.cipaNumber}
                        </dd>
                      </div>
                    )}
                  </dl>

                  {idea.applicant.team.length > 0 && (
                    <div className="rounded-xl border border-[#e2bfb8]/60 bg-[#fdf9f4] p-4 space-y-2.5">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[#6b4f47]">
                        Team members
                      </h3>
                      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {idea.applicant.team.map((member, idx) => (
                          <li
                            key={`${member.name}-${idx}`}
                            className="rounded-lg bg-white border border-[#e2bfb8]/60 px-3.5 py-2.5 flex items-center justify-between gap-2"
                          >
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-[#1c1c19] truncate">
                                {member.name}
                              </p>
                              {member.role && (
                                <p className="text-[11px] text-[#6b4f47] truncate">{member.role}</p>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </section>
              </div>
            )}

            {/* TAB 2: DOCUMENTS */}
            {activeTab === 'documents' && (
              <div
                role="tabpanel"
                id={`${tabPanelId}-documents`}
                aria-labelledby="submission-tab-documents"
                className="space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <h2 className="font-headline text-base font-bold text-[#38231d]">
                      Submitted documents
                    </h2>
                    <span className="px-2 py-0.5 rounded-full bg-[#efe7e0] text-[#38231d] text-xs font-bold tabular-nums">
                      {documentRows.length}
                    </span>
                  </div>

                  {/* Disabled upload button with lock icon + accessible tooltip */}
                  <div className="relative inline-block self-start sm:self-auto">
                    <button
                      type="button"
                      aria-disabled="true"
                      aria-describedby={uploadTooltipId}
                      onMouseEnter={() => setIsUploadTooltipOpen(true)}
                      onMouseLeave={() => setIsUploadTooltipOpen(false)}
                      onFocus={() => setIsUploadTooltipOpen(true)}
                      onBlur={() => setIsUploadTooltipOpen(false)}
                      onClick={() => setIsUploadTooltipOpen((prev) => !prev)}
                      title="Uploads are locked while your application is under review. If CEDA asks for more documents, upload them from the Feedback tab."
                      className="inline-flex items-center gap-2 h-9 px-3.5 rounded-xl border border-[#d8cec6] bg-[#f4eee9] text-xs font-semibold text-[#6b4f47] cursor-not-allowed"
                    >
                      <span aria-hidden="true" className="material-symbols-outlined text-[16px]">
                        lock
                      </span>
                      <span>Upload additional document</span>
                    </button>

                    <div
                      id={uploadTooltipId}
                      role="tooltip"
                      className={`${
                        isUploadTooltipOpen ? 'block' : 'sr-only'
                      } sm:absolute sm:right-0 sm:top-full mt-2 w-72 rounded-xl bg-[#1c1c19] text-white text-[11px] leading-relaxed p-3 shadow-lg z-20`}
                    >
                      Uploads are locked while your application is under review. If CEDA asks for
                      more documents, upload them from the Feedback tab.
                    </div>
                  </div>
                </div>

                {documentRows.length === 0 ? (
                  <div className="rounded-xl border border-[#e2bfb8]/70 bg-[#fdf9f4] p-8 text-center">
                    <p className="text-sm font-semibold text-[#38231d]">
                      No documents attached to this submission.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Desktop Table (md+) */}
                    <div className="hidden md:block overflow-x-auto rounded-xl border border-[#e2bfb8]/70">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-[#e2bfb8]/60 bg-[#fbf8f4] text-[11px] font-bold uppercase tracking-wider text-[#6b4f47]">
                            <th scope="col" className="py-3 pl-4 pr-3">
                              Document
                            </th>
                            <th scope="col" className="py-3 px-3 w-24">
                              Type
                            </th>
                            <th scope="col" className="py-3 px-3 w-28">
                              Size
                            </th>
                            <th scope="col" className="py-3 px-3 w-36">
                              Added
                            </th>
                            <th scope="col" className="py-3 px-3 w-32">
                              Status
                            </th>
                            <th scope="col" className="py-3 pl-3 pr-4 w-32 text-right">
                              Download
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#f1ede8]">
                          {documentRows.map((row) => (
                            <tr key={row.id} className="hover:bg-[#fdf9f4]/70 transition-colors">
                              <td className="py-3.5 pl-4 pr-3 align-middle">
                                <p className="text-xs sm:text-sm font-semibold text-[#1c1c19]">
                                  {row.label}
                                </p>
                                <p className="text-xs text-[#6b4f47] mt-0.5 break-all">
                                  {row.name}
                                </p>
                                {row.note && (
                                  <p className="text-[11px] text-[#77574e] mt-0.5 italic">
                                    {row.note}
                                  </p>
                                )}
                              </td>
                              <td className="py-3.5 px-3 align-middle">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-[#f4eee9] text-[#38231d] text-[11px] font-bold">
                                  {row.typeLabel}
                                </span>
                              </td>
                              <td className="py-3.5 px-3 align-middle text-xs text-[#5a413c] tabular-nums">
                                {row.sizeLabel}
                              </td>
                              <td className="py-3.5 px-3 align-middle text-xs text-[#5a413c] tabular-nums">
                                {row.addedAt ? (
                                  <time dateTime={row.addedAt.toISOString()}>
                                    {formatDateCAT(row.addedAt)}
                                  </time>
                                ) : (
                                  'Not specified'
                                )}
                              </td>
                              <td className="py-3.5 px-3 align-middle">
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#f3f2ef] border border-[#dcd8d0] text-xs font-medium text-[#4b4742]">
                                  <span
                                    aria-hidden="true"
                                    className="material-symbols-outlined text-[14px]"
                                  >
                                    inventory_2
                                  </span>
                                  <span>Received</span>
                                </span>
                              </td>
                              <td className="py-3.5 pl-3 pr-4 align-middle text-right">
                                {row.downloadUrl ? (
                                  <a
                                    href={row.downloadUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    download={row.name}
                                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#a02010] hover:text-[#7c0700] hover:underline focus-visible:outline-2 focus-visible:outline-[#a02010] rounded"
                                  >
                                    <span
                                      aria-hidden="true"
                                      className="material-symbols-outlined text-[16px]"
                                    >
                                      download
                                    </span>
                                    <span>Download</span>
                                  </a>
                                ) : (
                                  <span className="text-xs text-[#8d706b]">Unavailable</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Stacked Cards (< md) */}
                    <ul className="md:hidden space-y-3">
                      {documentRows.map((row) => (
                        <li
                          key={row.id}
                          className="rounded-xl border border-[#e2bfb8]/70 bg-[#fdf9f4] p-4 space-y-2.5"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-[#1c1c19]">{row.label}</p>
                              <p className="text-xs text-[#6b4f47] mt-0.5 break-all">{row.name}</p>
                            </div>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#f3f2ef] border border-[#dcd8d0] text-[11px] font-medium text-[#4b4742] shrink-0">
                              <span
                                aria-hidden="true"
                                className="material-symbols-outlined text-[13px]"
                              >
                                inventory_2
                              </span>
                              <span>Received</span>
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[#5a413c] tabular-nums">
                            <span className="font-bold text-[#38231d]">{row.typeLabel}</span>
                            <span>{row.sizeLabel}</span>
                            {row.addedAt && (
                              <time dateTime={row.addedAt.toISOString()}>
                                {formatDateCAT(row.addedAt)}
                              </time>
                            )}
                          </div>

                          <div className="pt-1">
                            {row.downloadUrl ? (
                              <a
                                href={row.downloadUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                download={row.name}
                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#a02010] hover:underline"
                              >
                                <span
                                  aria-hidden="true"
                                  className="material-symbols-outlined text-[16px]"
                                >
                                  download
                                </span>
                                <span>Download</span>
                              </a>
                            ) : (
                              <span className="text-xs text-[#8d706b]">Download unavailable</span>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </>
                )}

                <p className="text-xs text-[#6b4f47] pt-1">
                  These are the files you submitted with this application.
                </p>
              </div>
            )}

            {/* TAB 3: TIMELINE */}
            {activeTab === 'timeline' && (
              <div
                role="tabpanel"
                id={`${tabPanelId}-timeline`}
                aria-labelledby="submission-tab-timeline"
                className="space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h2 className="font-headline text-base font-bold text-[#38231d]">
                    Submission timeline
                  </h2>
                  <p className="text-xs text-[#6b4f47]">
                    Times shown in Central Africa Time (UTC+2)
                  </p>
                </div>

                {eventsError && (
                  <div
                    role="alert"
                    className="rounded-xl border border-[#ba1a1a]/30 bg-red-50 px-4 py-3 text-xs text-[#9b1c1c]"
                  >
                    Unable to load live timeline events: {eventsError}
                  </div>
                )}

                <ol className="relative pl-6 border-l border-[#e2bfb8] space-y-5 ml-2.5">
                  {timelineEntries.map((entry, idx) => {
                    const isLatest = idx === 0;
                    return (
                      <li key={entry.id} className="relative">
                        <span
                          aria-hidden="true"
                          className={`absolute -left-[33px] top-0.5 w-4 h-4 rounded-full flex items-center justify-center ${
                            isLatest
                              ? 'bg-[#7c0700] ring-4 ring-[#fde9e4]'
                              : 'bg-white border-2 border-[#c99b91]'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isLatest ? 'bg-white' : 'bg-[#a02010]'
                            }`}
                          />
                        </span>

                        <div className="rounded-xl border border-[#e2bfb8]/70 bg-[#fdf9f4]/60 p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-4">
                          <div className="space-y-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-xs sm:text-sm font-bold text-[#1c1c19]">
                                {entry.title}
                              </h3>
                              {isLatest && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#fde9e4] border border-[#f0beb4] text-[10px] font-bold text-[#7c0700]">
                                  Latest
                                </span>
                              )}
                            </div>
                            {entry.detail && (
                              <p className="text-xs text-[#5a413c] leading-relaxed">
                                {entry.detail}
                              </p>
                            )}
                            {entry.meta && (
                              <p className="text-[11px] font-medium text-[#77574e]">
                                {entry.meta}
                              </p>
                            )}
                          </div>

                          {entry.timestamp && (
                            <time
                              dateTime={entry.timestamp.toISOString()}
                              className="text-xs font-medium text-[#6b4f47] tabular-nums shrink-0 sm:text-right whitespace-nowrap"
                            >
                              {formatDateTimeCATStrict(entry.timestamp)}
                            </time>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ol>

                <div className="pt-2 border-t border-[#e2bfb8]/50 text-xs font-medium text-[#6b4f47] tabular-nums">
                  Ref: {idea.reference}
                </div>
              </div>
            )}

            {/* TAB 4: FEEDBACK */}
            {activeTab === 'feedback' && (
              <div
                role="tabpanel"
                id={`${tabPanelId}-feedback`}
                aria-labelledby="submission-tab-feedback"
                className="space-y-5"
              >
                {queriesError && (
                  <div
                    role="alert"
                    className="rounded-xl border border-[#ba1a1a]/30 bg-red-50 px-4 py-3 text-xs text-[#9b1c1c]"
                  >
                    Unable to load feedback requests: {queriesError}
                  </div>
                )}

                {queries.length === 0 ? (
                  /* EMPTY STATE (shown ONLY when 0 requests) */
                  <div className="rounded-2xl border border-[#e2bfb8]/70 bg-[#fdf9f4] p-8 sm:p-10 flex flex-col items-center text-center">
                    <div className="w-14 h-14 rounded-2xl bg-white border border-[#e2bfb8]/80 text-[#a02010] flex items-center justify-center mb-4">
                      <span aria-hidden="true" className="material-symbols-outlined text-[28px]">
                        forum
                      </span>
                    </div>
                    <h2 className="font-headline text-lg font-bold text-[#38231d]">
                      No feedback requests yet
                    </h2>
                    <p className="text-xs sm:text-sm text-[#5a413c] max-w-md mt-2 leading-relaxed">
                      If evaluators need more information, you&apos;ll be notified here and by
                      email.
                    </p>
                    <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5 text-xs">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[#e2bfb8]/80 text-[#5a413c] font-medium">
                        <span
                          aria-hidden="true"
                          className="material-symbols-outlined text-[15px] text-[#a02010]"
                        >
                          schedule
                        </span>
                        <span>Typical turnaround: {TYPICAL_TURNAROUND_DAYS} days</span>
                      </span>

                      {emailVerified && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#eef6ee] border border-[#c4dfc9] text-[#1f5c2e] font-semibold">
                          <span
                            aria-hidden="true"
                            className="material-symbols-outlined text-[15px]"
                          >
                            verified
                          </span>
                          <span>Email verified</span>
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  /* REQUEST CARDS (shown ONLY when >= 1 requests) */
                  <div className="space-y-6">
                    {openQueries.length > 0 && (
                      <section aria-labelledby="open-requests-heading" className="space-y-4">
                        <h2
                          id="open-requests-heading"
                          className="font-headline text-base font-bold text-[#38231d]"
                        >
                          Open feedback requests
                        </h2>

                        <div className="space-y-4">
                          {openQueries.map((query) => {
                            const isOverdue = Boolean(
                              query.dueAt && query.dueAt.getTime() < Date.now()
                            );
                            const isFormOpen = expandedQueryId === query.id;
                            const draft = getDraftForQuery(query.id);
                            const charCount = draft.message.length;

                            return (
                              <article
                                key={query.id}
                                className="rounded-2xl border border-[#e2bfb8] bg-white p-5 space-y-4 shadow-2xs"
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#fde9e4] border border-[#f0beb4] text-xs font-semibold text-[#8f1c0e]">
                                      <span
                                        aria-hidden="true"
                                        className="material-symbols-outlined text-[14px]"
                                      >
                                        chat_bubble_outline
                                      </span>
                                      <span>Feedback requested</span>
                                    </span>

                                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-[#fdf9f4] border border-[#e2bfb8]/80 text-xs font-bold text-[#38231d] tabular-nums">
                                      {query.queryRef}
                                    </span>

                                    {query.dueAt && (
                                      <span
                                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-semibold tabular-nums ${
                                          isOverdue
                                            ? 'bg-red-50 border-red-200 text-[#9b1c1c]'
                                            : 'bg-[#fdf1eb] border-[#edc7b7] text-[#7c3515]'
                                        }`}
                                      >
                                        <span
                                          aria-hidden="true"
                                          className="material-symbols-outlined text-[14px]"
                                        >
                                          {isOverdue ? 'warning' : 'event'}
                                        </span>
                                        <span>
                                          {isOverdue ? 'Overdue — Respond by ' : 'Respond by '}
                                          <time dateTime={query.dueAt.toISOString()}>
                                            {formatDateCAT(query.dueAt)}
                                          </time>
                                        </span>
                                      </span>
                                    )}
                                  </div>

                                  {query.createdAt && (
                                    <time
                                      dateTime={query.createdAt.toISOString()}
                                      className="text-xs text-[#6b4f47] tabular-nums"
                                    >
                                      Issued {formatDateTimeCATStrict(query.createdAt)}
                                    </time>
                                  )}
                                </div>

                                <div className="space-y-1">
                                  <h3 className="text-sm sm:text-base font-bold text-[#1c1c19]">
                                    {query.title}
                                  </h3>
                                  <p className="text-xs font-medium text-[#6b4f47]">
                                    From: {query.fromLabel}
                                  </p>
                                </div>

                                <div className="rounded-xl bg-[#fdf6f3] border border-[#e2bfb8]/80 p-4 text-xs sm:text-sm text-[#38231d] leading-relaxed whitespace-pre-line">
                                  {query.message}
                                </div>

                                <div className="flex flex-wrap items-center justify-between gap-3">
                                  {query.attachmentsRequested > 0 ? (
                                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#7c3515]">
                                      <span
                                        aria-hidden="true"
                                        className="material-symbols-outlined text-[16px]"
                                      >
                                        attach_file
                                      </span>
                                      <span>
                                        {query.attachmentsRequested}{' '}
                                        {query.attachmentsRequested === 1
                                          ? 'attachment requested'
                                          : 'attachments requested'}
                                      </span>
                                    </span>
                                  ) : (
                                    <span />
                                  )}

                                  {!isFormOpen && (
                                    <button
                                      type="button"
                                      onClick={() => setExpandedQueryId(query.id)}
                                      className="inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-xl bg-[#a02010] hover:bg-[#7c0700] text-white text-xs font-semibold transition-colors shadow-xs"
                                    >
                                      <span>Respond now</span>
                                      <span
                                        aria-hidden="true"
                                        className="material-symbols-outlined text-[16px]"
                                      >
                                        arrow_forward
                                      </span>
                                    </button>
                                  )}
                                </div>

                                {/* Inline Response Form */}
                                {isFormOpen && (
                                  <form
                                    onSubmit={(e) => {
                                      e.preventDefault();
                                      handleSubmitQueryReply(query);
                                    }}
                                    className="rounded-xl border border-[#e2bfb8] bg-[#fdf9f4] p-4 sm:p-5 space-y-4"
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <h4 className="text-xs sm:text-sm font-bold text-[#38231d]">
                                        Your response to {query.queryRef}
                                      </h4>
                                      <button
                                        type="button"
                                        disabled={draft.isSubmitting}
                                        onClick={() => setExpandedQueryId(null)}
                                        className="text-xs font-semibold text-[#6b4f47] hover:text-[#1c1c19] disabled:opacity-50"
                                      >
                                        Cancel
                                      </button>
                                    </div>

                                    <div>
                                      <label
                                        htmlFor={`query-reply-${query.id}`}
                                        className="block text-xs font-semibold text-[#38231d] mb-1.5"
                                      >
                                        Response message <span className="text-[#a02010]">*</span>
                                      </label>
                                      <textarea
                                        id={`query-reply-${query.id}`}
                                        rows={4}
                                        value={draft.message}
                                        disabled={draft.isSubmitting}
                                        maxLength={2000}
                                        onChange={(e) =>
                                          updateDraftForQuery(query.id, (prev) => ({
                                            ...prev,
                                            message: e.target.value,
                                            submitError: null,
                                          }))
                                        }
                                        placeholder="Provide the requested clarification or detail..."
                                        className="w-full rounded-xl border border-[#e2bfb8] bg-white px-3.5 py-2.5 text-xs sm:text-sm text-[#1c1c19] placeholder:text-[#8d706b] focus:border-[#a02010] focus:outline-none"
                                      />
                                      <div className="flex items-center justify-between mt-1 text-[11px] text-[#6b4f47]">
                                        <span>Minimum 10 characters</span>
                                        <span className="tabular-nums">{charCount}/2000</span>
                                      </div>
                                    </div>

                                    <div className="space-y-2">
                                      <label
                                        htmlFor={`query-files-${query.id}`}
                                        className="block text-xs font-semibold text-[#38231d]"
                                      >
                                        Supporting attachments{' '}
                                        {query.attachmentsRequested > 0
                                          ? `(at least ${query.attachmentsRequested} required)`
                                          : '(optional)'}
                                      </label>
                                      <div className="flex flex-wrap items-center gap-3">
                                        <input
                                          id={`query-files-${query.id}`}
                                          type="file"
                                          multiple
                                          disabled={draft.isSubmitting}
                                          accept={DOCUMENT_ACCEPTED_ATTR}
                                          onChange={(e) => {
                                            handleAddFilesToQuery(query.id, e.target.files);
                                            e.target.value = '';
                                          }}
                                          className="block text-xs text-[#5a413c] file:mr-3 file:py-2 file:px-3.5 file:rounded-lg file:border file:border-[#e2bfb8] file:text-xs file:font-semibold file:bg-white file:text-[#38231d] hover:file:bg-[#f7f3ee]"
                                        />
                                        <span className="text-[11px] text-[#6b4f47]">
                                          {DOCUMENT_FORMAT_LABEL} up to {DOCUMENT_MAX_FILE_SIZE_MB}{' '}
                                          MB each
                                        </span>
                                      </div>

                                      {draft.fileError && (
                                        <p role="alert" className="text-xs font-medium text-[#ba1a1a]">
                                          {draft.fileError}
                                        </p>
                                      )}

                                      {draft.files.length > 0 && (
                                        <ul className="space-y-1.5 pt-1">
                                          {draft.files.map((file, fileIdx) => (
                                            <li
                                              key={`${file.name}-${file.size}-${fileIdx}`}
                                              className="flex items-center justify-between gap-2 rounded-lg bg-white border border-[#e2bfb8]/80 px-3 py-2 text-xs"
                                            >
                                              <span className="truncate font-medium text-[#1c1c19]">
                                                {file.name}{' '}
                                                <span className="text-[#6b4f47] tabular-nums">
                                                  ({getReadableFileSize(file.size)})
                                                </span>
                                              </span>
                                              <button
                                                type="button"
                                                disabled={draft.isSubmitting}
                                                onClick={() =>
                                                  handleRemoveQueryFile(query.id, fileIdx)
                                                }
                                                aria-label={`Remove ${file.name}`}
                                                className="text-[#6b4f47] hover:text-[#ba1a1a] disabled:opacity-50"
                                              >
                                                <span
                                                  aria-hidden="true"
                                                  className="material-symbols-outlined text-[16px]"
                                                >
                                                  close
                                                </span>
                                              </button>
                                            </li>
                                          ))}
                                        </ul>
                                      )}
                                    </div>

                                    {draft.submitError && (
                                      <div
                                        role="alert"
                                        className="rounded-xl border border-[#ba1a1a]/30 bg-red-50 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                                      >
                                        <p className="text-xs font-medium text-[#9b1c1c]">
                                          {draft.submitError}
                                        </p>
                                        <button
                                          type="submit"
                                          disabled={draft.isSubmitting}
                                          className="inline-flex items-center justify-center h-8 px-3 rounded-lg bg-[#ba1a1a] text-white text-xs font-semibold shrink-0 self-start sm:self-auto"
                                        >
                                          Retry
                                        </button>
                                      </div>
                                    )}

                                    <div className="flex items-center justify-end gap-2.5 pt-1">
                                      <button
                                        type="submit"
                                        disabled={draft.isSubmitting}
                                        className="inline-flex items-center justify-center gap-2 h-10 px-5 rounded-xl bg-[#a02010] hover:bg-[#7c0700] text-white text-xs font-semibold transition-colors disabled:opacity-60"
                                      >
                                        {draft.isSubmitting ? (
                                          <>
                                            <span
                                              aria-hidden="true"
                                              className="w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin"
                                            />
                                            <span>Submitting response…</span>
                                          </>
                                        ) : (
                                          <>
                                            <span>Submit response</span>
                                            <span
                                              aria-hidden="true"
                                              className="material-symbols-outlined text-[16px]"
                                            >
                                              send
                                            </span>
                                          </>
                                        )}
                                      </button>
                                    </div>
                                  </form>
                                )}
                              </article>
                            );
                          })}
                        </div>
                      </section>
                    )}

                    {/* Collapsed Answered Requests Section */}
                    {answeredQueries.length > 0 && (
                      <section
                        aria-label="Answered requests"
                        className="rounded-2xl border border-[#e2bfb8]/80 bg-[#fdf9f4] overflow-hidden"
                      >
                        <button
                          type="button"
                          aria-expanded={isAnsweredOpen}
                          aria-controls={answeredSectionId}
                          onClick={() => setIsAnsweredOpen((prev) => !prev)}
                          className="w-full px-5 py-3.5 flex items-center justify-between gap-3 text-left hover:bg-[#f7f1ea] transition-colors"
                        >
                          <div className="flex items-center gap-2.5">
                            <span
                              aria-hidden="true"
                              className="material-symbols-outlined text-[18px] text-[#1f5c2e]"
                            >
                              check_circle_outline
                            </span>
                            <span className="text-xs sm:text-sm font-bold text-[#38231d]">
                              Answered requests
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-white border border-[#e2bfb8]/80 text-[11px] font-bold text-[#5a413c] tabular-nums">
                              {answeredQueries.length}
                            </span>
                          </div>
                          <span
                            aria-hidden="true"
                            className="material-symbols-outlined text-[20px] text-[#6b4f47]"
                          >
                            {isAnsweredOpen ? 'expand_less' : 'expand_more'}
                          </span>
                        </button>

                        {isAnsweredOpen && (
                          <div
                            id={answeredSectionId}
                            className="border-t border-[#e2bfb8]/60 p-4 sm:p-5 space-y-3 bg-white"
                          >
                            {answeredQueries.map((q) => (
                              <article
                                key={q.id}
                                className="rounded-xl border border-[#e2bfb8]/70 bg-[#fdf9f4] p-4 space-y-2.5"
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 rounded-md bg-white border border-[#e2bfb8] text-[11px] font-bold text-[#38231d] tabular-nums">
                                      {q.queryRef}
                                    </span>
                                    <h3 className="text-xs sm:text-sm font-bold text-[#1c1c19]">
                                      {q.title}
                                    </h3>
                                  </div>
                                  {q.respondedAt && (
                                    <span className="text-[11px] font-medium text-[#1f5c2e] tabular-nums">
                                      Responded{' '}
                                      <time dateTime={q.respondedAt.toISOString()}>
                                        {formatDateTimeCATStrict(q.respondedAt)}
                                      </time>
                                    </span>
                                  )}
                                </div>

                                <p className="text-xs text-[#6b4f47]">{q.message}</p>

                                {q.response && (
                                  <div className="rounded-lg bg-white border border-[#e2bfb8]/70 p-3 space-y-2">
                                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#6b4f47]">
                                      Your response
                                    </p>
                                    <p className="text-xs text-[#1c1c19] leading-relaxed whitespace-pre-line">
                                      {q.response.message}
                                    </p>
                                    {q.response.attachments.length > 0 && (
                                      <ul className="flex flex-wrap gap-2 pt-1">
                                        {q.response.attachments.map((att, idx) => {
                                          const url = getDocumentDownloadUrl({
                                            publicUrl: att.publicUrl,
                                            storagePath: att.storagePath,
                                          });
                                          return (
                                            <li key={`${att.name}-${idx}`}>
                                              {url ? (
                                                <a
                                                  href={url}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  download={att.name}
                                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#fdf9f4] border border-[#e2bfb8] text-xs font-medium text-[#a02010] hover:underline"
                                                >
                                                  <span
                                                    aria-hidden="true"
                                                    className="material-symbols-outlined text-[14px]"
                                                  >
                                                    attach_file
                                                  </span>
                                                  <span>{att.name}</span>
                                                </a>
                                              ) : (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#fdf9f4] border border-[#e2bfb8] text-xs text-[#5a413c]">
                                                  {att.name}
                                                </span>
                                              )}
                                            </li>
                                          );
                                        })}
                                      </ul>
                                    )}
                                  </div>
                                )}
                              </article>
                            ))}
                          </div>
                        )}
                      </section>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* PRINT RECEIPT (only visible when printing — never displays Omang) */}
      <section aria-label="Printable submission receipt" className="hidden print:block space-y-6">
        <div className="border-b-2 border-[#7c0700] pb-4">
          <p className="text-xs font-bold uppercase tracking-wider text-[#7c0700]">
            Citizen Entrepreneurial Development Agency (CEDA)
          </p>
          <h1 className="font-headline text-2xl font-bold text-[#1c1c19] mt-1">
            Innovation Portal — Submission Receipt
          </h1>
        </div>

        <dl className="grid grid-cols-2 gap-4 text-sm border border-[#d6c2bc] rounded-xl p-4">
          <div>
            <dt className="text-xs font-bold uppercase text-[#5a413c]">Reference</dt>
            <dd className="font-bold text-[#1c1c19] mt-0.5 tabular-nums">{idea.reference}</dd>
          </div>
          <div>
            <dt className="text-xs font-bold uppercase text-[#5a413c]">Submitted</dt>
            <dd className="text-[#1c1c19] mt-0.5 tabular-nums">
              {submittedDate ? (
                <time dateTime={submittedDate.toISOString()}>
                  {formatDateTimeCATStrict(submittedDate)}
                </time>
              ) : (
                'Not specified'
              )}
            </dd>
          </div>
          <div className="col-span-2">
            <dt className="text-xs font-bold uppercase text-[#5a413c]">Proposal title</dt>
            <dd className="font-bold text-[#1c1c19] mt-0.5">{idea.title}</dd>
          </div>
          <div>
            <dt className="text-xs font-bold uppercase text-[#5a413c]">Applicant</dt>
            <dd className="text-[#1c1c19] mt-0.5">{idea.applicant.fullName}</dd>
          </div>
          <div>
            <dt className="text-xs font-bold uppercase text-[#5a413c]">District &amp; town</dt>
            <dd className="text-[#1c1c19] mt-0.5">{districtLocation}</dd>
          </div>
        </dl>

        <div className="space-y-2">
          <h2 className="text-sm font-bold text-[#1c1c19]">Submitted documents</h2>
          {documentRows.length === 0 ? (
            <p className="text-xs text-[#5a413c]">No documents attached.</p>
          ) : (
            <ul className="list-disc pl-5 text-sm text-[#1c1c19] space-y-1">
              {documentRows.map((docRow) => (
                <li key={docRow.id}>
                  <span className="font-semibold">{docRow.label}:</span> {docRow.name}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* QUERY SUBMISSION MODAL */}
      {isQueryModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4 print:hidden"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsQueryModalOpen(false);
          }}
        >
          <div
            ref={queryModalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="query-submission-dialog-title"
            className="w-full max-w-md rounded-2xl bg-white border border-[#e2bfb8] shadow-xl p-6 space-y-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2
                  id="query-submission-dialog-title"
                  className="font-headline text-lg font-bold text-[#38231d]"
                >
                  Query submission
                </h2>
                <p className="text-xs text-[#6b4f47] mt-1">
                  Quote your reference number when contacting the CEDA Innovation Desk.
                </p>
              </div>
              <button
                ref={queryCloseBtnRef}
                type="button"
                aria-label="Close dialog"
                onClick={() => setIsQueryModalOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[#6b4f47] hover:bg-[#f7f3ee] hover:text-[#1c1c19]"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[20px]">
                  close
                </span>
              </button>
            </div>

            <div className="rounded-xl bg-[#fdf9f4] border border-[#e2bfb8]/80 p-3.5 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-[#6b4f47]">
                  Submission reference
                </span>
                <span className="text-sm font-bold text-[#1c1c19] tabular-nums">
                  {idea.reference}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleCopyReference(idea.reference)}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-[#e2bfb8] bg-white hover:bg-[#f7f3ee] text-xs font-semibold text-[#38231d] shrink-0"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[15px]">
                  {copiedRef ? 'check' : 'content_copy'}
                </span>
                <span>{copiedRef ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            <dl className="space-y-3 text-xs">
              <div className="flex items-center justify-between gap-3 border-b border-[#f1ede8] pb-2.5">
                <dt className="text-[#6b4f47] font-medium">Help phone</dt>
                <dd className="font-bold text-[#1c1c19] tabular-nums">
                  <a
                    href={`tel:${SUBMITTER_SUPPORT_CONFIG.hotline.replace(/\s+/g, '')}`}
                    className="hover:text-[#a02010]"
                  >
                    {SUBMITTER_SUPPORT_CONFIG.hotline}
                  </a>
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3 border-b border-[#f1ede8] pb-2.5">
                <dt className="text-[#6b4f47] font-medium">Email</dt>
                <dd className="font-bold text-[#1c1c19]">
                  <a
                    href={`mailto:${SUBMITTER_SUPPORT_CONFIG.email}?subject=${encodeURIComponent(
                      `Submission query: ${idea.reference}`
                    )}`}
                    className="hover:text-[#a02010]"
                  >
                    {SUBMITTER_SUPPORT_CONFIG.email}
                  </a>
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-[#6b4f47] font-medium">Support hours</dt>
                <dd className="font-semibold text-[#38231d]">
                  {SUBMITTER_SUPPORT_CONFIG.chatHoursLabel}
                </dd>
              </div>
            </dl>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setIsQueryModalOpen(false)}
                className="inline-flex items-center justify-center h-9 px-4 rounded-xl bg-[#a02010] hover:bg-[#7c0700] text-white text-xs font-semibold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </SubmitterLayout>
  );
};
