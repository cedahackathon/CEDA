/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// In-memory cache for availability (15-second TTL)
let cachedAvailability: { timestamp: number; data: any } | null = null;
const CACHE_TTL_MS = 15000;

/**
 * 1. getChatAvailability Callable Function (minInstances: 1, 15s cache)
 */
export const getChatAvailability = onCall({ minInstances: 1 }, async (request) => {
  const now = Date.now();
  if (cachedAvailability && now - cachedAvailability.timestamp < CACHE_TTL_MS) {
    return cachedAvailability.data;
  }

  try {
    const settingsDoc = await db.collection('chatSystemSettings').doc('singleton').get();
    const settings = settingsDoc.exists ? settingsDoc.data() : { isChatEnabled: true, activeStartTime: '09:00', activeEndTime: '16:00', workingDays: [1,2,3,4,5], maxQueueLength: 15, maxConcurrentChatsPerAgent: 3 };

    const holidaysSnapshot = await db.collection('chatHolidays').get();
    const holidays: any[] = [];
    holidaysSnapshot.forEach(doc => holidays.push(doc.data()));

    const presenceSnapshot = await db.collection('agentPresence').get();
    const presence: any[] = [];
    presenceSnapshot.forEach(doc => presence.push(doc.data()));

    // Evaluate availability server-side
    const result = {
      available: settings?.isChatEnabled ?? true,
      reason: settings?.isChatEnabled ? 'AVAILABLE' : 'DISABLED_BY_ADMIN',
      queueLength: 0,
      timestamp: new Date().toISOString(),
    };

    cachedAvailability = { timestamp: now, data: result };
    return result;
  } catch (err: any) {
    throw new HttpsError('internal', `Failed to evaluate chat availability: ${err.message}`);
  }
});

/**
 * 2. createChatSession Callable Function (Layer B Authority)
 */
export const createChatSession = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'User must be authenticated to start a chat session.');
  }

  const { contextRef, contextStep } = request.data || {};

  try {
    return await db.runTransaction(async (transaction) => {
      // Re-evaluate settings & queue length in transaction
      const settingsRef = db.collection('chatSystemSettings').doc('singleton');
      const settingsSnap = await transaction.get(settingsRef);
      const settings = settingsSnap.exists ? settingsSnap.data() : { isChatEnabled: true, maxQueueLength: 15 };

      if (!settings?.isChatEnabled) {
        throw new HttpsError('failed-precondition', 'DISABLED_BY_ADMIN');
      }

      // Check current waiting sessions count
      const waitingQuery = db.collection('chatSessions').where('status', '==', 'WAITING');
      const waitingSnap = await transaction.get(waitingQuery);
      const currentQueueLength = waitingSnap.size;

      if (currentQueueLength >= (settings.maxQueueLength || 15)) {
        throw new HttpsError('resource-exhausted', 'QUEUE_FULL');
      }

      const sessionId = `session-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const newSessionRef = db.collection('chatSessions').doc(sessionId);

      const sessionData = {
        id: sessionId,
        submitterId: uid,
        agentId: null,
        status: 'WAITING',
        contextRef: contextRef || null,
        contextStep: contextStep || null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        claimedAt: null,
        closedAt: null,
      };

      transaction.set(newSessionRef, sessionData);

      return {
        sessionId,
        queuePosition: currentQueueLength + 1,
        estimatedWaitMinutes: (currentQueueLength + 1) * 3,
      };
    });
  } catch (err: any) {
    if (err instanceof HttpsError) throw err;
    throw new HttpsError('internal', err.message);
  }
});

/**
 * 3. claimChatSession Callable Function for Agents
 */
export const claimChatSession = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'Agent must be authenticated.');
  }

  const { sessionId } = request.data || {};
  if (!sessionId) {
    throw new HttpsError('invalid-argument', 'Session ID is required.');
  }

  const sessionRef = db.collection('chatSessions').doc(sessionId);
  await sessionRef.update({
    agentId: uid,
    status: 'ACTIVE',
    claimedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { success: true, sessionId };
});

/**
 * 4. resolveChatSession Callable Function
 */
export const resolveChatSession = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'User must be authenticated.');
  }

  const { sessionId } = request.data || {};
  if (!sessionId) {
    throw new HttpsError('invalid-argument', 'Session ID is required.');
  }

  const sessionRef = db.collection('chatSessions').doc(sessionId);
  await sessionRef.update({
    status: 'RESOLVED',
    closedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { success: true, sessionId };
});

/**
 * 5. onSettingsUpdate Firestore Trigger (Audit Log)
 */
export const onSettingsUpdate = onDocumentWritten('chatSystemSettings/singleton', async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();

  if (!after) return;

  await db.collection('chatSettingsAudit').add({
    actorId: after.updatedById || 'System Admin',
    field: 'chatSystemSettings/singleton modified',
    before: before || {},
    after: after,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
});
