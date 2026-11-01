import type { Role } from '@/types';

/** Mirrors functions/src/domain/permissions.ts. The server enforces it; this only hides what a role can't use. */
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

export const ROLE_LABEL: Record<Role, string> = { owner: 'Owner', manager: 'Manager', cashier: 'Cashier', kitchen: 'Kitchen' };

export const can = (role: Role | null | undefined, p: Permission) => (role ? ROLE_PERMISSIONS[role].includes(p) : false);
