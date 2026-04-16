'use client';

import type { UserRole } from '@prisma/client';
import { Bell, Grid3X3, LogOut, Menu, Search } from 'lucide-react';
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

  return (
    <header className="fixed left-0 right-0 top-0 z-40 border-b border-[#c0c8c9]/20 bg-white/85 backdrop-blur-xl lg:left-[280px]">
      <div className="h-16 px-4 lg:px-8">
        <div className="flex h-full items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3 lg:gap-6">
            <button
              type="button"
              onClick={onOpenMenu}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#c0c8c9]/40 bg-white text-[#124346] lg:hidden"
              aria-label="Open sidebar"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="min-w-0">
              <img
                src="https://lh3.googleusercontent.com/aida/ADBb0ugS93ixky9Hrwk3Lu4M6_TiPkBRA87BCMrXCDoYrNYGCyGK_IUUKl5gGMnM_c9oDK4OU-wer1BhDwF73zlZqnnv7SLurT5VR4tOsnzE61oOr2cEoomB2grf-Q_T5AwBrG8l25ybiL7xxVKo58FYf-4evOQpADITZNjeBFJa4Ci-zg8AAmEMFgzWVKc2CmnpUu-_853TNiOwAZDZLXgbE4nH_tB6OnGD0Hw7t0HyO6YHh-GcRgI4-VZxpfFLzrrcOy0SLWNkd2i6TQ"
                alt="Institution logo"
                className="h-8 w-auto object-contain"
              />
            </div>

            {isAdmin ? (
              <>
                <div className="relative hidden w-80 xl:block">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#707979]" />
                  <input
                    type="text"
                    className="h-10 w-full rounded-full border border-transparent bg-[#f3f4f3] pl-9 pr-4 text-sm text-[#1a1c1c] outline-none ring-[#a1cfd3] transition focus:ring-2"
                    placeholder="Search academic records..."
                  />
                </div>
                <nav className="hidden items-center gap-6 xl:flex">
                  <span className="text-sm font-medium text-[#6e7778]">Syllabus</span>
                  <span className="text-sm font-medium text-[#6e7778]">Attendance</span>
                  <span className="text-sm font-medium text-[#6e7778]">Reports</span>
                </nav>
              </>
            ) : null}
          </div>

          <div className="flex items-center gap-2 lg:gap-3">
            <span className="hidden text-base font-semibold text-[#4e5b5d] lg:inline">{fullName}</span>

            <button className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[#6e7778] transition hover:bg-[#f3f4f3]">
              <Bell className="h-4 w-4" />
            </button>

            {isAdmin ? (
              <button className="hidden h-9 w-9 items-center justify-center rounded-lg text-[#6e7778] transition hover:bg-[#f3f4f3] md:inline-flex">
                <Grid3X3 className="h-4 w-4" />
              </button>
            ) : null}

            <button
              type="button"
              onClick={() => router.push(role === 'ADMIN' ? '/admin/settings' : role === 'TEACHER' ? '/teacher/settings' : role === 'STUDENT' ? '/student/settings' : '/parent')}
              className="inline-flex items-center gap-2 rounded-xl border border-[#c0c8c9]/50 bg-white px-2 py-1.5"
              title="Profile"
            >
              <div className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#0f5954] text-[11px] font-bold text-white">
                {initials || 'SA'}
              </div>
            </button>

            <button
              type="button"
              onClick={doLogout}
              disabled={pending}
              className="inline-flex items-center gap-2 rounded-xl border border-[#c0c8c9]/60 bg-white px-3 py-2 text-sm font-semibold text-[#334155]"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </div>
      {error ? <p className="px-4 pb-2 text-sm text-[#ba1a1a] lg:px-8">{error}</p> : null}
    </header>
  );
}
