/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  DOCUMENT_SLOTS,
  DocumentSlotKey,
  MANDATORY_DOCUMENT_KEYS,
} from '../../../data/documentOptions';
import {
  DEMOGRAPHIC_TARGETS,
  INNOVATION_SECTORS,
  INNOVATION_TYPES,
  TRL_LEVELS,
} from '../../../data/ideaOptions';
import {
  DECLARATION_SUMMARY_TEXT,
  STATUTORY_DECLARATION_TEXT,
} from '../../../data/submitterMock';
import {
  formatBotswanaPhoneDisplay,
  formatDocumentFileSize,
  IdeaDocumentFile,
  WizardApplicantDetails,
  WizardIdeaDetails,
  WizardIdeaDocuments,
} from '../../../services/submitterService';
import { Step2ValidationResult } from './Step2IdeaDetails';
import { Step3ValidationResult } from './Step3Documents';

interface Step4ReviewSubmitProps {
  applicant: WizardApplicantDetails;
  idea: WizardIdeaDetails;
  documents: WizardIdeaDocuments;
  step1Valid: boolean;
  step2Validation: Step2ValidationResult;
  step3Validation: Step3ValidationResult;
  declarationAccepted: boolean;
  touchedDeclaration: boolean;
  hasAttemptedSubmit: boolean;
  preparationPct: number;
  previewingKey: string | null;
  previewError: string | null;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  saveErrorMessage: string | null;
  submitErrorMessage: string | null;
  isConfirmDialogOpen: boolean;
  isSubmitting: boolean;
  liveAnnouncement: string;
  declarationCheckboxRef: React.RefObject<HTMLInputElement | null>;
  submitTriggerButtonRef: React.RefObject<HTMLButtonElement | null>;
  onEditStep: (step: 1 | 2 | 3) => void;
  onPreviewFile: (key: DocumentSlotKey, file: IdeaDocumentFile) => void;
  onToggleDeclaration: (accepted: boolean) => void;
  onRetrySave: () => void;
  onCloseConfirmDialog: () => void;
  onConfirmSubmit: () => void;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return (name.trim().slice(0, 2) || 'TM').toUpperCase();
}

export const Step4ReviewSubmit: React.FC<Step4ReviewSubmitProps> = ({
  applicant,
  idea,
  documents,
  step1Valid,
  step2Validation,
  step3Validation,
  declarationAccepted,
  touchedDeclaration,
  hasAttemptedSubmit,
  preparationPct,
  previewingKey,
  previewError,
  saveStatus,
  saveErrorMessage,
  submitErrorMessage,
  isConfirmDialogOpen,
  isSubmitting,
  liveAnnouncement,
  declarationCheckboxRef,
  submitTriggerButtonRef,
  onEditStep,
  onPreviewFile,
  onToggleDeclaration,
  onRetrySave,
  onCloseConfirmDialog,
  onConfirmSubmit,
}) => {
  const [isNarrativeExpanded, setIsNarrativeExpanded] = useState(false);
  const [isFullDeclarationOpen, setIsFullDeclarationOpen] = useState(false);

  const modalRef = useRef<HTMLDivElement | null>(null);
  const cancelButtonRef = useRef<HTMLButtonElement | null>(null);
  const confirmButtonRef = useRef<HTMLButtonElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const declarationErrorId = useId();
  const narrativePanelId = useId();
  const fullDeclarationId = useId();

  // Focus trap & Escape key handling for confirmation modal
  useEffect(() => {
    if (!isConfirmDialogOpen) {
      if (previousFocusRef.current) {
        previousFocusRef.current.focus();
        previousFocusRef.current = null;
      }
      return;
    }

    previousFocusRef.current =
      (document.activeElement as HTMLElement | null) ||
      submitTriggerButtonRef.current;

    const focusTimer = window.setTimeout(() => {
      cancelButtonRef.current?.focus();
    }, 10);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (!isSubmitting) {
          e.preventDefault();
          onCloseConfirmDialog();
        }
        return;
      }
      if (e.key !== 'Tab') return;

      const container = modalRef.current;
      if (!container) return;

      const focusable = Array.from(
        container.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first || !container.contains(document.activeElement)) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last || !container.contains(document.activeElement)) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isConfirmDialogOpen, isSubmitting, onCloseConfirmDialog, submitTriggerButtonRef]);

  // Resolve option labels strictly from data dictionaries
  const sectorLabel = useMemo(() => {
    if (!idea.sector) return 'Not specified';
    const match = INNOVATION_SECTORS.find(
      (s) => s.id === idea.sector || s.label === idea.sector
    );
    return match ? match.label : idea.sector;
  }, [idea.sector]);

  const innovationTypeLabel = useMemo(() => {
    if (!idea.innovationType) return 'Not specified';
    const match = INNOVATION_TYPES.find((t) => t.value === idea.innovationType);
    return match ? match.label : idea.innovationType;
  }, [idea.innovationType]);

  const trlLabel = useMemo(() => {
    if (!idea.trl) return 'Not specified';
    const match = TRL_LEVELS.find((t) => t.level === idea.trl);
    return match ? match.label : `TRL ${idea.trl}`;
  }, [idea.trl]);

  const demographicLabels = useMemo(() => {
    if (!idea.demographics || idea.demographics.length === 0) return [];
    return idea.demographics.map((id) => {
      const match = DEMOGRAPHIC_TARGETS.find((d) => d.id === id);
      return match ? match.label : id;
    });
  }, [idea.demographics]);

  const mandatorySlots = useMemo(
    () =>
      DOCUMENT_SLOTS.filter((slot) =>
        MANDATORY_DOCUMENT_KEYS.includes(
          slot.key as 'omang' | 'conceptNote' | 'budget'
        )
      ),
    []
  );

  const supplementarySummary = useMemo(() => {
    const types: string[] = [];
    let count = 0;

    if (documents.proofOfResidence) {
      count += 1;
      const label =
        DOCUMENT_SLOTS.find((s) => s.key === 'proofOfResidence')?.title ||
        'Proof of residence';
      types.push(label);
    }
    if (documents.cipa) {
      count += 1;
      const label =
        DOCUMENT_SLOTS.find((s) => s.key === 'cipa')?.title ||
        'CIPA registration certificate';
      types.push(label);
    }
    if (documents.letters.length > 0) {
      count += documents.letters.length;
      const label =
        DOCUMENT_SLOTS.find((s) => s.key === 'letters')?.title ||
        'Letters of support / MOUs';
      types.push(`${label} (${documents.letters.length})`);
    }

    return { count, types };
  }, [documents]);

  const attentionItems = useMemo(() => {
    const items: Array<{
      id: string;
      label: string;
      actionLabel: string;
      onAction: () => void;
    }> = [];

    if (!step1Valid) {
      items.push({
        id: 'attn-step1',
        label: 'Applicant details have incomplete required fields.',
        actionLabel: 'Edit Applicant details',
        onAction: () => onEditStep(1),
      });
    }
    if (!step2Validation.isValid) {
      items.push({
        id: 'attn-step2',
        label: 'Idea details and impact have incomplete required fields.',
        actionLabel: 'Edit Idea details',
        onAction: () => onEditStep(2),
      });
    }
    if (!step3Validation.isValid) {
      items.push({
        id: 'attn-step3',
        label: `${step3Validation.missingMandatoryKeys.length} required supporting document(s) missing.`,
        actionLabel: 'Edit Documents',
        onAction: () => onEditStep(3),
      });
    }
    if (!declarationAccepted) {
      items.push({
        id: 'attn-declaration',
        label: 'Confirm the citizen declaration checkbox before submitting.',
        actionLabel: 'Go to declaration',
        onAction: () => {
          declarationCheckboxRef.current?.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          });
          declarationCheckboxRef.current?.focus();
        },
      });
    }

    return items;
  }, [
    declarationAccepted,
    declarationCheckboxRef,
    onEditStep,
    step1Valid,
    step2Validation.isValid,
    step3Validation.isValid,
    step3Validation.missingMandatoryKeys.length,
  ]);

  const showDeclarationError =
    (touchedDeclaration || hasAttemptedSubmit) && !declarationAccepted;

  const fullName =
    [applicant.firstName, applicant.surname].filter(Boolean).join(' ').trim() ||
    'Not provided';

  const narrativeExcerpt = useMemo(() => {
    const clean = idea.problem.trim();
    if (!clean) return 'No problem statement provided yet.';
    if (clean.length <= 210) return clean;
    return `${clean.slice(0, 207).trim()}...`;
  }, [idea.problem]);

  return (
    <>
      <div className="bg-white rounded-2xl border border-[#e2bfb8]/70 shadow-2xs p-5 sm:p-6 space-y-6">
        {/* Top Meta Header */}
        <div className="space-y-2 border-b border-[#f1ede8] pb-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#a02010]">
              <span className="material-symbols-outlined text-[16px]">fact_check</span>
              <span>Final step</span>
            </span>

            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border tabular-nums ${
                preparationPct === 100
                  ? 'bg-[#eef6ee] text-[#1f5c2e] border-[#c4dfc9]'
                  : 'bg-[#fbf3ef] text-[#5a413c] border-[#e2bfb8]/80'
              }`}
            >
              <span>{preparationPct}% Prepared</span>
            </span>
          </div>

          <h2 className="font-headline text-lg sm:text-xl font-bold text-[#1c1c19]">
            Review your submission
          </h2>
          <p className="text-xs sm:text-sm text-[#5a413c]">
            Please verify all applicant details, proposal details, and uploaded documents before
            submitting to CEDA evaluation committees.
          </p>
        </div>

        {/* Screen reader status announcements */}
        <div className="sr-only" aria-live="polite" aria-atomic="true">
          {liveAnnouncement}
        </div>

        {/* Save error alert */}
        {saveStatus === 'error' && (
          <div
            role="alert"
            className="rounded-xl bg-[#ffdad6]/50 border border-[#ba1a1a]/30 px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs text-[#7c0700]"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="material-symbols-outlined text-[18px] shrink-0">
                cloud_off
              </span>
              <span className="font-medium">
                {saveErrorMessage || 'Could not save your declaration.'}
              </span>
            </div>
            <button
              type="button"
              onClick={onRetrySave}
              className="font-bold underline hover:no-underline shrink-0"
            >
              Retry
            </button>
          </div>
        )}

        {/* Submit failure alert */}
        {submitErrorMessage && (
          <div
            role="alert"
            className="rounded-xl bg-[#ffdad6]/50 border border-[#ba1a1a]/40 px-4 py-3 flex items-start gap-2.5 text-xs text-[#7c0700]"
          >
            <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">
              error_outline
            </span>
            <span className="font-medium leading-relaxed">{submitErrorMessage}</span>
          </div>
        )}

        {/* Attention summary when trying to submit with incomplete items */}
        {hasAttemptedSubmit && attentionItems.length > 0 && (
          <div
            role="alert"
            aria-labelledby="review-attention-heading"
            className="rounded-xl bg-[#ffdad6]/40 border border-[#ba1a1a]/35 px-4 py-3.5 space-y-2"
          >
            <div className="flex items-center gap-2 text-xs font-bold text-[#7c0700]">
              <span className="material-symbols-outlined text-[18px]">warning</span>
              <h3 id="review-attention-heading">
                {attentionItems.length === 1
                  ? '1 item needs your attention'
                  : `${attentionItems.length} items need your attention`}
              </h3>
            </div>
            <ul className="space-y-1.5 pl-6 list-disc text-xs text-[#5a413c]">
              {attentionItems.map((item) => (
                <li key={item.id}>
                  <span>{item.label} </span>
                  <button
                    type="button"
                    onClick={item.onAction}
                    className="font-bold text-[#a02010] hover:text-[#7c0700] underline underline-offset-2"
                  >
                    {item.actionLabel}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* SECTION 1: APPLICANT DETAILS */}
        <section
          aria-labelledby="review-section-applicant"
          className="rounded-2xl border border-[#e2bfb8]/80 bg-white overflow-hidden"
        >
          <div className="px-4 sm:px-5 py-3.5 bg-[#fdf9f4] border-b border-[#e2bfb8]/60 flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <span
                aria-hidden="true"
                className="w-6 h-6 rounded-full bg-[#a02010] text-white text-xs font-bold flex items-center justify-center shrink-0 tabular-nums"
              >
                1
              </span>
              <h3
                id="review-section-applicant"
                className="font-headline text-sm sm:text-base font-bold text-[#1c1c19]"
              >
                Applicant details
              </h3>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                  step1Valid
                    ? 'bg-[#eef6ee] text-[#1f5c2e] border-[#c4dfc9]'
                    : 'bg-[#fdf1eb] text-[#7c3515] border-[#edc7b7]'
                }`}
              >
                <span className="material-symbols-outlined text-[13px]">
                  {step1Valid ? 'check_circle' : 'error_outline'}
                </span>
                <span>{step1Valid ? 'Complete' : 'Incomplete'}</span>
              </span>
            </div>

            <button
              type="button"
              onClick={() => onEditStep(1)}
              aria-label="Edit Applicant details"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-[#a02010] hover:bg-[#ffdad4]/40 hover:text-[#7c0700] transition-colors"
            >
              <span className="material-symbols-outlined text-[15px]">edit</span>
              <span>Edit</span>
            </button>
          </div>

          <div className="p-4 sm:p-5 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#6b4f47]">
                  Full name
                </p>
                <p className="text-sm font-bold text-[#1c1c19] mt-1">{fullName}</p>
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#6b4f47]">
                  Application category
                </p>
                <p className="text-sm font-bold text-[#1c1c19] mt-1">
                  {applicant.type === 'business'
                    ? 'Business or group'
                    : 'Individual citizen'}
                </p>
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#6b4f47]">
                  Contact details
                </p>
                <p className="text-sm font-semibold text-[#1c1c19] mt-1 break-all">
                  {applicant.email || 'Not provided'}
                </p>
                <p className="text-xs text-[#5a413c] mt-0.5 tabular-nums">
                  {applicant.phone
                    ? `+267 ${formatBotswanaPhoneDisplay(applicant.phone)}`
                    : 'Mobile not provided'}
                </p>
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#6b4f47]">
                  District &amp; location
                </p>
                <p className="text-sm font-semibold text-[#1c1c19] mt-1">
                  {[applicant.town, applicant.district].filter(Boolean).join(', ') ||
                    'Not provided'}
                </p>
                <p className="text-xs text-[#5a413c] mt-0.5">
                  {applicant.address || 'Address not provided'}
                </p>
              </div>
            </div>

            {applicant.type === 'business' && (
              <div className="pt-4 border-t border-[#f1ede8] grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#6b4f47]">
                    Trading name
                  </p>
                  <p className="text-xs font-bold text-[#1c1c19] mt-1">
                    {applicant.business.tradingName || 'Not provided'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#6b4f47]">
                    CIPA number
                  </p>
                  <p className="text-xs font-semibold text-[#1c1c19] mt-1 tabular-nums">
                    {applicant.business.cipaNumber || 'Not provided'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#6b4f47]">
                    BURS TIN
                  </p>
                  <p className="text-xs font-semibold text-[#1c1c19] mt-1 tabular-nums">
                    {applicant.business.tin || 'Not provided'}
                  </p>
                </div>
              </div>
            )}

            {/* Team members as cards (initials, name, role) */}
            <div className="pt-4 border-t border-[#f1ede8] space-y-2.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#6b4f47]">
                Co-founders &amp; key team
              </p>
              {applicant.team.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {applicant.team.map((member, idx) => (
                    <div
                      key={`${member.name}-${idx}`}
                      className="rounded-xl bg-[#fdf9f4] border border-[#e2bfb8]/60 px-3.5 py-2.5 flex items-center gap-3"
                    >
                      <span
                        aria-hidden="true"
                        className="w-8 h-8 rounded-full bg-[#ffdad4]/80 text-[#7c0700] text-xs font-bold flex items-center justify-center shrink-0"
                      >
                        {getInitials(member.name)}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[#1c1c19] truncate">
                          {member.name}
                        </p>
                        <p className="text-[11px] text-[#5a413c] truncate">
                          {member.role}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[#6b4f47]">
                  Applying individually — no additional team members listed.
                </p>
              )}
            </div>
          </div>
        </section>

        {/* SECTION 2: IDEA DETAILS AND IMPACT */}
        <section
          aria-labelledby="review-section-idea"
          className="rounded-2xl border border-[#e2bfb8]/80 bg-white overflow-hidden"
        >
          <div className="px-4 sm:px-5 py-3.5 bg-[#fdf9f4] border-b border-[#e2bfb8]/60 flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <span
                aria-hidden="true"
                className="w-6 h-6 rounded-full bg-[#a02010] text-white text-xs font-bold flex items-center justify-center shrink-0 tabular-nums"
              >
                2
              </span>
              <h3
                id="review-section-idea"
                className="font-headline text-sm sm:text-base font-bold text-[#1c1c19]"
              >
                Idea details and impact
              </h3>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                  step2Validation.isValid
                    ? 'bg-[#eef6ee] text-[#1f5c2e] border-[#c4dfc9]'
                    : 'bg-[#fdf1eb] text-[#7c3515] border-[#edc7b7]'
                }`}
              >
                <span className="material-symbols-outlined text-[13px]">
                  {step2Validation.isValid ? 'check_circle' : 'error_outline'}
                </span>
                <span>{step2Validation.isValid ? 'Complete' : 'Incomplete'}</span>
              </span>
            </div>

            <button
              type="button"
              onClick={() => onEditStep(2)}
              aria-label="Edit Idea details and impact"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-[#a02010] hover:bg-[#ffdad4]/40 hover:text-[#7c0700] transition-colors"
            >
              <span className="material-symbols-outlined text-[15px]">edit</span>
              <span>Edit</span>
            </button>
          </div>

          <div className="p-4 sm:p-5 space-y-5">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#6b4f47]">
                Innovation title
              </p>
              <p className="font-headline text-base sm:text-lg font-bold text-[#7c0700] mt-1">
                {idea.title.trim() || 'Untitled proposal'}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#6b4f47]">
                  Primary sector &amp; sub-sector
                </p>
                <p className="text-sm font-bold text-[#1c1c19] mt-1">{sectorLabel}</p>
                <p className="text-xs text-[#5a413c] mt-0.5">
                  Sub-sector: {idea.subSector.trim() || 'Not specified'}
                </p>
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#6b4f47]">
                  Classification &amp; readiness
                </p>
                <p className="text-sm font-bold text-[#1c1c19] mt-1">
                  {innovationTypeLabel}
                </p>
                <p className="text-xs text-[#5a413c] mt-0.5">
                  Readiness: <span className="font-semibold text-[#1c1c19]">{trlLabel}</span>
                </p>
                <p className="text-xs text-[#5a413c] mt-0.5">
                  IP status:{' '}
                  <span className="font-semibold text-[#1c1c19]">
                    {idea.ipStatus.trim() || 'Not specified'}
                  </span>
                </p>
              </div>
            </div>

            {/* Collapsed-by-default narrative block */}
            <div className="rounded-xl bg-[#fdf9f4] border border-[#e2bfb8]/60 p-4 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#5a413c]">
                  <span className="material-symbols-outlined text-[15px] text-[#77574e]">
                    notes
                  </span>
                  <span>Proposal narrative</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsNarrativeExpanded((prev) => !prev)}
                  aria-expanded={isNarrativeExpanded}
                  aria-controls={narrativePanelId}
                  className="text-xs font-semibold text-[#a02010] hover:text-[#7c0700] underline-offset-2 hover:underline"
                >
                  {isNarrativeExpanded ? 'Show less' : 'Show more'}
                </button>
              </div>

              {!isNarrativeExpanded ? (
                <p id={narrativePanelId} className="text-xs text-[#38231d] italic leading-relaxed">
                  &ldquo;{narrativeExcerpt}&rdquo;
                </p>
              ) : (
                <div id={narrativePanelId} className="space-y-3 pt-1">
                  <div>
                    <p className="text-[11px] font-bold text-[#1c1c19]">
                      Problem statement
                    </p>
                    <p className="text-xs text-[#38231d] leading-relaxed whitespace-pre-line mt-0.5">
                      {idea.problem.trim() || 'Not provided'}
                    </p>
                  </div>
                  <div className="pt-2 border-t border-[#e2bfb8]/40">
                    <p className="text-[11px] font-bold text-[#1c1c19]">
                      Proposed solution &amp; technology
                    </p>
                    <p className="text-xs text-[#38231d] leading-relaxed whitespace-pre-line mt-0.5">
                      {idea.solution.trim() || 'Not provided'}
                    </p>
                  </div>
                  <div className="pt-2 border-t border-[#e2bfb8]/40">
                    <p className="text-[11px] font-bold text-[#1c1c19]">
                      Key beneficiaries &amp; target market
                    </p>
                    <p className="text-xs text-[#38231d] leading-relaxed whitespace-pre-line mt-0.5">
                      {idea.beneficiaries.trim() || 'Not provided'}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom 3-column metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-xl bg-[#fdf9f4] border border-[#e2bfb8]/60 p-3.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#6b4f47]">
                  Projected employment
                </p>
                <p className="font-headline text-base font-bold text-[#7c0700] mt-1 tabular-nums">
                  {idea.jobsEstimate !== null ? `${idea.jobsEstimate} Direct Jobs` : 'Not specified'}
                </p>
                <p className="text-[11px] text-[#5a413c] mt-0.5">Within 24 months</p>
              </div>

              <div className="rounded-xl bg-[#fdf9f4] border border-[#e2bfb8]/60 p-3.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#6b4f47]">
                  Priority demographics
                </p>
                <p className="text-xs font-bold text-[#1c1c19] mt-1.5 leading-snug">
                  {demographicLabels.length > 0
                    ? demographicLabels.join(', ')
                    : 'None selected'}
                </p>
              </div>

              <div className="rounded-xl bg-[#fdf9f4] border border-[#e2bfb8]/60 p-3.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#6b4f47]">
                  Primary impact metric
                </p>
                <p className="text-xs font-bold text-[#1c1c19] mt-1.5 leading-snug">
                  {idea.impactMetric.trim() || 'Not specified'}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 3: SUPPORTING DOCUMENTS */}
        <section
          aria-labelledby="review-section-documents"
          className="rounded-2xl border border-[#e2bfb8]/80 bg-white overflow-hidden"
        >
          <div className="px-4 sm:px-5 py-3.5 bg-[#fdf9f4] border-b border-[#e2bfb8]/60 flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <span
                aria-hidden="true"
                className="w-6 h-6 rounded-full bg-[#a02010] text-white text-xs font-bold flex items-center justify-center shrink-0 tabular-nums"
              >
                3
              </span>
              <h3
                id="review-section-documents"
                className="font-headline text-sm sm:text-base font-bold text-[#1c1c19]"
              >
                Supporting documents
              </h3>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border tabular-nums ${
                  step3Validation.isValid
                    ? 'bg-[#eef6ee] text-[#1f5c2e] border-[#c4dfc9]'
                    : 'bg-[#fdf1eb] text-[#7c3515] border-[#edc7b7]'
                }`}
              >
                <span className="material-symbols-outlined text-[13px]">
                  {step3Validation.isValid ? 'check_circle' : 'error_outline'}
                </span>
                <span>
                  {step3Validation.isValid
                    ? `${step3Validation.attachedMandatoryCount}/${step3Validation.totalMandatory} Attached`
                    : 'Incomplete'}
                </span>
              </span>
            </div>

            <button
              type="button"
              onClick={() => onEditStep(3)}
              aria-label="Edit Supporting documents"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-[#a02010] hover:bg-[#ffdad4]/40 hover:text-[#7c0700] transition-colors"
            >
              <span className="material-symbols-outlined text-[15px]">edit</span>
              <span>Edit</span>
            </button>
          </div>

          <div className="p-4 sm:p-5 space-y-3">
            {previewError && (
              <div
                role="alert"
                className="rounded-xl bg-[#ffdad6]/40 border border-[#ba1a1a]/30 px-3.5 py-2.5 text-xs text-[#7c0700]"
              >
                {previewError}
              </div>
            )}

            {mandatorySlots.map((slot) => {
              const file = documents[slot.key as 'omang' | 'conceptNote' | 'budget'];
              const isAttached = Boolean(file);
              const isPreviewing = previewingKey === slot.key;

              return (
                <div
                  key={slot.key}
                  className="rounded-xl border border-[#e2bfb8]/70 bg-white px-3.5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-start sm:items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-[#fbf3ef] border border-[#e2bfb8]/60 text-[#7c0700] flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[19px]">
                        {slot.icon}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#1c1c19]">{slot.title}</p>
                      {file ? (
                        <p className="text-[11px] text-[#5a413c] mt-0.5 flex items-center gap-1.5 min-w-0">
                          <span className="truncate max-w-[220px] sm:max-w-[300px]" title={file.name}>
                            {file.name}
                          </span>
                          <span aria-hidden="true">•</span>
                          <span className="shrink-0 tabular-nums">
                            {formatDocumentFileSize(file.size)}
                          </span>
                        </p>
                      ) : (
                        <p className="text-[11px] text-[#ba1a1a] mt-0.5">
                          No file attached
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                        isAttached
                          ? 'bg-[#eef6ee] text-[#1f5c2e] border-[#c4dfc9]'
                          : 'bg-[#ffdad6]/50 text-[#7c0700] border-[#ba1a1a]/30'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[13px]">
                        {isAttached ? 'check' : 'warning'}
                      </span>
                      <span>{isAttached ? 'Attached' : 'Missing'}</span>
                    </span>

                    {file && (
                      <button
                        type="button"
                        onClick={() => onPreviewFile(slot.key, file)}
                        disabled={isPreviewing}
                        aria-label={`Preview ${slot.title}`}
                        title="Preview"
                        className="w-8 h-8 rounded-lg border border-[#e2bfb8]/80 bg-white hover:bg-[#f7f3ee] text-[#5a413c] hover:text-[#1c1c19] flex items-center justify-center transition-colors disabled:opacity-60"
                      >
                        <span className="material-symbols-outlined text-[17px]">
                          {isPreviewing ? 'hourglass_top' : 'visibility'}
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Supplementary optional attachments grouped row */}
            <div className="rounded-xl border border-[#e2bfb8]/70 bg-[#fdf9f4] px-3.5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-start sm:items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-white border border-[#e2bfb8]/70 text-[#5a413c] flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[19px]">
                    attach_file
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[#1c1c19]">
                    Supplementary attachments
                    {supplementarySummary.count > 0
                      ? ` (${supplementarySummary.count})`
                      : ''}
                  </p>
                  <p className="text-[11px] text-[#5a413c] mt-0.5">
                    {supplementarySummary.count > 0
                      ? supplementarySummary.types.join(', ')
                      : 'No optional attachments uploaded'}
                  </p>
                </div>
              </div>

              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border self-start sm:self-center shrink-0 ${
                  supplementarySummary.count > 0
                    ? 'bg-[#eef6ee] text-[#1f5c2e] border-[#c4dfc9]'
                    : 'bg-white text-[#5a413c] border-[#e2bfb8]'
                }`}
              >
                <span className="material-symbols-outlined text-[13px]">
                  {supplementarySummary.count > 0 ? 'check' : 'remove'}
                </span>
                <span>
                  {supplementarySummary.count > 0 ? 'Provided' : 'None attached'}
                </span>
              </span>
            </div>
          </div>
        </section>

        {/* NOTICE CARD */}
        <section
          aria-label="Submission notice"
          className="rounded-2xl bg-[#fdf6ec] border border-[#edd8b4] p-4 sm:p-5 flex items-start gap-3"
        >
          <span
            aria-hidden="true"
            className="material-symbols-outlined text-[20px] text-[#8f4c00] mt-0.5 shrink-0"
          >
            lock
          </span>
          <div className="space-y-1 text-xs">
            <p className="font-bold text-[#5a3200]">Submission notice</p>
            <p className="text-[#5a413c] leading-relaxed">
              Once you submit, you will not be able to edit your application unless CEDA
              requests changes.
            </p>
          </div>
        </section>

        {/* STEP 4 DECLARATION CHECKBOX */}
        <div className="rounded-2xl border border-[#e2bfb8]/80 bg-[#fdf9f4]/60 p-4 sm:p-5 space-y-2.5">
          <div className="flex items-start gap-3">
            <input
              ref={declarationCheckboxRef}
              id="wizard-step4-declaration"
              type="checkbox"
              checked={declarationAccepted}
              onChange={(e) => onToggleDeclaration(e.target.checked)}
              aria-invalid={showDeclarationError}
              aria-describedby={
                showDeclarationError ? declarationErrorId : undefined
              }
              className="mt-0.5 w-4 h-4 rounded border-[#8d706b] text-[#a02010] focus:ring-[#f8a018] accent-[#a02010] shrink-0"
            />
            <div className="text-xs text-[#1c1c19] leading-relaxed">
              <label htmlFor="wizard-step4-declaration" className="cursor-pointer">
                {DECLARATION_SUMMARY_TEXT}{' '}
                <span className="text-[#a02010] font-bold">*</span>
              </label>{' '}
              <button
                type="button"
                onClick={() => setIsFullDeclarationOpen((prev) => !prev)}
                aria-expanded={isFullDeclarationOpen}
                aria-controls={fullDeclarationId}
                className="font-semibold text-[#a02010] hover:text-[#7c0700] underline-offset-2 hover:underline"
              >
                {isFullDeclarationOpen
                  ? 'Hide full declaration'
                  : 'Read full declaration'}
              </button>
            </div>
          </div>

          {isFullDeclarationOpen && (
            <div
              id={fullDeclarationId}
              className="ml-7 rounded-xl bg-white border border-[#e2bfb8]/60 p-3.5 text-[11px] text-[#5a413c] leading-relaxed"
            >
              {STATUTORY_DECLARATION_TEXT}
            </div>
          )}

          {showDeclarationError && (
            <p
              id={declarationErrorId}
              className="ml-7 text-[11px] font-medium text-[#ba1a1a]"
            >
              Please confirm the citizen declaration above before submitting your application.
            </p>
          )}
        </div>
      </div>

      {/* Accessible Confirmation Dialog */}
      {isConfirmDialogOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-submit-title"
          aria-describedby="confirm-submit-desc"
        >
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            onClick={() => {
              if (!isSubmitting) onCloseConfirmDialog();
            }}
          />

          <div
            ref={modalRef}
            className="relative z-10 w-full max-w-md rounded-2xl bg-white border border-[#e2bfb8] shadow-2xl p-5 sm:p-6 space-y-4"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#fbf3ef] border border-[#e2bfb8]/70 text-[#a02010] flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[22px]">send</span>
              </div>
              <div className="space-y-1">
                <h2
                  id="confirm-submit-title"
                  className="font-headline text-base sm:text-lg font-bold text-[#1c1c19]"
                >
                  Submit your application?
                </h2>
                <p
                  id="confirm-submit-desc"
                  className="text-xs sm:text-sm text-[#5a413c] leading-relaxed"
                >
                  Once you submit, you will not be able to edit your application unless
                  CEDA requests changes.
                </p>
              </div>
            </div>

            {submitErrorMessage && (
              <div
                role="alert"
                className="rounded-xl bg-[#ffdad6]/50 border border-[#ba1a1a]/35 px-3.5 py-2.5 text-xs text-[#7c0700]"
              >
                {submitErrorMessage}
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                ref={cancelButtonRef}
                type="button"
                onClick={onCloseConfirmDialog}
                disabled={isSubmitting}
                className="h-10 px-4 rounded-xl border border-[#e2bfb8] bg-white hover:bg-[#f7f3ee] text-xs font-semibold text-[#38231d] transition-colors disabled:opacity-60"
              >
                Cancel
              </button>

              <button
                ref={confirmButtonRef}
                type="button"
                onClick={onConfirmSubmit}
                disabled={isSubmitting}
                className="inline-flex items-center justify-center gap-2 h-10 px-5 rounded-xl bg-[#a02010] hover:bg-[#7c0700] text-white text-xs font-semibold transition-colors shadow-xs disabled:opacity-70 disabled:cursor-wait"
              >
                {isSubmitting && (
                  <span
                    aria-hidden="true"
                    className="w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin"
                  />
                )}
                <span>{isSubmitting ? 'Submitting...' : 'Submit'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
