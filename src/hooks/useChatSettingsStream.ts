/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { doc, collection, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { ChatSystemSettings, ChatHoliday } from '../types/chat';
import { fetchChatSettings, fetchChatHolidays } from '../services/chatSettingsService';

export function useChatSettingsStream() {
  const [settings, setSettings] = useState<ChatSystemSettings | null>(null);
  const [holidays, setHolidays] = useState<ChatHoliday[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    // Initial fetch fallback
    Promise.all([fetchChatSettings(), fetchChatHolidays()])
      .then(([s, h]) => {
        if (isMounted) {
          setSettings(s);
          setHolidays(h);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err?.message || 'Failed to fetch initial chat settings');
          setLoading(false);
        }
      });

    if (!db) {
      return () => {
        isMounted = false;
      };
    }

    // Real-time Firestore listeners (Layer A authority)
    let unsubscribeSettings = () => {};
    let unsubscribeHolidays = () => {};

    try {
      const settingsRef = doc(db, 'chatSystemSettings', 'singleton');
      unsubscribeSettings = onSnapshot(
        settingsRef,
        (docSnap) => {
          if (docSnap.exists() && isMounted) {
            setSettings(docSnap.data() as ChatSystemSettings);
          }
        },
        (err) => {
          console.warn('[useChatSettingsStream] Settings snapshot fallback to localStorage:', err);
        }
      );

      const holidaysRef = collection(db, 'chatHolidays');
      unsubscribeHolidays = onSnapshot(
        holidaysRef,
        (snapshot) => {
          if (!snapshot.empty && isMounted) {
            const list: ChatHoliday[] = [];
            snapshot.forEach((d) => {
              list.push(d.data() as ChatHoliday);
            });
            setHolidays(list);
          }
        },
        (err) => {
          console.warn('[useChatSettingsStream] Holidays snapshot fallback to localStorage:', err);
        }
      );
    } catch (e) {
      console.warn('[useChatSettingsStream] Firestore listeners unavailable:', e);
    }

    return () => {
      isMounted = false;
      unsubscribeSettings();
      unsubscribeHolidays();
    };
  }, []);

  return { settings, holidays, loading, error };
}
