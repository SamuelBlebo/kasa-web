import { Timestamp } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { onRequest } from 'firebase-functions/v2/https';
import { META_APP_SECRET, WHATSAPP_VERIFY_TOKEN } from '../config';
import { loadWhatsappAccount, webhookEventRef, whatsappAccountRef } from '../tenant';
import { handleInbound, type InboundMessage } from './bot';
import { wa } from './client';
import { verifyMetaSignature } from './signature';

interface WebhookBody {
  entry?: Array<{
    changes?: Array<{
      value?: {
        metadata?: { phone_number_id?: string };
        messages?: InboundMessage[];
        contacts?: Array<{ profile?: { name?: string } }>;
      };
    }>;
  }>;
}

/**
 * One webhook URL for every merchant on the platform (configure it once in
 * the Meta App). It only verifies and enqueues: each inbound message becomes
 * webhookEvents/{waMessageId}, created with create() so a Meta retry of the
 * same message is a no-op. Meta gets its 200 in milliseconds; the bot runs in
 * processWhatsappEvent below.
 */
export const whatsappWebhook = onRequest({ secrets: [META_APP_SECRET, WHATSAPP_VERIFY_TOKEN], minInstances: 0 }, async (req, res) => {
  if (req.method === 'GET') {
    const ok = req.query['hub.mode'] === 'subscribe' && req.query['hub.verify_token'] === WHATSAPP_VERIFY_TOKEN.value();
    res.status(ok ? 200 : 403).send(ok ? String(req.query['hub.challenge'] ?? '') : 'Verification failed');
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).send('Method not allowed');
    return;
  }

  const raw = (req as unknown as { rawBody?: Buffer }).rawBody;
  if (!raw || !verifyMetaSignature(raw, req.get('x-hub-signature-256'), META_APP_SECRET.value())) {
    logger.warn('Rejected WhatsApp webhook with a bad signature');
    res.status(401).send('Invalid signature');
    return;
  }

  const body = req.body as WebhookBody;
  const writes: Promise<unknown>[] = [];
  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      const phoneNumberId = value?.metadata?.phone_number_id;
      if (!phoneNumberId) continue;
      for (const message of value?.messages ?? []) {
        writes.push(
          webhookEventRef(message.id)
            .create({
              phoneNumberId,
              message,
              profileName: value?.contacts?.[0]?.profile?.name ?? '',
              receivedAt: Timestamp.now(),
            })
            .catch((err: { code?: number }) => {
              if (err.code !== 6) throw err; // 6 = ALREADY_EXISTS: a retry we already queued.
            }),
        );
      }
    }
  }
  try {
    await Promise.all(writes);
    res.status(200).send('EVENT_RECEIVED');
  } catch (err) {
    logger.error('Could not enqueue webhook events', err);
    res.status(500).send('Retry later'); // Meta retries; create() keeps it idempotent.
  }
});

export const processWhatsappEvent = onDocumentCreated({ document: 'webhookEvents/{eventId}', retry: false }, async (event) => {
  const data = event.data?.data();
  if (!data) return;
  const account = await loadWhatsappAccount(data.phoneNumberId as string);
  if (!account) {
    logger.warn('Inbound message for a number no merchant has connected', { phoneNumberId: data.phoneNumberId });
    return;
  }
  if (account.webhookStatus !== 'verified') {
    await whatsappAccountRef(account.phoneNumberId).update({ webhookStatus: 'verified' });
  }
  const message = data.message as InboundMessage;
  await wa.markRead(account, message.id);
  await handleInbound(account, message, (data.profileName as string) ?? '');
  await event.data?.ref.update({ processedAt: Timestamp.now(), organizationId: account.organizationId });
});
