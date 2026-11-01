import { initializeApp, type FirebaseOptions } from 'firebase/app';
import { getAuth, connectAuthEmulator, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { env } from '@/utils/env';

const options: FirebaseOptions = {
  apiKey: env.firebase.apiKey,
  authDomain: env.firebase.authDomain,
  projectId: env.firebase.projectId,
  storageBucket: env.firebase.storageBucket,
  messagingSenderId: env.firebase.messagingSenderId,
  appId: env.firebase.appId,
  // Optional — only present once Firebase Analytics is enabled for this project. See utils/analyticsTracking.ts.
  ...(env.measurementId ? { measurementId: env.measurementId } : {}),
};

export const app = initializeApp(options);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
export const storage = getStorage(app);
// Must match REGION in functions/src/config.ts.
export const functions = getFunctions(app, 'europe-west1');

if (env.useEmulators) {
  // Ports match firebase.json; override with VITE_EMULATOR_PORTS="auth,firestore,storage,functions" if yours differ.
  const [authPort, firestorePort, storagePort, functionsPort] = (import.meta.env.VITE_EMULATOR_PORTS ?? '9099,8080,9199,5001').split(',').map(Number);
  connectAuthEmulator(auth, `http://127.0.0.1:${authPort}`, { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', firestorePort);
  connectStorageEmulator(storage, '127.0.0.1', storagePort);
  connectFunctionsEmulator(functions, '127.0.0.1', functionsPort);
}
