/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  DEMOGRAPHIC_TARGETS,
  IMPACT_METRICS,
  INNOVATION_SECTORS,
  INNOVATION_TYPES,
  IP_STATUS_OPTIONS,
  TRL_LEVELS,
} from '../../../data/ideaOptions';
import { InnovationType, WizardIdeaDetails } from '../../../services/submitterService';

export type Step2FieldKey =
  | 'title'
  | 'sector'
  | 'problem'
  | 'solution'
  | 'beneficiaries'
  | 'innovationType'
  | 'trl'
  | 'jobsEstimate'
  | 'impactMetric';

export const STEP2_REQUIRED_FIELD_COUNT = 9;

export const STEP2_FIELD_LABELS: Record<Step2FieldKey, string> = {
  title: 'Innovation title',
  sector: 'Primary innovation sector',
  problem: 'Problem statement',
  solution: 'Proposed solution and technology',
  beneficiaries: 'Key beneficiaries and target market',
  innovationType: 'Innovation type',
  trl: 'Technology readiness level (TRL)',
  jobsEstimate: 'Estimated jobs created within 24 months',
  impactMetric: 'Primary impact metric',
};

export interface Step2ValidationResult {
  errors: Partial<Record<Step2FieldKey, string>>;
  errorKeys: Step2FieldKey[];
  isValid: boolean;
  completedCount: number;
  totalRequired: number;
}

export function parseWholeJobsInput(rawValue: string): {
  valid: boolean;
  parsed: number | null;
} {
  const trimmed = rawValue.trim();
  if (!trimmed) return { valid: false, parsed: null };
  if (!/^\d+$/.test(trimmed)) return { valid: false, parsed: null };
  const num = Number(trimmed);
  if (!Number.isInteger(num) || num < 0 || num > 10000) {
    return { valid: false, parsed: null };
  }
  return { valid: true, parsed: num };
}

export function validateStep2Idea(
  idea: WizardIdeaDetails | null,
  jobsRawInput?: string
): Step2ValidationResult {
  const errors: Partial<Record<Step2FieldKey, string>> = {};
  if (!idea) {
    return {
      errors,
      errorKeys: [],
      isValid: false,
      completedCount: 0,
      totalRequired: STEP2_REQUIRED_FIELD_COUNT,
    };
  }

  const effectiveJobsText =
    jobsRawInput !== undefined
      ? jobsRawInput
      : idea.jobsEstimate !== null
      ? String(idea.jobsEstimate)
      : '';
  const jobsParsed = parseWholeJobsInput(effectiveJobsText);

  const checks: Array<{ key: Step2FieldKey; valid: boolean; errorMsg: string }> = [
    {
      key: 'title',
      valid: idea.title.trim().length > 0 && idea.title.length <= 120,
      errorMsg:
        idea.title.length > 120
          ? 'Innovation title must be 120 characters or fewer.'
          : 'Enter a clear innovation title.',
    },
    {
      key: 'sector',
      valid: Boolean(idea.sector.trim()),
      errorMsg: 'Select a primary innovation sector.',
    },
    {
      key: 'problem',
      valid: idea.problem.trim().length >= 50 && idea.problem.length <= 1000,
      errorMsg:
        idea.problem.length > 1000
          ? 'Problem statement must be 1,000 characters or fewer.'
          : 'Describe the problem in at least 50 characters.',
    },
    {
      key: 'solution',
      valid: idea.solution.trim().length >= 50 && idea.solution.length <= 1000,
      errorMsg:
        idea.solution.length > 1000
          ? 'Proposed solution must be 1,000 characters or fewer.'
          : 'Describe your proposed solution in at least 50 characters.',
    },
    {
      key: 'beneficiaries',
      valid: idea.beneficiaries.trim().length >= 20 && idea.beneficiaries.length <= 500,
      errorMsg:
        idea.beneficiaries.length > 500
          ? 'Key beneficiaries must be 500 characters or fewer.'
          : 'Describe key beneficiaries and target market in at least 20 characters.',
    },
    {
      key: 'innovationType',
      valid:
        idea.innovationType === 'new_to_botswana' ||
        idea.innovationType === 'incremental_upgrade' ||
        idea.innovationType === 'import_substitution',
      errorMsg: 'Select an innovation type.',
    },
    {
      key: 'trl',
      valid:
        idea.trl !== null &&
        Number.isInteger(idea.trl) &&
        idea.trl >= 1 &&
        idea.trl <= 9,
      errorMsg: 'Select the current technology readiness level (TRL 1 to 9).',
    },
    {
      key: 'jobsEstimate',
      valid: jobsParsed.valid,
      errorMsg: 'Enter a whole number of jobs between 0 and 10,000.',
    },
    {
      key: 'impactMetric',
      valid: Boolean(idea.impactMetric.trim()),
      errorMsg: 'Select a primary socio-economic impact metric.',
    },
  ];

  const errorKeys: Step2FieldKey[] = [];
  let completedCount = 0;

  for (const item of checks) {
    if (item.valid) {
      completedCount += 1;
    } else {
      errors[item.key] = item.errorMsg;
      errorKeys.push(item.key);
    }
  }

  return {
    errors,
    errorKeys,
    isValid: errorKeys.length === 0,
    completedCount,
    totalRequired: STEP2_REQUIRED_FIELD_COUNT,
  };
}

interface NarrativeTextareaProps {
  id: string;
  label: string;
  value: string;
  minLength: number;
  maxLength: number;
  helperText: string;
  placeholder: string;
  showError: boolean;
  errorMessage?: string;
  inputRef: (el: HTMLTextAreaElement | null) => void;
  onChangeValue: (val: string) => void;
  onBlurField: () => void;
}

const NarrativeTextarea: React.FC<NarrativeTextareaProps> = ({
  id,
  label,
  value,
  minLength,
  maxLength,
  helperText,
  placeholder,
  showError,
  errorMessage,
  inputRef,
  onChangeValue,
  onBlurField,
}) => {
  const localRef = useRef<HTMLTextAreaElement | null>(null);
  const [srAnnouncement, setSrAnnouncement] = useState('');
  const helperId = `${id}-helper`;
  const errorId = `${id}-error`;

  // Auto-grow height on mount, hydration, and typing
  useEffect(() => {
    const el = localRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.max(108, el.scrollHeight)}px`;
  }, [value]);

  // Throttled polite screen-reader announcement (never announces on every keystroke)
  useEffect(() => {
    const len = value.length;
    if (len === 0) {
      setSrAnnouncement('');
      return;
    }

    const delayMs = len >= maxLength ? 250 : 950;
    const timer = window.setTimeout(() => {
      if (len >= maxLength) {
        setSrAnnouncement(
          `${label}: character limit reached, ${len} of ${maxLength.toLocaleString('en-US')} characters.`
        );
      } else {
        setSrAnnouncement(
          `${label}: ${len} of ${maxLength.toLocaleString('en-US')} characters used.`
        );
      }
    }, delayMs);

    return () => window.clearTimeout(timer);
  }, [value, label, maxLength]);

  const atLimit = value.length >= maxLength;
  const describedBy = showError && errorMessage ? `${helperId} ${errorId}` : helperId;

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="block text-xs font-semibold text-[#1c1c19]">
          {label}{' '}
          <span className="text-[#a02010]" aria-hidden="true">
            *
          </span>
          <span className="sr-only"> (required, minimum {minLength} characters)</span>
        </label>
        <span
          aria-hidden="true"
          className={`text-[11px] tabular-nums ${
            atLimit ? 'text-[#ba1a1a] font-bold' : 'text-[#6b4f47] font-medium'
          }`}
        >
          {value.length.toLocaleString('en-US')} / {maxLength.toLocaleString('en-US')}
        </span>
      </div>

      <textarea
        ref={(el) => {
          localRef.current = el;
          inputRef(el);
        }}
        id={id}
        rows={4}
        maxLength={maxLength}
        value={value}
        onChange={(e) => onChangeValue(e.target.value)}
        onBlur={onBlurField}
        placeholder={placeholder}
        aria-required="true"
        aria-invalid={showError}
        aria-describedby={describedBy}
        className={`w-full px-3.5 py-2.5 rounded-lg bg-[#f1ede8]/75 focus:bg-white border text-xs sm:text-[13px] font-medium text-[#1c1c19] placeholder:text-[#8d706b] leading-relaxed resize-none overflow-hidden transition-colors ${
          showError
            ? 'border-[#ba1a1a] focus:border-[#ba1a1a]'
            : 'border-[#e2bfb8]/60 focus:border-[#a02010]'
        }`}
      />

      <p id={helperId} className="text-[11px] text-[#6b4f47]">
        {helperText}
      </p>

      {showError && errorMessage && (
        <p id={errorId} className="text-[11px] text-[#ba1a1a] font-medium">
          {errorMessage}
        </p>
      )}

      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {srAnnouncement}
      </span>
    </div>
  );
};

interface Step2IdeaDetailsProps {
  idea: WizardIdeaDetails;
  jobsRawInput: string;
  validation: Step2ValidationResult;
  touched: Partial<Record<Step2FieldKey, boolean>>;
  hasAttemptedNext: boolean;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  saveErrorMessage: string | null;
  fieldRefs: React.MutableRefObject<Partial<Record<Step2FieldKey, HTMLElement | null>>>;
  onUpdateIdea: (updater: (prev: WizardIdeaDetails) => WizardIdeaDetails) => void;
  onChangeJobsRawInput: (raw: string) => void;
  onBlurField: (key?: Step2FieldKey) => void;
  onRetrySave: () => void;
}

export const Step2IdeaDetails: React.FC<Step2IdeaDetailsProps> = ({
  idea,
  jobsRawInput,
  validation,
  touched,
  hasAttemptedNext,
  saveStatus,
  saveErrorMessage,
  fieldRefs,
  onUpdateIdea,
  onChangeJobsRawInput,
  onBlurField,
  onRetrySave,
}) => {
  const [isTrlPopoverOpen, setIsTrlPopoverOpen] = useState(false);
  const trlPopoverContainerRef = useRef<HTMLDivElement>(null);
  const trlTriggerRef = useRef<HTMLButtonElement>(null);
  const trlPopoverId = useId();

  const shouldShowError = (key: Step2FieldKey): boolean => {
    return Boolean((touched[key] || hasAttemptedNext) && validation.errors[key]);
  };

  const selectedSectorObj = useMemo(
    () => INNOVATION_SECTORS.find((s) => s.label === idea.sector) || null,
    [idea.sector]
  );

  // Close TRL popover on Escape or outside click
  useEffect(() => {
    if (!isTrlPopoverOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsTrlPopoverOpen(false);
        trlTriggerRef.current?.focus();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (
        trlPopoverContainerRef.current &&
        !trlPopoverContainerRef.current.contains(e.target as Node)
      ) {
        setIsTrlPopoverOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isTrlPopoverOpen]);

  const handleSectorChange = (nextSector: string) => {
    onUpdateIdea((prev) => ({
      ...prev,
      sector: nextSector,
      subSector: '',
    }));
  };

  const handleInnovationTypeSelect = (value: InnovationType) => {
    onUpdateIdea((prev) => ({
      ...prev,
      innovationType: value,
    }));
  };

  const handleDemographicToggle = (id: string) => {
    onUpdateIdea((prev) => {
      const exists = prev.demographics.includes(id);
      return {
        ...prev,
        demographics: exists
          ? prev.demographics.filter((item) => item !== id)
          : [...prev.demographics, id],
      };
    });
  };

  const focusInvalidField = (key: Step2FieldKey) => {
    const el = fieldRefs.current[key];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.focus();
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-[#e2bfb8]/70 shadow-2xs p-5 sm:p-6 space-y-6">
      {/* Card Header */}
      <div className="flex items-start justify-between gap-4 border-b border-[#f1ede8] pb-4">
        <div>
          <h2 className="font-headline text-lg sm:text-xl font-bold text-[#1c1c19]">
            Idea details
          </h2>
          <p className="text-xs text-[#6b4f47] mt-0.5">
            Describe your innovation, the local problem it addresses, and its expected impact.
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

      {/* Error Summary Banner when Next fails */}
      {hasAttemptedNext && validation.errorKeys.length > 0 && (
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
              {validation.errorKeys.length}{' '}
              {validation.errorKeys.length === 1 ? 'field needs' : 'fields need'} your attention
            </p>
            <ul className="flex flex-wrap gap-x-3 gap-y-1">
              {validation.errorKeys.map((key) => (
                <li key={key}>
                  <button
                    type="button"
                    onClick={() => focusInvalidField(key)}
                    className="text-[11px] font-semibold text-[#7c0700] underline underline-offset-2 hover:text-[#400200]"
                  >
                    {STEP2_FIELD_LABELS[key]}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* 1. Title and industry sector */}
      <section aria-labelledby="section-title-sector" className="space-y-4">
        <h3
          id="section-title-sector"
          className="text-xs sm:text-[13px] font-bold text-[#1c1c19]"
        >
          1. Title and industry sector
        </h3>

        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between gap-2">
            <label htmlFor="idea-title" className="block text-xs font-semibold text-[#1c1c19]">
              Innovation title{' '}
              <span className="text-[#a02010]" aria-hidden="true">
                *
              </span>
              <span className="sr-only"> (required, max 120 characters)</span>
            </label>
            <span
              aria-hidden="true"
              className={`text-[11px] tabular-nums ${
                idea.title.length >= 120 ? 'text-[#ba1a1a] font-bold' : 'text-[#6b4f47]'
              }`}
            >
              {idea.title.length} / 120
            </span>
          </div>
          <input
            ref={(el) => {
              fieldRefs.current.title = el;
            }}
            id="idea-title"
            type="text"
            maxLength={120}
            value={idea.title}
            onChange={(e) =>
              onUpdateIdea((prev) => ({
                ...prev,
                title: e.target.value,
              }))
            }
            onBlur={() => onBlurField('title')}
            placeholder="e.g. Solar cold-storage hubs for horticulture cooperatives"
            aria-required="true"
            aria-invalid={shouldShowError('title')}
            aria-describedby={
              shouldShowError('title') ? 'idea-title-helper idea-title-error' : 'idea-title-helper'
            }
            className={`w-full h-10 px-3.5 rounded-lg bg-[#f1ede8]/75 focus:bg-white border text-xs sm:text-[13px] font-medium text-[#1c1c19] placeholder:text-[#8d706b] transition-colors ${
              shouldShowError('title')
                ? 'border-[#ba1a1a]'
                : 'border-[#e2bfb8]/60 focus:border-[#a02010]'
            }`}
          />
          <p id="idea-title-helper" className="text-[11px] text-[#6b4f47]">
            Give your concept a clear, descriptive commercial title.
          </p>
          {shouldShowError('title') && (
            <p id="idea-title-error" className="text-[11px] text-[#ba1a1a] font-medium">
              {validation.errors.title}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="idea-sector" className="block text-xs font-semibold text-[#1c1c19] mb-1">
              Primary innovation sector{' '}
              <span className="text-[#a02010]" aria-hidden="true">
                *
              </span>
              <span className="sr-only"> (required)</span>
            </label>
            <select
              ref={(el) => {
                fieldRefs.current.sector = el;
              }}
              id="idea-sector"
              value={idea.sector}
              onChange={(e) => handleSectorChange(e.target.value)}
              onBlur={() => onBlurField('sector')}
              aria-required="true"
              aria-invalid={shouldShowError('sector')}
              aria-describedby={shouldShowError('sector') ? 'idea-sector-error' : undefined}
              className={`w-full h-10 px-3 rounded-lg bg-[#f1ede8]/75 focus:bg-white border text-xs sm:text-[13px] font-medium text-[#1c1c19] ${
                shouldShowError('sector')
                  ? 'border-[#ba1a1a]'
                  : 'border-[#e2bfb8]/60 focus:border-[#a02010]'
              }`}
            >
              <option value="">Select primary sector</option>
              {INNOVATION_SECTORS.map((sector) => (
                <option key={sector.id} value={sector.label}>
                  {sector.label}
                </option>
              ))}
            </select>
            {shouldShowError('sector') && (
              <p id="idea-sector-error" className="text-[11px] text-[#ba1a1a] mt-1 font-medium">
                {validation.errors.sector}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="idea-subsector"
              className="block text-xs font-semibold text-[#1c1c19] mb-1"
            >
              Sub-sector or focus area <span className="text-[#6b4f47] font-normal">(optional)</span>
            </label>
            <select
              id="idea-subsector"
              value={idea.subSector}
              disabled={!selectedSectorObj}
              onChange={(e) =>
                onUpdateIdea((prev) => ({
                  ...prev,
                  subSector: e.target.value,
                }))
              }
              onBlur={() => onBlurField()}
              className="w-full h-10 px-3 rounded-lg bg-[#f1ede8]/75 focus:bg-white border border-[#e2bfb8]/60 focus:border-[#a02010] text-xs sm:text-[13px] font-medium text-[#1c1c19] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <option value="">
                {selectedSectorObj ? 'Select focus area (optional)' : 'Select a sector first'}
              </option>
              {selectedSectorObj?.subSectors.map((sub) => (
                <option key={sub} value={sub}>
                  {sub}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* 2. Problem and solution narrative */}
      <section
        aria-labelledby="section-narrative"
        className="space-y-4 pt-4 border-t border-[#f1ede8]"
      >
        <h3 id="section-narrative" className="text-xs sm:text-[13px] font-bold text-[#1c1c19]">
          2. Problem and solution narrative
        </h3>

        <NarrativeTextarea
          id="idea-problem"
          label="Problem statement"
          value={idea.problem}
          minLength={50}
          maxLength={1000}
          helperText="Minimum 50 characters. Explain the specific problem or unmet need you are solving."
          placeholder="Outline who faces the challenge today, how widespread it is, and why current options fall short..."
          showError={shouldShowError('problem')}
          errorMessage={validation.errors.problem}
          inputRef={(el) => {
            fieldRefs.current.problem = el;
          }}
          onChangeValue={(val) =>
            onUpdateIdea((prev) => ({
              ...prev,
              problem: val,
            }))
          }
          onBlurField={() => onBlurField('problem')}
        />

        <NarrativeTextarea
          id="idea-solution"
          label="Proposed solution and technology"
          value={idea.solution}
          minLength={50}
          maxLength={1000}
          helperText="Minimum 50 characters. Describe how your solution works and how it will be delivered."
          placeholder="Explain the core product, service, or technical process, and what makes it viable locally..."
          showError={shouldShowError('solution')}
          errorMessage={validation.errors.solution}
          inputRef={(el) => {
            fieldRefs.current.solution = el;
          }}
          onChangeValue={(val) =>
            onUpdateIdea((prev) => ({
              ...prev,
              solution: val,
            }))
          }
          onBlurField={() => onBlurField('solution')}
        />

        <NarrativeTextarea
          id="idea-beneficiaries"
          label="Key beneficiaries and target market"
          value={idea.beneficiaries}
          minLength={20}
          maxLength={500}
          helperText="Minimum 20 characters. Identify your primary customers, end-users, or communities."
          placeholder="Specify target customer segments, districts served, and expected adoption..."
          showError={shouldShowError('beneficiaries')}
          errorMessage={validation.errors.beneficiaries}
          inputRef={(el) => {
            fieldRefs.current.beneficiaries = el;
          }}
          onChangeValue={(val) =>
            onUpdateIdea((prev) => ({
              ...prev,
              beneficiaries: val,
            }))
          }
          onBlurField={() => onBlurField('beneficiaries')}
        />
      </section>

      {/* 3. Innovation profile and readiness */}
      <section
        aria-labelledby="section-profile-readiness"
        className="space-y-4 pt-4 border-t border-[#f1ede8]"
      >
        <h3
          id="section-profile-readiness"
          className="text-xs sm:text-[13px] font-bold text-[#1c1c19]"
        >
          3. Innovation profile and readiness
        </h3>

        <fieldset
          aria-invalid={shouldShowError('innovationType')}
          aria-describedby={shouldShowError('innovationType') ? 'idea-type-error' : undefined}
          className="space-y-2"
        >
          <legend className="block text-xs font-semibold text-[#1c1c19]">
            Innovation type{' '}
            <span className="text-[#a02010]" aria-hidden="true">
              *
            </span>
            <span className="sr-only"> (required)</span>
          </legend>

          <div role="radiogroup" className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {INNOVATION_TYPES.map((opt, idx) => {
              const selected = idea.innovationType === opt.value;
              const optionId = `innovation-type-${opt.value}`;
              return (
                <label
                  key={opt.value}
                  htmlFor={optionId}
                  className={`relative flex flex-col justify-between gap-2 p-3.5 rounded-xl border cursor-pointer transition-all focus-within:ring-2 focus-within:ring-[#a02010] focus-within:ring-offset-1 ${
                    selected
                      ? 'bg-[#fbf3ef] border-[#a02010] ring-1 ring-[#a02010] shadow-2xs'
                      : 'bg-[#fdf9f4] border-[#e2bfb8]/80 hover:border-[#a02010]/50'
                  }`}
                >
                  <input
                    ref={
                      idx === 0
                        ? (el) => {
                            fieldRefs.current.innovationType = el;
                          }
                        : undefined
                    }
                    id={optionId}
                    type="radio"
                    name="step2-innovation-type"
                    value={opt.value}
                    checked={selected}
                    onChange={() => handleInnovationTypeSelect(opt.value)}
                    onBlur={() => onBlurField('innovationType')}
                    className="sr-only"
                  />

                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-bold text-[#1c1c19] leading-snug">
                      {opt.label}
                    </span>
                    <span
                      aria-hidden="true"
                      className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                        selected
                          ? 'bg-[#a02010] text-white'
                          : 'border border-[#8d706b] bg-white'
                      }`}
                    >
                      {selected && (
                        <span className="material-symbols-outlined text-[12px]">check</span>
                      )}
                    </span>
                  </div>

                  <p className="text-[11px] text-[#5a413c] leading-relaxed">{opt.description}</p>

                  {selected && (
                    <span className="inline-flex items-center gap-1 self-start text-[10px] font-bold uppercase tracking-wider text-[#7c0700]">
                      <span className="material-symbols-outlined text-[13px]">task_alt</span>
                      <span>Selected</span>
                    </span>
                  )}
                </label>
              );
            })}
          </div>

          {shouldShowError('innovationType') && (
            <p id="idea-type-error" className="text-[11px] text-[#ba1a1a] font-medium">
              {validation.errors.innovationType}
            </p>
          )}
        </fieldset>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div ref={trlPopoverContainerRef} className="relative">
            <div className="flex items-center justify-between gap-2 mb-1">
              <label htmlFor="idea-trl" className="block text-xs font-semibold text-[#1c1c19]">
                Technology readiness level (TRL){' '}
                <span className="text-[#a02010]" aria-hidden="true">
                  *
                </span>
                <span className="sr-only"> (required)</span>
              </label>

              <button
                ref={trlTriggerRef}
                type="button"
                onClick={() => setIsTrlPopoverOpen((prev) => !prev)}
                aria-expanded={isTrlPopoverOpen}
                aria-controls={trlPopoverId}
                aria-label="Explain technology readiness levels 1 to 9"
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#a02010] hover:text-[#7c0700] rounded px-1 py-0.5 focus-visible:outline-2 focus-visible:outline-[#a02010]"
              >
                <span className="material-symbols-outlined text-[16px]">info</span>
                <span>TRL guide</span>
              </button>
            </div>

            <select
              ref={(el) => {
                fieldRefs.current.trl = el;
              }}
              id="idea-trl"
              value={idea.trl !== null ? String(idea.trl) : ''}
              onChange={(e) => {
                const raw = e.target.value;
                onUpdateIdea((prev) => ({
                  ...prev,
                  trl: raw ? Number(raw) : null,
                }));
              }}
              onBlur={() => onBlurField('trl')}
              aria-required="true"
              aria-invalid={shouldShowError('trl')}
              aria-describedby={shouldShowError('trl') ? 'idea-trl-error' : undefined}
              className={`w-full h-10 px-3 rounded-lg bg-[#f1ede8]/75 focus:bg-white border text-xs sm:text-[13px] font-medium text-[#1c1c19] ${
                shouldShowError('trl')
                  ? 'border-[#ba1a1a]'
                  : 'border-[#e2bfb8]/60 focus:border-[#a02010]'
              }`}
            >
              <option value="">Select readiness level</option>
              {TRL_LEVELS.map((item) => (
                <option key={item.level} value={String(item.level)}>
                  {item.label}
                </option>
              ))}
            </select>

            {shouldShowError('trl') && (
              <p id="idea-trl-error" className="text-[11px] text-[#ba1a1a] mt-1 font-medium">
                {validation.errors.trl}
              </p>
            )}

            {isTrlPopoverOpen && (
              <div
                id={trlPopoverId}
                role="dialog"
                aria-label="Technology Readiness Level guide"
                className="absolute left-0 right-0 sm:w-[380px] top-full mt-2 z-30 bg-white rounded-xl border border-[#e2bfb8] shadow-xl p-4 space-y-2.5 max-h-72 overflow-y-auto"
              >
                <div className="flex items-center justify-between gap-2 border-b border-[#f1ede8] pb-2">
                  <span className="text-xs font-bold text-[#1c1c19]">
                    Technology Readiness Levels (TRL 1–9)
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsTrlPopoverOpen(false);
                      trlTriggerRef.current?.focus();
                    }}
                    aria-label="Close TRL guide"
                    className="w-6 h-6 rounded flex items-center justify-center text-[#5a413c] hover:bg-[#f1ede8]"
                  >
                    <span className="material-symbols-outlined text-[16px]">close</span>
                  </button>
                </div>
                <dl className="space-y-2 text-[11px]">
                  {TRL_LEVELS.map((item) => (
                    <div key={item.level} className="leading-snug">
                      <dt className="font-bold text-[#1c1c19]">{item.label}</dt>
                      <dd className="text-[#5a413c]">{item.summary}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </div>

          <div>
            <label htmlFor="idea-ip-status" className="block text-xs font-semibold text-[#1c1c19] mb-1">
              Intellectual property status{' '}
              <span className="text-[#6b4f47] font-normal">(optional)</span>
            </label>
            <select
              id="idea-ip-status"
              value={idea.ipStatus}
              onChange={(e) =>
                onUpdateIdea((prev) => ({
                  ...prev,
                  ipStatus: e.target.value,
                }))
              }
              onBlur={() => onBlurField()}
              className="w-full h-10 px-3 rounded-lg bg-[#f1ede8]/75 focus:bg-white border border-[#e2bfb8]/60 focus:border-[#a02010] text-xs sm:text-[13px] font-medium text-[#1c1c19]"
            >
              <option value="">Select IP status (optional)</option>
              {IP_STATUS_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* 4. Anticipated socio-economic impact */}
      <section
        aria-labelledby="section-impact"
        className="space-y-4 pt-4 border-t border-[#f1ede8]"
      >
        <h3 id="section-impact" className="text-xs sm:text-[13px] font-bold text-[#1c1c19]">
          4. Anticipated socio-economic impact
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="idea-jobs" className="block text-xs font-semibold text-[#1c1c19] mb-1">
              Estimated jobs created within 24 months{' '}
              <span className="text-[#a02010]" aria-hidden="true">
                *
              </span>
              <span className="sr-only"> (required, whole number between 0 and 10,000)</span>
            </label>
            <div className="relative flex items-center">
              <input
                ref={(el) => {
                  fieldRefs.current.jobsEstimate = el;
                }}
                id="idea-jobs"
                type="text"
                inputMode="numeric"
                value={jobsRawInput}
                onChange={(e) => onChangeJobsRawInput(e.target.value)}
                onBlur={() => onBlurField('jobsEstimate')}
                placeholder="e.g. 12"
                aria-required="true"
                aria-invalid={shouldShowError('jobsEstimate')}
                aria-describedby={
                  shouldShowError('jobsEstimate')
                    ? 'idea-jobs-helper idea-jobs-error'
                    : 'idea-jobs-helper'
                }
                className={`w-full h-10 pl-3.5 pr-14 rounded-lg bg-[#f1ede8]/75 focus:bg-white border text-xs sm:text-[13px] font-medium text-[#1c1c19] tabular-nums transition-colors ${
                  shouldShowError('jobsEstimate')
                    ? 'border-[#ba1a1a]'
                    : 'border-[#e2bfb8]/60 focus:border-[#a02010]'
                }`}
              />
              <span
                aria-hidden="true"
                className="absolute right-3 text-[11px] font-semibold text-[#6b4f47] pointer-events-none"
              >
                jobs
              </span>
            </div>
            <p id="idea-jobs-helper" className="text-[11px] text-[#6b4f47] mt-1">
              Combined direct and indirect local hires across operations.
            </p>
            {shouldShowError('jobsEstimate') && (
              <p id="idea-jobs-error" className="text-[11px] text-[#ba1a1a] mt-1 font-medium">
                {validation.errors.jobsEstimate}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="idea-impact-metric"
              className="block text-xs font-semibold text-[#1c1c19] mb-1"
            >
              Primary impact metric{' '}
              <span className="text-[#a02010]" aria-hidden="true">
                *
              </span>
              <span className="sr-only"> (required)</span>
            </label>
            <select
              ref={(el) => {
                fieldRefs.current.impactMetric = el;
              }}
              id="idea-impact-metric"
              value={idea.impactMetric}
              onChange={(e) =>
                onUpdateIdea((prev) => ({
                  ...prev,
                  impactMetric: e.target.value,
                }))
              }
              onBlur={() => onBlurField('impactMetric')}
              aria-required="true"
              aria-invalid={shouldShowError('impactMetric')}
              aria-describedby={
                shouldShowError('impactMetric') ? 'idea-impact-metric-error' : undefined
              }
              className={`w-full h-10 px-3 rounded-lg bg-[#f1ede8]/75 focus:bg-white border text-xs sm:text-[13px] font-medium text-[#1c1c19] ${
                shouldShowError('impactMetric')
                  ? 'border-[#ba1a1a]'
                  : 'border-[#e2bfb8]/60 focus:border-[#a02010]'
              }`}
            >
              <option value="">Select primary metric</option>
              {IMPACT_METRICS.map((metric) => (
                <option key={metric} value={metric}>
                  {metric}
                </option>
              ))}
            </select>
            {shouldShowError('impactMetric') && (
              <p
                id="idea-impact-metric-error"
                className="text-[11px] text-[#ba1a1a] mt-1 font-medium"
              >
                {validation.errors.impactMetric}
              </p>
            )}
          </div>
        </div>

        <fieldset className="space-y-2 pt-1">
          <legend className="block text-xs font-semibold text-[#1c1c19]">
            Priority demographic target{' '}
            <span className="text-[#6b4f47] font-normal">(optional)</span>
          </legend>
          <div className="flex flex-wrap gap-3">
            {DEMOGRAPHIC_TARGETS.map((target) => {
              const checked = idea.demographics.includes(target.id);
              const checkboxId = `idea-demo-${target.id}`;
              return (
                <label
                  key={target.id}
                  htmlFor={checkboxId}
                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium cursor-pointer transition-colors ${
                    checked
                      ? 'bg-[#fbf3ef] border-[#a02010] text-[#1c1c19]'
                      : 'bg-[#fdf9f4] border-[#e2bfb8]/80 text-[#5a413c] hover:border-[#a02010]/50'
                  }`}
                >
                  <input
                    id={checkboxId}
                    type="checkbox"
                    checked={checked}
                    onChange={() => handleDemographicToggle(target.id)}
                    onBlur={() => onBlurField()}
                    className="w-4 h-4 rounded border-[#8d706b] text-[#a02010] focus:ring-[#f8a018] accent-[#a02010]"
                  />
                  <span>{target.label}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
      </section>
    </div>
  );
};
