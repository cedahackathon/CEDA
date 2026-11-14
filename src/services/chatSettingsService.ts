/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ChatSystemSettings, ChatHoliday, ChatSettingsAudit } from '../types/chat';

const SETTINGS_STORAGE_KEY = 'ceda_chat_system_settings_v1';
const HOLIDAYS_STORAGE_KEY = 'ceda_chat_holidays_v1';
const AUDIT_STORAGE_KEY = 'ceda_chat_audit_logs_v1';

const DEFAULT_SETTINGS: ChatSystemSettings = {
  id: 'default-settings',
  isChatEnabled: true,
  activeStartTime: '09:00',
  activeEndTime: '16:00',
  workingDays: [1, 2, 3, 4, 5],
  offlineMessage: 'CEDA Innovation support is currently offline. Our live chat operates Monday to Friday from 09:00 to 16:00 CAT.',
  busyMessage: 'All CEDA support advisors are currently engaged with citizen innovators. Please wait in the queue or leave a message.',
  maxConcurrentChatsPerAgent: 3,
  maxQueueLength: 15,
  updatedAt: new Date().toISOString(),
  updatedById: 'Admin Officer',
};

const DEFAULT_HOLIDAYS: ChatHoliday[] = [
  { dateId: '2026-07-01', label: 'Sir Seretse Khama Day' },
  { dateId: '2026-07-20', label: 'President’s Day' },
  { dateId: '2026-09-30', label: 'Botswana Independence Day' },
  { dateId: '2026-12-25', label: 'Christmas Day' },
];

const DEFAULT_AUDIT_LOGS: ChatSettingsAudit[] = [
  {
    id: 'audit-1',
    actorId: 'Thabo Blekone (System Admin)',
    field: 'isChatEnabled',
    before: false,
    after: true,
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'audit-2',
    actorId: 'Kgomotso Mpho (Senior Admin)',
    field: 'activeEndTime',
    before: '15:00',
    after: '16:00',
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
];

export async function fetchChatSettings(): Promise<ChatSystemSettings> {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // fallback
  }
  return DEFAULT_SETTINGS;
}

export async function saveChatSettings(
  settings: ChatSystemSettings,
  actorName: string
): Promise<{ settings: ChatSystemSettings; audit: ChatSettingsAudit }> {
  const current = await fetchChatSettings();
  const updated: ChatSystemSettings = {
    ...settings,
    updatedAt: new Date().toISOString(),
    updatedById: actorName,
  };

  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));

  const audit: ChatSettingsAudit = {
    id: `audit-${Date.now()}`,
    actorId: actorName,
    field: 'Multiple settings updated',
    before: current,
    after: updated,
    createdAt: new Date().toISOString(),
  };

  try {
    const auditRaw = localStorage.getItem(AUDIT_STORAGE_KEY);
    const audits: ChatSettingsAudit[] = auditRaw ? JSON.parse(auditRaw) : DEFAULT_AUDIT_LOGS;
    audits.unshift(audit);
    localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(audits));
  } catch {
    // ignore
  }

  return { settings: updated, audit };
}

export async function fetchChatHolidays(): Promise<ChatHoliday[]> {
  try {
    const raw = localStorage.getItem(HOLIDAYS_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // fallback
  }
  return DEFAULT_HOLIDAYS;
}

export async function saveChatHolidays(holidays: ChatHoliday[]): Promise<void> {
  localStorage.setItem(HOLIDAYS_STORAGE_KEY, JSON.stringify(holidays));
}

export async function fetchChatAuditLogs(): Promise<ChatSettingsAudit[]> {
  try {
    const raw = localStorage.getItem(AUDIT_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // fallback
  }
  return DEFAULT_AUDIT_LOGS;
}

export async function fetchChatAnalyticsSummary(): Promise<{
  todayTotalChats: number;
  avgFirstResponseMinutes: number;
  missedAfterHoursCount: number;
  activeQueueCount: number;
  activeAgentsCount: number;
}> {
  return {
    todayTotalChats: 42,
    avgFirstResponseMinutes: 2.4,
    missedAfterHoursCount: 11,
    activeQueueCount: 3,
    activeAgentsCount: 4,
  };
}
