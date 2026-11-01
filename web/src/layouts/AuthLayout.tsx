import { Outlet } from 'react-router-dom';
import { Logo } from '@/components/layout/Logo';
import { ThemeToggle } from '@/components/layout/ThemeToggle';

export function AuthLayout() {
  return (
    <div className="grid min-h-screen bg-canvas lg:grid-cols-[1fr_minmax(420px,480px)]">
      {/* Left panel carries the pitch; it collapses away on small screens. */}
      <section className="hidden flex-col justify-between bg-brand p-10 text-white lg:flex">
        <Logo />
        <div className="max-w-md">
          <p className="text-3xl font-bold leading-tight tracking-tight">
            Your customers already message you. Let them order there too.
          </p>
          <p className="mt-4 text-white/80">
            Upload your products once. OrderFlow answers the chat, takes the order and keeps your
            stock in step — no website, no app, no sign-up for the customer.
          </p>
        </div>
        <p className="text-sm text-white/70">Built for shops across Ghana and West Africa.</p>
      </section>

      <section className="flex flex-col p-6 sm:p-10">
        <div className="flex items-center justify-between lg:justify-end">
          <div className="lg:hidden">
            <Logo />
          </div>
          <ThemeToggle />
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-sm">
            <Outlet />
          </div>
        </div>
      </section>
    </div>
  );
}
