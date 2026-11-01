import * as Sentry from '@sentry/react';
import { env } from './env';

/**
 * No-ops entirely with no `VITE_SENTRY_DSN` set (the default) — Sentry's
 * SDK is still bundled either way, but never talks to the network unless
 * configured. Cloud Functions need no equivalent setup: uncaught exceptions
 * there already go to Google Cloud's Error Reporting automatically, no
 * config required — see PRODUCTION_CHECKLIST.md.
 */
export function initErrorMonitoring(): void {
  if (!env.sentryDsn) return;
  Sentry.init({ dsn: env.sentryDsn, tracesSampleRate: 0 });
}

/** Called from ErrorBoundary — a no-op (same as Sentry.init) when monitoring isn't configured. */
export function reportError(error: Error, extra?: Record<string, unknown>): void {
  if (!env.sentryDsn) return;
  Sentry.captureException(error, extra ? { extra } : undefined);
}
