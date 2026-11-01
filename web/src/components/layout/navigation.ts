export interface NavItem {
  to: string;
  label: string;
  icon: string;
}

/** Ordered by how often a merchant touches it during a working day. */
export const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: '▤' },
  { to: '/products', label: 'Products', icon: '◫' },
  { to: '/orders', label: 'Orders', icon: '☰' },
  { to: '/inbox', label: 'Inbox', icon: '✉' },
  { to: '/customers', label: 'Customers', icon: '☺' },
  { to: '/analytics', label: 'Analytics', icon: '▲' },
  { to: '/whatsapp', label: 'WhatsApp', icon: '✆' },
  { to: '/settings', label: 'Settings', icon: '⚙' },
];
