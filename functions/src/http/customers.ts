import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
import { broadcastsRef, customerRef, loadCredentialsForOrg, messagesRef } from '../tenant';
import { sendText } from '../whatsapp/client';
import { broadcastInput, sendReplyInput } from '../types';
import { requireAdmin } from './guards';
import { checkRateLimit } from '../rateLimit';

/** How many WhatsApp sends run concurrently — a courtesy to Meta's rate limits, not a hard API cap. */
const BROADCAST_BATCH_SIZE = 10;

/** Each send costs real WhatsApp API usage — caps one org from firing off broadcasts back-to-back. */
const BROADCAST_LIMIT_PER_HOUR = 3;

/**
 * A customer doc's id is their WhatsApp id already (see engine.ts's
 * `customersRef(orgId).doc(ctx.waId)`), so no extra lookup is needed to get
 * a `to` address — and since every id is only ever read through this org's
 * own `customers` subcollection, there is no way to address someone else's
 * tenant here.
 *
 * WhatsApp's 24-hour customer service window still applies: a recipient who
 * hasn't messaged this number recently can only be reached with a
 * Meta-approved message template, not this free-text send. That is enforced
 * by Meta's Graph API itself — a send outside the window simply fails and
 * shows up in `failedCount` below, the same as any other delivery failure.
 */
export const sendBroadcast = onCall({ timeoutSeconds: 300 }, async (request) => {
  const { orgId, uid } = await requireAdmin(request.auth);
  const parsed = broadcastInput.safeParse(request.data);
  if (!parsed.success) throw new HttpsError('invalid-argument', 'Check the message and recipients.');

  await checkRateLimit(`broadcast:${orgId}`, BROADCAST_LIMIT_PER_HOUR, 3600);

  const { message, customerIds } = parsed.data;

  const creds = await loadCredentialsForOrg(orgId);
  if (!creds) throw new HttpsError('failed-precondition', 'Connect a WhatsApp number first.');

  let sentCount = 0;
  const failedIds: string[] = [];

  for (let i = 0; i < customerIds.length; i += BROADCAST_BATCH_SIZE) {
    const batch = customerIds.slice(i, i + BROADCAST_BATCH_SIZE);
    const results = await Promise.allSettled(batch.map((id) => sendText(creds, id, message)));
    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value.ok) sentCount += 1;
      else failedIds.push(batch[index]);
    });
  }

  await broadcastsRef(orgId).add({
    message,
    audienceSize: customerIds.length,
    sentCount,
    failedCount: failedIds.length,
    createdBy: uid,
    createdAt: FieldValue.serverTimestamp(),
  });

  logger.info('Broadcast sent', {
    orgId,
    audienceSize: customerIds.length,
    sentCount,
    failedCount: failedIds.length,
  });

  return { ok: true as const, sentCount, failedCount: failedIds.length };
});

/**
 * The Inbox's reply box — one customer, not a broadcast list, so it skips
 * broadcastsRef entirely and instead logs straight into that customer's own
 * `messages` subcollection (the same log the Worker writes bot replies and
 * inbound messages to) and clears unreadCount, since a merchant just
 * actively answered.
 */
export const sendReply = onCall(async (request) => {
  const { orgId } = await requireAdmin(request.auth);
  const parsed = sendReplyInput.safeParse(request.data);
  if (!parsed.success) throw new HttpsError('invalid-argument', 'Enter a message to send.');

  await checkRateLimit(`reply:${orgId}`, 60, 60);

  const { customerId, text } = parsed.data;
  const creds = await loadCredentialsForOrg(orgId);
  if (!creds) throw new HttpsError('failed-precondition', 'Connect a WhatsApp number first.');

  const result = await sendText(creds, customerId, text);
  if (!result.ok) throw new HttpsError('internal', 'WhatsApp would not accept that message.');

  await messagesRef(orgId, customerId).add({
    direction: 'out',
    type: 'text',
    body: text,
    waMessageId: null,
    createdAt: FieldValue.serverTimestamp(),
  });
  await customerRef(orgId, customerId).update({
    unreadCount: 0,
    lastMessageAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return { ok: true as const };
});
