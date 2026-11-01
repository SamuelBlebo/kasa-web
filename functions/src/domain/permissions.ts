import type { Role } from './model';

/**
 * Role → permission table (ShopFlow's common/permissions.ts, adapted).
 * Mirrored in web/src/config/permissions.ts and in firestore.rules' role
 * lists — keep all three in sync.
 */
export type Permission =
  | 'inbox.reply'
  | 'orders.manage'
  | 'orders.cancel'
  | 'kitchen.manage'
  | 'payments.verify'
  | 'catalog.write'
  | 'stock.write'
  | 'customers.write'
  | 'broadcasts.send'
  | 'settings.write'
  | 'team.manage'
  | 'billing.manage'
  | 'whatsapp.manage';

const ALL: Permission[] = [
  'inbox.reply', 'orders.manage', 'orders.cancel', 'kitchen.manage', 'payments.verify', 'catalog.write',
  'stock.write', 'customers.write', 'broadcasts.send', 'settings.write', 'team.manage', 'billing.manage', 'whatsapp.manage',
];

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  owner: ALL,
  manager: ['inbox.reply', 'orders.manage', 'orders.cancel', 'kitchen.manage', 'payments.verify', 'catalog.write', 'stock.write', 'customers.write', 'broadcasts.send'],
  cashier: ['inbox.reply', 'orders.manage', 'kitchen.manage', 'payments.verify'],
  kitchen: ['kitchen.manage'],
};

export const ROLES: Role[] = ['owner', 'manager', 'cashier', 'kitchen'];
export const can = (role: Role, permission: Permission) => ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
