/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import bcrypt from 'bcryptjs';
import { TOP_COMMON_PASSWORDS } from '../config/districts';

export interface PasswordRuleResult {
  hasMinLength: boolean; // >= 10
  hasUpper: boolean;
  hasLower: boolean;
  hasNumber: boolean;
  hasSymbol: boolean;
  notCommon: boolean;
  doesNotContainUserInfo: boolean;
  notIdenticalToPrevious: boolean;
}

export interface PasswordEvaluation {
  isValid: boolean;
  score: number; // 0 to 4
  strength: 'weak' | 'fair' | 'strong';
  color: string;
  rules: PasswordRuleResult;
  errors: string[];
}

const BCRYPT_SALT_ROUNDS = 12;

/**
 * Validates and evaluates a password according to CEDA Statutory Password Policy:
 * - Minimum 10 characters
 * - Uppercase, lowercase, numeric digit, special symbol
 * - Rejects top 100 common passwords
 * - Rejects passwords containing user's first name, surname, or email username
 */
export function evaluatePassword(
  password: string,
  userInfo?: {
    firstName?: string;
    surname?: string;
    email?: string;
  },
  previousHashes?: string[]
): PasswordEvaluation {
  const trimmed = password || '';
  const errors: string[] = [];

  const hasMinLength = trimmed.length >= 10;
  const hasUpper = /[A-Z]/.test(trimmed);
  const hasLower = /[a-z]/.test(trimmed);
  const hasNumber = /[0-9]/.test(trimmed);
  const hasSymbol = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(trimmed);

  // Common password check
  const lowerPwd = trimmed.toLowerCase();
  const notCommon = !TOP_COMMON_PASSWORDS.has(lowerPwd);
  if (!notCommon) {
    errors.push('Password is too common and easily guessed.');
  }

  // Personal info containment check
  let doesNotContainUserInfo = true;
  if (userInfo) {
    const fn = (userInfo.firstName || '').trim().toLowerCase();
    const sn = (userInfo.surname || '').trim().toLowerCase();
    const emUser = (userInfo.email || '').split('@')[0].toLowerCase();

    if (fn.length >= 3 && lowerPwd.includes(fn)) {
      doesNotContainUserInfo = false;
      errors.push('Password cannot contain your first name.');
    }
    if (sn.length >= 3 && lowerPwd.includes(sn)) {
      doesNotContainUserInfo = false;
      errors.push('Password cannot contain your surname.');
    }
    if (emUser.length >= 3 && lowerPwd.includes(emUser)) {
      doesNotContainUserInfo = false;
      errors.push('Password cannot contain your email username.');
    }
  }

  // Previous passwords check (if hash history provided)
  let notIdenticalToPrevious = true;
  if (previousHashes && previousHashes.length > 0 && trimmed.length > 0) {
    for (const oldHash of previousHashes) {
      try {
        if (bcrypt.compareSync(trimmed, oldHash)) {
          notIdenticalToPrevious = false;
          errors.push('Password cannot be identical to any of your previous 3 passwords.');
          break;
        }
      } catch {
        // Safe fallback in test environments
      }
    }
  }

  if (!hasMinLength) errors.push('Minimum 10 characters required.');
  if (!hasUpper) errors.push('Must include at least one uppercase letter.');
  if (!hasLower) errors.push('Must include at least one lowercase letter.');
  if (!hasNumber) errors.push('Must include at least one number.');
  if (!hasSymbol) errors.push('Must include at least one special symbol.');

  // Calculate score
  let score = 0;
  if (trimmed.length >= 8) score++;
  if (hasMinLength) score++;
  if (hasUpper && hasLower) score++;
  if (hasNumber && hasSymbol) score++;

  let strength: 'weak' | 'fair' | 'strong' = 'weak';
  let color = '#ba1a1a'; // red

  if (!notCommon || !doesNotContainUserInfo || trimmed.length < 8) {
    strength = 'weak';
    color = '#ba1a1a';
  } else if (!hasMinLength || score <= 2 || !hasSymbol || !hasNumber) {
    strength = 'fair';
    color = '#f8a018'; // amber
  } else if (hasMinLength && hasUpper && hasLower && hasNumber && hasSymbol && notCommon && doesNotContainUserInfo && notIdenticalToPrevious) {
    strength = 'strong';
    color = '#2e7d32'; // green
  } else {
    strength = 'fair';
    color = '#f8a018';
  }

  const isValid =
    hasMinLength &&
    hasUpper &&
    hasLower &&
    hasNumber &&
    hasSymbol &&
    notCommon &&
    doesNotContainUserInfo &&
    notIdenticalToPrevious;

  return {
    isValid,
    score,
    strength,
    color,
    rules: {
      hasMinLength,
      hasUpper,
      hasLower,
      hasNumber,
      hasSymbol,
      notCommon,
      doesNotContainUserInfo,
      notIdenticalToPrevious,
    },
    errors,
  };
}

/**
 * Hashes a password with bcrypt cost 12
 */
export function hashPassword(plainText: string): string {
  const salt = bcrypt.genSaltSync(BCRYPT_SALT_ROUNDS);
  return bcrypt.hashSync(plainText, salt);
}

/**
 * Compares plaintext password with stored bcrypt hash
 */
export function verifyPassword(plainText: string, hash: string): boolean {
  try {
    return bcrypt.compareSync(plainText, hash);
  } catch {
    return false;
  }
}
