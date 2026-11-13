/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { doc, getDocFromServer, getFirestore } from 'firebase/firestore';
import appletConfig from '../../firebase-applet-config.json';

const firebaseConfig = {
  apiKey: appletConfig.apiKey || import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyMockKeyForDevAndTestingOnly00000',
  authDomain: appletConfig.authDomain || import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'ceda-innovation-portal.firebaseapp.com',
  projectId: appletConfig.projectId || import.meta.env.VITE_FIREBASE_PROJECT_ID || 'ceda-innovation-portal',
  storageBucket: appletConfig.storageBucket || import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'ceda-innovation-portal.appspot.com',
  messagingSenderId: appletConfig.messagingSenderId || import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '123456789012',
  appId: appletConfig.appId || import.meta.env.VITE_FIREBASE_APP_ID || '1:123456789012:web:abcdef123456',
};

let app: any = null;
let auth: any = null;
let db: any = null;

try {
  app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  auth = getAuth(app);
  db = appletConfig.firestoreDatabaseId
    ? getFirestore(app, appletConfig.firestoreDatabaseId)
    : getFirestore(app);

  // Validate connection to Firestore server on boot
  getDocFromServer(doc(db, 'test', 'connection')).catch((error: unknown) => {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  });
} catch (err) {
  console.warn('Firebase initialization warning (using local fallback mode):', err);
}

export { app, auth, db, firebaseConfig };
export default app;
