'use client';

import { Bell, LogOut, UserCircle2 } from 'lucide-react';
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
    <header className="fixed left-0 right-0 top-0 z-20 h-16 border-b border-[#c0c8c9]/30 bg-white/85 px-4 backdrop-blur-xl md:left-64 md:px-7">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 py-2">
          <MobileMenuButton onClick={onOpenMenu} />
          <div>
            <p className="text-[10px] uppercase tracking-[0.35em] text-slate-500">ADMIN</p>
            <h1 className="font-headline text-[22px] font-extrabold leading-tight tracking-[-0.02em] text-[#0c4548] md:text-[44px]">
              The Scholarly Editorial
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          <span className="hidden text-base font-semibold text-slate-600 md:inline">{fullName}</span>

          <button
            onClick={onOpenNotifications}
            className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white"
          >
            <Bell className="h-4 w-4 text-slate-600" />
            {unreadCount > 0 ? <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-amber-500" /> : null}
          </button>

          <button
            onClick={() => router.push('/admin/settings')}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-2 py-1.5 md:px-3 md:py-2"
            title="Open settings"
          >
            <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#0f5954] text-xs font-bold text-white">
              {initials || 'SA'}
            </div>
            <UserCircle2 className="h-4 w-4 text-slate-500" />
          </button>

          <button
            onClick={logout}
            disabled={pending}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-3 py-2 text-base font-semibold text-slate-700 md:px-4"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </div>
      {error ? <p className="mt-2 text-sm text-rose-600">{error}</p> : null}
    </header>
  );
}
