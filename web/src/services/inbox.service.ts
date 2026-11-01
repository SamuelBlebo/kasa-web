import { httpsCallable } from 'firebase/functions';
import { orderBy, query, serverTimestamp, updateDoc } from 'firebase/firestore';
import { customerRef, customersRef, functions, messagesRef } from '@/firebase';

/** Conversation list, most recently active first — including customers who have never ordered, only messaged. */
export const inboxQuery = (orgId: string) => query(customersRef(orgId), orderBy('lastMessageAt', 'desc'));

/** One customer's full thread, oldest first. */
export const messagesQuery = (orgId: string, customerId: string) =>
  query(messagesRef(orgId, customerId), orderBy('createdAt', 'asc'));

/** Opening a conversation in the Inbox counts as read — the other way unreadCount clears is sendReply, below. */
export function markConversationRead(orgId: string, customerId: string) {
  return updateDoc(customerRef(orgId, customerId), { unreadCount: 0, updatedAt: serverTimestamp() } as never);
}

interface SendReplyResult {
  ok: true;
}

const sendReplyCallable = httpsCallable<{ customerId: string; text: string }, SendReplyResult>(functions, 'sendReply');

/**
 * A merchant's manual reply from the Inbox — not the bot, not a broadcast.
 * The access token never reaches the browser; this only calls the Cloud
 * Function that holds it, which also logs the message and clears unreadCount.
 */
export async function sendReply(customerId: string, text: string): Promise<void> {
  await sendReplyCallable({ customerId, text });
}
