import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import type { WhatsappAccount } from './domain/model';

if (getApps().length === 0) initializeApp();

/**
 * Every tenant-owned path is built here and nowhere else, so a query that
 * forgets its organization cannot be written by accident.
 */
export const db = () => getFirestore();

export const userRef = (uid: string) => db().collection('users').doc(uid);
export const orgRef = (orgId: string) => db().collection('organizations').doc(orgId);
export const membersRef = (orgId: string) => orgRef(orgId).collection('members');
export const invitesRef = (orgId: string) => orgRef(orgId).collection('invites');
export const itemsRef = (orgId: string) => orgRef(orgId).collection('items');
export const stockMovementsRef = (orgId: string) => orgRef(orgId).collection('stockMovements');
export const customersRef = (orgId: string) => orgRef(orgId).collection('customers');
export const customerRef = (orgId: string, waId: string) => customersRef(orgId).doc(waId);
export const messagesRef = (orgId: string, waId: string) => customerRef(orgId, waId).collection('messages');
export const ordersRef = (orgId: string) => orgRef(orgId).collection('orders');
export const draftOrdersRef = (orgId: string) => orgRef(orgId).collection('draftOrders');
export const paymentsRef = (orgId: string) => orgRef(orgId).collection('payments');
export const paymentRefsRef = (orgId: string) => orgRef(orgId).collection('paymentRefs');
export const sessionsRef = (orgId: string) => orgRef(orgId).collection('sessions');
export const broadcastsRef = (orgId: string) => orgRef(orgId).collection('broadcasts');
export const auditLogRef = (orgId: string) => orgRef(orgId).collection('auditLog');

/** Platform-level, functions-only collections. */
export const whatsappAccountRef = (phoneNumberId: string) => db().collection('whatsappAccounts').doc(phoneNumberId);
export const webhookEventRef = (id: string) => db().collection('webhookEvents').doc(id);
export const globalInviteRef = (emailKey: string) => db().collection('invites').doc(emailKey);

export async function loadWhatsappAccount(phoneNumberId: string): Promise<WhatsappAccount | null> {
  const snap = await whatsappAccountRef(phoneNumberId).get();
  return snap.exists ? (snap.data() as WhatsappAccount) : null;
}

export async function loadCredentialsForOrg(orgId: string): Promise<WhatsappAccount | null> {
  const org = await orgRef(orgId).get();
  const phoneNumberId = org.get('whatsapp.phoneNumberId') as string | undefined;
  return phoneNumberId ? loadWhatsappAccount(phoneNumberId) : null;
}

/** "+233 24 411 8802" / "0244118802" → "233244118802" (WhatsApp's wa_id form). */
export function toWaId(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('0') && digits.length === 10) return `233${digits.slice(1)}`;
  return digits;
}
