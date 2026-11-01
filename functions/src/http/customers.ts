import { FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { z } from 'zod';
import { checkRateLimit } from '../rateLimit';
import { broadcastsRef, loadCredentialsForOrg, orgRef } from '../tenant';
import { Outbox } from '../whatsapp/client';
import { parse, requireMember } from './guards';

const BATCH = 10;

/**
 * Promotions to a list of customers (ported from OrderFlow). Meta only lets
 * free-form text reach people who messaged in the last 24 hours; for older
 * customers this needs an approved marketing template — sends that Meta
 * refuses are counted as failed, never retried blindly. Growth plan and up.
 */
export const sendBroadcast = onCall({ timeoutSeconds: 300 }, async (request) => {
  const { orgId, uid } = await requireMember(request.auth, 'broadcasts.send');
  const { message, customerIds } = parse(
    z.object({ message: z.string().trim().min(1).max(1000), customerIds: z.array(z.string().min(5)).min(1).max(300) }),
    request.data,
    'Check the message and who it goes to.',
  );
  const org = await orgRef(orgId).get();
  if (!['growth', 'pro'].includes(org.get('subscription.plan') as string)) {
    throw new HttpsError('failed-precondition', 'Promotions are on the Growth plan and above.');
  }
  await checkRateLimit(`broadcast:${orgId}`, 3, 3600);
  const creds = await loadCredentialsForOrg(orgId);
  if (!creds) throw new HttpsError('failed-precondition', 'Connect a WhatsApp number first.');

  let sent = 0;
  let failed = 0;
  for (let i = 0; i < customerIds.length; i += BATCH) {
    const results = await Promise.allSettled(customerIds.slice(i, i + BATCH).map((id) => new Outbox(creds, orgId, id, 'staff', uid).text(message)));
    results.forEach((r) => (r.status === 'fulfilled' && r.value.ok ? sent++ : failed++));
  }
  await broadcastsRef(orgId).add({ message, audienceSize: customerIds.length, sentCount: sent, failedCount: failed, createdBy: uid, createdAt: FieldValue.serverTimestamp() });
  logger.info('Broadcast sent', { orgId, sent, failed });
  return { sentCount: sent, failedCount: failed };
});
