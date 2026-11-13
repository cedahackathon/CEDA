/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { collection, doc, getDoc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { auth, db, firebaseConfig } from '../config/firebase';
import { DEFAULT_OPEN_CALL, OpenCallData } from '../data/submitterMock';
import { UserProfile } from '../types/auth';

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

const LOCAL_IDEAS_KEY = 'ceda_portal_submitter_ideas_v1';
const LOCAL_NOTIFICATIONS_KEY = 'ceda_portal_submitter_notifications_v1';

const DEFAULT_DEMO_IDEAS: SubmitterIdea[] = [
  {
    id: 'idea-sub-001',
    submitterId: 'user-sub-001',
    title: 'Solar-Powered Smart Grain Silos for Chobe Farmers',
    reference: 'CEDA-INN-2026-0842',
    sector: 'Agri-Tech & Food Security',
    location: 'Maun, North-West',
    status: 'under_review',
    stageStep: 2,
    requestedAmountBwp: 450000,
    dayInStage: 6,
    feedbackDeadlineIso: null,
    createdAt: '2026-02-18T09:15:00Z',
    updatedAt: '2026-03-01T14:30:00Z',
  },
];

const DEFAULT_DEMO_NOTIFICATIONS: SubmitterNotification[] = [
  {
    id: 'notif-sub-001',
    userId: 'user-sub-001',
    title: 'Stage 2 technical evaluation underway',
    message:
      'Dual-blind technical evaluators have been assigned to Solar-Powered Smart Grain Silos (CEDA-INN-2026-0842).',
    read: false,
    ideaId: 'idea-sub-001',
    route: '/submissions/idea-sub-001',
    createdAt: '2026-03-01T14:30:00Z',
  },
  {
    id: 'notif-sub-002',
    userId: 'user-sub-001',
    title: 'Proposal receipt confirmed',
    message:
      'Your proposal CEDA-INN-2026-0842 passed initial compliance screening and entered the 14-day review SLA.',
    read: true,
    ideaId: 'idea-sub-001',
    route: '/submissions/idea-sub-001',
    createdAt: '2026-02-19T10:05:00Z',
  },
  {
    id: 'notif-sub-003',
    userId: 'user-sub-001',
    title: 'National Agro-Tech Cohort open',
    message:
      'Additional matching advisory support is open for citizen-owned Agri-Tech proposals in North-West and Chobe.',
    read: true,
    route: '/guidelines',
    createdAt: '2026-02-15T08:00:00Z',
  },
];

function getLocalIdeasForUser(uid: string): SubmitterIdea[] {
  if (!uid) return [];
  try {
    const raw = localStorage.getItem(LOCAL_IDEAS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as SubmitterIdea[];
      if (Array.isArray(parsed)) {
        return parsed.filter((item) => item.submitterId === uid);
      }
    } else {
      localStorage.setItem(LOCAL_IDEAS_KEY, JSON.stringify(DEFAULT_DEMO_IDEAS));
    }
  } catch {
    // ignore storage errors
  }
  return DEFAULT_DEMO_IDEAS.filter((item) => item.submitterId === uid);
}

function getLocalNotificationsForUser(uid: string): SubmitterNotification[] {
  if (!uid) return [];
  try {
    const raw = localStorage.getItem(LOCAL_NOTIFICATIONS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as SubmitterNotification[];
      if (Array.isArray(parsed)) {
        return parsed.filter((item) => item.userId === uid);
      }
    } else {
      localStorage.setItem(LOCAL_NOTIFICATIONS_KEY, JSON.stringify(DEFAULT_DEMO_NOTIFICATIONS));
    }
  } catch {
    // ignore storage errors
  }
  return DEFAULT_DEMO_NOTIFICATIONS.filter((item) => item.userId === uid);
}

function canQueryFirestoreForUser(uid?: string): boolean {
  if (!db || firebaseConfig.apiKey.includes('MockKey')) return false;
  if (!auth?.currentUser) return false;
  if (uid && auth.currentUser.uid !== uid) return false;
  return true;
}

function logFirestorePermissionWarning(
  error: unknown,
  operationType: 'get' | 'list',
  path: string
): void {
  const currentAuthUser = auth?.currentUser;
  const rawMessage = error instanceof Error ? error.message : String(error);
  const errInfo = {
    error: rawMessage,
    operationType,
    path,
    authInfo: {
      userId: currentAuthUser?.uid ?? null,
      email: currentAuthUser?.email ?? null,
      emailVerified: currentAuthUser?.emailVerified ?? null,
      isAnonymous: currentAuthUser?.isAnonymous ?? null,
      tenantId: currentAuthUser?.tenantId ?? null,
      providerInfo:
        currentAuthUser?.providerData?.map(
          (provider: { providerId?: string | null; email?: string | null }) => ({
            providerId: provider.providerId,
            email: provider.email,
          })
        ) || [],
    },
  };
  console.warn('Firestore permission fallback active:', JSON.stringify(errInfo));
}

function mapDocToSubmitterIdea(
  docId: string,
  raw: Record<string, unknown>,
  uid: string
): SubmitterIdea {
  const status = normalizeIdeaStatus(raw.status);
  const createdAt = normalizeTimestamp(raw.createdAt);
  const updatedAt = normalizeTimestamp(raw.updatedAt) || createdAt;
  const district = typeof raw.district === 'string' ? raw.district.trim() : '';
  const town = typeof raw.town === 'string' ? raw.town.trim() : '';
  const explicitLoc = typeof raw.location === 'string' ? raw.location.trim() : '';
  const location = explicitLoc || [town, district].filter(Boolean).join(', ') || 'Botswana';
  const rawAmount = Number(raw.requestedAmountBwp ?? raw.requestedCapital ?? raw.fundingRequested);

  return {
    id: docId,
    submitterId: String(raw.submitterId || uid),
    title:
      (typeof raw.title === 'string' && raw.title.trim()) ||
      (typeof raw.ideaTitle === 'string' && raw.ideaTitle.trim()) ||
      'Untitled innovation proposal',
    reference:
      (typeof raw.reference === 'string' && raw.reference.trim()) ||
      (typeof raw.trackingCode === 'string' && raw.trackingCode.trim()) ||
      docId.slice(0, 12).toUpperCase(),
    sector: (typeof raw.sector === 'string' && raw.sector.trim()) || 'General Innovation',
    location,
    status,
    stageStep: inferStageStep(raw.currentStage ?? raw.stage, status),
    requestedAmountBwp: !Number.isNaN(rawAmount) && rawAmount > 0 ? rawAmount : null,
    dayInStage: computeDayInStage(updatedAt, createdAt, raw.dayInStage),
    feedbackDeadlineIso: normalizeTimestamp(raw.feedbackDeadline || raw.slaDeadline) || null,
    createdAt,
    updatedAt,
  };
}

function isPermissionDeniedError(err: unknown): boolean {
  const code = (err as { code?: string })?.code || '';
  const msg = err instanceof Error ? err.message : String(err);
  return (
    code === 'permission-denied' ||
    msg.toLowerCase().includes('missing or insufficient permissions')
  );
}

export async function fetchSubmitterIdeas(uid: string): Promise<SubmitterIdea[]> {
  if (!uid) return [];

  if (!canQueryFirestoreForUser(uid)) {
    return getLocalIdeasForUser(uid);
  }

  const list: SubmitterIdea[] = [];
  let ideasSucceeded = false;

  try {
    const ideasSnap = await getDocs(
      query(collection(db, 'ideas'), where('submitterId', '==', uid))
    );
    ideasSucceeded = true;
    ideasSnap.forEach((docSnap) => {
      list.push(mapDocToSubmitterIdea(docSnap.id, docSnap.data() as Record<string, unknown>, uid));
    });
  } catch (err) {
    if (isPermissionDeniedError(err)) {
      logFirestorePermissionWarning(err, 'list', 'ideas');
    } else {
      throw err instanceof Error ? err : new Error(String(err));
    }
  }

  // Fallback / supplement from blueprint `submissions` collection if `ideas` is empty or denied
  if (list.length === 0) {
    try {
      const subsSnap = await getDocs(
        query(collection(db, 'submissions'), where('submitterId', '==', uid))
      );
      subsSnap.forEach((docSnap) => {
        list.push(
          mapDocToSubmitterIdea(docSnap.id, docSnap.data() as Record<string, unknown>, uid)
        );
      });
      ideasSucceeded = true;
    } catch (subErr) {
      if (isPermissionDeniedError(subErr)) {
        logFirestorePermissionWarning(subErr, 'list', 'submissions');
        if (!ideasSucceeded) {
          return getLocalIdeasForUser(uid);
        }
      } else if (!ideasSucceeded) {
        throw subErr instanceof Error ? subErr : new Error(String(subErr));
      }
    }
  }

  list.sort((a, b) => {
    const timeA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
    const timeB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
    return (Number.isNaN(timeB) ? 0 : timeB) - (Number.isNaN(timeA) ? 0 : timeA);
  });

  return list;
}

export async function fetchSubmitterNotifications(uid: string): Promise<SubmitterNotification[]> {
  if (!uid) return [];
  if (!canQueryFirestoreForUser(uid)) {
    return getLocalNotificationsForUser(uid);
  }
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
    return getLocalNotificationsForUser(uid);
  }
}

export async function fetchOpenCall(): Promise<OpenCallData> {
  if (!canQueryFirestoreForUser()) return DEFAULT_OPEN_CALL;
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

/* ============================================================================
 * SUBMISSION WIZARD — STEP 1 (APPLICANT DETAILS) & DRAFT PERSISTENCE
 * ============================================================================ */

export type WizardApplicantType = 'individual' | 'business';

export interface WizardTeamMember {
  name: string;
  role: string;
  phone: string;
}

export interface WizardBusinessDetails {
  tradingName: string;
  cipaNumber: string;
  tin: string;
}

export interface WizardApplicantDetails {
  type: WizardApplicantType;
  firstName: string;
  surname: string;
  omang: string; // Always masked when stored in draft or displayed post-save
  dateOfBirth: string;
  gender: string;
  email: string;
  phone: string;
  district: string;
  town: string;
  address: string;
  business: WizardBusinessDetails;
  team: WizardTeamMember[];
  declarationAccepted: boolean;
}

export interface IdeaDraft {
  id: string;
  submitterId: string;
  status: 'draft' | 'submitted';
  currentStep: number;
  applicant: WizardApplicantDetails;
  createdAt: string;
  updatedAt: string;
}

export interface ProfileIdentityUpdate {
  firstName?: string;
  surname?: string;
  omangOrPassport?: string;
  dob?: string;
  gender?: string;
  district?: string;
  town?: string;
  address?: string;
}

const LOCAL_DRAFTS_KEY = 'ceda_portal_idea_drafts_v1';
const LOCAL_USERS_KEY = 'ceda_portal_users_v1';

export function maskOmangLast3(rawOmang: string): string {
  const clean = (rawOmang || '').trim();
  if (!clean) return '';
  if (clean.includes('•') || clean.includes('*')) {
    const tail = clean.slice(-3);
    return `••••••${tail}`;
  }
  if (clean.length <= 3) return `••••••${clean}`;
  return `••••••${clean.slice(-3)}`;
}

export function isValidOmangDigits(rawOmang: string): boolean {
  return /^\d{9}$/.test((rawOmang || '').trim());
}

export function normalizeBotswanaPhoneInput(rawPhone: string): string {
  const digits = (rawPhone || '').replace(/\D/g, '');
  if (digits.startsWith('267') && digits.length >= 11) {
    return digits.slice(3, 11);
  }
  return digits.slice(0, 8);
}

export function isValidBotswanaMobile(rawPhone: string): boolean {
  const clean = normalizeBotswanaPhoneInput(rawPhone);
  return /^7\d{7}$/.test(clean);
}

export function formatBotswanaPhoneDisplay(rawPhone: string): string {
  const clean = normalizeBotswanaPhoneInput(rawPhone);
  if (clean.length === 8) {
    return `${clean.slice(0, 2)} ${clean.slice(2, 5)} ${clean.slice(5)}`;
  }
  return clean;
}

export function formatLongDateBotswana(isoDate: string): string {
  if (!isoDate) return 'Not provided';
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) return isoDate;
  return parsed.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function formatRelativeSavedTime(savedAtMs: number | null, nowMs: number = Date.now()): string {
  if (!savedAtMs) return '';
  const diffSec = Math.max(0, Math.floor((nowMs - savedAtMs) / 1000));
  if (diffSec < 10) return 'just now';
  if (diffSec < 60) return `${diffSec} seconds ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin === 1) return '1 minute ago';
  if (diffMin < 60) return `${diffMin} minutes ago`;
  const diffHr = Math.floor(diffMin / 60);
  return diffHr === 1 ? '1 hour ago' : `${diffHr} hours ago`;
}

export function hasVerifiedIdentityProfile(profile: UserProfile | null): boolean {
  if (!profile) return false;
  const hasName = Boolean(profile.firstName?.trim() && profile.surname?.trim());
  const hasOmang = isValidOmangDigits(profile.omangOrPassport || '');
  const hasDob = Boolean(profile.dob?.trim());
  return hasName && hasOmang && hasDob;
}

export function buildApplicantPrefillFromProfile(profile: UserProfile | null): WizardApplicantDetails {
  const extended = (profile || {}) as UserProfile & { gender?: string; address?: string };
  return {
    type: profile?.accountType === 'business' ? 'business' : 'individual',
    firstName: profile?.firstName?.trim() || '',
    surname: profile?.surname?.trim() || '',
    omang: maskOmangLast3(profile?.omangOrPassport || ''),
    dateOfBirth: profile?.dob?.trim() || '',
    gender: extended.gender?.trim() || '',
    email: profile?.email?.trim() || '',
    phone: normalizeBotswanaPhoneInput(profile?.phone || ''),
    district: profile?.district?.trim() || '',
    town: profile?.town?.trim() || '',
    address: extended.address?.trim() || '',
    business: {
      tradingName: profile?.tradingName?.trim() || '',
      cipaNumber: profile?.cipaNumber?.trim() || '',
      tin: profile?.bursTin?.trim() || '',
    },
    team: [],
    declarationAccepted: false,
  };
}

function readLocalDrafts(): IdeaDraft[] {
  try {
    const raw = localStorage.getItem(LOCAL_DRAFTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as IdeaDraft[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalDrafts(drafts: IdeaDraft[]): void {
  try {
    localStorage.setItem(LOCAL_DRAFTS_KEY, JSON.stringify(drafts));
  } catch {
    // ignore storage errors
  }
}

function syncDraftIntoLocalIdeasSummary(draft: IdeaDraft): void {
  try {
    const raw = localStorage.getItem(LOCAL_IDEAS_KEY);
    const existing: SubmitterIdea[] = raw ? (JSON.parse(raw) as SubmitterIdea[]) : [...DEFAULT_DEMO_IDEAS];
    const idx = existing.findIndex((item) => item.id === draft.id);
    const title =
      draft.applicant.type === 'business' && draft.applicant.business.tradingName.trim()
        ? `${draft.applicant.business.tradingName.trim()} Proposal (Draft)`
        : 'New Innovation Proposal (Draft)';
    const summary: SubmitterIdea = {
      id: draft.id,
      submitterId: draft.submitterId,
      title,
      reference: draft.id.slice(0, 12).toUpperCase(),
      sector: 'General Innovation',
      location: [draft.applicant.town, draft.applicant.district].filter(Boolean).join(', ') || 'Botswana',
      status: draft.status,
      stageStep: 1,
      requestedAmountBwp: null,
      dayInStage: 1,
      feedbackDeadlineIso: null,
      createdAt: draft.createdAt,
      updatedAt: draft.updatedAt,
    };
    if (idx >= 0) {
      existing[idx] = { ...existing[idx], ...summary };
    } else {
      existing.unshift(summary);
    }
    localStorage.setItem(LOCAL_IDEAS_KEY, JSON.stringify(existing));
  } catch {
    // ignore storage errors
  }
}

function normalizeDraftApplicant(
  rawApplicant: Record<string, unknown> | undefined,
  fallback: WizardApplicantDetails
): WizardApplicantDetails {
  const raw = rawApplicant || {};
  const rawBiz = (raw.business as Record<string, unknown> | undefined) || {};
  const rawTeam = Array.isArray(raw.team) ? raw.team : fallback.team;

  return {
    type: raw.type === 'business' ? 'business' : raw.type === 'individual' ? 'individual' : fallback.type,
    firstName: typeof raw.firstName === 'string' && raw.firstName.trim() ? raw.firstName : fallback.firstName,
    surname: typeof raw.surname === 'string' && raw.surname.trim() ? raw.surname : fallback.surname,
    omang:
      typeof raw.omang === 'string' && raw.omang.trim()
        ? maskOmangLast3(raw.omang)
        : fallback.omang,
    dateOfBirth:
      typeof raw.dateOfBirth === 'string' && raw.dateOfBirth.trim()
        ? raw.dateOfBirth
        : fallback.dateOfBirth,
    gender: typeof raw.gender === 'string' ? raw.gender : fallback.gender,
    email: typeof raw.email === 'string' && raw.email.trim() ? raw.email : fallback.email,
    phone:
      typeof raw.phone === 'string' && raw.phone.trim()
        ? normalizeBotswanaPhoneInput(raw.phone)
        : fallback.phone,
    district: typeof raw.district === 'string' && raw.district.trim() ? raw.district : fallback.district,
    town: typeof raw.town === 'string' && raw.town.trim() ? raw.town : fallback.town,
    address: typeof raw.address === 'string' ? raw.address : fallback.address,
    business: {
      tradingName:
        typeof rawBiz.tradingName === 'string' ? rawBiz.tradingName : fallback.business.tradingName,
      cipaNumber:
        typeof rawBiz.cipaNumber === 'string' ? rawBiz.cipaNumber : fallback.business.cipaNumber,
      tin: typeof rawBiz.tin === 'string' ? rawBiz.tin : fallback.business.tin,
    },
    team: rawTeam
      .filter((m): m is Record<string, unknown> => Boolean(m && typeof m === 'object'))
      .map((m) => ({
        name: typeof m.name === 'string' ? m.name : '',
        role: typeof m.role === 'string' ? m.role : '',
        phone: typeof m.phone === 'string' ? normalizeBotswanaPhoneInput(m.phone) : '',
      }))
      .filter((m) => m.name || m.role || m.phone),
    declarationAccepted: Boolean(raw.declarationAccepted),
  };
}

export async function loadUserProfileForWizard(
  uid: string,
  fallbackUser: UserProfile | null
): Promise<UserProfile | null> {
  if (!uid) return fallbackUser;
  if (!canQueryFirestoreForUser(uid)) {
    return fallbackUser;
  }
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (snap.exists()) {
      const data = snap.data() as Partial<UserProfile> & { gender?: string; address?: string };
      return {
        ...(fallbackUser || ({} as UserProfile)),
        ...data,
        id: uid,
      } as UserProfile;
    }
  } catch (err) {
    if (!isPermissionDeniedError(err)) {
      console.warn('Could not load user profile from Firestore, using session profile.');
    }
  }
  return fallbackUser;
}

export async function findOrCreateIdeaDraft(
  uid: string,
  profile: UserProfile | null
): Promise<IdeaDraft> {
  const prefill = buildApplicantPrefillFromProfile(profile);
  const nowIso = new Date().toISOString();

  if (canQueryFirestoreForUser(uid)) {
    try {
      const snap = await getDocs(query(collection(db, 'ideas'), where('submitterId', '==', uid)));
      const drafts: IdeaDraft[] = [];

      snap.forEach((docSnap) => {
        const raw = docSnap.data() as Record<string, unknown>;
        if (String(raw.status || '').toLowerCase() === 'draft') {
          drafts.push({
            id: docSnap.id,
            submitterId: uid,
            status: 'draft',
            currentStep: Math.max(1, Math.min(4, Number(raw.currentStep) || 1)),
            applicant: normalizeDraftApplicant(
              raw.applicant as Record<string, unknown> | undefined,
              prefill
            ),
            createdAt: normalizeTimestamp(raw.createdAt) || nowIso,
            updatedAt: normalizeTimestamp(raw.updatedAt) || nowIso,
          });
        }
      });

      if (drafts.length > 0) {
        drafts.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        const latest = drafts[0];
        const allLocal = readLocalDrafts().filter((d) => d.id !== latest.id);
        writeLocalDrafts([latest, ...allLocal]);
        return latest;
      }

      // Create ONE new draft in Firestore
      const newDocRef = doc(collection(db, 'ideas'));
      const newDraft: IdeaDraft = {
        id: newDocRef.id,
        submitterId: uid,
        status: 'draft',
        currentStep: 1,
        applicant: prefill,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      await setDoc(newDocRef, newDraft);
      const allLocal = readLocalDrafts().filter((d) => d.id !== newDraft.id);
      writeLocalDrafts([newDraft, ...allLocal]);
      return newDraft;
    } catch (err) {
      if (!isPermissionDeniedError(err)) {
        throw err instanceof Error ? err : new Error('Unable to load or create draft.');
      }
      logFirestorePermissionWarning(err, 'list', 'ideas');
    }
  }

  // Local / fallback draft store
  const localDrafts = readLocalDrafts();
  const existing = localDrafts
    .filter((d) => d.submitterId === uid && d.status === 'draft')
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];

  if (existing) {
    const normalized: IdeaDraft = {
      ...existing,
      applicant: normalizeDraftApplicant(
        existing.applicant as unknown as Record<string, unknown>,
        prefill
      ),
    };
    return normalized;
  }

  const created: IdeaDraft = {
    id: `draft-${uid.slice(-6)}-${Date.now()}`,
    submitterId: uid,
    status: 'draft',
    currentStep: 1,
    applicant: prefill,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
  writeLocalDrafts([created, ...localDrafts]);
  syncDraftIntoLocalIdeasSummary(created);
  return created;
}

function updateLocalUserProfileIdentity(uid: string, patch: ProfileIdentityUpdate): void {
  try {
    const raw = localStorage.getItem(LOCAL_USERS_KEY);
    if (!raw) return;
    const users = JSON.parse(raw) as Array<UserProfile & { gender?: string; address?: string }>;
    const idx = users.findIndex((u) => u.id === uid);
    if (idx < 0) return;
    const existing = users[idx];
    const firstName = patch.firstName?.trim() || existing.firstName;
    const surname = patch.surname?.trim() || existing.surname;
    users[idx] = {
      ...existing,
      ...patch,
      firstName,
      surname,
      fullName: [firstName, surname].filter(Boolean).join(' ') || existing.fullName,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
  } catch {
    // ignore storage errors
  }
}

export async function saveIdeaDraft(
  draft: IdeaDraft,
  applicantInput: WizardApplicantDetails,
  nextStep: number,
  profileIdentityUpdate?: ProfileIdentityUpdate
): Promise<IdeaDraft> {
  const nowIso = new Date().toISOString();
  // Never store full Omang in ideas/{id}; store masked Omang only in draft
  const sanitizedApplicant: WizardApplicantDetails = {
    ...applicantInput,
    omang: maskOmangLast3(applicantInput.omang),
    phone: normalizeBotswanaPhoneInput(applicantInput.phone),
    team: applicantInput.team.map((m) => ({
      name: m.name.trim(),
      role: m.role.trim(),
      phone: normalizeBotswanaPhoneInput(m.phone),
    })),
  };

  const updatedDraft: IdeaDraft = {
    ...draft,
    status: 'draft',
    currentStep: Math.max(1, Math.min(4, nextStep)),
    applicant: sanitizedApplicant,
    updatedAt: nowIso,
  };

  // Update user's profile with entered identity/location fields when provided
  if (profileIdentityUpdate && Object.keys(profileIdentityUpdate).length > 0) {
    updateLocalUserProfileIdentity(draft.submitterId, profileIdentityUpdate);
    if (canQueryFirestoreForUser(draft.submitterId)) {
      try {
        const cleanProfilePatch: Record<string, unknown> = {
          updatedAt: nowIso,
        };
        if (profileIdentityUpdate.firstName) cleanProfilePatch.firstName = profileIdentityUpdate.firstName;
        if (profileIdentityUpdate.surname) cleanProfilePatch.surname = profileIdentityUpdate.surname;
        if (profileIdentityUpdate.firstName || profileIdentityUpdate.surname) {
          cleanProfilePatch.fullName = [
            profileIdentityUpdate.firstName || sanitizedApplicant.firstName,
            profileIdentityUpdate.surname || sanitizedApplicant.surname,
          ]
            .filter(Boolean)
            .join(' ');
        }
        if (profileIdentityUpdate.omangOrPassport) {
          cleanProfilePatch.omangOrPassport = profileIdentityUpdate.omangOrPassport;
        }
        if (profileIdentityUpdate.dob) cleanProfilePatch.dob = profileIdentityUpdate.dob;
        if (profileIdentityUpdate.gender !== undefined) {
          cleanProfilePatch.gender = profileIdentityUpdate.gender;
        }
        if (profileIdentityUpdate.district) cleanProfilePatch.district = profileIdentityUpdate.district;
        if (profileIdentityUpdate.town) cleanProfilePatch.town = profileIdentityUpdate.town;
        if (profileIdentityUpdate.address) cleanProfilePatch.address = profileIdentityUpdate.address;

        await setDoc(doc(db, 'users', draft.submitterId), cleanProfilePatch, { merge: true });
      } catch (err) {
        if (!isPermissionDeniedError(err)) {
          console.warn('Could not sync profile identity fields to Firestore.');
        }
      }
    }
  }

  if (canQueryFirestoreForUser(draft.submitterId)) {
    try {
      await setDoc(
        doc(db, 'ideas', draft.id),
        {
          id: updatedDraft.id,
          submitterId: updatedDraft.submitterId,
          status: 'draft',
          currentStep: updatedDraft.currentStep,
          applicant: updatedDraft.applicant,
          createdAt: updatedDraft.createdAt || nowIso,
          updatedAt: nowIso,
        },
        { merge: true }
      );
    } catch (err) {
      if (!isPermissionDeniedError(err)) {
        throw err instanceof Error ? err : new Error('Could not save draft.');
      }
      logFirestorePermissionWarning(err, 'list', 'ideas');
    }
  }

  const others = readLocalDrafts().filter((d) => d.id !== updatedDraft.id);
  writeLocalDrafts([updatedDraft, ...others]);
  syncDraftIntoLocalIdeasSummary(updatedDraft);

  return updatedDraft;
}

