/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'SUBMITTER' | 'EVALUATOR' | 'ADJUDICATOR' | 'ADMIN' | 'STAKEHOLDER';

export type AccountStatus = 'PENDING' | 'ACTIVE' | 'LOCKED' | 'SUSPENDED' | 'DEACTIVATED';

export type AccountType = 'individual' | 'business';

export type VerificationChannel = 'sms' | 'email';

export interface UserSession {
  id: string;
  userId: string;
  device: string;
  browser: string;
  ipAddress: string;
  location: string;
  lastActive: string;
  createdAt: string;
  isCurrent: boolean;
}

export interface UserProfile {
  id: string;
  email: string;
  phone: string; // Botswana +267 8-digit format
  firstName: string;
  surname: string;
  fullName: string;
  displayName?: string;
  organisation?: string;
  omangOrPassport: string;
  dob: string;
  district: string;
  town: string;
  accountType: AccountType;
  // Business fields
  tradingName?: string;
  cipaNumber?: string;
  bursTin?: string;
  role: UserRole;
  status: AccountStatus;
  verificationChannel: VerificationChannel;
  emailVerified: boolean;
  phoneVerified: boolean;
  passwordHash: string;
  previousPasswordHashes: string[];
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  lastLoginAt?: string | null;
  failedLoginAttempts: number;
  lockoutUntil?: string | null;
}

export interface RoleConfigItem {
  role: UserRole;
  label: string;
  labelSetswana: string;
  description: string;
  landingRoute: string;
  badgeBg: string;
  badgeText: string;
  capabilities: string[];
  navItems: {
    label: string;
    labelSetswana: string;
    path: string;
    icon: string;
  }[];
}

export interface RegisterRequest {
  accountType: AccountType;
  firstName: string;
  surname: string;
  omangOrPassport: string;
  dob: string;
  email: string;
  phone: string;
  district: string;
  town: string;
  tradingName?: string;
  cipaNumber?: string;
  bursTin?: string;
  verificationChannel: VerificationChannel;
  password: string;
  confirmPassword: string;
  bdpaConsent: boolean;
}

export interface RegisterResponse {
  success: boolean;
  userId: string;
  identifier: string;
  channel: VerificationChannel;
  message: string;
  nextStep: 'otp_verification';
  demoOtpCode: string;
  verificationId?: string; // Firebase Phone Auth verificationId
  isEmailVerificationSent?: boolean; // Firebase Email verification sent flag
}

export interface VerifyOtpRequest {
  identifier: string; // phone or email
  otpCode: string;
  channel: VerificationChannel;
  verificationId?: string; // Firebase Phone Auth verificationId
}

export interface VerifyOtpResponse {
  success: boolean;
  accountActivated: boolean;
  user?: UserProfile;
  token?: string;
  attemptsRemaining?: number;
  isLocked?: boolean;
  cooldownSeconds?: number;
  message: string;
}

export interface LoginRequest {
  method: 'password' | 'otp' | 'biometric';
  identifier: string; // phone or email
  password?: string;
  otpCode?: string;
  rememberDevice: boolean;
}

export interface LoginResponse {
  success: boolean;
  user?: UserProfile;
  token?: string;
  role?: UserRole;
  landingRoute?: string;
  requiresOtp?: boolean;
  message: string;
}

export interface RequestResetRequest {
  identifier: string; // phone or email
  channel: VerificationChannel;
}

export interface RequestResetResponse {
  success: boolean;
  message: string; // Must always be generic anti-enumeration
  deliveryChannel: VerificationChannel;
  resendCooldownSeconds: number;
  demoToken?: string;
  demoCode?: string;
}

export interface ResetPasswordRequest {
  tokenOrCode: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ResetPasswordResponse {
  success: boolean;
  message: string;
  isTokenExpired?: boolean;
}
