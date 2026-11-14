/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { z } from 'zod';

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const ChatSystemSettingsSchema = z.object({
  id: z.string().min(1),
  isChatEnabled: z.boolean(),
  activeStartTime: z.string().regex(timeRegex, { message: 'Start time must be in HH:mm format (00:00 - 23:59)' }),
  activeEndTime: z.string().regex(timeRegex, { message: 'End time must be in HH:mm format (00:00 - 23:59)' }),
  workingDays: z
    .array(z.number().int().min(1).max(7))
    .min(1, { message: 'At least one working day must be selected' }),
  offlineMessage: z.string().min(1, { message: 'Offline message is required' }),
  busyMessage: z.string().min(1, { message: 'Busy message is required' }),
  maxConcurrentChatsPerAgent: z.number().int().min(1, { message: 'Must allow at least 1 concurrent chat per agent' }),
  maxQueueLength: z.number().int().min(0, { message: 'Max queue length cannot be negative' }),
  updatedAt: z.any(),
  updatedById: z.string().min(1),
}).refine(
  (data) => {
    const [startH, startM] = data.activeStartTime.split(':').map(Number);
    const [endH, endM] = data.activeEndTime.split(':').map(Number);
    const startTotalMinutes = startH * 60 + startM;
    const endTotalMinutes = endH * 60 + endM;
    return startTotalMinutes < endTotalMinutes;
  },
  {
    message: 'Active start time must be strictly earlier than active end time',
    path: ['activeEndTime'],
  }
);

export type ChatSystemSettingsInput = z.infer<typeof ChatSystemSettingsSchema>;
