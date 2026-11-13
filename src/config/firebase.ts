/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { doc, getDocFromServer, getFirestore } from 'firebase/firestore';
import appletConfig from '../../firebase-applet-config.json';

const envApiKey = import.meta.env.VITE_FIREBASE_API_KEY?.trim();
const envProjectId = import.meta.env.VITE_FIREBASE_PROJECT_ID?.trim();
const hasEnvFirebaseConfig = Boolean(
  envApiKey && envProjectId && !envApiKey.includes('MockKey')
);

const firebaseConfig = hasEnvFirebaseConfig
  ? {
      apiKey: envApiKey as string,
      authDomain:
        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN?.trim() ||
        `${envProjectId}.firebaseapp.com`,
      projectId: envProjectId as string,
      storageBucket:
        import.meta.env.VITE_FIREBASE_STORAGE_BUCKET?.trim() ||
        `${envProjectId}.firebasestorage.app`,
      messagingSenderId:
        import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID?.trim() || '',
      appId: import.meta.env.VITE_FIREBASE_APP_ID?.trim() || '',
    }
  : {
      apiKey: appletConfig.apiKey || 'AIzaSyMockKeyForDevAndTestingOnly00000',
      authDomain:
        appletConfig.authDomain || 'ceda-innovation-portal.firebaseapp.com',
      projectId: appletConfig.projectId || 'ceda-innovation-portal',
      storageBucket:
        appletConfig.storageBucket || 'ceda-innovation-portal.appspot.com',
      messagingSenderId: appletConfig.messagingSenderId || '123456789012',
      appId: appletConfig.appId || '1:123456789012:web:abcdef123456',
    };

const activeDatabaseId = hasEnvFirebaseConfig
  ? import.meta.env.VITE_FIREBASE_DATABASE_ID?.trim() || undefined
  : appletConfig.projectId === firebaseConfig.projectId &&
      appletConfig.firestoreDatabaseId
    ? appletConfig.firestoreDatabaseId
    : undefined;

let app: any = null;
let auth: any = null;
let db: any = null;

try {
  app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  auth = getAuth(app);
  db = activeDatabaseId ? getFirestore(app, activeDatabaseId) : getFirestore(app);

  // Validate connection to Firestore server on boot when configured
  if (!firebaseConfig.apiKey.includes('MockKey')) {
    getDocFromServer(doc(db, 'test', 'connection')).catch((error: unknown) => {
      if (error instanceof Error && error.message.includes('the client is offline')) {
        console.error('Please check your Firebase configuration.');
      }
    });
  }
} catch (err) {
  console.warn('Firebase initialization warning (using local fallback mode):', err);
}

export { app, auth, db, firebaseConfig };
export default app;
