export interface AdminNavItem {
  to: string;
  label: string;
  icon: string;
}

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { to: '/admin', label: 'Dashboard', icon: '▤' },
  { to: '/admin/merchants', label: 'Merchants', icon: '☺' },
  { to: '/admin/logs', label: 'Logs', icon: '☰' },
  { to: '/admin/flags', label: 'Feature Flags', icon: '⚑' },
];
