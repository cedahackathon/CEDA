/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import { DEFAULT_OPEN_CALL, OpenCallData } from '../data/submitterMock';

export type IdeaStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'feedback_requested'
  | 'approved'
  | 'awarded'
  | 'declined';

export interface SubmitterIdea {
  id: string;
  submitterId: string;
  title: string;
  reference: string;
  sector: string;
  location: string;
  status: IdeaStatus;
  stageStep: number; // 1..5
  requestedAmountBwp: number | null;
  dayInStage: number;
  feedbackDeadlineIso: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SubmitterNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  read: boolean;
  ideaId?: string;
  route: string;
  createdAt: string;
}

export interface SubmitterStats {
  totalIdeas: number;
  underReview: number;
  feedbackRequested: number;
  approved: number;
}

function normalizeTimestamp(val: unknown): string {
  if (!val) return '';
  if (typeof val === 'string') return val.trim();
  if (
    typeof val === 'object' &&
    val !== null &&
    'toDate' in val &&
    typeof (val as { toDate: () => Date }).toDate === 'function'
  ) {
    return (val as { toDate: () => Date }).toDate().toISOString();
  }
  return String(val);
}

function normalizeIdeaStatus(rawStatus: unknown): IdeaStatus {
  const s = String(rawStatus || 'submitted')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
  if (s === 'feedback_requested' || s === 'feedback_ready' || s === 'needs_feedback') {
    return 'feedback_requested';
  }
  if (s === 'under_review' || s === 'in_review' || s === 'review') {
    return 'under_review';
  }
  if (s === 'approved') return 'approved';
  if (s === 'awarded') return 'awarded';
  if (s === 'declined' || s === 'rejected') return 'declined';
  if (s === 'draft') return 'draft';
  return 'submitted';
}

function inferStageStep(rawStage: unknown, status: IdeaStatus): number {
  const num = Number(rawStage);
  if (!Number.isNaN(num) && num >= 1 && num <= 5) {
    return Math.round(num);
  }
  if (typeof rawStage === 'string') {
    const lower = rawStage.trim().toLowerCase();
    if (lower.includes('award')) return 5;
    if (lower.includes('approv')) return 4;
    if (lower.includes('feedback')) return 3;
    if (lower.includes('review')) return 2;
    if (lower.includes('submi')) return 1;
  }
  if (status === 'awarded') return 5;
  if (status === 'approved') return 4;
  if (status === 'feedback_requested') return 3;
  if (status === 'under_review') return 2;
  return 1;
}

function computeDayInStage(updatedAtIso: string, createdAtIso: string, rawDay: unknown): number {
  const explicit = Number(rawDay);
  if (!Number.isNaN(explicit) && explicit >= 1) {
    return Math.min(14, Math.round(explicit));
  }
  const refIso = updatedAtIso || createdAtIso;
  if (!refIso) return 1;
  const ms = new Date(refIso).getTime();
  if (Number.isNaN(ms)) return 1;
  const elapsedDays = Math.floor((Date.now() - ms) / 86400000) + 1;
  return Math.min(14, Math.max(1, elapsedDays));
}

export function formatPulaAmount(amount: number): string {
  const formatted = amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `P ${formatted}`;
}

export function formatDateDDMonYYYY(iso: string | null | undefined): string {
  if (!iso) return 'Not specified';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Not specified';
  return date.toLocaleDateString('en-GB', {
    timeZone: 'Africa/Gaborone',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTimeCAT(iso: string | null | undefined): string {
  if (!iso) return 'Just now';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Just now';
  const datePart = formatDateDDMonYYYY(iso);
  const timePart = date.toLocaleTimeString('en-GB', {
    timeZone: 'Africa/Gaborone',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return `${datePart}, ${timePart} CAT`;
}

export function getDaysRemaining(targetIso: string): number {
  const target = new Date(targetIso).getTime();
  if (Number.isNaN(target)) return 0;
  const diff = Math.ceil((target - Date.now()) / 86400000);
  return Math.max(0, diff);
}

export function computeSubmitterStats(ideas: SubmitterIdea[]): SubmitterStats {
  const totalIdeas = ideas.length;
  const underReview = ideas.filter(
    (idea) => idea.status === 'under_review' || idea.status === 'submitted'
  ).length;
  const feedbackRequested = ideas.filter((idea) => idea.status === 'feedback_requested').length;
  const approved = ideas.filter(
    (idea) => idea.status === 'approved' || idea.status === 'awarded'
  ).length;

  return {
    totalIdeas,
    underReview,
    feedbackRequested,
    approved,
  };
}

export async function fetchSubmitterIdeas(uid: string): Promise<SubmitterIdea[]> {
  if (!db) {
    throw new Error('Firestore is not initialized.');
  }
  if (!uid) return [];

  const q = query(collection(db, 'ideas'), where('submitterId', '==', uid));
  const snap = await getDocs(q);
  const list: SubmitterIdea[] = [];

  snap.forEach((docSnap) => {
    const raw = docSnap.data() as Record<string, unknown>;
    const status = normalizeIdeaStatus(raw.status);
    const createdAt = normalizeTimestamp(raw.createdAt);
    const updatedAt = normalizeTimestamp(raw.updatedAt) || createdAt;
    const district = typeof raw.district === 'string' ? raw.district.trim() : '';
    const town = typeof raw.town === 'string' ? raw.town.trim() : '';
    const explicitLoc = typeof raw.location === 'string' ? raw.location.trim() : '';
    const location = explicitLoc || [town, district].filter(Boolean).join(', ') || 'Botswana';
    const rawAmount = Number(raw.requestedAmountBwp ?? raw.requestedCapital ?? raw.fundingRequested);

    list.push({
      id: docSnap.id,
      submitterId: String(raw.submitterId || uid),
      title:
        (typeof raw.title === 'string' && raw.title.trim()) ||
        (typeof raw.ideaTitle === 'string' && raw.ideaTitle.trim()) ||
        'Untitled innovation proposal',
      reference:
        (typeof raw.reference === 'string' && raw.reference.trim()) ||
        (typeof raw.trackingCode === 'string' && raw.trackingCode.trim()) ||
        docSnap.id.slice(0, 12).toUpperCase(),
      sector: (typeof raw.sector === 'string' && raw.sector.trim()) || 'General Innovation',
      location,
      status,
      stageStep: inferStageStep(raw.currentStage ?? raw.stage, status),
      requestedAmountBwp: !Number.isNaN(rawAmount) && rawAmount > 0 ? rawAmount : null,
      dayInStage: computeDayInStage(updatedAt, createdAt, raw.dayInStage),
      feedbackDeadlineIso: normalizeTimestamp(raw.feedbackDeadline || raw.slaDeadline) || null,
      createdAt,
      updatedAt,
    });
  });

  list.sort((a, b) => {
    const timeA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
    const timeB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
    return (Number.isNaN(timeB) ? 0 : timeB) - (Number.isNaN(timeA) ? 0 : timeA);
  });

  return list;
}

export async function fetchSubmitterNotifications(uid: string): Promise<SubmitterNotification[]> {
  if (!db || !uid) return [];
  try {
    const q = query(collection(db, 'notifications'), where('userId', '==', uid));
    const snap = await getDocs(q);
    const items: SubmitterNotification[] = [];

    snap.forEach((docSnap) => {
      const raw = docSnap.data() as Record<string, unknown>;
      const ideaId = typeof raw.ideaId === 'string' ? raw.ideaId : undefined;
      items.push({
        id: docSnap.id,
        userId: String(raw.userId || uid),
        title: (typeof raw.title === 'string' && raw.title.trim()) || 'Portal update',
        message:
          (typeof raw.message === 'string' && raw.message.trim()) ||
          (typeof raw.body === 'string' && raw.body.trim()) ||
          'Your submission status was updated.',
        read: Boolean(raw.read ?? raw.isRead),
        ideaId,
        route:
          (typeof raw.route === 'string' && raw.route.trim()) ||
          (ideaId ? `/submissions/${ideaId}` : '/notifications'),
        createdAt: normalizeTimestamp(raw.createdAt || raw.timestamp),
      });
    });

    items.sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return (Number.isNaN(timeB) ? 0 : timeB) - (Number.isNaN(timeA) ? 0 : timeA);
    });

    return items;
  } catch (err) {
    console.warn('Submitter notifications query note:', err);
    return [];
  }
}

export async function fetchOpenCall(): Promise<OpenCallData> {
  if (!db) return DEFAULT_OPEN_CALL;
  try {
    const snap = await getDocs(collection(db, 'calls'));
    if (snap.empty) return DEFAULT_OPEN_CALL;

    const docs: Array<Record<string, unknown> & { id: string }> = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Record<string, unknown>),
    }));
    const openDoc =
      docs.find((d) => String(d.status || 'open').toLowerCase() === 'open') || docs[0];
    if (!openDoc) return DEFAULT_OPEN_CALL;

    const rawFunding = Number(
      openDoc.fundingMaxBwp ?? openDoc.maxFunding ?? openDoc.fundingPool ?? DEFAULT_OPEN_CALL.fundingMaxBwp
    );

    return {
      id: openDoc.id,
      badgeLabel:
        (typeof openDoc.badgeLabel === 'string' && openDoc.badgeLabel.trim()) ||
        DEFAULT_OPEN_CALL.badgeLabel,
      title:
        (typeof openDoc.title === 'string' && openDoc.title.trim()) || DEFAULT_OPEN_CALL.title,
      sponsor:
        (typeof openDoc.sponsor === 'string' && openDoc.sponsor.trim()) ||
        (typeof openDoc.subtitle === 'string' && openDoc.subtitle.trim()) ||
        DEFAULT_OPEN_CALL.sponsor,
      fundingMaxBwp: !Number.isNaN(rawFunding) && rawFunding > 0 ? rawFunding : DEFAULT_OPEN_CALL.fundingMaxBwp,
      fundingSplitLabel:
        (typeof openDoc.fundingSplitLabel === 'string' && openDoc.fundingSplitLabel.trim()) ||
        DEFAULT_OPEN_CALL.fundingSplitLabel,
      closingDateIso:
        normalizeTimestamp(openDoc.closingDate || openDoc.closesAt) ||
        DEFAULT_OPEN_CALL.closingDateIso,
      guidelinesRoute:
        (typeof openDoc.guidelinesRoute === 'string' && openDoc.guidelinesRoute.trim()) ||
        DEFAULT_OPEN_CALL.guidelinesRoute,
    };
  } catch {
    return DEFAULT_OPEN_CALL;
  }
}
