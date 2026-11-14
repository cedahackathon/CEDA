/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { AdminLayout } from '../../admin/AdminLayout';
import { ChatSystemSettings, ChatHoliday, ChatSettingsAudit } from '../../../types/chat';
import {
  fetchChatSettings,
  saveChatSettings,
  fetchChatHolidays,
  saveChatHolidays,
  fetchChatAuditLogs,
  fetchChatAnalyticsSummary,
} from '../../../services/chatSettingsService';
import { ChatSystemSettingsSchema } from '../../../schemas/chat.schema';
import { resolveAvailability } from '../../../utils/resolveAvailability';

const DAYS_OF_WEEK = [
  { id: 1, label: 'Monday' },
  { id: 2, label: 'Tuesday' },
  { id: 3, label: 'Wednesday' },
  { id: 4, label: 'Thursday' },
  { id: 5, label: 'Friday' },
  { id: 6, label: 'Saturday' },
  { id: 7, label: 'Sunday' },
];

export const AdminChatSettingsPage: React.FC = () => {
  const { currentUser, setCurrentRoute } = useAuth();
  const isAdmin = currentUser?.role === 'ADMIN';

  const [settings, setSettings] = useState<ChatSystemSettings | null>(null);
  const [initialSettings, setInitialSettings] = useState<ChatSystemSettings | null>(null);
  const [holidays, setHolidays] = useState<ChatHoliday[]>([]);
  const [initialHolidays, setInitialHolidays] = useState<ChatHoliday[]>([]);
  const [auditLogs, setAuditLogs] = useState<ChatSettingsAudit[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);

  // New holiday input state
  const [newHolidayDate, setNewHolidayDate] = useState('');
  const [newHolidayLabel, setNewHolidayLabel] = useState('');

  // Confirmation dialog for master toggle OFF
  const [showDisableModal, setShowDisableModal] = useState(false);
  const [pendingToggleValue, setPendingToggleValue] = useState(true);

  // Audit log modal view
  const [showAuditModal, setShowAuditModal] = useState(false);

  // Toast notification state
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );
  const [isSaving, setIsSaving] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      const s = await fetchChatSettings();
      const h = await fetchChatHolidays();
      const a = await fetchChatAuditLogs();
      const an = await fetchChatAnalyticsSummary();
      setSettings(s);
      setInitialSettings(JSON.parse(JSON.stringify(s)));
      setHolidays(h);
      setInitialHolidays(JSON.parse(JSON.stringify(h)));
      setAuditLogs(a);
      setAnalytics(an);
    }
    loadData();
  }, []);

  const triggerToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  if (!isAdmin) {
    return (
      <AdminLayout>
        <div className="p-8 text-center bg-white rounded-xl border border-[#e2bfb8]">
          <h1 className="text-xl font-bold text-[#a02010]">Access Denied</h1>
          <p className="text-sm text-[#5a413c] mt-2">You must be an administrator to configure chat settings.</p>
          <button
            onClick={() => setCurrentRoute('/dashboard')}
            className="mt-4 px-4 py-2 bg-[#7c0700] text-white rounded-lg text-xs font-semibold"
          >
            Return to Dashboard
          </button>
        </div>
      </AdminLayout>
    );
  }

  if (!settings) {
    return (
      <AdminLayout>
        <div className="p-12 text-center text-[#5a413c]">Loading chat control panel...</div>
      </AdminLayout>
    );
  }

  // Check if form is dirty
  const isDirty =
    JSON.stringify(settings) !== JSON.stringify(initialSettings) ||
    JSON.stringify(holidays) !== JSON.stringify(initialHolidays);

  const handleDiscard = () => {
    if (initialSettings) setSettings(JSON.parse(JSON.stringify(initialSettings)));
    if (initialHolidays) setHolidays(JSON.parse(JSON.stringify(initialHolidays)));
    setValidationError(null);
    triggerToast('success', 'Changes discarded successfully.');
  };

  const handleSave = async () => {
    setValidationError(null);
    // Validate with Zod
    const result = ChatSystemSettingsSchema.safeParse(settings);
    if (!result.success) {
      const errText = result.error.issues.map((e: any) => e.message).join('; ');
      setValidationError(errText);
      triggerToast('error', `Validation failed: ${errText}`);
      return;
    }

    setIsSaving(true);
    try {
      await saveChatHolidays(holidays);
      const actorName = currentUser?.fullName || currentUser?.email || 'System Admin';
      const { settings: updated, audit } = await saveChatSettings(settings, actorName);
      setSettings(updated);
      setInitialSettings(JSON.parse(JSON.stringify(updated)));
      setInitialHolidays(JSON.parse(JSON.stringify(holidays)));
      setAuditLogs((prev) => [audit, ...prev]);
      triggerToast('success', 'Chat control settings saved and applied successfully.');
    } catch (err: any) {
      triggerToast('error', 'Failed to save settings. Rollback applied.');
      // Rollback
      if (initialSettings) setSettings(JSON.parse(JSON.stringify(initialSettings)));
    } finally {
      setIsSaving(false);
    }
  };

  // Live availability resolution preview
  const currentAvailability = resolveAvailability(
    settings,
    [{ uid: 'agent-1', status: 'AVAILABLE', activeChats: 1, lastHeartbeat: new Date() }],
    holidays,
    new Date()
  );

  return (
    <AdminLayout>
      <div className="flex flex-col gap-6 pb-24">
        {/* Toast Notification Banner */}
        {toastMessage && (
          <div
            role="status"
            aria-live="polite"
            className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-xs font-medium transition-all ${
              toastMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-950 border-emerald-300'
                : 'bg-rose-50 text-rose-950 border-rose-300'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">
              {toastMessage.type === 'success' ? 'check_circle' : 'error'}
            </span>
            <span>{toastMessage.text}</span>
          </div>
        )}

        {/* Breadcrumb & Header */}
        <div className="flex flex-col gap-2">
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-[#6b4f47]">
            <button
              type="button"
              onClick={() => setCurrentRoute('/')}
              className="hover:text-[#a02010] transition-colors"
            >
              Home
            </button>
            <span aria-hidden="true">/</span>
            <button
              type="button"
              onClick={() => setCurrentRoute('/admin')}
              className="hover:text-[#a02010] transition-colors"
            >
              Administration
            </button>
            <span aria-hidden="true">/</span>
            <span className="font-semibold text-[#1c1c19]">Chat settings</span>
          </nav>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="font-headline text-2xl font-bold text-[#38231d] tracking-tight">
                Live Support & Chat Control Panel
              </h1>
              <p className="text-xs sm:text-sm text-[#6b4f47] mt-1">
                Configure citizen support desks, operating hours, holiday overrides, and automated messaging queues.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                  settings.isChatEnabled && currentAvailability.available
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    settings.isChatEnabled && currentAvailability.available ? 'bg-emerald-600 animate-pulse' : 'bg-amber-600'
                  }`}
                />
                {settings.isChatEnabled && currentAvailability.available
                  ? 'Live support active'
                  : 'Chat offline / outside hours'}
              </span>
            </div>
          </div>
        </div>

        {validationError && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-medium">
            <strong>Validation Error:</strong> {validationError}
          </div>
        )}

        {/* Analytics Preview Card */}
        {analytics && (
          <section className="bg-white rounded-xl border border-[#e2bfb8]/80 shadow-xs p-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-3 bg-[#fdf9f4] rounded-lg border border-[#e2bfb8]/60">
              <div className="flex items-center justify-between text-xs text-[#6b4f47] mb-1">
                <span>Today's Total Chats</span>
                <span className="material-symbols-outlined text-[16px] text-[#a02010]" title="Total citizen support chat sessions started today">info</span>
              </div>
              <p className="text-xl font-bold font-headline text-[#1c1c19]">{analytics.todayTotalChats}</p>
            </div>
            <div className="p-3 bg-[#fdf9f4] rounded-lg border border-[#e2bfb8]/60">
              <div className="flex items-center justify-between text-xs text-[#6b4f47] mb-1">
                <span>Avg. First Response</span>
                <span className="material-symbols-outlined text-[16px] text-[#a02010]" title="Average agent response time during working hours">info</span>
              </div>
              <p className="text-xl font-bold font-headline text-[#1c1c19]">{analytics.avgFirstResponseMinutes}m</p>
            </div>
            <div className="p-3 bg-[#fdf9f4] rounded-lg border border-[#e2bfb8]/60">
              <div className="flex items-center justify-between text-xs text-[#6b4f47] mb-1">
                <span>After-Hours / Missed</span>
                <span className="material-symbols-outlined text-[16px] text-[#a02010]" title="Inquiries received when chat desk was offline">info</span>
              </div>
              <p className="text-xl font-bold font-headline text-[#1c1c19]">{analytics.missedAfterHoursCount}</p>
            </div>
            <div className="p-3 bg-[#fdf9f4] rounded-lg border border-[#e2bfb8]/60">
              <div className="flex items-center justify-between text-xs text-[#6b4f47] mb-1">
                <span>Active Queue / Agents</span>
                <span className="material-symbols-outlined text-[16px] text-[#a02010]" title="Currently waiting queue and logged-in agents">info</span>
              </div>
              <p className="text-xl font-bold font-headline text-[#1c1c19]">
                {analytics.activeQueueCount} queue / {analytics.activeAgentsCount} agents
              </p>
            </div>
          </section>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Column 1 & 2: Main Settings */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            {/* Master Toggle Card */}
            <section className="bg-white rounded-xl border border-[#e2bfb8]/80 shadow-xs p-6 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-headline text-lg font-bold text-[#1c1c19]">Master Chat Kill-Switch</h2>
                  <p className="text-xs text-[#6b4f47]">
                    Instantly enable or disable live citizen chat intake across the entire CEDA portal.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={settings.isChatEnabled}
                  onClick={() => {
                    if (settings.isChatEnabled) {
                      setPendingToggleValue(false);
                      setShowDisableModal(true);
                    } else {
                      setSettings({ ...settings, isChatEnabled: true });
                    }
                  }}
                  className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden focus-visible:ring-2 focus-visible:ring-[#f8a018] ${
                    settings.isChatEnabled ? 'bg-[#a02010]' : 'bg-[#8d706b]'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      settings.isChatEnabled ? 'translate-x-7' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
              <div className="p-3 bg-[#fdf9f4] rounded-lg border border-[#e2bfb8]/60 flex items-center gap-2 text-xs text-[#5a413c]">
                <span className="material-symbols-outlined text-[18px] text-[#a02010]">info</span>
                <span>
                  Current State Line:{' '}
                  <strong>
                    {!settings.isChatEnabled
                      ? 'Switched off by you'
                      : currentAvailability.available
                      ? 'Live now'
                      : 'Outside support hours'}
                  </strong>{' '}
                  ({currentAvailability.reason})
                </span>
              </div>
            </section>

            {/* Operating Hours & Schedule Card */}
            <section className="bg-white rounded-xl border border-[#e2bfb8]/80 shadow-xs p-6 flex flex-col gap-5">
              <div>
                <h2 className="font-headline text-lg font-bold text-[#1c1c19]">Operating Hours & Schedule</h2>
                <p className="text-xs text-[#6b4f47]">
                  Set daily active hours in Central Africa Time (CAT, GMT+2) and operational working days.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#38231d] mb-1">Active Start Time (HH:mm)</label>
                  <input
                    type="time"
                    value={settings.activeStartTime}
                    onChange={(e) => setSettings({ ...settings, activeStartTime: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg border border-[#e2bfb8] bg-[#fdf9f4] text-sm text-[#1c1c19] focus:outline-hidden focus:ring-2 focus:ring-[#f8a018]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#38231d] mb-1">Active End Time (HH:mm)</label>
                  <input
                    type="time"
                    value={settings.activeEndTime}
                    onChange={(e) => setSettings({ ...settings, activeEndTime: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg border border-[#e2bfb8] bg-[#fdf9f4] text-sm text-[#1c1c19] focus:outline-hidden focus:ring-2 focus:ring-[#f8a018]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#38231d] mb-2">Operational Working Days</label>
                <div className="flex flex-wrap gap-2">
                  {DAYS_OF_WEEK.map((day) => {
                    const isSelected = settings.workingDays.includes(day.id);
                    return (
                      <button
                        key={day.id}
                        type="button"
                        onClick={() => {
                          const updatedDays = isSelected
                            ? settings.workingDays.filter((d) => d !== day.id)
                            : [...settings.workingDays, day.id].sort();
                          setSettings({ ...settings, workingDays: updatedDays });
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${
                          isSelected
                            ? 'bg-[#a02010] text-white border-[#a02010]'
                            : 'bg-white text-[#5a413c] border-[#e2bfb8] hover:bg-[#f7f3ee]'
                        }`}
                      >
                        {day.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="p-3 bg-[#f7f3ee] rounded-lg text-xs text-[#5a413c] font-medium">
                📅 Next scheduled opening preview: <strong>Monday {settings.activeStartTime} CAT</strong>
              </div>
            </section>

            {/* Messaging Customization Card */}
            <section className="bg-white rounded-xl border border-[#e2bfb8]/80 shadow-xs p-6 flex flex-col gap-5">
              <div>
                <h2 className="font-headline text-lg font-bold text-[#1c1c19]">Automated Messaging Customization</h2>
                <p className="text-xs text-[#6b4f47]">
                  Customize notices displayed to citizens when chat is offline or all agents are busy.
                </p>
              </div>

              <div className="flex flex-col gap-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-semibold text-[#38231d]">Offline / Outside Hours Message</label>
                    <span
                      className={`text-[11px] ${
                        settings.offlineMessage.length > 240 ? 'text-rose-600 font-bold' : 'text-[#6b4f47]'
                      }`}
                    >
                      {settings.offlineMessage.length}/240 chars
                    </span>
                  </div>
                  <textarea
                    rows={3}
                    maxLength={280}
                    value={settings.offlineMessage}
                    onChange={(e) => setSettings({ ...settings, offlineMessage: e.target.value })}
                    className="w-full p-3 rounded-lg border border-[#e2bfb8] bg-[#fdf9f4] text-xs text-[#1c1c19] focus:outline-hidden focus:ring-2 focus:ring-[#f8a018]"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-semibold text-[#38231d]">Busy Queue Notice</label>
                    <span
                      className={`text-[11px] ${
                        settings.busyMessage.length > 240 ? 'text-rose-600 font-bold' : 'text-[#6b4f47]'
                      }`}
                    >
                      {settings.busyMessage.length}/240 chars
                    </span>
                  </div>
                  <textarea
                    rows={3}
                    maxLength={280}
                    value={settings.busyMessage}
                    onChange={(e) => setSettings({ ...settings, busyMessage: e.target.value })}
                    className="w-full p-3 rounded-lg border border-[#e2bfb8] bg-[#fdf9f4] text-xs text-[#1c1c19] focus:outline-hidden focus:ring-2 focus:ring-[#f8a018]"
                  />
                </div>
              </div>

              {/* Live Miniature Widget Preview */}
              <div className="p-4 bg-[#fdf9f4] rounded-xl border border-[#e2bfb8]/70 flex flex-col gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#a02010]">
                  Live Citizen Widget Preview
                </span>
                <div className="p-3 bg-white rounded-lg border border-[#e2bfb8] shadow-xs text-xs text-[#38231d]">
                  <div className="flex items-center gap-2 mb-2 font-semibold text-[#a02010]">
                    <span className="material-symbols-outlined text-[16px]">support_agent</span>
                    <span>CEDA Support Desk</span>
                  </div>
                  <p className="text-[#5a413c] leading-relaxed">
                    {settings.isChatEnabled ? settings.busyMessage : settings.offlineMessage}
                  </p>
                </div>
              </div>
            </section>
          </div>

          {/* Column 3: Holiday Manager & Capacity Configuration */}
          <div className="flex flex-col gap-6">
            {/* Capacity Configuration Card */}
            <section className="bg-white rounded-xl border border-[#e2bfb8]/80 shadow-xs p-6 flex flex-col gap-4">
              <div>
                <h2 className="font-headline text-lg font-bold text-[#1c1c19]">Agent & Queue Capacity</h2>
                <p className="text-xs text-[#6b4f47]">Control concurrency limits per advisor and maximum queue length.</p>
              </div>

              <div className="flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#38231d] mb-1">
                    Max Concurrent Chats Per Agent (1–6)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={6}
                    value={settings.maxConcurrentChatsPerAgent}
                    onChange={(e) =>
                      setSettings({ ...settings, maxConcurrentChatsPerAgent: parseInt(e.target.value, 10) || 1 })
                    }
                    className="w-full h-10 px-3 rounded-lg border border-[#e2bfb8] bg-[#fdf9f4] text-sm text-[#1c1c19]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#38231d] mb-1">
                    Max Queue Length (5–50)
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={50}
                    value={settings.maxQueueLength}
                    onChange={(e) =>
                      setSettings({ ...settings, maxQueueLength: parseInt(e.target.value, 10) || 5 })
                    }
                    className="w-full h-10 px-3 rounded-lg border border-[#e2bfb8] bg-[#fdf9f4] text-sm text-[#1c1c19]"
                  />
                </div>
              </div>
            </section>

            {/* Holiday Manager Card */}
            <section className="bg-white rounded-xl border border-[#e2bfb8]/80 shadow-xs p-6 flex flex-col gap-4">
              <div>
                <h2 className="font-headline text-lg font-bold text-[#1c1c19]">Holiday Manager</h2>
                <p className="text-xs text-[#6b4f47]">Block public holidays and statutory closures in Botswana.</p>
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-2">
                  <input
                    type="date"
                    value={newHolidayDate}
                    onChange={(e) => setNewHolidayDate(e.target.value)}
                    className="h-9 px-3 rounded-lg border border-[#e2bfb8] bg-[#fdf9f4] text-xs text-[#1c1c19]"
                  />
                  <input
                    type="text"
                    placeholder="Holiday Label (e.g. President's Day)"
                    value={newHolidayLabel}
                    onChange={(e) => setNewHolidayLabel(e.target.value)}
                    className="h-9 px-3 rounded-lg border border-[#e2bfb8] bg-[#fdf9f4] text-xs text-[#1c1c19]"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!newHolidayDate || !newHolidayLabel) {
                        triggerToast('error', 'Please provide both date and holiday label.');
                        return;
                      }
                      if (holidays.some((h) => h.dateId === newHolidayDate)) {
                        triggerToast('error', 'A holiday already exists for this date.');
                        return;
                      }
                      setHolidays([...holidays, { dateId: newHolidayDate, label: newHolidayLabel }]);
                      setNewHolidayDate('');
                      setNewHolidayLabel('');
                      triggerToast('success', 'Holiday added to override list.');
                    }}
                    className="h-9 px-4 rounded-lg bg-[#38231d] hover:bg-[#1c1c19] text-white text-xs font-semibold transition-colors"
                  >
                    Add Holiday Override
                  </button>
                </div>

                <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
                  {holidays.map((h) => (
                    <div
                      key={h.dateId}
                      className="flex items-center justify-between p-2 bg-[#fdf9f4] rounded-lg border border-[#e2bfb8]/60 text-xs"
                    >
                      <div>
                        <strong className="text-[#1c1c19]">{h.dateId}</strong>
                        <p className="text-[#6b4f47] truncate max-w-[160px]">{h.label}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setHolidays(holidays.filter((item) => item.dateId !== h.dateId));
                          triggerToast('success', 'Holiday removed.');
                        }}
                        className="text-rose-600 hover:text-rose-800 p-1"
                        title="Remove holiday"
                      >
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>
        </div>

        {/* Audit Metadata Footer */}
        <div className="p-4 bg-white rounded-xl border border-[#e2bfb8]/70 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#5a413c]">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-[#a02010]">history</span>
            <span>
              Last changed by <strong>{settings.updatedById}</strong> at{' '}
              {new Date(settings.updatedAt).toLocaleString()} CAT
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowAuditModal(true)}
            className="text-[#a02010] hover:underline font-semibold"
          >
            View audit trail ({auditLogs.length} events)
          </button>
        </div>

        {/* Sticky Discard / Save Changes Action Bar */}
        {isDirty && (
          <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#38231d] text-white py-3 px-6 shadow-2xl border-t border-[#5a413c] flex items-center justify-between animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-center gap-2 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-[#f8a018] animate-ping" />
              <span>You have unsaved configuration changes in the CEDA Chat Panel.</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleDiscard}
                disabled={isSaving}
                className="px-4 py-2 rounded-lg border border-[#8d706b] hover:bg-[#5a413c] text-xs font-semibold text-white transition-colors"
              >
                Discard
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="px-5 py-2 rounded-lg bg-[#a02010] hover:bg-[#861a0d] text-xs font-semibold text-white transition-colors shadow-xs flex items-center gap-2"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        )}

        {/* Master Toggle Confirmation Modal */}
        {showDisableModal && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#e2bfb8] flex flex-col gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center">
                <span className="material-symbols-outlined text-[24px]">warning</span>
              </div>
              <h3 className="font-headline text-lg font-bold text-[#1c1c19]">Disable Live Chat Intake?</h3>
              <p className="text-xs text-[#5a413c] leading-relaxed">
                Turning off master chat will immediately stop new citizen support sessions from starting. Ongoing active chats will continue until resolved by advisors.
              </p>
              <div className="flex justify-end gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => setShowDisableModal(false)}
                  className="px-4 py-2 rounded-lg border border-[#e2bfb8] text-xs font-semibold text-[#38231d] hover:bg-[#f7f3ee]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSettings({ ...settings, isChatEnabled: false });
                    setShowDisableModal(false);
                  }}
                  className="px-4 py-2 rounded-lg bg-[#a02010] hover:bg-[#7c0700] text-xs font-semibold text-white"
                >
                  Yes, Disable Chat
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Audit Trail Modal */}
        {showAuditModal && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-[#e2bfb8] flex flex-col gap-4 max-h-[85vh]">
              <div className="flex items-center justify-between pb-3 border-b border-[#e2bfb8]/60">
                <h3 className="font-headline text-lg font-bold text-[#1c1c19]">Chat Settings Audit Trail</h3>
                <button
                  type="button"
                  onClick={() => setShowAuditModal(false)}
                  className="text-[#6b4f47] hover:text-[#1c1c19]"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <div className="flex flex-col gap-3 overflow-y-auto pr-1">
                {auditLogs.map((log) => (
                  <div key={log.id} className="p-3 bg-[#fdf9f4] rounded-xl border border-[#e2bfb8]/60 flex flex-col gap-1 text-xs">
                    <div className="flex justify-between items-center text-[#6b4f47]">
                      <span>Actor: <strong className="text-[#1c1c19]">{log.actorId}</strong></span>
                      <span>{new Date(log.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="font-semibold text-[#38231d]">{log.field}</p>
                  </div>
                ))}
              </div>
              <div className="flex justify-end pt-3 border-t border-[#e2bfb8]/60">
                <button
                  type="button"
                  onClick={() => setShowAuditModal(false)}
                  className="px-4 py-2 rounded-lg bg-[#38231d] text-white text-xs font-semibold"
                >
                  Close Audit View
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};
