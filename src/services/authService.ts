/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  confirmPasswordReset,
  sendEmailVerification,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  PhoneAuthProvider,
  linkWithCredential,
  ConfirmationResult,
  User,
} from 'firebase/auth';
import {
  doc,
  setDoc,
  updateDoc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db, firebaseConfig } from '../config/firebase';
import { LEGAL } from '../config/legal';
import {
  UserProfile,
  UserSession,
  UserRole,
  RegisterRequest,
  RegisterResponse,
  VerifyOtpRequest,
  VerifyOtpResponse,
  LoginRequest,
  LoginResponse,
  RequestResetRequest,
  RequestResetResponse,
  ResetPasswordRequest,
  ResetPasswordResponse,
} from '../types/auth';
import { hashPassword, verifyPassword } from './passwordPolicy';
import { getLandingRouteForRole } from '../config/roles';

// Local storage fallback keys for offline/demo simulation if Firebase network is restricted
const STORAGE_USERS_KEY = 'ceda_portal_users_v1';
const STORAGE_SESSIONS_KEY = 'ceda_portal_sessions_v1';
const STORAGE_CURRENT_SESSION_KEY = 'ceda_portal_current_session_v1';
const STORAGE_FIREBASE_PROJECT_KEY = 'ceda_portal_firebase_project_v1';

const SEED_PASSWORD = 'Ceda#2026Demo';
const SEED_HASH = hashPassword(SEED_PASSWORD);
const ENABLE_SMS_VERIFICATION = import.meta.env.VITE_ENABLE_SMS_VERIFICATION === 'true';

// Global or memory references for active OTP sessions
let appRecaptchaVerifier: RecaptchaVerifier | null = null;
let activeConfirmationResult: ConfirmationResult | null = null;

const DEFAULT_SEED_USERS: UserProfile[] = [
  {
    id: 'user-sub-001',
    email: 'kagiso.molefe@ceda-innovate.co.bw',
    phone: '71234567',
    firstName: 'Kagiso',
    surname: 'Molefe',
    fullName: 'Kagiso Molefe',
    omangOrPassport: '482115904',
    dob: '1994-08-16',
    district: 'North-West (Ngamiland & Chobe)',
    town: 'Maun',
    accountType: 'individual',
    role: 'SUBMITTER',
    status: 'ACTIVE',
    verificationChannel: 'sms',
    emailVerified: true,
    phoneVerified: true,
    passwordHash: SEED_HASH,
    previousPasswordHashes: [],
    createdAt: '2026-01-10T08:30:00Z',
    updatedAt: '2026-02-01T10:15:00Z',
    failedLoginAttempts: 0,
    lockoutUntil: null,
  },
  {
    id: 'user-eval-002',
    email: 'dr.tshepiso.setlhako@ceda.co.bw',
    phone: '72112233',
    firstName: 'Tshepiso',
    surname: 'Setlhako',
    fullName: 'Dr. Tshepiso Setlhako',
    omangOrPassport: '391214812',
    dob: '1982-04-22',
    district: 'South-East District',
    town: 'Gaborone',
    accountType: 'individual',
    role: 'EVALUATOR',
    status: 'ACTIVE',
    verificationChannel: 'email',
    emailVerified: true,
    phoneVerified: true,
    passwordHash: SEED_HASH,
    previousPasswordHashes: [],
    createdAt: '2025-11-05T09:00:00Z',
    updatedAt: '2026-01-15T14:20:00Z',
    failedLoginAttempts: 0,
    lockoutUntil: null,
  },
  {
    id: 'user-adj-003',
    email: 'kealeboga.masire@ceda.co.bw',
    phone: '73556677',
    firstName: 'Kealeboga',
    surname: 'Masire',
    fullName: 'Kealeboga Masire',
    omangOrPassport: '210915609',
    dob: '1976-11-09',
    district: 'South-East District',
    town: 'Gaborone',
    accountType: 'individual',
    role: 'ADJUDICATOR',
    status: 'ACTIVE',
    verificationChannel: 'sms',
    emailVerified: true,
    phoneVerified: true,
    passwordHash: SEED_HASH,
    previousPasswordHashes: [],
    createdAt: '2025-08-12T11:45:00Z',
    updatedAt: '2026-02-10T16:00:00Z',
    failedLoginAttempts: 0,
    lockoutUntil: null,
  },
  {
    id: 'user-adm-004',
    email: 'thabo.kebonang@ceda.co.bw',
    phone: '74998877',
    firstName: 'Thabo',
    surname: 'Kebonang',
    fullName: 'Thabo Kebonang',
    omangOrPassport: '552119803',
    dob: '1985-06-30',
    district: 'South-East District',
    town: 'Gaborone',
    accountType: 'individual',
    role: 'ADMIN',
    status: 'ACTIVE',
    verificationChannel: 'email',
    emailVerified: true,
    phoneVerified: true,
    passwordHash: SEED_HASH,
    previousPasswordHashes: [],
    createdAt: '2025-06-01T08:00:00Z',
    updatedAt: '2026-02-11T12:00:00Z',
    failedLoginAttempts: 0,
    lockoutUntil: null,
  },
  {
    id: 'user-stk-005',
    email: 'burs.monitor@gov.bw',
    phone: '75334455',
    firstName: 'Boikanyo',
    surname: 'Sechele',
    fullName: 'Boikanyo Sechele',
    omangOrPassport: '170822401',
    dob: '1988-02-14',
    district: 'North-East District',
    town: 'Francistown',
    accountType: 'individual',
    role: 'STAKEHOLDER',
    status: 'ACTIVE',
    verificationChannel: 'email',
    emailVerified: true,
    phoneVerified: true,
    passwordHash: SEED_HASH,
    previousPasswordHashes: [],
    createdAt: '2025-09-18T10:30:00Z',
    updatedAt: '2026-01-20T09:10:00Z',
    failedLoginAttempts: 0,
    lockoutUntil: null,
  },
];

function simulateLatency(ms = 300): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class AuthService {
  private users: Map<string, UserProfile> = new Map();
  private sessions: UserSession[] = [];
  private currentSessionId: string | null = null;
  private pendingDemoResetUserId: string | null = null;

  constructor() {
    this.loadFromStorage();
  }

  private isSeedAccount(user: UserProfile | undefined): boolean {
    if (!user) return false;
    if (user.id === 'user-super-admin') return true;
    const emailLower = (user.email || '').trim().toLowerCase();
    return DEFAULT_SEED_USERS.some(
      (seed) => seed.id === user.id || (emailLower && seed.email.toLowerCase() === emailLower)
    );
  }

  private findSeedUserByIdentifier(identifier: string): UserProfile | undefined {
    const clean = (identifier || '').trim().toLowerCase();
    if (!clean) return undefined;
    const rawDigits = clean.replace(/[\s\-+()]/g, '');
    const cleanPhoneInput =
      rawDigits.startsWith('267') && rawDigits.length >= 11 ? rawDigits.slice(3) : rawDigits;

    const candidates: UserProfile[] = [
      ...Array.from(this.users.values()).filter((u) => this.isSeedAccount(u)),
      ...DEFAULT_SEED_USERS,
    ];

    for (const seed of candidates) {
      const seedEmail = (seed.email || '').trim().toLowerCase();
      const seedPhone = (seed.phone || '').replace(/[\s\-+()]/g, '');
      const seedOmang = (seed.omangOrPassport || '').trim().toLowerCase();
      if (
        (seedEmail && seedEmail === clean) ||
        (seedPhone && cleanPhoneInput && seedPhone === cleanPhoneInput) ||
        (seedOmang && seedOmang === clean)
      ) {
        return this.users.get(seed.id) || seed;
      }
    }
    return undefined;
  }

  private async loadFromStorage() {
    try {
      const savedUsers = localStorage.getItem(STORAGE_USERS_KEY);
      if (savedUsers) {
        const parsed: UserProfile[] = JSON.parse(savedUsers);
        if (Array.isArray(parsed)) {
          parsed.forEach((u) => {
            if (u && u.id) this.users.set(u.id, u);
          });
        }
      }
      // Ensure all default demo seed accounts exist locally if not overridden by email
      let addedSeed = false;
      DEFAULT_SEED_USERS.forEach((seed) => {
        const existsByIdOrEmail = Array.from(this.users.values()).some(
          (u) => u.id === seed.id || u.email.toLowerCase() === seed.email.toLowerCase()
        );
        if (!existsByIdOrEmail) {
          this.users.set(seed.id, seed);
          addedSeed = true;
        }
      });
      if (!savedUsers || addedSeed) {
        this.saveUsers();
      }

      // Ensure demo admin Thabo Kebonang exists in local state
      const demoAdminSeed = DEFAULT_SEED_USERS.find((u) => u.id === 'user-adm-004');
      const hasThaboAdmin = Array.from(this.users.values()).some(
        (u) => u.email.toLowerCase() === 'thabo.kebonang@ceda.co.bw'
      );
      if (!hasThaboAdmin && demoAdminSeed) {
        this.users.set(demoAdminSeed.id, demoAdminSeed);
        this.saveUsers();
      }

      // Ensure default Super Admin exists in local state & Firestore if missing
      const adminExists = Array.from(this.users.values()).some((u) => u.role === 'ADMIN');
      if (!adminExists) {
        const superAdmin: UserProfile = {
          id: 'user-super-admin',
          email: 'thabo.kebonang@ceda.co.bw',
          phone: '74000000',
          firstName: 'Thabo',
          surname: 'Kebonang',
          fullName: 'Thabo Kebonang',
          omangOrPassport: '999999999',
          dob: '1980-01-01',
          district: 'South-East District',
          town: 'Gaborone',
          accountType: 'individual',
          role: 'ADMIN',
          status: 'ACTIVE',
          verificationChannel: 'email',
          emailVerified: true,
          phoneVerified: true,
          passwordHash: SEED_HASH,
          previousPasswordHashes: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          failedLoginAttempts: 0,
          lockoutUntil: null,
        };
        this.users.set(superAdmin.id, superAdmin);
        this.saveUsers();

        // Try syncing to Firestore
        try {
          await setDoc(doc(db, 'users', superAdmin.id), superAdmin);
        } catch {
          // ignore if offline
        }
      }

      const activeProject = firebaseConfig.projectId || '';
      const storedProject = localStorage.getItem(STORAGE_FIREBASE_PROJECT_KEY);
      if (storedProject && activeProject && storedProject !== activeProject) {
        localStorage.removeItem(STORAGE_CURRENT_SESSION_KEY);
        localStorage.removeItem(STORAGE_SESSIONS_KEY);
        this.sessions = [];
        this.currentSessionId = null;
      } else {
        const savedSessions = localStorage.getItem(STORAGE_SESSIONS_KEY);
        if (savedSessions) {
          this.sessions = JSON.parse(savedSessions);
        }

        const curSess = localStorage.getItem(STORAGE_CURRENT_SESSION_KEY);
        if (curSess) {
          this.currentSessionId = curSess;
        }
      }
      if (activeProject) {
        localStorage.setItem(STORAGE_FIREBASE_PROJECT_KEY, activeProject);
      }
    } catch {
      DEFAULT_SEED_USERS.forEach((u) => this.users.set(u.id, u));
    }
  }

  private saveUsers() {
    try {
      localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(Array.from(this.users.values())));
    } catch {
      // ignore
    }
  }

  private saveSessions() {
    try {
      localStorage.setItem(STORAGE_SESSIONS_KEY, JSON.stringify(this.sessions));
    } catch {
      // ignore
    }
  }

  public getSeedAccounts(): { role: UserRole; user: UserProfile; passwordHint: string }[] {
    return Array.from(this.users.values()).map((u) => ({
      role: u.role,
      user: u,
      passwordHint: 'Ceda#2026Demo',
    }));
  }

  public findUserByIdentifier(identifier: string): UserProfile | undefined {
    const clean = (identifier || '').trim().toLowerCase();
    if (!clean) return undefined;
    const rawDigits = clean.replace(/[\s\-+()]/g, '');
    const cleanPhoneInput =
      rawDigits.startsWith('267') && rawDigits.length >= 11 ? rawDigits.slice(3) : rawDigits;

    for (const user of this.users.values()) {
      const userEmail = typeof user.email === 'string' ? user.email.trim().toLowerCase() : '';
      const userRawPhone = typeof user.phone === 'string' ? user.phone.replace(/[\s\-+()]/g, '') : '';
      const userPhone =
        userRawPhone.startsWith('267') && userRawPhone.length >= 11
          ? userRawPhone.slice(3)
          : userRawPhone;
      const userOmang = typeof user.omangOrPassport === 'string' ? user.omangOrPassport.trim().toLowerCase() : '';

      if (
        (userEmail && userEmail === clean) ||
        (userPhone && cleanPhoneInput && userPhone === cleanPhoneInput) ||
        (userOmang && userOmang === clean)
      ) {
        return user;
      }
    }
    return undefined;
  }

  public getLatestPendingUser(): UserProfile | undefined {
    const list = Array.from(this.users.values());
    // Find latest pending or registered user
    return list.slice().reverse().find((u) => u.status === 'PENDING') || list[list.length - 1];
  }

  /**
   * Initialize or retrieve invisible reCAPTCHA verifier for phone OTP
   */
  public getRecaptchaVerifier(containerId = 'recaptcha-container'): RecaptchaVerifier | null {
    try {
      if (typeof window === 'undefined') return null;
      const container = document.getElementById(containerId);
      if (!container) {
        console.warn(`reCAPTCHA container '#${containerId}' not found in DOM.`);
        return null;
      }
      
      // If verifier exists, check if it's still attached to the current DOM container
      if (appRecaptchaVerifier) {
        try {
          appRecaptchaVerifier.clear();
        } catch {
          // ignore clear error
        }
        appRecaptchaVerifier = null;
      }

      appRecaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
        size: 'invisible',
        callback: () => {
          console.info('reCAPTCHA solved for phone auth');
        },
        'expired-callback': () => {
          console.warn('reCAPTCHA expired');
        },
      });

      return appRecaptchaVerifier;
    } catch (err) {
      console.warn('Failed to initialize RecaptchaVerifier:', err);
      return null;
    }
  }

  /**
   * 2. REGISTRATION (Real Firebase Auth + Firestore + Real Firebase OTP)
   */
  public async register(payload: RegisterRequest): Promise<RegisterResponse> {
    await simulateLatency(300);

    const email = payload.email.trim();
    const password = payload.password;
    const cleanPhone = (payload.phone || '').replace(/[\s\-\+]/g, '');
    const fullPhoneNumber = cleanPhone ? `+267${cleanPhone}` : '';
    const verificationChannel = ENABLE_SMS_VERIFICATION ? payload.verificationChannel : 'email';
    const newId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;

    let firebaseUid = newId;
    let isEmailVerificationSent = false;
    let verificationId: string | undefined = undefined;
    let verificationWarning: string | undefined = undefined;
    let createdAuthUser: User | null = null;

    // 1. Create account in Firebase Authentication with Email & Password
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      createdAuthUser = userCredential.user;
      firebaseUid = userCredential.user.uid;

      // 2a. If Email verification requested, trigger Firebase sendEmailVerification
      if (verificationChannel === 'email') {
        const actionCodeSettings = {
          url: `${window.location.origin}/otp-verification?target=${encodeURIComponent(email)}&channel=email`,
        };
        try {
          await sendEmailVerification(userCredential.user, actionCodeSettings);
          isEmailVerificationSent = true;
          console.info('Firebase verification email dispatched successfully to:', email);
        } catch (actionErr: any) {
          console.error(
            'Firebase sendEmailVerification with actionCodeSettings failed:',
            actionErr?.code || 'unknown',
            actionErr
          );
          try {
            await sendEmailVerification(userCredential.user);
            isEmailVerificationSent = true;
            verificationWarning =
              'Verification email sent, but the verification link may not redirect back to the app. After clicking the link in your email, return to this page to finish activating your account.';
          } catch (emailErr: any) {
            console.error(
              'Firebase fallback sendEmailVerification failed:',
              emailErr?.code || 'unknown',
              emailErr
            );
            verificationWarning =
              'Your account was created, but we could not send the verification email. Please try resending it on the next screen.';
          }
        }
      }
    } catch (err: any) {
      console.error('Firebase Auth registration error:', err);
      const code = err?.code || '';
      if (code === 'auth/email-already-in-use') {
        throw new Error('This email address is already registered. Please log in or use another email.');
      } else if (code === 'auth/invalid-email') {
        throw new Error('The email address provided is invalid.');
      } else if (code === 'auth/operation-not-allowed') {
        throw new Error('Email/password sign-in is not enabled in Firebase Console.');
      } else if (code === 'auth/weak-password') {
        throw new Error('Password does not meet Firebase strength requirements.');
      } else if (code === 'auth/unauthorized-domain') {
        throw new Error(
          'This hosting domain is not authorized in Firebase Authentication. Add it under Firebase Console → Authentication → Settings → Authorized domains.'
        );
      } else if (!firebaseConfig.apiKey.includes('MockKey')) {
        throw new Error(
          err?.message || 'Unable to register account in Firebase Authentication. Please try again.'
        );
      }
    }

    // 2b. If SMS channel requested and enabled via VITE_ENABLE_SMS_VERIFICATION, trigger Firebase Phone Auth with reCAPTCHA
    if (ENABLE_SMS_VERIFICATION && verificationChannel === 'sms' && fullPhoneNumber) {
      try {
        const verifier = this.getRecaptchaVerifier('recaptcha-container');
        if (verifier) {
          activeConfirmationResult = await signInWithPhoneNumber(auth, fullPhoneNumber, verifier);
          verificationId = activeConfirmationResult.verificationId;
          console.info('Firebase Phone Auth OTP dispatched to:', fullPhoneNumber);
        }
      } catch (phoneErr: any) {
        console.warn('Firebase signInWithPhoneNumber note (fallback to simulated OTP if SMS quota/format fails):', phoneErr?.message || phoneErr);
      }
    }

    const nowIso = new Date().toISOString();
    const newUser: UserProfile = {
      id: firebaseUid,
      email,
      phone: cleanPhone,
      firstName: payload.firstName,
      surname: payload.surname,
      fullName: `${payload.firstName} ${payload.surname}`,
      omangOrPassport: payload.omangOrPassport,
      dob: payload.dob,
      district: payload.district,
      town: payload.town,
      accountType: payload.accountType,
      role: 'SUBMITTER', // New registrations are always SUBMITTER
      status: 'PENDING',
      verificationChannel,
      emailVerified: false,
      phoneVerified: false,
      consent: {
        termsVersion: LEGAL.termsVersion,
        privacyVersion: LEGAL.privacyVersion,
        acceptedAt: nowIso,
        method: 'registration',
      },
      ...(payload.tradingName !== undefined ? { tradingName: payload.tradingName } : {}),
      ...(payload.cipaNumber !== undefined ? { cipaNumber: payload.cipaNumber } : {}),
      ...(payload.bursTin !== undefined ? { bursTin: payload.bursTin } : {}),
      createdAt: nowIso,
      updatedAt: nowIso,
      failedLoginAttempts: 0,
      lockoutUntil: null,
    };

    const firestoreUserDoc = {
      ...Object.fromEntries(Object.entries(newUser).filter(([, value]) => value !== undefined)),
      consent: {
        termsVersion: LEGAL.termsVersion,
        privacyVersion: LEGAL.privacyVersion,
        acceptedAt: serverTimestamp(),
        method: 'registration',
      },
    };

    // Save user profile to Firestore
    try {
      await setDoc(doc(db, 'users', firebaseUid), firestoreUserDoc);
    } catch (err) {
      console.error('Failed to save user profile to Firestore:', err);
      if (createdAuthUser) {
        try {
          await createdAuthUser.delete();
        } catch (cleanupErr) {
          console.error(
            'Failed to clean up Firebase Auth user after Firestore profile write failure:',
            cleanupErr
          );
        }
      }
      throw new Error(
        'We could not complete your registration because saving your profile failed. Please try again.'
      );
    }

    this.users.set(firebaseUid, newUser);
    this.saveUsers();

    const demoOtpEnabled = import.meta.env.VITE_ENABLE_DEMO_OTP === 'true';
    const demoOtpCode =
      ENABLE_SMS_VERIFICATION && verificationChannel === 'sms' && demoOtpEnabled ? '582491' : '';

    return {
      success: true,
      userId: firebaseUid,
      identifier: verificationChannel === 'sms' ? cleanPhone : email,
      channel: verificationChannel,
      message:
        verificationChannel === 'email'
          ? 'Account created in pending state. Verification email dispatched.'
          : `Account created in pending state. 6-digit code dispatched via ${verificationChannel.toUpperCase()}.`,
      nextStep: 'otp_verification',
      demoOtpCode,
      verificationId,
      isEmailVerificationSent,
      verificationWarning,
    };
  }

  /**
   * 3. OTP / EMAIL VERIFICATION (Real Firebase Verification + Firestore Activation)
   */
  public async verifyOtp(payload: VerifyOtpRequest): Promise<VerifyOtpResponse> {
    await simulateLatency(300);

    if (payload.channel === 'email') {
      if (auth && typeof auth.authStateReady === 'function') {
        await auth.authStateReady();
      }
      const currentUser = auth?.currentUser;
      if (!currentUser) {
        return {
          success: false,
          accountActivated: false,
          message: 'Please sign in again, then open the verification link.',
        };
      }

      try {
        await currentUser.reload();
      } catch (reloadErr) {
        console.error('Failed to reload Firebase user during email verification:', reloadErr);
        return {
          success: false,
          accountActivated: false,
          message: 'Could not verify your email status right now. Please try again.',
        };
      }

      if (!currentUser.emailVerified) {
        return {
          success: false,
          accountActivated: false,
          message: 'Your email is not verified yet. Click the link in the email first.',
        };
      }

      try {
        await currentUser.getIdToken(true);
      } catch (tokenErr) {
        console.error('Failed to refresh Firebase ID token after email verification:', tokenErr);
        return {
          success: false,
          accountActivated: false,
          message: 'Your email is verified, but we could not activate your account. Please try again.',
        };
      }

      const updatedAt = new Date().toISOString();
      try {
        await updateDoc(doc(db, 'users', currentUser.uid), {
          status: 'ACTIVE',
          emailVerified: true,
          updatedAt,
        });
      } catch (err) {
        console.error('Failed to activate user account in Firestore:', err);
        return {
          success: false,
          accountActivated: false,
          message: 'Your email is verified, but we could not activate your account. Please try again.',
        };
      }

      let existingUser =
        this.users.get(currentUser.uid) ||
        this.findUserByIdentifier(currentUser.email || payload.identifier);

      if (!existingUser) {
        try {
          const snap = await getDoc(doc(db, 'users', currentUser.uid));
          if (snap.exists()) {
            existingUser = {
              ...(snap.data() as unknown as UserProfile),
              id: currentUser.uid,
            };
          }
        } catch (fetchErr) {
          console.error('Failed to fetch activated user profile from Firestore:', fetchErr);
        }
      }

      const activatedUser: UserProfile = existingUser
        ? {
            ...existingUser,
            id: currentUser.uid,
            status: 'ACTIVE',
            emailVerified: true,
            updatedAt,
          }
        : {
            id: currentUser.uid,
            email: currentUser.email || payload.identifier,
            phone: '',
            firstName: currentUser.displayName?.split(' ')[0] || 'Portal',
            surname: currentUser.displayName?.split(' ').slice(1).join(' ') || 'User',
            fullName: currentUser.displayName || currentUser.email || 'Portal User',
            omangOrPassport: '',
            dob: '',
            district: '',
            town: '',
            accountType: 'individual',
            role: 'SUBMITTER',
            status: 'ACTIVE',
            verificationChannel: 'email',
            emailVerified: true,
            phoneVerified: false,
            createdAt: updatedAt,
            updatedAt,
            failedLoginAttempts: 0,
            lockoutUntil: null,
          };

      this.users.set(activatedUser.id, activatedUser);
      this.saveUsers();

      return {
        success: true,
        accountActivated: true,
        user: activatedUser,
        message: 'Account successfully verified and activated.',
      };
    }

    // SMS channel verification (disabled unless VITE_ENABLE_SMS_VERIFICATION === 'true')
    if (!ENABLE_SMS_VERIFICATION) {
      return {
        success: false,
        accountActivated: false,
        message: 'SMS verification is currently disabled. Please verify your account using your email link.',
      };
    }

    const user = this.findUserByIdentifier(payload.identifier);
    const demoOtpEnabled = import.meta.env.VITE_ENABLE_DEMO_OTP === 'true';
    const isDemoCode = demoOtpEnabled && payload.otpCode === '582491';
    let firebaseVerified = false;

    if (activeConfirmationResult && !isDemoCode) {
      try {
        const userCredential = await activeConfirmationResult.confirm(payload.otpCode);
        if (userCredential.user) {
          firebaseVerified = true;
        }
      } catch (confirmErr) {
        console.warn('Firebase confirmationResult.confirm failed:', confirmErr);
      }
    }

    const isCodeAccepted = firebaseVerified || isDemoCode;

    if (!isCodeAccepted) {
      return {
        success: false,
        accountActivated: false,
        attemptsRemaining: 2,
        message: 'Invalid verification code. Please check the 6-digit code sent to your device.',
      };
    }

    if (!user) {
      return {
        success: false,
        accountActivated: false,
        message: 'Account not found or verification session expired.',
      };
    }

    const updatedAt = new Date().toISOString();
    try {
      await updateDoc(doc(db, 'users', user.id), {
        status: 'ACTIVE',
        phoneVerified: true,
        updatedAt,
      });
    } catch (err) {
      console.error('Failed to activate SMS user account in Firestore:', err);
      return {
        success: false,
        accountActivated: false,
        message: 'Your phone is verified, but we could not activate your account. Please try again.',
      };
    }

    const activatedUser: UserProfile = {
      ...user,
      status: 'ACTIVE',
      phoneVerified: true,
      updatedAt,
    };
    this.users.set(activatedUser.id, activatedUser);
    this.saveUsers();

    return {
      success: true,
      accountActivated: true,
      user: activatedUser,
      message: 'Account successfully verified and activated.',
    };
  }

  public async resendOtp(
    identifier: string,
    channel: 'sms' | 'email'
  ): Promise<{
    success: boolean;
    message: string;
    cooldownSeconds: number;
    warning?: string;
    demoCode?: string;
  }> {
    await simulateLatency(300);

    // If channel is SMS, re-trigger Firebase phone auth (disabled unless VITE_ENABLE_SMS_VERIFICATION === 'true')
    if (channel === 'sms') {
      if (!ENABLE_SMS_VERIFICATION) {
        return {
          success: false,
          message: 'SMS verification is currently disabled. Please verify your account using your email link.',
          cooldownSeconds: 0,
        };
      }

      try {
        const cleanPhone = identifier.replace(/[\s\-\+]/g, '');
        const fullPhoneNumber = identifier.startsWith('+') ? identifier : `+267${cleanPhone}`;
        const verifier = this.getRecaptchaVerifier('recaptcha-container');
        if (verifier) {
          activeConfirmationResult = await signInWithPhoneNumber(auth, fullPhoneNumber, verifier);
          console.info('Firebase Phone Auth OTP re-sent to:', fullPhoneNumber);
        }
      } catch (err) {
        console.warn('Firebase resend Phone Auth note:', err);
      }

      const demoOtpEnabled = import.meta.env.VITE_ENABLE_DEMO_OTP === 'true';
      return {
        success: true,
        message: 'New verification code dispatched via SMS.',
        cooldownSeconds: 30,
        ...(demoOtpEnabled ? { demoCode: '582491' } : {}),
      };
    }

    // Channel is email: send verification email
    if (auth && typeof auth.authStateReady === 'function') {
      await auth.authStateReady();
    }
    const user = auth?.currentUser;
    if (!user) {
      return {
        success: false,
        message: 'Please sign in again before requesting another verification email.',
        cooldownSeconds: 0,
      };
    }

    const targetEmail = user.email || identifier;
    const actionCodeSettings = {
      url: `${window.location.origin}/otp-verification?target=${encodeURIComponent(targetEmail)}&channel=email`,
    };

    try {
      await sendEmailVerification(user, actionCodeSettings);
      console.info('Firebase verification email re-sent successfully to:', user.email);
      return {
        success: true,
        message: 'Verification email sent. Please check your inbox and click the link.',
        cooldownSeconds: 30,
      };
    } catch (err: any) {
      console.error(
        'Firebase resendEmailVerification with actionCodeSettings failed:',
        err?.code || 'unknown',
        err
      );
      if (err?.code === 'auth/too-many-requests') {
        return {
          success: false,
          message: 'Too many requests. Please wait a few moments before requesting another verification email.',
          cooldownSeconds: 60,
        };
      }

      try {
        await sendEmailVerification(user);
        return {
          success: true,
          message: 'Verification email dispatched.',
          warning:
            'Verification email sent, but the verification link may not redirect back to the app. After clicking the link in your email, return to this page to finish activating your account.',
          cooldownSeconds: 30,
        };
      } catch (fallbackErr: any) {
        console.error(
          'Firebase fallback resendEmailVerification failed:',
          fallbackErr?.code || 'unknown',
          fallbackErr
        );
        if (fallbackErr?.code === 'auth/too-many-requests') {
          return {
            success: false,
            message: 'Too many requests. Please wait a few moments before requesting another verification email.',
            cooldownSeconds: 60,
          };
        }
        return {
          success: false,
          message: 'Could not send verification email. Please try again in a moment.',
          cooldownSeconds: 30,
        };
      }
    }
  }

  /**
  * 4. LOGIN (Real Firebase Auth + Firestore)
  */
  public async login(payload: LoginRequest): Promise<LoginResponse> {
    await simulateLatency(400);

    if (payload.method === 'otp' || payload.method === 'biometric') {
      return {
        success: false,
        message: 'Please sign in with your email and password.',
      };
    }

    const identifier = payload.identifier.trim();
    const GENERIC_FAILURE = 'Email, phone or password incorrect';

    let user = this.findUserByIdentifier(identifier);
    let resolvedEmail = identifier;

    if (user?.email) {
      resolvedEmail = user.email;
    }

    if (payload.method === 'password' && payload.password) {
      try {
        const cred = await signInWithEmailAndPassword(auth, resolvedEmail, payload.password);
        const uid = cred.user.uid;
        const docRef = await getDoc(doc(db, 'users', uid));
        if (docRef.exists()) {
          const rawData = docRef.data() as Record<string, unknown>;
          const rawStatusUpper = String(rawData.status || '').trim().toUpperCase();
          const rawEmailVerified = Boolean(rawData.emailVerified);

          const isSuspendedOrLocked =
            rawStatusUpper === 'SUSPENDED' ||
            rawStatusUpper === 'DEACTIVATED' ||
            rawStatusUpper === 'LOCKED';
          const needsActivation = rawStatusUpper === 'PENDING';
          const needsEmailFlagSync = !rawEmailVerified && !isSuspendedOrLocked;

          if (cred.user.emailVerified && (needsActivation || needsEmailFlagSync)) {
            const syncUpdatedAt = new Date().toISOString();
            const syncPayload: Record<string, unknown> = {
              emailVerified: true,
              updatedAt: syncUpdatedAt,
              ...(needsActivation ? { status: 'ACTIVE' } : {}),
            };
            try {
              await cred.user.getIdToken(true);
              await updateDoc(doc(db, 'users', uid), syncPayload);
              if (needsActivation) {
                rawData.status = 'ACTIVE';
              }
              rawData.emailVerified = true;
              rawData.updatedAt = syncUpdatedAt;
            } catch (syncErr) {
              console.error(
                'Failed to sync email verification / activation status to Firestore on login:',
                syncErr
              );
            }
          }

          const rawRole = String(rawData.role || 'SUBMITTER').trim().toUpperCase();
          const normalizedRole: UserRole =
            rawRole === 'ADMINISTRATOR' || rawRole === 'SUPER_ADMIN'
              ? 'ADMIN'
              : rawRole === 'COMMITTEE STAKEHOLDER' || rawRole === 'COMMITTEE_STAKEHOLDER'
              ? 'STAKEHOLDER'
              : (['SUBMITTER', 'EVALUATOR', 'ADJUDICATOR', 'ADMIN', 'STAKEHOLDER'].includes(rawRole)
                  ? (rawRole as UserRole)
                  : 'SUBMITTER');
          user = {
            ...(rawData as unknown as UserProfile),
            id: uid,
            email: typeof rawData.email === 'string' ? rawData.email.trim() : cred.user.email || resolvedEmail,
            phone: typeof rawData.phone === 'string' ? rawData.phone : '',
            firstName: typeof rawData.firstName === 'string' ? rawData.firstName : '',
            surname: typeof rawData.surname === 'string' ? rawData.surname : '',
            omangOrPassport: typeof rawData.omangOrPassport === 'string' ? rawData.omangOrPassport : '',
            role: normalizedRole,
            status: String(rawData.status || 'ACTIVE').trim().toUpperCase() as UserProfile['status'],
          };
          this.users.set(uid, user);
          this.saveUsers();
        } else if (user) {
          user = { ...user, id: uid };
          this.users.set(uid, user);
          this.saveUsers();
        } else {
          const authEmail = cred.user.email || resolvedEmail;
          const displayName = cred.user.displayName || authEmail.split('@')[0] || 'Portal User';
          const parts = displayName.trim().split(/\s+/);
          user = {
            id: uid,
            email: authEmail,
            phone: '',
            firstName: parts[0] || displayName,
            surname: parts.slice(1).join(' '),
            fullName: displayName,
            displayName,
            omangOrPassport: '',
            dob: '',
            district: '',
            town: '',
            accountType: 'individual',
            role: 'SUBMITTER',
            status: 'ACTIVE',
            verificationChannel: 'email',
            emailVerified: Boolean(cred.user.emailVerified),
            phoneVerified: false,
            passwordHash: '',
            previousPasswordHashes: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            failedLoginAttempts: 0,
            lockoutUntil: null,
          };
          this.users.set(uid, user);
          this.saveUsers();
        }
      } catch (err: any) {
        const code = err?.code || '';
        console.warn('Firebase login auth warning:', code || err);

        // Surface explicit Firebase project/deployment misconfiguration errors cleanly
        if (code === 'auth/operation-not-allowed') {
          return {
            success: false,
            message:
              'Email/Password sign-in is disabled in Firebase Console (Authentication → Sign-in method).',
          };
        }
        if (code === 'auth/unauthorized-domain') {
          return {
            success: false,
            message:
              'This domain is not authorized in Firebase Authentication. Add your Vercel domain in Firebase Console → Authentication → Settings → Authorized domains.',
          };
        }
        if (code === 'auth/too-many-requests') {
          return {
            success: false,
            message: 'Too many failed sign-in attempts. Please wait a few minutes and try again.',
          };
        }
        if (code === 'auth/user-disabled') {
          return {
            success: false,
            message: 'This account has been disabled in Firebase Authentication.',
          };
        }

        // Fallback to local seed / cached demo password check (e.g. demo accounts or offline/mock key)
        const seedFallback =
          user ||
          DEFAULT_SEED_USERS.find(
            (u) =>
              u.email.toLowerCase() === resolvedEmail.toLowerCase() ||
              u.email.toLowerCase() === identifier.toLowerCase()
          );

        if (seedFallback && seedFallback.passwordHash) {
          const match = verifyPassword(payload.password, seedFallback.passwordHash);
          if (match) {
            user = seedFallback;
          } else {
            return { success: false, message: GENERIC_FAILURE };
          }
        } else if (code === 'auth/invalid-api-key' || firebaseConfig.apiKey.includes('MockKey')) {
          return {
            success: false,
            message:
              'Firebase configuration is missing in this deployment. Add your VITE_FIREBASE_* environment variables in Vercel and redeploy.',
          };
        } else if (code === 'auth/invalid-email' && !identifier.includes('@')) {
          return {
            success: false,
            message:
              'Please sign in with your registered email address (phone/Omang lookup requires a local profile on this device).',
          };
        } else {
          return { success: false, message: GENERIC_FAILURE };
        }
      }
    }

    if (!user) {
      // Check seed accounts
      user = DEFAULT_SEED_USERS.find(
        (u) => u.email.toLowerCase() === identifier.toLowerCase() || u.phone === identifier
      );
    }

    if (!user) {
      return { success: false, message: GENERIC_FAILURE };
    }

    const normalizedStatus = String(user.status || 'ACTIVE').toUpperCase();
    if (
      normalizedStatus === 'SUSPENDED' ||
      normalizedStatus === 'DEACTIVATED' ||
      normalizedStatus === 'LOCKED'
    ) {
      try {
        await signOut(auth);
      } catch {
        // ignore
      }
      return {
        success: false,
        message: 'Your account is suspended. Contact CEDA.',
      };
    }

    user = {
      ...user,
      status: normalizedStatus as UserProfile['status'],
      fullName:
        user.fullName ||
        user.displayName ||
        [user.firstName, user.surname].filter(Boolean).join(' ') ||
        user.email,
      lastLoginAt: new Date().toISOString(),
    };
    this.users.set(user.id, user);
    this.saveUsers();

    try {
      await setDoc(doc(db, 'users', user.id), { lastLoginAt: user.lastLoginAt }, { merge: true });
    } catch {
      // ignore if offline or rules disallow
    }

    this.createSession(user.id);
    const landingRoute = getLandingRouteForRole(user.role);

    return {
      success: true,
      user,
      role: user.role,
      token: `token-${user.id}-${Date.now()}`,
      landingRoute,
      message: 'Sign in successful.',
    };
  }

  /**
  * 5. FORGOT PASSWORD
  */
  public async requestReset(payload: RequestResetRequest): Promise<RequestResetResponse> {
    const rawIdentifier = payload.identifier.trim();
    if (!rawIdentifier) {
      throw new Error('Please enter your registered email address.');
    }

    const matchedSeed = this.findSeedUserByIdentifier(rawIdentifier);
    if (matchedSeed) {
      this.pendingDemoResetUserId = matchedSeed.id;
      const seedEmail = matchedSeed.email;
      if (payload.channel === 'email' && auth && !firebaseConfig.apiKey.includes('MockKey') && seedEmail) {
        try {
          auth.languageCode = 'en';
          await sendPasswordResetEmail(auth, seedEmail);
        } catch (err: unknown) {
          const code = (err as { code?: string })?.code || '';
          if (code !== 'auth/user-not-found') {
            console.warn('Seed account sendPasswordResetEmail note:', code || err);
          }
        }
      } else {
        await simulateLatency(300);
      }

      return {
        success: true,
        message: 'If an account exists, instructions have been sent.',
        deliveryChannel: payload.channel,
        resendCooldownSeconds: 45,
        demoToken: 'demo-valid-token',
        demoCode: '492815',
      };
    }

    this.pendingDemoResetUserId = null;

    let resolvedEmail = rawIdentifier.includes('@') ? rawIdentifier : '';
    if (!resolvedEmail) {
      const localMatch = this.findUserByIdentifier(rawIdentifier);
      if (localMatch?.email) {
        resolvedEmail = localMatch.email;
      } else if (db) {
        const cleanDigits = rawIdentifier.replace(/[\s\-\+]/g, '').replace(/^267/, '');
        try {
          const phoneSnap = await getDocs(
            query(collection(db, 'users'), where('phone', '==', cleanDigits))
          );
          if (!phoneSnap.empty) {
            const docData = phoneSnap.docs[0].data() as Record<string, unknown>;
            if (typeof docData.email === 'string' && docData.email.trim()) {
              resolvedEmail = docData.email.trim();
            }
          }
        } catch {
          // Firestore rules disallow unauthenticated user queries; user should enter email directly
        }
      }
    }

    if (!auth || firebaseConfig.apiKey.includes('MockKey')) {
      throw new Error(
        'Firebase Auth is not configured with live credentials. Check .env and restart the dev server.'
      );
    }
    if (!resolvedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resolvedEmail)) {
      throw new Error(
        'Please enter your registered email address so Firebase can dispatch the reset link.'
      );
    }

    try {
      auth.languageCode = 'en';
      await sendPasswordResetEmail(auth, resolvedEmail);
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code || '';
      if (code === 'auth/too-many-requests') {
        throw new Error(
          'Too many password reset requests. Please wait a few minutes and try again.'
        );
      }
      if (code === 'auth/invalid-email') {
        throw new Error('The email address entered is invalid.');
      }
      if (code === 'auth/network-request-failed') {
        throw new Error(
          'Network error while contacting Firebase Authentication. Check your connection and retry.'
        );
      }
      if (code === 'auth/operation-not-allowed') {
        throw new Error('Email/Password authentication is disabled in Firebase Console.');
      }
      if (code === 'auth/invalid-api-key') {
        throw new Error('Invalid Firebase API key configuration.');
      }
      if (code !== 'auth/user-not-found') {
        throw err instanceof Error ? err : new Error('Failed to dispatch password reset email.');
      }
    }

    return {
      success: true,
      message: 'If an account exists, instructions have been sent.',
      deliveryChannel: 'email',
      resendCooldownSeconds: 45,
    };
  }

  /**
  * 6. RESET PASSWORD
  */
  public async resetPassword(payload: ResetPasswordRequest): Promise<ResetPasswordResponse> {
    if (payload.tokenOrCode === 'expired-token') {
      return {
        success: false,
        isTokenExpired: true,
        message: 'This password reset link or verification code has expired.',
      };
    }

    const token = payload.tokenOrCode.trim();
    if (token === 'demo-valid-token') {
      await simulateLatency(400);
      const pendingUser = this.pendingDemoResetUserId
        ? this.users.get(this.pendingDemoResetUserId)
        : undefined;
      const targetSeed =
        pendingUser && this.isSeedAccount(pendingUser)
          ? pendingUser
          : this.users.get(DEFAULT_SEED_USERS[0].id) || DEFAULT_SEED_USERS[0];

      this.sessions = this.sessions.filter((s) => s.userId !== targetSeed.id);
      this.saveSessions();
      targetSeed.passwordHash = hashPassword(payload.newPassword);
      targetSeed.updatedAt = new Date().toISOString();
      this.users.set(targetSeed.id, targetSeed);
      this.saveUsers();
      this.pendingDemoResetUserId = null;

      return {
        success: true,
        message:
          'Seed/demo account password updated locally. All active sessions for this demo account have been terminated.',
      };
    }

    if (!token) {
      return {
        success: false,
        message:
          'Missing password reset link code. Please use the reset link sent to your email address.',
      };
    }

    if (!auth) {
      return {
        success: false,
        message: 'Firebase Authentication is not initialized.',
      };
    }

    try {
      await confirmPasswordReset(auth, token, payload.newPassword);
      return {
        success: true,
        message: 'Password successfully updated in Firebase Authentication.',
      };
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code || '';
      if (code === 'auth/expired-action-code' || code === 'auth/invalid-action-code') {
        return {
          success: false,
          isTokenExpired: true,
          message: 'This password reset link has expired or has already been used.',
        };
      }
      return {
        success: false,
        message:
          err instanceof Error
            ? err.message
            : 'Unable to update password with this reset code.',
      };
    }
  }

  /**
  * 8. SESSIONS
  */
  public createSession(userId: string): UserSession {
    const newSession: UserSession = {
      id: `sess-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      userId,
      device: navigator.userAgent.includes('Mobile') ? 'Mobile Device' : 'Desktop Workstation',
      browser: 'Chrome Browser (Active)',
      ipAddress: '168.167.12.44 (Botswana Mascom / Orange Gateway)',
      location: 'Gaborone CBD, South-East District',
      lastActive: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      isCurrent: true,
    };

    this.sessions.forEach((s) => {
      if (s.userId === userId) s.isCurrent = false;
    });

    this.sessions.unshift(newSession);
    this.currentSessionId = newSession.id;
    this.saveSessions();
    try {
      localStorage.setItem(STORAGE_CURRENT_SESSION_KEY, newSession.id);
    } catch {
      // ignore
    }
    return newSession;
  }

  public getActiveSessions(userId: string): UserSession[] {
    return this.sessions.filter((s) => s.userId === userId);
  }

  public terminateSession(sessionId: string, userId: string): void {
    this.sessions = this.sessions.filter((s) => s.id !== sessionId || s.userId !== userId);
    this.saveSessions();
  }

  public terminateAllOtherSessions(userId: string, keepCurrentSessionId: string): void {
    this.sessions = this.sessions.filter((s) => s.userId !== userId || s.id === keepCurrentSessionId);
    this.saveSessions();
  }

  public logout(): void {
    try {
      signOut(auth);
    } catch {
      // ignore
    }
    if (this.currentSessionId) {
      this.sessions = this.sessions.filter((s) => s.id !== this.currentSessionId);
      this.saveSessions();
    }
    this.currentSessionId = null;
    try {
      localStorage.removeItem(STORAGE_CURRENT_SESSION_KEY);
    } catch {
      // ignore
    }
  }

  public getCurrentSessionId(): string | null {
    return this.currentSessionId;
  }

  public getCurrentSessionUser(): UserProfile | null {
    if (!this.currentSessionId) return null;
    const sess = this.sessions.find((s) => s.id === this.currentSessionId);
    if (!sess) return null;
    return this.users.get(sess.userId) ?? null;
  }

  public touchSession(): void {
    if (!this.currentSessionId) return;
    const sess = this.sessions.find((s) => s.id === this.currentSessionId);
    if (sess) {
      sess.lastActive = new Date().toISOString();
      this.saveSessions();
    }
  }

  public demoSwitchRole(role: UserRole): { user: UserProfile; landingRoute: string } {
    const seed = this.getSeedAccounts().find((s) => s.role === role);
    const user = seed ? seed.user : DEFAULT_SEED_USERS[0];
    this.createSession(user.id);
    return {
      user,
      landingRoute: getLandingRouteForRole(user.role),
    };
  }
}

export const authService = new AuthService();
