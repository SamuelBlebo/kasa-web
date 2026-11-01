import { arrayUnion, limit, orderBy, query, serverTimestamp, Timestamp, updateDoc, where } from 'firebase/firestore';
import { orderRef, ordersRef } from '@/firebase';
import type { OrderStatus } from '@/types';

export const ordersQuery = (orgId: string) =>
  query(ordersRef(orgId), orderBy('createdAt', 'desc'));

export const recentOrdersQuery = (orgId: string, count = 5) =>
  query(ordersRef(orgId), orderBy('createdAt', 'desc'), limit(count));

export const pendingOrdersQuery = (orgId: string) =>
  query(ordersRef(orgId), where('status', '==', 'pending'), orderBy('createdAt', 'desc'));

/** A customer's order history — same composite index the bot's "2 Track Order" reply uses. */
export const customerOrdersQuery = (orgId: string, customerId: string) =>
  query(ordersRef(orgId), where('customerId', '==', customerId), orderBy('createdAt', 'desc'));

export interface OrderUpdatePatch {
  status?: OrderStatus;
  note?: string | null;
  riderName?: string | null;
  riderPhone?: string | null;
  estimatedDeliveryAt?: Timestamp | null;
}

/**
 * Covers every field a merchant can touch on an order — status, note, and the
 * delivery details (rider, ETA). Firestore rules name exactly these fields as
 * the allowed diff; nothing else about an order is client-writable. When
 * `status` moves, a Cloud Function watching this document sends the
 * customer's WhatsApp update, so the browser never holds a Meta token — and
 * it reads whatever rider/ETA already sit on the document at that moment, so
 * setting them in the same patch as the status change is what gets them into
 * that message. A status change also appends to `statusHistory` — the
 * delivery timeline OrderDetailModal renders — so a pure delivery-detail
 * save (no status in the patch) leaves history untouched.
 */
export function updateOrder(orgId: string, orderId: string, patch: OrderUpdatePatch) {
  const withHistory = patch.status
    ? { ...patch, statusHistory: arrayUnion({ status: patch.status, changedAt: Timestamp.now() }) }
    : patch;
  return updateDoc(orderRef(orgId, orderId), { ...withHistory, updatedAt: serverTimestamp() } as never);
}
