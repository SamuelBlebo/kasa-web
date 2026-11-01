/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN: string;
  readonly VITE_FIREBASE_PROJECT_ID: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string;
  readonly VITE_FIREBASE_APP_ID: string;
  readonly VITE_USE_FIREBASE_EMULATORS?: string;
  /** Platform-owner one-time setup (PLATFORM_SETUP.md) — WhatsAppPage shows a "not configured" state until all three of these plus VITE_WHATSAPP_WORKER_URL are set. */
  readonly VITE_META_APP_ID?: string;
  readonly VITE_META_CONFIGURATION_ID?: string;
  /** The deployed Cloudflare Worker's base URL — see worker/README.md and PLATFORM_SETUP.md. */
  readonly VITE_WHATSAPP_WORKER_URL?: string;
  /** Optional — enables Sentry error reporting when set. See utils/monitoring.ts. */
  readonly VITE_SENTRY_DSN?: string;
  /** Optional — enables Firebase Analytics pageview tracking when set. See utils/analyticsTracking.ts. */
  readonly VITE_FIREBASE_MEASUREMENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
