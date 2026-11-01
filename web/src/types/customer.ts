import type { Timestamp } from 'firebase/firestore';
import type { Timestamps } from './common';

/**
 * Created from the inbound WhatsApp number — customers never sign up. The
 * document id (see `WithId<Customer>.id`) is that WhatsApp id; there is no
 * separate `waId` field to keep in sync with it.
 */
export interface Customer extends Timestamps {
  name: string;
  phone: string;
  address: string | null;
  orderCount: number;
  totalSpent: number;
  lastOrderAt: Timestamp | null;
  /** The only fields a merchant can write directly — see firestore.rules. */
  note: string | null;
  /** Bumped on every inbound WhatsApp message; reset to 0 when the Inbox opens the conversation or a reply is sent. */
  unreadCount: number;
  /** Either direction — set by every message, in or out, so the Inbox can sort by recent activity. */
  lastMessageAt: Timestamp | null;
}
