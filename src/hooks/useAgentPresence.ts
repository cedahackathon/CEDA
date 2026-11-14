/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback } from 'react';
import { AgentPresence, AgentStatus } from '../types/chat';
import { fetchAgentPresence, updateAgentStatus, sendAgentHeartbeat } from '../services/presence.service';

export function useAgentPresence(currentAgentUid?: string) {
  const [presence, setPresence] = useState<AgentPresence[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const loadPresence = useCallback(async () => {
    try {
      const data = await fetchAgentPresence();
      setPresence(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPresence();

    // Heartbeat & poll interval every 15s
    const interval = window.setInterval(() => {
      loadPresence();
      if (currentAgentUid) {
        sendAgentHeartbeat(currentAgentUid).catch(() => {});
      }
    }, 15000);

    return () => window.clearInterval(interval);
  }, [currentAgentUid, loadPresence]);

  const changeStatus = async (uid: string, status: AgentStatus, activeChats: number = 0) => {
    const updated = await updateAgentStatus(uid, status, activeChats);
    setPresence(updated);
  };

  return { presence, changeStatus, loading, refresh: loadPresence };
}
