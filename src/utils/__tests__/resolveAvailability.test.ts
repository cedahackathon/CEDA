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
    // Wednesday 10:00 AM CAT
    const now = new Date('2026-06-03T08:00:00Z'); // 10:00 CAT (UTC+2)

    const result = resolveAvailability(settings, defaultAgents, defaultHolidays, now);
    expect(result.available).toBe(false);
    expect(result.reason).toBe('DISABLED_BY_ADMIN');
  });

  it('returns NON_WORKING_DAY on a weekend', () => {
    // Saturday 10:00 AM CAT (2026-06-06 is Saturday)
    const now = new Date('2026-06-06T08:00:00Z');

    const result = resolveAvailability(defaultSettings, defaultAgents, defaultHolidays, now);
    expect(result.available).toBe(false);
    expect(result.reason).toBe('NON_WORKING_DAY');
  });

  it('returns PUBLIC_HOLIDAY on a recognized holiday date', () => {
    // Wednesday 10:00 AM CAT on July 1st, 2026 (Sir Seretse Khama Day)
    const now = new Date('2026-07-01T08:00:00Z');

    const result = resolveAvailability(defaultSettings, defaultAgents, defaultHolidays, now);
    expect(result.available).toBe(false);
    expect(result.reason).toBe('PUBLIC_HOLIDAY');
    expect(result.message).toContain('Sir Seretse Khama Day');
  });

  it('returns OUTSIDE_HOURS outside working hours (e.g. 17:30 CAT)', () => {
    // Wednesday 17:30 CAT (15:30 UTC)
    const now = new Date('2026-06-03T15:30:00Z');

    const result = resolveAvailability(defaultSettings, defaultAgents, defaultHolidays, now);
    expect(result.available).toBe(false);
    expect(result.reason).toBe('OUTSIDE_HOURS');
    expect(result.opensAt).toBe('09:00');
  });

  it('returns AVAILABLE during active working hours with available agents', () => {
    // Wednesday 10:00 AM CAT (08:00 UTC)
    const now = new Date('2026-06-03T08:00:00Z');

    const result = resolveAvailability(defaultSettings, defaultAgents, defaultHolidays, now);
    expect(result.available).toBe(true);
    expect(result.reason).toBe('AVAILABLE');
  });
});
