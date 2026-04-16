'use client';

import type { UserRole } from '@prisma/client';
import { Bell, LogOut, Menu, Moon, Search } from 'lucide-react';
import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

export function AppHeader({
  role,
  fullName,
  onOpenMenu
}: {
  role: UserRole;
  fullName: string;
  onOpenMenu: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState('');

  const initials = useMemo(() => {
    return fullName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('');
  }, [fullName]);

  const doLogout = () => {
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

  const isAdmin = role === 'ADMIN';
  const settingsHref =
    role === 'ADMIN' ? '/admin/settings' :
    role === 'TEACHER' ? '/teacher/settings' :
    role === 'STUDENT' ? '/student/settings' :
    '/parent';

  const roleLabel =
    role === 'ADMIN' ? 'Super Admin' :
    role === 'TEACHER' ? 'Senior Faculty' :
    role === 'STUDENT' ? 'Student' :
    'Parent';

  return (
    <header
      className="fixed left-0 right-0 top-0 z-40 h-16 lg:left-64"
      style={{ background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(20px)', boxShadow: '0 1px 0 rgba(191,200,201,0.3)' }}
    >
      <div className="flex h-full items-center justify-between gap-4 px-4 lg:px-8">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onOpenMenu}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#bfc8c9]/40 bg-white text-[#004649] lg:hidden"
            aria-label="Open sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>

          {isAdmin && (
            <div className="relative hidden w-72 xl:block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6f7979]" />
              <input
                type="text"
                className="h-10 w-full rounded-xl border-none bg-[#edeeef] pl-10 pr-4 text-sm text-[#191c1d] outline-none ring-[#004649]/20 placeholder:text-[#6f7979]/60 transition focus:ring-2"
                placeholder="Search students, staff or reports..."
              />
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 lg:gap-3">
          <button className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[#6f7979] transition hover:bg-[#edeeef] hover:text-[#004649]">
            <Bell className="h-5 w-5" />
          </button>

          {isAdmin && (
            <button className="hidden h-9 w-9 items-center justify-center rounded-full text-[#6f7979] transition hover:bg-[#edeeef] hover:text-[#004649] md:inline-flex">
              <Moon className="h-5 w-5" />
            </button>
          )}

          <div className="hidden h-8 w-px bg-[#bfc8c9]/30 mx-1 md:block" />

          <button
            type="button"
            onClick={() => router.push(settingsHref)}
            className="flex items-center gap-3"
            title="Profile"
          >
            <div className="text-right hidden md:block">
              <p className="text-xs font-bold text-[#191c1d]">{fullName}</p>
              <p className="text-[10px] font-medium text-[#6f7979]">{roleLabel}</p>
            </div>
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-[#004649] text-xs font-bold text-white shadow-sm">
              {initials || 'SA'}
            </div>
          </button>

          <button
            type="button"
            onClick={doLogout}
            disabled={pending}
            className="hidden items-center gap-2 rounded-xl border border-[#bfc8c9]/40 bg-white px-3 py-2 text-sm font-semibold text-[#191c1d] transition hover:bg-[#f3f4f5] sm:inline-flex"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
      {error ? <p className="px-4 pb-2 text-sm text-[#ba1a1a] lg:px-8">{error}</p> : null}
    </header>
  );
}
