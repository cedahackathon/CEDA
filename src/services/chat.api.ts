/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { httpsCallable } from 'firebase/functions';
import { db, auth } from '../config/firebase';
import { getFunctions } from 'firebase/functions';

// Initialize functions instance
const functions = getFunctions(db?.app);

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
 * Call getChatAvailability Cloud Function (Layer A / server-side authority check)
 */
export async function callGetChatAvailability(): Promise<CallAvailabilityResult> {
  try {
    const fn = httpsCallable(functions, 'getChatAvailability');
    const result = await fn({});
    return result.data as CallAvailabilityResult;
  } catch (err: any) {
    console.warn('[chat.api] getChatAvailability cloud function call failed, falling back to client evaluation:', err);
    throw err;
  }
}

/**
 * Call createChatSession Cloud Function (Layer B authority transactional intake)
 */
export async function callCreateChatSession(contextRef?: string, contextStep?: string): Promise<CreateChatSessionResult> {
  try {
    const fn = httpsCallable(functions, 'createChatSession');
    const result = await fn({ contextRef, contextStep });
    return result.data as CreateChatSessionResult;
  } catch (err: any) {
    console.warn('[chat.api] createChatSession cloud function call failed:', err);
    throw err;
  }
}
