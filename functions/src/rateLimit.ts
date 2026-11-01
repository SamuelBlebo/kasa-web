import { FieldValue } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';
import { db } from './tenant';

/**
 * A fixed-window rate limiter backed by Firestore — proportionate to this
 * app's call volume (a handful of admin/merchant/bot actions per key, not a
 * high-throughput API that would need Redis). Each key gets its own document
 * under `rateLimits/`; a window resets itself once expired, so there is no
 * cleanup job to run. Throws `resource-exhausted` when the limit is hit —
 * callers decide whether that should surface to a user or just get logged
 * and swallowed (see engine.ts's per-customer limit).
 */
export async function checkRateLimit(key: string, limit: number, windowSeconds: number): Promise<void> {
  const ref = db().collection('rateLimits').doc(key);
  const now = Date.now();

  await db().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const windowStart = (snap.get('windowStart') as number) ?? 0;
    const count = (snap.get('count') as number) ?? 0;
    const windowExpired = now - windowStart > windowSeconds * 1000;

    if (windowExpired) {
      tx.set(ref, { windowStart: now, count: 1, updatedAt: FieldValue.serverTimestamp() });
      return;
    }

    if (count >= limit) {
      throw new HttpsError('resource-exhausted', 'Too many requests — please try again shortly.');
    }

    tx.update(ref, { count: count + 1, updatedAt: FieldValue.serverTimestamp() });
  });
}
