/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const SUPABASE_DOCUMENTS_BUCKET =
  import.meta.env.VITE_SUPABASE_STORAGE_BUCKET?.trim() || 'ceda-hack-docs';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() || '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export function getSupabaseClient(): SupabaseClient {
  if (!supabase) {
    throw new Error(
      'Supabase Storage is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment.'
    );
  }
  return supabase;
}

export function sanitizeStorageFilename(rawFilename: string): string {
  const baseName = (rawFilename || 'document')
    .split(/[/\\]/)
    .pop()
    ?.trim() || 'document';

  const lastDot = baseName.lastIndexOf('.');
  const rawStem = lastDot > 0 ? baseName.slice(0, lastDot) : baseName;
  const rawExt = lastDot > 0 ? baseName.slice(lastDot).toLowerCase() : '';

  const safeStem =
    rawStem
      .replace(/[^a-zA-Z0-9._-]+/g, '_')
      .replace(/\.{2,}/g, '.')
      .replace(/_+/g, '_')
      .replace(/^[._]+|[._]+$/g, '')
      .slice(0, 80) || 'document';

  const safeExt = /^\.[a-z0-9]{1,10}$/.test(rawExt) ? rawExt : '';
  return `${safeStem}${safeExt}`;
}

export function buildDocumentStoragePath(
  userId: string,
  filename: string,
  timestamp: number = Date.now()
): string {
  const safeUserId =
    (userId || 'anonymous').replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 128) || 'anonymous';
  const sanitizedFilename = sanitizeStorageFilename(filename);
  return `${safeUserId}/${timestamp}_${sanitizedFilename}`;
}
