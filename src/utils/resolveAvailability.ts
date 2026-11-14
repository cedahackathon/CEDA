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

  // Map weekday to number (Monday=1 ... Sunday=7)
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

  // 2. Check Non-Working Day
  if (!settings.workingDays.includes(currentDayNumber)) {
    return {
      available: false,
      reason: 'NON_WORKING_DAY',
      message: settings.offlineMessage,
    };
  }

  // 3. Check Public Holiday (YYYY-MM-DD)
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

  // 4. Check Outside Working Hours
  const currentMinutes = hour * 60 + minute;
  const startMinutes = parseTimeToMinutes(settings.activeStartTime);
  const endMinutes = parseTimeToMinutes(settings.activeEndTime);

  if (currentMinutes < startMinutes || currentMinutes > endMinutes) {
    return {
      available: false,
      reason: 'OUTSIDE_HOURS',
      message: settings.offlineMessage,
      opensAt: settings.activeStartTime,
    };
  }

  // 5. Check No Agents Online (AVAILABLE or BUSY status)
  const onlineAgents = presence.filter(
    (p) => p.status === 'AVAILABLE' || p.status === 'BUSY'
  );
  if (onlineAgents.length === 0) {
    return {
      available: false,
      reason: 'NO_AGENTS_ONLINE',
      message: settings.busyMessage || settings.offlineMessage,
    };
  }

  // 6. Check Queue Full
  if (currentQueueLength >= settings.maxQueueLength) {
    return {
      available: false,
      reason: 'QUEUE_FULL',
      message: 'The live support queue is currently full. Please leave a message or try again later.',
      queueLength: currentQueueLength,
    };
  }

  // 7. Check All Agents Busy (all online agents at or above max capacity)
  const hasAvailableCapacity = onlineAgents.some(
    (agent) => agent.status === 'AVAILABLE' && agent.activeChats < settings.maxConcurrentChatsPerAgent
  );

  if (!hasAvailableCapacity) {
    return {
      available: false,
      reason: 'ALL_AGENTS_BUSY',
      message: settings.busyMessage,
      queueLength: currentQueueLength,
      queuePosition: currentQueueLength + 1,
    };
  }

  // 8. Fully Available
  return {
    available: true,
    reason: 'AVAILABLE',
    queueLength: currentQueueLength,
  };
}
