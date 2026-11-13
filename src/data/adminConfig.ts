/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { firebaseConfig } from '../config/firebase';

export type AdminRoutePath =
  | '/admin'
  | '/admin/content'
  | '/admin/criteria'
  | '/admin/workflow'
  | '/admin/users'
  | '/admin/evaluator-assignment'
  | '/admin/audit-trail'
  | '/admin/chat-console'
  | '/admin/chat-analytics'
  | '/admin/reports'
  | '/admin/system';

export interface AdminNavItem {
  id: string;
  label: string;
  labelSetswana: string;
  path: AdminRoutePath;
  icon: string;
  description: string;
}

export interface StageDefinition {
  id: 'submission' | 'review' | 'feedback' | 'approval' | 'award';
  stepNumber: number;
  label: string;
  labelSetswana: string;
  route: AdminRoutePath;
}

export interface StageMetric extends StageDefinition {
  count: number;
  overdueCount: number;
}

export interface AttentionItem {
  id: string;
  icon: string;
  tone: 'danger' | 'warning' | 'neutral';
  text: string;
  actionLabel: string;
  route: AdminRoutePath;
}

export interface QuickActionItem {
  id: string;
  label: string;
  icon: string;
  route: AdminRoutePath;
}

export interface ActivityLogItem {
  id: string;
  icon: string;
  tone: 'success' | 'warning' | 'neutral';
  text: string;
  timestamp: string;
  route: AdminRoutePath;
}

export interface SystemStatusData {
  operational: boolean;
  label: string;
  projectId: string;
  lastSyncedAt: string | null;
  error?: string | null;
}

export interface AdminDashboardData {
  totalSubmissions: number;
  registeredUsers: number;
  stages: StageMetric[];
  attentionItems: AttentionItem[];
  systemStatus: SystemStatusData;
  recentActivity: ActivityLogItem[];
}

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    labelSetswana: 'Botlhalo jwa Tsamaiso',
    path: '/admin',
    icon: 'grid_view',
    description: 'Programme health at a glance across all Botswana innovation cohorts.',
  },
  {
    id: 'content',
    label: 'Content management',
    labelSetswana: 'Tsamaiso ya Diteng',
    path: '/admin/content',
    icon: 'article',
    description: 'Manage portal announcements, intake forms, and applicant guidance.',
  },
  {
    id: 'criteria',
    label: 'Evaluation criteria',
    labelSetswana: 'Mekgwa ya Tshekatsheko',
    path: '/admin/criteria',
    icon: 'tune',
    description: 'Configure weighted scorecards, rubrics, and sector evaluation thresholds.',
  },
  {
    id: 'workflow',
    label: 'Workflow',
    labelSetswana: 'Tsamaiso ya Tiro',
    path: '/admin/workflow',
    icon: 'account_tree',
    description: 'Review SLA clocks, stage transitions, and overdue evaluation escalations.',
  },
  {
    id: 'users',
    label: 'Users and roles',
    labelSetswana: 'Badirisi le Maemo',
    path: '/admin/users',
    icon: 'group',
    description: 'Approve pending citizen innovator accounts and manage staff permissions.',
  },
  {
    id: 'evaluator-assignment',
    label: 'Evaluator assignment',
    labelSetswana: 'Kabelo ya Basekaseki',
    path: '/admin/evaluator-assignment',
    icon: 'assignment_ind',
    description: 'Assign accredited sector evaluators and resolve conflict-of-interest flags.',
  },
  {
    id: 'audit-trail',
    label: 'Audit trail',
    labelSetswana: 'Motlhala wa Tshekatsheko',
    path: '/admin/audit-trail',
    icon: 'history',
    description: 'Inspect tamper-evident security logs, sign-ins, and statutory changes.',
  },
  {
    id: 'chat-console',
    label: 'Chat console',
    labelSetswana: 'Puisano ya Thuso',
    path: '/admin/chat-console',
    icon: 'chat',
    description: 'Monitor live citizen support desks and manage online agent coverage.',
  },
  {
    id: 'chat-analytics',
    label: 'Chat analytics',
    labelSetswana: 'Tshekatsheko ya Puisano',
    path: '/admin/chat-analytics',
    icon: 'show_chart',
    description: 'Track response times, desk resolution rates, and Setswana/English volume.',
  },
  {
    id: 'reports',
    label: 'Reports and analytics',
    labelSetswana: 'Dipegelo le Dipalopalo',
    path: '/admin/reports',
    icon: 'bar_chart',
    description: 'Generate cohort funnel summaries, district breakdowns, and board reports.',
  },
  {
    id: 'system',
    label: 'System and hosting',
    labelSetswana: 'Thulaganyo le Bobolokelo',
    path: '/admin/system',
    icon: 'dns',
    description: 'Monitor uptime, automated backups, and compliance infrastructure.',
  },
];

export const ADMIN_STAGE_DEFINITIONS: StageDefinition[] = [
  {
    id: 'submission',
    stepNumber: 1,
    label: 'Submission',
    labelSetswana: 'Kopo',
    route: '/admin/workflow',
  },
  {
    id: 'review',
    stepNumber: 2,
    label: 'Review',
    labelSetswana: 'Tshekatsheko',
    route: '/admin/evaluator-assignment',
  },
  {
    id: 'feedback',
    stepNumber: 3,
    label: 'Feedback',
    labelSetswana: 'Ditshwaelo',
    route: '/admin/workflow',
  },
  {
    id: 'approval',
    stepNumber: 4,
    label: 'Approval',
    labelSetswana: 'Kamogelo',
    route: '/admin/workflow',
  },
  {
    id: 'award',
    stepNumber: 5,
    label: 'Award',
    labelSetswana: 'Kabelo',
    route: '/admin/reports',
  },
];

export const ADMIN_QUICK_ACTIONS: QuickActionItem[] = [
  {
    id: 'qa-add-user',
    label: 'Add user',
    icon: 'person_add',
    route: '/admin/users',
  },
  {
    id: 'qa-assign-evaluators',
    label: 'Assign evaluators',
    icon: 'assignment_ind',
    route: '/admin/evaluator-assignment',
  },
  {
    id: 'qa-edit-criteria',
    label: 'Edit criteria',
    icon: 'tune',
    route: '/admin/criteria',
  },
  {
    id: 'qa-upload-form',
    label: 'Upload form',
    icon: 'upload_file',
    route: '/admin/content',
  },
];

export const EMPTY_ADMIN_DATA: AdminDashboardData = {
  totalSubmissions: 0,
  registeredUsers: 0,
  stages: ADMIN_STAGE_DEFINITIONS.map((stage) => ({
    ...stage,
    count: 0,
    overdueCount: 0,
  })),
  attentionItems: [],
  systemStatus: {
    operational: true,
    label: 'All systems operational',
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || firebaseConfig.projectId || 'ceda-innovation-portal',
    lastSyncedAt: null,
    error: null,
  },
  recentActivity: [],
};

export const ADMIN_ROLE_ORDER: Array<'SUBMITTER' | 'EVALUATOR' | 'ADJUDICATOR' | 'ADMIN' | 'STAKEHOLDER'> = [
  'SUBMITTER',
  'EVALUATOR',
  'ADJUDICATOR',
  'ADMIN',
  'STAKEHOLDER',
];

export const ADMIN_ROLE_LABELS: Record<'SUBMITTER' | 'EVALUATOR' | 'ADJUDICATOR' | 'ADMIN' | 'STAKEHOLDER', string> = {
  SUBMITTER: 'Submitter',
  EVALUATOR: 'Evaluator',
  ADJUDICATOR: 'Adjudicator',
  ADMIN: 'Administrator',
  STAKEHOLDER: 'Committee Stakeholder',
};

export const ADMIN_ROLE_CHANGE_NOTES: Record<'SUBMITTER' | 'EVALUATOR' | 'ADJUDICATOR' | 'ADMIN' | 'STAKEHOLDER', string> = {
  SUBMITTER: 'Grants access to submit innovation proposals and track personal application feedback.',
  EVALUATOR: 'Grants access to review assigned submissions, submit blinded scores, and send feedback.',
  ADJUDICATOR: 'Grants access to view all submissions, approve recommendations, and record funding decisions.',
  ADMIN: 'Grants full administrative access to users, roles, workflow settings, content, and audit logs.',
  STAKEHOLDER: 'Grants read-only oversight of programme reports, analytics, and ecosystem metrics.',
};

export interface PermissionMatrixRow {
  id: string;
  label: string;
  roles: Record<'SUBMITTER' | 'EVALUATOR' | 'ADJUDICATOR' | 'ADMIN' | 'STAKEHOLDER', boolean>;
}

export const ROLE_PERMISSIONS_MATRIX: PermissionMatrixRow[] = [
  {
    id: 'submit_ideas',
    label: 'Submit ideas',
    roles: { SUBMITTER: true, EVALUATOR: false, ADJUDICATOR: false, ADMIN: true, STAKEHOLDER: false },
  },
  {
    id: 'view_own_submissions',
    label: 'View own submissions',
    roles: { SUBMITTER: true, EVALUATOR: false, ADJUDICATOR: false, ADMIN: true, STAKEHOLDER: false },
  },
  {
    id: 'view_all_submissions',
    label: 'View all submissions',
    roles: { SUBMITTER: false, EVALUATOR: true, ADJUDICATOR: true, ADMIN: true, STAKEHOLDER: true },
  },
  {
    id: 'score_ideas',
    label: 'Score ideas',
    roles: { SUBMITTER: false, EVALUATOR: true, ADJUDICATOR: false, ADMIN: true, STAKEHOLDER: false },
  },
  {
    id: 'send_feedback',
    label: 'Send feedback',
    roles: { SUBMITTER: false, EVALUATOR: true, ADJUDICATOR: true, ADMIN: true, STAKEHOLDER: false },
  },
  {
    id: 'make_decisions',
    label: 'Make decisions',
    roles: { SUBMITTER: false, EVALUATOR: false, ADJUDICATOR: true, ADMIN: true, STAKEHOLDER: false },
  },
  {
    id: 'manage_content',
    label: 'Manage content',
    roles: { SUBMITTER: false, EVALUATOR: false, ADJUDICATOR: false, ADMIN: true, STAKEHOLDER: false },
  },
  {
    id: 'manage_users',
    label: 'Manage users',
    roles: { SUBMITTER: false, EVALUATOR: false, ADJUDICATOR: false, ADMIN: true, STAKEHOLDER: false },
  },
  {
    id: 'view_audit_trail',
    label: 'View audit trail',
    roles: { SUBMITTER: false, EVALUATOR: false, ADJUDICATOR: true, ADMIN: true, STAKEHOLDER: true },
  },
  {
    id: 'view_reports',
    label: 'View reports',
    roles: { SUBMITTER: false, EVALUATOR: false, ADJUDICATOR: true, ADMIN: true, STAKEHOLDER: true },
  },
];

export interface DerivedAdminMetrics {
  totalSubmissions: number;
  activeSubmissions: number;
  inEvaluation: number;
  overdueReviews: number;
  registeredUsers: number;
  maxStageCount: number;
  isEmpty: boolean;
}

export function deriveAdminMetrics(data: AdminDashboardData): DerivedAdminMetrics {
  const activeSubmissions = data.stages.reduce((sum, stage) => sum + stage.count, 0);
  const reviewStage = data.stages.find((stage) => stage.id === 'review');
  const inEvaluation = reviewStage ? reviewStage.count : 0;
  const overdueReviews = data.stages.reduce((sum, stage) => sum + stage.overdueCount, 0);
  const maxStageCount = Math.max(...data.stages.map((stage) => stage.count), 1);
  const isEmpty = data.totalSubmissions === 0 && activeSubmissions === 0;

  return {
    totalSubmissions: data.totalSubmissions,
    activeSubmissions,
    inEvaluation,
    overdueReviews,
    registeredUsers: data.registeredUsers,
    maxStageCount,
    isEmpty,
  };
}
