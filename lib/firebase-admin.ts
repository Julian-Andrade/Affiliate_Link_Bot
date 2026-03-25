import * as admin from 'firebase-admin';
import firebaseConfig from '../firebase-applet-config.json';

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: firebaseConfig.projectId,
  });
}

import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

export const adminDb = getFirestore(admin.app(), firebaseConfig.firestoreDatabaseId);
export const adminAuth = getAuth(admin.app());
