/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { ChatMessage } from '../types/chat';

interface ChatMessagingProps {
  sessionId: string;
  onClose?: () => void;
}

export const ChatMessaging: React.FC<ChatMessagingProps> = ({ sessionId, onClose }) => {
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputBody, setInputBody] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!db || !sessionId) return;

    const messagesQuery = query(
      collection(db, 'chatSessions', sessionId, 'messages'),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(
      messagesQuery,
      (snapshot) => {
        const list: ChatMessage[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          list.push({
            id: docSnap.id,
            sessionId,
            senderId: data.senderId,
            body: data.body,
            isInternal: data.isInternal || false,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
          });
        });
        setMessages(list);
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      },
      (err) => {
        console.warn('[ChatMessaging] Failed to stream messages:', err);
      }
    );

    return () => unsubscribe();
  }, [sessionId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputBody.trim() || !currentUser || !db) return;

    const bodyText = inputBody.trim();
    setInputBody('');
    setSending(true);

    try {
      await addDoc(collection(db, 'chatSessions', sessionId, 'messages'), {
        sessionId,
        senderId: currentUser.id,
        senderName: currentUser.fullName || currentUser.email,
        body: bodyText,
        isInternal: false,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      console.error('[ChatMessaging] Failed to send message:', err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#38231d] text-white">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-headline text-xs font-bold tracking-tight">CEDA Live Support Desk</span>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#f8a018]"
            aria-label="Close chat"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        )}
      </div>

      {/* Message Stream Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#fdf9f4]">
        {messages.length === 0 ? (
          <div className="text-center py-8 text-xs text-[#6b4f47]">
            <span className="material-symbols-outlined text-[32px] text-[#a02010] mb-2 block">support_agent</span>
            <p>Connected to CEDA Support Desk. An advisor will join shortly.</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === currentUser?.id;
            return (
              <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                <div
                  className={`max-w-[80%] px-3.5 py-2.5 rounded-xl text-xs leading-relaxed ${
                    isMe
                      ? 'bg-[#a02010] text-white rounded-br-xs'
                      : 'bg-white text-[#1c1c19] border border-[#e2bfb8]/70 rounded-bl-xs shadow-xs'
                  }`}
                >
                  {msg.body}
                </div>
                <span className="text-[10px] text-[#8d706b] mt-0.5 px-1">
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-[#e2bfb8]/80 flex items-center gap-2">
        <input
          type="text"
          value={inputBody}
          onChange={(e) => setInputBody(e.target.value)}
          placeholder="Type your message to CEDA..."
          className="flex-1 h-11 px-3 rounded-xl border border-[#e2bfb8] bg-[#fdf9f4] text-xs text-[#1c1c19] focus:outline-hidden focus:ring-2 focus:ring-[#f8a018]"
          aria-label="Chat message input"
        />
        <button
          type="submit"
          disabled={sending || !inputBody.trim()}
          className="inline-flex items-center justify-center h-11 px-4 rounded-xl bg-[#a02010] hover:bg-[#7c0700] text-white text-xs font-semibold transition-colors disabled:opacity-50 shrink-0"
          aria-label="Send message"
        >
          <span className="material-symbols-outlined text-[18px]">send</span>
        </button>
      </form>
    </div>
  );
};
