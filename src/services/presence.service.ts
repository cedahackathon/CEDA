/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AgentPresence, AgentStatus } from '../types/chat';

const PRESENCE_STORAGE_KEY = 'ceda_agent_presence_v1';

const DEFAULT_AGENTS: AgentPresence[] = [
  {
    uid: 'agent-1',
    status: 'AVAILABLE',
    activeChats: 1,
    lastHeartbeat: new Date().toISOString(),
  },
  {
    uid: 'agent-2',
    status: 'AVAILABLE',
    activeChats: 0,
    lastHeartbeat: new Date().toISOString(),
  },
  {
    uid: 'agent-3',
    status: 'BUSY',
    activeChats: 3,
    lastHeartbeat: new Date().toISOString(),
  },
];

export async function fetchAgentPresence(): Promise<AgentPresence[]> {
  try {
    const raw = localStorage.getItem(PRESENCE_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // fallback
  }
  return DEFAULT_AGENTS;
}

export async function updateAgentStatus(uid: string, status: AgentStatus, activeChats: number = 0): Promise<AgentPresence[]> {
  const agents = await fetchAgentPresence();
  const index = agents.findIndex((a) => a.uid === uid);
  const now = new Date().toISOString();

  if (index >= 0) {
    agents[index] = {
      ...agents[index],
      status,
      activeChats,
      lastHeartbeat: now,
    };
  } else {
    agents.push({
      uid,
      status,
      activeChats,
      lastHeartbeat: now,
    });
  }

  localStorage.setItem(PRESENCE_STORAGE_KEY, JSON.stringify(agents));
  return agents;
}

export async function sendAgentHeartbeat(uid: string): Promise<void> {
  try {
    const agents = await fetchAgentPresence();
    const updated = agents.map((a) => (a.uid === uid ? { ...a, lastHeartbeat: new Date().toISOString() } : a));
    localStorage.setItem(PRESENCE_STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }
}
