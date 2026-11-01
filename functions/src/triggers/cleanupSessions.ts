import { Timestamp } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { SESSION_TTL_MINUTES } from '../config';
import { db } from '../tenant';

/** Clears abandoned WhatsApp carts and processed webhook events older than 7 days. */
export const cleanupSessions = onSchedule({ schedule: 'every 6 hours', retryCount: 3 }, async () => {
  const sessionCutoff = Timestamp.fromMillis(Date.now() - SESSION_TTL_MINUTES * 60 * 1000);
  const eventCutoff = Timestamp.fromMillis(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [sessions, events] = await Promise.all([
    db().collectionGroup('sessions').where('updatedAt', '<', sessionCutoff).limit(400).get(),
    db().collection('webhookEvents').where('receivedAt', '<', eventCutoff).limit(400).get(),
  ]);
  if (sessions.empty && events.empty) return;
  const batch = db().batch();
  // Keep the handled-message ids so a very late Meta retry is still recognised; drop the cart.
  sessions.docs.forEach((d) => batch.update(d.ref, { step: 'idle', cart: [], pendingItemId: null, fulfilment: null, address: null, timeRequest: null, timeAt: null, updatedAt: Timestamp.now() }));
  events.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
  logger.info('Cleanup done', { sessions: sessions.size, events: events.size });
});
