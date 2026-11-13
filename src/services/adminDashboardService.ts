/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore';
import { db, firebaseConfig } from '../config/firebase';
import {
  ADMIN_STAGE_DEFINITIONS,
  ActivityLogItem,
  AdminDashboardData,
  AttentionItem,
  EMPTY_ADMIN_DATA,
  StageMetric,
} from '../data/adminConfig';

interface FirestoreSubmissionDoc {
  currentStage?: number;
  status?: string;
  slaDeadline?: string;
  evaluatorId?: string;
  assignedEvaluatorIds?: string[];
}

interface FirestoreUserDoc {
  status?: string;
}

interface FirestoreAuditDoc {
  id?: string;
  timestamp?: string;
  actorName?: string;
  event?: string;
  details?: string;
}

function formatActivityTimestamp(iso?: string): string {
  if (!iso) return 'Just now';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;

  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin >= 0 && diffMin < 1) return 'Just now';
  if (diffMin >= 1 && diffMin < 60) return `${diffMin} min ago`;

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours >= 1 && diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;

  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function mapAuditTone(event?: string): 'success' | 'warning' | 'neutral' {
  const lower = (event || '').toLowerCase();
  if (lower.includes('fail') || lower.includes('lock') || lower.includes('error')) {
    return 'warning';
  }
  if (lower.includes('submit') || lower.includes('approve') || lower.includes('verify')) {
    return 'success';
  }
  return 'neutral';
}

function mapAuditIcon(event?: string): string {
  const lower = (event || '').toLowerCase();
  if (lower.includes('fail') || lower.includes('lock')) return 'warning';
  if (lower.includes('login') || lower.includes('sign')) return 'login';
  if (lower.includes('submit') || lower.includes('eval')) return 'check_circle';
  return 'description';
}

export async function fetchAdminDashboardData(): Promise<AdminDashboardData> {
  if (!db) {
    return {
      ...EMPTY_ADMIN_DATA,
      systemStatus: {
        operational: false,
        label: 'Database unavailable',
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || firebaseConfig.projectId || 'ceda-innovation-portal',
        lastSyncedAt: null,
        error: 'Firestore is not initialized.',
      },
    };
  }

  const now = new Date();
  const stageCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let totalSubmissions = 0;
  let overdueReviews = 0;
  let unassignedInReview = 0;
  let registeredUsers = 0;
  let pendingAccounts = 0;
  let recentActivity: ActivityLogItem[] = [];
  let hasConnectionIssue = false;

  const [submissionsRes, usersRes, auditRes] = await Promise.allSettled([
    getDocs(collection(db, 'submissions')),
    getDocs(collection(db, 'users')),
    getDocs(query(collection(db, 'audit_logs'), orderBy('timestamp', 'desc'), limit(5))),
  ]);

  if (submissionsRes.status === 'fulfilled') {
    totalSubmissions = submissionsRes.value.size;
    submissionsRes.value.forEach((docSnap) => {
      const sub = docSnap.data() as FirestoreSubmissionDoc;
      const stageNum = Number(sub.currentStage);
      if (stageNum >= 1 && stageNum <= 5) {
        stageCounts[stageNum] = (stageCounts[stageNum] || 0) + 1;
      }

      if (stageNum === 2) {
        if (sub.slaDeadline) {
          const deadline = new Date(sub.slaDeadline);
          if (!Number.isNaN(deadline.getTime()) && deadline < now) {
            overdueReviews += 1;
          }
        }
        const hasEvaluator =
          Boolean(sub.evaluatorId) ||
          (Array.isArray(sub.assignedEvaluatorIds) && sub.assignedEvaluatorIds.length > 0);
        if (!hasEvaluator) {
          unassignedInReview += 1;
        }
      }
    });
  } else {
    hasConnectionIssue = true;
  }

  if (usersRes.status === 'fulfilled') {
    registeredUsers = usersRes.value.size;
    usersRes.value.forEach((docSnap) => {
      const u = docSnap.data() as FirestoreUserDoc;
      if (u.status === 'PENDING') {
        pendingAccounts += 1;
      }
    });
  } else {
    hasConnectionIssue = true;
  }

  if (auditRes.status === 'fulfilled') {
    recentActivity = auditRes.value.docs.map((docSnap) => {
      const log = docSnap.data() as FirestoreAuditDoc;
      const actorPrefix = log.actorName ? `${log.actorName}: ` : '';
      const message = log.details || `${actorPrefix}${log.event || 'Audit event recorded'}`;
      return {
        id: docSnap.id,
        icon: mapAuditIcon(log.event),
        tone: mapAuditTone(log.event),
        text: message,
        timestamp: formatActivityTimestamp(log.timestamp),
        route: '/admin/audit-trail',
      };
    });
  }

  const stages: StageMetric[] = ADMIN_STAGE_DEFINITIONS.map((def) => ({
    ...def,
    count: stageCounts[def.stepNumber] || 0,
    overdueCount: def.stepNumber === 2 ? overdueReviews : 0,
  }));

  const attentionItems: AttentionItem[] = [];
  if (overdueReviews > 0) {
    attentionItems.push({
      id: 'overdue-reviews',
      icon: 'schedule',
      tone: 'danger',
      text: `${overdueReviews} ${overdueReviews === 1 ? 'review is' : 'reviews are'} past due date`,
      actionLabel: 'View',
      route: '/admin/workflow',
    });
  }
  if (unassignedInReview > 0) {
    attentionItems.push({
      id: 'unassigned-ideas',
      icon: 'person_off',
      tone: 'warning',
      text: `${unassignedInReview} ${unassignedInReview === 1 ? 'idea has' : 'ideas have'} no evaluators assigned`,
      actionLabel: 'Assign',
      route: '/admin/evaluator-assignment',
    });
  }
  if (pendingAccounts > 0) {
    attentionItems.push({
      id: 'pending-accounts',
      icon: 'manage_accounts',
      tone: 'neutral',
      text: `${pendingAccounts} ${pendingAccounts === 1 ? 'account is' : 'accounts are'} waiting for approval`,
      actionLabel: 'Review',
      route: '/admin/users',
    });
  }

  return {
    totalSubmissions,
    registeredUsers,
    stages,
    attentionItems,
    systemStatus: {
      operational: !hasConnectionIssue,
      label: hasConnectionIssue ? 'Limited database access' : 'All systems operational',
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || firebaseConfig.projectId || 'ceda-innovation-portal',
      lastSyncedAt: new Date().toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      error: hasConnectionIssue
        ? 'Sign in with a provisioned Firebase Admin account to query protected Firestore collections.'
        : null,
    },
    recentActivity,
  };
}
