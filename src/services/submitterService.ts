/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  Unsubscribe,
  updateDoc,
  where,
} from 'firebase/firestore';
import { auth, db, firebaseConfig } from '../config/firebase';
import { normalizeDistrictCouncilName } from '../config/districts';
import {
  DOCUMENT_ACCEPTED_EXTENSIONS,
  DOCUMENT_ACCEPTED_MIME_TYPES,
  DOCUMENT_MAX_FILES_PER_IDEA,
  DOCUMENT_MAX_FILE_SIZE_BYTES,
  DOCUMENT_MAX_FILE_SIZE_MB,
  DocumentSlotKey,
  MAX_SUPPORT_LETTERS,
} from '../data/documentOptions';
import {
  deleteDocumentFromSupabaseAndFirestore,
  getDocumentPublicUrlFromFirestore,
  updateDocumentNoteInFirestore,
  uploadDocumentToSupabaseAndFirestore,
} from './documentStorageService';
import { DEFAULT_OPEN_CALL, OpenCallData } from '../data/submitterMock';
import { UserProfile } from '../types/auth';

export type IdeaStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'feedback_requested'
  | 'approved'
  | 'awarded'
  | 'declined'
  | (string & {});

export interface IdeaFeedback {
  title: string;
  message: string;
  dueDate: string | null;
  fileUrl: string | null;
}

export interface SubmitterIdea {
  id: string;
  submitterId: string;
  title: string;
  reference: string;
  sector: string;
  location: string;
  town?: string;
  district?: string;
  address?: string;
  status: IdeaStatus;
  stageStep: number; // 1..5
  currentStep?: number; // 1..4 wizard progress for drafts
  requestedAmountBwp: number | null;
  fundingPurpose?: string | null;
  applicantType?: 'individual' | 'business';
  companyName?: string | null;
  cipaNumber?: string | null;
  dayInStage: number;
  feedbackDeadlineIso: string | null;
  feedback?: IdeaFeedback | null;
  submittedAt?: string | null;
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
  const raw = String(rawStatus ?? '').trim();
  if (!raw) return 'submitted';
  const s = raw.toLowerCase().replace(/\s+/g, '_');
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
  if (s === 'submitted') return 'submitted';
  return s;
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

async function ensureFirestoreReadyForUser(uid?: string): Promise<boolean> {
  if (!db || !auth || firebaseConfig.apiKey.includes('MockKey')) return false;
  try {
    if (typeof auth.authStateReady === 'function') {
      await auth.authStateReady();
    }
  } catch {
    // ignore authStateReady errors
  }
  if (!auth.currentUser) return false;
  if (uid && auth.currentUser.uid !== uid) return false;
  return true;
}

function getFirestoreAuthFailureReason(uid?: string): string {
  if (!db || !auth || firebaseConfig.apiKey.includes('MockKey')) {
    return 'Firebase is not configured. Check your VITE_FIREBASE_* environment variables.';
  }
  if (!auth.currentUser) {
    return 'Your Firebase sign-in session is not active. Please sign out and sign back in with your email and password so drafts save to Firestore.';
  }
  if (uid && auth.currentUser.uid !== uid) {
    return 'Your active Firebase account does not match the current portal profile. Please sign out and sign back in.';
  }
  return 'Unable to connect to Firestore.';
}

function logFirestorePermissionError(
  error: unknown,
  operationType: 'get' | 'list' | 'create' | 'update' | 'delete' | 'write',
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
            providerId: provider.providerId ?? null,
            email: provider.email ?? null,
          })
        ) || [],
    },
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
}

function mapDocToSubmitterIdea(
  docId: string,
  raw: Record<string, unknown>,
  uid: string
): SubmitterIdea {
  const status = normalizeIdeaStatus(raw.status);
  const createdAt = normalizeTimestamp(raw.createdAt);
  const updatedAt = normalizeTimestamp(raw.updatedAt) || createdAt;
  const rawApplicant =
    raw.applicant && typeof raw.applicant === 'object'
      ? (raw.applicant as Record<string, unknown>)
      : undefined;
  const rawBusiness =
    rawApplicant?.business && typeof rawApplicant.business === 'object'
      ? (rawApplicant.business as Record<string, unknown>)
      : undefined;
  const rawIdea =
    raw.idea && typeof raw.idea === 'object' ? (raw.idea as Record<string, unknown>) : undefined;

  const district =
    (typeof rawApplicant?.district === 'string' && rawApplicant.district.trim()) ||
    (typeof raw.district === 'string' && raw.district.trim()) ||
    '';
  const town =
    (typeof rawApplicant?.town === 'string' && rawApplicant.town.trim()) ||
    (typeof raw.town === 'string' && raw.town.trim()) ||
    '';
  const address =
    (typeof rawApplicant?.address === 'string' && rawApplicant.address.trim()) ||
    (typeof raw.address === 'string' && raw.address.trim()) ||
    '';
  const explicitLoc = typeof raw.location === 'string' ? raw.location.trim() : '';
  const location = explicitLoc || [town, district].filter(Boolean).join(', ') || 'Botswana';

  const rawAmount = Number(
    raw.requestedAmountBwp ??
      raw.requestedCapital ??
      raw.fundingRequested ??
      rawIdea?.requestedAmountBwp ??
      rawIdea?.fundingRequested
  );
  const fundingPurpose =
    (typeof rawIdea?.fundingPurpose === 'string' && rawIdea.fundingPurpose.trim()) ||
    (typeof raw.fundingPurpose === 'string' && raw.fundingPurpose.trim()) ||
    (typeof raw.purpose === 'string' && raw.purpose.trim()) ||
    null;

  const resolvedTitle =
    (typeof rawIdea?.title === 'string' && rawIdea.title.trim()) ||
    (typeof raw.title === 'string' && raw.title.trim()) ||
    (typeof raw.ideaTitle === 'string' && raw.ideaTitle.trim()) ||
    'Untitled innovation proposal';
  const resolvedSector =
    (typeof rawIdea?.sector === 'string' && rawIdea.sector.trim()) ||
    (typeof raw.sector === 'string' && raw.sector.trim()) ||
    'General Innovation';

  const applicantType: 'individual' | 'business' =
    rawApplicant?.type === 'business' || raw.accountType === 'business'
      ? 'business'
      : 'individual';
  const companyName =
    (typeof rawBusiness?.tradingName === 'string' && rawBusiness.tradingName.trim()) ||
    (typeof raw.tradingName === 'string' && raw.tradingName.trim()) ||
    (typeof raw.companyName === 'string' && raw.companyName.trim()) ||
    null;
  const cipaNumber =
    (typeof rawBusiness?.cipaNumber === 'string' && rawBusiness.cipaNumber.trim()) ||
    (typeof raw.cipaNumber === 'string' && raw.cipaNumber.trim()) ||
    null;

  const rawFeedbackObj =
    rawIdea?.feedback && typeof rawIdea.feedback === 'object'
      ? (rawIdea.feedback as Record<string, unknown>)
      : raw.feedback && typeof raw.feedback === 'object'
      ? (raw.feedback as Record<string, unknown>)
      : null;
  const feedbackDeadlineIso =
    normalizeTimestamp(rawFeedbackObj?.dueDate || raw.feedbackDeadline || raw.slaDeadline) || null;
  const feedback: IdeaFeedback | null = rawFeedbackObj
    ? {
        title:
          (typeof rawFeedbackObj.title === 'string' && rawFeedbackObj.title.trim()) ||
          'CEDA Officer Clarification',
        message: typeof rawFeedbackObj.message === 'string' ? rawFeedbackObj.message.trim() : '',
        dueDate: normalizeTimestamp(rawFeedbackObj.dueDate) || feedbackDeadlineIso,
        fileUrl:
          typeof rawFeedbackObj.fileUrl === 'string' && rawFeedbackObj.fileUrl.trim()
            ? rawFeedbackObj.fileUrl.trim()
            : null,
      }
    : null;

  const parsedCurrentStep = Number(raw.currentStep);
  const currentStep =
    !Number.isNaN(parsedCurrentStep) && parsedCurrentStep >= 1 && parsedCurrentStep <= 4
      ? Math.round(parsedCurrentStep)
      : 1;

  const explicitRef =
    (typeof raw.reference === 'string' && raw.reference.trim()) ||
    (typeof raw.trackingCode === 'string' && raw.trackingCode.trim()) ||
    '';
  const reference = explicitRef || (status === 'draft' ? 'Draft' : docId.slice(0, 12).toUpperCase());

  const submittedAt =
    normalizeTimestamp(raw.submittedAt) || (status !== 'draft' ? createdAt || null : null);

  return {
    id: docId,
    submitterId: String(raw.submitterId || uid),
    title: resolvedTitle,
    reference,
    sector: resolvedSector,
    location,
    town,
    district,
    address,
    status,
    stageStep: inferStageStep(raw.currentStage ?? raw.stage, status),
    currentStep,
    requestedAmountBwp: !Number.isNaN(rawAmount) && rawAmount > 0 ? rawAmount : null,
    fundingPurpose,
    applicantType,
    companyName,
    cipaNumber,
    dayInStage: computeDayInStage(updatedAt, createdAt, raw.dayInStage),
    feedbackDeadlineIso,
    feedback,
    submittedAt,
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

  const firestoreReady = await ensureFirestoreReadyForUser(uid);
  if (!firestoreReady) {
    return firebaseConfig.apiKey.includes('MockKey') ? getLocalIdeasForUser(uid) : [];
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
      logFirestorePermissionError(err, 'list', 'ideas');
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
        logFirestorePermissionError(subErr, 'list', 'submissions');
        if (!ideasSucceeded) {
          throw new Error(
            `Firestore permissions prevented loading your submissions from "ideas". Publish firestore.rules to your Firebase project (${firebaseConfig.projectId}) and retry.`
          );
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
  const firestoreReady = await ensureFirestoreReadyForUser(uid);
  if (!firestoreReady) {
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
  if (!db || firebaseConfig.apiKey.includes('MockKey') || !auth?.currentUser) {
    return DEFAULT_OPEN_CALL;
  }
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

export type DraftStorageTarget = 'ideas' | 'submissions' | 'local';

export type InnovationType =
  | 'new_to_botswana'
  | 'incremental_upgrade'
  | 'import_substitution';

export interface IdeaDocumentFile {
  fileId: string;
  documentId?: string;
  name: string;
  size: number;
  contentType: string;
  storagePath?: string;
  publicUrl?: string;
  uploaderId?: string;
  uploadedAt: string;
  note?: string;
}

export interface WizardIdeaDocuments {
  omang: IdeaDocumentFile | null;
  conceptNote: IdeaDocumentFile | null;
  budget: IdeaDocumentFile | null;
  proofOfResidence: IdeaDocumentFile | null;
  cipa: IdeaDocumentFile | null;
  letters: IdeaDocumentFile[];
}

export function createEmptyIdeaDocuments(): WizardIdeaDocuments {
  return {
    omang: null,
    conceptNote: null,
    budget: null,
    proofOfResidence: null,
    cipa: null,
    letters: [],
  };
}

export interface WizardIdeaDeclaration {
  accepted: boolean;
  acceptedAt: string | null;
}

export interface WizardIdeaDetails {
  title: string;
  sector: string;
  subSector: string;
  problem: string;
  solution: string;
  beneficiaries: string;
  innovationType: InnovationType | '';
  trl: number | null;
  ipStatus: string;
  jobsEstimate: number | null;
  impactMetric: string;
  demographics: string[];
  documents?: WizardIdeaDocuments;
  declaration?: WizardIdeaDeclaration;
}

export function createEmptyIdeaDetails(): WizardIdeaDetails {
  return {
    title: '',
    sector: '',
    subSector: '',
    problem: '',
    solution: '',
    beneficiaries: '',
    innovationType: '',
    trl: null,
    ipStatus: '',
    jobsEstimate: null,
    impactMetric: '',
    demographics: [],
    documents: createEmptyIdeaDocuments(),
    declaration: {
      accepted: false,
      acceptedAt: null,
    },
  };
}

export interface IdeaDraft {
  id: string;
  submitterId: string;
  status: IdeaStatus;
  currentStep: number;
  applicant: WizardApplicantDetails;
  idea?: WizardIdeaDetails;
  reference?: string;
  stage?: string;
  submittedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  storageTarget?: DraftStorageTarget;
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

export function isStep1ApplicantValid(
  applicant: WizardApplicantDetails | null | undefined,
  profile: UserProfile | null
): boolean {
  if (!applicant) return false;

  const hasValidIdentity = hasVerifiedIdentityProfile(profile) || (
    applicant.firstName.trim().length >= 2 &&
    applicant.surname.trim().length >= 2 &&
    (isValidOmangDigits(profile?.omangOrPassport || '') ||
      isValidOmangDigits(applicant.omang) ||
      /^•{6}\d{3}$/.test(applicant.omang.trim())) &&
    Boolean(applicant.dateOfBirth.trim()) &&
    !Number.isNaN(new Date(applicant.dateOfBirth.trim()).getTime()) &&
    new Date(applicant.dateOfBirth.trim()).getTime() < Date.now()
  );

  if (!hasValidIdentity) return false;

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(applicant.email.trim());
  const phoneOk = isValidBotswanaMobile(applicant.phone);
  const districtOk = Boolean(applicant.district.trim());
  const townOk = applicant.town.trim().length >= 2;
  const addressOk = applicant.address.trim().length >= 5;

  if (!emailOk || !phoneOk || !districtOk || !townOk || !addressOk) {
    return false;
  }

  if (applicant.type === 'business') {
    const tradingOk = applicant.business.tradingName.trim().length >= 2;
    const cipaOk = /^[A-Za-z0-9][A-Za-z0-9/-]{4,24}$/.test(
      applicant.business.cipaNumber.trim()
    );
    const tinOk = /^[A-Za-z0-9][A-Za-z0-9-]{5,19}$/.test(applicant.business.tin.trim());
    if (!tradingOk || !cipaOk || !tinOk) return false;
  }

  return Boolean(applicant.declarationAccepted);
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
    district: normalizeDistrictCouncilName(profile?.district),
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

function readLegacyLocalDraftForUser(uid: string): IdeaDraft | null {
  try {
    const raw = localStorage.getItem(LOCAL_DRAFTS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as IdeaDraft[];
    if (!Array.isArray(parsed)) return null;
    return (
      parsed
        .filter((d) => d.submitterId === uid && d.status === 'draft')
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0] ||
      null
    );
  } catch {
    return null;
  }
}

function clearLocalDraftsForUser(uid: string): void {
  try {
    const raw = localStorage.getItem(LOCAL_DRAFTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as IdeaDraft[];
      if (Array.isArray(parsed)) {
        const remaining = parsed.filter((d) => d.submitterId !== uid);
        if (remaining.length === 0) {
          localStorage.removeItem(LOCAL_DRAFTS_KEY);
        } else {
          localStorage.setItem(LOCAL_DRAFTS_KEY, JSON.stringify(remaining));
        }
      }
    }
    const rawIdeas = localStorage.getItem(LOCAL_IDEAS_KEY);
    if (rawIdeas) {
      const parsedIdeas = JSON.parse(rawIdeas) as SubmitterIdea[];
      if (Array.isArray(parsedIdeas)) {
        const cleaned = parsedIdeas.filter(
          (item) => !(item.submitterId === uid && item.id.startsWith('draft-'))
        );
        localStorage.setItem(LOCAL_IDEAS_KEY, JSON.stringify(cleaned));
      }
    }
  } catch {
    // ignore storage errors
  }
}

function normalizeSingleDocumentFile(raw: unknown): IdeaDocumentFile | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const fileId = typeof obj.fileId === 'string' ? obj.fileId.trim() : '';
  const name = typeof obj.name === 'string' ? obj.name.trim() : '';
  if (!fileId || !name) return null;

  const parsedSize = Number(obj.size);
  const size = !Number.isNaN(parsedSize) && parsedSize >= 0 ? Math.round(parsedSize) : 0;
  const contentType =
    typeof obj.contentType === 'string' && obj.contentType.trim()
      ? obj.contentType.trim()
      : 'application/octet-stream';
  const uploadedAt =
    normalizeTimestamp(obj.uploadedAt) || new Date().toISOString();
  const note =
    typeof obj.note === 'string' && obj.note.trim() ? obj.note.trim().slice(0, 200) : undefined;
  const documentId =
    typeof obj.documentId === 'string' && obj.documentId.trim()
      ? obj.documentId.trim()
      : undefined;
  const storagePath =
    typeof obj.storagePath === 'string' && obj.storagePath.trim()
      ? obj.storagePath.trim()
      : undefined;
  const publicUrl =
    typeof obj.publicUrl === 'string' && obj.publicUrl.trim()
      ? obj.publicUrl.trim()
      : undefined;
  const uploaderId =
    typeof obj.uploaderId === 'string' && obj.uploaderId.trim()
      ? obj.uploaderId.trim()
      : undefined;

  return {
    fileId,
    ...(documentId ? { documentId } : {}),
    name,
    size,
    contentType,
    ...(storagePath ? { storagePath } : {}),
    ...(publicUrl ? { publicUrl } : {}),
    ...(uploaderId ? { uploaderId } : {}),
    uploadedAt,
    ...(note ? { note } : {}),
  };
}

export function normalizeIdeaDocuments(rawDocs: unknown): WizardIdeaDocuments {
  const empty = createEmptyIdeaDocuments();
  if (!rawDocs || typeof rawDocs !== 'object') return empty;
  const raw = rawDocs as Record<string, unknown>;

  const letters = Array.isArray(raw.letters)
    ? raw.letters
        .map((item) => normalizeSingleDocumentFile(item))
        .filter((item): item is IdeaDocumentFile => Boolean(item))
        .slice(0, MAX_SUPPORT_LETTERS)
    : [];

  return {
    omang: normalizeSingleDocumentFile(raw.omang),
    conceptNote: normalizeSingleDocumentFile(raw.conceptNote),
    budget: normalizeSingleDocumentFile(raw.budget),
    proofOfResidence: normalizeSingleDocumentFile(raw.proofOfResidence),
    cipa: normalizeSingleDocumentFile(raw.cipa),
    letters,
  };
}

export function normalizeIdeaDeclaration(rawDecl: unknown): WizardIdeaDeclaration {
  if (!rawDecl || typeof rawDecl !== 'object') {
    return { accepted: false, acceptedAt: null };
  }
  const obj = rawDecl as Record<string, unknown>;
  const accepted = Boolean(obj.accepted);
  const acceptedAt = normalizeTimestamp(obj.acceptedAt) || null;
  return {
    accepted,
    acceptedAt: accepted ? acceptedAt : null,
  };
}

export function normalizeDraftIdea(rawIdea?: Record<string, unknown>): WizardIdeaDetails {
  const empty = createEmptyIdeaDetails();
  if (!rawIdea || typeof rawIdea !== 'object') return empty;

  const rawInnovationType = rawIdea.innovationType;
  const innovationType: InnovationType | '' =
    rawInnovationType === 'new_to_botswana' ||
    rawInnovationType === 'incremental_upgrade' ||
    rawInnovationType === 'import_substitution'
      ? rawInnovationType
      : '';

  const parsedTrl =
    rawIdea.trl !== null && rawIdea.trl !== undefined && rawIdea.trl !== ''
      ? Number(rawIdea.trl)
      : NaN;
  const trl =
    Number.isInteger(parsedTrl) && parsedTrl >= 1 && parsedTrl <= 9 ? parsedTrl : null;

  const parsedJobs =
    rawIdea.jobsEstimate !== null &&
    rawIdea.jobsEstimate !== undefined &&
    rawIdea.jobsEstimate !== ''
      ? Number(rawIdea.jobsEstimate)
      : NaN;
  const jobsEstimate =
    Number.isInteger(parsedJobs) && parsedJobs >= 0 && parsedJobs <= 10000
      ? parsedJobs
      : null;

  const demographics = Array.isArray(rawIdea.demographics)
    ? rawIdea.demographics.filter((d): d is string => typeof d === 'string' && Boolean(d.trim()))
    : [];

  return {
    title: typeof rawIdea.title === 'string' ? rawIdea.title : '',
    sector: typeof rawIdea.sector === 'string' ? rawIdea.sector : '',
    subSector: typeof rawIdea.subSector === 'string' ? rawIdea.subSector : '',
    problem: typeof rawIdea.problem === 'string' ? rawIdea.problem : '',
    solution: typeof rawIdea.solution === 'string' ? rawIdea.solution : '',
    beneficiaries: typeof rawIdea.beneficiaries === 'string' ? rawIdea.beneficiaries : '',
    innovationType,
    trl,
    ipStatus: typeof rawIdea.ipStatus === 'string' ? rawIdea.ipStatus : '',
    jobsEstimate,
    impactMetric: typeof rawIdea.impactMetric === 'string' ? rawIdea.impactMetric : '',
    demographics,
    documents: normalizeIdeaDocuments(rawIdea.documents),
    declaration: normalizeIdeaDeclaration(rawIdea.declaration),
  };
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
    district:
      typeof raw.district === 'string' && raw.district.trim()
        ? normalizeDistrictCouncilName(raw.district)
        : fallback.district,
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
  const firestoreReady = await ensureFirestoreReadyForUser(uid);
  if (!firestoreReady) {
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

function buildFirestoreIdeaPayload(draft: IdeaDraft, nowIso: string): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    id: draft.id,
    submitterId: draft.submitterId,
    status: 'draft',
    currentStep: draft.currentStep,
    applicant: draft.applicant,
    district: draft.applicant.district || '',
    town: draft.applicant.town || '',
    createdAt: draft.createdAt || nowIso,
    updatedAt: nowIso,
  };
  if (draft.idea) {
    payload.idea = draft.idea;
  }
  return payload;
}

function buildFirestoreSubmissionDraftPayload(
  draft: IdeaDraft,
  nowIso: string
): Record<string, unknown> {
  const title =
    draft.idea?.title?.trim() ||
    (draft.applicant.type === 'business' && draft.applicant.business.tradingName.trim()
      ? `${draft.applicant.business.tradingName.trim()} Proposal (Draft)`
      : 'New Innovation Proposal (Draft)');
  const suffix = draft.id.replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase() || '000001';
  const payload: Record<string, unknown> = {
    id: draft.id,
    trackingCode: `CEDA-DRAFT-${suffix}`,
    submitterId: draft.submitterId,
    title,
    sector: draft.idea?.sector?.trim() || 'General Innovation',
    district: draft.applicant.district || 'Botswana',
    town: draft.applicant.town || '',
    requestedCapital: 0,
    currentStage: 1,
    stageName: 'Draft',
    status: 'draft',
    currentStep: draft.currentStep,
    applicant: draft.applicant,
    isBlinded: false,
    createdAt: draft.createdAt || nowIso,
    updatedAt: nowIso,
  };
  if (draft.idea) {
    payload.idea = draft.idea;
  }
  return payload;
}

function mapRawDocToIdeaDraft(
  docId: string,
  raw: Record<string, unknown>,
  uid: string,
  prefill: WizardApplicantDetails,
  storageTarget: DraftStorageTarget
): IdeaDraft {
  const nowIso = new Date().toISOString();
  const status = normalizeIdeaStatus(raw.status || 'draft');
  const reference =
    (typeof raw.reference === 'string' && raw.reference.trim()) ||
    (typeof raw.trackingCode === 'string' && raw.trackingCode.trim()) ||
    '';

  return {
    id: docId,
    submitterId: String(raw.submitterId || uid),
    status,
    currentStep: Math.max(1, Math.min(4, Number(raw.currentStep) || 1)),
    applicant: normalizeDraftApplicant(
      raw.applicant as Record<string, unknown> | undefined,
      prefill
    ),
    idea: normalizeDraftIdea(raw.idea as Record<string, unknown> | undefined),
    reference: reference || undefined,
    stage: typeof raw.stage === 'string' ? raw.stage : undefined,
    submittedAt: normalizeTimestamp(raw.submittedAt) || null,
    createdAt: normalizeTimestamp(raw.createdAt) || nowIso,
    updatedAt: normalizeTimestamp(raw.updatedAt) || nowIso,
    storageTarget,
  };
}

export async function findExistingIdeaDraft(
  uid: string,
  profile: UserProfile | null
): Promise<IdeaDraft | null> {
  const prefill = buildApplicantPrefillFromProfile(profile);

  const firestoreReady = await ensureFirestoreReadyForUser(uid);
  if (!firestoreReady) {
    throw new Error(getFirestoreAuthFailureReason(uid));
  }

  let ideasDenied = false;

  // 1. Primary collection: `ideas`
  try {
    const snap = await getDocs(query(collection(db, 'ideas'), where('submitterId', '==', uid)));
    const drafts: IdeaDraft[] = [];

    snap.forEach((docSnap) => {
      const raw = docSnap.data() as Record<string, unknown>;
      if (String(raw.status || '').toLowerCase() === 'draft') {
        drafts.push(mapRawDocToIdeaDraft(docSnap.id, raw, uid, prefill, 'ideas'));
      }
    });

    if (drafts.length > 0) {
      drafts.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      clearLocalDraftsForUser(uid);
      return drafts[0];
    }
  } catch (err) {
    if (!isPermissionDeniedError(err)) {
      throw err instanceof Error ? err : new Error('Unable to load your draft from Firestore.');
    }
    ideasDenied = true;
    logFirestorePermissionError(err, 'list', 'ideas');
  }

  // 2. Fallback Firestore collection: `submissions`
  try {
    const subSnap = await getDocs(
      query(collection(db, 'submissions'), where('submitterId', '==', uid))
    );
    const subDrafts: IdeaDraft[] = [];

    subSnap.forEach((docSnap) => {
      const raw = docSnap.data() as Record<string, unknown>;
      if (String(raw.status || '').toLowerCase() === 'draft') {
        subDrafts.push(mapRawDocToIdeaDraft(docSnap.id, raw, uid, prefill, 'submissions'));
      }
    });

    if (subDrafts.length > 0) {
      subDrafts.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      clearLocalDraftsForUser(uid);
      return subDrafts[0];
    }
  } catch (subErr) {
    if (!isPermissionDeniedError(subErr)) {
      throw subErr instanceof Error
        ? subErr
        : new Error('Unable to load your draft from Firestore.');
    }
    logFirestorePermissionError(subErr, 'list', 'submissions');
    if (ideasDenied) {
      throw new Error(
        `Missing Firestore permissions for "ideas". Publish the updated firestore.rules to your Firebase project (${firebaseConfig.projectId}) and retry.`
      );
    }
  }

  return null;
}

export async function findIdeaDraftOrById(
  uid: string,
  profile: UserProfile | null,
  ideaIdHint?: string | null
): Promise<IdeaDraft | null> {
  const prefill = buildApplicantPrefillFromProfile(profile);
  const cleanHint = ideaIdHint?.trim();

  if (cleanHint) {
    const firestoreReady = await ensureFirestoreReadyForUser(uid);
    if (!firestoreReady) {
      throw new Error(getFirestoreAuthFailureReason(uid));
    }
    try {
      const snap = await getDoc(doc(db, 'ideas', cleanHint));
      if (snap.exists()) {
        const raw = snap.data() as Record<string, unknown>;
        if (String(raw.submitterId || '') === uid) {
          return mapRawDocToIdeaDraft(snap.id, raw, uid, prefill, 'ideas');
        }
      }
    } catch (err) {
      if (isPermissionDeniedError(err)) {
        logFirestorePermissionError(err, 'get', `ideas/${cleanHint}`);
      } else {
        throw err instanceof Error ? err : new Error('Unable to load your idea.');
      }
    }
  }

  return findExistingIdeaDraft(uid, profile);
}

export function subscribeToIdeaDraft(
  draftId: string,
  storageTarget: DraftStorageTarget | undefined,
  uid: string,
  profile: UserProfile | null,
  onUpdate: (nextDraft: IdeaDraft) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  if (!db || !draftId || firebaseConfig.apiKey.includes('MockKey')) {
    return () => {};
  }

  const targetCollection = storageTarget === 'submissions' ? 'submissions' : 'ideas';
  const prefill = buildApplicantPrefillFromProfile(profile);

  return onSnapshot(
    doc(db, targetCollection, draftId),
    (snap) => {
      if (!snap.exists()) return;
      const raw = snap.data() as Record<string, unknown>;
      if (raw.submitterId && String(raw.submitterId) !== uid) return;
      onUpdate(mapRawDocToIdeaDraft(snap.id, raw, uid, prefill, targetCollection));
    },
    (err) => {
      if (isPermissionDeniedError(err)) {
        logFirestorePermissionError(err, 'get', `${targetCollection}/${draftId}`);
      }
      onError?.(err instanceof Error ? err : new Error('Unable to sync your draft in real time.'));
    }
  );
}

export async function findOrCreateIdeaDraft(
  uid: string,
  profile: UserProfile | null
): Promise<IdeaDraft> {
  const existing = await findExistingIdeaDraft(uid, profile);
  if (existing) return existing;

  const prefill = buildApplicantPrefillFromProfile(profile);
  const legacyLocal = readLegacyLocalDraftForUser(uid);
  const initialApplicant = legacyLocal
    ? normalizeDraftApplicant(
        legacyLocal.applicant as unknown as Record<string, unknown>,
        prefill
      )
    : prefill;
  const initialIdea = legacyLocal?.idea
    ? normalizeDraftIdea(legacyLocal.idea as unknown as Record<string, unknown>)
    : createEmptyIdeaDetails();
  const initialStep = legacyLocal ? Math.max(1, Math.min(4, legacyLocal.currentStep || 1)) : 1;
  const nowIso = new Date().toISOString();

  // 1. Create in Firestore `ideas`
  try {
    const newDocRef = doc(collection(db, 'ideas'));
    const newDraft: IdeaDraft = {
      id: newDocRef.id,
      submitterId: uid,
      status: 'draft',
      currentStep: initialStep,
      applicant: initialApplicant,
      idea: initialIdea,
      createdAt: nowIso,
      updatedAt: nowIso,
      storageTarget: 'ideas',
    };
    await setDoc(newDocRef, buildFirestoreIdeaPayload(newDraft, nowIso));
    clearLocalDraftsForUser(uid);
    return newDraft;
  } catch (err) {
    if (!isPermissionDeniedError(err)) {
      throw err instanceof Error ? err : new Error('Unable to create draft in Firestore.');
    }
    logFirestorePermissionError(err, 'create', 'ideas');
  }

  // 2. Fallback create in Firestore `submissions`
  try {
    const newSubRef = doc(collection(db, 'submissions'));
    const newSubDraft: IdeaDraft = {
      id: newSubRef.id,
      submitterId: uid,
      status: 'draft',
      currentStep: initialStep,
      applicant: initialApplicant,
      idea: initialIdea,
      createdAt: nowIso,
      updatedAt: nowIso,
      storageTarget: 'submissions',
    };
    await setDoc(newSubRef, buildFirestoreSubmissionDraftPayload(newSubDraft, nowIso));
    clearLocalDraftsForUser(uid);
    return newSubDraft;
  } catch (subErr) {
    if (!isPermissionDeniedError(subErr)) {
      throw subErr instanceof Error ? subErr : new Error('Unable to create draft in Firestore.');
    }
    logFirestorePermissionError(subErr, 'create', 'submissions');
    throw new Error(
      `Unable to create your application draft in Firestore (Missing or insufficient permissions). Publish firestore.rules to your Firebase project (${firebaseConfig.projectId}) and retry.`
    );
  }
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

  const firestoreReady = await ensureFirestoreReadyForUser(draft.submitterId);
  if (!firestoreReady) {
    throw new Error(getFirestoreAuthFailureReason(draft.submitterId));
  }

  // Update user's profile with entered identity/location fields when provided
  if (profileIdentityUpdate && Object.keys(profileIdentityUpdate).length > 0) {
    updateLocalUserProfileIdentity(draft.submitterId, profileIdentityUpdate);
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

  let savedToCloud = false;

  if (updatedDraft.storageTarget !== 'submissions') {
    try {
      await setDoc(
        doc(db, 'ideas', draft.id),
        buildFirestoreIdeaPayload(updatedDraft, nowIso),
        { merge: true }
      );
      updatedDraft.storageTarget = 'ideas';
      savedToCloud = true;
    } catch (err) {
      if (!isPermissionDeniedError(err)) {
        throw err instanceof Error ? err : new Error('Could not save draft to Firestore.');
      }
      logFirestorePermissionError(err, 'write', `ideas/${draft.id}`);
    }
  }

  if (!savedToCloud) {
    try {
      await setDoc(
        doc(db, 'submissions', draft.id),
        buildFirestoreSubmissionDraftPayload(updatedDraft, nowIso),
        { merge: true }
      );
      updatedDraft.storageTarget = 'submissions';
      savedToCloud = true;
    } catch (subErr) {
      if (!isPermissionDeniedError(subErr)) {
        throw subErr instanceof Error ? subErr : new Error('Could not save draft to Firestore.');
      }
      logFirestorePermissionError(subErr, 'write', `submissions/${draft.id}`);
      throw new Error(
        `Could not save draft to Firestore (Missing or insufficient permissions). Publish firestore.rules to your Firebase project (${firebaseConfig.projectId}) and retry.`
      );
    }
  }

  clearLocalDraftsForUser(draft.submitterId);
  return updatedDraft;
}

export async function saveIdeaStep2(
  draft: IdeaDraft,
  ideaInput: WizardIdeaDetails,
  nextStep: number
): Promise<IdeaDraft> {
  const firestoreReady = await ensureFirestoreReadyForUser(draft.submitterId);
  if (!firestoreReady) {
    throw new Error(getFirestoreAuthFailureReason(draft.submitterId));
  }

  const nowIso = new Date().toISOString();
  const cleanTrl =
    ideaInput.trl !== null &&
    Number.isInteger(ideaInput.trl) &&
    ideaInput.trl >= 1 &&
    ideaInput.trl <= 9
      ? ideaInput.trl
      : null;
  const cleanJobs =
    ideaInput.jobsEstimate !== null &&
    Number.isInteger(ideaInput.jobsEstimate) &&
    ideaInput.jobsEstimate >= 0 &&
    ideaInput.jobsEstimate <= 10000
      ? ideaInput.jobsEstimate
      : null;

  const existingDocuments = normalizeIdeaDocuments(
    ideaInput.documents || draft.idea?.documents
  );
  const existingDeclaration = normalizeIdeaDeclaration(
    ideaInput.declaration || draft.idea?.declaration
  );

  const sanitizedIdea: WizardIdeaDetails = {
    title: ideaInput.title.slice(0, 120),
    sector: ideaInput.sector.trim(),
    subSector: ideaInput.subSector.trim(),
    problem: ideaInput.problem.slice(0, 1000),
    solution: ideaInput.solution.slice(0, 1000),
    beneficiaries: ideaInput.beneficiaries.slice(0, 500),
    innovationType: ideaInput.innovationType,
    trl: cleanTrl,
    ipStatus: ideaInput.ipStatus.trim(),
    jobsEstimate: cleanJobs,
    impactMetric: ideaInput.impactMetric.trim(),
    demographics: Array.from(new Set(ideaInput.demographics.filter(Boolean))),
    documents: existingDocuments,
    declaration: existingDeclaration,
  };

  const resolvedStep = Math.max(1, Math.min(4, nextStep));
  const updatedDraft: IdeaDraft = {
    ...draft,
    status: 'draft',
    currentStep: resolvedStep,
    idea: sanitizedIdea,
    updatedAt: nowIso,
  };

  // Write ONLY `idea`, `currentStep`, and `updatedAt` so `applicant` remains untouched
  const step2Payload: Record<string, unknown> = {
    idea: sanitizedIdea,
    currentStep: resolvedStep,
    updatedAt: nowIso,
  };

  let savedToCloud = false;

  if (updatedDraft.storageTarget !== 'submissions') {
    try {
      await setDoc(doc(db, 'ideas', draft.id), step2Payload, { merge: true });
      updatedDraft.storageTarget = 'ideas';
      savedToCloud = true;
    } catch (err) {
      if (!isPermissionDeniedError(err)) {
        throw err instanceof Error ? err : new Error('Could not save idea details to Firestore.');
      }
      logFirestorePermissionError(err, 'update', `ideas/${draft.id}`);
    }
  }

  if (!savedToCloud) {
    try {
      await setDoc(doc(db, 'submissions', draft.id), step2Payload, { merge: true });
      updatedDraft.storageTarget = 'submissions';
      savedToCloud = true;
    } catch (subErr) {
      if (!isPermissionDeniedError(subErr)) {
        throw subErr instanceof Error
          ? subErr
          : new Error('Could not save idea details to Firestore.');
      }
      logFirestorePermissionError(subErr, 'update', `submissions/${draft.id}`);
      throw new Error(
        `Could not save idea details to Firestore (Missing or insufficient permissions). Publish firestore.rules to your Firebase project (${firebaseConfig.projectId}) and retry.`
      );
    }
  }

  clearLocalDraftsForUser(draft.submitterId);
  return updatedDraft;
}

/* ============================================================================
 * SUBMISSION WIZARD — STEP 3 (DOCUMENTS UPLOAD & METADATA PERSISTENCE)
 * ============================================================================ */

export function formatDocumentFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';
  if (bytes < 1024 * 1024) {
    const kb = Math.max(1, Math.round(bytes / 1024));
    return `${kb} KB`;
  }
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
}

export function sanitiseDocumentFilename(rawName: string): string {
  const baseName = (rawName || 'document')
    .split(/[/\\]/)
    .pop()
    ?.trim() || 'document';
  const lastDot = baseName.lastIndexOf('.');
  const stem = lastDot > 0 ? baseName.slice(0, lastDot) : baseName;
  const ext = lastDot > 0 ? baseName.slice(lastDot).toLowerCase() : '';

  const safeStem =
    stem
      .replace(/[^a-zA-Z0-9._-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^[-.]+|[-.]+$/g, '')
      .slice(0, 80) || 'document';
  const safeExt = /^\.[a-z0-9]{1,8}$/.test(ext) ? ext : '';

  return `${safeStem}${safeExt}`;
}

export function resolveDocumentContentType(file: File): string {
  const mime = (file.type || '').trim().toLowerCase();
  if (
    (DOCUMENT_ACCEPTED_MIME_TYPES as readonly string[]).includes(mime)
  ) {
    return mime;
  }
  const lowerName = file.name.toLowerCase();
  if (lowerName.endsWith('.pdf')) return 'application/pdf';
  if (lowerName.endsWith('.docx')) {
    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  }
  if (lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg')) return 'image/jpeg';
  if (lowerName.endsWith('.png')) return 'image/png';
  return '';
}

export function countAttachedIdeaFiles(
  docs: WizardIdeaDocuments | null | undefined
): number {
  if (!docs) return 0;
  let total = 0;
  if (docs.omang) total += 1;
  if (docs.conceptNote) total += 1;
  if (docs.budget) total += 1;
  if (docs.proofOfResidence) total += 1;
  if (docs.cipa) total += 1;
  if (Array.isArray(docs.letters)) total += docs.letters.length;
  return total;
}

export function validateDocumentFileForSlot(
  file: File,
  currentDocuments: WizardIdeaDocuments,
  slotKey: DocumentSlotKey,
  isReplacing = false
): string | null {
  const contentType = resolveDocumentContentType(file);
  const lowerName = file.name.trim().toLowerCase();
  const hasAllowedExt = DOCUMENT_ACCEPTED_EXTENSIONS.some((ext) =>
    lowerName.endsWith(ext)
  );

  if (!contentType || !hasAllowedExt) {
    return 'Only PDF, DOCX, JPG or PNG files are accepted.';
  }

  if (file.size <= 0) {
    return 'Selected file is empty.';
  }

  const existingInSlot: IdeaDocumentFile[] =
    slotKey === 'letters'
      ? currentDocuments.letters
      : currentDocuments[slotKey] && !isReplacing
      ? [currentDocuments[slotKey] as IdeaDocumentFile]
      : [];

  const isDuplicate = existingInSlot.some(
    (item) =>
      item.name.trim().toLowerCase() === lowerName && item.size === file.size
  );
  if (isDuplicate) {
    return slotKey === 'letters'
      ? 'This file is already attached in Letters of support / MOUs.'
      : 'This file is already attached to this slot.';
  }

  if (!isReplacing) {
    const totalAttached = countAttachedIdeaFiles(currentDocuments);
    if (totalAttached >= DOCUMENT_MAX_FILES_PER_IDEA) {
      return `Maximum of ${DOCUMENT_MAX_FILES_PER_IDEA} files per application reached.`;
    }
  }

  if (file.size > DOCUMENT_MAX_FILE_SIZE_BYTES) {
    return `File is too large. Maximum upload size is ${DOCUMENT_MAX_FILE_SIZE_MB} MB.`;
  }

  return null;
}

function extractBase64FromDataUrl(dataUrl: string): string {
  const commaIdx = dataUrl.indexOf(',');
  return commaIdx >= 0 ? dataUrl.slice(commaIdx + 1) : dataUrl;
}

function base64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const cleanBase64 = base64.includes(',') ? extractBase64FromDataUrl(base64) : base64;
  const binary = atob(cleanBase64);
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export interface SaveIdeaDocumentParams {
  draft: IdeaDraft;
  documents: WizardIdeaDocuments;
  docType: DocumentSlotKey;
  file: File;
  replacingFileId?: string;
  note?: string;
}

export interface SaveIdeaDocumentResult {
  uploadedFile: IdeaDocumentFile;
  nextDocuments: WizardIdeaDocuments;
  updatedDraft: IdeaDraft;
}

export async function saveIdeaDocumentToFirestore({
  draft,
  documents,
  docType,
  file,
  replacingFileId,
  note,
}: SaveIdeaDocumentParams): Promise<SaveIdeaDocumentResult> {
  const firestoreReady = await ensureFirestoreReadyForUser(draft.submitterId);
  if (!firestoreReady) {
    throw new Error(getFirestoreAuthFailureReason(draft.submitterId));
  }

  const isReplacing = Boolean(replacingFileId && docType !== 'letters');
  const validationError = validateDocumentFileForSlot(
    file,
    documents,
    docType,
    isReplacing
  );
  if (validationError) {
    throw new Error(validationError);
  }

  const resolvedType = resolveDocumentContentType(file);
  if (!resolvedType) {
    throw new Error('Only PDF, DOCX, JPG or PNG files are accepted.');
  }

  const existingToReplace =
    isReplacing && docType !== 'letters' ? documents[docType] : null;

  // 1. Upload file to Supabase Storage (`ceda-hack-docs` bucket) & save record in Firestore `documents` collection
  const storedRecord = await uploadDocumentToSupabaseAndFirestore({
    file,
    userId: draft.submitterId,
    ideaId: draft.id,
    docType,
    note,
  });

  const cleanNote = note?.trim().slice(0, 200);
  const targetCollection = draft.storageTarget === 'submissions' ? 'submissions' : 'ideas';
  const ideaRef = doc(db, targetCollection, draft.id);

  const newMeta: IdeaDocumentFile = {
    fileId: storedRecord.id,
    documentId: storedRecord.id,
    name: storedRecord.name,
    size: storedRecord.size,
    contentType: storedRecord.type,
    storagePath: storedRecord.storagePath,
    publicUrl: storedRecord.publicUrl,
    uploaderId: storedRecord.uploaderId,
    uploadedAt: storedRecord.createdAt,
    ...(cleanNote ? { note: cleanNote } : {}),
  };

  const previousDocuments = sanitizeIdeaDocumentsForFirestore(documents);
  const nextDocuments: WizardIdeaDocuments = sanitizeIdeaDocumentsForFirestore(
    docType === 'letters'
      ? {
          ...previousDocuments,
          letters: [...previousDocuments.letters, newMeta],
        }
      : {
          ...previousDocuments,
          [docType]: newMeta,
        }
  );

  // 2. Persist document metadata on the idea draft
  try {
    await updateDoc(ideaRef, {
      'idea.documents': nextDocuments,
      updatedAt: storedRecord.createdAt,
    });
  } catch (err) {
    // Roll back Supabase file and Firestore `documents` record if idea update fails
    await deleteDocumentFromSupabaseAndFirestore({
      documentId: storedRecord.id,
      storagePath: storedRecord.storagePath,
      userId: draft.submitterId,
    }).catch(() => {
      // Best-effort rollback
    });
    if (isPermissionDeniedError(err)) {
      logFirestorePermissionError(err, 'update', `${targetCollection}/${draft.id}`);
    }
    throw new Error('Could not save. Retry');
  }

  // 3. If replacing an existing file, clean up the old file from Supabase + Firestore
  const oldFileId = existingToReplace?.fileId || replacingFileId;
  if (oldFileId && oldFileId !== storedRecord.id) {
    if (existingToReplace?.storagePath || existingToReplace?.documentId) {
      await deleteDocumentFromSupabaseAndFirestore({
        documentId: existingToReplace.documentId || oldFileId,
        storagePath: existingToReplace.storagePath,
        userId: draft.submitterId,
      }).catch((cleanupErr) => {
        console.warn('Old Supabase document cleanup warning:', cleanupErr);
      });
    } else {
      await deleteDoc(doc(db, targetCollection, draft.id, 'files', oldFileId)).catch(() => {
        // Ignore legacy subcollection cleanup errors
      });
    }
  }

  clearLocalDraftsForUser(draft.submitterId);
  const currentIdea = draft.idea ?? createEmptyIdeaDetails();
  const updatedDraft: IdeaDraft = {
    ...draft,
    idea: {
      ...currentIdea,
      documents: nextDocuments,
    },
    updatedAt: storedRecord.createdAt,
  };

  return {
    uploadedFile: newMeta,
    nextDocuments,
    updatedDraft,
  };
}

export interface RemoveIdeaDocumentParams {
  draft: IdeaDraft;
  documents: WizardIdeaDocuments;
  slotKey: DocumentSlotKey;
  letterIndex?: number;
}

export interface RemoveIdeaDocumentResult {
  nextDocuments: WizardIdeaDocuments;
  updatedDraft: IdeaDraft;
}

export async function removeIdeaDocumentFromFirestore({
  draft,
  documents,
  slotKey,
  letterIndex,
}: RemoveIdeaDocumentParams): Promise<RemoveIdeaDocumentResult> {
  const firestoreReady = await ensureFirestoreReadyForUser(draft.submitterId);
  if (!firestoreReady) {
    throw new Error(getFirestoreAuthFailureReason(draft.submitterId));
  }

  const targetFile =
    slotKey === 'letters'
      ? typeof letterIndex === 'number'
        ? documents.letters[letterIndex] || null
        : null
      : documents[slotKey];

  if (!targetFile) {
    return {
      nextDocuments: sanitizeIdeaDocumentsForFirestore(documents),
      updatedDraft: draft,
    };
  }

  const nowIso = new Date().toISOString();
  const targetCollection = draft.storageTarget === 'submissions' ? 'submissions' : 'ideas';
  const ideaRef = doc(db, targetCollection, draft.id);
  const previousDocuments = sanitizeIdeaDocumentsForFirestore(documents);
  const nextDocuments = sanitizeIdeaDocumentsForFirestore(
    slotKey === 'letters'
      ? {
          ...previousDocuments,
          letters: previousDocuments.letters.filter((_, idx) => idx !== letterIndex),
        }
      : {
          ...previousDocuments,
          [slotKey]: null,
        }
  );

  // 1. Delete from Supabase Storage and Firestore `documents` collection (or legacy subcollection)
  if (targetFile.storagePath || targetFile.documentId) {
    await deleteDocumentFromSupabaseAndFirestore({
      documentId: targetFile.documentId || targetFile.fileId,
      storagePath: targetFile.storagePath,
      userId: draft.submitterId,
    });
  } else if (targetFile.fileId) {
    try {
      await deleteDoc(doc(db, targetCollection, draft.id, 'files', targetFile.fileId));
    } catch (err) {
      if (isPermissionDeniedError(err)) {
        logFirestorePermissionError(
          err,
          'delete',
          `${targetCollection}/${draft.id}/files/${targetFile.fileId}`
        );
      }
      throw new Error('Could not remove file. Retry');
    }
  }

  // 2. Remove metadata reference from idea.documents
  try {
    await updateDoc(ideaRef, {
      'idea.documents': nextDocuments,
      updatedAt: nowIso,
    });
  } catch (err) {
    if (isPermissionDeniedError(err)) {
      logFirestorePermissionError(err, 'update', `${targetCollection}/${draft.id}`);
    }
    throw new Error('Could not save. Retry');
  }

  clearLocalDraftsForUser(draft.submitterId);
  const currentIdea = draft.idea ?? createEmptyIdeaDetails();
  const updatedDraft: IdeaDraft = {
    ...draft,
    idea: {
      ...currentIdea,
      documents: nextDocuments,
    },
    updatedAt: nowIso,
  };

  return {
    nextDocuments,
    updatedDraft,
  };
}

export async function openIdeaDocumentPreview(
  ideaId: string,
  storageTarget: DraftStorageTarget | undefined,
  file: IdeaDocumentFile
): Promise<void> {
  if (!file?.fileId && !file?.publicUrl) {
    throw new Error('File record is missing.');
  }

  let directUrl = file.publicUrl?.trim() || '';
  if (!directUrl && (file.documentId || file.storagePath)) {
    directUrl =
      (await getDocumentPublicUrlFromFirestore(file.documentId || file.fileId)) || '';
  }

  if (directUrl) {
    const anchor = document.createElement('a');
    anchor.href = directUrl;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    return;
  }

  // Fallback for legacy base64 records stored in subcollection
  if (!ideaId || !file?.fileId) {
    throw new Error('File record is missing.');
  }

  const targetCollection = storageTarget === 'submissions' ? 'submissions' : 'ideas';
  const fileSnap = await getDoc(doc(db, targetCollection, ideaId, 'files', file.fileId));
  if (!fileSnap.exists()) {
    throw new Error('File could not be found.');
  }

  const raw = fileSnap.data() as Record<string, unknown>;
  const base64Data = typeof raw.data === 'string' ? raw.data : '';
  if (!base64Data) {
    throw new Error('File data is missing.');
  }

  const contentType =
    typeof raw.contentType === 'string' && raw.contentType.trim()
      ? raw.contentType.trim()
      : file.contentType || 'application/octet-stream';

  const bytes = base64ToUint8Array(base64Data);
  const blob = new Blob([bytes], { type: contentType });
  const objectUrl = URL.createObjectURL(blob);

  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.target = '_blank';
  anchor.rel = 'noopener noreferrer';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  window.setTimeout(() => {
    URL.revokeObjectURL(objectUrl);
  }, 60_000);
}

export function sanitizeIdeaDocumentsForFirestore(
  docs: WizardIdeaDocuments
): WizardIdeaDocuments {
  const cleanFile = (file: IdeaDocumentFile | null): IdeaDocumentFile | null => {
    if (!file || !file.fileId?.trim()) return null;
    const cleanNote = file.note?.trim().slice(0, 200);
    return {
      fileId: file.fileId.trim(),
      ...(file.documentId?.trim() ? { documentId: file.documentId.trim() } : {}),
      name: file.name.trim(),
      size: Math.max(0, Math.round(file.size)),
      contentType: file.contentType.trim(),
      ...(file.storagePath?.trim() ? { storagePath: file.storagePath.trim() } : {}),
      ...(file.publicUrl?.trim() ? { publicUrl: file.publicUrl.trim() } : {}),
      ...(file.uploaderId?.trim() ? { uploaderId: file.uploaderId.trim() } : {}),
      uploadedAt: file.uploadedAt,
      ...(cleanNote ? { note: cleanNote } : {}),
    };
  };

  return {
    omang: cleanFile(docs.omang),
    conceptNote: cleanFile(docs.conceptNote),
    budget: cleanFile(docs.budget),
    proofOfResidence: cleanFile(docs.proofOfResidence),
    cipa: cleanFile(docs.cipa),
    letters: docs.letters
      .map((item) => cleanFile(item))
      .filter((item): item is IdeaDocumentFile => Boolean(item))
      .slice(0, MAX_SUPPORT_LETTERS),
  };
}

export async function saveIdeaStep3Documents(
  draft: IdeaDraft,
  documentsInput: WizardIdeaDocuments,
  nextStepOverride?: number
): Promise<IdeaDraft> {
  const firestoreReady = await ensureFirestoreReadyForUser(draft.submitterId);
  if (!firestoreReady) {
    throw new Error(getFirestoreAuthFailureReason(draft.submitterId));
  }

  const nowIso = new Date().toISOString();
  const cleanDocuments = sanitizeIdeaDocumentsForFirestore(documentsInput);
  const resolvedStep =
    nextStepOverride !== undefined
      ? Math.max(draft.currentStep || 3, Math.min(4, nextStepOverride))
      : Math.max(1, Math.min(4, draft.currentStep || 3));

  const currentIdea = draft.idea ?? createEmptyIdeaDetails();
  const updatedDraft: IdeaDraft = {
    ...draft,
    status: 'draft',
    currentStep: resolvedStep,
    idea: {
      ...currentIdea,
      documents: cleanDocuments,
    },
    updatedAt: nowIso,
  };

  const targetCollection = draft.storageTarget === 'submissions' ? 'submissions' : 'ideas';
  const docRef = doc(db, targetCollection, draft.id);

  const updatePayloadStep3 = {
    'idea.documents': cleanDocuments,
    updatedAt: nowIso,
    ...(nextStepOverride !== undefined ? { currentStep: resolvedStep } : {}),
  };
  console.log(`[SubmitterService] updateDoc on ${targetCollection}/${draft.id}:`, JSON.stringify(updatePayloadStep3, null, 2));

  try {
    await updateDoc(docRef, updatePayloadStep3);

    // Keep optional letter notes synced on the corresponding Firestore `documents` record (or legacy file doc)
    await Promise.all(
      cleanDocuments.letters.map((letter) => {
        if (letter.documentId || letter.storagePath) {
          return updateDocumentNoteInFirestore(
            letter.documentId || letter.fileId,
            letter.note || ''
          ).catch(() => {
            // Ignore sync if doc note already matches or missing
          });
        }
        return updateDoc(doc(db, targetCollection, draft.id, 'files', letter.fileId), {
          note: letter.note || '',
        }).catch(() => {
          // Ignore sync if file doc note already matches or missing
        });
      })
    );
  } catch (err) {
    if (isPermissionDeniedError(err)) {
      logFirestorePermissionError(err, 'update', `${targetCollection}/${draft.id}`);
    }
    throw new Error('Could not save. Retry');
  }

  clearLocalDraftsForUser(draft.submitterId);
  return updatedDraft;
}

/* ============================================================================
 * SUBMISSION WIZARD — STEP 4 (REVIEW, DECLARATION & FINAL SUBMISSION)
 * ============================================================================ */

export async function saveIdeaStep4Declaration(
  draft: IdeaDraft,
  declarationInput: WizardIdeaDeclaration,
  nextStepOverride?: number
): Promise<IdeaDraft> {
  const firestoreReady = await ensureFirestoreReadyForUser(draft.submitterId);
  if (!firestoreReady) {
    throw new Error(getFirestoreAuthFailureReason(draft.submitterId));
  }

  const nowIso = new Date().toISOString();
  const cleanDeclaration: WizardIdeaDeclaration = {
    accepted: Boolean(declarationInput.accepted),
    acceptedAt: declarationInput.accepted
      ? declarationInput.acceptedAt || nowIso
      : null,
  };

  const resolvedStep =
    nextStepOverride !== undefined
      ? Math.max(draft.currentStep || 4, Math.min(4, nextStepOverride))
      : Math.max(4, Math.min(4, draft.currentStep || 4));

  const currentIdea = draft.idea ?? createEmptyIdeaDetails();
  const updatedDraft: IdeaDraft = {
    ...draft,
    status: 'draft',
    currentStep: resolvedStep,
    idea: {
      ...currentIdea,
      declaration: cleanDeclaration,
    },
    updatedAt: nowIso,
  };

  const targetCollection = draft.storageTarget === 'submissions' ? 'submissions' : 'ideas';
  const docRef = doc(db, targetCollection, draft.id);

  const updatePayloadStep4 = {
    'idea.declaration': cleanDeclaration,
    updatedAt: nowIso,
    ...(nextStepOverride !== undefined ? { currentStep: resolvedStep } : {}),
  };
  console.log(`[SubmitterService] updateDoc on ${targetCollection}/${draft.id}:`, JSON.stringify(updatePayloadStep4, null, 2));

  try {
    await updateDoc(docRef, updatePayloadStep4);
  } catch (err) {
    if (isPermissionDeniedError(err)) {
      logFirestorePermissionError(err, 'update', `${targetCollection}/${draft.id}`);
      throw new Error(
        `Could not save your declaration to Firestore (Missing or insufficient permissions). Publish firestore.rules to your Firebase project (${firebaseConfig.projectId}) and retry.`
      );
    }
    try {
      await setDoc(
        docRef,
        {
          idea: {
            declaration: cleanDeclaration,
          },
          updatedAt: nowIso,
          ...(nextStepOverride !== undefined ? { currentStep: resolvedStep } : {}),
        },
        { merge: true }
      );
    } catch (fallbackErr) {
      if (isPermissionDeniedError(fallbackErr)) {
        logFirestorePermissionError(
          fallbackErr,
          'write',
          `${targetCollection}/${draft.id}`
        );
      }
      throw fallbackErr instanceof Error
        ? fallbackErr
        : new Error('Could not save your declaration to Firestore.');
    }
  }

  clearLocalDraftsForUser(draft.submitterId);
  return updatedDraft;
}

function isTransactionContentionError(err: unknown): boolean {
  const code = (err as { code?: string })?.code || '';
  const message =
    err instanceof Error ? err.message.toLowerCase() : String(err || '').toLowerCase();
  return (
    code === 'aborted' ||
    code === 'failed-precondition' ||
    message.includes('contention') ||
    message.includes('aborted')
  );
}

export async function submitFinalIdeaApplication(draft: IdeaDraft): Promise<IdeaDraft> {
  const firestoreReady = await ensureFirestoreReadyForUser(draft.submitterId);
  if (!firestoreReady) {
    throw new Error(getFirestoreAuthFailureReason(draft.submitterId));
  }

  if (draft.status !== 'draft') {
    return draft;
  }

  const nowIso = new Date().toISOString();
  const cleanDeclaration: WizardIdeaDeclaration = {
    accepted: true,
    acceptedAt: draft.idea?.declaration?.acceptedAt || nowIso,
  };

  const targetCollection = draft.storageTarget === 'submissions' ? 'submissions' : 'ideas';
  const ideaRef = doc(db, targetCollection, draft.id);
  const year = new Date().getFullYear();
  const counterRef = doc(db, 'counters', `ideaRef-${year}`);
  const ownerUid = auth?.currentUser?.uid || draft.submitterId;

  let assignedReference = draft.reference?.trim() || '';
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const txResult = await runTransaction(db, async (tx) => {
        const ideaSnap = await tx.get(ideaRef);
        if (!ideaSnap.exists()) {
          throw new Error('Application draft could not be found.');
        }

        const ideaData = ideaSnap.data() as Record<string, unknown>;
        if (String(ideaData.submitterId || '') !== ownerUid) {
          throw new Error('You do not have permission to submit this application.');
        }

        const existingRef =
          typeof ideaData.reference === 'string' && ideaData.reference.trim()
            ? ideaData.reference.trim()
            : '';

        if (existingRef) {
          if (String(ideaData.status || '').toLowerCase() === 'draft') {
            tx.update(ideaRef, {
              status: 'submitted',
              submittedAt: ideaData.submittedAt || serverTimestamp(),
              reference: existingRef,
              'idea.declaration': cleanDeclaration,
              currentStep: 4,
              stage: 'submitted',
              updatedAt: serverTimestamp(),
            });
          }
          return { reference: existingRef };
        }

        const counterSnap = await tx.get(counterRef);
        const counterData = counterSnap.exists()
          ? (counterSnap.data() as Record<string, unknown>)
          : null;
        const currentValueRaw = counterData
          ? Number(counterData.value ?? counterData.seq ?? 0)
          : 0;
        const nextValue =
          Number.isFinite(currentValueRaw) && currentValueRaw >= 0
            ? Math.floor(currentValueRaw) + 1
            : 1;
        const nextReference = `CEDA-INN-${year}-${String(nextValue).padStart(4, '0')}`;

        if (!counterSnap.exists()) {
          tx.set(counterRef, {
            value: 1,
            year,
            updatedAt: serverTimestamp(),
          });
        } else {
          tx.update(counterRef, {
            value: nextValue,
            year,
            updatedAt: serverTimestamp(),
          });
        }

        const submitPayload = {
          status: 'submitted',
          submittedAt: serverTimestamp(),
          reference: nextReference,
          'idea.declaration': cleanDeclaration,
          currentStep: 4,
          stage: 'submitted',
          updatedAt: serverTimestamp(),
        };
        console.log(`[SubmitterService] tx.update on ${targetCollection}/${draft.id}:`, JSON.stringify(submitPayload, null, 2));

        tx.update(ideaRef, submitPayload);

        return { reference: nextReference };
      });

      assignedReference = txResult.reference;
      break;
    } catch (err) {
      if (isTransactionContentionError(err) && attempt < maxAttempts) {
        await new Promise((resolve) =>
          window.setTimeout(resolve, 120 * attempt + Math.round(Math.random() * 80))
        );
        continue;
      }

      if (isPermissionDeniedError(err)) {
        logFirestorePermissionError(err, 'update', `${targetCollection}/${draft.id}`);
        throw new Error(
          `Unable to submit your application due to Firestore permissions. Verify your required documents and declaration are complete, or publish the latest firestore.rules to (${firebaseConfig.projectId}).`
        );
      }

      throw err instanceof Error
        ? err
        : new Error('Unable to submit your application right now. Please try again.');
    }
  }

  clearLocalDraftsForUser(draft.submitterId);
  const currentIdea = draft.idea ?? createEmptyIdeaDetails();
  return {
    ...draft,
    status: 'submitted',
    currentStep: 4,
    reference: assignedReference || undefined,
    stage: 'submitted',
    submittedAt: nowIso,
    updatedAt: nowIso,
    idea: {
      ...currentIdea,
      declaration: cleanDeclaration,
    },
  };
}



