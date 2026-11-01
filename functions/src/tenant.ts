import { getFirestore } from 'firebase-admin/firestore';
import type { WhatsappAccount } from './types';

export const db = () => getFirestore();

export const orgRef = (orgId: string) => db().collection('organizations').doc(orgId);
export const productsRef = (orgId: string) => orgRef(orgId).collection('products');
export const ordersRef = (orgId: string) => orgRef(orgId).collection('orders');
/**
 * Line items also live embedded on the order document (`items: OrderItem[]`)
 * for cheap reads — this normalized copy exists so an item can be queried or
 * updated on its own without touching the order. Written once, at order
 * creation, alongside the embedded array; never mutated afterward.
 */
export const orderItemsRef = (orgId: string, orderId: string) =>
  ordersRef(orgId).doc(orderId).collection('orderItems');
export const customersRef = (orgId: string) => orgRef(orgId).collection('customers');
export const customerRef = (orgId: string, customerId: string) => customersRef(orgId).doc(customerId);
/** One customer's full conversation, either direction — see the Inbox and worker/src/messages.ts. */
export const messagesRef = (orgId: string, customerId: string) => customerRef(orgId, customerId).collection('messages');
export const sessionsRef = (orgId: string) => orgRef(orgId).collection('sessions');
/** A record of each broadcast a merchant sends, for their own history — not the send queue itself. */
export const broadcastsRef = (orgId: string) => orgRef(orgId).collection('broadcasts');

/**
 * Every connected number lives here, keyed by its Meta phone_number_id — the
 * one thing every inbound webhook call carries. One read resolves both the
 * tenant and the credentials needed to reply. This is a top-level collection
 * with no client-facing Firestore rule, so the access token it holds is only
 * ever reachable through the Admin SDK these Cloud Functions run under.
 */
export const whatsappAccountsRef = () => db().collection('whatsappAccounts');
export const whatsappAccountRef = (phoneNumberId: string) => whatsappAccountsRef().doc(phoneNumberId);

/** Resolves an inbound phone_number_id straight to its tenant + credentials. */
export async function loadWhatsappAccount(phoneNumberId: string): Promise<WhatsappAccount | null> {
  const snap = await whatsappAccountRef(phoneNumberId).get();
  return snap.exists ? (snap.data() as WhatsappAccount) : null;
}

/** For code that only knows the tenant — order-status triggers, dashboard callables. */
export async function loadCredentialsForOrg(orgId: string): Promise<WhatsappAccount | null> {
  const org = await orgRef(orgId).get();
  const phoneNumberId = org.get('whatsapp.phoneNumberId') as string | undefined;
  if (!phoneNumberId) return null;
  return loadWhatsappAccount(phoneNumberId);
}

export interface OrgProfile {
  name: string;
  currency: string;
  deliveryFee: number;
  greeting: string;
  supportPhone?: string;
  /** Set by a platform admin — see functions/src/http/admin.ts's suspendMerchant. */
  suspended: boolean;
}

export async function loadOrgProfile(orgId: string): Promise<OrgProfile> {
  const snap = await orgRef(orgId).get();
  const data = snap.data() ?? {};
  return {
    name: (data.name as string) ?? 'Our shop',
    currency: (data.currency as string) ?? 'GHS',
    deliveryFee: (data.deliveryFee as number) ?? 0,
    greeting: (data.greeting as string) ?? 'Welcome! Browse our items and order right here.',
    supportPhone: data.supportPhone as string | undefined,
    suspended: (data.suspended as boolean) ?? false,
  };
}

export function money(amount: number, currency: string): string {
  return `${currency} ${amount.toFixed(2)}`;
}
