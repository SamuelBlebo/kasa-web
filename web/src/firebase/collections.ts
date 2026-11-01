import {
  collection,
  doc,
  type CollectionReference,
  type DocumentReference,
} from 'firebase/firestore';
import { db } from './config';
import type {
  Broadcast,
  Customer,
  FeatureFlag,
  Message,
  Order,
  OrderItem,
  Organization,
  PlatformAdmin,
  PlatformLog,
  Product,
  UserProfile,
} from '@/types';

/**
 * Every tenant-owned collection hangs off /organizations/{orgId}.
 * Nothing else in the app builds a Firestore path by hand, so tenant scoping
 * is impossible to forget. platformAdmins/featureFlags/platformLogs are the
 * deliberate exception — platform-admin concerns, never tenant-scoped.
 */
export const paths = {
  organizations: 'organizations',
  users: 'users',
  products: 'products',
  customers: 'customers',
  orders: 'orders',
  orderItems: 'orderItems',
  broadcasts: 'broadcasts',
  messages: 'messages',
  platformAdmins: 'platformAdmins',
  featureFlags: 'featureFlags',
  platformLogs: 'platformLogs',
} as const;

export const orgsRef = () =>
  collection(db, paths.organizations) as CollectionReference<Organization>;

export const orgRef = (orgId: string) =>
  doc(db, paths.organizations, orgId) as DocumentReference<Organization>;

export const userRef = (uid: string) =>
  doc(db, paths.users, uid) as DocumentReference<UserProfile>;

/** Existence of this doc is the platform-admin grant — see firestore.rules' isPlatformAdmin(). */
export const platformAdminRef = (uid: string) =>
  doc(db, paths.platformAdmins, uid) as DocumentReference<PlatformAdmin>;

export const featureFlagsRef = () =>
  collection(db, paths.featureFlags) as CollectionReference<FeatureFlag>;

export const featureFlagRef = (flagId: string) =>
  doc(db, paths.featureFlags, flagId) as DocumentReference<FeatureFlag>;

export const platformLogsRef = () =>
  collection(db, paths.platformLogs) as CollectionReference<PlatformLog>;

export const productsRef = (orgId: string) =>
  collection(db, paths.organizations, orgId, paths.products) as CollectionReference<Product>;

export const productRef = (orgId: string, productId: string) =>
  doc(db, paths.organizations, orgId, paths.products, productId) as DocumentReference<Product>;

export const customersRef = (orgId: string) =>
  collection(db, paths.organizations, orgId, paths.customers) as CollectionReference<Customer>;

export const customerRef = (orgId: string, customerId: string) =>
  doc(db, paths.organizations, orgId, paths.customers, customerId) as DocumentReference<Customer>;

/** One customer's full conversation, either direction — see the Inbox. */
export const messagesRef = (orgId: string, customerId: string) =>
  collection(
    db,
    paths.organizations,
    orgId,
    paths.customers,
    customerId,
    paths.messages,
  ) as CollectionReference<Message>;

export const broadcastsRef = (orgId: string) =>
  collection(db, paths.organizations, orgId, paths.broadcasts) as CollectionReference<Broadcast>;

export const ordersRef = (orgId: string) =>
  collection(db, paths.organizations, orgId, paths.orders) as CollectionReference<Order>;

export const orderRef = (orgId: string, orderId: string) =>
  doc(db, paths.organizations, orgId, paths.orders, orderId) as DocumentReference<Order>;

/**
 * Normalized copy of an order's own `items` array, written once by the bot.
 * The dashboard renders `order.items` directly — this exists for the case
 * that needs one item on its own (a per-product query, a future edit flow).
 */
export const orderItemsRef = (orgId: string, orderId: string) =>
  collection(
    db,
    paths.organizations,
    orgId,
    paths.orders,
    orderId,
    paths.orderItems,
  ) as CollectionReference<OrderItem>;

/** Storage path for a product photo, also tenant-scoped. */
export const productImagePath = (orgId: string, productId: string, fileName: string) =>
  `organizations/${orgId}/products/${productId}/${fileName}`;
