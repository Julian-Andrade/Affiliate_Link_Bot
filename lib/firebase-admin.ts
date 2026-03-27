import * as admin from 'firebase-admin';
import firebaseConfig from '../firebase-applet-config.json';

if (!admin.apps.length) {
  let credential = admin.credential.applicationDefault();
  
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    try {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      credential = admin.credential.cert(serviceAccount);
      console.log('Using FIREBASE_SERVICE_ACCOUNT_KEY for admin credentials.');
    } catch (error) {
      console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY. Falling back to applicationDefault.', error);
    }
  } else {
    console.warn('FIREBASE_SERVICE_ACCOUNT_KEY is not set. Using applicationDefault(). This may cause Permission Denied errors.');
  }

  admin.initializeApp({
    projectId: firebaseConfig.projectId,
    credential,
  });
}

import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

export const adminDb = getFirestore(admin.app(), firebaseConfig.firestoreDatabaseId);
export const adminAuth = getAuth(admin.app());
