/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useChat } from '../context/ChatContext';
import { useAuth } from '../context/AuthContext';
import { callCreateChatSession } from '../services/chat.api';
import { ChatMessaging } from './ChatMessaging';

export const ChatWidget: React.FC = () => {
  const { settings, currentAvailability } = useChat();
  const { isAuthenticated, setCurrentRoute } = useAuth();

  const [isOpen, setIsOpen] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [topicInput, setTopicInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleStartChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      setCurrentRoute('/login');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await callCreateChatSession(topicInput || 'General Inquiry', window.location.pathname);
      setActiveSessionId(res.sessionId);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to initialize chat session. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Sleek Bottom-Right Chat Launcher Badge */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-3 px-4 py-2.5 rounded-full bg-white text-[#77574e] shadow-lg hover:shadow-xl transition-all cursor-pointer border border-[#e2bfb8] focus:outline-hidden focus:ring-2 focus:ring-[#f8a018]"
          aria-label="Open CEDA Live Chat"
        >
          <div className="relative">
            <div className="w-8 h-8 rounded-full bg-[#a02010] text-white flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">support_agent</span>
            </div>
            <span
              className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-white ${
                currentAvailability.available ? 'bg-emerald-600 animate-pulse' : 'bg-amber-500'
              }`}
            />
          </div>
          <div className="flex flex-col text-left">
            <span className="text-xs font-bold text-[#1c1c19]">Chat with CEDA</span>
            <span className="text-[10px] text-[#5a413c]">
              {currentAvailability.available ? 'Live support active' : 'Working days 09:00 – 16:00 CAT'}
            </span>
          </div>
        </button>
      )}

      {/* Non-Intrusive Expandable Drawer / Sidebar Slide-in */}
      {isOpen && (
        <div className="w-[360px] sm:w-[400px] h-[520px] max-h-[80vh] bg-white rounded-2xl shadow-2xl border border-[#e2bfb8] flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-200">
          {/* Active Session Chat Messaging */}
          {activeSessionId ? (
            <div className="flex flex-col h-full">
              {!currentAvailability.available && (
                <div className="bg-amber-50 border-b border-amber-200 px-3 py-2 text-[11px] text-amber-900 font-medium flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px]">info</span>
                  <span>Support is now closed. Replies may be slower.</span>
                </div>
              )}
              <div className="flex-1 overflow-hidden">
                <ChatMessaging sessionId={activeSessionId} onClose={() => setIsOpen(false)} />
              </div>
            </div>
          ) : currentAvailability.available ? (
            /* AVAILABLE State: Pre-Chat Intake Form */
            <div className="flex flex-col h-full bg-[#fdf9f4]">
              <div className="flex items-center justify-between px-5 py-4 bg-[#38231d] text-white">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px] text-[#f8a018]">support_agent</span>
                  <span className="font-headline text-sm font-bold">Start CEDA Live Chat</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="text-white/80 hover:text-white p-1 rounded-lg"
                  aria-label="Close drawer"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>

              <div className="p-6 flex-1 overflow-y-auto flex flex-col justify-between">
                <div className="flex flex-col gap-4">
                  <div className="p-3.5 bg-white rounded-xl border border-[#e2bfb8]/80 text-xs text-[#5a413c] leading-relaxed">
                    Welcome to CEDA Citizen Innovation Support. Please state your inquiry topic to connect with an available advisor.
                  </div>

                  {errorMsg && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
                      {errorMsg}
                    </div>
                  )}

                  <form onSubmit={handleStartChat} className="flex flex-col gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#38231d] mb-1">Inquiry Topic or Sector</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g., Agri-Tech Funding, Omang Verification"
                        value={topicInput}
                        onChange={(e) => setTopicInput(e.target.value)}
                        className="w-full h-11 px-3.5 rounded-xl border border-[#e2bfb8] bg-white text-xs text-[#1c1c19] focus:outline-hidden focus:ring-2 focus:ring-[#f8a018]"
                      />
                    </div>

                    {!isAuthenticated && (
                      <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900">
                        You must be signed in to chat with CEDA advisors.{' '}
                        <button
                          type="button"
                          onClick={() => {
                            setIsOpen(false);
                            setCurrentRoute('/login');
                          }}
                          className="font-bold underline"
                        >
                          Sign in now
                        </button>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full h-11 rounded-xl bg-[#a02010] hover:bg-[#7c0700] text-white text-xs font-semibold transition-colors shadow-xs flex items-center justify-center gap-2 mt-2"
                    >
                      {submitting ? 'Connecting...' : 'Connect to Advisor'}
                    </button>
                  </form>
                </div>

                <div className="text-center text-[10px] text-[#8d706b] mt-4">
                  Secure CEDA Botswana Citizen Support • CAT Timezone
                </div>
              </div>
            </div>
          ) : (
            /* OFFLINE State */
            <div className="flex flex-col h-full bg-[#fdf9f4]">
              <div className="flex items-center justify-between px-5 py-4 bg-[#38231d] text-white">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px] text-[#8d706b]">support_agent</span>
                  <span className="font-headline text-sm font-bold">CEDA Support Offline</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="text-white/80 hover:text-white p-1 rounded-lg"
                  aria-label="Close drawer"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>

              <div className="p-6 flex-1 overflow-y-auto flex flex-col gap-4 text-xs text-[#5a413c]">
                <div className="p-4 bg-white rounded-xl border border-[#e2bfb8]/80 leading-relaxed">
                  <strong className="text-[#1c1c19] block mb-1">Notice from CEDA:</strong>
                  {settings?.offlineMessage || currentAvailability.message || 'Live support is currently offline.'}
                </div>

                <div className="p-4 bg-white rounded-xl border border-[#e2bfb8]/80 flex flex-col gap-2">
                  <span className="font-bold text-[#1c1c19]">Operating Hours</span>
                  <p className="text-[#6b4f47]">Monday to Friday, 09:00 to 16:00 CAT (Central Africa Time).</p>
                  <p className="text-[#6b4f47]">Closed on weekends and Botswana public holidays.</p>
                </div>

                <div className="p-4 bg-white rounded-xl border border-[#e2bfb8]/80 flex flex-col gap-2">
                  <span className="font-bold text-[#1c1c19]">Alternative Contact</span>
                  <p>Email: <a href="mailto:support@ceda.co.bw" className="text-[#a02010] font-semibold underline">support@ceda.co.bw</a></p>
                  <p>Phone: <a href="tel:+2673911630" className="text-[#a02010] font-semibold underline">+267 391 1630</a></p>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      setCurrentRoute('/help-center');
                    }}
                    className="text-[#a02010] font-semibold hover:underline"
                  >
                    View Help Center & FAQs
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="px-4 py-2 rounded-lg bg-[#38231d] text-white font-semibold"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
