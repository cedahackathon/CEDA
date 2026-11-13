/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { doc, setDoc } from 'firebase/firestore';
import { auth, db, firebaseConfig } from '../config/firebase';
import { UserProfile } from '../types/auth';

/**
 * Seeds initial collections and test user records into Firestore so they appear in the Firebase Console.
 */
export async function seedFirestoreCollections(): Promise<{ success: boolean; message: string }> {
  if (!db || firebaseConfig.apiKey.includes('MockKey') || !auth?.currentUser) {
    return {
      success: true,
      message: 'Skipped remote Firestore seeding in local prototype mode.',
    };
  }
  try {
    const testUserId = 'test-user-botswana-001';
    const testUser: UserProfile = {
      id: testUserId,
      email: 'thabo.mogae@ceda-innovate.co.bw',
      phone: '71987654',
      firstName: 'Thabo',
      surname: 'Mogae',
      fullName: 'Thabo Mogae',
      omangOrPassport: '312984102',
      dob: '1992-05-14',
      district: 'South-East District',
      town: 'Gaborone',
      accountType: 'individual',
      role: 'SUBMITTER',
      status: 'ACTIVE',
      verificationChannel: 'email',
      emailVerified: true,
      phoneVerified: true,
      passwordHash: 'seeded-bcrypt-hash-placeholder',
      previousPasswordHashes: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      failedLoginAttempts: 0,
      lockoutUntil: null,
    };

    // Write test user to Firestore users collection
    try {
      await setDoc(doc(db, 'users', testUserId), testUser);
    } catch (e) {
      console.warn('Firestore seed user write note:', e);
    }

    // Write a sample submission record to initialize the submissions collection
    const sampleSubId = 'sub-sample-2026-001';
    try {
      await setDoc(doc(db, 'submissions', sampleSubId), {
        id: sampleSubId,
        trackingCode: 'CEDA-INN-2026-9999',
        submitterId: testUserId,
        title: 'Solar Water Pumping & Smart Drip Irrigation',
        sector: 'Agri-Tech & Food Security',
        district: 'South-East District',
        requestedCapital: 250000,
        currentStage: 1,
        status: 'UNDER_REVIEW',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('Firestore seed submission write note:', e);
    }

    return {
      success: true,
      message: 'Firestore seeding attempt completed.',
    };
  } catch (error) {
    console.error('Error seeding Firestore:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown Firestore seeding error.',
    };
  }
}
