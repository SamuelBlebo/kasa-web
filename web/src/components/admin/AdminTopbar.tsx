import { useState } from 'react';
import { Button } from '@/components/ui';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { useAuth } from '@/hooks/useAuth';
import { signOutMerchant } from '@/services';
import { initials } from '@/utils/format';

export function AdminTopbar({ onOpenSidebar }: { onOpenSidebar: () => void }) {
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-line bg-surface px-4 lg:px-6">
      <Button variant="ghost" size="sm" className="lg:hidden" onClick={onOpenSidebar} aria-label="Open menu">
        ☰
      </Button>

      <p className="truncate text-sm font-semibold text-ink">Platform Admin</p>

      <div className="ml-auto flex items-center gap-1">
        <ThemeToggle />
        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className="grid h-8 w-8 place-items-center rounded-full bg-brand/10 text-xs font-bold text-brand"
          >
            {initials(user?.email ?? 'A')}
          </button>
          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 mt-2 w-52 animate-fade-in rounded-xl border border-line bg-surface p-1.5 shadow-card"
            >
              <div className="px-2.5 py-2">
                <p className="truncate text-xs text-muted">{user?.email}</p>
              </div>
              <button
                role="menuitem"
                onClick={() => signOutMerchant()}
                className="w-full rounded-lg px-2.5 py-2 text-left text-sm font-medium text-danger hover:bg-raised"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
