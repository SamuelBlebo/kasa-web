/**
 * Reads environment variables once, at startup, so a missing key fails loudly
 * here instead of surfacing later as a confusing Firebase error.
 */
function required(key: keyof ImportMetaEnv): string {
  const value = import.meta.env[key];
  if (!value) {
    throw new Error(
      `Missing environment variable ${key}. Copy .env.example to .env.local and fill it in.`,
    );
  }
  return String(value);
}

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
  /**
   * All three empty until the platform owner has done the one-time Meta +
   * Worker setup in PLATFORM_SETUP.md — deliberately not `required()`, so a
   * fresh deploy still boots before that setup is finished. WhatsAppPage
   * shows a calm "not configured" state rather than a broken button when
   * any of these are missing; a merchant should never see a raw error.
   */
  meta: {
    appId: import.meta.env.VITE_META_APP_ID ?? '',
    configId: import.meta.env.VITE_META_CONFIGURATION_ID ?? '',
  },
  /** The deployed Cloudflare Worker's base URL — see worker/README.md. Embedded Signup's exchange endpoint lives at `${whatsappWorkerUrl}/embedded-signup/exchange`. */
  whatsappWorkerUrl: import.meta.env.VITE_WHATSAPP_WORKER_URL ?? '',
  /** Empty until a Sentry project exists — see utils/monitoring.ts. */
  sentryDsn: import.meta.env.VITE_SENTRY_DSN ?? '',
  /** Empty until Firebase Analytics is enabled for this project — see utils/analyticsTracking.ts. */
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID ?? '',
} as const;
