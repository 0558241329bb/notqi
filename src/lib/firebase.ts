import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromCache, getDocFromServer, initializeFirestore, setLogLevel } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Suppress noisy idle stream logs
setLogLevel('error');

const app = initializeApp(firebaseConfig);

// The app will break without providing the firestoreDatabaseId
export const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
}, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
