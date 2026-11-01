import { collection, doc, type CollectionReference, type DocumentReference } from 'firebase/firestore';
import { db } from './config';
import type {
  CatalogItem,
  Customer,
  DraftOrder,
  FeatureFlag,
  Invite,
  Member,
  Message,
  Order,
  Organization,
  Payment,
  PlatformAdmin,
  PlatformLog,
  StockMovement,
  UserProfile,
} from '@/types';

/**
 * Every tenant-owned path hangs off organizations/{orgId} and is built here
 * only (pattern kept from OrderFlow), so a query that forgets its tenant
 * cannot be written.
 */
const org = (orgId: string, ...rest: string[]) => ['organizations', orgId, ...rest] as const;
const col = <T>(...segments: readonly string[]) => collection(db, segments[0], ...segments.slice(1)) as CollectionReference<T>;
const ref = <T>(...segments: readonly string[]) => doc(db, segments[0], ...segments.slice(1)) as DocumentReference<T>;

export const userRef = (uid: string) => ref<UserProfile>('users', uid);
export const orgRef = (orgId: string) => ref<Organization>('organizations', orgId);
export const orgsRef = () => col<Organization>('organizations');
export const membersRef = (orgId: string) => col<Member>(...org(orgId, 'members'));
export const invitesRef = (orgId: string) => col<Invite>(...org(orgId, 'invites'));
export const itemsRef = (orgId: string) => col<CatalogItem>(...org(orgId, 'items'));
export const itemRef = (orgId: string, id: string) => ref<CatalogItem>(...org(orgId, 'items', id));
export const stockMovementsRef = (orgId: string) => col<StockMovement>(...org(orgId, 'stockMovements'));
export const customersRef = (orgId: string) => col<Customer>(...org(orgId, 'customers'));
export const customerRef = (orgId: string, waId: string) => ref<Customer>(...org(orgId, 'customers', waId));
export const messagesRef = (orgId: string, waId: string) => col<Message>(...org(orgId, 'customers', waId, 'messages'));
export const ordersRef = (orgId: string) => col<Order>(...org(orgId, 'orders'));
export const orderRef = (orgId: string, id: string) => ref<Order>(...org(orgId, 'orders', id));
export const draftOrdersRef = (orgId: string) => col<DraftOrder>(...org(orgId, 'draftOrders'));
export const paymentsRef = (orgId: string) => col<Payment>(...org(orgId, 'payments'));

export const platformAdminRef = (uid: string) => ref<PlatformAdmin>('platformAdmins', uid);
export const featureFlagsRef = () => col<FeatureFlag>('featureFlags');
export const featureFlagRef = (flagId: string) => ref<FeatureFlag>('featureFlags', flagId);
export const platformLogsRef = () => col<PlatformLog>('platformLogs');

/** Storage path for an item photo, tenant-scoped like everything else. */
export const itemImagePath = (orgId: string, itemId: string, fileName: string) => `organizations/${orgId}/items/${itemId}/${fileName}`;
