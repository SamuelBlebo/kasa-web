import type { Timestamp } from 'firebase/firestore';

/**
 * `organizations/{orgId}/customers/{customerId}/messages/{messageId}` — one
 * per WhatsApp message, either direction. Written by the Worker (inbound,
 * and every bot reply) and by the `sendReply` callable (a merchant's manual
 * reply from the Inbox); never by the client directly — see firestore.rules.
 */
export interface Message {
  direction: 'in' | 'out';
  /** WhatsApp message type ("text", "interactive", "image", ...) or "text" for a merchant's manual reply. */
  type: string;
  /** Best-effort plain-text summary — the typed body, a button/list title, or null for a type with no useful text form. */
  body: string | null;
  waMessageId: string | null;
  createdAt: Timestamp;
}
