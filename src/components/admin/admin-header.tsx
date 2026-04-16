'use client';

import { Bell, LogOut, Moon, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';
import { MobileMenuButton } from '@/components/admin/admin-sidebar';

export function AdminHeader({
  onOpenMenu,
  onOpenNotifications,
  unreadCount,
  fullName
}: {
  onOpenMenu: () => void;
  onOpenNotifications: () => void;
  unreadCount: number;
  fullName: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const router = useRouter();

  const initials = useMemo(() => {
    return fullName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('');
  }, [fullName]);

  const logout = () => {
    setError('');
    startTransition(async () => {
      try {
        const res = await fetch('/api/auth/logout', { method: 'POST' });
        if (!res.ok) {
          setError('Logout failed. Please try again.');
          return;
        }
        router.push('/login');
        router.refresh();
      } catch {
        setError('Network issue during logout.');
      }
    });
  };

  return (
    <header
      className="fixed left-0 right-0 top-0 z-20 h-16 px-4 md:left-64 md:px-8"
      style={{ background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(20px)', boxShadow: '0 1px 0 rgba(191,200,201,0.3)' }}
    >
      <div className="flex h-full items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <MobileMenuButton onClick={onOpenMenu} />
          <div className="relative hidden w-72 group xl:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6f7979] transition group-focus-within:text-[#004649]" />
            <input
              className="w-full bg-[#edeeef] border-none rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none ring-[#004649]/20 placeholder:text-[#6f7979]/60 transition focus:ring-2"
              placeholder="Search students, staff or reports..."
              type="text"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          <button
            onClick={onOpenNotifications}
            className="relative inline-flex h-9 w-9 items-center justify-center rounded-full text-[#6f7979] transition hover:bg-[#edeeef] hover:text-[#004649]"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 ? <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#865300]" /> : null}
          </button>

          <button className="hidden h-9 w-9 items-center justify-center rounded-full text-[#6f7979] transition hover:bg-[#edeeef] hover:text-[#004649] md:inline-flex">
            <Moon className="h-5 w-5" />
          </button>

          <div className="hidden h-8 w-px bg-[#bfc8c9]/30 mx-1 md:block" />

          <button
            onClick={() => router.push('/admin/settings')}
            className="flex items-center gap-3"
            title="Open settings"
          >
            <div className="hidden text-right md:block">
              <p className="text-xs font-bold text-[#191c1d]">{fullName}</p>
              <p className="text-[10px] font-medium text-[#6f7979]">Super Admin</p>
            </div>
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-[#004649] text-xs font-bold text-white shadow-sm">
              {initials || 'SA'}
            </div>
          </button>

          <button
            onClick={logout}
            disabled={pending}
            className="hidden items-center gap-2 rounded-xl border border-[#bfc8c9]/40 bg-white px-3 py-2 text-sm font-semibold text-[#191c1d] transition hover:bg-[#f3f4f5] md:inline-flex"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </div>
      {error ? <p className="mt-2 text-sm text-[#ba1a1a]">{error}</p> : null}
    </header>
  );
}
