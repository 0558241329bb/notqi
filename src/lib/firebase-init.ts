import 'dotenv/config';

let db: any;
let FieldValueType: any;
let sdkType: 'admin' | 'client' = 'client';

async function initFirebaseInternal() {
  const serviceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT;

  if (serviceAccountBase64) {
    const admin = await import('firebase-admin');
    let serviceAccount: any;
    try {
      serviceAccount = JSON.parse(
        Buffer.from(serviceAccountBase64, 'base64').toString('utf-8'),
      );
    } catch {
      serviceAccount = JSON.parse(serviceAccountBase64);
    }

    if (admin.apps.length === 0) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id,
      });
    }
    const app = admin.apps[0];
    if (app && process.env.FIREBASE_DATABASE_ID) {
      const { getFirestore } = await import('firebase-admin/firestore');
      db = getFirestore(app, process.env.FIREBASE_DATABASE_ID);
    } else {
      db = admin.firestore();
    }
    FieldValueType = admin.firestore.FieldValue;
    sdkType = 'admin';
    console.log('Firebase Admin SDK initialized successfully');
  } else {
    const firebaseMod = await import('firebase/compat/app');
    await import('firebase/compat/firestore');
    const firebase = firebaseMod.default;

    const firebaseConfig = {
      apiKey: process.env.FIREBASE_API_KEY || '',
      authDomain: process.env.FIREBASE_AUTH_DOMAIN || '',
      projectId: process.env.FIREBASE_PROJECT_ID || '',
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || '',
      messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '',
      appId: process.env.FIREBASE_APP_ID || '',
    };

    const app = firebase.initializeApp(firebaseConfig);
    if (process.env.FIREBASE_DATABASE_ID) {
      db = (app.firestore as any)(process.env.FIREBASE_DATABASE_ID);
    } else {
      db = app.firestore();
    }
    FieldValueType = firebase.firestore.FieldValue;
    sdkType = 'client';
    console.log('Firebase Client SDK initialized (fallback)');
  }
}

let initPromise: Promise<void> | null = null;

export async function getFirestore() {
  if (!db) {
    if (!initPromise) initPromise = initFirebaseInternal();
    await initPromise;
  }
  return db;
}

export function serverTimestamp() {
  if (sdkType === 'admin') {
    return FieldValueType.serverTimestamp();
  }
  return FieldValueType.serverTimestamp();
}
