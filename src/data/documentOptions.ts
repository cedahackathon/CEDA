/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type DocumentSlotKey =
  | 'omang'
  | 'conceptNote'
  | 'budget'
  | 'proofOfResidence'
  | 'cipa'
  | 'letters';

export const DOCUMENT_MAX_FILE_SIZE_MB = 10;
export const DOCUMENT_MAX_FILE_SIZE_KB = DOCUMENT_MAX_FILE_SIZE_MB * 1024; // 10,240 KB
export const DOCUMENT_MAX_FILE_SIZE_BYTES = DOCUMENT_MAX_FILE_SIZE_MB * 1024 * 1024; // 10 MB
export const DOCUMENT_MAX_FILES_PER_IDEA = 8;
export const MAX_SUPPORT_LETTERS = 8;

export const DOCUMENT_ACCEPTED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
] as const;

export const DOCUMENT_ACCEPTED_EXTENSIONS = ['.pdf', '.docx', '.jpg', '.jpeg', '.png'] as const;

export const DOCUMENT_ACCEPTED_ATTR =
  '.pdf,.docx,.jpg,.jpeg,.png,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png';

export const DOCUMENT_FORMAT_LABEL = 'PDF, DOCX, JPG, PNG';

/**
 * Configure a public template URL when ready; leave null to display "Template coming soon".
 */
export const BUDGET_TEMPLATE_URL: string | null = null;

export interface DocumentSlotConfig {
  key: DocumentSlotKey;
  title: string;
  shortLabel: string;
  required: boolean;
  multiple: boolean;
  icon: string;
  helperText: string;
  missingActionText: string;
  uploadButtonLabel: string;
  sensitive: boolean;
}

export const DOCUMENT_SLOTS: DocumentSlotConfig[] = [
  {
    key: 'omang',
    title: 'Copy of Omang or Passport',
    shortLabel: 'Omang or Passport',
    required: true,
    multiple: false,
    icon: 'badge',
    helperText: 'Upload a clear, legible scan or photo showing all four corners.',
    missingActionText: 'Upload a clear copy of your valid Botswana Omang or Passport.',
    uploadButtonLabel: 'Upload Copy of Omang or Passport',
    sensitive: true,
  },
  {
    key: 'conceptNote',
    title: 'Concept note or pitch deck',
    shortLabel: 'Concept note or pitch deck',
    required: true,
    multiple: false,
    icon: 'description',
    helperText:
      'Include your problem overview, solution architecture, target market, and rollout plan.',
    missingActionText: 'Upload your concept note or pitch deck describing the proposal.',
    uploadButtonLabel: 'Upload Concept note or pitch deck',
    sensitive: false,
  },
  {
    key: 'budget',
    title: 'Budget estimate and financial model',
    shortLabel: 'Budget estimate and financial model',
    required: true,
    multiple: false,
    icon: 'calculate',
    helperText:
      'Provide a 3-year cash flow projection and CAPEX/OPEX breakdown denominated in Botswana Pula (BWP).',
    missingActionText:
      'Upload a 3-year cash flow projection and itemized budget in Botswana Pula (BWP).',
    uploadButtonLabel: 'Upload Budget estimate and financial model',
    sensitive: false,
  },
  {
    key: 'proofOfResidence',
    title: 'Proof of residence',
    shortLabel: 'Proof of residence',
    required: false,
    multiple: false,
    icon: 'location_on',
    helperText: 'Utility bill, lease agreement, or tribal authority letter confirming address.',
    missingActionText: 'Optional supporting record confirming your residential or operating address.',
    uploadButtonLabel: 'Upload Proof of residence',
    sensitive: false,
  },
  {
    key: 'cipa',
    title: 'CIPA registration certificate',
    shortLabel: 'CIPA registration certificate',
    required: false,
    multiple: false,
    icon: 'verified',
    helperText: 'Companies and Intellectual Property Authority certificate for registered entities.',
    missingActionText: 'Attach your CIPA certificate if applying on behalf of a registered business.',
    uploadButtonLabel: 'Upload CIPA registration certificate',
    sensitive: false,
  },
  {
    key: 'letters',
    title: 'Letters of support / MOUs',
    shortLabel: 'Letters of support / MOUs',
    required: false,
    multiple: true,
    icon: 'attach_file',
    helperText:
      'Optional off-taker letters, partnership MOUs, land permits, or supplier confirmations.',
    missingActionText: 'Attach optional partner letters, off-taker agreements, or permits.',
    uploadButtonLabel: 'Add another letter of support',
    sensitive: false,
  },
];

export const MANDATORY_DOCUMENT_KEYS: Array<'omang' | 'conceptNote' | 'budget'> = [
  'omang',
  'conceptNote',
  'budget',
];
