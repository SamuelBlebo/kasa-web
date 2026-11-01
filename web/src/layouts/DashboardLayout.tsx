import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { useAuth } from '@/hooks/useAuth';

export function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { org } = useAuth();

  return (
    <div className="flex min-h-screen bg-canvas">
      <Sidebar open={sidebarOpen} onNavigate={() => setSidebarOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onOpenSidebar={() => setSidebarOpen(true)} />
        {org?.suspended && (
          <div className="bg-danger px-4 py-2 text-center text-sm font-semibold text-white lg:px-6">
            Your account has been suspended{org.suspendedReason ? `: ${org.suspendedReason}` : '.'} New
            WhatsApp orders are paused. Contact support to resolve this.
          </div>
        )}
        <main className="flex-1 px-4 py-6 lg:px-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
