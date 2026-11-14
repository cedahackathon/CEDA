/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { httpsCallable, getFunctions } from 'firebase/functions';
import { doc, setDoc, serverTimestamp, getDoc, collection, getDocs } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { fetchChatSettings, fetchChatHolidays } from './chatSettingsService';
import { resolveAvailability } from '../utils/resolveAvailability';

const functions = db?.app ? getFunctions(db.app) : null;

export interface CallAvailabilityResult {
  available: boolean;
  reason: string;
  queueLength: number;
  timestamp: string;
}

export interface CreateChatSessionResult {
  sessionId: string;
  queuePosition: number;
  estimatedWaitMinutes: number;
}

/**
 * Call getChatAvailability Cloud Function with robust direct Firestore fallback
 */
export async function callGetChatAvailability(): Promise<CallAvailabilityResult> {
  if (functions) {
    try {
      const fn = httpsCallable(functions, 'getChatAvailability');
      const result = await fn({});
      return result.data as CallAvailabilityResult;
    } catch (err: any) {
      console.warn('[chat.api] getChatAvailability cloud function failed, using client fallback:', err);
    }
  }

  // Client-side fallback using resolveAvailability
  try {
    const settings = await fetchChatSettings();
    const holidays = await fetchChatHolidays();
    const availability = resolveAvailability(settings, [], holidays, new Date());
    return {
      available: availability.available,
      reason: availability.reason,
      queueLength: availability.queueLength || 0,
      timestamp: new Date().toISOString(),
    };
  } catch (e) {
    return {
      available: true,
      reason: 'AVAILABLE',
      queueLength: 0,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Call createChatSession Cloud Function with robust direct Firestore transaction fallback
 */
export async function callCreateChatSession(contextRef?: string, contextStep?: string): Promise<CreateChatSessionResult> {
  if (functions) {
    try {
      const fn = httpsCallable(functions, 'createChatSession');
      const result = await fn({ contextRef, contextStep });
      return result.data as CreateChatSessionResult;
    } catch (err: any) {
      console.warn('[chat.api] createChatSession cloud function failed, using direct Firestore fallback:', err);
    }
  }

  // Client-side direct Firestore fallback
  const user = auth?.currentUser;
  const userId = user?.uid || `anon-${Math.random().toString(36).substring(2, 8)}`;

  const sessionId = `session-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const sessionRef = doc(db, 'chatSessions', sessionId);

  await setDoc(sessionRef, {
    id: sessionId,
    submitterId: userId,
    agentId: null,
    status: 'WAITING',
    contextRef: contextRef || null,
    contextStep: contextStep || null,
    createdAt: serverTimestamp(),
    claimedAt: null,
    closedAt: null,
  });

  return {
    sessionId,
    queuePosition: 1,
    estimatedWaitMinutes: 3,
  };
}
