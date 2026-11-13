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

export const STATUTORY_DECLARATION_TEXT =
  'I declare that I am a citizen of the Republic of Botswana, or an authorised representative of a 100% citizen-owned entity registered in Botswana, and that all identity, contact, location, and enterprise details supplied in this submission are true, accurate, and complete. I acknowledge that my personal data is processed strictly for CEDA innovation evaluation under the Botswana Data Protection Act (BDPA) and that misrepresentation may disqualify the application.';

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
