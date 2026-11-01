import { httpsCallable } from 'firebase/functions';
import { orderBy, query } from 'firebase/firestore';
import { broadcastsRef, functions } from '@/firebase';

export const broadcastsQuery = (orgId: string) =>
  query(broadcastsRef(orgId), orderBy('createdAt', 'desc'));

interface SendBroadcastInput {
  message: string;
  customerIds: string[];
}

interface SendBroadcastResult {
  ok: true;
  sentCount: number;
  failedCount: number;
}

const sendBroadcastCallable = httpsCallable<SendBroadcastInput, SendBroadcastResult>(
  functions,
  'sendBroadcast',
);

/**
 * Sends a WhatsApp message to each customer id and logs the attempt to
 * `organizations/{orgId}/broadcasts`. The access token never reaches the
 * browser — this only calls the Cloud Function that holds it.
 *
 * Deliberately not wrapped in the retry helper used elsewhere in this file's
 * siblings: if the messages already went out but the response was lost in
 * transit, a retry would send the same broadcast to every recipient a second
 * time. A failed send here should surface to the merchant, not get silently
 * retried.
 */
export async function sendBroadcast(message: string, customerIds: string[]): Promise<SendBroadcastResult> {
  const result = await sendBroadcastCallable({ message, customerIds });
  return result.data;
}
