/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { auth, db, firebaseConfig } from '../config/firebase';
import {
  buildDocumentStoragePath,
  getSupabaseClient,
  SUPABASE_DOCUMENTS_BUCKET,
} from '../lib/supabase';
import {
  DOCUMENT_ACCEPTED_EXTENSIONS,
  DOCUMENT_ACCEPTED_MIME_TYPES,
  DOCUMENT_MAX_FILE_SIZE_BYTES,
  DOCUMENT_MAX_FILE_SIZE_MB,
  DocumentSlotKey,
} from '../data/documentOptions';

export const FIRESTORE_DOCUMENTS_COLLECTION = 'documents';
export const MAX_DOCUMENT_UPLOAD_BYTES = DOCUMENT_MAX_FILE_SIZE_BYTES; // 10 MB

export enum OperationType {
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

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
      emailVerified: auth?.currentUser?.emailVerified,
      isAnonymous: auth?.currentUser?.isAnonymous,
      tenantId: auth?.currentUser?.tenantId,
      providerInfo:
        auth?.currentUser?.providerData?.map(
          (provider: { providerId?: string | null; email?: string | null }) => ({
            providerId: provider.providerId,
            email: provider.email,
          })
        ) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export interface StoredDocumentRecord {
  id: string;
  name: string;
  storagePath: string;
  publicUrl: string;
  size: number;
  type: string;
  uploaderId: string;
  createdAt: string;
  ideaId?: string;
  docType?: DocumentSlotKey;
  note?: string;
}

export interface UploadDocumentParams {
  file: File;
  userId?: string;
  ideaId?: string;
  docType?: DocumentSlotKey;
  note?: string;
}

export function resolveUploadMimeType(file: File): string {
  const mime = (file.type || '').trim().toLowerCase();
  if ((DOCUMENT_ACCEPTED_MIME_TYPES as readonly string[]).includes(mime)) {
    return mime;
  }
  const lowerName = file.name.trim().toLowerCase();
  if (lowerName.endsWith('.pdf')) return 'application/pdf';
  if (lowerName.endsWith('.docx')) {
    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  }
  if (lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg')) return 'image/jpeg';
  if (lowerName.endsWith('.png')) return 'image/png';
  return mime;
}

export function validateDocumentForSupabaseUpload(file: File): string | null {
  if (!file) {
    return 'No file selected.';
  }
  if (file.size <= 0) {
    return 'Selected file is empty.';
  }
  if (file.size > MAX_DOCUMENT_UPLOAD_BYTES) {
    return `File is too large. Maximum upload size is ${DOCUMENT_MAX_FILE_SIZE_MB} MB.`;
  }

  const lowerName = file.name.trim().toLowerCase();
  const hasAllowedExt = DOCUMENT_ACCEPTED_EXTENSIONS.some((ext) =>
    lowerName.endsWith(ext)
  );
  const resolvedType = resolveUploadMimeType(file);
  const isAllowedType = (DOCUMENT_ACCEPTED_MIME_TYPES as readonly string[]).includes(
    resolvedType
  );

  if (!hasAllowedExt || !isAllowedType) {
    return 'Only PDF, DOCX, JPG or PNG files are accepted.';
  }

  return null;
}

function assertFirebaseAuthReady(expectedUserId?: string): string {
  if (!db || !auth || firebaseConfig.apiKey.includes('MockKey')) {
    throw new Error('Firebase is not configured. Check your VITE_FIREBASE_* environment variables.');
  }
  const currentUid = auth.currentUser?.uid;
  if (!currentUid) {
    throw new Error('You must be signed in to upload or delete documents.');
  }
  if (expectedUserId && currentUid !== expectedUserId) {
    throw new Error('Active Firebase session does not match the current user profile.');
  }
  return currentUid;
}

function formatSupabaseStorageError(
  rawMessage: string | undefined,
  action: 'upload' | 'delete'
): string {
  const msg = (rawMessage || '').trim();
  if (/bucket not found/i.test(msg)) {
    return `Supabase Storage bucket "${SUPABASE_DOCUMENTS_BUCKET}" was not found. In your Supabase Dashboard, open Storage -> New bucket, create a Public bucket named "${SUPABASE_DOCUMENTS_BUCKET}" (exact lowercase), and add Storage policies allowing uploads/reads/deletes.`;
  }
  if (/row-level security policy|violates row-level security|unauthorized|permission denied/i.test(msg)) {
    return `Supabase Storage permission denied on bucket "${SUPABASE_DOCUMENTS_BUCKET}". Add RLS policies on storage.objects allowing SELECT, INSERT, and DELETE where bucket_id = '${SUPABASE_DOCUMENTS_BUCKET}'.`;
  }
  if (msg) {
    return msg;
  }
  return action === 'upload'
    ? 'Failed to upload file to Supabase Storage. Please try again.'
    : 'Failed to delete file from Supabase Storage. Please try again.';
}

/**
 * Uploads a document to Supabase Storage (`ceda-hack-docs` bucket at `{userId}/{timestamp}_{sanitizedFilename}`)
 * and persists the file metadata record to Firestore `documents` collection.
 */
export async function uploadDocumentToSupabaseAndFirestore({
  file,
  userId,
  ideaId,
  docType,
  note,
}: UploadDocumentParams): Promise<StoredDocumentRecord> {
  const uploaderId = assertFirebaseAuthReady(userId);

  const validationError = validateDocumentForSupabaseUpload(file);
  if (validationError) {
    throw new Error(validationError);
  }

  const supabase = getSupabaseClient();
  const contentType = resolveUploadMimeType(file) || 'application/octet-stream';
  const timestamp = Date.now();
  const storagePath = buildDocumentStoragePath(uploaderId, file.name, timestamp);

  let { error: uploadError } = await supabase.storage
    .from(SUPABASE_DOCUMENTS_BUCKET)
    .upload(storagePath, file, {
      contentType,
      upsert: false,
    });

  if (uploadError && /bucket not found/i.test(uploadError.message || '')) {
    const { error: createBucketError } = await supabase.storage.createBucket(
      SUPABASE_DOCUMENTS_BUCKET,
      {
        public: true,
        fileSizeLimit: MAX_DOCUMENT_UPLOAD_BYTES,
        allowedMimeTypes: [...DOCUMENT_ACCEPTED_MIME_TYPES],
      }
    );

    if (!createBucketError) {
      const retryResult = await supabase.storage
        .from(SUPABASE_DOCUMENTS_BUCKET)
        .upload(storagePath, file, {
          contentType,
          upsert: false,
        });
      uploadError = retryResult.error;
    }
  }

  if (uploadError) {
    throw new Error(formatSupabaseStorageError(uploadError.message, 'upload'));
  }

  const { data: publicUrlData } = supabase.storage
    .from(SUPABASE_DOCUMENTS_BUCKET)
    .getPublicUrl(storagePath);

  const publicUrl = publicUrlData?.publicUrl?.trim() || '';
  if (!publicUrl) {
    await supabase.storage.from(SUPABASE_DOCUMENTS_BUCKET).remove([storagePath]).catch(() => {});
    throw new Error('Uploaded file succeeded, but Supabase did not return a public URL.');
  }

  const docRef = doc(collection(db, FIRESTORE_DOCUMENTS_COLLECTION));
  const cleanName = file.name.trim().slice(0, 255) || 'document';
  const cleanNote = note?.trim().slice(0, 200);
  const createdAtIso = new Date(timestamp).toISOString();

  const firestorePayload: Record<string, unknown> = {
    id: docRef.id,
    name: cleanName,
    storagePath,
    publicUrl,
    size: file.size,
    type: contentType,
    uploaderId,
    createdAt: createdAtIso,
    ...(ideaId?.trim() ? { ideaId: ideaId.trim().slice(0, 128) } : {}),
    ...(docType ? { docType } : {}),
    ...(cleanNote ? { note: cleanNote } : {}),
  };

  try {
    await setDoc(docRef, firestorePayload);
  } catch (err) {
    // Roll back Supabase file if Firestore record creation fails
    await supabase.storage.from(SUPABASE_DOCUMENTS_BUCKET).remove([storagePath]).catch(() => {});
    handleFirestoreError(
      err,
      OperationType.CREATE,
      `${FIRESTORE_DOCUMENTS_COLLECTION}/${docRef.id}`
    );
  }

  return {
    id: docRef.id,
    name: cleanName,
    storagePath,
    publicUrl,
    size: file.size,
    type: contentType,
    uploaderId,
    createdAt: createdAtIso,
    ...(ideaId?.trim() ? { ideaId: ideaId.trim().slice(0, 128) } : {}),
    ...(docType ? { docType } : {}),
    ...(cleanNote ? { note: cleanNote } : {}),
  };
}

export interface DeleteDocumentParams {
  documentId?: string;
  storagePath?: string;
  userId?: string;
}

/**
 * Deletes a file from Supabase Storage (`ceda-hack-docs` bucket) and removes its Firestore record
 * from the `documents` collection.
 */
export async function deleteDocumentFromSupabaseAndFirestore({
  documentId,
  storagePath,
  userId,
}: DeleteDocumentParams): Promise<void> {
  assertFirebaseAuthReady(userId);

  const cleanDocId = documentId?.trim() || '';
  let resolvedStoragePath = storagePath?.trim() || '';

  if (cleanDocId && !resolvedStoragePath) {
    const docRef = doc(db, FIRESTORE_DOCUMENTS_COLLECTION, cleanDocId);
    try {
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data() as Record<string, unknown>;
        if (typeof data.storagePath === 'string') {
          resolvedStoragePath = data.storagePath.trim();
        }
      }
    } catch (err) {
      handleFirestoreError(
        err,
        OperationType.GET,
        `${FIRESTORE_DOCUMENTS_COLLECTION}/${cleanDocId}`
      );
    }
  }

  if (resolvedStoragePath) {
    const supabase = getSupabaseClient();
    const { error: removeError } = await supabase.storage
      .from(SUPABASE_DOCUMENTS_BUCKET)
      .remove([resolvedStoragePath]);

    if (removeError) {
      throw new Error(formatSupabaseStorageError(removeError.message, 'delete'));
    }
  }

  if (cleanDocId) {
    const docRef = doc(db, FIRESTORE_DOCUMENTS_COLLECTION, cleanDocId);
    try {
      await deleteDoc(docRef);
    } catch (err) {
      handleFirestoreError(
        err,
        OperationType.DELETE,
        `${FIRESTORE_DOCUMENTS_COLLECTION}/${cleanDocId}`
      );
    }
  }
}

export async function updateDocumentNoteInFirestore(
  documentId: string,
  note: string
): Promise<void> {
  const cleanDocId = documentId.trim();
  if (!cleanDocId || !db || !auth?.currentUser) return;

  const docRef = doc(db, FIRESTORE_DOCUMENTS_COLLECTION, cleanDocId);
  try {
    await updateDoc(docRef, {
      note: note.trim().slice(0, 200),
    });
  } catch (err) {
    handleFirestoreError(
      err,
      OperationType.UPDATE,
      `${FIRESTORE_DOCUMENTS_COLLECTION}/${cleanDocId}`
    );
  }
}

export async function getDocumentPublicUrlFromFirestore(
  documentId: string
): Promise<string | null> {
  const cleanDocId = documentId.trim();
  if (!cleanDocId || !db) return null;

  const docRef = doc(db, FIRESTORE_DOCUMENTS_COLLECTION, cleanDocId);
  try {
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    const data = snap.data() as Record<string, unknown>;
    return typeof data.publicUrl === 'string' && data.publicUrl.trim()
      ? data.publicUrl.trim()
      : null;
  } catch (err) {
    handleFirestoreError(
      err,
      OperationType.GET,
      `${FIRESTORE_DOCUMENTS_COLLECTION}/${cleanDocId}`
    );
  }
}

/**
 * Resolves the downloadable file URL for a submission or query response attachment.
 * Centralised here so public URLs can be swapped to signed URLs later without UI changes.
 */
export function getDocumentDownloadUrl(entry: {
  publicUrl?: string | null;
  storagePath?: string | null;
}): string | null {
  const directUrl = typeof entry?.publicUrl === 'string' ? entry.publicUrl.trim() : '';
  if (directUrl) {
    return directUrl;
  }

  const storagePath = typeof entry?.storagePath === 'string' ? entry.storagePath.trim() : '';
  if (storagePath) {
    try {
      const supabase = getSupabaseClient();
      const { data } = supabase.storage
        .from(SUPABASE_DOCUMENTS_BUCKET)
        .getPublicUrl(storagePath);
      if (data?.publicUrl?.trim()) {
        return data.publicUrl.trim();
      }
    } catch {
      return null;
    }
  }

  return null;
}

