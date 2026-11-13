/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
const hasValidKey = apiKey && apiKey.length > 5 && !apiKey.includes('placeholder');

// Firebase configuration using environment variables or safe defaults
const firebaseConfig = {
  apiKey: hasValidKey ? apiKey : 'AIzaSyMockKeyForDevAndTestingOnly00000',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'ceda-innovation-portal.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'ceda-innovation-portal',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'ceda-innovation-portal.appspot.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '123456789012',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:123456789012:web:abcdef123456'
};

let app: any = null;
let auth: any = null;
let db: any = null;

try {
  app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  auth = getAuth(app);
  db = getFirestore(app);
} catch (err) {
  console.warn('Firebase initialization warning (using local fallback mode):', err);
}

export { app, auth, db, firebaseConfig };
export default app;
