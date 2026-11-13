/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { deleteApp, initializeApp } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  getAuth,
  sendPasswordResetEmail,
  signOut,
} from 'firebase/auth';
import { addDoc, collection, doc, getDocs, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db, firebaseConfig } from '../config/firebase';
import { AccountStatus, AccountType, UserRole } from '../types/auth';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const currentAuthUser = auth?.currentUser;
  const rawMessage = error instanceof Error ? error.message : String(error);
  const code = (error as { code?: string })?.code || '';

  const errInfo: FirestoreErrorInfo = {
    error: rawMessage,
    authInfo: {
      userId: currentAuthUser?.uid ?? null,
      email: currentAuthUser?.email ?? null,
      emailVerified: currentAuthUser?.emailVerified ?? null,
      isAnonymous: currentAuthUser?.isAnonymous ?? null,
      tenantId: currentAuthUser?.tenantId ?? null,
      providerInfo:
        currentAuthUser?.providerData?.map((provider: { providerId?: string | null; email?: string | null }) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));

  if (
    code === 'permission-denied' ||
    rawMessage.toLowerCase().includes('missing or insufficient permissions')
  ) {
    if (!currentAuthUser) {
      throw new Error(
        'Missing or insufficient permissions: You are in a local prototype session with no active Firebase Auth sign-in. Sign out and sign in on /login with a Firebase Auth administrator account.'
      );
    }
    throw new Error(
      `Missing or insufficient permissions on "${path}". Publish the updated firestore.rules in Firebase Console and verify that users/${currentAuthUser.uid} has role "ADMIN".`
    );
  }

  throw error instanceof Error ? error : new Error(rawMessage);
}

export interface AdminUserRecord {
  id: string;
  displayName: string;
  firstName: string;
  surname: string;
  fullName: string;
  email: string;
  phone: string;
  organisation: string;
  omangOrPassport: string;
  district: string;
  town: string;
  accountType: AccountType;
  role: UserRole;
  status: AccountStatus;
  emailVerified: boolean;
  phoneVerified: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  lastLoginAt: string;
}

export interface AuditActor {
  id: string;
  name: string;
}

export interface CreateUserByAdminPayload {
  firstName: string;
  surname: string;
  email: string;
  phone: string;
  role: UserRole;
  organisation: string;
  sendPasswordSetupEmail: boolean;
}

export interface EditUserProfilePayload {
  firstName: string;
  surname: string;
  phone: string;
  organisation: string;
}

const VALID_ROLES: UserRole[] = ['SUBMITTER', 'EVALUATOR', 'ADJUDICATOR', 'ADMIN', 'STAKEHOLDER'];

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

function normalizeRole(val: unknown): UserRole {
  const raw = String(val || 'SUBMITTER').trim().toUpperCase();
  if (raw === 'ADMINISTRATOR') return 'ADMIN';
  if (raw === 'COMMITTEE STAKEHOLDER' || raw === 'COMMITTEE_STAKEHOLDER') return 'STAKEHOLDER';
  return VALID_ROLES.includes(raw as UserRole) ? (raw as UserRole) : 'SUBMITTER';
}

function normalizeStatus(val: unknown): AccountStatus {
  const raw = String(val || 'ACTIVE').trim().toUpperCase();
  if (raw === 'LOCKED' || raw === 'SUSPENDED') return 'SUSPENDED';
  if (raw === 'DEACTIVATED' || raw === 'INACTIVE' || raw === 'REJECTED') return 'DEACTIVATED';
  if (raw === 'PENDING') return 'PENDING';
  return 'ACTIVE';
}

function resolveDisplayName(raw: Record<string, unknown>, email: string): string {
  const explicitDisplayName = typeof raw.displayName === 'string' ? raw.displayName.trim() : '';
  if (explicitDisplayName) return explicitDisplayName;

  const first = typeof raw.firstName === 'string' ? raw.firstName.trim() : '';
  const last = typeof raw.surname === 'string' ? raw.surname.trim() : '';
  const combined = [first, last].filter(Boolean).join(' ').trim();
  if (combined) return combined;

  const full = typeof raw.fullName === 'string' ? raw.fullName.trim() : '';
  if (full && full !== raw.id) return full;

  if (email && email.includes('@')) {
    const prefix = email.split('@')[0]?.trim();
    if (prefix) return prefix;
  }

  return 'Unnamed user';
}

function generateRandomPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*';
  const bytes = new Uint8Array(24);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  let pwd = '';
  for (let i = 0; i < bytes.length; i++) {
    pwd += chars[bytes[i] % chars.length];
  }
  return `${pwd}Aa1!`;
}

export async function appendAuditLog(params: {
  actor: AuditActor;
  action: string;
  targetId: string;
  targetName: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
}): Promise<void> {
  if (!db) return;
  try {
    await addDoc(collection(db, 'auditLogs'), {
      actorId: params.actor.id,
      actorName: params.actor.name,
      action: params.action,
      targetId: params.targetId,
      targetName: params.targetName,
      before: params.before,
      after: params.after,
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('Audit log write note:', err);
  }
}

export async function fetchAllUsersFromFirestore(): Promise<AdminUserRecord[]> {
  if (!db) {
    throw new Error('Firestore is not initialized.');
  }

  let snap;
  try {
    snap = await getDocs(collection(db, 'users'));
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'users');
  }
  const users: AdminUserRecord[] = [];

  snap.forEach((docSnap) => {
    const raw = docSnap.data() as Record<string, unknown>;
    const email = typeof raw.email === 'string' ? raw.email.trim() : '';
    const firstName = typeof raw.firstName === 'string' ? raw.firstName.trim() : '';
    const surname = typeof raw.surname === 'string' ? raw.surname.trim() : '';
    const fullName = resolveDisplayName(raw, email);
    const organisation =
      (typeof raw.organisation === 'string' && raw.organisation.trim()) ||
      (typeof raw.organization === 'string' && raw.organization.trim()) ||
      (typeof raw.tradingName === 'string' && raw.tradingName.trim()) ||
      '';

    users.push({
      id: docSnap.id,
      displayName: fullName,
      firstName,
      surname,
      fullName,
      email,
      phone: typeof raw.phone === 'string' ? raw.phone.trim() : '',
      organisation,
      omangOrPassport: typeof raw.omangOrPassport === 'string' ? raw.omangOrPassport.trim() : '',
      district: typeof raw.district === 'string' ? raw.district.trim() : '',
      town: typeof raw.town === 'string' ? raw.town.trim() : '',
      accountType: raw.accountType === 'business' ? 'business' : 'individual',
      role: normalizeRole(raw.role),
      status: normalizeStatus(raw.status),
      emailVerified: Boolean(raw.emailVerified),
      phoneVerified: Boolean(raw.phoneVerified),
      createdAt: normalizeTimestamp(raw.createdAt),
      updatedAt: normalizeTimestamp(raw.updatedAt),
      createdBy: typeof raw.createdBy === 'string' ? raw.createdBy : '',
      lastLoginAt: normalizeTimestamp(raw.lastLoginAt || raw.lastSignInAt),
    });
  });

  users.sort((a, b) => {
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return timeB - timeA;
  });

  return users;
}

export async function createUserByAdmin(
  payload: CreateUserByAdminPayload,
  actor: AuditActor,
  existingEmails: string[]
): Promise<AdminUserRecord> {
  if (!db) {
    throw new Error('Firestore is not initialized.');
  }

  const cleanEmail = payload.email.trim().toLowerCase();
  const cleanFirstName = payload.firstName.trim();
  const cleanSurname = payload.surname.trim();
  const cleanPhone = payload.phone.replace(/\D/g, '');
  const cleanOrganisation = payload.organisation.trim();
  const displayName = `${cleanFirstName} ${cleanSurname}`.trim();

  if (existingEmails.some((e) => e.trim().toLowerCase() === cleanEmail)) {
    throw new Error('An account with this email address already exists.');
  }

  const secondaryAppName = `ceda-admin-create-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
  const secondaryAuth = getAuth(secondaryApp);

  try {
    const tempPassword = generateRandomPassword();
    let uid = '';

    try {
      const cred = await createUserWithEmailAndPassword(secondaryAuth, cleanEmail, tempPassword);
      uid = cred.user.uid;
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === 'auth/email-already-in-use') {
        throw new Error('An account with this email address already exists.');
      }
      if (code === 'auth/invalid-email') {
        throw new Error('Please enter a valid email address.');
      }
      throw err instanceof Error ? err : new Error('Failed to create authentication account.');
    }

    const nowIso = new Date().toISOString();
    const userDoc = {
      id: uid,
      displayName,
      firstName: cleanFirstName,
      surname: cleanSurname,
      fullName: displayName,
      email: cleanEmail,
      phone: cleanPhone,
      organisation: cleanOrganisation,
      role: payload.role,
      status: 'active',
      emailVerified: false,
      phoneVerified: false,
      createdAt: nowIso,
      updatedAt: nowIso,
      createdBy: actor.id,
      lastLoginAt: null,
    };

    try {
      await setDoc(doc(db, 'users', uid), userDoc);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `users/${uid}`);
    }

    if (payload.sendPasswordSetupEmail) {
      try {
        secondaryAuth.languageCode = 'en';
        await sendPasswordResetEmail(secondaryAuth, cleanEmail);
      } catch (err) {
        const mapped = mapPasswordResetError(err);
        throw new Error(
          `User account was created, but the password setup email could not be sent: ${mapped.message}`
        );
      }
    }

    await appendAuditLog({
      actor,
      action: 'user created',
      targetId: uid,
      targetName: displayName,
      before: null,
      after: {
        email: cleanEmail,
        role: payload.role,
        status: 'active',
        organisation: cleanOrganisation,
      },
    });

    return {
      id: uid,
      displayName,
      firstName: cleanFirstName,
      surname: cleanSurname,
      fullName: displayName,
      email: cleanEmail,
      phone: cleanPhone,
      organisation: cleanOrganisation,
      omangOrPassport: '',
      district: '',
      town: '',
      accountType: 'individual',
      role: payload.role,
      status: 'ACTIVE',
      emailVerified: false,
      phoneVerified: false,
      createdAt: nowIso,
      updatedAt: nowIso,
      createdBy: actor.id,
      lastLoginAt: '',
    };
  } finally {
    try {
      await signOut(secondaryAuth);
    } catch {
      // ignore
    }
    try {
      await deleteApp(secondaryApp);
    } catch {
      // ignore
    }
  }
}

export async function updateUserProfileInFirestore(
  user: AdminUserRecord,
  updates: EditUserProfilePayload,
  actor: AuditActor
): Promise<AdminUserRecord> {
  if (!db) throw new Error('Firestore is not initialized.');
  const firstName = updates.firstName.trim();
  const surname = updates.surname.trim();
  const phone = updates.phone.replace(/\D/g, '');
  const organisation = updates.organisation.trim();
  const displayName = `${firstName} ${surname}`.trim() || user.displayName;
  const updatedAt = new Date().toISOString();

  try {
    await updateDoc(doc(db, 'users', user.id), {
      firstName,
      surname,
      displayName,
      fullName: displayName,
      phone,
      organisation,
      updatedAt,
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `users/${user.id}`);
  }

  await appendAuditLog({
    actor,
    action: 'user updated',
    targetId: user.id,
    targetName: displayName,
    before: {
      displayName: user.displayName,
      phone: user.phone,
      organisation: user.organisation,
    },
    after: {
      displayName,
      phone,
      organisation,
    },
  });

  return {
    ...user,
    firstName,
    surname,
    displayName,
    fullName: displayName,
    phone,
    organisation,
    updatedAt,
  };
}

export async function updateUserRoleInFirestore(
  user: AdminUserRecord,
  role: UserRole,
  actor: AuditActor
): Promise<void> {
  if (!db) throw new Error('Firestore is not initialized.');
  if (user.id === actor.id && role !== 'ADMIN') {
    throw new Error('Administrators cannot demote their own account.');
  }

  try {
    await updateDoc(doc(db, 'users', user.id), {
      role,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `users/${user.id}`);
  }

  await appendAuditLog({
    actor,
    action: 'role changed',
    targetId: user.id,
    targetName: user.displayName,
    before: { role: user.role },
    after: { role },
  });
}

export async function updateUserStatusInFirestore(
  user: AdminUserRecord,
  status: AccountStatus,
  actor: AuditActor,
  auditAction: 'suspended' | 'reactivated' | 'deactivated' | 'approved' | 'rejected'
): Promise<void> {
  if (!db) throw new Error('Firestore is not initialized.');
  if (user.id === actor.id && (status === 'SUSPENDED' || status === 'DEACTIVATED')) {
    throw new Error('Administrators cannot suspend or deactivate their own account.');
  }

  const firestoreStatus = status.toLowerCase();
  const payload: Record<string, unknown> = {
    status: firestoreStatus,
    updatedAt: new Date().toISOString(),
  };
  if (status === 'ACTIVE' && auditAction === 'approved') {
    payload.emailVerified = true;
    payload.phoneVerified = true;
  }

  try {
    await updateDoc(doc(db, 'users', user.id), payload);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `users/${user.id}`);
  }

  await appendAuditLog({
    actor,
    action: auditAction,
    targetId: user.id,
    targetName: user.displayName,
    before: { status: user.status.toLowerCase() },
    after: { status: firestoreStatus },
  });
}

function mapPasswordResetError(err: unknown): Error {
  const code = (err as { code?: string })?.code || '';
  const rawMessage = err instanceof Error ? err.message : String(err);

  switch (code) {
    case 'auth/invalid-email':
      return new Error('The email address on this account is invalid.');
    case 'auth/user-not-found':
      return new Error(
        'No Firebase Authentication account exists for this email address. Ask the user to register or create them via Add user.'
      );
    case 'auth/too-many-requests':
      return new Error(
        'Too many password reset requests for this account. Please wait a few minutes before trying again.'
      );
    case 'auth/network-request-failed':
      return new Error(
        'Network error while contacting Firebase Authentication. Check your internet connection and retry.'
      );
    case 'auth/operation-not-allowed':
      return new Error(
        'Email/Password sign-in is disabled in Firebase Console. Enable it under Authentication → Sign-in method.'
      );
    case 'auth/unauthorized-domain':
    case 'auth/unauthorized-continue-uri':
      return new Error(
        'This domain is not authorized in Firebase Authentication Settings → Authorized domains.'
      );
    case 'auth/invalid-api-key':
      return new Error(
        'Invalid Firebase API key configuration. Verify VITE_FIREBASE_API_KEY in .env.'
      );
    default:
      return new Error(rawMessage || 'Unable to dispatch password reset email.');
  }
}

export async function sendUserPasswordReset(
  user: AdminUserRecord,
  actor: AuditActor,
  isInviteResend = false
): Promise<void> {
  if (!auth) throw new Error('Firebase Auth is not initialized.');
  if (firebaseConfig.apiKey.includes('MockKey')) {
    throw new Error(
      'Firebase Auth is running with placeholder config. Ensure .env contains your live Firebase keys and restart the server.'
    );
  }

  const cleanEmail = user.email?.trim() || '';
  if (!cleanEmail) {
    throw new Error('This user does not have an email address on record.');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    throw new Error(`Invalid email address on record: "${cleanEmail}".`);
  }
  if (user.id.startsWith('test-user-') || user.id.startsWith('user-')) {
    throw new Error(
      `"${cleanEmail}" is a seeded demo profile without a Firebase Auth account. Firebase can only email users registered in Authentication.`
    );
  }

  try {
    auth.languageCode = 'en';
    await sendPasswordResetEmail(auth, cleanEmail);
  } catch (err) {
    throw mapPasswordResetError(err);
  }

  await appendAuditLog({
    actor,
    action: isInviteResend ? 'invite resent' : 'password reset sent',
    targetId: user.id,
    targetName: user.displayName,
    before: null,
    after: { email: cleanEmail },
  });
}
