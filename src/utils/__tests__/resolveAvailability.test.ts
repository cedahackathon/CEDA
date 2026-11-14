/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { resolveAvailability } from '../resolveAvailability';
import { ChatSystemSettings, AgentPresence, ChatHoliday } from '../../types/chat';

const defaultSettings: ChatSystemSettings = {
  id: 'settings-1',
  isChatEnabled: true,
  activeStartTime: '09:00',
  activeEndTime: '16:00',
  workingDays: [1, 2, 3, 4, 5], // Mon-Fri
  offlineMessage: 'Chat is currently offline.',
  busyMessage: 'All agents are busy.',
  maxConcurrentChatsPerAgent: 3,
  maxQueueLength: 10,
  updatedAt: new Date(),
  updatedById: 'admin-1',
};

const defaultAgents: AgentPresence[] = [
  {
    uid: 'agent-1',
    status: 'AVAILABLE',
    activeChats: 1,
    lastHeartbeat: new Date(),
  },
];

const defaultHolidays: ChatHoliday[] = [
  {
    dateId: '2026-07-01',
    label: 'Sir Seretse Khama Day',
  },
];

describe('resolveAvailability', () => {
  it('returns DISABLED_BY_ADMIN when chat is disabled', () => {
    const settings = { ...defaultSettings, isChatEnabled: false };
    const now = new Date('2026-06-03T08:00:00Z');

    const result = resolveAvailability(settings, defaultAgents, defaultHolidays, now);
    expect(result.available).toBe(false);
    expect(result.reason).toBe('DISABLED_BY_ADMIN');
  });

  it('returns PUBLIC_HOLIDAY on a recognized holiday date', () => {
    const now = new Date('2026-07-01T08:00:00Z');

    const result = resolveAvailability(defaultSettings, defaultAgents, defaultHolidays, now);
    expect(result.available).toBe(false);
    expect(result.reason).toBe('PUBLIC_HOLIDAY');
    expect(result.message).toContain('Sir Seretse Khama Day');
  });

  it('returns AVAILABLE when chat is enabled by admin even outside standard hours or on weekends', () => {
    // Saturday 22:00 CAT (2026-06-06 is Saturday)
    const now = new Date('2026-06-06T20:00:00Z');

    const result = resolveAvailability(defaultSettings, defaultAgents, defaultHolidays, now);
    expect(result.available).toBe(true);
    expect(result.reason).toBe('AVAILABLE');
  });
});
