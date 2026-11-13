/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { BOTSWANA_DISTRICTS } from '../../../config/districts';
import {
  GENDER_OPTIONS,
  isLiveChatAvailableNow,
  STATUTORY_DECLARATION_TEXT,
  SUBMITTER_SUPPORT_CONFIG,
  SUBMITTER_WIZARD_STEPS,
  SUBMITTER_WRITING_TIP,
} from '../../../data/submitterMock';
import { SubmitterLayout } from '../../submitter/SubmitterLayout';
import {
  createEmptyIdeaDetails,
  findExistingIdeaDraft,
  findOrCreateIdeaDraft,
  formatBotswanaPhoneDisplay,
  formatLongDateBotswana,
  formatRelativeSavedTime,
  hasVerifiedIdentityProfile,
  IdeaDraft,
  isStep1ApplicantValid,
  isValidBotswanaMobile,
  isValidOmangDigits,
  loadUserProfileForWizard,
  maskOmangLast3,
  normalizeBotswanaPhoneInput,
  ProfileIdentityUpdate,
  saveIdeaDraft,
  saveIdeaStep2,
  WizardApplicantDetails,
  WizardApplicantType,
  WizardIdeaDetails,
  WizardTeamMember,
} from '../../../services/submitterService';
import { UserProfile } from '../../../types/auth';
import {
  parseWholeJobsInput,
  Step2FieldKey,
  Step2IdeaDetails,
  validateStep2Idea,
} from './Step2IdeaDetails';

interface SubmitIdeaWizardProps {
  routePath: string;
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

type FieldKey =
  | 'firstName'
  | 'surname'
  | 'omang'
  | 'dateOfBirth'
  | 'email'
  | 'phone'
  | 'district'
  | 'town'
  | 'address'
  | 'tradingName'
  | 'cipaNumber'
  | 'tin'
  | 'declarationAccepted';

function isValidEmail(val: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());
}

function isValidCipaNumber(val: string): boolean {
  const clean = val.trim();
  return /^[A-Za-z0-9][A-Za-z0-9/-]{4,24}$/.test(clean);
}

function isValidTin(val: string): boolean {
  const clean = val.trim();
  return /^[A-Za-z0-9][A-Za-z0-9-]{5,19}$/.test(clean);
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return (name.trim().slice(0, 2) || 'TM').toUpperCase();
}

function resolveStepFromPath(cleanPath: string): number {
  if (cleanPath === '/submit/idea') return 2;
  if (cleanPath === '/submit/documents') return 3;
  if (cleanPath === '/submit/review') return 4;
  return 1;
}

export const SubmitIdeaWizard: React.FC<SubmitIdeaWizardProps> = ({ routePath }) => {
  const { currentUser, setCurrentRoute } = useAuth();
  const cleanPath = routePath.split('?')[0];
  const activeStep = resolveStepFromPath(cleanPath);

  const activeUid = currentUser?.id || '';

  const [profile, setProfile] = useState<UserProfile | null>(currentUser);
  const [draft, setDraft] = useState<IdeaDraft | null>(null);
  const [applicant, setApplicant] = useState<WizardApplicantDetails | null>(null);
  const [rawOmangInput, setRawOmangInput] = useState('');
  const [idea, setIdea] = useState<WizardIdeaDetails | null>(null);
  const [jobsRawInput, setJobsRawInput] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Dirty / autosave tracking
  const [isDirty, setIsDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);
  const [isAdvancingStep, setIsAdvancingStep] = useState(false);
  const [isBackingStep, setIsBackingStep] = useState(false);
  const [lastSavedAtMs, setLastSavedAtMs] = useState<number | null>(null);
  const [nowTickMs, setNowTickMs] = useState<number>(() => Date.now());

  // UI toggles
  const [isBusinessAccordionOpen, setIsBusinessAccordionOpen] = useState(false);
  const [isDeclarationExpanded, setIsDeclarationExpanded] = useState(false);
  const [touched, setTouched] = useState<Partial<Record<FieldKey, boolean>>>({});
  const [hasAttemptedNext, setHasAttemptedNext] = useState(false);
  const [touchedStep2, setTouchedStep2] = useState<Partial<Record<Step2FieldKey, boolean>>>({});
  const [hasAttemptedNextStep2, setHasAttemptedNextStep2] = useState(false);
  const [nextButtonTooltipVisible, setNextButtonTooltipVisible] = useState(false);

  // Team inline add row
  const [isAddingTeamMember, setIsAddingTeamMember] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('');
  const [newMemberPhone, setNewMemberPhone] = useState('');
  const [teamRowError, setTeamRowError] = useState<string | null>(null);

  // Live chat hours check
  const [liveChatAvailable, setLiveChatAvailable] = useState<boolean>(() =>
    isLiveChatAvailableNow()
  );

  // Refs for debounced autosave, serialized saves, and focusing first error
  const blurSaveTimerRef = useRef<number | null>(null);
  const inFlightSavePromiseRef = useRef<Promise<boolean> | null>(null);
  const fieldRefs = useRef<Partial<Record<FieldKey, HTMLElement | null>>>({});
  const step2FieldRefs = useRef<Partial<Record<Step2FieldKey, HTMLElement | null>>>({});

  const hasVerifiedIdentity = useMemo(
    () => hasVerifiedIdentityProfile(profile),
    [profile]
  );

  const loadWizardData = useCallback(async () => {
    if (!activeUid) {
      setIsLoading(false);
      setLoadError('You must be signed in as a submitter to start an application.');
      return;
    }

    setIsLoading(true);
    setLoadError(null);
    try {
      const loadedProfile = await loadUserProfileForWizard(activeUid, currentUser);
      const loadedDraft =
        activeStep === 1
          ? await findOrCreateIdeaDraft(activeUid, loadedProfile)
          : await findExistingIdeaDraft(activeUid, loadedProfile);

      if (activeStep >= 2) {
        if (
          !loadedDraft ||
          !isStep1ApplicantValid(loadedDraft.applicant, loadedProfile)
        ) {
          setCurrentRoute('/submit/applicant');
          return;
        }
      }

      if (!loadedDraft) {
        setLoadError('Unable to locate your application draft.');
        return;
      }

      const hydratedIdea = loadedDraft.idea ?? createEmptyIdeaDetails();

      setProfile(loadedProfile);
      setDraft(loadedDraft);
      setApplicant(loadedDraft.applicant);
      setRawOmangInput(
        hasVerifiedIdentityProfile(loadedProfile) ? '' : loadedProfile?.omangOrPassport || ''
      );
      setIdea(hydratedIdea);
      setJobsRawInput(
        hydratedIdea.jobsEstimate !== null ? String(hydratedIdea.jobsEstimate) : ''
      );
      setIsBusinessAccordionOpen(loadedDraft.applicant.type === 'business');
      setTouched({});
      setHasAttemptedNext(false);
      setTouchedStep2({});
      setHasAttemptedNextStep2(false);

      const updatedMs = new Date(loadedDraft.updatedAt).getTime();
      setLastSavedAtMs(!Number.isNaN(updatedMs) ? updatedMs : Date.now());
      setSaveStatus('saved');
      setIsDirty(false);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unable to load your draft application.';
      setLoadError(message);
    } finally {
      setIsLoading(false);
    }
  }, [activeStep, activeUid, currentUser, setCurrentRoute]);

  useEffect(() => {
    loadWizardData();
  }, [loadWizardData]);

  // Update relative time label & live chat availability every 15s / 60s
  useEffect(() => {
    const relativeTimer = window.setInterval(() => setNowTickMs(Date.now()), 15_000);
    const chatTimer = window.setInterval(
      () => setLiveChatAvailable(isLiveChatAvailableNow()),
      60_000
    );
    return () => {
      window.clearInterval(relativeTimer);
      window.clearInterval(chatTimer);
    };
  }, []);

  // Warn on browser tab close / reload when unsaved changes exist
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // Validation computation
  const validation = useMemo(() => {
    const errors: Partial<Record<FieldKey, string>> = {};
    if (!applicant) {
      return { errors, errorKeys: [] as FieldKey[], isValid: false, completedCount: 0, totalRequired: 1 };
    }

    const requiredStatus: Array<{ key: FieldKey; valid: boolean; errorMsg: string }> = [];

    if (!hasVerifiedIdentity) {
      requiredStatus.push({
        key: 'firstName',
        valid: applicant.firstName.trim().length >= 2,
        errorMsg: 'Enter your first name (at least 2 characters).',
      });
      requiredStatus.push({
        key: 'surname',
        valid: applicant.surname.trim().length >= 2,
        errorMsg: 'Enter your surname (at least 2 characters).',
      });
      requiredStatus.push({
        key: 'omang',
        valid: isValidOmangDigits(rawOmangInput),
        errorMsg: 'Enter a valid 9-digit Botswana Omang number.',
      });
      const dobVal = applicant.dateOfBirth.trim();
      const dobMs = dobVal ? new Date(dobVal).getTime() : NaN;
      const isValidDob = Boolean(dobVal) && !Number.isNaN(dobMs) && dobMs < Date.now();
      requiredStatus.push({
        key: 'dateOfBirth',
        valid: isValidDob,
        errorMsg: 'Select a valid date of birth.',
      });
    }

    requiredStatus.push({
      key: 'email',
      valid: isValidEmail(applicant.email),
      errorMsg: 'Enter a valid email address.',
    });
    requiredStatus.push({
      key: 'phone',
      valid: isValidBotswanaMobile(applicant.phone),
      errorMsg: 'Enter an 8-digit Botswana mobile number starting with 7.',
    });
    requiredStatus.push({
      key: 'district',
      valid: Boolean(applicant.district.trim()),
      errorMsg: 'Select your district.',
    });
    requiredStatus.push({
      key: 'town',
      valid: applicant.town.trim().length >= 2,
      errorMsg: 'Enter your town or village.',
    });
    requiredStatus.push({
      key: 'address',
      valid: applicant.address.trim().length >= 5,
      errorMsg: 'Enter your postal or physical address.',
    });

    if (applicant.type === 'business') {
      requiredStatus.push({
        key: 'tradingName',
        valid: applicant.business.tradingName.trim().length >= 2,
        errorMsg: 'Enter the registered business or group trading name.',
      });
      requiredStatus.push({
        key: 'cipaNumber',
        valid: isValidCipaNumber(applicant.business.cipaNumber),
        errorMsg: 'Enter a valid alphanumeric CIPA registration number (5–25 characters).',
      });
      requiredStatus.push({
        key: 'tin',
        valid: isValidTin(applicant.business.tin),
        errorMsg: 'Enter a valid alphanumeric BURS TIN (6–20 characters).',
      });
    }

    requiredStatus.push({
      key: 'declarationAccepted',
      valid: applicant.declarationAccepted,
      errorMsg: 'You must accept the citizen ownership declaration to continue.',
    });

    const errorKeys: FieldKey[] = [];
    let completedCount = 0;

    for (const item of requiredStatus) {
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
      totalRequired: requiredStatus.length,
    };
  }, [applicant, hasVerifiedIdentity, rawOmangInput]);

  const step2Validation = useMemo(
    () => validateStep2Idea(idea, jobsRawInput),
    [idea, jobsRawInput]
  );

  const step1ValidForAside = useMemo(
    () => isStep1ApplicantValid(applicant, profile) || validation.isValid,
    [applicant, profile, validation.isValid]
  );

  const progressPercentage = useMemo(() => {
    const activeVal = activeStep === 2 ? step2Validation : validation;
    if (activeVal.totalRequired === 0) return 0;
    return Math.round((activeVal.completedCount / activeVal.totalRequired) * 100);
  }, [activeStep, step2Validation, validation]);

  const performSave = useCallback(
    async (targetStepOverride?: number): Promise<boolean> => {
      if (!draft) return false;
      if (activeStep === 1 && !applicant) return false;
      if (activeStep === 2 && !idea) return false;
      if (activeStep > 2) return true;

      if (blurSaveTimerRef.current) {
        window.clearTimeout(blurSaveTimerRef.current);
        blurSaveTimerRef.current = null;
      }

      if (inFlightSavePromiseRef.current) {
        if (targetStepOverride === undefined) {
          return inFlightSavePromiseRef.current;
        }
        await inFlightSavePromiseRef.current.catch(() => false);
      }

      const runSave = async (): Promise<boolean> => {
        setSaveStatus('saving');
        setSaveErrorMessage(null);

        try {
          if (activeStep === 2 && idea) {
            const nextStep = targetStepOverride ?? Math.max(draft.currentStep || 2, 2);
            const savedDraft = await saveIdeaStep2(draft, idea, nextStep);
            setDraft(savedDraft);
            setLastSavedAtMs(Date.now());
            setNowTickMs(Date.now());
            setSaveStatus('saved');
            setIsDirty(false);
            return true;
          }

          if (!applicant) return false;

          const nextStep = targetStepOverride ?? draft.currentStep ?? 1;
          const profileUpdate: ProfileIdentityUpdate = {};

          if (!hasVerifiedIdentity) {
            if (applicant.firstName.trim()) profileUpdate.firstName = applicant.firstName.trim();
            if (applicant.surname.trim()) profileUpdate.surname = applicant.surname.trim();
            if (isValidOmangDigits(rawOmangInput)) {
              profileUpdate.omangOrPassport = rawOmangInput.trim();
            }
            if (applicant.dateOfBirth.trim()) profileUpdate.dob = applicant.dateOfBirth.trim();
          }
          if (applicant.gender) profileUpdate.gender = applicant.gender;
          if (applicant.district.trim()) profileUpdate.district = applicant.district.trim();
          if (applicant.town.trim()) profileUpdate.town = applicant.town.trim();
          if (applicant.address.trim()) profileUpdate.address = applicant.address.trim();

          const applicantForSave: WizardApplicantDetails = {
            ...applicant,
            omang: hasVerifiedIdentity
              ? maskOmangLast3(profile?.omangOrPassport || applicant.omang)
              : maskOmangLast3(rawOmangInput || applicant.omang),
          };

          const savedDraft = await saveIdeaDraft(draft, applicantForSave, nextStep, profileUpdate);
          setDraft(savedDraft);
          setLastSavedAtMs(Date.now());
          setNowTickMs(Date.now());
          setSaveStatus('saved');
          setIsDirty(false);
          return true;
        } catch (err) {
          setSaveStatus('error');
          setSaveErrorMessage(
            err instanceof Error ? err.message : 'Could not save your draft to the database.'
          );
          return false;
        } finally {
          inFlightSavePromiseRef.current = null;
        }
      };

      const promise = runSave();
      inFlightSavePromiseRef.current = promise;
      return promise;
    },
    [activeStep, applicant, draft, hasVerifiedIdentity, idea, profile, rawOmangInput]
  );

  // Autosave every 10 seconds when changed (debounced)
  useEffect(() => {
    if (!isDirty || (activeStep !== 1 && activeStep !== 2)) return;
    const timer = window.setTimeout(() => {
      performSave();
    }, 10_000);
    return () => window.clearTimeout(timer);
  }, [isDirty, applicant, rawOmangInput, idea, jobsRawInput, activeStep, performSave]);

  const triggerBlurAutosave = useCallback(() => {
    if (!isDirty) return;
    if (blurSaveTimerRef.current) {
      window.clearTimeout(blurSaveTimerRef.current);
    }
    blurSaveTimerRef.current = window.setTimeout(() => {
      performSave();
    }, 350);
  }, [isDirty, performSave]);

  useEffect(() => {
    return () => {
      if (blurSaveTimerRef.current) {
        window.clearTimeout(blurSaveTimerRef.current);
      }
    };
  }, []);

  const confirmLeaveIfDirty = useCallback(
    (targetPath: string): boolean => {
      const targetClean = targetPath.split('?')[0];
      if (targetClean === cleanPath) return true;
      if (!isDirty) return true;
      return window.confirm(
        'You have unsaved changes on your draft. Leave this page without saving?'
      );
    },
    [cleanPath, isDirty]
  );

  const navigateSafely = useCallback(
    (targetPath: string) => {
      if (!confirmLeaveIfDirty(targetPath)) return;
      setCurrentRoute(targetPath);
    },
    [confirmLeaveIfDirty, setCurrentRoute]
  );

  const updateApplicant = useCallback(
    (updater: (prev: WizardApplicantDetails) => WizardApplicantDetails) => {
      setApplicant((prev) => {
        if (!prev) return prev;
        return updater(prev);
      });
      setIsDirty(true);
    },
    []
  );

  const updateIdea = useCallback(
    (updater: (prev: WizardIdeaDetails) => WizardIdeaDetails) => {
      setIdea((prev) => {
        if (!prev) return prev;
        return updater(prev);
      });
      setIsDirty(true);
    },
    []
  );

  const handleJobsRawInputChange = useCallback(
    (raw: string) => {
      setJobsRawInput(raw);
      const parsed = parseWholeJobsInput(raw);
      updateIdea((prev) => ({
        ...prev,
        jobsEstimate: parsed.valid ? parsed.parsed : null,
      }));
    },
    [updateIdea]
  );

  const handleFieldBlur = (key?: FieldKey) => {
    if (key) {
      setTouched((prev) => ({ ...prev, [key]: true }));
    }
    triggerBlurAutosave();
  };

  const handleStep2FieldBlur = (key?: Step2FieldKey) => {
    if (key) {
      setTouchedStep2((prev) => ({ ...prev, [key]: true }));
    }
    triggerBlurAutosave();
  };

  const handleApplicantTypeChange = (nextType: WizardApplicantType) => {
    updateApplicant((prev) => ({ ...prev, type: nextType }));
    setIsBusinessAccordionOpen(nextType === 'business');
  };

  const handleAddTeamMember = () => {
    const cleanName = newMemberName.trim();
    const cleanRole = newMemberRole.trim();
    const cleanPhone = normalizeBotswanaPhoneInput(newMemberPhone);

    if (cleanName.length < 2) {
      setTeamRowError('Enter the team member’s full name.');
      return;
    }
    if (cleanRole.length < 2) {
      setTeamRowError('Enter the team member’s role.');
      return;
    }
    if (!isValidBotswanaMobile(cleanPhone)) {
      setTeamRowError('Enter a valid 8-digit Botswana mobile number starting with 7.');
      return;
    }

    const member: WizardTeamMember = {
      name: cleanName,
      role: cleanRole,
      phone: cleanPhone,
    };

    updateApplicant((prev) => ({
      ...prev,
      team: [...prev.team, member],
    }));

    setNewMemberName('');
    setNewMemberRole('');
    setNewMemberPhone('');
    setTeamRowError(null);
    setIsAddingTeamMember(false);
  };

  const handleRemoveTeamMember = (index: number) => {
    updateApplicant((prev) => ({
      ...prev,
      team: prev.team.filter((_, idx) => idx !== index),
    }));
  };

  const handleSaveDraftClick = async () => {
    await performSave();
  };

  const handleNextClick = async () => {
    if (isAdvancingStep) return;

    if (!validation.isValid) {
      setHasAttemptedNext(true);
      const allTouched: Partial<Record<FieldKey, boolean>> = {};
      validation.errorKeys.forEach((k) => {
        allTouched[k] = true;
      });
      setTouched((prev) => ({ ...prev, ...allTouched }));

      const firstKey = validation.errorKeys[0];
      const firstEl = firstKey ? fieldRefs.current[firstKey] : null;
      if (firstEl) {
        firstEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        firstEl.focus();
      }
      return;
    }

    setIsAdvancingStep(true);
    try {
      const nextStep = Math.max(draft?.currentStep || 1, 2);
      const savedOk = await performSave(nextStep);
      if (savedOk) {
        setCurrentRoute('/submit/idea');
      }
    } finally {
      setIsAdvancingStep(false);
    }
  };

  const handleStep2BackClick = async () => {
    if (isBackingStep || isAdvancingStep) return;
    setIsBackingStep(true);
    try {
      if (isDirty) {
        const savedOk = await performSave();
        if (!savedOk) {
          const proceed = window.confirm(
            'Your latest changes could not be saved. Go back to Applicant details anyway?'
          );
          if (!proceed) return;
        }
      }
      setCurrentRoute('/submit/applicant');
    } finally {
      setIsBackingStep(false);
    }
  };

  const handleStep2NextClick = async () => {
    if (isAdvancingStep || isBackingStep) return;

    if (!step2Validation.isValid) {
      setHasAttemptedNextStep2(true);
      const allTouched: Partial<Record<Step2FieldKey, boolean>> = {};
      step2Validation.errorKeys.forEach((k) => {
        allTouched[k] = true;
      });
      setTouchedStep2((prev) => ({ ...prev, ...allTouched }));

      const firstKey = step2Validation.errorKeys[0];
      const firstEl = firstKey ? step2FieldRefs.current[firstKey] : null;
      if (firstEl) {
        firstEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        firstEl.focus();
      }
      return;
    }

    setIsAdvancingStep(true);
    try {
      const nextStep = Math.max(draft?.currentStep || 2, 3);
      const savedOk = await performSave(nextStep);
      if (savedOk) {
        setCurrentRoute('/submit/documents');
      }
    } finally {
      setIsAdvancingStep(false);
    }
  };

  const shouldShowError = (key: FieldKey): boolean => {
    return Boolean((touched[key] || hasAttemptedNext) && validation.errors[key]);
  };

  const selectedDistrictObj = useMemo(() => {
    if (!applicant?.district) return null;
    const lower = applicant.district.toLowerCase();
    return (
      BOTSWANA_DISTRICTS.find(
        (d) => d.name.toLowerCase() === lower || lower.includes(d.id.replace('_', '-'))
      ) || null
    );
  }, [applicant?.district]);

  const districtOptions = useMemo(
    () => BOTSWANA_DISTRICTS.map((d) => d.name),
    []
  );

  const relativeSavedLabel = useMemo(() => {
    if (saveStatus === 'saving') return 'Saving...';
    if (saveStatus === 'error') return 'Could not save.';
    if (lastSavedAtMs) {
      return `Draft saved ${formatRelativeSavedTime(lastSavedAtMs, nowTickMs)}`;
    }
    return 'Draft ready';
  }, [lastSavedAtMs, nowTickMs, saveStatus]);

  const highestAllowedStep = Math.max(activeStep, draft?.currentStep || 1);

  const cipaValid = Boolean(applicant && isValidCipaNumber(applicant.business.cipaNumber));
  const tinValid = Boolean(applicant && isValidTin(applicant.business.tin));
  const omangInputValid = isValidOmangDigits(rawOmangInput);

  return (
    <SubmitterLayout onBeforeNavigate={confirmLeaveIfDirty}>
      <div className="flex flex-col gap-5 pb-14 lg:pb-4">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-[#6b4f47]">
          <button
            type="button"
            onClick={() => navigateSafely('/dashboard')}
            className="hover:text-[#a02010] transition-colors"
          >
            Home
          </button>
          <span aria-hidden="true">/</span>
          <button
            type="button"
            onClick={() => navigateSafely('/submit/applicant')}
            className="hover:text-[#a02010] transition-colors"
          >
            Submit an idea
          </button>
          <span aria-hidden="true">/</span>
          <span className="font-semibold text-[#1c1c19]">Step {activeStep}</span>
        </nav>

        {/* Page Title & Auto-save Chip */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-headline text-2xl sm:text-[28px] font-bold text-[#38231d] tracking-tight">
              Submit an idea
            </h1>
            <p className="text-xs sm:text-sm text-[#5a413c] mt-1">
              Four short steps. Your progress is saved as you go.
            </p>
          </div>

          {activeStep === 2 && !isLoading && !loadError && (
            <div
              role="status"
              aria-live="polite"
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold shrink-0 ${
                saveStatus === 'error'
                  ? 'bg-[#ffdad6]/60 border-[#ba1a1a]/40 text-[#7c0700]'
                  : saveStatus === 'saving'
                  ? 'bg-[#fbf3ef] border-[#e2bfb8] text-[#5a413c]'
                  : 'bg-white border-[#e2bfb8]/80 text-[#38231d]'
              }`}
            >
              <span
                aria-hidden="true"
                className={`w-2 h-2 rounded-full ${
                  saveStatus === 'error'
                    ? 'bg-[#ba1a1a]'
                    : saveStatus === 'saving'
                    ? 'bg-[#f8a018] animate-pulse'
                    : 'bg-[#2e7d32]'
                }`}
              />
              <span>
                {saveStatus === 'saving'
                  ? 'Saving...'
                  : saveStatus === 'error'
                  ? 'Could not save'
                  : 'Auto-save active'}
              </span>
            </div>
          )}
        </div>

        {/* Loading Skeleton */}
        {isLoading ? (
          <div aria-busy="true" aria-label="Loading submission wizard" className="space-y-5">
            <div className="bg-white rounded-2xl border border-[#e2bfb8]/60 p-4 animate-pulse h-14" />
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              <div className="lg:col-span-8 bg-white rounded-2xl border border-[#e2bfb8]/60 p-6 space-y-5 animate-pulse">
                <div className="h-6 w-44 rounded bg-[#e8dfd8]" />
                <div className="h-11 w-full rounded-xl bg-[#f1ede8]" />
                <div className="h-24 w-full rounded-xl bg-[#f7f3ee]" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="h-11 rounded-xl bg-[#f1ede8]" />
                  <div className="h-11 rounded-xl bg-[#f1ede8]" />
                </div>
                <div className="h-11 w-full rounded-xl bg-[#f1ede8]" />
              </div>
              <div className="lg:col-span-4 space-y-4">
                <div className="bg-white rounded-2xl border border-[#e2bfb8]/60 p-5 h-32 animate-pulse" />
                <div className="bg-white rounded-2xl border border-[#e2bfb8]/60 p-5 h-48 animate-pulse" />
                <div className="bg-white rounded-2xl border border-[#e2bfb8]/60 p-5 h-36 animate-pulse" />
              </div>
            </div>
          </div>
        ) : loadError || !applicant ? (
          /* Error Card with Retry */
          <section
            role="alert"
            className="bg-white rounded-2xl border border-[#ba1a1a]/30 p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs"
          >
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-red-50 text-[#ba1a1a] flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[24px]">error_outline</span>
              </div>
              <div>
                <h2 className="font-headline text-base font-bold text-[#1c1c19]">
                  Unable to load your application draft
                </h2>
                <p className="text-xs sm:text-sm text-[#5a413c] mt-1">
                  {loadError || 'An unexpected error occurred while initializing Step 1.'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={loadWizardData}
              className="inline-flex items-center justify-center gap-2 h-10 px-5 rounded-xl bg-[#a02010] hover:bg-[#7c0700] text-white text-xs font-semibold transition-colors shrink-0 self-start sm:self-auto"
            >
              <span className="material-symbols-outlined text-[16px]">refresh</span>
              <span>Retry</span>
            </button>
          </section>
        ) : (
          <>
            {/* Horizontal Stepper Bar */}
            <nav
              aria-label="Submission steps"
              className="bg-white rounded-2xl border border-[#e2bfb8]/70 px-4 sm:px-5 py-3.5 shadow-2xs"
            >
              {/* Mobile Stepper (< sm): current step name + Step X of 4 */}
              <div className="flex sm:hidden items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-7 h-7 rounded-full bg-[#a02010] text-white text-xs font-bold flex items-center justify-center shrink-0 tabular-nums">
                    {activeStep}
                  </span>
                  <span className="text-xs font-bold text-[#1c1c19] truncate">
                    {SUBMITTER_WIZARD_STEPS[activeStep - 1]?.label}
                  </span>
                </div>
                <span className="text-xs font-semibold text-[#6b4f47] shrink-0 tabular-nums">
                  Step {activeStep} of 4
                </span>
              </div>

              {/* Desktop / Tablet Stepper (>= sm) */}
              <div className="hidden sm:flex items-center justify-between gap-4">
                <ol className="flex items-center flex-1 gap-2 min-w-0">
                  {SUBMITTER_WIZARD_STEPS.map((item, idx) => {
                    const isCompleted =
                      activeStep === 2
                        ? item.step === 1
                        : item.step < highestAllowedStep && item.step !== activeStep;
                    const isCurrent = item.step === activeStep;
                    const isFuture =
                      activeStep === 2 ? item.step > 2 : item.step > highestAllowedStep;
                    const isClickable = !isCurrent && !isFuture;

                    return (
                      <React.Fragment key={item.key}>
                        <li className="flex items-center shrink-0">
                          {isClickable ? (
                            <button
                              type="button"
                              onClick={() => navigateSafely(item.path)}
                              className="flex items-center gap-2 text-left group rounded-lg py-0.5 pr-1 hover:text-[#a02010] transition-colors"
                            >
                              <span
                                className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center shrink-0 ${
                                  isCompleted
                                    ? 'bg-[#a02010] text-white'
                                    : 'bg-[#f1ede8] text-[#38231d] border border-[#a02010]/40'
                                }`}
                              >
                                {isCompleted ? (
                                  <span className="material-symbols-outlined text-[15px]">check</span>
                                ) : (
                                  item.step
                                )}
                              </span>
                              <span className="text-xs font-semibold text-[#1c1c19] group-hover:text-[#a02010] whitespace-nowrap">
                                {item.label}
                              </span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled
                              aria-current={isCurrent ? 'step' : undefined}
                              className={`flex items-center gap-2 text-left py-0.5 pr-1 ${
                                isFuture ? 'cursor-not-allowed opacity-70' : 'cursor-default'
                              }`}
                            >
                              <span
                                className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center shrink-0 tabular-nums ${
                                  isCurrent
                                    ? 'bg-[#a02010] text-white'
                                    : 'bg-[#f1ede8] text-[#6b4f47] border border-[#e2bfb8]/80'
                                }`}
                              >
                                {item.step}
                              </span>
                              <span
                                className={`text-xs whitespace-nowrap ${
                                  isCurrent
                                    ? 'font-bold text-[#1c1c19]'
                                    : 'font-medium text-[#6b4f47]'
                                }`}
                              >
                                {item.label}
                              </span>
                            </button>
                          )}
                        </li>
                        {idx < SUBMITTER_WIZARD_STEPS.length - 1 && (
                          <li
                            aria-hidden="true"
                            className={`h-px flex-1 min-w-[16px] ${
                              item.step < highestAllowedStep ? 'bg-[#a02010]/60' : 'bg-[#e2bfb8]/70'
                            }`}
                          />
                        )}
                      </React.Fragment>
                    );
                  })}
                </ol>

                <span className="text-xs font-semibold text-[#6b4f47] shrink-0 tabular-nums pl-2">
                  Step {activeStep} of 4
                </span>
              </div>
            </nav>

            {/* Mobile Progress Bar Card Above Form (< lg) */}
            <div className="lg:hidden bg-white rounded-2xl border border-[#e2bfb8]/70 p-4 shadow-2xs space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#1c1c19]">Your progress</span>
                <span className="font-bold text-[#a02010] tabular-nums">
                  {progressPercentage}% complete
                </span>
              </div>
              <div
                role="progressbar"
                aria-label={`Step ${activeStep} completion progress`}
                aria-valuenow={progressPercentage}
                aria-valuemin={0}
                aria-valuemax={100}
                className="h-2 w-full rounded-full bg-[#f1ede8] overflow-hidden"
              >
                <div
                  className="h-full rounded-full bg-[#a02010] transition-all duration-300"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>

            {/* Main 2-Column Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Left Column (8 cols) */}
              <div className="lg:col-span-8 space-y-5">
                {activeStep === 2 && idea ? (
                  /* STEP 2: IDEA DETAILS FORM */
                  <form
                    noValidate
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleStep2NextClick();
                    }}
                    className="space-y-5"
                  >
                    <Step2IdeaDetails
                      idea={idea}
                      jobsRawInput={jobsRawInput}
                      validation={step2Validation}
                      touched={touchedStep2}
                      hasAttemptedNext={hasAttemptedNextStep2}
                      saveStatus={saveStatus}
                      saveErrorMessage={saveErrorMessage}
                      fieldRefs={step2FieldRefs}
                      onUpdateIdea={updateIdea}
                      onChangeJobsRawInput={handleJobsRawInputChange}
                      onBlurField={handleStep2FieldBlur}
                      onRetrySave={handleSaveDraftClick}
                    />

                    {/* Step 2 Footer Bar (sticky on mobile above bottom nav, card footer on desktop) */}
                    <div className="sticky bottom-[58px] lg:static z-20 bg-white rounded-2xl border border-[#e2bfb8]/70 shadow-sm lg:shadow-2xs px-4 sm:px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <button
                          type="button"
                          onClick={handleStep2BackClick}
                          disabled={isBackingStep || isAdvancingStep}
                          className="inline-flex items-center gap-1.5 h-10 px-3 rounded-xl border border-[#e2bfb8] bg-white hover:bg-[#f7f3ee] text-xs font-semibold text-[#38231d] transition-colors disabled:opacity-60"
                        >
                          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                          <span>
                            {isBackingStep ? 'Saving...' : 'Back: Applicant details'}
                          </span>
                        </button>

                        <div className="flex items-center gap-1.5 text-[11px] text-[#6b4f47]">
                          <span>{relativeSavedLabel}</span>
                          {saveStatus === 'error' && (
                            <button
                              type="button"
                              onClick={handleSaveDraftClick}
                              className="font-bold text-[#a02010] hover:underline"
                            >
                              Retry
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 ml-auto">
                        <button
                          type="button"
                          onClick={handleSaveDraftClick}
                          disabled={saveStatus === 'saving'}
                          className="h-10 px-4 rounded-xl bg-[#f1ede8] hover:bg-[#e6e2dd] text-[#1c1c19] text-xs font-semibold transition-colors disabled:opacity-60"
                        >
                          Save as draft
                        </button>

                        <div
                          className="relative"
                          onMouseEnter={() => {
                            if (!step2Validation.isValid) setNextButtonTooltipVisible(true);
                          }}
                          onMouseLeave={() => setNextButtonTooltipVisible(false)}
                          onFocus={() => {
                            if (!step2Validation.isValid) setNextButtonTooltipVisible(true);
                          }}
                          onBlur={() => setNextButtonTooltipVisible(false)}
                        >
                          <button
                            type="submit"
                            disabled={isAdvancingStep || isBackingStep}
                            aria-disabled={!step2Validation.isValid || isAdvancingStep}
                            title={
                              !step2Validation.isValid
                                ? 'Complete the required fields to continue'
                                : undefined
                            }
                            className={`inline-flex items-center justify-center gap-2 h-10 px-5 rounded-xl text-xs font-semibold transition-colors shadow-xs ${
                              isAdvancingStep
                                ? 'bg-[#a02010]/80 text-white cursor-wait'
                                : step2Validation.isValid
                                ? 'bg-[#a02010] hover:bg-[#7c0700] text-white cursor-pointer'
                                : 'bg-[#e5dad4] text-[#5a413c] border border-[#d6c2ba] cursor-not-allowed'
                            }`}
                          >
                            <span>{isAdvancingStep ? 'Saving step...' : 'Next: Documents'}</span>
                            <span className="material-symbols-outlined text-[16px]">
                              {isAdvancingStep ? 'hourglass_top' : 'arrow_forward'}
                            </span>
                          </button>

                          {!step2Validation.isValid && nextButtonTooltipVisible && (
                            <div
                              role="tooltip"
                              className="absolute bottom-full right-0 mb-2 px-2.5 py-1.5 rounded-lg bg-[#1c1c19] text-white text-[11px] font-medium whitespace-nowrap shadow-lg z-30 pointer-events-none"
                            >
                              Complete the required fields to continue
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </form>
                ) : activeStep > 2 ? (
                  /* Steps 3 to 4: Coming soon inside wizard layout */
                  <section
                    aria-labelledby="wizard-coming-soon-heading"
                    className="bg-white rounded-2xl border border-[#e2bfb8]/70 shadow-2xs p-8 sm:p-12 flex flex-col items-center text-center"
                  >
                    <div className="w-16 h-16 rounded-2xl bg-[#fbf3ef] border border-[#e2bfb8]/70 text-[#a02010] flex items-center justify-center mb-4">
                      <span className="material-symbols-outlined text-[32px]">
                        {activeStep === 3 ? 'upload_file' : 'fact_check'}
                      </span>
                    </div>
                    <span className="text-[11px] font-bold uppercase tracking-widest text-[#a02010] mb-1.5">
                      Step {activeStep} of 4 · {SUBMITTER_WIZARD_STEPS[activeStep - 1]?.label}
                    </span>
                    <h2
                      id="wizard-coming-soon-heading"
                      className="font-headline text-xl font-bold text-[#1c1c19] mb-2"
                    >
                      Coming soon
                    </h2>
                    <p className="text-sm text-[#5a413c] max-w-md mb-6 leading-relaxed">
                      Your <strong>Applicant details</strong> and <strong>Idea details</strong> are
                      saved to your draft. The{' '}
                      <strong>{SUBMITTER_WIZARD_STEPS[activeStep - 1]?.label}</strong> step is coming
                      soon.
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={() => navigateSafely('/submit/idea')}
                        className="inline-flex items-center justify-center gap-2 h-10 px-5 rounded-xl border border-[#e2bfb8] bg-white hover:bg-[#f7f3ee] text-[#38231d] text-xs font-semibold transition-colors"
                      >
                        <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                        <span>Back to Idea details</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => navigateSafely('/dashboard')}
                        className="inline-flex items-center justify-center gap-2 h-10 px-5 rounded-xl bg-[#a02010] hover:bg-[#7c0700] text-white text-xs font-semibold transition-colors shadow-xs"
                      >
                        <span>Return to Dashboard</span>
                      </button>
                    </div>
                  </section>
                ) : (
                  /* STEP 1: APPLICANT DETAILS FORM */
                  <form
                    noValidate
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleNextClick();
                    }}
                    className="space-y-5"
                  >
                    <div className="bg-white rounded-2xl border border-[#e2bfb8]/70 shadow-2xs p-5 sm:p-6 space-y-6">
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-4 border-b border-[#f1ede8] pb-4">
                        <div>
                          <h2 className="font-headline text-lg sm:text-xl font-bold text-[#1c1c19]">
                            Applicant details
                          </h2>
                          <p className="text-xs text-[#6b4f47] mt-0.5">
                            Pre-filled from your profile. Check it and fill in anything missing.
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <button
                            type="button"
                            onClick={() => navigateSafely('/profile')}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-[#a02010] hover:text-[#7c0700] transition-colors"
                          >
                            <span className="material-symbols-outlined text-[15px]">edit</span>
                            <span>Edit profile</span>
                          </button>
                          <p className="text-[11px] text-[#77574e] mt-0.5">* Required</p>
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
                            onClick={handleSaveDraftClick}
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
                          <div className="text-xs text-[#400200]">
                            <p className="font-bold">
                              {validation.errorKeys.length}{' '}
                              {validation.errorKeys.length === 1 ? 'field needs' : 'fields need'} your
                              attention
                            </p>
                            <p className="mt-0.5 text-[#5a413c]">
                              Please review the highlighted fields below before continuing to Idea
                              details.
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Applying as * Segmented Control */}
                      <div className="space-y-2">
                        <span className="block text-xs font-bold text-[#1c1c19]">
                          Applying as <span className="text-[#a02010]">*</span>
                        </span>
                        <div
                          role="radiogroup"
                          aria-label="Applying as"
                          className="inline-grid grid-cols-2 w-full sm:w-auto sm:min-w-[380px] p-1 rounded-xl bg-[#f1ede8] border border-[#e2bfb8]/60 gap-1"
                        >
                          <button
                            type="button"
                            role="radio"
                            aria-checked={applicant.type === 'individual'}
                            onClick={() => handleApplicantTypeChange('individual')}
                            className={`h-10 px-4 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                              applicant.type === 'individual'
                                ? 'bg-[#a02010] text-white shadow-xs'
                                : 'text-[#5a413c] hover:text-[#1c1c19]'
                            }`}
                          >
                            <span className="material-symbols-outlined text-[18px]">person</span>
                            <span>Individual citizen</span>
                          </button>
                          <button
                            type="button"
                            role="radio"
                            aria-checked={applicant.type === 'business'}
                            onClick={() => handleApplicantTypeChange('business')}
                            className={`h-10 px-4 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                              applicant.type === 'business'
                                ? 'bg-[#a02010] text-white shadow-xs'
                                : 'text-[#5a413c] hover:text-[#1c1c19]'
                            }`}
                          >
                            <span className="material-symbols-outlined text-[18px]">domain</span>
                            <span>Business or group</span>
                          </button>
                        </div>
                        <p className="text-[11px] text-[#6b4f47]">
                          Individual: personal Omang. Business: CIPA-registered entity.
                        </p>
                      </div>

                      {/* Identity verification */}
                      <section aria-labelledby="identity-heading" className="space-y-3">
                        <h3
                          id="identity-heading"
                          className="text-xs sm:text-[13px] font-bold text-[#1c1c19]"
                        >
                          Identity verification
                        </h3>

                        {hasVerifiedIdentity ? (
                          /* Read-only verified identity summary card */
                          <div className="rounded-xl bg-[#fdf9f4] border border-[#e2bfb8]/70 p-4 grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                            <div className="sm:col-span-4 space-y-2.5">
                              <div>
                                <span className="block text-[11px] text-[#6b4f47]">Full Name</span>
                                <span className="text-xs sm:text-[13px] font-bold text-[#1c1c19]">
                                  {[applicant.firstName, applicant.surname]
                                    .filter(Boolean)
                                    .join(' ')}
                                </span>
                              </div>
                              <div>
                                <span className="block text-[11px] text-[#6b4f47]">
                                  Date of Birth
                                </span>
                                <span className="text-xs sm:text-[13px] font-semibold text-[#1c1c19]">
                                  {formatLongDateBotswana(applicant.dateOfBirth)}
                                </span>
                              </div>
                            </div>

                            <div className="sm:col-span-4 space-y-1.5">
                              <span className="block text-[11px] text-[#6b4f47]">Omang</span>
                              <div className="flex items-center gap-1.5 text-xs sm:text-[13px] font-bold text-[#1c1c19] tabular-nums">
                                <span className="material-symbols-outlined text-[15px] text-[#5a413c]">
                                  lock
                                </span>
                                <span>{maskOmangLast3(applicant.omang)}</span>
                              </div>
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#ffdad4]/60 border border-[#e2bfb8] text-[11px] font-semibold text-[#7c0700]">
                                <span className="material-symbols-outlined text-[13px]">
                                  verified_user
                                </span>
                                <span>Verified</span>
                              </span>
                            </div>

                            <div className="sm:col-span-4">
                              <label
                                htmlFor="wizard-gender"
                                className="block text-[11px] text-[#6b4f47] mb-1"
                              >
                                Gender
                              </label>
                              <select
                                id="wizard-gender"
                                value={applicant.gender}
                                onChange={(e) =>
                                  updateApplicant((prev) => ({ ...prev, gender: e.target.value }))
                                }
                                onBlur={() => handleFieldBlur()}
                                className="w-full h-10 px-3 rounded-lg bg-white border border-[#e2bfb8] focus:border-[#a02010] text-xs font-medium text-[#1c1c19]"
                              >
                                <option value="">Select gender</option>
                                {GENDER_OPTIONS.map((g) => (
                                  <option key={g} value={g}>
                                    {g}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        ) : (
                          /* Editable Identity fields when profile is incomplete */
                          <div className="rounded-xl bg-[#fdf9f4] border border-[#e2bfb8]/70 p-4 space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <label
                                  htmlFor="wizard-first-name"
                                  className="block text-xs font-semibold text-[#1c1c19] mb-1"
                                >
                                  First name <span className="text-[#a02010]">*</span>
                                </label>
                                <input
                                  ref={(el) => {
                                    fieldRefs.current.firstName = el;
                                  }}
                                  id="wizard-first-name"
                                  type="text"
                                  value={applicant.firstName}
                                  onChange={(e) =>
                                    updateApplicant((prev) => ({
                                      ...prev,
                                      firstName: e.target.value,
                                    }))
                                  }
                                  onBlur={() => handleFieldBlur('firstName')}
                                  aria-invalid={shouldShowError('firstName')}
                                  aria-describedby={
                                    shouldShowError('firstName') ? 'err-firstName' : undefined
                                  }
                                  placeholder="First name"
                                  className={`w-full h-10 px-3 rounded-lg bg-white border text-xs font-medium text-[#1c1c19] ${
                                    shouldShowError('firstName')
                                      ? 'border-[#ba1a1a]'
                                      : 'border-[#e2bfb8] focus:border-[#a02010]'
                                  }`}
                                />
                                {shouldShowError('firstName') && (
                                  <p id="err-firstName" className="text-[11px] text-[#ba1a1a] mt-1">
                                    {validation.errors.firstName}
                                  </p>
                                )}
                              </div>

                              <div>
                                <label
                                  htmlFor="wizard-surname"
                                  className="block text-xs font-semibold text-[#1c1c19] mb-1"
                                >
                                  Surname <span className="text-[#a02010]">*</span>
                                </label>
                                <input
                                  ref={(el) => {
                                    fieldRefs.current.surname = el;
                                  }}
                                  id="wizard-surname"
                                  type="text"
                                  value={applicant.surname}
                                  onChange={(e) =>
                                    updateApplicant((prev) => ({
                                      ...prev,
                                      surname: e.target.value,
                                    }))
                                  }
                                  onBlur={() => handleFieldBlur('surname')}
                                  aria-invalid={shouldShowError('surname')}
                                  aria-describedby={
                                    shouldShowError('surname') ? 'err-surname' : undefined
                                  }
                                  placeholder="Surname"
                                  className={`w-full h-10 px-3 rounded-lg bg-white border text-xs font-medium text-[#1c1c19] ${
                                    shouldShowError('surname')
                                      ? 'border-[#ba1a1a]'
                                      : 'border-[#e2bfb8] focus:border-[#a02010]'
                                  }`}
                                />
                                {shouldShowError('surname') && (
                                  <p id="err-surname" className="text-[11px] text-[#ba1a1a] mt-1">
                                    {validation.errors.surname}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                              <div>
                                <label
                                  htmlFor="wizard-omang"
                                  className="block text-xs font-semibold text-[#1c1c19] mb-1"
                                >
                                  Omang (9 digits) <span className="text-[#a02010]">*</span>
                                </label>
                                <div className="relative">
                                  <input
                                    ref={(el) => {
                                      fieldRefs.current.omang = el;
                                    }}
                                    id="wizard-omang"
                                    type="password"
                                    inputMode="numeric"
                                    maxLength={9}
                                    autoComplete="off"
                                    value={rawOmangInput}
                                    onChange={(e) => {
                                      const digits = e.target.value.replace(/\D/g, '').slice(0, 9);
                                      setRawOmangInput(digits);
                                      updateApplicant((prev) => ({
                                        ...prev,
                                        omang: maskOmangLast3(digits),
                                      }));
                                    }}
                                    onBlur={() => handleFieldBlur('omang')}
                                    aria-invalid={shouldShowError('omang')}
                                    aria-describedby={
                                      shouldShowError('omang') ? 'err-omang' : undefined
                                    }
                                    placeholder="9-digit Omang"
                                    className={`w-full h-10 pl-3 pr-9 rounded-lg bg-white border text-xs font-medium text-[#1c1c19] tabular-nums ${
                                      shouldShowError('omang')
                                        ? 'border-[#ba1a1a]'
                                        : 'border-[#e2bfb8] focus:border-[#a02010]'
                                    }`}
                                  />
                                  {omangInputValid && (
                                    <span
                                      aria-hidden="true"
                                      className="material-symbols-outlined text-[18px] text-[#a02010] absolute right-2.5 top-1/2 -translate-y-1/2"
                                    >
                                      check_circle
                                    </span>
                                  )}
                                </div>
                                {shouldShowError('omang') && (
                                  <p id="err-omang" className="text-[11px] text-[#ba1a1a] mt-1">
                                    {validation.errors.omang}
                                  </p>
                                )}
                              </div>

                              <div>
                                <label
                                  htmlFor="wizard-dob"
                                  className="block text-xs font-semibold text-[#1c1c19] mb-1"
                                >
                                  Date of birth <span className="text-[#a02010]">*</span>
                                </label>
                                <input
                                  ref={(el) => {
                                    fieldRefs.current.dateOfBirth = el;
                                  }}
                                  id="wizard-dob"
                                  type="date"
                                  max={new Date().toISOString().split('T')[0]}
                                  value={applicant.dateOfBirth}
                                  onChange={(e) =>
                                    updateApplicant((prev) => ({
                                      ...prev,
                                      dateOfBirth: e.target.value,
                                    }))
                                  }
                                  onBlur={() => handleFieldBlur('dateOfBirth')}
                                  aria-invalid={shouldShowError('dateOfBirth')}
                                  aria-describedby={
                                    shouldShowError('dateOfBirth') ? 'err-dob' : undefined
                                  }
                                  className={`w-full h-10 px-3 rounded-lg bg-white border text-xs font-medium text-[#1c1c19] ${
                                    shouldShowError('dateOfBirth')
                                      ? 'border-[#ba1a1a]'
                                      : 'border-[#e2bfb8] focus:border-[#a02010]'
                                  }`}
                                />
                                {shouldShowError('dateOfBirth') && (
                                  <p id="err-dob" className="text-[11px] text-[#ba1a1a] mt-1">
                                    {validation.errors.dateOfBirth}
                                  </p>
                                )}
                              </div>

                              <div>
                                <label
                                  htmlFor="wizard-gender-editable"
                                  className="block text-xs font-semibold text-[#1c1c19] mb-1"
                                >
                                  Gender
                                </label>
                                <select
                                  id="wizard-gender-editable"
                                  value={applicant.gender}
                                  onChange={(e) =>
                                    updateApplicant((prev) => ({ ...prev, gender: e.target.value }))
                                  }
                                  onBlur={() => handleFieldBlur()}
                                  className="w-full h-10 px-3 rounded-lg bg-white border border-[#e2bfb8] focus:border-[#a02010] text-xs font-medium text-[#1c1c19]"
                                >
                                  <option value="">Select gender</option>
                                  {GENDER_OPTIONS.map((g) => (
                                    <option key={g} value={g}>
                                      {g}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          </div>
                        )}
                      </section>

                      {/* Contact details */}
                      <section aria-labelledby="contact-heading" className="space-y-3">
                        <h3
                          id="contact-heading"
                          className="text-xs sm:text-[13px] font-bold text-[#1c1c19]"
                        >
                          Contact details
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label
                              htmlFor="wizard-email"
                              className="block text-xs font-medium text-[#5a413c] mb-1"
                            >
                              Email address <span className="text-[#a02010]">*</span>
                            </label>
                            <input
                              ref={(el) => {
                                fieldRefs.current.email = el;
                              }}
                              id="wizard-email"
                              type="email"
                              value={applicant.email}
                              onChange={(e) =>
                                updateApplicant((prev) => ({ ...prev, email: e.target.value }))
                              }
                              onBlur={() => handleFieldBlur('email')}
                              aria-invalid={shouldShowError('email')}
                              aria-describedby={shouldShowError('email') ? 'err-email' : undefined}
                              placeholder="name@example.co.bw"
                              className={`w-full h-10 px-3.5 rounded-lg bg-[#f1ede8]/75 focus:bg-white border text-xs sm:text-[13px] font-medium text-[#1c1c19] transition-colors ${
                                shouldShowError('email')
                                  ? 'border-[#ba1a1a]'
                                  : 'border-[#e2bfb8]/60 focus:border-[#a02010]'
                              }`}
                            />
                            {shouldShowError('email') && (
                              <p id="err-email" className="text-[11px] text-[#ba1a1a] mt-1">
                                {validation.errors.email}
                              </p>
                            )}
                          </div>

                          <div>
                            <label
                              htmlFor="wizard-phone"
                              className="block text-xs font-medium text-[#5a413c] mb-1"
                            >
                              Mobile number <span className="text-[#a02010]">*</span>
                            </label>
                            <div
                              className={`flex items-center h-10 rounded-lg bg-[#f1ede8]/75 focus-within:bg-white border transition-colors overflow-hidden ${
                                shouldShowError('phone')
                                  ? 'border-[#ba1a1a]'
                                  : 'border-[#e2bfb8]/60 focus-within:border-[#a02010]'
                              }`}
                            >
                              <span className="px-3 h-full flex items-center gap-1.5 text-xs font-semibold text-[#5a413c] border-r border-[#e2bfb8]/60 bg-[#ebe8e3]/60 shrink-0 select-none">
                                <span
                                  aria-hidden="true"
                                  className="inline-block w-3.5 h-2.5 rounded-[2px] border border-black/10 bg-gradient-to-b from-[#6da9d2] via-[#1c1c19] to-[#6da9d2]"
                                />
                                <span>+267</span>
                              </span>
                              <input
                                ref={(el) => {
                                  fieldRefs.current.phone = el;
                                }}
                                id="wizard-phone"
                                type="tel"
                                inputMode="numeric"
                                maxLength={8}
                                value={applicant.phone}
                                onChange={(e) =>
                                  updateApplicant((prev) => ({
                                    ...prev,
                                    phone: normalizeBotswanaPhoneInput(e.target.value),
                                  }))
                                }
                                onBlur={() => handleFieldBlur('phone')}
                                aria-invalid={shouldShowError('phone')}
                                aria-describedby={shouldShowError('phone') ? 'err-phone' : undefined}
                                placeholder="72 450 189"
                                className="flex-1 h-full px-3 bg-transparent text-xs sm:text-[13px] font-medium text-[#1c1c19] tabular-nums focus:outline-none"
                              />
                            </div>
                            {shouldShowError('phone') && (
                              <p id="err-phone" className="text-[11px] text-[#ba1a1a] mt-1">
                                {validation.errors.phone}
                              </p>
                            )}
                          </div>
                        </div>
                        <p className="text-[11px] text-[#6b4f47]">
                          We send status alerts to these contacts.
                        </p>
                      </section>

                      {/* Location */}
                      <section aria-labelledby="location-heading" className="space-y-3">
                        <h3
                          id="location-heading"
                          className="text-xs sm:text-[13px] font-bold text-[#1c1c19]"
                        >
                          Location
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label
                              htmlFor="wizard-district"
                              className="block text-xs font-medium text-[#5a413c] mb-1"
                            >
                              District <span className="text-[#a02010]">*</span>
                            </label>
                            <select
                              ref={(el) => {
                                fieldRefs.current.district = el;
                              }}
                              id="wizard-district"
                              value={applicant.district}
                              onChange={(e) =>
                                updateApplicant((prev) => ({ ...prev, district: e.target.value }))
                              }
                              onBlur={() => handleFieldBlur('district')}
                              aria-invalid={shouldShowError('district')}
                              aria-describedby={
                                shouldShowError('district') ? 'err-district' : undefined
                              }
                              className={`w-full h-10 px-3 rounded-lg bg-[#f1ede8]/75 focus:bg-white border text-xs sm:text-[13px] font-medium text-[#1c1c19] transition-colors ${
                                shouldShowError('district')
                                  ? 'border-[#ba1a1a]'
                                  : 'border-[#e2bfb8]/60 focus:border-[#a02010]'
                              }`}
                            >
                              <option value="">Select district</option>
                              {districtOptions.map((dist) => (
                                <option key={dist} value={dist}>
                                  {dist}
                                </option>
                              ))}
                            </select>
                            {shouldShowError('district') && (
                              <p id="err-district" className="text-[11px] text-[#ba1a1a] mt-1">
                                {validation.errors.district}
                              </p>
                            )}
                          </div>

                          <div>
                            <label
                              htmlFor="wizard-town"
                              className="block text-xs font-medium text-[#5a413c] mb-1"
                            >
                              Town or village <span className="text-[#a02010]">*</span>
                            </label>
                            <input
                              ref={(el) => {
                                fieldRefs.current.town = el;
                              }}
                              id="wizard-town"
                              type="text"
                              list="district-towns-list"
                              value={applicant.town}
                              onChange={(e) =>
                                updateApplicant((prev) => ({ ...prev, town: e.target.value }))
                              }
                              onBlur={() => handleFieldBlur('town')}
                              aria-invalid={shouldShowError('town')}
                              aria-describedby={shouldShowError('town') ? 'err-town' : undefined}
                              placeholder="e.g. Maun, Gaborone, Francistown"
                              className={`w-full h-10 px-3.5 rounded-lg bg-[#f1ede8]/75 focus:bg-white border text-xs sm:text-[13px] font-medium text-[#1c1c19] transition-colors ${
                                shouldShowError('town')
                                  ? 'border-[#ba1a1a]'
                                  : 'border-[#e2bfb8]/60 focus:border-[#a02010]'
                              }`}
                            />
                            <datalist id="district-towns-list">
                              {(selectedDistrictObj
                                ? selectedDistrictObj.towns
                                : BOTSWANA_DISTRICTS.flatMap((d) => d.towns)
                              ).map((t) => (
                                <option key={t} value={t} />
                              ))}
                            </datalist>
                            {shouldShowError('town') && (
                              <p id="err-town" className="text-[11px] text-[#ba1a1a] mt-1">
                                {validation.errors.town}
                              </p>
                            )}
                          </div>
                        </div>

                        <div>
                          <label
                            htmlFor="wizard-address"
                            className="block text-xs font-medium text-[#5a413c] mb-1"
                          >
                            Postal or physical address <span className="text-[#a02010]">*</span>
                          </label>
                          <input
                            ref={(el) => {
                              fieldRefs.current.address = el;
                            }}
                            id="wizard-address"
                            type="text"
                            value={applicant.address}
                            onChange={(e) =>
                              updateApplicant((prev) => ({ ...prev, address: e.target.value }))
                            }
                            onBlur={() => handleFieldBlur('address')}
                            aria-invalid={shouldShowError('address')}
                            aria-describedby={
                              shouldShowError('address') ? 'err-address' : undefined
                            }
                            placeholder="e.g. P.O. Box 40291, Maun, Botswana"
                            className={`w-full h-10 px-3.5 rounded-lg bg-[#f1ede8]/75 focus:bg-white border text-xs sm:text-[13px] font-medium text-[#1c1c19] transition-colors ${
                              shouldShowError('address')
                                ? 'border-[#ba1a1a]'
                                : 'border-[#e2bfb8]/60 focus:border-[#a02010]'
                            }`}
                          />
                          {shouldShowError('address') && (
                            <p id="err-address" className="text-[11px] text-[#ba1a1a] mt-1">
                              {validation.errors.address}
                            </p>
                          )}
                        </div>
                      </section>

                      {/* Business or entity details accordion */}
                      <section
                        aria-labelledby="business-accordion-btn"
                        className="rounded-xl border border-[#e2bfb8]/70 bg-[#f7f3ee]/70 overflow-hidden"
                      >
                        <button
                          id="business-accordion-btn"
                          type="button"
                          onClick={() => setIsBusinessAccordionOpen((prev) => !prev)}
                          aria-expanded={isBusinessAccordionOpen}
                          aria-controls="business-accordion-panel"
                          className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left hover:bg-[#f1ede8]/80 transition-colors"
                        >
                          <span className="flex items-center gap-2.5 text-xs sm:text-[13px] font-bold text-[#1c1c19]">
                            <span className="material-symbols-outlined text-[18px] text-[#5a413c]">
                              domain
                            </span>
                            <span>
                              Business or entity details (
                              {applicant.type === 'business' ? 'required' : 'optional'})
                            </span>
                          </span>
                          <span className="material-symbols-outlined text-[20px] text-[#5a413c]">
                            {isBusinessAccordionOpen ? 'expand_less' : 'expand_more'}
                          </span>
                        </button>

                        {isBusinessAccordionOpen && (
                          <div
                            id="business-accordion-panel"
                            className="px-4 pb-4 pt-2 border-t border-[#e2bfb8]/50 bg-[#fdf9f4]/70 space-y-4"
                          >
                            <div>
                              <label
                                htmlFor="wizard-trading-name"
                                className="block text-xs font-semibold text-[#1c1c19] mb-1"
                              >
                                Trading name{' '}
                                {applicant.type === 'business' && (
                                  <span className="text-[#a02010]">*</span>
                                )}
                              </label>
                              <input
                                ref={(el) => {
                                  fieldRefs.current.tradingName = el;
                                }}
                                id="wizard-trading-name"
                                type="text"
                                value={applicant.business.tradingName}
                                onChange={(e) =>
                                  updateApplicant((prev) => ({
                                    ...prev,
                                    business: {
                                      ...prev.business,
                                      tradingName: e.target.value,
                                    },
                                  }))
                                }
                                onBlur={() => handleFieldBlur('tradingName')}
                                aria-invalid={shouldShowError('tradingName')}
                                aria-describedby={
                                  shouldShowError('tradingName') ? 'err-tradingName' : undefined
                                }
                                placeholder="e.g. Okavango AgriCold Technologies (Pty) Ltd"
                                className={`w-full h-10 px-3.5 rounded-lg bg-white border text-xs sm:text-[13px] font-medium text-[#1c1c19] ${
                                  shouldShowError('tradingName')
                                    ? 'border-[#ba1a1a]'
                                    : 'border-[#e2bfb8] focus:border-[#a02010]'
                                }`}
                              />
                              {shouldShowError('tradingName') && (
                                <p
                                  id="err-tradingName"
                                  className="text-[11px] text-[#ba1a1a] mt-1"
                                >
                                  {validation.errors.tradingName}
                                </p>
                              )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <label
                                  htmlFor="wizard-cipa"
                                  className="block text-xs font-semibold text-[#1c1c19] mb-1"
                                >
                                  CIPA registration number{' '}
                                  {applicant.type === 'business' && (
                                    <span className="text-[#a02010]">*</span>
                                  )}
                                </label>
                                <div className="relative">
                                  <input
                                    ref={(el) => {
                                      fieldRefs.current.cipaNumber = el;
                                    }}
                                    id="wizard-cipa"
                                    type="text"
                                    value={applicant.business.cipaNumber}
                                    onChange={(e) =>
                                      updateApplicant((prev) => ({
                                        ...prev,
                                        business: {
                                          ...prev.business,
                                          cipaNumber: e.target.value.toUpperCase(),
                                        },
                                      }))
                                    }
                                    onBlur={() => handleFieldBlur('cipaNumber')}
                                    aria-invalid={shouldShowError('cipaNumber')}
                                    aria-describedby={
                                      shouldShowError('cipaNumber') ? 'err-cipa' : undefined
                                    }
                                    placeholder="e.g. BW00003891282"
                                    className={`w-full h-10 pl-3.5 pr-9 rounded-lg bg-white border text-xs sm:text-[13px] font-medium text-[#1c1c19] ${
                                      shouldShowError('cipaNumber')
                                        ? 'border-[#ba1a1a]'
                                        : 'border-[#e2bfb8] focus:border-[#a02010]'
                                    }`}
                                  />
                                  {cipaValid && (
                                    <span
                                      aria-label="Valid CIPA format"
                                      className="material-symbols-outlined text-[18px] text-[#a02010] absolute right-2.5 top-1/2 -translate-y-1/2"
                                    >
                                      check_circle
                                    </span>
                                  )}
                                </div>
                                {shouldShowError('cipaNumber') && (
                                  <p id="err-cipa" className="text-[11px] text-[#ba1a1a] mt-1">
                                    {validation.errors.cipaNumber}
                                  </p>
                                )}
                              </div>

                              <div>
                                <label
                                  htmlFor="wizard-tin"
                                  className="block text-xs font-semibold text-[#1c1c19] mb-1"
                                >
                                  BURS TIN{' '}
                                  {applicant.type === 'business' && (
                                    <span className="text-[#a02010]">*</span>
                                  )}
                                </label>
                                <div className="relative">
                                  <input
                                    ref={(el) => {
                                      fieldRefs.current.tin = el;
                                    }}
                                    id="wizard-tin"
                                    type="text"
                                    value={applicant.business.tin}
                                    onChange={(e) =>
                                      updateApplicant((prev) => ({
                                        ...prev,
                                        business: {
                                          ...prev.business,
                                          tin: e.target.value.toUpperCase(),
                                        },
                                      }))
                                    }
                                    onBlur={() => handleFieldBlur('tin')}
                                    aria-invalid={shouldShowError('tin')}
                                    aria-describedby={shouldShowError('tin') ? 'err-tin' : undefined}
                                    placeholder="e.g. TIN-9812401"
                                    className={`w-full h-10 pl-3.5 pr-9 rounded-lg bg-white border text-xs sm:text-[13px] font-medium text-[#1c1c19] ${
                                      shouldShowError('tin')
                                        ? 'border-[#ba1a1a]'
                                        : 'border-[#e2bfb8] focus:border-[#a02010]'
                                    }`}
                                  />
                                  {tinValid && (
                                    <span
                                      aria-label="Valid TIN format"
                                      className="material-symbols-outlined text-[18px] text-[#a02010] absolute right-2.5 top-1/2 -translate-y-1/2"
                                    >
                                      check_circle
                                    </span>
                                  )}
                                </div>
                                {shouldShowError('tin') && (
                                  <p id="err-tin" className="text-[11px] text-[#ba1a1a] mt-1">
                                    {validation.errors.tin}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </section>

                      {/* Team members (optional) */}
                      <section aria-labelledby="team-heading" className="space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <h3
                              id="team-heading"
                              className="text-xs sm:text-[13px] font-bold text-[#1c1c19]"
                            >
                              Team members
                            </h3>
                            <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-[#f1ede8] text-[#5a413c] text-[11px] font-bold tabular-nums">
                              {applicant.team.length}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setIsAddingTeamMember(true);
                              setTeamRowError(null);
                            }}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-[#a02010] hover:text-[#7c0700] transition-colors"
                          >
                            <span className="material-symbols-outlined text-[16px]">add</span>
                            <span>Add team member</span>
                          </button>
                        </div>

                        {isAddingTeamMember && (
                          <div className="rounded-xl bg-[#fdf9f4] border border-[#e2bfb8] p-3.5 space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                              <div>
                                <label htmlFor="team-member-name" className="sr-only">
                                  Team member name
                                </label>
                                <input
                                  id="team-member-name"
                                  type="text"
                                  value={newMemberName}
                                  onChange={(e) => setNewMemberName(e.target.value)}
                                  placeholder="Full name"
                                  className="w-full h-9 px-3 rounded-lg bg-white border border-[#e2bfb8] focus:border-[#a02010] text-xs font-medium text-[#1c1c19]"
                                />
                              </div>
                              <div>
                                <label htmlFor="team-member-role" className="sr-only">
                                  Team member role
                                </label>
                                <input
                                  id="team-member-role"
                                  type="text"
                                  value={newMemberRole}
                                  onChange={(e) => setNewMemberRole(e.target.value)}
                                  placeholder="Role (e.g. Co-founder)"
                                  className="w-full h-9 px-3 rounded-lg bg-white border border-[#e2bfb8] focus:border-[#a02010] text-xs font-medium text-[#1c1c19]"
                                />
                              </div>
                              <div>
                                <label htmlFor="team-member-phone" className="sr-only">
                                  Team member phone
                                </label>
                                <input
                                  id="team-member-phone"
                                  type="tel"
                                  inputMode="numeric"
                                  maxLength={8}
                                  value={newMemberPhone}
                                  onChange={(e) =>
                                    setNewMemberPhone(normalizeBotswanaPhoneInput(e.target.value))
                                  }
                                  placeholder="Mobile (7X XXX XXX)"
                                  className="w-full h-9 px-3 rounded-lg bg-white border border-[#e2bfb8] focus:border-[#a02010] text-xs font-medium text-[#1c1c19] tabular-nums"
                                />
                              </div>
                            </div>
                            {teamRowError && (
                              <p className="text-[11px] text-[#ba1a1a] font-medium">
                                {teamRowError}
                              </p>
                            )}
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setIsAddingTeamMember(false);
                                  setNewMemberName('');
                                  setNewMemberRole('');
                                  setNewMemberPhone('');
                                  setTeamRowError(null);
                                }}
                                className="h-8 px-3 rounded-lg border border-[#e2bfb8] bg-white hover:bg-[#f1ede8] text-xs font-semibold text-[#5a413c]"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={handleAddTeamMember}
                                className="h-8 px-3.5 rounded-lg bg-[#a02010] hover:bg-[#7c0700] text-white text-xs font-semibold"
                              >
                                Add
                              </button>
                            </div>
                          </div>
                        )}

                        {applicant.team.length > 0 && (
                          <ul className="space-y-2">
                            {applicant.team.map((member, index) => (
                              <li
                                key={`${member.name}-${index}`}
                                className="rounded-xl bg-[#fdf9f4] border border-[#e2bfb8]/60 px-3.5 py-2.5 flex items-center justify-between gap-3"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <span
                                    aria-hidden="true"
                                    className="w-8 h-8 rounded-full bg-[#ffdad4]/70 text-[#7c0700] text-[11px] font-bold flex items-center justify-center shrink-0"
                                  >
                                    {getInitials(member.name)}
                                  </span>
                                  <div className="min-w-0">
                                    <p className="text-xs font-bold text-[#1c1c19] truncate">
                                      {member.name}
                                    </p>
                                    <p className="text-[11px] text-[#6b4f47] truncate">
                                      {member.role}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-3 shrink-0">
                                  <span className="text-xs font-medium text-[#5a413c] tabular-nums">
                                    +267 {formatBotswanaPhoneDisplay(member.phone)}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveTeamMember(index)}
                                    aria-label={`Remove ${member.name}`}
                                    className="w-7 h-7 rounded-lg flex items-center justify-center text-[#6b4f47] hover:text-[#ba1a1a] hover:bg-[#ffdad4]/40 transition-colors"
                                  >
                                    <span className="material-symbols-outlined text-[17px]">
                                      delete
                                    </span>
                                  </button>
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </section>

                      {/* Declaration checkbox * */}
                      <div className="pt-2 border-t border-[#f1ede8] space-y-2">
                        <div className="flex items-start gap-2.5">
                          <input
                            ref={(el) => {
                              fieldRefs.current.declarationAccepted = el;
                            }}
                            id="wizard-declaration"
                            type="checkbox"
                            checked={applicant.declarationAccepted}
                            onChange={(e) => {
                              updateApplicant((prev) => ({
                                ...prev,
                                declarationAccepted: e.target.checked,
                              }));
                              setTouched((prev) => ({ ...prev, declarationAccepted: true }));
                              triggerBlurAutosave();
                            }}
                            aria-invalid={shouldShowError('declarationAccepted')}
                            aria-describedby={
                              shouldShowError('declarationAccepted') ? 'err-declaration' : undefined
                            }
                            className="mt-0.5 w-4 h-4 rounded border-[#8d706b] text-[#a02010] focus:ring-[#f8a018] accent-[#a02010] shrink-0"
                          />
                          <div className="text-xs text-[#1c1c19] leading-relaxed">
                            <label htmlFor="wizard-declaration" className="cursor-pointer">
                              I declare that I am a citizen of Botswana, or represent a 100%
                              citizen-owned entity, and that the information I give is true.{' '}
                              <span className="text-[#a02010]">*</span>
                            </label>{' '}
                            <button
                              type="button"
                              onClick={() => setIsDeclarationExpanded((prev) => !prev)}
                              aria-expanded={isDeclarationExpanded}
                              className="font-semibold text-[#a02010] hover:text-[#7c0700] underline-offset-2 hover:underline"
                            >
                              {isDeclarationExpanded ? 'Hide full declaration' : 'Read full declaration'}
                            </button>
                          </div>
                        </div>

                        {isDeclarationExpanded && (
                          <div className="ml-6.5 rounded-xl bg-[#fdf9f4] border border-[#e2bfb8]/60 p-3.5 text-[11px] text-[#5a413c] leading-relaxed">
                            {STATUTORY_DECLARATION_TEXT}
                          </div>
                        )}

                        {shouldShowError('declarationAccepted') && (
                          <p id="err-declaration" className="ml-6.5 text-[11px] text-[#ba1a1a]">
                            {validation.errors.declarationAccepted}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Footer Bar (sticky on mobile above bottom nav, card footer on desktop) */}
                    <div className="sticky bottom-[58px] lg:static z-20 bg-white rounded-2xl border border-[#e2bfb8]/70 shadow-sm lg:shadow-2xs px-4 sm:px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <button
                          type="button"
                          disabled
                          className="inline-flex items-center gap-1.5 h-10 px-3 rounded-xl text-xs font-semibold text-[#8d706b] cursor-not-allowed opacity-70"
                        >
                          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                          <span>Back</span>
                        </button>

                        <div className="flex items-center gap-1.5 text-[11px] text-[#6b4f47]">
                          <span>{relativeSavedLabel}</span>
                          {saveStatus === 'error' && (
                            <button
                              type="button"
                              onClick={handleSaveDraftClick}
                              className="font-bold text-[#a02010] hover:underline"
                            >
                              Retry
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 ml-auto">
                        <button
                          type="button"
                          onClick={handleSaveDraftClick}
                          disabled={saveStatus === 'saving'}
                          className="h-10 px-4 rounded-xl bg-[#f1ede8] hover:bg-[#e6e2dd] text-[#1c1c19] text-xs font-semibold transition-colors disabled:opacity-60"
                        >
                          Save as draft
                        </button>

                        <div
                          className="relative"
                          onMouseEnter={() => {
                            if (!validation.isValid) setNextButtonTooltipVisible(true);
                          }}
                          onMouseLeave={() => setNextButtonTooltipVisible(false)}
                          onFocus={() => {
                            if (!validation.isValid) setNextButtonTooltipVisible(true);
                          }}
                          onBlur={() => setNextButtonTooltipVisible(false)}
                        >
                          <button
                            type="submit"
                            disabled={isAdvancingStep}
                            aria-disabled={!validation.isValid || isAdvancingStep}
                            title={
                              !validation.isValid
                                ? 'Complete the required fields to continue'
                                : undefined
                            }
                            className={`inline-flex items-center justify-center gap-2 h-10 px-5 rounded-xl text-xs font-semibold transition-colors shadow-xs ${
                              isAdvancingStep
                                ? 'bg-[#a02010]/80 text-white cursor-wait'
                                : validation.isValid
                                ? 'bg-[#a02010] hover:bg-[#7c0700] text-white cursor-pointer'
                                : 'bg-[#e5dad4] text-[#5a413c] border border-[#d6c2ba] cursor-not-allowed'
                            }`}
                          >
                            <span>{isAdvancingStep ? 'Saving step...' : 'Next: Idea details'}</span>
                            <span className="material-symbols-outlined text-[16px]">
                              {isAdvancingStep ? 'hourglass_top' : 'arrow_forward'}
                            </span>
                          </button>

                          {!validation.isValid && nextButtonTooltipVisible && (
                            <div
                              role="tooltip"
                              className="absolute bottom-full right-0 mb-2 px-2.5 py-1.5 rounded-lg bg-[#1c1c19] text-white text-[11px] font-medium whitespace-nowrap shadow-lg z-30 pointer-events-none"
                            >
                              Complete the required fields to continue
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </form>
                )}
              </div>

              {/* Right Column (Sticky Aside on Desktop) */}
              <aside
                aria-label="Application guidance and progress"
                className="hidden lg:block lg:col-span-4 lg:sticky lg:top-20 space-y-4"
              >
                {/* Your idea is protected */}
                <section className="bg-white rounded-2xl border border-[#e2bfb8]/70 shadow-2xs p-5 space-y-2">
                  <div className="flex items-center gap-2 text-[#1c1c19]">
                    <span className="material-symbols-outlined text-[20px] text-[#a02010]">
                      verified_user
                    </span>
                    <h2 className="font-headline text-sm font-bold">Your idea is protected</h2>
                  </div>
                  <p className="text-xs text-[#5a413c] leading-relaxed">
                    Only assigned CEDA reviewers can see your submission.
                  </p>
                </section>

                {/* Your progress */}
                <section className="bg-white rounded-2xl border border-[#e2bfb8]/70 shadow-2xs p-5 space-y-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="font-headline text-sm font-bold text-[#1c1c19]">Your progress</h2>
                    <span className="text-xs font-bold text-[#a02010] tabular-nums">
                      {progressPercentage}% complete
                    </span>
                  </div>

                  <div
                    role="progressbar"
                    aria-label={`Step ${activeStep} progress`}
                    aria-valuenow={progressPercentage}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    className="h-2 w-full rounded-full bg-[#f1ede8] overflow-hidden"
                  >
                    <div
                      className="h-full rounded-full bg-[#a02010] transition-all duration-300"
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>

                  <ul className="space-y-2.5 pt-1 text-xs">
                    {SUBMITTER_WIZARD_STEPS.map((stepItem) => {
                      const isDone =
                        stepItem.step === 1
                          ? step1ValidForAside
                          : stepItem.step === 2
                          ? activeStep > 2 && step2Validation.isValid
                          : highestAllowedStep > stepItem.step;
                      const isCurrent = stepItem.step === activeStep;

                      let statusSubtext: string | null = null;
                      if (stepItem.step === 1) {
                        if (activeStep === 1) {
                          statusSubtext = validation.isValid
                            ? 'Identity, Contact, Location completed'
                            : `${validation.completedCount} of ${validation.totalRequired} required items filled`;
                        } else {
                          statusSubtext = step1ValidForAside ? 'Complete' : 'Incomplete';
                        }
                      } else if (stepItem.step === 2) {
                        if (activeStep === 2) {
                          statusSubtext = step2Validation.isValid
                            ? `${step2Validation.totalRequired} of ${step2Validation.totalRequired} filled`
                            : `${step2Validation.completedCount} of ${step2Validation.totalRequired} filled`;
                        } else if (activeStep > 2) {
                          statusSubtext = step2Validation.isValid ? 'Complete' : 'Incomplete';
                        } else {
                          statusSubtext = 'Upcoming';
                        }
                      } else if (stepItem.step > activeStep) {
                        statusSubtext = 'Upcoming';
                      }

                      return (
                        <li key={stepItem.key} className="flex items-start gap-2.5">
                          <span
                            aria-hidden="true"
                            className={`mt-0.5 w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                              isDone
                                ? 'bg-[#38231d] text-white'
                                : isCurrent
                                ? 'border-2 border-[#a02010] bg-white'
                                : 'border border-[#8d706b]/60 bg-white'
                            }`}
                          >
                            {isDone && (
                              <span className="material-symbols-outlined text-[11px]">check</span>
                            )}
                          </span>
                          <div className="min-w-0">
                            <span
                              className={`block ${
                                isCurrent || isDone
                                  ? 'font-bold text-[#1c1c19]'
                                  : 'font-medium text-[#6b4f47]'
                              }`}
                            >
                              {stepItem.label}
                            </span>
                            {statusSubtext && (
                              <span className="block text-[11px] text-[#6b4f47] mt-0.5">
                                {statusSubtext}
                              </span>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </section>

                {/* Need help? */}
                <section className="bg-white rounded-2xl border border-[#e2bfb8]/70 shadow-2xs p-5 space-y-3">
                  <h2 className="font-headline text-sm font-bold text-[#1c1c19]">Need help?</h2>

                  <div className="space-y-2 text-xs text-[#5a413c]">
                    <div className="flex items-start gap-2.5">
                      <span className="material-symbols-outlined text-[17px] text-[#77574e] mt-0.5 shrink-0">
                        call
                      </span>
                      <div>
                        <p>
                          Toll-free{' '}
                          <strong className="text-[#1c1c19] font-semibold">
                            {SUBMITTER_SUPPORT_CONFIG.hotline}
                          </strong>
                        </p>
                        <p className="text-[11px] text-[#6b4f47] mt-0.5">
                          {SUBMITTER_SUPPORT_CONFIG.chatHoursLabel}
                        </p>
                      </div>
                    </div>

                    <div className="pt-1 flex items-center gap-2.5">
                      <span
                        aria-hidden="true"
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          liveChatAvailable ? 'bg-[#a02010]' : 'bg-[#8d706b]'
                        }`}
                      />
                      {liveChatAvailable ? (
                        <button
                          type="button"
                          onClick={() => navigateSafely('/help-center')}
                          className="text-xs font-semibold text-[#a02010] hover:text-[#7c0700] hover:underline text-left"
                        >
                          Chat with CEDA
                        </button>
                      ) : (
                        <div className="min-w-0">
                          <span className="text-xs font-semibold text-[#8d706b] cursor-not-allowed block">
                            Chat with CEDA
                          </span>
                          <span className="text-[11px] text-[#7c0700] block">
                            {SUBMITTER_SUPPORT_CONFIG.chatUnavailableLabel}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </section>

                {/* Writing Tip Card on Step 2 */}
                {activeStep === 2 && (
                  <section className="bg-[#fbf3ef] rounded-2xl border border-[#e2bfb8]/80 shadow-2xs p-5 space-y-2">
                    <div className="flex items-center gap-2 text-[#7c0700]">
                      <span className="material-symbols-outlined text-[19px]">tips_and_updates</span>
                      <h2 className="font-headline text-sm font-bold text-[#1c1c19]">Tip</h2>
                    </div>
                    <p className="text-xs text-[#5a413c] leading-relaxed">
                      {SUBMITTER_WRITING_TIP}
                    </p>
                  </section>
                )}
              </aside>
            </div>
          </>
        )}
      </div>
    </SubmitterLayout>
  );
};
