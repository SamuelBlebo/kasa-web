import { NavLink } from 'react-router-dom';
import { cn } from '@/utils/cn';
import { Logo } from '@/components/layout/Logo';
import { ADMIN_NAV_ITEMS } from './navigation';

interface AdminSidebarProps {
  open: boolean;
  onNavigate: () => void;
}

export function AdminSidebar({ open, onNavigate }: AdminSidebarProps) {
  return (
    <>
      <div
        onClick={onNavigate}
        className={cn('fixed inset-0 z-30 bg-black/40 lg:hidden', open ? 'block' : 'hidden')}
      />
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-line bg-surface',
          'px-3 py-4 transition-transform duration-200 lg:static lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="px-2">
          <Logo />
        </div>

        <div className="mt-5 rounded-xl border border-line bg-raised px-3 py-2.5">
          <p className="text-xs text-muted">Signed in to</p>
          <p className="truncate text-sm font-semibold text-ink">Platform Admin</p>
          <p className="mt-0.5 text-xs text-muted">Every merchant, one view</p>
        </div>

        <nav className="mt-4 flex flex-col gap-0.5">
          {ADMIN_NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/admin'}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors',
                  isActive ? 'bg-brand/10 text-brand' : 'text-muted hover:bg-raised hover:text-ink',
                )
              }
            >
              <span aria-hidden className="w-4 text-center">
                {item.icon}
              </span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <p className="mt-auto px-3 text-xs text-muted">Internal tool — never linked from the merchant app.</p>
      </aside>
    </>
  );
}
