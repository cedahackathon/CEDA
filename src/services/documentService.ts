/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  setDoc,
  where,
} from 'firebase/firestore';
import { auth, db, firebaseConfig } from '../config/firebase';
import {
  ACCEPTED_DOCUMENT_EXTENSIONS,
  ACCEPTED_DOCUMENT_MIME_TYPES,
  DocumentSlotKey,
  MAX_DOCUMENT_SIZE_BYTES,
} from '../data/documentOptions';
import {
  getSupabaseConfigError,
  isSupabaseConfigured,
  supabase,
  SUPABASE_DOCUMENTS_BUCKET,
} from '../lib/supabase';
import { WizardDocumentFile } from './submitterService';

export interface UploadDocumentParams {
  file: File;
  userId: string;
  ideaId: string;
  docType: DocumentSlotKey;
  note?: string;
  signal?: AbortSignal;
  onProgress?: (percent: number) => void;
}

export interface DeleteDocumentParams {
  file: WizardDocumentFile;
  userId: string;
  docType: DocumentSlotKey;
}

export function sanitizeDocumentFilename(rawName: string): string {
  const baseName = (rawName || '').split(/[/\\]/).pop() || 'document';
  const lastDot = baseName.lastIndexOf('.');
  const rawStem = lastDot > 0 ? baseName.slice(0, lastDot) : baseName;
  const rawExt = lastDot > 0 ? baseName.slice(lastDot).toLowerCase() : '';

  const safeStem =
    rawStem
      .normalize('NFKD')
      .replace(/[^\w.-]+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 80) || 'document';

  const safeExt = /^\.[a-z0-9]{1,8}$/.test(rawExt) ? rawExt : '';
  return `${safeStem}${safeExt}`;
}

export function resolveDocumentContentType(file: File): string {
  if (file.type && file.type.trim()) {
    return file.type.trim();
  }
  const lower = file.name.toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.docx')) {
    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  }
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.png')) return 'image/png';
  return 'application/octet-stream';
}

export function validateDocumentFile(
  file: File,
  existingFilesInSlot: WizardDocumentFile[]
): string | null {
  if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
    return 'File is larger than 10 MB';
  }

  const lowerName = file.name.toLowerCase();
  const hasValidExt = ACCEPTED_DOCUMENT_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
  const normalizedMime = (file.type || '').toLowerCase();
  const hasValidMime =
    !normalizedMime ||
    (ACCEPTED_DOCUMENT_MIME_TYPES as readonly string[]).includes(normalizedMime);

  if (!hasValidExt || !hasValidMime) {
    return 'Only PDF, DOCX, JPG or PNG';
  }

  const isDuplicate = existingFilesInSlot.some(
    (existing) =>
      existing.name.trim().toLowerCase() === file.name.trim().toLowerCase() &&
      existing.size === file.size
  );
  if (isDuplicate) {
    return 'This file is already attached to this slot.';
  }

  return null;
}

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export async function uploadSubmissionDocument({
  file,
  userId,
  ideaId,
  docType,
  note,
  signal,
  onProgress,
}: UploadDocumentParams): Promise<WizardDocumentFile> {
  if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
    throw new Error('File is larger than 10 MB');
  }

  if (!isSupabaseConfigured() || !supabase) {
    throw new Error(getSupabaseConfigError());
  }

  if (!db || !auth || firebaseConfig.apiKey.includes('MockKey')) {
    throw new Error('Firebase is not configured. Check your VITE_FIREBASE_* environment variables.');
  }

  if (typeof auth.authStateReady === 'function') {
    await auth.authStateReady();
  }
  if (!auth.currentUser || auth.currentUser.uid !== userId) {
    throw new Error('Your sign-in session is not active. Sign in again before uploading documents.');
  }

  if (signal?.aborted) {
    throw new DOMException('Upload cancelled.', 'AbortError');
  }

  onProgress?.(15);

  const sanitizedFilename = sanitizeDocumentFilename(file.name);
  const timestamp = Date.now();
  const storagePath = `${userId}/${timestamp}_${sanitizedFilename}`;
  const contentType = resolveDocumentContentType(file);
  const uploadedAt = new Date().toISOString();

  onProgress?.(35);

  const { error: uploadError } = await supabase.storage
    .from(SUPABASE_DOCUMENTS_BUCKET)
    .upload(storagePath, file, {
      contentType,
      upsert: false,
    });

  if (uploadError) {
    if (docType !== 'omang') {
      console.error('Supabase Storage upload error:', uploadError.message);
    } else {
      console.error('Supabase Storage upload failed for protected identity document.');
    }
    throw new Error(uploadError.message || 'Could not upload file to Supabase Storage.');
  }

  if (signal?.aborted) {
    // Best-effort cleanup if cancelled right after upload
    await supabase.storage.from(SUPABASE_DOCUMENTS_BUCKET).remove([storagePath]).catch(() => undefined);
    throw new DOMException('Upload cancelled.', 'AbortError');
  }

  onProgress?.(75);

  const { data: publicUrlData } = supabase.storage
    .from(SUPABASE_DOCUMENTS_BUCKET)
    .getPublicUrl(storagePath);
  const publicUrl = publicUrlData?.publicUrl || '';

  const firestoreDocRef = doc(collection(db, 'documents'));
  const documentRecord: Record<string, unknown> = {
    id: firestoreDocRef.id,
    name: file.name,
    storagePath,
    publicUrl,
    size: file.size,
    type: contentType,
    uploaderId: userId,
    ideaId,
    docType,
    timestamp: uploadedAt,
  };

  try {
    await setDoc(firestoreDocRef, documentRecord);
  } catch (err) {
    // Clean up uploaded object if Firestore metadata creation fails
    await supabase.storage.from(SUPABASE_DOCUMENTS_BUCKET).remove([storagePath]).catch(() => undefined);
    const code = (err as { code?: string })?.code || '';
    if (
      code === 'permission-denied' ||
      (err instanceof Error && err.message.toLowerCase().includes('missing or insufficient permissions'))
    ) {
      throw new Error(
        `Missing Firestore permissions for "documents". Publish the updated firestore.rules to your Firebase project (${firebaseConfig.projectId}) and retry.`
      );
    }
    throw err instanceof Error ? err : new Error('Could not save document metadata to Firestore.');
  }

  onProgress?.(100);

  const result: WizardDocumentFile = {
    name: file.name,
    size: file.size,
    contentType,
    storagePath,
    publicUrl,
    firestoreDocId: firestoreDocRef.id,
    uploadedAt,
  };
  if (note && note.trim()) {
    result.note = note.trim();
  }
  return result;
}

export async function deleteSubmissionDocument({
  file,
  userId,
  docType,
}: DeleteDocumentParams): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) {
    throw new Error(getSupabaseConfigError());
  }

  if (file.storagePath) {
    const { error: removeError } = await supabase.storage
      .from(SUPABASE_DOCUMENTS_BUCKET)
      .remove([file.storagePath]);

    if (removeError && !removeError.message.toLowerCase().includes('not found')) {
      if (docType !== 'omang') {
        console.error('Supabase Storage delete error:', removeError.message);
      }
      throw new Error(removeError.message || 'Could not remove file from Supabase Storage.');
    }
  }

  if (!db) return;

  if (file.firestoreDocId) {
    await deleteDoc(doc(db, 'documents', file.firestoreDocId));
    return;
  }

  if (file.storagePath && userId) {
    const q = query(
      collection(db, 'documents'),
      where('uploaderId', '==', userId),
      where('storagePath', '==', file.storagePath)
    );
    const snap = await getDocs(q);
    await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
  }
}
