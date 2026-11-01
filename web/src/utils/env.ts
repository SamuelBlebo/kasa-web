function required(key: keyof ImportMetaEnv): string {
  const value = import.meta.env[key];
  if (!value) throw new Error(`Missing environment variable ${key}. Copy .env.example to .env.local and fill it in.`);
  return String(value);
}

/** Fails at startup with a readable message instead of a confusing Firebase error later. */
export const env = {
  firebase: {
    apiKey: required('VITE_FIREBASE_API_KEY'),
    authDomain: required('VITE_FIREBASE_AUTH_DOMAIN'),
    projectId: required('VITE_FIREBASE_PROJECT_ID'),
    storageBucket: required('VITE_FIREBASE_STORAGE_BUCKET'),
    messagingSenderId: required('VITE_FIREBASE_MESSAGING_SENDER_ID'),
    appId: required('VITE_FIREBASE_APP_ID'),
  },
  useEmulators: import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true',
  /** Both needed for "Connect WhatsApp" (Meta Embedded Signup). Blank = a calm "not set up yet" state. */
  meta: {
    appId: import.meta.env.VITE_META_APP_ID ?? '',
    configId: import.meta.env.VITE_META_CONFIGURATION_ID ?? '',
  },
  sentryDsn: import.meta.env.VITE_SENTRY_DSN ?? '',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID ?? '',
} as const;
