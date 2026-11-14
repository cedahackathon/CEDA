/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useRef, useState } from 'react';
import {
  BUDGET_TEMPLATE_URL,
  DOCUMENT_ACCEPTED_ATTR,
  DOCUMENT_FORMAT_LABEL,
  DOCUMENT_MAX_FILES_PER_IDEA,
  DOCUMENT_MAX_FILE_SIZE_MB,
  DOCUMENT_SLOTS,
  DocumentSlotConfig,
  DocumentSlotKey,
  MANDATORY_DOCUMENT_KEYS,
} from '../../../data/documentOptions';
import {
  countAttachedIdeaFiles,
  formatDateDDMonYYYY,
  formatDocumentFileSize,
  IdeaDocumentFile,
  WizardApplicantType,
  WizardIdeaDocuments,
} from '../../../services/submitterService';

export interface ActiveDocumentUpload {
  id: string;
  slotKey: DocumentSlotKey;
  fileName: string;
  replacingFileId?: string;
}

export interface PendingDropItem {
  id: string;
  file: File;
  selectedSlot: DocumentSlotKey | '';
  error: string | null;
}

export interface Step3ValidationResult {
  isValid: boolean;
  missingMandatoryKeys: Array<'omang' | 'conceptNote' | 'budget'>;
  attachedMandatoryCount: number;
  totalMandatory: number;
}

export function validateStep3Documents(
  documents: WizardIdeaDocuments | null | undefined
): Step3ValidationResult {
  const docs = documents;
  const missingMandatoryKeys = MANDATORY_DOCUMENT_KEYS.filter(
    (key) => !docs || !docs[key]
  );
  const attachedMandatoryCount =
    MANDATORY_DOCUMENT_KEYS.length - missingMandatoryKeys.length;

  return {
    isValid: missingMandatoryKeys.length === 0,
    missingMandatoryKeys,
    attachedMandatoryCount,
    totalMandatory: MANDATORY_DOCUMENT_KEYS.length,
  };
}

function resolveFileIconName(contentType: string, fileName: string): string {
  const lower = fileName.toLowerCase();
  if (contentType === 'application/pdf' || lower.endsWith('.pdf')) {
    return 'picture_as_pdf';
  }
  if (
    contentType.startsWith('image/') ||
    lower.endsWith('.jpg') ||
    lower.endsWith('.jpeg') ||
    lower.endsWith('.png')
  ) {
    return 'image';
  }
  return 'description';
}

interface Step3DocumentsProps {
  applicantType: WizardApplicantType;
  documents: WizardIdeaDocuments;
  validation: Step3ValidationResult;
  touchedSlots: Partial<Record<DocumentSlotKey, boolean>>;
  hasAttemptedNext: boolean;
  activeUploads: ActiveDocumentUpload[];
  removingDocKeys?: Record<string, boolean>;
  slotErrors: Partial<Record<DocumentSlotKey, string>>;
  previewingKey: string | null;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  saveErrorMessage: string | null;
  liveAnnouncement: string;
  slotFocusRefs: React.MutableRefObject<Partial<Record<DocumentSlotKey, HTMLElement | null>>>;
  onSelectFileForSlot: (
    slotKey: DocumentSlotKey,
    file: File,
    replacingFileId?: string
  ) => Promise<boolean>;
  onRetrySlotFile?: (slotKey: DocumentSlotKey) => void;
  onPreviewFile: (previewId: string, file: IdeaDocumentFile) => void;
  onRemoveFile: (slotKey: DocumentSlotKey, letterIndex?: number) => void;
  onUpdateLetterNote: (index: number, note: string) => void;
  onBlurLetterNote: () => void;
  onBlurSlot: (slotKey: DocumentSlotKey) => void;
  onRetrySave: () => void;
  onAnnounce: (msg: string) => void;
}

export const Step3Documents: React.FC<Step3DocumentsProps> = ({
  applicantType,
  documents,
  validation,
  touchedSlots,
  hasAttemptedNext,
  activeUploads,
  removingDocKeys = {},
  slotErrors,
  previewingKey,
  saveStatus,
  saveErrorMessage,
  liveAnnouncement,
  slotFocusRefs,
  onSelectFileForSlot,
  onRetrySlotFile,
  onPreviewFile,
  onRemoveFile,
  onUpdateLetterNote,
  onBlurLetterNote,
  onBlurSlot,
  onRetrySave,
  onAnnounce,
}) => {
  const [isDragOverMain, setIsDragOverMain] = useState(false);
  const [pendingDropItems, setPendingDropItems] = useState<PendingDropItem[]>([]);
  const [uploadingPendingIds, setUploadingPendingIds] = useState<Record<string, boolean>>({});

  const totalAttachedFiles = useMemo(() => countAttachedIdeaFiles(documents), [documents]);
  const hasReachedMaxFiles = totalAttachedFiles >= DOCUMENT_MAX_FILES_PER_IDEA;

  const mainBrowseInputRef = useRef<HTMLInputElement | null>(null);
  const slotInputRefs = useRef<Partial<Record<DocumentSlotKey, HTMLInputElement | null>>>({});
  const replaceTargetRef = useRef<Partial<Record<DocumentSlotKey, string | undefined>>>({});

  const slotLabelByKey = useMemo(() => {
    const map: Record<DocumentSlotKey, string> = {
      omang: 'Copy of Omang or Passport',
      conceptNote: 'Concept note or pitch deck',
      budget: 'Budget estimate and financial model',
      proofOfResidence: 'Proof of residence',
      cipa: 'CIPA registration certificate',
      letters: 'Letters of support / MOUs',
    };
    DOCUMENT_SLOTS.forEach((slot) => {
      map[slot.key] = slot.title;
    });
    return map;
  }, []);

  const addDroppedFilesToPicker = (files: FileList | File[]) => {
    const list = Array.from(files);
    if (list.length === 0) return;

    const newItems: PendingDropItem[] = list.map((file, idx) => ({
      id: `pending-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 7)}`,
      file,
      selectedSlot: '',
      error: null,
    }));

    setPendingDropItems((prev) => [...prev, ...newItems]);
    onAnnounce(
      `${list.length} ${list.length === 1 ? 'file' : 'files'} added. Choose which document each file belongs to.`
    );
  };

  const handleMainDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOverMain(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addDroppedFilesToPicker(e.dataTransfer.files);
    }
  };

  const handleMainBrowseChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addDroppedFilesToPicker(e.target.files);
    }
    e.target.value = '';
  };

  const handlePendingSlotChange = (itemId: string, nextSlot: DocumentSlotKey | '') => {
    setPendingDropItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, selectedSlot: nextSlot, error: null } : item
      )
    );
  };

  const handleConfirmPendingUpload = async (item: PendingDropItem) => {
    if (!item.selectedSlot) {
      setPendingDropItems((prev) =>
        prev.map((entry) =>
          entry.id === item.id
            ? { ...entry, error: 'Select which document this file is before uploading.' }
            : entry
        )
      );
      return;
    }

    const slotKey = item.selectedSlot;
    const existingSingle = slotKey !== 'letters' ? documents[slotKey] : null;
    setUploadingPendingIds((prev) => ({ ...prev, [item.id]: true }));
    try {
      const startedOk = await onSelectFileForSlot(
        slotKey,
        item.file,
        existingSingle?.fileId
      );

      if (startedOk) {
        setPendingDropItems((prev) => prev.filter((entry) => entry.id !== item.id));
      } else {
        setPendingDropItems((prev) =>
          prev.map((entry) =>
            entry.id === item.id
              ? {
                  ...entry,
                  error: 'Could not save to that document slot. Check the message under the slot.',
                }
              : entry
          )
        );
      }
    } finally {
      setUploadingPendingIds((prev) => {
        const next = { ...prev };
        delete next[item.id];
        return next;
      });
    }
  };

  const handleDismissPendingItem = (itemId: string) => {
    setPendingDropItems((prev) => prev.filter((entry) => entry.id !== itemId));
  };

  const openSlotFileDialog = (slotKey: DocumentSlotKey, replacingFileId?: string) => {
    replaceTargetRef.current[slotKey] = replacingFileId;
    const inputEl = slotInputRefs.current[slotKey];
    if (inputEl) {
      inputEl.value = '';
      inputEl.click();
    }
  };

  const handleSlotFileInputChange = async (
    slotKey: DocumentSlotKey,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    const replacingPath = replaceTargetRef.current[slotKey];
    replaceTargetRef.current[slotKey] = undefined;
    e.target.value = '';

    if (!file) return;
    await onSelectFileForSlot(slotKey, file, replacingPath);
  };

  const focusSlot = (slotKey: DocumentSlotKey) => {
    const target = slotFocusRefs.current[slotKey];
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      target.focus();
    }
  };

  const renderBudgetTemplateNotice = () => {
    if (BUDGET_TEMPLATE_URL) {
      return (
        <a
          href={BUDGET_TEMPLATE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#a02010] hover:text-[#7c0700] hover:underline"
        >
          <span className="material-symbols-outlined text-[16px]">download</span>
          <span>Download budget template</span>
        </a>
      );
    }

    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#6b4f47]">
        <span className="material-symbols-outlined text-[15px]">schedule</span>
        <span>Template coming soon</span>
      </span>
    );
  };

  const renderSlotCard = (slot: DocumentSlotConfig) => {
    const isLetters = slot.key === 'letters';
    const singleFile: IdeaDocumentFile | null =
      slot.key !== 'letters' ? documents[slot.key] : null;
    const lettersFiles: IdeaDocumentFile[] =
      slot.key === 'letters' ? documents.letters : [];
    const slotUploads = activeUploads.filter((u) => u.slotKey === slot.key);
    const slotError = slotErrors[slot.key];
    const errorElId = `slot-error-${slot.key}`;
    const helperElId = `slot-helper-${slot.key}`;

    const isMissingRequiredError =
      slot.required &&
      !singleFile &&
      slotUploads.length === 0 &&
      Boolean(touchedSlots[slot.key] || hasAttemptedNext);

    const isCipaRecommended = slot.key === 'cipa' && applicantType === 'business';

    const isRemovingSingle = !isLetters && Boolean(removingDocKeys[slot.key]);

    const renderStatusChip = () => {
      if (slotUploads.length > 0) {
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#fbf3ef] border border-[#e2bfb8] text-[11px] font-semibold text-[#7c0700]">
            <span className="material-symbols-outlined text-[14px] animate-spin">
              progress_activity
            </span>
            <span>Uploading...</span>
          </span>
        );
      }

      if (isRemovingSingle) {
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#fbf3ef] border border-[#e2bfb8] text-[11px] font-semibold text-[#7c0700]">
            <span className="material-symbols-outlined text-[14px] animate-spin">
              progress_activity
            </span>
            <span>Removing...</span>
          </span>
        );
      }

      if (isLetters && lettersFiles.length > 0) {
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#eef6ee] border border-[#c4dfc9] text-[11px] font-semibold text-[#1f5c2e]">
            <span className="material-symbols-outlined text-[14px]">check_circle</span>
            <span>
              {lettersFiles.length} {lettersFiles.length === 1 ? 'file' : 'files'} attached
            </span>
          </span>
        );
      }

      if (!isLetters && singleFile) {
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#eef6ee] border border-[#c4dfc9] text-[11px] font-semibold text-[#1f5c2e]">
            <span className="material-symbols-outlined text-[14px]">check_circle</span>
            <span>Attached</span>
          </span>
        );
      }

      if (slot.required && isMissingRequiredError) {
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#f9e7e7] border border-[#ecc2c2] text-[11px] font-semibold text-[#9b1c1c]">
            <span className="material-symbols-outlined text-[14px]">warning</span>
            <span>Missing, action required</span>
          </span>
        );
      }

      if (slot.required) {
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#f1ede8] border border-[#d8cec6] text-[11px] font-semibold text-[#5a413c]">
            <span className="material-symbols-outlined text-[14px]">upload_file</span>
            <span>Not attached</span>
          </span>
        );
      }

      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#f7f3ee] border border-[#e2bfb8]/80 text-[11px] font-medium text-[#6b4f47]">
          <span>Optional</span>
        </span>
      );
    };

    return (
      <section
        key={slot.key}
        aria-labelledby={`slot-heading-${slot.key}`}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
            onBlurSlot(slot.key);
          }
        }}
        className="pt-4 border-t border-[#f1ede8] space-y-3 first:border-t-0 first:pt-0"
      >
        {/* Hidden real file input for this slot */}
        <input
          ref={(el) => {
            slotInputRefs.current[slot.key] = el;
          }}
          id={`slot-file-input-${slot.key}`}
          type="file"
          accept={DOCUMENT_ACCEPTED_ATTR}
          onChange={(e) => handleSlotFileInputChange(slot.key, e)}
          className="sr-only"
          aria-label={`Select file for ${slot.title}`}
        />

        {/* Slot Heading & Status Chip */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span
              aria-hidden="true"
              className="material-symbols-outlined text-[19px] text-[#7c0700] shrink-0"
            >
              {slot.icon}
            </span>
            <h3
              id={`slot-heading-${slot.key}`}
              className="text-xs sm:text-[13px] font-bold text-[#1c1c19]"
            >
              {slot.title}{' '}
              {slot.required ? (
                <>
                  <span className="text-[#a02010]" aria-hidden="true">
                    *
                  </span>
                  <span className="sr-only">(required)</span>
                </>
              ) : isCipaRecommended ? (
                <span className="text-[11px] font-semibold text-[#a02010] ml-1">
                  Recommended
                </span>
              ) : (
                <span className="text-[11px] font-normal text-[#6b4f47] ml-1">
                  (Optional)
                </span>
              )}
            </h3>
          </div>

          <div className="shrink-0">{renderStatusChip()}</div>
        </div>

        {/* Active Saves for this slot */}
        {slotUploads.map((upload) => (
          <div
            key={upload.id}
            className="rounded-xl bg-[#fdf9f4] border border-[#a02010]/35 px-4 py-3"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span
                aria-hidden="true"
                className="material-symbols-outlined text-[20px] text-[#a02010] shrink-0 animate-spin"
              >
                progress_activity
              </span>
              <div className="min-w-0">
                <p
                  className="text-xs font-semibold text-[#1c1c19] truncate"
                  title={upload.fileName}
                >
                  {upload.fileName}
                </p>
                <p className="text-[11px] font-medium text-[#7c0700]">
                  Uploading document...
                </p>
              </div>
            </div>
          </div>
        ))}

        {/* Single-File Attached State */}
        {!isLetters && singleFile && (
          <div
            ref={(el) => {
              slotFocusRefs.current[slot.key] = el;
            }}
            tabIndex={-1}
            className="rounded-xl bg-[#fdf9f4] border border-[#e2bfb8]/80 px-4 py-3 space-y-2 focus:outline-2 focus:outline-[#a02010]"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-white border border-[#e2bfb8]/80 text-[#7c0700] flex items-center justify-center shrink-0">
                  <span aria-hidden="true" className="material-symbols-outlined text-[20px]">
                    {resolveFileIconName(singleFile.contentType, singleFile.name)}
                  </span>
                </div>
                <div className="min-w-0">
                  <p
                    className="text-xs sm:text-[13px] font-bold text-[#1c1c19] truncate"
                    title={singleFile.name}
                  >
                    {singleFile.name}
                  </p>
                  <p className="text-[11px] text-[#6b4f47]">
                    {formatDocumentFileSize(singleFile.size)} • Uploaded{' '}
                    {formatDateDDMonYYYY(singleFile.uploadedAt)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs font-semibold shrink-0 self-end sm:self-center">
                <button
                  type="button"
                  disabled={previewingKey === slot.key || isRemovingSingle}
                  onClick={() => onPreviewFile(slot.key, singleFile)}
                  className="inline-flex items-center gap-1 text-[#5a413c] hover:text-[#1c1c19] transition-colors disabled:opacity-60"
                >
                  <span aria-hidden="true" className="material-symbols-outlined text-[15px]">
                    visibility
                  </span>
                  <span>{previewingKey === slot.key ? 'Opening...' : 'Preview'}</span>
                </button>

                <span aria-hidden="true" className="text-[#d6c2ba]">
                  •
                </span>

                <button
                  type="button"
                  disabled={slotUploads.length > 0 || isRemovingSingle}
                  onClick={() => openSlotFileDialog(slot.key, singleFile.fileId)}
                  className="inline-flex items-center gap-1 text-[#5a413c] hover:text-[#a02010] transition-colors disabled:opacity-50"
                >
                  <span aria-hidden="true" className="material-symbols-outlined text-[15px]">
                    swap_horiz
                  </span>
                  <span>Replace</span>
                </button>

                <span aria-hidden="true" className="text-[#d6c2ba]">
                  •
                </span>

                <button
                  type="button"
                  disabled={slotUploads.length > 0 || isRemovingSingle}
                  onClick={() => onRemoveFile(slot.key)}
                  className="inline-flex items-center gap-1 text-[#ba1a1a] hover:text-[#7c0700] transition-colors disabled:opacity-60"
                >
                  <span
                    aria-hidden="true"
                    className={`material-symbols-outlined text-[15px] ${
                      isRemovingSingle ? 'animate-spin' : ''
                    }`}
                  >
                    {isRemovingSingle ? 'progress_activity' : 'delete'}
                  </span>
                  <span>{isRemovingSingle ? 'Removing...' : 'Remove'}</span>
                </button>
              </div>
            </div>

            {slot.key === 'budget' && (
              <div className="pt-1 border-t border-[#e2bfb8]/40">
                {renderBudgetTemplateNotice()}
              </div>
            )}
          </div>
        )}

        {/* Single-File Missing State */}
        {!isLetters && !singleFile && slotUploads.length === 0 && (
          <div
            className={`rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              isMissingRequiredError
                ? 'bg-[#fdf1ef] border-[#ba1a1a]/45'
                : 'bg-[#fdf9f4] border-[#e2bfb8]/80'
            }`}
          >
            <div className="space-y-1.5 min-w-0">
              {isMissingRequiredError ? (
                <div className="flex items-start gap-2">
                  <span
                    aria-hidden="true"
                    className="material-symbols-outlined text-[18px] text-[#ba1a1a] mt-0.5 shrink-0"
                  >
                    error
                  </span>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-[#7c0700]">Required file missing</p>
                    <p id={helperElId} className="text-[11px] text-[#5a413c] leading-relaxed">
                      {slot.missingActionText}
                    </p>
                  </div>
                </div>
              ) : (
                <p id={helperElId} className="text-[11px] text-[#5a413c] leading-relaxed">
                  {slot.helperText}
                </p>
              )}

              {slot.key === 'budget' && (
                <div className={isMissingRequiredError ? 'pl-6' : ''}>
                  {renderBudgetTemplateNotice()}
                </div>
              )}
            </div>

            <button
              ref={(el) => {
                slotFocusRefs.current[slot.key] = el;
              }}
              type="button"
              onClick={() => openSlotFileDialog(slot.key)}
              aria-describedby={slotError ? `${helperElId} ${errorElId}` : helperElId}
              className={`inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-xl text-xs font-semibold transition-colors shrink-0 self-start sm:self-center ${
                isMissingRequiredError
                  ? 'bg-[#a02010] hover:bg-[#7c0700] text-white shadow-xs'
                  : 'bg-white hover:bg-[#f1ede8] text-[#1c1c19] border border-[#e2bfb8]'
              }`}
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[16px]">
                add
              </span>
              <span>{slot.uploadButtonLabel}</span>
            </button>
          </div>
        )}

        {/* Multiple-File Slot: Letters of support / MOUs */}
        {isLetters && (
          <div className="space-y-2.5">
            {lettersFiles.length === 0 && slotUploads.length === 0 && (
              <p id={helperElId} className="text-[11px] text-[#6b4f47]">
                {slot.helperText}
              </p>
            )}

            {lettersFiles.map((letter, idx) => {
              const previewId = `letters-${idx}`;
              const noteInputId = `letter-note-${idx}`;
              const isRemovingLetter = Boolean(removingDocKeys[previewId]);
              return (
                <div
                  key={`${letter.fileId}-${idx}`}
                  className="rounded-xl bg-[#fdf9f4] border border-[#e2bfb8]/80 px-4 py-3 space-y-2.5"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-white border border-[#e2bfb8]/80 text-[#7c0700] flex items-center justify-center shrink-0">
                        <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
                          {resolveFileIconName(letter.contentType, letter.name)}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p
                          className="text-xs font-bold text-[#1c1c19] truncate"
                          title={letter.name}
                        >
                          {letter.name}
                        </p>
                        <p className="text-[11px] text-[#6b4f47]">
                          {formatDocumentFileSize(letter.size)} • Uploaded{' '}
                          {formatDateDDMonYYYY(letter.uploadedAt)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-xs font-semibold shrink-0 self-end sm:self-center">
                      <button
                        type="button"
                        disabled={previewingKey === previewId || isRemovingLetter}
                        onClick={() => onPreviewFile(previewId, letter)}
                        className="inline-flex items-center gap-1 text-[#5a413c] hover:text-[#1c1c19] transition-colors disabled:opacity-60"
                      >
                        <span aria-hidden="true" className="material-symbols-outlined text-[15px]">
                          visibility
                        </span>
                        <span>{previewingKey === previewId ? 'Opening...' : 'Preview'}</span>
                      </button>
                      <span aria-hidden="true" className="text-[#d6c2ba]">
                        •
                      </span>
                      <button
                        type="button"
                        disabled={isRemovingLetter || slotUploads.length > 0}
                        onClick={() => onRemoveFile('letters', idx)}
                        className="inline-flex items-center gap-1 text-[#ba1a1a] hover:text-[#7c0700] transition-colors disabled:opacity-60"
                      >
                        <span
                          aria-hidden="true"
                          className={`material-symbols-outlined text-[15px] ${
                            isRemovingLetter ? 'animate-spin' : ''
                          }`}
                        >
                          {isRemovingLetter ? 'progress_activity' : 'delete'}
                        </span>
                        <span>{isRemovingLetter ? 'Removing...' : 'Remove'}</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label htmlFor={noteInputId} className="sr-only">
                      Description for {letter.name}
                    </label>
                    <input
                      id={noteInputId}
                      type="text"
                      maxLength={200}
                      value={letter.note || ''}
                      onChange={(e) => onUpdateLetterNote(idx, e.target.value)}
                      onBlur={onBlurLetterNote}
                      placeholder="Optional description (e.g. Off-taker agreement, land permit)"
                      className="w-full h-8 px-3 rounded-lg bg-white border border-[#e2bfb8]/80 focus:border-[#a02010] text-[11px] text-[#1c1c19] placeholder:text-[#8d706b]"
                    />
                  </div>
                </div>
              );
            })}

            {!hasReachedMaxFiles ? (
              <button
                ref={(el) => {
                  slotFocusRefs.current.letters = el;
                }}
                type="button"
                onClick={() => openSlotFileDialog('letters')}
                aria-describedby={slotError ? errorElId : undefined}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#a02010] hover:text-[#7c0700] transition-colors py-1"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
                  add_circle_outline
                </span>
                <span>
                  {lettersFiles.length === 0
                    ? 'Add a letter of support'
                    : 'Add another letter of support'}
                </span>
              </button>
            ) : (
              <p className="text-[11px] font-medium text-[#6b4f47]">
                Maximum of {DOCUMENT_MAX_FILES_PER_IDEA} files per application reached.
              </p>
            )}
          </div>
        )}

        {/* Inline Slot Validation / Operation Error */}
        {slotError && (
          <div
            id={errorElId}
            role="alert"
            className="text-[11px] font-medium text-[#ba1a1a] flex items-center gap-1.5"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[15px]">
              error_outline
            </span>
            {slotError === 'Could not save. Retry' && onRetrySlotFile ? (
              <span>
                Could not save.{' '}
                <button
                  type="button"
                  onClick={() => onRetrySlotFile(slot.key)}
                  className="font-bold underline hover:no-underline"
                >
                  Retry
                </button>
              </span>
            ) : (
              <span>{slotError}</span>
            )}
          </div>
        )}
      </section>
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-[#e2bfb8]/70 shadow-2xs p-5 sm:p-6 space-y-6">
      {/* Screen-reader live status */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {liveAnnouncement}
      </div>

      {/* Card Header */}
      <div className="flex items-start justify-between gap-4 border-b border-[#f1ede8] pb-4">
        <div>
          <h2 className="font-headline text-lg sm:text-xl font-bold text-[#1c1c19]">
            Supporting documents
          </h2>
          <p className="text-xs text-[#6b4f47] mt-0.5 leading-relaxed">
            Upload your identity document and project files. Accepted formats:{' '}
            {DOCUMENT_FORMAT_LABEL} (max {DOCUMENT_MAX_FILE_SIZE_MB} MB per file,{' '}
            {DOCUMENT_MAX_FILES_PER_IDEA} files per application).
          </p>
        </div>
      </div>

      {/* Save Error Banner */}
      {saveStatus === 'error' && saveErrorMessage && (
        <div
          role="alert"
          className="rounded-xl bg-[#ffdad6]/50 border border-[#ba1a1a]/40 px-4 py-3 flex items-center justify-between gap-3"
        >
          <div className="flex items-start gap-2.5 text-xs text-[#400200]">
            <span className="material-symbols-outlined text-[18px] text-[#ba1a1a] mt-0.5 shrink-0">
              cloud_off
            </span>
            <div>
              <p className="font-bold">Could not save your progress</p>
              <p className="mt-0.5 text-[#5a413c]">{saveErrorMessage}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onRetrySave}
            className="h-8 px-3 rounded-lg bg-[#a02010] hover:bg-[#7c0700] text-white text-xs font-semibold shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* Validation Error Summary Banner when Next fails */}
      {hasAttemptedNext && validation.missingMandatoryKeys.length > 0 && (
        <div
          role="alert"
          aria-live="assertive"
          className="rounded-xl bg-[#ffdad6]/50 border border-[#ba1a1a]/40 px-4 py-3 flex items-start gap-3"
        >
          <span className="material-symbols-outlined text-[20px] text-[#ba1a1a] mt-0.5 shrink-0">
            error
          </span>
          <div className="text-xs text-[#400200] space-y-1.5">
            <p className="font-bold">
              {validation.missingMandatoryKeys.length}{' '}
              {validation.missingMandatoryKeys.length === 1 ? 'item needs' : 'items need'} your
              attention
            </p>
            <ul className="flex flex-wrap gap-x-3 gap-y-1">
              {validation.missingMandatoryKeys.map((key) => (
                <li key={key}>
                  <button
                    type="button"
                    onClick={() => focusSlot(key)}
                    className="text-[11px] font-semibold text-[#7c0700] underline underline-offset-2 hover:text-[#400200]"
                  >
                    {slotLabelByKey[key]}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Main Drag-and-Drop Zone */}
      <div className="space-y-3">
        <div
          onDragEnter={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragOverMain(true);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!isDragOverMain) setIsDragOverMain(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
              setIsDragOverMain(false);
            }
          }}
          onDrop={handleMainDrop}
          className={`rounded-2xl border-2 border-dashed p-6 sm:p-7 text-center transition-colors ${
            isDragOverMain
              ? 'border-[#a02010] bg-[#fbf3ef]'
              : 'border-[#e2bfb8] bg-[#fdf9f4]'
          }`}
        >
          <input
            ref={mainBrowseInputRef}
            id="step3-main-file-input"
            type="file"
            multiple
            accept={DOCUMENT_ACCEPTED_ATTR}
            onChange={handleMainBrowseChange}
            className="sr-only"
          />

          <div className="w-11 h-11 rounded-full bg-white border border-[#e2bfb8]/80 text-[#a02010] flex items-center justify-center mx-auto mb-3 shadow-2xs">
            <span aria-hidden="true" className="material-symbols-outlined text-[24px]">
              cloud_upload
            </span>
          </div>

          <p className="text-xs sm:text-sm font-bold text-[#1c1c19]">
            Drag and drop documents here, or browse files
          </p>
          <p className="text-[11px] text-[#6b4f47] mt-1">
            {DOCUMENT_FORMAT_LABEL} up to {DOCUMENT_MAX_FILE_SIZE_MB} MB each. Dropped files let you
            pick which document slot they belong to, or use each slot below directly.
          </p>

          <div className="mt-4 flex justify-center">
            <button
              type="button"
              onClick={() => mainBrowseInputRef.current?.click()}
              className="inline-flex items-center justify-center gap-2 h-10 px-5 rounded-xl bg-[#a02010] hover:bg-[#7c0700] text-white text-xs font-semibold transition-colors shadow-xs"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[17px]">
                folder_open
              </span>
              <span>Browse files from device</span>
            </button>
          </div>
        </div>

        <p className="text-xs font-medium text-[#5a413c]">
          Files are limited to {DOCUMENT_MAX_FILE_SIZE_MB} MB each.
        </p>

        {/* Unassigned Pending Files Picker (never auto-assigned) */}
        {pendingDropItems.length > 0 && (
          <div className="rounded-xl bg-[#fbf3ef] border border-[#e2bfb8] p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-bold text-[#1c1c19]">
                Assign dropped files before uploading
              </p>
              <button
                type="button"
                onClick={() => setPendingDropItems([])}
                className="text-[11px] font-semibold text-[#6b4f47] hover:text-[#1c1c19]"
              >
                Clear all
              </button>
            </div>

            <ul className="space-y-2.5">
              {pendingDropItems.map((item) => {
                const selectId = `pending-slot-${item.id}`;
                return (
                  <li
                    key={item.id}
                    className="rounded-xl bg-white border border-[#e2bfb8]/80 p-3 space-y-2"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
                      <div className="min-w-0 flex-1">
                        <p
                          className="text-xs font-bold text-[#1c1c19] truncate"
                          title={item.file.name}
                        >
                          {item.file.name}
                        </p>
                        <p className="text-[11px] text-[#6b4f47]">
                          {formatDocumentFileSize(item.file.size)}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <label htmlFor={selectId} className="sr-only">
                          Which document is {item.file.name}?
                        </label>
                        <select
                          id={selectId}
                          value={item.selectedSlot}
                          onChange={(e) =>
                            handlePendingSlotChange(
                              item.id,
                              e.target.value as DocumentSlotKey | ''
                            )
                          }
                          className="h-9 px-2.5 rounded-lg bg-[#fdf9f4] border border-[#e2bfb8] focus:border-[#a02010] text-xs font-medium text-[#1c1c19]"
                        >
                          <option value="">Which document is this?</option>
                          {DOCUMENT_SLOTS.map((slot) => {
                            const hasExisting =
                              slot.key !== 'letters' && Boolean(documents[slot.key]);
                            return (
                              <option key={slot.key} value={slot.key}>
                                {slot.title}
                                {slot.required ? ' *' : ''}
                                {hasExisting ? ' (Replaces attached)' : ''}
                              </option>
                            );
                          })}
                        </select>

                        <button
                          type="button"
                          disabled={Boolean(uploadingPendingIds[item.id])}
                          onClick={() => handleConfirmPendingUpload(item)}
                          className="h-9 px-3.5 rounded-lg bg-[#a02010] hover:bg-[#7c0700] text-white text-xs font-semibold transition-colors disabled:opacity-60"
                        >
                          {uploadingPendingIds[item.id] ? 'Uploading...' : 'Upload'}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDismissPendingItem(item.id)}
                          aria-label={`Dismiss ${item.file.name}`}
                          className="w-8 h-9 rounded-lg flex items-center justify-center text-[#6b4f47] hover:text-[#ba1a1a] hover:bg-[#ffdad4]/40 transition-colors"
                        >
                          <span className="material-symbols-outlined text-[18px]">close</span>
                        </button>
                      </div>
                    </div>

                    {item.error && (
                      <p role="alert" className="text-[11px] text-[#ba1a1a] font-medium">
                        {item.error}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      {/* 6 Document Slots */}
      <div className="space-y-4">
        {DOCUMENT_SLOTS.map((slot) => renderSlotCard(slot))}
      </div>
    </div>
  );
};
