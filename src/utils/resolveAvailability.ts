/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ChatSystemSettings, AgentPresence, ChatHoliday, Availability } from '../types/chat';

const TIMEZONE = 'Africa/Lobatse';

function getFormatter(timeZone: string) {
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      weekday: 'short',
    });
  } catch {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: 'Africa/Gaborone',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      weekday: 'short',
    });
  }
}

function parseTimeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

export function resolveAvailability(
  settings: ChatSystemSettings,
  presence: AgentPresence[],
  holidays: ChatHoliday[],
  now: Date = new Date(),
  currentQueueLength: number = 0
): Availability {
  // 1. Check Admin Kill-Switch
  if (!settings.isChatEnabled) {
    return {
      available: false,
      reason: 'DISABLED_BY_ADMIN',
      message: settings.offlineMessage,
    };
  }

  // Derive date and time in Africa/Lobatse timezone
  const formatter = getFormatter(TIMEZONE);

  const parts = formatter.formatToParts(now);
  const partMap: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== 'literal') {
      partMap[part.type] = part.value;
    }
  }

  const year = partMap['year'];
  const month = partMap['month'];
  const day = partMap['day'];
  const hour = parseInt(partMap['hour'] || '0', 10);
  const minute = parseInt(partMap['minute'] || '0', 10);
  const weekdayStr = partMap['weekday']; // e.g. "Mon", "Tue"

  const weekdayMap: Record<string, number> = {
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
    Sun: 7,
  };
  const currentDayNumber = weekdayMap[weekdayStr] || 1;

  // 2. Check Public Holiday (YYYY-MM-DD) - always respected even if enabled
  const todayDateId = `${year}-${month}-${day}`;
  const matchedHoliday = holidays.find((h) => h.dateId === todayDateId);
  if (matchedHoliday) {
    return {
      available: false,
      reason: 'PUBLIC_HOLIDAY',
      message: matchedHoliday.label
        ? `CEDA Live Chat is closed today for ${matchedHoliday.label}.`
        : settings.offlineMessage,
    };
  }

  // NOTE: When admin explicitly enables chat (isChatEnabled = true),
  // we allow chat to be active immediately, bypassing strict working days / outside hours restrictions
  // so testing and admin control take immediate effect on the submitter side.

  // 3. Check Queue Full
  if (currentQueueLength >= (settings.maxQueueLength || 15)) {
    return {
      available: false,
      reason: 'QUEUE_FULL',
      message: 'The live support queue is currently full. Please leave a message or try again later.',
      queueLength: currentQueueLength,
    };
  }

  // 4. Check Agents (if presence is provided and non-empty, ensure capacity)
  const onlineAgents = presence.length > 0
    ? presence.filter((p) => p.status === 'AVAILABLE' || p.status === 'BUSY')
    : [{ uid: 'default-agent', status: 'AVAILABLE', activeChats: 0 }];

  if (onlineAgents.length === 0) {
    // Fallback: auto-allow if chat is enabled by admin
    return {
      available: true,
      reason: 'AVAILABLE',
      queueLength: currentQueueLength,
    };
  }

  const hasAvailableCapacity = onlineAgents.some(
    (agent) => agent.status === 'AVAILABLE' && agent.activeChats < (settings.maxConcurrentChatsPerAgent || 3)
  );

  if (!hasAvailableCapacity && onlineAgents.length > 0) {
    // If all agents busy, allow queuing
    return {
      available: true, // Allow queueing / busy state
      reason: 'AVAILABLE',
      message: settings.busyMessage,
      queueLength: currentQueueLength,
      queuePosition: currentQueueLength + 1,
    };
  }

  // 5. Fully Available
  return {
    available: true,
    reason: 'AVAILABLE',
    queueLength: currentQueueLength,
  };
}
