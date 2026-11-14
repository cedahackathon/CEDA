/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type AgentStatus = 'AVAILABLE' | 'BUSY' | 'AWAY' | 'OFFLINE';

export type ChatSessionStatus = 'WAITING' | 'ACTIVE' | 'RESOLVED' | 'ABANDONED';

export type AvailabilityReason =
  | 'AVAILABLE'
  | 'DISABLED_BY_ADMIN'
  | 'NON_WORKING_DAY'
  | 'PUBLIC_HOLIDAY'
  | 'OUTSIDE_HOURS'
  | 'NO_AGENTS_ONLINE'
  | 'ALL_AGENTS_BUSY'
  | 'QUEUE_FULL';

export interface ChatSystemSettings {
  id: string;
  isChatEnabled: boolean;
  activeStartTime: string; // "HH:mm" e.g. "09:00"
  activeEndTime: string;   // "HH:mm" e.g. "16:00"
  workingDays: number[];   // e.g. [1, 2, 3, 4, 5] (Monday=1 ... Sunday=7)
  offlineMessage: string;
  busyMessage: string;
  maxConcurrentChatsPerAgent: number;
  maxQueueLength: number;
  updatedAt: Date | any;
  updatedById: string;
}

export interface ChatHoliday {
  dateId: string; // "YYYY-MM-DD"
  label: string;
}

export interface AgentPresence {
  uid: string;
  status: AgentStatus;
  activeChats: number;
  lastHeartbeat: Date | any;
}

export interface ChatSession {
  id: string;
  submitterId: string;
  agentId: string | null;
  status: ChatSessionStatus;
  contextRef: string | null;
  contextStep: string | null;
  createdAt: Date | any;
  claimedAt: Date | any | null;
  closedAt: Date | any | null;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  senderId: string;
  body: string;
  isInternal: boolean;
  createdAt: Date | any;
}

export interface ChatSettingsAudit {
  id: string;
  actorId: string;
  field: string;
  before: any;
  after: any;
  createdAt: Date | any;
}

export interface Availability {
  available: boolean;
  reason: AvailabilityReason;
  message?: string;
  opensAt?: string;
  queuePosition?: number;
  queueLength?: number;
}
