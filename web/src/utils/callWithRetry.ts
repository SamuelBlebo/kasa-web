/**
 * Retries a Cloud Functions callable invocation on transient failures — a
 * cold-start blip, a dropped connection — never on errors that mean the
 * request itself was rejected (invalid-argument, permission-denied, the
 * "unimplemented" thrown by an unconfigured payment provider, etc.), since
 * retrying those fails the same way every time and just delays the error
 * reaching the user.
 */
const RETRYABLE_CODES = new Set(['functions/unavailable', 'functions/internal', 'functions/deadline-exceeded']);

function isRetryable(error: unknown): boolean {
  const code = (error as { code?: string } | undefined)?.code;
  return Boolean(code && RETRYABLE_CODES.has(code));
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function callWithRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (!isRetryable(error) || attempt === attempts - 1) throw error;
      await delay(300 * 2 ** attempt);
    }
  }
  throw lastError;
}
