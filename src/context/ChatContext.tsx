/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useMemo } from 'react';
import { useChatSettingsStream } from '../hooks/useChatSettingsStream';
import { useAgentPresence } from '../hooks/useAgentPresence';
import { resolveAvailability } from '../utils/resolveAvailability';
import { ChatSystemSettings, ChatHoliday, AgentPresence, Availability } from '../types/chat';

interface ChatContextType {
  settings: ChatSystemSettings | null;
  holidays: ChatHoliday[];
  presence: AgentPresence[];
  currentAvailability: Availability;
  loading: boolean;
  error: string | null;
  changeAgentStatus: (uid: string, status: any, activeChats?: number) => Promise<void>;
  refreshChatState: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode; currentAgentUid?: string }> = ({
  children,
  currentAgentUid,
}) => {
  const { settings, holidays, loading: settingsLoading, error } = useChatSettingsStream();
  const { presence, changeStatus, loading: presenceLoading, refresh } = useAgentPresence(currentAgentUid);

  const currentAvailability = useMemo<Availability>(() => {
    if (!settings) {
      return {
        available: false,
        reason: 'DISABLED_BY_ADMIN',
        message: 'CEDA Innovation support is initializing...',
      };
    }
    return resolveAvailability(settings, presence, holidays, new Date());
  }, [settings, presence, holidays]);

  const value = useMemo(
    () => ({
      settings,
      holidays,
      presence,
      currentAvailability,
      loading: settingsLoading || presenceLoading,
      error,
      changeAgentStatus: changeStatus,
      refreshChatState: refresh,
    }),
    [settings, holidays, presence, currentAvailability, settingsLoading, presenceLoading, error, changeStatus, refresh]
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}
