'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { HelpCircle, LogOut, PlusCircle, X } from 'lucide-react';
import type { UserRole } from '@prisma/client';
import { useState, useTransition } from 'react';
import { cn } from '@/lib/utils';
import { panelNavItems, type PanelNavItem } from '@/components/layout/panel-config';

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppSidebar({
  role,
  open,
  onClose
}: {
  role: UserRole;
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState('');

  const navItems = panelNavItems[role];
  const isAdmin = role === 'ADMIN';

  const doLogout = () => {
    setError('');
    startTransition(async () => {
      try {
        const res = await fetch('/api/auth/logout', { method: 'POST' });
        if (!res.ok) {
          setError('Logout failed.');
          return;
        }
        router.push('/login');
        router.refresh();
      } catch {
        setError('Network issue.');
      }
    });
  };

  return (
    <>
      <div
        className={cn('fixed inset-0 z-40 bg-[#0b1f20]/35 backdrop-blur-sm lg:hidden', open ? 'block' : 'hidden')}
        onClick={onClose}
      />

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col border-r border-[#c0c8c9]/30 bg-[#f3f4f3] px-4 py-5 transition-transform duration-300 lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-start justify-between gap-3 px-2">
          <Link
            href={role === 'ADMIN' ? '/admin' : role === 'TEACHER' ? '/teacher' : role === 'PARENT' ? '/parent' : '/student'}
            onClick={onClose}
            className="block w-full"
          >
            <img
              src="https://lh3.googleusercontent.com/aida/ADBb0ugS93ixky9Hrwk3Lu4M6_TiPkBRA87BCMrXCDoYrNYGCyGK_IUUKl5gGMnM_c9oDK4OU-wer1BhDwF73zlZqnnv7SLurT5VR4tOsnzE61oOr2cEoomB2grf-Q_T5AwBrG8l25ybiL7xxVKo58FYf-4evOQpADITZNjeBFJa4Ci-zg8AAmEMFgzWVKc2CmnpUu-_853TNiOwAZDZLXgbE4nH_tB6OnGD0Hw7t0HyO6YHh-GcRgI4-VZxpfFLzrrcOy0SLWNkd2i6TQ"
              alt="Institution logo"
              className="h-auto w-[210px] object-contain"
            />
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#004649] shadow-sm lg:hidden"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="mt-5 flex-1 space-y-1 overflow-y-auto pr-1">
          {navItems.map((item: PanelNavItem) => {
            const Icon = item.icon;
            const active = isActive(pathname, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  'group flex items-center gap-3 rounded-2xl px-4 py-3.5 text-[15px] font-semibold transition-all',
                  active
                    ? 'bg-[#004649] text-white shadow-[0_12px_32px_rgba(0,70,73,0.18)]'
                    : 'text-[#223956] hover:bg-white/70 hover:text-[#004649]'
                )}
              >
                <Icon className={cn('h-[18px] w-[18px] shrink-0', active ? 'text-white' : 'text-[#004649]')} />
                <span className="tracking-[-0.01em]">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {isAdmin ? (
          <div className="mt-auto border-t border-[#c0c8c9]/30 pt-5">
            <button className="mb-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#124346] text-sm font-bold text-white shadow-lg shadow-[#124346]/20">
              <PlusCircle className="h-4 w-4" />
              New Enrollment
            </button>
            <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-[#5f6b6d] transition hover:bg-white/70">
              <HelpCircle className="h-4 w-4" />
              Support
            </button>
            <button
              onClick={doLogout}
              disabled={pending}
              className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-[#5f6b6d] transition hover:bg-white/70"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
            {error ? <p className="mt-2 px-3 text-xs text-[#ba1a1a]">{error}</p> : null}
          </div>
        ) : null}
      </aside>
    </>
  );
}
