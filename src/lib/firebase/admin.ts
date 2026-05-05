import { initializeApp, cert, getApps, getApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';
import fs from 'fs';
import path from 'path';

let projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
let databaseId = "(default)";
let storageBucket = undefined;

try {
  const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  projectId = projectId || config.projectId;
  if (config.firestoreDatabaseId) databaseId = config.firestoreDatabaseId;
  if (config.storageBucket) storageBucket = config.storageBucket;
  console.log("Firebase Admin Initialized with Project:", projectId, "StorageBucket:", storageBucket);
} catch (err) {
  console.warn("Could not read firebase-applet-config.json");
}

const app = getApps().length > 0 ? getApp() : initializeApp({
  credential: applicationDefault(),
  projectId: projectId,
  storageBucket: storageBucket
});

export const adminDb = getFirestore(app, databaseId);
export const adminAuth = getAuth(app);
export const adminStorage = getStorage(app);
