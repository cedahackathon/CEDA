/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type SubmitterRoutePath =
  | '/dashboard'
  | '/submit'
  | '/submissions'
  | '/notifications'
  | '/profile'
  | '/help-center';

export interface SubmitterNavItem {
  id: string;
  label: string;
  labelSetswana: string;
  path: SubmitterRoutePath;
  icon: string;
  description: string;
}

export interface OpenCallData {
  id: string;
  badgeLabel: string;
  title: string;
  sponsor: string;
  fundingMaxBwp: number;
  fundingSplitLabel: string;
  closingDateIso: string;
  guidelinesRoute: string;
}

export interface SupportConfig {
  branchCount: number;
  advisoryCopy: string;
  chatStartHour: number;
  chatEndHour: number;
  chatHoursLabel: string;
  chatUnavailableLabel: string;
  hotline: string;
  email: string;
}

export interface SubmissionTip {
  id: string;
  title: string;
  detail: string;
}

export interface OnboardingStep {
  step: number;
  label: string;
  route: string;
}

export const SUBMITTER_NAV_ITEMS: SubmitterNavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    labelSetswana: 'Botlhalo jwa me',
    path: '/dashboard',
    icon: 'grid_view',
    description: 'Overview of your submitted ideas, active review stages, and updates.',
  },
  {
    id: 'submit',
    label: 'Submit an idea',
    labelSetswana: 'Romela mogopolo',
    path: '/submit',
    icon: 'lightbulb',
    description: 'Draft and submit a new innovation proposal for CEDA evaluation.',
  },
  {
    id: 'submissions',
    label: 'My submissions',
    labelSetswana: 'Dikopo tsa me',
    path: '/submissions',
    icon: 'folder_open',
    description: 'Track every proposal, stage progress, and committee feedback.',
  },
  {
    id: 'notifications',
    label: 'Notifications',
    labelSetswana: 'Dikitsiso',
    path: '/notifications',
    icon: 'notifications',
    description: 'Review evaluation updates, feedback requests, and portal alerts.',
  },
  {
    id: 'profile',
    label: 'Profile & security',
    labelSetswana: 'Botshelo le tshireletso',
    path: '/profile',
    icon: 'shield',
    description: 'Manage your innovator profile, contact details, and active sessions.',
  },
  {
    id: 'help',
    label: 'Help Center',
    labelSetswana: 'Thuso',
    path: '/help-center',
    icon: 'help_outline',
    description: 'Access eligibility guides, FAQs, and branch advisor support.',
  },
];

export const DEFAULT_OPEN_CALL: OpenCallData = {
  id: 'call-agrotech-2026',
  badgeLabel: 'OPEN CALL',
  title: 'National Agro-Tech & Sustainable Irrigation Cohort',
  sponsor: 'Ministry of Entrepreneurship & CEDA Joint Initiative',
  fundingMaxBwp: 2000000,
  fundingSplitLabel: '70% grant, 30% concessionary debt',
  closingDateIso: '2027-01-15T23:59:59+02:00',
  guidelinesRoute: '/guidelines',
};

const CHAT_START_HOUR = 9;
const CHAT_END_HOUR = 16;

function formatHour24(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`;
}

export const TYPICAL_TURNAROUND_DAYS = 14;

export const SUBMITTER_SUPPORT_CONFIG: SupportConfig = {
  branchCount: 14,
  advisoryCopy: 'Advisors across our 14 branches can help with your submission.',
  chatStartHour: CHAT_START_HOUR,
  chatEndHour: CHAT_END_HOUR,
  chatHoursLabel: `${formatHour24(CHAT_START_HOUR)} to ${formatHour24(CHAT_END_HOUR)}, Mon–Fri`,
  chatUnavailableLabel: 'Agent not available at the moment',
  hotline: '1800 2332',
  email: 'enquiries@ceda.co.bw',
};

export const SUBMITTER_WRITING_TIP =
  'Be specific and concrete: explain the local problem in measurable terms, how your solution works in practice, and who directly benefits.';

export const SUBMITTER_ONBOARDING_STEPS: OnboardingStep[] = [
  {
    step: 1,
    label: 'Complete profile',
    route: '/profile',
  },
  {
    step: 2,
    label: 'Draft your concept',
    route: '/submit',
  },
  {
    step: 3,
    label: 'Upload supporting docs',
    route: '/submit',
  },
];

export const SUBMITTER_STRONG_TIPS: SubmissionTip[] = [
  {
    id: 'tip-problem',
    title: 'Define the local problem clearly',
    detail: 'Explain the specific Botswana market gap and quantify who benefits across your district.',
  },
  {
    id: 'tip-economics',
    title: 'Include realistic 3-year projections',
    detail: 'Show unit economics, startup capital breakdown in BWP, and expected break-even timeline.',
  },
  {
    id: 'tip-jobs',
    title: 'Highlight job creation & inclusion',
    detail: 'Detail projected employment for Batswana youth, women, and regional suppliers.',
  },
  {
    id: 'tip-docs',
    title: 'Attach verified supporting records',
    detail: 'Ensure CIPA registration, BURS tax clearance (where applicable), and technical briefs are legible.',
  },
];

export interface DocumentTipItem {
  id: string;
  title: string;
  detail: string;
  url?: string | null;
  linkLabel?: string;
}

export const SUBMITTER_DOCUMENT_TIPS: DocumentTipItem[] = [
  {
    id: 'doc-tip-clarity',
    title: 'Document clarity',
    detail: 'Ensure all corners, seals, and text on scans or photos are sharp and legible.',
  },
  {
    id: 'doc-tip-pula',
    title: 'Currency in Pula',
    detail: 'Financial schedules and quotations should state figures in Botswana Pula (BWP).',
  },
  {
    id: 'doc-tip-formats',
    title: 'PDF formats',
    detail: 'Export pitch decks to PDF where possible so layout and charts display consistently for reviewers.',
  },
];

export const SUBMITTER_STAGES = [
  { step: 1, key: 'submission', label: 'Submission' },
  { step: 2, key: 'review', label: 'Review' },
  { step: 3, key: 'feedback', label: 'Feedback' },
  { step: 4, key: 'approval', label: 'Approval' },
  { step: 5, key: 'award', label: 'Award' },
] as const;

export const SUBMITTER_WIZARD_STEPS = [
  { step: 1, key: 'applicant', label: 'Applicant details', path: '/submit/applicant' },
  { step: 2, key: 'idea', label: 'Idea details', path: '/submit/idea' },
  { step: 3, key: 'documents', label: 'Documents', path: '/submit/documents' },
  { step: 4, key: 'review', label: 'Review and submit', path: '/submit/review' },
] as const;

export const DECLARATION_SUMMARY_TEXT =
  'I declare that I am a citizen of Botswana, or represent a 100% citizen-owned entity, and that the information I give is true.';

export const STATUTORY_DECLARATION_TEXT =
  'I declare that I am a citizen of the Republic of Botswana, or an authorised representative of a 100% citizen-owned entity registered in Botswana, and that all identity, contact, location, and enterprise details supplied in this submission are true, accurate, and complete. I acknowledge that my personal data is processed strictly for CEDA innovation evaluation under the Botswana Data Protection Act (BDPA) and that misrepresentation may disqualify the application.';

export interface WhatHappensNextItem {
  step: number;
  title: string;
  detail: string;
}

export const SUBMITTER_WHAT_HAPPENS_NEXT: WhatHappensNextItem[] = [
  {
    step: 1,
    title: 'Reference assignment',
    detail: 'Your submission receives a CEDA reference number once recorded.',
  },
  {
    step: 2,
    title: 'Initial screening',
    detail: 'CEDA reviewers check eligibility and supporting attachments.',
  },
  {
    step: 3,
    title: 'Portal updates',
    detail: 'Follow review progress and respond to feedback requests in My submissions.',
  },
];

export const GENDER_OPTIONS = [
  'Male',
  'Female',
  'Non-binary',
  'Prefer not to say',
] as const;

/**
 * Live chat is available strictly 09:00 to 16:00 Monday to Friday (Africa/Gaborone, CAT).
 */
export function isLiveChatAvailableNow(now: Date = new Date()): boolean {
  try {
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Africa/Gaborone',
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const parts = formatter.formatToParts(now);
    const weekday = parts.find((p) => p.type === 'weekday')?.value || '';
    const hourStr = parts.find((p) => p.type === 'hour')?.value || '0';
    const minuteStr = parts.find((p) => p.type === 'minute')?.value || '0';
    const hour = Number(hourStr);
    const minute = Number(minuteStr);

    const isWeekday = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].includes(weekday);
    if (!isWeekday) return false;

    const totalMinutes = hour * 60 + minute;
    const startMinutes = SUBMITTER_SUPPORT_CONFIG.chatStartHour * 60;
    const endMinutes = SUBMITTER_SUPPORT_CONFIG.chatEndHour * 60;

    return totalMinutes >= startMinutes && totalMinutes < endMinutes;
  } catch {
    return false;
  }
}

export interface SubmissionStatusMeta {
  key: string;
  label: string;
  icon: string;
  pillClasses: string;
  dotColorClass: string;
}

export const SUBMISSION_STATUS_MAP: Record<string, SubmissionStatusMeta> = {
  draft: {
    key: 'draft',
    label: 'Draft',
    icon: 'edit_note',
    pillClasses: 'bg-[#f1ede8] text-[#4a3b36] border-[#d8cec6]',
    dotColorClass: 'bg-[#8d706b]',
  },
  submitted: {
    key: 'submitted',
    label: 'Submitted',
    icon: 'task_alt',
    pillClasses: 'bg-[#f7f3ee] text-[#38231d] border-[#e2bfb8]',
    dotColorClass: 'bg-[#7c0700]',
  },
  under_review: {
    key: 'under_review',
    label: 'Under review',
    icon: 'schedule',
    pillClasses: 'bg-[#fdf1eb] text-[#7c3515] border-[#edc7b7]',
    dotColorClass: 'bg-[#a02010]',
  },
  feedback_requested: {
    key: 'feedback_requested',
    label: 'Feedback requested',
    icon: 'chat_bubble_outline',
    pillClasses: 'bg-[#fde9e4] text-[#8f1c0e] border-[#f0beb4]',
    dotColorClass: 'bg-[#a02010]',
  },
  approved: {
    key: 'approved',
    label: 'Approved',
    icon: 'check_circle_outline',
    pillClasses: 'bg-[#eef6ee] text-[#1f5c2e] border-[#c4dfc9]',
    dotColorClass: 'bg-[#2e7d32]',
  },
  awarded: {
    key: 'awarded',
    label: 'Awarded',
    icon: 'workspace_premium',
    pillClasses: 'bg-[#eef6ee] text-[#1f5c2e] border-[#c4dfc9]',
    dotColorClass: 'bg-[#2e7d32]',
  },
  declined: {
    key: 'declined',
    label: 'Declined',
    icon: 'cancel',
    pillClasses: 'bg-[#f9e7e7] text-[#9b1c1c] border-[#ecc2c2]',
    dotColorClass: 'bg-[#ba1a1a]',
  },
};

export const NEUTRAL_STATUS_FALLBACK: SubmissionStatusMeta = {
  key: 'unknown',
  label: 'Status pending',
  icon: 'label',
  pillClasses: 'bg-[#f3f2ef] text-[#4b4742] border-[#dcd8d0]',
  dotColorClass: 'bg-[#7a746e]',
};

export function getSubmissionStatusMeta(rawStatus: string): SubmissionStatusMeta {
  const normalized = String(rawStatus || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
  if (SUBMISSION_STATUS_MAP[normalized]) {
    return SUBMISSION_STATUS_MAP[normalized];
  }
  const readable = normalized
    ? normalized.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    : NEUTRAL_STATUS_FALLBACK.label;
  return {
    ...NEUTRAL_STATUS_FALLBACK,
    key: normalized || 'unknown',
    label: readable,
  };
}

export interface SubmissionStageRule {
  label: (stageStep: number, currentStep?: number) => string;
  textClass: string;
  activeDotClass: string;
  halted?: boolean;
}

export const SUBMISSION_STAGE_MAP: Record<string, SubmissionStageRule> = {
  draft: {
    label: (_stageStep, currentStep = 1) =>
      `Drafting, step ${Math.max(1, Math.min(4, currentStep))} of 4`,
    textClass: 'text-[#6b4f47]',
    activeDotClass: 'bg-[#a4938c]',
  },
  submitted: {
    label: () => 'Submitted (Level 1)',
    textClass: 'text-[#38231d]',
    activeDotClass: 'bg-[#7c0700]',
  },
  under_review: {
    label: (stageStep) => `Review (Level ${Math.max(1, Math.min(5, stageStep))})`,
    textClass: 'text-[#38231d]',
    activeDotClass: 'bg-[#7c0700]',
  },
  feedback_requested: {
    label: () => 'Feedback requested',
    textClass: 'text-[#8f1c0e]',
    activeDotClass: 'bg-[#a02010]',
  },
  approved: {
    label: () => 'Award pending',
    textClass: 'text-[#38231d]',
    activeDotClass: 'bg-[#7c0700]',
  },
  awarded: {
    label: () => 'Awarded',
    textClass: 'text-[#1f5c2e]',
    activeDotClass: 'bg-[#2e7d32]',
  },
  declined: {
    label: () => 'Review, halted',
    textClass: 'text-[#9b1c1c]',
    activeDotClass: 'bg-[#a02010]',
    halted: true,
  },
};

export interface SubmissionStageMeta {
  label: string;
  textClass: string;
  activeDotClass: string;
  completedDots: number;
  haltedDotIndex: number | null; // 1-indexed dot where X appears when declined
}

export function getSubmissionStageMeta(params: {
  status: string;
  stageStep: number;
  currentStep?: number;
}): SubmissionStageMeta {
  const normalized = String(params.status || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
  const clampedStage = Math.max(1, Math.min(5, Math.round(params.stageStep || 1)));
  const rule = SUBMISSION_STAGE_MAP[normalized];

  if (!rule) {
    return {
      label: `Stage ${clampedStage} of 5`,
      textClass: 'text-[#5a413c]',
      activeDotClass: 'bg-[#7a746e]',
      completedDots: clampedStage,
      haltedDotIndex: null,
    };
  }

  if (normalized === 'draft') {
    return {
      label: rule.label(clampedStage, params.currentStep),
      textClass: rule.textClass,
      activeDotClass: rule.activeDotClass,
      completedDots: 1,
      haltedDotIndex: null,
    };
  }

  if (rule.halted) {
    const haltedIndex = Math.max(2, Math.min(5, clampedStage));
    return {
      label: rule.label(clampedStage, params.currentStep),
      textClass: rule.textClass,
      activeDotClass: rule.activeDotClass,
      completedDots: haltedIndex - 1,
      haltedDotIndex: haltedIndex,
    };
  }

  return {
    label: rule.label(clampedStage, params.currentStep),
    textClass: rule.textClass,
    activeDotClass: rule.activeDotClass,
    completedDots:
      normalized === 'approved'
        ? Math.max(4, clampedStage)
        : normalized === 'awarded'
        ? 5
        : clampedStage,
    haltedDotIndex: null,
  };
}

